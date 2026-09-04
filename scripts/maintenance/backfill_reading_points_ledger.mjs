/**
 * Backfill profiles.reading_points_ledger using the same formula as
 * src/utils/cumulativeReadingPoints.js (All-time Rank overlay).
 *
 * Prerequisites: run supabase/migrations/20260904120000_reading_points_ledger.sql
 * in the Supabase SQL editor first.
 *
 * Usage: node scripts/maintenance/backfill_reading_points_ledger.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { cumulativeReadingPointsFromLedger } from '../../src/utils/cumulativeReadingPoints.js';

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
const sb = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function fetchReadingAttempts(userId) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb
      .from('quiz_attempts')
      .select('quiz_id, score')
      .eq('user_id', userId)
      .or('quiz_id.like.lesson_bonus%,quiz_id.like.life_skill_bonus%')
      .range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

const { data: profiles, error: pErr } = await sb
  .from('profiles')
  .select('id, full_name, reading_points, completed_lessons, reading_points_ledger')
  .gt('points', 0);

if (pErr) {
  console.error('Failed to load profiles (is reading_points_ledger column applied?):', pErr.message);
  process.exit(1);
}

let updated = 0;
let unchanged = 0;
const samples = [];

for (const p of profiles || []) {
  const attempts = await fetchReadingAttempts(p.id);
  const ledger = cumulativeReadingPointsFromLedger({
    completedLessons: p.completed_lessons,
    profileReadingPoints: p.reading_points,
    attempts,
  });

  if (Number(p.reading_points_ledger) === ledger) {
    unchanged += 1;
    continue;
  }

  const { error } = await sb.from('profiles').update({ reading_points_ledger: ledger }).eq('id', p.id);
  if (error) {
    console.error('Update failed', p.id, error.message);
    process.exit(1);
  }
  updated += 1;
  if (samples.length < 8) {
    samples.push({
      name: p.full_name,
      old_reading: p.reading_points,
      ledger,
      delta: ledger - (Number(p.reading_points) || 0),
    });
  }
}

console.log(JSON.stringify({ profiles: profiles.length, updated, unchanged, samples }, null, 2));
