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

                // Process data to include metadata for display only.
                // monthly_leaderboard_view.points should be treated as authoritative monthly score.
                const startOfMonth = new Date(y, m - 1, 1).getTime();

                return data.map(item => {
                    const basePoints = Number(item.points) || 0;
                    const readingPoints = Number(item.profiles?.reading_points) || 0;
                    const joinDate = item.profiles?.created_at ? new Date(item.profiles.created_at).getTime() : 0;

                    // If user joined this month, all their reading points are from this month
                    // (Double check to prevent double adding if view already handled it)
                    const isNewUser = joinDate >= startOfMonth;
                    
                    return {
                        ...item,
                        points: basePoints,
                        reading_points_added: isNewUser ? readingPoints : 0,
                        all_time_reading_points: readingPoints,
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

