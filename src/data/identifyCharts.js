/**
 * In-app Identify chart pages — structured Bangla content (not poster images).
 * Keys match SAFETY_LIBRARY_ITEMS id for category Charts.
 */

/** @typedef {'howto'|'compare'|'table'|'cards'|'sections'} ChartKind */

/**
 * @type {Record<string, {
 *   kind: ChartKind,
 *   kicker?: string,
 *   intro?: string,
 *   tip?: string,
 *   warning?: string,
 *   steps?: { title: string, ok?: string, bad?: string }[],
 *   compare?: { wrong: { title: string, points: string[] }, right: { title: string, points: string[] } },
 *   tables?: { title?: string, headers: string[], rows: string[][], note?: string }[],
 *   cards?: { title: string, points: string[] }[],
 *   sections?: { title: string, tone?: 'ok'|'bad'|'neutral', points: string[] }[],
 *   flow?: string[],
 * }>}
 */
export const IDENTIFY_CHART_PAGES = {
  'Charts:হেলমেট কিভাবে পড়তে হয়': {
    kind: 'howto',
    kicker: 'ঠিক ফিট = নিরাপদ কাজ',
    intro: 'হেলমেট সোজা, পিছন টাইট, চিন স্ট্র্যাপ লক — এই তিনটা না থাকলে সুরক্ষা নেই।',
    tip: 'ঢিলা হেলমেট = সুরক্ষা নেই।',
    warning: 'ফাটা শেল বা ভাঙা জালি দিয়ে কাজ করবেন না।',
    steps: [
      { title: 'আগে চেক', ok: 'ফাটল নেই, স্ট্র্যাপ ঠিক, ভেতর পরিষ্কার।', bad: 'ফাটা শেল পরবেন না।' },
      { title: 'মাথায় বসান', ok: 'সোজা বসান।', bad: 'একদিকে হেলানো নয়।' },
      { title: 'পিছনের অ্যাডজাস্ট', ok: 'নব ঘুরিয়ে টাইট করুন।', bad: 'ঢিলা রাখবেন না।' },
      { title: 'চিন স্ট্র্যাপ লক', ok: 'স্ট্র্যাপ বাকল বন্ধ।', bad: 'খোলা স্ট্র্যাপ নয়।' },
      { title: 'ফিট চেক', ok: 'মাথা নাড়ালে নড়ে না।', bad: 'নড়লে আবার টাইট করুন।' },
    ],
  },

  'Charts:কোমর রশা vs হারনেস': {
    kind: 'compare',
    kicker: 'মিথ বনাম বাস্তবতা',
    intro: 'কোমর রশা শুধু হেলান দিয়ে দাঁড়ানোর জন্য। পড়ে গেলে প্রাণ বাঁচায় ফুল বডি হারনেস।',
    tip: 'পোলে ওঠার আগে কাঁধ, বুক, কোমর, উরু — চার জায়গায় হারনেস আটকান।',
    warning: 'শুধু কোমরের বেল্টে ভরসা করবেন না।',
    compare: {
      wrong: {
        title: 'কোমর রশা — ভুল',
        points: [
          'পড়ে গেলে কোমরে চাপ পড়ে',
          'মেরুদণ্ড ভাঙার ঝুঁকি',
          'পতন সুরক্ষা নয় — শুধু হেলান',
        ],
      },
      right: {
        title: 'ফুল বডি হারনেস — সঠিক',
        points: [
          'কাঁধে স্ট্র্যাপ',
          'বুকে বেল্ট লক',
          'কোমরে প্যাড',
          'পায়ের লুপ টাইট',
        ],
      },
    },
  },

  'Charts:ডিটিআর ফিউজ রেটিং চার্ট': {
    kind: 'table',
    kicker: 'সঠিক ফিউজ = সঠিক সুরক্ষা',
    intro: '১১ কেভি হর্ন গ্যাপ আর এলটি কাটআউটে কোন SWG লাগবে — kVA দেখে মেলান।',
    tip: 'kVA বাড়লে ফিউজ মোটা হয়। পাতলা ফিউজ বড় ডিটিআরে বারবার কাটে; মোটা ফিউজ ছোট ডিটিআরে সুরক্ষা দেয় না।',
    warning: 'ভুল ফিউজ = ট্রান্সফরমার ক্ষতি। অ্যালুমিনিয়াম বা জিআই জুগাড় নয়।',
    tables: [
      {
        title: 'ডিটিআর ফিউজ (SWG)',
        headers: ['ট্রান্সফরমার', 'HT ফিউজ', 'LT ফিউজ'],
        rows: [
          ['10 kVA', '38', '24'],
          ['16 kVA', '38', '22'],
          ['25 kVA', '36', '20'],
          ['63 kVA', '34', '16'],
          ['100 kVA', '32', '14'],
          ['160 kVA', '30', '12'],
          ['250 kVA', '28', '10'],
        ],
      },
    ],
    flow: ['ফল্ট হয়', 'ফিউজ আগে কাটে', 'ডিটিআর বাঁচে'],
  },

  'Charts:ট্রান্সফরমার কারেন্ট রেটিং চার্ট': {
    kind: 'table',
    kicker: 'মাথায় হিসাব করুন',
    intro: 'HT ≈ kVA ÷ 12.5 · LT ≈ 1.4 × kVA — আগে হিসাব, পরে ফিউজ।',
    tip: 'HT সহজ: ÷10 করে একটু কমান। LT সহজ: kVA + অর্ধেক (≈1.5)।',
    warning: 'ভুল হিসাব = ভুল ফিউজ = ট্রিপ বা ক্ষতি।',
    tables: [
      {
        title: 'আনুমানিক কারেন্ট (Amp)',
        headers: ['kVA', 'LT Amp', 'HT Amp'],
        rows: [
          ['10', '14', '0.8'],
          ['16', '22', '1.3'],
          ['25', '35', '2'],
          ['63', '88', '5'],
          ['100', '140', '8'],
          ['160', '224', '12.8'],
          ['250', '350', '20'],
        ],
        note: 'লোড বেশি = গরম।',
      },
    ],
    flow: ['kVA দেখুন', 'মাথায় হিসাব', 'সঠিক ফিউজ', 'নিরাপদ কাজ'],
  },

  'Charts:নিরাপদ দূরত্বের চার্ট': {
    kind: 'sections',
    kicker: 'সবার আগে নিরাপত্তা',
    intro: 'রাস্তা, বাড়ি, লাইভ পার্ট থেকে ন্যূনতম দূরত্ব — আন্দাজ নয়।',
    warning: 'মাপ কম হলে কাজ বন্ধ করুন।',
    sections: [
      {
        title: '১. রাস্তা থেকে তারের উচ্চতা',
        tone: 'neutral',
        points: [
          'LT সড়কের পাশে — ৫.৫ মি (১৮ ফুট)',
          'LT সড়ক ক্রস — ৫.৮ মি (১৯ ফুট)',
          '১১ কেভি পাশে — ৫.৮ মি · ক্রস — ৬.১ মি',
          '৩৩ কেভি পাশে — ৫.৮ মি · ক্রস — ৬.১ মি',
        ],
      },
      {
        title: '২. বিল্ডিং থেকে (LT ও ১১ কেভি)',
        tone: 'ok',
        points: [
          'উপর থেকে — ২.৫ মি (৮ ফুট)',
          'পাশ থেকে — ১.২ মি (৪ ফুট)',
        ],
      },
      {
        title: '৩. লাইভ পার্ট থেকে কাজের দূরত্ব',
        tone: 'bad',
        points: [
          '১১ কেভি — ২.৬ মি (৮.৫ ফুট)',
          '৩৩ কেভি — ২.৮ মি (৯.২ ফুট)',
        ],
      },
    ],
  },

  'Charts:মই-এর ভাল মন্দ': {
    kind: 'sections',
    kicker: 'বাঁশ / FRP — নিয়ম মানা',
    intro: 'মই বাছুন, কোণ মেলান, বেঁধে নিন — তারপর উঠুন।',
    tip: '১:৪ নিয়ম — ৪ মি উচ্চতায় পা ১ মি দূরে।',
    warning: 'নিয়ম না মানলে মৃত্যু ঝুঁকি। লাইভ লাইনে মই নয়।',
    sections: [
      {
        title: 'মই নির্বাচন',
        tone: 'ok',
        points: [
          'FRP সবচেয়ে নিরাপদ',
          'শুকনো মজবুত বাঁশ চলবে',
          'ভেজা বা ফাটা বাঁশ নিষেধ',
        ],
      },
      {
        title: 'বসানো ও বাঁধা',
        tone: 'neutral',
        points: [
          'সঠিক কোণ (~৭৫°)',
          'উপর ও নিচ বেঁধে নিন',
          'শুকনো শক্ত মাটি — কাদায় নয়',
        ],
      },
      {
        title: 'ওঠানামার নিয়ম',
        tone: 'bad',
        points: [
          'একজনই উঠবে',
          'হাতে ভারী জিনিস নয় — টুল বেল্টে',
          'বৃষ্টি বা বজ্রপাতে কাজ নয়',
        ],
      },
    ],
  },

  'Charts:মই ব্যবহারের ৩-পয়েন্ট নিয়ম': {
    kind: 'compare',
    kicker: 'সবসময় ৩টি পয়েন্ট ধরে থাকুন',
    intro: '২ হাত + ১ পা, অথবা ২ পা + ১ হাত। শুধু দুই পয়েন্টে পড়ে যাওয়ার ঝুঁকি বেশি।',
    tip: 'হাতে টুল নিয়ে উঠবেন না — হাত ফাঁকা রাখুন।',
    warning: '৩ পয়েন্ট না মানলে পড়ে যাওয়ার ঝুঁকি।',
    compare: {
      wrong: {
        title: 'বিপদ — ২ পয়েন্ট',
        points: [
          'এক হাত খালি বা দূরে',
          'ভারসাম্য নষ্ট',
          'পড়ে যাওয়ার ঝুঁকি বেশি',
        ],
      },
      right: {
        title: 'নিরাপদ — ৩ পয়েন্ট',
        points: [
          'দুই হাত + এক পা',
          'অথবা দুই পা + এক হাত',
          'ধীরে উঠুন, ধরে থাকুন',
        ],
      },
    },
    flow: ['ধরে উঠুন', 'ধীরে উঠুন', '৩ পয়েন্ট রাখুন'],
  },

  'Charts:ফুল বডি হারনেস কিভাবে পড়তে হয়': {
    kind: 'howto',
    kicker: 'সঠিক ফিট = নিরাপদ কাজ',
    intro: 'ধাপে ধাপে পরুন। শেষে সব বেল্ট লক আর টান চেক করে তারপর উঠুন।',
    tip: '২ আঙুল নিয়ম — স্ট্র্যাপ ও শরীরের মাঝে দুই আঙুল ঢোকে।',
    warning: 'হারনেস ছাড়া ওঠা মানে ঝুঁকি।',
    steps: [
      { title: 'ধরুন ও চেক', ok: 'কাঁধের স্ট্র্যাপ ধরে তুলুন।', bad: 'কাটা বা ছিঁড়া ফিতে বাতিল।' },
      { title: 'কাঁধে পরুন', ok: 'জট ছাড়া স্ট্র্যাপ বসান।', bad: 'পিঠে জট নয়।' },
      { title: 'পায়ের স্ট্র্যাপ', ok: 'উরুতে টাইট লক।', bad: 'ঢিলা ঝোলানো নয়।' },
      { title: 'বুকের বেল্ট', ok: 'বুকের মাঝে লক।', bad: 'গলায় উঁচু নয়।' },
      { title: 'ডি-রিং', ok: 'পিঠে কাঁধের মাঝে।', bad: 'খুব উপরে বা নিচে নয়।' },
      { title: 'সব টাইট', ok: '২ আঙুল নিয়ম।', bad: 'ঢিলা বুক/কোমর নয়।' },
      { title: 'ল্যানিয়ার্ড', ok: 'ডি-রিংয়ে লক করুন।', bad: 'গেট খোলা রাখবেন না।' },
      { title: 'অ্যাঙ্কর', ok: 'কোমরের উপরে মজবুত জায়গা।', bad: 'দুর্বল ব্র্যাকেট নয়।' },
    ],
  },

  'Charts:পিপিই কবে বদলাবেন': {
    kind: 'table',
    kicker: 'তারিখের আগেও বদলাতে পারে',
    intro: 'নিয়মিত সময়সীমা — ক্ষতি দেখলে তারিখের অপেক্ষা নয়।',
    tip: 'লেবেল আর স্ট্যাম্প দেখুন।',
    warning: 'ফাটল, ফুটো বা ফল-অ্যারেস্ট হলে তখনই বাতিল।',
    tables: [
      {
        title: 'বদলানোর সময়',
        headers: ['পিপিই', 'সময়'],
        rows: [
          ['হেলমেট শেল', '~৫ বছর'],
          ['জালি / সাসপেনশন', '~১ বছর'],
          ['রাবার গ্লাভস', '~৬ মাস রিটেস্ট'],
          ['সেফটি জুতো', '৬–১২ মাস'],
          ['হারনেস', '~৫ বছর'],
        ],
        note: 'ক্ষতি দেখলে আগেই বদলান।',
      },
    ],
  },

  'Charts:ACSR কারেন্ট বহন ক্ষমতা': {
    kind: 'table',
    kicker: 'নাম শুধু মনে রাখার জন্য',
    intro: 'এই কারেন্ট রেটিং LT, ১১ কেভি, ৩৩ কেভি — সব ভোল্টেজে একই ধরনের রেফারেন্স।',
    tip: 'ছোট প্রাণী = ছোট সাইজ = কম কারেন্ট। বড় প্রাণী = বেশি কারেন্ট।',
    warning: 'প্রযুক্তিগত কাজে সঠিক সাইজ ও রেটিং মেলান — শুধু নামে ভরসা নয়।',
    tables: [
      {
        title: 'ACSR সাইজ ও সর্বোচ্চ কারেন্ট',
        headers: ['নাম', 'সাইজ', 'কারেন্ট'],
        rows: [
          ['Weasel', '৩০–৩৪ mm²', '১৪০ A'],
          ['Rabbit', '৫০–৫৫ mm²', '১৮০ A'],
          ['Raccoon', '৮০ mm²', '২৩০ A'],
          ['Dog', '১০০ mm²', '২৬০ A'],
          ['Wolf', '১৫০ mm²', '৩২০ A'],
          ['Panther', '২০০ mm²', '৪০০ A'],
        ],
      },
    ],
  },

  'Charts:কিছু পরিচিত তার ও কেবিলের ব্যবহার': {
    kind: 'cards',
    kicker: 'সঠিক তার = নিরাপদ সাপ্লাই',
    intro: 'ভোল্টেজ ≠ তারের টাইপ। জায়গা + কাজ দেখে তার বাছুন।',
    tip: 'খোলা মাঠে ACSR · ঘন এলাকায় AB · মাটির নিচে XLPE।',
    warning: 'ভুল নির্বাচন = দুর্ঘটনা।',
    cards: [
      { title: 'ACSR', points: ['খোলা তার', '১১/৩৩ কেভি ফিডার', 'লম্বা স্প্যান'] },
      { title: 'AAAC', points: ['ACSR বিকল্প', 'কম মরিচা', 'উপকূলীয় এলাকা'] },
      { title: 'এবি কেবল', points: ['ইনসুলেটেড', 'এলটি', 'ঘন বসতি / গাছ'] },
      { title: 'LT PVC / XLPE', points: ['এলটি', 'আন্ডারগ্রাউন্ড', 'শহর'] },
      { title: 'সার্ভিস কেবল', points: ['বাড়ির লাইন', '১/৩ ফেজ', 'শেষ সংযোগ'] },
      { title: 'HT XLPE', points: ['১১/৩৩ কেভি', 'আন্ডারগ্রাউন্ড', 'ইন্ডাস্ট্রিয়াল'] },
    ],
    flow: ['সাবস্টেশন', 'ফিডার', 'পোল', 'এলটি', 'সার্ভিস', 'বাড়ি'],
  },

  'Charts:আপনার সেফিটি গ্লাভস চিনুন': {
    kind: 'sections',
    kicker: 'ভোল্টেজ অনুযায়ী গ্লাভস বাছুন',
    intro: 'ক্লাস নম্বর, টেস্ট তারিখ, IS মার্কিং — কাফে লেখা দেখে নিন।',
    tip: 'ভোল্টেজ বাড়লে ক্লাস বাড়ে। পরার আগে এয়ার টেস্ট করুন।',
    warning: 'ভুল ক্লাস = প্রাণঘাতী। কাপড় বা ভেজা গ্লাভস লাইভ লাইনে নয়।',
    sections: [
      {
        title: 'ক্লাস মেলান',
        tone: 'ok',
        points: [
          'ক্লাস ২ ≈ ১১ কেভি',
          'ক্লাস ৩ ≈ ৩৩ কেভি',
          'ক্লাস ৪ = সর্বোচ্চ (৬৬ কেভি+)',
        ],
      },
      {
        title: 'ব্যবহারের আগে',
        tone: 'neutral',
        points: [
          'চোখে ফাটল দেখুন',
          'এয়ার টেস্ট — লিক নেই',
          'শুকনো ও পরিষ্কার',
          'ভাঁজ করে রাখবেন না',
        ],
      },
      {
        title: 'ভুল = বিপদ',
        tone: 'bad',
        points: [
          'ভুল ক্লাস',
          'কাপড়ের গ্লাভস',
          'ভেজা গ্লাভস',
          'টেস্ট না করা গ্লাভস',
        ],
      },
    ],
  },

  'Charts:ডিসচার্জ রডের সঠিক ব্যবহার': {
    kind: 'howto',
    kicker: 'রড আর্থ ≠ লাইনের আর্থিং',
    intro: 'রড শুধু চার্জ নামায়। কাজের সুরক্ষা দেয় লাইনের স্থায়ী আর্থিং।',
    tip: 'মনে রাখুন: রড আর্থ → ডিসচার্জ → লাইন আর্থিং → তারপর কাজ।',
    warning: 'রড দিয়েই কাজ শুরু = মৃত্যু ঝুঁকি। রড সুরক্ষা দেয় না।',
    steps: [
      { title: 'লাইন বন্ধ', ok: 'লোটো দিয়ে লাইন অফ নিশ্চিত।' },
      { title: 'রডকে আগে আর্থ', ok: 'স্পাইকে রড আর্থ লাগান।', bad: 'এটা লাইনের আর্থিং নয়।' },
      { title: 'লাইন ছোঁয়ান', ok: 'ধীরে ছোঁয়ান, দূরত্ব রাখুন।' },
      { title: 'চার্জ বের করুন', ok: 'কয়েক সেকেন্ড ধরে রাখুন।' },
      { title: 'লাইনে আর্থিং', ok: 'স্থায়ী আর্থিং লাগান — তারপর কাজ।', bad: 'শুধু রডে কাজ নয়।' },
    ],
    flow: ['রড আর্থ', 'ডিসচার্জ', 'লাইন আর্থিং', 'কাজ'],
  },

  'Charts:DTR স্মার্ট চার্ট': {
    kind: 'table',
    kicker: 'kVA → কারেন্ট → ফিউজ → তার',
    intro: 'HT ≈ ÷ 12.5 · LT ≈ × 1.4 — এক ছকে ডিটিআর বাছাই।',
    tip: 'Amp দেখে ফিউজ · লোড দেখে তার।',
    warning: 'ভুল ফিউজ, ভুল তার বা ভুল হিসাব = বড় ক্ষতি।',
    tables: [
      {
        title: 'ডিটিআর স্মার্ট ছক',
        headers: ['kVA', 'LT A', 'HT A', 'LT ফিউজ', 'HT ফিউজ', 'তার'],
        rows: [
          ['10', '14', '1', '24', '38', 'Weasel'],
          ['16', '22', '1', '22', '38', 'Weasel'],
          ['25', '35', '2', '20', '36', 'Rabbit'],
          ['63', '88', '5', '16', '34', 'Raccoon'],
          ['100', '140', '8', '14', '32', 'Dog'],
          ['160', '224', '13', '12', '30', 'Wolf'],
          ['250', '350', '20', '10', '28', 'Panther'],
        ],
        note: 'লোড বেশি = গরম।',
      },
    ],
    flow: ['kVA', 'Amp', 'ফিউজ', 'তার'],
  },
};

export function getIdentifyChartPage(itemId) {
  if (!itemId) return null;
  return IDENTIFY_CHART_PAGES[itemId] || null;
}

export function hasIdentifyChartPage(itemId) {
  return Boolean(getIdentifyChartPage(itemId));
}

function relatedProductIds(chartId, catalogItems, byId) {
  const ids = [];
  const seen = new Set();
  const push = (id) => {
    if (!id || seen.has(id) || id === chartId) return;
    const item = byId.get(id);
    if (!item || item.category === 'Charts') return;
    seen.add(id);
    ids.push(id);
  };
  const chart = byId.get(chartId);
  for (const rel of chart?.related_items || []) push(rel.id);
  for (const item of catalogItems) {
    if (item.related_items?.some((rel) => rel.id === chartId)) push(item.id);
  }
  return ids;
}

/** Unique photo per chart, only from that chart's related library items. */
export function buildChartCardImages(catalogItems = []) {
  const byId = new Map(catalogItems.map((item) => [item.id, item]));
  const used = new Set();
  const out = {};
  const chartIds = [
    ...Object.keys(IDENTIFY_CHART_PAGES),
    ...catalogItems.filter((item) => item.category === 'Charts').map((item) => item.id),
  ].filter((id, i, all) => all.indexOf(id) === i);

  for (const chartId of chartIds) {
    let pick = null;
    for (const productId of relatedProductIds(chartId, catalogItems, byId)) {
      for (const img of byId.get(productId)?.images || []) {
        if (img && !used.has(img)) {
          pick = img;
          used.add(img);
          break;
        }
      }
      if (pick) break;
    }
    out[chartId] = pick;
  }
  return out;
}

export function getChartRelatedImage(chartId, catalogItems = []) {
  if (!chartId) return null;
  return buildChartCardImages(catalogItems)[chartId] || null;
}
