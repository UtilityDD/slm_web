export const badgeLevels = [
    { level: 1, en: "Trainee", bn: "ট্রেইনি", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
    { level: 2, en: "Junior", bn: "জুনিয়র", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    { level: 3, en: "Technician", bn: "টেকনিশিয়ান", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
    { level: 4, en: "Skilled", bn: "স্কিলড", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
    { level: 5, en: "Advanced", bn: "অ্যাডভান্সড", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    { level: 6, en: "Senior", bn: "সিনিয়র", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
    { level: 7, en: "Supervisor", bn: "সুপারভাইজার", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
    { level: 8, en: "Specialist", bn: "স্পেশালিস্ট", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
    { level: 9, en: "Expert", bn: "এক্সপার্ট", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800" }
];

export const getBadgeByLevel = (level) => {
    if (!level || level < 1) return null;
    return badgeLevels.find(b => b.level === level) || badgeLevels[0];
};

export const calculateLevelFromProgress = (completedLessons, trainingChapters) => {
    if (!completedLessons || completedLessons.length === 0 || !trainingChapters) return 0;

    // Sort chapters by number to ensure sequential checking
    const sortedChapters = [...trainingChapters]
        .filter(c => c.number < 10) // Exclude Chapter 10 (FAQ)
        .sort((a, b) => a.number - b.number);

    let currentLevel = 0;

    for (const chapter of sortedChapters) {
        // Check if all lessons in this chapter are completed
        let allLessonsCompleted = true;
        for (let i = 1; i <= chapter.count; i++) {
            const lessonId = `${chapter.number}.${i}`;
            if (!completedLessons.includes(lessonId)) {
                allLessonsCompleted = false;
                break;
            }
        }

        if (allLessonsCompleted) {
            currentLevel = chapter.number;
        } else {
            // If a chapter is not fully completed, stop checking further
            // The user's level is the last fully completed chapter
            break;
        }
    }

    return currentLevel;
};
