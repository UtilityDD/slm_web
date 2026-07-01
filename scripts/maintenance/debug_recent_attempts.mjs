import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadEnv(filePath) {
    const env = {};
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i < 1) continue;
        let val = t.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[t.slice(0, i).trim()] = val;
    }
    return env;
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

    console.log("Fetching recent quiz attempts for June 30th and July 1st, 2026...");

    // Query attempts from last 2 days
    const { data: attempts, error } = await sb
        .from('quiz_attempts')
        .select('user_id, quiz_id, score, penalty, created_at, profiles(full_name, slm_id, role)')
        .gte('created_at', '2026-06-30T00:00:00.000Z')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error fetching attempts:", error);
        return;
    }

    console.log(`Found ${attempts.length} recent attempts.`);
    console.table(attempts.map(a => ({
        name: a.profiles?.full_name || 'Unknown',
        slm_id: a.profiles?.slm_id || 'N/A',
        role: a.profiles?.role || 'lineman',
        quiz_id: a.quiz_id,
        score: a.score,
        penalty: a.penalty,
        created_at: a.created_at
    })));
}

main().catch(console.error);
