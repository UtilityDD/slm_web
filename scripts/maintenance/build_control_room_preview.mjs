/**
 * Convert control-room preview PNGs to WebP and build the HTML review page.
 * Usage: node scripts/maintenance/build_control_room_preview.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { parseCSV } from './visualQuizSheetUtils.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const assets = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'd-Dipankar-MyCodes-AndroidProjects-slm-web',
  'assets'
);
const imageDir = path.join(root, 'public', 'images', 'quizzes');
const csvPath = path.join(
  root,
  'quiz_management',
  'visual_quiz_batch_control_room_preview.csv'
);

const images = [
  ['ctrl_01_wrong_panel_v2', 'ctrl_01_wrong_panel'],
  ['sample_control_room_earth_still_on_v2', 'ctrl_02_earth_still_on'],
  ['ctrl_03_no_handover_v2', 'ctrl_03_no_handover'],
  ['ctrl_04_alarm_before_flag', 'ctrl_04_alarm_before_flag'],
  ['ctrl_05_control_fuse_missing', 'ctrl_05_control_fuse_missing'],
  ['ctrl_06_dc_supply_low', 'ctrl_06_dc_supply_low'],
  ['ctrl_07_permit_not_returned', 'ctrl_07_permit_not_returned'],
  ['ctrl_08_instruction_not_logged', 'ctrl_08_instruction_not_logged'],
  ['ctrl_09_indication_mismatch_v2', 'ctrl_09_indication_mismatch'],
  ['ctrl_10_relay_reset_early', 'ctrl_10_relay_reset_early'],
  ['ctrl_11_spring_not_charged', 'ctrl_11_spring_not_charged'],
  ['ctrl_12_panel_door_open', 'ctrl_12_panel_door_open'],
  ['ctrl_13_key_left_in_panel', 'ctrl_13_key_left_in_panel'],
  ['ctrl_14_two_instructions', 'ctrl_14_two_instructions'],
  ['ctrl_15_not_all_crews_clear', 'ctrl_15_not_all_crews_clear'],
  ['ctrl_16_test_plug_left_v2', 'ctrl_16_test_plug_left'],
  ['ctrl_17_charger_mcb_off', 'ctrl_17_charger_mcb_off'],
  ['ctrl_18_field_status_mismatch', 'ctrl_18_field_status_mismatch'],
  ['ctrl_19_panel_heater_off', 'ctrl_19_panel_heater_off'],
  ['ctrl_20_trench_cover_open', 'ctrl_20_trench_cover_open'],
];

for (const [sourceName, outputName] of images) {
  const source = path.join(assets, `${sourceName}.png`);
  const output = path.join(imageDir, `${outputName}.webp`);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing generated image: ${source}`);
  }
  await sharp(source)
    .resize(720, 720, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72, effort: 6 })
    .toFile(output);
  console.log(`${outputName}.webp ${Math.round(fs.statSync(output).size / 1024)}KB`);
}

const { rows } = parseCSV(fs.readFileSync(csvPath, 'utf8'));
const questions = rows
  .map((row) => {
    const options = [row.option_1, row.option_2, row.option_3, row.option_4]
      .map((option) => String(option || '').trim());
    const correct = Number.parseInt(row.correct_index, 10);
    if (!row.id || !Number.isInteger(correct)) return null;
    return { ...row, options, correct_option_index: correct };
  })
  .filter(Boolean);

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');

const cards = questions
  .map((question) => {
    const options = question.options
      .map((option, index) => {
        const isCorrect = index === question.correct_option_index;
        return `<div class="option${isCorrect ? ' correct' : ''}"><strong>${String.fromCharCode(65 + index)}.</strong> ${escapeHtml(option)}${isCorrect ? ' <em>✓ সঠিক</em>' : ''}</div>`;
      })
      .join('');

    return `
    <article class="card" id="${escapeHtml(question.id)}">
      <div class="meta">
        <span>${escapeHtml(question.id)}</span>
        <span>${escapeHtml(question.tags)}</span>
        <span class="draft">DRAFT — control room</span>
      </div>
      <img src="/images/quizzes/${escapeHtml(question.question_image_url)}" alt="" />
      <h2>${escapeHtml(question.question_text)}</h2>
      ${options}
      <p class="hint">💡 ${escapeHtml(question.hint)}</p>
    </article>`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Control-room quiz review — ${questions.length} questions</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
    header { position: sticky; top: 0; z-index: 2; padding: 1rem 1.25rem; background: #fff; border-bottom: 2px solid #0f172a; }
    header h1, header p { margin: 0 0 .4rem; }
    nav { display: flex; flex-wrap: wrap; gap: .3rem; }
    nav a { padding: .2rem .4rem; border: 1px solid #cbd5e1; color: inherit; text-decoration: none; font-size: .75rem; }
    main { max-width: 960px; margin: auto; padding: 1rem; }
    .card { margin-bottom: 1rem; padding: 1rem; background: #fff; border: 2px solid #0f172a; box-shadow: 4px 4px 0 #0f172a; }
    .meta { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .75rem; font-size: .72rem; }
    .meta span { padding: .15rem .4rem; background: #f1f5f9; border: 1px solid #cbd5e1; }
    .meta .draft { background: #dbeafe; border-color: #2563eb; color: #1e3a8a; }
    img { width: 100%; max-height: 430px; object-fit: contain; background: #fffbeb; border: 1px solid #e2e8f0; }
    .option { margin: .35rem 0; padding: .55rem; border: 1px solid #cbd5e1; }
    .correct { background: #f0fdf4; border-color: #15803d; }
    .hint { margin-bottom: 0; padding: .55rem; background: #fffbeb; color: #92400e; }
  </style>
</head>
<body>
  <header>
    <h1>Control room — manual review</h1>
    <p><strong>${questions.length}</strong> questions · operator / lineman teamwork · draft only</p>
    <nav>${questions.map((question) => `<a href="#${escapeHtml(question.id)}">${escapeHtml(question.id.replace('vq-ctrl-', ''))}</a>`).join('')}</nav>
  </header>
  <main>${cards}</main>
</body>
</html>
`;

const outputs = [
  path.join(root, 'quiz_management', 'visual_quiz_control_room_preview.html'),
  path.join(root, 'public', 'quiz_management', 'visual_quiz_control_room_preview.html'),
];
for (const output of outputs) {
  fs.writeFileSync(output, html, 'utf8');
  console.log('Wrote', path.relative(root, output));
}
fs.copyFileSync(
  csvPath,
  path.join(root, 'public', 'quiz_management', 'visual_quiz_batch_control_room_preview.csv')
);
console.log('Synced CSV');
