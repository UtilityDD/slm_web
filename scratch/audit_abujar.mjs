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

async function detailedAudit() {
    // 1. Fetch User Profile with creation date
    const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, points, reading_points, created_at')
        .ilike('full_name', '%Abujar%Rahaman%')
        .single();

    if (userError) {
        console.error('User not found:', userError);
        return;
    }

    console.log('--- PROFILE DATA ---');
    console.log(`Name: ${user.full_name}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Joined At (created_at): ${user.created_at}`);
    console.log(`Profile Total Points: ${user.points}`);
    console.log(`Profile Reading Points: ${user.reading_points}`);

    // 2. Fetch ALL Quiz Attempts
    const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('id, score, quiz_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

    if (attemptsError) {
        console.error('Error fetching attempts:', attemptsError);
        return;
    }

    console.log('\n--- QUIZ ATTEMPTS ---');
    console.log(`Total Attempts Found: ${attempts.length}`);
    
    let totalQuizScore = 0;
    attempts.forEach(a => {
        totalQuizScore += (a.score || 0);
    });
    console.log(`Sum of all Quiz Scores: ${totalQuizScore}`);

    // Check if any attempts are before April 1st, 2026
    const april1st = new Date('2026-04-01T00:00:00Z');
    const preAprilAttempts = attempts.filter(a => new Date(a.created_at) < april1st);
    
    if (preAprilAttempts.length > 0) {
        console.log(`\nFound ${preAprilAttempts.length} attempts BEFORE April 1st:`);
        preAprilAttempts.forEach(a => {
            console.log(`- ${a.quiz_id}: Score ${a.score} at ${a.created_at}`);
        });
    } else {
        console.log('\nNo attempts found before April 1st.');
    }

    // 3. Verify total math
    const calculatedTotal = totalQuizScore + (user.reading_points || 0);
    console.log(`\n--- VERIFICATION ---`);
    console.log(`Calculated Total (Quiz + Reading): ${calculatedTotal}`);
    console.log(`Profile Points Match: ${calculatedTotal === user.points ? 'YES' : 'NO'}`);
}

detailedAudit();
