import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  return Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase URL or key in .env.local');
  process.exit(1);
}

const sb = createClient(url, key);
const outDir = resolve('scripts/maintenance/exports', new Date().toISOString().slice(0, 10));
mkdirSync(outDir, { recursive: true });

async function exportTable(name) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await sb.from(name).select('*').range(from, from + pageSize - 1);
    if (error) {
      console.log(`SKIP export ${name}: ${error.message}`);
      return null;
    }
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  const path = resolve(outDir, `${name}.json`);
  writeFileSync(path, JSON.stringify(rows, null, 2));
  console.log(`Exported ${name}: ${rows.length} rows -> ${path}`);
  return rows.length;
}

const toExport = [
  'backup_quiz_attempts',
  'backup_profiles_progress',
  'penalty_backup_profiles',
  'penalty_backup_attempts',
  'score_repair_backup_profiles',
  'safety_library',
  'user_ppes',
  'contact_messages',
  'invitations',
  'lessons',
  'quiz_questions',
  'training_lessons',
];

for (const t of toExport) {
  await exportTable(t);
}

console.log(`\nExports folder: ${outDir}`);
console.log('Next: run SQL cleanup migration in Supabase SQL editor (see supabase/migrations/20260904120000_safe_table_cleanup.sql)');
