/**
 * Download visual-quiz images from the LIVE Google Sheet CSV (or a local export)
 * and write a Drive URL → local filename map for manual sheet updates.
 *
 * Usage:
 *   node scripts/maintenance/migrate_live_visual_quiz_images.mjs
 *   node scripts/maintenance/migrate_live_visual_quiz_images.mjs path/to/export.csv
 *
 * Does NOT modify the live sheet. Safe to run anytime.
 */
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const LIVE_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTjxPeFNRSNfOgc80sT-WLmqf0bQqN-YjjSbQoE6i432tL-sK1zg1zHfaQxv4l1YMThgwa1DyreVgCk/pub?gid=160776708&single=true&output=csv';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imagesDir = path.join(root, 'public', 'images', 'quizzes');
const mapPath = path.join(root, 'quiz_management', 'live_sheet_image_map.csv');

const driveRegex = /https:\/\/drive\.google\.com\/(?:file\/d\/|thumbnail\?id=)([a-zA-Z0-9_-]+)/g;

function fetchText(url) {
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

const DOWNLOAD_TIMEOUT_MS = 45000;

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(dest)) return resolve('skipped');

        const file = fs.createWriteStream(dest);
        let settled = false;
        const finish = (err, status) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (err) reject(err);
            else resolve(status);
        };

        const timer = setTimeout(() => {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            finish(new Error('timeout'));
        }, DOWNLOAD_TIMEOUT_MS);

        const follow = (target) => {
            const req = https
                .get(target, (res) => {
                    if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                        file.close();
                        if (fs.existsSync(dest)) fs.unlinkSync(dest);
                        follow(res.headers.location);
                        return;
                    }
                    if (res.statusCode !== 200) {
                        file.close();
                        if (fs.existsSync(dest)) fs.unlinkSync(dest);
                        finish(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }
                    res.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        finish(null, 'downloaded');
                    });
                })
                .on('error', (err) => {
                    file.close();
                    if (fs.existsSync(dest)) fs.unlinkSync(dest);
                    finish(err);
                });
            req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => req.destroy(new Error('timeout')));
        };
        follow(url);
    });
}

function collectDriveRefs(csvText) {
    const byId = new Map();

    for (const match of csvText.matchAll(driveRegex)) {
        const fullUrl = match[0];
        const id = match[1];
        if (!byId.has(id)) {
            byId.set(id, { ids: new Set([id]), urls: new Set([fullUrl]) });
        } else {
            byId.get(id).urls.add(fullUrl);
        }
    }

    return byId;
}

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

    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    const refs = collectDriveRefs(csvText);
    console.log(`Found ${refs.size} unique Drive image IDs in source CSV.`);

    let downloaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const [id] of refs) {
        const filename = `img_${id}.jpg`;
        const dest = path.join(imagesDir, filename);
        try {
            const status = await downloadFile(`https://drive.google.com/uc?export=download&id=${id}`, dest);
            if (status === 'skipped') skipped += 1;
            else downloaded += 1;
            process.stdout.write(`\r  ${downloaded + skipped + failed} / ${refs.size}`);
        } catch (err) {
            failed += 1;
            console.error(`\n  Failed ${id}: ${err.message}`);
        }
    }

    console.log(`\nDone. downloaded=${downloaded} skipped=${skipped} failed=${failed}`);

    const mapLines = ['drive_id,local_filename,on_disk,sample_drive_url'];
    for (const [id, meta] of refs) {
        const filename = `img_${id}.jpg`;
        const onDisk = fs.existsSync(path.join(imagesDir, filename)) ? 'yes' : 'no';
        const sample = [...meta.urls][0];
        mapLines.push(`${id},${filename},${onDisk},"${sample}"`);
    }
    fs.writeFileSync(mapPath, `${mapLines.join('\n')}\n`, 'utf8');
    console.log('Wrote map:', mapPath);

    const missing = [...refs.keys()].filter((id) => !fs.existsSync(path.join(imagesDir, `img_${id}.jpg`)));
    if (missing.length) {
        console.log(`Missing on disk (${missing.length}): ${missing.join(', ')}`);
        console.log('Keep Drive URLs for those rows until files are fixed.');
    }
    console.log('');
    console.log('Next: update the LIVE Google Sheet manually — replace Drive URLs with local_filename values.');
    console.log('Deploy code + images before changing the sheet. Drive URLs still work until you switch.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
