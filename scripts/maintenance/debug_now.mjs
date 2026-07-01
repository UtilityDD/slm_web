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

    const { data, error } = await sb.rpc('get_server_time');
    if (error) {
        console.error("Error calling get_server_time:", error);
    } else {
        console.log("get_server_time output:", data);
        const serverDate = new Date(data);
        console.log("Kolkata representation:", serverDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    }

    // Let's run a query to get database's current time and timezone
    // We can run an rpc that executes dynamic SQL or we can run custom check
    // Wait, let's see if we have any other rpc or table to query timezone.
}

main().catch(console.error);
