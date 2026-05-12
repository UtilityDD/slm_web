import { supabase } from "../supabaseClient";
import { requestManager } from "./requestManager";

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

                return data.map(item => {
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
            },
            { ttl: 5, swr: true, forceRefresh }
        );
    },

    /**
     * Fetch Hall of Fame Gallery — only from March 2026 onwards
     */
    fetchHallOfFame: async (forceRefresh = false) => {
        const cacheKey = 'hall_of_fame_gallery_v3';
        return requestManager.fetch(
            cacheKey,
            async () => {
                const now = new Date();

                // Only fetch from March 2026 onwards
                const { data, error } = await supabase
                    .from('monthly_leaderboard_view')
                    .select('*, profiles(slm_id, reading_points, district)')
                    .or('year_num.gt.2026,and(year_num.eq.2026,month_num.gte.3)')
                    .order('year_num', { ascending: false })
                    .order('month_num', { ascending: false })
                    .order('points', { ascending: false });

                if (error) throw error;
                if (!data) return [];

                // Flatten and add slm_id
                const processedData = data.map(row => ({
                    ...row,
                    slm_id: row.profiles?.slm_id || null,
                    all_time_reading_points: row.profiles?.reading_points || 0,
                    district: row.profiles?.district || null
                }));

                const grouped = {};
                processedData.forEach(row => {
                    // Double-check: skip anything before March 2026
                    if (row.year_num < 2026) return;
                    if (row.year_num === 2026 && row.month_num < 3) return;

                    const key = `${row.year_num}-${row.month_num}`;
                    if (!grouped[key]) grouped[key] = [];
                    if (grouped[key].length < 3) {
                        grouped[key].push(row);
                    }
                });

                const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
                return Object.keys(grouped)
                    .filter(key => key !== currentMonthKey)
                    .slice(0, 12)
                    .map(key => {
                        const [y, m] = key.split('-').map(Number);
                        return {
                            month: m,
                            year: y,
                            winners: grouped[key]
                        };
                    });
            },
            { ttl: 30, swr: true, forceRefresh }
        );
    }
};

