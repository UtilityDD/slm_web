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
  content.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  return env;
}

const env = loadEnv(envPath);
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkRecentPenalties(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: attempts, error: attemptsError } = await supabase
    .from('quiz_attempts')
    .select('user_id, quiz_id, score, penalty, created_at')
    .like('quiz_id', 'hourly-challenge-%')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (attemptsError) {
    throw attemptsError;
  }

  const allRows = attempts || [];
  const penaltyRows = allRows.filter((row) => Number(row.penalty || 0) > 0);
  const byUser = {};

  penaltyRows.forEach((row) => {
    const uid = row.user_id;
    byUser[uid] = (byUser[uid] || 0) + Number(row.penalty || 0);
  });

  const userIds = Object.keys(byUser);
  let profiles = [];
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, points, quiz_points, total_penalties, updated_at')
      .in('id', userIds);
    if (error) throw error;
    profiles = data || [];
  }

  console.log(`Hourly attempts (last ${days} days): ${allRows.length}`);
  console.log(`Rows with penalty > 0: ${penaltyRows.length}`);
  console.log(`Users with recent penalties: ${userIds.length}`);
  console.log('');

  const rows = profiles
    .map((p) => ({
      name: p.full_name,
      recent_penalty_sum: byUser[p.id] || 0,
      profile_total_penalties: p.total_penalties || 0,
      points: p.points || 0,
      quiz_points: p.quiz_points || 0,
      updated_at: p.updated_at,
    }))
    .sort((a, b) => b.recent_penalty_sum - a.recent_penalty_sum);

  rows.slice(0, 20).forEach((r) => {
    console.log(
      `${r.name} | recent=${r.recent_penalty_sum} | profile_total=${r.profile_total_penalties} | points=${r.points} | quiz=${r.quiz_points} | updated=${r.updated_at}`
    );
  });
}

checkRecentPenalties(7).catch((err) => {
  console.error('recent penalty check failed:', err);
  process.exit(1);
});
