/**
 * Live test of the hourly time guard in submit_quiz_result_v2.
 * Uses a random NON-EXISTENT user id so no real player is affected.
 * - Future hour  -> expect success:false, error 'hourly_time_mismatch'
 * - Old hour     -> expect success:false, error 'hourly_time_mismatch'
 * - Current hour -> expect guard PASSES (then fails later on FK/no-profile,
 *                   proving the time check let it through, not the guard).
 * Cleans up any rows for the dummy user at the end.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

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

// Build a quiz_id from the current IST wall clock, offset by `hourOffset` hours.
function buildHourlyId(hourOffset) {
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
    istNow.setHours(istNow.getHours() + hourOffset);
    const y = istNow.getFullYear();
    const mo = String(istNow.getMonth() + 1).padStart(2, '0');
    const d = String(istNow.getDate()).padStart(2, '0');
    const h = String(istNow.getHours()).padStart(2, '0');
    return `hourly-challenge-${y}-${mo}-${d}-${h}`;
}

async function call(sb, dummyUser, quizId, label) {
    const { data, error } = await sb.rpc('submit_quiz_result_v2', {
        p_quiz_id: quizId,
        p_score: 50,
        p_penalty: 0,
        p_user_id: dummyUser,
    });
    console.log(`\n[${label}]  quiz_id = ${quizId}`);
    if (error) {
        console.log('  postgrest error:', error.message);
    } else {
        console.log('  result:', JSON.stringify(data));
    }
    return data;
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    const sb = createClient(env.VITE_SUPABASE_URL, key);
    const dummyUser = randomUUID();

    console.log('=== Live time-guard test ===');
    console.log('Dummy (non-existent) user id:', dummyUser);
    console.log('IST now:', new Date().toLocaleString('en-IN', { timeZone: TZ, hour12: true }));

    const future = await call(sb, dummyUser, buildHourlyId(3), 'FUTURE +3h (should BLOCK)');
    const past = await call(sb, dummyUser, buildHourlyId(-3), 'OLD -3h (should BLOCK)');
    const current = await call(sb, dummyUser, buildHourlyId(0), 'CURRENT hour (guard should PASS)');

    // Cleanup: remove any rows that might have been created for the dummy user.
    const { error: delErr, count } = await sb
        .from('quiz_attempts')
        .delete({ count: 'exact' })
        .eq('user_id', dummyUser);
    console.log(`\nCleanup: deleted ${count ?? 0} dummy row(s)${delErr ? ' (err: ' + delErr.message + ')' : ''}`);

    // Verdict
    const blocked = (r) => r && r.success === false && r.error === 'hourly_time_mismatch';
    const passedGuard = current && current.error !== 'hourly_time_mismatch';
    console.log('\n=== VERDICT ===');
    console.log(`Future hour blocked by guard : ${blocked(future) ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Old hour blocked by guard    : ${blocked(past) ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Current hour allowed by guard: ${passedGuard ? 'YES ✅ (failed later for other reason, as expected)' : 'NO ❌'}`);

    if (blocked(future) && blocked(past) && passedGuard) {
        console.log('\nGUARD IS WORKING. Clock-manipulated submissions are rejected; the real hour passes.');
    } else {
        console.log('\n⚠ Something is off — check whether the migration was applied to this project.');
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
