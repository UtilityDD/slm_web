import { supabase } from "../supabaseClient";
import { applyCumulativeReadingToRows } from "./cumulativeReadingPoints";
import { requestManager } from "./requestManager";
import {
    aggregateActivityAttempts,
    archiveBoardsFromEncouragement,
    BOARD_IDS,
    buildEncouragementBoards,
    getNewPlayerCutoff,
    isPrizeRecipient,
    isPrizeSuperseded,
    mapMonthlyRow,
    monthBounds,
} from "./monthlyEncouragementBoards";

const HOF_START = { year: 2026, month: 3 };
const HOF_MONTHLY_SELECT =
    'user_id, full_name, avatar_url, district, training_level, points, reading_points, quiz_points, total_penalties, month_num, year_num, profiles(slm_id, reading_points, district, created_at)';
const HOF_PROFILE_SELECT =
    'id, full_name, avatar_url, district, training_level, slm_id, created_at, reading_points';
const FAT_PROFILE_SELECT = `${HOF_PROFILE_SELECT}, completed_lessons`;

const IST_OFFSET_MS = 330 * 60 * 1000;

function utcMonthStart(year, month) {
    return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * monthly_leaderboard_view groups attempts by UTC month, but players compete on the IST
 * calendar. Only these two 5.5h spans fall in different months under the two clocks, so a
 * month can be re-attributed by moving them instead of re-aggregating every attempt.
 */
function istBoundaryWindows(year, month) {
    const startUtc = utcMonthStart(year, month);
    const endUtc = utcMonthStart(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
    return {
        leading: { start: new Date(startUtc.getTime() - IST_OFFSET_MS), end: startUtc },
        trailing: { start: new Date(endUtc.getTime() - IST_OFFSET_MS), end: endUtc },
    };
}

async function fetchAttemptsBetween(start, end) {
    const pageSize = 1000;
    let offset = 0;
    const all = [];

    while (true) {
        const { data, error } = await supabase
            .from('quiz_attempts')
            .select('user_id, quiz_id, score, penalty')
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString())
            .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!data?.length) break;
        all.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
    }

    return all;
}

function accumulateIstDeltas(deltas, rows, sign) {
    for (const row of rows || []) {
        if (!row.user_id) continue;
        const score = Number(row.score) || 0;
        const penalty = Number(row.penalty) || 0;
        const entry = deltas.get(row.user_id) || { points: 0, reading_points: 0, total_penalties: 0 };
        entry.points += sign * (score - penalty);
        entry.total_penalties += sign * penalty;
        if (String(row.quiz_id || '').startsWith('lesson_bonus')) {
            entry.reading_points += sign * score;
        }
        deltas.set(row.user_id, entry);
    }
}

/** Per-user corrections that turn a UTC-bucketed month row into an IST month row. */
async function fetchIstMonthDeltas(year, month) {
    try {
        const { leading, trailing } = istBoundaryWindows(year, month);
        const [leadingRows, trailingRows] = await Promise.all([
            fetchAttemptsBetween(leading.start, leading.end),
            fetchAttemptsBetween(trailing.start, trailing.end),
        ]);

        const deltas = new Map();
        accumulateIstDeltas(deltas, leadingRows, 1);
        accumulateIstDeltas(deltas, trailingRows, -1);

        for (const [userId, delta] of deltas) {
            if (delta.points === 0 && delta.reading_points === 0 && delta.total_penalties === 0) {
                deltas.delete(userId);
            }
        }
        return deltas;
    } catch (err) {
        console.warn('[leaderboard] IST month correction failed:', err?.message || err);
        return new Map();
    }
}

async function fetchProfilesForIds(userIds, select = FAT_PROFILE_SELECT) {
    const unique = [...new Set((userIds || []).filter(Boolean))];
    if (unique.length === 0) return {};

    const byId = {};
    const chunkSize = 80;

    for (let i = 0; i < unique.length; i += chunkSize) {
        const { data, error } = await supabase
            .from('profiles')
            .select(select)
            .in('id', unique.slice(i, i + chunkSize));

        if (error) {
            console.warn('[leaderboard] profile lookup failed:', error.message);
            continue;
        }
        for (const row of data || []) byId[row.id] = row;
    }

    return byId;
}

/** Players whose only attempts sit inside a boundary window have no view row for the month. */
function buildBoundaryOnlyRow(userId, delta, profile) {
    return {
        user_id: userId,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url ?? null,
        district: profile.district ?? null,
        training_level: profile.training_level ?? 0,
        completed_lessons: profile.completed_lessons || [],
        points: delta.points,
        reading_points: delta.reading_points,
        quiz_points: delta.points - delta.reading_points,
        total_penalties: delta.total_penalties,
        profiles: {
            reading_points: profile.reading_points ?? 0,
            district: profile.district ?? null,
            created_at: profile.created_at ?? null,
            slm_id: profile.slm_id ?? null,
            completed_lessons: profile.completed_lessons || [],
        },
    };
}

function applyIstDeltasToRows(rows, deltas, profileById = {}) {
    if (!deltas || deltas.size === 0) return rows || [];

    const adjusted = (rows || []).map((row) => {
        const delta = deltas.get(row.user_id);
        if (!delta) return row;

        const points = (Number(row.points) || 0) + delta.points;
        const readingPoints = (Number(row.reading_points) || 0) + delta.reading_points;
        return {
            ...row,
            points,
            reading_points: readingPoints,
            quiz_points: points - readingPoints,
            total_penalties: (Number(row.total_penalties) || 0) + delta.total_penalties,
        };
    });

    const present = new Set(adjusted.map((row) => row.user_id));
    for (const [userId, delta] of deltas) {
        if (present.has(userId)) continue;
        const profile = profileById[userId];
        if (!profile) continue;
        adjusted.push(buildBoundaryOnlyRow(userId, delta, profile));
    }

    return adjusted
        .filter((row) => (Number(row.points) || 0) !== 0 || (Number(row.total_penalties) || 0) !== 0)
        .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
}

async function fetchReadingAttemptsByUserIds(userIds) {
    const unique = [...new Set((userIds || []).filter(Boolean))];
    const byUser = new Map();
    const chunkSize = 80;

    for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize);
        let offset = 0;
        while (true) {
            const { data, error } = await supabase
                .from('quiz_attempts')
                .select('user_id, quiz_id, score')
                .in('user_id', chunk)
                .or('quiz_id.like.lesson_bonus%,quiz_id.like.life_skill_bonus%')
                .range(offset, offset + 999);

            if (error) throw error;
            for (const row of data || []) {
                if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
                byUser.get(row.user_id).push(row);
            }
            if (!data || data.length < 1000) break;
            offset += 1000;
        }
    }

    return byUser;
}

/** All-time RDG from the attempt ledger; does not write profiles. */
export async function overlayCumulativeReading(rows) {
    if (!rows?.length) return rows || [];
    try {
        const attemptsByUser = await fetchReadingAttemptsByUserIds(
            rows.map((row) => row.user_id || row.id)
        );
        return applyCumulativeReadingToRows(rows, attemptsByUser);
    } catch (err) {
        console.warn('[leaderboard] cumulative reading overlay failed:', err?.message || err);
        return rows;
    }
}

function missingDeltaUserIds(rows, deltas) {
    const present = new Set((rows || []).map((row) => row.user_id));
    return [...deltas.keys()].filter((userId) => !present.has(userId));
}

/** Paginate quiz_attempts — PostgREST defaults to 1000 rows max per request. */
async function fetchMonthlyActivityAttempts(start, end) {
    const pageSize = 1000;
    let offset = 0;
    const all = [];

    while (true) {
        const { data, error } = await supabase
            .from('quiz_attempts')
            .select('user_id, quiz_id, score')
            .gte('created_at', start)
            .lt('created_at', end)
            .or('quiz_id.like.hourly-challenge-%,quiz_id.like.lesson_bonus%')
            .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!data?.length) break;
        all.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
    }

    return all;
}

function hallOfFamePastMonths(now = new Date()) {
    const currentY = now.getFullYear();
    const currentM = now.getMonth() + 1;
    const months = [];
    let year = HOF_START.year;
    let month = HOF_START.month;
    while (year < currentY || (year === currentY && month < currentM)) {
        months.push({ year, month });
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    return months.slice(-12);
}

function prevMonthOf(year, month) {
    if (month === 1) return { year: year - 1, month: 12 };
    return { year, month: month - 1 };
}

function isHofMonth(year, month) {
    return year > HOF_START.year || (year === HOF_START.year && month >= HOF_START.month);
}

async function fetchHofMonthView(year, month) {
    const { data, error } = await supabase
        .from('monthly_leaderboard_view')
        .select(HOF_MONTHLY_SELECT)
        .eq('year_num', year)
        .eq('month_num', month)
        .order('points', { ascending: false })
        .limit(100);
    if (error) throw error;
    return data || [];
}

/** Hourly / lesson activity for one month, limited to users already on that month's board. */
async function fetchMonthActivityForUsers(start, end, userIds) {
    const unique = [...new Set((userIds || []).filter(Boolean))];
    if (unique.length === 0) return [];

    const pageSize = 1000;
    const chunkSize = 80;
    const all = [];

    for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize);
        let offset = 0;
        while (true) {
            const { data, error } = await supabase
                .from('quiz_attempts')
                .select('user_id, quiz_id, score')
                .in('user_id', chunk)
                .gte('created_at', start)
                .lt('created_at', end)
                .or('quiz_id.like.hourly-challenge-%,quiz_id.like.lesson_bonus%')
                .range(offset, offset + pageSize - 1);

            if (error) throw error;
            if (!data?.length) break;
            all.push(...data);
            if (data.length < pageSize) break;
            offset += pageSize;
        }
    }

    return all;
}

function slimArchiveBoards(boards) {
    return Object.fromEntries(
        Object.entries(boards || {}).map(([boardId, rows]) => [
            boardId,
            (rows || []).filter((row) => isPrizeRecipient(row) || isPrizeSuperseded(row)),
        ])
    );
}

/** Same fields / resolution order as all-time leaderboard rows from leaderboard_view. */
async function fetchLeaderboardActivityByUserIds(userIds) {
    const unique = [...new Set((userIds || []).filter(Boolean))];
    if (unique.length === 0) return {};

    const map = {};
    const chunkSize = 80;

    try {
        for (let i = 0; i < unique.length; i += chunkSize) {
            const chunk = unique.slice(i, i + chunkSize);
            const { data, error } = await supabase
                .from('leaderboard_view')
                .select('*')
                .in('user_id', chunk);

            if (error) {
                console.warn('[leaderboard] activity lookup failed:', error.message);
                continue;
            }

            for (const row of data || []) {
                if (!row?.user_id) continue;
                map[row.user_id] = {
                    last_active: row.last_active || null,
                    last_login_at: row.last_login_at || null,
                };
            }
        }
    } catch (err) {
        console.warn('[leaderboard] activity lookup failed:', err);
    }

    return map;
}

function applyLeaderboardActivity(row, activityByUser) {
    if (!row?.user_id) return row;
    const activity = activityByUser[row.user_id];
    if (!activity) return row;
    return {
        ...row,
        last_active: activity.last_active,
        last_login_at: activity.last_login_at,
    };
}

function applyLeaderboardActivityToRows(rows, activityByUser) {
    return (rows || []).map((row) => applyLeaderboardActivity(row, activityByUser));
}

function collectEncouragementUserIds(encouragement) {
    const ids = new Set();
    for (const board of Object.values(encouragement?.boards || {})) {
        if (board?.leader?.user_id) ids.add(board.leader.user_id);
        for (const player of board?.ranked || []) {
            if (player?.user_id) ids.add(player.user_id);
        }
        for (const player of board?.prizePool || []) {
            if (player?.user_id) ids.add(player.user_id);
        }
    }
    for (const winner of encouragement?.prizeWinners?.winners || []) {
        if (winner?.player?.user_id) ids.add(winner.player.user_id);
    }
    return [...ids];
}

function enrichEncouragementWithActivity(encouragement, activityByUser) {
    if (!encouragement || !activityByUser || Object.keys(activityByUser).length === 0) {
        return encouragement;
    }

    const enrichPlayer = (player) => (player ? applyLeaderboardActivity(player, activityByUser) : player);

    const boards = Object.fromEntries(
        Object.entries(encouragement.boards || {}).map(([boardId, board]) => [
            boardId,
            {
                ...board,
                leader: board?.leader ? enrichPlayer(board.leader) : board?.leader,
                ranked: (board?.ranked || []).map(enrichPlayer),
                prizePool: (board?.prizePool || []).map(enrichPlayer),
            },
        ])
    );

    const prizeWinners = encouragement.prizeWinners
        ? {
              ...encouragement.prizeWinners,
              winners: (encouragement.prizeWinners.winners || []).map((winner) => ({
                  ...winner,
                  player: enrichPlayer(winner?.player),
              })),
              byBoard: Object.fromEntries(
                  Object.entries(encouragement.prizeWinners.byBoard || {}).map(([boardId, winners]) => [
                      boardId,
                      (winners || []).map((winner) => ({
                          ...winner,
                          player: enrichPlayer(winner?.player),
                      })),
                  ])
              ),
          }
        : encouragement.prizeWinners;

    return {
        ...encouragement,
        boards,
        prizeWinners,
        tokenWinners: prizeWinners,
    };
}

/**
 * Service to handle leaderboard data fetching with caching
 */
export const leaderboardService = {
    /**
     * Fetch All-Time Top 50 Leaderboard
     */
    fetchAllTime: async (forceRefresh = false) => {
        const cacheKey = 'leaderboard_full_all_time_rdg';
        return requestManager.fetch(
            cacheKey,
            async () => {
                const { data, error } = await supabase
                    .from('leaderboard_view')
                    .select('*')
                    .order('score', { ascending: false })
                    .limit(50);

                if (error) throw error;
                const mapped = (data || []).map(item => ({
                    ...item,
                    points: item.score ?? 0,
                    reading_points: item.reading_points ?? 0
                }));
                return overlayCumulativeReading(mapped);
            },
            { ttl: 5, swr: true, forceRefresh }
        );
    },

    /**
     * Fetch Monthly Leaderboard for current month
     * DB now has proper lesson_bonus_ entries from backfill — view calculates correctly.
     */
    fetchMonthly: async (forceRefresh = false) => {
        const now = new Date();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        const cacheKey = `leaderboard_monthly_ist_badge_${y}_${m}`;

        return requestManager.fetch(
            cacheKey,
            async () => {
                const [viewRes, deltas] = await Promise.all([
                    supabase
                        .from('monthly_leaderboard_view')
                        .select('*, profiles(reading_points, district, created_at, completed_lessons)')
                        .eq('month_num', m)
                        .eq('year_num', y)
                        .order('points', { ascending: false })
                        .limit(100),
                    fetchIstMonthDeltas(y, m),
                ]);

                if (viewRes.error) throw viewRes.error;

                const profileById = await fetchProfilesForIds(missingDeltaUserIds(viewRes.data, deltas));
                const data = applyIstDeltasToRows(viewRes.data, deltas, profileById).slice(0, 50);

                // Process data for display. The view buckets by UTC month on created_at, so the
                // deltas above re-attribute the IST boundary hours; lesson_bonus rows can still land
                // in an adjacent month, leaving points under-counted while profiles.reading_points is correct.
                const startOfMonth = new Date(y, m - 1, 1).getTime();

                const rows = data.map(item => {
                    const basePoints = Number(item.points) || 0;
                    const viewReadingInMonth = Number(item.reading_points) || 0;
                    const profileReading = Number(item.profiles?.reading_points) || 0;
                    const joinDate = item.profiles?.created_at ? new Date(item.profiles.created_at).getTime() : 0;

                    const isNewUser = joinDate >= startOfMonth;
                    // Only for users who joined this calendar month: add reading that exists on the
                    // profile but is not already counted in this view row's monthly lesson_bonus sum.
                    const readingGap = isNewUser ? Math.max(0, profileReading - viewReadingInMonth) : 0;
                    const displayPoints = basePoints + readingGap;

                    return {
                        ...item,
                        points: displayPoints,
                        reading_points_added: readingGap,
                        all_time_reading_points: profileReading,
                        district: item.profiles?.district || null,
                        completed_lessons: item.completed_lessons || item.profiles?.completed_lessons || [],
                        is_new_user: isNewUser
                    };
                }).sort((a, b) => b.points - a.points);

                const activityByUser = await fetchLeaderboardActivityByUserIds(rows.map((row) => row.user_id));
                return applyLeaderboardActivityToRows(rows, activityByUser);
            },
            { ttl: 5, swr: true, forceRefresh }
        );
    },

    /**
     * Fetch Hall of Fame Gallery — past months from March 2026, prize rows only.
     * Per-month views (max 100, no completed_lessons) instead of one unbounded
     * dump of every monthly row + every attempt since March.
     */
    fetchHallOfFame: async (forceRefresh = false) => {
        const cacheKey = 'hall_of_fame_gallery_v11';
        return requestManager.fetch(
            cacheKey,
            async () => {
                const pastMonths = hallOfFamePastMonths();
                if (pastMonths.length === 0) return [];

                const monthKeysToFetch = new Set();
                for (const { year, month } of pastMonths) {
                    monthKeysToFetch.add(`${year}-${month}`);
                    const prev = prevMonthOf(year, month);
                    if (isHofMonth(prev.year, prev.month)) {
                        monthKeysToFetch.add(`${prev.year}-${prev.month}`);
                    }
                }

                const monthList = [...monthKeysToFetch].map((key) => {
                    const [year, month] = key.split('-').map(Number);
                    return { key, year, month };
                });

                const loaded = await Promise.all(
                    monthList.map(async ({ key, year, month }) => {
                        const [rows, deltas] = await Promise.all([
                            fetchHofMonthView(year, month),
                            fetchIstMonthDeltas(year, month),
                        ]);
                        return { key, year, month, rows, deltas };
                    })
                );

                const missingIds = loaded.flatMap(({ rows, deltas }) =>
                    missingDeltaUserIds(rows, deltas)
                );
                const profileById = await fetchProfilesForIds(missingIds, HOF_PROFILE_SELECT);

                const oldest = pastMonths[0];
                const joinerCutoff = getNewPlayerCutoff(oldest.year, oldest.month);
                const { data: joinerProfiles, error: joinersError } = await supabase
                    .from('profiles')
                    .select(HOF_PROFILE_SELECT)
                    .gte('created_at', joinerCutoff.toISOString());
                if (joinersError) throw joinersError;

                const byMonth = {};
                for (const { key, year, month, rows, deltas } of loaded) {
                    byMonth[key] = applyIstDeltasToRows(rows, deltas, profileById).sort(
                        (a, b) => mapMonthlyRow(b, year, month).points - mapMonthlyRow(a, year, month).points
                    );
                }

                const pastActivity = await Promise.all(
                    pastMonths.map(async ({ year, month }) => {
                        const { start, end } = monthBounds(year, month);
                        const key = `${year}-${month}`;
                        const userIds = (byMonth[key] || []).map((row) => row.user_id);
                        const rows = await fetchMonthActivityForUsers(start, end, userIds);
                        return [key, aggregateActivityAttempts(rows)];
                    })
                );
                const activityByMonth = Object.fromEntries(pastActivity);

                return pastMonths
                    .slice()
                    .reverse()
                    .map(({ year, month }) => {
                        const key = `${year}-${month}`;
                        const prev = prevMonthOf(year, month);
                        const prevKey = `${prev.year}-${prev.month}`;
                        const cutoff = getNewPlayerCutoff(year, month);

                        const encouragement = buildEncouragementBoards({
                            currentRows: byMonth[key] || [],
                            previousRows: byMonth[prevKey] || [],
                            joinerProfiles: (joinerProfiles || []).filter(
                                (profile) => profile.created_at && new Date(profile.created_at) >= cutoff
                            ),
                            activity: activityByMonth[key] || {},
                            year,
                            month,
                            prevYear: prev.year,
                            prevMonth: prev.month,
                            language: 'bn',
                        });

                        const boards = slimArchiveBoards(archiveBoardsFromEncouragement(encouragement));
                        const championWinners = (boards[BOARD_IDS.MAIN] || []).map((winner) => ({
                            ...winner,
                            points: winner.points ?? 0,
                        }));

                        return {
                            month,
                            year,
                            boards,
                            boardsVersion: 11,
                            prizeWinners: encouragement.prizeWinners,
                            winners: championWinners,
                        };
                    });
            },
            { ttl: 30, swr: true, forceRefresh }
        );
    },

    /**
     * Encouragement boards for the current month (new player, most improved, top learner)
     * with top-3 prize positions per board.
     */
    fetchEncouragementBoards: async (forceRefresh = false, language = 'bn') => {
        const now = new Date();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        const prevM = m === 1 ? 12 : m - 1;
        const prevY = m === 1 ? y - 1 : y;
        const cacheKey = `leaderboard_encouragement_ist_badge_${y}_${m}_${language}`;

        return requestManager.fetch(
            cacheKey,
            async () => {
                const cutoff = getNewPlayerCutoff(y, m);
                const { start, end } = monthBounds(y, m);

                const [currentRes, prevRes, joinersRes, activityRows, currentDeltas, prevDeltas] = await Promise.all([
                    supabase
                        .from('monthly_leaderboard_view')
                        .select('*, profiles(reading_points, district, created_at, slm_id, completed_lessons)')
                        .eq('month_num', m)
                        .eq('year_num', y)
                        .order('points', { ascending: false })
                        .limit(100),
                    supabase
                        .from('monthly_leaderboard_view')
                        .select('*, profiles(reading_points, district, created_at, slm_id, completed_lessons)')
                        .eq('month_num', prevM)
                        .eq('year_num', prevY)
                        .order('points', { ascending: false })
                        .limit(100),
                    supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, district, training_level, slm_id, created_at, reading_points, completed_lessons')
                        .gte('created_at', cutoff.toISOString()),
                    fetchMonthlyActivityAttempts(start, end),
                    fetchIstMonthDeltas(y, m),
                    fetchIstMonthDeltas(prevY, prevM),
                ]);

                if (currentRes.error) throw currentRes.error;
                if (prevRes.error) throw prevRes.error;
                if (joinersRes.error) throw joinersRes.error;

                const activity = aggregateActivityAttempts(activityRows);

                const boundaryProfiles = await fetchProfilesForIds([
                    ...missingDeltaUserIds(currentRes.data, currentDeltas),
                    ...missingDeltaUserIds(prevRes.data, prevDeltas),
                ]);

                const encouragement = buildEncouragementBoards({
                    currentRows: applyIstDeltasToRows(currentRes.data, currentDeltas, boundaryProfiles),
                    previousRows: applyIstDeltasToRows(prevRes.data, prevDeltas, boundaryProfiles),
                    joinerProfiles: joinersRes.data || [],
                    activity,
                    year: y,
                    month: m,
                    prevYear: prevY,
                    prevMonth: prevM,
                    language,
                });

                const activityByUser = await fetchLeaderboardActivityByUserIds(
                    collectEncouragementUserIds(encouragement)
                );
                return enrichEncouragementWithActivity(encouragement, activityByUser);
            },
            { ttl: 5, swr: true, forceRefresh }
        );
    },
};

