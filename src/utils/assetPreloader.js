import { SAFETY_LIBRARY_ITEMS } from '../data/safetyLibraryItems';
import { toSafetyLibraryDisplayUrl } from './safetyLibraryImageUrl';

export const preloadSafetyLibraryAssets = async () => {
    try {
        const uniqueLinks = [...new Set(
            SAFETY_LIBRARY_ITEMS
                .flatMap((item) => item.images || [])
                .map((link) => toSafetyLibraryDisplayUrl(link))
                .filter(Boolean)
        )];

        const batchSize = 5;
        for (let i = 0; i < uniqueLinks.length; i += batchSize) {
            const batch = uniqueLinks.slice(i, i + batchSize);
            await Promise.all(batch.map((link) => new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = resolve;
                img.src = link;
            })));
            await new Promise((r) => setTimeout(r, 80));
        }
    } catch (err) {
        console.error('Safety Library asset preloader failed:', err);
    }
};
