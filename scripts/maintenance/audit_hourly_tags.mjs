/**
 * Audit tags on hourly_questions + visual sheet merge ids.
 * Usage: node scripts/maintenance/audit_hourly_tags.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
    fs
        .readFileSync(path.join(root, '.env.local'), 'utf8')
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

function tallyTags(rows, field = 'tags') {
    const tagCounts = {};
    let empty = 0;
    let nonEmpty = 0;
    const perQuestion = [];

    for (const row of rows) {
        const tags = Array.isArray(row[field]) ? row[field] : [];
        if (!tags.length) {
            empty++;
            perQuestion.push({ id: row.id, tags: [], language: row.language });
            continue;
        }
        nonEmpty++;
        for (const t of tags) {
            const key = String(t).trim();
            if (!key) continue;
            tagCounts[key] = (tagCounts[key] || 0) + 1;
        }
        perQuestion.push({ id: row.id, tags, language: row.language, category: row.category });
    }

    const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    return { empty, nonEmpty, total: rows.length, tagCounts: sorted, samples: perQuestion.slice(0, 15) };
}

// Paginate hourly_questions
let all = [];
let from = 0;
const page = 1000;
while (true) {
    const { data, error } = await sb
        .from('hourly_questions')
        .select('id, language, category, tags')
        .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < page) break;
    from += page;
}

const byLang = { en: [], bn: [] };
for (const r of all) {
    const lang = r.language === 'en' ? 'en' : 'bn';
    byLang[lang].push(r);
}

const difficultyLike = new Set(['easy', 'medium', 'hard', 'difficult', 'beginner', 'advanced', 'expert']);
const withDifficultyTag = all.filter((r) =>
    (r.tags || []).some((t) => difficultyLike.has(String(t).toLowerCase()))
);

console.log('=== hourly_questions.tags audit ===\n');
console.log(`Total rows: ${all.length}`);
console.log(`Rows with empty/null tags: ${tallyTags(all).empty}`);
console.log(`Rows with at least one tag: ${tallyTags(all).nonEmpty}`);
console.log(`Rows with easy/medium/hard-like tag: ${withDifficultyTag.length}\n`);

console.log('--- All distinct tags (count = questions containing tag) ---');
for (const [tag, count] of tallyTags(all).tagCounts) {
    console.log(`  ${tag}: ${count}`);
}

console.log('\n--- By language (BN) ---');
console.log(`BN rows: ${byLang.bn.length}, empty tags: ${tallyTags(byLang.bn).empty}`);
for (const [tag, count] of tallyTags(byLang.bn).tagCounts.slice(0, 25)) {
    console.log(`  ${tag}: ${count}`);
}

console.log('\n--- By language (EN) ---');
console.log(`EN rows: ${byLang.en.length}, empty tags: ${tallyTags(byLang.en).empty}`);
for (const [tag, count] of tallyTags(byLang.en).tagCounts.slice(0, 25)) {
    console.log(`  ${tag}: ${count}`);
}

console.log('\n--- Sample rows with tags (first 10 non-empty) ---');
const samples = all.filter((r) => r.tags?.length).slice(0, 10);
for (const r of samples) {
    console.log(`  ${r.id?.slice(0, 8)}… | ${r.language} | cat=${r.category || '-'} | tags=${JSON.stringify(r.tags)}`);
}

const out = path.join(root, 'scratch', 'hourly_tags_audit.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(
    out,
    JSON.stringify(
        {
            total: all.length,
            distinctTags: tallyTags(all).tagCounts,
            byLanguage: {
                bn: { count: byLang.bn.length, tags: tallyTags(byLang.bn).tagCounts },
                en: { count: byLang.en.length, tags: tallyTags(byLang.en).tagCounts },
            },
            difficultyLikeCount: withDifficultyTag.length,
        },
        null,
        2
    )
);
console.log(`\nJSON: ${out}`);
