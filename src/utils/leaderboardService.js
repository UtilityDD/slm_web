import { supabase } from "../supabaseClient";
import { requestManager } from "./requestManager";
import {
    aggregateActivityAttempts,
    archiveBoardsFromEncouragement,
    BOARD_IDS,
    buildEncouragementBoards,
    getNewPlayerCutoff,
    mapMonthlyRow,
    monthBounds,
} from "./monthlyEncouragementBoards";

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
        const cacheKey = 'leaderboard_full_all_time';
        return requestManager.fetch(
            cacheKey,
            async () => {
                const { data, error } = await supabase
                    .from('leaderboard_view')
                    .select('*')
                    .order('score', { ascending: false })
                    .limit(50);

                if (error) throw error;
                return data.map(item => ({
                    ...item,
                    points: item.score ?? 0,
                    reading_points: item.reading_points ?? 0
                }));
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
        const cacheKey = `leaderboard_monthly_${y}_${m}`;

        return requestManager.fetch(
            cacheKey,
            async () => {
                const { data, error } = await supabase
                    .from('monthly_leaderboard_view')
                    .select('*, profiles(reading_points, district, created_at)')
                    .eq('month_num', m)
                    .eq('year_num', y)
                    .order('points', { ascending: false })
                    .limit(50);

                if (error) throw error;

                // Process data for display. DB view buckets by server/session month on created_at;
                // lesson_bonus rows can land in an adjacent month vs the client's local "this month"
                // filter, so points can under-count reading while profiles.reading_points is correct.
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
     * Fetch Hall of Fame Gallery — past months from March 2026, all board types (top 3 each).
     */
    fetchHallOfFame: async (forceRefresh = false) => {
        const cacheKey = 'hall_of_fame_gallery_v8';
        return requestManager.fetch(
            cacheKey,
            async () => {
                const now = new Date();
                const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

                const monthlyQuery = supabase
                    .from('monthly_leaderboard_view')
                    .select('*, profiles(slm_id, reading_points, district, created_at)')
                    .or('year_num.gt.2026,and(year_num.eq.2026,month_num.gte.3)')
                    .order('year_num', { ascending: false })
                    .order('month_num', { ascending: false })
                    .order('points', { ascending: false });

                const [monthlyRes, activityRes] = await Promise.all([
                    monthlyQuery,
                    supabase
                        .from('quiz_attempts')
                        .select('user_id, quiz_id, score, created_at')
                        .gte('created_at', '2026-03-01T00:00:00')
                        .or('quiz_id.like.hourly-challenge-%,quiz_id.like.lesson_bonus%'),
                ]);

                if (monthlyRes.error) throw monthlyRes.error;
                if (activityRes.error) throw activityRes.error;

                const monthlyRows = monthlyRes.data || [];
                const userIds = [...new Set(monthlyRows.map((r) => r.user_id).filter(Boolean))];
                let profileRows = [];
                if (userIds.length > 0) {
                    const { data: profilesData, error: profilesError } = await supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, district, training_level, slm_id, created_at, reading_points')
                        .in('id', userIds);
                    if (profilesError) throw profilesError;
                    profileRows = profilesData || [];
                }

                const profileById = Object.fromEntries(profileRows.map((p) => [p.id, p]));
                const enrichRow = (row) => {
                    const prof = profileById[row.user_id];
                    return {
                        ...row,
                        profiles: {
                            ...(row.profiles || {}),
                            created_at: row.profiles?.created_at || prof?.created_at || null,
                            slm_id: row.profiles?.slm_id || prof?.slm_id || null,
                            reading_points: row.profiles?.reading_points ?? prof?.reading_points ?? 0,
                            district: row.profiles?.district || prof?.district || null,
                        },
                    };
                };

                const byMonth = {};
                for (const row of monthlyRows.map(enrichRow)) {
                    if (row.year_num < 2026) continue;
                    if (row.year_num === 2026 && row.month_num < 3) continue;
                    const key = `${row.year_num}-${row.month_num}`;
                    if (!byMonth[key]) byMonth[key] = [];
                    byMonth[key].push(row);
                }
                for (const key of Object.keys(byMonth)) {
                    const [y, m] = key.split('-').map(Number);
                    byMonth[key].sort(
                        (a, b) => mapMonthlyRow(b, y, m).points - mapMonthlyRow(a, y, m).points
                    );
                }

                const activityByMonth = {};
                for (const row of activityRes.data || []) {
                    const d = new Date(row.created_at);
                    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
                    if (!activityByMonth[key]) activityByMonth[key] = [];
                    activityByMonth[key].push(row);
                }

                const monthKeys = Object.keys(byMonth)
                    .filter((key) => key !== currentMonthKey)
                    .sort((a, b) => b.localeCompare(a))
                    .slice(0, 12);

                return monthKeys.map((key) => {
                    const [y, m] = key.split('-').map(Number);
                    const prevM = m === 1 ? 12 : m - 1;
                    const prevY = m === 1 ? y - 1 : y;
                    const prevKey = `${prevY}-${prevM}`;
                    const cutoff = getNewPlayerCutoff(y, m);

                    const encouragement = buildEncouragementBoards({
                        currentRows: byMonth[key] || [],
                        previousRows: (byMonth[prevKey] || []).map(enrichRow),
                        joinerProfiles: profileRows.filter(
                            (p) => p.created_at && new Date(p.created_at) >= cutoff
                        ),
                        activity: aggregateActivityAttempts(activityByMonth[key] || []),
                        year: y,
                        month: m,
                        prevYear: prevY,
                        prevMonth: prevM,
                        language: 'bn',
                    });

                    const boards = archiveBoardsFromEncouragement(encouragement);
                    const championWinners = boards[BOARD_IDS.MAIN].map((w) => ({
                        ...w,
                        points: w.points ?? 0,
                    }));

                    return {
                        month: m,
                        year: y,
                        boards,
                        boardsVersion: 8,
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
        const cacheKey = `leaderboard_encouragement_${y}_${m}_${language}`;

        return requestManager.fetch(
            cacheKey,
            async () => {
                const cutoff = getNewPlayerCutoff(y, m);
                const { start, end } = monthBounds(y, m);

                const [currentRes, prevRes, joinersRes, activityRows] = await Promise.all([
                    supabase
                        .from('monthly_leaderboard_view')
                        .select('*, profiles(reading_points, district, created_at, slm_id)')
                        .eq('month_num', m)
                        .eq('year_num', y)
                        .order('points', { ascending: false })
                        .limit(100),
                    supabase
                        .from('monthly_leaderboard_view')
                        .select('*, profiles(reading_points, district, created_at, slm_id)')
                        .eq('month_num', prevM)
                        .eq('year_num', prevY)
                        .order('points', { ascending: false })
                        .limit(100),
                    supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, district, training_level, slm_id, created_at, reading_points')
                        .gte('created_at', cutoff.toISOString()),
                    fetchMonthlyActivityAttempts(start, end),
                ]);

                if (currentRes.error) throw currentRes.error;
                if (prevRes.error) throw prevRes.error;
                if (joinersRes.error) throw joinersRes.error;

                const activity = aggregateActivityAttempts(activityRows);

                const encouragement = buildEncouragementBoards({
                    currentRows: currentRes.data || [],
                    previousRows: prevRes.data || [],
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

