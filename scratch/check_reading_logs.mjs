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

async function checkReadingLogs() {
    const userId = 'ef744c69-650b-4735-ba0f-1c67377087c4';

    console.log('--- reading_logs ---');
    const { data: logs, error: logsError } = await supabase
        .from('reading_logs')
        .select('*')
        .eq('user_id', userId)
        .limit(10);
    if (logsError) console.error(logsError);
    else console.log(JSON.stringify(logs, null, 2));

    console.log('\n--- reading_history ---');
    const { data: hist, error: histError } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', userId)
        .limit(10);
    if (histError) console.error(histError);
    else console.log(JSON.stringify(hist, null, 2));
}

checkReadingLogs();
