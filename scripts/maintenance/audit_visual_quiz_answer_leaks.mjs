/**
 * Audit visual quiz CSV rows for answer-leak patterns.
 *
 * Usage:
 *   node scripts/maintenance/audit_visual_quiz_answer_leaks.mjs
 *   node scripts/maintenance/audit_visual_quiz_answer_leaks.mjs quiz_management/visual_quiz_batch_02.csv
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    detectAnswerLeakWarnings,
    sanitizeVisualQuestionRow,
} from '../../src/utils/visualQuizSanitize.js';
import { parseCSV, root } from './visualQuizSheetUtils.mjs';

const defaultFiles = [
    path.join(root, 'quiz_management', 'live_visual_quiz_migrated_preview.csv'),
    path.join(root, 'quiz_management', 'visual_quiz_batch_02.csv'),
];

const inputFiles = process.argv.slice(2).map((p) => path.resolve(root, p));
const targets = inputFiles.length ? inputFiles : defaultFiles;

for (const filePath of targets) {
    if (!fs.existsSync(filePath)) {
        console.warn(`skip missing: ${filePath}`);
        continue;
    }

    const { rows } = parseCSV(fs.readFileSync(filePath, 'utf8'));
    const flagged = [];

    for (const row of rows) {
        const enabled = String(row.enabled || '').toUpperCase() !== 'FALSE';
        if (!enabled) continue;
        const sanitized = sanitizeVisualQuestionRow(row);
        const warnings = detectAnswerLeakWarnings(sanitized);
        if (!warnings.length) continue;
        flagged.push({ id: row.id, enabled, warnings });
    }

    console.log(`\n${filePath}`);
    console.log(`  total rows: ${rows.length}, flagged: ${flagged.length}`);
    for (const item of flagged) {
        const status = item.enabled ? 'ENABLED' : 'disabled';
        console.log(`  ${item.id} [${status}]: ${item.warnings.join(', ')}`);
    }
}
