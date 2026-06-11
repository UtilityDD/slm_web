/**
 * Merge live + batch 02 visual quizzes: remove duplicates, fix broken rows, enable all.
 *
 * Usage: node scripts/maintenance/finalize_visual_quiz_catalog.mjs
 */
import fs from 'fs';
import path from 'path';
import {
    detectAnswerLeakWarnings,
    sanitizeVisualQuestionRow,
} from '../../src/utils/visualQuizSanitize.js';
import { parseCSV, root, serializeCSV } from './visualQuizSheetUtils.mjs';

const LIVE_PATH = path.join(root, 'quiz_management', 'live_visual_quiz_migrated_preview.csv');
const BATCH_PATH = path.join(root, 'quiz_management', 'visual_quiz_batch_02.csv');
const PUBLIC_BATCH_PATH = path.join(root, 'public', 'quiz_management', 'visual_quiz_batch_02.csv');

const REMOVE_IDS = new Set([
    // Answer-leak / redundant numbered-diagram sets (better replacements exist)
    ...Array.from({ length: 10 }, (_, i) => `vq-${String(67 + i).padStart(3, '0')}`),
    ...Array.from({ length: 7 }, (_, i) => `vq-${String(77 + i).padStart(3, '0')}`),
    ...Array.from({ length: 14 }, (_, i) => `vq-${String(97 + i).padStart(3, '0')}`),
    // Exact / near duplicates
    'vq-008', // disc insulator — vq-129
    'vq-014', // IPC — vq-127
    'vq-021', // shorting chain — vq-131
    'vq-047',
    'vq-048',
    'vq-049',
    'vq-050',
    'vq-051',
    'vq-052',
    'vq-053',
    'vq-054', // DTR pick-many — vq-120–123
    'vq-124', // duplicate vq-120
    'vq-135', // FRP ladder — vq-006
]);

const ROW_FIXES = {
    'vq-024': {
        question_text: 'ছবিতে দেখানো টুলস সেটটি কী?',
    },
    'vq-128': {
        question_image_url: 'img_1U_MIUBgX9Vm83lNewQxL9oVEPgEQnRdQ.jpg',
        preview_q: 'img_1U_MIUBgX9Vm83lNewQxL9oVEPgEQnRdQ.jpg',
    },
    'vq-136': {
        question_type: 'image_to_text',
        question_text:
            'লাইন শর্ট ও গ্রাউন্ডের আগে অবশিষ্ট চার্জ মাটিতে পাঠাতে কোন সরঞ্জাম প্রথমে ব্যবহার করা হয়?',
        question_image_url: 'img_13CDnu-6m778I9EERIIeN4ph2noFSEr2U.jpg',
        option_1: 'ডিসচার্জ রড (আর্থিং রড)',
        option_2: 'কপার শর্টিং চেন',
        option_3: 'মেগার',
        option_4: 'ফেজ চেকার',
        correct_index: '0',
        preview_q: 'img_13CDnu-6m778I9EERIIeN4ph2noFSEr2U.jpg',
    },
    'vq-137': {
        question_type: 'image_to_text',
        question_text:
            'টানা তারের (Stay Wire) মাঝখানে সুরক্ষার জন্য ব্যবহৃত এই ইনসুলেটরটি কী?',
        question_image_url: 'img_1JSmzPpPfrxTPs9V_Sk8k5xakiNsZ6pIh.jpg',
        option_1: 'পিন ইনসুলেটর',
        option_2: 'শ্যাকল ইনসুলেটর',
        option_3: 'ডিস্ক ইনসুলেটর',
        option_4: 'স্টে (এগ) ইনসুলেটর',
        correct_index: '3',
        preview_q: 'img_1JSmzPpPfrxTPs9V_Sk8k5xakiNsZ6pIh.jpg',
    },
};

function applyFixes(row) {
    const id = String(row.id || '').trim();
    let next = sanitizeVisualQuestionRow({ ...row });
    if (ROW_FIXES[id]) {
        next = { ...next, ...ROW_FIXES[id] };
    }
    next.enabled = 'TRUE';
    return next;
}

function loadRows(filePath) {
    const { headers, rows } = parseCSV(fs.readFileSync(filePath, 'utf8'));
    return { headers, rows };
}

const live = loadRows(LIVE_PATH);
const batch = loadRows(BATCH_PATH);

const byId = new Map();
for (const row of live.rows) {
    const id = String(row.id || '').trim();
    if (!id || REMOVE_IDS.has(id)) continue;
    byId.set(id, applyFixes(row));
}

for (const row of batch.rows) {
    const id = String(row.id || '').trim();
    if (!id || REMOVE_IDS.has(id)) continue;
    byId.set(id, applyFixes(row));
}

const merged = [...byId.values()].sort((a, b) => {
    const na = Number.parseInt(String(a.id).replace(/\D/g, ''), 10);
    const nb = Number.parseInt(String(b.id).replace(/\D/g, ''), 10);
    return na - nb;
});

const headers = live.headers.length ? live.headers : batch.headers;
fs.writeFileSync(LIVE_PATH, serializeCSV(headers, merged), 'utf8');

const batchOnly = merged.filter((r) => Number.parseInt(String(r.id).replace(/\D/g, ''), 10) >= 120);
fs.writeFileSync(BATCH_PATH, serializeCSV(headers, batchOnly), 'utf8');
fs.writeFileSync(PUBLIC_BATCH_PATH, serializeCSV(headers, batchOnly), 'utf8');

const enabled = merged.filter((r) => String(r.enabled).toUpperCase() === 'TRUE').length;
const flagged = merged.filter((r) => detectAnswerLeakWarnings(sanitizeVisualQuestionRow(r)).length > 0);

console.log(`Merged catalog: ${merged.length} questions (${enabled} enabled)`);
console.log(`Removed IDs: ${REMOVE_IDS.size}`);
console.log(`Batch 02 file: ${batchOnly.length} rows (vq-120+)`);
console.log(`Still flagged for leaks: ${flagged.length}`);
for (const row of flagged.slice(0, 15)) {
    const w = detectAnswerLeakWarnings(sanitizeVisualQuestionRow(row));
    console.log(`  ${row.id}: ${w.join(', ')}`);
}
