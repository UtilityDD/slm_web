import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urls = [...envContent.matchAll(/VITE_SUPABASE_URL=(.*)/g)];
const keys = [...envContent.matchAll(/VITE_SUPABASE_ANON_KEY=(.*)/g)];
const SUPABASE_URL = urls[urls.length - 1][1].trim();
const SUPABASE_KEY = keys[keys.length - 1][1].trim();

async function fixPenalties() {
    console.log("Fetching all quiz attempts with penalties...");
    // Fetch all attempts with penalty
    let allAttempts = [];
    let offset = 0;
    while(true) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_attempts?penalty=gt.0&select=user_id,penalty&limit=1000&offset=${offset}`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const data = await res.json();
        if(!data || data.length === 0) break;
        allAttempts = allAttempts.concat(data);
        offset += 1000;
    }
    
    console.log(`Found ${allAttempts.length} penalty records. Calculating totals per user...`);
    
    const penaltyMap = {};
    for (const attempt of allAttempts) {
        if (!penaltyMap[attempt.user_id]) penaltyMap[attempt.user_id] = 0;
        penaltyMap[attempt.user_id] += attempt.penalty;
    }
    
    console.log(`Updating profiles for ${Object.keys(penaltyMap).length} users...`);
    
    let updatedCount = 0;
    for (const [userId, totalPenalty] of Object.entries(penaltyMap)) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ total_penalties: totalPenalty })
        });
        if (res.ok) {
            updatedCount++;
            if (userId === "df1d794f-60db-4ba0-9cf5-f01247374be2") {
                console.log(`Fixed Jahangir Alam! New penalty: ${totalPenalty}`);
            }
        } else {
            console.error(`Failed to update user ${userId}: ${await res.text()}`);
        }
    }
    console.log(`Successfully synced penalties for ${updatedCount} users.`);
}

fixPenalties();
