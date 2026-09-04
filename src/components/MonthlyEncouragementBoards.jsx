import React from 'react';
import { MONTHLY_SUB_TAB, BOARD_IDS } from '../utils/monthlyEncouragementBoards';

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

function BoardRulesButton({ language, onClick }) {
    const bn = language === 'bn';
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-200/90 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-xs transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 active:scale-95 ${bn ? 'font-bengali' : ''}`}
            aria-label={bn ? 'তালিকার নিয়ম' : 'Board rules'}
        >
            <svg className="h-3 w-3 shrink-0 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 11v5" />
                <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
            </svg>
            <span>{bn ? 'নিয়ম' : 'Rules'}</span>
        </button>
    );
}

/** Smart banner above the podium matching the new board style */
export function MonthlyBoardHeader({
    meta,
    language = 'bn',
    monthlyBoardTab = MONTHLY_SUB_TAB.CHAMPION,
    onInfoClick,
}) {
    const monthLabel = getCurrentMonthLabel(language);
    const bn = language === 'bn';

    const isChampion = monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION || monthlyBoardTab === BOARD_IDS.MAIN;
    const isNewPlayer = monthlyBoardTab === BOARD_IDS.NEW_PLAYER;
    const isMostImproved = monthlyBoardTab === BOARD_IDS.MOST_IMPROVED;
    const isTopLearner = monthlyBoardTab === BOARD_IDS.TOP_LEARNER;

    let icon = '🥇';
    let title = bn ? 'মাসের সেরা' : 'Monthly Champion';
    let summary = bn ? `${monthLabel} · পয়েন্ট × (১ + ধারাবাহিকতা)` : `${monthLabel} · Pts × (1 + Consistency)`;
    let badge = bn ? 'ধারাবাহিকতা' : 'Consistency';

    if (isNewPlayer) {
        icon = '🌱';
        title = bn ? 'সেরা নতুন' : 'New Player';
        summary = bn ? 'নতুন কর্মী · পয়েন্ট × (১ + ধারাবাহিকতা)' : 'New · Pts × (1 + Consistency)';
        badge = bn ? '≤ ৯০ দিন' : '≤ 90d';
    } else if (isMostImproved) {
        icon = '🚀';
        title = bn ? 'সবচেয়ে এগিয়ে' : 'Most Improved';
        summary = bn ? 'গত মাসের চেয়ে সর্বোচ্চ বৃদ্ধি' : 'Points growth vs last month';
        badge = bn ? 'বৃদ্ধি অনুযায়ী' : 'By growth';
    } else if (isTopLearner) {
        icon = '📚';
        title = bn ? 'সেরা পাঠক' : 'Top Learner';
        summary = bn ? 'সর্বোচ্চ রিডিং পয়েন্ট অর্জনকারী' : 'Top reading points this month';
        badge = bn ? 'রিডিং' : 'Reading';
    }

    return (
        <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-50/60 px-3.5 py-2.5 shadow-xs sm:px-4 sm:py-3">
            <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">{icon}</span>
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className={`text-sm sm:text-base font-black text-slate-900 leading-tight truncate ${bn ? 'font-bengali' : ''}`}>
                            {title}
                        </h2>
                        <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-orange-800 leading-none">
                            {monthLabel}
                        </span>
                    </div>
                    <p className={`mt-0.5 text-[11px] font-semibold text-slate-600 truncate ${bn ? 'font-bengali' : ''}`}>
                        {summary}
                    </p>
                </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5">
                <span className="hidden sm:inline-flex items-center rounded-full bg-white/90 border border-orange-200/90 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-xs">
                    {badge}
                </span>
                {meta && onInfoClick && (
                    <BoardRulesButton language={language} onClick={onInfoClick} />
                )}
            </div>
        </div>
    );
}
