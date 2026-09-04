/**
 * URGENT: Restore profiles + quiz_attempts from admin_reset auto-backup.
 * Caused by accidental admin_reset_score via service role (null auth.uid bypass).
 *
 * Usage: node scripts/maintenance/restore_from_admin_backup.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const sb = createClient(url, key);
if (!url || !key) {
  console.error('Need Supabase URL + key in .env.local');
  process.exit(1);
}
console.log('Using key type:', env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon');

async function fetchAll(table, select = '*') {
  const page = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await sb.from(table).select(select).range(from, from + page - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < page) break;
    from += page;
  }
  return rows;
}

console.log('Loading backups…');
const profilesBackup = await fetchAll('backup_profiles_progress');
const attemptsBackup = await fetchAll('backup_quiz_attempts');
console.log({ profilesBackup: profilesBackup.length, attemptsBackup: attemptsBackup.length });

if (profilesBackup.length < 50 || attemptsBackup.length < 1000) {
  console.error('Backup too small — aborting');
  process.exit(1);
}

// Use latest backup_at only
const maxProfAt = profilesBackup.reduce((m, r) => (r.backup_at > m ? r.backup_at : m), '');
const maxAttAt = attemptsBackup.reduce((m, r) => (r.backup_at > m ? r.backup_at : m), '');
const profRows = profilesBackup.filter((r) => r.backup_at === maxProfAt);
const attRows = attemptsBackup.filter((r) => r.backup_at === maxAttAt);
console.log({ maxProfAt, maxAttAt, profRows: profRows.length, attRows: attRows.length });

console.log('Restoring profiles…');
let restoredProfiles = 0;
for (const b of profRows) {
  const { error } = await sb
    .from('profiles')
    .update({
      points: b.points ?? 0,
      reading_points: b.reading_points ?? 0,
      reading_points_ledger: b.reading_points_ledger ?? b.reading_points ?? 0,
      quiz_points: b.quiz_points ?? 0,
      completed_lessons: b.completed_lessons ?? [],
      training_level: b.training_level ?? 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', b.user_id);
  if (error) {
    console.error('profile restore failed', b.full_name, error.message);
    process.exit(1);
  }
  restoredProfiles += 1;
  if (restoredProfiles % 25 === 0) console.log('profiles', restoredProfiles);
}
console.log('profiles restored', restoredProfiles);

console.log('Clearing live quiz_attempts…');
// Delete in chunks by selecting ids
let deleted = 0;
for (;;) {
  const { data, error } = await sb.from('quiz_attempts').select('id').limit(500);
  if (error) throw error;
  if (!data?.length) break;
  const ids = data.map((r) => r.id);
  const { error: dErr } = await sb.from('quiz_attempts').delete().in('id', ids);
  if (dErr) throw dErr;
  deleted += ids.length;
}
console.log('deleted live attempts', deleted);

console.log('Inserting attempts from backup…');
let inserted = 0;
const chunk = 200;
for (let i = 0; i < attRows.length; i += chunk) {
  const slice = attRows.slice(i, i + chunk).map((r) => ({
    id: r.original_id,
    user_id: r.user_id,
    quiz_id: r.quiz_id,
    score: r.score ?? 0,
    penalty: r.penalty ?? 0,
    created_at: r.created_at,
  }));
  const { error } = await sb.from('quiz_attempts').upsert(slice, { onConflict: 'id' });
  if (error) {
    // fallback without forcing id
    const slim = slice.map(({ user_id, quiz_id, score, penalty, created_at }) => ({
      user_id,
      quiz_id,
      score,
      penalty,
      created_at,
    }));
    const { error: e2 } = await sb.from('quiz_attempts').upsert(slim, { onConflict: 'user_id,quiz_id' });
    if (e2) {
      console.error('attempt insert failed at', i, error.message, e2.message);
      process.exit(1);
    }
  }
  inserted += slice.length;
  if (inserted % 1000 === 0 || inserted === attRows.length) console.log('attempts', inserted);
}

const { count: pos } = await sb.from('profiles').select('*', { count: 'exact', head: true }).gt('points', 0);
const { count: attempts } = await sb.from('quiz_attempts').select('*', { count: 'exact', head: true });
const { data: top } = await sb
  .from('profiles')
  .select('full_name, points, reading_points, reading_points_ledger, training_level')
  .order('points', { ascending: false })
  .limit(5);

console.log(JSON.stringify({ positivePoints: pos, attempts, top }, null, 2));
