/**
 * Simple caching utility using localStorage with TTL (Time To Live)
 */

const CACHE_PREFIX = 'slm_cache_';

export const cacheHelper = {
    /**
     * Set data in cache
     * @param {string} key - Unique key for the cache
     * @param {any} data - Data to store
     * @param {number} ttlMinutes - Time to live in minutes
     */
    set: (key, data, ttlMinutes = 5) => {
        const expires = Date.now() + ttlMinutes * 60 * 1000;
        const cacheData = {
            data,
            expires
        };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
    },

    /**
     * Get data from cache
     * @param {string} key - Unique key for the cache
     * @returns {any|null} - Cached data or null if expired/not found
     */
    get: (key) => {
        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;

        try {
            const { data, expires } = JSON.parse(item);
            if (Date.now() > expires) {
                localStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }
            return data;
        } catch (e) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
    },

    /**
     * Clear specific cache
     * @param {string} key 
     */
    clear: (key) => {
        localStorage.removeItem(CACHE_PREFIX + key);
    },

    /**
     * Clear all slm_cache items
     */
    clearAll: () => {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    }
};
