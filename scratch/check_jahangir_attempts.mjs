import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urls = [...envContent.matchAll(/VITE_SUPABASE_URL=(.*)/g)];
const keys = [...envContent.matchAll(/VITE_SUPABASE_ANON_KEY=(.*)/g)];
const SUPABASE_URL = urls[urls.length - 1][1].trim();
const SUPABASE_KEY = keys[keys.length - 1][1].trim();

async function checkJahangirAttempts() {
    const userId = "df1d794f-60db-4ba0-9cf5-f01247374be2";
    console.log(`Checking quiz attempts with penalty for Jahangir Alam (${userId})...`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_attempts?user_id=eq.${userId}&penalty=gt.0&select=quiz_id,score,penalty`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    const attempts = await res.json();
    console.log("Penalty Attempts Results:", JSON.stringify(attempts, null, 2));
}

checkJahangirAttempts();
