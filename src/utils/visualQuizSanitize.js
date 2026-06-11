/**
 * Reduce answer leakage in visual quiz questions (labeled diagrams, parens in stem, etc.)
 */

const BN_PART_WORDS =
    /(বুশিং|রেঞ্চ|সাসপেনশন|অ্যাডজাস্টার|ট্যাঙ্ক|শেল|ইনসুলেটর|কি|গেজ|ব্রিদার|রেডিয়েটর|কনজারভেটর|হেডব্যান্ড|স্ট্র্যাপ|পিক)/i;

const normalizeForMatch = (s) =>
    String(s || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const overlapScore = (a, b) => {
    const na = normalizeForMatch(a);
    const nb = normalizeForMatch(b);
    if (!na || !nb) return 0;
    if (na.includes(nb) || nb.includes(na)) return 1;
    const wordsA = na.split(' ').filter((w) => w.length > 3);
    const wordsB = new Set(nb.split(' ').filter((w) => w.length > 3));
    if (!wordsA.length) return 0;
    const hits = wordsA.filter((w) => wordsB.has(w)).length;
    return hits / wordsA.length;
};

/** Remove parenthetical answer hints from question stem. */
export function stripAnswerLeaksFromQuestionText(questionText, options = [], correctIndex = 0) {
    let text = String(questionText || '');
    const correct = options[correctIndex] || '';

    text = text.replace(/\s*\(([^)]{2,120})\)/g, (full, inner) => {
        const trimmed = inner.trim();
        if (!trimmed) return full;

        const matchesCorrect =
            overlapScore(trimmed, correct) >= 0.5 ||
            options.some((opt) => overlapScore(trimmed, opt) >= 0.65);

        if (matchesCorrect) return '';
        if (BN_PART_WORDS.test(trimmed)) return '';
        if (/^(এল|অ্যালেন|হেক্স|কম্বিনেশন|হুইল|পাইপ|স্লাই|ডাল|র্যাচেট|গুটি)\s/i.test(trimmed)) return '';
        if (/^(শেল|ক্র্যাডল|রেচেট|সোয়েট|চিন|পিক|হেডব্যান্ড)/i.test(trimmed)) return '';

        return full;
    });

    // Shape / structure giveaways when a single tool photo is shown
    text = text
        .replace(/ছবিতে দেখানো\s*['']?L['']?\s*আকৃতির\s*রেঞ্চটিকে/gi, 'ছবিতে দেখানো এই রেঞ্চটিকে')
        .replace(/['']?L['']?\s*আকৃতির\s*রেঞ্চ/gi, 'রেঞ্চ')
        .replace(/দুই প্রান্ত খোলা ইউ\s*\(U\)\s*আকৃতির/gi, 'দুই প্রান্ত খোলা')
        .replace(/,\s*যার এক মাথা খোলা এবং অন্য মাথা রিং আকৃতির\??/gi, '?')
        .replace(/রেঞ্চটির\s*\([^)]+\)\s*/gi, 'রেঞ্চটির ')
        .replace(/অংশের\s*\([^)]+\)\s*/gi, 'অংশের ')
        .replace(/অংশটির\s*\([^)]+\)\s*/gi, 'অংশটির ');

    return text.replace(/\s{2,}/g, ' ').replace(/\?\?+/g, '?').trim();
}

/** Options like "D' (ক্র্যাডল...)" → letter only so image label must be read. */
export function sanitizeLetterLabeledOptions(options = []) {
    return options.map((opt) => {
        const raw = String(opt || '').trim();
        const letterMatch = raw.match(/^['']?([A-H]|[০-৯0-9]+)['']?\s*\(.+\)\s*$/);
        if (letterMatch) return `চিহ্নিত অংশ '${letterMatch[1]}'`;

        const letterOnlyParen = raw.match(/^শুধুমাত্র\s+.+\s*\(([A-H])\)\s*$/);
        if (letterOnlyParen) return `শুধুমাত্র অংশ '${letterOnlyParen[1]}'`;

        if (/^সব কয়টি অংশ\s*\([A-H,\s]+\)/i.test(raw)) {
            return 'সব প্রয়োজনীয় নিরাপত্তা অংশ একসাথে';
        }

        const soloLetterParen = raw.match(/^শুধুমাত্র\s+(.+?)\s*\([A-H]\)\s*$/);
        if (soloLetterParen) return `শুধুমাত্র ${soloLetterParen[1]}`;

        return opt;
    });
}

/** Detect stem describing only the correct text option (length/keyword giveaway). */
export function questionTextDescribesCorrectOption(questionText, options, correctIndex) {
    const text = normalizeForMatch(questionText);
    const correct = normalizeForMatch(options[correctIndex]);
    if (!text || !correct || correct.length < 8) return false;

    const shapePatterns = [
        [/এক মাথা খোলা/, /ডাল|ওপেন/],
        [/রিং আকৃতি/, /কম্বিনেশন|রিং/],
        [/খাঁজকাটা দাঁত/, /পাইপ/],
        [/ঘুরানো স্ক্রু/, /স্লাই|অ্যাডজাস্ট/],
    ];
    for (const [qPat, optPat] of shapePatterns) {
        if (qPat.test(text) && optPat.test(correct)) return true;
    }
    return false;
}

export function sanitizeVisualQuestionRow(row) {
    const options = [row.option_1, row.option_2, row.option_3, row.option_4].map((o) => String(o || '').trim());
    const correctIndex = Number.parseInt(row.correct_index, 10);
    if (!Number.isInteger(correctIndex)) return row;

    let question_text = stripAnswerLeaksFromQuestionText(row.question_text, options, correctIndex);
    let option_1 = options[0];
    let option_2 = options[1];
    let option_3 = options[2];
    let option_4 = options[3];

    const hasLetterOptions = options.some((o) => /^['']?[A-H]['']?\s*\(/i.test(o));
    if (hasLetterOptions) {
        [option_1, option_2, option_3, option_4] = sanitizeLetterLabeledOptions(options);
    }

    return {
        ...row,
        question_text,
        option_1,
        option_2,
        option_3,
        option_4,
    };
}

export function detectAnswerLeakWarnings(row) {
    const options = [row.option_1, row.option_2, row.option_3, row.option_4];
    const correctIndex = Number.parseInt(row.correct_index, 10);
    const warnings = [];

    const parenMatch = String(row.question_text || '').match(/\(([^)]{4,})\)/);
    if (parenMatch && overlapScore(parenMatch[1], options[correctIndex]) >= 0.4) {
        warnings.push('question_paren_matches_answer');
    }
    if (options.some((o) => /^['']?[A-H]['']?\s*\(/i.test(String(o)))) {
        warnings.push('letter_label_options_include_names');
    }
    if (questionTextDescribesCorrectOption(row.question_text, options, correctIndex)) {
        warnings.push('question_describes_correct_option');
    }
    if (/['']?[০-৯0-9]+['']?\s*নম্বর/i.test(row.question_text) && row.question_image_url) {
        warnings.push('numbered_labeled_diagram');
    }
    if (/['']?[A-H]['']?\s*চিহ্নিত/i.test(row.question_text) && /image_to_text/i.test(row.question_type)) {
        warnings.push('letter_labeled_diagram');
    }

    return warnings;
}
