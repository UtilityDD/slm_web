/**
 * READ-ONLY: find users whose avg hourly score looks "impossible" under old max=50,
 * and explain makeup / half-score contributions for a named user.
 *
 * Usage:
 *   node scripts/maintenance/audit_avg_hourly_score_anomaly.mjs
 *   node scripts/maintenance/audit_avg_hourly_score_anomaly.mjs "Asif"
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OLD_MAX = 50; // pre-makeup single-pack max (gross)
const MAKEUP_MAX = 300; // 6 packs × 50

function loadEnv(filePath) {
    const env = {};
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i < 1) continue;
        let val = t.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[t.slice(0, i).trim()] = val;
    }
    return env;
}

function round1(n) {
    return Math.round(n * 10) / 10;
}

async function fetchAllHourly(sb, userId, { start, end } = {}) {
    let from = 0;
    let all = [];
    while (true) {
        let q = sb
            .from('quiz_attempts')
            .select('quiz_id, score, penalty, created_at')
            .eq('user_id', userId)
            .like('quiz_id', 'hourly-challenge-%')
            .order('created_at', { ascending: true })
            .range(from, from + 999);
        if (start) q = q.gte('created_at', start);
        if (end) q = q.lt('created_at', end);
        const { data, error } = await q;
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < 1000) break;
        from += 1000;
    }
    return all;
}

function summarize(rows) {
    const n = rows.length;
    if (!n) {
        return {
            n: 0,
            grossSum: 0,
            netSum: 0,
            avgGross: 0,
            avgNet: 0,
            over50: 0,
            over50Sum: 0,
            maxScore: 0,
            halfish: 0, // scores like 25, 75, 125 that look half-pack
            scoreBuckets: {},
        };
    }
    let grossSum = 0;
    let netSum = 0;
    let over50 = 0;
    let over50Sum = 0;
    let maxScore = 0;
    let halfish = 0;
    const scoreBuckets = {};
    for (const r of rows) {
        const score = Number(r.score) || 0;
        const penalty = Number(r.penalty) || 0;
        grossSum += score;
        netSum += score - penalty;
        maxScore = Math.max(maxScore, score);
        if (score > OLD_MAX) {
            over50 += 1;
            over50Sum += score;
        }
        // half-pack timing often yields .5 pack multiples of 25
        if (score > 0 && score % 25 === 0 && score % 50 !== 0) halfish += 1;
        const key = score > OLD_MAX ? `>${OLD_MAX}` : String(score);
        scoreBuckets[key] = (scoreBuckets[key] || 0) + 1;
    }
    return {
        n,
        grossSum,
        netSum,
        avgGross: round1(grossSum / n),
        avgNet: round1(netSum / n),
        over50,
        over50Sum,
        maxScore,
        halfish,
        scoreBuckets,
    };
}

async function main() {
    const nameFilter = process.argv[2] || null;
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();
    const monthLabel = `${y}-${String(m).padStart(2, '0')}`;

    // Focus: monthly leaderboard actives + optional name search
    const { data: monthly, error: mErr } = await sb
        .from('monthly_leaderboard_view')
        .select('user_id, full_name, points, quiz_points, reading_points, total_penalties')
        .eq('year_num', y)
        .eq('month_num', m)
        .order('points', { ascending: false })
        .limit(80);
    if (mErr) throw mErr;

    let targets = (monthly || []).map((r) => ({
        id: r.user_id,
        full_name: r.full_name,
        monthly_points: r.points,
        quiz_points: r.quiz_points,
    }));

    if (nameFilter) {
        const { data: profiles, error: pErr } = await sb
            .from('profiles')
            .select('id, full_name, slm_id, quiz_points, points')
            .ilike('full_name', `%${nameFilter}%`);
        if (pErr) throw pErr;
        for (const p of profiles || []) {
            if (!targets.some((t) => t.id === p.id)) {
                targets.unshift({
                    id: p.id,
                    full_name: p.full_name,
                    monthly_points: null,
                    quiz_points: p.quiz_points,
                    slm_id: p.slm_id,
                });
            }
        }
    }

    const anomalous = [];
    const detailFor = [];

    for (const t of targets) {
        const monthRows = await fetchAllHourly(sb, t.id, { start, end });
        const allRows = await fetchAllHourly(sb, t.id);
        const month = summarize(monthRows);
        const all = summarize(allRows);

        const row = {
            name: t.full_name,
            monthly_points: t.monthly_points,
            month_attempts: month.n,
            month_avg_gross: month.avgGross,
            month_avg_net: month.avgNet,
            month_over50: month.over50,
            month_max: month.maxScore,
            all_attempts: all.n,
            all_avg_gross: all.avgGross,
            all_avg_net: all.avgNet,
            all_over50: all.over50,
            all_max: all.maxScore,
            // UI sheet uses ALL-TIME avg gross (LeaderboardUserSheet)
            ui_avg_hourly_score: all.avgGross,
            impossible_under_old_max50: all.avgGross > OLD_MAX || month.avgGross > OLD_MAX,
            has_makeup_scores: all.over50 > 0 || month.over50 > 0,
        };

        if (
            row.impossible_under_old_max50 ||
            row.has_makeup_scores ||
            (nameFilter && String(t.full_name || '').toLowerCase().includes(nameFilter.toLowerCase()))
        ) {
            anomalous.push(row);
        }

        if (nameFilter && String(t.full_name || '').toLowerCase().includes(nameFilter.toLowerCase())) {
            detailFor.push({
                profile: t,
                month,
                all,
                monthHigh: monthRows
                    .filter((r) => (Number(r.score) || 0) > OLD_MAX)
                    .map((r) => ({
                        quiz_id: r.quiz_id,
                        score: r.score,
                        penalty: r.penalty,
                        net: (Number(r.score) || 0) - (Number(r.penalty) || 0),
                        created_at: r.created_at,
                    })),
            });
        }
    }

    anomalous.sort((a, b) => (b.ui_avg_hourly_score || 0) - (a.ui_avg_hourly_score || 0));

    console.log(`\n=== Avg hourly score anomaly scan (${monthLabel}) ===`);
    console.log(`Old single-pack max gross=${OLD_MAX}; makeup max gross=${MAKEUP_MAX}`);
    console.log(`UI formula (LeaderboardUserSheet): sum(score)/count(hourly attempts) ALL-TIME, gross (ignores penalty).`);
    console.log(`Users with avg>50 and/or any score>50 (from top ${targets.length} monthly + name hits):\n`);
    console.table(
        anomalous.map((r) => ({
            name: r.name,
            ui_avg_all_time: r.ui_avg_hourly_score,
            all_n: r.all_attempts,
            all_over50: r.all_over50,
            all_max: r.all_max,
            mo_avg: r.month_avg_gross,
            mo_n: r.month_attempts,
            mo_over50: r.month_over50,
            mo_max: r.month_max,
        }))
    );

    const uiOver50 = anomalous.filter((r) => r.ui_avg_hourly_score > OLD_MAX);
    console.log(`\nUsers whose ALL-TIME UI avg > ${OLD_MAX}: ${uiOver50.length}`);
    console.table(uiOver50.map((r) => ({ name: r.name, ui_avg: r.ui_avg_hourly_score, over50_attempts: r.all_over50, max: r.all_max })));

    for (const d of detailFor) {
        console.log(`\n=== DETAIL: ${d.profile.full_name} ===`);
        console.log('ALL-TIME (what UI Avg score uses):', d.all);
        console.log(`${monthLabel}:`, d.month);
        console.log(`Makeup / high scores this month (${d.monthHigh.length}):`);
        console.table(d.monthHigh);
        // Reconstruct why avg can exceed 50
        if (d.all.n > 0) {
            const normalish = d.all.n - d.all.over50;
            const normalSum = d.all.grossSum - d.all.over50Sum;
            console.log(
                `Reconstruction: (${normalish} attempts ≤50 sum≈${normalSum}) + (${d.all.over50} makeup sum=${d.all.over50Sum}) / ${d.all.n} = ${d.all.avgGross}`
            );
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
