import { supabase } from '../supabaseClient';

const getGoogleDriveDirectLink = (url) => {
    if (!url) return '';
    if (!url.includes('drive.google.com')) return url;
    const match = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/);
    const id = match ? (match[1] || match[2]) : '';
    return id ? `https://lh3.googleusercontent.com/u/0/d/${id}` : url;
};

export const preloadSafetyLibraryAssets = async () => {
    try {
        console.log('🚀 Starting background asset preloading...');

        // Fetch all images from safety_library
        const { data, error } = await supabase
            .from('safety_library')
            .select('images');

        if (error) throw error;
        if (!data) return;

        // Flatten all image arrays and transform links
        const allImageLinks = data.reduce((acc, item) => {
            if (item.images && Array.isArray(item.images)) {
                const directLinks = item.images.map(getGoogleDriveDirectLink);
                return [...acc, ...directLinks];
            }
            return acc;
        }, []);

        // Unique links only
        const uniqueLinks = [...new Set(allImageLinks)];
        console.log(`📦 Preloading ${uniqueLinks.length} unique assets...`);

        // Preload in batches of 5 to avoid congestion
        const batchSize = 5;
        for (let i = 0; i < uniqueLinks.length; i += batchSize) {
            const batch = uniqueLinks.slice(i, i + batchSize);
            await Promise.all(batch.map(link => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even on error
                    img.src = link;
                });
            }));
            // Small delay between batches
            await new Promise(r => setTimeout(r, 100));
        }

        console.log('✅ Background preloading complete.');
    } catch (err) {
        console.error('❌ Asset preloader failed:', err);
    }
};
