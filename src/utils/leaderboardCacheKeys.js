import { cacheHelper } from './cacheHelper';

/**
 * Persistent leaderboard caches use slm_cache_* via requestManager/cacheHelper.
 * Keys must stay aligned with Competitions.jsx and leaderboardService.js.
 */
export function invalidateLeaderboardCaches(userId) {
    cacheHelper.clear('leaderboard_top_10_all_time');
    cacheHelper.clear('leaderboard_full_all_time');
    cacheHelper.clear('hall_of_fame_gallery_v3');
    cacheHelper.clear('hall_of_fame_gallery_v4');
    cacheHelper.clear('hall_of_fame_gallery_v5');
    cacheHelper.clear('hall_of_fame_gallery_v6');
    cacheHelper.clear('hall_of_fame_gallery_v7');
    cacheHelper.clear('hall_of_fame_gallery_v8');
    if (userId) {
        cacheHelper.clear(`user_rank_all_time_${userId}`);
        const now = new Date();
        cacheHelper.clear(`leaderboard_monthly_${now.getFullYear()}_${now.getMonth() + 1}`);
        cacheHelper.clear(`leaderboard_encouragement_${now.getFullYear()}_${now.getMonth() + 1}_bn`);
        cacheHelper.clear(`leaderboard_encouragement_${now.getFullYear()}_${now.getMonth() + 1}_en`);
    }
}
