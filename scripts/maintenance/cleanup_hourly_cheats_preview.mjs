/**
 * READ-ONLY preview + local backup for the June hourly-cheat cleanup.
 * - Finds hourly attempts whose quiz_id hour vs real IST time is invalid
 *   (same rule as the server guard: diff < -5 min OR > 90 min).
 * - Writes a JSON backup of every affected row + current profile point columns.
 * - Prints the exact deduction each user would receive.
 * NOTHING is modified in the database.
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
// IST wall-clock in fractional minutes (second precision, matches SQL guard).
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

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();

    // Pull all hourly attempts this month (paginated, with row id).
    let all = [];
    let from = 0;
    const page = 1000;
    while (true) {
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('id, user_id, quiz_id, score, penalty, created_at')
            .like('quiz_id', 'hourly-challenge-%')
            .gte('created_at', start).lt('created_at', end)
            .order('created_at', { ascending: true })
            .range(from, from + page - 1);
        if (error) { console.error(error.message); process.exit(1); }
        all = all.concat(data || []);
        if (!data || data.length < page) break;
        from += page;
    }

    const cheats = [];
    for (const a of all) {
        const slot = parseQuizId(a.quiz_id);
        if (!slot) continue;
        const diff = istWallMin(a.created_at) - slotWallMin(slot);
        if (diff < -5 || diff > 90) cheats.push({ ...a, diff_min: Math.round(diff) });
    }

    const byUser = {};
    for (const c of cheats) {
        const u = (byUser[c.user_id] ??= { rows: [], net: 0 });
        u.rows.push(c);
        u.net += (c.score || 0) - (c.penalty || 0);
    }

    const ids = Object.keys(byUser);
    const { data: profiles } = await sb
        .from('profiles')
        .select('id, full_name, slm_id, points, quiz_points, reading_points')
        .in('id', ids);
    const pById = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    // Local backup file (off-DB safety net).
    const backupDir = path.join(root, 'scripts', 'maintenance', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = `${y}-${String(m).padStart(2, '0')}-20`;
    const backupPath = path.join(backupDir, `hourly_cheat_cleanup_${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({
        generated_at: new Date().toISOString(),
        month: `${y}-${String(m).padStart(2, '0')}`,
        rule: 'diff(submit_ist - slot_ist) < -5 min OR > 90 min',
        affected_rows: cheats,
        profile_snapshots: profiles,
    }, null, 2));

    const rows = ids
        .map((id) => {
            const p = pById[id] || {};
            const u = byUser[id];
            return {
                name: p.full_name || '(unknown)',
                slm_id: p.slm_id || '—',
                rows_to_delete: u.rows.length,
                net_deduct: u.net,
                points_now: p.points ?? 0,
                points_after: Math.max(0, (p.points ?? 0) - u.net),
                quiz_points_now: p.quiz_points ?? 0,
                quiz_points_after: Math.max(0, (p.quiz_points ?? 0) - u.net),
            };
        })
        .sort((a, b) => b.net_deduct - a.net_deduct);

    console.log(`\n=== June ${y} hourly-cheat cleanup PREVIEW (read-only) ===`);
    console.log(`Affected users: ${rows.length} | Rows to delete: ${cheats.length}`);
    console.log(`Backup written: ${path.relative(root, backupPath)}\n`);
    console.table(rows);
    console.log('\nNOTHING was changed. Review, then run the apply SQL in Supabase if you approve.');
}

main().catch((e) => { console.error(e); process.exit(1); });
