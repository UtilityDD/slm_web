import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

export const LIVE_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTjxPeFNRSNfOgc80sT-WLmqf0bQqN-YjjSbQoE6i432tL-sK1zg1zHfaQxv4l1YMThgwa1DyreVgCk/pub?gid=160776708&single=true&output=csv';

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const mapPath = path.join(root, 'quiz_management', 'live_sheet_image_map.csv');
export const imagesDir = path.join(root, 'public', 'images', 'quizzes');

export const IMAGE_COLUMNS = [
    'question_image_url',
    'option_1',
    'option_2',
    'option_3',
    'option_4',
    'preview_q',
    'preview_o1',
    'preview_o2',
    'preview_o3',
    'preview_o4',
];

const driveIdRegex = /drive\.google\.com\/(?:file\/d\/|thumbnail\?id=)([a-zA-Z0-9_-]+)/;

export function fetchText(url) {
    return new Promise((resolve, reject) => {
        const follow = (target) => {
            https
                .get(target, (res) => {
                    if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                        res.resume();
                        follow(res.headers.location);
                        return;
                    }
                    if (res.statusCode !== 200) {
                        res.resume();
                        reject(new Error(`HTTP ${res.statusCode} for ${target}`));
                        return;
                    }
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => resolve(data));
                })
                .on('error', reject);
        };
        follow(url);
    });
}

export function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            const nextChar = line[i + 1];
            if (inQuotes && nextChar === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

export function parseCSV(csvText) {
    const lines = String(csvText || '').split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = splitCSVLine(lines[0]).map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
        const values = splitCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ?? '';
        });
        return row;
    });

    return { headers, rows };
}

export function serializeCSV(headers, rows) {
    const escape = (value) => {
        const s = String(value ?? '');
        if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };

    const lines = [headers.map(escape).join(',')];
    for (const row of rows) {
        lines.push(headers.map((header) => escape(row[header])).join(','));
    }
    return `${lines.join('\n')}\n`;
}

export function loadImageMap() {
    const lines = fs.readFileSync(mapPath, 'utf8').trim().split(/\r?\n/).slice(1);
    const byId = new Map();
    const ready = new Set();
    const skip = new Set();

    for (const line of lines) {
        const match = line.match(/^([^,]+),([^,]+),(yes|no),"(.+)"$/);
        if (!match) continue;
        const [, driveId, localFilename, onDisk] = match;
        byId.set(driveId, { localFilename, onDisk });
        if (onDisk === 'yes') ready.add(driveId);
        else skip.add(driveId);
    }

    return { byId, ready, skip };
}

export function extractDriveId(value) {
    const match = String(value || '').match(driveIdRegex);
    return match ? match[1] : '';
}

export function replaceCellForCutover(value, map) {
    const raw = String(value || '');
    if (!raw.trim()) return { next: raw, changed: false, reason: 'empty' };

    const driveId = extractDriveId(raw);
    if (!driveId) {
        if (/^img_[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(raw.trim())) {
            return { next: raw, changed: false, reason: 'already_local' };
        }
        return { next: raw, changed: false, reason: 'not_drive' };
    }

    const entry = map.byId.get(driveId);
    if (!entry) return { next: raw, changed: false, reason: 'unknown_id' };
    if (entry.onDisk !== 'yes') return { next: raw, changed: false, reason: 'skip_missing_file' };

    return { next: entry.localFilename, changed: true, reason: 'replaced', driveId };
}
