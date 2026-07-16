import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const assets = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'd-Dipankar-MyCodes-AndroidProjects-slm-web',
  'assets'
);
const outDir = path.join(root, 'public', 'images', 'quizzes');

const files = [
  'mistake_no_helmet',
  'mistake_damaged_gloves',
  'mistake_cracked_helmet',
  'mistake_no_earthing',
  'mistake_under_load',
  'mistake_no_goggles',
  'mistake_waist_belt_only',
  'mistake_phone_on_pole',
  'mistake_no_barrier',
  'mistake_no_voltage_test',
  'mistake_frayed_rope',
  'mistake_slippers',
  'mistake_two_on_ladder',
  'mistake_no_arc_shield',
  'mistake_not_tied_off',
  'mistake_non_insulated_pliers',
  'mistake_bamboo_ladder',
  'mistake_working_alone',
  'mistake_wet_gloves',
  'mistake_top_rungs',
];

for (const name of files) {
  const src = path.join(assets, `${name}.png`);
  const dest = path.join(outDir, `${name}.webp`);
  if (!fs.existsSync(src)) {
    console.error('MISSING', src);
    continue;
  }
  await sharp(src)
    .resize(720, 720, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72, effort: 6 })
    .toFile(dest);
  const kb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`${name}.webp ${kb}KB`);
}
