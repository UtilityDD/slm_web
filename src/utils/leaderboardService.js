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
                    .select('*, profiles(reading_points)')
                    .eq('month_num', m)
                    .eq('year_num', y)
                    .order('points', { ascending: false })
                    .limit(50);

                if (error) throw error;
                
                // Flatten the nested profiles data
                return data.map(item => ({
                    ...item,
                    all_time_reading_points: item.profiles?.reading_points || 0
                }));
            },
            { ttl: 5, swr: true, forceRefresh }
        );
    },

    /**
     * Fetch Hall of Fame Gallery (Last 12 months toppers)
     */
    fetchHallOfFame: async (forceRefresh = false) => {
        const cacheKey = 'hall_of_fame_gallery_v2';
        return requestManager.fetch(
            cacheKey,
            async () => {
                const now = new Date();
                const { data, error } = await supabase
                    .from('monthly_leaderboard_view')
                    .select('*, profiles(slm_id, reading_points)')
                    .order('year_num', { ascending: false })
                    .order('month_num', { ascending: false })
                    .order('points', { ascending: false });

                if (error) throw error;
                if (!data) return [];

                // Flatten and add slm_id
                const processedData = data.map(row => ({
                    ...row,
                    slm_id: row.profiles?.slm_id || null,
                    all_time_reading_points: row.profiles?.reading_points || 0
                }));

                const grouped = {};
                processedData.forEach(row => {
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
