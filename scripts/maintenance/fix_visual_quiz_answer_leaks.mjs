/**
 * Permanently fix answer-leak patterns in visual quiz CSV files.
 *
 * Usage:
 *   node scripts/maintenance/fix_visual_quiz_answer_leaks.mjs
 *   node scripts/maintenance/fix_visual_quiz_answer_leaks.mjs quiz_management/live_visual_quiz_migrated_preview.csv
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    detectAnswerLeakWarnings,
    sanitizeVisualQuestionRow,
} from '../../src/utils/visualQuizSanitize.js';
import { parseCSV, root, serializeCSV } from './visualQuizSheetUtils.mjs';

const DTR_NUMBERED_IDS = new Set(
    Array.from({ length: 10 }, (_, i) => `vq-${String(67 + i).padStart(3, '0')}`)
);
const HELMET_NAME_BY_LETTER_IDS = new Set(
    Array.from({ length: 7 }, (_, i) => `vq-${String(77 + i).padStart(3, '0')}`)
);
const WRENCH_IMAGE_TO_TEXT_IDS = new Set(
    Array.from({ length: 14 }, (_, i) => `vq-${String(97 + i).padStart(3, '0')}`)
);

const CUSTOM_QUESTION_TEXT = {
    'vq-084': 'নিচের কোন ভূমিকাটি হেলমেটের সবচেয়ে বাইরের শক্ত প্রতিরক্ষামূলক স্তর পালন করে?',
    'vq-085': 'নিচের কোন ভূমিকাটি আঘাতের ধাক্কা শোষণ করে মাথায় সমানভাবে ছড়িয়ে দেয়?',
    'vq-086': 'নিচের কোন অংশ দিয়ে হেলমেটের পরিধি সহজে মাথার সাথে ফিট করা যায়?',
    'vq-087': 'নিচের কোন অংশ কপালের ঘাম শুষে চোখে পড়া রোধ করে?',
    'vq-088': 'নিচের কোন অংশ বাতাস বা ঝাঁকুনিতে হেলমেট মাথা থেকে পড়ে যাওয়া রোধ করে?',
    'vq-089': 'নিচের কোন অংশ চোখ ও মুখকে রোদ ও উপর থেকে পড়া কণা থেকে আংশিক রক্ষা করে?',
    'vq-095':
        'ছবিতে দেখানো অংশগুলোর মধ্যে মাথার মধ্যবর্তী ফাঁকা স্থান বজায় রাখার কাজ কে করে?',
};

const CUSTOM_HINTS = {
    'vq-094': 'মাথার চারপাশ জুড়ে থাকা বৃত্তাকার ফিতাটিই এই অংশটি।',
    'vq-095': 'ভেতরের ফিতার নেট মাথাকে বাইরের আবরণ থেকে ন্যূনতম ১ ইঞ্চি দূরত্বে রেখে আঘাত থেকে বাঁচায়।',
};

const BATCH02_DTR_OPTIONS = {
    option_1: 'dtr_lt_bushing.webp',
    option_2: 'dtr_ht_bushing.webp',
    option_3: 'dtr_radiator.webp',
    option_4: 'dtr_main_tank.webp',
};

const BATCH02_DTR_CONVERSIONS = {
    'vq-120': { question_text: 'নিচের ছবিগুলোর মধ্যে কোনটি এইচটি (HT) বুশিং?', correct_index: '1' },
    'vq-121': { question_text: 'নিচের ছবিগুলোর মধ্যে কোনটি এলটি (LT) বুশিং?', correct_index: '0' },
    'vq-122': { question_text: 'নিচের ছবিগুলোর মধ্যে কোনটি রেডিয়েটর ব্যাংক?', correct_index: '2' },
    'vq-123': { question_text: 'নিচের ছবিগুলোর মধ্যে কোনটি মেইন অয়েল ট্যাঙ্ক?', correct_index: '3' },
};

const DISABLE_REASON_IDS = new Set(['vq-124']);

function shouldDisable(id) {
    return (
        DTR_NUMBERED_IDS.has(id) ||
        HELMET_NAME_BY_LETTER_IDS.has(id) ||
        WRENCH_IMAGE_TO_TEXT_IDS.has(id) ||
        DISABLE_REASON_IDS.has(id)
    );
}

function fixRow(row) {
    const id = String(row.id || '').trim();
    let next = { ...row };

    if (BATCH02_DTR_CONVERSIONS[id]) {
        const spec = BATCH02_DTR_CONVERSIONS[id];
        next = {
            ...next,
            question_type: 'text_to_image',
            question_text: spec.question_text,
            question_image_url: '',
            ...BATCH02_DTR_OPTIONS,
            correct_index: spec.correct_index,
            preview_q: '',
            preview_o1: BATCH02_DTR_OPTIONS.option_1,
            preview_o2: BATCH02_DTR_OPTIONS.option_2,
            preview_o3: BATCH02_DTR_OPTIONS.option_3,
            preview_o4: BATCH02_DTR_OPTIONS.option_4,
        };
    }

    if (CUSTOM_QUESTION_TEXT[id]) {
        next.question_text = CUSTOM_QUESTION_TEXT[id];
    }
    if (CUSTOM_HINTS[id]) {
        next.hint = CUSTOM_HINTS[id];
    }

    next = sanitizeVisualQuestionRow(next);

    if (shouldDisable(id)) {
        next.enabled = 'FALSE';
    }

    return next;
}

function processFile(filePath) {
    const csvText = fs.readFileSync(filePath, 'utf8');
    const { headers, rows } = parseCSV(csvText);
    const changes = [];

    const fixedRows = rows.map((row) => {
        const id = String(row.id || '').trim();
        const beforeWarnings = detectAnswerLeakWarnings(sanitizeVisualQuestionRow(row));
        const fixed = fixRow(row);
        const afterWarnings = detectAnswerLeakWarnings(fixed);

        const disabled = shouldDisable(id) && String(row.enabled).toUpperCase() !== 'FALSE';
        const sanitized =
            row.question_text !== fixed.question_text ||
            row.option_1 !== fixed.option_1 ||
            row.option_2 !== fixed.option_2 ||
            row.option_3 !== fixed.option_3 ||
            row.option_4 !== fixed.option_4 ||
            row.hint !== fixed.hint ||
            row.question_type !== fixed.question_type ||
            row.question_image_url !== fixed.question_image_url;

        if (disabled || sanitized || beforeWarnings.length !== afterWarnings.length) {
            changes.push({
                id,
                disabled,
                beforeWarnings,
                afterWarnings,
            });
        }

        return fixed;
    });

    fs.writeFileSync(filePath, serializeCSV(headers, fixedRows), 'utf8');
    return { filePath, total: rows.length, changes };
}

const defaultFiles = [
    path.join(root, 'quiz_management', 'live_visual_quiz_migrated_preview.csv'),
    path.join(root, 'quiz_management', 'visual_quiz_batch_02.csv'),
    path.join(root, 'public', 'quiz_management', 'visual_quiz_batch_02.csv'),
];

const inputFiles = process.argv.slice(2).map((p) => path.resolve(root, p));
const targets = inputFiles.length ? inputFiles : defaultFiles;

for (const filePath of targets) {
    if (!fs.existsSync(filePath)) {
        console.warn(`skip missing: ${filePath}`);
        continue;
    }
    const result = processFile(filePath);
    const disabled = result.changes.filter((c) => c.disabled).length;
    const stillLeaking = result.changes.filter((c) => c.afterWarnings.length > 0).length;
    console.log(`\n${result.filePath}`);
    console.log(`  rows: ${result.total}, changed: ${result.changes.length}, disabled: ${disabled}, still flagged: ${stillLeaking}`);
    for (const c of result.changes.filter((x) => x.afterWarnings.length > 0).slice(0, 20)) {
        console.log(`  ${c.id}: ${c.afterWarnings.join(', ')}`);
    }
}
