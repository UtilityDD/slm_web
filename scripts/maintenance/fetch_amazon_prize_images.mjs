/**
 * Download June 2026 prize images from Amazon short links into public/prizes/.
 * READ-ONLY on DB; writes image files only.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(root, 'public', 'prizes');

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const PRODUCTS = [
    { key: 'champion-1', url: 'https://amzn.in/d/05IggcI9', name: 'Pigeon Pressure Cooker' },
    { key: 'champion-2', url: 'https://amzn.in/d/0ijf3T0t', name: 'Milton Lunch Box' },
    { key: 'champion-3', url: 'https://amzn.in/d/0f3iCvUX', name: 'Eveready Searchlite' },
    { key: 'new_player-1', url: 'https://amzn.in/d/0gd9H4Rr', name: 'Clay Craft Coffee Cups' },
    { key: 'new_player-2', url: 'https://amzn.in/d/0eRRig3M', name: 'Perwal Tool Set' },
    { key: 'new_player-3', url: 'https://amzn.in/d/05k2yQB2', name: 'Duracell LED Torch' },
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
        if (m?.[1]) return m[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    }
    return null;
}

function extFromUrl(url, contentType) {
    if (contentType?.includes('webp')) return 'webp';
    if (contentType?.includes('png')) return 'png';
    if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
    const m = url.match(/\.(webp|jpe?g|png)(?:\?|$)/i);
    return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
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
    return { imgUrl, pageUrl: res.url };
}

async function downloadImage(imgUrl, destBase) {
    const res = await fetch(imgUrl, {
        headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
    });
    if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = extFromUrl(imgUrl, res.headers.get('content-type'));
    const dest = `${destBase}.${ext}`;
    fs.writeFileSync(dest, buf);
    return { dest, ext, bytes: buf.length };
}

async function main() {
    fs.mkdirSync(outDir, { recursive: true });
    const saved = {};

    for (const p of PRODUCTS) {
        const base = path.join(outDir, `2026-06-${p.key}`);
        process.stdout.write(`Fetching ${p.name}... `);
        try {
            const { imgUrl } = await fetchProductImage(p.url);
            const { dest, ext, bytes } = await downloadImage(imgUrl, base);
            saved[p.key] = { dest, ext, bytes, imgUrl };
            console.log(`OK -> ${path.basename(dest)} (${bytes} bytes)`);
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
        const ext = path.extname(srcFile);
        const dest = path.join(outDir, `2026-06-${dst}${ext}`);
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
