/**
 * Preview New Player / Most Improved / Top Learner boards for current month.
 * Usage: node scripts/maintenance/preview_encouragement_boards.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
    fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const NEW_PLAYER_DAYS = 90;
const NEW_MIN_POINTS = 500;
const NEW_MIN_HOURLY = 15;
const NEW_MIN_LESSONS = 5;
const IMPROVE_MIN_PREV = 200;
const IMPROVE_MIN_CUR = 500;
const LEARNER_MIN_LESSONS = 8;

const now = new Date();
const y = now.getFullYear();
const m = now.getMonth() + 1;
const prevM = m === 1 ? 12 : m - 1;
const prevY = m === 1 ? y - 1 : y;

const monthEnd = new Date(y, m, 0, 23, 59, 59);
const newPlayerCutoff = new Date(monthEnd);
newPlayerCutoff.setDate(newPlayerCutoff.getDate() - NEW_PLAYER_DAYS);

async function fetchMonthlyRows(year, month) {
    const { data, error } = await sb
        .from('monthly_leaderboard_view')
        .select('user_id, full_name, points, reading_points, quiz_points, total_penalties, month_num, year_num, profiles(slm_id, district, created_at, reading_points)')
        .eq('year_num', year)
        .eq('month_num', month);
    if (error) throw error;
    return data || [];
}

async function fetchHourlyCounts(userIds, year, month) {
    if (!userIds.length) return {};
    const start = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00`;

    const counts = {};
    for (let i = 0; i < userIds.length; i += 50) {
        const batch = userIds.slice(i, i + 50);
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('user_id')
            .in('user_id', batch)
            .like('quiz_id', 'hourly-challenge-%')
            .gte('created_at', start)
            .lt('created_at', end);
        if (error) throw error;
        for (const row of data || []) {
            counts[row.user_id] = (counts[row.user_id] || 0) + 1;
        }
    }
    return counts;
}

async function fetchLessonBonusCounts(userIds, year, month) {
    if (!userIds.length) return {};
    const start = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00`;

    const counts = {};
    for (let i = 0; i < userIds.length; i += 50) {
        const batch = userIds.slice(i, i + 50);
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('user_id, quiz_id')
            .in('user_id', batch)
            .like('quiz_id', 'lesson_bonus%')
            .gte('created_at', start)
            .lt('created_at', end);
        if (error) throw error;
        const seen = {};
        for (const row of data || []) {
            const key = `${row.user_id}:${row.quiz_id}`;
            if (!seen[key]) {
                seen[key] = true;
                counts[row.user_id] = (counts[row.user_id] || 0) + 1;
            }
        }
    }
    return counts;
}

function displayPoints(row) {
    const base = Number(row.points) || 0;
    const join = row.profiles?.created_at ? new Date(row.profiles.created_at) : null;
    const startOfMonth = new Date(y, m - 1, 1).getTime();
    const isNewThisMonth = join && join.getTime() >= startOfMonth;
    const viewReading = Number(row.reading_points) || 0;
    const profileReading = Number(row.profiles?.reading_points) || 0;
    const gap = isNewThisMonth ? Math.max(0, profileReading - viewReading) : 0;
    return base + gap;
}

function enrich(rows) {
    return rows.map((r) => ({
        user_id: r.user_id,
        name: r.full_name || 'Unknown',
        slm_id: r.profiles?.slm_id || null,
        district: r.profiles?.district || null,
        joined: r.profiles?.created_at || null,
        points: displayPoints(r),
        reading: Number(r.reading_points) || 0,
        penalties: Number(r.total_penalties) || 0,
    }));
}

const [curRows, prevRows] = await Promise.all([
    fetchMonthlyRows(y, m),
    fetchMonthlyRows(prevY, prevM),
]);

const cur = enrich(curRows).sort((a, b) => b.points - a.points);
const prevMap = Object.fromEntries(enrich(prevRows).map((r) => [r.user_id, r]));

const allIds = cur.map((r) => r.user_id);
const [hourlyCur, lessonsCur] = await Promise.all([
    fetchHourlyCounts(allIds, y, m),
    fetchLessonBonusCounts(allIds, y, m),
]);

// Main monthly top 10
const mainTop10 = cur.slice(0, 10);

// New players (90-day join)
const newPool = cur.filter((r) => {
    if (!r.joined) return false;
    return new Date(r.joined) >= newPlayerCutoff;
});

const newEligible = newPool.filter((r) => {
    const hourly = hourlyCur[r.user_id] || 0;
    const lessons = lessonsCur[r.user_id] || 0;
    return r.points >= NEW_MIN_POINTS || hourly >= NEW_MIN_HOURLY || lessons >= NEW_MIN_LESSONS;
});

const newRanked = [...newEligible].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const ah = hourlyCur[a.user_id] || 0;
    const bh = hourlyCur[b.user_id] || 0;
    if (bh !== ah) return bh - ah;
    if (b.reading !== a.reading) return b.reading - a.reading;
    return new Date(a.joined) - new Date(b.joined);
});

// Most improved
const mainPrevTop1 = [...enrich(prevRows)].sort((a, b) => b.points - a.points)[0];
const improvedPool = cur.filter((r) => {
    const join = r.joined ? new Date(r.joined) : null;
    const monthStart = new Date(y, m - 1, 1);
    if (!join || join >= monthStart) return false; // account older than 30 days
    const prev = prevMap[r.user_id];
    if (!prev || prev.points < IMPROVE_MIN_PREV) return false;
    if (r.points < IMPROVE_MIN_CUR) return false;
    if (mainPrevTop1 && r.user_id === mainPrevTop1.user_id) return false;
    return true;
});

const improvedRanked = improvedPool
    .map((r) => ({
        ...r,
        prev_points: prevMap[r.user_id].points,
        improvement: r.points - prevMap[r.user_id].points,
        hourly: hourlyCur[r.user_id] || 0,
    }))
    .sort((a, b) => {
        if (b.improvement !== a.improvement) return b.improvement - a.improvement;
        if (b.points !== a.points) return b.points - a.points;
        if (b.hourly !== a.hourly) return b.hourly - a.hourly;
        return a.penalties - b.penalties;
    });

// Top learner
const learnerPool = cur
    .map((r) => ({
        ...r,
        lesson_count: lessonsCur[r.user_id] || 0,
        learner_score: Number(curRows.find((x) => x.user_id === r.user_id)?.reading_points) || 0,
    }))
    .filter((r) => r.lesson_count >= LEARNER_MIN_LESSONS);

const learnerRanked = [...learnerPool].sort((a, b) => {
    if (b.learner_score !== a.learner_score) return b.learner_score - a.learner_score;
    if (b.lesson_count !== a.lesson_count) return b.lesson_count - a.lesson_count;
    return new Date(a.joined) - new Date(b.joined);
});

const fmt = (rows, extra = () => ({})) =>
    rows.slice(0, 10).map((r, i) => ({
        rank: i + 1,
        name: r.name,
        slm_id: r.slm_id,
        district: r.district,
        points: r.points,
        ...extra(r),
    }));

const report = {
    as_of: now.toISOString(),
    month: `${y}-${String(m).padStart(2, '0')}`,
    previous_month: `${prevY}-${String(prevM).padStart(2, '0')}`,
    new_player_cutoff: newPlayerCutoff.toISOString().slice(0, 10),
    rules: {
        new_player_days: NEW_PLAYER_DAYS,
        new_min_points: NEW_MIN_POINTS,
        new_min_hourly: NEW_MIN_HOURLY,
        new_min_lessons: NEW_MIN_LESSONS,
        improve_min_prev: IMPROVE_MIN_PREV,
        improve_min_cur: IMPROVE_MIN_CUR,
        learner_min_lessons: LEARNER_MIN_LESSONS,
    },
    counts: {
        main_monthly_players: cur.length,
        new_player_pool_90d: newPool.length,
        new_player_eligible: newEligible.length,
        most_improved_eligible: improvedPool.length,
        top_learner_eligible: learnerPool.length,
    },
    main_monthly_top10: fmt(mainTop10),
    new_player_champion_top10: fmt(newRanked, (r) => ({
        hourly_plays: hourlyCur[r.user_id] || 0,
        lessons: lessonsCur[r.user_id] || 0,
        joined: r.joined?.slice(0, 10),
    })),
    most_improved_top10: improvedRanked.slice(0, 10).map((r, i) => ({
        rank: i + 1,
        name: r.name,
        slm_id: r.slm_id,
        this_month: r.points,
        last_month: r.prev_points,
        improvement: r.improvement,
        hourly_plays: r.hourly,
    })),
    top_learner_top10: learnerRanked.slice(0, 10).map((r, i) => ({
        rank: i + 1,
        name: r.name,
        slm_id: r.slm_id,
        learner_score: r.learner_score,
        lessons_this_month: r.lesson_count,
    })),
};

console.log(JSON.stringify(report, null, 2));
