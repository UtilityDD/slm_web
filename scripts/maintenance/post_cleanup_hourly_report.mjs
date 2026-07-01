/**
 * READ-ONLY: hourly quiz attempts for cheat-reset users after cleanup.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TZ = 'Asia/Kolkata';
const SLM_IDS = ['SLM-0058', 'SLM-0057', 'SLM-0056', 'SLM-0106', 'SLM-0004'];
// Cleanup committed ~2026-06-20 15:37 IST
const CLEANUP_AFTER = new Date('2026-06-20T10:07:00.000Z');

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

function slotLabel(quizId) {
    const s = parseQuizId(quizId);
    if (!s) return quizId;
    return `${s.y}-${String(s.mo).padStart(2, '0')}-${String(s.d).padStart(2, '0')} ${String(s.h).padStart(2, '0')}:00`;
}

async function fetchHourly(sb, userId, start, end) {
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await sb
            .from('quiz_attempts')
            .select('quiz_id, score, penalty, created_at')
            .eq('user_id', userId)
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
    return all;
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    const start = new Date(2026, 5, 1).toISOString();
    const end = new Date(2026, 6, 1).toISOString();

    const { data: profiles } = await sb
        .from('profiles')
        .select('id, slm_id, full_name')
        .in('slm_id', SLM_IDS);

    const ordered = SLM_IDS.map((id) => (profiles || []).find((p) => p.slm_id === id)).filter(Boolean);

    console.log('\n=== Hourly quiz after cheat reset (June 2026) ===');
    console.log(`After cleanup: ${toIst(CLEANUP_AFTER.toISOString())} IST onward\n`);

    const summary = [];

    for (const p of ordered) {
        const all = await fetchHourly(sb, p.id, start, end);
        const after = all.filter((a) => new Date(a.created_at) >= CLEANUP_AFTER);

        let suspicious = 0;
        const detail = after.map((a) => {
            const slot = parseQuizId(a.quiz_id);
            const diff = slot != null ? Math.round(istWallMin(a.created_at) - slotWallMin(slot)) : null;
            const bad = diff != null && (diff < -5 || diff > 90);
            if (bad) suspicious++;
            return {
                slot: slotLabel(a.quiz_id),
                score: a.score ?? 0,
                net: (a.score || 0) - (a.penalty || 0),
                submitted_ist: toIst(a.created_at),
                diff_min: diff,
                time_ok: bad ? 'NO' : 'YES',
            };
        });

        const legitJune = all.filter((a) => {
            const slot = parseQuizId(a.quiz_id);
            if (!slot) return false;
            const diff = istWallMin(a.created_at) - slotWallMin(slot);
            return diff >= -5 && diff <= 90;
        });

        summary.push({
            name: p.full_name,
            slm_id: p.slm_id,
            june_legit_hourly: legitJune.length,
            after_cleanup: after.length,
            suspicious_after: suspicious,
            net_pts_after: detail.reduce((s, r) => s + r.net, 0),
        });

        console.log(`--- ${p.full_name} (${p.slm_id}) ---`);
        console.log(`  Legit June hourly (remaining): ${legitJune.length}`);
        console.log(`  After cleanup: ${after.length} play(s), suspicious: ${suspicious}`);
        if (detail.length) console.table(detail);
        else console.log('  (no hourly plays after cleanup)');
        console.log('');
    }

    console.log('=== Summary ===');
    console.table(summary);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
