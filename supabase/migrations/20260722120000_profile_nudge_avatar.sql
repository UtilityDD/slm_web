-- Allow profile photo URL updates via progressive nudge RPC (additive whitelist).

CREATE OR REPLACE FUNCTION public.apply_profile_nudge(
    p_user_id uuid,
    p_updates jsonb DEFAULT '{}'::jsonb,
    p_nudge_state jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := COALESCE(p_user_id, auth.uid());
    v_updates jsonb := COALESCE(p_updates, '{}'::jsonb);
    v_allowed text[] := ARRAY[
        'avatar_url', 'district', 'block', 'job', 'dob', 'age', 'education',
        'blood_group', 'is_donor', 'accident_voltage'
    ];
    v_key text;
    v_sql text;
    v_set_parts text[] := ARRAY[]::text[];
    v_val text;
    v_updated int;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Missing user id');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    FOR v_key IN SELECT jsonb_object_keys(v_updates)
    LOOP
        IF NOT (v_key = ANY (v_allowed)) THEN
            CONTINUE;
        END IF;

        IF v_key = 'is_donor' THEN
            v_set_parts := array_append(
                v_set_parts,
                format('is_donor = %L::boolean', (v_updates ->> v_key))
            );
        ELSIF v_key = 'age' THEN
            IF (v_updates ->> v_key) IS NULL OR (v_updates ->> v_key) = '' THEN
                v_set_parts := array_append(v_set_parts, 'age = NULL');
            ELSE
                v_set_parts := array_append(
                    v_set_parts,
                    format('age = %L::integer', (v_updates ->> v_key))
                );
            END IF;
        ELSIF v_key = 'dob' THEN
            IF (v_updates ->> v_key) IS NULL OR (v_updates ->> v_key) = '' THEN
                v_set_parts := array_append(v_set_parts, 'dob = NULL');
            ELSE
                v_set_parts := array_append(
                    v_set_parts,
                    format('dob = %L::date', (v_updates ->> v_key))
                );
            END IF;
        ELSE
            v_val := v_updates ->> v_key;
            IF v_val IS NULL THEN
                v_set_parts := array_append(v_set_parts, format('%I = NULL', v_key));
            ELSE
                v_set_parts := array_append(
                    v_set_parts,
                    format('%I = %L', v_key, v_val)
                );
            END IF;
        END IF;
    END LOOP;

    IF p_nudge_state IS NOT NULL THEN
        v_set_parts := array_append(
            v_set_parts,
            'profile_nudge_state = COALESCE(profile_nudge_state, ''{}''::jsonb) || '
                || quote_literal(p_nudge_state::text)
                || '::jsonb'
        );
    END IF;

    IF cardinality(v_set_parts) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Nothing to update');
    END IF;

    v_set_parts := array_append(v_set_parts, 'updated_at = now()');

    v_sql := format(
        'UPDATE public.profiles SET %s WHERE id = %L',
        array_to_string(v_set_parts, ', '),
        v_user_id
    );

    EXECUTE v_sql;
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN json_build_object('success', v_updated > 0);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_profile_nudge(uuid, jsonb, jsonb) TO anon, authenticated, service_role;
