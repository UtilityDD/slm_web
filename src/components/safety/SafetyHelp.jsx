import React, { useState } from 'react';

const PAGES = [
    {
        icon: '🤝',
        title: { en: 'Suraksha Sathi', bn: 'সুরক্ষা সাথী' },
        line: { en: 'Your safety companion at work.', bn: 'কাজের সময় আপনার সুরক্ষা সাথী।' },
    },
    {
        icon: '✅',
        title: { en: 'General Guide', bn: 'সাধারণ গাইড' },
        line: { en: 'Daily safety checklist — gear, isolation, work, finish.', bn: 'দৈনন্দিন সুরক্ষা — সরঞ্জাম, আইসোলেশন, কাজ, শেষ চেক।' },
    },
    {
        icon: '👷',
        title: { en: 'Lineman', bn: 'লাইনম্যান' },
        line: { en: 'Shutdown with operator — tap SS, feeder, work, go.', bn: 'অপারেটরের সাথে শাটডাউন — সাবস্টেশন, ফিডার, কাজ বেছে শুরু।' },
    },
    {
        icon: '📋',
        title: { en: 'The steps', bn: 'ধাপগুলো' },
        line: {
            en: 'Request → Confirm isolated → Earth → Brief crew → Work → Clear → Re-energize',
            bn: 'অনুরোধ → আইসোলেট → আর্থিং → ব্রিফ → কাজ → পরিষ্কার → চালু',
        },
    },
    {
        icon: '📴',
        title: { en: 'Works offline', bn: 'ইন্টারনেট ছাড়াই' },
        line: { en: 'SMS and call. Voice guides you each step.', bn: 'এসএমএস ও ফোন। প্রতিটি ধাপে ভয়েস গাইড।' },
    },
    {
        icon: '🏢',
        title: { en: 'Operator too', bn: 'অপারেটরও' },
        line: { en: 'Operator taps link in SMS to confirm — or uses phone as before.', bn: 'অপারেটর এসএমএসের লিংকে নিশ্চিত — অথবা ফোনেও।' },
    },
    {
        icon: '🔐',
        title: { en: 'Work PIN', bn: 'কাজের PIN' },
        line: { en: '4-digit PIN on this phone at key steps — start, confirm, release, close.', bn: 'এই ফোনে ৪ সংখ্যার PIN — শুরু, নিশ্চিত, রিলিজ, বন্ধ ধাপে।' },
    },
    {
        icon: '⛔',
        title: { en: 'Emergency', bn: 'জরুরি' },
        line: { en: 'Red STOP WORK — calls operator instantly.', bn: 'লাল কাজ বন্ধ — তৎক্ষণাৎ অপারেটরকে ফোন।' },
    },
];

function Dots({ total, current }) {
    return (
        <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
                <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/35'}`}
                />
            ))}
        </div>
    );
}

export default function SafetyHelp({ language = 'bn', onClose }) {
    const t = (en, bn) => (language === 'bn' ? bn : en);
    const L = (o) => (o ? (o[language] || o.en || '') : '');
    const [page, setPage] = useState(0);

    const last = page === PAGES.length - 1;
    const p = PAGES[page];

    const next = () => {
        if (last) onClose();
        else setPage(page + 1);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <header className="pt-[env(safe-area-inset-top)] pb-4 px-5 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg shrink-0">
                <div className="flex items-center justify-between mt-2 gap-3">
                    <button onClick={onClose} className="p-2 -ml-2 bg-white/20 rounded-full active:scale-95 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="text-sm font-black uppercase tracking-widest text-white/80">{t('Help', 'সাহায্য')}</span>
                    <span className="w-10" />
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
                <div className="text-center space-y-6 animate-fadeIn w-full">
                    <div className="text-8xl">{p.icon}</div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{L(p.title)}</h2>
                    <p className="text-base font-bold text-slate-500 dark:text-slate-400 leading-relaxed px-4">{L(p.line)}</p>
                </div>
            </main>

            <footer className="shrink-0 p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] space-y-5">
                <Dots total={PAGES.length} current={page} />
                <div className="flex gap-3">
                    {page > 0 && (
                        <button
                            onClick={() => setPage(page - 1)}
                            className="w-24 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-sm active:scale-95 transition-transform"
                        >
                            {t('Back', 'পিছনে')}
                        </button>
                    )}
                    <button
                        onClick={next}
                        className="flex-1 py-4 rounded-2xl bg-orange-600 text-white font-black text-base active:scale-95 transition-transform"
                    >
                        {last ? t('Got it', 'বুঝেছি') : t('Next', 'পরের')}
                    </button>
                </div>
            </footer>
        </div>
    );
}
