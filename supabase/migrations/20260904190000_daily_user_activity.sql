-- =============================================================================
-- Migration: 20260904190000_daily_user_activity.sql
-- Description: Daily Activity Summary table for Annual March 7th Prize & Consistency
-- Safety: STRICTLY NON-DESTRUCTIVE
--   - Does NOT delete or modify any existing rows in quiz_attempts or profiles.
--   - Backfills all past history (from Dec 2025 / March 2026 to date) into daily summaries.
--   - Trigger automatically maintains future daily summaries on quiz attempt insert/update.
--   - Trigger has safe exception handling: will NEVER block quiz submission.
-- =============================================================================

BEGIN;

-- 1. Create Daily User Activity Table
CREATE TABLE IF NOT EXISTS public.daily_user_activity (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_date date NOT NULL,                        -- Calendar date in IST (Asia/Kolkata)
    quizzes_played integer NOT NULL DEFAULT 0,          -- Distinct quiz challenges attempted on that date
    hourly_quizzes_played integer NOT NULL DEFAULT 0,   -- Count of hourly challenges played
    reading_lessons_completed integer NOT NULL DEFAULT 0,-- Count of lesson reading completions
    life_skills_played integer NOT NULL DEFAULT 0,      -- Count of life skill cards played
    points_earned integer NOT NULL DEFAULT 0,           -- Sum of gross scores earned that day
    penalties_incurred integer NOT NULL DEFAULT 0,      -- Sum of penalties incurred on wrong answers
    net_points integer NOT NULL DEFAULT 0,              -- points_earned - penalties_incurred
    first_active_at timestamptz,                       -- Earliest attempt timestamp of the day
    last_active_at timestamptz,                        -- Latest attempt timestamp of the day
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, activity_date)
);

COMMENT ON TABLE public.daily_user_activity IS
  'Per-user daily activity summary (IST). Powers annual March 7th prize consistency calculations and protects history if raw attempts are archived.';

-- 2. Indexes for fast aggregation and streak lookup
CREATE INDEX IF NOT EXISTS idx_daily_user_activity_date 
  ON public.daily_user_activity (activity_date);

CREATE INDEX IF NOT EXISTS idx_daily_user_activity_user_date 
  ON public.daily_user_activity (user_id, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_user_activity_net_points 
  ON public.daily_user_activity (activity_date, net_points DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.daily_user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read daily_user_activity" ON public.daily_user_activity;
CREATE POLICY "Allow read daily_user_activity"
  ON public.daily_user_activity
  FOR SELECT
  USING (true);

GRANT SELECT ON public.daily_user_activity TO postgres, anon, authenticated, service_role;

-- 4. Live Trigger: Automatically updates daily_user_activity on quiz attempt
CREATE OR REPLACE FUNCTION public.trg_fn_sync_daily_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
  v_score_delta integer;
  v_penalty_delta integer;
  v_net_delta integer;
  v_is_hourly boolean;
  v_is_lesson boolean;
  v_is_life_skill boolean;
BEGIN
  -- Determine IST activity date
  v_date := (NEW.created_at AT TIME ZONE 'Asia/Kolkata')::date;
  
  v_is_hourly := (NEW.quiz_id LIKE 'hourly-challenge%');
  v_is_lesson := (NEW.quiz_id LIKE 'lesson_%');
  v_is_life_skill := (NEW.quiz_id LIKE 'life_skill%');

  IF (TG_OP = 'INSERT') THEN
    v_score_delta := COALESCE(ROUND(NEW.score)::integer, 0);
    v_penalty_delta := COALESCE(ROUND(NEW.penalty)::integer, 0);
    v_net_delta := v_score_delta - v_penalty_delta;

    INSERT INTO public.daily_user_activity (
      user_id,
      activity_date,
      quizzes_played,
      hourly_quizzes_played,
      reading_lessons_completed,
      life_skills_played,
      points_earned,
      penalties_incurred,
      net_points,
      first_active_at,
      last_active_at,
      updated_at
    )
    VALUES (
      NEW.user_id,
      v_date,
      1,
      CASE WHEN v_is_hourly THEN 1 ELSE 0 END,
      CASE WHEN v_is_lesson THEN 1 ELSE 0 END,
      CASE WHEN v_is_life_skill THEN 1 ELSE 0 END,
      v_score_delta,
      v_penalty_delta,
      v_net_delta,
      NEW.created_at,
      NEW.created_at,
      now()
    )
    ON CONFLICT (user_id, activity_date) DO UPDATE SET
      quizzes_played = daily_user_activity.quizzes_played + 1,
      hourly_quizzes_played = daily_user_activity.hourly_quizzes_played + (CASE WHEN v_is_hourly THEN 1 ELSE 0 END),
      reading_lessons_completed = daily_user_activity.reading_lessons_completed + (CASE WHEN v_is_lesson THEN 1 ELSE 0 END),
      life_skills_played = daily_user_activity.life_skills_played + (CASE WHEN v_is_life_skill THEN 1 ELSE 0 END),
      points_earned = daily_user_activity.points_earned + v_score_delta,
      penalties_incurred = daily_user_activity.penalties_incurred + v_penalty_delta,
      net_points = daily_user_activity.net_points + v_net_delta,
      first_active_at = LEAST(daily_user_activity.first_active_at, NEW.created_at),
      last_active_at = GREATEST(daily_user_activity.last_active_at, NEW.created_at),
      updated_at = now();

  ELSIF (TG_OP = 'UPDATE') THEN
    -- On UPDATE of an existing attempt (e.g. retaking an hourly quiz in the same hour),
    -- quizzes_played count does NOT increment; only score and penalty differences adjust.
    v_score_delta := COALESCE(ROUND(NEW.score)::integer, 0) - COALESCE(ROUND(OLD.score)::integer, 0);
    v_penalty_delta := COALESCE(ROUND(NEW.penalty)::integer, 0) - COALESCE(ROUND(OLD.penalty)::integer, 0);
    v_net_delta := v_score_delta - v_penalty_delta;

    INSERT INTO public.daily_user_activity (
      user_id,
      activity_date,
      quizzes_played,
      hourly_quizzes_played,
      reading_lessons_completed,
      life_skills_played,
      points_earned,
      penalties_incurred,
      net_points,
      first_active_at,
      last_active_at,
      updated_at
    )
    VALUES (
      NEW.user_id,
      v_date,
      1,
      CASE WHEN v_is_hourly THEN 1 ELSE 0 END,
      CASE WHEN v_is_lesson THEN 1 ELSE 0 END,
      CASE WHEN v_is_life_skill THEN 1 ELSE 0 END,
      COALESCE(ROUND(NEW.score)::integer, 0),
      COALESCE(ROUND(NEW.penalty)::integer, 0),
      COALESCE(ROUND(NEW.score)::integer, 0) - COALESCE(ROUND(NEW.penalty)::integer, 0),
      NEW.created_at,
      NEW.created_at,
      now()
    )
    ON CONFLICT (user_id, activity_date) DO UPDATE SET
      points_earned = daily_user_activity.points_earned + v_score_delta,
      penalties_incurred = daily_user_activity.penalties_incurred + v_penalty_delta,
      net_points = daily_user_activity.net_points + v_net_delta,
      last_active_at = GREATEST(daily_user_activity.last_active_at, NEW.created_at),
      updated_at = now();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Trigger safety: NEVER fail or block player quiz submission
  RAISE WARNING '[trg_fn_sync_daily_user_activity] non-fatal warning: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quiz_attempts_daily_sync ON public.quiz_attempts;
CREATE TRIGGER trg_quiz_attempts_daily_sync
  AFTER INSERT OR UPDATE ON public.quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_sync_daily_user_activity();

-- 5. Backfill & Maintenance Procedure (Idempotent)
CREATE OR REPLACE FUNCTION public.sync_daily_user_activity(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_synced integer := 0;
BEGIN
  INSERT INTO public.daily_user_activity (
    user_id,
    activity_date,
    quizzes_played,
    hourly_quizzes_played,
    reading_lessons_completed,
    life_skills_played,
    points_earned,
    penalties_incurred,
    net_points,
    first_active_at,
    last_active_at,
    updated_at
  )
  SELECT
    qa.user_id,
    (qa.created_at AT TIME ZONE 'Asia/Kolkata')::date AS activity_date,
    COUNT(*) AS quizzes_played,
    COUNT(*) FILTER (WHERE qa.quiz_id LIKE 'hourly-challenge%') AS hourly_quizzes_played,
    COUNT(*) FILTER (WHERE qa.quiz_id LIKE 'lesson_%') AS reading_lessons_completed,
    COUNT(*) FILTER (WHERE qa.quiz_id LIKE 'life_skill%') AS life_skills_played,
    SUM(COALESCE(qa.score, 0))::integer AS points_earned,
    SUM(COALESCE(qa.penalty, 0))::integer AS penalties_incurred,
    (SUM(COALESCE(qa.score, 0)) - SUM(COALESCE(qa.penalty, 0)))::integer AS net_points,
    MIN(qa.created_at) AS first_active_at,
    MAX(qa.created_at) AS last_active_at,
    now() AS updated_at
  FROM public.quiz_attempts qa
  JOIN public.profiles p ON p.id = qa.user_id
  WHERE COALESCE(p.role, 'lineman') <> 'guest'
    AND (p_start_date IS NULL OR (qa.created_at AT TIME ZONE 'Asia/Kolkata')::date >= p_start_date)
    AND (p_end_date IS NULL OR (qa.created_at AT TIME ZONE 'Asia/Kolkata')::date <= p_end_date)
  GROUP BY
    qa.user_id,
    (qa.created_at AT TIME ZONE 'Asia/Kolkata')::date
  ON CONFLICT (user_id, activity_date) DO UPDATE SET
    quizzes_played = EXCLUDED.quizzes_played,
    hourly_quizzes_played = EXCLUDED.hourly_quizzes_played,
    reading_lessons_completed = EXCLUDED.reading_lessons_completed,
    life_skills_played = EXCLUDED.life_skills_played,
    points_earned = EXCLUDED.points_earned,
    penalties_incurred = EXCLUDED.penalties_incurred,
    net_points = EXCLUDED.net_points,
    first_active_at = LEAST(daily_user_activity.first_active_at, EXCLUDED.first_active_at),
    last_active_at = GREATEST(daily_user_activity.last_active_at, EXCLUDED.last_active_at),
    updated_at = now();

  GET DIAGNOSTICS v_rows_synced = ROW_COUNT;
  RETURN v_rows_synced;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_daily_user_activity(date, date) TO postgres, authenticated, service_role;

-- 6. Execute Backfill for all past history
SELECT public.sync_daily_user_activity();

COMMIT;

-- =============================================================================
-- Verification Queries (Run in SQL Editor to verify results):
-- 1. Check total daily summary records created:
--    SELECT count(*) AS total_daily_records FROM public.daily_user_activity;
--
-- 2. Check top 10 most consistent players between March 7, 2026 and now:
--    SELECT 
--      p.full_name,
--      p.district,
--      COUNT(d.activity_date) AS active_days,
--      SUM(d.net_points) AS total_net_points,
--      SUM(d.quizzes_played) AS total_quizzes,
--      SUM(d.penalties_incurred) AS total_penalties
--    FROM public.daily_user_activity d
--    JOIN public.profiles p ON p.id = d.user_id
--    WHERE d.activity_date >= '2026-03-07'
--    GROUP BY p.id, p.full_name, p.district
--    ORDER BY active_days DESC, total_net_points DESC
--    LIMIT 10;
-- =============================================================================
