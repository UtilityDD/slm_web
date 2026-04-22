import { CapacitorHttp } from '@capacitor/core';
import { requestManager } from './requestManager';

// Robust CSV parser using regex to handle quoted fields with commas correctly
const splitCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
};

const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = splitCSVLine(lines[0]);

    const rows = lines.slice(1).map(line => {
        const values = splitCSVLine(line);
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = values[i] || '';
        });
        return obj;
    });

    const formatNameFallback = (fileName) => {
        if (!fileName) return '';
        return fileName.split('.')[0]
            .replace(/_\d+$/, '')
            .split('_')
            .join(' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    const groups = {};
    rows.forEach(row => {
        const category = row['Folder Name'];
        const fileName = row['File Name'];
        const nameBnFromSheet = row['Name_BN'];

        const baseName = nameBnFromSheet || formatNameFallback(fileName);
        const key = `${category}:${baseName}`;

        if (!groups[key]) {
            groups[key] = {
                id: key,
                category: category === 'Insulators' ? 'Insulators' : category,
                name_bn: nameBnFromSheet || baseName,
                function_bn: row['Function_BN'] || '',
                images: [],
                approx_price_inr: row['Price'] || '---',
                guide_bn: row['Guide_BN'] || 'ব্যবহারের নির্দেশাবলী...'
            };
        }
        if (row['File Link']) {
            groups[key].images.push(row['File Link']);
        }
    });

    return Object.values(groups);
};

export const libraryService = {
    /**
     * Fetch Safety Library data with SWR support
     */
    fetchLibrary: async (forceRefresh = false) => {
        const cacheKey = 'safety_library_v3';
        return requestManager.fetch(
            cacheKey,
            async () => {
                const dynamicUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTjxPeFNRSNfOgc80sT-WLmqf0bQqN-YjjSbQoE6i432tL-sK1zg1zHfaQxv4l1YMThgwa1DyreVgCk/pub?gid=0&single=true&output=csv&v=${Date.now()}`;
                
                const response = await CapacitorHttp.get({
                    url: dynamicUrl,
                    responseType: 'text'
                });

                if (response.status !== 200) {
                    throw new Error(`HTTP ${response.status}`);
                }

                let csvText = response.data;
                if (typeof csvText !== 'string') {
                    csvText = JSON.stringify(csvText);
                }

                return parseCSV(csvText);
            },
            { 
                ttl: 60, // Cache for 60 minutes
                swr: true, // Use Stale-While-Revalidate
                forceRefresh 
            }
        );
    }
};
