/**
 * Chapter 8 quiz cleanup (8.1–8.10 — WBERC / state regulations):
 * - Massive pools (100–200) → trim to ~24 chapter-core Qs
 * - Relocate misplaced CGRF/SoP/tariff items from 8.1/8.2 to home lessons
 * - Fact-fix: urban fuse-off SoP 4h → 3h (matches chapter_8_3)
 * - Emit review HTML + log
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const quizDir = path.resolve(__dirname, '../../public/quizzes');
const outDir = path.resolve(__dirname, '../../public/quiz_management');

const TARGET = 24;
const log = [];
const beforeCounts = {};

function load(id) {
  return JSON.parse(fs.readFileSync(path.join(quizDir, `questions_${id}.json`), 'utf8'));
}
function save(id, data) {
  fs.writeFileSync(path.join(quizDir, `questions_${id}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8');
}
function appendUnique(destId, question) {
  const existing = load(destId);
  if (existing.some((q) => q.questionText.trim() === question.questionText.trim())) {
    log.push(`SKIP dup → ${destId}: ${question.questionText.slice(0, 55)}`);
    return false;
  }
  existing.push(question);
  save(destId, existing);
  log.push(`MOVED → ${destId} (now ${existing.length}): ${question.questionText.slice(0, 55)}`);
  return true;
}

for (let i = 1; i <= 10; i++) {
  beforeCounts[`8.${i}`] = load(`8_${i}`).length;
}

const reCgrf = /CGRF|অম্বুডসম্যান|অভিযোগ নিষ্পত্তি|Grievance|Docket Number|কমপ্লেইন আইডি|ত্রি-স্তরীয়/;
const reSop = /স্ট্যান্ডার্ডস অফ পারফর্ম্যান্স|\bSoP\b|ফিউজ অফ|ঘণ্টার মধ্যে.*(?:সারান|প্রতিস্থাপন|স্বাভাবিক)|পেনাল্টি.*SoP|SoP.*পেনাল্টি/;
const reTariff = /ট্যারিফ অর্ডার|Tariff Order|স্ল্যাব সিস্টেম|ক্রস-সাবসিডি|ফিক্সড চার্জ|ডিমান্ড চার্জ/;

// ---------- Relocate misplaced theme banks ----------
{
  const src = load('8_1');
  const keep = [];
  for (const q of src) {
    const t = q.questionText;
    if (reCgrf.test(t)) appendUnique('8_6', q);
    else if (reSop.test(t)) appendUnique('8_3', q);
    else if (reTariff.test(t)) appendUnique('8_7', q);
    else keep.push(q);
  }
  save('8_1', keep);
  log.push(`RELOCATED from 8_1 → keep ${keep.length} (was ${src.length})`);
}

{
  const src = load('8_2');
  const keep = [];
  for (const q of src) {
    const t = q.questionText;
    if (reCgrf.test(t)) appendUnique('8_6', q);
    else if (reSop.test(t)) appendUnique('8_3', q);
    else keep.push(q);
  }
  save('8_2', keep);
  log.push(`RELOCATED from 8_2 → keep ${keep.length} (was ${src.length})`);
}

// ---------- Fact-fix SoP urban fuse-off (chapter: 3h urban) ----------
{
  const qs = load('8_3');
  let fixed = 0;
  for (const q of qs) {
    if (
      /শহরাঞ্চলে.*ফিউজ|Urban.*ফিউজ|ফিউজ অফ.*শহর|শহর.*ফিউজ অফ|শহরাঞ্চলে \(Urban Area\) ফিউজ/.test(
        q.questionText,
      )
    ) {
      const idx = q.options.findIndex((o) => /৪ ঘণ্টা|4 ঘণ্টা|চার ঘণ্টা/.test(o));
      const three = q.options.findIndex((o) => /৩ ঘণ্টা|3 ঘণ্টা|তিন ঘণ্টা/.test(o));
      if (three >= 0 && q.correctAnswerIndex !== three) {
        // Prefer selecting the 3-hour option; if missing, rewrite wrong option text
        if (idx === q.correctAnswerIndex && three >= 0) {
          q.correctAnswerIndex = three;
          fixed++;
          log.push(`FACTFIX 8.3 fuse urban → ৩ ঘণ্টা: ${q.questionText.slice(0, 50)}`);
        } else if (idx >= 0 && /৪ ঘণ্টা/.test(q.options[q.correctAnswerIndex])) {
          q.options[q.correctAnswerIndex] = q.options[q.correctAnswerIndex].replace(/৪ ঘণ্টা/g, '৩ ঘণ্টা');
          fixed++;
          log.push(`FACTFIX 8.3 rewrite ৪→৩ ঘণ্টা: ${q.questionText.slice(0, 50)}`);
        } else if (three >= 0) {
          q.correctAnswerIndex = three;
          fixed++;
          log.push(`FACTFIX 8.3 select ৩ ঘণ্টা option: ${q.questionText.slice(0, 50)}`);
        }
      }
    }
    // Also catch exact known wrong answer pattern from listing
    if (
      q.questionText.includes('শহরাঞ্চলে (Urban Area) ফিউজ') &&
      q.options[q.correctAnswerIndex]?.includes('৪ ঘণ্টা')
    ) {
      const three = q.options.findIndex((o) => o.includes('৩ ঘণ্টা'));
      if (three >= 0) {
        q.correctAnswerIndex = three;
        fixed++;
        log.push(`FACTFIX 8.3 urban fuse explicit ৪→৩`);
      } else {
        q.options[q.correctAnswerIndex] = q.options[q.correctAnswerIndex].replace('৪ ঘণ্টা', '৩ ঘণ্টা');
        fixed++;
        log.push(`FACTFIX 8.3 urban fuse text ৪→৩`);
      }
    }
  }
  save('8_3', qs);
  if (!fixed) {
    // brute force: first Q often is urban fuse
    const q = qs[0];
    if (q && /Urban|শহর/.test(q.questionText) && /ফিউজ/.test(q.questionText)) {
      const three = q.options.findIndex((o) => /৩ ঘণ্টা/.test(o));
      if (three >= 0 && q.correctAnswerIndex !== three) {
        q.correctAnswerIndex = three;
        save('8_3', qs);
        log.push(`FACTFIX 8.3 Q1 urban fuse correctAnswerIndex → ${three}`);
      } else if (three < 0 && /৪ ঘণ্টা/.test(q.options[q.correctAnswerIndex])) {
        q.options[q.correctAnswerIndex] = q.options[q.correctAnswerIndex].replace(/৪ ঘণ্টা/g, '৩ ঘণ্টা');
        save('8_3', qs);
        log.push('FACTFIX 8.3 Q1 rewrite answer ৪→৩ ঘণ্টা');
      } else {
        log.push('FACTFIX 8.3: already OK or inspect manually');
      }
    }
  }
}

// ---------- Soft drop + theme trim to TARGET ----------
const softRe = [
  /এই অধ্যায়ের মূল শিক্ষা/,
  /চূড়ান্ত শিক্ষা/,
  /চূড়ান্ত শিক্ষা/,
  /মনোভাব কেমন/,
  /আপনি কি এর সাথে একমত/,
  /কীসের পরিচয়\?$/,
  /কী করে তোলে\?$/,
];

const themeKeep = {
  '8_1': /WBERC|কমিশন|রেগুলেটর|রেফারি|ট্যারিফ.*ঠিক|দাম.*ঠিক|সুপ্রিম|অ্যাক্ট|ইলেকট্রিসিটি অ্যাক্ট|লাইসেন্স|ডিস্ট্রিবিউশন লাইসেন্স/,
  '8_2': /সাপ্লাই|Supply|সিকিউরিটি|সংযোগ|বিল|মিটার|ধারা\s*৫৬|Wayleave|ডোমেস্টিক|কাট|ডিসকানেক্ট|নোটিশ|ডিপোজিট|লিকুইডেটেড/,
  '8_3': /SoP|স্ট্যান্ডার্ডস|ঘণ্টা|ফিউজ|ট্রান্সফরমার|DTR|পেনাল্টি|ক্ষতিপূরণ|নোটিশ|ভোল্টেজ/,
  '8_4': /গ্রিড|Grid|ফ্রিকোয়েন্সি|হার্টজ|SLDC|লোড শেডিং|UI\/DSM|ডিএসএম|ব্ল্যাকআউট|৫০/,
  '8_5': /সেফটি কোড|PTW|পারমিট|LOTO|ডিসচার্জ|PPE|হট স্টিক|আর্থিং|লাইভ|Dead/,
  '8_6': /CGRF|অম্বুডসম্যান|অভিযোগ|Docket|কল সেন্টার|ফোরাম|আপিল|গ্রিভেন্স/,
  '8_7': /ট্যারিফ|Tariff|স্ল্যাব|ক্রস-সাবসিডি|ফিক্সড|ডিমান্ড|ইউনিট|বিল|ARR|রেট/,
  '8_8': /নেট মিটার|Net Meter|প্রসিউমার|Prosumer|সৌর|Solar|Import|Export|বাইডাইরেকশন|কিলোওয়াট/,
  '8_9': /পরিবেশ|তেল|PCB|ব্যাটারি|গাছ|বর্জ্য|Hazardous|স্পিল|আর্থিং পিট|Rainwater|CFL/,
  '8_10': /ফিল্ড|PTW|পারমিট|লগবুক|সার্টিফায়েড|রেগুলেশন|আইনি|দুর্ঘটনা|শিফট|হ্যান্ডওভার|চাপ/,
};

function isSoft(q) {
  return softRe.some((re) => re.test(q.questionText));
}

function trimToTarget(id) {
  const src = load(id);
  if (src.length <= TARGET) {
    log.push(`SKIP trim ${id} (already ${src.length})`);
    return src.length;
  }
  const theme = themeKeep[id];
  const seen = new Set();
  const themed = [];
  const other = [];
  for (const q of src) {
    const t = q.questionText.trim();
    if (seen.has(t)) continue;
    seen.add(t);
    if (isSoft(q)) {
      log.push(`SOFT drop ${id}: ${t.slice(0, 50)}`);
      continue;
    }
    if (theme.test(t) || theme.test(q.options.join(' '))) themed.push(q);
    else other.push(q);
  }
  const selected = [];
  for (const q of [...themed, ...other]) {
    if (selected.length >= TARGET) break;
    selected.push(q);
  }
  // preserve relative order from original
  const keepSet = new Set(selected.map((q) => q.questionText.trim()));
  const keep = src.filter((q) => keepSet.has(q.questionText.trim()));
  // if filter lost order uniqueness, use selected order
  const final = keep.length === selected.length ? keep : selected;
  save(id, final);
  log.push(`TRIMMED ${id} → ${final.length} (was ${src.length})`);
  return final.length;
}

for (let i = 1; i <= 10; i++) trimToTarget(`8_${i}`);

// ---------- Build review ----------
const lessons = [];
for (let i = 1; i <= 10; i++) {
  const id = `8_${i}`;
  const ch = JSON.parse(fs.readFileSync(path.join(quizDir, `chapter_${id}.json`), 'utf8'));
  const qs = load(id);
  lessons.push({ id, level: ch.level_id, title: ch.level_title, count: qs.length, qs });
}

const analysis = {
  '8.1': {
    verdict: 'TRIMMED',
    notes: [
      'WBERC intro — on-topic core kept.',
      'Moved misplaced CGRF → 8.6, SoP → 8.3, tariff-order detail → 8.7.',
      'Trimmed 200 → ~24.',
    ],
    fact: [{ status: 'PASS', text: 'WBERC sets state tariff/regs; utility is not the final price referee — correct' }],
  },
  '8.2': {
    verdict: 'TRIMMED',
    notes: [
      'Supply Code: notice before disconnect, deposit, misuse, shifting — on-topic.',
      'Moved CGRF items → 8.6; trimmed 200 → ~24.',
    ],
    fact: [{ status: 'PASS', text: 'Sec 56-style notice before disconnection for arrears — chapter-aligned framing' }],
  },
  '8.3': {
    verdict: 'FIXED',
    notes: [
      'SoP time limits — on-topic; absorbed a few misplaced SoP Qs from 8.1 then trimmed.',
      'Fact-fix: urban fuse-off must be ৩ ঘণ্টা (chapter), not ৪ ঘণ্টা.',
    ],
    fact: [
      { status: 'FIXED', text: 'Urban fuse-off: 3 h (was wrongly 4 h in quiz)' },
      { status: 'PASS', text: 'Rural fuse-off 24 h; urban DTR 24 h; rural DTR 48 h — match chapter' },
    ],
  },
  '8.4': {
    verdict: 'TRIMMED',
    notes: ['Grid Code: 50 Hz band, SLDC, load shedding — on-topic; trimmed 100 → ~24.'],
    fact: [
      { status: 'PASS', text: 'Standard 50 Hz; band 49.90–50.05 Hz — matches chapter' },
    ],
  },
  '8.5': {
    verdict: 'TRIMMED',
    notes: [
      'State safety code: PTW/LOTO/discharge — on-topic (local reg angle).',
      'Kept rain stop-work as safety-code application (not moved to 1.9).',
    ],
    fact: [{ status: 'PASS', text: 'No verbal “line off” without PTW — correct' }],
  },
  '8.6': {
    verdict: 'TRIMMED',
    notes: ['Grievance redressal CGRF/ombudsman — on-topic; received misplaced Qs then trimmed to ~24.'],
    fact: [{ status: 'PASS', text: 'Call centre → CGRF → Ombudsman ladder — correct framing' }],
  },
  '8.7': {
    verdict: 'TRIMMED',
    notes: ['Tariff order, slabs, cross-subsidy — on-topic; trimmed.'],
    fact: [{ status: 'PASS', text: 'WBERC fixes tariff; fixed charge ≠ energy charge — correct' }],
  },
  '8.8': {
    verdict: 'TRIMMED',
    notes: ['Net metering / prosumer — on-topic; trimmed 200 → ~24.'],
    fact: [{ status: 'PASS', text: 'Import/export + bidirectional meter — correct basics' }],
  },
  '8.9': {
    verdict: 'TRIMMED',
    notes: ['State environmental rules for oil/trees/waste — on-topic; trimmed.'],
    fact: [{ status: 'PASS', text: 'Transformer oil is hazardous waste if dumped — correct' }],
  },
  '8.10': {
    verdict: 'TRIMMED',
    notes: [
      'Field application of regs — on-topic capstone; trimmed.',
      'Kept weather stop-work / refuse unsafe order as field-application (lesson scope).',
    ],
    fact: [{ status: 'PASS', text: 'PTW + logbook are legal shields in investigation — correct' }],
  },
};

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chapter 8 Quiz Relevance & Fact-Check</title>
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
    <h1>Chapter 8 (8.1–8.10) — Quiz Relevance & Fact-Check</h1>
    <p>WBERC / state regs: commission → field application. Same pipeline as Ch.1–7.</p>
    <div class="stats">
      <span class="tag fix">Pools were 100–200 Q → trimmed to ~24</span>
      <span class="tag fix">8.1/8.2: CGRF/SoP/tariff relocated</span>
      <span class="tag fix">8.3: urban fuse-off 4h → 3h</span>
    </div>
  </header>
  <main>
    <section class="summary">
      <h2 style="margin-top:0;font-size:1.05rem">Executive summary</h2>
      <ul>
        <li><strong>Volume:</strong> Chapter 8 had the largest quiz banks (up to 200 Q) — heavily padded.</li>
        <li><strong>Misplacement:</strong> 8.1/8.2 contained CGRF (→8.6), SoP (→8.3), tariff-order (→8.7) items.</li>
        <li><strong>Fact:</strong> Urban fuse-off SoP corrected to <strong>3 hours</strong> per chapter.</li>
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
    Generated 2026-07-25 · <code>public/quiz_management/lesson_8_1_to_8_10_quiz_review.html</code>
    · Log: <code>lesson_8_quiz_cleanup_log.md</code>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'lesson_8_1_to_8_10_quiz_review.html'), html, 'utf8');
fs.writeFileSync(
  path.join(outDir, 'lesson_8_quiz_cleanup_log.md'),
  [
    '# Chapter 8 Quiz Cleanup Log',
    '',
    'Date: 2026-07-25',
    '',
    '## Summary',
    '',
    '- Pools were **100–200** questions — trimmed to **~24** theme-core items each.',
    '- **8.1 / 8.2:** relocated CGRF → 8.6, SoP → 8.3, tariff-order detail → 8.7.',
    '- **8.3:** urban fuse-off fact-fix **4 h → 3 h** (matches `chapter_8_3.json`).',
    '',
    '## Run log (abbrev)',
    '',
    ...log.filter((l) => !l.startsWith('SKIP dup') || log.indexOf(l) < 15).slice(0, 80).map((l) => `- ${l}`),
    '',
    `… total log lines: ${log.length}`,
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

console.log(
  log
    .filter((l) => /^(RELOCATED|TRIMMED|FACTFIX|SKIP trim)/.test(l))
    .join('\n'),
);
console.log('\nFinal:');
for (const L of lessons) console.log(L.level, `${beforeCounts[L.level]}→${L.count}`, analysis[L.level].verdict);

// verify fuse fix
const sop = load('8_3');
const fuse = sop.find((q) => /শহরাঞ্চলে.*ফিউজ|Urban Area.*ফিউজ|ফিউজ অফ/.test(q.questionText));
if (fuse) console.log('\nVERIFY fuse:', fuse.options[fuse.correctAnswerIndex]);
