/**
 * Apply content-assessed difficulty tags from quiz_management/hourly_difficulty_tags.json
 *
 * Usage:
 *   node scripts/maintenance/apply_hourly_difficulty_tags.mjs
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (calls maintenance_set_hourly_question_tags RPC).
 *
 * Alternative: run supabase db push (applies migration 20260605120000_apply_hourly_difficulty_tags.sql)
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
    fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is required in .env.local');
    console.error('Or run: npx supabase db push --linked (applies SQL migration)');
    process.exit(1);
}

const sb = createClient(env.VITE_SUPABASE_URL, key);
const tagsPath = path.join(root, 'quiz_management', 'hourly_difficulty_tags.json');
if (!fs.existsSync(tagsPath)) {
    console.error('Missing', tagsPath, '— run: node scripts/maintenance/assess_hourly_difficulty.mjs');
    process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));
const BATCH = 150;
let total = 0;

for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({ id: r.id, difficulty: r.difficulty }));
    const { data, error } = await sb.rpc('maintenance_set_hourly_question_tags', { p_payload: batch });
    if (error) {
        console.error('RPC error at batch', i, error);
        process.exit(1);
    }
    total += data ?? batch.length;
    process.stdout.write(`\r  ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
}

console.log(`\nApplied tags to ${total} rows via RPC.`);
