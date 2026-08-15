/**
 * Compress oversized app images for mobile viewing.
 * - Keeps img_{driveId}.jpg filenames (visual quiz local map)
 * - Converts other PNG/JPEG to WebP and rewrites repo references
 * - Skips already-optimized Safety Library snapshots and PWA icons
 *
 * Usage: node scripts/maintenance/compress-mobile-images.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const publicRoot = path.join(root, 'public');

const SKIP_DIR_NAMES = new Set(['downloads', 'node_modules', 'dist']);
const SKIP_REL = new Set([
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.ico',
    '/icon.svg',
]);
const SKIP_PREFIXES = [
    '/assets/safety/library/',
    '/assets/safety/ppe-sources/',
];
const IMAGE_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg']);

const PRESETS = [
    { prefix: '/images/quizzes/', width: 720, height: 720, quality: 72 },
    { prefix: '/images/loader/', width: 768, height: 1024, quality: 84 },
    { prefix: '/images/substation/', width: 1080, height: 1600, quality: 76 },
    { prefix: '/images/cable_laying/', width: 1080, height: 1600, quality: 76 },
    { prefix: '/images/earthing/', width: 1080, height: 1600, quality: 76 },
    { prefix: '/images/guarding/', width: 1080, height: 1600, quality: 76 },
    { prefix: '/images/plate_earthing/', width: 1080, height: 1600, quality: 76 },
    { prefix: '/images/sponsor/', width: 720, height: 1080, quality: 72 },
    { prefix: '/images/ppe-thumbs/', width: 512, height: 512, quality: 82 },
    { prefix: '/quizzes/faq_images/', width: 768, height: 768, quality: 76 },
    { prefix: '/assets/3d_icons/', width: 384, height: 384, quality: 78 },
    { prefix: '/icons/', width: 384, height: 384, quality: 78 },
    { prefix: '/prizes/', width: 720, height: 720, quality: 72 },
    { prefix: '/assets/emotional/', width: 768, height: 768, quality: 80 },
    { prefix: '/assets/covers/', width: 768, height: 1024, quality: 80 },
    { prefix: '/assets/supplementary/', width: 768, height: 768, quality: 78 },
    { prefix: '/assets/safety/', width: 960, height: 960, quality: 72 },
    { prefix: '/assets/sponsor/', width: 480, height: 480, quality: 78 },
];
const DEFAULT_PRESET = { width: 960, height: 960, quality: 72 };
const MIN_SAVE = 0.92;
const SKIP_IF_UNDER_KB = 48;

function walk(dir, acc = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIR_NAMES.has(entry.name)) continue;
            walk(full, acc);
        } else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) {
            acc.push(full);
        }
    }
    return acc;
}

function publicPath(abs) {
    return `/${path.relative(publicRoot, abs).split(path.sep).join('/')}`;
}

function presetFor(rel) {
    return PRESETS.find((p) => rel.startsWith(p.prefix)) || DEFAULT_PRESET;
}

function shouldSkip(rel) {
    if (SKIP_REL.has(rel)) return true;
    return SKIP_PREFIXES.some((p) => rel.startsWith(p));
}

function keepOriginalName(rel, ext) {
    if (/\/img_[a-zA-Z0-9_-]+\.jpe?g$/i.test(rel)) return true;
    if (rel === '/icons/logo.png') return true;
    if (ext === '.webp') return true;
    return false;
}

async function encodeWebp(abs, dest, preset) {
    const tmp = `${dest}.tmp`;
    await sharp(abs)
        .rotate()
        .resize({
            width: preset.width,
            height: preset.height,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .webp({ quality: preset.quality, effort: 6 })
        .toFile(tmp);
    return tmp;
}

async function encodeJpeg(abs, dest, preset) {
    const tmp = `${dest}.tmp`;
    await sharp(abs)
        .rotate()
        .resize({
            width: preset.width,
            height: preset.height,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .jpeg({ quality: Math.min(82, preset.quality + 6), mozjpeg: true })
        .toFile(tmp);
    return tmp;
}

async function encodePng(abs, dest, preset) {
    const tmp = `${dest}.tmp`;
    await sharp(abs)
        .rotate()
        .resize({
            width: preset.width,
            height: preset.height,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .png({ compressionLevel: 9, effort: 7 })
        .toFile(tmp);
    return tmp;
}

function rewriteRepoPaths(replacements) {
    const roots = [
        path.join(root, 'src'),
        path.join(root, 'public', 'data'),
        path.join(root, 'public', 'quizzes'),
        path.join(root, 'scripts'),
        path.join(root, 'docs'),
    ];
    const TEXT_EXT = new Set(['.js', '.jsx', '.json', '.md', '.txt', '.html', '.css']);
    const files = [];
    const walkText = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walkText(full);
            else if (TEXT_EXT.has(path.extname(entry.name).toLowerCase())) files.push(full);
        }
    };
    roots.forEach(walkText);

    for (const file of files) {
        let text = fs.readFileSync(file, 'utf8');
        let changed = false;
        for (const { from, to } of replacements) {
            if (from === to) continue;
            if (text.includes(from)) {
                text = text.split(from).join(to);
                changed = true;
            }
        }
        if (changed) fs.writeFileSync(file, text, 'utf8');
    }
}

async function main() {
    const files = walk(publicRoot).filter((abs) => !shouldSkip(publicPath(abs)));
    const replacements = [];
    let beforeTotal = 0;
    let afterTotal = 0;
    let converted = 0;
    let skipped = 0;

    for (const abs of files) {
        const rel = publicPath(abs);
        const ext = path.extname(abs).toLowerCase();
        const before = fs.statSync(abs).size;
        let meta;
        try {
            meta = await sharp(abs).metadata();
        } catch {
            skipped += 1;
            continue;
        }
        const long = Math.max(meta.width || 0, meta.height || 0);
        const preset = presetFor(rel);
        const alreadySmall =
            before <= SKIP_IF_UNDER_KB * 1024 &&
            long <= Math.max(preset.width, preset.height) + 8;
        if (alreadySmall) {
            skipped += 1;
            continue;
        }

        const keepName = keepOriginalName(rel, ext);
        const destExt = keepName ? ext : '.webp';
        const dest = keepName ? abs : abs.replace(/\.(png|jpe?g|webp)$/i, destExt);

        let tmp;
        try {
            if (keepName && (ext === '.jpg' || ext === '.jpeg')) tmp = await encodeJpeg(abs, dest, preset);
            else if (keepName && ext === '.png') tmp = await encodePng(abs, dest, preset);
            else tmp = await encodeWebp(abs, dest, preset);
        } catch (err) {
            console.log('FAIL', rel, err.message);
            skipped += 1;
            continue;
        }

        const after = fs.statSync(tmp).size;
        if (after >= before * MIN_SAVE && path.resolve(dest) === path.resolve(abs)) {
            fs.unlinkSync(tmp);
            skipped += 1;
            continue;
        }

        try {
            if (fs.existsSync(dest) && path.resolve(abs) === path.resolve(dest)) {
                try {
                    fs.unlinkSync(dest);
                } catch {
                    /* dest may be locked; try overwrite copy */
                }
            }
            try {
                fs.renameSync(tmp, dest);
            } catch {
                fs.copyFileSync(tmp, dest);
                try { fs.unlinkSync(tmp); } catch { /* ignore */ }
            }
        } catch (err) {
            try { fs.unlinkSync(tmp); } catch { /* ignore */ }
            console.log('LOCK', rel, err.message);
            skipped += 1;
            continue;
        }

        if (path.resolve(abs) !== path.resolve(dest) && fs.existsSync(abs)) {
            try { fs.unlinkSync(abs); } catch { /* original still in use */ }
        }

        const from = rel;
        const to = publicPath(dest);
        replacements.push({ from, to });
        beforeTotal += before;
        afterTotal += after;
        converted += 1;
        console.log(
            `${(before / 1024).toFixed(0).padStart(5)}→${(after / 1024).toFixed(0).padStart(4)} KB  ${from}${from === to ? '' : ` → ${path.basename(to)}`}`
        );
    }

    rewriteRepoPaths(replacements.filter((r) => r.from !== r.to));

    console.log(
        `\nconverted=${converted} skipped=${skipped}  ${(beforeTotal / 1024 / 1024).toFixed(2)} MB → ${(afterTotal / 1024 / 1024).toFixed(2)} MB (${Math.round((1 - afterTotal / Math.max(beforeTotal, 1)) * 100)}% smaller on processed files)`
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
