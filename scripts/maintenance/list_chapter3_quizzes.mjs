import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '../../public/quizzes');

for (let i = 1; i <= 10; i++) {
  const id = `3_${i}`;
  const chPath = path.join(dir, `chapter_${id}.json`);
  const qPath = path.join(dir, `questions_${id}.json`);
  if (!fs.existsSync(chPath)) {
    console.log(`MISSING chapter ${id}`);
    continue;
  }
  const ch = JSON.parse(fs.readFileSync(chPath, 'utf8'));
  const q = fs.existsSync(qPath) ? JSON.parse(fs.readFileSync(qPath, 'utf8')) : [];
  console.log(`\n=== ${ch.level_id} === ${ch.level_title} | Q=${q.length}`);
  console.log(
    'POINTS:',
    (ch.sections || []).flatMap((s) => (s.points || []).map((p) => p.item_name)).join(' || '),
  );
  if (ch.advanced_section?.facts) {
    console.log('ADVANCED:', ch.advanced_section.facts.map((f) => f.title).join(' | '));
  }
  q.forEach((qq, idx) => console.log(`${idx + 1}. ${qq.questionText}`));
}
