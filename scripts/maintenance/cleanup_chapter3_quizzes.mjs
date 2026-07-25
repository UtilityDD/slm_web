/**
 * Chapter 3 quiz cleanup:
 * - 3.2: trim polymer/porcelain deep-dive not taught in chapter → 9.6 where test-related
 * - 3.5: move wind/team weather Qs back to 1.9
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

const log = [];

// ---------- 3.5: weather misplacements → 1.9 ----------
{
  const src = load('3_5');
  const moveTo19 = new Set([
    'প্রবল বাতাসের সময় পোলের ওপর কাজ করার ক্ষেত্রে প্রধান শারীরিক চ্যালেঞ্জ কোনটি?',
    'ঝড়-বৃষ্টির সময় কাজ করার সময় নিজের টিমের সদস্যদের সুরক্ষার জন্য কোন প্রোটোকলটি মেনে চলা উচিত?',
  ]);
  const keep = [];
  for (const q of src) {
    if (moveTo19.has(q.questionText.trim())) appendUnique('1_9', q, log);
    else keep.push(q);
  }
  save('3_5', keep);
  log.push(`UPDATED questions_3_5.json → ${keep.length} (was ${src.length})`);
}

// ---------- 3.2: keep chapter core; relocate/drop deep polymer-porcelain bank ----------
{
  const src = load('3_2');

  // Core keep: pin/shackle/disc/porcelain/glass/flashover/creepage/string/washing/binding/crack/disc-count
  // Light polymer mention OK (pro tip). Deep FRP/hydrophobic/porosity/IEC → 9.6 or drop.
  const relocateTo96 = [
    /পোরোসিটি টেস্ট/,
    /আইইসি \(IEC\) বা আনসি \(ANSI\)/,
    /তাপীয় ও যান্ত্রিক চাপের যৌথ/,
    /আর্দ্রতা ও পরিবেশগত সহনশীলতা পরীক্ষা/,
    /মেকানিক্যাল টেস্ট করা হয়/,
    /সাসপেনশন বা টেনশন টাইপের ইনসুলেটরের জন্য \(তা পলিমার/,
    /সিলিকন রাবার শেডটি এফআরপি কোরের সাথে শক্তভাবে/,
    /ভেতরের কাঠামোর নিরেটতা ও ঘনত্ব পরীক্ষা/,
  ];

  const dropPatterns = [
    /এফআরপি \(FRP\) কোর এবং সিলিকন রাবার/,
    /এফআরপি \(FRP\) কোরের প্রধান যান্ত্রিক/,
    /ধাতব ফিটিংগুলো \(Metal Fittings\) বডির সাথে কীভাবে যুক্ত/,
    /ধাতব শেষ প্রান্তগুলো \(End Fittings\) এফআরপি/,
    /পোর্সেলিন ইনসুলেটরের ভেতরের গঠন কেমন/,
    /'কম্পোজিট' \(Composite\) ইনসুলেটর বলা/,
    /উপরিভাগ মসৃণ ও চকচকে করার জন্য কী করা হয়/,
    /উৎপাদন প্রক্রিয়াটি ব্যবহার করা হয়/,
    /প্রধান কাঁচামাল কোনটি/,
    /মূল ভেতরের অংশটি \(Core\) সাধারণত কী দিয়ে তৈরি/,
    /বাইরের ছাতা বা শেডগুলো \(Shed\) সাধারণত কোন উপাদান/,
    /যান্ত্রিক চাপের ক্ষেত্রে পোর্সেলিন ইনসুলেটরের প্রধান দুর্বলতা/,
    /নমনীয়তা \(Flexibility\) পোর্সেলিনের চেয়ে/,
    /পোর্সেলিন ইনসুলেটরের কোন যান্ত্রিক শক্তিটি/,
    /ভারী বরফ পড়া বা অতিরিক্ত লোড/,
    /হালকা ওজনের কারণে বিদ্যুৎ কোম্পানির কোন খরচ/,
    /'হাইড্রোফোবিক মাইগ্রেশন'/,
    /সিলিকন রাবার শেডটি কেন ধুলোবালি/,
    /পলিমার ইনসুলেটরের ঢেউ খেলানো শেডগুলোর ডিজাইন ক্রিপেজ/,
    /রক্ষণাবেক্ষণের জন্য বিদ্যুৎ কোম্পানিকে নিয়মিত কী করতে হয়/,
    /দীর্ঘ দূরত্বের বা অত্যন্ত বড় স্প্যান/,
    /রি-কন্ডাক্টরিং \(Re-conductoring\)/,
    /পার্বত্য বা অত্যন্ত দুর্গম পাহাড়ি/,
    /সাধারণ সার্ভিস লাইফ বা জীবনকাল সাধারণত কত বছর/,
    /দীর্ঘমেয়াদী সামগ্রিক খরচের \(Lifecycle Cost\)/,
    /নিয়মিত পরিদর্শনের \(Visual Inspection\) সময় প্রধানত কী পরীক্ষা করা হয়\?$/,
    /সবশেষে, পলিমার এবং পোর্সেলিন ইনসুলেটরের এই তুলনামূলক/,
    /ওজনের দিক থেকে পলিমার ইনসুলেটর এবং পোর্সেলিন/,
    /ঝড় বা প্রবল বাতাসে লাইনের কম্পন \(Wind Vibration\) সহ্য করার ক্ষেত্রে কোন ইনসুলেটর/,
    /পরিবহন এবং ইনস্টলেশনের সময় কোন ইনসুলেটর ক্ষতিগ্রস্ত/,
    /ভিজে গেলে বা আর্দ্র পরিবেশে পোর্সেলিন ইনসুলেটরের উপরিভাগের আচরণ/,
    /পলিমার ইনসুলেটরের সিলিকন রাবার শেডের প্রধান বৈদ্যুতিক সুবিধা/,
    /শিল্পাঞ্চল বা উপকূলীয় লবণাক্ত এলাকায় \(Salt Fog\) কোন ইনসুলেটর/,
    /পরিষ্কার এবং শুষ্ক আবহাওয়ায় \(Clean & Dry Conditions\) উভয় ইনসুলেটর/,
    /কুয়াশা বা হালকা বৃষ্টির সময় পোর্সেলিন ইনসুলেটরে কেন 'ক্র্যাকলিং'/,
    /রক্ষণাবেক্ষণ বা ক্লিন-আপের \(Cleaning\) দিক থেকে কোন ইনসুলেটর/,
  ];

  const keep = [];
  const seen = new Set();
  for (const q of src) {
    const text = q.questionText.trim();
    if (seen.has(text)) {
      log.push(`DEDUP 3.2 skip: ${text.slice(0, 60)}`);
      continue;
    }
    seen.add(text);

    if (relocateTo96.some((re) => re.test(text))) {
      appendUnique('9_6', q, log);
      continue;
    }
    if (dropPatterns.some((re) => re.test(text))) {
      log.push(`DROP 3.2 deep-compare: ${text.slice(0, 60)}`);
      continue;
    }
    keep.push(q);
  }

  save('3_2', keep);
  log.push(`UPDATED questions_3_2.json → ${keep.length} (was ${src.length})`);
}

// ---------- Soft fact notes (no auto-change unless clear) ----------
// 3.9 ground clearance 6.1 m for 11 kV across road — matches CEA common table — PASS
// 3.2 disc count 33 kV tension 3–4 — chapter tip says 3 for 33 kV — PASS soft

// ---------- Build review ----------
const lessons = [];
for (let i = 1; i <= 10; i++) {
  const id = `3_${i}`;
  const ch = JSON.parse(fs.readFileSync(path.join(quizDir, `chapter_${id}.json`), 'utf8'));
  const qs = load(id);
  lessons.push({ id, level: ch.level_id, title: ch.level_title, count: qs.length, qs });
}

const analysis = {
  '3.1': {
    verdict: 'ON-TOPIC',
    notes: ['ACSR vs AAAC, steel core, sag, skin effect — match chapter.'],
    fact: [{ status: 'PASS', text: 'ACSR = Al Conductor Steel Reinforced; AAAC all-Al alloy — correct' }],
  },
  '3.2': {
    verdict: 'TRIMMED',
    notes: [
      'Was 70 Q; chapter teaches pin/shackle/disc + creepage/string + light polymer mention.',
      'Dropped deep polymer↔porcelain manufacturing/lifecycle bank not in chapter.',
      'Moved porosity/IEC/mechanical test items → lesson 9.6 insulator testing.',
    ],
    fact: [
      { status: 'PASS', text: 'Pin to 33 kV straight; shackle LT dead-end/angle — matches chapter' },
      { status: 'PASS', text: '33 kV tension ~3 discs — matches pro tip' },
    ],
  },
  '3.3': {
    verdict: 'ON-TOPIC',
    notes: ['Cross-arm, clamps, galvanizing, suspension vs tension hardware — match chapter.'],
    fact: [{ status: 'PASS', text: 'Galvanizing = zinc coating / sacrificial protection — correct' }],
  },
  '3.4': {
    verdict: 'ON-TOPIC',
    notes: ['DO fuse, horn gap, element rating, hot stick operate — match chapter.'],
    fact: [{ status: 'PASS', text: 'Never upsize fuse wire; use hot stick on DO — correct' }],
  },
  '3.5': {
    verdict: 'FIXED',
    notes: [
      'LA / MOV / earthing / insulation coordination — core on-topic.',
      'Moved wind pole-balance + storm team-protocol Qs → 1.9.',
      'Kept broken-LA-in-wind repair Q (LA-specific).',
    ],
    fact: [
      { status: 'PASS', text: 'LA does not “stop lightning”; diverts surge to earth — myth framing OK' },
      { status: 'SOFT', text: 'Earth <5 Ω thumb rule — common field target, utility-specific' },
    ],
  },
  '3.6': {
    verdict: 'ON-TOPIC',
    notes: ['DTR parts, oil, breather, Buchholz, Dyn11 — match chapter (line-heart intro).'],
    fact: [{ status: 'PASS', text: 'Silica gel pink = moisture; oil cools + insulates — correct' }],
  },
  '3.7': {
    verdict: 'ON-TOPIC',
    notes: ['LT pillar, busbar, HRC fuse, imbalance — match chapter.'],
    fact: [{ status: 'PASS', text: '415 V still lethal; no copper link instead of HRC — correct' }],
  },
  '3.8': {
    verdict: 'ON-TOPIC',
    notes: ['Service cable, drip loop, kWh meter, smart meter — match chapter.'],
    fact: [{ status: 'PASS', text: '1 unit = 1 kWh — correct' }],
  },
  '3.9': {
    verdict: 'ON-TOPIC',
    notes: ['Cradle/cage guarding, earthing, clearances — match chapter.'],
    fact: [
      {
        status: 'PASS',
        text: '11 kV ground clearance ~6.1 m across road — matches common CEA table used in field training',
      },
    ],
  },
  '3.10': {
    verdict: 'ON-TOPIC',
    notes: ['SLD symbols, feeder ID for PTW, breaker vs isolator — match chapter.'],
    fact: [{ status: 'PASS', text: 'SLD uses one line for three phases — correct' }],
  },
};

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chapter 3 Quiz Relevance & Fact-Check</title>
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
    .tag.warn { background:var(--warn-bg); color:var(--warn); border-color:#fcd34d; }
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
    <h1>Chapter 3 (3.1–3.10) — Quiz Relevance & Fact-Check</h1>
    <p>Line components chapter: conductors → SLD. Same pipeline as Ch.1–2.</p>
    <div class="stats">
      <span class="tag ok">3.1, 3.3–3.4, 3.6–3.10: on-topic</span>
      <span class="tag fix">3.2: trimmed deep polymer bank</span>
      <span class="tag fix">3.5: weather Qs → 1.9</span>
    </div>
  </header>
  <main>
    <section class="summary">
      <h2 style="margin-top:0;font-size:1.05rem">Executive summary</h2>
      <ul>
        <li><strong>3.2:</strong> 70 → chapter-sized core (pin/shackle/disc); deep polymer↔porcelain compare dropped; tests → 9.6.</li>
        <li><strong>3.5:</strong> Removed 2 weather/team items misplaced from earlier 1.9 moves.</li>
        <li><strong>Rest:</strong> Line-component quizzes match lesson scope.</li>
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
    Generated 2026-07-25 · <code>public/quiz_management/lesson_3_1_to_3_10_quiz_review.html</code>
    · Log: <code>lesson_3_quiz_cleanup_log.md</code>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'lesson_3_1_to_3_10_quiz_review.html'), html, 'utf8');
fs.writeFileSync(
  path.join(outDir, 'lesson_3_quiz_cleanup_log.md'),
  [
    '# Chapter 3 Quiz Cleanup Log',
    '',
    'Date: 2026-07-25',
    '',
    '## Actions',
    '',
    '### 3.2 Insulators',
    '- Trimmed deep polymer↔porcelain manufacturing/lifecycle pool not taught in chapter.',
    '- Moved porosity / IEC / mechanical test items → `questions_9_6.json`.',
    '- Kept pin / shackle / disc / creepage / flashover / light polymer tip items.',
    '',
    '### 3.5 Lightning arrester',
    '- Moved wind balance + storm team protocol → `questions_1_9.json`.',
    '- Kept LA-specific broken arrester repair Q.',
    '',
    '### Other lessons',
    '- 3.1, 3.3–3.4, 3.6–3.10: on-topic; no mass relocation.',
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
