import { CapacitorHttp } from '@capacitor/core';
import { toSafetyLibraryDisplayUrl } from './safetyLibraryImageUrl';

// Simple but robust CSV line splitter
const splitCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else current += char;
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
};

export const preloadSafetyLibraryAssets = async () => {
    try {
        console.log('🚀 Starting background asset preloading from Google Sheets...');

        const dynamicUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTjxPeFNRSNfOgc80sT-WLmqf0bQqN-YjjSbQoE6i432tL-sK1zg1zHfaQxv4l1YMThgwa1DyreVgCk/pub?gid=0&single=true&output=csv&v=${Date.now()}`;
        
        const response = await CapacitorHttp.get({
            url: dynamicUrl,
            responseType: 'text'
        });

        if (response.status !== 200) throw new Error(`Fetch failed: ${response.status}`);
        
        const csvText = response.data;
        const lines = csvText.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return;

        const headers = splitCSVLine(lines[0]);
        const fileLinkIndex = headers.indexOf('File Link');
        
        if (fileLinkIndex === -1) {
            console.error('❌ "File Link" column not found in Google Sheet');
            return;
        }

        // Extract all unique image links
        const rawLinks = lines.slice(1).map(line => {
            const values = splitCSVLine(line);
            return values[fileLinkIndex];
        }).filter(link => link && (link.includes('drive.google.com') || link.startsWith('/') || link.startsWith('http')));

        const uniqueLinks = [...new Set(rawLinks.map((link) => toSafetyLibraryDisplayUrl(link)).filter(Boolean))];
        
        console.log(`📦 Preloading ${uniqueLinks.length} unique assets...`);

        // Preload in batches of 5
        const batchSize = 5;
        for (let i = 0; i < uniqueLinks.length; i += batchSize) {
            const batch = uniqueLinks.slice(i, i + batchSize);
            await Promise.all(batch.map(link => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        if (img.naturalWidth < 40 && img.naturalHeight < 40) {
                            console.warn(`🕵️ Preloader detected placeholder/broken image: ${link}`);
                        }
                        resolve();
                    };
                    img.onerror = resolve;
                    img.src = link;
                });
            }));
            await new Promise(r => setTimeout(r, 100));
        }

        console.log('✅ Background preloading complete.');
    } catch (err) {
        console.error('❌ Asset preloader failed:', err);
    }
};
