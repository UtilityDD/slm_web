import React, { useState, useEffect } from 'react';

const CommunitySkeleton = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-pulse">
        {/* Header Skeleton */}
        <div className="mb-6">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2 shimmer"></div>
            <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800 rounded shimmer"></div>
        </div>

        {/* Banner Skeleton */}
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8 shimmer"></div>

        {/* List Skeleton */}
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shimmer"></div>
            ))}
        </div>
    </div>
);

export default function Community({ language = 'en', setCurrentView }) {
    const [loading, setLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const t = {
        en: {
            title: "Community",
            subtitle: "Connect with fellow linemen",
            banner: {
                title: "Share & Learn",
                subtitle: "Help others grow and win rewards"
            },
            comingSoon: "Coming Soon!",
            cards: {
                facebook: {
                    title: "Facebook Group",
                    desc: "Join our official discussion group",
                    action: "Join"
                },
                whatsapp: {
                    title: "WhatsApp Alerts",
                    desc: "Get real-time safety updates",
                    action: "Join"
                },
                youtube: {
                    title: "Training Videos",
                    desc: "Watch tutorials & safety guides",
                    action: "Watch"
                }
            },
            footer: "Official SmartLineman Channels"
        },
        bn: {
            title: "কমিউনিটি",
            subtitle: "সহকর্মী লাইনম্যানদের সাথে যুক্ত হন",
            banner: {
                title: "শেয়ার করুন ও শিখুন",
                subtitle: "অন্যদের সাহায্য করুন এবং পুরস্কার জিতুন"
            },
            comingSoon: "শীঘ্রই আসছে!",
            cards: {
                facebook: {
                    title: "ফেসবুক গ্রুপ",
                    desc: "মতামত ও অভিজ্ঞতা শেয়ার করুন",
                    action: "যোগ দিন"
                },
                whatsapp: {
                    title: "হোয়াটসঅ্যাপ গ্রুপ",
                    desc: "সমস্যা সঙ্গে সঙ্গে জানান",
                    action: "যোগ দিন"
                },
                youtube: {
                    title: "ট্রেনিং ভিডিও",
                    desc: "আপনারই কোন সহকর্মীর তৈরি ট্রেনিং ভিডিও!",
                    action: "দেখুন"
                }
            },
            footer: "অফিসিয়াল স্মার্টলাইনম্যান চ্যানেল"
        }
    }[language];

    const cards = [
        {
            id: 'facebook',
            icon: (
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
            ),
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            data: t.cards.facebook
        },
        {
            id: 'whatsapp',
            icon: (
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            ),
            bg: 'bg-green-50 dark:bg-green-900/20',
            data: t.cards.whatsapp
        },
        {
            id: 'youtube',
            icon: (
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            ),
            bg: 'bg-red-50 dark:bg-red-900/20',
            data: t.cards.youtube
        }
    ];

    if (loading) return <CommunitySkeleton />;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 md:mb-6 animate-fade-in transition-all duration-500">
            {/* Minimal Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        {t.title}
                    </h1>
                </div>

                <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 font-bold text-sm`}>
                    <span className="text-lg">🤝</span>
                    {language === 'en' ? 'Community Mode' : 'কমিউনিটি মোড'}
                </div>
            </div>

            {/* Subdued Banner */}
            <div className="mb-10">
                <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-5 sm:p-6 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                        💡
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t.banner.title}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t.banner.subtitle}</p>
                    </div>
                </div>
            </div>

            {/* List of Channels */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((card) => (
                    <div
                        key={card.id}
                        onClick={() => {
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 2000);
                        }}
                        className="group bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                                {card.icon}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{card.data.title}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{card.data.desc}</p>
                            </div>
                        </div>
                        <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {card.data.action}
                        </div>
                    </div>
                ))}
            </div>

            {/* Toast */}
            {showToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-full shadow-xl z-50 animate-toast-in flex items-center gap-2">
                    <span className="text-sm font-bold">{t.comingSoon}</span>
                </div>
            )}

            {/* Minimal Footer */}
            <div className="mt-12 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">
                    {t.footer}
                </p>
            </div>
        </div>
    );
}
