import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
    return env;
}

const env = loadEnv(envPath);
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function fullAudit() {
    console.log('=== MONTHLY LEADERBOARD AUDIT (April 2026) ===\n');

    // 1. Get top 20 users from monthly_leaderboard_view
    const { data: monthly, error: monthlyErr } = await supabase
        .from('monthly_leaderboard_view')
        .select('user_id, full_name, points, quiz_points, reading_points')
        .eq('month_num', 4)
        .eq('year_num', 2026)
        .order('points', { ascending: false })
        .limit(20);

    if (monthlyErr) { console.error(monthlyErr); return; }

    // 2. Get actual profile points for the same users
    const userIds = monthly.map(m => m.user_id);
    const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, full_name, points, reading_points, created_at')
        .in('id', userIds);

    if (profilesErr) { console.error(profilesErr); return; }

    const profileMap = {};
    profiles.forEach(p => profileMap[p.id] = p);

    console.log('Rank | Name                   | Monthly View | Profile Total | Reading(Profile) | Joined');
    console.log('-----|------------------------|--------------|---------------|------------------|--------');

    monthly.forEach((m, i) => {
        const p = profileMap[m.user_id];
        const joined = p ? new Date(p.created_at).toLocaleDateString('en-IN') : '?';
        const profileTotal = p ? p.points : '?';
        const profileReading = p ? p.reading_points : '?';
        const name = m.full_name.substring(0, 22).padEnd(22);
        console.log(
            `${String(i+1).padStart(4)} | ${name} | ${String(m.points).padStart(12)} | ${String(profileTotal).padStart(13)} | ${String(profileReading).padStart(16)} | ${joined}`
        );
    });

    console.log('\n=== KEY FINDING ===');
    console.log('Monthly View ONLY counts quiz_attempts scores.');
    console.log('Reading points in profiles are NOT reflected in monthly leaderboard.');
    console.log('This causes ALL users to show lower-than-actual monthly scores.');
}

fullAudit();
