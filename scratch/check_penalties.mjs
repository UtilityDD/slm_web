import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Get the LAST occurrence of the variables
const urls = [...envContent.matchAll(/VITE_SUPABASE_URL=(.*)/g)];
const keys = [...envContent.matchAll(/VITE_SUPABASE_ANON_KEY=(.*)/g)];

const SUPABASE_URL = urls[urls.length - 1][1].trim();
const SUPABASE_KEY = keys[keys.length - 1][1].trim();

async function check() {
    console.log("Fetching quiz_attempts with penalty > 0...");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_attempts?penalty=gt.0&select=user_id,quiz_id,score,penalty&limit=5`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    const attempts = await res.json();
    console.log("Quiz Attempts with Penalty:", JSON.stringify(attempts, null, 2));
    
    if (attempts.length > 0) {
        console.log("\nFetching corresponding profiles...");
        const userIds = [...new Set(attempts.map(a => a.user_id))].join(',');
        const res2 = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=in.(${userIds})&select=id,full_name,total_penalties`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const profiles = await res2.json();
        console.log("Profiles for those users:", JSON.stringify(profiles, null, 2));
    } else {
        console.log("No quiz attempts with penalties found.");
    }
}
check();
