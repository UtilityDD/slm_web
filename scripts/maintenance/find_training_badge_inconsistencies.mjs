import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const chapterCounts = {
  1: 10,
  2: 10,
  3: 10,
  4: 10,
  5: 10,
  6: 11,
  7: 10,
  8: 10,
  9: 10,
};

const badgeNames = [
  'Trainee',
  'Junior',
  'Technician',
  'Skilled',
  'Advanced',
  'Senior',
  'Supervisor',
  'Specialist',
  'Expert',
];

function calculateLevelFromProgress(completedLessons) {
  const lessons = Array.isArray(completedLessons) ? completedLessons : [];
  if (lessons.length === 0) return 0;

  let currentLevel = 0;

  for (const chapterNum of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const lessonCount = chapterCounts[chapterNum] || 0;
    if (lessonCount === 0) break;

    let allLessonsCompleted = true;
    for (let i = 1; i <= lessonCount; i += 1) {
      if (!lessons.includes(`${chapterNum}.${i}`)) {
        allLessonsCompleted = false;
        break;
      }
    }

    if (allLessonsCompleted) {
      currentLevel = chapterNum;
    } else {
      break;
    }
  }

  return currentLevel;
}

function getBadgeName(level) {
  const effectiveLevel = !level || level < 1 ? 1 : level;
  return badgeNames[effectiveLevel - 1] || 'Trainee';
}

async function fetchAllProfiles() {
  const pageSize = 1000;
  let offset = 0;
  const allProfiles = [];

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, training_level, completed_lessons, updated_at')
      .order('full_name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw error;
    }

    allProfiles.push(...(data || []));

    if (!data || data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return allProfiles;
}

const profiles = await fetchAllProfiles();

const mismatches = profiles
  .map((profile) => {
    const computedTrainingLevel = calculateLevelFromProgress(profile.completed_lessons);
    const profileTrainingLevel = profile.training_level ?? 0;
    const profileBadge = getBadgeName(profileTrainingLevel);
    const computedBadge = getBadgeName(computedTrainingLevel);

    return {
      id: profile.id,
      full_name: profile.full_name,
      profile_training_level: profileTrainingLevel,
      computed_training_level: computedTrainingLevel,
      profile_badge: profileBadge,
      computed_badge: computedBadge,
      completed_lessons_count: Array.isArray(profile.completed_lessons)
        ? profile.completed_lessons.length
        : 0,
      updated_at: profile.updated_at,
      level_mismatch: profileTrainingLevel !== computedTrainingLevel,
      badge_mismatch: profileBadge !== computedBadge,
    };
  })
  .filter((entry) => entry.badge_mismatch || entry.level_mismatch);

console.log(
  JSON.stringify(
    {
      total_profiles: profiles.length,
      mismatches: mismatches.length,
      badge_mismatches: mismatches.filter((entry) => entry.badge_mismatch).length,
      level_only_mismatches: mismatches.filter((entry) => entry.level_mismatch && !entry.badge_mismatch).length,
      sample: mismatches.slice(0, 100),
    },
    null,
    2
  )
);
