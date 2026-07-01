/**
 * Top-3 monthly users: hourly DB row count vs scores vs calculated averages.
 * Usage: node scripts/maintenance/preview_top3_hourly_stats.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envPath = path.join(root, '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('Missing .env.local');
    process.exit(1);
}

const env = Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        })
);

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const HOURLY_MAX_PER_SUBMIT = 50;
const now = new Date();
const y = now.getFullYear();
const m = now.getMonth() + 1;
const daysElapsed = Math.max(1, now.getDate());
const start = `${y}-${String(m).padStart(2, '0')}-01T00:00:00`;
const endM = m === 12 ? 1 : m + 1;
const endY = m === 12 ? y + 1 : y;
const end = `${endY}-${String(endM).padStart(2, '0')}-01T00:00:00`;

async function fetchHourlyStats(userId) {
    let offset = 0;
    const pageSize = 1000;
    let rows = 0;
    let grossScore = 0;
    let grossPenalty = 0;

    while (true) {
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('quiz_id, score, penalty')
            .eq('user_id', userId)
            .like('quiz_id', 'hourly-challenge%')
            .gte('created_at', start)
            .lt('created_at', end)
            .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!data?.length) break;

        for (const r of data) {
            rows += 1;
            grossScore += Number(r.score) || 0;
            grossPenalty += Number(r.penalty) || 0;
        }
        if (data.length < pageSize) break;
        offset += pageSize;
    }

    return { rows, grossScore, grossPenalty, netHourly: grossScore - grossPenalty };
}

const { data: topRows, error: topErr } = await sb
    .from('monthly_leaderboard_view')
    .select('user_id, full_name, points, quiz_points, reading_points, total_penalties')
    .eq('year_num', y)
    .eq('month_num', m)
    .order('points', { ascending: false })
    .limit(3);

if (topErr) throw topErr;

const rows = [];
for (const u of topRows || []) {
    const hourly = await fetchHourlyStats(u.user_id);
    const monthlyPoints = Number(u.points) || 0;
    const quizPoints = Number(u.quiz_points) || 0;
    const readingPoints = Number(u.reading_points) || 0;
    const estAttemptsFromGross = hourly.grossScore > 0 ? Math.round(hourly.grossScore / HOURLY_MAX_PER_SUBMIT) : 0;

    rows.push({
        rank: rows.length + 1,
        name: u.full_name || '(no name)',
        hourly_db_row_count: hourly.rows,
        hourly_gross_score_sum: hourly.grossScore,
        hourly_net_score_sum: hourly.netHourly,
        monthly_view_points: monthlyPoints,
        monthly_quiz_points: quizPoints,
        monthly_reading_points: readingPoints,
        days_in_month_so_far: daysElapsed,
        db_avg_per_day: hourly.rows > 0 ? Math.round((hourly.rows / daysElapsed) * 10) / 10 : 0,
        est_attempts_if_gross_div_50: estAttemptsFromGross,
        est_avg_per_day_if_gross_div_50:
            estAttemptsFromGross > 0 ? Math.round((estAttemptsFromGross / daysElapsed) * 10) / 10 : 0,
        avg_monthly_pts_per_hourly_row: hourly.rows > 0 ? Math.round(monthlyPoints / hourly.rows) : 0,
        avg_gross_pts_per_hourly_row: hourly.rows > 0 ? Math.round(hourly.grossScore / hourly.rows) : 0,
    });
}

console.log(`\nMonth: ${y}-${String(m).padStart(2, '0')}  |  Days elapsed (local): ${daysElapsed}\n`);
console.table(rows);
