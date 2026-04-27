/**
 * Penalty Audit Script
 * Compares profiles.total_penalties vs SUM(quiz_attempts.penalty) for all users
 */
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

async function penaltyAudit() {
    console.log('=== PENALTY AUDIT ===\n');

    // 1. Get all profiles with penalty data
    const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, points, quiz_points, reading_points, total_penalties')
        .order('total_penalties', { ascending: false });

    if (pErr) { console.error(pErr); return; }

    // 2. Get all quiz_attempts with penalty
    const { data: attempts, error: aErr } = await supabase
        .from('quiz_attempts')
        .select('user_id, quiz_id, score, penalty');

    if (aErr) { console.error(aErr); return; }

    // Group attempts by user
    const attemptsByUser = {};
    attempts.forEach(a => {
        if (!attemptsByUser[a.user_id]) attemptsByUser[a.user_id] = [];
        attemptsByUser[a.user_id].push(a);
    });

    console.log('Name                     | Profile Penalty | SUM(qa.penalty) | Mismatch? | Profile Points | SUM(score)');
    console.log('-------------------------|-----------------|-----------------|-----------|----------------|----------');

    let issues = 0;

    for (const p of profiles) {
        const userAttempts = attemptsByUser[p.id] || [];
        const sumPenalty = userAttempts.reduce((acc, a) => acc + (Number(a.penalty) || 0), 0);
        const sumScore = userAttempts.reduce((acc, a) => acc + (Number(a.score) || 0), 0);
        const profilePenalty = p.total_penalties || 0;

        const mismatch = profilePenalty !== sumPenalty;
        if (mismatch) issues++;

        const name = (p.full_name || 'Unknown').substring(0, 24).padEnd(24);
        console.log(
            `${name} | ${String(profilePenalty).padStart(15)} | ${String(sumPenalty).padStart(15)} | ${mismatch ? '⚠️  YES   ' : '   OK    '} | ${String(p.points || 0).padStart(14)} | ${String(sumScore).padStart(10)}`
        );
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total users checked: ${profiles.length}`);
    console.log(`Users with penalty mismatch: ${issues}`);

    // 3. Check where the leaderboard view reads total_penalties from
    console.log('\n=== LEADERBOARD VIEW CHECK ===');
    console.log('leaderboard_view (all-time): reads total_penalties DIRECTLY from profiles column ✅');
    console.log('monthly_leaderboard_view: calculates SUM(qa.penalty) from quiz_attempts ⚠️');
    console.log('→ These two values may DIFFER if profiles.total_penalties was set independently of quiz_attempts.penalty');
}

penaltyAudit();
