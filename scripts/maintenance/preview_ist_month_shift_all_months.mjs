/**
 * READ-ONLY: check whether IST month bucketing would change any month's top ranks.
 * Compares current UTC-bucketed monthly_leaderboard_view against IST-adjusted totals.
 * Usage: node scripts/maintenance/preview_ist_month_shift_all_months.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const IST_OFFSET_MINUTES = 330;
const MONTHS = [
    [2026, 3],
    [2026, 4],
    [2026, 5],
    [2026, 6],
    [2026, 7],
    [2026, 8],
];

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

function utcMonthStart(year, month) {
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
}

function shiftMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}

/** Windows where UTC month and IST month disagree. */
function boundaryWindows(year, month) {
    const startUtc = utcMonthStart(year, month);
    const endUtc = utcMonthStart(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
    return {
        // Belongs to IST month, currently counted in previous UTC month -> ADD
        leading: { start: shiftMinutes(startUtc, -IST_OFFSET_MINUTES), end: startUtc },
        // Counted in this UTC month, belongs to next IST month -> SUBTRACT
        trailing: { start: shiftMinutes(endUtc, -IST_OFFSET_MINUTES), end: endUtc },
    };
}

async function fetchAttemptsInWindow(sb, start, end) {
    const pageSize = 1000;
    let offset = 0;
    const all = [];
    while (true) {
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('user_id, quiz_id, score, penalty, created_at')
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString())
            .range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (!data?.length) break;
        all.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
    }
    return all;
}

function accumulate(map, rows, sign) {
    for (const row of rows) {
        if (!row.user_id) continue;
        const score = Number(row.score) || 0;
        const penalty = Number(row.penalty) || 0;
        const entry = map.get(row.user_id) || { points: 0, reading: 0, penalties: 0 };
        entry.points += sign * (score - penalty);
        entry.penalties += sign * penalty;
        if (String(row.quiz_id || '').startsWith('lesson_bonus')) entry.reading += sign * score;
        map.set(row.user_id, entry);
    }
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    for (const [year, month] of MONTHS) {
        const { data: rows, error } = await sb
            .from('monthly_leaderboard_view')
            .select('user_id, full_name, points')
            .eq('year_num', year)
            .eq('month_num', month)
            .order('points', { ascending: false })
            .limit(300);
        if (error) throw error;

        const windows = boundaryWindows(year, month);
        const deltas = new Map();
        accumulate(deltas, await fetchAttemptsInWindow(sb, windows.leading.start, windows.leading.end), +1);
        accumulate(deltas, await fetchAttemptsInWindow(sb, windows.trailing.start, windows.trailing.end), -1);

        const byId = new Map((rows || []).map((r) => [r.user_id, { ...r, points: Number(r.points) || 0 }]));
        const missing = [];
        for (const id of deltas.keys()) if (!byId.has(id)) missing.push(id);
        if (missing.length) {
            const { data: profs } = await sb.from('profiles').select('id, full_name').in('id', missing);
            for (const p of profs || []) byId.set(p.id, { user_id: p.id, full_name: p.full_name, points: 0 });
        }

        const before = [...byId.values()]
            .filter((r) => r.points !== 0)
            .sort((a, b) => b.points - a.points);
        const after = [...byId.values()]
            .map((r) => ({ ...r, points: r.points + (deltas.get(r.user_id)?.points || 0) }))
            .filter((r) => r.points !== 0)
            .sort((a, b) => b.points - a.points);

        const label = `${year}-${String(month).padStart(2, '0')}`;
        const top3Before = before.slice(0, 3).map((r) => r.full_name);
        const top3After = after.slice(0, 3).map((r) => r.full_name);
        const top3Same = JSON.stringify(top3Before) === JSON.stringify(top3After);

        const changed = [...byId.values()]
            .map((r) => ({ name: r.full_name, delta: deltas.get(r.user_id)?.points || 0 }))
            .filter((r) => r.delta !== 0);

        console.log(`\n===== ${label} =====`);
        console.log(`players affected: ${changed.length} | TOP 3 UNCHANGED: ${top3Same ? 'YES' : '*** NO ***'}`);
        console.log('top3 before:', top3Before.join(' | '));
        console.log('top3 after :', top3After.join(' | '));
        if (changed.length) {
            console.table(
                changed
                    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                    .slice(0, 15)
            );
        }
        if (!top3Same) {
            console.log('FULL TOP 6 BEFORE:');
            console.table(before.slice(0, 6).map((r, i) => ({ rank: i + 1, name: r.full_name, points: r.points })));
            console.log('FULL TOP 6 AFTER:');
            console.table(after.slice(0, 6).map((r, i) => ({ rank: i + 1, name: r.full_name, points: r.points })));
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
