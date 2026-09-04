import React from 'react';
import { createPortal } from 'react-dom';
import { BOARD_IDS, MONTHLY_SUB_TAB } from '../utils/monthlyEncouragementBoards';

/** Smart, natural, and concise rules modal for monthly encouragement boards */
export default function MonthlyBoardInfoModal({
    open,
    onClose,
    language = 'bn',
    meta,
}) {
    if (!open) return null;

    const bn = language === 'bn';
    const boardId = meta?.boardId || meta?.id;
    const isChampion = boardId === BOARD_IDS.MAIN || boardId === MONTHLY_SUB_TAB.CHAMPION;
    const isNewPlayer = boardId === BOARD_IDS.NEW_PLAYER;
    const isMostImproved = boardId === BOARD_IDS.MOST_IMPROVED;
    const isTopLearner = boardId === BOARD_IDS.TOP_LEARNER;

    let icon = '🥇';
    let title = bn ? 'মাসের সেরা' : 'Monthly Champion';
    let summary = bn 
        ? 'চলতি মাসের নিট পয়েন্টকে ধারাবাহিকতা দিয়ে গুণ করে শীর্ষ ৩ জনের তালিকা।'
        : 'Top 3 players ranked by net monthly points weighted by daily consistency.';
    let conditions = [];

    if (isNewPlayer) {
        icon = '🌱';
        title = bn ? 'সেরা নতুন খেলোয়াড়' : 'New Player Champion';
        summary = bn
            ? 'নতুন যোগ দেওয়া কর্মীদের উৎসাহিত করতে ধারাবাহিকতা ভিত্তিক বিশেষ আয়োজন।'
            : 'Encouragement leaderboard for newly joined linemen with consistency bonus.';
        conditions = bn ? [
            'অ্যাপে যোগদানের বয়স ৯০ দিনের কম হতে হবে।',
            'কমপক্ষে ৫০০ পয়েন্ট, ১৫টি কুইজ অথবা ৫টি পাঠ শেষ করতে হবে।',
            'যোগ্যদের মধ্যে ধারাবাহিকতার চূড়ান্ত স্কোরে সেরা ৩ জন পুরস্কৃত হবেন।'
        ] : [
            'Account age must be within 90 days.',
            'Requires at least 500 pts, 15 quizzes, or 5 completed lessons.',
            'Top 3 qualifiers ranked by consistency-weighted monthly score win prizes.'
        ];
    } else if (isMostImproved) {
        icon = '🚀';
        title = bn ? 'সবচেয়ে এগিয়ে' : 'Most Improved';
        summary = bn
            ? 'গত মাসের চেয়ে যারা সবচেয়ে বেশি পয়েন্ট বাড়িয়েছেন তাদের তালিকা।'
            : 'Rewards players with the highest points growth over last month.';
        conditions = bn ? [
            'গত মাসে অন্তত ২০০ পয়েন্ট থাকতে হবে।',
            'চলতি মাসে অন্তত ৫০০ পয়েন্ট অর্জন করতে হবে।',
            'গত মাসের চেয়ে পয়েন্টের নিট বৃদ্ধি (Growth) অনুযায়ী সেরা ৩ জন নির্বাচিত হবেন।'
        ] : [
            'At least 200 points scored last month.',
            'At least 500 points scored this month.',
            'Top 3 by net point improvement over last month win prizes.'
        ];
    } else if (isTopLearner) {
        icon = '📚';
        title = bn ? 'সেরা পাঠক' : 'Top Learner';
        summary = bn
            ? 'নিয়মিত শিক্ষণীয় পাঠ পড়ে জ্ঞান ও পয়েন্ট বাড়ানোর প্রতিযোগিতা।'
            : 'Rewards dedicated reading and mastery of training lessons.';
        conditions = bn ? [
            'এই মাসে কমপক্ষে ৮টি পাঠ সম্পন্ন করতে হবে।',
            'পাঠ পড়া ও সংশ্লিষ্ট কুইজ থেকে অর্জিত রিডিং পয়েন্ট অনুযায়ী স্থান নির্ধারিত হয়।'
        ] : [
            'Must complete at least 8 training lessons this month.',
            'Ranked by total reading points earned in the current month.'
        ];
    } else {
        // Champion
        conditions = bn ? [
            'পয়েন্ট সূত্র: চূড়ান্ত স্কোর = নিট পয়েন্ট × (১ + ধারাবাহিকতা রেট)।',
            'প্রতিদিন কুইজ ও পাঠ পড়লে স্কোর দ্বিগুণ (২.০০ গুণ) পর্যন্ত বাড়বে।',
            'ভুল উত্তরের পেনাল্টি বাদ দিয়ে নিট পয়েন্ট হিসাব করা হয়।'
        ] : [
            'Formula: Final Score = Net Points × (1 + Consistency Rate).',
            'Playing daily doubles your final score multiplier up to 2.00×.',
            'Net points = Quiz + reading points minus penalties.'
        ];
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-2xl animate-scale-in"
                role="dialog"
                aria-labelledby="monthly-board-info-title"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0" aria-hidden="true">{icon}</span>
                        <h3
                            id="monthly-board-info-title"
                            className={`text-sm font-black truncate leading-tight ${bn ? 'font-bengali' : ''}`}
                        >
                            {title} · {bn ? 'সহজ নিয়মাবলী' : 'Board Rules'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full bg-black/15 p-1 text-white/90 hover:bg-black/30 transition-colors"
                        aria-label={bn ? 'বন্ধ করুন' : 'Close'}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 text-xs">
                    {/* Summary box */}
                    <div className="rounded-2xl bg-orange-50/70 border border-orange-200/80 p-3">
                        <p className={`font-semibold text-slate-800 leading-relaxed ${bn ? 'font-bengali' : ''}`}>
                            {summary}
                        </p>
                    </div>

                    {/* Conditions */}
                    {conditions.length > 0 && (
                        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 space-y-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider text-slate-500 block ${bn ? 'font-bengali tracking-normal' : ''}`}>
                                {bn ? 'যোগ্যতার শর্ত' : 'Eligibility'}
                            </span>
                            <ul className={`space-y-1.5 text-slate-700 ${bn ? 'font-bengali' : ''}`}>
                                {conditions.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-orange-500 font-bold shrink-0 mt-0.5">•</span>
                                        <span className="leading-snug">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Prize Rule Note */}
                    <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3">
                        <span className={`text-[10px] font-black uppercase tracking-wider text-amber-900 block mb-1 ${bn ? 'font-bengali tracking-normal' : ''}`}>
                            {bn ? 'পুরস্কার বণ্টন' : 'Prize Distribution'}
                        </span>
                        <p className={`text-slate-700 leading-snug ${bn ? 'font-bengali' : ''}`}>
                            {bn 
                                ? 'প্রতি তালিকায় সেরা ৩ জন পুরস্কৃত হবেন। এক মাসে একজন কর্মী সর্বোচ্চ একটি পুরস্কার পাবেন (অন্য তালিকায় আগে জয়ী হলে পুরস্কার পরবর্তী জনকে দেওয়া হবে)।'
                                : 'Top 3 on each board receive prizes. Each lineman can win at most one prize per month (if won on a higher board, next qualifier receives the prize).'}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`w-full rounded-xl bg-slate-900 py-2.5 text-xs font-black text-white hover:bg-slate-800 active:scale-95 transition-all ${bn ? 'font-bengali' : ''}`}
                    >
                        {bn ? 'ঠিক আছে, বুঝেছি' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
