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

async function testFormula() {
  const { data: rows, error } = await supabase
    .from('daily_user_activity')
    .select('user_id, activity_date, quizzes_played, points_earned, penalties_incurred, net_points, profiles(full_name, district, created_at, avatar_url, slm_id, points, reading_points, reading_points_ledger)')
    .gte('activity_date', '2026-03-07');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const cycleStart = new Date('2026-03-07T00:00:00+05:30').getTime();
  const now = Date.now();

  const byUser = new Map();
  for (const r of rows || []) {
    if (!byUser.has(r.user_id)) {
      const createdAt = r.profiles?.created_at ? new Date(r.profiles.created_at).getTime() : cycleStart;
      const eligibleStart = Math.max(cycleStart, createdAt);
      const eligibleDays = Math.max(1, Math.ceil((now - eligibleStart) / (1000 * 60 * 60 * 24)));
      byUser.set(r.user_id, {
        userId: r.user_id,
        name: r.profiles?.full_name || r.user_id,
        district: r.profiles?.district || '',
        slmId: r.profiles?.slm_id || '',
        avatarUrl: r.profiles?.avatar_url || '',
        lifetimePoints: r.profiles?.points || 0,
        readingPoints: r.profiles?.reading_points_ledger ?? r.profiles?.reading_points ?? 0,
        eligibleDays,
        activeDays: 0,
        totalQuizzes: 0,
        netPoints: 0,
        penalties: 0,
      });
    }
    const u = byUser.get(r.user_id);
    if (r.quizzes_played > 0) {
      u.activeDays += 1;
      u.totalQuizzes += r.quizzes_played;
      u.netPoints += r.net_points;
      u.penalties += r.penalties_incurred;
    }
  }

  const results = Array.from(byUser.values()).map(u => {
    const consistencyRate = Math.min(1.0, u.activeDays / u.eligibleDays);
    const yearlyScore = Math.round(u.netPoints * (1 + consistencyRate));
    const qualified = u.activeDays >= 30;
    return {
      name: u.name,
      district: u.district,
      lifetimePoints: u.lifetimePoints,
      activeDays: u.activeDays,
      eligibleDays: u.eligibleDays,
      consistency: Math.round(consistencyRate * 100) + '%',
      netPoints: u.netPoints,
      penalties: u.penalties,
      yearlyScore,
      qualified
    };
  });

  results.sort((a, b) => {
    if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
    return b.yearlyScore - a.yearlyScore;
  });

  console.log('--- Top 10 Annual Grand Trophy Standings (Formula Option A) ---');
  console.table(results.slice(0, 10));
}

testFormula();
