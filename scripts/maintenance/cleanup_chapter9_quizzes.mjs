/**
 * Chapter 9 quiz cleanup (9.1–9.10 — Testing Manual):
 * - CRITICAL: rebuild 9.4 (was transformer cooling/Buchholz, not cable testing)
 * - Park old 9.4 transformer-protection Qs into 9.1 (unique), then trim
 * - Trim oversized pools (~45–152) → ~24 theme-core
 * - Move general lightning Q from 9.8 → 1.9
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
  beforeCounts[`9.${i}`] = load(`9_${i}`).length;
}

// ---------- CRITICAL: 9.4 was wrong chapter content ----------
{
  const old = load('9_4');
  // Park transformer cooling/protection testing into 9.1 (related testing badge)
  for (const q of old) appendUnique('9_1', q);

  const rebuilt = [
    {
      questionText: 'আন্ডারগ্রাউন্ড কেবিল টেস্টিং-এর প্রধান উদ্দেশ্য কী?',
      options: [
        'শুধু কেবিলের রং ও ব্র্যান্ড যাচাই করা',
        'মাটির নিচের কেবিলের ইনসুলেশন ও স্বাস্থ্য নিশ্চিত করা যাতে ফল্ট/ব্ল্যাকআউট এড়ানো যায়',
        'শুধু মিটার রিডিং বাড়ানো',
        'শুধু পোলের উচ্চতা মাপা',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'কেবিলের কন্টিনিউটি টেস্ট দিয়ে মূলত কী নিশ্চিত করা হয়?',
      options: [
        'তেলের BDV মান',
        'কন্ডাক্টর মাঝপথে ছেঁড়া নেই এবং পথ সম্পূর্ণ আছে',
        'ব্যাটারি চার্জ ১০০%',
        'ফ্রিকোয়েন্সি ৫০ Hz',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'ফেজ আইডেন্টিফিকেশন টেস্ট কেন জরুরি?',
      options: [
        'যাতে সোর্সের R/Y/B ফেজ লোড সাইডের সঠিক ফেজে পৌঁছায়; জয়েন্টে ফেজ গুলিয়ে না যায়',
        'যাতে কেবিলের ওজন কমে',
        'যাতে আর্মার খুলে ফেলা যায়',
        'যাতে মেগারের ব্যাটারি বাঁচে',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'HT কেবিলের ইনসুলেশন রেজিস্ট্যান্স (IR) টেস্টে সাধারণত কোন মেগার ব্যবহার করা হয়?',
      options: ['৫০০ ভোল্ট মেগার', '১০০ ভোল্ট মেগার', '৫০০০ ভোল্ট (5 kV) মেগার', '১২ ভোল্ট টেস্টার'],
      correctAnswerIndex: 2,
    },
    {
      questionText: 'LT কেবিলের IR টেস্টে সাধারণত কোন রেটিং-এর মেগার ব্যবহার করা হয়?',
      options: ['৫০০০ ভোল্ট', '৫০০/১০০০ ভোল্ট', '৩৩ কেভি হাই-পট শুধু', 'কোনো মেগার লাগে না'],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'কেবিল IR টেস্টে কোন দুটি পরিমাপ করা হয়?',
      options: [
        'শুধু ক্যাপাসিট্যান্স ও ইনডাক্ট্যান্স',
        'ফেজ-টু-আর্থ এবং ফেজ-টু-ফেজ ইনসুলেশন',
        'শুধু তেলের অ্যাসিডিটি',
        'শুধু আর্থ রেজিস্ট্যান্স',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'মেগার রিডিং মেগা-ওহম রেঞ্জে না এলে কী করা উচিত?',
      options: [
        'তবুও কেবিল চার্জ করে দেওয়া',
        'কেবিল চার্জ না করা; ইনসুলেশন দুর্বল/বিপজ্জনক বলে ধরে তদন্ত করা',
        'শুধু ফিউজ মোটা করা',
        'মিটার বাইপাস করা',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'আধুনিক কেবিল হাই-পট টেস্টে কোন পদ্ধতি বেশি সুপারিশ করা হয়?',
      options: [
        'শুধু হাত দিয়ে তার ছুঁয়ে দেখা',
        'VLF (Very Low Frequency) হাই-পট',
        'শুধু ক্ল্যাম্প মিটার',
        'শুধু থার্মাল ক্যামেরা',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'VLF হাই-পট টেস্টে সাধারণত কী করা হয়?',
      options: [
        'রেটেড ভোল্টেজের চেয়ে দেড়–দ্বিগুণ ভোল্টেজ নির্দিষ্ট সময় ধরে প্রয়োগ করা',
        'শুধু ১২ ভোল্ট ব্যাটারি লাগানো',
        'শুধু আর্মার রং করা',
        'শুধু পোল নম্বর লেখা',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: "'নতুন কেবিল ড্রাম থেকে খুলেছি, টেস্ট লাগবে না'—এই ধারণাটি ভুল কেন?",
      options: [
        'পরিবহন/ড্রাম গড়ানোর সময় ইনসুলেশন ক্ষতিগ্রস্ত হতে পারে; ইনস্টল আগে-পরে টেস্ট বাধ্যতামূলক',
        'নতুন কেবিলে কখনো ফল্ট হয় না',
        'মেগার নতুন কেবিলে কাজ করে না',
        'WBERC টেস্ট নিষেধ করেছে',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'পুরনো XLPE কেবিলে DC হাই-পট কেন এড়ানো হয়?',
      options: [
        'DC টেস্ট সস্তা বলে',
        'DC হাই-পট স্পেস চার্জ তৈরি করে ইনসুলেশনের আয়ু কমাতে পারে; VLF (AC) পছন্দনীয়',
        'DC টেস্ট শুধু LT-তে বাধ্যতামূলক',
        'DC টেস্ট আর্মার গলায়',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'শীথ (Sheath) ইন্টিগ্রিটি টেস্ট দিয়ে কী পরীক্ষা করা হয়?',
      options: [
        'কেবিলের বাইরের জ্যাকেট/কভারের ক্ষতি বা ইনজুরি',
        'শুধু মিটার CAL LED',
        'শুধু ব্রেকার স্প্রিং চার্জ',
        'শুধু সিলিকা জেলের রং',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'কেবিলকে একটি বিশাল ক্যাপাসিটর বলা হয় কেন—টেস্টিং সেফটির দিক থেকে?',
      options: [
        'কারণ এটি তেল ধরে রাখে',
        'টেস্টের পর মারাত্মক চার্জ ধরে রাখতে পারে; ডিসচার্জ ছাড়া স্পর্শ বিপজ্জনক',
        'কারণ এটি ফ্রিকোয়েন্সি বাড়ায়',
        'কারণ এটি সবসময় ডেড থাকে',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'মেগার/হাই-পট শেষে কেবিল ডিসচার্জ করার সঠিক অভ্যাস কোনটি?',
      options: [
        'হাত দিয়ে টার্মিনাল ছুঁয়ে দেওয়া',
        'ডিসচার্জ রড দিয়ে পর্যাপ্ত সময় আর্থ করে রাখা (যেমন কয়েক মিনিট)',
        'শুধু সুইচ অফ করলেই যথেষ্ট',
        'পানি ছিটিয়ে দেওয়া',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'মেগারের গার্ড (G) টার্মিনাল কেবিল টার্মিনেশনে কেন ব্যবহার করা হয়?',
      options: [
        'সারফেস লিকেজ কারেন্ট বাইপাস করে সঠিক IR রিডিং পেতে',
        'কেবিল গরম করতে',
        'ফেজ রং বদলাতে',
        'আর্মার চুরি আটকাতে',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'কেবিল ফল্টের সম্ভাবনা সবচেয়ে বেশি কোথায়?',
      options: ['শুধু ড্রামের মাঝখানে সুস্থ অংশে', 'জয়েন্টগুলোতে', 'শুধু পোল নামপ্লেটে', 'শুধু মিটার বক্সের লক-এ'],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'VLF-এ ০.১ Hz ফ্রিকোয়েন্সি ব্যবহারের প্রধান সুবিধা কী?',
      options: [
        'লম্বা কেবিল ছোট মেশিন দিয়েই টেস্ট করা যায় (৫০ Hz-এ বিশাল কারেন্ট লাগত)',
        'ফ্রিকোয়েন্সি বাড়িয়ে গ্রিড ৬০ Hz করা',
        'তেলের BDV বাড়ানো',
        'ব্যাটারি চার্জ দ্রুত করা',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'XLPE কেবিলের "ওয়াটার ট্রিয়িং" বলতে কী বোঝায়?',
      options: [
        'ইনসুলেশনে আর্দ্রতাজনিত সূক্ষ্ম ফাটল যা ধীরে কেবিল নষ্ট করে',
        'শুধু গাছের ডাল কেবিলে স্পর্শ',
        'শুধু আর্থ পিটে জল দেওয়া',
        'শুধু বৃষ্টিতে পোল ধোয়া',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'IR টেস্টের আগে কেবিলের দুই প্রান্তের আর্মার/আর্থিং নিয়ে কী সতর্কতা নেওয়া উচিত?',
      options: [
        'দুই প্রান্তের আর্মার/আর্থিং খুলে আলাদা করে নেওয়া',
        'আর্মার একসাথে শর্ট করে লাইভ রাখা',
        'আর্মার কেটে ফেলা',
        'কিছুই করার দরকার নেই',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'বৃষ্টির সময় বা ভেজা টার্মিনেশনে মেগার রিডিং ভুল আসতে পারে—কী করা উচিত?',
      options: [
        'টার্মিনেশন শুকিয়ে (যেমন হিট গান) পরিষ্কার করে তারপর টেস্ট করা',
        'ভেজা অবস্থাতেই চার্জ দেওয়া',
        'রিডিং উপেক্ষা করা',
        'মেগার ভোল্টেজ কমিয়ে শূন্য করা',
      ],
      correctAnswerIndex: 0,
    },
  ];

  save('9_4', rebuilt);
  log.push(`REBUILT questions_9_4.json → ${rebuilt.length} cable-testing Qs (was transformer cooling bank)`);
}

// ---------- 9.8 lightning general → 1.9 ----------
{
  const src = load('9_8');
  const move = new Set([
    'বজ্রপাতের ঠিক আগের মুহূর্তে গায়ের লোম খাড়া হয়ে গেলে তাৎক্ষণিক জীবন রক্ষাকারী পদক্ষেপ কোনটি?',
  ]);
  const keep = [];
  for (const q of src) {
    if (move.has(q.questionText.trim())) appendUnique('1_9', q);
    else keep.push(q);
  }
  save('9_8', keep);
  log.push(`UPDATED 9_8 after weather move → ${keep.length}`);
}

// ---------- Trim all to TARGET ----------
const softRe = [/মূল শিক্ষা/, /চূড়ান্ত শিক্ষা/, /চূড়ান্ত শিক্ষা/, /মনোভাব কেমন/, /একমত/, /কীসের পরিচয়\?$/];

const themeKeep = {
  '9_1': /মেগার|ইনসুলেশন|IR|ওহম|ট্রান্সফরমার|বুশিং|ওয়াইন্ডিং|পিআই|পোলারাইজ|বুখলজ|WTI|OTI|ফ্যান|PRV|ব্রিদার|সিলিকা/,
  '9_2': /তেল|BDV|DGA|স্যাম্পল|অ্যাসিডিটি|ইন্টারফেসিয়াল|moisture|জল|ফ্ল্যাশ|ডাই-ইলেকট্রিক/,
  '9_3': /ব্রেকার|VCB|SF6|এসএফ|টাইমিং|контакт|মেকানিক্যাল|ট্রিপ|ক্লোজ|ওয়্যার রেজিস্ট্যান্স|CRM/,
  '9_4': /কেবিল|Cable|মেগার|VLF|হাই-পট|শীথ|ফেজ|কন্টিনিউটি|IR|ডিসচার্জ|XLPE|জয়েন্ট/,
  '9_5': /আর্থ|গ্রাউন্ড|স্পাইক|Fall of Potential|রেজিস্ট্যান্স|পিট|স্ট্রিপ|টাচ|স্টেপ/,
  '9_6': /ইনসুলেটর|মেগার|পোরোসিটি|ফ্ল্যাশওভার|ডিস্ক|পিন|ক্রিপেজ|পলিমার|পোর্সেলিন|IEC|ANSI/,
  '9_7': /রিলে|প্রোটেকশন|সেকেন্ডারি|ইঞ্জেকশন|পিকআপ|টাইম|ওয়াচডগ|নিউমেরিক্যাল|O\/C|E\/F/,
  '9_8': /ব্যাটারি|চার্জার|DC|সেল|ভোল্টেজ|ইলেক্ট্রোলাইট|স্পেসিফিক গ্র্যাভিটি|ফ্লোট|বুস্ট|হাইড্রোমিটার|ভেন্টিলেশন/,
  '9_9': /ক্যাপাসিটর|ডিসচার্জ|পাওয়ার ফ্যাক্টর|APFC|ফুলে|হারমোনিক|kVAR|রিঅ্যাকটিভ/,
  '9_10': /রিপোর্ট|ডেটা|ইকুইপমেন্ট|সিরিয়াল|টেস্ট রেজাল্ট|সুপারিশ|হিস্ট্রি|ডকুমেন্ট|প্রেসক্রিপশন/,
};

function isSoft(q) {
  return softRe.some((re) => re.test(q.questionText));
}

function trimToTarget(id) {
  const src = load(id);
  if (src.length <= TARGET) {
    log.push(`SKIP trim ${id} (already ${src.length})`);
    return;
  }
  const theme = themeKeep[id];
  const seen = new Set();
  const themed = [];
  const other = [];
  for (const q of src) {
    const t = q.questionText.trim();
    if (seen.has(t)) continue;
    seen.add(t);
    if (isSoft(q)) continue;
    const blob = t + ' ' + q.options.join(' ');
    if (theme.test(blob)) themed.push(q);
    else other.push(q);
  }
  const selected = [];
  for (const q of [...themed, ...other]) {
    if (selected.length >= TARGET) break;
    selected.push(q);
  }
  const keepSet = new Set(selected.map((q) => q.questionText.trim()));
  const keep = src.filter((q) => keepSet.has(q.questionText.trim()));
  const final = keep.length ? keep.slice(0, TARGET) : selected;
  save(id, final);
  log.push(`TRIMMED ${id} → ${final.length} (was ${src.length})`);
}

for (let i = 1; i <= 10; i++) trimToTarget(`9_${i}`);

// ---------- Review ----------
const lessons = [];
for (let i = 1; i <= 10; i++) {
  const id = `9_${i}`;
  const ch = JSON.parse(fs.readFileSync(path.join(quizDir, `chapter_${id}.json`), 'utf8'));
  const qs = load(id);
  lessons.push({ id, level: ch.level_id, title: ch.level_title, count: qs.length, qs });
}

const analysis = {
  '9.1': {
    verdict: 'TRIMMED',
    notes: [
      'Transformer basic IR/megger — on-topic.',
      'Received parked cooling/Buchholz/OTI items from old 9.4; trimmed to ~24 theme-core.',
    ],
    fact: [{ status: 'PASS', text: 'HV IR megger typically 2.5/5 kV — matches chapter' }],
  },
  '9.2': {
    verdict: 'TRIMMED',
    notes: [
      'Oil BDV/DGA/sample — on-topic.',
      'Kept rain-sample bans (oil-test technical, not 1.9 PPE).',
    ],
    fact: [{ status: 'PASS', text: 'Sample from bottom valve; avoid plastic bottles — chapter-aligned' }],
  },
  '9.3': {
    verdict: 'TRIMMED',
    notes: ['CB testing: SF6/VCB checks, timing/mechanical — on-topic; trimmed.'],
    fact: [{ status: 'PASS', text: 'Check SF6/gas & mechanism before functional tests — good practice' }],
  },
  '9.4': {
    verdict: 'REBUILT',
    notes: [
      'CRITICAL: quiz was transformer WTI/Buchholz/cooling bank — wrong lesson.',
      'Rebuilt 20 cable-testing Qs from chapter (IR, VLF, sheath, discharge, water treeing).',
      'Old bank moved into 9.1 then trimmed.',
    ],
    fact: [
      { status: 'PASS', text: 'HT cable IR ~5 kV megger; LT 500/1000 V — matches chapter' },
      { status: 'PASS', text: 'Prefer VLF over DC Hi-Pot on XLPE — matches myth buster' },
    ],
  },
  '9.5': {
    verdict: 'TRIMMED',
    notes: ['Earth testing — on-topic; trimmed. Lightning benefit of good earth kept as earthing fact.'],
    fact: [{ status: 'PASS', text: 'Broken earth strip defeats protection — correct' }],
  },
  '9.6': {
    verdict: 'TRIMMED',
    notes: [
      'Insulator testing — on-topic (also holds earlier polymer/porosity relocates from Ch.3).',
      'Kept rain-unsuitable-for-test Qs (measurement validity).',
    ],
    fact: [{ status: 'PASS', text: 'Disc IR with 5 kV megger; healthy ≥ ~500 MΩ — training rule OK' }],
  },
  '9.7': {
    verdict: 'TRIMMED',
    notes: ['Relay secondary injection / numerical relay health — on-topic; trimmed.'],
    fact: [{ status: 'PASS', text: 'Watchdog/error on numerical relay → investigate, do not ignore — correct' }],
  },
  '9.8': {
    verdict: 'TRIMMED',
    notes: [
      'Battery/charger testing — on-topic but pool was 152 with consumer-battery trivia stretch.',
      'Trimmed to substation DC bank theme; lightning hair-raise → 1.9.',
    ],
    fact: [{ status: 'PASS', text: 'DC battery backs protection/tripping on AC fail — correct' }],
  },
  '9.9': {
    verdict: 'TRIMMED',
    notes: ['Cap bank testing + residual charge hazard — on-topic; trimmed.'],
    fact: [{ status: 'PASS', text: 'Caps store charge after switch-off — critical safety' }],
  },
  '9.10': {
    verdict: 'TRIMMED',
    notes: ['Test report documentation — on-topic; weather note in report kept as documentation practice.'],
    fact: [{ status: 'PASS', text: 'Report must ID equipment + results before decisions — correct' }],
  },
};

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chapter 9 Quiz Relevance & Fact-Check</title>
  <style>
    :root { --bg:#f8fafc; --ink:#0f172a; --muted:#64748b; --card:#fff; --line:#cbd5e1;
      --ok:#166534; --ok-bg:#f0fdf4; --fix:#1e40af; --fix-bg:#eff6ff; --crit:#991b1b; --crit-bg:#fef2f2; }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif; background:var(--bg); color:var(--ink); line-height:1.5; }
    header { position:sticky; top:0; z-index:10; background:var(--card); border-bottom:2px solid var(--ink); padding:.9rem 1.1rem; }
    header h1 { margin:0 0 .35rem; font-size:1.15rem; }
    header p { margin:.2rem 0; color:var(--muted); font-size:.88rem; }
    .stats { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.55rem; }
    .tag { font-size:.78rem; border:1px solid var(--line); padding:.15rem .45rem; background:#f1f5f9; }
    .tag.ok { background:var(--ok-bg); color:var(--ok); border-color:#86efac; }
    .tag.fix { background:var(--fix-bg); color:var(--fix); border-color:#93c5fd; }
    .tag.crit { background:var(--crit-bg); color:var(--crit); border-color:#fca5a5; }
    main { max-width:980px; margin:0 auto; padding:1rem; }
    .summary { background:var(--card); border:2px solid var(--ink); padding:1rem; margin-bottom:1rem; }
    .lesson { background:var(--card); border:2px solid var(--ink); margin-bottom:1rem; }
    .lesson > h2 { margin:0; padding:.75rem 1rem; border-bottom:1px solid var(--line); font-size:1.05rem; display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
    .badge { font-size:.72rem; font-weight:700; padding:.15rem .45rem; border:1px solid; }
    .badge.ok { background:var(--ok-bg); color:var(--ok); border-color:#86efac; }
    .badge.fix { background:var(--fix-bg); color:var(--fix); border-color:#93c5fd; }
    .badge.crit { background:var(--crit-bg); color:var(--crit); border-color:#fca5a5; }
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
    <h1>Chapter 9 (9.1–9.10) — Quiz Relevance & Fact-Check</h1>
    <p>Testing Manual: transformer IR → test reports. Same pipeline as Ch.1–8.</p>
    <div class="stats">
      <span class="tag crit">9.4 REBUILT (was transformer cooling, not cable)</span>
      <span class="tag fix">9.8: 152 → 24 + lightning → 1.9</span>
      <span class="tag fix">All lessons trimmed to ~24</span>
    </div>
  </header>
  <main>
    <section class="summary">
      <h2 style="margin-top:0;font-size:1.05rem">Executive summary</h2>
      <ul>
        <li><strong>Critical:</strong> <code>questions_9_4.json</code> was a transformer WTI/Buchholz bank — rebuilt for UG cable testing.</li>
        <li><strong>9.8:</strong> Huge consumer-battery trivia stretch trimmed; general lightning Q → 1.9.</li>
        <li><strong>Rest:</strong> On-topic testing lessons; soft/oversized padding capped at ~24.</li>
      </ul>
    </section>
${lessons
  .map((L) => {
    const a = analysis[L.level];
    const badge = a.verdict === 'REBUILT' ? 'crit' : a.verdict === 'FIXED' || a.verdict === 'TRIMMED' ? 'fix' : 'ok';
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
    Generated 2026-07-25 · <code>public/quiz_management/lesson_9_1_to_9_10_quiz_review.html</code>
    · Log: <code>lesson_9_quiz_cleanup_log.md</code>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'lesson_9_1_to_9_10_quiz_review.html'), html, 'utf8');
fs.writeFileSync(
  path.join(outDir, 'lesson_9_quiz_cleanup_log.md'),
  [
    '# Chapter 9 Quiz Cleanup Log',
    '',
    'Date: 2026-07-25',
    '',
    '## Critical',
    '',
    '- **9.4 Cable testing:** quiz was transformer cooling/Buchholz/OTI/WTI (wrong lesson).',
    '- **Action:** Rebuilt 20 cable Qs from `chapter_9_4.json`; old bank appended to 9.1 then trimmed.',
    '',
    '## Other',
    '',
    '- Trimmed all lessons to ~24 theme-core questions.',
    '- **9.8:** lightning “hair stands up” → `questions_1_9.json`.',
    '',
    '## Run log (abbrev)',
    '',
    ...log
      .filter((l) => /^(REBUILT|TRIMMED|UPDATED|FACTFIX|MOVED → 1_9)/.test(l))
      .slice(0, 40)
      .map((l) => `- ${l}`),
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

console.log(log.filter((l) => /^(REBUILT|TRIMMED|UPDATED|MOVED → 1_9)/.test(l)).join('\n'));
console.log('\nFinal:');
for (const L of lessons) console.log(L.level, `${beforeCounts[L.level]}→${L.count}`, analysis[L.level].verdict);
console.log('\n9.4 Q1:', load('9_4')[0].questionText.slice(0, 60));
