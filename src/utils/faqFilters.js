export const FAQ_PAGE_TITLE = {
    en: 'Quick Help & FAQ',
    bn: 'কি? কেন? কিভাবে?',
};

/** Strip legacy comma formatting from cached FAQ JSON titles. */
export function normalizeFaqTitle(title, language) {
    const canonical = FAQ_PAGE_TITLE[language] || FAQ_PAGE_TITLE.en;
    if (!title || typeof title !== 'string') return canonical;
    const legacy = title.replace(/\s+/g, ' ').trim();
    if (legacy === 'কি, কেন?, কিভাবে?' || legacy === 'কি, কেন, কিভাবে?') {
        return FAQ_PAGE_TITLE.bn;
    }
    return legacy;
}

export const FAQ_GROUPS = [
    { id: 'all', labelEn: 'All', labelBn: 'সব' },
    { id: 'safety', labelEn: 'Safety & PPE', labelBn: 'নিরাপত্তা' },
    { id: 'penalty_legal', labelEn: 'Rules & Billing', labelBn: 'নিয়ম ও বিল' },
    { id: 'protection', labelEn: 'Protection', labelBn: 'সুরক্ষা ব্যবস্থা' },
    { id: 'maintenance', labelEn: 'Maintenance', labelBn: 'রক্ষণাবেক্ষণ' },
    { id: 'fault_ops', labelEn: 'Faults & Ops', labelBn: 'ফল্ট ও অপারেশন' },
    { id: 'testing_tools', labelEn: 'Testing & Tools', labelBn: 'পরীক্ষা ও যন্ত্র' },
    { id: 'customer', labelEn: 'Customer Service', labelBn: 'গ্রাহক সেবা' },
    { id: 'disaster', labelEn: 'Disaster', labelBn: 'দুর্যোগ' },
    { id: 'technical', labelEn: 'Basics', labelBn: 'মৌলিক বিষয়' },
];

function toBnNumber(num) {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num)
        .split('')
        .map((digit) => bnDigits[digit] || digit)
        .join('');
}

/** Human-friendly result line for the FAQ header (not robotic "X/Y shown"). */
export function getFaqResultSummary(filtered, total, hasFilters, language) {
    if (language === 'en') {
        if (!hasFilters || filtered === total) {
            return { primary: `${total} questions`, secondary: 'Quick answers for field work' };
        }
        return { primary: `${filtered} match${filtered === 1 ? '' : 'es'}`, secondary: `out of ${total}` };
    }

    const totalBn = toBnNumber(total);
    const filteredBn = toBnNumber(filtered);

    if (!hasFilters || filtered === total) {
        return {
            primary: `মোট ${totalBn}টি প্রশ্নের উত্তর`,
            secondary: 'মাঠে কাজের সময় দ্রুত দেখে নিন',
        };
    }

    return {
        primary: `${filteredBn}টি প্রশ্ন মিলেছে`,
        secondary: `মোট ${totalBn}টির মধ্যে`,
    };
}

export function getFaqGroupId(category) {
    const c = (category || '').toLowerCase();
    if (!c) return 'other';
    if (/penalty|legal|billing|tariff|wberc|financial|regulation|compliance|exemption|payment|new rules|exception/.test(c)) {
        return 'penalty_legal';
    }
    if (/safety|ppe|earthing|fire|shock/.test(c)) return 'safety';
    if (/protection|switchgear|power quality/.test(c)) return 'protection';
    if (/maintenance|dtr|transformer|cleaning|battery|substation|hotspot|sampling|components|oltc|ptr/.test(c)) {
        return 'maintenance';
    }
    if (/fault|operation|troubleshoot|breakdown|grid|procedure|operational/.test(c)) return 'fault_ops';
    if (/testing|tools|measuring|diagnostic|precision|hand|line|climbing|cutting|improvised|proper usage/.test(c)) {
        return 'testing_tools';
    }
    if (/customer|grievance|communication|service|consumer|administrative|new connection/.test(c)) {
        return 'customer';
    }
    if (/disaster|preparedness|recovery/.test(c)) return 'disaster';
    if (/basics|technical|cable|construction|modernization|best practice/.test(c)) return 'technical';
    return 'other';
}

export function filterFaqQuestions(questions, { query = '', groupId = 'all', tag = '' } = {}) {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedTag = tag.trim().toLowerCase();

    return (questions || []).filter((q) => {
        if (groupId !== 'all' && getFaqGroupId(q.category) !== groupId) return false;

        if (normalizedTag) {
            const tags = (q.tags || []).map((t) => t.toLowerCase());
            if (!tags.includes(normalizedTag)) return false;
        }

        if (!normalizedQuery) return true;

        return (
            q.question.toLowerCase().includes(normalizedQuery) ||
            q.answer.toLowerCase().includes(normalizedQuery) ||
            (q.category || '').toLowerCase().includes(normalizedQuery) ||
            (q.tags || []).some((t) => t.toLowerCase().includes(normalizedQuery))
        );
    });
}

export function getFaqGroupCounts(questions) {
    const counts = { all: (questions || []).length };
    for (const q of questions || []) {
        const groupId = getFaqGroupId(q.category);
        counts[groupId] = (counts[groupId] || 0) + 1;
    }
    return counts;
}

export function getTopFaqTags(questions, limit = 14) {
    const freq = new Map();
    for (const q of questions || []) {
        for (const tag of q.tags || []) {
            freq.set(tag, (freq.get(tag) || 0) + 1);
        }
    }
    return [...freq.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([tag]) => tag);
}
