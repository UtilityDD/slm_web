/**
 * Generate find/replace instructions for migrating the LIVE Google Sheet to local filenames.
 *
 * Usage: node scripts/maintenance/generate_visual_quiz_sheet_cutover.mjs
 *
 * Output: quiz_management/live_sheet_cutover_guide.txt
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mapPath = path.join(root, 'quiz_management', 'live_sheet_image_map.csv');
const outPath = path.join(root, 'quiz_management', 'live_sheet_cutover_guide.txt');

function parseMap() {
    const lines = fs.readFileSync(mapPath, 'utf8').trim().split(/\r?\n/).slice(1);
    return lines.map((line) => {
        const parts = line.split(',');
        return {
            driveId: parts[0],
            localFilename: parts[1],
            onDisk: parts[2],
        };
    });
}

function main() {
    const rows = parseMap();
    const ready = rows.filter((r) => r.onDisk === 'yes');
    const skip = rows.filter((r) => r.onDisk === 'no');

    const lines = [
        'LIVE GOOGLE SHEET CUTOVER GUIDE',
        'Tab: visual quiz (gid 160776708)',
        '',
        'Prerequisites:',
        '  - App deploy 30dc57c+ is live on Vercel',
        '  - public/images/quizzes/ images deployed',
        '',
        'SAFE METHOD (Google Sheets Find & Replace):',
        '  1. Open the live sheet tab',
        '  2. Edit → Find and replace',
        '  3. For each READY row below: Find the drive_id fragment, Replace with local_filename',
        '  4. Use "Replace all" per ID (matches /file/d/ID and thumbnail?id=ID variants)',
        '  5. Do NOT replace SKIP rows — leave Drive URLs until files exist',
        '',
        `READY TO REPLACE (${ready.length} images):`,
        '',
    ];

    for (const row of ready) {
        lines.push(`  Find:    ${row.driveId}`);
        lines.push(`  Replace: ${row.localFilename}`);
        lines.push('');
    }

    lines.push(`SKIP — keep Drive URL (${skip.length} images):`);
    lines.push('');
    for (const row of skip) {
        lines.push(`  ${row.driveId} → ${row.localFilename} (file missing — Drive fallback only)`);
    }

    lines.push('');
    lines.push('Columns to check after replace:');
    lines.push('  question_image_url, option_1, option_2, option_3, option_4');
    lines.push('  preview_q, preview_o1..preview_o4 (optional editor columns)');
    lines.push('');
    lines.push('Verify:');
    lines.push('  - Open hourly quiz as guest, start quiz, confirm images load');
    lines.push('  - Wait ~60s or hard refresh if sheet was just published');
    lines.push('');
    lines.push('Rollback: reverse each Replace (local_filename → drive_id in full URL)');

    fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
    console.log(`Wrote ${outPath}`);
    console.log(`Ready: ${ready.length}, Skip: ${skip.length}`);
}

main();
