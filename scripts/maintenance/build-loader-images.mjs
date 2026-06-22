/**
 * One-off maintenance: crop, resize, and convert safety-item photos for PageLoader.
 * Source: existing quiz JPGs (same assets as visual quizzes — not duplicated in repo logic).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const srcDir = path.join(root, 'public/images/quizzes');
const outDir = path.join(root, 'public/images/loader');

const ITEMS = [
  { src: '../../quizzes/faq_images/Safety_Helmet.webp', out: 'helmet.webp' },
  { src: 'img_1hBHudBeDSB1bkGqX4qTvhEM0F2sHnkcd.jpg', out: 'goggles.webp' },
  { src: 'img_1wq2z9I0Y4vE2eUm1OlDXny_s10KkTmY6.jpg', out: 'gloves.webp' },
  { src: 'img_1MAUYMbUWD91sOWrr2S07vFnLFke6hReM.jpg', out: 'rubber-gloves.webp' },
  { src: 'img_1PygiMYqqr1QClPDVser-ZExOWwbl0btA.jpg', out: 'vest.webp' },
  { src: 'img_13w1fWNGZg5UQXWuZxEyF6hk3IwncdefC.jpg', out: 'harness.webp' },
  { src: 'img_1ySsN6GFO8Rm-9M6jW1alVi_IgIzp5E9b.jpg', out: 'safety-shoes.webp' },
  { src: 'img_1NU5KJYvyGcXpdFFB-FkVj5MmOWcMwRsb.jpg', out: 'face-shield.webp' },
  { src: 'img_1bMetcuEvRyPg7mq7aZua_bKrtpPoUt5a.jpg', out: 'lanyard.webp' },
  { src: 'img_1GHcG6C5lMGNcG0PuWjEZwD883g6GiWr5.jpg', out: 'ladder.webp' },
  { src: 'img_1A3FquGBwOyJm0bB0tQiiOUYZImaFR3jC.jpg', out: 'rope.webp' },
  { src: 'img_1xXsWEVB2mkhYZqwN-hC-XZaGlYheSGdH.jpg', out: 'cones.webp' },
  { src: 'img_13CDnu-6m778I9EERIIeN4ph2noFSEr2U.jpg', out: 'ball-chain.webp' },
  { src: 'img_1eGaUNv_BadZ1bz_xaksCBIDXEZ2xQqJ4.jpg', out: 'link-chain.webp' },
  { src: 'img_1QnkOm0ImKOGOSdydswUmfbCntb8ilRde.jpg', out: 'caution-tape.webp' },
];

fs.mkdirSync(outDir, { recursive: true });

let totalBytes = 0;

for (const { src, out } of ITEMS) {
  const input = path.join(srcDir, src);
  const output = path.join(outDir, out);

  if (!fs.existsSync(input)) {
    console.warn(`Skip missing source: ${src}`);
    continue;
  }

  await sharp(input)
    .trim({ threshold: 20 })
    .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 78, effort: 4 })
    .toFile(output);

  const kb = fs.statSync(output).size;
  totalBytes += kb;
  console.log(`${out}: ${(kb / 1024).toFixed(1)} KB`);
}

console.log(`\nTotal: ${(totalBytes / 1024).toFixed(1)} KB (${ITEMS.length} images)`);
