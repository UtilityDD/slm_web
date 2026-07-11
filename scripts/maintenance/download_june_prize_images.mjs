/**
 * Download June 2026 prize images directly from Amazon CDN URLs.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(root, 'public', 'prizes');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';

const IMAGES = [
    { key: 'champion-1', url: 'https://m.media-amazon.com/images/I/71uRhfpZw1L._SL1500_.jpg' },
    { key: 'champion-2', url: 'https://m.media-amazon.com/images/I/81UWU74XpbL._SL1500_.jpg' },
    { key: 'champion-3', url: 'https://m.media-amazon.com/images/I/71JMXZoyXmL._SL1500_.jpg' },
    { key: 'new_player-1', url: 'https://m.media-amazon.com/images/I/71sBohQO0dL._SL1500_.jpg' },
    { key: 'new_player-2', url: 'https://m.media-amazon.com/images/I/613Od-IZPmL._SL1254_.jpg' },
    { key: 'new_player-3', url: 'https://m.media-amazon.com/images/I/71ah6HXiBWL._SL1500_.jpg' },
];

const COPY_TO = [
    ['new_player-1', 'most_improved-1'],
    ['new_player-2', 'most_improved-2'],
    ['new_player-3', 'most_improved-3'],
];

async function download(url, dest) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return buf.length;
}

async function main() {
    fs.mkdirSync(outDir, { recursive: true });
    for (const img of IMAGES) {
        const dest = path.join(outDir, `2026-06-${img.key}.jpg`);
        process.stdout.write(`${img.key}... `);
        try {
            const bytes = await download(img.url, dest);
            console.log(`OK ${bytes} bytes`);
        } catch (e) {
            console.log(`FAIL ${e.message}`);
            process.exitCode = 1;
        }
    }
    for (const [src, dst] of COPY_TO) {
        const srcPath = path.join(outDir, `2026-06-${src}.jpg`);
        const dstPath = path.join(outDir, `2026-06-${dst}.jpg`);
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, dstPath);
            console.log(`copied ${dst}`);
        }
    }
}

main();
