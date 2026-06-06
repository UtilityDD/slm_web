/**
 * Aro Janun — practical field guide chapters (UI content).
 * PF-01 sourced from NIMI Electrician 1st year TP (exercise 1.8.76, pp. 214–216).
 */

export const PRACTICAL_FIELD_CHAPTERS = [
    {
        id: 'pf-01',
        code: 'PF-01',
        icon: '⏚',
        badgeClass: 'bg-emerald-100 text-emerald-800',
        title_en: 'Plate Earthing — Install & Test',
        title_bn: 'প্লেট আর্থিং — বসানো ও পরীক্ষা',
        desc_en: 'Prepare ISI-standard plate earthing, install the pit, and measure earth resistance.',
        desc_bn: 'আইএসআই মানের প্লেট আর্থিং প্রস্তুত করে পিটে বসানো ও মাটির রোধ মাপা।',
        topics_en: ['Plate prep', 'Earth pit', 'Installation', 'Resistance test'],
        topics_bn: ['প্লেট প্রস্তুতি', 'আর্থ পিট', 'ইনস্টলেশন', 'রোধ পরীক্ষা'],
        duration_en: '20 min read',
        duration_bn: '২০ মিনিট পড়া',
        detail_bn: {
            intro:
                'এই অনুশীলনে আপনি মাঠে প্লেট আর্থিং নিজে প্রস্তুত করবেন, নিয়ম মেনে বসাবেন এবং আর্থ টেস্টার বা মেগার দিয়ে মাটির রোধ মাপবেন। কাজ শুরুর আগে সরবরাহ বন্ধ ও নিরাপদ জায়গা নিশ্চিত করুন।',
            objectives: [
                'আইএসআই মান অনুযায়ী আর্থিং প্লেট প্রস্তুত করা',
                'মাঠে নিয়ম মেনে আর্থ পিট তৈরি করা',
                'প্লেট আর্থিং সঠিকভাবে ইনস্টল করা',
                'আর্থ টেস্টার/মেগার দিয়ে মাটির রোধ মাপা',
            ],
            tools: [
                'G.I. পাইপ কাটার — ১২.৭, ১৯ ও ৩৮ মিমি (১ সেট)',
                'ডি.ই. স্প্যানার — ৬ মিমি শাফ্ট, ২৫ মিমি (১ সেট)',
                'স্লেজ হ্যামার, ১ পয়েন্ট (১টি)',
                'ক্রোবার ৩৮×১৮০০ মিমি (১টি)',
                'কুবড়া ৩০০×১৫০ মিমি (১টি)',
                'ইনসুলেটেড মেগার (১টি)',
                'হাতুড়ি ৩০০ মিমি (১টি)',
                '২৪ টেনপাই শেড সহ হ্যাকস হার্নেস (১টি)',
                'পাইপ রেঞ্চ ৫০ মিমি (১টি)',
                'মই, সোল্ডারিং পাত্র (১টি)',
                'কম্বিনেশন প্লায়ার্স ২০০ মিমি (১টি)',
                'পরিমাপ শেপ ৫ মি (১টি)',
                'স্লেজ হ্যামার ২ কেজি (১টি)',
                'স্পাইক ও সংযোগকারী সীসা সহ আর্গ শেট (১ সেট)',
            ],
            materials: [
                'G.I. প্লেট ৬০০×৬০০×৬৩ মিমি (১টি)',
                'G.I. বার ১২.৭ মিমি — ৫ মি',
                'G.I. পাইপ ১৯ মিমি — ৫ মি',
                'C.I. কভার — তামার স্ক্রু সহ ৩০০ মিমি বর্গাকার (১টি)',
                '১৯ মিমি পাইপ সহ ফানেল ও তামার প্লেট — ১ মি',
                'G.I. নাট ও ওয়াশার ১৯ মিমি (২ সেট)',
                'G.I. বোল্ট-নাট ১৯ মিমি ডায় (২টি)',
                'G.I. তার নং ৮ SWG — ১০ মি',
                'তামার লগ ২০০ অ্যাম্প (১ মি)',
                'সোল্ডার ৬০×৪০ — ১০০ গ্রাম',
                'সোল্ডারিং পেস্ট — ১০ গ্রাম',
                'ম্যাট্রিক্স (১টি)',
                'সিমেন্ট — ১০ কেজি',
                'নীল ধাতু নিপ ৬ মিমি — ৪০ কেজি',
                'নদীর বালি — ৮০ কেজি',
                'কয়লা শক্ত — ৫ কেজি',
                'কমন সল্ট — ৫ কেজি',
            ],
            steps: [
                {
                    title: 'ধাপ ১ — আইএসআই মান অনুযায়ী প্লেট প্রস্তুত',
                    items: [
                        'আর্গ গ্যাস ওয়েল্ডিং দিয়ে G.I. প্লেট ও প্রয়োজনীয় আনুষঙ্গিক এক জায়গায় সাজিয়ে রাখুন।',
                        '৫ মিমি পুরু ১৯ মিমি G.I. পাইপ প্রয়োজনমতো মাপে কাটুন।',
                        'পিট-১-এ ৬০০×৬০০ মিমি জায়গায় ৬৩ মিমি পুরু G.I. প্লেট বসান।',
                        'পিট-২-এ ১৯ মিমি G.I. পাইপ বসান।',
                    ],
                },
                {
                    title: 'ধাপ ২ — মাঠে আর্থ পিট তৈরি',
                    note: 'এক জায়গায় ইলেক্ট্রোড বসাবেন না। ভূগর্ভস্থ পানির স্তর মাথায় রেখে আর্থ পিট যেখানে পানি কাছাকাছি, সেখানে করুন।',
                    items: [
                        'ফাউন্ডেশনের রড থেকে ১.৫ মিটার দূরে এক কোণে স্পাইক ওয়েল্ড করে পিন করুন।',
                        '১ মি প্রস্থ × ১ মি দৈর্ঘ্য × ২.৫ মি গভীর একটি গর্ত খনন করুন। এটি ন্যূনতম গভীরতা; মাটি শুকনো হলে আরও গভীর খনন লাগতে পারে।',
                        '১২.৭ মিমি G.I. পাইপের স্টেক প্রান্তসহ পাইপ বসান। পাইপের মাঝখানে চারকোল-নুনের মিশ্রণ দিন। G.I. তার প্লেটে এনে বোল্ট-নাট দিয়ে শক্ত করে আটকান (চিত্র-২ দেখুন)।',
                    ],
                },
                {
                    title: 'ধাপ ৩ — প্লেট আর্থিং ইনস্টল',
                    items: [
                        'পিট-২-এর মুখে ১৯ মিমি G.I. প্লেট রাখুন। এক পাশে পাইপ খাড়া রাখুন; চারকোল-নুনের পরিবাহী স্তর পাইপের চারপাশে দিন।',
                        'প্লেটের কিনারায় ইট রাখুন। উপরে প্রায় ১৫ সেন্টিমিটার উচ্চতায় চারকোল ভরুন; চারকোলের ওপর বালি দিন।',
                        '১৫০ মিমি একবারে খনন কঠিন। এক ফুট করে ধীরে খনন করুন। নুন ও চারকোল মিশিয়ে প্রায় ১৫০ মিমি গভীরে বসান; আলাদা স্তরে ভরুন।',
                        'চারকোলের ওপরের ছিদ্রে ফানেল রেখে ১৫০×১৫০ মিমি লেয়ারে নুন-চারকোল ভরুন। পাইপের চারপাশেও আলাদা স্তরে নুন-চারকোল দিন।',
                        'কংক্রিটের মিশ্রণ প্রস্তুত করে পিট-২-এর মুখে ঢেলে দিন।',
                        'প্লেটের ওপর G.I. পাইপ আটকান।',
                        'কংক্রিট শক্ত হতে অন্তত ২৪ ঘণ্টা অপেক্ষা করুন। গরম-আর্দ্র আবহাওয়ায় প্রায় ২ ঘণ্টা লাগতে পারে — তখন আর্দ্র রাখুন।',
                        'মাঝের পাইপে নতুন নদীর বালি ঢালুন।',
                        'ভিজে যাওয়ার জন্য এক ঘণ্টা রাখুন; তারপর মাটি দিয়ে পিট ভরুন।',
                    ],
                },
                {
                    title: 'ধাপ ৪ — পরীক্ষা ও রোধ মাপা',
                    items: [
                        'আর্গ ইলেক্ট্রোড দিয়ে আর্থ টেস্টার পরীক্ষা করুন।',
                        'পৃথিবীর ইলেক্ট্রোড টার্মিনালের রিডিং লিখে রাখুন।',
                        'রোধ বেশি হলে মাটির ভেতরে ৮ মিটার দূরে আরেকটি প্লেট আর্থিং বসান এবং দুটো সমান্তরালে সংযুক্ত করুন।',
                        'টার্মিনাল ও রেকর্ডিং আবার ঢেকে নিন।',
                        'দুই ইলেক্ট্রোডে দ্বিতীয় রিডিং প্রথম রিডিংয়ের চেয়ে কম হওয়া উচিত। খরা মৌসুমে পরীক্ষা করলে ফল ভালো পাওয়া যায়।',
                        'কাজ শেষে আপনার নাম, তারিখ ও রোধের মান রেকর্ডে লিখুন।',
                    ],
                },
            ],
            safety: [
                'কাজের সময় সরবরাহ বন্ধ রাখুন; কন্ট্রোল ইউনিট সংযোগ বিচ্ছিন্ন করুন।',
                'খননের সময় ভূগর্ভস্থ কেবল বা পাইপ আছে কিনা আগে জেনে নিন।',
                'কংক্রিট ঢালার পর নির্দিষ্ট সময় না হওয়া পর্যন্ত ওপরে চাপ দেবেন না।',
                'আর্থ টেস্ট করার সময় ভেজা হাতে যন্ত্র ধরবেন না।',
            ],
        },
        detail_en: {
            intro:
                'This field guide covers preparing plate earthing to ISI standards, installing the earth pit on site, and measuring soil resistance with an earth tester or megger. Isolate supply before starting work.',
            objectives: [
                'Prepare earthing plate per ISI standards',
                'Build the earth pit on site per procedure',
                'Install the plate earthing assembly correctly',
                'Measure earth resistance with earth tester / megger',
            ],
            steps: [
                {
                    title: 'Step 1 — Prepare the plate (ISI)',
                    items: [
                        'Arrange G.I. plate and accessories; weld with argon where required.',
                        'Cut 5 mm thick 19 mm G.I. pipe to length.',
                        'Place 63 mm thick G.I. plate in pit 1 (600×600 mm).',
                        'Place 19 mm G.I. pipe in pit 2.',
                    ],
                },
                {
                    title: 'Step 2 — Prepare earth pit on site',
                    note: 'Do not install all electrodes in one spot; consider groundwater level and place the pit near a moisture source when possible.',
                    items: [
                        'Weld spike to foundation rebar 1.5 m from a corner.',
                        'Excavate 1 m × 1 m × 2.5 m deep (minimum; go deeper if soil is dry).',
                        'Install 12.7 mm G.I. pipe with stake end; salt-charcoal around pipe; bond G.I. wire to plate with bolt-nut.',
                    ],
                },
                {
                    title: 'Step 3 — Install plate earthing',
                    items: [
                        'Set plate on pit 2; vertical pipe on one side with conductive salt-charcoal layer.',
                        'Brick on plate edge; charcoal ~15 cm high, then sand.',
                        'Fill salt-charcoal in layers (~150 mm); dig gradually in 1 ft stages.',
                        'Funnel into top opening; 150×150 mm salt-charcoal layer around pipe.',
                        'Pour concrete on pit 2 surface; fix G.I. pipe on plate.',
                        'Cure concrete at least 24 hours (≈2 hours in hot humid weather; keep moist).',
                        'Pour fresh river sand in centre pipe; wait 1 hour, then backfill.',
                    ],
                },
                {
                    title: 'Step 4 — Test and measure resistance',
                    items: [
                        'Test with argon electrode and earth tester; record terminal reading.',
                        'If resistance is high, add second plate electrode 8 m away in parallel.',
                        'Second reading with two electrodes should be lower than the first.',
                        'Testing in dry season is preferred; log name, date, and ohms.',
                    ],
                },
            ],
            safety: [
                'Keep supply isolated during installation.',
                'Locate buried services before excavation.',
                'Do not load fresh concrete before cure time.',
                'Do not handle the tester with wet hands.',
            ],
        },
    },
];
