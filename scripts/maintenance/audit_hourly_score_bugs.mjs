/**
 * READ-ONLY: scan hourly scores for bugs after makeup + pack-weighted avg.
 * Flags:
 *  - consecutive multi-pack when prior hour already played (stale makeup lookback)
 *  - score > 300 or packs > 6
 *  - score > expected max given consecutive-miss lookback from same-day history
 *
 * Usage: node scripts/maintenance/audit_hourly_score_bugs.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    HOURLY_POINTS_PER_PACK,
    HOURLY_MAX_MAKEUP_HOURS,
    countRecentMissedHours,
    buildMakeupSession,
    estimateHourlyPacksFromScore,
    computePackWeightedHourlyAvg,
} from '../../src/utils/hourlyMakeup.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TZ = 'Asia/Kolkata';
const HARD_MAX = HOURLY_POINTS_PER_PACK * (1 + HOURLY_MAX_MAKEUP_HOURS); // 300

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

function parseQuizId(q) {
    const m = String(q || '').match(/^hourly-challenge-(\d{4})-(\d{2})-(\d{2})-(\d{1,2})$/);
    return m ? { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], key: `${m[1]}-${m[2]}-${m[3]}` } : null;
}

function round1(n) {
    return Math.round(n * 10) / 10;
}

async function fetchMonthHourly(sb, userId, start, end) {
    let from = 0;
    let all = [];
    while (true) {
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('quiz_id, score, penalty, created_at')
            .eq('user_id', userId)
            .like('quiz_id', 'hourly-challenge-%')
            .gte('created_at', start)
            .lt('created_at', end)
            .order('created_at', { ascending: true })
            .range(from, from + 999);
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < 1000) break;
        from += 1000;
    }
    return all;
}

function analyzeUser(name, rows) {
    const oldAvg = rows.length
        ? round1(rows.reduce((s, r) => s + (Number(r.score) || 0), 0) / rows.length)
        : 0;
    const newAvg = round1(computePackWeightedHourlyAvg(rows));

    const flags = [];
    // Chronological by quiz slot within day, then by created_at
    const sorted = [...rows].sort((a, b) => {
        const pa = parseQuizId(a.quiz_id);
        const pb = parseQuizId(b.quiz_id);
        if (!pa || !pb) return String(a.created_at).localeCompare(String(b.created_at));
        if (pa.key !== pb.key) return pa.key.localeCompare(pb.key);
        if (pa.h !== pb.h) return pa.h - pb.h;
        return String(a.created_at).localeCompare(String(b.created_at));
    });

    const playedByDay = new Map(); // dayKey -> Set of hours already seen (in slot order)

    for (const r of sorted) {
        const slot = parseQuizId(r.quiz_id);
        const score = Number(r.score) || 0;
        const penalty = Number(r.penalty) || 0;
        const packsEst = estimateHourlyPacksFromScore(score);

        if (score > HARD_MAX) {
            flags.push({
                type: 'OVER_HARD_MAX',
                quiz_id: r.quiz_id,
                score,
                penalty,
                detail: `score ${score} > ${HARD_MAX}`,
            });
        }
        if (packsEst > 1 + HOURLY_MAX_MAKEUP_HOURS) {
            flags.push({
                type: 'OVER_PACK_CAP',
                quiz_id: r.quiz_id,
                score,
                packsEst,
                detail: `est packs ${packsEst} > 6`,
            });
        }

        if (!slot) continue;
        const dayPlayed = playedByDay.get(slot.key) || new Set();
        const expectedMissed = countRecentMissedHours(slot.h, dayPlayed);
        const expected = buildMakeupSession(expectedMissed);
        const expectedMax = expected.pointsReward;

        // Multi-pack when prior hour already played → expected packs should be 1
        if (packsEst > 1 && expected.packs === 1) {
            flags.push({
                type: 'MAKEUP_WITH_PRIOR_PLAYED',
                quiz_id: r.quiz_id,
                score,
                packsEst,
                expected_packs: 1,
                expected_max: expectedMax,
                prior_hours: [...dayPlayed].sort((a, b) => a - b).join(','),
                detail: `est ${packsEst} packs but prior hour(s) played same day → max should be ${expectedMax}`,
            });
        } else if (score > expectedMax + 0) {
            // Allow half-score ambiguity: if score > expectedMax, still flag
            // Exception: half-time undercount means packsEst may be low while score still ≤ expectedMax
            flags.push({
                type: 'SCORE_ABOVE_LOOKBACK_MAX',
                quiz_id: r.quiz_id,
                score,
                packsEst,
                expected_packs: expected.packs,
                expected_max: expectedMax,
                prior_hours: [...dayPlayed].sort((a, b) => a - b).join(','),
                detail: `score ${score} > lookback max ${expectedMax} (${expected.packs} packs)`,
            });
        }

        dayPlayed.add(slot.h);
        playedByDay.set(slot.key, dayPlayed);
    }

    return {
        name,
        n: rows.length,
        oldAvg,
        newAvg,
        delta: round1(oldAvg - newAvg),
        over50: rows.filter((r) => (Number(r.score) || 0) > 50).length,
        maxScore: rows.reduce((m, r) => Math.max(m, Number(r.score) || 0), 0),
        flagCount: flags.length,
        flags,
    };
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();
    const monthLabel = `${y}-${String(m).padStart(2, '0')}`;

    const { data: monthly, error } = await sb
        .from('monthly_leaderboard_view')
        .select('user_id, full_name, points, quiz_points')
        .eq('year_num', y)
        .eq('month_num', m)
        .order('points', { ascending: false })
        .limit(40);
    if (error) throw error;

    const summaries = [];
    const allFlags = [];

    for (const u of monthly || []) {
        const rows = await fetchMonthHourly(sb, u.user_id, start, end);
        if (!rows.length) continue;
        const result = analyzeUser(u.full_name || '(no name)', rows);
        summaries.push({
            name: result.name,
            points: u.points,
            n: result.n,
            oldAvg: result.oldAvg,
            newAvg: result.newAvg,
            delta: result.delta,
            over50: result.over50,
            max: result.maxScore,
            flags: result.flagCount,
        });
        for (const f of result.flags) {
            allFlags.push({ name: result.name, ...f });
        }
    }

    summaries.sort((a, b) => b.flags - a.flags || b.delta - a.delta);

    console.log(`\n=== Hourly score bug scan (${monthLabel}, top ${monthly?.length || 0} monthly) ===\n`);
    console.log('Pack-weighted avg vs old per-submit avg (delta = old − new):');
    console.table(summaries);

    const byType = {};
    for (const f of allFlags) {
        byType[f.type] = (byType[f.type] || 0) + 1;
    }
    console.log('\nFlag totals:', byType);
    console.log(`Total flagged attempts: ${allFlags.length}`);

    // Show worst offenders
    const makeupBugs = allFlags.filter((f) => f.type === 'MAKEUP_WITH_PRIOR_PLAYED' || f.type === 'SCORE_ABOVE_LOOKBACK_MAX');
    console.log(`\n--- Makeup lookback violations (${makeupBugs.length}) — sample up to 40 ---`);
    console.table(
        makeupBugs.slice(0, 40).map((f) => ({
            name: f.name,
            quiz_id: f.quiz_id,
            score: f.score,
            packsEst: f.packsEst,
            expected_packs: f.expected_packs,
            expected_max: f.expected_max,
            type: f.type,
        }))
    );

    const hard = allFlags.filter((f) => f.type === 'OVER_HARD_MAX' || f.type === 'OVER_PACK_CAP');
    if (hard.length) {
        console.log('\n--- Hard max violations ---');
        console.table(hard);
    } else {
        console.log('\nNo scores above absolute cap 300.');
    }

    // Per-user flag counts
    const perUser = {};
    for (const f of makeupBugs) {
        perUser[f.name] = (perUser[f.name] || 0) + 1;
    }
    console.log('\nPlayers with makeup-lookback violations:');
    console.table(
        Object.entries(perUser)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, violations: count }))
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
