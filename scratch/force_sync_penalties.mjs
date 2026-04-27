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

async function forceSyncPenalties() {
    console.log('=== FORCE SYNC PENALTIES (NODE.JS) ===\n');

    // 1. Get profiles with mismatches
    const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, total_penalties, created_at');

    if (pErr) { console.error(pErr); return; }

    // 2. Get history sums
    const { data: attempts, error: aErr } = await supabase
        .from('quiz_attempts')
        .select('user_id, penalty');

    if (aErr) { console.error(aErr); return; }

    const historyMap = {};
    attempts.forEach(a => {
        historyMap[a.user_id] = (historyMap[a.user_id] || 0) + (Number(a.penalty) || 0);
    });

    console.log('Processing Users...');

    for (const p of profiles) {
        const profilePenalty = p.total_penalties || 0;
        const historyPenalty = historyMap[p.id] || 0;
        const delta = profilePenalty - historyPenalty;

        if (delta > 0) {
            console.log(`Fixing ${p.full_name}: Profile=${profilePenalty}, History=${historyPenalty}, Adding Delta=${delta}`);
            
            // Insert adjustment row
            const { error: insErr } = await supabase
                .from('quiz_attempts')
                .insert({
                    user_id: p.id,
                    quiz_id: `penalty_adjustment_v3_${Date.now()}`,
                    score: 0,
                    penalty: delta,
                    created_at: p.created_at
                });

            if (insErr) console.error(`Failed to insert for ${p.full_name}:`, insErr.message);
        } else if (delta < 0) {
             console.log(`Syncing Profile for ${p.full_name}: Delta=${delta}. Setting profile to ${historyPenalty}`);
             // This user has more history than profile - rare but possible
             await supabase.from('profiles').update({ total_penalties: historyPenalty }).eq('id', p.id);
        }
    }

    console.log('\nSync Complete. Run audit again to verify.');
}

forceSyncPenalties();
