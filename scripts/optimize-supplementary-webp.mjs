import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const dir = 'public/assets/supplementary';
const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png'));

let before = 0;
let after = 0;

console.log('Converting life-skill card images to WebP...\n');

for (const f of files) {
  const src = path.join(dir, f);
  const dest = path.join(dir, f.replace(/\.png$/i, '.webp'));
  const beforeSize = fs.statSync(src).size;
  before += beforeSize;

  const tmp = dest + '.tmp';
  await sharp(src)
    .resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toFile(tmp);

  fs.renameSync(tmp, dest);
  const afterSize = fs.statSync(dest).size;
  after += afterSize;

  console.log(
    `${(beforeSize / 1024).toFixed(0).padStart(4)} KB -> ${(afterSize / 1024).toFixed(0).padStart(3)} KB  ${path.basename(dest)}`
  );
}

console.log(
  `\nTotal: ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB (${Math.round((1 - after / before) * 100)}% smaller)`
);
