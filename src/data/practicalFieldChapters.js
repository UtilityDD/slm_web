/**
 * Aro Janun — practical field guide chapters (UI content).
 * PF-01 sourced from NIMI Electrician 1st year TP (exercise 1.8.76, pp. 214–216).
 * PF-02 sourced from PSSC distribution-lineman-english-class-11 (Session 2, pp. 51–56).
 */

export const PRACTICAL_FIELD_CHAPTERS = [
    {
        id: 'pf-01',
        code: 'PF-01',
        icon: '⏚',
        badgeClass: 'bg-emerald-100 text-emerald-800',
        title_en: 'Plate Earthing — Install & Test',
        title_bn: 'প্লেট আর্থিং — প্রস্তুতকরণ, স্থাপন ও পরীক্ষা',
        desc_en: 'Prepare ISI-standard plate earthing, install the pit, and measure earth resistance.',
        desc_bn: 'আইএসআই (ISI) স্ট্যান্ডার্ড অনুযায়ী প্লেট আর্থিং সেটআপ প্রস্তুত করে পিটে স্থাপন করা এবং আর্থ রেজিস্ট্যান্স মাপা।',
        topics_en: ['Plate prep', 'Earth pit', 'Installation', 'Resistance test'],
        topics_bn: ['প্লেট প্রস্তুতকরণ', 'আর্থ পিট খনন', 'প্লেট স্থাপন', 'রেজিস্ট্যান্স পরীক্ষা'],
        duration_en: '20 min read',
        duration_bn: '২০ মিনিট পড়া',
        detail_bn: {
            intro:
                'প্লেট আর্থিং হলো বিদ্যুৎ লাইনে অতিরিক্ত বা লিকেজ কারেন্ট নিরাপদে মাটিতে পাঠিয়ে দেওয়ার অন্যতম সেরা ও নির্ভরযোগ্য উপায়। এই অধ্যায়ে আমরা শিখবো কীভাবে সঠিক মাপ মেনে একটি G.I. প্লেট আর্থিং তৈরি করতে হয়, নিয়ম মেনে আর্থ পিট খনন করতে হয়, কয়লা ও লবণের স্তর সাজিয়ে প্লেটটি স্থাপন করতে হয় এবং আর্থ টেস্টারের সাহায্যে আর্থ রেজিস্ট্যান্স পরীক্ষা করতে হয়। কাজ শুরু করার আগে সুরক্ষার স্বার্থে মেইন পাওয়ার সাপ্লাই বন্ধ বা আইসোলেট করে নেওয়া আবশ্যক।',
            objectives: [
                'আইএসআই (ISI) স্ট্যান্ডার্ড অনুযায়ী G.I. প্লেট ও পাইপ সংযোগ প্রস্তুত করা',
                'নিরাপদ স্থান নির্বাচন করে সঠিক পরিমাপে আর্থ পিট (গর্ত) খনন করা',
                'পিটের মধ্যে কয়লা ও লবণের স্তর তৈরি করে আর্থিং প্লেটটি খাড়াভাবে স্থাপন করা',
                'কংক্রিট চেম্বার তৈরি করে কাস্ট আয়রন কভার ও ফানেল লাগানো',
                'আর্থ টেস্টার/মেগার ব্যবহার করে মাটির রোধ (Earth Resistance) নিখুঁতভাবে মাপা',
            ],
            tools: [
                { name: 'ডাবল-এন্ডেড স্প্যানার সেট (Double-Ended Spanner Set)', image: '/images/plate_earthing/fig_2_5_spanner.png' },
                { name: 'কম্বিনেশন প্লায়ার্স (Combination Pliers)', image: '/images/cable_laying/fig_2_25_combination_pliers.png' },
                { name: 'পাইপ রেঞ্চ (Pipe Wrench)', image: '/images/cable_laying/fig_2_27_pipe_wrench.png' },
                { name: 'পরিমাপক টেপ (Measuring Tape)', image: '/images/cable_laying/fig_2_28_measuring_tape.png' },
                { name: 'স্লেজ হ্যামার (Sledge Hammer)', image: '/images/cable_laying/fig_2_29_hammer.png' },
                { name: 'হ্যাকস ফ্রেম ও ব্লেড (Hacksaw Frame)', image: '/images/plate_earthing/fig_hacksaw_workshop.png' },
                { name: 'সোল্ডারিং পট ও ল্যাডেল (Soldering Ladle & Pot)', image: '/images/plate_earthing/fig_2_12_soldering_iron.png' },
                { name: 'মই (Ladder)', image: '/images/plate_earthing/fig_2_10_ladder.png' },
                { name: 'আর্থ টেস্টার (Earth Tester)', image: '/images/plate_earthing/fig_2_8_tester.png' },
                { name: 'ব্লো-ল্যাম্প (Blowlamp)', image: '/images/plate_earthing/fig_2_13_soldering_station.png' },
                { name: 'G.I. পাইপ থ্রেডিং ডাই-স্টক সেট (Die Stock)', image: '/images/cable_laying/fig_2_36_ratchet_device.png' },
                { name: 'ক্রোবার বা শাবল (Crowbar)', image: '/images/cable_laying/fig_2_35_come_along_clamp.png' },
                { name: 'কোদাল ও বেলচা (Spade/Phawrah)', image: '/images/cable_laying/fig_2_34_tripod.png' },
            ],
            materials: [
                'G.I. প্লেট (৬০০ মিমি × ৬০০ মিমি × ৬.৩ মিমি) — ১টি (তামার প্লেট হলে ৩.১৫ মিমি পুরু)',
                'G.I. পাইপ (১২.৭ মিমি ব্যাস) — ৫ মিটার (আর্থিং তারের সুরক্ষার জন্য)',
                'G.I. পাইপ (১৯ মিমি ব্যাস) — ৫ মিটার (জল ঢালার কাজে ব্যবহারের জন্য)',
                'কাস্ট আয়রন (C.I.) কভার ও ফ্রেম (৩০০ মিমি × ৩০০ মিমি) — ১টি (চেম্বার ঢাকার জন্য)',
                'তারের জালি ও ফানেল (১৯ মিমি পাইপের মাথায় সংযোগের জন্য) — ১টি',
                'G.I. নাট, বোল্ট ও ওয়াশার (১৯ মিমি ব্যাস) — ২ সেট (প্লেটে সংযোগের জন্য)',
                'G.I. চেক-নাট (১৯ মিমি) — ২টি',
                'G.I. ওয়াশার (৪০ মিমি সাইজ, ১৯ মিমি ছিদ্র সহ) — ২টি',
                'G.I. আর্থিং তার (নং ৮ SWG) — ১০ মিটার',
                'কপার লাক্স (২০০ অ্যাম্পিয়ার) — ১টি (কপার প্লেটের সংযোগের জন্য)',
                'সোল্ডার ওয়্যার (৬০/৪০) — ১০০ gram',
                'সোল্ডারিং পেস্ট — ১০ গ্রাম',
                'দেশলাই বক্স — ১টি',
                'পোর্টল্যান্ড সিমেন্ট — ১০ কেজি',
                '৬ মিমি পাথরের কুচি (Blue Metal Chips) — ৪০ কেজি',
                'নদীর মিহি বালি — ৮০ কেজি',
                'কয়লা বা কোক (Charcoal/Coke) — ৫ কেজি',
                'খাবার লবণ (Common Salt) — ৫ কেজি',
            ],
            steps: [
                {
                    title: 'ধাপ ১ — প্লেট এবং পাইপ প্রস্তুতকরণ',
                    image: '/images/plate_earthing/fig1_plate_prep.png',
                    caption: 'চিত্র ১: আর্থ প্লেটের সাথে জি.আই. পাইপ ও আর্থিং তারের সংযোগের নিখুঁত নকশা।',
                    items: [
                        'প্রয়োজনীয় সকল সরঞ্জাম, পরিমাপক যন্ত্র এবং কাঁচামাল এক জায়গায় সাজিয়ে কাজের প্রস্তুতি নিন।',
                        'জল ঢালার জন্য ১৯ মিমি ব্যাসের G.I. পাইপটি প্রয়োজন অনুযায়ী কাটুন এবং তার মাথায় প্যাঁচ কাটার জন্য ডাই-স্টক ব্যবহার করে থ্রেডিং করে নিন (সাধারণত এক প্রান্তে ৭৫ মিমি এবং অন্য প্রান্তে ২৫ মিমি প্যাঁচ কাটা হয়)।',
                        '৬০০ মিমি × ৬০০ মিমি ও ৬.৩ মিমি পুরুত্বের G.I. প্লেটটি নিন। প্লেটের এক কোণে নাট-বোল্ট সংযোগের জন্য ছিদ্র করুন।',
                        'তার সুরক্ষার জন্য ১২.৭ মিমি পাইপের মধ্য দিয়ে ৮ SWG G.I. আর্থিং তারটি ঢুকিয়ে দিন। প্লেটের ছিদ্র বরাবর G.I. বোল্ট, নাট এবং ওয়াশার ব্যবহার করে তারের সংযোগটি অত্যন্ত শক্তভাবে আটকান যাতে পরবর্তীতে কোনোভাবেই ঢিলে বা ঢিলে সংযোগের কারণে মরিচা না পড়ে (চিত্র ১ দেখুন)।',
                    ],
                },
                {
                    title: 'ধাপ ২ — নিরাপদ স্থানে আর্থ পিট খনন',
                    note: 'আর্থ পিটের জায়গাটি যেন কোনো বৈদ্যুতিক বেড়া বা ধাতব খুঁটির কাছাকাছি না হয়, যাতে সংযোগ লিক হয়ে ধাতব অংশ লাইভ হওয়ার ঝুঁকি এড়ানো যায়। এটি সবসময় বিল্ডিংয়ের মূল দেয়াল বা ফাউন্ডেশন থেকে কমপক্ষে ১.৫ মিটার দূরে হতে হবে।',
                    items: [
                        'বিল্ডিংয়ের দেয়াল থেকে ১.৫ মিটার দূরে একটি উপযুক্ত শুষ্ক বা আর্দ্র মাটিসম্পন্ন জায়গা চিহ্নিত করুন।',
                        'চিহ্নিত স্থানে ১ মিটার দৈর্ঘ্য × ১ মিটার প্রস্থ এবং ২.৫ মিটার গভীরতার একটি সোজা চৌকো গর্ত খনন করুন। গর্তের গভীরতা মাটির শুষ্কতার ওপর নির্ভর করে; মাটির গভীর আর্দ্র স্তর না পৌঁছানো পর্যন্ত আরও গভীর খনন করা লাগতে পারে।',
                    ],
                },
                {
                    title: 'ধাপ ৩ — পিটের মধ্যে প্লেট ও কয়লা-লবণের স্তর স্থাপন',
                    image: '/images/plate_earthing/fig2_earth_pit.png',
                    caption: 'চিত্র ২: মাটির নিচে প্লেট আর্থিং পিটের ক্রস-সেকশন ডায়াগ্রাম (কয়লা, লবণ ও মাটির স্তরসমূহ)।',
                    items: [
                        'প্রস্তুত করা প্লেট ও পাইপ অ্যাসেম্বলিটি গর্তের ঠিক মাঝখানে একদম সোজা বা খাড়া (vertical) অবস্থায় দাঁড় করান। পাইপ দুটি সোজা রাখতে বাঁশের লাঠি বা কাঠ দিয়ে সাময়িক সাপোর্ট দিতে পারেন।',
                        'প্লেটের ঠিক চারপাশে একটি ১৫০ মিমি × ১৫০ মিমি সাইজের কাঠের ফ্রেমিং বক্স রাখুন।',
                        'ফ্রেমের ভেতরের অংশে প্রায় ১৫ সেমি উচ্চতা পর্যন্ত কয়লা (কোক) এবং লবণ অল্টারনেট স্তরে (প্রথমে কয়লা ও পরে লবণ) ভরুন। ফ্রেমের বাইরের খালি জায়গাটি খনন করে রাখা মাটি দিয়ে ভরে ভালোভাবে ঠেসে বা র‍্যামিং করে দিন।',
                        'কাঠের ফ্রেমটি ধীরে ধীরে উপরে তুলুন এবং আবার ফানেল পাইপের চারপাশে ১৫০ মিমি এলাকার মধ্যে কয়লা ও লবণ স্তরে স্তরে ভরে বাইরের অংশ মাটি দিয়ে ভরাট করুন। এভাবে ধাপে ধাপে গর্তটি ভরাট করুন (চিত্র ২ অনুযায়ী)।',
                    ],
                },
                {
                    title: 'ধাপ ৪ — ফানেল বসানো ও কংক্রিট চেম্বার নির্মাণ',
                    items: [
                        '১৯ মিমি পাইপের মাথায় তারের জালি বসানো জল ঢালার ফানেলটি স্ক্রু ও চেক-নাট দিয়ে ভালোভাবে সেট করুন।',
                        'পিটের উপরিভাগে সিমেন্ট, বালি ও পাথরের কংক্রিট মিক্স (১:২:৪ অনুপাতে) দিয়ে ৩০০ মিমি × ৩০০ মিমি সাইজের একটি কংক্রিট পরিদর্শন চেম্বার তৈরি করুন।',
                        'চেম্বারটির ওপর কাস্ট আয়রন (C.I.) ফ্রেম ও কভার বসিয়ে দিন যাতে চেম্বারটি সুরক্ষিত থাকে ও কোনো ময়লা-আবর্জনা ফানেলে না পড়ে।',
                        'কংক্রিট চেম্বারটি শক্ত হওয়ার জন্য কমপক্ষে ২৪ ঘণ্টা সময় দিন এবং এই সময়ে চটের ভেজা বস্তা দিয়ে বা জল ছিটিয়ে আর্দ্র রাখুন (শুষ্ক গরম আবহাওয়ায় প্রতি ২ ঘণ্টা পর পর জল ছিটাতে হবে)।',
                        'ফানেল দিয়ে গর্তের ভেতরে ৩-৪ বালতি জল ঢালুন এবং তা মাটিতে শোষিত হওয়ার জন্য অন্তত ১ ঘণ্টা সময় দিন।',
                    ],
                },
                {
                    title: 'ধাপ ৫ — আর্থ রেজিস্ট্যান্স পরীক্ষা ও রোধ পরিমাপ',
                    items: [
                        'একটি সচল আর্থ রেজিস্ট্যান্স টেস্টার (Earth Megger) নিন। পরীক্ষার পূর্বে এর জিরো অ্যাডজাস্টমেন্ট ও ব্যাটারি ভোল্টেজ ঠিক আছে কিনা দেখে নিন।',
                        'প্রধান প্যানেল বা সিস্টেম থেকে টেস্ট করার সময় আর্থিং ওয়্যারটিকে সম্পূর্ণ বিচ্ছিন্ন করে রাখুন (আইসোলেট করুন)।',
                        'পিটের রেজিস্ট্যান্স মাপার জন্য টেস্টারের সাথে আসা কারেন্ট স্পাইক (C) এবং পটেনশিয়াল স্পাইক (P) দুটিকে পিট থেকে যথাক্রমে ১০ মিটার এবং ২০ মিটার দূরে সোজা লাইনে মাটিতে শক্ত করে গেঁথে দিন।',
                        'টেস্টারের টার্মিনালগুলোর সাথে আর্থ ইলেকট্রোড (E) এবং দুটি স্পাইক ক্যাবলের সংযোগ দিয়ে হ্যান্ডেল ঘুরিয়ে (অ্যানালগ মিটারের ক্ষেত্রে) বা বোতাম চেপে (ডিজিটাল মিটারের ক্ষেত্রে) রিডিং নিন।',
                        'যদি আর্থ রেজিস্ট্যান্সের মান প্রস্তাবিত মানের চেয়ে বেশি আসে, তবে মূল পিট থেকে ৮ মিটার দূরে আরেকটি পাইপ বা প্লেট আর্থিং পিট তৈরি করুন এবং উভয়কে সমান্তরালে (parallel) সংযুক্ত করুন। দুটি সমান্তরাল ইলেকট্রোডের ক্ষেত্রে রোধের মান একক ইলেকট্রোডের তুলনায় প্রায় অর্ধেক হয়ে যায় যা কাঙ্ক্ষিত সীমার মধ্যে থাকে।',
                    ],
                },
            ],
            safety: [
                'কাজের সময় লাইভ বা কারেন্ট থাকা অংশ সম্পূর্ণরূপে বন্ধ বা আইসোলেট করে রাখুন এবং সতর্কতামূলক সাইনবোর্ড ঝুলিয়ে দিন।',
                'মাটি খনন করার পূর্বে নিশ্চিত হয়ে নিন যে মাটির নিচে কোনো পানির পাইপলাইন, গ্যাস লাইন বা উচ্চ ভোল্টেজের বিদ্যুৎ ক্যাবল গিয়েছে কিনা।',
                'কংক্রিট চেম্বার ঢালার পর তা সম্পূর্ণ শক্ত হওয়ার আগে তার ওপর পা দেবেন না বা কোনো ভারী ওজন রাখবেন না।',
                'আর্থ টেস্টার দিয়ে পরীক্ষা করার সময় মেটাল স্পাইক বা ক্যাবল ভেজা বা খালি হাতে স্পর্শ করবেন না।',
            ],
            practical_tips: [
                {
                    title: 'নুন ও চারকোলের আসল কাজ কী?',
                    text: 'লবণ মাটিতে দ্রবীভূত হয়ে আয়ন তৈরি করে, যা মাটির বিদ্যুৎ পরিবাহিতা বহুগুণ বাড়িয়ে দেয়। আর চারকোল স্পঞ্জের মতো মাটির আর্দ্রতা ধরে রাখতে সাহায্য করে যাতে খরা মরসুমেও মাটির রোধ বেড়ে না যায়।'
                },
                {
                    title: 'কেমিক্যাল আর্থিং কেন আধুনিক বিকল্প?',
                    text: 'লবণ ও চারকোল সময়ের সাথে সাথে ক্ষয়প্রাপ্ত হয় এবং প্লেটে জং ধরায়। এই জন্য আধুনিক সিস্টেমে কেমিক্যাল আর্থিং পাউডার বা বেন্টোনাইট ক্লে (Bentonite) ব্যবহার করা হয়, যা দীর্ঘস্থায়ী, পরিবেশবান্ধব এবং প্লেটের কোনো ক্ষতি করে না।'
                },
                {
                    title: 'রেজিস্ট্যান্স কমানোর চটজলদি উপায়:',
                    text: 'যদি রেজিস্ট্যান্স ৫ ওহমের বেশি আসে, তবে ফানেল দিয়ে জল ঢেলে মাটি ভিজিয়ে দিন অথবা নুন-জালের দ্রবণ তৈরি করে গর্তে ঢালুন। এতে রেজিস্ট্যান্স তাৎক্ষণিকভাবে কমে যাবে।'
                }
            ],
            standard_values: [
                { type: 'বিদ্যুৎ উৎপাদন কেন্দ্র ও বড় সাবস্টেশন (Power Stations / Sub-Stations)', value: '০.৫ ওহম (Ohms)-এর কম' },
                { type: 'বড় শিল্প কারখানা (Industrial Power Plants)', value: '১.০ ওহম-এর কম' },
                { type: 'বাণিজ্যিক ও বড় আবাসন ভবন (Commercial Buildings)', value: '২.০ ওহম-এর কম' },
                { type: 'সাধারণ বসতবাড়ি বা ডোমেস্টিক ওয়ারিং (Domestic Houses)', value: '৫.০ ওহম-এর কম' }
            ]
        },
        detail_en: {
            intro:
                'Plate earthing is one of the most reliable and effective systems to safely discharge leakage currents into the ground. This guide explains how to prepare a G.I. plate earthing setup to ISI standards, excavate the pit, install the plate with alternating charcoal-salt layering, and test the final earth resistance. Always ensure the mains supply is completely isolated before beginning any physical work.',
            objectives: [
                'Prepare G.I. plate and pipe assembly according to ISI standards',
                'Excavate the earth pit to required specifications at a safe location',
                'Install the plate vertically with proper charcoal and salt layering',
                'Construct the inspection concrete chamber and fit the Cast Iron cover',
                'Measure the earth resistance using an earth tester or megger',
            ],
            tools: [
                { name: 'Double-Ended Spanner Set', image: '/images/plate_earthing/fig_2_5_spanner.png' },
                { name: 'Combination Pliers', image: '/images/cable_laying/fig_2_25_combination_pliers.png' },
                { name: 'Pipe Wrench', image: '/images/cable_laying/fig_2_27_pipe_wrench.png' },
                { name: 'Measuring Tape', image: '/images/cable_laying/fig_2_28_measuring_tape.png' },
                { name: 'Sledge Hammer', image: '/images/cable_laying/fig_2_29_hammer.png' },
                { name: 'Hacksaw Frame with Blade', image: '/images/plate_earthing/fig_hacksaw_workshop.png' },
                { name: 'Soldering Ladle & Pot', image: '/images/plate_earthing/fig_2_12_soldering_iron.png' },
                { name: 'Ladder', image: '/images/plate_earthing/fig_2_10_ladder.png' },
                { name: 'Earth Tester', image: '/images/plate_earthing/fig_2_8_tester.png' },
                { name: 'Blowlamp', image: '/images/plate_earthing/fig_2_13_soldering_station.png' },
                { name: 'G.I. Pipe Threading Die Stock', image: '/images/cable_laying/fig_2_36_ratchet_device.png' },
                { name: 'Crowbar / Digging Bar', image: '/images/cable_laying/fig_2_35_come_along_clamp.png' },
                { name: 'Spade / Phawrah', image: '/images/cable_laying/fig_2_34_tripod.png' },
            ],
            materials: [
                'G.I. Plate (600 mm x 600 mm x 6.3 mm) — 1 No.',
                'G.I. Pipe (12.7 mm dia) — 5 m (for wire protection)',
                'G.I. Pipe (19 mm dia) — 5 m (for watering)',
                'Cast Iron (C.I.) Cover & Frame (300 mm x 300 mm) — 1 No.',
                'Funnel with wire mesh (19 mm dia) — 1 No.',
                'G.I. Nuts and Bolts (19 mm) — 2 sets',
                'G.I. Check-Nuts (19 mm) — 2 Nos.',
                'G.I. Washers (40 mm with 19 mm hole) — 2 Nos.',
                'G.I. Wire No. 8 SWG — 10 m',
                'Copper Lug (200 A) — 1 No. (for copper connections)',
                'Solder Wire (60/40) — 100 g',
                'Soldering Paste — 10 g',
                'Matchbox — 1 No.',
                'Portland Cement — 10 kg',
                'Blue Metal Chips (6 mm size) — 40 kg',
                'River Sand — 80 kg',
                'Charcoal or Coke — 5 kg',
                'Common Salt — 5 kg'
            ],
            steps: [
                {
                    title: 'Step 1 — Prepare the Plate and Pipes (ISI)',
                    image: '/images/plate_earthing/fig1_plate_prep.png',
                    caption: 'Figure 1: Diagram showing G.I. plate connection with watering pipe and earth wire protection pipe.',
                    items: [
                        'Gather all required tools, measuring instruments, and materials in one clean location.',
                        'Cut 19 mm dia G.I. pipe to length and thread both ends using the die stock (75 mm thread on one end, 25 mm on other) for watering.',
                        'Take the 600 mm x 600 mm x 6.3 mm G.I. plate. Drill holes for bolts if not already present.',
                        'Thread the No. 8 SWG G.I. wire through the 12.7 mm G.I. pipe. Securely bolt the G.I. wire to the G.I. plate using G.I. bolts, nuts, and washers. Double check for tightness to avoid corrosion.'
                    ],
                },
                {
                    title: 'Step 2 — Excavate Earth Pit on Site',
                    note: 'To avoid electric shock risks, do not locate the earth pit near a metal fence or steel structure. The pit must be located at least 1.5 meters away from the building foundation.',
                    items: [
                        'Select a suitable spot at least 1.5 meters away from the foundation of the building.',
                        'Excavate a pit measuring 1 m × 1 m × 2.5 m deep. This depth is the minimum recommended; dig deeper in sandy or dry soil until you reach a moist layer.',
                    ],
                },
                {
                    title: 'Step 3 — Install Plate and Charcoal-Salt Layering',
                    image: '/images/plate_earthing/fig2_earth_pit.png',
                    caption: 'Figure 2: Cross-sectional diagram of the excavated pit showing the installation layout of plate, pipes, and coal-salt layering.',
                    items: [
                        'Place the G.I. plate assembly vertically in the center of the pit. You can use bamboo sticks or wooden blocks as temporary supports to keep the pipes upright.',
                        'Place a 150 mm × 150 mm wooden frame box around the plate/pipe assembly.',
                        'Fill the inside of the frame box with alternating layers of charcoal (or coke) and common salt, about 15 cm high per layer. Backfill the space outside the frame box with excavated soil and ram it firmly.',
                        'Slowly pull up the wooden box and repeat the layering process around the pipe up to a height of 2.5 m, backfilling the surrounding area with soil in stages (see Figure 2).'
                    ],
                },
                {
                    title: 'Step 4 — Install Funnel and Concrete Chamber',
                    items: [
                        'Fix the funnel with a wire mesh on top of the 19 mm watering pipe using check-nuts to allow periodic watering.',
                        'Construct a cement concrete chamber of size 300 mm × 300 mm at the top of the pit using concrete mix (1:2:4 ratio).',
                        'Fit the Cast Iron (C.I.) cover and frame on top of the chamber to protect the pit from dirt, leaves, or water logging.',
                        'Allow the concrete chamber to cure for at least 24 hours. Keep it moist with a wet gunny bag or by spraying water (every 2 hours in hot weather).',
                        'Pour 3 to 4 buckets of water through the funnel and wait for about 1 hour for it to be fully absorbed by the surrounding soil.'
                    ],
                },
                {
                    title: 'Step 5 — Test and Measure Earth Resistance',
                    items: [
                        'Prepare the Earth Tester (Megger) and check its battery level and zero setting.',
                        'Disconnect the earth wire from the main electrical installation board before testing.',
                        'Drive the current spike (C) and potential spike (P) into the soil in a straight line at distances of 10 m and 20 m away from the earth pit, respectively.',
                        'Connect the spikes and earth electrode (E) to the tester terminals and take the reading by pressing the test button or rotating the handle.',
                        'If the measured earth resistance is higher than the recommended limit, install a second parallel plate electrode at a distance of 8 m and connect them together. The combined resistance will drop to about half of the single electrode.'
                    ],
                },
            ],
            safety: [
                'Ensure the electrical supply is completely isolated and locked out before starting.',
                'Check for underground utility lines (cables, gas pipes, water pipes) before beginning excavation.',
                'Do not step on or place loads on the fresh concrete chamber before it cures.',
                'Do not touch the metal spikes or cables with bare or wet hands during the test.'
            ],
            practical_tips: [
                {
                    title: 'Why salt and charcoal?',
                    text: 'Salt dissolves in soil moisture to create ions, which dramatically increases soil conductivity. Charcoal acts like a sponge, absorbing water and retaining moisture during dry seasons to prevent resistance spikes.'
                },
                {
                    title: 'Modern alternative: Chemical Earthing',
                    text: 'Limon and charcoal can corrode the G.I. plate over time. Modern systems use Chemical Ground Enhancement Materials (GEM) or Bentonite Clay, which are long-lasting, eco-friendly, and non-corrosive.'
                },
                {
                    title: 'Quick tip to lower resistance:',
                    text: 'If your earth tester shows resistance above 5 ohms, pour salt water or water directly into the funnel to moisten the soil around the plate, which temporarily lowers resistance immediately.'
                }
            ],
            standard_values: [
                { type: 'Power Stations & Large Substations', value: '< 0.5 Ohms' },
                { type: 'Industrial Power Plants & Large Factories', value: '< 1.0 Ohms' },
                { type: 'Commercial Buildings & Large Panels', value: '< 2.0 Ohms' },
                { type: 'Domestic Houses / Residential Wiring', value: '< 5.0 Ohms' }
            ]
        },
    },
    {
        id: 'pf-02',
        code: 'PF-02',
        icon: '⛓',
        badgeClass: 'bg-blue-100 text-blue-800',
        title_en: 'Cable Laying — Tools & Equipment',
        title_bn: 'কেবল লেয়িং — সরঞ্জাম ও যন্ত্রপাতি',
        desc_en: 'Understand and identify the essential tools, devices, and machinery used for laying underground and overhead cables.',
        desc_bn: 'মাটির নিচে ও ওপরে কেবল টানার কাজে প্রয়োজনীয় বিভিন্ন ক্যাবল ড্রাম, রোলার, উইঞ্চ এবং লাইন্সম্যান হ্যান্ড টুলসের পরিচিতি ও ব্যবহার।',
        topics_en: ['Cable Drums & Rollers', 'Pulling Equipment', 'Lineman Hand Tools', 'Safety & Testing'],
        topics_bn: ['ক্যাবল ড্রাম ও রোলার', 'টানবার যন্ত্রপাতি', 'লাইন্সম্যান হ্যান্ড টুলস', 'নিরাপত্তা ও টেস্টিং'],
        duration_en: '15 min read',
        duration_bn: '১৫ মিনিট পড়া',
        detail_bn: {
            intro: 'কেবল লেয়িং (ক্যাবল টানার কাজ) হলো বিদ্যুৎ বিতরণ ব্যবস্থার অন্যতম গুরুত্বপূর্ণ অংশ। মাটির তলা দিয়ে (Underground) বা ওপর দিয়ে ওভারহেড লাইনে সঠিক নিয়ম মেনে ড্যামেজ ছাড়া ক্যাবল টানার জন্য বিভিন্ন ভারী যন্ত্রপাতি এবং বিশেষ হ্যান্ড টুলস ব্যবহৃত হয়। ক্যাবল টানা ও টানার পর তার সঠিক টেস্টিং না করলে পরবর্তীতে শর্ট সার্কিট বা আর্থ ফল্ট হতে পারে। এই অধ্যায়ে আমরা ক্যাবল লেয়িংয়ের প্রয়োজনীয় সকল আধুনিক সরঞ্জাম, ড্রাম ও জ্যাকের ব্যবহার এবং লাইন্সম্যানদের হ্যান্ড টুলস সম্পর্কে বিস্তারিত জানবো।',
            objectives: [
                'ক্যাবল লেয়িংয়ের মূল সরঞ্জাম (যেমন: ক্যাবল ড্রাম, অ্যাঙ্গেল রোলার, উইঞ্চ মেশিন) সনাক্ত করা ও তাদের কাজ বোঝা',
                'ক্যাবল টানার সঠিক পদ্ধতি (যেমন: জ্যাকের ওপর ড্রাম বসানো, কাইঙ্ক ও কেবল প্যাঁচানো এড়ানো) শেখা',
                'ক্যাবল টানা শেষ করার পর মাটির নিচের ক্যাবলের শর্ট-সার্কিট ও আর্থ ফল্ট পরীক্ষার পদ্ধতি জানা',
                'লাইন্সম্যানদের জন্য ইনসুলেটেড হ্যান্ড টুলস (প্লায়ার্স, রিঞ্চ, হ্যামার ইত্যাদি)-এর কাজের উপযোগিতা বোঝা',
                'কাজের সময় ডস অ্যান্ড ডোন্টস (Do\'s & Don\'ts) এবং প্রয়োজনীয় নিরাপত্তা সতর্কতা মেনে চলা'
            ],
            tools: [
                { name: 'কম্বিনেশন প্লায়ার্স (Combination Pliers)', image: '/images/cable_laying/fig_2_25_combination_pliers.png' },
                { name: 'অ্যাডজাস্টেবল রিঞ্চ (Adjustable Wrench)', image: '/images/cable_laying/fig_2_26_adjustable_wrench.png' },
                { name: 'পাইপ রিঞ্চ (Pipe Wrench)', image: '/images/cable_laying/fig_2_27_pipe_wrench.png' },
                { name: 'পরিমাপক স্টিল টেপ (Measuring Tape)', image: '/images/cable_laying/fig_2_28_measuring_tape.png' },
                { name: 'লাইন্সম্যান হ্যামার (Lineman Hammer)', image: '/images/cable_laying/fig_2_29_hammer.png' },
                { name: 'র‍্যাচেট হ্যান্ড ড্রিল (Hand Drill)', image: '/images/cable_laying/fig_2_30_hand_drill.png' },
                { name: 'ইলেকট্রিক ড্রিল মেশিন (Electric Drill)', image: '/images/cable_laying/fig_2_31_electric_drill.png' },
                { name: 'বেঞ্চ ভাইস (Bench Vice)', image: '/images/cable_laying/fig_2_32_bench_vice.png' },
                { name: 'চেন পুলি ব্লক (Chain Pulley)', image: '/images/cable_laying/fig_2_33_chain_pulley.png' },
                { name: 'ট্রাইপড স্ট্যান্ড (Tripod)', image: '/images/cable_laying/fig_2_34_tripod.png' },
                { name: 'কাম-অ্যালং ক্ল্যাম্প (Come Along Clamp)', image: '/images/cable_laying/fig_2_35_come_along_clamp.png' },
                { name: 'র‍্যাচেট টেনশনার (Ratchet Device)', image: '/images/cable_laying/fig_2_36_ratchet_device.png' },
                { name: 'কেবল সহ ক্যাবল ড্রাম (Cable Drum with Cable)', image: '/images/cable_laying/fig_2_20_cable_drum_with.png' },
                { name: 'কেবল ছাড়া ক্যাবল ড্রাম (Cable Drum without Cable)', image: '/images/cable_laying/fig_2_21_cable_drum_without.png' },
                { name: 'অ্যাঙ্গেল রোলার (Angle Rollers)', image: '/images/cable_laying/fig_2_22_angle_rollers.png' },
                { name: 'কেবল পুলিং উইঞ্চ ও জ্যাক সেটআপ (Cable Pulling)', image: '/images/cable_laying/fig_2_23_pulling_methods.png' },
            ],
            materials: [
                'আন্ডারগ্রাউন্ড আর্মার্ড ক্যাবল (Underground Armoured Cable) — বিদ্যুৎ পরিবহনের জন্য লোহার বর্মযুক্ত ক্যাবল',
                'জিআই কন্ডুইট পাইপ (GI Conduit Pipe) — ক্যাবল সুরক্ষিত রাখার লোহার পাইপ',
                'ক্যাবল জয়েন্ট কিট ও লাক্স (Cable Joints & Lugs) — সংযোগ তৈরি ও টার্মিনেশনের জন্য',
                'ক্যাবল ট্র্যাঞ্চ বালি ও ইট (Sand & Bricks) — ক্যাবলের নিচে ও ওপরে সুরক্ষামূলক স্তর দেওয়ার জন্য',
                'সিগন্যাল টেপ বা সতর্কতা ফিতে (Warning Tape) — আন্ডারগ্রাউন্ড কেবল লাইনের ওপরে মাটির নিচে সতর্কবার্তা লিখে পোঁতার জন্য',
                'গ্রিজ বা লুব্রিকেন্ট (Cable Lubricant) — পাইপের ভেতর দিয়ে ক্যাবল টানার সময় ঘর্ষণ কমানোর জেল'
            ],
            steps: [
                {
                    title: 'ধাপ ১ — কেবল ও সরঞ্জাম প্রস্তুতি এবং ড্রাম মাউন্টিং',
                    image: '/images/cable_laying/fig_2_20_cable_drum_with.png',
                    caption: 'চিত্র ১: ক্যাবল ড্রাম জ্যাকের সাহায্যে ঝুলিয়ে কেবল টানার প্রস্তুতি।',
                    items: [
                        'কাজের সাইট চিহ্নিত করে ক্যাবল টানার পথ (Route) পরিষ্কার করুন এবং আন্ডারগ্রাউন্ড পিট বা ট্র্যাঞ্চ ঠিকমতো কাটা হয়েছে কিনা পরীক্ষা করুন।',
                        'ক্যাবল ড্রামটিকে সরাসরি মাটির ওপর রেখে টানবেন না, এতে ক্যাবল জড়িয়ে বা মোচড় খেয়ে (kink) ড্যামেজ হতে পারে। ড্রামটিকে সবসময় শক্ত মেকানিক্যাল বা হাইড্রোলিক জ্যাকের (Cable Jacks) ওপর মাউন্ট করে মাটি থেকে উঁচুতে ঝুলিয়ে দিন যাতে তা ফ্রিলি ঘুরতে পারে।',
                        'ড্রাম থেকে ক্যাবল খোলার সময় নিশ্চিত করুন ক্যাবল যেন কোনোভাবেই অতিরিক্ত ভাজ বা প্যাঁচ না খায়।',
                        'ট্র্যাঞ্চের বাঁকে বাঁকে এবং সোজা পথে ক্যাবল ও মাটির ঘর্ষণ এড়াতে নির্দিষ্ট দূরত্ব পর পর স্ট্রেট রোলার এবং কর্নার বা অ্যাঙ্গেল রোলার (Angle Rollers) বসান।'
                    ]
                },
                {
                    title: 'ধাপ ২ — কেবল টানার পদ্ধতি ও উইঞ্চ মেশিনের ব্যবহার',
                    image: '/images/cable_laying/fig_2_23_pulling_methods.png',
                    caption: 'চিত্র ২: উইঞ্চের সাহায্যে ক্যাবল ড্রাম থেকে রোলার ও পাইপের ভেতর ক্যাবল টানার পদ্ধতি।',
                    items: [
                        'হালকা ক্যাবলের ক্ষেত্রে কর্মীরা হাতে টেনে রোলার ও ট্র্যাঞ্চের ওপর দিয়ে কেবল বিছিয়ে দিতে পারেন। তবে ভারী আর্মার্ড ক্যাবলের ক্ষেত্রে অবশ্যই ক্যাবল পুলিং উইঞ্চ (Cable pulling winch) ব্যবহার করতে হবে।',
                        'ক্যাবলের টেনে নেওয়ার মাথায় একটি ক্যাবল পুলিং গ্রিপ (Cable Grip - যা দেখতে জালের পাইপের মতো হয়) ভালোভাবে পরিয়ে দিন। টান বাড়ার সাথে সাথে এটি কেবলকে আরও শক্ত করে আঁকড়ে ধরে।',
                        'ক্যাবল পাইপ বা ডাক্ট দিয়ে টানার সময় ঘর্ষণ কমাতে এবং ইনসুলেশন রক্ষা করতে ক্যাবল লুব্রিকেন্ট ব্যবহার করুন।',
                        'টেনে নেওয়ার সময় উইঞ্চ মেশিনের স্পিড ধীরে এবং নিয়ন্ত্রণে রাখুন, যাতে ক্যাবলের সর্বোচ্চ টেনশন লিমিট অতিক্রম না করে এবং ক্যাবলের ভেতরের তামার বা অ্যালুমিনিয়ামের কন্ডাক্টর ছিঁড়ে না যায়।'
                    ]
                },
                {
                    title: 'ধাপ ৩ — লাইন্সম্যান হ্যান্ড টুলসের সঠিক ব্যবহার',
                    image: '/images/cable_laying/fig_2_24_lineman_tools.png',
                    caption: 'চিত্র ৩: বিদ্যুৎ কাজের জন্য বিশেষভাবে উপযোগী ইনসুলেটেড লাইন্সম্যান হ্যান্ড টুলস।',
                    items: [
                        'লাইন্সম্যানদের কাজের জন্য ব্যবহৃত প্রতিটি হ্যান্ড টুলসের হাতলে ডাই-ইলেকট্রিক ইনসুলেশন (রাবার বা প্লাস্টিকের চওড়া কোটিং) থাকা বাধ্যতামূলক, যা ইলেকট্রিক শক থেকে বাঁচায়।',
                        'তার কাটতে ও ইনসুলেশন ছাড়াতে প্লায়ার্সের খাঁজকাটা অংশ এবং কাটিং ব্লেড ব্যবহার করুন। প্লায়ার্সের জয়েন্ট রিভেটটি নিয়মিত তেল দিয়ে জং-মুক্ত রাখুন।',
                        'ক্যাবল জয়েন্ট এবং পোলের ক্রসব্যান্ডের নাট-বোল্ট খোলার জন্য সঠিক সাইজের স্প্যানার ব্যবহার করুন। সঠিক সাইজের স্প্যানার না থাকলে ৮" বা ১২" অ্যাডজাস্টেবল স্প্যানার ব্যবহার করা যেতে পারে, তবে এটি অতিরিক্ত টাইট দেওয়ার জন্য ফিক্সড স্প্যানারের বিকল্প নয়।',
                        'কন্ডুইট পাইপের থ্রেড বা ভালভ খোলার জন্য ১০" পাইপ রিঞ্চ (Pipe Wrench) ব্যবহার করুন। পাইপ কাটার সময় বেঞ্চ ভাইসে (Bench Vice) পাইপটি শক্ত করে আটকে নিয়ে হ্যাকস দিয়ে সোজা করে কাটুন।'
                    ]
                },
                {
                    title: 'ধাপ ৪ — কেবল বিছানোর পর তার টেস্টিং ও ফল্ট পরীক্ষা',
                    image: '/images/cable_laying/fig_2_30_hand_drill.png',
                    caption: 'চিত্র ৪: ছিদ্র করার কাজে ব্যবহৃত র‍্যাচেট হ্যান্ড ড্রিল ডিভাইস।',
                    items: [
                        'ক্যাবল টানা ও বিছানোর কাজ সম্পন্ন হওয়ার পর লাইনে বিদ্যুৎ দেওয়ার আগে অবশ্যই টেস্ট করতে হবে। কেবল বিছানোর সময় কোনো চিমটি বা ড্যামেজ হয়ে ভেতরের কন্ডাক্টর লিকেজ হয়েছে কিনা তা দেখা অত্যন্ত জরুরি।',
                        'ক্যাবলটি মূলত তিনটি পরীক্ষার মধ্য দিয়ে যায়: শর্ট সার্কিট ফল্ট টেস্ট (কোরের মধ্যে শর্ট খোঁজা), ডিসকন্টিনিউটি টেস্ট (তারের ভেতর কোনো কন্ডাক্টর কোর কাটা আছে কিনা পরীক্ষা), এবং আর্থ ফল্ট টেস্ট (কোরে মাটির সাথে লিকেজ খোঁজা)।',
                        'এই টেস্টগুলোর জন্য ১০০০ ভোল্টের মেগার (Megger) বা আর্থ টেস্টার ব্যবহার করা হয়।',
                        'আন্ডারগ্রাউন্ড ক্যাবলের মাটির নিচের ভেতরের ফল্টের সঠিক দূরত্ব বের করার জন্য মারে লুপ টেস্ট (Murray Loop Test) অথবা ভার্লে লুপ টেস্ট (Varley Loop Test) করা হয়, যা কেবল মেরামতে সাহায্য করে।'
                    ]
                }
            ],
            safety: [
                'কখনোই বিদ্যুৎ চালু থাকা অবস্থায় তার বা পরিবাহী স্পর্শ করবেন না। লাইভ লাইনে কাজ করার আগে অবশ্যই মেইন গ্রিড বা সাবস্টেশন ডিসকানেক্ট করে আর্থিং ডিসচার্জ রড দিয়ে নিশ্চিত হোন।',
                'প্লাগ খোলার সময় তার ধরে টেনে খুলবেন না, এতে তারের অভ্যন্তরীণ কানেকশন ছিঁড়ে শর্ট সার্কিট হতে পারে।',
                'কাজ করার সময় কোনোভাবেই হ্যান্ড টুলস নিয়ে খেলাধুলা বা অসতর্ক আচরণ করবেন না; যেকোনো ড্যামেজড টুলস সাথে সাথে বাতিল করুন।',
                'ভারী ক্যাবল ড্রাম তোলার সময় চেন পুলি ব্লক ও ট্রাইপডের লক ও লোড হ্যান্ডেলটি ভালোভাবে পরীক্ষা করুন। কর্মীরা যেন ঝুলন্ত লোডের নিচে না দাঁড়ায়।',
                'ক্যাবল টানার সময় কর্মীদের হাত বা পা যেন কোনোভাবেই ড্রাম বারোলারের চলমান চাকার নিচে না পড়ে, সে বিষয়ে সর্বোচ্চ সতর্ক থাকুন।'
            ],
            practical_tips: [
                {
                    title: 'মাটির নিচে ইট ও বালির গুরুত্ব',
                    text: 'আন্ডারগ্রাউন্ড ক্যাবল টানার পর মাটি ভরাট করার আগে তার চারপাশে মিহি নদীর বালি ও ওপরে ইট বিছিয়ে দেওয়া হয়। বালি মাটির নিচে ক্যাবলের অতিরিক্ত তাপ শোষণে সাহায্য করে, আর ইট পরবর্তীকালে অন্য কেউ মাটি খুঁড়লে ক্যাবল কেটে যাওয়া থেকে রক্ষা করে।'
                },
                {
                    title: 'সতর্কতা ফিতা বা ওয়ার্নিং টেপ',
                    text: 'ইটের স্তরের ওপরে সতর্কবার্তাসহ একটি লাল বা হলুদ ফিতা মাটির নিচে বিছিয়ে দেওয়া হয়, যাতে ভবিষ্যতের কোনো খননকাজের সময় এই ফিতা দেখা গেলেই কাজ বন্ধ করে ক্যাবলটি রক্ষা করা যায়।'
                },
                {
                    title: 'শীতল বনাম গরম আবহাওয়া',
                    text: 'শীতকালে কেবল পিভিসি ইনসুলেশন শক্ত হয়ে যায়, তাই অতিরিক্ত ঠান্ডায় ক্যাবল টানলে ক্র্যাক বা ফাটল ধরতে পারে। এই সময় ক্যাবলটিকে টেনে সাবধানে বসাতে হবে এবং সম্ভব হলে ঘরের তাপমাত্রায় এনে কাজ শুরু করতে হবে।'
                }
            ],
            standard_values_title: 'প্রয়োজনীয় যন্ত্রপাতি ও সরঞ্জামের তালিকা',
            standard_values_headers: ['যন্ত্রপাতি ও সরঞ্জামের ধরন', 'প্রয়োজনীয় সংখ্যা'],
            standard_values: [
                { type: 'চেন পুলি ব্লক (Chain Pulley Block - 5 MT)', value: '১টি' },
                { type: 'মেগার (Megger - 1000 Volts)', value: '১টি' },
                { type: 'আর্থ টেস্টার (Earth Tester)', value: '১টি' },
                { type: 'পোর্টেবল ড্রিলিং মেশিন (Portable Drilling Machine)', value: '১টি' },
                { type: 'বাঁশের মই (Bamboo Ladder)', value: ' ২টি' },
                { type: 'স্টিল মেজারিং টেপ (Steel Measuring Tape)', value: '১টি' },
                { type: 'টানবার ও উত্তোলনের মেশিন (Pulling & Lifting Machine - 3 Ton)', value: '১টি' },
                { type: 'পাইপ রিঞ্চ (Pipe Wrench - 3" / 7.6 cm)', value: ' ২টি' },
                { type: 'স্পিরিট লেভেল (Spirit Level)', value: '৪টি' },
                { type: 'সকেট স্প্যানার সেট (Socket Spanner Set)', value: '২ সেট' },
                { type: 'রিং স্প্যানার সেট (Ring Spanner Set)', value: '২ সেট' },
                { type: 'হ্যামার (Hammer)', value: ' ২টি' }
            ]
        },
        detail_en: {
            intro: 'Cable laying is a crucial part of electrical distribution networks. Pulling cables safely underground or overhead without causing insulation damage requires heavy machinery and specialized lineman hand tools. Testing the cables after installation is essential to prevent short circuits or earth faults. This chapter covers the tools, equipment, drum jacks, and lineman tools used during cable laying activities.',
            objectives: [
                'Identify and understand the main cable laying equipment (cable drums, rollers, winches)',
                'Learn correct cable pulling methods (mounting drums on jacks, avoiding kinks and twists)',
                'Understand underground cable testing procedures for short-circuits and earth faults',
                'Learn the purpose of insulated hand tools (pliers, wrenches, hammers, etc.) for linemen',
                'Adhere to safety dos and don\'ts when working in the field'
            ],
            tools: [
                { name: 'Combination Pliers', image: '/images/cable_laying/fig_2_25_combination_pliers.png' },
                { name: 'Adjustable Wrench', image: '/images/cable_laying/fig_2_26_adjustable_wrench.png' },
                { name: 'Pipe Wrench', image: '/images/cable_laying/fig_2_27_pipe_wrench.png' },
                { name: 'Measuring Tape', image: '/images/cable_laying/fig_2_28_measuring_tape.png' },
                { name: 'Lineman Hammer', image: '/images/cable_laying/fig_2_29_hammer.png' },
                { name: 'Hand Drill', image: '/images/cable_laying/fig_2_30_hand_drill.png' },
                { name: 'Electric Drill', image: '/images/cable_laying/fig_2_31_electric_drill.png' },
                { name: 'Bench Vice', image: '/images/cable_laying/fig_2_32_bench_vice.png' },
                { name: 'Chain Pulley', image: '/images/cable_laying/fig_2_33_chain_pulley.png' },
                { name: 'Tripod', image: '/images/cable_laying/fig_2_34_tripod.png' },
                { name: 'Come Along Clamp', image: '/images/cable_laying/fig_2_35_come_along_clamp.png' },
                { name: 'Ratchet Device', image: '/images/cable_laying/fig_2_36_ratchet_device.png' },
                { name: 'Cable Drum with Cable', image: '/images/cable_laying/fig_2_20_cable_drum_with.png' },
                { name: 'Cable Drum without Cable', image: '/images/cable_laying/fig_2_21_cable_drum_without.png' },
                { name: 'Angle Rollers', image: '/images/cable_laying/fig_2_22_angle_rollers.png' },
                { name: 'Cable Pulling Setup', image: '/images/cable_laying/fig_2_23_pulling_methods.png' },
            ],
            materials: [
                'Underground Armoured Cable — for power transmission with metallic armoring',
                'GI Conduit Pipe — metallic pipe for protecting cables in exposed runs',
                'Cable Jointing Kits & Lugs — for building terminations and cable splices',
                'Sand & Bricks — for cushioning and providing mechanical protection in trenches',
                'Warning Tape — warnings buried above the cables to indicate live lines below',
                'Cable Lubricant — grease or gel to reduce pulling friction inside conduits'
            ],
            steps: [
                {
                    title: 'Step 1 — Cable Preparation and Drum Mounting',
                    image: '/images/cable_laying/fig_2_20_cable_drum_with.png',
                    caption: 'Figure 1: Cable drum jack mounting setup to unroll cables smoothly.',
                    items: [
                        'Identify the routing path, clean the cable trench, and inspect the trench dimensions.',
                        'Never pull a cable with the drum sitting directly on the ground; it causes kinks and insulation damage. Always mount the cable drum on mechanical or hydraulic jacks so it suspends off the ground and rotates freely.',
                        'Ensure the cable does not twist or loop tightly when unrolling from the drum.',
                        'Install straight rollers along the straight trench path and angle rollers at bends to avoid friction and abrasion against the ground.'
                    ]
                },
                {
                    title: 'Step 2 — Pulling Methods and Winch Operations',
                    image: '/images/cable_laying/fig_2_23_pulling_methods.png',
                    caption: 'Figure 2: Winch pulling setup to safely roll cable over guiding devices into trenches.',
                    items: [
                        'Light cables can be pulled manually along the rollers. For heavy armoured cables, use a mechanical cable pulling winch.',
                        'Attach a cable pulling grip (mesh sleeve) to the leading end of the cable. The grip tightens around the sheath as tension increases.',
                        'Apply cable lubricant when pulling cables through conduits or ducts to minimize friction and prevent insulation wear.',
                        'Keep the winch speed slow and steady to ensure pulling tension does not exceed the maximum allowable limits for the cable conductor.'
                    ]
                },
                {
                    title: 'Step 3 — Erection and Maintenance Hand Tools',
                    image: '/images/cable_laying/fig_2_24_lineman_tools.png',
                    caption: 'Figure 3: Common lineman hand tools insulated for electrical utility jobs.',
                    items: [
                        'Lineman hand tools must have high-dielectric insulated rubber grips to protect workers from electric shock.',
                        'Use insulated combination pliers for cutting, stripping insulation, and twisting conductors. Keep the plier rivet oiled.',
                        'Use correct size fixed spanners to tighten nuts and bolts. If a proper size spanner is not available, use an 8" or 12" adjustable wrench.',
                        'Use a 10" pipe wrench to tighten conduit pipes and valves. Secure conduits in a bench vice when cutting them with a hacksaw.'
                    ]
                },
                {
                    title: 'Step 4 — Post-Laying Testing and Fault Inspection',
                    image: '/images/cable_laying/fig_2_30_hand_drill.png',
                    caption: 'Figure 4: Ratchet hand drill device used for line structures cleating.',
                    items: [
                        'Cables must be thoroughly tested after installation before applying main voltage to check for any physical damage.',
                        'Perform three standard electrical tests: Short Circuit Test (checking for shorted cores), Discontinuity Test (checking for open circuits), and Earth Fault Test (checking for core leakage to earth/armour).',
                        'Use a 1000V insulation tester (Megger) or an earth tester to conduct these tests.',
                        'Locate underground cable faults using loop tests, such as the Murray Loop Test or Varley Loop Test, to determine the exact fault distance from the terminal.'
                    ]
                }
            ],
            safety: [
                'Never touch live lines or conductors. Disconnect the main supply and discharge lines with earth rods before starting.',
                'Do not pull cords to remove plugs from sockets; it breaks internal connections and creates short circuit hazards.',
                'Never play with tools. Inspect and discard damaged hand tools immediately.',
                'Verify the load rating and anchors of the chain pulley block and tripod before lifting heavy drums. Do not stand under suspended loads.',
                'Ensure hands and feet are kept clear of rotating cable drums and moving rollers during pulling operations.'
            ],
            practical_tips: [
                {
                    title: 'Role of Sand and Bricks',
                    text: 'In underground trenches, cables are surrounded by fine river sand to dissipate heat, and then topped with a layer of bricks. The bricks act as a mechanical barrier to prevent accidental shovel cuts during future excavations.'
                },
                {
                    title: 'Cable Warning Tape',
                    text: 'A red or yellow warning tape is placed above the bricks in the trench. If anyone digs in the future, the tape will warn them of underground cables before they hit the electrical lines.'
                },
                {
                    title: 'Cold Weather Caution',
                    text: 'Cold temperatures make PVC sheaths brittle. Avoid pulling cables in freezing weather as the insulation can crack. If unavoidable, warm the cable to room temperature before installation.'
                }
            ],
            standard_values_title: 'Required Machinery & Tools List',
            standard_values_headers: ['Machinery / Tool Type', 'Required Quantity'],
            standard_values: [
                { type: 'Chain Pulley Block (5 MT)', value: '1 No.' },
                { type: 'Megger (1000 Volts)', value: '1 No.' },
                { type: 'Earth Tester', value: '1 No.' },
                { type: 'Portable Drilling Machine', value: '1 No.' },
                { type: 'Bamboo Ladder', value: '2 Nos.' },
                { type: 'Steel Measuring Tape', value: '1 No.' },
                { type: 'Pulling and Lifting Machine (3 Ton)', value: '1 No.' },
                { type: 'Pipe Wrench (3" / 7.6 cm)', value: '2 Nos.' },
                { type: 'Spirit Level', value: '4 Nos.' },
                { type: 'Socket Spanner Set', value: '2 Sets' },
                { type: 'Ring Spanner Set', value: '2 Sets' },
                { type: 'Hammer', value: '2 Nos.' }
            ]
        }
    },
    {
        id: 'pf-03',
        code: 'PF-03',
        icon: '🔗',
        badgeClass: 'bg-orange-100 text-orange-800',
        title_en: 'Conductor Jointing — Types & Methods',
        title_bn: 'কন্ডাক্টর জয়েন্টিং — প্রকারভেদ ও পদ্ধতি',
        desc_en: 'Learn the mechanical and electrical properties of conductor joints, straight/Tee/sleeve/compression jointing procedures, and PG clamping.',
        desc_bn: 'কন্ডাক্টর জয়েন্ট প্রস্তুতকরণ, বিভিন্ন জয়েন্টের বৈশিষ্ট্য (Britannia, Married, T, Sleeve, Compression) এবং জাম্পারিং পদ্ধতি।',
        topics_en: ['Joint Properties', 'Straight & Tee Joints', 'Sleeve & Compression', 'Jumpering & PG Clamps'],
        topics_bn: ['জয়েন্টের বৈশিষ্ট্য', 'স্ট্রেট ও টি-জয়েন্ট', 'স্লীভ ও কম্প্রেশন', 'জাম্পারিং পদ্ধতি'],
        duration_en: '15 min read',
        duration_bn: '১৫ মিনিট পড়া',
        detail_bn: {
            intro: 'ডিস্ট্রিবিউশন লাইনের কাজ কিলোমিটার জুড়ে বিস্তৃত হওয়ায় একটি মাত্র কন্ডাক্টর কয়েল দিয়ে সব দূরত্ব মেটানো সম্ভব হয় না। বিদ্যুৎ বিতরণ লাইনের ধারাবাহিকতা বজায় রাখতে কন্ডাক্টর জয়েন্টিং অত্যন্ত গুরুত্বপূর্ণ। এই অধ্যায়ে আমরা শিখবো বিভিন্ন ধরনের কন্ডাক্টর জয়েন্ট (Britannia, Married, T-Joint, Sleeve Joint, Compression Joint), তাদের প্রয়োগক্ষেত্র এবং জাম্পারিং পদ্ধতি। কাজ শুরু করার আগে সুরক্ষার স্বার্থে মেইন পাওয়ার সাপ্লাই বন্ধ বা আইসোলেট করে নেওয়া আবশ্যক।',
            objectives: [
                'বিভিন্ন ধরণের কন্ডাক্টর জয়েন্ট সনাক্ত করা এবং তাদের প্রয়োগক্ষেত্র বোঝা',
                'ব্রিটানিয়া, ম্যারেড, টি-জয়েন্ট, স্লীভ এবং কম্প্রেশন জয়েন্ট তৈরির সঠিক পদ্ধতি শেখা',
                'জয়েন্টের যান্ত্রিক শক্তি (কমপক্ষে ৯৫%) এবং নিম্ন বৈদ্যুতিক রোধ বজায় রাখার গুরুত্ব বোঝা',
                'পি.জি. ক্ল্যাম্প (P.G. Clamp) এবং ইনসুলেশন কভার ব্যবহার করে সঠিক নিয়মে জাম্পারিং করা শেখা'
            ],
            tools: [],
            materials: [
                'ACSR / AAC কন্ডাক্টর তার — অ্যালুমিনিয়াম কন্ডাক্টর স্টিল রিইনফোর্সড / অল-অ্যালুমিনিয়াম কন্ডাক্টর',
                'অ্যালুমিনিয়াম ও স্টিল স্লীভ (Sleeves) — স্লীভ ও কম্প্রেশন জয়েন্ট তৈরির জন্য',
                'পি.জি. ক্ল্যাম্প (Parallel Groove Clamps) — জাম্পার সংযোগ তৈরি করার জন্য',
                'অ্যালকাথিন পাইপ (Alkathene Pipe) — ধাতব অংশের কাছাকাছি জাম্পার ঢাকার জন্য',
                'কপার বাইন্ডিং তার — ব্রিটানিয়া জয়েন্ট বাঁধার জন্য',
                'গ্রাফাইট গ্রীস — স্লীভ জয়েন্টে ব্যবহারের জন্য',
                'ফিলার কম্পাউন্ড (Filler Compound) — কম্প্রেশন জয়েন্টে মরিচা প্রতিরোধক হিসেবে',
                'লুব্রিকেটিং ওয়্যাক্স (Lubricating Wax) — কম্প্রেশন ডাই পিচ্ছিল করার জন্য',
                'সোল্ডার তার ও ফ্লাক্স (Solder & Flux) — ব্রিটানিয়া ও ম্যারেড জয়েন্ট সোল্ডারিংয়ের জন্য',
                'আঠালো টেপ (Adhesive Tape) — তারের মাথা ও স্ট্র্যান্ড চিহ্নিত করার জন্য'
            ],
            steps: [
                {
                    title: 'A — ব্রিটানিয়া জয়েন্ট এবং ওয়েস্টার্ন ইউনিয়ন জয়েন্ট',
                    image: '/images/conductor_jointing/fig_4_37_britannia_joint.png',
                    caption: 'চিত্র ১: সলিড কপার তারের জন্য ব্রিটানিয়া জয়েন্টের নিটোল নকশা ও বাইন্ডিং তারের সংযোগ।',
                    items: [
                        'তারের প্রান্তে থাকা মরিচা বা অক্সিডেশন দূর করতে প্রথমে তারের ব্রাশ বা শিরীষ কাগজ দিয়ে কন্ডাক্টরের মুখ ভালোভাবে পরিষ্কার করুন।',
                        'ব্রিটানিয়া জয়েন্টের ক্ষেত্রে (যা সলিড কপার তারে ব্যবহৃত হয়), কন্ডাক্টরের দুই প্রান্ত মুখোমুখি এনে অন্তত ১০০ মিমি (৪ ইঞ্চি) জায়গা জুড়ে একে অপরের ওপর সমান্তরালে রাখুন এবং তারের শেষ প্রান্ত দুটি সামান্য (৫ মিমি) বাঁকিয়ে দিন।',
                        '১.৪ মিমি কপার বাইন্ডিং তার দিয়ে কন্ডাক্টরের সংস্পর্শ অংশটি শক্তভাবে প্যাঁচিয়ে বেঁধে দিন (চিত্র ১ অনুযায়ী) এবং জয়েন্টে সোল্ডারিং করুন যাতে রোধ সর্বনিম্ন থাকে।',
                        'টেলিফোন (ওয়েস্টার্ন ইউনিয়ন) জয়েন্টের ক্ষেত্রে, কন্ডাক্টরের মাথা ১০০ থেকে ১২৫ মিমি দূরত্বে সামান্য বাঁকিয়ে একে অপরের ওপরে রাখুন এবং একে অপরের সাথে পেঁচিয়ে ভালোমতো টাইট করে দিন।'
                    ]
                },
                {
                    title: 'B — ম্যারেড জয়েন্ট প্রস্তুতকরণ',
                    image: '/images/conductor_jointing/fig_4_38_married_joint.png',
                    caption: 'চিত্র ২: মাঝখানে জি.আই. কোরযুক্ত স্ট্র্যান্ডেড কপার তারের ম্যারেড জয়েন্ট তৈরির ধাপ।',
                    items: [
                        'ম্যারেড জয়েন্ট মূলত মাঝখানে জি.আই. স্টিলের কোরযুক্ত স্ট্র্যান্ডেড কপার কন্ডাক্টরের মধ্যে তৈরি করা হয়। মনে রাখবেন, এটি অ্যালুমিনিয়াম কন্ডাক্টরে ব্যবহার করা যাবে না।',
                        'উভয় কন্ডাক্টরের প্রায় ১৭৫ মিমি থেকে ২০০ মিমি দৈর্ঘ্যের স্ট্র্যান্ডগুলো খুলে ছড়িয়ে দিন।',
                        'ভেতরের মূল জি.আই. স্টিল স্ট্র্যান্ডটিকে ১৭৫ মিমি দৈর্ঘ্য পর্যন্ত কেটে বা ভেঙে দিন।',
                        'দুটি কন্ডাক্টর মুখোমুখি এনে তাদের খোলা স্ট্র্যান্ডগুলো একে অপরের ভেতর ঢুকিয়ে বুননের মতো সেট করুন। এরপর একদিকের স্ট্র্যান্ড অন্যদিকের তারের ওপরে এবং অন্যদিকের স্ট্র্যান্ড প্রথম তারের ওপরে পেঁচিয়ে সোল্ডারিং সম্পন্ন করুন।'
                    ]
                },
                {
                    title: 'C — টি-জয়েন্ট (T-Joint) প্রস্তুতকরণ',
                    image: '/images/conductor_jointing/fig_4_39_t_joint.png',
                    caption: 'চিত্র ৩: স্ট্র্যান্ডেড কন্ডাক্টরে টি-জয়েন্ট তৈরির পূর্ব ও পরের চিত্র।',
                    items: [
                        'টি-জয়েন্ট স্ট্র্যান্ডেড কন্ডাক্টরে তৈরি করা হয়। এটি কোনো মেকানিক্যাল টান বা টেনশন সহ্য করতে পারে না; মূলত সাবস্টেশনে জাম্পার বা ট্যাপ অফ সংযোগ নিতে এটি ব্যবহৃত হয়।',
                        'ট্যাপিং কন্ডাক্টরের স্ট্র্যান্ডগুলো ১০০ মিমি পর্যন্ত ছাড়িয়ে নিন এবং ভেতরের ইস্পাত কোর বা মধ্যের স্টিল তার কেটে বাদ দিন।',
                        'এবার ট্যাপিং কন্ডাক্টরটি মূল লাইনের তারের ওপর লম্বভাবে রেখে দুই দিকে ৩টি করে কন্ডাক্টর স্ট্র্যান্ড ভাগ করে প্রধান পরিবাহী তারের ওপরে শক্তভাবে পেঁচিয়ে দিন।'
                    ]
                },
                {
                    title: 'D — স্লীভ জয়েন্ট (Sleeve Joint) প্রস্তুতকরণ',
                    image: '/images/conductor_jointing/fig_4_40_sleeve_joint.png',
                    caption: 'চিত্র ৪: টুইস্টিং রেঞ্চের সাহায্যে প্যাঁচানো স্লীভ জয়েন্টের ডায়াগ্রাম।',
                    items: [
                        'স্লীভ জয়েন্ট মূলত ০.০৬ বর্গসেমি পর্যন্ত সাইজের যেকোনো অ্যালুমিনিয়াম কন্ডাক্টরে (যেমন: ACSR, AAC) করা যেতে পারে।',
                        'কন্ডাক্টরের খোলা মাথায় গ্রাফাইট গ্রীস প্রলেপ দিন যাতে পরিবাহী পৃষ্ঠের সংযোগ ভালো থাকে।',
                        'চিত্র ৪ অনুযায়ী দুটি অ্যালুমিনিয়াম স্লীভ নিন এবং সেগুলোকে কন্ডাক্টরের মাথায় প্রবেশ করান।',
                        'টুইস্টিং রেঞ্চ বা জয়েন্টিং রেঞ্চ ব্যবহার করে স্লীভ দুটিকে সুন্দরভাবে মুচড়ে বা পেঁচিয়ে দিন যাতে কন্ডাক্টর শক্তভাবে আটকে থাকে।'
                    ]
                },
                {
                    title: 'E — কম্প্রেশন জয়েন্ট (Compression Joint)',
                    note: '০.০৬ বর্গসেমির চেয়ে বড় আকারের কন্ডাক্টরের জন্য কম্প্রেশন জয়েন্ট ব্যবহার করা বাধ্যতা মূলক। এই পদ্ধতিতে স্টিল ও অ্যালুমিনিয়ামের জন্য আলাদা দুটি স্লীভ ব্যবহার করা হয়।',
                    items: [
                        'কন্ডাক্টরের ওপর প্রথমে অ্যালুমিনিয়াম স্লীভটি ঢুকিয়ে রাখুন। এরপর ইস্পাতের স্লীভের অর্ধেক দৈর্ঘ্যের সমান দূরত্ব কন্ডাক্টরের মাথায় পরিমাপ করে চিহ্নিত করুন।',
                        'চিহ্নিত স্থানটি আঠালো টেপ দিয়ে জড়িয়ে রোটেটিং কাটিং টুল ব্যবহার করে বাইরের অ্যালুমিনিয়াম স্ট্র্যান্ডগুলো কেটে নিন; খেয়াল রাখবেন ভেতরের স্টিল কোর যেন সামান্যও কেটে না যায়।',
                        'উভয় কন্ডাক্টরের ভেতরের স্টিল কোরটি স্টিলের স্লীভের দুই প্রান্তে ঢুকিয়ে দিন যাতে তারা মাঝখানের স্টপারের সাথে শক্তভাবে লেগে থাকে।',
                        'কম্প্রেশন টুলের সঠিক ডাই (die) নির্বাচন করে স্টিলের স্লীভটি মাঝে বসান এবং একদম কেন্দ্রস্থল থেকে শুরু করে দুই পাশের প্রান্তে ধাপে ধাপে কম্প্রেশন বা প্রেস সম্পন্ন করুন।',
                        'এবার অ্যালুমিনিয়াম স্লীভটি স্টিল স্লীভের ওপর টেনে এনে ঢেকে দিন। ছিদ্র দিয়ে ফিলার কম্পাউন্ড ইনজেক্ট করুন (মরিচা ও বাতাস প্রতিরোধ করতে) এবং কম্প্রেশন ডাই বদলে দুই দিক থেকে অ্যালুমিনিয়াম স্লীভটি চ্যাপ্টা বা প্রেস করে দিন।'
                    ]
                },
                {
                    title: 'F — জাম্পারিং ব্যবস্থা',
                    image: '/images/conductor_jointing/fig_4_41_jumpering.png',
                    caption: 'চিত্র ৫: পি.জি. ক্ল্যাম্প (P.G. Clamp) ব্যবহার করে জাম্পার সংযোগের চিত্র।',
                    items: [
                        'জাম্পারিং হলো দুটি কন্ডাক্টরের মধ্যে বিদ্যুৎ সংযোগের ব্রিজ। জাম্পার তারকে কখনো সরাসরি প্রধান লাইনের সাথে পেঁচাবেন না, সর্বদা প্যারালাল গ্রুপ (P.G.) ক্ল্যাম্প ব্যবহার করে সংযোগ করুন।',
                        'জাম্পার তার কোনো মেটাল ক্রস-আর্ম বা পোলের লোহার অংশের কাছাকাছি দিয়ে গেলে শর্ট সার্কিট এড়াতে তাকে অ্যালকাথিন পাইপ দিয়ে ঢেকে দিন।',
                        'নিশ্চিত করুন যেন যেকোনো মিড-স্প্যান জয়েন্ট পোল থেকে কমপক্ষে ৪০ ফুট (১২ মিটার) দূরে স্থাপন করা হয়।'
                    ]
                }
            ],
            safety: [
                'যেকোনো জয়েন্টিংয়ের কাজ শুরু করার আগে বিদ্যুৎ লাইন সম্পূর্ণরূপে বন্ধ করে লকআউট এবং ট্যাগআউট (LOTO) নিশ্চিত করুন।',
                'অ্যালুমিনিয়াম স্তর কাটার সময় ভেতরের স্টিল কোরে যেন দাগ বা স্ক্র্যাচ না পড়ে; স্ক্র্যাচ পড়লে তারের যান্ত্রিক ক্ষমতা কমে যাবে এবং লাইন ছিঁড়ে যেতে পারে।',
                'ঢিলেঢালা সংযোগ ও অতিরিক্ত গরম হওয়া (hot spots) এড়াতে পি.জি. ক্ল্যাম্প সঠিক মাপের স্প্যানার দিয়ে পুরোপুরি টাইট করুন।',
                'তার টানা বা কম্প্রেশন জয়েন্ট প্রেস করার সময় কন্ডাক্টরের ঠিক নিচে দাঁড়াবেন না।'
            ],
            practical_tips: [
                {
                    title: 'ফিলার কম্পাউন্ড ব্যবহারের আসল রহস্য',
                    text: 'কম্প্রেশন জয়েন্টে ফিলার কম্পাউন্ড দেওয়ার দুটি মূল কাজ আছে: প্রথমত, এটি অ্যালুমিনিয়ামের ওপর জমে থাকা অক্সাইড স্তর রোধ কমিয়ে দেয় এবং দ্বিতীয়ত, এটি স্লীভের ভেতরের অংশ সিল করে জল ঢুকতে বাধা দেয় যাতে স্টিলের বারেল মরিচা না পড়ে।'
                },
                {
                    title: 'সোল্ডারিং কেন অপরিহার্য?',
                    text: 'ব্রিটানিয়া ও ম্যারেড জয়েন্টে শুধুমাত্র তার পেঁচিয়ে রাখা যথেষ্ট নয়। প্যাঁচের মাঝের ফাঁকা জায়গায় বাতাস ও আর্দ্রতা জমে জং ধরে। সোল্ডারিং ফাঁকা জায়গাগুলো ভরাট করে দেয়, যা বছরের পর বছর বিদ্যুৎ পরিবাহিতা ধরে রাখে এবং সংযোগ শক্ত রাখে।'
                },
                {
                    title: '৪০ ফুট দূরত্বের নিয়ম',
                    text: 'মিড-স্প্যান জয়েন্ট সবসময় পোল থেকে কমপক্ষে ৪০ ফুট (১২ মিটার) দূরে করা উচিত। পোলের কাছাকাছি তারের ওপর কম্পন এবং যান্ত্রিক টান সবচেয়ে বেশি থাকে; পোলের কাছাকাছি জয়েন্ট থাকলে তা যান্ত্রিক চাপে ছিঁড়ে যাওয়ার আশঙ্কা থাকে।'
                }
            ],
            standard_values_title: 'কন্ডাক্টর জয়েন্টিংয়ের স্ট্যান্ডার্ড মানসমূহ',
            standard_values_headers: ['প্যারামিটার / বৈশিষ্ট্য', 'স্ট্যান্ডার্ড মান'],
            standard_values: [
                { type: 'জয়েন্টের সর্বনিম্ন যান্ত্রিক শক্তি', value: 'মূল কন্ডাক্টরের ক্ষমতার কমপক্ষে ৯৫%' }
            ]
        },
        detail_en: {
            intro: 'Since the length of distribution lines spans over kilometers, a single coil of conductor is not enough to cover the entire line length. Conductor jointing is essential for maintaining the electrical and mechanical continuity of distribution lines. In this chapter, we will learn about various types of conductor joints (Britannia, Married, T-Joint, Sleeve Joint, Compression Joint), their application areas, and jumpering methods. Always ensure the mains supply is completely isolated before beginning any work.',
            objectives: [
                'Identify different types of conductor joints and understand their application areas',
                'Learn the step-by-step procedures for preparing Britannia, Married, T-Joints, Sleeve, and Compression joints',
                'Understand the importance of maintaining mechanical strength (at least 95%) and low electrical resistance in joints',
                'Master the correct jumpering guidelines using P.G. Clamps and insulation covers'
            ],
            tools: [],
            materials: [
                'ACSR / AAC Conductors — Aluminum conductors steel reinforced / all-aluminum conductors',
                'Aluminum & Steel Sleeves — For sleeve and compression joints',
                'P.G. Clamps (Parallel Groove) — For connecting jumper wires',
                'Alkathene Pipe — For covering jumper wires near metal structures',
                'Copper Binding Wire — For Britannia joint binding',
                'Graphite Grease — For sleeve joint lubrication',
                'Filler Compound — For corrosion protection in compression joints',
                'Lubricating Wax — Solid wax for compression joint dies',
                'Solder Wire & Flux — For Britannia and Married joint soldering',
                'Adhesive Tape — For marking and holding strands'
            ],
            steps: [
                {
                    title: 'A — Britannia Joint & Western Union Joint',
                    image: '/images/conductor_jointing/fig_4_37_britannia_joint.png',
                    caption: 'Figure 1: Britannia joint construction details for solid copper wires.',
                    items: [
                        'Prepare conductors by cleaning the ends thoroughly with a wire brush or emery paper to remove rust or oxidation.',
                        'For Britannia joints (used on solid copper conductors), overlap the two conductor ends by at least 100 mm (4 inches) and bend the tips about 5 mm.',
                        'Bind the overlapped contact portion tightly with 1.4 mm copper binding wire as shown in Figure 1, and then solder the joint to ensure low electrical resistance.',
                        'For Western Union (Telephone) joints, bend solid wires at 100 mm to 125 mm from edges, place them over each other, and twist each end securely over the other conductor.'
                    ]
                },
                {
                    title: 'B — Married Joint Preparation',
                    image: '/images/conductor_jointing/fig_4_38_married_joint.png',
                    caption: 'Figure 2: Married joint setup for stranded copper wire with a central steel core.',
                    items: [
                        'Married joints are prepared between copper conductors having a central G.I. steel wire strand. Do not use this joint for aluminum conductors.',
                        'Unwind approximately 175 mm to 200 mm of the conductor strands.',
                        'Cut or break the central G.I. steel strand up to a length of 175 mm on both conductors.',
                        'Bring both conductors face-to-face and interweave their strands. Twist each strand of the first conductor over the second, and vice-versa, and finally solder them.'
                    ]
                },
                {
                    title: 'C — \'T\' Joint Preparation',
                    image: '/images/conductor_jointing/fig_4_39_t_joint.png',
                    caption: 'Figure 3: T-joint preparation and completion on stranded conductors.',
                    items: [
                        'T-joint is made with stranded conductors. Note that this joint cannot withstand mechanical tension; it is mainly used for jumpers or taps in substations.',
                        'Separate the tapping conductor strands up to 100 mm and cut the middle steel strands.',
                        'Place the tapping conductor perpendicular to the horizontal main conductor, split the strands into three on each side, and twist them firmly over the main conductor (see Figure 3).'
                    ]
                },
                {
                    title: 'D — Sleeve Joint Preparation',
                    image: '/images/conductor_jointing/fig_4_40_sleeve_joint.png',
                    caption: 'Figure 4: Sleeve joint setup twisted using jointing wrenches.',
                    items: [
                        'Sleeve joints are compatible with all types of aluminum conductors (ACSR, AAC, etc.) up to 0.06 cm² sizes.',
                        'Apply graphite grease over the bare conductor ends to clean and seal the contact surfaces.',
                        'Take two aluminum sleeves and slide them onto the conductors as shown in Figure 4.',
                        'Use a twisting wrench (jointing wrench) to twist the sleeves together, securing the physical and electrical bond.'
                    ]
                },
                {
                    title: 'E — Compression Joint Preparation',
                    note: 'Compression joints are mandatory for conductor sizes larger than 0.06 cm². This joint uses separate steel and aluminum sleeves.',
                    items: [
                        'Slide the aluminum sleeve over one conductor. Mark the conductor ends back by a distance equal to half the length of the steel sleeve.',
                        'Tape the mark and cut the outer aluminum strands with a rotating cutting tool, taking care not to nick the inner steel core.',
                        'Insert the steel core from both conductors into the steel sleeve, ensuring the ends butt solidly against the center stop.',
                        'Set the steel sleeve in the compression tool, select the correct steel die size, and compress starting from the center outwards on both sides.',
                        'Slide the aluminum sleeve over the steel sleeve until the end of the barrel aligns with the marks placed on the conductor. Inject the filler compound through holes.',
                        'Make the initial compression on either side of the splice beginning at the start mark. Continue making compressions on one side to the end. Complete the compression on the other side also. The centre portion of the splice is not compressed.'
                    ]
                },
                {
                    title: 'F — Jumpering Arrangements',
                    image: '/images/conductor_jointing/fig_4_41_jumpering.png',
                    caption: 'Figure 5: Connection of jumper using P.G. clamps.',
                    items: [
                        'Jumpering is the process of connecting two conductors. Jumpers should always be connected using Parallel Groove (P.G.) clamps rather than direct main conductor wrapping.',
                        'Cover jumpers with alkathene pipes when they pass close to metallic structures or pole portions to prevent short circuits.',
                        'Ensure mid-span joints are placed at least 40 feet (12 meters) away from the pole.'
                    ]
                }
            ],
            safety: [
                'Always isolate, lockout, and tagout (LOTO) the power supply before performing jointing work.',
                'Do not nick the inner steel core when cutting outer aluminum strands; nicking reduces the mechanical strength of the joint and may lead to snapped lines.',
                'Ensure PG clamps are tightened using the correct spanner to avoid loose connections and hot spots.',
                'Do not stand under the conductors during stringing or joint compression.'
            ],
            practical_tips: [
                {
                    title: 'Role of Filler Compound',
                    text: 'In compression joints, filler compound is injected through sleeve holes. It has two jobs: it removes oxide layers from aluminum under pressure to keep resistance low, and it seals the joint to prevent rain water from corroding the steel core.'
                },
                {
                    title: 'Soldering for Strength & Conductivity',
                    text: 'For Britannia and Married joints, wrapping alone is not enough. Soldering fills the gaps between strands, preventing corrosion from moisture and locking the wires to maintain high electrical conductivity over years.'
                },
                {
                    title: 'The 40-Feet Rule',
                    text: 'Never make a mid-span joint closer than 40 feet (12 meters) to a pole. The area near the pole experiences high mechanical stress and vibrations, and placing joints there increases the risk of mechanical joint failure.'
                }
            ],
            standard_values_title: 'Standard Reference Values',
            standard_values_headers: ['Parameter / Property', 'Standard Specification'],
            standard_values: [
                { type: 'Minimum Joint Strength', value: '95% of original conductor strength' },
                { type: 'Maximum Joint Electrical Resistance', value: 'Equal to or less than main conductor' },
                { type: 'Minimum Distance from Pole for Mid-span Joint', value: '40 feet (12 meters)' }
            ]
        }
    },
    {
        id: 'pf-04',
        code: 'PF-04',
        icon: '⚡',
        badgeClass: 'bg-rose-100 text-rose-800',
        title_en: 'Earthing — Principles & Types',
        title_bn: 'আর্থিং — মূলনীতি ও প্রকারভেদ',
        desc_en: 'Study the core principles of electrical earthing, system specifications, points to be earthed, and four major earthing systems (Strip, Rod, Pipe, and Plate earthing).',
        desc_bn: 'বৈদ্যুতিক আর্থিংয়ের মূলনীতি, বিভিন্ন প্রকার আর্থিং (স্ট্রিপ, رড, পাইপ ও প্লেট), কোন কোন অংশ আর্থ করতে হবে, আর্থ রেজিস্ট্যান্সের মান এবং মানুষের জীবন সুরক্ষার নিরাপত্তা ব্যবস্থা।',
        topics_en: ['Earthing Principles', 'Points to Earth', 'System Specifications', 'Four Earthing Types'],
        topics_bn: ['আর্থিংয়ের মূলনীতি', 'কোন অংশ আর্থ করব', 'সিস্টেম স্পেসিফিকেশন', 'চার প্রকার আর্থিং'],
        duration_en: '12 min read',
        duration_bn: '১২ মিনিট পড়া',
        detail_bn: {
            intro: 'বৈদ্যুতিক নিরাপত্তা ব্যবস্থার অন্যতম গুরুত্বপূর্ণ অংশ হলো আর্থিং। কন্ডাক্টরের ইনসুলেশন নষ্ট হলে বা কোনো কারণে মেটাল বডিতে বিদ্যুৎ সংযোগ ঘটলে তা ব্যবহারকারী বা লাইন কর্মীকে ভয়াবহ শক দিতে পারে। আর্থিংয়ের মাধ্যমে লিক হওয়া অতিরিক্ত বিদ্যুৎ নিরাপদে মাটিতে পাঠিয়ে দেওয়া সম্ভব হয়। এই অধ্যায় আমরা ডিস্ট্রিবিউশন সিস্টেমে এবং বাড়িঘরে ব্যবহৃত আর্থিংয়ের মূলনীতি, আর্থ রেজিস্ট্যান্সের অনুমোদিত সীমা, কোন কোন অংশ আর্থ করা আবশ্যক এবং চার প্রকারের প্রধান আর্থিং ব্যবস্থার নকশা ও বৈশিষ্ট্য সম্পর্কে বিস্তারিত আলোচনা করবো।',
            objectives: [
                'আর্থিংয়ের ধারণা এবং এটি কীভাবে মানবদেহকে বৈদ্যুতিক শক থেকে রক্ষা করে তা বোঝা',
                'আদর্শ আর্থিং স্পেসিফিকেশন (বিল্ডিং থেকে দূরত্ব, আর্থ তারের সাইজ, রেজিস্ট্যান্স সীমা) শেখা',
                'একটি ডিস্ট্রিবিউশন সিস্টেমে এবং বাড়িঘরে কোন কোন ধাতব অংশ আর্থ করা বাধ্যতামূলক তা সনাক্ত করা',
                'চার প্রকার প্রধান আর্থিং ব্যবস্থার তুলনা করা: স্ট্রিপ, রড, পাইপ এবং প্লেট আর্থিং',
                'বহুল ব্যবহৃত পাইপ আর্থিং ও প্লেট আর্থিংয়ের বিশদ নকশা ও সুবিধা বিশ্লেষণ করা'
            ],
            tools: [],
            materials: [
                'G.I. পাইপ (৩৮ মিমি ব্যাস, ২.৫ মিটার লম্বা) — পাইপ আর্থ ইলেকট্রোডের জন্য',
                'G.I. প্লেট / কপার প্লেট — ৬০ সেমি × ৬০ সেমি (জিআই হলে ৮.৩০ মিমি, কপার হলে ৩.১৫ মিমি পুরু)',
                'আর্থ পরিবাহী তার (১৪ SWG বা ২.৯ বর্গমিমি) — ইলেকট্রোডের একই উপাদানের তৈরি হতে হবে',
                'কয়লা ও খাবার লবণ — আর্দ্রতা বজায় রাখতে পিটের ভেতরের স্তরের জন্য',
                'কাস্ট আয়রন বক্স ও কভার (৩০ সেমি × ৩০ সেমি) — চেম্বার পরিদর্শনের জন্য',
                'জল ঢালার ফানেল ও তারের জালি — পিটের ভেতরে জল দেওয়ার জন্য',
                'জিআই/কপার নাট-বোল্ট ও ওয়াশার — প্লেটের সাথে তার সংযোগ মজবুত করার জন্য',
                'G.I. স্ট্রিপ (২৫ মিমি × ৪ মিমি) বা কপার স্ট্রিপ (২৫ মিমি × ১.৬ মিমি) — স্ট্রিপ আর্থিংয়ের জন্য',
                'সলিড কপার রড (১২.৫ মিমি ব্যাস) বা জি.আই. রড (১৬ মিমি ব্যাস) — রড আর্থিংয়ের জন্য'
            ],
            steps: [
                {
                    title: 'ধাপ ১ — সঠিক আর্থিংয়ের মূলনীতি ও নিরাপত্তা',
                    image: '/images/earthing/fig_1_35_proper_earthing.png',
                    caption: 'চিত্র ১: কন্ডাক্টরের ইনসুলেশন নষ্ট হলে মানুষের শরীর সুরক্ষিত রাখতে প্রপার আর্থিং সংযোগ।',
                    items: [
                        'আর্থিং বলতে বোঝায় বৈদ্যুতিক যন্ত্রপাতির বিদ্যুৎ-পরিবহনহীন ধাতব অংশকে আর্থ ইলেকট্রোডের মাধ্যমে মাটির সাথে সংযুক্ত করা।',
                        'যখন কোনো যন্ত্রের ভেতরের ইনসুলেশন নষ্ট হয়, তখন লিক হওয়া কারেন্ট মাটির জিরো পটেনশিয়ালের কারণে সরাসরি মাটিতে চলে যায়।',
                        'যদি ফল্ট কারেন্টের মান ফিউজের ক্ষমতার চেয়ে বেশি হয়, তবে ফিউজ সাথে সাথে গলে যায় অথবা MCB ট্রিপ করে ত্রুটিযুক্ত যন্ত্রটিকে লাইন থেকে বিচ্ছিন্ন করে দেয় (চিত্র ১ অনুযায়ী)।',
                        'স্পেসিফিকেশন: আর্থ পিটের অবস্থান অবশ্যই ভবন বা বিল্ডিংয়ের ফাউন্ডেশন থেকে কমপক্ষে ১.৫ মিটার দূরে হতে হবে। আর্থ তারের সাইজ ১৪ SWG (২.৯ বর্গমিমি) এর কম হওয়া যাবে না।'
                    ]
                },
                {
                    title: 'ধাপ ২ — যেসব অংশ আর্থ করা বাধ্যতামূলক ও গুরুত্ব',
                    note: 'আর্থিং করার মূল উদ্দেশ্য মানুষের জীবন বাঁচানো। আর্থ তারের রোধ মানুষের শরীরের রোধের চেয়ে অনেক কম হওয়ায় কারেন্ট মানুষের শরীরের ভেতর দিয়ে না গিয়ে সরাসরি আর্থিং তার দিয়ে মাটিতে চলে যায়।',
                    items: [
                        'যেসব অংশ আর্থ করা বাধ্যতামূলক: ৩-পিন ও ৫-পিন প্লাগ-সকেটের আর্থ পিন, মোটরের ধাতব বডি, হিটার, গিজার ও মিক্সারের ধাতব বডি, ৩-ফেজ ৪-তার লাইনের নিউট্রাল কন্ডাক্টর, ওভারহেড লাইনের পোল, টাওয়ার এবং ক্যাবলের আর্মার ও টানা তার (Stay wire)।',
                        'আর্থিংয়ের গুরুত্ব: মানুষের শরীরকে কারেন্ট লিক হওয়ার মারাত্মক শক থেকে বাঁচানো, থ্রি-ফেজ সিস্টেমে লাইন ভোল্টেজ ধ্রুবক রাখা, বড় জেনারেটর/মোটর রক্ষা করা এবং বজ্রপাতের হাত থেকে ভবন ও ইলেকট্রিক ইনস্টলেশন সুরক্ষিত রাখা।'
                    ]
                },
                {
                    title: 'ধাপ ৩ — চার প্রকার প্রধান আর্থিং ব্যবস্থা',
                    items: [
                        '১. স্ট্রিপ আর্থিং: ২৫ মিমি × ৪ মিমি সাইজের জি.আই. স্ট্রিপ অথবা ২৫ মিমি × ১.৬ মিমি কপার স্ট্রিপ মাটির নিচে কমপক্ষে ০.৫ মিটার গভীরতায় অনুভূমিকভাবে বিছিয়ে কয়লা ও লবণ দিয়ে ঢেকে দেওয়া হয়। দীর্ঘ দূরত্বের লাইনের জন্য এটি উপযোগী।',
                        '২. রড আর্থিং: ১২.৫ মিমি ব্যাসের সলিড কপার রড অথবা ১৬ মিমি ব্যাসের জি.আই. রড মাটির নিচে কমপক্ষে ২.৫ মিটার গভীরে খাড়াভাবে পুঁতে দেওয়া হয়। বেলে মাটির জন্য এটি বেশি উপযোগী এবং এতে গর্ত খোড়া লাগে না।',
                        '৩. পাইপ আর্থিং: ফাঁপা জি.আই. পাইপ মাটির নিচে খাড়াভাবে বসানো হয় এবং তার চারপাশ কয়লা ও লবণ দিয়ে ভরাট করা হয়। এটি সাশ্রয়ী এবং অত্যন্ত নির্ভরযোগ্য।',
                        '৪. প্লেট আর্থিং: কপার প্লেট (৩.১৮ মিমি পুরু) অথবা জি.আই. প্লেট (৬.৩৫ মিমি পুরু) মাটির নিচে কমপক্ষে ৩ মিটার গভীর পিটে খাড়াভাবে পুঁতে রাখা হয়।'
                    ]
                },
                {
                    title: 'ধাপ ৪ — পাইপ আর্থিং প্রস্তুতকরণ পদ্ধতি',
                    image: '/images/earthing/fig_1_36_pipe_earthing.png',
                    caption: 'চিত্র ২: মাটির নিচে ফাঁপা জি.আই. পাইপ এবং কয়লা-লবণের স্তরের স্ট্যান্ডার্ড নকশা।',
                    items: [
                        'পাইপ আর্থিং আবাসিক ভবন এবং মাঝারি শিল্প কারখানায় বহুল ব্যবহৃত একটি আর্থিং পদ্ধতি।',
                        'একটি ৩৮ মিমি ব্যাস ও ২.৫ মিটার লম্বা জি.আই. পাইপকে মাটির নিচে খাড়াভাবে বসানো হয় (চিত্র ২)। পাইপের চারপাশে পর্যায়ক্রমে কয়লা ও লবণের স্তর দেওয়া হয় যাতে মাটির রেজিস্ট্যান্স সর্বনিম্ন রাখা যায়।',
                        'আর্থ তারের সংযোগটি পাইপের উপরিভাগে মাটির ওপরে একটি পরিদর্শন চেম্বারে শক্ত নাট-বোল্ট দিয়ে আটকানো থাকে। এতে কন্ডাক্টরের ধারাবাহিকতা পরীক্ষা করা সহজ হয়।',
                        'পাইপের মাথায় তারের জালি দেওয়া ফানেল থাকে যা দিয়ে শুষ্ক মরসুমে মাটি ভিজিয়ে রাখার জন্য ২-৩ বালতি জল ঢালা যায়।'
                    ]
                },
                {
                    title: 'ধাপ ৫ — প্লেট আর্থিং প্রস্তুতকরণ পদ্ধতি',
                    image: '/images/earthing/fig_1_37_plate_earthing.png',
                    caption: 'চিত্র ৩: কপার/জিআই প্লেট এবং তার চারপাশের ১৫ সেমি কয়লা-লবণের অল্টারনেট স্তরের নকশা।',
                    items: [
                        'প্লেট আর্থিং সাবস্টেশন এবং বড় বাণিজ্যিক ভবনের মেইন প্যানেল বোর্ডে উচ্চ সুরক্ষার জন্য ব্যবহৃত হয়।',
                        'একটি কপার প্লেট (৬০০ মিমি × ৬০০০ মিমি × ৩.১৫ মিমি) অথবা জি.আই. প্লেট (৬০০ মিমি × ৬০০০ মিমি × ৮.৩০ মিমি) মাটির নিচে ৩ মিটারেরও বেশি গভীরতার গর্তে খাড়াভাবে পুঁতে রাখা হয়।',
                        'প্লেটের চারপাশ কমপক্ষে ১৫ সেমি পুরুত্বের (মোট ৪৬ সেমি) কয়লা ও লবণের স্তর দিয়ে ঘিরে রাখা হয় যাতে তা আর্দ্রতা শোষণ করে কন্ডাকটিভিটি বজায় রাখে।',
                        'প্লেট ও তার যেন একই উপাদানের হয় (যেমন: কপার প্লেট হলে কপার তার) তা নিশ্চিত করে নাট-বোল্ট দিয়ে সংযোগ শক্ত করে আটকানো হয়। মাটির ওপরে ৩০ সেমি × ৩০ সেমি পরিদর্শন বক্স কাস্ট আয়রন কভার দিয়ে ঢাকা থাকে।'
                    ]
                }
            ],
            safety: [
                'মরিচা বা গ্যালভানিক ক্ষয় এড়াতে আর্থ ইলেকট্রোড এবং আর্থ তার যেন অবশ্যই একই ধাতুর তৈরি হয় তা নিশ্চিত করুন।',
                'আর্থ রেজিস্ট্যান্সের অনুমোদিত সীমা যেন অতিক্রম না করে তা নিয়মিত পরীক্ষা করুন (বসতবাড়িতে সর্বোচ্চ ৫.০ থেকে ৮.০ ওহম, সাবস্টেশনে সর্বোচ্চ ২.০ ওহম)।',
                'আর্থ পিট পরীক্ষা বা রক্ষণাবেক্ষণের আগে সংশ্লিষ্ট বৈদ্যুতিক সরঞ্জাম বন্ধ করে লক করুন।',
                'বৈদ্যুতিক আর্থিংয়ের জন্য কখনোই বাড়ির জল সরবরাহ লাইন বা গ্যাস পাইপ ব্যবহার করবেন না; এতে বড় ধরনের শকের দুর্ঘটনা ঘটতে পারে।'
            ],
            practical_tips: [
                {
                    title: 'একই ধাতুর তার ব্যবহারের কারণ',
                    text: 'ইলেকট্রোড এবং আর্থ লিড তার সবসময় একই ধাতুর হতে হবে। কপার প্লেটের সাথে জি.আই. তার যুক্ত করলে মাটির নিচে বিক্রিয়া হয়ে দ্রুত মরিচা ধরে সংযোগ বিচ্ছিন্ন হয়ে যাবে।'
                },
                {
                    title: 'কেন স্তরে স্তরে কয়লা-লবণ দেওয়া হয়?',
                    text: 'পর্যায়ক্রমে কয়লা ও লবণের স্তর ইলেকট্রোডের চারপাশে একটি পরিবাহী আর্দ্র পরিবেশ তৈরি করে। লবণ মাটি থেকে আর্দ্রতা টেনে এনে আয়ন তৈরি করে এবং কয়লা স্পঞ্জের মতো জল ধরে রাখে, ফলে রেজিস্ট্যান্স বছরজুড়ে কম থাকে।'
                },
                {
                    title: 'ইলেক্ট্রোম্যাগনেটিক নয়েজ কমানো',
                    text: 'শক থেকে বাঁচানো ছাড়াও, আর্থিং টেলিকমিউনিকেশন টাওয়ার ও সার্ভার ক্যাবিনেটে ইলেক্ট্রোম্যাগনেটিক ইন্টারফারেন্স (EMI) ও নয়েজ দূর করে সংকেত বা সিগন্যাল স্পষ্ট রাখতে সাহায্য করে।'
                }
            ],
            standard_values: [
                { type: 'বৃহৎ বিদ্যুৎ কেন্দ্রের আর্থ রেজিস্ট্যান্স', value: '০.৫ ওহম' },
                { type: 'প্রধান সাব-স্টেশনের আর্থ রেজিস্ট্যান্স', value: '১.০ ওহম' },
                { type: 'ছোট সাব-স্টেশনের আর্থ রেজিস্ট্যান্স', value: '২.০ ওহম' },
                { type: 'সাধারণ বাড়িঘরের আর্থ রেজিস্ট্যান্স', value: '৫.০ থেকে ৮.০ ওহম' },
                { type: 'বিল্ডিং বা দেওয়াল থেকে আর্থ পিটের দূরত্ব', value: '১.৫ মিটারের বেশি' },
                { type: 'আর্থ ইলেকট্রোড তারের ন্যূনতম সাইজ', value: '১৪ SWG (২.৯ বর্গমিমি)' },
                { type: 'জিআই প্লেটের মাপ (ক্লাস ১১ ম্যানুয়াল)', value: '৬০০ মিমি × ৬০০ মিমি × ৮.৩০ মিমি' },
                { type: 'কপার প্লেটের মাপ (ক্লাস ১১ ম্যানুয়াল)', value: '৬০০ মিমি × ৬০০ মিমি × ৩.১৫ মিমি' }
            ]
        },
        detail_en: {
            intro: 'Earthing is a critical component of electrical safety systems. If power equipment insulation fails and leakage occurs on its metallic frame, it presents severe shock hazards to personnel. Earthing safely discharges this dangerous energy into the ground. In this chapter, we discuss the core principles of electrical earthing, the standard specifications, points that require mandatory earthing, and the specific layouts and characteristics of four main earthing systems (Strip, Rod, Pipe, and Plate earthing).',
            objectives: [
                'Understand the concept of earthing and how it saves human lives from electric shock',
                'Learn the standard specifications (distance from building, size of wire, resistance limits)',
                'Identify all key points in a distribution system and household that must be earthed',
                'Compare the four main types of earthing: Strip, Rod, Pipe, and Plate earthing',
                'Analyze the specifications and advantages of Pipe Earthing and Plate Earthing systems'
            ],
            tools: [],
            materials: [
                'G.I. Pipe (38 mm dia, 2.5 m long) — Hollow pipe earth electrode',
                'G.I. Plate / Copper Plate — 60 cm x 60 cm (8.3 mm thick for GI, 3.15 mm for Copper)',
                'Earth Wire (14 SWG or 2.9 mm² GI/Copper) — Matches electrode material',
                'Charcoal & Common Salt — Alternating moisture-retention layers',
                'Cast Iron Box & Cover (30 cm x 30 cm) — For chamber inspection',
                'Watering Funnel with Mesh — To pour water into the pit',
                'G.I. / Copper Bolts & Washers — For secure wire-to-plate connection',
                'G.I. Strip (25 mm x 4 mm) or Copper Strip (25 mm x 1.6 mm) — For strip earthing',
                'Solid Copper Rod (12.5 mm dia) or G.I. Rod (16 mm dia) — For rod earthing'
            ],
            steps: [
                {
                    title: 'Step 1 — Principles of Proper Earthing',
                    image: '/images/earthing/fig_1_35_proper_earthing.png',
                    caption: 'Figure 1: Proper earthing paths protecting users from shock during insulation failure.',
                    items: [
                        'Earthing connects the non-current carrying metallic parts of electrical equipment to the earth using a good conductor (earth electrode).',
                        'When an insulation fault occurs, the leakage current is discharged directly into the ground due to the earth\'s zero potential.',
                        'If the fault current exceeds the fuse limit, the fuse blows or the MCB trips immediately, isolating the faulty appliance (see Figure 1).',
                        'Specifications: Locate the earth pit more than 1.5 meters from the building foundation. Ensure the earth wire size is at least 14 SWG (2.9 mm²).'
                    ]
                },
                {
                    title: 'Step 2 — Points to Earth & Importance of Shock Prevention',
                    note: 'The primary goal of earthing is to protect human lives. Because the resistance of the earth path is far lower than the human body, the fault current flows directly through the earth lead instead of the human body.',
                    items: [
                        'Mandatory points to earth include the earth pin of 3-pin/5-pin plugs, appliance metallic frames (geysers, heaters, motors, mixers), neutral conductors of 3-phase lines, overhead line poles, towers, cable armouring, and stay wires.',
                        'Importance: Saves human life from shock hazards, maintains line voltage constant in 3-phase systems, protects large machines, and shields buildings from atmospheric lightning arcs.'
                    ]
                },
                {
                    title: 'Step 3 — Four Types of Earthing Systems',
                    items: [
                        '1. Strip Earthing: Galvanized Iron (GI) strips (25mm x 4mm) or copper strips (25mm x 1.6mm) are laid horizontally in trenches at a minimum depth of 0.5 meters, surrounded by charcoal and salt. Ideal for long-distance lines.',
                        '2. Rod Earthing: A solid copper rod (12.5mm dia) or GI rod (16mm dia) is driven vertically into the ground to a depth of at least 2.5 meters. Suitable for sandy soil with minimal excavation.',
                        '3. Pipe Earthing: A hollow GI pipe of 38 mm diameter and 2.5 meters length is placed vertically underground, covered with charcoal and salt. A cheap and reliable system.',
                        '4. Plate Earthing: A copper plate (60cm x 60cm x 3.18mm) or GI plate (60cm x 60cm x 6.35mm) is buried vertically in an earth pit at least 3 meters deep.'
                    ]
                },
                {
                    title: 'Step 4 — Pipe Earthing Construction',
                    image: '/images/earthing/fig_1_36_pipe_earthing.png',
                    caption: 'Figure 2: Layout details of a standard GI Pipe Earthing system.',
                    items: [
                        'Pipe earthing is widely used in residential and industrial wiring systems due to its reliability and low cost.',
                        'A 38 mm diameter, 2.5 m long GI pipe is buried vertically in the ground (Figure 2). The pit around the pipe is filled with alternate layers of salt and charcoal to reduce earth resistance.',
                        'The connection of the earth wire to the top section of the GI pipe is made above ground level inside a concrete chamber, making inspection easy.',
                        'A funnel covered with a wire mesh is fitted on top of the pipe to allow pouring 2 to 3 buckets of water during summer to keep the soil moist.'
                    ]
                },
                {
                    title: 'Step 5 — Plate Earthing Construction',
                    image: '/images/earthing/fig_1_37_plate_earthing.png',
                    caption: 'Figure 3: Layout details of a standard Plate Earthing system showing plate dimensions and layering.',
                    items: [
                        'Plate earthing is preferred for small buildings and installations where high safety and low resistance are needed.',
                        'A plate of copper (600 mm x 600 mm x 3.15 mm) or GI (600 mm x 600 mm x 8.30 mm) is buried vertically at a depth of more than 3 meters (Figure 3).',
                        'The plate is surrounded by coke/charcoal and common salt in layers of at least 15 cm (46 cm total thickness) to enhance moisture absorption.',
                        'The earth wire must be of the same material as the plate (copper wire to copper plate, GI wire to GI plate) and securely bolted with washers.',
                        'A maintenance and testing pit of size 30 cm x 30 cm is built at the surface with a cast iron cover for periodic inspection.'
                    ]
                }
            ],
            safety: [
                'Ensure the earth electrode and the earth wire are of the same metal to avoid galvanic corrosion, which degrades electrical connectivity.',
                'Do not exceed the maximum earth resistance limits (domestic: 5.0 to 8.0 ohms, substations: < 2.0 ohms).',
                'Isolate power equipment and discharge any residual capacitance before working near or testing earth pits.',
                'Never use a water supply pipe or gas line as an earth electrode; this can cause severe shock hazards to other residents.'
            ],
            practical_tips: [
                {
                    title: 'Reason for Using Same Metal Wire',
                    text: 'The electrode and the earth lead wire must always be made of the same metal. Connecting a G.I. wire to a copper plate will cause galvanic corrosion underground, resulting in rapid degradation and connection failure.'
                },
                {
                    title: 'Why Alternating Charcoal-Salt Layers?',
                    text: 'Alternating layers of charcoal and salt create a conductive, moist environment around the electrode. Salt absorbs moisture from the soil to create ions, while charcoal acts like a sponge to retain water, keeping resistance low year-round.'
                },
                {
                    title: 'Reducing Electromagnetic Noise',
                    text: 'In addition to shock protection, earthing eliminates electromagnetic interference (EMI) and noise in telecommunication towers and server cabinets, keeping signals clear.'
                }
            ],
            standard_values: [
                { type: 'Large Power Station Earth Resistance', value: '0.5 Ohm' },
                { type: 'Major Power Station Earth Resistance', value: '1.0 Ohm' },
                { type: 'Small Sub-Station Earth Resistance', value: '2.0 Ohm' },
                { type: 'Domestic House Wiring Earth Resistance', value: '5.0 to 8.0 Ohm' },
                { type: 'Minimum Distance of Earth Pit from Building', value: '1.5 meters' },
                { type: 'Minimum Size of Earth Electrode Wire', value: '14 SWG (2.9 mm²)' },
                { type: 'GI Earthing Plate Size (Class XI Manual)', value: '600 mm x 600 mm x 8.30 mm' },
                { type: 'Copper Earthing Plate Size (Class XI Manual)', value: '600 mm x 600 mm x 3.15 mm' }
            ]
        }
    }
];
