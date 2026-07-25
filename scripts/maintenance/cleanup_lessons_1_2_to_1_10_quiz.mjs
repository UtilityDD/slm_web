/**
 * Rebuild lesson 1.8 fire quiz, fix 1.2/1.9 issues,
 * emit review HTML for lessons 1.2–1.10.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const quizDir = path.resolve(__dirname, '../../public/quizzes');
const outDir = path.resolve(__dirname, '../../public/quiz_management');

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// --- 1.8: replace first-aid duplicate pool with fire questions ---
const fireQuiz = [
  {
    questionText: "মাঠের কাজে Class C আগুন বলতে মূলত কোন আগুনকে বোঝায়?",
    options: ['শুকনো ঘাস বা কাঠের আগুন', 'ট্রান্সফরমার তেলের আগুন', 'লাইভ বৈদ্যুতিক সরঞ্জামের আগুন', 'রান্নাঘরের তেলের আগুন'],
    correctAnswerIndex: 2,
  },
  {
    questionText: "ট্রান্সফরমার অয়েল বা ডিজেলের আগুন কোন Class-এর?",
    options: ['Class A', 'Class B', 'Class C', 'Class K'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "শুকনো ঘাস, কাঠ বা কাগজের আগুন কোন Class-এর?",
    options: ['Class A', 'Class B', 'Class C', 'Class D'],
    correctAnswerIndex: 0,
  },
  {
    questionText: "Class C (বৈদ্যুতিক) আগুনে জল কেন কঠোরভাবে নিষিদ্ধ?",
    options: ['জল আগুনকে ঠান্ডা করে না', 'জল বিদ্যুৎ পরিবাহী—শকের ঝুঁকি', 'জল নির্বাপক যন্ত্র নষ্ট করে', 'জল শুধু ঘাসের আগুনে লাগে'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "তেলের (Class B) আগুনে জল দেওয়া কেন বিপজ্জনক?",
    options: ['তেল জলে ভাসে ও আগুন ছড়ায়', 'জল তেল শুষে নেয়', 'জল নিভে যায় দ্রুত', 'জল চাপ কমিয়ে দেয়'],
    correctAnswerIndex: 0,
  },
  {
    questionText: "Class C আগুনে নিরাপদ হলে প্রথম সবচেয়ে গুরুত্বপূর্ণ কাজ কোনটি?",
    options: ['সরাসরি জল ঢালা', 'পাওয়ার সোর্স OFF করা', 'ফেনা স্প্রে করা', 'ভিড় জমানো'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "ফিল্ডে সবচেয়ে উপযোগী সাধারণ অগ্নি নির্বাপক কোনটি?",
    options: ['শুধু জলের এক্সটিংগুইশার', 'DCP (Dry Chemical Powder / ABC)', 'ভেজা রাসায়নিক ফোম শুধু', 'শুধু বালি ছাড়া আর কিছু নয়'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "CO2 এক্সটিংগুইশার মূলত কীভাবে আগুন নেভায়?",
    options: ['জ্বালানি শুষে নেয়', 'অক্সিজেন সরিয়ে দেয়', 'তাপ বাড়িয়ে দেয়', 'তেলকে জলে মেশায়'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "ছোট তেলের আগুন নেভাতে বালি বা শুকনো মাটির কাজ কী?",
    options: ['তাপ বাড়ানো', 'অক্সিজেন বন্ধ করা', 'বিদ্যুৎ চালু রাখা', 'জল তৈরি করা'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "অগ্নি নির্বাপক যন্ত্র ব্যবহারের PASS-এর প্রথম ধাপ P কী?",
    options: ['Push — হাতল ঠেলা', 'Pull — সেফটি পিন টানা', 'Point — আকাশে তোলা', 'Press — মাটিতে চাপানো'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "PASS পদ্ধতিতে Aim (A) করার সময় লক্ষ্য কোথায় রাখবেন?",
    options: ['শিখার ওপরের ডগায়', 'আগুনের গোড়ায়', 'ধোঁয়ার মেঘে', 'নিজের পায়ের কাছে'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "PASS-এর সঠিক ক্রম কোনটি?",
    options: ['Squeeze → Pull → Aim → Sweep', 'Pull → Aim → Squeeze → Sweep', 'Aim → Sweep → Pull → Squeeze', 'Sweep → Squeeze → Aim → Pull'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "একবার ব্যবহার করা অগ্নি নির্বাপক যন্ত্র পরে কী করা উচিত?",
    options: ['কিছু বাঁচিয়ে রাখা যায়', 'রিফিল/সার্ভিসের জন্য পাঠানো', 'চাপ না থাকলেও ব্যবহার', 'জল ভরে রাখা'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "এক্সটিংগুইশার ব্যবহারের আগে প্রেশার গেজ কেমন থাকা উচিত?",
    options: ['লাল দাগে', 'সবুজ দাগে (Ready)', 'শূন্যে', 'গেজ দেখার দরকার নেই'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "আগুন নেভানোর সময় বাতাসের দিক কীভাবে নেবেন?",
    options: ['বাতাস সামনে রেখে দাঁড়াবেন', 'বাতাস পেছনে রেখে দাঁড়াবেন', 'বাতাসের দিক গুরুত্বহীন', 'ধোঁয়ার দিকে এগোবেন'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "আগুন নেভানোর সময় এস্কেপ রুট নিয়ে সঠিক নিয়ম কোনটি?",
    options: ['পেছনের পথ বন্ধ রাখা', 'পেছনে বেরোনোর পথ খোলা রাখা', 'কোণে আটকে থেকে নেভানো', 'শুধু সামনের দিক দেখা'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "আগুন নিয়ন্ত্রণের বাইরে চলে গেলে সঠিক পদক্ষেপ কোনটি?",
    options: ['হিরো হয়ে ভেতরে যাওয়া', 'ফায়ার ব্রিগেডকে কল ও নিরাপদে সরে যাওয়া', 'জলের পাইপ খুঁজে নেওয়া', 'একাই শেষ পর্যন্ত লড়া'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "Fire Tetrahedron-এর চারটি উপাদানের মধ্যে কোনটি নেই?",
    options: ['Heat', 'Fuel', 'Oxygen', 'Nitrogen'],
    correctAnswerIndex: 3,
  },
  {
    questionText: "DCP এক্সটিংগুইশার আগুনের কোন অংশকে প্রধানত থামায়?",
    options: ['শুধু জ্বালানি সরানো', 'চেইন রিঅ্যাকশন থামানো', 'শুধু জল যোগ করা', 'ভোল্টেজ বাড়ানো'],
    correctAnswerIndex: 1,
  },
  {
    questionText: "বৈদ্যুতিক প্যানেলে আগুন নেভানোর জন্য কোন নির্বাপক যন্ত্র সঠিক?",
    options: ['প্রচুর পরিমাণ জল', 'রাসায়নিক লিকুইড ফোম', 'ড্রাই পাউডার বা CO2', 'ভেজা মোটা চটের বস্তা'],
    correctAnswerIndex: 2,
  },
];

writeJson(path.join(quizDir, 'questions_1_8.json'), fireQuiz);

// --- 1.2: fix operating-rod distance fact ---
{
  const file = path.join(quizDir, 'questions_1_2.json');
  const q = JSON.parse(fs.readFileSync(file, 'utf8'));
  const idx = q.findIndex((x) => x.questionText.includes('১০ ফুটের অপারেটিং রড'));
  if (idx >= 0) {
    q[idx] = {
      questionText: 'হাতে অপারেটিং রড থাকলেও ১১ কেভি লাইন থেকে শরীরের ন্যূনতম নিরাপদ দূরত্ব কত রাখা উচিত?',
      options: [
        'কোনো দূরত্ব লাগবে না',
        'কমপক্ষে দুই ফুট',
        'কমপক্ষে আট ফুট (প্রায় ২.৫ মিটার)',
        'কমপক্ষে এক ফুট',
      ],
      correctAnswerIndex: 2,
    };
  }
  // Soft-align 33kV wording to lesson (3.0 m ≈ 10 ft)
  const idx33 = q.findIndex((x) => x.questionText.includes('৩৩ কেভি লাইনে কাজের সময়'));
  if (idx33 >= 0) {
    q[idx33] = {
      questionText: '৩৩ কেভি লাইনে কাজের সময় শরীর থেকে তারের ন্যূনতম দূরত্ব কত রাখা উচিত?',
      options: [
        'দুই ফুটের কিছুটা বেশি দূরত্ব',
        'পাঁচ ফুটের কিছুটা বেশি দূরত্ব',
        'প্রায় দশ ফুট (৩.০ মিটার)',
        'বারো ইঞ্চি মাত্র',
      ],
      correctAnswerIndex: 2,
    };
  }
  writeJson(file, q);
}

// --- 1.9: remove duplicate wet-rope question relocated from 1.1 ---
{
  const file = path.join(quizDir, 'questions_1_9.json');
  const q = JSON.parse(fs.readFileSync(file, 'utf8'));
  const filtered = q.filter(
    (x) => x.questionText.trim() !== 'বৃষ্টির জলে ভেজা দড়ি বা রোপ ব্যবহার করা কেন বিপজ্জনক?',
  );
  writeJson(file, filtered);
  console.log('1.9 count', q.length, '→', filtered.length);
}

// --- Build review HTML ---
const lessons = [];
for (let i = 2; i <= 10; i++) {
  const id = `1.${i}`;
  const fileId = `1_${i}`;
  const ch = JSON.parse(fs.readFileSync(path.join(quizDir, `chapter_${fileId}.json`), 'utf8'));
  const qs = JSON.parse(fs.readFileSync(path.join(quizDir, `questions_${fileId}.json`), 'utf8'));
  lessons.push({ id, fileId, title: ch.level_title, count: qs.length, ch, qs });
}

const analysis = {
  '1.2': {
    scope: 'Safe approach distance, arc flash, corona, weather/tool effects on clearance',
    verdict: 'MOSTLY ON-TOPIC',
    related: 22,
    off: 0,
    notes: [
      'Relocated arc-goggles + fallen-wire from 1.1 fit this lesson.',
      'FIXED: operating-rod distance was wrongly “২ ফুট”; now ৮ ফুট / ২.৫ মিটার for 11 kV.',
      'FIXED: 33 kV distance wording aligned to lesson (~১০ ফুট / ৩.০ মিটার).',
    ],
    fact: [
      { status: 'FIXED', text: '11 kV SAD ≈ 2.5 m (8 ft); 33 kV ≈ 3.0 m (10 ft) per chapter' },
      { status: 'PASS', text: 'Air dielectric ~30 kV/cm mentioned in advanced section — quiz dielectric/arc items OK' },
    ],
  },
  '1.3': {
    scope: 'Pole inspection: 360°, sound test, visual scan, hardware',
    verdict: 'ON-TOPIC',
    related: 21,
    off: 0,
    notes: [
      'Relocated bent-pole risk from 1.1 fits leaning-pole / wire-tension content.',
      'No clear off-topic items found.',
    ],
    fact: [{ status: 'PASS', text: 'Sound-test / rust-at-ground-line / hairline crack guidance matches chapter' }],
  },
  '1.4': {
    scope: 'Full body harness, waist belt myth, inspection, fitting, lanyard/anchor',
    verdict: 'ON-TOPIC',
    related: 20,
    off: 0,
    notes: ['Pool tightly matches harness lesson. Suspension trauma is advanced but valid fall-arrest topic.'],
    fact: [{ status: 'PASS', text: 'Waist belt vs full-body harness teaching consistent with chapter + 1.1' }],
  },
  '1.5': {
    scope: 'Capacitive/induced voltage, earth-first discharge, rod care',
    verdict: 'ON-TOPIC',
    related: 22,
    off: 0,
    notes: [
      'Relocated discharge-rod + backfeed from 1.1 fit “dead line still dangerous”.',
      'Backfeed (solar/UPS) is a valid extra hazard beyond capacitive/induced — keep.',
    ],
    fact: [{ status: 'PASS', text: 'Earth-first then line is correct and matches chapter golden rule' }],
  },
  '1.6': {
    scope: 'PTW, LOTO, Line Clear return',
    verdict: 'ON-TOPIC',
    related: 22,
    off: 0,
    notes: ['Relocated LC + LOTO from 1.1 fit. Interlocking Q is stretch but related to isolation safety.'],
    fact: [{ status: 'PASS', text: 'Verbal PTW invalid; permit holder returns LC — matches chapter' }],
  },
  '1.7': {
    scope: 'Electric shock first aid, isolate source, CPR, do not touch live victim',
    verdict: 'ON-TOPIC',
    related: 21,
    off: 0,
    notes: ['Relocated “power source first” from 1.1 fits. Pool matches first-aid chapter.'],
    fact: [
      { status: 'PASS', text: 'Do not touch live victim; isolate source first — correct' },
      { status: 'SOFT', text: 'Brain-cell death timing / VF wording are simplified medical facts — OK for field quiz' },
    ],
  },
  '1.8': {
    scope: 'Fire classes A/B/C, no water on B/C, DCP/CO2/sand, PASS',
    verdict: 'FIXED — WAS WRONG QUIZ',
    related: 20,
    off: 0,
    notes: [
      'CRITICAL: previous questions_1_8.json was a near-copy of 1.7 first-aid (20/21 identical).',
      'Rebuilt 20 fire questions from chapter_1_8.json; kept DCP/CO2 panel extinguisher item.',
    ],
    fact: [
      { status: 'FIXED', text: 'Replaced entire off-topic first-aid pool with fire content' },
      { status: 'PASS', text: 'PASS = Pull Aim Squeeze Sweep; Class C = live electrical; no water on B/C' },
    ],
  },
  '1.9': {
    scope: 'Rain, lightning, high wind (≥40–50 km/h), stop-work authority',
    verdict: 'ON-TOPIC BUT OVERSIZED',
    related: 100,
    off: 0,
    notes: [
      'Chapter is short (3 weather themes); quiz pool ~100 items — many are stretch scenarios (battery room, motor terminal, UG jointing) beyond chapter text.',
      'Removed duplicate wet-rope Q relocated from 1.1 (already covered by existing Q9).',
      'Not mass-relocated stretch items (would empty useful weather drills); flagged for optional later trim.',
    ],
    fact: [
      { status: 'PASS', text: 'Wind stop threshold 40–50 km/h matches chapter golden rule' },
      { status: 'PASS', text: 'Lightning: PPE does not protect — matches myth buster' },
      { status: 'SOFT', text: 'Some numeric/scenario details (anemometer, AB cable, etc.) not in chapter — stretch' },
    ],
  },
  '1.10': {
    scope: 'Module review / 10-second mental checklist across chapter 1',
    verdict: 'ON-TOPIC (BY DESIGN)',
    related: 21,
    off: 0,
    notes: [
      'Intentionally spans PPE, clearance, pole, harness, discharge, PTW, first aid, fire, weather.',
      'Toolbox talk from 1.1 fits pre-climb risk discussion / checklist culture.',
      'Do not treat cross-topic questions as off-topic here.',
    ],
    fact: [{ status: 'PASS', text: 'PASS order and module recap items consistent with prior lessons' }],
  },
};

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lessons 1.2–1.10 Quiz Relevance & Fact-Check</title>
  <style>
    :root { --bg:#f8fafc; --ink:#0f172a; --muted:#64748b; --card:#fff; --line:#cbd5e1;
      --ok:#166534; --ok-bg:#f0fdf4; --warn:#92400e; --warn-bg:#fffbeb; --bad:#991b1b; --bad-bg:#fef2f2; --fix:#1e40af; --fix-bg:#eff6ff; }
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
    .tag.bad { background:var(--bad-bg); color:var(--bad); border-color:#fca5a5; }
    main { max-width:980px; margin:0 auto; padding:1rem; }
    .summary { background:var(--card); border:2px solid var(--ink); padding:1rem; margin-bottom:1rem; }
    .lesson { background:var(--card); border:2px solid var(--ink); margin-bottom:1rem; }
    .lesson > h2 { margin:0; padding:.75rem 1rem; border-bottom:1px solid var(--line); font-size:1.05rem; display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
    .badge { font-size:.72rem; font-weight:700; padding:.15rem .45rem; border:1px solid; }
    .badge.ok { background:var(--ok-bg); color:var(--ok); border-color:#86efac; }
    .badge.warn { background:var(--warn-bg); color:var(--warn); border-color:#fcd34d; }
    .badge.fix { background:var(--fix-bg); color:var(--fix); border-color:#93c5fd; }
    .badge.bad { background:var(--bad-bg); color:var(--bad); border-color:#fca5a5; }
    .body { padding:.85rem 1rem; }
    .body h3 { margin:.6rem 0 .35rem; font-size:.95rem; }
    .body ul { margin:.25rem 0 .5rem; padding-left:1.2rem; }
    .q { border-top:1px dashed var(--line); padding:.55rem 0; font-size:.9rem; }
    .q strong { display:inline-block; min-width:2.2rem; }
    .ans { color:var(--ok); }
    footer { max-width:980px; margin:0 auto 2rem; padding:0 1rem; color:var(--muted); font-size:.8rem; }
  </style>
</head>
<body>
  <header>
    <h1>Lessons 1.2–1.10 — Quiz Relevance & Fact-Check</h1>
    <p>Companion to lesson 1.1 review. Actions applied: rebuild 1.8 fire quiz, fix 1.2 distances, dedupe 1.9 wet-rope.</p>
    <div class="stats">
      <span class="tag ok">1.3–1.7, 1.10: on-topic</span>
      <span class="tag fix">1.8: rebuilt (was 1.7 copy)</span>
      <span class="tag fix">1.2: distance facts fixed</span>
      <span class="tag warn">1.9: on-topic but ~100 Q vs short chapter</span>
    </div>
  </header>
  <main>
    <section class="summary">
      <h2 style="margin-top:0;font-size:1.05rem">Executive summary</h2>
      <ul>
        <li><strong>Critical bug:</strong> <code>questions_1_8.json</code> was almost identical to first-aid lesson 1.7 — rebuilt from fire chapter.</li>
        <li><strong>1.2–1.7:</strong> pools match lesson topics (including items relocated from 1.1).</li>
        <li><strong>1.10:</strong> intentionally cross-topic module review — keep as-is.</li>
        <li><strong>1.9:</strong> weather-relevant but oversized; duplicate wet-rope removed; optional later trim of stretch scenarios.</li>
      </ul>
    </section>
${lessons
  .map((L) => {
    const a = analysis[L.id];
    const badgeClass =
      a.verdict.includes('FIXED') || a.verdict.includes('WRONG')
        ? 'fix'
        : a.verdict.includes('OVERSIZED')
          ? 'warn'
          : 'ok';
    const qPreview = L.qs
      .slice(0, 8)
      .map(
        (q, i) =>
          `<div class="q"><strong>Q${i + 1}</strong> ${q.questionText}<br/><span class="ans">→ ${q.options[q.correctAnswerIndex]}</span></div>`,
      )
      .join('');
    const more = L.count > 8 ? `<p style="color:var(--muted);font-size:.85rem">… +${L.count - 8} more in <code>questions_${L.fileId}.json</code></p>` : '';
    return `
    <section class="lesson" id="L${L.fileId}">
      <h2>
        <span>Lesson ${L.id}</span>
        <span class="badge ${badgeClass}">${a.verdict}</span>
        <span class="tag">${L.count} questions</span>
      </h2>
      <div class="body">
        <p><strong>${L.title}</strong></p>
        <p style="color:var(--muted);font-size:.9rem"><strong>Scope:</strong> ${a.scope}</p>
        <h3>Relevance notes</h3>
        <ul>${a.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
        <h3>Fact-check</h3>
        <ul>${a.fact.map((f) => `<li><strong>${f.status}:</strong> ${f.text}</li>`).join('')}</ul>
        <h3>Sample questions (manual skim)</h3>
        ${qPreview}
        ${more}
      </div>
    </section>`;
  })
  .join('\n')}
  </main>
  <footer>
    Generated 2026-07-25 ·
    <code>public/quiz_management/lesson_1_2_to_1_10_quiz_review.html</code>
    · Also see <code>lesson_1_1_quiz_relevance_review.html</code> / <code>lesson_1_1_quiz_factcheck.html</code>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'lesson_1_2_to_1_10_quiz_review.html'), html, 'utf8');

const log = `# Lessons 1.2–1.10 Quiz Cleanup Log

Date: 2026-07-25

## Actions

### 1.8 — CRITICAL FIX
- Previous \`questions_1_8.json\` was a near-copy of lesson 1.7 first-aid (20/21 identical).
- Rebuilt **20** fire-safety questions from \`chapter_1_8.json\` (Class A/B/C, no water, DCP/CO2, PASS, tetrahedron).

### 1.2 — FACT FIX
- Operating rod / 11 kV body distance: was incorrectly **২ ফুট** → now **৮ ফুট (২.৫ মিটার)**.
- 33 kV distance wording aligned to chapter **~১০ ফুট (৩.০ মিটার)**.

### 1.9 — DEDUPE
- Removed duplicate wet-rope question relocated from 1.1 (already covered).
- Pool remains large (~100); chapter is short — optional future trim of stretch scenarios.

### 1.3–1.7, 1.10
- No mass relocation needed; pools match lesson intent (1.10 is module review by design).

## Review file
- \`public/quiz_management/lesson_1_2_to_1_10_quiz_review.html\`
`;

fs.writeFileSync(path.join(outDir, 'lesson_1_2_to_1_10_quiz_cleanup_log.md'), log, 'utf8');

console.log('1.8 rebuilt:', fireQuiz.length);
console.log('Review written');
for (const L of lessons) {
  console.log(L.id, L.count, analysis[L.id].verdict);
}
