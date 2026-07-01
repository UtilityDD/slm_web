/**
 * READ-ONLY: flag today's hourly attempts with clock mismatch
 * (same rule as server guard: diff < -5 min OR > 90 min).
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TZ = 'Asia/Kolkata';

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
    const m = q?.match(/^hourly-challenge-(\d{4})-(\d{2})-(\d{2})-(\d{1,2})$/);
    return m ? { y: +m[1], mo: +m[2], d: +m[3], h: +m[4] } : null;
}

function istWallMin(iso) {
    const s = new Date(iso).toLocaleString('en-CA', { timeZone: TZ, hour12: false });
    const [datePart, timePart] = s.split(', ');
    const [yy, mm, dd] = datePart.split('-').map(Number);
    const [hh, mi, ss] = timePart.split(':').map(Number);
    return Date.UTC(yy, mm - 1, dd, hh, mi, ss || 0) / 60000;
}

function slotWallMin(slot) {
    return Date.UTC(slot.y, slot.mo - 1, slot.d, slot.h, 0, 0) / 60000;
}

function toIst(iso) {
    return new Date(iso).toLocaleString('en-IN', { timeZone: TZ, hour12: false });
}

function todayIst() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function istDayBounds(dateStr) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    // Midnight IST = previous day 18:30 UTC
    const start = new Date(Date.UTC(y, mo - 1, d) - 330 * 60 * 1000);
    const end = new Date(Date.UTC(y, mo - 1, d + 1) - 330 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    const today = process.argv[2] || todayIst();
    const { start, end } = istDayBounds(today);

    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('user_id, quiz_id, score, penalty, created_at')
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

    const bad = [];
    const byUser = {};

    for (const a of all) {
        const slot = parseQuizId(a.quiz_id);
        if (!slot) continue;
        const diff = istWallMin(a.created_at) - slotWallMin(slot);
        const cheated = diff < -5 || diff > 90;
        const u = (byUser[a.user_id] ??= { total: 0, cheated: 0, cheatedNet: 0, worst: 0 });
        u.total++;
        if (cheated) {
            u.cheated++;
            u.cheatedNet += (a.score || 0) - (a.penalty || 0);
            u.worst = Math.max(u.worst, Math.abs(diff));
            bad.push({
                user_id: a.user_id,
                quiz_id: a.quiz_id,
                score: a.score,
                net: (a.score || 0) - (a.penalty || 0),
                submitted_ist: toIst(a.created_at),
                diff_min: Math.round(diff),
            });
        }
    }

    console.log(`\n=== Hourly time check — ${today} (IST) ===`);
    console.log('Rule: quiz_id hour vs real submit time — future >5 min or late >90 min.\n');
    console.log(`Total hourly attempts today: ${all.length}`);
    console.log(`Inconsistent attempts: ${bad.length}`);

    if (bad.length === 0) {
        console.log('\nNo inconsistent scores today.');
        return;
    }

    const ids = [...new Set(bad.map((b) => b.user_id))];
    const { data: profiles } = await sb
        .from('profiles')
        .select('id, full_name, slm_id, district')
        .in('id', ids);
    const pById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    const summary = ids
        .map((id) => {
            const p = pById[id] || {};
            const u = byUser[id];
            return {
                name: p.full_name || '(unknown)',
                slm_id: p.slm_id || '—',
                district: p.district || '—',
                total_hourly: u.total,
                cheated: u.cheated,
                cheat_pts: u.cheatedNet,
                max_skew_min: Math.round(u.worst),
            };
        })
        .sort((a, b) => b.cheated - a.cheated);

    console.log('\nUsers with inconsistent attempts:');
    console.table(summary);

    console.log('\nEvery flagged attempt:');
    console.table(
        bad.map((b) => ({
            name: pById[b.user_id]?.full_name,
            slm_id: pById[b.user_id]?.slm_id,
            slot: b.quiz_id.replace('hourly-challenge-', ''),
            score: b.score,
            net: b.net,
            submitted_ist: b.submitted_ist,
            diff_min: b.diff_min,
        }))
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
