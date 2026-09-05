import { cacheHelper } from './cacheHelper';
import { HOF_GALLERY_CACHE_KEY } from './hallOfFameSnapshots';

/**
 * Persistent leaderboard caches use slm_cache_* via requestManager/cacheHelper.
 * Keys must stay aligned with Competitions.jsx and leaderboardService.js.
 */
export function invalidateLeaderboardCaches(userId) {
    cacheHelper.clear('leaderboard_top_10_all_time');
    cacheHelper.clear('leaderboard_top_10_all_time_rdg');
    cacheHelper.clear('leaderboard_full_all_time');
    cacheHelper.clear('leaderboard_full_all_time_rdg');
    cacheHelper.clear('hall_of_fame_gallery_v3');
    cacheHelper.clear('hall_of_fame_gallery_v4');
    cacheHelper.clear('hall_of_fame_gallery_v5');
    cacheHelper.clear('hall_of_fame_gallery_v6');
    cacheHelper.clear('hall_of_fame_gallery_v7');
    cacheHelper.clear('hall_of_fame_gallery_v8');
    cacheHelper.clear('hall_of_fame_gallery_v9');
    cacheHelper.clear('hall_of_fame_gallery_v10');
    cacheHelper.clear('hall_of_fame_gallery_v11');
    cacheHelper.clear(HOF_GALLERY_CACHE_KEY);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    cacheHelper.clear(`monthly_daily_activity_map_${y}_${m}`);
    cacheHelper.clear(`monthly_daily_activity_obj_${y}_${m}`);
    if (userId) {
        cacheHelper.clear(`user_rank_all_time_${userId}`);
        cacheHelper.clear(`user_rank_all_time_rdg_${userId}`);
        cacheHelper.clear(`leaderboard_monthly_${y}_${m}`);
        cacheHelper.clear(`leaderboard_monthly_ist_${y}_${m}`);
        cacheHelper.clear(`leaderboard_monthly_ist_badge_${y}_${m}`);
        cacheHelper.clear(`leaderboard_encouragement_${y}_${m}_bn`);
        cacheHelper.clear(`leaderboard_encouragement_${y}_${m}_en`);
        cacheHelper.clear(`leaderboard_encouragement_ist_${y}_${m}_bn`);
        cacheHelper.clear(`leaderboard_encouragement_ist_${y}_${m}_en`);
        cacheHelper.clear(`leaderboard_encouragement_ist_badge_${y}_${m}_bn`);
        cacheHelper.clear(`leaderboard_encouragement_ist_badge_${y}_${m}_en`);
    }
}
