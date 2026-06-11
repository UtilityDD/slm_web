/**
 * Generate a standalone HTML preview for visual quiz CSV files.
 *
 * Usage:
 *   node scripts/maintenance/preview_visual_quiz.mjs
 *   node scripts/maintenance/preview_visual_quiz.mjs quiz_management/visual_quiz_batch_02.csv
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCSV } from './visualQuizSheetUtils.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const defaultInput = path.join(root, 'quiz_management', 'visual_quiz_batch_02.csv');
const inputPath = path.resolve(root, process.argv[2] || defaultInput);
const outputPath = path.join(root, 'quiz_management', 'visual_quiz_preview.html');

const isEnabled = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const csvText = fs.readFileSync(inputPath, 'utf8');
const { rows } = parseCSV(csvText);
const questions = rows
    .map((row) => {
        const q = {
            id: row.id,
            question_type: row.question_type,
            question_text: row.question_text,
            question_image_url: row.question_image_url,
            option_1: row.option_1,
            option_2: row.option_2,
            option_3: row.option_3,
            option_4: row.option_4,
            correct_index: row.correct_index,
            category: row.category,
            hint: row.hint,
            enabled: isEnabled(row.enabled),
        };
        const options = [q.option_1, q.option_2, q.option_3, q.option_4].map((o) => String(o || '').trim());
        const correct = Number.parseInt(q.correct_index, 10);
        if (!q.id || !Number.isInteger(correct)) return null;
        return { ...q, options, correct_option_index: correct };
    })
    .filter(Boolean);

const imgSrc = (ref) => {
    const t = String(ref || '').trim();
    if (!t) return '';
    if (t.startsWith('http')) return t;
    if (t.startsWith('/')) return t;
    return `/images/quizzes/${t}`;
};

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Visual Quiz Preview — ${esc(path.basename(inputPath))}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    header { padding: 1rem 1.25rem; background: #fff; border-bottom: 2px solid #0f172a; }
    main { max-width: 960px; margin: 0 auto; padding: 1rem; }
    .card { background: #fff; border: 2px solid #0f172a; box-shadow: 4px 4px 0 #0f172a; padding: 1rem; margin-bottom: 1rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.75rem; margin-bottom: 0.75rem; }
    .tag { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 0.15rem 0.4rem; }
    .warn { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
    img { max-width: 100%; max-height: 280px; object-fit: contain; background: #f1f5f9; }
    .opt { border: 1px solid #cbd5e1; padding: 0.5rem; margin: 0.35rem 0; }
    .ok { border-color: #15803d; background: #f0fdf4; }
    .hint { font-size: 0.9rem; color: #92400e; background: #fffbeb; padding: 0.5rem; margin-top: 0.5rem; }
    .broken { color: #b91c1c; font-size: 0.75rem; word-break: break-all; }
  </style>
</head>
<body>
  <header>
    <h1>Visual Quiz Preview</h1>
    <p>${esc(path.basename(inputPath))} — ${questions.length} questions. Run <code>npm run dev</code> then open this file via the dev server.</p>
  </header>
  <main>
    ${questions.map((q) => `
    <article class="card" id="${esc(q.id)}">
      <div class="meta">
        <span class="tag">${esc(q.id)}</span>
        <span class="tag">${esc(q.question_type)}</span>
        <span class="tag">${esc(q.category)}</span>
        ${!q.enabled ? '<span class="tag warn">enabled=FALSE</span>' : ''}
      </div>
      ${q.question_image_url ? `<img src="${imgSrc(q.question_image_url)}" alt="" onerror="this.insertAdjacentHTML('afterend','<p class=broken>Missing: ${esc(q.question_image_url)}</p>');this.remove();" />` : ''}
      <h2>${esc(q.question_text)}</h2>
      ${q.options.map((opt, i) => {
        const isImg = /\.(jpg|jpeg|png|webp|gif)|^https?:|\//i.test(opt);
        const cls = i === q.correct_option_index ? 'opt ok' : 'opt';
        if (isImg && opt) {
          return `<div class="${cls}"><strong>${String.fromCharCode(65 + i)}.</strong><br><img src="${imgSrc(opt)}" alt="" onerror="this.outerHTML='<div class=broken>Missing: ${esc(opt)}</div>'" /></div>`;
        }
        return `<div class="${cls}"><strong>${String.fromCharCode(65 + i)}.</strong> ${esc(opt)}</div>`;
      }).join('')}
      <p class="hint">💡 ${esc(q.hint)}</p>
    </article>`).join('')}
  </main>
</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Wrote ${outputPath} (${questions.length} questions from ${inputPath})`);
