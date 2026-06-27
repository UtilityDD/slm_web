import React, { useState, useEffect } from 'react';
import GeneralGuide from './GeneralGuide';
import LineClearance from './LineClearance';
import SafetyHelp from './SafetyHelp';
import OperatorConfirm from './OperatorConfirm';
import OperatorHome from './OperatorHome';
import DatabookManager from './DatabookManager';
import { loadActivePermit } from './clearanceData';
import { parseClearanceFromHash } from './clearanceLinks';

/**
 * Suraksha Sathi shell. Lets the lineman pick between:
 *  - General Guide: the classic 7-step pre/during/post-work safety wizard.
 *  - Line Clearance (PTW): offline multi-party shutdown / clearance / re-energize
 *    protocol assistant.
 *  - Operator: confirm isolation / re-energize via app link (phone still works).
 */
export default function SafetyAssistant({ language = 'bn', onClose }) {
    const [linkPayload, setLinkPayload] = useState(() => parseClearanceFromHash());
    const [mode, setMode] = useState(() => {
        const p = parseClearanceFromHash();
        if (p?.role === 'op' && (p.act === 'req' || p.act === 'ren')) return 'operator';
        if (p?.role === 'lm') return 'clearance';
        return null;
    }); // null | guide | clearance | help | operator | databook
    const [hasActivePermit, setHasActivePermit] = useState(false);

    const t = (en, bn) => (language === 'bn' ? bn : en);

    // Re-route when user taps an SMS deep link while app is already open
    useEffect(() => {
        const onHash = () => {
            const p = parseClearanceFromHash();
            setLinkPayload(p);
            if (p?.role === 'op' && (p.act === 'req' || p.act === 'ren')) setMode('operator');
            else if (p?.role === 'lm') setMode('clearance');
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    useEffect(() => {
        if (mode === null) {
            const active = loadActivePermit();
            setHasActivePermit(!!(active && active.status === 'open'));
        }
    }, [mode]);

    const goHome = () => setMode(null);

    if (mode === 'guide') {
        return <GeneralGuide language={language} onClose={goHome} />;
    }
    if (mode === 'clearance') {
        return (
            <LineClearance
                language={language}
                onClose={goHome}
                linemanAck={linkPayload?.role === 'lm' ? linkPayload : null}
            />
        );
    }
    if (mode === 'help') {
        return <SafetyHelp language={language} onClose={goHome} />;
    }
    if (mode === 'operator') {
        if (linkPayload?.role === 'op' && (linkPayload.act === 'req' || linkPayload.act === 'ren')) {
            return <OperatorConfirm payload={linkPayload} language={language} onClose={goHome} />;
        }
        return <OperatorHome language={language} onClose={goHome} />;
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
                <div className="min-h-full flex flex-col justify-center gap-4 max-w-md mx-auto w-full">
                    <button
                        onClick={() => setMode('guide')}
                        className="w-full flex-1 min-h-[28vh] rounded-[2.5rem] bg-gradient-to-br from-orange-600 to-orange-500 text-white shadow-xl shadow-orange-600/25 active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-3"
                    >
                        <span className="text-6xl sm:text-7xl">🤝</span>
                        <span className="text-xl sm:text-2xl font-black tracking-tight">{t('General Guide', 'সাধারণ গাইড')}</span>
                    </button>

                    <section className="rounded-[2rem] border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 shadow-sm">
                        <p className="text-center text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
                            {t('Work with PTW', 'PTW সহ কাজ')}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setMode('clearance')}
                                className="min-h-[22vh] rounded-[1.75rem] bg-gradient-to-br from-blue-700 to-purple-600 text-white shadow-lg shadow-purple-600/20 active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-2 relative"
                            >
                                {hasActivePermit && (
                                    <span className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/25 text-[9px] font-black uppercase tracking-widest animate-pulse">
                                        {t('Resume', 'চালিয়ে যান')}
                                    </span>
                                )}
                                <span className="text-5xl">👷</span>
                                <span className="text-base font-black tracking-tight">{t('Lineman', 'লাইনম্যান')}</span>
                            </button>

                            <button
                                onClick={() => setMode('operator')}
                                className="min-h-[22vh] rounded-[1.75rem] bg-gradient-to-br from-teal-700 to-teal-600 text-white shadow-lg shadow-teal-700/20 active:scale-[0.97] transition-all flex flex-col items-center justify-center gap-2"
                            >
                                <span className="text-5xl">🏢</span>
                                <span className="text-base font-black tracking-tight">{t('Operator', 'অপারেটর')}</span>
                            </button>
                        </div>
                    </section>

                    <button
                        onClick={() => setMode('databook')}
                        className="w-full py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                    >
                        📒 {t('Edit Data Book', 'ডেটা বুক বদলান')}
                    </button>
                </div>
            </main>
        </div>
    );
}
