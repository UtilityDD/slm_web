/**
 * Validate live visual quiz sheet.
 *
 * Usage:
 *   node scripts/maintenance/validate_visual_quiz_sheet.mjs           # before cutover (informational)
 *   node scripts/maintenance/validate_visual_quiz_sheet.mjs --strict  # after cutover (fails on issues)
 */
import fs from 'fs';
import path from 'path';
import {
    LIVE_CSV_URL,
    root,
    imagesDir,
    IMAGE_COLUMNS,
    fetchText,
    parseCSV,
    loadImageMap,
    extractDriveId,
} from './visualQuizSheetUtils.mjs';

async function main() {
    const strict = process.argv.includes('--strict');
    console.log('Fetching live visual quiz CSV...');
    const csvText = await fetchText(LIVE_CSV_URL);
    const map = loadImageMap();
    const { rows } = parseCSV(csvText);

    let localCells = 0;
    let driveCells = 0;
    let missingLocalFiles = 0;
    let unexpectedDriveReady = 0;
    const issues = [];

    for (const row of rows) {
        const rowId = row.id || 'unknown';
        for (const column of IMAGE_COLUMNS) {
            if (!(column in row)) continue;
            const value = String(row[column] || '').trim();
            if (!value) continue;

            const driveId = extractDriveId(value);
            if (driveId) {
                driveCells += 1;
                if (map.ready.has(driveId)) {
                    unexpectedDriveReady += 1;
                    issues.push(`${rowId}.${column}: still Drive URL but file exists (${driveId})`);
                }
                continue;
            }

            if (/^img_[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(value)) {
                localCells += 1;
                const filePath = path.join(imagesDir, value);
                if (!fs.existsSync(filePath)) {
                    missingLocalFiles += 1;
                    issues.push(`${rowId}.${column}: local filename missing on disk (${value})`);
                }
            }
        }
    }

    console.log('');
    console.log('Validation summary');
    console.log(`  Local filename cells: ${localCells}`);
    console.log(`  Drive URL cells:      ${driveCells}`);
    console.log(`  Ready not migrated:   ${unexpectedDriveReady}`);
    console.log(`  Missing local files:  ${missingLocalFiles}`);
    console.log(`  Skip list size:       ${map.skip.size}`);

    if (issues.length) {
        console.log('');
        console.log('Issues:');
        for (const issue of issues.slice(0, 30)) console.log(`  - ${issue}`);
        if (issues.length > 30) console.log(`  ... and ${issues.length - 30} more`);
    }

    const blocking = missingLocalFiles > 0 || (strict && (unexpectedDriveReady > 0 || issues.length > 0));

    console.log('');
    if (!strict && unexpectedDriveReady > 0 && missingLocalFiles === 0) {
        console.log('Pre-cutover state: Drive URLs remain for ready images — expected until you update the sheet.');
        console.log('Use live_visual_quiz_migrated_preview.csv or live_visual_quiz_cutover_diff.txt to apply changes.');
    } else if (blocking) {
        console.log('Validation failed.');
        process.exitCode = 1;
    } else {
        console.log('OK — no blocking issues found.');
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
