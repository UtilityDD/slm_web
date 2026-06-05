/**
 * Content-based difficulty scoring for hourly_questions (not category-only).
 * Usage:
 *   node scripts/maintenance/assess_hourly_difficulty.mjs           # dry-run stats
 *   node scripts/maintenance/assess_hourly_difficulty.mjs --apply # write tags to DB
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
const APPLY = process.argv.includes('--apply');
const SQL_OUT = process.argv.includes('--sql-out');

function normalizeOptions(options) {
    if (Array.isArray(options)) return options.map((o) => String(o || '').trim());
    try {
        const parsed = JSON.parse(options || '[]');
        return Array.isArray(parsed) ? parsed.map((o) => String(o || '').trim()) : [];
    } catch {
        return [];
    }
}

const HARD_SIGNALS = [
    'রজার্স', 'rogers', 'ডিজিএ', 'dga', 'থার্মাল', 'thermal', 'মেগার', 'megger',
    'ইম্পিডেন্স', 'impedance', 'ইথিলিন', 'ethylene', 'মিথেন', 'methane', 'oltc', 'ওএলটিসি',
    'ইনফ্রারেড', 'infrared', 'হট-স্পট', 'hot-spot', 'hot spot', 'টেনসাইল', 'tensile',
    'উলটিমেট', 'ultimate', 'ফ্যাক্টর অফ সেফটি', 'safety factor', 'রেশিও', 'ratio',
    'শর্ট সার্কিট', 'short circuit', 'inter-winding', 'আয়নিত', 'corona', 'করোনা',
    'dissolved gas', 'রিলে', 'relay setting', 'বিউকে', 'buchholz', 'বুখোলজ',
    'ওভারলোড', 'overload coordination', 'symmetrical', 'asymmetrical',
    'রেজিস্টিভিটি', 'resistivity', 'গ্রাউন্ড রেজিস্ট্যান্স', 'ground resistance',
    'partial discharge', 'পার্শিয়াল', 'harmonic', 'হারমনিক', 'sag tension',
    'stringing chart', 'stringing', 'conductor sag', 'স্যাগ',
];

const MEDIUM_SIGNALS = [
    'প্রক্রিয়া', 'procedure', 'ধাপ', 'step', 'পরীক্ষা', 'test', 'চেক', 'check',
    'টহল', 'patrol', 'isolation', 'আইসোলেশন', 'earthing', 'আর্থিং', 'neutral', 'নিউট্রাল',
    'fuse', 'ফিউজ', 'breaker', 'ব্রেকার', 'insulator', 'ইনসুলেটর', 'transformer', 'ট্রান্সফরমার',
    'maintenance', 'মেইনটেন্যান্স', 'ত্রুটি', 'fault', 'troubleshoot', 'ট্রাবল',
    'লক-আউট', 'lock-out', 'tag-out', 'পারমিট', 'permit', 'ppe', 'হেলমেট', 'harness',
    'সিইএ', 'cea', 'regulation', 'রেগুলেশন', 'standard', 'স্ট্যান্ডার্ড',
];

const EASY_SIGNALS = [
    'পেশাদার', 'professional', 'আচরণ', 'behaviour', 'behavior', 'শিষ্টাচার',
    'danger plate', 'ডেঞ্জার প্লেট', 'গ্রাহক', 'customer', 'অফিসে',
    'কেন বকবেন', 'কেন জরুরি', 'কেন বাধ্যতামূলক', 'কেন লাগানো',
    'সচেতন', 'awareness', 'সতর্কতা', 'warning',
];

const ABSURD_DISTRACTORS = [
    'বগি', 'গুটখা', 'মারপিট', 'ভাঙচুর', 'সানগ্লাস', 'টেপ মেরে', 'আঠা লাগি',
    'অফিসে গিয়ে', 'পাড়া প্রতিবেশী', 'বাড়িতে বসে', 'দেখতে অশোভন', 'স্বাদের জন্য',
    'বাজারমূল্য', 'শ্রেষ্ঠত্বের প্রতীক', 'ডিজাইন সুন্দর', 'পুলিশকে খবর',
];

/** Score question difficulty from content; higher = harder. */
export function assessQuestionDifficulty(q) {
    const text = String(q.question_text || '');
    const opts = normalizeOptions(q.options);
    const blob = `${text} ${opts.join(' ')}`.toLowerCase();
    let score = 0;

    // Length / complexity of stem
    if (text.length > 100) score += 0.5;
    if (text.length > 160) score += 0.5;
    if (text.length > 220) score += 0.5;

    // Scenario framing (applied knowledge)
    if (/তুমি|ওস্তাদ|দেখলেন|ধরুন|ধরা যায়|যদি .* দেখ|করার সময়|পৌঁছে|site/i.test(text)) {
        score += 1;
    }

    // Technical depth
    const hardHits = HARD_SIGNALS.filter((k) => blob.includes(k.toLowerCase())).length;
    score += Math.min(4, hardHits * 1.2);

    const mediumHits = MEDIUM_SIGNALS.filter((k) => blob.includes(k.toLowerCase())).length;
    if (mediumHits >= 2) score += 0.5;
    if (mediumHits >= 4) score += 0.5;

    // Numeric / specification recall
    if (/[\d০-৯]+[\.,]?[\d০-৯]*\s*(%|শতাংশ)/.test(text)) score += 1;
    if (/(১-৩|১:৩:৬|১:৪:৮|৪\.৫|২\.০|২\.৫|০\.৫|৫০-১০০|১\/৬)/.test(text)) score += 1;
    if (/\d+\s*(ভোল্ট|volt|অ্যাম্প|amp|kva|kv|মিঃ|মিটার|mm|সেমি)/i.test(blob)) score += 0.4;

    // Compare / distinguish (harder cognition)
    if (/পার্থক্য|তফাৎ|difference|বনাম|vs|মধ্যে|between/i.test(text)) score += 1;

    // Option quality signals
    const avgOptLen = opts.length ? opts.reduce((s, o) => s + o.length, 0) / opts.length : 0;
    const maxOptLen = opts.reduce((m, o) => Math.max(m, o.length), 0);
    if (avgOptLen > 42) score += 0.5;
    if (avgOptLen > 58) score += 0.5;
    if (maxOptLen > 90) score += 0.5;

    // Similar option lengths → harder discrimination
    if (opts.length >= 4) {
        const lens = opts.map((o) => o.length);
        const spread = Math.max(...lens) - Math.min(...lens);
        if (spread < 25 && avgOptLen > 35) score += 0.75;
    }

    // Obvious absurd distractors → easier
    const absurdInOpts = opts.filter((o) => ABSURD_DISTRACTORS.some((p) => o.includes(p))).length;
    if (absurdInOpts >= 2) score -= 2;
    if (absurdInOpts >= 1 && opts.length === 4) score -= 0.5;

    // Easy ethical / awareness stems
    const easyHits = EASY_SIGNALS.filter((k) => blob.includes(k.toLowerCase())).length;
    if (easyHits >= 2) score -= 1.5;
    if (/কেন (বকবেন|জরুরি|বাধ্যতামূলক|লাগানো)/.test(text)) score -= 1;

    // Simple recall with short stem + short options
    if (text.length < 75 && avgOptLen < 32 && hardHits === 0) score -= 1;

    // Hint complexity (long hint often accompanies harder items)
    const hintLen = String(q.hint || '').length;
    if (hintLen > 100) score += 0.25;
    if (hintLen > 160) score += 0.25;

    return Math.round(score * 10) / 10;
}

/** Target pool mix for hourly random selection (see hourlyDifficulty.js). */
const TARGET_SHARE = { easy: 0.58, medium: 0.27, hard: 0.15 };

/** Minimum content score to qualify for a band (avoids mis-ranking very easy items). */
const MIN_SCORE = { hard: 2.25, medium: 0.75 };

/**
 * Assign difficulty from scores using content rank + minimum thresholds.
 * Top ~15% scored items → hard (if score meets floor), etc.
 */
export function assignDifficulties(scoredRows) {
    const sorted = [...scoredRows].sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
    const n = sorted.length;
    const hardTarget = Math.round(n * TARGET_SHARE.hard);
    const mediumTarget = Math.round(n * TARGET_SHARE.medium);

    const result = new Map();
    let hard = 0;
    let medium = 0;

    for (const row of sorted) {
        let difficulty = 'easy';
        if (hard < hardTarget && row.score >= MIN_SCORE.hard) {
            difficulty = 'hard';
            hard++;
        } else if (medium < mediumTarget && row.score >= MIN_SCORE.medium) {
            difficulty = 'medium';
            medium++;
        }
        result.set(row.id, difficulty);
    }

    // Fill shortfall if floors left slots empty (take next best scores)
    for (const row of sorted) {
        if (hard >= hardTarget && medium >= mediumTarget) break;
        const current = result.get(row.id);
        if (current !== 'easy') continue;
        if (hard < hardTarget && row.score >= MIN_SCORE.medium) {
            result.set(row.id, 'hard');
            hard++;
        } else if (medium < mediumTarget) {
            result.set(row.id, 'medium');
            medium++;
        }
    }

    return result;
}

async function fetchAllQuestions() {
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
    return all;
}

async function main() {
    const questions = await fetchAllQuestions();
    const scored = questions.map((q) => ({ ...q, score: assessQuestionDifficulty(q) }));
    const difficultyMap = assignDifficulties(scored);
    const assessed = scored.map((q) => ({ ...q, difficulty: difficultyMap.get(q.id) || 'easy' }));

    const counts = { easy: 0, medium: 0, hard: 0 };
    for (const a of assessed) counts[a.difficulty]++;

    const byCat = {};
    for (const a of assessed) {
        const cat = a.category || '(none)';
        if (!byCat[cat]) byCat[cat] = { easy: 0, medium: 0, hard: 0, total: 0 };
        byCat[cat][a.difficulty]++;
        byCat[cat].total++;
    }

    const mixedCats = Object.entries(byCat)
        .filter(([, v]) => v.easy > 0 && v.hard > 0)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 15);

    console.log(`Assessed ${assessed.length} questions`);
    console.log('Distribution:', counts);
    console.log(`  easy: ${((counts.easy / assessed.length) * 100).toFixed(1)}%`);
    console.log(`  medium: ${((counts.medium / assessed.length) * 100).toFixed(1)}%`);
    console.log(`  hard: ${((counts.hard / assessed.length) * 100).toFixed(1)}%`);
    console.log('\nCategories with easy AND hard (not category-only):', mixedCats.length);
    for (const [cat, v] of mixedCats.slice(0, 8)) {
        console.log(`  ${cat}: easy=${v.easy} medium=${v.medium} hard=${v.hard}`);
    }

    const samples = {
        hard: assessed.filter((a) => a.difficulty === 'hard').sort((a, b) => b.score - a.score).slice(0, 5),
        medium: assessed.filter((a) => a.difficulty === 'medium').slice(10, 15),
        easy: assessed.filter((a) => a.difficulty === 'easy').sort((a, b) => a.score - b.score).slice(0, 5),
    };

    const outDir = path.join(root, 'scratch');
    fs.mkdirSync(outDir, { recursive: true });
    const reportPath = path.join(outDir, 'hourly_difficulty_assessment.json');
    fs.writeFileSync(
        reportPath,
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                total: assessed.length,
                counts,
                mixedCategoryCount: mixedCats.length,
                samples: {
                    hard: samples.hard.map((q) => ({
                        id: q.id, score: q.score, category: q.category, q: q.question_text?.slice(0, 100),
                    })),
                    easy: samples.easy.map((q) => ({
                        id: q.id, score: q.score, category: q.category, q: q.question_text?.slice(0, 100),
                    })),
                },
                byCategory: Object.fromEntries(
                    Object.entries(byCat).sort((a, b) => b[1].total - a[1].total).slice(0, 30)
                ),
            },
            null,
            2
        )
    );
    console.log(`\nReport: ${reportPath}`);

    const tagPayload = assessed.map((a) => ({ id: a.id, difficulty: a.difficulty, score: a.score }));
    const tagRowsPath = path.join(outDir, 'hourly_difficulty_tags.json');
    const tagRepoPath = path.join(root, 'quiz_management', 'hourly_difficulty_tags.json');
    fs.writeFileSync(tagRowsPath, JSON.stringify(tagPayload));
    fs.writeFileSync(tagRepoPath, JSON.stringify(tagPayload));
    console.log(`Tag rows: ${tagRowsPath}`);
    console.log(`Tag rows (repo): ${tagRepoPath}`);

    if (SQL_OUT) {
        const sqlPath = path.join(outDir, 'apply_hourly_difficulty_tags.sql');
        const chunks = [];
        chunks.push('-- Apply content-assessed difficulty tags to hourly_questions');
        chunks.push('-- Run in Supabase Dashboard → SQL Editor (needs write access)');
        chunks.push('BEGIN;');
        const CHUNK = 200;
        for (let i = 0; i < assessed.length; i += CHUNK) {
            const batch = assessed.slice(i, i + CHUNK);
            const values = batch
                .map((r) => `('${r.id}'::uuid, ARRAY['${r.difficulty}']::text[])`)
                .join(',\n  ');
            chunks.push(`UPDATE hourly_questions AS hq SET tags = v.tags
FROM (VALUES
  ${values}
) AS v(id, tags)
WHERE hq.id = v.id;`);
        }
        chunks.push('COMMIT;');
        fs.writeFileSync(sqlPath, chunks.join('\n\n'));
        console.log(`SQL file: ${sqlPath}`);
    }

    if (!APPLY) {
        console.log('\nDry run. Options: --apply (needs SUPABASE_SERVICE_ROLE_KEY), --sql-out');
        return;
    }

    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('\nERROR: SUPABASE_SERVICE_ROLE_KEY missing in .env.local — cannot write via API.');
        console.error('Run the generated SQL in Supabase SQL Editor instead.');
        process.exit(1);
    }

    console.log('\nApplying tags to database (service role)...');
    const BATCH = 100;
    let updated = 0;
    let errors = 0;
    for (let i = 0; i < assessed.length; i += BATCH) {
        const batch = assessed.slice(i, i + BATCH);
        const results = await Promise.all(
            batch.map(async (row) => {
                const { data, error } = await sb
                    .from('hourly_questions')
                    .update({ tags: [row.difficulty] })
                    .eq('id', row.id)
                    .select('id');
                return { error, count: data?.length || 0 };
            })
        );
        for (const r of results) {
            if (r.error || r.count === 0) errors++;
            else updated++;
        }
        process.stdout.write(`\r  ${Math.min(i + BATCH, assessed.length)} / ${assessed.length}`);
    }
    console.log(`\nDone. Updated: ${updated}, errors/skipped: ${errors}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
