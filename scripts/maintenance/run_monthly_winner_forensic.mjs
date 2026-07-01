/**
 * Read-only forensic report: last calendar month's #1 on monthly_leaderboard_view.
 * Usage: node scripts/maintenance/run_monthly_winner_forensic.mjs [YYYY-MM]
 * Requires .env.local: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (or SERVICE_ROLE for full read)
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const env = {};
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i < 1) continue;
        const key = t.slice(0, i).trim();
        let val = t.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[key] = val;
    }
    return env;
}

function categorizeQuizId(quizId) {
    if (!quizId) return 'other';
    if (quizId.startsWith('lesson_bonus')) return 'reading';
    if (quizId.startsWith('hourly-challenge')) return 'hourly';
    return 'other_quiz';
}

function monthBoundsUtc(year, month) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    return { start, end, startIso: start.toISOString(), endIso: end.toISOString() };
}

function parseTargetMonth(arg) {
    const now = new Date();
    if (arg && /^\d{4}-\d{1,2}$/.test(arg)) {
        const [y, m] = arg.split('-').map(Number);
        return { year: y, month: m };
    }
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const url = env.VITE_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error('Missing VITE_SUPABASE_URL or key in .env.local');
        process.exit(1);
    }

    const target = parseTargetMonth(process.argv[2]);
    const { year, month } = target;
    const bounds = monthBoundsUtc(year, month);

    const supabase = createClient(url, key);

    console.log(`\n=== Monthly winner forensic: ${year}-${String(month).padStart(2, '0')} (UTC bucket) ===\n`);

    const { data: monthlyRows, error: mErr } = await supabase
        .from('monthly_leaderboard_view')
        .select('*')
        .eq('year_num', year)
        .eq('month_num', month)
        .order('points', { ascending: false })
        .limit(5);

    if (mErr) {
        console.error('monthly_leaderboard_view:', mErr.message);
        process.exit(1);
    }
    if (!monthlyRows?.length) {
        console.log('No rows for that month.');
        process.exit(0);
    }

    const winner = monthlyRows[0];
    const userId = winner.user_id;

    const [{ data: profile }, { data: allTime }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('leaderboard_view').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const { data: attempts, error: aErr } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, score, penalty, created_at')
        .eq('user_id', userId)
        .gte('created_at', bounds.startIso)
        .lt('created_at', bounds.endIso)
        .order('created_at', { ascending: true });

    if (aErr) {
        console.error('quiz_attempts:', aErr.message);
        process.exit(1);
    }

    const rows = attempts || [];
    let gross = 0;
    let pen = 0;
    let readingGross = 0;
    const byCat = {};
    const byQuiz = {};
    const flags = [];

    for (const r of rows) {
        const s = Number(r.score) || 0;
        const p = Number(r.penalty) || 0;
        gross += s;
        pen += p;
        const cat = categorizeQuizId(r.quiz_id);
        if (cat === 'reading') readingGross += s;
        if (!byCat[cat]) byCat[cat] = { rows: 0, gross: 0, pen: 0, net: 0, distinctIds: new Set() };
        byCat[cat].rows += 1;
        byCat[cat].gross += s;
        byCat[cat].pen += p;
        byCat[cat].net += s - p;
        byCat[cat].distinctIds.add(r.quiz_id);

        if (!byQuiz[r.quiz_id]) byQuiz[r.quiz_id] = { count: 0, gross: 0, pen: 0, net: 0, first: r.created_at, last: r.created_at };
        const q = byQuiz[r.quiz_id];
        q.count += 1;
        q.gross += s;
        q.pen += p;
        q.net += s - p;
        if (r.created_at < q.first) q.first = r.created_at;
        if (r.created_at > q.last) q.last = r.created_at;

        if (r.quiz_id?.startsWith('lesson_bonus') && s !== 20) {
            flags.push({ severity: 'medium', flag: 'lesson_bonus_not_20', quiz_id: r.quiz_id, score: s });
        }
        if (r.quiz_id?.startsWith('hourly-challenge') && s > 100) {
            flags.push({ severity: 'medium', flag: 'hourly_score_over_100', quiz_id: r.quiz_id, score: s });
        }
        if (/^hourly-challenge-[0-9]{10}$/.test(r.quiz_id || '')) {
            flags.push({ severity: 'medium', flag: 'legacy_hourly_id', quiz_id: r.quiz_id });
        }
        if (s < p) flags.push({ severity: 'low', flag: 'score_lt_penalty', quiz_id: r.quiz_id, score: s, penalty: p });
    }

    for (const [qid, q] of Object.entries(byQuiz)) {
        if (q.count > 1) {
            flags.push({
                severity: 'high',
                flag: 'duplicate_quiz_id',
                quiz_id: qid,
                count: q.count,
                net: q.net,
            });
        }
    }

    const netFromAttempts = gross - pen;
    const quizNet = netFromAttempts - readingGross;
    const viewPoints = Number(winner.points) || 0;
    const allTimeScore = Number(allTime?.score ?? profile?.points) || 0;

    const joinUtc = profile?.created_at ? new Date(profile.created_at) : null;
    const joinedInMonth =
        joinUtc &&
        joinUtc.getUTCFullYear() === year &&
        joinUtc.getUTCMonth() + 1 === month;
    const viewReading = Number(winner.reading_points) || 0;
    const profileReading = Number(profile?.reading_points) || 0;
    const readingGap = joinedInMonth ? Math.max(0, profileReading - viewReading) : 0;
    const appDisplayPoints = viewPoints + readingGap;

    if (viewPoints > allTimeScore) {
        flags.push({
            severity: 'high',
            flag: 'monthly_view_gt_all_time',
            monthly: viewPoints,
            all_time: allTimeScore,
        });
    }
    if (Math.abs(netFromAttempts - viewPoints) > 1) {
        flags.push({
            severity: 'high',
            flag: 'recomputed_net_vs_monthly_view',
            recomputed: netFromAttempts,
            monthly_view: viewPoints,
            diff: netFromAttempts - viewPoints,
        });
    }

    const report = {
        period: { year, month, utc: bounds },
        rank1: {
            user_id: userId,
            full_name: winner.full_name,
            monthly_view: {
                points: viewPoints,
                quiz_points: winner.quiz_points,
                reading_points: viewReading,
                total_penalties: winner.total_penalties,
            },
            app_would_show_if_new_user_this_month: {
                joined_in_month_utc: joinedInMonth,
                reading_gap_added: readingGap,
                display_points: appDisplayPoints,
            },
            profile: profile
                ? {
                      slm_id: profile.slm_id,
                      created_at: profile.created_at,
                      points: profile.points,
                      reading_points: profileReading,
                      quiz_points: profile.quiz_points,
                      total_penalties: profile.total_penalties,
                  }
                : null,
            all_time_leaderboard_score: allTimeScore,
        },
        recomputed_from_attempts_utc_month: {
            attempt_rows: rows.length,
            gross_score: gross,
            penalties: pen,
            net_points: netFromAttempts,
            reading_gross: readingGross,
            quiz_net: quizNet,
        },
        by_category: Object.fromEntries(
            Object.entries(byCat).map(([k, v]) => [
                k,
                {
                    rows: v.rows,
                    distinct_quiz_ids: v.distinctIds.size,
                    gross: v.gross,
                    penalties: v.pen,
                    net: v.net,
                },
            ])
        ),
        top_quiz_ids: Object.entries(byQuiz)
            .map(([quiz_id, v]) => ({ quiz_id, ...v }))
            .sort((a, b) => b.net - a.net)
            .slice(0, 25),
        top5_that_month: monthlyRows.map((r, i) => ({
            rank: i + 1,
            name: r.full_name,
            points: r.points,
            quiz_points: r.quiz_points,
            reading_points: r.reading_points,
        })),
        red_flags: flags,
        ledger_sample: rows.slice(0, 5).concat(rows.length > 10 ? [{ note: `... ${rows.length - 10} more rows` }] : [], rows.slice(-5)),
    };

    const outPath = path.join(root, 'scratch', `monthly_winner_forensic_${year}-${month}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    console.log('Winner:', winner.full_name, `(${userId})`);
    console.log('Monthly view points:', viewPoints, '| Recomputed net (UTC month):', netFromAttempts);
    console.log('All-time score:', allTimeScore);
    if (readingGap > 0) {
        console.log('App reading gap (new user): +', readingGap, '→ display', appDisplayPoints);
    }
    console.log('\nBy category:');
    console.table(
        Object.entries(report.by_category).map(([cat, v]) => ({
            category: cat,
            rows: v.rows,
            distinct_ids: v.distinct_quiz_ids,
            net: v.net,
        }))
    );
    console.log('\nRed flags:', flags.length ? flags : '(none)');
    console.log('\nFull report:', outPath);
    console.log('\nTop 5 that month:');
    console.table(report.top5_that_month);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
