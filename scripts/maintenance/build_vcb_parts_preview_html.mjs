/**
 * Build HTML review for visual_quiz_batch_vcb_parts_preview.csv
 * Usage: node scripts/maintenance/build_vcb_parts_preview_html.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCSV } from './visualQuizSheetUtils.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const inputPath = path.join(root, 'quiz_management', 'visual_quiz_batch_vcb_parts_preview.csv');
const outPaths = [
  path.join(root, 'quiz_management', 'visual_quiz_vcb_parts_preview.html'),
  path.join(root, 'public', 'quiz_management', 'visual_quiz_vcb_parts_preview.html'),
];

const { rows } = parseCSV(fs.readFileSync(inputPath, 'utf8'));
const questions = rows
  .map((row) => {
    const options = [row.option_1, row.option_2, row.option_3, row.option_4].map((o) => String(o || '').trim());
    const correct = Number.parseInt(row.correct_index, 10);
    if (!row.id || !Number.isInteger(correct)) return null;
    return { ...row, options, correct_option_index: correct };
  })
  .filter(Boolean);

const esc = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');

const imgSrc = (ref) => {
  const t = String(ref || '').trim();
  if (!t) return '';
  if (t.startsWith('http') || t.startsWith('/')) return t;
  return `/images/quizzes/${t}`;
};

const isImageOpt = (opt) => /\.(webp|png|jpe?g|gif)$/i.test(String(opt || '').trim());

const cards = questions
  .map((q) => {
    const img = q.question_image_url
      ? `<img src="${esc(imgSrc(q.question_image_url))}" alt="" onerror="this.insertAdjacentHTML('afterend','<p class=broken>Missing: ${esc(q.question_image_url)}</p>');this.remove();" />`
      : '';
    const opts = q.options
      .map((opt, i) => {
        const cls = i === q.correct_option_index ? 'opt ok' : 'opt';
        const label = String.fromCharCode(65 + i);
        const mark = i === q.correct_option_index ? ' <em>✓ সঠিক</em>' : '';
        if (isImageOpt(opt)) {
          return `<div class="${cls}"><strong>${label}.</strong>${mark}<br/><img src="${esc(imgSrc(opt))}" alt="" onerror="this.insertAdjacentHTML('afterend','<p class=broken>Missing: ${esc(opt)}</p>');this.remove();" /></div>`;
        }
        return `<div class="${cls}"><strong>${label}.</strong> ${esc(opt)}${mark}</div>`;
      })
      .join('');
    return `
    <article class="card" id="${esc(q.id)}">
      <div class="meta">
        <span class="tag">${esc(q.id)}</span>
        <span class="tag">${esc(q.question_type || '')}</span>
        <span class="tag">${esc(q.category)}</span>
        <span class="tag warn">DRAFT — VCB 11kV indoor</span>
      </div>
      ${img}
      <h2>${esc(q.question_text)}</h2>
      ${opts}
      <p class="hint">💡 ${esc(q.hint)}</p>
    </article>`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VCB 11kV indoor parts quiz review — ${questions.length} questions</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    header { padding: 1rem 1.25rem; background: #fff; border-bottom: 2px solid #0f172a; position: sticky; top: 0; z-index: 5; }
    header p { margin: 0.35rem 0 0; color: #475569; font-size: 0.9rem; }
    nav { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.75rem; }
    nav a { font-size: 0.7rem; padding: 0.2rem 0.4rem; border: 1px solid #cbd5e1; background: #f8fafc; color: #0f172a; text-decoration: none; }
    main { max-width: 960px; margin: 0 auto; padding: 1rem; }
    .card { background: #fff; border: 2px solid #0f172a; box-shadow: 4px 4px 0 #0f172a; padding: 1rem; margin-bottom: 1rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.75rem; margin-bottom: 0.75rem; }
    .tag { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 0.15rem 0.4rem; }
    .warn { background: #e0f2fe; border-color: #0284c7; color: #075985; }
    img { max-width: 100%; max-height: 320px; object-fit: contain; background: #f1f5f9; border: 1px solid #e2e8f0; }
    .opt { border: 1px solid #cbd5e1; padding: 0.5rem; margin: 0.35rem 0; }
    .ok { border-color: #15803d; background: #f0fdf4; }
    .hint { font-size: 0.9rem; color: #92400e; background: #fffbeb; padding: 0.5rem; margin-top: 0.5rem; }
    .broken { color: #b91c1c; font-size: 0.75rem; word-break: break-all; }
  </style>
</head>
<body>
  <header>
    <h1>VCB 11kV indoor parts — manual review</h1>
    <p>Source: <code>visual_quiz_batch_vcb_parts_preview.csv</code> · <strong>${questions.length}</strong> questions · Draft only.</p>
    <p>Open: <code>http://localhost:5173/quiz_management/visual_quiz_vcb_parts_preview.html</code></p>
    <nav>
      ${questions.map((q) => `<a href="#${esc(q.id)}">${esc(q.id.replace('vq-vcb-', ''))}</a>`).join('')}
    </nav>
  </header>
  <main>
${cards}
  </main>
</body>
</html>
`;

for (const out of outPaths) {
  fs.writeFileSync(out, html, 'utf8');
  console.log('Wrote', path.relative(root, out));
}

fs.copyFileSync(
  inputPath,
  path.join(root, 'public', 'quiz_management', 'visual_quiz_batch_vcb_parts_preview.csv')
);
console.log('Synced CSV to public/quiz_management/');
