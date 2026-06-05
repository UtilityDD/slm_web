import React from 'react';

/** Single-line board logic with info button — shown above each monthly sub-tab list. */
export function MonthlyBoardHeader({ meta, language = 'bn', onInfoClick }) {
    if (!meta?.logic) return null;

    return (
        <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-800/40">
            <p className={`min-w-0 flex-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300 ${language === 'bn' ? 'font-bengali' : ''}`}>
                {meta.logic}
            </p>
            <button
                type="button"
                onClick={onInfoClick}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label={language === 'en' ? 'Leaderboard info' : 'লিডারবোর্ডের নিয়ম'}
            >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M12 11v5" />
                    <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
                </svg>
            </button>
        </div>
    );
}
