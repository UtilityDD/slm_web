import { filterCoreCompletedLessonIds } from './trainingLessonIds';

export const badgeLevels = [
    { level: 1, en: "Trainee", bn: "ট্রেইনি", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
    { level: 2, en: "Junior", bn: "জুনিয়র", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    { level: 3, en: "Technician", bn: "টেকনিশিয়ান", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
    { level: 4, en: "Skilled", bn: "স্কিলড", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
    { level: 5, en: "Advanced", bn: "অ্যাডভান্সড", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
    { level: 6, en: "Senior", bn: "সিনিয়র", color: "bg-[#fff7ed] text-[#ea580c] dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
    { level: 7, en: "Supervisor", bn: "সুপারভাইজার", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
    { level: 8, en: "Specialist", bn: "স্পেশালিস্ট", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800" },
    { level: 9, en: "Expert", bn: "এক্সপার্ট", color: "bg-orange-600 text-white dark:bg-orange-700 border-orange-500 shadow-sm" }
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
