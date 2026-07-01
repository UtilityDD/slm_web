import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
    fs
        .readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

const { data: profiles, error: pErr } = await sb
    .from('profiles')
    .select('id, full_name, completed_lessons, reading_points, created_at, last_login_at');
if (pErr) {
    console.error('profiles err', pErr);
    process.exit(1);
}

const { data: bonuses, error: bErr } = await sb
    .from('quiz_attempts')
    .select('user_id, quiz_id, score, created_at')
    .like('quiz_id', 'lesson_bonus%');
if (bErr) {
    console.error('bonus err', bErr);
    process.exit(1);
}

const bonusByUser = {};
for (const r of bonuses || []) {
    if (!bonusByUser[r.user_id]) bonusByUser[r.user_id] = [];
    bonusByUser[r.user_id].push(r);
}

let withLessons = 0;
let withBonus = 0;
let lessonsNoBonus = 0;
let bonusNoLessons = 0;
let zeroLessonsZeroBonus = 0;
let backfillSuspect = 0;
let hasRecentBonus = 0;
let overdueNoBonus = 0;
let overdueByTimestamp = 0;
let scoreNot20 = 0;

const now = Date.now();
const sixtyDays = 60 * 24 * 60 * 60 * 1000;
const twoDays = 2 * 24 * 60 * 60 * 1000;

for (const p of profiles) {
    const lessons = Array.isArray(p.completed_lessons)
        ? p.completed_lessons.filter((x) => /^\d+\.\d+$/.test(String(x)))
        : [];
    const userBonuses = bonusByUser[p.id] || [];
    if (lessons.length > 0) withLessons++;
    if (userBonuses.length > 0) withBonus++;
    if (lessons.length > 0 && userBonuses.length === 0) lessonsNoBonus++;
    if (lessons.length === 0 && userBonuses.length > 0) bonusNoLessons++;
    if (lessons.length === 0 && userBonuses.length === 0) zeroLessonsZeroBonus++;

    for (const b of userBonuses) {
        if (Number(b.score) !== 20) scoreNot20++;
    }

    if (userBonuses.length > 0) {
        const profileDay = p.created_at ? new Date(p.created_at).toDateString() : null;
        const allSameJoinDay =
            profileDay && userBonuses.every((b) => new Date(b.created_at).toDateString() === profileDay);
        if (allSameJoinDay && userBonuses.length > 1) backfillSuspect++;

        const maxBonus = userBonuses.reduce((a, b) =>
            new Date(b.created_at) > new Date(a.created_at) ? b : a
        );
        if (now - new Date(maxBonus.created_at).getTime() < sixtyDays) hasRecentBonus++;
    }

    if (userBonuses.length === 0) {
        overdueNoBonus++;
        continue;
    }
    const maxTs = Math.max(...userBonuses.map((b) => new Date(b.created_at).getTime()));
    if (now - maxTs > twoDays) overdueByTimestamp++;
}

// Score distribution for lesson_bonus
const scoreDist = {};
for (const r of bonuses || []) {
    const k = String(r.score);
    scoreDist[k] = (scoreDist[k] || 0) + 1;
}

console.log(
    JSON.stringify(
        {
            totalUsers: profiles.length,
            withCompletedLessons: withLessons,
            withLessonBonusRows: withBonus,
            lessonsButNoBonusRows: lessonsNoBonus,
            bonusButEmptyCompletedLessons: bonusNoLessons,
            noReadingAtAll: zeroLessonsZeroBonus,
            multiBonusAllSameJoinDay_backfillSuspect: backfillSuspect,
            usersWithRecentBonus60d: hasRecentBonus,
            wouldBeOverdue_noBonus: overdueNoBonus,
            wouldBeOverdue_lastBonusOlderThan2d: overdueByTimestamp,
            totalLessonBonusRows: (bonuses || []).length,
            lessonBonusScoreDistribution: scoreDist,
            non20ScoreRows: scoreNot20,
        },
        null,
        2
    )
);
