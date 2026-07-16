import { sanitizeVisualQuestionRow } from './visualQuizSanitize.js';

export const VISUAL_QUIZ_LIVE_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTjxPeFNRSNfOgc80sT-WLmqf0bQqN-YjjSbQoE6i432tL-sK1zg1zHfaQxv4l1YMThgwa1DyreVgCk/pub?gid=160776708&single=true&output=csv';

export const VISUAL_QUIZ_BATCH_02_URL = '/quiz_management/visual_quiz_batch_02.csv';
export const VISUAL_QUIZ_BATCH_03_URL = '/quiz_management/visual_quiz_batch_03.csv';
export const VISUAL_QUIZ_BATCH_04_URL = '/quiz_management/visual_quiz_batch_04.csv';
export const VISUAL_QUIZ_BATCH_05_URL = '/quiz_management/visual_quiz_batch_05.csv';
export const VISUAL_QUIZ_BATCH_06_URL = '/quiz_management/visual_quiz_batch_06.csv';
export const VISUAL_QUIZ_BATCH_07_URL = '/quiz_management/visual_quiz_batch_07.csv';
export const VISUAL_QUIZ_BATCH_08_URL = '/quiz_management/visual_quiz_batch_08.csv';
export const VISUAL_QUIZ_BATCH_09_URL = '/quiz_management/visual_quiz_batch_09.csv';
export const VISUAL_QUIZ_MISTAKE_PREVIEW_URL = '/quiz_management/visual_quiz_batch_mistake_preview.csv';
export const VISUAL_QUIZ_MATERIAL_PREVIEW_URL = '/quiz_management/visual_quiz_batch_material_preview.csv';
export const VISUAL_QUIZ_PROCEDURE_PREVIEW_URL = '/quiz_management/visual_quiz_batch_procedure_preview.csv';

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

export const parseVisualQuizCSV = (csvText) => {
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

export const rowToVisualQuestion = (row) => {
    const sanitized = sanitizeVisualQuestionRow(row);
    const options = [sanitized.option_1, sanitized.option_2, sanitized.option_3, sanitized.option_4].map((opt) =>
        String(opt || '').trim()
    );
    const parsedCorrect = Number.parseInt(row.correct_index, 10);
    if (!Number.isInteger(parsedCorrect) || parsedCorrect < 0 || parsedCorrect >= options.length) return null;
    if (options.filter(Boolean).length < 2) return null;

    return {
        id: String(sanitized.id || row.id || '').trim(),
        question_text: String(sanitized.question_text || '').trim(),
        question_image_url: String(sanitized.question_image_url || row.question_image_url || '').trim(),
        question_type: String(sanitized.question_type || row.question_type || '').trim() || 'text_to_text',
        options,
        correct_option_index: parsedCorrect,
        hint: String(sanitized.hint || row.hint || '').trim(),
        category: String(sanitized.category || row.category || '').trim() || null,
        tags: parseTags(sanitized.tags || row.tags),
        enabled: isEnabled(sanitized.enabled ?? row.enabled),
    };
};

export const rowsToVisualQuestions = (rows, { language = 'bn', includeDisabled = false } = {}) =>
    rows
        .filter((row) => String(row.language || '').trim() === language)
        .filter((row) => includeDisabled || isEnabled(row.enabled))
        .map(rowToVisualQuestion)
        .filter((q) => q && q.id);
