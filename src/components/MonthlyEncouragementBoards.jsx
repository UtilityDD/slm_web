import React from 'react';

/** Single-line board logic with info button — shown above each monthly sub-tab list. */
export function MonthlyBoardHeader({ meta, language = 'bn', onInfoClick }) {
    if (!meta?.logic) return null;

    return (
        <div className="px-1 py-1 text-center">
            <p className={`inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug text-slate-600 font-medium ${language === 'bn' ? 'font-bengali' : ''}`}>
                <span>{meta.logic}</span>
                <button
                    type="button"
                    onClick={onInfoClick}
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center align-middle rounded-full text-slate-500 hover:bg-orange-50 hover:text-orange-600"
                    aria-label={language === 'en' ? 'Leaderboard info' : 'লিডারবোর্ডের নিয়ম'}
                >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" d="M12 11v5" />
                        <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
                    </svg>
                </button>
            </p>
        </div>
    );
}
