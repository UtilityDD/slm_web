/**
 * Chapter 2 quiz cleanup:
 * - 2.5: move weather/lightning stretch back to 1.9
 * - 2.7: trim megger pool to chapter themes (basics, IR method, readings, PI/DAR, safety)
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

// ---------- 2.5: return misplaced weather Qs to 1.9 ----------
{
  const q25 = load('2_5');
  const moveTexts = [
    "বৃষ্টির সময় কোনো লাইভ ফিডারে কাজ করার জন্য কি 'ইনসুলেটিং ব্ল্যাঙ্কেট' ব্যবহার করা নিরাপদ?",
    'বজ্রপাতের সময় স্টেপ পটেনশিয়ালের হাত থেকে বাঁচতে মাটিতে চলাফেরার ক্ষেত্রে কোন বৈজ্ঞানিক নিয়মটি মানা উচিত?',
  ];
  const keep25 = [];
  for (const q of q25) {
    if (moveTexts.includes(q.questionText.trim())) {
      appendUnique('1_9', q, log);
    } else {
      keep25.push(q);
    }
  }
  save('2_5', keep25);
  log.push(`UPDATED questions_2_5.json → ${keep25.length} (was ${q25.length})`);
}

// ---------- 2.7: trim by exact text (stretch / off-lesson) ----------
{
  const src = load('2_7');

  const relocateExact = new Map([
    [
      'মেগার দিয়ে পরীক্ষা করার সময় যদি হঠাৎ বজ্রবিদ্যুৎসহ বৃষ্টি শুরু হয়, তবে কী করা উচিত?',
      '1_9',
    ],
    [
      'মেগার দিয়ে কোনো ক্যাপাসিটর ব্যাংক (Capacitor Bank) পরীক্ষা করার আগে কোন বিশেষ সতর্কতা নেওয়া বাধ্যতামূলক?',
      '6_7',
    ],
    [
      'মেগার টেস্ট করার আগে লাইনের এলসি (L.C. - Line Clearance) বা পিটিডব্লিউ (PTW - Permit to Work) নেওয়া কেন বাধ্যতামূলক?',
      '1_6',
    ],
  ]);

  // Keep chapter core + advanced PI/DAR + essential IR safety/procedure.
  // Drop peripheral trivia (bags, shouting, cheater posture duplicates).
  const dropPatterns = [
    /^মেগারের টেস্ট প্রোব বা লিডগুলো রাখার জন্য কোন ধরনের ব্যাগ/,
    /^মেগার টেস্ট করার সময় অপারেটরের মুখে কোন ঘোষণাটি/,
    /^মেগার টেস্ট করার সময় কন্ডাক্টরের সাথে মেগারের সংযোগটি আলগা/,
    /^মেগার দিয়ে পরীক্ষা করার সময় মেগারের তার বা টেস্ট লিডগুলো শরীরের কোনো অংশের সাথে পেঁচিয়ে/,
    /^মেগার দিয়ে পরীক্ষা করার সময় মেগারের বডি বা কেসিংটি কেমন জায়গায় রাখা উচিত/,
    /^মেগারের সাহায্যে পরীক্ষা করার সময় কোন ধরনের পরিবেশে কাজ করা কঠোরভাবে নিষিদ্ধ/,
    /^মেগার দিয়ে পরীক্ষা করার সময় টেস্ট লিড দুটিকে একে অপরের খুব কাছাকাছি/,
    /^মেগার দিয়ে পরীক্ষা করার সময় টেস্ট লিডটি সরঞ্জামের কন্ডাক্টরের সাথে যুক্ত করার জন্য নিচের কোনটি ব্যবহার/,
    /^মেগার দিয়ে কোনো বড় কেবিল বা ট্রান্সফরমার টেস্ট করার সময় আশেপাশের এলাকার জন্য কোন সতর্কতা/,
    /^মেগার দিয়ে পরীক্ষা করার সময় পয়েন্টার বা ডিসপ্লের রিডিং যদি ক্রমাগত কাঁপতে/,
    /^মেগার দিয়ে পরীক্ষা করার সময় কন্ডাক্টরের ওপর থাকা ইনসুলেশনের কোন অংশটি মেগারের 'Earth'/,
    /^মেগার দিয়ে কোনো থ্রি-ফেজ কেবিল পরীক্ষা করার সময় যে ফেজটি পরীক্ষা করা হচ্ছে না/,
    /^মেগার টেস্ট করার সময় সরঞ্জামের অপর প্রান্তে থাকা হেল্পার/,
    /^মেগার টেস্ট শেষ হওয়ার পর মেগারের টেস্ট লিড দুটিকে মেগার থেকে খোলার আগে/,
    /^সহকর্মী/, // none expected
  ];

  const keep = [];
  const seen = new Set();
  for (const q of src) {
    const text = q.questionText.trim();
    if (seen.has(text)) {
      log.push(`DEDUP 2.7 skip: ${text.slice(0, 60)}`);
      continue;
    }
    seen.add(text);

    if (relocateExact.has(text)) {
      appendUnique(relocateExact.get(text), q, log);
      continue;
    }

    if (dropPatterns.some((re) => re.test(text))) {
      log.push(`DROP 2.7 peripheral: ${text.slice(0, 60)}`);
      continue;
    }

    keep.push(q);
  }

  save('2_7', keep);
  log.push(`UPDATED questions_2_7.json → ${keep.length} (was ${src.length})`);
}

// ---------- Soft fact note for 2.7 Q14 (11kV): prefer 2500V as primary ----------
{
  const q = load('2_7');
  const idx = q.findIndex((x) =>
    x.questionText.includes('১১ কেভি (11 kV) এইচটি (HT) লাইনের কেবিল'),
  );
  if (idx >= 0) {
    q[idx] = {
      questionText:
        'একটি ১১ কেভি (11 kV) এইচটি (HT) লাইনের কেবিল বা সরঞ্জামের জন্য সাধারণত কত টেস্ট ভোল্টেজ নির্বাচন করা উচিত?',
      options: [
        '৫০০ ভোল্ট (500V) মাত্র',
        '২৫০০ ভোল্ট (2500V) সাধারণত',
        '২৫০ ভোল্ট (250V) মাত্র',
        '৯ ভোল্ট (মাল্টিমিটার)',
      ],
      correctAnswerIndex: 1,
    };
    save('2_7', q);
    log.push('FACTFIX 2.7: 11 kV megger test voltage → prefer 2500V (was ambiguous 1000/2500)');
  }
}

// ---------- Build review HTML ----------
const lessons = [];
for (let i = 1; i <= 10; i++) {
  const id = `2_${i}`;
  const ch = JSON.parse(fs.readFileSync(path.join(quizDir, `chapter_${id}.json`), 'utf8'));
  const qs = load(id);
  lessons.push({ id, level: ch.level_id, title: ch.level_title, count: qs.length, qs });
}

const analysis = {
  '2.1': {
    verdict: 'ON-TOPIC',
    notes: [
      'Toolbox tools, VDE 1000V, line tester — matches chapter.',
      'Q on lowering tools by rope/bucket (from 1.1) kept — tool handling.',
    ],
    fact: [{ status: 'PASS', text: 'VDE 1000V = rated for work up to 1000 V AC — correct' }],
  },
  '2.2': {
    verdict: 'ON-TOPIC',
    notes: ['Multimeter ports, AC/DC, continuity, CAT rating, True RMS — all match chapter.'],
    fact: [
      { status: 'PASS', text: 'CAT IV for outdoor/overhead — correct framing' },
      { status: 'SOFT', text: '“CAT III বা CAT IV” for outdoor — CAT IV preferred at service entrance/OH; acceptable' },
    ],
  },
  '2.3': {
    verdict: 'ON-TOPIC',
    notes: ['Crimping rules, Al paste, die match, cold welding — match chapter. Skinning nick Q is prep-related — keep.'],
    fact: [{ status: 'PASS', text: 'No solder after crimp; Al anti-oxidant paste — industry standard' }],
  },
  '2.4': {
    verdict: 'ON-TOPIC',
    notes: ['Come-along / wire grip / sag-tension / safe position — match chapter.'],
    fact: [{ status: 'PASS', text: 'Do not overload rating; no cheater pipe on handle — correct' }],
  },
  '2.5': {
    verdict: 'FIXED',
    notes: [
      'Hot stick / DO fuse / isolator off-load / care — core on-topic.',
      'Moved rain insulating-blanket + lightning step-potential Qs back to lesson 1.9.',
      'Kept wet/dirty hot stick insulation Q (fits stick care).',
    ],
    fact: [{ status: 'PASS', text: 'Fiberglass hot stick; bamboo forbidden; wet stick loses insulation' }],
  },
  '2.6': {
    verdict: 'ON-TOPIC',
    notes: ['Cable skinning / nick / pencil sharpening / XLPE vs PVC — match chapter.'],
    fact: [{ status: 'PASS', text: 'Nick → stress concentration; XLPE higher heat rating than PVC — correct' }],
  },
  '2.7': {
    verdict: 'TRIMMED',
    notes: [
      'Was 100 Q vs short megger chapter — trimmed peripheral + relocated weather/PTW/capacitor items.',
      'Kept IR method, 1 MΩ rule, discharge-after-test, PI/DAR (advanced section).',
      'Fact-fixed 11 kV preferred test voltage to 2500V.',
    ],
    fact: [
      { status: 'PASS', text: '415V gear → 500V megger (matches chapter example)' },
      { status: 'FIXED', text: '11 kV → typically 2500V (was “1000 or 2500”)' },
      { status: 'PASS', text: 'PI = IR10 / IR1; good PI ≥ 2 — matches advanced section' },
      { status: 'PASS', text: 'Min ~1 MΩ IE Rules thumb rule — matches chapter' },
    ],
  },
  '2.8': {
    verdict: 'ON-TOPIC',
    notes: ['Phase sequence meter, R-Y-B, reverse fix swap two phases — match chapter.'],
    fact: [{ status: 'PASS', text: 'India RYB / clockwise as ABC convention framing — field OK' }],
  },
  '2.9': {
    verdict: 'ON-TOPIC',
    notes: ['Hydraulic crimper/cutter, Pascal, die match, no live cut — match chapter.'],
    fact: [{ status: 'PASS', text: 'Never cut live cable with hydraulic cutter — correct' }],
  },
  '2.10': {
    verdict: 'ON-TOPIC',
    notes: ['Daily care, rust, calibration, retire damaged insulated tools — match chapter.'],
    fact: [{ status: 'PASS', text: 'Calibrate meters periodically; discard cracked insulation — correct' }],
  },
};

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chapter 2 Quiz Relevance & Fact-Check</title>
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
    .badge.warn { background:var(--warn-bg); color:var(--warn); border-color:#fcd34d; }
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
    <h1>Chapter 2 (2.1–2.10) — Quiz Relevance & Fact-Check</h1>
    <p>Same pipeline as Chapter 1: relevance, relocate off-topic, fact fixes, manual review file.</p>
    <div class="stats">
      <span class="tag ok">2.1–2.4, 2.6, 2.8–2.10: on-topic</span>
      <span class="tag fix">2.5: weather Qs → 1.9</span>
      <span class="tag warn">2.7: megger pool trimmed + 11kV factfix</span>
    </div>
  </header>
  <main>
    <section class="summary">
      <h2 style="margin-top:0;font-size:1.05rem">Executive summary</h2>
      <ul>
        <li><strong>2.5:</strong> Removed 2 off-topic items (rain insulating blanket, lightning step potential) → lesson 1.9.</li>
        <li><strong>2.7:</strong> Trimmed oversized megger bank; relocated storm/PTW/capacitor Qs; fixed 11 kV test voltage to <strong>2500V</strong>.</li>
        <li><strong>Other lessons:</strong> Tool-chapter quizzes largely match content; no mass relocation needed.</li>
      </ul>
    </section>
${lessons
  .map((L) => {
    const a = analysis[L.level];
    const badge =
      a.verdict === 'FIXED' || a.verdict === 'TRIMMED' ? 'fix' : a.verdict.includes('OVER') ? 'warn' : 'ok';
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
    Generated 2026-07-25 · <code>public/quiz_management/lesson_2_1_to_2_10_quiz_review.html</code>
    · Log: <code>lesson_2_quiz_cleanup_log.md</code>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'lesson_2_1_to_2_10_quiz_review.html'), html, 'utf8');

const md = [
  '# Chapter 2 Quiz Cleanup Log',
  '',
  'Date: 2026-07-25',
  '',
  '## Actions',
  '',
  '### 2.5 Hot stick',
  '- Moved rain insulating-blanket Q → `questions_1_9.json`',
  '- Moved lightning step-potential walk Q → `questions_1_9.json`',
  '- Kept wet/dirty hot stick insulation Q',
  '',
  '### 2.7 Megger',
  '- Relocated storm megger stop → 1.9',
  '- Relocated capacitor-bank pre-check → 6.7',
  '- Relocated PTW/LC before megger → 1.6',
  '- Dropped peripheral storage/shout/loose-lead trivia',
  '- Fact-fixed 11 kV preferred megger voltage → **2500V**',
  '',
  '### Other lessons (2.1–2.4, 2.6, 2.8–2.10)',
  '- No mass relocation; pools match tool chapter topics',
  '',
  '## Run log',
  '',
  ...log.map((l) => `- ${l}`),
  '',
  '## Final counts',
  '',
  ...lessons.map((L) => `- ${L.level}: ${L.count} — ${analysis[L.level].verdict}`),
  '',
];

fs.writeFileSync(path.join(outDir, 'lesson_2_quiz_cleanup_log.md'), md.join('\n'), 'utf8');

console.log(log.join('\n'));
console.log('\nFinal counts:');
for (const L of lessons) console.log(L.level, L.count, analysis[L.level].verdict);
