import React from 'react';
import { loadOperatorConfirmations } from './clearanceLinks';

export default function OperatorHome({ language = 'bn', onClose, onOpenInbox }) {
    const t = (en, bn) => (language === 'bn' ? bn : en);
    const recent = loadOperatorConfirmations().slice(0, 5);

    return (
        <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <header className="pt-[env(safe-area-inset-top)] pb-6 px-5 bg-gradient-to-br from-teal-700 to-teal-600 text-white shadow-lg shrink-0">
                <div className="flex items-center gap-3 mt-2">
                    <button onClick={onClose} className="p-2 -ml-2 bg-white/20 rounded-full active:scale-95">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-black">{t('Operator', 'অপারেটর')}</h1>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{t('Substation control', 'সাবস্টেশন নিয়ন্ত্রণ প্যানেল')}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-5 max-w-md mx-auto w-full flex flex-col justify-center gap-6">
                <button
                    type="button"
                    onClick={onOpenInbox}
                    className="w-full py-6 rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-lg shadow-lg active:scale-95 transition-transform"
                >
                    📋 {t('Pending requests (online)', 'অপেক্ষমাণ অনুরোধ (অনলাইন)')}
                </button>

                <div className="text-center space-y-3">
                    <div className="text-6xl">🔗</div>
                    <p className="text-lg font-black text-slate-800 dark:text-white">{t('Or open link from SMS', 'অথবা এসএমএসের লিংক খুলুন')}</p>
                    <p className="text-sm font-bold text-slate-500 px-4">{t('Lineman can submit online or send SMS. Tap SMS link to confirm when offline.', 'লাইনম্যান অনলাইনে জমা দিতে পারেন বা এসএমএস পাঠাতে পারেন। অফলাইনে এসএমএস লিংকে ট্যাপ করে নিশ্চিত করুন।')}</p>
                </div>

                {recent.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('Recent confirmations', 'সাম্প্রতিক নিশ্চিতকরণসমূহ')}</p>
                        {recent.map((r, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <p className="font-black text-sm">{r.permitNo}</p>
                                <p className="text-[10px] font-bold text-slate-400">{new Date(r.ts).toLocaleString()} • {r.act}</p>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
