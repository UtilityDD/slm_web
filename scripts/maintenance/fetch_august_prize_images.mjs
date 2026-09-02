/**
 * Download August 2026 prize images from Amazon short links, optimize to WebP.
 * Usage: node scripts/maintenance/fetch_august_prize_images.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(root, 'public', 'prizes');

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const PRODUCTS = [
    { key: 'champion-1', url: 'https://amzn.in/d/03ETXxX9', name: 'Omron HEM 7120 BP Monitor' },
    { key: 'champion-2', url: 'https://amzn.in/d/03ztez0j', name: 'KAIWEETS HT100s Voltage Tester' },
    { key: 'champion-3', url: 'https://amzn.in/d/04LEqIZb', name: 'Lifelong Non-Stick Kadai 3.2L' },
    { key: 'new_player-1', url: 'https://amzn.in/d/0ea9pG81', name: 'Pigeon Amaze Plus Kettle 1.5L' },
    { key: 'new_player-2', url: 'https://amzn.in/d/05hcCsFW', name: 'Homdum 20 Inch Tool Belt' },
    { key: 'new_player-3', url: 'https://amzn.in/d/0dQ3mIOa', name: 'Taparia 1420-6 Long Nose Plier' },
];

const COPY_TO = [
    ['new_player-1', 'most_improved-1'],
    ['new_player-2', 'most_improved-2'],
    ['new_player-3', 'most_improved-3'],
];

function normalizeAmazonUrl(u) {
    return u.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
}

function extractImageUrl(html) {
    const hires = [...html.matchAll(/"hiRes":"([^"]+)"/g)]
        .map((m) => normalizeAmazonUrl(m[1]))
        .filter((u) => /media-amazon\.com\/images\/I\//.test(u));
    if (hires.length) return hires[0];

    const large = [...html.matchAll(/"large":"([^"]+)"/g)]
        .map((m) => normalizeAmazonUrl(m[1]))
        .filter((u) => /media-amazon\.com\/images\/I\//.test(u));
    if (large.length) return large[0];

    const patterns = [
        /property="og:image"\s+content="([^"]+)"/i,
        /content="([^"]+)"\s+property="og:image"/i,
        /data-old-hires="([^"]+)"/,
        /id="landingImage"[^>]*src="([^"]+)"/,
    ];
    for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) return normalizeAmazonUrl(m[1]);
    }
    return null;
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function fetchProductImage(url, attempt = 1) {
    const first = await fetch(url, {
        redirect: 'follow',
        headers: {
            'User-Agent': UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-IN,en;q=0.9',
        },
    });
    const asin = first.url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
    const pageUrl = asin ? `https://www.amazon.in/dp/${asin}` : first.url.split('?')[0];

    const res = await fetch(pageUrl, {
        redirect: 'follow',
        headers: {
            'User-Agent': UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-IN,en;q=0.9',
        },
    });

    const html = await res.text();
    const imgUrl = extractImageUrl(html);
    if (!imgUrl) {
        if (attempt < 3) {
            await sleep(2500 * attempt);
            return fetchProductImage(url, attempt + 1);
        }
        throw new Error(`No image found (status ${res.status}, page ${pageUrl}, len ${html.length})`);
    }
    return { imgUrl, pageUrl: res.url, asin };
}

async function downloadAndOptimize(imgUrl, destWebp) {
    const res = await fetch(imgUrl, {
        headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
    });
    if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf)
        .rotate()
        .resize(900, 900, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78, effort: 6 })
        .toFile(destWebp);
    return { bytes: fs.statSync(destWebp).size };
}

async function main() {
    fs.mkdirSync(outDir, { recursive: true });
    const saved = {};

    for (const p of PRODUCTS) {
        const dest = path.join(outDir, `2026-08-${p.key}.webp`);
        process.stdout.write(`Fetching ${p.name}... `);
        try {
            const { imgUrl, asin } = await fetchProductImage(p.url);
            const { bytes } = await downloadAndOptimize(imgUrl, dest);
            saved[p.key] = { dest, bytes, imgUrl, asin };
            console.log(`OK asin=${asin} -> ${path.basename(dest)} (${bytes} bytes)`);
        } catch (err) {
            console.log(`FAIL: ${err.message}`);
            saved[p.key] = { error: err.message };
        }
        await sleep(2000);
    }

    for (const [src, dst] of COPY_TO) {
        const srcFile = saved[src]?.dest;
        if (!srcFile || !fs.existsSync(srcFile)) {
            console.log(`Skip copy ${dst}: source missing`);
            continue;
        }
        const dest = path.join(outDir, `2026-08-${dst}.webp`);
        fs.copyFileSync(srcFile, dest);
        console.log(`Copied -> ${path.basename(dest)}`);
    }

    const ok = Object.values(saved).filter((v) => v.dest).length;
    console.log(`\nDone: ${ok}/${PRODUCTS.length} images saved to public/prizes/`);
    if (ok < PRODUCTS.length) process.exit(1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
