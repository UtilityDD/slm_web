export const badgeLevels = [
    { level: 1, en: "Safety Trainee", bn: "সেফটি ট্রেইনি", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
    { level: 2, en: "Helper Lineman", bn: "হেল্পার লাইনম্যান", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    { level: 3, en: "Junior Lineman", bn: "জুনিয়র লাইনম্যান", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
    { level: 4, en: "Skilled Lineman", bn: "স্কিলড লাইনম্যান", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
    { level: 5, en: "Safety Champion", bn: "সেফটি চ্যাম্পিয়ন", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    { level: 6, en: "Senior Lineman", bn: "সিনিয়র লাইনম্যান", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
    { level: 7, en: "Line Supervisor", bn: "লাইন সুপারভাইজার", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
    { level: 8, en: "Master Lineman", bn: "মাস্টার লাইনম্যান", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
    { level: 9, en: "Safety Expert", bn: "সেফটি এক্সপার্ট", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800" },
    { level: 10, en: "Chief Safety Officer", bn: "চিফ সেফটি অফিসার", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 shadow-sm shadow-yellow-500/20" }
];

export const getBadgeByLevel = (level) => {
    if (!level || level < 1) return null;
    return badgeLevels.find(b => b.level === level) || badgeLevels[0];
};

export const calculateLevelFromProgress = (completedLessons) => {
    if (!completedLessons || completedLessons.length === 0) return 0;
    const completedChapters = completedLessons.map(id => parseInt(id.split('.')[0]));
    return Math.max(...completedChapters);
};
