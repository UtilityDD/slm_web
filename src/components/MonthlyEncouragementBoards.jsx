import React from 'react';
import { MONTHLY_SUB_TAB } from '../utils/monthlyEncouragementBoards';

const BN_MONTHS = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

function getCurrentMonthLabel(language = 'bn') {
    const now = new Date();
    if (language === 'bn') {
        return BN_MONTHS[now.getMonth()];
    }
    return now.toLocaleString('en', { month: 'long' });
}

function AllTimeLink({ language, onAllTimeClick, className = '' }) {
    return (
        <button
            type="button"
            onClick={onAllTimeClick}
            className={`font-bold text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline active:opacity-80 ${className}`}
        >
            {language === 'en' ? 'All-time' : 'সর্বকালীন'}
        </button>
    );
}

function BoardRulesButton({ language, onClick }) {
    const bn = language === 'bn';
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 active:scale-95 ${bn ? 'font-bengali' : ''}`}
            aria-label={bn ? 'তালিকার নিয়ম' : 'Board rules'}
        >
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 11v5" />
                <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
            </svg>
            <span>{bn ? 'নিয়ম' : 'Rules'}</span>
        </button>
    );
}

/** Compact note above the podium — short summary only; full rules open in the info modal. */
export function MonthlyBoardHeader({
    meta,
    language = 'bn',
    monthlyBoardTab,
    onInfoClick,
    onAllTimeClick,
}) {
    const monthLabel = getCurrentMonthLabel(language);
    const isChampion = monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION;
    const bn = language === 'bn';

    const summary = isChampion
        ? (bn
            ? <>শুধু <span className="font-semibold text-slate-800">{monthLabel}</span> মাসের পয়েন্ট</>
            : <><span className="font-semibold text-slate-800">{monthLabel}</span> scores only</>)
        : (meta?.rankBy || meta?.prize || '');

    return (
        <div className="flex min-w-0 items-center gap-2">
            <p className={`min-w-0 flex-1 truncate text-xs leading-snug text-slate-600 sm:text-sm ${bn ? 'font-bengali' : ''}`}>
                {summary}
                {onAllTimeClick && (
                    <>
                        <span className="mx-1.5 text-slate-300" aria-hidden>
                            ·
                        </span>
                        <AllTimeLink language={language} onAllTimeClick={onAllTimeClick} />
                    </>
                )}
            </p>
            {meta && onInfoClick && (
                <BoardRulesButton language={language} onClick={onInfoClick} />
            )}
        </div>
    );
}
