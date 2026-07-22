/** Single source of truth for awareness / ছিন্নভিন্ন স্বপ্ন stories (list + idle reminder). */

/** Face-focused crops for square emotional portraits (shared by cards, detail, login, idle). */
export const EMOTIONAL_IMAGE_FOCUS = {
    '/assets/emotional/lineman.webp': 'center 36%',
    '/assets/emotional/child.webp': 'center 16%',
    '/assets/emotional/wife.webp': '40% 30%',
    '/assets/emotional/mother.webp': 'center 12%',
    '/assets/emotional/eyes.webp': 'center 14%'
};

export const AWARENESS_STORIES = [
    {
        id: 'back-feeding-tragedy',
        image: '/assets/emotional/mother.webp',
        category: { en: 'Back-feeding hazard', bn: 'ব্যাক-ফিডিং বিপদ' },
        title: { en: 'The fatal invisible current', bn: 'রবিকান্তের শেষ শাটডাউন' },
        excerpt: {
            en: 'Rabikanta thought the line was dead. He did not know 11,000 V was feeding from the other side.',
            bn: 'রবিকান্ত ভেবেছিলেন লাইনটি বন্ধ। তিনি জানতেন না বিপরীত দিক থেকে ১১,০০০ ভোল্ট আসছে।'
        },
        fullContent: {
            en: "On Dec 31, 2023, Rabikanta Barman was working on an 11kV line near Balurghat. A shutdown was taken, but current was flowing from an unchecked 'back-feed' source. The moment he touched the wire, he was thrown off, breaking his spine.\n\nAfter a year of bedridden agony, he passed away. The tragedy turned into a nightmare when his wife abandoned his 60-year-old mother and two children with the insurance money.\n\nToday, his elderly mother works as a help to survive—reminding us that technically verifying a 'dead' line is a matter of life or death.",
            bn: "৩১/১২/২০২৩ তারিখে বালুরঘাটের রবিকান্ত বর্মন ১১ কেভি লাইনে কাজ করছিলেন। শাটডাউন নেওয়া হলেও 'ব্যাক-ফিডিং' সোর্স থেকে বিদ্যুৎ আসছিল। তারে হাত দেওয়া মাত্রই তিনি পোল থেকে ছিটকে পড়েন এবং মেরুদণ্ড ভেঙে যায়।\n\nএক বছর শয্যাশায়ী থাকার পর তিনি মারা যান। ট্র্যাজেডি এখানেই শেষ হয়নি—তার মৃত্যুর পর স্ত্রী বিমার টাকা নিয়ে বৃদ্ধ মা ও সন্তানদের ফেলে চলে যান।\n\nআজ শচী রাণী (৬০) অন্যের বাড়িতে কাজ করে কোনোমতে দিন কাটাচ্ছেন। সঠিক শাটডাউন যাচাই এবং ব্যাক-ফিডিং চেক করা থাকলে আজ এই পরিবারটি ধ্বংস হতো না।"
        },
        moral: {
            en: 'The line looked dead—it wasn’t. Rabikanta never walked back in; check every back-feed for the faces that wait for your return.',
            bn: 'লাইন তো বন্ধই ছিল, তবু রবিকান্ত আর বাড়ি ফিরলেন না। ব্যাক-ফিড চেক করতে ভুলবেন না, বাড়িতে মা আপনার পথ চেয়ে বসে আছেন।'
        },
        shareText: {
            en: 'A real field tragedy from Shattered Dreams.\n\nRabikanta thought the line was dead. Back-feed from the other side took his life—and left his mother and children alone.\n\nAlways prove the line dead. Someone is waiting for you at home.',
            bn: 'ছিন্নভিন্ন স্বপ্ন থেকে একটি সত্য ঘটনা।\n\nরবিকান্ত ভেবেছিলেন লাইন বন্ধ—বিপরীত দিকের ব্যাক-ফিডে তার জীবন চলে গেল। মা ও সন্তানেরা একা পড়ে গেলেন।\n\nলাইনে কাজের আগে নিশ্চিত হোন লাইন সত্যিই মৃত। বাড়িতে কেউ আপনার অপেক্ষায় আছেন।'
        }
    },
    {
        id: 'verbal-order-tragedy',
        image: '/assets/emotional/lineman.webp',
        category: { en: 'Operational error', bn: 'অপারেশনাল ভুল' },
        title: { en: 'Oral orders: a fatal trap', bn: 'মৌখিক নির্দেশের মরণফাঁদ' },
        excerpt: {
            en: 'Najimul climbed the structure on verbal orders without a formal shutdown. The line was still live.',
            bn: 'যথাযথ শাটডাউন না নিয়ে শুধু মৌখিক নির্দেশে লাইনে ওঠায় নাজিমুল ইসলাম মারাত্মক বিদ্যুৎস্পৃষ্ট হন।'
        },
        fullContent: {
            en: "On Nov 10, 2025, Najimul Islam (46) was performing maintenance on the Hatiduba 11kV feeder. Following a verbal instruction from a colleague to restore power, he scaled a DP structure without waiting for a formal shutdown from the operator. The line was still energized. He died instantly, leaving behind his wife Reba, son Rubel (19), daughter Riya (13), and elderly parents.\n\nThis tragedy teaches us that verbal orders are never a substitute for a written Permit-To-Work.\n\nAlways use discharge rods to ensure the line is dead—and never trust verbal clearance alone.",
            bn: "১০/১১/২০২৫ তারিখে নাজিমুল ইসলাম (৪৬) হাটিদুবা ১১ কেভি ফিডারের রক্ষণাবেক্ষণের কাজে নিযুক্ত ছিলেন। সহকর্মীর মৌখিক নির্দেশে পাওয়ার রিস্টোরেশনের জন্য তিনি একটি DP স্ট্রাকচারে ওঠেন। কিন্তু তিনি অপারেটরের কাছ থেকে যথাযথ শাটডাউন নেননি। লাইনে তখনও বিদ্যুৎ ছিল, ফলে ঘটনাস্থলেই তার মৃত্যু ঘটে।\n\nনাজিমুলের ১৯ বছর বয়সী ছেলে রুবেলের ভবিষ্যৎ আজ অন্ধকারে ঢাকা। সপ্তম শ্রেণীতে পড়ুয়া মেয়ে রিয়া এবং বৃদ্ধ বাবা-মায়ের দায়িত্ব নেওয়ার মতো আর কেউ রইল না। এক মুহূর্তের অসাবধানতা কয়েকটি জীবনের ভবিষ্যৎ কেড়ে নিল।\n\nসর্বদা লিখিত অনুমতি নিন এবং ডিসচার্জ রড দিয়ে নিশ্চিত হোন যে লাইনটি মৃত।"
        },
        moral: {
            en: 'A colleague’s “okay” is not clearance. Rubel and Riya’s father never came down—paper, rod, then work; someone still wants you home.',
            bn: 'শুধু মুখের কথায় ভরসা করে আর ঘরে ফেরা হলো না নাজিমুলের। পারমিট আর ডিসচার্জ রড ছাড়া লাইনে উঠবেন না, আপনার পরিবারের আপনিই সব।'
        },
        shareText: {
            en: 'A real field tragedy from Shattered Dreams.\n\nNajimul climbed on a verbal “okay.” The line was still live. His family is still waiting for a father who never came home.\n\nWritten permit. Discharge rod. Then work.',
            bn: 'ছিন্নভিন্ন স্বপ্ন থেকে একটি সত্য ঘটনা।\n\nশুধু মুখের কথায় নাজিমুল লাইনে উঠেছিলেন—লাইন তখনও জীবিত ছিল। পরিবার আজও বাবা ফিরবে বলে অপেক্ষা করে।\n\nলিখিত পারমিট। ডিসচার্জ রড। তারপর কাজ।'
        }
    }
];
