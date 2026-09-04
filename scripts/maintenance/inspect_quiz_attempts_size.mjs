import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv() {
  const env = {};
  for (const f of ['.env', '.env.local']) {
    try {
      const parsed = Object.fromEntries(
        readFileSync(f, 'utf8')
          .split(/\r?\n/)
          .filter((l) => l && !l.startsWith('#') && l.includes('='))
          .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
          })
      );
      Object.assign(env, parsed);
    } catch {}
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- Inspecting quiz_attempts in Supabase ---');

  // 1. Total row count
  const { count: totalCount, error: countErr } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('Count error:', countErr);
    return;
  }
  console.log(`Total quiz_attempts rows: ${totalCount}`);

  // 2. Oldest and newest records
  const { data: oldestData } = await supabase
    .from('quiz_attempts')
    .select('id, created_at, quiz_id')
    .order('created_at', { ascending: true })
    .limit(1);

  const { data: newestData } = await supabase
    .from('quiz_attempts')
    .select('id, created_at, quiz_id')
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('Oldest record date:', oldestData?.[0]?.created_at);
  console.log('Newest record date:', newestData?.[0]?.created_at);

  // 3. Count older than 90 days
  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count: olderThan90Count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', cutoff90);

  const { count: between60and90Count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cutoff90)
    .lt('created_at', cutoff60);

  const { count: between30and60Count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cutoff60)
    .lt('created_at', cutoff30);

  const { count: last30DaysCount } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cutoff30);

  console.log(`\n--- Age Distribution ---`);
  console.log(`Older than 90 days (< ${cutoff90.slice(0,10)}): ${olderThan90Count} rows (${((olderThan90Count / totalCount) * 100).toFixed(1)}%)`);
  console.log(`60 to 90 days ago: ${between60and90Count} rows (${((between60and90Count / totalCount) * 100).toFixed(1)}%)`);
  console.log(`30 to 60 days ago: ${between30and60Count} rows (${((between30and60Count / totalCount) * 100).toFixed(1)}%)`);
  console.log(`Last 30 days: ${last30DaysCount} rows (${((last30DaysCount / totalCount) * 100).toFixed(1)}%)`);

  // 4. Breakdown by quiz_id prefix
  const { count: hourlyCount } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .like('quiz_id', 'hourly-challenge%');

  const { count: lessonBonusCount } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .like('quiz_id', 'lesson_bonus%');

  const { count: lifeSkillCount } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .like('quiz_id', 'life_skill%');

  console.log(`\n--- Quiz Type Breakdown ---`);
  console.log(`Hourly challenges: ${hourlyCount} rows (${((hourlyCount / totalCount) * 100).toFixed(1)}%)`);
  console.log(`Lesson bonuses (reading): ${lessonBonusCount} rows (${((lessonBonusCount / totalCount) * 100).toFixed(1)}%)`);
  console.log(`Life skill quizzes: ${lifeSkillCount} rows (${((lifeSkillCount / totalCount) * 100).toFixed(1)}%)`);
  console.log(`Other/standard quizzes: ${totalCount - hourlyCount - lessonBonusCount - lifeSkillCount} rows`);

  // 5. Monthly breakdown
  console.log(`\n--- Month-by-Month Breakdown (2026) ---`);
  for (let m = 3; m <= 9; m++) {
    const startM = new Date(Date.UTC(2026, m - 1, 1)).toISOString();
    const endM = new Date(Date.UTC(2026, m, 1)).toISOString();
    const { count: mCount } = await supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startM)
      .lt('created_at', endM);
    console.log(`Month 2026-${m.toString().padStart(2, '0')}: ${mCount || 0} rows`);
  }

  // 6. Profiles and backup tables context
  const { count: profilesCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  console.log(`\n--- Other Tables Context ---`);
  console.log(`Total profiles: ${profilesCount}`);

  const backupTables = ['backup_quiz_attempts', 'backup_profiles', 'quiz_attempts_backup'];
  for (const bTable of backupTables) {
    const { count: bCount, error: bErr } = await supabase
      .from(bTable)
      .select('*', { count: 'exact', head: true });
    if (!bErr && bCount !== null) {
      console.log(`Table ${bTable}: ${bCount} rows`);
    }
  }

  // Estimate storage:
  const estimatedTableSizeBytes = totalCount * 170;
  const estimatedTotalRelationBytes = totalCount * 350;
  console.log(`\n--- Size Estimation ---`);
  console.log(`Estimated table data size: ${(estimatedTableSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Estimated table + index disk footprint: ${(estimatedTotalRelationBytes / (1024 * 1024)).toFixed(2)} MB`);
}

inspect();
