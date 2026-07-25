/**
 * Regenerate Chapter 7 review HTML/log from current quiz JSON (no further trim).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const quizDir = path.resolve(__dirname, '../../public/quizzes');
const outDir = path.resolve(__dirname, '../../public/quiz_management');

function load(id) {
  return JSON.parse(fs.readFileSync(path.join(quizDir, `questions_${id}.json`), 'utf8'));
}

const beforeCounts = {
  '7.1': 49,
  '7.2': 49,
  '7.3': 49,
  '7.4': 49,
  '7.5': 49,
  '7.6': 49,
  '7.7': 49,
  '7.8': 49,
  '7.9': 48,
  '7.10': 49,
};

const analysis = {
  '7.1': {
    verdict: 'TRIMMED',
    notes: [
      'Electricity Act 2003 + CEA safety regs — on-topic.',
      'Trimmed soft/attitude padding; kept Act/CEA/competent-person core.',
    ],
    fact: [
      { status: 'PASS', text: 'Primary statute = Electricity Act 2003; CEA sets technical safety regs — correct' },
    ],
  },
  '7.2': {
    verdict: 'TRIMMED',
    notes: ['Workmen’s Compensation rights — on-topic; trimmed fluff.'],
    fact: [
      { status: 'PASS', text: 'WC Act 1923 lineage taught in chapter — quiz year OK for training' },
      { status: 'SOFT', text: 'Modern claims often via ESIC/EC Act updates — keep chapter framing' },
    ],
  },
  '7.3': {
    verdict: 'TRIMMED',
    notes: ['Statutory clearances — on-topic; kept numeric Qs.'],
    fact: [
      { status: 'PASS', text: '11 kV over road ≥ 6.1 m — matches chapter' },
      { status: 'PASS', text: 'LT vertical 2.5 m; HT horizontal 2.0 m; LT horizontal 1.2 m — match chapter' },
      { status: 'PASS', text: 'LT along road ~5.5 m — consistent with chapter roadside note' },
    ],
  },
  '7.4': {
    verdict: 'TRIMMED',
    notes: [
      'PTW as legal document + LOTO — on-topic (legal angle vs craft 1.6).',
      'Kept CEA “above 18 kV” mandatory PTW citation from chapter; hard-capped to 24.',
    ],
    fact: [
      {
        status: 'PASS',
        text: 'Quiz “PTW mandatory above 18 kV” matches chapter CEA citation (best practice: PTW on all voltages)',
      },
      { status: 'PASS', text: 'Verbal clearance ≠ written PTW — myth OK' },
    ],
  },
  '7.5': {
    verdict: 'TRIMMED',
    notes: ['Theft/hooking/tamper — on-topic; trimmed attitude padding.'],
    fact: [{ status: 'PASS', text: 'Hooking/tampering are offences under Electricity Act — correct' }],
  },
  '7.6': {
    verdict: 'TRIMMED',
    notes: ['PPE as legal right/duty — on-topic; kept IS 2925.'],
    fact: [{ status: 'PASS', text: 'Helmet IS 2925 — matches earlier fact-fix standard' }],
  },
  '7.7': {
    verdict: 'TRIMMED',
    notes: ['Accident/near-miss reporting — on-topic; trimmed fluff.'],
    fact: [{ status: 'PASS', text: 'Report near misses; preserve scene — correct' }],
  },
  '7.8': {
    verdict: 'TRIMMED',
    notes: ['Oil, batteries, CFL mercury, PCB, spill kit — on-topic.'],
    fact: [{ status: 'PASS', text: 'Used oil = hazardous waste; do not dump to drain — correct' }],
  },
  '7.9': {
    verdict: 'TRIMMED',
    notes: ['Customer rights, ID, CGRF — on-topic; trimmed padding.'],
    fact: [{ status: 'PASS', text: 'CGRF = consumer grievance forum — correct' }],
  },
  '7.10': {
    verdict: 'TRIMMED',
    notes: ['Competence, licence, NSQF — on-topic; trimmed motivational padding.'],
    fact: [{ status: 'PASS', text: 'Competent person = trained + experienced — matches CEA framing' }],
  },
};

const lessons = [];
for (let i = 1; i <= 10; i++) {
  const id = `7_${i}`;
  const ch = JSON.parse(fs.readFileSync(path.join(quizDir, `chapter_${id}.json`), 'utf8'));
  const qs = load(id);
  lessons.push({ id, level: ch.level_id, title: ch.level_title, count: qs.length, qs });
}

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chapter 7 Quiz Relevance & Fact-Check</title>
  <style>
    :root { --bg:#f8fafc; --ink:#0f172a; --muted:#64748b; --card:#fff; --line:#cbd5e1;
      --ok:#166534; --ok-bg:#f0fdf4; --fix:#1e40af; --fix-bg:#eff6ff; }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif; background:var(--bg); color:var(--ink); line-height:1.5; }
    header { position:sticky; top:0; z-index:10; background:var(--card); border-bottom:2px solid var(--ink); padding:.9rem 1.1rem; }
    header h1 { margin:0 0 .35rem; font-size:1.15rem; }
    header p { margin:.2rem 0; color:var(--muted); font-size:.88rem; }
    .stats { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.55rem; }
    .tag { font-size:.78rem; border:1px solid var(--line); padding:.15rem .45rem; background:#f1f5f9; }
    .tag.ok { background:var(--ok-bg); color:var(--ok); border-color:#86efac; }
    .tag.fix { background:var(--fix-bg); color:var(--fix); border-color:#93c5fd; }
    main { max-width:980px; margin:0 auto; padding:1rem; }
    .summary { background:var(--card); border:2px solid var(--ink); padding:1rem; margin-bottom:1rem; }
    .lesson { background:var(--card); border:2px solid var(--ink); margin-bottom:1rem; }
    .lesson > h2 { margin:0; padding:.75rem 1rem; border-bottom:1px solid var(--line); font-size:1.05rem; display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
    .badge { font-size:.72rem; font-weight:700; padding:.15rem .45rem; border:1px solid; }
    .badge.fix { background:var(--fix-bg); color:var(--fix); border-color:#93c5fd; }
    .body { padding:.85rem 1rem; }
    .body h3 { margin:.6rem 0 .35rem; font-size:.95rem; }
    .body ul { margin:.25rem 0 .5rem; padding-left:1.2rem; }
    .q { border-top:1px dashed var(--line); padding:.45rem 0; font-size:.9rem; }
    .ans { color:var(--ok); }
    footer { max-width:980px; margin:0 auto 2rem; padding:0 1rem; color:var(--muted); font-size:.8rem; }
  </style>
</head>
<body>
  <header>
    <h1>Chapter 7 (7.1–7.10) — Quiz Relevance & Fact-Check</h1>
    <p>আইন কি বলে? — Act/CEA → licence. Same pipeline as Ch.1–6.</p>
    <div class="stats">
      <span class="tag fix">All lessons: trimmed ~49 → 24 (soft padding)</span>
      <span class="tag ok">No cross-lesson miscopy found</span>
      <span class="tag ok">Clearance numbers match chapter</span>
    </div>
  </header>
  <main>
    <section class="summary">
      <h2 style="margin-top:0;font-size:1.05rem">Executive summary</h2>
      <ul>
        <li><strong>Relevance:</strong> Each pool matches its legal lesson (no wrong-chapter copies).</li>
        <li><strong>Problem:</strong> Oversized soft banks (~48–49 Q) diluted random-10 draws.</li>
        <li><strong>Action:</strong> Dropped attitude/“মূল শিক্ষা” fluff; capped at 24 keeping legal/numeric items.</li>
        <li><strong>Facts:</strong> Clearances &amp; PTW 18 kV citation align with chapter text.</li>
      </ul>
    </section>
${lessons
  .map((L) => {
    const a = analysis[L.level];
    const samples = L.qs
      .slice(0, 5)
      .map(
        (q, i) =>
          `<div class="q"><strong>Q${i + 1}</strong> ${q.questionText}<br/><span class="ans">→ ${q.options[q.correctAnswerIndex]}</span></div>`,
      )
      .join('');
    return `
    <section class="lesson" id="L${L.id}">
      <h2>
        <span>Lesson ${L.level}</span>
        <span class="badge fix">${a.verdict}</span>
        <span class="tag">${beforeCounts[L.level]} → ${L.count} questions</span>
      </h2>
      <div class="body">
        <p><strong>${L.title}</strong></p>
        <h3>Relevance notes</h3>
        <ul>${a.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
        <h3>Fact-check</h3>
        <ul>${a.fact.map((f) => `<li><strong>${f.status}:</strong> ${f.text}</li>`).join('')}</ul>
        <h3>Sample questions</h3>
        ${samples}
        ${L.count > 5 ? `<p style="color:var(--muted);font-size:.85rem">… +${L.count - 5} more in <code>questions_${L.id}.json</code></p>` : ''}
      </div>
    </section>`;
  })
  .join('\n')}
  </main>
  <footer>
    Generated 2026-07-25 · <code>public/quiz_management/lesson_7_1_to_7_10_quiz_review.html</code>
    · Log: <code>lesson_7_quiz_cleanup_log.md</code>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'lesson_7_1_to_7_10_quiz_review.html'), html, 'utf8');
fs.writeFileSync(
  path.join(outDir, 'lesson_7_quiz_cleanup_log.md'),
  [
    '# Chapter 7 Quiz Cleanup Log',
    '',
    'Date: 2026-07-25',
    '',
    '## Summary',
    '',
    '- Lessons **7.1–7.10** on-topic for “আইন কি বলে?” (no fuse-style miscopies).',
    '- Each pool was **~48–49** soft/padded questions → trimmed to **24** core legal/technical items.',
    '- No weather relocates needed.',
    '',
    '## Fact notes',
    '',
    '- **7.3 clearances** match chapter (6.1 m HT over road, 2.5/3.7 vertical, 1.2/2.0 horizontal).',
    '- **7.4 PTW ≥ 18 kV** matches chapter CEA citation (best practice still uses PTW on 11 kV).',
    '- **7.6 helmet IS 2925** — pass.',
    '',
    '## Final counts',
    '',
    ...lessons.map(
      (L) => `- ${L.level}: ${beforeCounts[L.level]} → ${L.count} — ${analysis[L.level].verdict}`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(lessons.map((L) => `${L.level}: ${beforeCounts[L.level]}→${L.count}`).join('\n'));
