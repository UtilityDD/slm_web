import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
    fs
        .readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const { data: bonuses, error: bErr } = await sb
    .from('quiz_attempts')
    .select('user_id, quiz_id, score, created_at, profiles(full_name, created_at)')
    .like('quiz_id', 'lesson_bonus%')
    .order('created_at', { ascending: false });
if (bErr) {
    console.error(bErr);
    process.exit(1);
}

const now = Date.now();
const windows = [
    { label: 'last_7_days', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: 'last_30_days', ms: 30 * 24 * 60 * 60 * 1000 },
    { label: 'last_60_days', ms: 60 * 24 * 60 * 60 * 1000 },
    { label: 'last_90_days', ms: 90 * 24 * 60 * 60 * 1000 },
];

const summary = {};
for (const w of windows) {
    const rows = (bonuses || []).filter((r) => now - new Date(r.created_at).getTime() <= w.ms);
    const withTs = rows.filter((r) => r.created_at != null);
    const joinDayOnly = rows.filter((r) => {
        const join = r.profiles?.created_at;
        if (!join) return false;
        return new Date(r.created_at).toDateString() === new Date(join).toDateString();
    });
    const distinctDays = new Set(rows.map((r) => new Date(r.created_at).toDateString())).size;
    summary[w.label] = {
        reading_score_rows: rows.length,
        rows_with_created_at: withTs.length,
        rows_missing_created_at: rows.length - withTs.length,
        unique_users: new Set(rows.map((r) => r.user_id)).size,
        unique_timestamp_days: distinctDays,
        rows_on_user_join_date_only: joinDayOnly.length,
        sample: rows.slice(0, 5).map((r) => ({
            name: r.profiles?.full_name,
            quiz_id: r.quiz_id,
            score: r.score,
            created_at: r.created_at,
            profile_created_at: r.profiles?.created_at,
        })),
    };
}

// Recent profile reading_points changes without matching recent lesson_bonus rows
const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, reading_points, completed_lessons, updated_at, created_at')
    .gt('reading_points', 0);

const recentBonusUserIds = new Set(
    (bonuses || [])
        .filter((r) => now - new Date(r.created_at).getTime() <= 30 * 24 * 60 * 60 * 1000)
        .map((r) => r.user_id)
);

const readersNoRecentBonus = (profiles || []).filter((p) => {
    const lessons = Array.isArray(p.completed_lessons) ? p.completed_lessons.length : 0;
    return lessons > 0 && !recentBonusUserIds.has(p.id);
});

const sorted = [...(bonuses || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
const latestBonusAt = sorted[0]?.created_at ?? null;
const likelyRealRecent = sorted.filter((r) => {
    const join = r.profiles?.created_at;
    if (!join) return true;
    return new Date(r.created_at).getTime() !== new Date(join).getTime();
});

console.log(
    JSON.stringify(
        {
            all_time_lesson_bonus_rows: (bonuses || []).length,
            all_rows_have_created_at: (bonuses || []).every((r) => r.created_at != null),
            latest_lesson_bonus_timestamp: latestBonusAt,
            likely_real_reading_timestamps_all_time: likelyRealRecent.length,
            recent_windows: summary,
            readers_with_points_but_no_bonus_in_last_30d: readersNoRecentBonus.length,
            sample_readers_no_recent_bonus: readersNoRecentBonus.slice(0, 8).map((p) => ({
                name: p.full_name,
                reading_points: p.reading_points,
                lessons: Array.isArray(p.completed_lessons) ? p.completed_lessons.length : 0,
                profile_updated_at: p.updated_at,
            })),
            latest_10_lesson_bonus_rows: sorted.slice(0, 10).map((r) => ({
                created_at: r.created_at,
                quiz_id: r.quiz_id,
                name: r.profiles?.full_name,
                same_as_join: r.profiles?.created_at
                    ? new Date(r.created_at).getTime() === new Date(r.profiles.created_at).getTime()
                    : null,
            })),
        },
        null,
        2
    )
);
