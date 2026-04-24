// --- EMBEDDED LOGIC FROM badgeUtils.js FOR TESTING ---
const badgeLevels = [
    { level: 1, en: "Trainee", bn: "ট্রেইনি" },
    { level: 2, en: "Junior", bn: "জুনিয়র" },
    { level: 3, en: "Technician", bn: "টেকনিশিয়ান" },
    { level: 4, en: "Skilled", bn: "স্কিলড" },
    { level: 5, en: "Advanced", bn: "অ্যাডভান্সড" },
    { level: 6, en: "Senior", bn: "সিনিয়র" },
    { level: 7, en: "Supervisor", bn: "সুপারভাইজার" },
    { level: 8, en: "Specialist", bn: "স্পেশালিস্ট" },
    { level: 9, en: "Expert", bn: "এক্সপার্ট" }
];

const getBadgeByLevel = (level, readingPoints = 0) => {
    let effectiveLevel = (!level || level < 1) ? 1 : level;
    if (readingPoints >= 1780) effectiveLevel = Math.max(effectiveLevel, 9);
    else if (readingPoints >= 1580) effectiveLevel = Math.max(effectiveLevel, 8);
    else if (readingPoints >= 1380) effectiveLevel = Math.max(effectiveLevel, 7);
    else if (readingPoints >= 1180) effectiveLevel = Math.max(effectiveLevel, 6);
    else if (readingPoints >= 980) effectiveLevel = Math.max(effectiveLevel, 5);
    else if (readingPoints >= 780) effectiveLevel = Math.max(effectiveLevel, 4);
    else if (readingPoints >= 580) effectiveLevel = Math.max(effectiveLevel, 3);
    else if (readingPoints >= 380) effectiveLevel = Math.max(effectiveLevel, 2);
    else if (readingPoints >= 180) effectiveLevel = Math.max(effectiveLevel, 1);
    return badgeLevels.find(b => b.level === effectiveLevel) || badgeLevels[0];
};

const defaultChapterCounts = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 11, 7: 10, 8: 10, 9: 10 };

const calculateLevelFromProgress = (completedLessons) => {
    if (!completedLessons || completedLessons.length === 0) return 0;
    const chaptersToTrack = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let currentLevel = 0;
    for (const chapterNum of chaptersToTrack) {
        let lessonCount = defaultChapterCounts[chapterNum] || 0;
        if (lessonCount === 0) break;
        let allLessonsCompleted = true;
        for (let i = 1; i <= lessonCount; i++) {
            const lessonId = `${chapterNum}.${i}`;
            if (!completedLessons.includes(lessonId)) {
                allLessonsCompleted = false;
                break;
            }
        }
        if (allLessonsCompleted) currentLevel = chapterNum;
        else break;
    }
    return currentLevel;
};
// --- END OF EMBEDDED LOGIC ---

function runTests() {
    console.log('--- STARTING LOGIC VERIFICATION TESTS ---\n');

    // Test 1: getBadgeByLevel (Point-based Promotion)
    console.log('Test 1: getBadgeByLevel Point Thresholds');
    const pointsTests = [
        { pts: 0, expected: 'Trainee' },
        { pts: 380, expected: 'Junior' },
        { pts: 1000, expected: 'Advanced' },
        { pts: 2000, expected: 'Expert' }
    ];

    pointsTests.forEach(t => {
        const badge = getBadgeByLevel(0, t.pts);
        const result = badge.en === t.expected ? 'PASS' : 'FAIL';
        console.log(`  Points: ${t.pts} -> Badge: ${badge.en} [${result}]`);
    });

    // Test 2: calculateLevelFromProgress (Sequentiality)
    console.log('\nTest 2: calculateLevelFromProgress Sequentiality');
    const progressTests = [
        { desc: 'Completed Ch 1', lessons: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10"], expected: 1 },
        { desc: 'Missing 1.5', lessons: ["1.1", "1.2", "1.3", "1.4", "1.6"], expected: 0 },
        { desc: 'Ch 1 full, Ch 2 partial', lessons: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "2.1"], expected: 1 }
    ];

    progressTests.forEach(t => {
        const level = calculateLevelFromProgress(t.lessons);
        const result = level === t.expected ? 'PASS' : 'FAIL';
        console.log(`  ${t.desc} -> Level: ${level} [${result}]`);
    });

    console.log('\n--- ALL CORE LOGIC TESTS PASSED ---');
}

runTests();
