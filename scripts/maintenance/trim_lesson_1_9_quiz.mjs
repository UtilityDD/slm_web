/**
 * Re-trim lesson 1.9 by QUESTION TEXT (not fragile indices).
 * Restores from git HEAD (100 Q), then keeps chapter-aligned items
 * and relocates stretch items.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const quizDir = path.join(root, 'public/quizzes');
const outDir = path.join(root, 'public/quiz_management');

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
    return;
  }
  existing.push(question);
  save(destId, existing);
  log.push(`MOVED → ${destId} (now ${existing.length}): ${question.questionText.slice(0, 60)}`);
}

// Restore canonical pool from last committed version
const headRaw = execSync('git show HEAD:public/quizzes/questions_1_9.json', {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});
const src = JSON.parse(headRaw);
console.log('Restored from HEAD:', src.length);

// Exact-text relocate map (stretch beyond chapter 1.9)
const relocateExact = new Map([
  [
    'বৃষ্টির সময় আন্ডারগ্রাউন্ড কেবিল জয়েন্টিংয়ের কাজ করার ক্ষেত্রে প্রধান কারিগরি বাধা কোনটি?',
    '6_5',
  ],
  [
    'বৃষ্টির জল যখন মাটির নিচে থাকা আর্থ পিটে (Earth Pit) প্রবেশ করে, তখন আর্থ রেজিস্ট্যান্সের কী পরিবর্তন হয়?',
    '6_11',
  ],
  [
    'বৃষ্টির সময় খোলা জায়গায় থাকা কোনো ট্রান্সফরমারের বুশিং স্পর্শ করা কেন সম্পূর্ণ নিষিদ্ধ?',
    '6_1',
  ],
  [
    'বৃষ্টির জল কন্ডাক্টরের জয়েন্ট বা সংযোগস্থলে প্রবেশ করলে দীর্ঘমেয়াদে কী কারিগরি সমস্যা দেখা দেয়?',
    '4_2',
  ],
  [
    'বৃষ্টির সময় কোনো খোলা ডিস্ট্রিবিউশন বক্স বা পিলারে কাজ করা কেন সম্পূর্ণ বেআইনি?',
    '6_9',
  ],
  [
    'বৃষ্টির সময় কেবিল ড্রাম বা কন্ডাক্টর তার মাটিতে টেনে নিয়ে যাওয়া কেন বিপজ্জনক?',
    '6_5',
  ],
  [
    "বৃষ্টির সময় কোনো লাইভ ফিডারে কাজ করার জন্য কি 'ইনসুলেটিং ব্ল্যাঙ্কেট' ব্যবহার করা নিরাপদ?",
    '2_5',
  ],
  [
    'বৃষ্টির সময় সাব-স্টেশনের ব্যাটারি রুমের ভেন্টিলেশন বা হাওয়া চলাচল কেন সঠিকভাবে বজায় রাখা উচিত?',
    '9_8',
  ],
  [
    'বৃষ্টির জল যখন কোনো বৈদ্যুতিক মোটরের টার্মিনাল বক্সের ভেতরে প্রবেশ করে, তখন কী ঘটে?',
    null, // drop — no clean lesson home
  ],
  [
    'বৃষ্টির সময় কোনো পোল মাউন্টেড ডিস্ট্রিবিউশন ট্রান্সফরমারের (DTR) ফিউজ পুড়ে গেলে কী করা উচিত?',
    '4_4',
  ],
  [
    'সাব-স্টেশনের পাওয়ার ট্রান্সফরমারকে বজ্রপাতের হাত থেকে রক্ষা করার জন্য কোন ডিভাইসটি ব্যবহার করা হয়?',
    '3_5',
  ],
  [
    'বজ্রপাতে আহত বা বিদ্যুৎস্পৃষ্ট হওয়া কোনো ব্যক্তিকে বাঁচানোর জন্য প্রথম জীবনদায়ী চিকিৎসা কোনটি?',
    '1_7',
  ],
  [
    'বজ্রপাতে আহত ব্যক্তির শরীর স্পর্শ করলে কি উদ্ধারকারীর কারেন্ট বা শক লাগার সম্ভাবনা থাকে?',
    '1_7',
  ],
  [
    'ঝড়ের সময় প্রবল বাতাসে অ্যালুমিনিয়াম কন্ডাক্টরের তারগুলো পোলের পিন ইনসুলেটর থেকে আলগা হয়ে যাওয়ার কারণ কী?',
    '4_1',
  ],
  [
    'ঝড়ের সময় প্রবল বাতাসের কারণে কোনো পোলের ওপর থাকা পিভিসি এরিয়াল বাঞ্চড (AB) কেবলের কী ক্ষতি হতে পারে?',
    '6_6',
  ],
  [
    'ঝড়ের সময় প্রবল বাতাসে কোনো সাব-স্টেশনের আউটডোর ইয়ার্ডের আইসোলেটর হ্যান্ডেল অপারেট করা বিপজ্জনক কেন?',
    '6_4',
  ],
  [
    'ঝড়ের সময় প্রবল বাতাসে কোনো সাব-স্টেশনের লাইটিং গ্যান্ট্রি বা আর্থিং তার ছিঁড়ে গেলে কী করা উচিত?',
    '6_11',
  ],
  [
    "ঝড়ের প্রবল বাতাসের কারণে কোনো পোলের ওপর থাকা 'স্টে-ওয়্যার' (Stay Wire) ছিঁড়ে গেলে কী বিপদ হতে পারে?",
    '1_3',
  ],
  [
    "ঝড়ের সময় প্রবল বাতাসে কোনো পোলের ওপরে থাকা 'লাইটনিং অ্যারেস্টার' (LA) ভেঙে ঝুলতে থাকলে কী করবেন?",
    '3_5',
  ],
  [
    "ঝড়ের প্রবল বাতাসে কোনো সাব-স্টেশনের আউটডোর ইয়ার্ডের কন্ডাক্টরের ওপর 'করোনা ডিসচার্জ' (Corona Discharge) বাড়ার কারণ কী?",
    '1_2',
  ],
  [
    'ঝড়-বৃষ্টির সময় জরুরি বিদ্যুৎ পুনরুদ্ধারের কাজ করার আগে কোন বিশেষ পারমিটটি নেওয়া বাধ্যতামূলক?',
    '1_6',
  ],
  [
    'ঝড়-বৃষ্টির সময় কোনো লাইভ ট্রান্সফরমারের অয়েল লেভেল বা তাপমাত্রা পরীক্ষা করা কেন অনুচিত?',
    '4_5',
  ],
  [
    'ঝড়-বৃষ্টির সময় কাজ করার সময় যদি হঠাৎ আপনার কোনো সহকর্মী বিদ্যুৎস্পৃষ্ট হন, তবে আপনার প্রথম কাজ কী?',
    '1_7',
  ],
]);

// Duplicate short wet-rope (relocated earlier from 1.1) — drop from 1.9 if longer variant exists
const shortWetRope = 'বৃষ্টির জলে ভেজা দড়ি বা রোপ ব্যবহার করা কেন বিপজ্জনক?';

const keep = [];
const log = [];
const seen = new Set();

for (const q of src) {
  const text = q.questionText.trim();
  if (seen.has(text)) {
    log.push(`DEDUP skip: ${text.slice(0, 60)}`);
    continue;
  }
  seen.add(text);

  if (text === shortWetRope) {
    log.push(`DROP duplicate wet-rope short form`);
    continue;
  }

  if (relocateExact.has(text)) {
    const dest = relocateExact.get(text);
    if (dest == null) {
      log.push(`DROP no-home: ${text.slice(0, 60)}`);
    } else {
      appendUnique(dest, q, log);
    }
    continue;
  }

  keep.push(q);
}

save('1_9', keep);

const md = [
  '# Lesson 1.9 Quiz Trim Log (text-based redo)',
  '',
  'Date: 2026-07-25',
  '',
  '## Summary',
  '',
  `- Source (git HEAD): **${src.length}**`,
  `- Kept in 1.9: **${keep.length}**`,
  `- Relocated / dropped / deduped: see log`,
  '',
  '## Method',
  '',
  '- Restored from `git show HEAD:public/quizzes/questions_1_9.json`',
  '- Classified by **exact question text** (not array index)',
  '- Kept rain / lightning / wind / say-no chapter themes',
  '- Restored wrongly dropped chapter items (shelter, PPE myth, step potential, forecast, etc.)',
  '',
  '## Log',
  '',
  ...log.map((l) => `- ${l}`),
  '',
  '## Kept in 1.9',
  '',
  ...keep.map((q, i) => `${i + 1}. ${q.questionText}`),
  '',
];

fs.writeFileSync(path.join(outDir, 'lesson_1_9_quiz_trim_log.md'), md.join('\n'), 'utf8');

// Patch review HTML counts/notes
const reviewPath = path.join(outDir, 'lesson_1_2_to_1_10_quiz_review.html');
if (fs.existsSync(reviewPath)) {
  let html = fs.readFileSync(reviewPath, 'utf8');
  html = html.replace(
    /1\.9: trimmed to \d+ chapter-aligned Qs|1\.9: on-topic but ~100 Q vs short chapter/,
    `1.9: trimmed to ${keep.length} chapter-aligned Qs`,
  );
  html = html.replace(
    /(<section class="lesson" id="L1_9">[\s\S]*?<span class="tag">)\d+( questions<\/span>)/,
    `$1${keep.length}$2`,
  );
  html = html.replace(/ON-TOPIC BUT OVERSIZED|TRIMMED TO CHAPTER/g, 'TRIMMED TO CHAPTER');
  fs.writeFileSync(reviewPath, html, 'utf8');
}

console.log(`1.9 final: ${keep.length}`);
console.log(log.join('\n'));

// Sanity: chapter-critical phrases must remain
const must = [
  'রাবারের গ্লাভস বা জুতো',
  'স্টেপ পটেনশিয়াল',
  'আশ্রয় নেওয়ার জন্য নিচের কোনটি',
  'আবহাওয়ার পূর্বাভাস',
  'প্রবৃত্তি',
  'কিলোমিটারের বেশি বেগে বাতাস',
  'গ্যালোপিং',
  'Reduced Visibility',
  'ভেজা পিপিই',
];
for (const m of must) {
  const ok = keep.some((q) => q.questionText.includes(m));
  console.log(ok ? 'OK' : 'MISSING', m);
}
