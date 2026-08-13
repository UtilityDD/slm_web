/**
 * Rebuild high-res PPE catalog thumbs (512px webp) from Safety Library /
 * local lesson / clear product photos.
 *
 * Usage: node scripts/rebuild-ppe-thumbs.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const thumbDir = path.join(root, 'public/images/ppe-thumbs');
fs.mkdirSync(thumbDir, { recursive: true });

const BG = '#fffdf7';
const SIZE = 512;

async function makeThumb(slug, srcRel, opts = {}) {
  const src = path.isAbsolute(srcRel) ? srcRel : path.join(root, srcRel);
  if (!fs.existsSync(src)) {
    console.log('MISSING', srcRel);
    return;
  }
  let pipeline = sharp(src).rotate();
  if (opts.extract) pipeline = pipeline.extract(opts.extract);
  if (opts.trim != null) pipeline = pipeline.trim({ threshold: opts.trim });

  const dest = path.join(thumbDir, `${slug}.webp`);
  await pipeline
    .resize(SIZE, SIZE, {
      fit: 'contain',
      background: BG,
      withoutEnlargement: false,
    })
    .webp({ quality: 92, effort: 5 })
    .toFile(dest);

  const meta = await sharp(dest).metadata();
  const kb = (fs.statSync(dest).size / 1024).toFixed(1);
  console.log(`✓ ${slug}.webp  ${meta.width}x${meta.height}  ${kb}KB  ← ${path.relative(root, src)}`);
}

async function main() {
  const map = [
    // Safety Library / local product shots
    ['insulated-gloves', 'public/assets/safety/gloves1.webp'],
    ['safety-helmet', 'public/assets/safety/helmet.webp'],
    ['full-body-harness', 'public/assets/safety/Full_Body_Harness1.webp'],
    ['safety-shoes', 'public/assets/safety/boots1.webp'],
    ['discharge-rod', 'public/assets/safety/discharge_rod.png'],
    ['gum-boot', 'public/assets/safety/boots.webp'],
    ['voltage-detector', 'public/assets/safety/tester.webp'],
    ['reflective-jacket', 'public/assets/safety/High_Visibility_Vest_2.webp'],
    ['raincoat', 'public/assets/safety/raincoat.png', { trim: 12 }],
    ['torch', 'public/assets/safety/torch.png', { trim: 10 }],
    // Lesson / FAQ fallbacks
    ['safety-goggles', 'public/images/loader/goggles.webp'],
    ['safety-belt', 'public/assets/safety/safety_belt.png', { trim: 12 }],
  ];

  for (const [slug, src, opts] of map) {
    await makeThumb(slug, src, opts || {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
