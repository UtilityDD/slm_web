import { storageUtils } from './storageUtils';

const CACHE_PREFIX = 'slm_cache_';

export const cacheHelper = {
    /**
     * Set data in cache
     * @param {string} key - Unique key for the cache
     * @param {any} data - Data to store
     * @param {number} ttlMinutes - Time to live in minutes
     */
    set: (key, data, ttlMinutes = 5) => {
        const now = Date.now();
        const expires = now + ttlMinutes * 60 * 1000;
        const cacheData = {
            data,
            timestamp: now,
            expires
        };
        storageUtils.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
    },

    /**
     * Get data from cache
     * @param {string} key - Unique key for the cache
     * @returns {any|null} - Cached data or null if expired/not found
     */
    get: (key) => {
        const item = storageUtils.getItem(CACHE_PREFIX + key);
        if (!item) return null;

        try {
            const { data, expires } = JSON.parse(item);
            if (Date.now() > expires) {
                storageUtils.removeItem(CACHE_PREFIX + key);
                return null;
            }
            return data;
        } catch (e) {
            storageUtils.removeItem(CACHE_PREFIX + key);
            return null;
        }
    },

    /**
     * Clear specific cache
     * @param {string} key 
     */
    clear: (key) => {
        storageUtils.removeItem(CACHE_PREFIX + key);
    },

    /**
     * Clear all slm_cache items
     */
    clearAll: () => {
        // We can access localStorage key iteration directly or add a method to storageUtils
        // For iteration, direct access is acceptable if read-only, 
        // but let's stick to safe removal.
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                storageUtils.removeItem(key);
            }
        });
    }
};
