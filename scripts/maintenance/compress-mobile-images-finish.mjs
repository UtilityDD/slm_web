/**
 * Finish pass: PWA icons, leftover large quiz JPGs, and files Vite had locked.
 * Writes via os.tmpdir() so locked public files can be replaced.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slm-img-'));

async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function replaceWithRetry(tmp, dest, tries = 8) {
    for (let i = 0; i < tries; i += 1) {
        try {
            try { fs.unlinkSync(dest); } catch { /* missing or locked */ }
            fs.copyFileSync(tmp, dest);
            try { fs.unlinkSync(tmp); } catch { /* ignore */ }
            return true;
        } catch {
            await sleep(250 * (i + 1));
        }
    }
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    return false;
}

async function writeWebp(src, dest, { width, height, quality }) {
    const tmp = path.join(tmpDir, `${path.basename(dest)}.${Date.now()}.tmp`);
    await sharp(src)
        .rotate()
        .resize({ width, height, fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 6 })
        .toFile(tmp);
    return replaceWithRetry(tmp, dest);
}

async function writePng(src, dest, { width, height }) {
    const tmp = path.join(tmpDir, `${path.basename(dest)}.${Date.now()}.tmp`);
    await sharp(src)
        .rotate()
        .resize(width, height, { fit: 'cover' })
        .png({ compressionLevel: 9, effort: 7 })
        .toFile(tmp);
    return replaceWithRetry(tmp, dest);
}

async function writeJpeg(src, dest, { width, height, quality }) {
    const tmp = path.join(tmpDir, `${path.basename(dest)}.${Date.now()}.tmp`);
    await sharp(src)
        .rotate()
        .resize({ width, height, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toFile(tmp);
    return replaceWithRetry(tmp, dest);
}

async function convertPngToWebp(abs) {
    const dest = abs.replace(/\.png$/i, '.webp');
    const before = fs.statSync(abs).size;
    const ok = await writeWebp(abs, dest, { width: 1080, height: 1600, quality: 76 });
    if (!ok) {
        console.log('LOCK', path.relative(root, abs));
        return null;
    }
    if (path.resolve(abs) !== path.resolve(dest) && fs.existsSync(abs)) {
        try { fs.unlinkSync(abs); } catch { /* ignore */ }
    }
    const after = fs.statSync(dest).size;
    console.log(`${(before / 1024).toFixed(0)}→${(after / 1024).toFixed(0)} KB  ${path.relative(root, abs)} → webp`);
    return {
        from: `/${path.relative(path.join(root, 'public'), abs).split(path.sep).join('/')}`,
        to: `/${path.relative(path.join(root, 'public'), dest).split(path.sep).join('/')}`,
    };
}

function rewrite(replacements) {
    const file = path.join(root, 'src', 'data', 'practicalFieldChapters.js');
    let text = fs.readFileSync(file, 'utf8');
    for (const { from, to } of replacements) {
        if (from !== to) text = text.split(from).join(to);
    }
    fs.writeFileSync(file, text, 'utf8');
}

async function main() {
    const replacements = [];

    const icon192 = path.join(root, 'public', 'icon-192.png');
    const icon512 = path.join(root, 'public', 'icon-512.png');
    if (fs.existsSync(icon192)) {
        const b = fs.statSync(icon192).size;
        const ok = await writePng(icon192, icon192, { width: 192, height: 192 });
        console.log(ok ? `icon-192 ${(b / 1024).toFixed(0)}→${(fs.statSync(icon192).size / 1024).toFixed(0)} KB` : 'LOCK icon-192');
    }
    if (fs.existsSync(icon512)) {
        const b = fs.statSync(icon512).size;
        const ok = await writePng(icon512, icon512, { width: 512, height: 512 });
        console.log(ok ? `icon-512 ${(b / 1024).toFixed(0)}→${(fs.statSync(icon512).size / 1024).toFixed(0)} KB` : 'LOCK icon-512');
    }

    const leftoverPng = [
        'public/images/plate_earthing/fig1_plate_prep.png',
        'public/images/cable_laying/fig_2_25_combination_pliers.png',
        'public/images/cable_laying/fig_2_27_pipe_wrench.png',
        'public/images/cable_laying/fig_2_28_measuring_tape.png',
        'public/images/cable_laying/fig_2_29_hammer.png',
        'public/images/cable_laying/fig_2_30_hand_drill.png',
        'public/images/cable_laying/fig_2_31_electric_drill.png',
        'public/images/cable_laying/fig_2_34_tripod.png',
        'public/images/cable_laying/fig_2_35_come_along_clamp.png',
        'public/images/cable_laying/fig_2_36_ratchet_device.png',
    ];
    for (const rel of leftoverPng) {
        const abs = path.join(root, rel);
        if (!fs.existsSync(abs)) continue;
        const mapped = await convertPngToWebp(abs);
        if (mapped) replacements.push(mapped);
    }
    if (replacements.length) rewrite(replacements);

    const quizDir = path.join(root, 'public', 'images', 'quizzes');
    for (const name of fs.readdirSync(quizDir)) {
        if (!/^img_.*\.jpe?g$/i.test(name)) continue;
        const abs = path.join(quizDir, name);
        const st = fs.statSync(abs);
        let meta;
        try { meta = await sharp(abs).metadata(); } catch { continue; }
        const long = Math.max(meta.width || 0, meta.height || 0);
        if (st.size < 100 * 1024 && long <= 720) continue;
        const before = st.size;
        const ok = await writeJpeg(abs, abs, { width: 720, height: 720, quality: 78 });
        if (!ok) {
            console.log('LOCK', name);
            continue;
        }
        console.log(`${(before / 1024).toFixed(0)}→${(fs.statSync(abs).size / 1024).toFixed(0)} KB  ${name}`);
    }

    const lockedLikely = [
        ['public/assets/covers/lesson-cover-smartlineman.webp', 768, 1024, 80],
        ['public/assets/emotional/eyes.webp', 768, 768, 80],
        ['public/assets/emotional/lineman.webp', 768, 768, 80],
        ['public/assets/emotional/mother.webp', 768, 768, 80],
        ['public/assets/emotional/child.webp', 768, 768, 80],
        ['public/assets/emotional/wife.webp', 768, 768, 80],
        ['public/assets/safety/Bamboo_Ladder.webp', 960, 960, 72],
        ['public/assets/safety/boots.webp', 960, 960, 72],
        ['public/assets/safety/gloves.webp', 960, 960, 72],
    ];
    for (const [rel, w, h, q] of lockedLikely) {
        const abs = path.join(root, rel);
        if (!fs.existsSync(abs)) continue;
        const before = fs.statSync(abs).size;
        if (before < 80 * 1024) continue;
        const ok = await writeWebp(abs, abs, { width: w, height: h, quality: q });
        console.log(ok
            ? `${(before / 1024).toFixed(0)}→${(fs.statSync(abs).size / 1024).toFixed(0)} KB  ${rel}`
            : `LOCK ${rel}`);
    }

    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
