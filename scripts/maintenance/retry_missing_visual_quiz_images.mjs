/**
 * Retry downloading visual-quiz images marked on_disk=no in live_sheet_image_map.csv
 *
 * Usage: node scripts/maintenance/retry_missing_visual_quiz_images.mjs
 */
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mapPath = path.join(root, 'quiz_management', 'live_sheet_image_map.csv');
const imagesDir = path.join(root, 'public', 'images', 'quizzes');
const TIMEOUT_MS = 60000;

function downloadOnce(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        let settled = false;
        const done = (err, ok) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (err) reject(err);
            else resolve(ok);
        };
        const timer = setTimeout(() => {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            done(new Error('timeout'));
        }, TIMEOUT_MS);

        const follow = (target) => {
            const req = https.get(target, (res) => {
                if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                    file.close();
                    if (fs.existsSync(dest)) fs.unlinkSync(dest);
                    follow(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    file.close();
                    if (fs.existsSync(dest)) fs.unlinkSync(dest);
                    done(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    done(null, true);
                });
            });
            req.on('error', (err) => {
                file.close();
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
                done(err);
            });
            req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('timeout')));
        };
        follow(url);
    });
}

function downloadCandidates(id, dest) {
    const urls = [
        `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
        `https://drive.google.com/uc?export=view&id=${id}`,
        `https://drive.google.com/uc?export=download&id=${id}`,
        `https://lh3.googleusercontent.com/d/${id}=w1200`,
    ];
    return (async () => {
        for (const url of urls) {
            try {
                await downloadOnce(url, dest);
                const stat = fs.statSync(dest);
                if (stat.size > 500) return url;
                fs.unlinkSync(dest);
            } catch {
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
            }
        }
        throw new Error('all candidates failed');
    })();
}

function parseMap() {
    const lines = fs.readFileSync(mapPath, 'utf8').trim().split(/\r?\n/).slice(1);
    return lines.map((line) => {
        const match = line.match(/^([^,]+),([^,]+),(yes|no),"(.+)"$/);
        if (!match) {
            const parts = line.split(',');
            return {
                driveId: parts[0],
                localFilename: parts[1],
                onDisk: parts[2],
                sampleUrl: `https://drive.google.com/file/d/${parts[0]}`,
            };
        }
        return {
            driveId: match[1],
            localFilename: match[2],
            onDisk: match[3],
            sampleUrl: match[4],
        };
    });
}

function writeMap(rows) {
    const lines = ['drive_id,local_filename,on_disk,sample_drive_url'];
    for (const row of rows) {
        lines.push(`${row.driveId},${row.localFilename},${row.onDisk},"${row.sampleUrl}"`);
    }
    fs.writeFileSync(mapPath, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
    const rows = parseMap();

    const missing = rows.filter((r) => r.onDisk === 'no');
    if (!missing.length) {
        console.log('All images already on disk.');
        return;
    }

    console.log(`Retrying ${missing.length} missing images...`);
    let recovered = 0;

    for (const row of missing) {
        const dest = path.join(imagesDir, row.localFilename);
        process.stdout.write(`  ${row.driveId} ... `);
        try {
            const via = await downloadCandidates(row.driveId, dest);
            row.onDisk = 'yes';
            recovered += 1;
            console.log(`ok (${via.split('?')[0]}...)`);
        } catch (err) {
            console.log(`failed (${err.message})`);
        }
    }

    writeMap(rows);
    console.log(`\nRecovered ${recovered}/${missing.length}. Updated ${mapPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
