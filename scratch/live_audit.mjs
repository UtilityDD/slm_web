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

async function liveAudit() {
    console.log('=== LIVE PENALTY AUDIT (NO CACHE) ===\n');

    const { data: profiles } = await supabase.from('profiles').select('id, full_name, total_penalties');
    const { data: attempts } = await supabase.from('quiz_attempts').select('user_id, penalty');

    const historyMap = {};
    attempts.forEach(a => {
        historyMap[a.user_id] = (historyMap[a.user_id] || 0) + (Number(a.penalty) || 0);
    });

    let mismatchCount = 0;
    profiles.forEach(p => {
        const pPenalty = p.total_penalties || 0;
        const hPenalty = historyMap[p.id] || 0;
        if (pPenalty !== hPenalty) {
            mismatchCount++;
            console.log(`❌ MISMATCH: ${p.full_name.padEnd(20)} | Profile: ${String(pPenalty).padStart(5)} | History: ${String(hPenalty).padStart(5)} | Delta: ${pPenalty - hPenalty}`);
        }
    });

    if (mismatchCount === 0) {
        console.log('✅ ALL MATCHED! Data is 100% consistent.');
    } else {
        console.log(`\nFound ${mismatchCount} mismatches.`);
    }
}

liveAudit();
