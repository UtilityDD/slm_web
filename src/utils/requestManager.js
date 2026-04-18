/**
 * Utility for optimizing network requests.
 * Features:
 * 1. Request Deduplication: Prevents duplicate in-flight requests for the same key.
 * 2. Stale-While-Revalidate (SWR): Returns cached data immediately while updating in background.
 * 3. Caching: Uses storageUtils/cacheHelper for persistence.
 */
import { cacheHelper } from './cacheHelper';
import { storageUtils } from './storageUtils';

const activeRequests = new Map();

export const requestManager = {
    /**
     * Fetch with optimization options.
     * @param {string} key - Unique key for the request (e.g., 'profile_user_123', 'leaderboard_top_10')
     * @param {Function} fetcherFn - Async function that returns the data
     * @param {Object} options - { ttl: number (minutes), forceRefresh: boolean, swr: boolean }
     * @returns {Promise<any>}
     */
    fetch: async (key, fetcherFn, options = { ttl: 5, forceRefresh: false, swr: true }) => {
        const { ttl = 5, forceRefresh = false, swr = true } = options;

        // 1. Check Cache Metadata
        const cachedItem = storageUtils.getItem('slm_cache_' + key);
        let cachedData = null;
        let isFresh = false;

        if (cachedItem) {
            try {
                const { data, timestamp, expires } = JSON.parse(cachedItem);
                const now = Date.now();
                
                // Is the cache strictly valid (not expired)?
                if (now < expires) {
                    cachedData = data;
                    
                    // Is it "Fresh" enough to skip background update? (30 second threshold)
                    const ageInSeconds = (now - (timestamp || 0)) / 1000;
                    if (ageInSeconds < 30) {
                        isFresh = true;
                    }
                }
            } catch (e) {
                storageUtils.removeItem('slm_cache_' + key);
            }
        }

        // 2. Return immediately if Fresh or if Cache exists without Force Refresh
        if (!forceRefresh && cachedData !== null) {
            if (swr && !isFresh) {
                // Return cached data immediately, but trigger background refresh ONLY if not Fresh
                requestManager._deduplicatedFetch(key, fetcherFn, ttl).catch(err =>
                    console.warn(`[SWR] Background update failed for ${key}:`, err)
                );
            }
            return cachedData;
        }

        // 3. If no cache, force refresh, or cache is missing, fetch with deduplication
        return requestManager._deduplicatedFetch(key, fetcherFn, ttl);
    },

    /**
     * Internal: Handles in-flight request deduplication.
     */
    _deduplicatedFetch: async (key, fetcherFn, ttl) => {
        if (activeRequests.has(key)) {
            // Return existing promise
            // console.log(`[RequestManager] Deduplicated request for: ${key}`);
            return activeRequests.get(key);
        }

        // Create new promise
        const promise = fetcherFn()
            .then(data => {
                // Save to cache
                if (data !== null && data !== undefined) {
                    cacheHelper.set(key, data, ttl);
                }
                return data;
            })
            .finally(() => {
                // Cleanup active request
                activeRequests.delete(key);
            });

        activeRequests.set(key, promise);
        return promise;
    }
};
