-- Migration: 20260905060000_get_annual_grand_trophy.sql
-- Description: Server-side aggregation for Annual Grand Trophy leaderboard.
--   Replaces client-side pagination of daily_user_activity (~400k rows by year-end)
--   with a single PostgREST call returning one aggregated row per user (~100 rows).
--
-- Safety: CREATE OR REPLACE — non-destructive. No table alterations.

CREATE OR REPLACE FUNCTION get_annual_grand_trophy(
    p_start        date,          -- cycle start date in IST, e.g. '2026-03-07'
    p_end          date,          -- cycle end date in IST,   e.g. '2027-03-07'
    p_cycle_start_ts timestamptz, -- exact IST epoch: '2026-03-07T00:00:00+05:30'
    p_min_active_days integer DEFAULT 30
)
RETURNS TABLE (
    user_id               uuid,
    full_name             text,
    avatar_url            text,
    district              text,
    training_level        integer,
    slm_id                text,
    created_at            timestamptz,
    lifetime_score        bigint,
    reading_points        bigint,
    active_days           bigint,
    total_quizzes         bigint,
    hourly_quizzes        bigint,
    reading_lessons       bigint,
    life_skills           bigint,
    points_earned         bigint,
    penalties_incurred    bigint,
    net_points            bigint,
    eligible_days         bigint,
    consistency_rate      double precision,
    consistency_pct       integer,
    yearly_score          bigint,
    is_qualified          boolean,
    days_needed_to_qualify integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    WITH agg AS (
        -- Sum all activity columns for each user within the cycle window.
        -- active_days = count of calendar dates with any meaningful activity.
        SELECT
            d.user_id,
            COUNT(*) FILTER (WHERE
                d.quizzes_played        > 0 OR
                d.reading_lessons_completed > 0 OR
                d.points_earned         > 0
            )                                               AS active_days,
            COALESCE(SUM(d.quizzes_played), 0)              AS total_quizzes,
            COALESCE(SUM(d.hourly_quizzes_played), 0)       AS hourly_quizzes,
            COALESCE(SUM(d.reading_lessons_completed), 0)   AS reading_lessons,
            COALESCE(SUM(d.life_skills_played), 0)          AS life_skills,
            COALESCE(SUM(d.points_earned), 0)               AS points_earned,
            COALESCE(SUM(d.penalties_incurred), 0)          AS penalties_incurred,
            COALESCE(SUM(d.net_points), 0)                  AS net_points
        FROM daily_user_activity d
        WHERE d.activity_date >= p_start
          AND d.activity_date <  p_end
        GROUP BY d.user_id
    ),
    joined AS (
        -- Join with profiles; exclude guests and users without a name.
        SELECT
            a.*,
            p.full_name,
            p.avatar_url,
            p.district,
            p.training_level,
            p.slm_id,
            p.created_at,
            COALESCE(p.points, 0)::bigint                                       AS lifetime_score,
            COALESCE(p.reading_points_ledger, p.reading_points, 0)::bigint      AS reading_points,
            -- Eligible start is the later of cycle start or user join date.
            GREATEST(p_cycle_start_ts, COALESCE(p.created_at, p_cycle_start_ts)) AS eligible_start_ts
        FROM agg a
        JOIN profiles p ON p.id = a.user_id
        WHERE (p.role IS NULL OR p.role <> 'guest')
          AND p.full_name IS NOT NULL
    ),
    scored AS (
        SELECT
            j.*,
            -- eligible_days: days since eligible_start, minimum 1
            GREATEST(1,
                CEIL(EXTRACT(EPOCH FROM (NOW() - j.eligible_start_ts)) / 86400.0)
            )::bigint AS eligible_days_calc,
            -- consistency_rate capped at 1.0
            LEAST(1.0,
                j.active_days::double precision /
                GREATEST(1, CEIL(EXTRACT(EPOCH FROM (NOW() - j.eligible_start_ts)) / 86400.0))
            ) AS rate
        FROM joined j
    )
    SELECT
        s.user_id,
        s.full_name,
        s.avatar_url,
        s.district,
        s.training_level,
        s.slm_id,
        s.created_at,
        s.lifetime_score,
        s.reading_points,
        s.active_days,
        s.total_quizzes,
        s.hourly_quizzes,
        s.reading_lessons,
        s.life_skills,
        s.points_earned,
        s.penalties_incurred,
        s.net_points,
        s.eligible_days_calc                                        AS eligible_days,
        s.rate                                                      AS consistency_rate,
        ROUND(s.rate * 100)::integer                                AS consistency_pct,
        ROUND(s.net_points::double precision * (1.0 + s.rate))::bigint AS yearly_score,
        s.active_days >= p_min_active_days                          AS is_qualified,
        GREATEST(0, p_min_active_days - s.active_days::integer)     AS days_needed_to_qualify
    FROM scored s
    -- Qualified players first, then by yearly_score descending
    ORDER BY
        CASE WHEN s.active_days >= p_min_active_days THEN 0 ELSE 1 END,
        ROUND(s.net_points::double precision * (1.0 + s.rate)) DESC,
        s.active_days DESC;
$$;

-- Grant execute to authenticated users (RLS on underlying tables still applies via SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION get_annual_grand_trophy(date, date, timestamptz, integer)
    TO authenticated;
