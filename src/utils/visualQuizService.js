import { requestManager } from './requestManager';

const VISUAL_QUIZ_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTjxPeFNRSNfOgc80sT-WLmqf0bQqN-YjjSbQoE6i432tL-sK1zg1zHfaQxv4l1YMThgwa1DyreVgCk/pub?gid=160776708&single=true&output=csv';

const splitCSVLine = (line) => {
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
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
};

const parseCSV = (csvText) => {
    const lines = String(csvText || '').split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = splitCSVLine(lines[0]).map((h) => h.trim());

    return lines.slice(1).map((line) => {
        const values = splitCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = (values[index] || '').trim();
        });
        return row;
    });
};

const isEnabled = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const parseTags = (rawTags) =>
    String(rawTags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

const toQuestion = (row) => {
    const options = [row.option_1, row.option_2, row.option_3, row.option_4].map((opt) => String(opt || '').trim());
    const parsedCorrect = Number.parseInt(row.correct_index, 10);
    if (!Number.isInteger(parsedCorrect) || parsedCorrect < 0 || parsedCorrect >= options.length) return null;
    if (options.filter(Boolean).length < 2) return null;

    return {
        id: String(row.id || '').trim(),
        question_text: String(row.question_text || '').trim(),
        question_image_url: String(row.question_image_url || '').trim(),
        question_type: String(row.question_type || '').trim() || 'text_to_text',
        options,
        correct_option_index: parsedCorrect,
        hint: String(row.hint || '').trim(),
        category: String(row.category || '').trim() || null,
        tags: parseTags(row.tags)
    };
};

export const visualQuizService = {
    fetchVisualQuestions: async ({ language = 'bn', hourId = '', forceRefresh = false } = {}) => {
        const cacheKey = `visual_quiz_sheet_${language}_${hourId || 'default'}`;

        const rows = await requestManager.fetch(
            cacheKey,
            async () => {
                const response = await fetch(`${VISUAL_QUIZ_CSV_URL}&v=${Date.now()}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch visual quiz CSV: HTTP ${response.status}`);
                }
                const csvText = await response.text();
                return parseCSV(csvText);
            },
            { ttl: 60, swr: true, forceRefresh }
        );

        return rows
            .filter((row) => String(row.language || '').trim() === language)
            .filter((row) => isEnabled(row.enabled))
            .map(toQuestion)
            .filter((q) => q && q.id);
    }
};
