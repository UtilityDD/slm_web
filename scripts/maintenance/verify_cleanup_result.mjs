/**
 * READ-ONLY verification of the June hourly-cheat cleanup result.
 * Confirms: (1) the 5 profiles now hold the expected points,
 *           (2) no flagged hourly rows remain for them this month.
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
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
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
function slotWallMin(s) { return Date.UTC(s.y, s.mo - 1, s.d, s.h, 0, 0) / 60000; }

const EXPECTED = {
    'SLM-0058': 45259,
    'SLM-0057': 64866,
    'SLM-0056': 27268,
    'SLM-0106': 12686,
    'SLM-0004': 1780,
};

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    const slmIds = Object.keys(EXPECTED);
    const { data: profiles } = await sb
        .from('profiles')
        .select('id, slm_id, full_name, points, quiz_points')
        .in('slm_id', slmIds);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const rows = [];
    for (const p of profiles || []) {
        const { data: att } = await sb
            .from('quiz_attempts')
            .select('quiz_id, created_at')
            .eq('user_id', p.id)
            .like('quiz_id', 'hourly-challenge-%')
            .gte('created_at', start).lt('created_at', end);
        let remainingCheats = 0;
        for (const a of att || []) {
            const slot = parseQuizId(a.quiz_id);
            if (!slot) continue;
            const diff = istWallMin(a.created_at) - slotWallMin(slot);
            if (diff < -5 || diff > 90) remainingCheats++;
        }
        rows.push({
            slm_id: p.slm_id,
            name: p.full_name,
            points: p.points,
            expected: EXPECTED[p.slm_id],
            match: p.points === EXPECTED[p.slm_id] ? 'YES' : 'NO',
            remaining_cheats: remainingCheats,
        });
    }
    rows.sort((a, b) => b.points - a.points);
    console.log('\n=== Cleanup verification (read-only) ===');
    console.table(rows);
    const allMatch = rows.every((r) => r.match === 'YES' && r.remaining_cheats === 0);
    console.log(allMatch ? '\nAll good: points match and zero cheated hourly rows remain.' : '\nMISMATCH detected — review above.');
}
main().catch((e) => { console.error(e); process.exit(1); });
