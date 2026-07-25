/**
 * Chapter 5 quiz review:
 * Fault Finder lessons — pools are chapter-sized and on-topic.
 * No mass relocation; emit review HTML + log (same pipeline as Ch.1–4).
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

const log = ['No quiz JSON mutations — all 5.1–5.10 pools on-topic for Fault Finder scope.'];

const lessons = [];
for (let i = 1; i <= 10; i++) {
  const id = `5_${i}`;
  const ch = JSON.parse(fs.readFileSync(path.join(quizDir, `chapter_${id}.json`), 'utf8'));
  const qs = load(id);
  lessons.push({ id, level: ch.level_id, title: ch.level_title, count: qs.length, qs });
}

const analysis = {
  '5.1': {
    verdict: 'ON-TOPIC',
    notes: [
      'First response to feeder trip: relay data, treat as live, O/C vs E/F, auto-recloser lockout — match chapter.',
      'Weather mentions are fault-cause clues (e.g. bird in clear weather), not 1.9 storm PPE.',
    ],
    fact: [
      { status: 'PASS', text: 'Collect trip/relay data before rushing to field — correct' },
      { status: 'PASS', text: 'Safe sequence Permit → Isolation → Earthing — matches PTW teaching' },
    ],
  },
  '5.2': {
    verdict: 'ON-TOPIC',
    notes: [
      'Patrolling technique: binoculars, smell of burn, FPI, sectionizer, never poke fallen conductor — match chapter.',
      'Step-potential hop kept — patrol hazard near downed live wire.',
    ],
    fact: [
      { status: 'PASS', text: 'Fallen wire may be live without sparking — myth OK' },
      { status: 'PASS', text: 'Feet-together hop / shuffle for step potential — correct field rule' },
    ],
  },
  '5.3': {
    verdict: 'ON-TOPIC',
    notes: [
      'Common fault parade: tree, tracking mark, jumper melt, bird, LA, kite string — identification lesson (keep).',
      'Storm/kite/lightning items are fault types taught here, not weather-safety misplacements.',
    ],
    fact: [
      { status: 'PASS', text: 'Carbon track ≠ clean-and-reuse insulator — correct' },
      { status: 'PASS', text: 'Wet metallic kite string can phase-to-phase short — correct' },
    ],
  },
  '5.4': {
    verdict: 'ON-TOPIC',
    notes: ['Repeated fuse blow: transient vs permanent, sectionizing, never upsize fuse, megger — match chapter.'],
    fact: [
      { status: 'PASS', text: 'Instant re-blow with bang → solid permanent fault — correct' },
      { status: 'PASS', text: 'Do not “burn out” fault by repeated charging — myth OK' },
    ],
  },
  '5.5': {
    verdict: 'ON-TOPIC',
    notes: ['Low voltage: one customer vs area, long LT drop, imbalance, measure on-load, OLTC/tap — match chapter.'],
    fact: [
      { status: 'PASS', text: 'N–E voltage → weak/high-R neutral — good field clue' },
      { status: 'PASS', text: 'Voltage OK unloaded ≠ OK on load — correct' },
    ],
  },
  '5.6': {
    verdict: 'ON-TOPIC',
    notes: ['Short vs open: L-G most common, arc heat, single-phasing, broken jumper as open — match chapter.'],
    fact: [
      { status: 'PASS', text: 'Phase on ground = L-G fault — correct' },
      { status: 'PASS', text: 'Voltage at bolted short ≈ 0 — correct' },
      { status: 'PASS', text: 'L-G most frequent asymmetrical fault on distribution — correct' },
    ],
  },
  '5.7': {
    verdict: 'ON-TOPIC',
    notes: ['Night fault find: corona glow, tracking sparks, torch, reflective PPE, thermal — match chapter.'],
    fact: [
      { status: 'PASS', text: 'Night can reveal corona/arcs invisible by day — correct' },
      { status: 'SOFT', text: 'Corona camera UV day detection — advanced but directionally OK' },
    ],
  },
  '5.8': {
    verdict: 'ON-TOPIC',
    notes: ['DTR diagnosis: winding short, oil carbonization, bushing, Buchholz, megger HT-E=0 — match chapter.'],
    fact: [
      { status: 'PASS', text: 'Megger HT-to-earth ≈ 0 → winding/body short — correct' },
      { status: 'PASS', text: 'Water in oil destroys insulation — myth OK' },
    ],
  },
  '5.9': {
    verdict: 'ON-TOPIC',
    notes: ['UG cable intro: dig-in damage, thumper, TDR, ARM, joints weak — match chapter.'],
    fact: [
      { status: 'PASS', text: 'Thumper = HV pulse → acoustic discharge at fault — correct' },
      { status: 'PASS', text: 'TDR uses reflection time; open → same polarity reflection — correct' },
    ],
  },
  '5.10': {
    verdict: 'ON-TOPIC',
    notes: ['Preventive maintenance: PM vs breakdown, CBM/DGA, bathtub curve, planned outage — match chapter.'],
    fact: [
      { status: 'PASS', text: 'PM prevents failure; small loose nut can escalate — correct' },
      { status: 'PASS', text: 'Bathtub useful-life stage lowest failure rate — correct' },
    ],
  },
};

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chapter 5 Quiz Relevance & Fact-Check</title>
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
    main { max-width:980px; margin:0 auto; padding:1rem; }
    .summary { background:var(--card); border:2px solid var(--ink); padding:1rem; margin-bottom:1rem; }
    .lesson { background:var(--card); border:2px solid var(--ink); margin-bottom:1rem; }
    .lesson > h2 { margin:0; padding:.75rem 1rem; border-bottom:1px solid var(--line); font-size:1.05rem; display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
    .badge { font-size:.72rem; font-weight:700; padding:.15rem .45rem; border:1px solid; }
    .badge.ok { background:var(--ok-bg); color:var(--ok); border-color:#86efac; }
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
    <h1>Chapter 5 (5.1–5.10) — Quiz Relevance & Fact-Check</h1>
    <p>Fault Finder badge: trip response → preventive maintenance. Same pipeline as Ch.1–4.</p>
    <div class="stats">
      <span class="tag ok">All 5.1–5.10: on-topic (20 Q each)</span>
      <span class="tag ok">No mass relocation needed</span>
    </div>
  </header>
  <main>
    <section class="summary">
      <h2 style="margin-top:0;font-size:1.05rem">Executive summary</h2>
      <ul>
        <li><strong>Pools:</strong> Each lesson has 20 questions aligned to Fault Finder scope.</li>
        <li><strong>Weather/kite/storm items in 5.3:</strong> Kept — they teach <em>fault identification</em>, not storm PPE (1.9).</li>
        <li><strong>Fact-check:</strong> Core answers (L-G prevalence, TDR/thumper, PTW sequence, megger) pass.</li>
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
        <span class="badge ok">${a.verdict}</span>
        <span class="tag">${L.count} questions</span>
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
    Generated 2026-07-25 · <code>public/quiz_management/lesson_5_1_to_5_10_quiz_review.html</code>
    · Log: <code>lesson_5_quiz_cleanup_log.md</code>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'lesson_5_1_to_5_10_quiz_review.html'), html, 'utf8');
fs.writeFileSync(
  path.join(outDir, 'lesson_5_quiz_cleanup_log.md'),
  [
    '# Chapter 5 Quiz Cleanup Log',
    '',
    'Date: 2026-07-25',
    '',
    '## Actions',
    '',
    '- **No quiz JSON changes.** All lessons 5.1–5.10 are on-topic for the Fault Finder chapter.',
    '- Storm / kite / lightning items in **5.3** retained as common-fault identification (not 1.9 PPE).',
    '- Step-potential item in **5.2** retained as patrol hazard near downed conductors.',
    '',
    '## Run log',
    '',
    ...log.map((l) => `- ${l}`),
    '',
    '## Final counts',
    '',
    ...lessons.map((L) => `- ${L.level}: ${L.count} — ${analysis[L.level].verdict}`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(log.join('\n'));
console.log('\nFinal counts:');
for (const L of lessons) console.log(L.level, L.count, analysis[L.level].verdict);
