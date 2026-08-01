/**
 * READ-ONLY: August 2026 monthly leaderboard — current (UTC view) vs IST-rebucketed.
 * Shows who would gain/lose if month bucketing moved to IST. UI net-display fix changes nobody.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const Y = 2026;
const M = 8; // this month

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

function istYm(iso) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(new Date(iso));
    return {
        y: Number(parts.find((x) => x.type === 'year').value),
        m: Number(parts.find((x) => x.type === 'month').value),
    };
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    // Current published monthly board (UTC EXTRACT via view)
    const { data: viewRows, error: vErr } = await sb
        .from('monthly_leaderboard_view')
        .select('user_id, full_name, points, quiz_points, reading_points, total_penalties')
        .eq('year_num', Y)
        .eq('month_num', M)
        .order('points', { ascending: false })
        .limit(100);
    if (vErr) throw vErr;

    // Fetch attempts that could belong to Aug under either UTC or IST:
    // UTC Aug: 2026-08-01 00:00Z .. 2026-09-01 00:00Z
    // IST Aug: 2026-07-31 18:30Z .. 2026-08-31 18:30Z
    // Union window: 2026-07-31 18:30Z .. 2026-09-01 00:00Z
    const start = '2026-07-31T18:30:00.000Z';
    const end = '2026-09-01T00:00:00.000Z';

    let attempts = [];
    let from = 0;
    while (true) {
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('user_id, quiz_id, score, penalty, created_at')
            .gte('created_at', start)
            .lt('created_at', end)
            .order('created_at', { ascending: true })
            .range(from, from + 999);
        if (error) throw error;
        attempts = attempts.concat(data || []);
        if (!data || data.length < 1000) break;
        from += 1000;
    }

    const utc = new Map(); // user_id -> net
    const ist = new Map();
    const names = new Map((viewRows || []).map((r) => [r.user_id, r.full_name]));

    // Also need names for IST-only users
    const needNames = new Set();

    for (const a of attempts) {
        const net = (Number(a.score) || 0) - (Number(a.penalty) || 0);
        const d = new Date(a.created_at);
        const utcY = d.getUTCFullYear();
        const utcM = d.getUTCMonth() + 1;
        if (utcY === Y && utcM === M) {
            utc.set(a.user_id, (utc.get(a.user_id) || 0) + net);
            needNames.add(a.user_id);
        }
        const { y, m } = istYm(a.created_at);
        if (y === Y && m === M) {
            ist.set(a.user_id, (ist.get(a.user_id) || 0) + net);
            needNames.add(a.user_id);
        }
    }

    const missing = [...needNames].filter((id) => !names.has(id));
    if (missing.length) {
        const { data: profs } = await sb.from('profiles').select('id, full_name').in('id', missing);
        for (const p of profs || []) names.set(p.id, p.full_name);
    }

    const allIds = new Set([...utc.keys(), ...ist.keys(), ...(viewRows || []).map((r) => r.user_id)]);

    const rows = [...allIds].map((id) => {
        const currentView = Number((viewRows || []).find((r) => r.user_id === id)?.points) || 0;
        const utcNet = utc.get(id) || 0;
        const istNet = ist.get(id) || 0;
        return {
            name: names.get(id) || id.slice(0, 8),
            user_id: id,
            current_board_UTC: currentView,
            recomputed_UTC: utcNet,
            if_IST_month: istNet,
            change_if_IST: istNet - currentView,
        };
    });

    rows.sort((a, b) => b.current_board_UTC - a.current_board_UTC || b.if_IST_month - a.if_IST_month);

    console.log('\n=== IMPORTANT ===');
    console.log('A) Hourly UI net-display fix: NO change to monthly leaderboard scores for anyone.');
    console.log('B) Only IST month-rebucketing would change monthly scores (table below).\n');

    const changed = rows.filter((r) => r.change_if_IST !== 0);
    const top = rows.filter((r) => r.current_board_UTC > 0 || r.if_IST_month > 0).slice(0, 40);

    console.log(`August ${Y} — top board (current UTC view vs if IST):`);
    console.table(
        top.map((r, i) => ({
            rank_now: i + 1,
            name: r.name,
            current_monthly: r.current_board_UTC,
            if_IST: r.if_IST_month,
            delta: r.change_if_IST,
        }))
    );

    console.log(`\nOnly players whose August score WOULD change under IST (${changed.length}):`);
    changed.sort((a, b) => Math.abs(b.change_if_IST) - Math.abs(a.change_if_IST));
    console.table(
        changed.map((r) => ({
            name: r.name,
            current_monthly: r.current_board_UTC,
            if_IST: r.if_IST_month,
            delta: r.change_if_IST,
        }))
    );

    // Rank impact among people currently on board
    const nowSorted = [...rows].filter((r) => r.current_board_UTC > 0).sort((a, b) => b.current_board_UTC - a.current_board_UTC);
    const istSorted = [...rows].filter((r) => r.if_IST_month > 0).sort((a, b) => b.if_IST_month - a.if_IST_month);
    const rankNow = new Map(nowSorted.map((r, i) => [r.user_id, i + 1]));
    const rankIst = new Map(istSorted.map((r, i) => [r.user_id, i + 1]));

    const rankChanges = changed
        .map((r) => ({
            name: r.name,
            rank_now: rankNow.get(r.user_id) ?? '—',
            rank_if_IST: rankIst.get(r.user_id) ?? '—',
            score_now: r.current_board_UTC,
            score_if_IST: r.if_IST_month,
            delta: r.change_if_IST,
        }))
        .sort((a, b) => (typeof a.rank_now === 'number' ? a.rank_now : 999) - (typeof b.rank_now === 'number' ? b.rank_now : 999));

    console.log('\nRank impact for changed players:');
    console.table(rankChanges);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
