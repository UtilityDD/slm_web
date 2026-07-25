/**
 * Chapter 4 quiz cleanup:
 * - Move / dedupe weather & general storm-safety Qs → 1.9
 * - Keep task-specific content (insulator change, jumper, DO, oil, street light, etc.)
 * - Emit review HTML + log
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
function save(id, data) {
  fs.writeFileSync(path.join(quizDir, `questions_${id}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8');
}
function appendUnique(destId, question, log) {
  const existing = load(destId);
  if (existing.some((q) => q.questionText.trim() === question.questionText.trim())) {
    log.push(`SKIP dup → ${destId}: ${question.questionText.slice(0, 60)}`);
    return false;
  }
  existing.push(question);
  save(destId, existing);
  log.push(`MOVED → ${destId} (now ${existing.length}): ${question.questionText.slice(0, 60)}`);
  return true;
}

function stripByExact(srcId, texts, log) {
  const moveSet = new Set(texts.map((t) => t.trim()));
  const src = load(srcId);
  const keep = [];
  for (const q of src) {
    if (moveSet.has(q.questionText.trim())) appendUnique('1_9', q, log);
    else keep.push(q);
  }
  if (keep.length !== src.length) {
    save(srcId, keep);
    log.push(`UPDATED questions_${srcId}.json → ${keep.length} (was ${src.length})`);
  } else {
    log.push(`NO CHANGE questions_${srcId}.json (${src.length})`);
  }
}

const log = [];

// ---------- Weather / storm misplacements → 1.9 ----------
stripByExact(
  '4_1',
  [
    // Already in 1.9 — general work planning, not insulator-change skill
    'কাজ শুরু করার আগে মোবাইল অ্যাপের মাধ্যমে আবহাওয়ার পূর্বাভাস (Weather Forecast) চেক করা কেন জরুরি?',
  ],
  log,
);

stripByExact(
  '4_2',
  [
    // Already in 1.9 — public safety / fallen conductor in rain
    'বৃষ্টির সময় কোনো বৈদ্যুতিক তার ছিঁড়ে মাটিতে পড়ে থাকলে সাধারণ মানুষের সুরক্ষায় লাইনম্যানের ভূমিকা কী?',
  ],
  log,
);

stripByExact(
  '4_4',
  [
    // Weather-work decision (not DO technique); wet-weather arc risk stays via other DO Q
    'বৃষ্টির সময় কোনো পোল মাউন্টেড ডিস্ট্রিবিউশন ট্রান্সফরমারের (DTR) ফিউজ পুড়ে গেলে কী করা উচিত?',
    // Already in 1.9 — lightning shelter myth, not DO fuse
    'বজ্রপাতের সময় কোনো বড় বা উঁচু গাছের নিচে আশ্রয় নেওয়া কেন অত্যন্ত বিপজ্জনক?',
  ],
  log,
);

stripByExact(
  '4_5',
  [
    // Storm protocol around live HV terminals — weather safety, not oil-gauge skill
    'ঝড়-বৃষ্টির সময় কোনো লাইভ ট্রান্সফরমারের অয়েল লেভেল বা তাপমাত্রা পরীক্ষা করা কেন অনুচিত?',
  ],
  log,
);

// ---------- Build review ----------
const lessons = [];
for (let i = 1; i <= 10; i++) {
  const id = `4_${i}`;
  const ch = JSON.parse(fs.readFileSync(path.join(quizDir, `chapter_${id}.json`), 'utf8'));
  const qs = load(id);
  lessons.push({ id, level: ch.level_id, title: ch.level_title, count: qs.length, qs });
}

const analysis = {
  '4.1': {
    verdict: 'FIXED',
    notes: [
      'Pin/disc change, come-along, binding, turnbuckle, hot-line tip — match chapter.',
      'Removed weather-forecast Q (already in 1.9).',
      'Kept wind/binding-loosen scenario — task-related to insulator/binding failure.',
    ],
    fact: [
      { status: 'PASS', text: 'Never open tension string without come-along/bypass — correct' },
      { status: 'PASS', text: 'De-energized ≠ safe to bare-hand conductor without earthing check — myth OK' },
    ],
  },
  '4.2': {
    verdict: 'FIXED',
    notes: [
      'Jumper, PG clamp, oxide clean, bi-metal, hotspot — match chapter.',
      'Removed fallen-wire public-safety Q → already in 1.9.',
      'Kept rain-into-joint corrosion Q — jumper maintenance technical.',
    ],
    fact: [
      { status: 'PASS', text: 'Loose jumper → I²R heating / hotspot — correct' },
      { status: 'PASS', text: 'Al–Cu needs bi-metallic connector — correct' },
    ],
  },
  '4.3': {
    verdict: 'ON-TOPIC',
    notes: ['Service connection, messenger, IPC shear head, drip loop, meter — match chapter.'],
    fact: [
      { status: 'PASS', text: 'IPC shear head = correct torque — matches pro tip' },
      { status: 'PASS', text: 'Drip loop keeps water out of meter — correct' },
    ],
  },
  '4.4': {
    verdict: 'FIXED',
    notes: [
      'DO fuse PPE, stance, hot stick, T-link, load-break tool — match chapter.',
      'Moved rain DTR-fuse wait decision → 1.9; removed lightning-under-tree (dup 1.9).',
      'Kept wet-weather fuse flash risk Q (operation-specific).',
    ],
    fact: [
      { status: 'PASS', text: 'Face shield + hot stick; never bare-hand DO — correct' },
      { status: 'PASS', text: 'Open all 3 phases after one fuse blows before restoring — good practice' },
    ],
  },
  '4.5': {
    verdict: 'FIXED',
    notes: [
      'Oil level, silica gel, OTI/WTI, BDV, DGA intro — match chapter.',
      'Moved storm live-tank inspection Q → 1.9.',
    ],
    fact: [
      { status: 'PASS', text: 'Blue/dry silica gel; pink = moisture — common field rule' },
      { status: 'PASS', text: 'Hot oil shortens insulation life — correct' },
    ],
  },
  '4.6': {
    verdict: 'ON-TOPIC',
    notes: ['Earth resistance, pit watering, salt/charcoal, touch/step, LA needs earth — match chapter.'],
    fact: [
      { status: 'PASS', text: 'Low earth resistance preferred; earth tester used — correct' },
      { status: 'SOFT', text: 'Neutral vs body earthing “which more critical” — both mandatory; treat as soft' },
    ],
  },
  '4.7': {
    verdict: 'ON-TOPIC',
    notes: ['DP dressing, clearance, jumper shape, symmetry, bunching — match chapter.'],
    fact: [{ status: 'PASS', text: 'Dressing = safety/maintenance access, not cosmetics only — correct' }],
  },
  '4.8': {
    verdict: 'ON-TOPIC',
    notes: ['Tree trimming, 3-cut, insulated tools, kickback, RoW — match chapter.'],
    fact: [
      { status: 'PASS', text: 'Dry wood can still conduct / bridge — myth OK' },
      { status: 'PASS', text: 'AB cable insulation not tree-abrasion proof — correct' },
    ],
  },
  '4.9': {
    verdict: 'ON-TOPIC',
    notes: [
      'Street light troubleshooting: photocell, ballast, LED driver, CCMS — match chapter.',
      'Kept ladder base-ratio Q — chapter requires stable ladder/lift platform for this job.',
    ],
    fact: [
      { status: 'PASS', text: 'All lights out → feeder/control; always-on → photocell — correct' },
      { status: 'PASS', text: 'Ladder ~1:4 base-to-height (4:1) — standard field rule' },
    ],
  },
  '4.10': {
    verdict: 'ON-TOPIC',
    notes: ['LT phase balancing, clamp meter, neutral current, de-rating — match chapter.'],
    fact: [
      { status: 'PASS', text: 'Balanced 3-ph → near-zero neutral current — correct' },
      { status: 'PASS', text: 'Measure at peak load time for balancing — correct' },
    ],
  },
};

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chapter 4 Quiz Relevance & Fact-Check</title>
  <style>
    :root { --bg:#f8fafc; --ink:#0f172a; --muted:#64748b; --card:#fff; --line:#cbd5e1;
      --ok:#166534; --ok-bg:#f0fdf4; --warn:#92400e; --warn-bg:#fffbeb; --fix:#1e40af; --fix-bg:#eff6ff; }
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
    .badge.ok { background:var(--ok-bg); color:var(--ok); border-color:#86efac; }
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
    <h1>Chapter 4 (4.1–4.10) — Quiz Relevance & Fact-Check</h1>
    <p>Field craft chapter: insulator change → LT phase balancing. Same pipeline as Ch.1–3.</p>
    <div class="stats">
      <span class="tag ok">4.3, 4.6–4.10: on-topic</span>
      <span class="tag fix">4.1, 4.2, 4.4, 4.5: weather Qs → 1.9</span>
    </div>
  </header>
  <main>
    <section class="summary">
      <h2 style="margin-top:0;font-size:1.05rem">Executive summary</h2>
      <ul>
        <li><strong>Scope:</strong> Chapter 4 quizzes mostly match hands-on line craft lessons.</li>
        <li><strong>Fixes:</strong> Stripped general storm/weather safety items that belong in 1.9 (or were already there).</li>
        <li><strong>Kept:</strong> Task-tied scenarios (binding in wind, wet DO flash risk, rain into jumper joints, street-light ladder).</li>
      </ul>
    </section>
${lessons
  .map((L) => {
    const a = analysis[L.level];
    const badge = a.verdict === 'FIXED' || a.verdict === 'TRIMMED' ? 'fix' : 'ok';
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
        <span class="badge ${badge}">${a.verdict}</span>
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
    Generated 2026-07-25 · <code>public/quiz_management/lesson_4_1_to_4_10_quiz_review.html</code>
    · Log: <code>lesson_4_quiz_cleanup_log.md</code>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'lesson_4_1_to_4_10_quiz_review.html'), html, 'utf8');
fs.writeFileSync(
  path.join(outDir, 'lesson_4_quiz_cleanup_log.md'),
  [
    '# Chapter 4 Quiz Cleanup Log',
    '',
    'Date: 2026-07-25',
    '',
    '## Actions',
    '',
    '### Relocated / deduped → `questions_1_9.json`',
    '- **4.1:** weather forecast check (already in 1.9)',
    '- **4.2:** fallen conductor public-safety in rain (already in 1.9)',
    '- **4.4:** rain DTR fuse wait decision; lightning under-tree shelter (dup)',
    '- **4.5:** storm live transformer oil/temp check unsafe',
    '',
    '### Kept (task-related)',
    '- **4.1:** wind loosening binding on pin insulator',
    '- **4.2:** rain water into joints / corrosion',
    '- **4.4:** wet-weather fuse flash risk (operation-specific)',
    '- **4.9:** ladder base ratio (street-light platform safety in chapter)',
    '',
    '### Other lessons',
    '- 4.3, 4.6–4.8, 4.10: on-topic; no mass relocation.',
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
