/**
 * Utility for optimizing network requests.
 * Features:
 * 1. Request Deduplication: Prevents duplicate in-flight requests for the same key.
 * 2. Stale-While-Revalidate (SWR): Returns cached data immediately while updating in background.
 * 3. Caching: Uses storageUtils/cacheHelper for persistence.
 */
import { cacheHelper } from './cacheHelper';

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

        // 1. Check Cache
        const cachedData = cacheHelper.get(key);

        // 2. SWR Strategy: If we have cache and SWR is enabled, return it immediately
        // BUT also trigger the fetch in background if Cache is "stale" or if we just want to ensure freshness.
        // For simplicity in this app:
        // - If cache exists and is valid (not expired per cacheHelper logic), we return it.
        // - requestManager adds an extra layer: if valid cache exists, we return it.
        // - If 'forceRefresh' is true, we ignore cache.

        // HOWEVER, standard cacheHelper.get() returns null if expired.
        // To implement true SWR, we might need to access expired data or just rely on the fact 
        // that we want to show *something* if possible.
        // Let's stick to a safe approach:

        if (!forceRefresh && cachedData !== null) {
            if (swr) {
                // Return cached data immediately, but trigger background refresh
                // "Fire and forget" the update, but catch errors to avoid unhandled rejections
                requestManager._deduplicatedFetch(key, fetcherFn, ttl).catch(err =>
                    console.warn(`[SWR] Background update failed for ${key}:`, err)
                );
                return cachedData;
            } else {
                // Just return cache
                return cachedData;
            }
        }

        // 3. If no cache or force refresh, fetch with deduplication
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
