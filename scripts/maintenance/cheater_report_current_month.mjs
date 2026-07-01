/**
 * Compact cheating report for the CURRENT month.
 * Flags hourly attempts whose quiz_id hour does not match real IST time
 * (same rule now enforced by the server guard: diff < -5 min or > 90 min).
 * READ-ONLY. No writes.
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

function istWallMs(iso) {
    const s = new Date(iso).toLocaleString('en-CA', { timeZone: TZ, hour12: false });
    const [datePart, timePart] = s.split(', ');
    const [yy, mm, dd] = datePart.split('-').map(Number);
    const [hh, mi] = timePart.split(':').map(Number);
    return Date.UTC(yy, mm - 1, dd, hh, mi) / 60000;
}
function slotWallMs(slot) {
    return Date.UTC(slot.y, slot.mo - 1, slot.d, slot.h, 0) / 60000;
}
function istDate(iso) {
    return new Date(iso).toLocaleString('en-CA', { timeZone: TZ }).slice(0, 10);
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();
    const minFlag = Number(process.argv[2] || 2); // min cheated attempts to list

    // Pull all hourly attempts this month (paginated).
    let all = [];
    let from = 0;
    const page = 1000;
    while (true) {
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('user_id, quiz_id, score, penalty, created_at')
            .like('quiz_id', 'hourly-challenge-%')
            .gte('created_at', start)
            .lt('created_at', end)
            .order('created_at', { ascending: true })
            .range(from, from + page - 1);
        if (error) { console.error(error.message); process.exit(1); }
        all = all.concat(data || []);
        if (!data || data.length < page) break;
        from += page;
    }

    const byUser = {};
    for (const a of all) {
        const slot = parseQuizId(a.quiz_id);
        if (!slot) continue;
        const diff = istWallMs(a.created_at) - slotWallMs(slot);
        const cheated = diff < -5 || diff > 90;
        const u = (byUser[a.user_id] ??= { total: 0, cheated: 0, cheatedNet: 0, days: new Set(), worst: 0 });
        u.total++;
        if (cheated) {
            u.cheated++;
            u.cheatedNet += (a.score || 0) - (a.penalty || 0);
            u.days.add(istDate(a.created_at));
            u.worst = Math.max(u.worst, Math.abs(diff));
        }
    }

    const offenders = Object.entries(byUser)
        .filter(([, v]) => v.cheated >= minFlag)
        .sort((a, b) => b[1].cheated - a[1].cheated);

    if (offenders.length === 0) {
        console.log(`No users with >= ${minFlag} cheated hourly attempts this month.`);
        return;
    }

    const ids = offenders.map(([id]) => id);
    const { data: profiles } = await sb
        .from('profiles')
        .select('id, full_name, slm_id, district, points')
        .in('id', ids);
    const pById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    const rows = offenders.map(([id, v], i) => {
        const p = pById[id] || {};
        return {
            '#': i + 1,
            name: p.full_name || '(unknown)',
            slm_id: p.slm_id || '—',
            district: p.district || '—',
            total_hourly: v.total,
            cheated: v.cheated,
            cheat_pts: v.cheatedNet,
            days: v.days.size,
            max_skew_h: Math.round(v.worst / 60),
        };
    });

    console.log(`\n=== Cheating report — ${y}-${String(m).padStart(2, '0')} (>= ${minFlag} bad attempts) ===`);
    console.log('Rule: hourly quiz_id hour vs real IST time differs by > 90 min or is in the future.\n');
    console.table(rows);
    console.log(`\nOffenders: ${rows.length}`);
    console.log('Legend: cheated = clock-mismatched attempts | cheat_pts = net points from those attempts | max_skew_h = worst hour gap.');
}

main().catch((e) => { console.error(e); process.exit(1); });
