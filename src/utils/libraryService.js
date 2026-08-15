import { SAFETY_LIBRARY_ITEMS } from '../data/safetyLibraryItems';
import { storageUtils } from './storageUtils';

const LEGACY_SHEET_CACHE_KEY = 'slm_cache_safety_library_v5';

function clearLegacySheetCache() {
    try {
        storageUtils.removeItem(LEGACY_SHEET_CACHE_KEY);
    } catch {
        /* ignore */
    }
}

export const libraryService = {
    /**
     * In-app Safety Library catalog. No live Google Sheet fetch.
     */
    fetchLibrary: async () => {
        clearLegacySheetCache();
        return SAFETY_LIBRARY_ITEMS;
    },
};
