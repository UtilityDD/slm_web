/**
 * Utility for safe localStorage interaction with quota management.
 * Handles QuotaExceededError by clearing old cache items.
 */
import { cacheHelper } from './cacheHelper';

export const storageUtils = {
    /**
     * Safe localStorage.setItem wrapper
     * @param {string} key 
     * @param {string} value 
     * @returns {boolean} true if successful, false if failed
     */
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn('LocalStorage Quota Exceeded. Attempting to clear space...');

                // Strategy 1: Clear expired/old cache items
                try {
                    // Attempt to clear all cache managed by cacheHelper first
                    // We need to import cacheHelper carefully to avoid circular dependency issues if possible,
                    // but since cacheHelper uses this, we might need a simpler cleanup strategy here 
                    // or ensure cacheHelper doesn't import this directly for its internal clear methods.
                    // For now, let's manually clear keys starting with slm_cache_

                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('slm_cache_')) {
                            keysToRemove.push(k);
                        }
                    }

                    // Remove all cache items to make space for critical data
                    keysToRemove.forEach(k => localStorage.removeItem(k));

                    // Try setting again
                    try {
                        localStorage.setItem(key, value);
                        console.log('Space cleared, item saved successfully.');
                        return true;
                    } catch (retryError) {
                        console.error('Still unable to save item after clearing cache.', retryError);
                        return false;
                    }

                } catch (cleanupError) {
                    console.error('Error during storage cleanup:', cleanupError);
                    return false;
                }
            } else {
                console.error('Error saving to localStorage:', e);
                return false;
            }
        }
    },

    /**
     * Safe localStorage.getItem wrapper
     * @param {string} key 
     * @returns {string|null}
     */
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    },

    /**
     * Safe localStorage.removeItem wrapper
     * @param {string} key 
     */
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Error removing from localStorage:', e);
        }
    },

    /**
     * Clear all items
     */
    clear: () => {
        try {
            localStorage.clear();
        } catch (e) {
            console.error('Error clearing localStorage:', e);
        }
    }
};
