/**
 * After `vite build`, strip heavy / unused media from dist before `cap sync`.
 * Native app loads those paths from https://www.smartlineman.in instead.
 * A small first-paint kit stays packed for smooth cold start.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distRoot = path.resolve(root, 'dist');
const publicRoot = path.resolve(root, 'public');

const REMOVE_PATHS = [
  'images',
  'audio',
  'prizes',
  'icons',
  'quiz_management',
  'downloads',
  'download',
  'assets/3d_icons',
  'assets/covers',
  'assets/emotional',
  'assets/safety',
  'assets/share_linked_image',
  'assets/sponsor',
  'assets/supplementary',
  'quizzes/faq_images',
  'quizzes/images',
];

/** Packed into APK for instant first paint (PageLoader + login + brand). */
const KEEP_PACKED = [
  'images/loader/helmet.webp',
  'images/loader/goggles.webp',
  'images/loader/gloves.webp',
  'images/loader/rubber-gloves.webp',
  'images/loader/vest.webp',
  'images/loader/harness.webp',
  'images/loader/safety-shoes.webp',
  'images/loader/face-shield.webp',
  'images/loader/lanyard.webp',
  'images/loader/ladder.webp',
  'images/loader/rope.webp',
  'images/loader/cones.webp',
  'images/loader/ball-chain.webp',
  'images/loader/link-chain.webp',
  'images/loader/caution-tape.webp',
  'images/celebrations/har-ghar-tiranga.webp',
  'images/celebrations/har-ghar-tiranga-desktop.webp',
  'images/home-tip-lineman-blank-board.webp',
  'assets/emotional/lineman.webp',
  'assets/emotional/child.webp',
  'assets/emotional/wife.webp',
  'assets/emotional/mother.webp',
  'assets/emotional/eyes.webp',
  'icon-192.png',
  'icon-512.png',
  'icon.svg',
  'favicon.ico',
];

function rmDir(target) {
  if (!fs.existsSync(target)) return false;
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}

function ensureCopy(relPosix) {
  const from = path.join(publicRoot, ...relPosix.split('/'));
  const to = path.join(distRoot, ...relPosix.split('/'));
  if (!fs.existsSync(from)) {
    console.warn(`android-slim-dist: missing keep file ${relPosix}`);
    return false;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  return true;
}

function dirSizeMb(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const walk = (p) => {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) walk(full);
      else total += fs.statSync(full).size;
    }
  };
  walk(dir);
  return total / (1024 * 1024);
}

if (!fs.existsSync(distRoot)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const before = dirSizeMb(distRoot);
const removed = [];

for (const rel of REMOVE_PATHS) {
  const target = path.join(distRoot, ...rel.split('/'));
  if (rmDir(target)) removed.push(rel);
}

const kept = [];
for (const rel of KEEP_PACKED) {
  if (ensureCopy(rel)) kept.push(rel);
}

// Drop any stray APK / large binaries accidentally copied into dist
const stripExt = new Set(['.apk', '.aab']);
const walkStrip = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkStrip(full);
    else if (stripExt.has(path.extname(entry.name).toLowerCase())) {
      fs.rmSync(full, { force: true });
      removed.push(path.relative(distRoot, full));
    }
  }
};
walkStrip(distRoot);

const after = dirSizeMb(distRoot);
console.log(`android-slim-dist: removed ${removed.length} paths, kept ${kept.length} first-paint assets`);
removed.forEach((p) => console.log(`  - ${p}`));
console.log(`dist size: ${before.toFixed(1)} MB → ${after.toFixed(1)} MB`);
