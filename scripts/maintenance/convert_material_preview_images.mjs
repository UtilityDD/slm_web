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
  'mat_pin_insulator',
  'mat_disc_insulator',
  'mat_shackle_insulator',
  'mat_helmet',
  'mat_harness',
  'mat_elec_gloves',
  'mat_clamp_meter',
  'mat_megger',
  'mat_frp_ladder',
  'mat_ipc',
  'mat_guy_insulator',
  'mat_acsr',
  'mat_earth_tester',
  'mat_discharge_rod',
  'mat_crimping_tool',
  'mat_phase_sequence',
  'mat_arc_shield',
  'mat_wire_grip',
  'mat_suspension_clamp',
  'mat_hv_detector',
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
  console.log(`${name}.webp ${Math.round(fs.statSync(dest).size / 1024)}KB`);
}
