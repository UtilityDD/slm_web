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

    // Let's import fetchHallOfFame logic or fetch and log the exact cached hall of fame.
    // Instead of importing, we can just run a requestManager fetch or mimic the call.
    // Since requestManager uses localStorage-like cache under memory or file, let's see how leaderboardService caches it.
    // Actually, we can fetch it via the same api / service, or we can just fetch the views and build it.
    // But let's look at what is stored in `hall_of_fame_gallery_v8`.
    // Wait, the cache uses requestManager, which on node might be in-memory or fallback, so it will execute the query.
    
    // Let's look at what leaderboardService returns.
    // We can import leaderboardService, but since we are running in ESM, let's write a dynamic import or do it ourselves.
}

// Let's do it!
import { leaderboardService } from '../../src/utils/leaderboardService.js';
leaderboardService.fetchHallOfFame(true).then(data => {
    for (const entry of data) {
        console.log(`\nMonth: ${entry.year}-${entry.month}`);
        for (const [boardId, rows] of Object.entries(entry.boards)) {
            console.log(`  Board: ${boardId} | Total displayed rows: ${rows.length}`);
            rows.forEach((row, idx) => {
                console.log(`    [${idx}] ${row.full_name} (${row.slm_id}) -> standing_rank=${row.standing_rank}, prize_rank=${row.prize_rank}, status=${row.prize_status}`);
            });
        }
    }
}).catch(console.error);
