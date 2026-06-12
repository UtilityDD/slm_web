import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const CONDUCTORS = [
    { file: 'acsr__dog.png', name: 'ACSR Dog' },
    { file: 'ACSR_Weasel_Conductor_.png', name: 'ACSR Weasel' },
    { file: 'acsr_fox.png', name: 'ACSR Fox' },
    { file: 'ACSR_Rabbit_Conductor_.png', name: 'ACSR Rabbit' },
    { file: 'ACSR_Mink_Conductor_.png', name: 'ACSR Mink' },
];

const combos = (arr, k) => {
    if (k === 0) return [[]];
    if (!arr.length) return [];
    const [first, ...rest] = arr;
    return [...combos(rest, k - 1).map((c) => [first, ...c]), ...combos(rest, k)];
};

const esc = (value) => {
    const s = String(value ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
};

const rows = [];
let serial = 185;

for (const correct of CONDUCTORS) {
    const others = CONDUCTORS.filter((c) => c.file !== correct.file);
    for (const distractors of combos(others, 3)) {
        const options = [correct.name, ...distractors.map((d) => d.name)];
        rows.push({
            id: `vq-${serial++}`,
            language: 'bn',
            question_type: 'image_to_text',
            question_text: 'ছবিতে দেখানো ACSR কন্ডাক্টরের সঠিক নাম কোনটি?',
            question_image_url: correct.file,
            option_1: options[0],
            option_2: options[1],
            option_3: options[2],
            option_4: options[3],
            correct_index: 0,
            category: 'Conductors',
            tags: 'acsr,identification,name',
            hint: 'ছবির ক্রস-সেকশন ডায়াগ্রাম ও তারের গঠন দেখে পরিচিত ACSR নাম শনাক্ত করুন।',
            enabled: 'TRUE',
            preview_q: correct.file,
            preview_o1: '',
            preview_o2: '',
            preview_o3: '',
            preview_o4: '',
        });
    }
}

for (const correct of CONDUCTORS) {
    const others = CONDUCTORS.filter((c) => c.file !== correct.file);
    for (const distractors of combos(others, 3)) {
        const options = [correct.file, ...distractors.map((d) => d.file)];
        rows.push({
            id: `vq-${serial++}`,
            language: 'bn',
            question_type: 'text_to_image',
            question_text: `নিচের কোন ছবিটি ${correct.name} কন্ডাক্টর?`,
            question_image_url: '',
            option_1: options[0],
            option_2: options[1],
            option_3: options[2],
            option_4: options[3],
            correct_index: 0,
            category: 'Conductors',
            tags: 'acsr,identification,name',
            hint: 'প্রশ্নে উল্লেখিত নামের সাথে মিল রেখে সঠিক ছবি বেছে নিন।',
            enabled: 'TRUE',
            preview_q: '',
            preview_o1: options[0],
            preview_o2: options[1],
            preview_o3: options[2],
            preview_o4: options[3],
        });
    }
}

const header =
    'id,language,question_type,question_text,question_image_url,option_1,option_2,option_3,option_4,correct_index,category,tags,hint,enabled,preview_q,preview_o1,preview_o2,preview_o3,preview_o4';
const cols = header.split(',');
const csv = [header, ...rows.map((row) => cols.map((col) => esc(row[col] ?? '')).join(','))].join('\n') + '\n';

for (const rel of ['quiz_management/visual_quiz_batch_05.csv', 'public/quiz_management/visual_quiz_batch_05.csv']) {
    fs.writeFileSync(path.join(root, rel), csv, 'utf8');
}

console.log(`Wrote ${rows.length} rows (vq-185 … vq-${serial - 1})`);
console.log(`  image_to_text: ${rows.filter((r) => r.question_type === 'image_to_text').length}`);
console.log(`  text_to_image: ${rows.filter((r) => r.question_type === 'text_to_image').length}`);
