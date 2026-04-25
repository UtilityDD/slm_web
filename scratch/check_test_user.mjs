import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Get the LAST occurrence of the variables
const urls = [...envContent.matchAll(/VITE_SUPABASE_URL=(.*)/g)];
const keys = [...envContent.matchAll(/VITE_SUPABASE_ANON_KEY=(.*)/g)];

const SUPABASE_URL = urls[urls.length - 1][1].trim();
const SUPABASE_KEY = keys[keys.length - 1][1].trim();

async function checkTestUser() {
    console.log("Searching for 'Test User' in profiles...");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?full_name=ilike.*Test User*&select=id,full_name,points,quiz_points,total_penalties`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    const profiles = await res.json();
    console.log("Profile Results:", JSON.stringify(profiles, null, 2));
}

checkTestUser();
