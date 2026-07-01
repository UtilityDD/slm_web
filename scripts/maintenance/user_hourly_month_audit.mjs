/**
 * READ-ONLY: monthly hourly audit for one user by name.
 * Usage: node scripts/maintenance/user_hourly_month_audit.mjs "Pankaj Pal"
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

function slotLabel(quizId) {
    const s = parseQuizId(quizId);
    if (!s) return quizId;
    return `${s.y}-${String(s.mo).padStart(2, '0')}-${String(s.d).padStart(2, '0')} ${String(s.h).padStart(2, '0')}:00`;
}

async function main() {
    const nameQuery = process.argv[2] || 'Pankaj Pal';
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();
    const monthLabel = `${y}-${String(m).padStart(2, '0')}`;

    const { data: profiles, error: pErr } = await sb
        .from('profiles')
        .select('id, full_name, slm_id, district, points, quiz_points')
        .ilike('full_name', `%${nameQuery}%`);

    if (pErr) throw pErr;
    if (!profiles?.length) {
        console.log(`No profile found matching "${nameQuery}".`);
        return;
    }
    if (profiles.length > 1) {
        console.log('Multiple matches — using all:\n');
        console.table(profiles.map((p) => ({ name: p.full_name, slm_id: p.slm_id, district: p.district })));
    }

    for (const p of profiles) {
        let all = [];
        let from = 0;
        while (true) {
            const { data, error } = await sb
                .from('quiz_attempts')
                .select('quiz_id, score, penalty, created_at')
                .eq('user_id', p.id)
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

        let legit = 0;
        let suspicious = 0;
        let legitNet = 0;
        let cheatNet = 0;
        const rows = all.map((a) => {
            const slot = parseQuizId(a.quiz_id);
            const diff = slot != null ? Math.round(istWallMin(a.created_at) - slotWallMin(slot)) : null;
            const bad = diff != null && (diff < -5 || diff > 90);
            const net = (a.score || 0) - (a.penalty || 0);
            if (bad) {
                suspicious++;
                cheatNet += net;
            } else {
                legit++;
                legitNet += net;
            }
            return {
                slot: slotLabel(a.quiz_id),
                score: a.score ?? 0,
                penalty: a.penalty ?? 0,
                net,
                submitted_ist: toIst(a.created_at),
                diff_min: diff,
                time_ok: bad ? 'NO' : 'YES',
            };
        });

        console.log(`\n=== ${p.full_name} (${p.slm_id}) — ${monthLabel} hourly audit ===`);
        console.log(`District: ${p.district || '—'} | All-time points: ${p.points ?? 0} | quiz_points: ${p.quiz_points ?? 0}`);
        console.log(`Total hourly: ${all.length} | Legit: ${legit} (${legitNet} net pts) | Suspicious: ${suspicious} (${cheatNet} net pts)\n`);

        if (rows.length === 0) {
            console.log('No hourly attempts this month.');
            continue;
        }

        if (suspicious > 0) {
            console.log('--- FLAGGED attempts ---');
            console.table(rows.filter((r) => r.time_ok === 'NO'));
            console.log('--- Legit attempts (sample: last 15) ---');
            console.table(rows.filter((r) => r.time_ok === 'YES').slice(-15));
        } else {
            console.log('No inconsistent scores. All attempts:');
            console.table(rows);
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
