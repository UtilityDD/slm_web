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

async function run() {
    const { data, error } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, created_at')
        .eq('user_id', 'ef744c69-650b-4735-ba0f-1c67377087c4')
        .ilike('quiz_id', 'lesson_bonus_%');
    
    if (error) {
        console.error(error);
    } else {
        console.log(`Found ${data.length} lesson bonus entries.`);
        const total = data.reduce((acc, curr) => acc + (curr.score || 0), 0);
        console.log(`Total Bonus: ${total}`);
    }
}

run();
