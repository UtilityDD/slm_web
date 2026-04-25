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
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScore() {
    // 1. Find User
    const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, points')
        .ilike('full_name', '%Abujar%Rahaman%')
        .single();

    if (userError) {
        console.error('User not found:', userError);
        return;
    }

    console.log(`User: ${user.full_name} (${user.id})`);
    console.log(`Total Score: ${user.points}`);

    // 2. Get Current Month Start Date
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 3. Fetch scores for current month
    const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('score, created_at')
        .eq('user_id', user.id)
        .gte('created_at', firstDayOfMonth);

    if (attemptsError) {
        console.error('Error fetching attempts:', attemptsError);
        return;
    }

    const monthlyScore = attempts.reduce((acc, attempt) => acc + (attempt.score || 0), 0);
    console.log(`Score in current month (starting ${firstDayOfMonth}): ${monthlyScore}`);
}

checkScore();
