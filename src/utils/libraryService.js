import { CapacitorHttp } from '@capacitor/core';
import { requestManager } from './requestManager';

// Robust CSV parser using regex to handle quoted fields with commas correctly
/** Same file id logic as the app uses for thumbnails — links resolve uniquely per row. */
const extractGoogleDriveFileId = (url) => {
    if (!url || typeof url !== 'string') return null;
    const u = url.trim();
    let m = u.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    m = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    m = u.match(/googleusercontent\.com\/[^/]*\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    return null;
};

const normalizeDriveUrlForMatch = (url) => {
    const s = String(url).trim();
    if (!s) return '';
    try {
        const parsed = new URL(s);
        parsed.search = '';
        return parsed.href;
    } catch {
        return s;
    }
};

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

    /** Strip UTF-8 BOM so first header (e.g. Related_Keys) still matches. */
    const headers = splitCSVLine(lines[0].replace(/^\uFEFF/, '')).map((h) => h.trim());

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
                guide_bn: row['Guide_BN'] || 'ব্যবহারের নির্দেশাবলী...',
                related_tokens: []
            };
        }
        if (row['File Link']) {
            groups[key].images.push(row['File Link']);
        }
        const relatedCells = [row['Related_Keys'], row['Related'], row['Related_File_Links']];
        relatedCells.forEach((cell) => {
            if (!cell || !String(cell).trim()) return;
            String(cell)
                .split('|')
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((token) => {
                    if (!groups[key].related_tokens.includes(token)) {
                        groups[key].related_tokens.push(token);
                    }
                });
        });
    });

    const driveIdToItemKey = new Map();
    const normalizedUrlToKey = new Map();

    rows.forEach((row) => {
        const category = row['Folder Name'];
        const fileName = row['File Name'];
        const nameBnFromSheet = row['Name_BN'];
        const baseName = nameBnFromSheet || formatNameFallback(fileName);
        const key = `${category}:${baseName}`;
        const fl = (row['File Link'] || '').trim();
        if (!fl) return;
        normalizedUrlToKey.set(normalizeDriveUrlForMatch(fl), key);
        const fid = extractGoogleDriveFileId(fl);
        if (fid) driveIdToItemKey.set(fid, key);
    });

    const catalog = Object.values(groups);
    catalog.forEach((g) => {
        (g.images || []).forEach((img) => {
            const u = String(img).trim();
            if (!u) return;
            normalizedUrlToKey.set(normalizeDriveUrlForMatch(u), g.id);
            const fid = extractGoogleDriveFileId(u);
            if (fid) driveIdToItemKey.set(fid, g.id);
        });
    });

    const byId = {};
    catalog.forEach((g) => {
        byId[g.id] = g;
    });

    const resolveRelatedToken = (token) => {
        if (!token) return null;
        if (/^https?:\/\//i.test(token)) {
            const norm = normalizeDriveUrlForMatch(token);
            if (norm && normalizedUrlToKey.has(norm)) {
                return normalizedUrlToKey.get(norm);
            }
            const fid = extractGoogleDriveFileId(token);
            if (fid && driveIdToItemKey.has(fid)) {
                return driveIdToItemKey.get(fid);
            }
            return null;
        }
        return byId[token] ? token : null;
    };

    catalog.forEach((g) => {
        const resolvedKeys = new Set();
        (g.related_tokens || []).forEach((token) => {
            const targetKey = resolveRelatedToken(token);
            if (targetKey && targetKey !== g.id) {
                resolvedKeys.add(targetKey);
            }
        });
        g.related_items = [...resolvedKeys]
            .filter((rid) => byId[rid])
            .map((rid) => ({
                id: rid,
                category: byId[rid].category,
                name_bn: byId[rid].name_bn
            }));
        delete g.related_tokens;
    });

    return catalog;
};

export const libraryService = {
    /**
     * Fetch Safety Library data with SWR support
     */
    fetchLibrary: async (forceRefresh = false) => {
        const cacheKey = 'safety_library_v5';
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
