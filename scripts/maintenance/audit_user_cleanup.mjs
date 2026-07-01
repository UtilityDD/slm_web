/**
 * Audit whether a user (by name) is fully removed from known tables.
 * Usage: node scripts/maintenance/audit_user_cleanup.mjs "Sandip Das"
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const searchName = process.argv[2] || 'Sandip Das';
const nameParts = searchName.trim().split(/\s+/).filter(Boolean);

const env = Object.fromEntries(
    fs
        .readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

function ilikeMatch(text) {
    if (!text) return false;
    const lower = String(text).toLowerCase();
    return nameParts.every((p) => lower.includes(p.toLowerCase()));
}

async function countTable(table, filterFn) {
    const { data, error } = await sb.from(table).select('*').limit(5000);
    if (error) return { table, error: error.message, count: null, rows: [] };
    const rows = (data || []).filter(filterFn);
    return { table, error: null, count: rows.length, rows };
}

console.log(`\n=== Audit cleanup for: "${searchName}" ===\n`);

// 1) profiles
const { data: profiles, error: pErr } = await sb
    .from('profiles')
    .select('id, full_name, phone_number, slm_id, role, email')
    .ilike('full_name', `%${nameParts[0]}%`);

if (pErr) {
    console.error('profiles query error:', pErr.message);
} else {
    const matches = (profiles || []).filter((p) => ilikeMatch(p.full_name));
    console.log('profiles:', matches.length ? matches : 'none');
}

// Collect UUIDs from any partial name matches for child-table scan
const profileIds = new Set((profiles || []).filter((p) => ilikeMatch(p.full_name)).map((p) => p.id));

// Also search phone_number column if we had a phone - search by name in full_name only for now

// 2) Known child tables by user_id
const childTables = [
    'quiz_attempts',
    'reading_habit_completions',
    'user_ppe',
    'user_tools',
    'backup_profiles_progress',
    'backup_quiz_attempts',
];

for (const table of childTables) {
    const result = await countTable(table, (row) => {
        if (profileIds.size && profileIds.has(row.user_id)) return true;
        if (ilikeMatch(row.full_name)) return true;
        return false;
    });
    if (result.error) {
        console.log(`${table}: (skip) ${result.error}`);
    } else if (result.count > 0) {
        console.log(`${table}: ${result.count} row(s)`, result.rows.slice(0, 3));
    } else {
        console.log(`${table}: none`);
    }
}

// 3) quiz_attempts by full_name column
const qaByName = await countTable('quiz_attempts', (row) => ilikeMatch(row.full_name));
if (!qaByName.error && qaByName.count > 0) {
    console.log('quiz_attempts (by full_name):', qaByName.count, qaByName.rows.slice(0, 3));
}

// 4) Probe possible login/credential tables
const loginTables = [
    'user_accounts',
    'linemen',
    'app_users',
    'registered_users',
    'lineman_accounts',
    'users',
    'credentials',
];

console.log('\n--- Login / credential tables ---');
for (const table of loginTables) {
    const { data, error } = await sb.from(table).select('*').limit(2000);
    if (error) {
        console.log(`${table}: (not found or no access)`);
        continue;
    }
    const matches = (data || []).filter((row) => {
        const blob = JSON.stringify(row).toLowerCase();
        return nameParts.every((p) => blob.includes(p.toLowerCase()));
    });
    if (matches.length) {
        console.log(`${table}: ${matches.length} row(s)`, matches);
    } else {
        console.log(`${table}: none matching name`);
    }
}

// 5) Search all profiles again with broader pattern
const { data: broad } = await sb.from('profiles').select('id, full_name, phone_number, slm_id').ilike('full_name', '%sandip%');
const sandipProfiles = (broad || []).filter((p) => /sandip/i.test(p.full_name || ''));
console.log('\n--- Broader "sandip" profile search ---');
console.log(sandipProfiles.length ? sandipProfiles : 'none');

const USER_ID = 'b4f82beb-b2e7-4beb-9f38-8d3995239023';
const PHONE = '9933126137';

async function countByUserId(table) {
    const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true }).eq('user_id', USER_ID);
    return { table, count: error ? null : count, error: error?.message };
}

console.log('\n--- Rows by user_id', USER_ID, '---');
const byIdTables = [
    'quiz_attempts', 'reading_habit_completions', 'user_ppe', 'user_tools',
    'backup_profiles_progress', 'backup_quiz_attempts', 'notifications',
    'community_posts', 'user_supplementary_progress',
];
for (const t of byIdTables) {
    const r = await countByUserId(t);
    console.log(`${t}:`, r.error ? `(skip) ${r.error}` : r.count);
}

// Test if login still works for phone
const { data: authTest, error: authErr } = await sb.rpc('authenticate_user', {
    p_phone: PHONE,
    p_password: '000000',
});
console.log('\n--- Login record probe (wrong PIN) ---');
console.log('authenticate_user error:', authErr?.message || 'none');
console.log('authenticate_user rows:', authTest?.length ?? 0, '(empty = wrong pin OR unknown phone)');

console.log('\n=== Done ===\n');
