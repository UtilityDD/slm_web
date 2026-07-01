import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
    fs
        .readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const now = new Date();
const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

console.log('Today (UTC):', startUtc.toISOString().slice(0, 10));
console.log('Window:', startUtc.toISOString(), '→', endUtc.toISOString());

const { data: profiles, error: pErr } = await sb.from('profiles').select('id, slm_id, full_name');
if (pErr) {
    console.error('profiles error', pErr);
    process.exit(1);
}

let withLatestToday = 0;
let withLatestIn48h = 0;
let withAnyLatest = 0;
const sampleToday = [];

for (const p of profiles) {
    const { data: latest, error } = await sb.rpc('get_latest_reading_habit_at', { p_user_id: p.id });
    if (error) continue;
    if (!latest) continue;
    withAnyLatest += 1;
    const at = new Date(latest);
    if (at >= startUtc && at < endUtc) {
        withLatestToday += 1;
        if (sampleToday.length < 15) {
            sampleToday.push({ slm_id: p.slm_id, name: p.full_name, latest });
        }
    }
    if (Date.now() - at.getTime() < 48 * 60 * 60 * 1000) {
        withLatestIn48h += 1;
    }
}

console.log('\n--- Via get_latest_reading_habit_at (trusted sources, gate clock) ---');
console.log('total_profiles:', profiles.length);
console.log('users_with_any_trusted_habit:', withAnyLatest);
console.log('users_with_latest_timestamp_today_utc:', withLatestToday);
console.log('users_within_48h_gate_window:', withLatestIn48h);

if (sampleToday.length) {
    console.log('\nSample users with latest habit today:');
    for (const s of sampleToday) {
        console.log(`  ${s.slm_id || s.name} — ${s.latest}`);
    }
}
