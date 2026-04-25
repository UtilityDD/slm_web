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

async function listTables() {
    // We can't query pg_catalog directly with anon key usually, 
    // but we can check what tables are accessible or common ones.
    // Let's try to find if there is a 'reading_logs' or similar table.
    
    // Actually, let's just check the columns of 'profiles' and see if there are monthly counters.
    // Or better, let's look at the migrations or previous context if possible.
    
    // I'll try to find any table with 'reading' in it.
    const tablesToTry = ['reading_logs', 'lesson_progress', 'reading_history', 'lesson_attempts'];
    
    for (const table of tablesToTry) {
        const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(1);
        if (!error) {
            console.log(`Found table: ${table}`);
        }
    }
}

listTables();
