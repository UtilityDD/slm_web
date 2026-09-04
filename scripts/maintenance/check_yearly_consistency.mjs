import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: topPlayers, error } = await supabase
    .from('daily_user_activity')
    .select('user_id, activity_date, quizzes_played, points_earned, penalties_incurred, net_points, profiles(full_name, district)')
    .gte('activity_date', '2026-03-07');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const byUser = new Map();
  for (const row of topPlayers || []) {
    const name = row.profiles?.full_name || row.user_id;
    const district = row.profiles?.district || '';
    if (!byUser.has(row.user_id)) {
      byUser.set(row.user_id, { name, district, active_days: 0, total_quizzes: 0, net_points: 0, penalties: 0 });
    }
    const u = byUser.get(row.user_id);
    if (row.quizzes_played > 0) {
      u.active_days += 1;
      u.total_quizzes += row.quizzes_played;
      u.net_points += row.net_points;
      u.penalties += row.penalties_incurred;
    }
  }

  const sorted = Array.from(byUser.values()).sort((a, b) => {
    if (b.active_days !== a.active_days) return b.active_days - a.active_days;
    return b.net_points - a.net_points;
  });

  console.log('--- Top 10 Most Consistent Players Since March 7, 2026 ---');
  console.table(sorted.slice(0, 10));
}

test();
