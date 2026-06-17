/** Shared PPE catalog — used by MyPPE wizard and Lineman interactive view. */

export const PPE_ITEMS = [
    {
        name: 'Safety Helmet',
        icon: '🪖',
        essential: true,
        bn: 'সেফটি হেলমেট',
        tip: { en: 'Protects your head from falling objects', bn: 'পড়ন্ত বস্তু থেকে মাথা রক্ষা করে' },
        zone: { x: 47, y: 9, side: 'center' }
    },
    {
        name: 'Safety Goggles',
        icon: '🥽',
        essential: true,
        bn: 'সেফটি গগলস',
        tip: { en: 'Protects eyes from sparks and debris', bn: 'স্পার্ক ও ধ্বংসাবশেষ থেকে চোখ রক্ষা করে' },
        zone: { x: 47, y: 15, side: 'center' }
    },
    {
        name: 'Reflective Jacket',
        icon: '🦺',
        essential: true,
        bn: 'রিফ্লেক্টিভ জ্যাকেট',
        tip: { en: 'Makes you visible in dark and traffic', bn: 'অন্ধকারে ও ট্রাফিকে দৃশ্যমান রাখে' },
        zone: { x: 47, y: 33, side: 'center' }
    },
    {
        name: 'Full Body Harness',
        icon: '🧗‍♂️',
        essential: true,
        bn: 'ফুল বডি হারনেস',
        tip: { en: 'Full protection when climbing poles', bn: 'পোলে ওঠার সময় সম্পূর্ণ সুরক্ষা' },
        zone: { x: 60, y: 43, side: 'center' }
    },
    {
        name: 'Safety Belt',
        icon: '🧗',
        essential: true,
        bn: 'সেফটি বেল্ট',
        tip: { en: 'Prevents falls from height', bn: 'উচ্চতা থেকে পড়া প্রতিরোধ করে' },
        zone: { x: 36, y: 50, side: 'center' }
    },
    {
        name: 'Insulated Gloves',
        icon: '🧤',
        essential: true,
        bn: 'ইনসুলেটেড গ্লাভস',
        tip: { en: 'Your lifeline when working on live wires', bn: 'লাইভ তারে কাজ করার সময় আপনার জীবনরেখা' },
        zone: { x: 25, y: 54, side: 'left' }
    },
    {
        name: 'Safety Shoes/Boots',
        icon: '🥾',
        essential: true,
        bn: 'সেফটি জুতো/বুট',
        tip: { en: 'Prevents electric shock through feet', bn: 'পায়ের মাধ্যমে বিদ্যুৎ শক প্রতিরোধ করে' },
        zone: { x: 48, y: 87, side: 'center' }
    },
    {
        name: 'Voltage Detector',
        icon: '🔌',
        essential: true,
        bn: 'ভোল্টেজ ডিটেক্টর',
        tip: { en: 'Detects live current before you touch', bn: 'স্পর্শ করার আগে লাইভ কারেন্ট সনাক্ত করে' },
        zone: { x: 87, y: 45, side: 'right' }
    },
    {
        name: 'Discharge Rod',
        icon: '🦯',
        essential: true,
        bn: 'ডিসচার্জ রড',
        tip: { en: 'Safely discharges stored electrical energy', bn: 'সঞ্চিত বৈদ্যুতিক শক্তি নিরাপদে ডিসচার্জ করে' },
        zone: { x: 11, y: 38, side: 'left' }
    },
    {
        name: 'Raincoat',
        icon: '🧥',
        essential: false,
        bn: 'রেইনকোট',
        tip: { en: 'Stay dry during monsoon work', bn: 'বর্ষায় কাজের সময় শুকনো থাকুন' },
        zone: { x: 26, y: 64, side: 'left' }
    },
    {
        name: 'Torch/Emergency Light',
        icon: '🔦',
        essential: false,
        bn: 'টর্চ/জরুরী আলো',
        tip: { en: 'Essential for night emergency work', bn: 'রাতের জরুরি কাজের জন্য অপরিহার্য' },
        zone: { x: 12, y: 70, side: 'left' }
    }
];

export const CONDITIONS = [
    { value: 'Good', en: 'Good ✨', bn: 'ভালো ✨', color: 'bg-emerald-500', ring: '#22c55e', emoji: '💪' },
    { value: 'Fair', en: 'Fair 👍', bn: 'মোটামুটি 👍', color: 'bg-amber-500', ring: '#f59e0b', emoji: '🤔' },
    { value: 'Poor', en: 'Poor ⚠️', bn: 'খারাপ ⚠️', color: 'bg-red-500', ring: '#ef4444', emoji: '😟' },
    { value: 'Expired', en: 'Expired 🚫', bn: 'মেয়াদোত্তীর্ণ 🚫', color: 'bg-slate-500', ring: '#64748b', emoji: '💀' }
];

export const AGE_OPTIONS = [
    { value: 3, en: '< 6 months', bn: '৬ মাসের কম', emoji: '🆕' },
    { value: 9, en: '6-12 months', bn: '৬-১২ মাস', emoji: '📅' },
    { value: 18, en: '1-2 years', bn: '১-২ বছর', emoji: '📆' },
    { value: 36, en: '> 2 years', bn: '২ বছরের বেশি', emoji: '⏰' }
];

// Items shown on the lineman figure (core) vs. the supplementary "other gear" list.
const OTHER_PPE_NAMES = new Set(['Safety Belt', 'Raincoat', 'Torch/Emergency Light']);

export const CORE_PPE_ITEMS = PPE_ITEMS.filter((i) => !OTHER_PPE_NAMES.has(i.name));
export const OTHER_PPE_ITEMS = PPE_ITEMS.filter((i) => OTHER_PPE_NAMES.has(i.name));

export function buildAnswersFromRows(rows = []) {
    return PPE_ITEMS.map((item) => {
        const existing = rows.find((d) => d.name === item.name);
        const usage = existing?.details?.includes('Usage:')
            ? existing.details.split('Usage:')[1].split('|')[0].trim()
            : 'Personal';
        return {
            name: item.name,
            available: !!existing,
            id: existing?.id || null,
            count: existing?.count || 1,
            condition: existing?.condition || 'Good',
            age_months: existing?.age_months || 3,
            usage: usage === 'Shared' ? 'Shared' : 'Personal'
        };
    });
}

export function getPPEStatusColor(answer) {
    if (!answer?.available) return '#94a3b8';
    const cond = CONDITIONS.find((c) => c.value === answer.condition);
    return cond?.ring || '#22c55e';
}
