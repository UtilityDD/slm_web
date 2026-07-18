/**
 * Convert ladder preview PNGs → WebP and build HTML review.
 * Usage: node scripts/maintenance/build_ladder_preview.mjs
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
const csvPath = path.join(root, 'quiz_management', 'visual_quiz_batch_ladder_preview.csv');

const images = [
  'ladder_01_no_three_point',
  'ladder_02_metal_near_line',
  'ladder_03_damaged_rung',
  'ladder_04_wrong_angle',
  'ladder_05_top_rung_no_tie',
];

for (const name of images) {
  const source = path.join(assets, `${name}.png`);
  const output = path.join(imageDir, `${name}.webp`);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing generated image: ${source}`);
  }
  await sharp(source)
    .resize(720, 720, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72, effort: 6 })
    .toFile(output);
  console.log(`${name}.webp ${Math.round(fs.statSync(output).size / 1024)}KB`);
}

const { rows } = parseCSV(fs.readFileSync(csvPath, 'utf8'));
const questions = rows
  .map((row) => {
    const options = [row.option_1, row.option_2, row.option_3, row.option_4].map((o) =>
      String(o || '').trim()
    );
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
        <span class="draft">DRAFT — ladder</span>
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
  <title>Ladder quiz review — ${questions.length} questions</title>
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
    .meta .draft { background: #fef3c7; border-color: #d97706; color: #92400e; }
    img { width: 100%; max-height: 430px; object-fit: contain; background: #fffbeb; border: 1px solid #e2e8f0; }
    .option { margin: .35rem 0; padding: .55rem; border: 1px solid #cbd5e1; }
    .correct { background: #f0fdf4; border-color: #15803d; }
    .hint { margin-bottom: 0; padding: .55rem; background: #fffbeb; color: #92400e; }
  </style>
</head>
<body>
  <header>
    <h1>Ladder use — manual review</h1>
    <p><strong>${questions.length}</strong> questions · 3-point / material / quality · draft only</p>
    <nav>${questions.map((q) => `<a href="#${escapeHtml(q.id)}">${escapeHtml(q.id.replace('vq-ladder-', ''))}</a>`).join('')}</nav>
  </header>
  <main>${cards}</main>
</body>
</html>
`;

const outputs = [
  path.join(root, 'quiz_management', 'visual_quiz_ladder_preview.html'),
  path.join(root, 'public', 'quiz_management', 'visual_quiz_ladder_preview.html'),
];
for (const output of outputs) {
  fs.writeFileSync(output, html, 'utf8');
  console.log('Wrote', path.relative(root, output));
}
fs.copyFileSync(csvPath, path.join(root, 'public', 'quiz_management', 'visual_quiz_batch_ladder_preview.csv'));
console.log('Synced CSV');
