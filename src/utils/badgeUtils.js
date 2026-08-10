import { filterCoreCompletedLessonIds } from './trainingLessonIds';

/**
 * Learning-path milestone badges (medal + ribbon on Training roadmap).
 * Solid mid-tones paired with dark text (Training nodes force text-slate-900).
 */
export const roadmapBadgeLevels = [
    { level: 1, en: 'Trainee', bn: 'ট্রেইনি', icon: '🌱', color: 'bg-slate-300', medalText: 'text-slate-900' },
    { level: 2, en: 'Junior', bn: 'জুনিয়র', icon: '⭐', color: 'bg-blue-300', medalText: 'text-slate-900' },
    { level: 3, en: 'Technician', bn: 'টেকনিশিয়ান', icon: '🔧', color: 'bg-cyan-300', medalText: 'text-slate-900' },
    { level: 4, en: 'Skilled', bn: 'স্কিলড', icon: '✅', color: 'bg-emerald-300', medalText: 'text-slate-900' },
    { level: 5, en: 'Advanced', bn: 'অ্যাডভান্সড', icon: '🚀', color: 'bg-sky-300', medalText: 'text-slate-900' },
    { level: 6, en: 'Senior', bn: 'সিনিয়র', icon: '🏅', color: 'bg-violet-300', medalText: 'text-slate-900' },
    { level: 7, en: 'Supervisor', bn: 'সুপারভাইজার', icon: '👑', color: 'bg-fuchsia-300', medalText: 'text-slate-900' },
    { level: 8, en: 'Specialist', bn: 'স্পেশালিস্ট', icon: '💎', color: 'bg-rose-300', medalText: 'text-slate-900' },
    { level: 9, en: 'Expert', bn: 'এক্সপার্ট', icon: '🏆', color: 'bg-orange-400', medalText: 'text-slate-900' },
];

export const getRoadmapBadgeByLevel = (level) =>
    roadmapBadgeLevels.find((b) => b.level === level) || roadmapBadgeLevels[0];

/**
 * Chip / pill badges for Home, progress, leaderboard.
 * Tuned for cream app surfaces (#fffdf7): distinct hue per level,
 * dark text on tinted fill, explicit border (never cream-on-cream).
 */
export const badgeLevels = [
    {
        level: 1,
        en: 'Trainee',
        bn: 'ট্রেইনি',
        color: 'border border-slate-400 bg-slate-200 text-slate-900',
    },
    {
        level: 2,
        en: 'Junior',
        bn: 'জুনিয়র',
        color: 'border border-blue-400 bg-blue-100 text-blue-950',
    },
    {
        level: 3,
        en: 'Technician',
        bn: 'টেকনিশিয়ান',
        color: 'border border-cyan-500 bg-cyan-100 text-cyan-950',
    },
    {
        level: 4,
        en: 'Skilled',
        bn: 'স্কিলড',
        color: 'border border-emerald-500 bg-emerald-100 text-emerald-950',
    },
    {
        level: 5,
        en: 'Advanced',
        bn: 'অ্যাডভান্সড',
        color: 'border border-sky-500 bg-sky-100 text-sky-950',
    },
    {
        level: 6,
        en: 'Senior',
        bn: 'সিনিয়র',
        color: 'border border-violet-500 bg-violet-100 text-violet-950',
    },
    {
        level: 7,
        en: 'Supervisor',
        bn: 'সুপারভাইজার',
        color: 'border border-fuchsia-500 bg-fuchsia-100 text-fuchsia-950',
    },
    {
        level: 8,
        en: 'Specialist',
        bn: 'স্পেশালিস্ট',
        color: 'border border-rose-500 bg-rose-100 text-rose-950',
    },
    {
        level: 9,
        en: 'Expert',
        bn: 'এক্সপার্ট',
        color: 'border border-orange-700 bg-orange-500 text-white shadow-sm',
    },
];

export const getBadgeByLevel = (level, readingPoints = 0) => {
    // Treat level 0 or null as Level 1 (Trainee)
    let effectiveLevel = (!level || level < 1) ? 1 : level;

    // Fail-proof Point-based Promotion (Logical Override)
    // Thresholds based on chapter completion (approx 200 pts per chapter)
    // We use slightly lower thresholds to account for minor sync latencies
    if (readingPoints >= 1780) effectiveLevel = Math.max(effectiveLevel, 9);      // Expert (Ch 9)
    else if (readingPoints >= 1580) effectiveLevel = Math.max(effectiveLevel, 9); // Expert (Ch 8 completed)
    else if (readingPoints >= 1380) effectiveLevel = Math.max(effectiveLevel, 8); // Specialist (Ch 7 completed)
    else if (readingPoints >= 1180) effectiveLevel = Math.max(effectiveLevel, 7); // Supervisor (Ch 6 completed)
    else if (readingPoints >= 980) effectiveLevel = Math.max(effectiveLevel, 6);  // Senior (Ch 5 completed)
    else if (readingPoints >= 780) effectiveLevel = Math.max(effectiveLevel, 5);  // Advanced (Ch 4 completed)
    else if (readingPoints >= 580) effectiveLevel = Math.max(effectiveLevel, 4);  // Skilled (Ch 3 completed)
    else if (readingPoints >= 380) effectiveLevel = Math.max(effectiveLevel, 3);  // Technician (Ch 2 completed)
    else if (readingPoints >= 180) effectiveLevel = Math.max(effectiveLevel, 2);  // Junior (Ch 1 completed)

    return badgeLevels.find(b => b.level === effectiveLevel) || badgeLevels[0];
};

// Default lesson counts per chapter based on the training manifest
const defaultChapterCounts = {
    1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 11, 7: 10, 8: 10, 9: 10
};

export const calculateLevelFromProgress = (completedLessons, trainingChapters) => {
    const coreLessons = filterCoreCompletedLessonIds(
        Array.isArray(completedLessons) ? completedLessons : []
    );
    if (!coreLessons.length) return 0;

    const chaptersToTrack = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let currentLevel = 0;

    for (const chapterNum of chaptersToTrack) {
        // Find lesson count for this chapter (either from props or default)
        let lessonCount = 0;
        if (trainingChapters) {
            const chap = trainingChapters.find(c => c.number === chapterNum);
            lessonCount = chap ? chap.count : 0;
        } else {
            lessonCount = defaultChapterCounts[chapterNum] || 0;
        }

        if (lessonCount === 0) break;

        // Check if all lessons in this chapter are completed
        let allLessonsCompleted = true;
        for (let i = 1; i <= lessonCount; i++) {
            const lessonId = `${chapterNum}.${i}`;
            if (!coreLessons.includes(lessonId)) {
                allLessonsCompleted = false;
                break;
            }
        }

        if (allLessonsCompleted) {
            currentLevel = chapterNum;
        } else {
            // STOP HERE: This is the critical sequential check.
            // If any lesson in the CURRENT chapter is missing,
            // the user cannot earn this badge or any subsequent ones.
            break;
        }
    }

    // Return the level the user is currently at.
    // If they finished Chapter N, they are now at Level N+1.
    // Max level is 9 (Expert).
    return Math.min(9, currentLevel + 1);
};
