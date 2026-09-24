import { prefetchIdentifyCatalog } from './quizImagePrefetch';

/**
 * Identify quiz photos only (first image per playable item).
 * Full-library dumps on app start were dropped — screens that are about to play warm the cache.
 */
export function preloadSafetyLibraryAssets() {
    prefetchIdentifyCatalog();
}
