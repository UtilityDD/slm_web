/**
 * Chapter 6 quiz cleanup (6.1–6.11 — যন্ত্র গুরু):
 * - CRITICAL: rebuild 6.4 (was full copy of 6.3 HRC fuse bank)
 * - Move/dedupe weather & general storm PPE → 1.9
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

// ---------- CRITICAL: rebuild 6.4 from chapter (AB switch / isolator) ----------
{
  const rebuilt = [
    {
      questionText: 'আইসোলেটর বা AB সুইচের প্রধান উদ্দেশ্য কী?',
      options: [
        'ফল্ট কারেন্ট সনাক্ত করে স্বয়ংক্রিয়ভাবে সার্কিট ট্রিপ করা',
        'পাওয়ার সিস্টেম থেকে সার্কিটকে শারীরিকভাবে বিচ্ছিন্ন করে দৃশ্যমান গ্যাপ তৈরি করা',
        'লাইনের ভোল্টেজকে স্বয়ংক্রিয়ভাবে রেগুলেট করে স্থির রাখা',
        'ট্রান্সফরমার অয়েলের তাপমাত্রা ও চাপ নিয়ন্ত্রণ করা',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'AB সুইচকে "এয়ার ব্রেক" সুইচ বলা হয় কেন?',
      options: [
        'এটি শুধুমাত্র ভ্যাকুয়াম বোতলের ভেতরে কন্টাক্ট খোলে',
        'এটি বাতাসে (Air) কন্টাক্ট পয়েন্ট খোলে ও বন্ধ করে',
        'এটি SF6 গ্যাসের চাপে আর্ক নেভায়',
        'এটি তেলের ভেতরে কন্টাক্ট আলাদা করে',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'আইসোলেটর অপারেট করার "গোল্ডেন রুল" কী?',
      options: [
        'যেকোনো লোডে খোলা যায় যদি PPE পরা থাকে',
        'শুধুমাত্র নো-লোড বা অফ-লোড অবস্থায় অপারেট করতে হবে',
        'শুধুমাত্র ফল্ট কারেন্ট থাকলেই খোলা যায়',
        'ব্রেকার অন রেখেই আইসোলেটর খুলতে হবে',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'লোড থাকা অবস্থায় আইসোলেটর খুললে প্রধান বিপদ কী?',
      options: [
        'শুধুমাত্র মিটার রিডিং ভুল দেখাবে',
        'কন্টাক্টে প্রচণ্ড দীর্ঘস্থায়ী আর্ক তৈরি হয়ে সুইচ ও অপারেটর ক্ষতিগ্রস্ত হতে পারে',
        'ট্রান্সফরমারের অয়েল লেভেল বেড়ে যাবে',
        'ফিউজ নিজে থেকেই সঠিক রেটিং বেছে নেবে',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'লাইন বন্ধ করার সঠিক অপারেশন ক্রম কোনটি?',
      options: [
        'আগে আইসোলেটর খুলুন, পরে সার্কিট ব্রেকার',
        'আগে সার্কিট ব্রেকার খুলে অফ-লোড করুন, পরে আইসোলেটর খুলুন',
        'আগে আর্থিং লাগান, পরে ব্রেকার অন রাখুন',
        'আগে ফিউজ বদলান, পরে ব্রেকার রিসেট করুন',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'লাইন চালু করার সঠিক অপারেশন ক্রম কোনটি?',
      options: [
        'আগে ব্রেকার অন, পরে আইসোলেটর',
        'আগে আইসোলেটর লাগান, পরে সার্কিট ব্রেকার অন করুন',
        'আগে আর্থিং রেখে ব্রেকার অন করুন',
        'আগে ফিউজ খুলুন, পরে আইসোলেটর খুলুন',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: "'সামান্য লোড থাকলে আইসোলেটর খোলা যায়'—এই ধারণাটি ভুল কেন?",
      options: [
        'সামান্য লোডেও হাই-ভোল্টেজে বিপজ্জনক আর্ক তৈরি হতে পারে',
        'সামান্য লোডে আইসোলেটর নিজে থেকে গলে যায়',
        'সামান্য লোডে শুধু মিটার নষ্ট হয়',
        'সামান্য লোডে আর্থিং তার কেটে যায়',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'আইসোলেটর এবং সার্কিট ব্রেকারের মধ্যে প্রধান পার্থক্য কী?',
      options: [
        'দুটোই ফল্ট কারেন্ট ইন্টারাপ্ট করতে পারে সমানভাবে',
        'আইসোলেটর দৃশ্যমান গ্যাপ দেয়; ব্রেকার ফল্ট কারেন্ট বাধা দিতে পারে',
        'আইসোলেটর শুধু LT-তে এবং ব্রেকার শুধু HT-তে লাগে',
        'ব্রেকারে কোনো আর্ক নেভানোর ব্যবস্থা নেই',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'ডিস্ট্রিবিউশন লাইনে সবচেয়ে বেশি দেখা যায় কোন ধরনের AB সুইচ?',
      options: [
        'শুধুমাত্র SF6 গ্যাং ব্রেকার',
        'টিল্টিং টাইপ / গ্যাং অপারেটেড AB সুইচ',
        'মিনিয়াচার সার্কিট ব্রেকার (MCB)',
        'কিট-ক্যাট ফিউজ ক্যারিয়ার',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'গ্যাং অপারেটেড AB সুইচের সুবিধা কী?',
      options: [
        'একটি হ্যান্ডেল দিয়ে তিন ফেজ একসাথে খোলা বা বন্ধ করা যায়',
        'প্রতিটি ফেজ আলাদাভাবে স্বয়ংক্রিয় ট্রিপ করে',
        'এটি লোড কারেন্ট ইন্টারাপ্ট করতে পারে',
        'এটি আর্থিং ছাড়াই নিরাপদ',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'AB সুইচ সাধারণত কীভাবে অপারেট করা হয়?',
      options: [
        'লাইভ কন্টাক্টে খালি হাত দিয়ে',
        'লম্বা অপারেটিং রড/হ্যান্ডেল দিয়ে মাটি থেকে, দ্রুত ও দৃঢ়ভাবে',
        'শুধুমাত্র স্মার্টফোন অ্যাপ দিয়ে',
        'ফিউজ পুলার দিয়ে কন্টাক্ট টেনে',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'AB সুইচ অপারেট করার আগে অপারেটিং হ্যান্ডেল সম্পর্কে কোন বিষয়টি নিশ্চিত করা উচিত?',
      options: [
        'হ্যান্ডেলটি রং করা আছে কিনা',
        'হ্যান্ডেলটি সঠিকভাবে আর্থিং করা আছে কিনা',
        'হ্যান্ডেলটি প্লাস্টিকের কিনা',
        'হ্যান্ডেলটি মিটার বক্সের সাথে যুক্ত কিনা',
      ],
      correctAnswerIndex: 1,
    },
    {
      questionText: 'AB সুইচের প্রধান রক্ষণাবেক্ষণ কাজ কোনটি?',
      options: [
        'কন্টাক্ট (jaws/blades) পরিষ্কার, মেকানিজম লুব্রিকেট, ইনসুলেটর পরিষ্কার রাখা',
        'প্রতিদিন তেল টপ-আপ করা',
        'প্রতি সপ্তাহে SF6 গ্যাস ভর্তি করা',
        'ফিউজ লিঙ্ক মোটা তার দিয়ে বাঁধা',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'আইসোলেটর লাগানোর পর তিন ফেজের কন্টাক্ট পরীক্ষা করা জরুরি কেন?',
      options: [
        'আংশিক লাগা কন্টাক্ট হটস্পট তৈরি করতে পারে',
        'এতে মিটার CAL LED বন্ধ হয়',
        'এতে সিলিকা জেল নীল হয়',
        'এতে নিউট্রাল কারেন্ট শূন্য হয়ই',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'সাবস্টেশনে ব্রেকার–আইসোলেটর ইন্টারলকের উদ্দেশ্য কী?',
      options: [
        'ভুল ক্রমে অপারেশন (ব্রেকার অন থাকতে আইসোলেটর খোলা) আটকানো',
        'ভোল্টেজ স্বয়ংক্রিয় বাড়ানো',
        'ফিউজ রেটিং নিজে থেকে বেছে নেওয়া',
        'আর্থ পিটে জল দেওয়া',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'কিছু আইসোলেটরে "আর্কিং হর্ন"-এর কাজ কী?',
      options: [
        'মূল কন্টাক্টের বদলে ছোট আর্ক হর্নে সীমাবদ্ধ রেখে কন্টাক্ট রক্ষা করা',
        'ফল্ট কারেন্ট পুরোপুরি ইন্টারাপ্ট করা',
        'ট্রান্সফরমার তেল ঠান্ডা করা',
        'মিটার ট্যাম্পারিং ধরা',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'গ্যাং সুইচ অপারেট করার পর একটি ফেজ আটকে থাকলে কী ঝুঁকি?',
      options: [
        'সিঙ্গেল-ফেজিং / অসম্পূর্ণ আইসোলেশন—সিস্টেম ও সরঞ্জাম বিপজ্জনক',
        'শুধুমাত্র লাইটের রং বদলাবে',
        'কোনো সমস্যা নেই যদি দুই ফেজ ঠিক থাকে',
        'আর্থ রেজিস্ট্যান্স কমে যাবে',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'আইসোলেটরে সার্কিট ব্রেকারের মতো আর্ক-নেভানোর ব্যবস্থা নেই—এর অর্থ কী?',
      options: [
        'লোড/ফল্ট কারেন্ট ব্রেক করার জন্য এটি ডিজাইন করা নয়',
        'এটি ফিউজের চেয়ে বেশি নিরাপদ লোড ব্রেক করে',
        'এটি সবসময় অন-লোডে ব্যবহারযোগ্য',
        'এটি শুধু মিটার বাইপাসের জন্য',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'লাইন পেট্রোলিং-এর সময় AB সুইচে কী দেখা উচিত?',
      options: [
        'কন্টাক্ট ঠিকমতো লেগে আছে কিনা এবং আর্কিং-এর চিহ্ন আছে কিনা',
        'শুধু পোল নম্বর প্লেটের রং',
        'মিটার সিল নম্বর',
        'স্মার্ট মিটারের Wi-Fi সিগন্যাল',
      ],
      correctAnswerIndex: 0,
    },
    {
      questionText: 'আইসোলেটরকে "ট্র্যাফিক কন্ট্রোলার" বলার অর্থ কী?',
      options: [
        'এটি রাস্তার ট্রাফিক লাইট নিয়ন্ত্রণ করে',
        'এটি লাইন বিচ্ছিন্ন/রুট নিয়ন্ত্রণ করে যাতে নিরাপদে কাজ ও সুইচিং করা যায়',
        'এটি গাড়ির স্পিড মাপে',
        'এটি শুধু স্ট্রিট লাইট অন-অফ করে',
      ],
      correctAnswerIndex: 1,
    },
  ];

  save('6_4', rebuilt);
  log.push(`REBUILT questions_6_4.json → ${rebuilt.length} (was fuse-copy of 6.3 + weather extras)`);
}

// ---------- Weather / general storm misplacements → 1.9 ----------
stripByExact(
  '6_1',
  [
    'বৃষ্টির সময় খোলা জায়গায় থাকা কোনো ট্রান্সফরমারের বুশিং স্পর্শ করা কেন সম্পূর্ণ নিষিদ্ধ?',
    'বৃষ্টির সময় হ্যান্ড-টুলস (যেমন প্লায়ার্স বা স্ক্রু-ড্রাইভার) ব্যবহারের ক্ষেত্রে কোন বিষয়টি নিশ্চিত করা উচিত?',
  ],
  log,
);

stripByExact(
  '6_5',
  [
    'বৃষ্টির সময় কেবিল ড্রাম বা কন্ডাক্টর তার মাটিতে টেনে নিয়ে যাওয়া কেন বিপজ্জনক?',
    'বৃষ্টির জল এবং বাতাসে থাকা ধূলিকণা একসাথে মিশে ইনসুলেটরের ওপর কী ধরনের ক্ষতিকর প্রভাব ফেলে?',
    'বজ্রপাত কাছাকাছি মাটিতে আঘাত হানলে যে \'স্টেপ পটেনশিয়াল\' (Step Potential) তৈরি হয়, তার প্রধান কারণ কী?',
  ],
  log,
);

stripByExact(
  '6_6',
  [
    'যদি আপনার মনের ভেতর থেকে প্রবৃত্তি (Instinct) বলে যে পরিস্থিতি নিরাপদ নয়, তবে আপনার কী করা উচিত?',
  ],
  log,
);

stripByExact(
  '6_9',
  [
    'বজ্রপাতের সময় সাধারণ লাইনম্যানের ব্যবহৃত রাবারের গ্লাভস বা জুতো কেন কোনো সুরক্ষা দিতে পারে না?',
  ],
  log,
);

stripByExact(
  '6_11',
  [
    'ঝড়ের সময় প্রবল বাতাসে কোনো সাব-স্টেশনের লাইটিং গ্যান্ট্রি বা আর্থিং তার ছিঁড়ে গেলে কী করা উচিত?',
    'বৃষ্টি শুরু হওয়ার সাথে সাথে আউটডোর সাব-স্টেশনে কোন ধরনের কাজ অবিলম্বে বন্ধ করা উচিত?',
    'কোনো জরুরি ফল্ট মেরামতের সময় যদি আবহাওয়া হঠাৎ আরও খারাপ হয়, তবে টিমের কী করা উচিত?',
  ],
  log,
);

// Note: old 6.4 weather Qs discarded with rebuild (already in 1.9)

// ---------- Build review ----------
const lessons = [];
for (let i = 1; i <= 11; i++) {
  const id = `6_${i}`;
  const ch = JSON.parse(fs.readFileSync(path.join(quizDir, `chapter_${id}.json`), 'utf8'));
  const qs = load(id);
  lessons.push({ id, level: ch.level_id, title: ch.level_title, count: qs.length, qs });
}

const analysis = {
  '6.1': {
    verdict: 'FIXED',
    notes: [
      'DTR parts: oil, breather, Dyn11, Buchholz, conservator — match chapter.',
      'Moved rain bushing-touch + wet hand-tool Qs → 1.9.',
      'Kept top-cover standing ban — DTR work safety in lesson scope.',
    ],
    fact: [
      { status: 'PASS', text: 'Oil cools + insulates; pink silica = moisture — correct' },
      { status: 'PASS', text: 'Dyn11 = delta/star vector group — correct orientation' },
    ],
  },
  '6.2': {
    verdict: 'ON-TOPIC',
    notes: ['CB vs fuse, VCB vacuum, rack-out, spring charged, SF6 — match chapter.'],
    fact: [
      { status: 'PASS', text: 'Tripped breaker ≠ safe to work; need isolate/earth — myth OK' },
      { status: 'PASS', text: 'VCB arc quench in vacuum — correct' },
    ],
  },
  '6.3': {
    verdict: 'ON-TOPIC',
    notes: ['HRC, kit-kat, discrimination, I²t, never copper link — match chapter.'],
    fact: [{ status: 'PASS', text: 'HRC = High Rupturing Capacity; quartz sand quench — correct' }],
  },
  '6.4': {
    verdict: 'REBUILT',
    notes: [
      'CRITICAL: quiz was 100% copy of 6.3 fuse bank (+2 weather extras).',
      'Rebuilt 20 Qs from chapter: off-load rule, operate order, gang/tilting, interlocking, arcing horn.',
    ],
    fact: [
      { status: 'PASS', text: 'Isolator = off-load visible gap; CB interrupts fault — correct' },
      { status: 'PASS', text: 'Open order: breaker first, then isolator — matches chapter' },
    ],
  },
  '6.5': {
    verdict: 'FIXED',
    notes: [
      'UG cable: XLPE/PILC, armor, jointing dryness, termination, PD — match chapter.',
      'Kept rain jointing moisture risk (cable-technical).',
      'Moved drum-drag rain, insulator pollution, lightning step potential → 1.9.',
    ],
    fact: [
      { status: 'PASS', text: 'Joints are weak points; moisture kills joint insulation — correct' },
      { status: 'PASS', text: 'Armor ≠ dig-proof — myth OK' },
    ],
  },
  '6.6': {
    verdict: 'FIXED',
    notes: [
      'AB cable: messenger, IPC, tension clamp, XLPE — match chapter.',
      'Kept storm abrasion on AB insulation (equipment-specific).',
      'Removed general “trust instinct / stop work” → already in 1.9.',
    ],
    fact: [
      { status: 'PASS', text: 'AB insulated ≠ safe bare-hand — myth OK' },
      { status: 'PASS', text: 'Messenger carries mechanical tension — correct' },
    ],
  },
  '6.7': {
    verdict: 'ON-TOPIC',
    notes: ['Cap bank PF, stored charge, wait/discharge rod, APFC — match chapter. Kept megger-after-discharge Q.'],
    fact: [
      { status: 'PASS', text: 'Capacitors store charge after switch-off — critical safety' },
      { status: 'SOFT', text: 'Minimum wait time — utility SoP varies; chapter rule OK for training' },
    ],
  },
  '6.8': {
    verdict: 'ON-TOPIC',
    notes: ['Recloser vs sectionizer, non-reclose for work, lockout — match chapter.'],
    fact: [
      { status: 'PASS', text: 'Most OH faults transient; sectionizer does not interrupt fault current — correct' },
      { status: 'PASS', text: 'Enable Non-Reclose before work downstream — correct' },
    ],
  },
  '6.9': {
    verdict: 'FIXED',
    notes: [
      'LT pillar: busbar, HRC, imbalance, lock door — match chapter (overlaps 3.7 lightly, OK).',
      'Kept rain-in-open-pillar blast risk (pillar-specific).',
      'Moved lightning vs rubber gloves → 1.9 (dup).',
    ],
    fact: [{ status: 'PASS', text: '415 V still lethal; no copper instead of HRC — correct' }],
  },
  '6.10': {
    verdict: 'ON-TOPIC',
    notes: ['Energy meter, tamper, CT/MF, smart meter, 1 unit = 1 kWh — match chapter.'],
    fact: [
      { status: 'PASS', text: '1 unit = 1 kWh — correct' },
      { status: 'PASS', text: 'Modern meters resist magnet tamper — myth framing OK' },
    ],
  },
  '6.11': {
    verdict: 'FIXED',
    notes: [
      'Earthing system (parallels 4.6 craft lesson) — on-topic for equipment badge.',
      'Kept rain lowering earth resistance (technical).',
      'Moved storm gantry/earth wire, outdoor stop-work, weather worsens mid-repair → 1.9.',
    ],
    fact: [
      { status: 'PASS', text: 'Low earth R preferred; LA needs good earth — correct' },
      { status: 'SOFT', text: 'Neutral vs body earthing “which more critical” — both mandatory' },
    ],
  },
};

const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chapter 6 Quiz Relevance & Fact-Check</title>
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
    <h1>Chapter 6 (6.1–6.11) — Quiz Relevance & Fact-Check</h1>
    <p>যন্ত্র গুরু: DTR → earthing. Same pipeline as Ch.1–5.</p>
    <div class="stats">
      <span class="tag crit">6.4 REBUILT (was 6.3 fuse copy)</span>
      <span class="tag fix">6.1, 6.5, 6.6, 6.9, 6.11: weather → 1.9</span>
      <span class="tag ok">6.2–6.3, 6.7–6.8, 6.10: on-topic</span>
    </div>
  </header>
  <main>
    <section class="summary">
      <h2 style="margin-top:0;font-size:1.05rem">Executive summary</h2>
      <ul>
        <li><strong>Critical:</strong> <code>questions_6_4.json</code> was an exact copy of the 6.3 HRC fuse quiz — rebuilt for AB switch / isolator.</li>
        <li><strong>Weather strip:</strong> General storm/rain PPE items moved or deduped into 1.9; equipment-specific rain risks kept where taught.</li>
        <li><strong>Note:</strong> Chapter 6 has <strong>11</strong> lessons (6.1–6.11).</li>
      </ul>
    </section>
${lessons
  .map((L) => {
    const a = analysis[L.level];
    const badge =
      a.verdict === 'REBUILT' ? 'crit' : a.verdict === 'FIXED' || a.verdict === 'TRIMMED' ? 'fix' : 'ok';
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
    Generated 2026-07-25 · <code>public/quiz_management/lesson_6_1_to_6_11_quiz_review.html</code>
    · Log: <code>lesson_6_quiz_cleanup_log.md</code>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'lesson_6_1_to_6_11_quiz_review.html'), html, 'utf8');
fs.writeFileSync(
  path.join(outDir, 'lesson_6_quiz_cleanup_log.md'),
  [
    '# Chapter 6 Quiz Cleanup Log',
    '',
    'Date: 2026-07-25',
    '',
    '## Critical',
    '',
    '- **6.4 AB Switch / Isolator:** `questions_6_4.json` was identical to `questions_6_3.json` (HRC fuse) for Q1–20, plus 2 weather extras.',
    '- **Action:** Fully rebuilt 20 questions from `chapter_6_4.json` (off-load rule, operate order, gang/tilting, interlocking, arcing horn).',
    '',
    '## Weather → `questions_1_9.json`',
    '',
    '- **6.1:** rain bushing touch; wet hand-tools (dup)',
    '- **6.5:** rain drum drag; insulator rain/dust pollution; lightning step potential (dup)',
    '- **6.6:** instinct stop-work (dup)',
    '- **6.9:** lightning vs rubber gloves (dup)',
    '- **6.11:** storm gantry/earth wire; outdoor stop in rain; weather worsens mid-repair (dups)',
    '',
    '## Kept (task-related)',
    '',
    '- **6.1:** standing on transformer top cover',
    '- **6.5:** rain moisture kills UG joint',
    '- **6.6:** storm abrasion on AB PVC',
    '- **6.9:** rain in open LT pillar',
    '- **6.11:** rain lowering earth-pit resistance',
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
