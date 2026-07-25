/**
 * Build offline-embedded Life Skills quiz preview HTML files.
 * Usage: node scripts/build-ls-quiz-previews.mjs
 * Optional: node scripts/build-ls-quiz-previews.mjs 2 3 4
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const QUIZ_DIR = path.join(ROOT, 'public', 'quizzes');
const OUT_DIR = path.join(ROOT, 'public', 'quiz_management');
const MODULES_PATH = path.join(ROOT, 'public', 'data', 'supplementary_modules.json');

const TEMPLATE = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{CODE}} Quiz Preview — {{TITLE}}</title>
  <style>
    :root {
      --bg: #f8fafc;
      --ink: #0f172a;
      --muted: #64748b;
      --card: #fff;
      --line: #cbd5e1;
      --ok: #15803d;
      --ok-bg: #f0fdf4;
      --warn-bg: #fffbeb;
      --warn: #92400e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Noto Sans Bengali", "Hind Siliguri", system-ui, sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.45;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--card);
      border-bottom: 2px solid var(--ink);
      padding: 0.85rem 1.1rem;
    }
    header h1 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    header p { margin: 0; color: var(--muted); font-size: 0.85rem; }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-top: 0.75rem;
    }
    .toolbar input[type="search"] {
      flex: 1 1 220px;
      min-width: 180px;
      padding: 0.45rem 0.6rem;
      border: 1px solid var(--line);
      font: inherit;
    }
    .toolbar label {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      user-select: none;
    }
    .toolbar button {
      font: inherit;
      padding: 0.4rem 0.65rem;
      border: 1px solid var(--ink);
      background: #fff;
      cursor: pointer;
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-top: 0.6rem;
    }
    .tag {
      font-size: 0.75rem;
      background: #f1f5f9;
      border: 1px solid var(--line);
      padding: 0.15rem 0.45rem;
    }
    main { max-width: 880px; margin: 0 auto; padding: 1rem; }
    .card {
      background: var(--card);
      border: 2px solid var(--ink);
      box-shadow: 4px 4px 0 var(--ink);
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .card.hidden { display: none; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.55rem;
      font-size: 0.75rem;
    }
    h2 {
      margin: 0 0 0.7rem;
      font-size: 1.05rem;
      font-weight: 700;
    }
    .opt {
      border: 1px solid var(--line);
      padding: 0.55rem 0.65rem;
      margin: 0.4rem 0;
      display: flex;
      gap: 0.55rem;
      align-items: flex-start;
    }
    .opt .letter {
      flex: 0 0 auto;
      font-weight: 700;
      min-width: 1.4rem;
    }
    .opt .body { flex: 1; }
    .opt .len {
      flex: 0 0 auto;
      font-size: 0.72rem;
      color: var(--muted);
      white-space: nowrap;
    }
    .opt.ok {
      border-color: var(--ok);
      background: var(--ok-bg);
    }
    .hide-answers .opt.ok {
      border-color: var(--line);
      background: transparent;
    }
    .hide-answers .opt.ok .mark,
    .hide-answers .answer-line { display: none; }
    .mark {
      color: var(--ok);
      font-weight: 700;
      font-size: 0.8rem;
    }
    .answer-line {
      margin: 0.55rem 0 0;
      font-size: 0.88rem;
      color: var(--warn);
      background: var(--warn-bg);
      padding: 0.45rem 0.55rem;
    }
    .nav {
      position: fixed;
      right: 0.75rem;
      bottom: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .nav a, .nav button {
      font: inherit;
      text-decoration: none;
      color: var(--ink);
      background: #fff;
      border: 1px solid var(--ink);
      padding: 0.35rem 0.55rem;
      font-size: 0.8rem;
      cursor: pointer;
      text-align: center;
    }
    @media print {
      header { position: static; }
      .toolbar, .nav { display: none !important; }
      .card { box-shadow: none; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header>
    <h1>{{CODE}} Quiz Preview — {{TITLE}}</h1>
    <p>Embedded snapshot of <code>{{FILE}}</code> · open this file directly · App picks 10 random per attempt</p>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Search question or option…" />
      <label><input id="hideAnswers" type="checkbox" /> Hide answers</label>
      <label><input id="showLen" type="checkbox" checked /> Show option length</label>
      <button type="button" id="expandAll">Show all</button>
      <button type="button" id="printBtn">Print</button>
      <a href="./ls_quiz_preview_index.html" style="font:inherit;padding:0.4rem 0.65rem;border:1px solid var(--ink);background:#fff;text-decoration:none;color:inherit;">All LS</a>
    </div>
    <div class="stats" id="stats"></div>
  </header>

  <main id="list"><p>Loading…</p></main>

  <div class="nav">
    <a href="#top" id="topLink">Top</a>
    <button type="button" id="toQ1">Q1</button>
  </div>

  <script>
    document.body.id = 'top';
    const LETTERS = ['A', 'B', 'C', 'D'];
    const listEl = document.getElementById('list');
    const statsEl = document.getElementById('stats');
    const searchEl = document.getElementById('search');
    const hideAnswersEl = document.getElementById('hideAnswers');
    const showLenEl = document.getElementById('showLen');

    function optionLen(text) {
      return [...String(text || '')].length;
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function escapeAttr(s) {
      return escapeHtml(s).toLowerCase();
    }

    function render(questions) {
      const indexDist = [0, 0, 0, 0];
      questions.forEach((q) => {
        if (q.correctAnswerIndex >= 0 && q.correctAnswerIndex < 4) {
          indexDist[q.correctAnswerIndex] += 1;
        }
      });

      statsEl.innerHTML = [
        '<span class="tag">Total: ' + questions.length + '</span>',
        '<span class="tag">Correct @ A/B/C/D: ' + indexDist.join(' / ') + '</span>',
        '<span class="tag">Tip: green = correct</span>'
      ].join('');

      listEl.innerHTML = questions.map((q, i) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        const correct = q.correctAnswerIndex;
        const optHtml = opts.map((opt, oi) => {
          const isOk = oi === correct;
          return (
            '<div class="opt ' + (isOk ? 'ok' : '') + '">' +
              '<span class="letter">' + LETTERS[oi] + '.</span>' +
              '<span class="body">' + escapeHtml(opt) + (isOk ? ' <span class="mark">✓ correct</span>' : '') + '</span>' +
              '<span class="len" data-len>' + optionLen(opt) + ' ch</span>' +
            '</div>'
          );
        }).join('');

        const correctText = opts[correct] != null
          ? LETTERS[correct] + '. ' + escapeHtml(opts[correct])
          : '(missing)';

        return (
          '<article class="card" id="q-' + (i + 1) + '" data-search="' +
            escapeAttr((q.questionText || '') + ' ' + opts.join(' ')) + '">' +
            '<div class="meta">' +
              '<span class="tag">Q' + (i + 1) + '</span>' +
              '<span class="tag">correctAnswerIndex: ' + correct + '</span>' +
            '</div>' +
            '<h2>' + escapeHtml(q.questionText || '') + '</h2>' +
            optHtml +
            '<p class="answer-line"><strong>Answer:</strong> ' + correctText + '</p>' +
          '</article>'
        );
      }).join('');

      applyLenVisibility();
      applyFilter();
    }

    function applyFilter() {
      const q = (searchEl.value || '').trim().toLowerCase();
      let visible = 0;
      document.querySelectorAll('.card').forEach((card) => {
        const hit = !q || (card.getAttribute('data-search') || '').includes(q);
        card.classList.toggle('hidden', !hit);
        if (hit) visible += 1;
      });
      const old = statsEl.querySelector('[data-visible]');
      if (old) old.remove();
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.dataset.visible = '1';
      tag.textContent = q ? ('Showing: ' + visible) : 'Showing: all';
      statsEl.appendChild(tag);
    }

    function applyLenVisibility() {
      document.querySelectorAll('[data-len]').forEach((el) => {
        el.style.display = showLenEl.checked ? '' : 'none';
      });
    }

    hideAnswersEl.addEventListener('change', () => {
      document.body.classList.toggle('hide-answers', hideAnswersEl.checked);
    });
    showLenEl.addEventListener('change', applyLenVisibility);
    searchEl.addEventListener('input', applyFilter);
    document.getElementById('expandAll').addEventListener('click', () => {
      searchEl.value = '';
      applyFilter();
    });
    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('toQ1').addEventListener('click', () => {
      document.getElementById('q-1')?.scrollIntoView({ behavior: 'smooth' });
    });

    const QUIZ_DATA = {{QUIZ_JSON}};

    render(QUIZ_DATA);
  </script>
</body>
</html>
`;

function buildOne(n, modules) {
  const code = 'LS' + String(n).padStart(2, '0');
  const file = `questions_supp_10_${n}.json`;
  const quizPath = path.join(QUIZ_DIR, file);
  if (!fs.existsSync(quizPath)) {
    console.warn('skip missing', file);
    return null;
  }
  const quiz = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
  const mod = modules.find((m) => m.lesson_code === code) || {};
  const title = mod.title_bn || mod.title_en || code;
  const html = TEMPLATE
    .replaceAll('{{CODE}}', code)
    .replaceAll('{{TITLE}}', title)
    .replaceAll('{{FILE}}', file)
    .replace('{{QUIZ_JSON}}', JSON.stringify(quiz, null, 2));

  const outName = `ls${String(n).padStart(2, '0')}_quiz_preview.html`;
  const outPath = path.join(OUT_DIR, outName);
  fs.writeFileSync(outPath, html);
  return { n, code, title, outName, count: quiz.length };
}

function buildIndex(rows) {
  const links = rows
    .map(
      (r) =>
        `<li><a href="./${r.outName}"><strong>${r.code}</strong> — ${r.title} <span>(${r.count}q)</span></a></li>`
    )
    .join('\\n');

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Life Skills Quiz Previews</title>
  <style>
    body { font-family: "Noto Sans Bengali", system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    main { max-width: 720px; margin: 0 auto; padding: 1.25rem; }
    h1 { font-size: 1.25rem; }
    p { color: #64748b; }
    ul { list-style: none; padding: 0; }
    li { margin: 0.5rem 0; }
    a {
      display: block;
      padding: 0.75rem 0.9rem;
      background: #fff;
      border: 2px solid #0f172a;
      box-shadow: 4px 4px 0 #0f172a;
      text-decoration: none;
      color: inherit;
    }
    span { color: #64748b; font-size: 0.85rem; }
  </style>
</head>
<body>
  <main>
    <h1>Life Skills Quiz Previews</h1>
    <p>Open any file directly in the browser (no server needed). Green = correct answer.</p>
    <ul>
${rows
  .map(
    (r) =>
      `      <li><a href="./${r.outName}"><strong>${r.code}</strong> — ${r.title} <span>(${r.count}q)</span></a></li>`
  )
  .join('\n')}
    </ul>
  </main>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT_DIR, 'ls_quiz_preview_index.html'), html);
}

const args = process.argv.slice(2).map(Number).filter((n) => n >= 1 && n <= 13);
const targets = args.length ? args : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const modules = JSON.parse(fs.readFileSync(MODULES_PATH, 'utf8'));

const rows = [];
for (const n of targets) {
  const row = buildOne(n, modules);
  if (row) {
    rows.push(row);
    console.log('built', row.outName, row.count + 'q');
  }
}

// Always rebuild full index from all existing preview-capable quizzes
const allRows = [];
for (let n = 1; n <= 13; n++) {
  const row = buildOne(n, modules);
  if (row) allRows.push(row);
}
buildIndex(allRows);
console.log('index: ls_quiz_preview_index.html (' + allRows.length + ' modules)');
