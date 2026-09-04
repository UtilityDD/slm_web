/**
 * Backfill profiles.reading_points_ledger (same rules as cumulativeReadingPoints.js).
 * Prerequisite: 20260904120000_reading_points_ledger.sql applied.
 *
 * Usage: node scripts/maintenance/backfill_reading_points_ledger.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const CORE_LESSON_MONTHLY_BONUS_POINTS = 20;
const CORE_LESSON_ID_RE = /^\d+\.\d+$/;

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

function filterCoreCompletedLessonIds(completedLessons) {
  const list = Array.isArray(completedLessons) ? completedLessons : [];
  return [...new Set(list.map((x) => String(x || '').trim()).filter((id) => CORE_LESSON_ID_RE.test(id)))];
}

function isCoreLessonLegacyBonusQuizId(quizId) {
  return /^lesson_bonus_\d+\.\d+$/.test(String(quizId || ''));
}

function isCoreLessonDayStampedBonusQuizId(quizId) {
  return /^lesson_bonus_\d+\.\d+_\d{4}_\d{2}_\d{2}$/.test(String(quizId || ''));
}

function lessonIdFromCoreLessonBonusQuizId(quizId) {
  const s = String(quizId || '');
  if (!s.startsWith('lesson_bonus_')) return null;
  const rest = s.slice('lesson_bonus_'.length);
  const stamped = rest.match(/^(\d+\.\d+)_\d{4}_\d{2}_\d{2}$/);
  if (stamped) return stamped[1];
  if (CORE_LESSON_ID_RE.test(rest)) return rest;
  return null;
}

function cumulativeReadingPointsFromLedger({ completedLessons, profileReadingPoints = 0, attempts = [] } = {}) {
  const profileLessons = new Set(filterCoreCompletedLessonIds(completedLessons));
  const byLesson = new Map();
  let lifeScore = 0;

  for (const row of attempts || []) {
    const quizId = String(row.quiz_id || '');
    const score = Number(row.score) || 0;
    if (quizId.startsWith('life_skill_bonus')) {
      lifeScore += score;
      continue;
    }
    const lid = lessonIdFromCoreLessonBonusQuizId(quizId);
    if (!lid) continue;
    if (!byLesson.has(lid)) byLesson.set(lid, { legacy: 0, stamped: 0 });
    const g = byLesson.get(lid);
    if (isCoreLessonLegacyBonusQuizId(quizId)) g.legacy += 1;
    else if (isCoreLessonDayStampedBonusQuizId(quizId)) g.stamped += 1;
  }

  const uniqueLessons = new Set(profileLessons);
  for (const lid of byLesson.keys()) uniqueLessons.add(lid);

  let extraStamped = 0;
  for (const [lid, g] of byLesson) {
    const hasFirstCredit = profileLessons.has(lid) || g.legacy > 0;
    if (hasFirstCredit) extraStamped += g.stamped;
  }

  const firstTime = uniqueLessons.size * CORE_LESSON_MONTHLY_BONUS_POINTS;
  const computed = firstTime + extraStamped * CORE_LESSON_MONTHLY_BONUS_POINTS + lifeScore;
  return Math.max(Number(profileReadingPoints) || 0, computed);
}

const env = loadEnv();
const sb = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

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
  console.error('Failed to load profiles:', pErr.message);
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
    console.error('Update failed', p.full_name || p.id, error.message);
    process.exit(1);
  }
  updated += 1;
  if (samples.length < 10) {
    samples.push({
      name: p.full_name,
      old_reading: p.reading_points,
      ledger,
      delta: ledger - (Number(p.reading_points) || 0),
    });
  }
}

console.log(JSON.stringify({ profiles: (profiles || []).length, updated, unchanged, samples }, null, 2));
