/**
 * Report public images with no reference in src/public/scripts/docs.
 * Conservative: img_{driveId} quiz files and PWA icons are treated as used.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const publicRoot = path.join(root, 'public');
const IMAGE_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.avif']);
const TEXT_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.csv', '.html', '.css', '.md', '.txt', '.xml', '.webmanifest']);
const SKIP_DIR = new Set(['node_modules', 'dist', 'android', '.git', 'downloads']);

function walkFiles(dir, acc = [], filter) {
    if (!fs.existsSync(dir)) return acc;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIR.has(entry.name)) continue;
            walkFiles(full, acc, filter);
        } else if (!filter || filter(full, entry.name)) acc.push(full);
    }
    return acc;
}

function publicPath(abs) {
    return `/${path.relative(publicRoot, abs).split(path.sep).join('/')}`;
}

function collectHaystack() {
    const dirs = [
        path.join(root, 'src'),
        path.join(root, 'public'),
        path.join(root, 'scripts'),
        path.join(root, 'docs'),
        path.join(root, 'index.html'),
    ];
    let text = '';
    const add = (file) => {
        if (!TEXT_EXT.has(path.extname(file).toLowerCase()) && path.basename(file) !== 'index.html') return;
        try {
            text += `\n${fs.readFileSync(file, 'utf8')}`;
        } catch { /* binary */ }
    };
    for (const d of dirs) {
        if (fs.statSync(d).isFile()) add(d);
        else walkFiles(d).forEach(add);
    }
    return text;
}

function alwaysUsed(rel, name) {
    if (rel === '/favicon.ico' || rel === '/icon.svg' || rel === '/icon-192.png' || rel === '/icon-512.png') return true;
    if (rel.startsWith('/images/quizzes/img_')) return true;
    if (name === 'manifest.webmanifest') return true;
    return false;
}

async function liveQuizNames() {
    const names = new Set();
    try {
        const url =
            'https://docs.google.com/spreadsheets/d/e/2PACX-1vTjxPeFNRSNfOgc80sT-WLmqf0bQqN-YjjSbQoE6i432tL-sK1zg1zHfaQxv4l1YMThgwa1DyreVgCk/pub?gid=160776708&single=true&output=csv';
        const res = await fetch(url);
        if (!res.ok) return names;
        const csv = await res.text();
        const re = /\/images\/quizzes\/([^"'\\s,]+\.(?:webp|png|jpe?g|gif))|([a-zA-Z0-9._-]+\.(?:webp|png|jpe?g|gif))/gi;
        let m;
        while ((m = re.exec(csv))) {
            names.add((m[1] || m[2]).toLowerCase());
        }
        const drive = csv.matchAll(/\/d\/([a-zA-Z0-9_-]+)/g);
        for (const d of drive) names.add(`img_${d[1]}.jpg`.toLowerCase());
    } catch {
        /* offline */
    }
    return names;
}

async function main() {
    const images = walkFiles(publicRoot, [], (full) => IMAGE_EXT.has(path.extname(full).toLowerCase()));
    const hay = collectHaystack();
    const hayLower = hay.toLowerCase();
    const live = await liveQuizNames();

    const unused = [];
    const used = [];
    for (const abs of images) {
        const rel = publicPath(abs);
        const name = path.basename(abs);
        const stem = name.replace(/\.(webp|png|jpe?g|gif|svg|avif)$/i, '');
        const bytes = fs.statSync(abs).size;
        if (alwaysUsed(rel, name)) {
            used.push({ rel, bytes, why: 'always' });
            continue;
        }
        const hits =
            hay.includes(rel) ||
            hay.includes(rel.slice(1)) ||
            hayLower.includes(name.toLowerCase()) ||
            hay.includes(stem) && hay.includes(`/images/`) && rel.includes(stem) ||
            live.has(name.toLowerCase()) ||
            live.has(rel.toLowerCase()) ||
            live.has(`${stem}.webp`) ||
            live.has(`${stem}.png`) ||
            live.has(`${stem}.jpg`);

        // stem-only match is too loose (e.g. "helmet"); require path or exact filename
        const exact =
            hay.includes(rel) ||
            hay.includes(rel.slice(1)) ||
            hayLower.includes(`/${name.toLowerCase()}`) ||
            hayLower.includes(`"${name.toLowerCase()}"`) ||
            hayLower.includes(`'${name.toLowerCase()}'`) ||
            hayLower.includes(`/${stem.toLowerCase()}.`) ||
            live.has(name.toLowerCase()) ||
            live.has(`img_${stem}`.toLowerCase());

        if (exact) used.push({ rel, bytes, why: 'ref' });
        else unused.push({ rel, bytes });
    }

    unused.sort((a, b) => b.bytes - a.bytes);
    const byFolder = {};
    for (const u of unused) {
        const folder = u.rel.split('/').slice(0, 4).join('/');
        if (!byFolder[folder]) byFolder[folder] = { n: 0, b: 0 };
        byFolder[folder].n += 1;
        byFolder[folder].b += u.bytes;
    }

    console.log(`images=${images.length} used=${used.length} unused=${unused.length} unusedMB=${(unused.reduce((s, u) => s + u.bytes, 0) / 1024 / 1024).toFixed(2)}`);
    console.log('\n=== unused by folder ===');
    Object.entries(byFolder)
        .sort((a, b) => b[1].b - a[1].b)
        .forEach(([k, v]) => console.log(`${(v.b / 1024 / 1024).toFixed(2).padStart(6)} MB  n=${String(v.n).padStart(4)}  ${k}`));
    console.log('\n=== unused files (largest first) ===');
    unused.forEach((u) => console.log(`${(u.bytes / 1024).toFixed(0).padStart(6)} KB  ${u.rel}`));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
