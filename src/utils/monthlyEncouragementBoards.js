/** Rules and copy for monthly encouragement boards + token prize resolution. */

import { lessonIdFromCoreLessonBonusQuizId } from './trainingLessonIds';

export const BOARD_IDS = {
    MAIN: 'main_champion',
    NEW_PLAYER: 'new_player',
    MOST_IMPROVED: 'most_improved',
    TOP_LEARNER: 'top_learner',
};

/** Display order for monthly boards and prize resolution. */
export const BOARD_ORDER = [
    BOARD_IDS.MAIN,
    BOARD_IDS.NEW_PLAYER,
    BOARD_IDS.MOST_IMPROVED,
    BOARD_IDS.TOP_LEARNER,
];

export const RULES = {
    NEW_PLAYER_DAYS: 90,
    NEW_MIN_POINTS: 500,
    NEW_MIN_HOURLY: 15,
    NEW_MIN_LESSONS: 5,
    IMPROVE_MIN_PREV: 200,
    IMPROVE_MIN_CUR: 500,
    LEARNER_MIN_LESSONS: 8,
    TOP_N: 3,
};

export function getEncouragementCopy(language = 'bn') {
    const en = language === 'en';
    return {
        sectionTitle: en ? 'More ways to win this month' : 'মাসিক বিশেষ পুরস্কার',
        prizeTitle: en ? 'Current top 3' : 'এখনকার সেরা ৩',
        prizeRule: en
            ? 'Top 3 win on each list. One prize per person.'
            : 'প্রতি তালিকায় সেরা ৩। একজন একবারই পুরস্কার পাবেন।',
        prizeNote: en
            ? 'Final at month-end · live now'
            : 'মাস শেষে চূড়ান্ত · এখন লাইভ',
        hourlyAvgNote: en
            ? 'Hourly avg = this month’s quizzes ÷ days so far.'
            : 'ঘণ্টার গড় = এই মাসের কুইজ ÷ চলতি দিন।',
        hallOfFamePrizeNote: en
            ? 'Gray names won on another list; highlighted names got this prize.'
            : 'ধূসর নাম অন্য তালিকায় জিতেছেন; রঙিন নাম এই তালিকার বিজয়ী।',
        prizeSuperseded: en ? 'Won on another list' : 'অন্য তালিকায় বিজয়ী',
        prizeReplacement: en ? 'Prize winner' : 'পুরস্কার বিজয়ী',
        prizeTop3: en ? 'Top 3 win prizes' : 'সেরা ৩ জন বিজয়ী',
        emptyBoard: en ? 'No qualifiers yet — keep playing!' : 'এখনও কেউ যোগ্য নন—খেলতে থাকুন!',
        notEligible: en ? 'Not eligible yet' : 'যোগ্যতা বাকি',
        boards: {
            [BOARD_IDS.NEW_PLAYER]: {
                title: en ? 'New Player Champion' : 'সেরা নতুন',
                logic: en
                    ? 'Joined within 90 days. Need 500 pts, 15 hourlies, or 5 lessons.'
                    : '৯০ দিনের মধ্যে যোগ দিয়েছেন। লাগবে ৫০০ পয়েন্ট, ১৫টি কুইজ অথবা ৫টি পাঠ।',
                rankBy: en ? 'By monthly points' : 'মাসিক পয়েন্ট অনুযায়ী',
                prize: en ? 'Top 3 win prizes' : 'সেরা ৩ পাবেন পুরস্কার',
            },
            [BOARD_IDS.MOST_IMPROVED]: {
                title: en ? 'Most Improved' : 'সবচেয়ে এগিয়ে',
                logic: en
                    ? 'Beat last month. Need 200+ last month and 500+ this month.'
                    : 'গত মাসের চেয়ে এগোন। গত মাসে ২০০+, এই মাসে ৫০০+ পয়েন্ট লাগবে।',
                rankBy: en ? 'By growth vs last month' : 'গত মাসের চেয়ে বাড়তি পয়েন্ট',
                prize: en ? 'Top 3 win prizes' : 'সেরা ৩ পাবেন পুরস্কার',
            },
            [BOARD_IDS.TOP_LEARNER]: {
                title: en ? 'Top Learner' : 'পড়াশোনা',
                logic: en
                    ? 'Most reading points this month. Need 8+ lessons done.'
                    : 'এই মাসে পাঠ পড়ে সবচেয়ে বেশি পয়েন্ট। কমপক্ষে ৮টি পাঠ শেষ করতে হবে।',
                rankBy: en ? 'By reading points' : 'রিডিং পয়েন্ট অনুযায়ী',
                prize: en ? 'Top 3 win prizes' : 'সেরা ৩ পাবেন পুরস্কার',
            },
            [BOARD_IDS.MAIN]: {
                title: en ? 'Monthly Champion' : 'মাসের সেরা',
                logic: en
                    ? 'Top 3 by this month’s quiz + reading points.'
                    : 'এই মাসের কুইজ ও পড়ার পয়েন্ট মিলিয়ে সেরা ৩।',
                rankBy: en ? 'By total monthly points' : 'মাসিক মোট পয়েন্ট অনুযায়ী',
                prize: en ? 'Top 3 win prizes' : 'সেরা ৩ পাবেন পুরস্কার',
            },
        },
        stats: {
            points: en ? 'pts' : 'পয়েন্ট',
            hourly: en ? 'hourlies' : 'ঘণ্টার কুইজ',
            lessons: en ? 'lessons' : 'পাঠ',
            improvement: en ? 'vs last month' : 'গত মাসের চেয়ে',
            learnerPts: en ? 'reading pts' : 'রিডিং পয়েন্ট',
        },
        monthlyTabs: {
            champion: en ? 'Champion' : 'মাসের সেরা',
            [BOARD_IDS.NEW_PLAYER]: en ? 'New Player' : 'সেরা নতুন',
            [BOARD_IDS.MOST_IMPROVED]: en ? 'Improved' : 'সবচেয়ে এগিয়ে',
            [BOARD_IDS.TOP_LEARNER]: en ? 'Learner' : 'পড়াশোনা',
        },
        /** Compact labels for Rank sticky tabs on small screens */
        monthlyTabsShort: {
            champion: en ? 'Champion' : 'সেরা',
            [BOARD_IDS.NEW_PLAYER]: en ? 'New' : 'নতুন',
            [BOARD_IDS.MOST_IMPROVED]: en ? 'Improved' : 'এগিয়ে',
            [BOARD_IDS.TOP_LEARNER]: en ? 'Learner' : 'পড়া',
        },
    };
}

export const MONTHLY_SUB_TAB = {
    CHAMPION: 'champion',
    ...BOARD_IDS,
};

export const MONTHLY_SUB_TAB_ORDER = [
    MONTHLY_SUB_TAB.CHAMPION,
    BOARD_IDS.NEW_PLAYER,
    BOARD_IDS.MOST_IMPROVED,
];

/** Map monthly sub-tab id to encouragement board id (Hall of Fame + live monthly). */
export function getHallOfFameBoardKey(tabId) {
    return tabId === MONTHLY_SUB_TAB.CHAMPION ? BOARD_IDS.MAIN : tabId;
}

export const PRIZE_STATUS = {
    WINNER: 'winner',
    SUPERSEDED: 'superseded',
    REPLACEMENT: 'replacement',
};

export function getHallOfFameWinners(entry, boardTab) {
    if (!entry) return [];
    const boardKey = getHallOfFameBoardKey(boardTab);
    let winners = [];
    if (entry.boards && Object.prototype.hasOwnProperty.call(entry.boards, boardKey)) {
        winners = entry.boards[boardKey];
    } else if (boardTab === MONTHLY_SUB_TAB.CHAMPION && entry.winners?.length) {
        winners = entry.winners;
    }
    // v8+ archives may include every eligible new player; Hall of Fame shows prize rows only.
    if (entry.boardsVersion >= 8) {
        return winners.filter((w) => isPrizeSuperseded(w) || isPrizeRecipient(w));
    }
    return winners;
}

/**
 * Standings leaders who were skipped for prize (won on a higher list) plus replacement winners.
 * Order: top standings first, then extra prize recipients not in the top standings slice.
 */
export function buildBoardDisplayList(boardId, boards, prizeWinners) {
    const ranked = boards[boardId]?.ranked || [];
    const boardPrizes = prizeWinners?.byBoard?.[boardId] || [];
    const skippedUsers = new Set(
        (prizeWinners?.skipped || [])
            .filter((s) => s.boardId === boardId)
            .map((s) => s.player.user_id)
    );
    const prizeByUser = new Map(boardPrizes.map((w) => [w.player.user_id, w]));
    const seen = new Set();
    const entries = [];

    ranked.forEach((player, idx) => {
        if (!player?.user_id || seen.has(player.user_id)) return;
        seen.add(player.user_id);
        const standingRank = idx + 1;
        const prizeEntry = prizeByUser.get(player.user_id);

        if (prizeEntry) {
            entries.push({
                player,
                standing_rank: standingRank,
                prize_rank: prizeEntry.rank,
                prize_status: PRIZE_STATUS.WINNER,
            });
        } else if (skippedUsers.has(player.user_id)) {
            entries.push({
                player,
                standing_rank: standingRank,
                prize_rank: null,
                prize_status: PRIZE_STATUS.SUPERSEDED,
            });
        } else {
            entries.push({
                player,
                standing_rank: standingRank,
                prize_rank: null,
                prize_status: null,
            });
        }
    });

    for (const prizeEntry of boardPrizes) {
        const id = prizeEntry.player.user_id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        entries.push({
            player: prizeEntry.player,
            standing_rank: null,
            prize_rank: prizeEntry.rank,
            prize_status: PRIZE_STATUS.REPLACEMENT,
        });
    }

    return entries;
}

/** Hall of Fame stores display rows: superseded leaders (gray) + actual prize winners. */
export function archiveBoardsFromEncouragement(encouragement) {
    const boards = {};
    const prizeWinners = encouragement?.prizeWinners || resolvePrizeWinners(encouragement?.boards || {});

    for (const boardId of BOARD_ORDER) {
        boards[boardId] = buildBoardDisplayList(boardId, encouragement?.boards || {}, prizeWinners).map(
            toHallDisplayEntry
        );
    }

    return boards;
}

function toHallDisplayEntry({ player, standing_rank, prize_rank, prize_status }) {
    return {
        ...player,
        standing_rank,
        prize_rank,
        prize_status,
        all_time_reading_points: player.all_time_reading_points ?? 0,
    };
}

function toHallWinner(player, rank) {
    return toHallDisplayEntry({
        player,
        standing_rank: rank,
        prize_rank: rank,
        prize_status: PRIZE_STATUS.WINNER,
    });
}

export function getMonthlyLeaderboardList(monthlyBoardTab, monthlyLeaderboard, encouragementBoards) {
    if (monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION) {
        return monthlyLeaderboard;
    }
    return encouragementBoards?.boards?.[monthlyBoardTab]?.ranked || [];
}

/** Flat list for monthly UI: standings with prize flags + replacement winners appended. */
export function getMonthlyPrizeDisplayList(monthlyBoardTab, monthlyLeaderboard, encouragementBoards) {
    let list;
    if (monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION) {
        const prizeWinners = encouragementBoards?.prizeWinners;
        const prizeIds = new Set(
            (prizeWinners?.byBoard?.[BOARD_IDS.MAIN] || []).map((w) => w.player.user_id)
        );
        list = (monthlyLeaderboard || []).map((player, idx) => {
            const standingRank = idx + 1;
            const prizeRank = prizeIds.has(player.user_id) && standingRank <= RULES.TOP_N ? standingRank : null;
            return {
                ...player,
                standing_rank: standingRank,
                prize_rank: prizeRank,
                prize_status: prizeRank ? PRIZE_STATUS.WINNER : null,
            };
        });
    } else {
        const boardId = monthlyBoardTab;
        const boards = encouragementBoards?.boards || {};
        const prizeWinners = encouragementBoards?.prizeWinners;
        list = buildBoardDisplayList(boardId, boards, prizeWinners).map(
            ({ player, standing_rank, prize_rank, prize_status }) => ({
                ...player,
                standing_rank,
                prize_rank,
                prize_status,
            })
        );
    }
    return attachMonthlyHourlyCount(list, encouragementBoards);
}

export function getMonthlyStandingsForPodium(monthlyBoardTab, monthlyLeaderboard, encouragementBoards) {
    const display = getMonthlyPrizeDisplayList(monthlyBoardTab, monthlyLeaderboard, encouragementBoards);
    if (monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION) {
        return attachMonthlyHourlyCount(monthlyLeaderboard, encouragementBoards);
    }
    return display
        .filter((item) => item.standing_rank != null)
        .sort((a, b) => a.standing_rank - b.standing_rank)
        .slice(0, RULES.TOP_N);
}

export function getMonthlyPlayerScore(item, monthlyBoardTab) {
    if (!item) return 0;
    if (monthlyBoardTab === BOARD_IDS.MOST_IMPROVED) return Number(item.improvement) || 0;
    if (monthlyBoardTab === BOARD_IDS.TOP_LEARNER) return Number(item.learner_score) || 0;
    return Number(item.points ?? item.score) || 0;
}

/** Leaderboard UI always uses Latin digits (0–9), even when language is bn. */
export function formatLeaderboardNumber(value, options = {}) {
    return Number(value ?? 0).toLocaleString('en-US', options);
}

export function formatMonthlyPlayerScore(item, monthlyBoardTab) {
    const score = getMonthlyPlayerScore(item, monthlyBoardTab);
    if (monthlyBoardTab === BOARD_IDS.MOST_IMPROVED) {
        return `+${formatLeaderboardNumber(score)}`;
    }
    return formatLeaderboardNumber(score);
}

/** Days elapsed in calendar month (including today) for display-only hourly averages. */
export function getDaysElapsedInMonth(year, month, refDate = new Date()) {
    const ref = refDate instanceof Date ? refDate : new Date(refDate);
    if (ref.getFullYear() === year && ref.getMonth() + 1 === month) {
        return Math.max(1, ref.getDate());
    }
    return new Date(year, month, 0).getDate();
}

export function getHourlyAvgPerDay(hourlyCount, year, month, refDate = new Date()) {
    const count = Number(hourlyCount) || 0;
    if (count <= 0) return null;
    const days = getDaysElapsedInMonth(year, month, refDate);
    return count / days;
}

export function formatHourlyAvgPerDay(hourlyCount, language = 'bn', year, month, refDate = new Date()) {
    const y = year ?? new Date().getFullYear();
    const m = month ?? new Date().getMonth() + 1;
    const count = Number(hourlyCount) || 0;
    if (count <= 0) return null;

    const avg = getHourlyAvgPerDay(hourlyCount, y, m, refDate);
    if (avg == null) return null;

    const rounded = Math.round(avg);
    if (rounded <= 0) {
        return language === 'bn' ? '< 1 ঘণ্টা/দিন' : '< 1 hr/day';
    }

    const formatted = formatLeaderboardNumber(rounded, { maximumFractionDigits: 0 });
    return language === 'bn' ? `${formatted} ঘণ্টা/দিন` : `${formatted} hrs/day`;
}

function resolveMonthlyHourlyCount(player, encouragementBoards) {
    if (!player) return 0;
    if (player.hourly != null) return Number(player.hourly) || 0;
    const activity = encouragementBoards?.monthlyActivity || {};
    return Number(activity[player.user_id]?.hourly) || 0;
}

export function attachMonthlyHourlyCount(players, encouragementBoards) {
    return (players || []).map((player) => ({
        ...player,
        hourly: resolveMonthlyHourlyCount(player, encouragementBoards),
    }));
}

export function getMonthlyBoardMeta(monthlyBoardTab, language, encouragementBoards) {
    const copy = getEncouragementCopy(language);
    if (monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION) {
        return {
            boardId: BOARD_IDS.MAIN,
            ...copy.boards[BOARD_IDS.MAIN],
            emptyHint: copy.emptyBoard,
        };
    }
    const boardCopy = copy.boards[monthlyBoardTab];
    const emptyHint =
        monthlyBoardTab === BOARD_IDS.MOST_IMPROVED
            ? language === 'en'
                ? 'Updates when players beat last month’s pace — usually clearer after mid-month.'
                : 'গত মাসের চেয়ে বেশি পয়েন্ট তুললে তালিকায় আসবেন।'
            : copy.emptyBoard;
    return { boardId: monthlyBoardTab, ...boardCopy, emptyHint };
}

export function normalizeMonthlyDisplayPoints(item, year, month) {
    const basePoints = Number(item.points) || 0;
    const viewReadingInMonth = Number(item.reading_points) || 0;
    const profileReading = Number(item.profiles?.reading_points) || 0;
    const joinDate = item.profiles?.created_at ? new Date(item.profiles.created_at).getTime() : 0;
    const startOfMonth = new Date(year, month - 1, 1).getTime();
    const isNewUser = joinDate >= startOfMonth;
    const readingGap = isNewUser ? Math.max(0, profileReading - viewReadingInMonth) : 0;
    return basePoints + readingGap;
}

export function mapMonthlyRow(item, year, month) {
    const points = normalizeMonthlyDisplayPoints(item, year, month);
    return {
        user_id: item.user_id,
        full_name: item.full_name,
        avatar_url: item.avatar_url,
        district: item.profiles?.district || item.district || null,
        training_level: item.training_level,
        slm_id: item.profiles?.slm_id || null,
        points,
        reading_points: Number(item.reading_points) || 0,
        quiz_points: Number(item.quiz_points) || 0,
        total_penalties: Number(item.total_penalties) || 0,
        joined_at: item.profiles?.created_at || null,
        all_time_reading_points: Number(item.profiles?.reading_points) || 0,
    };
}

/** Month runs on the IST calendar players compete in, expressed as UTC instants. */
function monthBounds(year, month) {
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`).toISOString();
    const end = new Date(`${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00+05:30`).toISOString();
    return { start, end };
}

export function aggregateActivityAttempts(rows) {
    const byUser = {};
    for (const row of rows || []) {
        const id = row.user_id;
        if (!id) continue;
        if (!byUser[id]) {
            byUser[id] = { hourly: 0, lessons: new Set(), learner_score: 0 };
        }
        const qid = String(row.quiz_id || '');
        if (qid.startsWith('hourly-challenge')) {
            byUser[id].hourly += 1;
        } else if (qid.startsWith('lesson_bonus')) {
            const lessonId = lessonIdFromCoreLessonBonusQuizId(qid) || qid;
            byUser[id].lessons.add(lessonId);
            byUser[id].learner_score += Number(row.score) || 0;
        }
    }
    return Object.fromEntries(
        Object.entries(byUser).map(([id, v]) => [
            id,
            { hourly: v.hourly, lessons: v.lessons.size, learner_score: v.learner_score },
        ])
    );
}

export function getNewPlayerCutoff(year, month) {
    const end = new Date(year, month, 0, 23, 59, 59);
    const cutoff = new Date(end);
    cutoff.setDate(cutoff.getDate() - RULES.NEW_PLAYER_DAYS);
    return cutoff;
}

export function isNewPlayerForMonth(joinedAt, year, month) {
    if (!joinedAt) return false;
    return new Date(joinedAt) >= getNewPlayerCutoff(year, month);
}

function isNewPlayer(joinedAt, year, month) {
    return isNewPlayerForMonth(joinedAt, year, month);
}

function meetsNewPlayerActivity(player, activity) {
    const a = activity[player.user_id] || {};
    return (
        player.points >= RULES.NEW_MIN_POINTS ||
        (a.hourly || 0) >= RULES.NEW_MIN_HOURLY ||
        (a.lessons || 0) >= RULES.NEW_MIN_LESSONS
    );
}

function eligibilityNote(player, activity, language) {
    const en = language === 'en';
    const a = activity[player.user_id] || {};
    const need = [];
    if (player.points < RULES.NEW_MIN_POINTS) {
        need.push(en ? `${RULES.NEW_MIN_POINTS - player.points} more pts` : `আরও ${RULES.NEW_MIN_POINTS - player.points} পয়েন্ট`);
    }
    if ((a.hourly || 0) < RULES.NEW_MIN_HOURLY) {
        need.push(en ? `${RULES.NEW_MIN_HOURLY - (a.hourly || 0)} hourlies` : `আরও ${RULES.NEW_MIN_HOURLY - (a.hourly || 0)}টি কুইজ`);
    }
    if ((a.lessons || 0) < RULES.NEW_MIN_LESSONS) {
        need.push(en ? `${RULES.NEW_MIN_LESSONS - (a.lessons || 0)} lessons` : `আরও ${RULES.NEW_MIN_LESSONS - (a.lessons || 0)}টি পাঠ`);
    }
    return need.slice(0, 2).join(en ? ' · ' : ' · ');
}

export function buildEncouragementBoards({
    currentRows = [],
    previousRows = [],
    joinerProfiles = [],
    activity = {},
    year,
    month,
    prevYear,
    prevMonth,
    language = 'bn',
}) {
    const current = currentRows.map((r) => mapMonthlyRow(r, year, month));
    const previous = previousRows.map((r) => mapMonthlyRow(r, prevYear, prevMonth));
    const prevByUser = Object.fromEntries(previous.map((p) => [p.user_id, p]));
    const currentByUser = Object.fromEntries(current.map((p) => [p.user_id, p]));

    for (const prof of joinerProfiles) {
        if (!prof?.id || currentByUser[prof.id]) continue;
        if (!isNewPlayer(prof.created_at, year, month)) continue;
        currentByUser[prof.id] = {
            user_id: prof.id,
            full_name: prof.full_name,
            avatar_url: prof.avatar_url,
            district: prof.district,
            training_level: prof.training_level,
            slm_id: prof.slm_id,
            points: 0,
            reading_points: 0,
            quiz_points: 0,
            total_penalties: 0,
            joined_at: prof.created_at,
            all_time_reading_points: Number(prof.reading_points) || 0,
        };
    }

    const allCurrent = Object.values(currentByUser).sort((a, b) => b.points - a.points);
    const mainChampion = allCurrent[0] || null;
    const prevChampion = [...previous].sort((a, b) => b.points - a.points)[0] || null;
    const championTopIds = new Set(allCurrent.slice(0, RULES.TOP_N).map((p) => p.user_id));

    const newPool = allCurrent.filter(
        (p) => isNewPlayer(p.joined_at, year, month) && !championTopIds.has(p.user_id)
    );
    const newRanked = newPool
        .map((p) => ({
            ...p,
            hourly: activity[p.user_id]?.hourly || 0,
            lessons: activity[p.user_id]?.lessons || 0,
            eligible: meetsNewPlayerActivity(p, activity),
            eligibility_note: meetsNewPlayerActivity(p, activity) ? null : eligibilityNote(p, activity, language),
        }))
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.hourly !== a.hourly) return b.hourly - a.hourly;
            if (b.reading_points !== a.reading_points) return b.reading_points - a.reading_points;
            return new Date(a.joined_at || 0) - new Date(b.joined_at || 0);
        });

    const monthStart = new Date(year, month - 1, 1);
    const improvedPool = allCurrent
        .filter((p) => {
            const joined = p.joined_at ? new Date(p.joined_at) : null;
            if (!joined || joined >= monthStart) return false;
            const prev = prevByUser[p.user_id];
            if (!prev || prev.points < RULES.IMPROVE_MIN_PREV) return false;
            if (p.points < RULES.IMPROVE_MIN_CUR) return false;
            if (prevChampion && p.user_id === prevChampion.user_id) return false;
            return true;
        })
        .map((p) => ({
            ...p,
            prev_points: prevByUser[p.user_id].points,
            improvement: p.points - prevByUser[p.user_id].points,
            hourly: activity[p.user_id]?.hourly || 0,
            eligible: p.points - prevByUser[p.user_id].points > 0,
        }))
        .filter((p) => p.eligible)
        .sort((a, b) => {
            if (b.improvement !== a.improvement) return b.improvement - a.improvement;
            if (b.points !== a.points) return b.points - a.points;
            if (b.hourly !== a.hourly) return b.hourly - a.hourly;
            return a.total_penalties - b.total_penalties;
        });

    const learnerPool = allCurrent
        .map((p) => {
            const lessonCount = activity[p.user_id]?.lessons || 0;
            const eligible = lessonCount >= RULES.LEARNER_MIN_LESSONS;
            const en = language === 'en';
            return {
                ...p,
                lesson_count: lessonCount,
                learner_score: activity[p.user_id]?.learner_score || Number(p.reading_points) || 0,
                eligible,
                eligibility_note: eligible
                    ? null
                    : lessonCount > 0
                      ? en
                          ? `${RULES.LEARNER_MIN_LESSONS - lessonCount} more lessons`
                          : `আরও ${RULES.LEARNER_MIN_LESSONS - lessonCount}টি পাঠ`
                      : null,
            };
        })
        .filter((p) => p.lesson_count > 0)
        .sort((a, b) => {
            if (b.learner_score !== a.learner_score) return b.learner_score - a.learner_score;
            if (b.lesson_count !== a.lesson_count) return b.lesson_count - a.lesson_count;
            return new Date(a.joined_at || 0) - new Date(b.joined_at || 0);
        });

    const boards = {
        [BOARD_IDS.MAIN]: {
            leader: mainChampion,
            ranked: allCurrent.slice(0, RULES.TOP_N),
            prizePool: allCurrent,
        },
        [BOARD_IDS.NEW_PLAYER]: {
            // Display every qualified (eligible) new player by name — not just the top 3.
            // Prizes are still resolved from prizePool (top 3) and the podium slices to top 3.
            ranked: newRanked.filter((p) => p.eligible),
            prizePool: newRanked,
            pool_count: newPool.length,
        },
        [BOARD_IDS.MOST_IMPROVED]: {
            ranked: improvedPool.slice(0, RULES.TOP_N),
            prizePool: improvedPool,
            opens_mid_month: true,
        },
        [BOARD_IDS.TOP_LEARNER]: {
            ranked: learnerPool.slice(0, RULES.TOP_N),
            prizePool: learnerPool,
        },
    };

    const prizeWinners = resolvePrizeWinners(boards);
    return { boards, prizeWinners, tokenWinners: prizeWinners, year, month, monthlyActivity: activity };
}

function isPrizeEligibleForBoard(boardId, player) {
    if (!player?.user_id) return false;
    if (boardId === BOARD_IDS.NEW_PLAYER || boardId === BOARD_IDS.TOP_LEARNER) {
        return !!player.eligible;
    }
    if (boardId === BOARD_IDS.MOST_IMPROVED) {
        return player.eligible !== false && (player.improvement || 0) > 0;
    }
    return true;
}

function getBoardPrizePool(boardId, boards) {
    return boards[boardId]?.prizePool || boards[boardId]?.ranked || [];
}

/**
 * Top 3 prizes per board; each user receives at most one award (higher-priority board first).
 * Walks the full prize pool and skips users already awarded on a prior list.
 */
export function resolvePrizeWinners(boards) {
    const awarded = new Set();
    const byBoard = {};
    const winners = [];
    const skipped = [];

    for (const boardId of BOARD_ORDER) {
        const pool = getBoardPrizePool(boardId, boards);
        const boardWinners = [];

        for (const player of pool) {
            if (!isPrizeEligibleForBoard(boardId, player)) continue;
            if (awarded.has(player.user_id)) {
                skipped.push({ boardId, player, reason: 'already_awarded_higher_priority' });
                continue;
            }
            awarded.add(player.user_id);
            boardWinners.push({
                boardId,
                rank: boardWinners.length + 1,
                player,
            });
            if (boardWinners.length >= RULES.TOP_N) break;
        }

        byBoard[boardId] = boardWinners;
        winners.push(...boardWinners);
    }

    return { byBoard, winners, skipped };
}

/** @deprecated Use resolvePrizeWinners */
export const resolveTokenWinners = resolvePrizeWinners;

export function getRankMedal(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
}

export function getUserBoardPrizeRank(userId, boardId, prizeWinners) {
    if (!userId || !boardId || !prizeWinners?.byBoard) return null;
    const entry = prizeWinners.byBoard[boardId]?.find((w) => w.player.user_id === userId);
    return entry?.rank ?? null;
}

export function getBoardPrizeDisplayList(boardId, encouragementData) {
    const boards = encouragementData?.boards || {};
    const prizeWinners = encouragementData?.prizeWinners || encouragementData?.tokenWinners;
    const list = buildBoardDisplayList(boardId, boards, prizeWinners);
    return list.filter((w) => isPrizeSuperseded(w) || isPrizeRecipient(w));
}

export function isPrizeSuperseded(item) {
    return item?.prize_status === PRIZE_STATUS.SUPERSEDED;
}

export function isPrizeRecipient(item) {
    if (item?.prize_rank == null || isPrizeSuperseded(item)) return false;
    if (!item.prize_status) return true;
    return item.prize_status === PRIZE_STATUS.WINNER || item.prize_status === PRIZE_STATUS.REPLACEMENT;
}

export function getTokenEmoji(boardId) {
    switch (boardId) {
        case BOARD_IDS.MAIN:
            return '🏆';
        case BOARD_IDS.NEW_PLAYER:
            return '✨';
        case BOARD_IDS.MOST_IMPROVED:
            return '📈';
        case BOARD_IDS.TOP_LEARNER:
            return '📚';
        default:
            return '🏅';
    }
}

export { monthBounds };
