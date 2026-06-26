-- Live Q&A forum: new table + RPCs only. Does not modify existing tables or RPCs.
-- Custom-auth clients pass p_user_id (same trust model as log_reading_habit_completion).

CREATE TABLE IF NOT EXISTS public.forum_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body text NOT NULL,
    is_solved boolean NOT NULL DEFAULT false,
    is_hidden boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT forum_posts_body_length CHECK (char_length(trim(body)) BETWEEN 1 AND 500)
);

CREATE INDEX IF NOT EXISTS forum_posts_questions_idx
    ON public.forum_posts (is_solved ASC, created_at DESC)
    WHERE parent_id IS NULL AND is_hidden = false;

CREATE INDEX IF NOT EXISTS forum_posts_replies_idx
    ON public.forum_posts (parent_id, created_at ASC)
    WHERE is_hidden = false;

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- No RLS policies: all access via SECURITY DEFINER RPCs below.

CREATE OR REPLACE FUNCTION public.get_forum_questions(p_limit int DEFAULT 30)
RETURNS TABLE (
    id uuid,
    author_id uuid,
    body text,
    is_solved boolean,
    created_at timestamptz,
    full_name text,
    slm_id text,
    author_role text,
    answer_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        q.id,
        q.author_id,
        q.body,
        q.is_solved,
        q.created_at,
        coalesce(nullif(trim(p.full_name), ''), 'Lineman') AS full_name,
        coalesce(p.slm_id, '') AS slm_id,
        coalesce(trim(lower(p.role::text)), 'lineman') AS author_role,
        (
            SELECT count(*)::bigint
            FROM public.forum_posts r
            WHERE r.parent_id = q.id
              AND r.is_hidden = false
        ) AS answer_count
    FROM public.forum_posts q
    JOIN public.profiles p ON p.id = q.author_id
    WHERE q.parent_id IS NULL
      AND q.is_hidden = false
    ORDER BY q.is_solved ASC, q.created_at DESC
    LIMIT greatest(1, least(coalesce(p_limit, 30), 50));
$$;

CREATE OR REPLACE FUNCTION public.get_forum_thread(p_question_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_question json;
    v_answers json;
BEGIN
    IF p_question_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Missing question id');
    END IF;

    SELECT json_build_object(
        'id', q.id,
        'author_id', q.author_id,
        'body', q.body,
        'is_solved', q.is_solved,
        'created_at', q.created_at,
        'full_name', coalesce(nullif(trim(p.full_name), ''), 'Lineman'),
        'slm_id', coalesce(p.slm_id, ''),
        'author_role', coalesce(trim(lower(p.role::text)), 'lineman')
    )
    INTO v_question
    FROM public.forum_posts q
    JOIN public.profiles p ON p.id = q.author_id
    WHERE q.id = p_question_id
      AND q.parent_id IS NULL
      AND q.is_hidden = false;

    IF v_question IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Question not found');
    END IF;

    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.created_at ASC), '[]'::json)
    INTO v_answers
    FROM (
        SELECT
            a.id,
            a.author_id,
            a.body,
            a.created_at,
            coalesce(nullif(trim(p.full_name), ''), 'Lineman') AS full_name,
            coalesce(p.slm_id, '') AS slm_id,
            coalesce(trim(lower(p.role::text)), 'lineman') AS author_role
        FROM public.forum_posts a
        JOIN public.profiles p ON p.id = a.author_id
        WHERE a.parent_id = p_question_id
          AND a.is_hidden = false
    ) t;

    RETURN json_build_object(
        'success', true,
        'question', v_question,
        'answers', v_answers
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_forum_post(
    p_user_id uuid,
    p_body text,
    p_parent_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := COALESCE(p_user_id, auth.uid());
    v_body text := trim(coalesce(p_body, ''));
    v_row public.forum_posts%ROWTYPE;
    v_parent public.forum_posts%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF char_length(v_body) < 1 OR char_length(v_body) > 500 THEN
        RETURN json_build_object('success', false, 'error', 'Message must be 1–500 characters');
    END IF;

    IF p_parent_id IS NOT NULL THEN
        SELECT * INTO v_parent
        FROM public.forum_posts
        WHERE id = p_parent_id
          AND parent_id IS NULL
          AND is_hidden = false;

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'Question not found');
        END IF;
    END IF;

    INSERT INTO public.forum_posts (parent_id, author_id, body)
    VALUES (p_parent_id, v_user_id, v_body)
    RETURNING * INTO v_row;

    RETURN json_build_object(
        'success', true,
        'post', json_build_object(
            'id', v_row.id,
            'parent_id', v_row.parent_id,
            'author_id', v_row.author_id,
            'body', v_row.body,
            'is_solved', v_row.is_solved,
            'created_at', v_row.created_at
        )
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_forum_solved(
    p_user_id uuid,
    p_question_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := COALESCE(p_user_id, auth.uid());
    v_author_id uuid;
    v_is_admin boolean;
BEGIN
    IF v_user_id IS NULL OR p_question_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid request');
    END IF;

    SELECT q.author_id
    INTO v_author_id
    FROM public.forum_posts q
    WHERE q.id = p_question_id
      AND q.parent_id IS NULL
      AND q.is_hidden = false;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Question not found');
    END IF;

    SELECT trim(lower(p.role::text)) = 'admin'
    INTO v_is_admin
    FROM public.profiles p
    WHERE p.id = v_user_id;

    IF v_author_id <> v_user_id AND coalesce(v_is_admin, false) IS NOT TRUE THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    UPDATE public.forum_posts
    SET is_solved = true
    WHERE id = p_question_id;

    RETURN json_build_object('success', true, 'question_id', p_question_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_forum_questions(int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_forum_thread(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_forum_post(uuid, text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_forum_solved(uuid, uuid) TO anon, authenticated, service_role;

-- Realtime: new questions and answers appear live in the app.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'forum_posts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
    END IF;
END $$;
