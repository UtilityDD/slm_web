/**
 * Builds one TTS-friendly script: quiz number, question, then each choice.
 * Option labels always use English "Option A", "Option B" (natural for BN + EN).
 */

function isImageOption(opt) {
    if (typeof opt !== 'string') return false;
    const s = opt.trim();
    if (s.startsWith('/')) return true;
    return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(s);
}

/**
 * @param {object} params
 * @param {'en'|'bn'} params.language UI / intro language (option labels stay "Option …").
 * @param {number} params.questionIndex 0-based
 * @param {number} params.totalQuestions
 * @param {{ questionText?: string, image?: string, options?: string[] }} params.question
 */
export function buildChapterQuizSpeechScript({ language, questionIndex, totalQuestions, question }) {
    if (!question || totalQuestions < 1) return '';

    const n = questionIndex + 1;
    const total = totalQuestions;
    const intro =
        language === 'bn'
            ? `প্রশ্ন ${n}, মোট ${total}।`
            : `Question ${n} of ${total}.`;

    const qText = (question.questionText || '').replace(/\s+/g, ' ').trim();
    const parts = [intro, qText].filter(Boolean);

    if (question.image) {
        parts.push(language === 'bn' ? 'এখানে একটি ছবি আছে।' : 'There is an image for this question.');
    }

    const options = Array.isArray(question.options) ? question.options : [];
    options.forEach((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const label = `Option ${letter}`;
        if (isImageOption(opt)) {
            parts.push(`${label}: ${language === 'bn' ? 'ছবি।' : 'Picture.'}`);
        } else {
            parts.push(`${label}: ${String(opt).replace(/\s+/g, ' ').trim()}.`);
        }
    });

    return parts.join(' ');
}
