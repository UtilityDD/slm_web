import { cacheHelper } from './cacheHelper';

/**
 * Persistent leaderboard caches use slm_cache_* via requestManager/cacheHelper.
 * Keys must stay aligned with Competitions.jsx and leaderboardService.js.
 */
export function invalidateLeaderboardCaches(userId) {
    cacheHelper.clear('leaderboard_top_10_all_time');
    cacheHelper.clear('leaderboard_full_all_time');
    cacheHelper.clear('hall_of_fame_gallery_v3');
    if (userId) {
        cacheHelper.clear(`user_rank_all_time_${userId}`);
        const now = new Date();
        cacheHelper.clear(`leaderboard_monthly_${now.getFullYear()}_${now.getMonth() + 1}`);
    }
}
