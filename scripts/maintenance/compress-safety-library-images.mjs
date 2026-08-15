/**
 * Compress Safety Library images for mobile viewing.
 * - Product photos: max 960px, WebP q72
 * - Charts / teaching graphics: max 1080×1600, WebP q76
 * PNGs are converted to WebP; catalog paths are rewritten.
 *
 * Usage: node scripts/maintenance/compress-safety-library-images.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const safetyRoot = path.join(root, 'public', 'assets', 'safety');
const catalogPath = path.join(root, 'src', 'data', 'safetyLibraryItems.js');

const PRODUCT = { width: 960, height: 960, quality: 72 };
const CHART = { width: 1080, height: 1600, quality: 76 };
const IMAGE_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg']);

function walk(dir, acc = []) {
    if (!fs.existsSync(dir)) return acc;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, acc);
        else acc.push(full);
    }
    return acc;
}

function isChartPath(relPosix) {
    return (
        relPosix.includes('/library/charts/') ||
        relPosix.includes('/ppe-sources/')
    );
}

function publicPathFromAbs(abs) {
    return `/${path.relative(path.join(root, 'public'), abs).split(path.sep).join('/')}`;
}

async function compressFile(abs) {
    const ext = path.extname(abs).toLowerCase();
    if (!IMAGE_EXT.has(ext)) return null;

    const relPosix = publicPathFromAbs(abs);
    const preset = isChartPath(relPosix) ? CHART : PRODUCT;
    const destWebp = abs.replace(/\.(png|jpe?g|webp)$/i, '.webp');
    const tmp = `${destWebp}.tmp`;

    const before = fs.statSync(abs).size;
    const meta = await sharp(abs).rotate().metadata();
    const srcW = meta.width || 0;
    const srcH = meta.height || 0;

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

    const after = fs.statSync(tmp).size;
    if (after >= before * 0.97 && ext === '.webp') {
        fs.unlinkSync(tmp);
        return {
            skipped: true,
            abs,
            from: relPosix,
            to: relPosix,
            before,
            after: before,
            srcW,
            srcH,
        };
    }

    fs.renameSync(tmp, destWebp);
    if (path.resolve(abs) !== path.resolve(destWebp) && fs.existsSync(abs)) {
        fs.unlinkSync(abs);
    }

    const outMeta = await sharp(destWebp).metadata();
    return {
        skipped: false,
        abs: destWebp,
        from: relPosix,
        to: publicPathFromAbs(destWebp),
        before,
        after,
        srcW,
        srcH,
        outW: outMeta.width,
        outH: outMeta.height,
    };
}

function rewriteCatalog(replacements) {
    let text = fs.readFileSync(catalogPath, 'utf8');
    for (const { from, to } of replacements) {
        if (from === to) continue;
        text = text.split(from).join(to);
    }
    fs.writeFileSync(catalogPath, text, 'utf8');
}

function rewriteOtherFiles(replacements) {
    const extras = [
        path.join(root, 'scripts', 'rebuild-ppe-thumbs.mjs'),
        path.join(root, 'scripts', 'maintenance', 'snapshot-safety-library.mjs'),
        path.join(root, 'public', 'assets', 'safety', 'safety_library_update_guide.txt'),
    ];
    for (const file of extras) {
        if (!fs.existsSync(file)) continue;
        let text = fs.readFileSync(file, 'utf8');
        let changed = false;
        for (const { from, to } of replacements) {
            if (from === to) continue;
            const next = text.split(from).join(to);
            const fromPublic = from.replace(/^\//, 'public/');
            const toPublic = to.replace(/^\//, 'public/');
            const next2 = next.split(fromPublic).join(toPublic);
            if (next2 !== text) {
                text = next2;
                changed = true;
            }
        }
        if (changed) fs.writeFileSync(file, text, 'utf8');
    }
}

async function main() {
    const files = walk(safetyRoot).filter((f) => {
        const ext = path.extname(f).toLowerCase();
        if (!IMAGE_EXT.has(ext)) return false;
        const rel = publicPathFromAbs(f);
        return (
            rel.startsWith('/assets/safety/library/') ||
            rel.startsWith('/assets/safety/ppe-sources/') ||
            [
                '/assets/safety/raincoat.png',
                '/assets/safety/torch.png',
                '/assets/safety/safety_belt.png',
                '/assets/safety/discharge_rod.png',
            ].includes(rel)
        );
    });

    let beforeTotal = 0;
    let afterTotal = 0;
    const replacements = [];

    for (const abs of files) {
        const result = await compressFile(abs);
        if (!result) continue;
        beforeTotal += result.before;
        afterTotal += result.after;
        replacements.push({ from: result.from, to: result.to });
        const tag = result.skipped ? 'keep' : 'webp';
        const dim = result.outW ? `${result.outW}x${result.outH}` : `${result.srcW}x${result.srcH}`;
        console.log(
            `${tag.padEnd(4)} ${(result.before / 1024).toFixed(0).padStart(5)}→${(result.after / 1024).toFixed(0).padStart(4)} KB  ${dim.padStart(11)}  ${result.to}`
        );
    }

    rewriteCatalog(replacements);
    rewriteOtherFiles(replacements);

    console.log(
        `\nTotal: ${(beforeTotal / 1024 / 1024).toFixed(2)} MB → ${(afterTotal / 1024 / 1024).toFixed(2)} MB (${Math.round((1 - afterTotal / Math.max(beforeTotal, 1)) * 100)}% smaller)`
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
