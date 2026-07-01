/**
 * Dry-run the proposed hourly time guard against real June attempts.
 * Mirrors the SQL rule: block if (now_ist - slot_ist) < -5 min OR > 90 min.
 * READ-ONLY. No DB writes.
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

// IST wall-clock minutes since epoch for a given instant.
function istWallMs(iso) {
    const d = new Date(iso);
    const s = d.toLocaleString('en-CA', { timeZone: TZ, hour12: false });
    // en-CA => 'YYYY-MM-DD, HH:MM:SS'
    const [datePart, timePart] = s.split(', ');
    const [yy, mm, dd] = datePart.split('-').map(Number);
    const [hh, mi] = timePart.split(':').map(Number);
    return Date.UTC(yy, mm - 1, dd, hh, mi) / 60000;
}

// Slot hour as IST wall-clock minutes since epoch.
function slotWallMs(slot) {
    return Date.UTC(slot.y, slot.mo - 1, slot.d, slot.h, 0) / 60000;
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);
    const y = 2026;
    const m = 6;

    const { data: monthly } = await sb
        .from('monthly_leaderboard_view')
        .select('user_id, full_name, points, profiles(slm_id)')
        .eq('year_num', y).eq('month_num', m)
        .order('points', { ascending: false }).limit(20);

    const ids = monthly.map((r) => r.user_id);
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();
    const { data: attempts } = await sb
        .from('quiz_attempts')
        .select('user_id, quiz_id, created_at')
        .in('user_id', ids)
        .like('quiz_id', 'hourly-challenge-%')
        .gte('created_at', start).lt('created_at', end);

    const byUser = {};
    for (const a of attempts || []) (byUser[a.user_id] ??= []).push(a);

    const rows = monthly.map((r, i) => {
        const list = byUser[r.user_id] || [];
        let blocked = 0;
        let checked = 0;
        for (const a of list) {
            const slot = parseQuizId(a.quiz_id);
            if (!slot) continue; // legacy ids are not guarded
            checked++;
            const diff = istWallMs(a.created_at) - slotWallMs(slot);
            if (diff < -5 || diff > 90) blocked++;
        }
        return {
            rank: i + 1,
            name: r.full_name,
            slm_id: r.profiles?.slm_id,
            hourly: list.length,
            guarded_ids: checked,
            would_block: blocked,
            block_pct: checked ? `${Math.round((blocked / checked) * 100)}%` : '—',
        };
    });

    console.log('\nDry-run of proposed time guard (block if diff < -5 min or > 90 min)\n');
    console.table(rows);
    console.log('\nReading: honest players should show would_block = 0.');
    console.log('Clock-cheaters should show a high would_block count.\n');
}

main();
