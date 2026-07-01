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

    console.log("Calling get_random_hourly_questions...");
    const { data, error } = await sb.rpc('get_random_hourly_questions', {
        lang: 'bn',
        limit_count: 50
    });

    if (error) {
        console.error("Error in get_random_hourly_questions:", error);
    } else {
        console.log("Successfully fetched questions. Count:", data?.length || 0);
        if (data && data.length > 0) {
            console.log("Sample question:", JSON.stringify(data[0], null, 2));
        }
    }
}

main().catch(console.error);
