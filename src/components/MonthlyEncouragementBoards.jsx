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
        <span className={className}>
            {language === 'en' ? 'All-time scores: ' : 'সর্বকালীন দেখতে '}
            <button
                type="button"
                onClick={onAllTimeClick}
                className="font-semibold text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline active:opacity-80"
            >
                {language === 'en' ? 'tap here' : 'এখানে ট্যাপ করুন'}
            </button>
        </span>
    );
}

/** Compact note above the podium — champion shows month scope; other tabs keep board logic. */
export function MonthlyBoardHeader({
    meta,
    language = 'bn',
    monthlyBoardTab,
    onInfoClick,
    onAllTimeClick,
}) {
    const monthLabel = getCurrentMonthLabel(language);
    const isChampion = monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION;

    return (
        <div className="px-1 py-0.5 text-center space-y-1">
            <p className={`text-[11px] leading-snug text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                {isChampion ? (
                    language === 'en' ? (
                        <>
                            <span className="font-semibold text-slate-800">{monthLabel}</span> scores only.{' '}
                        </>
                    ) : (
                        <>
                            শুধু <span className="font-semibold text-slate-800">{monthLabel}</span> মাসের পয়েন্ট।{' '}
                        </>
                    )
                ) : (
                    <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                        <span>{meta?.logic}</span>
                        {meta && onInfoClick && (
                            <button
                                type="button"
                                onClick={onInfoClick}
                                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-orange-50 hover:text-orange-600"
                                aria-label={language === 'en' ? 'Board rules' : 'তালিকার নিয়ম'}
                            >
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                    <circle cx="12" cy="12" r="10" />
                                    <path strokeLinecap="round" d="M12 11v5" />
                                    <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
                                </svg>
                            </button>
                        )}
                    </span>
                )}
                {isChampion && (
                    <AllTimeLink language={language} onAllTimeClick={onAllTimeClick} />
                )}
                {isChampion && meta && onInfoClick && (
                    <button
                        type="button"
                        onClick={onInfoClick}
                        className="ml-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center align-middle rounded-full text-slate-400 hover:bg-orange-50 hover:text-orange-600"
                        aria-label={language === 'en' ? 'Board rules' : 'তালিকার নিয়ম'}
                    >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                            <circle cx="12" cy="12" r="10" />
                            <path strokeLinecap="round" d="M12 11v5" />
                            <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
                        </svg>
                    </button>
                )}
            </p>
        </div>
    );
}
