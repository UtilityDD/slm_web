/**
 * Build a migrated preview CSV from the LIVE sheet (or a downloaded export).
 * Does NOT write to Google Sheets.
 *
 * Usage:
 *   node scripts/maintenance/apply_visual_quiz_local_urls.mjs
 *   node scripts/maintenance/apply_visual_quiz_local_urls.mjs path/to/export.csv
 *
 * Output:
 *   quiz_management/live_visual_quiz_migrated_preview.csv
 *   quiz_management/live_visual_quiz_cutover_diff.txt
 */
import fs from 'fs';
import path from 'path';
import {
    LIVE_CSV_URL,
    root,
    IMAGE_COLUMNS,
    fetchText,
    parseCSV,
    serializeCSV,
    loadImageMap,
    replaceCellForCutover,
} from './visualQuizSheetUtils.mjs';

const previewPath = path.join(root, 'quiz_management', 'live_visual_quiz_migrated_preview.csv');
const diffPath = path.join(root, 'quiz_management', 'live_visual_quiz_cutover_diff.txt');

async function main() {
    const inputPath = process.argv[2];
    let csvText;

    if (inputPath) {
        const resolved = path.resolve(inputPath);
        if (!fs.existsSync(resolved)) {
            console.error('File not found:', resolved);
            process.exit(1);
        }
        csvText = fs.readFileSync(resolved, 'utf8');
        console.log('Using local export:', resolved);
    } else {
        console.log('Fetching live visual quiz CSV...');
        csvText = await fetchText(LIVE_CSV_URL);
    }

    const map = loadImageMap();
    const { headers, rows } = parseCSV(csvText);
    const diffLines = [
        'VISUAL QUIZ CUTOVER DIFF (preview only)',
        '',
        'Apply these changes to the LIVE Google Sheet image columns, or paste from live_visual_quiz_migrated_preview.csv after review.',
        '',
    ];

    let changeCount = 0;
    const migratedRows = rows.map((row, rowIndex) => {
        const nextRow = { ...row };
        const rowId = row.id || `row_${rowIndex + 2}`;

        for (const column of IMAGE_COLUMNS) {
            if (!(column in nextRow)) continue;
            const result = replaceCellForCutover(nextRow[column], map);
            if (result.changed) {
                changeCount += 1;
                diffLines.push(`${rowId} | ${column}`);
                diffLines.push(`  before: ${String(nextRow[column]).slice(0, 120)}`);
                diffLines.push(`  after:  ${result.next}`);
                diffLines.push('');
                nextRow[column] = result.next;
            }
        }

        return nextRow;
    });

    fs.writeFileSync(previewPath, serializeCSV(headers, migratedRows), 'utf8');
    fs.writeFileSync(diffPath, `${diffLines.join('\n')}\n`, 'utf8');

    console.log(`Wrote preview: ${previewPath}`);
    console.log(`Wrote diff:    ${diffPath}`);
    console.log(`Cell changes:  ${changeCount}`);
    console.log(`Ready images:  ${map.ready.size}`);
    console.log(`Skip images:   ${map.skip.size}`);
    console.log('');
    console.log('Next (manual, safe):');
    console.log('  1. Review live_visual_quiz_cutover_diff.txt');
    console.log('  2. In Google Sheet tab gid 160776708, update image columns to match preview');
    console.log('  3. Or use Find/Replace per live_sheet_cutover_guide.txt');
    console.log('  4. Run: node scripts/maintenance/validate_visual_quiz_sheet.mjs');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
