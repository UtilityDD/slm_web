/**
 * Hourly quiz penalty breakdown for a user (default: last month's #1).
 * Usage: node scripts/maintenance/hourly_penalty_forensic.mjs [YYYY-MM] [user_id]
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

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

function parseMonth(arg) {
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
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);
    const { year, month } = parseMonth(process.argv[2]);
    const startIso = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const endIso = new Date(Date.UTC(year, month, 1)).toISOString();

    // Resolve #1 for month if no user id
    let userId = process.argv[3];
    let rank1Name = null;
    if (!userId) {
        const { data: top } = await sb
            .from('monthly_leaderboard_view')
            .select('user_id, full_name, points, total_penalties')
            .eq('year_num', year)
            .eq('month_num', month)
            .order('points', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (!top) {
            console.error('No monthly leaderboard row for', year, month);
            process.exit(1);
        }
        userId = top.user_id;
        rank1Name = top.full_name;
    }

    const [{ data: profile }, { data: attempts, error }] = await Promise.all([
        sb.from('profiles').select('id, full_name, slm_id, points, total_penalties, created_at').eq('id', userId).single(),
        sb
            .from('quiz_attempts')
            .select('quiz_id, score, penalty, created_at')
            .eq('user_id', userId)
            .like('quiz_id', 'hourly-challenge%')
            .gte('created_at', startIso)
            .lt('created_at', endIso)
            .order('created_at', { ascending: true }),
    ]);

    if (error) {
        console.error(error.message);
        process.exit(1);
    }

    const rows = attempts || [];
    const name = profile?.full_name || rank1Name || userId;

    let gross = 0;
    let pen = 0;
    let withPenalty = 0;
    let zeroNet = 0;
    const penValues = {};
    const netBuckets = {};
    const byDay = {};

    for (const r of rows) {
        const s = Number(r.score) || 0;
        const p = Number(r.penalty) || 0;
        const net = Math.max(0, s - p);
        gross += s;
        pen += p;
        if (p > 0) withPenalty++;
        if (net === 0 && s > 0) zeroNet++;
        if (net === 0 && s === 0 && p === 0) {
            /* skip */
        } else if (net === 0) zeroNet++;

        penValues[p] = (penValues[p] || 0) + 1;
        const nb = net <= 0 ? '0' : net <= 25 ? '1-25' : net <= 40 ? '26-40' : '41-50';
        netBuckets[nb] = (netBuckets[nb] || 0) + 1;

        const day = r.created_at.slice(0, 10);
        if (!byDay[day]) byDay[day] = { plays: 0, gross: 0, pen: 0, net: 0, penalized: 0 };
        byDay[day].plays++;
        byDay[day].gross += s;
        byDay[day].pen += p;
        byDay[day].net += net;
        if (p > 0) byDay[day].penalized++;
    }

    const net = gross - pen;
    const impliedWrongAt15 = Math.round(pen / 15);

    // All-time hourly penalties for same user (context)
    const { data: allHourly } = await sb
        .from('quiz_attempts')
        .select('score, penalty')
        .eq('user_id', userId)
        .like('quiz_id', 'hourly-challenge%');

    let allGross = 0;
    let allPen = 0;
    for (const r of allHourly || []) {
        allGross += Number(r.score) || 0;
        allPen += Number(r.penalty) || 0;
    }

    const { data: mv } = await sb
        .from('monthly_leaderboard_view')
        .select('points, total_penalties, quiz_points, reading_points')
        .eq('user_id', userId)
        .eq('year_num', year)
        .eq('month_num', month)
        .maybeSingle();

    console.log(`\n=== Hourly penalty forensic: ${name} ===`);
    console.log(`SLM: ${profile?.slm_id || '—'} | Period: ${year}-${String(month).padStart(2, '0')} (UTC)`);
    console.log(`Profile lifetime points: ${profile?.points ?? '—'} | profile.total_penalties: ${profile?.total_penalties ?? '—'}`);
    console.log(`Monthly view: points=${mv?.points ?? '—'} view.total_penalties=${mv?.total_penalties ?? '—'}\n`);

    console.log('--- This month: hourly attempts only ---');
    console.log(`Attempts:           ${rows.length}`);
    console.log(`Sum score (gross):    ${gross}`);
    console.log(`Sum penalty:        ${pen}`);
    console.log(`Net (gross - pen):  ${net}  (matches monthly if all hourly)`);
    console.log(`Hours with penalty>0: ${withPenalty} (${((withPenalty / rows.length) * 100 || 0).toFixed(1)}%)`);
    console.log(`Hours with net=0:     ${rows.filter((r) => Math.max(0, (Number(r.score) || 0) - (Number(r.penalty) || 0)) === 0).length}`);
    console.log(`If all penalties were -15/wrong: ~${impliedWrongAt15} wrong-answer equivalents\n`);

    console.log('Penalty amount per hour (how many hours had this total penalty):');
    Object.entries(penValues)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .forEach(([p, c]) => console.log(`  penalty ${p}: ${c} hours`));

    console.log('\nNet score per hour (after penalty):');
    Object.entries(netBuckets)
        .sort()
        .forEach(([b, c]) => console.log(`  net ${b}: ${c} hours`));

    // Wrong count inference when penalty is multiple of 15
    const wrongGuess = {};
    for (const r of rows) {
        const p = Number(r.penalty) || 0;
        if (p === 0) continue;
        const w = p / 15;
        if (Number.isInteger(w) && w >= 1 && w <= 5) {
            wrongGuess[w] = (wrongGuess[w] || 0) + 1;
        }
    }
    if (Object.keys(wrongGuess).length) {
        console.log('\nInferred wrong answers if penalty = 15 × wrong (current app rule >1k pts):');
        Object.entries(wrongGuess)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .forEach(([w, c]) => console.log(`  ${w} wrong: ${c} hours`));
    }

    console.log('\n--- Lifetime hourly (all months) ---');
    console.log(`Hourly attempts: ${(allHourly || []).length}`);
    console.log(`Sum gross: ${allGross} | Sum penalty: ${allPen} | Net: ${allGross - allPen}`);

    console.log('\n--- Top 10 penalty hours this month ---');
    const topPen = [...rows]
        .map((r) => ({
            quiz_id: r.quiz_id,
            score: Number(r.score) || 0,
            penalty: Number(r.penalty) || 0,
            net: Math.max(0, (Number(r.score) || 0) - (Number(r.penalty) || 0)),
            at: r.created_at,
        }))
        .sort((a, b) => b.penalty - a.penalty)
        .slice(0, 10);
    console.log('quiz_id | gross | penalty | net | created_at');
    topPen.forEach((r) => {
        console.log(`${r.quiz_id} | ${r.score} | ${r.penalty} | ${r.net} | ${r.at}`);
    });

    const out = path.join(root, 'scratch', `hourly_penalty_${userId.slice(0, 8)}_${year}-${month}.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(
        out,
        JSON.stringify(
            {
                user: { id: userId, name, profile, monthly_view: mv },
                period: { year, month, startIso, endIso },
                summary: { attempts: rows.length, gross, pen, net, withPenalty },
                penaltyPerHour: penValues,
                netBuckets,
                wrongGuess15: wrongGuess,
                topPenaltyHours: topPen,
                byDay,
            },
            null,
            2
        )
    );
    console.log(`\nJSON: ${out}\n`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
