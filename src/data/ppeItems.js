/** Shared PPE catalog — used by MyPPE wizard, lineman view, and field PPE nudge. */

/**
 * Essential field gear (prompt first).
 * `pair: true` → count is in pairs (gloves, shoes, gum boots).
 * `image` → 512px thumbs under /images/ppe-thumbs (Safety Library / lesson / prize product art).
 */
export const PPE_ITEMS = [
  {
    name: 'Insulated Gloves',
    icon: '🧤',
    image: '/images/ppe-thumbs/insulated-gloves.webp',
    essential: true,
    pair: true,
    bn: 'ইনসুলেটেড গ্লাভস',
    tip: {
      en: 'Your lifeline when working on live wires — count as pairs.',
      bn: 'লাইভ তারে কাজের জীবনরেখা — জোড়া হিসেবে গুনুন।',
    },
    zone: { x: 25, y: 54, side: 'left' },
  },
  {
    name: 'Safety Helmet',
    icon: '🪖',
    image: '/images/ppe-thumbs/safety-helmet.webp',
    essential: true,
    pair: false,
    bn: 'সেফটি হেলমেট',
    tip: {
      en: 'Protects your head from falling objects',
      bn: 'পড়ন্ত বস্তু থেকে মাথা রক্ষা করে',
    },
    zone: { x: 47, y: 9, side: 'center' },
  },
  {
    name: 'Full Body Harness',
    icon: '🧗‍♂️',
    image: '/images/ppe-thumbs/full-body-harness.webp',
    essential: true,
    pair: false,
    bn: 'ফুল বডি হারনেস',
    tip: {
      en: 'Full protection when climbing poles',
      bn: 'পোলে ওঠার সময় সম্পূর্ণ সুরক্ষা',
    },
    zone: { x: 60, y: 43, side: 'center' },
  },
  {
    name: 'Safety Shoes/Boots',
    icon: '🥾',
    image: '/images/ppe-thumbs/safety-shoes.webp',
    essential: true,
    pair: true,
    bn: 'সেফটি জুতো/বুট',
    tip: {
      en: 'Prevents electric shock through feet — count as pairs.',
      bn: 'পায়ের মাধ্যমে শক প্রতিরোধ — জোড়া হিসেবে গুনুন।',
    },
    zone: { x: 48, y: 87, side: 'center' },
  },
  {
    name: 'Discharge Rod',
    icon: '🦯',
    image: '/images/ppe-thumbs/discharge-rod.webp',
    essential: true,
    pair: false,
    bn: 'ডিসচার্জ রড',
    tip: {
      en: 'Safely discharges stored electrical energy',
      bn: 'সঞ্চিত বৈদ্যুতিক শক্তি নিরাপদে ডিসচার্জ করে',
    },
    zone: { x: 11, y: 38, side: 'left' },
  },
  {
    name: 'Gum Boot',
    icon: '👢',
    image: '/images/ppe-thumbs/gum-boot.webp',
    essential: true,
    pair: true,
    bn: 'গামবুট',
    tip: {
      en: 'Waterproof boots for wet / muddy sites — count as pairs.',
      bn: 'ভেজা/কাদা এলাকার জন্য — জোড়া হিসেবে গুনুন।',
    },
    zone: { x: 62, y: 90, side: 'right' },
  },
  {
    name: 'Voltage Detector',
    icon: '🔌',
    image: '/images/ppe-thumbs/voltage-detector.webp',
    essential: true,
    pair: false,
    bn: 'ভোল্টেজ ডিটেক্টর',
    tip: {
      en: 'Detects live current before you touch',
      bn: 'স্পর্শ করার আগে লাইভ কারেন্ট সনাক্ত করে',
    },
    zone: { x: 87, y: 45, side: 'right' },
  },
  // ——— Others (non-essential) ———
  {
    name: 'Safety Goggles',
    icon: '🥽',
    image: '/images/ppe-thumbs/safety-goggles.webp',
    essential: false,
    pair: false,
    bn: 'সেফটি গগলস',
    tip: {
      en: 'Protects eyes from sparks and debris',
      bn: 'স্পার্ক ও ধ্বংসাবশেষ থেকে চোখ রক্ষা করে',
    },
    zone: { x: 47, y: 15, side: 'center' },
  },
  {
    name: 'Reflective Jacket',
    icon: '🦺',
    image: '/images/ppe-thumbs/reflective-jacket.webp',
    essential: false,
    pair: false,
    bn: 'রিফ্লেক্টিভ জ্যাকেট',
    tip: {
      en: 'Makes you visible in dark and traffic',
      bn: 'অন্ধকারে ও ট্রাফিকে দৃশ্যমান রাখে',
    },
    zone: { x: 47, y: 33, side: 'center' },
  },
  {
    name: 'Safety Belt',
    icon: '🧗',
    image: '/images/ppe-thumbs/safety-belt.webp',
    essential: false,
    pair: false,
    bn: 'সেফটি বেল্ট',
    tip: {
      en: 'Waist support belt for pole work positioning',
      bn: 'পোল কাজে কোমর সাপোর্ট / পজিশনিং বেল্ট',
    },
    zone: { x: 36, y: 50, side: 'center' },
  },
  {
    name: 'Raincoat',
    icon: '🧥',
    image: '/images/ppe-thumbs/raincoat.webp',
    essential: false,
    pair: false,
    bn: 'রেইনকোট',
    tip: {
      en: 'Stay dry during monsoon work',
      bn: 'বর্ষায় কাজের সময় শুকনো থাকুন',
    },
    zone: { x: 26, y: 64, side: 'left' },
  },
  {
    name: 'Torch/Emergency Light',
    icon: '🔦',
    image: '/images/ppe-thumbs/torch.webp',
    essential: false,
    pair: false,
    bn: 'টর্চ/জরুরী আলো',
    tip: {
      en: 'Useful for night emergency work',
      bn: 'রাতের জরুরি কাজের জন্য দরকারি',
    },
    zone: { x: 12, y: 70, side: 'left' },
  },
];

export const ESSENTIAL_PPE_ITEMS = PPE_ITEMS.filter((i) => i.essential);
export const OTHER_PPE_ITEMS = PPE_ITEMS.filter((i) => !i.essential);
/** Figure / core gear = essentials (same set). */
export const CORE_PPE_ITEMS = ESSENTIAL_PPE_ITEMS;

/** Progressive nudge order: essentials first, then others. */
export const PPE_NUDGE_ITEM_ORDER = [
  ...ESSENTIAL_PPE_ITEMS.map((i) => i.name),
  ...OTHER_PPE_ITEMS.map((i) => i.name),
];

export function getPpeItem(name) {
  return PPE_ITEMS.find((i) => i.name === name) || null;
}

export function isPpePairItem(name) {
  return !!getPpeItem(name)?.pair;
}

export const CONDITIONS = [
  { value: 'Good', en: 'Good', bn: 'ভালো', color: 'bg-emerald-500', ring: '#22c55e' },
  { value: 'Fair', en: 'Fair', bn: 'মোটামুটি', color: 'bg-amber-500', ring: '#f59e0b' },
  { value: 'Poor', en: 'Poor', bn: 'খারাপ', color: 'bg-red-500', ring: '#ef4444' },
  { value: 'Expired', en: 'Expired', bn: 'মেয়াদোত্তীর্ণ', color: 'bg-slate-500', ring: '#64748b' },
];

export const AGE_OPTIONS = [
  { value: 3, en: '< 6 mo', bn: '৬ মাসের কম' },
  { value: 9, en: '6–12 mo', bn: '৬–১২ মাস' },
  { value: 18, en: '1–2 yr', bn: '১–২ বছর' },
  { value: 36, en: '> 2 yr', bn: '২ বছর+' },
];

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
      usage: usage === 'Shared' ? 'Shared' : 'Personal',
      updated_at: existing?.updated_at || existing?.created_at || null,
    };
  });
}

export function getPPEStatusColor(answer) {
  if (!answer?.available) return '#94a3b8';
  const cond = CONDITIONS.find((c) => c.value === answer.condition);
  return cond?.ring || '#22c55e';
}
