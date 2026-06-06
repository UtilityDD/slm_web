import React from 'react';

/** Single-line board logic with info button — shown above each monthly sub-tab list. */
export function MonthlyBoardHeader({ meta, language = 'bn', onInfoClick }) {
    if (!meta?.logic) return null;

    return (
        <div className="flex items-start gap-2 border-2 border-slate-900 bg-amber-50 px-3 py-2.5 shadow-[2px_2px_0_#0f172a]">
            <p className={`min-w-0 flex-1 text-[11px] leading-snug text-slate-700 font-semibold ${language === 'bn' ? 'font-bengali' : ''}`}>
                {meta.logic}
            </p>
            <button
                type="button"
                onClick={onInfoClick}
                className="shrink-0 flex h-7 w-7 items-center justify-center border-2 border-slate-900 bg-white text-slate-600 shadow-[2px_2px_0_#0f172a] hover:bg-orange-50"
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
