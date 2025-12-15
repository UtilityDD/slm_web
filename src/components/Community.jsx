import React from 'react';

export default function Community({ language = 'en' }) {
    const t = {
        en: {
            title: "Community Hub",
            subtitle: "By Linemen, For Linemen. Mutual learning by sharing knowledge.",
            rewards: {
                title: "Share Knowledge, Earn Prizes!",
                desc: "Post your tips, safety videos, and field experiences. The most liked and shared posts win exciting rewards every week!",
                action: "Start Sharing"
            },
            cards: {
                facebook: {
                    title: "Facebook Group",
                    desc: "Join discussions, share photos, and get community updates.",
                    action: "Join Group"
                },
                whatsapp: {
                    title: "WhatsApp Alerts",
                    desc: "Get instant real-time alerts and official announcements.",
                    action: "Join Channel"
                },
                youtube: {
                    title: "Training & Tutorials",
                    desc: "Watch video tutorials, safety guides, and event highlights.",
                    action: "Watch Videos"
                }
            },
            footer: "Official SmartLineman Community Channels"
        },
        bn: {
            title: "কমিউনিটি হাব",
            subtitle: "লাইনম্যানদের দ্বারা, লাইনম্যানদের জন্য। জ্ঞান শেয়ার করে একে অপরের থেকে শিখুন।",
            rewards: {
                title: "জ্ঞান শেয়ার করুন, পুরস্কার জিতুন!",
                desc: "আপনার টিপস, সেফটি ভিডিও এবং অভিজ্ঞতার কথা পোস্ট করুন। সবচেয়ে বেশি লাইক এবং শেয়ার করা পোস্ট প্রতি সপ্তাহে পুরস্কার জিতবে!",
                action: "শেয়ার করা শুরু করুন"
            },
            cards: {
                facebook: {
                    title: "ফেসবুক গ্রুপ",
                    desc: "আলোচনায় যোগ দিন, ছবি শেয়ার করুন এবং আপডেট পান।",
                    action: "গ্রুপে যোগ দিন"
                },
                whatsapp: {
                    title: "হোয়াটসঅ্যাপ অ্যালার্ট",
                    desc: "তাৎক্ষণিক রিয়েল-টাইম অ্যালার্ট এবং ঘোষণা পান।",
                    action: "চ্যানেলে যোগ দিন"
                },
                youtube: {
                    title: "ট্রেনিং এবং টিউটোরিয়াল",
                    desc: "ভিডিও টিউটোরিয়াল, সেফটি গাইড এবং ইভেন্ট হাইলাইট দেখুন।",
                    action: "ভিডিও দেখুন"
                }
            },
            footer: "অফিসিয়াল স্মার্টলাইনম্যান কমিউনিটি চ্যানেল"
        }
    }[language];

    const cards = [
        {
            id: 'facebook',
            icon: (
                <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
            ),
            bg: 'bg-blue-50',
            button: 'bg-blue-600 hover:bg-blue-700 text-white',
            border: 'border-blue-100',
            shadow: 'hover:shadow-blue-200',
            data: t.cards.facebook,
            link: "#"
        },
        {
            id: 'whatsapp',
            icon: (
                <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            ),
            bg: 'bg-green-50',
            button: 'bg-green-600 hover:bg-green-700 text-white',
            border: 'border-green-100',
            shadow: 'hover:shadow-green-200',
            data: t.cards.whatsapp,
            link: "#"
        },
        {
            id: 'youtube',
            icon: (
                <svg className="w-12 h-12 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            ),
            bg: 'bg-red-50',
            button: 'bg-red-600 hover:bg-red-700 text-white',
            border: 'border-red-100',
            shadow: 'hover:shadow-red-200',
            data: t.cards.youtube,
            link: "#"
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {/* Header */}
            <div className="text-center mb-12 animate-fade-in">
                <div className="inline-block p-3 rounded-2xl bg-slate-50 mb-4 shadow-sm border border-slate-100">
                    <span className="text-4xl">🌐</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                    {t.title}
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
                    {t.subtitle}
                </p>
            </div>

            {/* Rewards Banner */}
            <div className="max-w-6xl mx-auto mb-16 animate-scale-up">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                            <span className="text-5xl">🎁</span>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.rewards.title}</h2>
                            <p className="text-indigo-100 text-lg leading-relaxed max-w-2xl">
                                {t.rewards.desc}
                            </p>
                        </div>
                        <button className="px-8 py-3 bg-white text-indigo-700 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-indigo-50 transition-all transform hover:-translate-y-1">
                            {t.rewards.action}
                        </button>
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
                {cards.map((card, index) => (
                    <a
                        href={card.link}
                        key={card.id}
                        className={`group relative bg-white p-8 rounded-3xl border ${card.border} shadow-sm transition-all duration-300 transform hover:-translate-y-1 ${card.shadow} flex flex-col items-center text-center h-full animate-scale-up`}
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {/* Icon Background */}
                        <div className={`w-24 h-24 rounded-full ${card.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                            {card.icon}
                        </div>

                        {/* Content */}
                        <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-900 transition-colors">
                            {card.data.title}
                        </h3>
                        <p className="text-slate-500 mb-8 leading-relaxed flex-grow">
                            {card.data.desc}
                        </p>

                        {/* Button */}
                        <span className={`px-8 py-3 rounded-xl font-semibold shadow-md transition-all w-full md:w-auto ${card.button} flex items-center justify-center gap-2`}>
                            {card.data.action}
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </span>
                    </a>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-16 text-center text-slate-400 text-sm font-medium border-t border-slate-100 pt-8 animate-fade-in">
                {t.footer}
            </div>
        </div>
    );
}
