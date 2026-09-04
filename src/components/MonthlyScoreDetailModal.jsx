import React from 'react';
import LeaderboardRankChip from './LeaderboardRankChip';
import ReadingLevelAvatarFrame from './ReadingLevelAvatarFrame';
import { 
    formatLeaderboardNumber, 
    formatMonthlyPlayerScore, 
    BOARD_IDS, 
    MONTHLY_SUB_TAB 
} from '../utils/monthlyEncouragementBoards';

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

export default function MonthlyScoreDetailModal({
    player,
    isOpen,
    onClose,
    monthlyBoardTab = MONTHLY_SUB_TAB.CHAMPION,
    language = 'bn',
    isYou = false,
    onOpenUserProgress,
    onMaximizeImage,
}) {
    if (!isOpen || !player) return null;

    const bn = language === 'bn';
    const monthLabel = getCurrentMonthLabel(language);
    const rank = player.standing_rank ?? player.rank ?? 1;
    const isSuperseded = player.prize_status === 'superseded';
    const isReplacement = player.prize_status === 'replacement';

    // Scores
    const netPoints = Number(player.base_points ?? player.points) || 0;
    const readingPoints = Number(player.reading_points) || 0;
    const penalties = Number(player.total_penalties) || 0;
    const quizPoints = player.quiz_points != null ? Number(player.quiz_points) : Math.max(0, netPoints - readingPoints + penalties);
    const lifetimeScore = Number(player.profiles?.points ?? player.lifetime_score ?? player.all_time_score ?? netPoints);
    const activeDays = player.active_days ?? 0;
    const eligibleDays = player.eligible_days ?? 1;
    const consistencyRate = player.consistency_rate ?? 0;
    const consistencyPct = player.consistency_pct ?? Math.round(consistencyRate * 100);
    const monthlyGrandScore = player.monthly_grand_score ?? Math.round(netPoints * (1 + consistencyRate));
    const multiplier = (1 + consistencyRate).toFixed(2);

    // Board specific labels
    const isChampion = monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION || monthlyBoardTab === BOARD_IDS.MAIN;
    const isNewPlayer = monthlyBoardTab === BOARD_IDS.NEW_PLAYER;
    const isMostImproved = monthlyBoardTab === BOARD_IDS.MOST_IMPROVED;
    const isTopLearner = monthlyBoardTab === BOARD_IDS.TOP_LEARNER;

    const boardScore = (isChampion || isNewPlayer)
        ? formatLeaderboardNumber(monthlyGrandScore)
        : formatMonthlyPlayerScore(player, monthlyBoardTab);

    let boardTitle = bn ? 'মাসের সেরা' : 'Monthly Champion';
    if (isNewPlayer) boardTitle = bn ? 'সেরা নতুন' : 'New Player';
    else if (isMostImproved) boardTitle = bn ? 'সবচেয়ে এগিয়ে' : 'Most Improved';
    else if (isTopLearner) boardTitle = bn ? 'পড়াশোনা' : 'Top Learner';

    return (
        <div 
            className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Box */}
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-2xl my-auto z-10">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🗓️</span>
                        <h3 className={`text-sm font-black leading-tight ${bn ? 'font-bengali' : ''}`}>
                            {monthLabel} · {boardTitle}
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

                <div className="p-3.5 space-y-3">
                    {/* Player Info Row */}
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                        <ReadingLevelAvatarFrame
                            level={player.training_level || 0}
                            readingPoints={readingPoints}
                            language={language}
                            sizeClass="h-10 w-10"
                            avatarUrl={player.avatar_url}
                            fallbackLetter={player.full_name?.[0] || '?'}
                            faded={isSuperseded}
                            onAvatarClick={(e) => {
                                e.stopPropagation();
                                onMaximizeImage?.(player.avatar_url, e);
                            }}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                <h4 className={`text-sm font-black text-slate-900 truncate ${isSuperseded ? 'line-through text-slate-400' : ''} ${bn ? 'font-bengali' : ''}`}>
                                    {player.full_name}
                                </h4>
                                {isYou && (
                                    <span className="rounded bg-orange-500 px-1 py-0.2 text-[8px] font-black text-white">
                                        {bn ? 'আপনি' : 'You'}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">
                                {player.district || (bn ? 'কোনো জেলা নেই' : 'No District')}
                            </p>
                        </div>
                        <LeaderboardRankChip rank={rank} superseded={isSuperseded} size="sm" />
                    </div>

                    {/* 2-Column Summary: Lifetime vs Monthly Board Score */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                            <span className="text-[10px] font-bold text-slate-500 block">
                                {bn ? 'সর্বকালীন পয়েন্ট' : 'Lifetime Total'}
                            </span>
                            <span className="font-mono text-base font-black text-slate-900 tabular-nums">
                                {formatLeaderboardNumber(lifetimeScore)}
                            </span>
                        </div>
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-2.5">
                            <span className="text-[10px] font-bold text-orange-800 block">
                                {bn ? 'চূড়ান্ত মাসিক স্কোর' : 'Final Monthly Score'}
                            </span>
                            <span className="font-mono text-base font-black text-orange-950 tabular-nums">
                                {boardScore}
                            </span>
                        </div>
                    </div>

                    {/* Consistency & Formula Box for Champion & New Player */}
                    {(isChampion || isNewPlayer) && (
                        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 to-orange-50/60 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                                    <span>🔥</span>
                                    <span className={bn ? 'font-bengali' : ''}>
                                        {bn ? 'ধারাবাহিকতা' : 'Consistency Multiplier'}
                                    </span>
                                </div>
                                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-900">
                                    {consistencyPct}%
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-amber-900">
                                <div className="flex justify-between bg-white/80 rounded-xl px-2.5 py-1 shadow-2xs">
                                    <span className={bn ? 'font-bengali' : ''}>{bn ? 'সক্রিয় দিন' : 'Active Days'}</span>
                                    <span className="font-mono font-bold">{activeDays} {bn ? 'দিন' : 'd'}</span>
                                </div>
                                <div className="flex justify-between bg-white/80 rounded-xl px-2.5 py-1 shadow-2xs">
                                    <span className={bn ? 'font-bengali' : ''}>{bn ? 'চলতি দিন' : 'Eligible Days'}</span>
                                    <span className="font-mono font-bold">{eligibleDays} {bn ? 'দিন' : 'd'}</span>
                                </div>
                            </div>
                            <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-between text-xs font-black text-amber-950">
                                <span className={`text-[10px] font-bold text-amber-800 ${bn ? 'font-bengali' : ''}`}>
                                    {bn ? 'নিট পয়েন্ট × (১ + ধারাবাহিকতা)' : 'Net Pts × (1 + Rate)'}
                                </span>
                                <span className="font-mono text-xs tabular-nums">
                                    {formatLeaderboardNumber(netPoints)} × {multiplier} = {formatLeaderboardNumber(monthlyGrandScore)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Points Breakdown */}
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-600">
                            <span>{bn ? 'কুইজ পয়েন্ট' : 'Quiz Points'}</span>
                            <span className="font-mono font-bold text-slate-800">+{formatLeaderboardNumber(quizPoints)}</span>
                        </div>
                        {readingPoints > 0 && (
                            <div className="flex justify-between text-slate-600">
                                <span>{bn ? 'রিডিং পয়েন্ট' : 'Reading Points'}</span>
                                <span className="font-mono font-bold text-orange-700">+{formatLeaderboardNumber(readingPoints)}</span>
                            </div>
                        )}
                        {penalties > 0 && (
                            <div className="flex justify-between text-red-600">
                                <span>{bn ? 'পেনাল্টি' : 'Penalties'}</span>
                                <span className="font-mono font-bold">-{formatLeaderboardNumber(penalties)}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                            <span>{bn ? 'নিট পয়েন্ট' : 'Net Points'}</span>
                            <span className="font-mono text-orange-800">{formatLeaderboardNumber(netPoints)}</span>
                        </div>
                    </div>

                    {/* Board Specific Detail */}
                    {isChampion && player.hourly != null && (
                        <div className="rounded-2xl bg-amber-50/80 border border-amber-200/90 px-3 py-2 text-xs flex justify-between items-center">
                            <span className="text-amber-900 font-semibold">{bn ? 'ঘণ্টার কুইজ সম্পন্ন' : 'Hourly Quizzes'}</span>
                            <span className="font-mono font-black text-amber-950">{player.hourly} {bn ? 'টি' : 'quizzes'}</span>
                        </div>
                    )}

                    {isNewPlayer && (
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs space-y-1">
                            <div className="flex justify-between text-emerald-900">
                                <span>{bn ? 'যোগদান' : 'Joined'}</span>
                                <span className="font-semibold">
                                    {player.profiles?.created_at ? new Date(player.profiles.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between text-emerald-800 text-[10px]">
                                <span>{bn ? 'শর্ত' : 'Rule'}</span>
                                <span>{bn ? '≤ ৯০ দিনের মধ্যে যোগদান' : '≤ 90 days'}</span>
                            </div>
                        </div>
                    )}

                    {isMostImproved && (
                        <div className="rounded-2xl bg-sky-50 border border-sky-200 px-3 py-2 text-xs space-y-1">
                            <div className="flex justify-between text-sky-900">
                                <span>{bn ? 'গত মাস' : 'Last Month'}</span>
                                <span className="font-mono font-bold">{formatLeaderboardNumber(player.prev_points || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sky-900">
                                <span>{bn ? 'চলতি মাস' : 'This Month'}</span>
                                <span className="font-mono font-bold">{formatLeaderboardNumber(player.cur_points || player.points || 0)}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-sky-200 text-sky-950 font-bold">
                                <span>{bn ? 'মোট উন্নতি' : 'Growth'}</span>
                                <span className="font-mono text-emerald-700">+{formatLeaderboardNumber(player.improvement || 0)}</span>
                            </div>
                        </div>
                    )}

                    {isTopLearner && (
                        <div className="rounded-2xl bg-purple-50 border border-purple-200 px-3 py-2 text-xs flex justify-between items-center">
                            <span className="text-purple-900 font-semibold">{bn ? 'পঠিত পাঠ' : 'Lessons Read'}</span>
                            <span className="font-mono font-black text-purple-950">{player.lessons || 0} {bn ? 'টি' : ''}</span>
                        </div>
                    )}

                    {/* Superseded / Replacement Flags */}
                    {isSuperseded && (
                        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-2 text-center text-[10px] font-bold text-amber-900">
                            {bn ? 'অন্য তালিকায় বিজয়ী (পুরস্কার পরবর্তী জনকে হস্তান্তরিত)' : 'Won on a higher board (prize transferred to next qualifier)'}
                        </div>
                    )}

                    {isReplacement && (
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-2 text-center text-[10px] font-bold text-emerald-800">
                            {bn ? `রিপ্লেসমেন্ট বিজয়ী (#${player.prize_rank})` : `Replacement winner (#${player.prize_rank})`}
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="border-t border-slate-100 bg-slate-50 px-3.5 py-2.5 flex items-center justify-end gap-2">
                    {onOpenUserProgress && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onOpenUserProgress(player.user_id, player, rank);
                            }}
                            className={`rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all ${bn ? 'font-bengali' : ''}`}
                        >
                            {bn ? 'প্রোফাইল' : 'Profile'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className={`rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-black text-white hover:bg-slate-800 active:scale-95 transition-all ${bn ? 'font-bengali' : ''}`}
                    >
                        {bn ? 'ঠিক আছে' : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
}
