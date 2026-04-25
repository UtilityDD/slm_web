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
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', 'fix_monthly_view_reading_points.sql'),
    'utf8'
);

async function run() {
    console.log('Applying monthly view fix...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        // Try running each statement separately via a different approach
        console.log('RPC exec_sql not available. Trying via raw SQL endpoint...');
        console.log('Please run the SQL file manually in Supabase SQL editor:');
        console.log('File: supabase/migrations/fix_monthly_view_reading_points.sql');
        return;
    }
    console.log('View updated successfully!');
}

run();
