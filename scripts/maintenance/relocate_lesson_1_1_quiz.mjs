import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '../../public/quizzes');

const src = JSON.parse(fs.readFileSync(path.join(dir, 'questions_1_1.json'), 'utf8'));

// 0-based indices of OFF-TOPIC questions (Q27–Q34, Q36–Q38, Q40–Q44)
const moves = [
  { idx: 26, dest: '1_10', reason: 'Toolbox talk / pre-work risk discussion → mental checklist' },
  { idx: 27, dest: '1_5', reason: 'Discharge rod procedure' },
  { idx: 28, dest: '2_1', reason: 'Tool handling from height → toolbox/tools' },
  { idx: 29, dest: '1_5', reason: 'Backfeed — dead line still hazardous' },
  { idx: 30, dest: '4_9', reason: 'Ladder setup — street light work uses ladder' },
  { idx: 31, dest: '1_9', reason: 'Wet rope conductivity — rain/weather hazards' },
  { idx: 32, dest: '1_8', reason: 'Electrical fire extinguisher' },
  { idx: 33, dest: '1_7', reason: 'Electric shock first aid' },
  { idx: 35, dest: '1_6', reason: 'Line Clear / LC return before re-energize' },
  { idx: 36, dest: '6_5', reason: 'Excavation hits UG cable' },
  { idx: 37, dest: '1_3', reason: 'Bent/leaning pole wire-tension risk' },
  { idx: 39, dest: '1_2', reason: 'Arc flash eye protection / safe approach' },
  { idx: 40, dest: '6_1', reason: 'Transformer body work hazard' },
  { idx: 41, dest: '1_6', reason: 'LOTO with PTW' },
  { idx: 42, dest: '1_2', reason: 'Fallen conductor treat as live' },
  { idx: 43, dest: '2_5', reason: 'Wet/dirty hot stick insulation' },
];

const moveIdxSet = new Set(moves.map((m) => m.idx));
const byDest = {};
for (const m of moves) {
  if (!byDest[m.dest]) byDest[m.dest] = [];
  byDest[m.dest].push({ ...src[m.idx], _from: m.idx + 1, _reason: m.reason });
}

const log = [];
for (const [dest, qs] of Object.entries(byDest)) {
  const file = path.join(dir, `questions_${dest}.json`);
  if (!fs.existsSync(file)) throw new Error('Missing ' + file);
  const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
  const existingTexts = new Set(existing.map((q) => q.questionText.trim()));
  let added = 0;
  let skipped = 0;
  for (const q of qs) {
    const { _from, _reason, ...clean } = q;
    if (existingTexts.has(clean.questionText.trim())) {
      skipped++;
      log.push(`SKIP duplicate → ${dest}: Q${_from} (${_reason})`);
      continue;
    }
    existing.push(clean);
    existingTexts.add(clean.questionText.trim());
    added++;
    log.push(`MOVED Q${_from} → questions_${dest}.json (${_reason})`);
  }
  fs.writeFileSync(file, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  log.push(`  → questions_${dest}.json now has ${existing.length} (+${added}, skipped ${skipped})`);
}

const kept = src
  .map((q, i) => ({ q, i }))
  .filter(({ i }) => !moveIdxSet.has(i))
  .map(({ q, i }) => {
    if (i === 5) {
      return {
        questionText: q.questionText,
        options: [
          'পাওয়ার প্রোটেকশন ইকুইপমেন্ট',
          'পোল প্রিপারেশন ইকুইপমেন্ট',
          'পার্সোনাল প্রোটেকটিভ ইকুইপমেন্ট',
          'প্রাইমারি পাওয়ার ইকুইপমেন্ট',
        ],
        correctAnswerIndex: 2,
      };
    }
    return q;
  });

fs.writeFileSync(path.join(dir, 'questions_1_1.json'), JSON.stringify(kept, null, 2) + '\n', 'utf8');
log.push(`UPDATED questions_1_1.json → ${kept.length} questions (was ${src.length}); fixed PPE expansion`);

const summaryPath = path.resolve(__dirname, '../../public/quiz_management/lesson_1_1_quiz_relocation_log.md');
const md = [
  '# Lesson 1.1 Quiz Relocation Log',
  '',
  'Date: 2026-07-25',
  '',
  '## Summary',
  '',
  `- Relocated **${moves.length}** off-topic questions from \`questions_1_1.json\`.`,
  `- \`questions_1_1.json\` now has **${kept.length}** PPE-focused questions (was ${src.length}).`,
  '- Fixed PPE expansion wording to **Personal Protective Equipment**.',
  '',
  '## Destination map',
  '',
  '| From 1.1 | Destination lesson | Topic |',
  '|---|---|---|',
  '| Q27 | 1.10 | Toolbox talk |',
  '| Q28 | 1.5 | Discharge rod |',
  '| Q29 | 2.1 | Tools down by rope/bucket |',
  '| Q30 | 1.5 | Backfeed |',
  '| Q31 | 4.9 | Ladder ratio |',
  '| Q32 | 1.9 | Wet rope |',
  '| Q33 | 1.8 | Fire extinguisher |',
  '| Q34 | 1.7 | Shock first aid |',
  '| Q36 | 1.6 | LC return / earthing remove |',
  '| Q37 | 6.5 | Digging hits cable |',
  '| Q38 | 1.3 | Bent pole |',
  '| Q40 | 1.2 | Arc flash goggles |',
  '| Q41 | 6.1 | Transformer top cover |',
  '| Q42 | 1.6 | LOTO |',
  '| Q43 | 1.2 | Fallen wire = live |',
  '| Q44 | 2.5 | Wet hot stick |',
  '',
  '## Run log',
  '',
  ...log.map((l) => `- ${l}`),
  '',
  '## Kept in 1.1',
  '',
  ...kept.map((q, i) => `${i + 1}. ${q.questionText}`),
  '',
].join('\n');

fs.writeFileSync(summaryPath, md, 'utf8');
console.log(log.join('\n'));
console.log('\nKept count:', kept.length);
console.log('Log:', summaryPath);
