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

async function checkMonthlyView() {
    const userId = 'ef744c69-650b-4735-ba0f-1c67377087c4';
    const month = 4; // April
    const year = 2026;

    const { data, error } = await supabase
        .from('monthly_leaderboard_view')
        .select('*')
        .eq('user_id', userId)
        .eq('month_num', month)
        .eq('year_num', year)
        .single();

    if (error) {
        console.error('Error fetching monthly view:', error);
        return;
    }

    console.log(`Monthly View Data for Abujar:`);
    console.log(JSON.stringify(data, null, 2));
}

checkMonthlyView();
