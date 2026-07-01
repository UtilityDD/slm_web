/** High-confidence hourly timing flags for top monthly users. */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TZ = 'Asia/Kolkata';

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
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
    const m = q?.match(/^hourly-challenge-(\d{4})-(\d{2})-(\d{2})-(\d{1,2})$/);
    return m ? { date: `${m[1]}-${m[2]}-${m[3]}`, h: Number(m[4]) } : null;
}

function ist(iso) {
    const d = new Date(iso);
    return {
        date: d.toLocaleString('en-CA', { timeZone: TZ }).slice(0, 10),
        h: Number(d.toLocaleString('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false })),
        ms: d.getTime(),
        lbl: d.toLocaleString('en-IN', { timeZone: TZ, hour12: true }),
    };
}

function scoreUser(rows) {
    const sorted = (rows || []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
    let severe = 0;
    let future = 0;
    let burstMax = 0;
    const worst = [];

    for (const r of sorted) {
        const slot = parseQuizId(r.quiz_id);
        const sub = ist(r.created_at);
        if (!slot) continue;
        const delta = sub.h - slot.h;
        const futureSlot = slot.date > sub.date || (slot.date === sub.date && slot.h > sub.h + 1);
        const severeRow = futureSlot || Math.abs(delta) >= 5 || (slot.date !== sub.date && Math.abs(delta) >= 2);
        if (futureSlot) future++;
        if (severeRow) {
            severe++;
            worst.push({
                slot: `${slot.date} H${String(slot.h).padStart(2, '0')}`,
                submitted: sub.lbl,
                net: (r.score || 0) - (r.penalty || 0),
                delta_h: delta,
                flag: futureSlot ? 'FUTURE_SLOT' : `DELTA_${delta}h`,
            });
        }
    }

    for (let i = 0; i < sorted.length; i++) {
        const t0 = ist(sorted[i].created_at).ms;
        const slots = new Set();
        for (let j = i; j < sorted.length; j++) {
            if (ist(sorted[j].created_at).ms - t0 > 30 * 60 * 1000) break;
            const s = parseQuizId(sorted[j].quiz_id);
            if (s) slots.add(`${s.date}-${s.h}`);
        }
        burstMax = Math.max(burstMax, slots.size);
    }

    return { severe, future, burstMax, worst: worst.slice(0, 6) };
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);
    const y = 2026;
    const m = 6;

    const { data: monthly } = await sb
        .from('monthly_leaderboard_view')
        .select('user_id, full_name, points, profiles(slm_id)')
        .eq('year_num', y)
        .eq('month_num', m)
        .order('points', { ascending: false })
        .limit(20);

    const ids = monthly.map((r) => r.user_id);
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();
    const { data: attempts } = await sb
        .from('quiz_attempts')
        .select('user_id, quiz_id, score, penalty, created_at')
        .in('user_id', ids)
        .like('quiz_id', 'hourly-challenge-%')
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at');

    const byUser = {};
    for (const a of attempts || []) {
        if (!byUser[a.user_id]) byUser[a.user_id] = [];
        byUser[a.user_id].push(a);
    }

    const out = monthly.map((r, i) => {
        const s = scoreUser(byUser[r.user_id]);
        let risk = 'OK';
        if (s.future > 0 || s.burstMax >= 4 || s.severe >= 10) risk = 'HIGH';
        else if (s.severe >= 3 || s.burstMax >= 3) risk = 'MEDIUM';
        else if (s.severe > 0) risk = 'LOW';
        return {
            rank: i + 1,
            name: r.full_name,
            slm_id: r.profiles?.slm_id,
            monthly_pts: r.points,
            hourly_attempts: (byUser[r.user_id] || []).length,
            severe_rows: s.severe,
            future_slots: s.future,
            max_burst_30min: s.burstMax,
            risk,
            _worst: s.worst,
        };
    });

    console.log('\nJune 2026 — top 20 champion board (high-confidence timing flags)\n');
    console.table(out.map(({ _worst, ...r }) => r));

    for (const r of out.filter((x) => x.risk === 'HIGH' || x.risk === 'MEDIUM')) {
        console.log(`\n--- ${r.name} (${r.slm_id}) — ${r.risk} ---`);
        console.table(r._worst);
    }
}

main();
