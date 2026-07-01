/**
 * Sample hourly questions by category for difficulty study.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
    fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

let all = [];
let from = 0;
while (true) {
    const { data, error } = await sb
        .from('hourly_questions')
        .select('id, language, category, question_text, options, correct_answer_index, hint, tags')
        .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
}

const byCat = {};
for (const q of all) {
    const cat = q.category || '(none)';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(q);
}

const cats = Object.entries(byCat).sort((a, b) => b[1].length - a[1].length);
console.log('Categories:', cats.length);
for (const [cat, rows] of cats.slice(0, 40)) {
    console.log(`\n=== ${cat} (${rows.length}) ===`);
    for (const q of rows.slice(0, 3)) {
        const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
        console.log('Q:', (q.question_text || '').slice(0, 120));
        console.log('Opts:', opts.map((o) => String(o).slice(0, 50)).join(' | '));
        console.log('Hint:', (q.hint || '').slice(0, 80) || '-');
    }
}

const out = path.join(root, 'scratch', 'hourly_questions_sample.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ total: all.length, categories: cats.map(([c, r]) => ({ category: c, count: r.length, samples: r.slice(0, 5) })) }, null, 2));
console.log('\nWrote', out);
