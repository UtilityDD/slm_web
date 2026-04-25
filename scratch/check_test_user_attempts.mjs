import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urls = [...envContent.matchAll(/VITE_SUPABASE_URL=(.*)/g)];
const keys = [...envContent.matchAll(/VITE_SUPABASE_ANON_KEY=(.*)/g)];
const SUPABASE_URL = urls[urls.length - 1][1].trim();
const SUPABASE_KEY = keys[keys.length - 1][1].trim();

async function checkTestUserAttempts() {
    const userId = "741bce40-09f3-4f95-a7c6-ac7c43071671";
    console.log(`Checking quiz attempts with penalty for Test User (${userId})...`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_attempts?user_id=eq.${userId}&penalty=gt.0&select=quiz_id,score,penalty`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    const attempts = await res.json();
    console.log("Penalty Attempts Results:", JSON.stringify(attempts, null, 2));
}

checkTestUserAttempts();
