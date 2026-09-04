import React, { useState } from 'react';
import GeneralGuide from './GeneralGuide';
import SafetyHelp from './SafetyHelp';
import DatabookManager from './DatabookManager';

/**
 * Suraksha Sathi shell:
 *  - General Guide: the classic 7-step pre/during/post-work safety wizard.
 *  - Safety Help: emergency safety guidance.
 *  - Edit Data Book: lineman contacts & sub-station numbers.
 */
export default function SafetyAssistant({ language = 'bn', onClose }) {
    const [mode, setMode] = useState(null); // null | guide | help | databook

    const t = (en, bn) => (language === 'bn' ? bn : en);

    const goHome = () => setMode(null);

    if (mode === 'guide') {
        return <GeneralGuide language={language} onClose={goHome} />;
    }
    if (mode === 'help') {
        return <SafetyHelp language={language} onClose={goHome} />;
    }
    if (mode === 'databook') {
        return <DatabookManager language={language} onClose={goHome} />;
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <header className="pt-[env(safe-area-inset-top)] pb-6 px-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg shrink-0">
                <div className="flex items-center gap-3 mt-2">
                    <button onClick={onClose} className="p-2 -ml-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-black tracking-tight">{t('Suraksha Sathi', 'সুরক্ষা সাথী')}</h1>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{t('Your Safety Companion', 'আপনার সুরক্ষা সাথী')}</p>
                    </div>
                    <button
                        onClick={() => setMode('help')}
                        className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-lg font-black active:scale-95 transition-transform shrink-0"
                        aria-label={t('Help', 'সাহায্য')}
                    >
                        ?
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="min-h-full flex flex-col justify-center gap-5 max-w-md mx-auto w-full">
                    <button
                        onClick={() => setMode('guide')}
                        className="w-full flex-1 min-h-[36vh] rounded-[2.5rem] bg-gradient-to-br from-orange-600 to-orange-500 text-white shadow-xl shadow-orange-600/25 active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-4 p-6"
                    >
                        <span className="text-7xl sm:text-8xl">🤝</span>
                        <div className="text-center">
                            <span className="text-2xl sm:text-3xl font-black tracking-tight block">{t('General Safety Guide', 'সাধারণ সুরক্ষা গাইড')}</span>
                            <span className="text-sm font-semibold text-white/80 block mt-1">{t('7-Step Field Safety Protocol', '৭-ধাপের ফিল্ড সুরক্ষা নিয়মাবলী')}</span>
                        </div>
                    </button>

                    <button
                        onClick={() => setMode('databook')}
                        className="w-full py-4 px-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-black text-base text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        <span>📒</span>
                        <span>{t('Sub-station & Team Data Book', 'সাব-স্টেশন ও টিম ডেটা বুক')}</span>
                    </button>
                </div>
            </main>
        </div>
    );
}
