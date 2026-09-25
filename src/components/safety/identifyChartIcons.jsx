import React from 'react';

/** Shared SVG icons for Identify charts — topic + UI glyphs. */
export function ChartIcon({ children, className = 'h-5 w-5' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            {children}
        </svg>
    );
}

export const UiIcons = {
    spark: (p) => (
        <ChartIcon {...p}>
            <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
        </ChartIcon>
    ),
    check: (p) => (
        <ChartIcon {...p}>
            <path d="M5 13l4 4L19 7" />
        </ChartIcon>
    ),
    x: (p) => (
        <ChartIcon {...p}>
            <path d="M6 6l12 12M18 6L6 18" />
        </ChartIcon>
    ),
    tip: (p) => (
        <ChartIcon {...p}>
            <path d="M12 3a6 6 0 00-4 10c.6.6 1 1.4 1 2.2V17h6v-1.8c0-.8.4-1.6 1-2.2A6 6 0 0012 3z" />
            <path d="M10 21h4" />
        </ChartIcon>
    ),
    warn: (p) => (
        <ChartIcon {...p}>
            <path d="M12 9v4m0 4h.01" />
            <path d="M10.3 4.3L2.8 17a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z" />
        </ChartIcon>
    ),
    list: (p) => (
        <ChartIcon {...p}>
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </ChartIcon>
    ),
    table: (p) => (
        <ChartIcon {...p}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 10h18M3 16h18M9 4v16M15 4v16" />
        </ChartIcon>
    ),
    flow: (p) => (
        <ChartIcon {...p}>
            <path d="M5 12h14M13 6l6 6-6 6" />
        </ChartIcon>
    ),
    book: (p) => (
        <ChartIcon {...p}>
            <path d="M4 5a2 2 0 012-2h11v18H6a2 2 0 01-2-2V5z" />
            <path d="M8 7h7M8 11h7M8 15h5" />
        </ChartIcon>
    ),
    shield: (p) => (
        <ChartIcon {...p}>
            <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
        </ChartIcon>
    ),
    cards: (p) => (
        <ChartIcon {...p}>
            <rect x="3" y="5" width="7" height="14" rx="1.5" />
            <rect x="14" y="5" width="7" height="14" rx="1.5" />
        </ChartIcon>
    ),
    compare: (p) => (
        <ChartIcon {...p}>
            <path d="M8 7H4v10h4M16 7h4v10h-4M10 12h4" />
        </ChartIcon>
    ),
    zap: (p) => (
        <ChartIcon {...p}>
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </ChartIcon>
    ),
    ruler: (p) => (
        <ChartIcon {...p}>
            <path d="M4 20L20 4" />
            <path d="M14 4l2 2M11 7l2 2M8 10l2 2M5 13l2 2" />
        </ChartIcon>
    ),
    calendar: (p) => (
        <ChartIcon {...p}>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 11h18" />
        </ChartIcon>
    ),
    eye: (p) => (
        <ChartIcon {...p}>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
        </ChartIcon>
    ),
    lock: (p) => (
        <ChartIcon {...p}>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 018 0v3" />
        </ChartIcon>
    ),
    hand: (p) => (
        <ChartIcon {...p}>
            <path d="M8 13V6.5a1.5 1.5 0 013 0V12" />
            <path d="M11 11.5V5.5a1.5 1.5 0 013 0V12" />
            <path d="M14 11V7a1.5 1.5 0 013 0v7c0 3.5-2.5 5.5-6 5.5H10c-2.5 0-4-1.5-4-4v-3.5a1.5 1.5 0 013 0V13" />
        </ChartIcon>
    ),
    foot: (p) => (
        <ChartIcon {...p}>
            <path d="M6 14c0-2 1.5-4 4-4h2c2 0 3 1 4 2.5L18 16" />
            <path d="M5 18h10c1.5 0 2.5-1 2.5-2.5" />
        </ChartIcon>
    ),
    search: (p) => (
        <ChartIcon {...p}>
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-3.5-3.5" />
        </ChartIcon>
    ),
    head: (p) => (
        <ChartIcon {...p}>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M6 20c1.5-3 4-4.5 6-4.5S16.5 17 18 20" />
        </ChartIcon>
    ),
    adjust: (p) => (
        <ChartIcon {...p}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </ChartIcon>
    ),
    strap: (p) => (
        <ChartIcon {...p}>
            <path d="M7 8h10M7 12h10M7 16h10" />
            <path d="M5 8v8M19 8v8" />
        </ChartIcon>
    ),
    shake: (p) => (
        <ChartIcon {...p}>
            <path d="M8 7v10M12 5v14M16 7v10" />
        </ChartIcon>
    ),
    shoulder: (p) => (
        <ChartIcon {...p}>
            <path d="M4 18c2-4 4-6 8-6s6 2 8 6" />
            <circle cx="12" cy="8" r="3" />
        </ChartIcon>
    ),
    chest: (p) => (
        <ChartIcon {...p}>
            <path d="M8 6h8v12H8z" />
            <path d="M8 11h8" />
        </ChartIcon>
    ),
    leg: (p) => (
        <ChartIcon {...p}>
            <path d="M9 4v8l-2 8M15 4v8l2 8" />
            <path d="M9 12h6" />
        </ChartIcon>
    ),
    ring: (p) => (
        <ChartIcon {...p}>
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2.5" />
        </ChartIcon>
    ),
    anchor: (p) => (
        <ChartIcon {...p}>
            <circle cx="12" cy="6" r="2" />
            <path d="M12 8v10M8 14c0 3 2 5 4 5s4-2 4-5M6 18h12" />
        </ChartIcon>
    ),
    pick: (p) => (
        <ChartIcon {...p}>
            <path d="M12 3l3 6H9l3-6z" />
            <path d="M8 11h8v8H8z" />
        </ChartIcon>
    ),
    place: (p) => (
        <ChartIcon {...p}>
            <path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
        </ChartIcon>
    ),
    climb: (p) => (
        <ChartIcon {...p}>
            <path d="M6 20V4M18 20V4M6 8h12M6 12h12M6 16h12" />
        </ChartIcon>
    ),
    powerOff: (p) => (
        <ChartIcon {...p}>
            <path d="M12 3v8" />
            <path d="M7.5 6.5a7 7 0 109 0" />
        </ChartIcon>
    ),
    ground: (p) => (
        <ChartIcon {...p}>
            <path d="M12 3v10" />
            <path d="M8 13h8M9.5 16h5M11 19h2" />
        </ChartIcon>
    ),
    touch: (p) => (
        <ChartIcon {...p}>
            <path d="M8 14V8a2 2 0 014 0v8" />
            <path d="M12 12v-1a2 2 0 014 0v5a5 5 0 01-5 5H9a4 4 0 01-4-4v-3a2 2 0 014 0v2" />
        </ChartIcon>
    ),
    wait: (p) => (
        <ChartIcon {...p}>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l2.5 2.5" />
        </ChartIcon>
    ),
    cable: (p) => (
        <ChartIcon {...p}>
            <path d="M4 8c3 0 3 8 6 8s3-8 6-8 3 8 4 8" />
        </ChartIcon>
    ),
    abCable: (p) => (
        <ChartIcon {...p}>
            <path d="M5 7h14M5 12h14M5 17h14" />
            <path d="M8 7v10M16 7v10" />
        </ChartIcon>
    ),
    buried: (p) => (
        <ChartIcon {...p}>
            <path d="M3 16h18" />
            <path d="M6 16V9l3-3 3 3 3-2 3 2v7" />
        </ChartIcon>
    ),
    home: (p) => (
        <ChartIcon {...p}>
            <path d="M4 11l8-7 8 7" />
            <path d="M6 10v10h12V10" />
        </ChartIcon>
    ),
    industry: (p) => (
        <ChartIcon {...p}>
            <path d="M3 21h18" />
            <path d="M5 21V10l5 3V10l5 3V7h4v14" />
        </ChartIcon>
    ),
    glove: (p) => (
        <ChartIcon {...p}>
            <path d="M8 11V6.5a1.5 1.5 0 013 0V10" />
            <path d="M11 10V5.5a1.5 1.5 0 013 0V10" />
            <path d="M14 10V7a1.5 1.5 0 013 0v6c0 3-2 5-5 5H10c-2.2 0-4-1.8-4-4v-3a1.5 1.5 0 013 0V11" />
        </ChartIcon>
    ),
    helmet: (p) => (
        <ChartIcon {...p}>
            <path d="M4 14c0-4.5 3.5-8 8-8s8 3.5 8 8" />
            <path d="M3 14h18" />
            <path d="M8 14v2a2 2 0 002 2h4a2 2 0 002-2v-2" />
        </ChartIcon>
    ),
    harness: (p) => (
        <ChartIcon {...p}>
            <circle cx="12" cy="5" r="2" />
            <path d="M8 8l4 2 4-2M8 8v5l4 3 4-3V8M10 20l2-4 2 4" />
        </ChartIcon>
    ),
    belt: (p) => (
        <ChartIcon {...p}>
            <path d="M3 12h18" />
            <rect x="9" y="9" width="6" height="6" rx="1" />
        </ChartIcon>
    ),
    fuse: (p) => (
        <ChartIcon {...p}>
            <rect x="9" y="3" width="6" height="18" rx="2" />
            <path d="M11 8h2M11 12h2M11 16h2" />
        </ChartIcon>
    ),
    transformer: (p) => (
        <ChartIcon {...p}>
            <circle cx="8" cy="12" r="4" />
            <circle cx="16" cy="12" r="4" />
            <path d="M8 6V4M8 20v-2M16 6V4M16 20v-2" />
        </ChartIcon>
    ),
    ladder: (p) => (
        <ChartIcon {...p}>
            <path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10" />
        </ChartIcon>
    ),
    points3: (p) => (
        <ChartIcon {...p}>
            <circle cx="7" cy="8" r="2.2" />
            <circle cx="17" cy="8" r="2.2" />
            <circle cx="12" cy="17" r="2.2" />
            <path d="M8.5 9.5L11 15M15.5 9.5L13 15" />
        </ChartIcon>
    ),
    rod: (p) => (
        <ChartIcon {...p}>
            <path d="M12 3v12" />
            <path d="M9 15h6l-1 6H10l-1-6z" />
            <path d="M8 7h8" />
        </ChartIcon>
    ),
    smart: (p) => (
        <ChartIcon {...p}>
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <path d="M8 9h8M8 13h5M8 17h3" />
        </ChartIcon>
    ),
    building: (p) => (
        <ChartIcon {...p}>
            <path d="M4 21V7l8-4 8 4v14" />
            <path d="M9 21v-6h6v6" />
            <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
        </ChartIcon>
    ),
    road: (p) => (
        <ChartIcon {...p}>
            <path d="M6 21l3-18M18 21l-3-18" />
            <path d="M12 5v3M12 11v3M12 17v2" />
        </ChartIcon>
    ),
    live: (p) => (
        <ChartIcon {...p}>
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </ChartIcon>
    ),
    air: (p) => (
        <ChartIcon {...p}>
            <path d="M4 10h10a3 3 0 010 6H9" />
            <path d="M4 6h12a2.5 2.5 0 010 5" />
            <path d="M4 18h7a2 2 0 000-4" />
        </ChartIcon>
    ),
    dry: (p) => (
        <ChartIcon {...p}>
            <path d="M12 3c-2 4-5 6.5-5 10a5 5 0 0010 0c0-3.5-3-6-5-10z" />
        </ChartIcon>
    ),
    fold: (p) => (
        <ChartIcon {...p}>
            <path d="M6 4h8l4 4v12H6z" />
            <path d="M14 4v4h4" />
        </ChartIcon>
    ),
    cloth: (p) => (
        <ChartIcon {...p}>
            <path d="M8 6l4-2 4 2v4l2 10H6l2-10V6z" />
        </ChartIcon>
    ),
    wet: (p) => (
        <ChartIcon {...p}>
            <path d="M12 3c-2.5 4-5 6.8-5 10a5 5 0 0010 0c0-3.2-2.5-6-5-10z" />
        </ChartIcon>
    ),
};

/** Topic icon + short label + accent for each chart id. */
export const CHART_TOPICS = {
    'Charts:হেলমেট কিভাবে পড়তে হয়': { icon: 'helmet', shortBn: 'হেলমেট', accent: 'orange' },
    'Charts:কোমর রশা vs হারনেস': { icon: 'harness', shortBn: 'হারনেস', accent: 'rose' },
    'Charts:ডিটিআর ফিউজ রেটিং চার্ট': { icon: 'fuse', shortBn: 'ফিউজ', accent: 'amber' },
    'Charts:ট্রান্সফরমার কারেন্ট রেটিং চার্ট': { icon: 'transformer', shortBn: 'কারেন্ট', accent: 'sky' },
    'Charts:নিরাপদ দূরত্বের চার্ট': { icon: 'ruler', shortBn: 'দূরত্ব', accent: 'emerald' },
    'Charts:মই-এর ভাল মন্দ': { icon: 'ladder', shortBn: 'মই', accent: 'orange' },
    'Charts:মই ব্যবহারের ৩-পয়েন্ট নিয়ম': { icon: 'points3', shortBn: '3 পয়েন্ট', accent: 'rose' },
    'Charts:ফুল বডি হারনেস কিভাবে পড়তে হয়': { icon: 'harness', shortBn: 'হারনেস পরুন', accent: 'orange' },
    'Charts:পিপিই কবে বদলাবেন': { icon: 'calendar', shortBn: 'পিপিই বদল', accent: 'violet' },
    'Charts:ACSR কারেন্ট বহন ক্ষমতা': { icon: 'cable', shortBn: 'ACSR', accent: 'sky' },
    'Charts:কিছু পরিচিত তার ও কেবিলের ব্যবহার': { icon: 'cable', shortBn: 'তার-কেবল', accent: 'amber' },
    'Charts:আপনার সেফিটি গ্লাভস চিনুন': { icon: 'glove', shortBn: 'গ্লাভস', accent: 'emerald' },
    'Charts:ডিসচার্জ রডের সঠিক ব্যবহার': { icon: 'rod', shortBn: 'ডিসচার্জ', accent: 'rose' },
    'Charts:DTR স্মার্ট চার্ট': { icon: 'smart', shortBn: 'ডিটিআর', accent: 'orange' },
    'Charts:কেবল রেটিং চার্ট': { icon: 'cable', shortBn: 'কেবল', accent: 'sky' },
};

export const ACCENT_STYLES = {
    orange: {
        blob: 'from-orange-400 to-amber-500',
        soft: 'from-orange-50 via-[#fffdf7] to-amber-100',
        chip: 'bg-orange-100 text-orange-800',
        ring: 'ring-orange-200',
    },
    amber: {
        blob: 'from-amber-400 to-orange-500',
        soft: 'from-amber-50 via-[#fffdf7] to-orange-100',
        chip: 'bg-amber-100 text-amber-900',
        ring: 'ring-amber-200',
    },
    rose: {
        blob: 'from-rose-400 to-orange-500',
        soft: 'from-rose-50 via-[#fffdf7] to-orange-50',
        chip: 'bg-rose-100 text-rose-800',
        ring: 'ring-rose-200',
    },
    emerald: {
        blob: 'from-emerald-400 to-teal-500',
        soft: 'from-emerald-50 via-[#fffdf7] to-teal-50',
        chip: 'bg-emerald-100 text-emerald-800',
        ring: 'ring-emerald-200',
    },
    sky: {
        blob: 'from-sky-400 to-blue-500',
        soft: 'from-sky-50 via-[#fffdf7] to-blue-50',
        chip: 'bg-sky-100 text-sky-800',
        ring: 'ring-sky-200',
    },
    violet: {
        blob: 'from-violet-400 to-fuchsia-500',
        soft: 'from-violet-50 via-[#fffdf7] to-fuchsia-50',
        chip: 'bg-violet-100 text-violet-800',
        ring: 'ring-violet-200',
    },
};

export function getChartTopic(chartId) {
    return CHART_TOPICS[chartId] || { icon: 'book', shortBn: 'চার্ট', accent: 'orange' };
}

export function TopicIcon({ name, className = 'h-5 w-5' }) {
    const Ico = UiIcons[name] || UiIcons.book;
    return <Ico className={className} />;
}

/** Heuristic icons for step / section / card titles when no explicit icon is set. */
export function iconForLabel(label = '') {
    const t = String(label).toLowerCase();
    if (/হেলমেট|helmet|মাথা|আগে চেক|ধরুন/.test(t)) return 'helmet';
    if (/হারনেস|harness|কাঁধ|ডি-রিং|ল্যানিয়ার্ড|অ্যাঙ্কর/.test(t)) return 'harness';
    if (/কোমর|বেল্ট|রশা|waist/.test(t)) return 'belt';
    if (/গ্লাভ|glove|ক্লাস/.test(t)) return 'glove';
    if (/মই|ladder|ওঠা|বসানো/.test(t)) return 'ladder';
    if (/৩|তিন|পয়েন্ট|point/.test(t)) return 'points3';
    if (/ফিউজ|fuse/.test(t)) return 'fuse';
    if (/ট্রান্স|ডিটিআর|dtr|kva|কারেন্ট/.test(t)) return 'transformer';
    if (/দূরত্ব|রাস্তা|road/.test(t)) return 'road';
    if (/বিল্ডিং|বাড়ি|building/.test(t)) return 'building';
    if (/লাইভ|live|বিপদ/.test(t)) return 'live';
    if (/রড|ডিসচার্জ|আর্থ|ground/.test(t)) return 'rod';
    if (/acsr|aaac|কেবল|তার|cable|xlpe|pvc|সার্ভিস/.test(t)) return 'cable';
    if (/এবি/.test(t)) return 'abCable';
    if (/আন্ডার|মাটি/.test(t)) return 'buried';
    if (/ইন্ডাস্ট্রি|ht xlpe/.test(t)) return 'industry';
    if (/বাড়ি|হোম|সার্ভিস/.test(t)) return 'home';
    if (/পিছন|অ্যাডজাস্ট|টাইট|ফিট/.test(t)) return 'adjust';
    if (/স্ট্র্যাপ|চিন|লক/.test(t)) return 'lock';
    if (/পা|উরু|লেগ/.test(t)) return 'leg';
    if (/বুক|চেস্ট/.test(t)) return 'chest';
    if (/নির্বাচন|বাছ/.test(t)) return 'pick';
    if (/এয়ার|লিক/.test(t)) return 'air';
    if (/ভেজা|wet/.test(t)) return 'wet';
    if (/কাপড়|cloth/.test(t)) return 'cloth';
    if (/ভাঁজ|fold/.test(t)) return 'fold';
    if (/লাইন বন্ধ|অফ|লোটো/.test(t)) return 'powerOff';
    if (/ছোঁয়া|touch/.test(t)) return 'touch';
    if (/সেকেন্ড|অপেক্ষা|wait|চার্জ বের/.test(t)) return 'wait';
    if (/ভুল|wrong|নিষেধ|bad/.test(t)) return 'warn';
    if (/সঠিক|ঠিক|ok|সুরক্ষা/.test(t)) return 'check';
    return 'spark';
}

export function iconForCardTitle(title = '') {
    const t = String(title);
    if (/^ACSR$/i.test(t)) return 'cable';
    if (/^AAAC$/i.test(t)) return 'cable';
    if (/এবি/.test(t)) return 'abCable';
    if (/PVC|XLPE|LT/i.test(t) && !/HT/i.test(t)) return 'buried';
    if (/সার্ভিস/.test(t)) return 'home';
    if (/HT/i.test(t)) return 'industry';
    return iconForLabel(t);
}
