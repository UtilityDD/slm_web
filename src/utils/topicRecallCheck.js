/** How many topic names to show when the lesson has at least this many points. */
export const TOPIC_RECALL_CHOICE_COUNT = 6;

/** Visible-time floor on the current card before পড়ে ফেলেছি / Continue is enabled. */
export const TOPIC_RECALL_DWELL_MS = 10_000;

export function topicRecallKey(sectionIndex, pointIndex) {
    return `s${sectionIndex}-p${pointIndex}`;
}

/** Drop leading "১." / "1." so the picker cannot be matched to "ধাপ ৩". */
export function stripTopicIndexPrefix(itemName) {
    const raw = String(itemName || '').trim();
    if (!raw) return '';
    const stripped = raw.replace(/^[\d০-৯]{1,3}\s*[.．。)）।:\-–—]\s*/u, '').trim();
    return stripped || raw;
}

export function collectLessonTopics(trainingContent) {
    const sections = Array.isArray(trainingContent?.sections) ? trainingContent.sections : [];
    const topics = [];
    sections.forEach((section, sectionIndex) => {
        const points = Array.isArray(section?.points) ? section.points : [];
        points.forEach((point, pointIndex) => {
            const itemName = String(point?.item_name || '').trim();
            if (!itemName) return;
            topics.push({
                key: topicRecallKey(sectionIndex, pointIndex),
                itemName,
                label: stripTopicIndexPrefix(itemName),
            });
        });
    });
    return topics;
}

/** 0-based index into `content.sections` for the current journal slide, or -1. */
export function lessonSectionIndexFromSlides(slides, activeIndex) {
    if (!Array.isArray(slides) || activeIndex < 0) return -1;
    if (slides[activeIndex]?.type !== 'section') return -1;
    let n = -1;
    for (let i = 0; i <= activeIndex; i += 1) {
        if (slides[i]?.type === 'section') n += 1;
    }
    return n;
}

function shuffleCopy(items, rng) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

/**
 * Up to `count` names including `currentKey`. Returns null when a check cannot run
 * (fewer than 2 topics, or current point missing).
 */
export function buildTopicRecallChoices(
    topics,
    currentKey,
    count = TOPIC_RECALL_CHOICE_COUNT,
    rng = Math.random
) {
    if (!Array.isArray(topics) || topics.length < 2) return null;
    const current = topics.find((t) => t.key === currentKey);
    if (!current) return null;
    const others = shuffleCopy(
        topics.filter((t) => t.key !== currentKey),
        rng
    );
    const extra = Math.min(Math.max(0, count - 1), others.length);
    return shuffleCopy([current, ...others.slice(0, extra)], rng);
}
