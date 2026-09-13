import React from 'react';
import { createPortal } from 'react-dom';
import LeaderboardRankChip from './LeaderboardRankChip';
import ReadingLevelAvatarFrame from './ReadingLevelAvatarFrame';
import {
    formatLeaderboardNumber,
    formatMonthlyPlayerScore,
    BOARD_IDS,
    MONTHLY_SUB_TAB,
} from '../utils/monthlyEncouragementBoards';

/** Above SLM Radio FAB (104), mini bar (130), and expanded radio (220). */
const SCORE_MODAL_Z = 'z-[250]';

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
    if (!isOpen || !player || typeof document === 'undefined') return null;

    const bn = language === 'bn';
    const monthLabel = getCurrentMonthLabel(language);
    const rank = player.standing_rank ?? player.rank ?? 1;
    const isSuperseded = player.prize_status === 'superseded';
    const isReplacement = player.prize_status === 'replacement';

    const netPoints = Number(player.base_points ?? player.points) || 0;
    const readingPoints = Number(player.reading_points) || 0;
    const penalties = Number(player.total_penalties) || 0;
    const quizPoints = player.quiz_points != null ? Number(player.quiz_points) : Math.max(0, netPoints - readingPoints + penalties);
    const activeDays = player.active_days ?? 0;
    const eligibleDays = player.eligible_days ?? 1;
    const consistencyRate = player.consistency_rate ?? 0;
    const consistencyPct = player.consistency_pct ?? Math.round(consistencyRate * 100);
    const monthlyGrandScore = player.monthly_grand_score ?? Math.round(netPoints * (1 + consistencyRate));

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

    return createPortal(
        <div
            className={`fixed inset-0 ${SCORE_MODAL_Z} flex items-center justify-center p-3 overflow-y-auto animate-fade-in`}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="relative w-full max-w-[20rem] overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-2xl my-auto">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-2 text-white flex items-center gap-2">
                    <span className="text-base shrink-0" aria-hidden="true">🗓️</span>
                    <h3 className={`text-xs font-black leading-tight min-w-0 flex-1 truncate ${bn ? 'font-bengali' : ''}`}>
                        {monthLabel} · {boardTitle}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full bg-black/15 p-1 text-white/90 hover:bg-black/30 transition-colors shrink-0"
                        aria-label={bn ? 'বন্ধ করুন' : 'Close'}
                    >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                        <ReadingLevelAvatarFrame
                            level={player.training_level || 0}
                            readingPoints={readingPoints}
                            language={language}
                            sizeClass="h-8 w-8"
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
                                <h4 className={`text-xs font-black truncate ${isSuperseded ? 'line-through text-slate-400' : 'text-slate-900'} ${bn ? 'font-bengali' : ''}`}>
                                    {player.full_name}
                                </h4>
                                {isYou && (
                                    <span className="rounded bg-orange-500 px-1 text-[7px] font-black text-white">
                                        {bn ? 'আপনি' : 'You'}
                                    </span>
                                )}
                            </div>
                            <p className="text-[9px] text-slate-500 truncate">
                                {player.district || (bn ? 'কোনো জেলা নেই' : 'No District')}
                            </p>
                        </div>
                        <LeaderboardRankChip rank={rank} superseded={isSuperseded} size="sm" />
                    </div>

                    <div className="rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-2 text-center">
                        <span className="font-mono text-xl font-black text-orange-950 tabular-nums leading-none">
                            {boardScore}
                        </span>
                    </div>

                    {(isChampion || isNewPlayer) && (
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-2.5 py-2 text-[11px] space-y-1">
                            <div className="flex justify-between text-slate-600">
                                <span className={bn ? 'font-bengali' : ''}>{bn ? 'কুইজ' : 'Quiz'}</span>
                                <span className="font-mono font-bold text-slate-800">+{formatLeaderboardNumber(quizPoints)}</span>
                            </div>
                            {readingPoints > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span className={bn ? 'font-bengali' : ''}>{bn ? 'রিডিং' : 'Reading'}</span>
                                    <span className="font-mono font-bold text-orange-700">+{formatLeaderboardNumber(readingPoints)}</span>
                                </div>
                            )}
                            {penalties > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span className={bn ? 'font-bengali' : ''}>{bn ? 'পেনাল্টি' : 'Penalties'}</span>
                                    <span className="font-mono font-bold">-{formatLeaderboardNumber(penalties)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-slate-900">
                                <span className={bn ? 'font-bengali' : ''}>{bn ? `${monthLabel} নেট` : `${monthLabel} net`}</span>
                                <span className="font-mono text-orange-800">{formatLeaderboardNumber(netPoints)}</span>
                            </div>
                            <div className="flex justify-between text-amber-950 pt-1 border-t border-slate-200/80">
                                <span className={bn ? 'font-bengali' : ''}>{bn ? 'সক্রিয় দিন' : 'Active days'}</span>
                                <span className="font-mono font-bold">
                                    {activeDays}/{eligibleDays} ({consistencyPct}%)
                                </span>
                            </div>
                            <p className="font-mono text-[10px] font-black text-amber-950 text-center pt-0.5">
                                {formatLeaderboardNumber(netPoints)} × (1 + {activeDays}/{eligibleDays}) = {formatLeaderboardNumber(monthlyGrandScore)}
                            </p>
                            {isChampion && player.hourly != null && (
                                <div className="flex justify-between text-amber-900 pt-0.5">
                                    <span className={bn ? 'font-bengali' : ''}>{bn ? 'ঘণ্টার কুইজ' : 'Hourly'}</span>
                                    <span className="font-mono font-bold">{player.hourly}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {!isChampion && !isNewPlayer && (
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-2.5 py-2 text-[11px] space-y-1">
                            <div className="flex justify-between text-slate-600">
                                <span className={bn ? 'font-bengali' : ''}>{bn ? 'কুইজ' : 'Quiz'}</span>
                                <span className="font-mono font-bold text-slate-800">+{formatLeaderboardNumber(quizPoints)}</span>
                            </div>
                            {readingPoints > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span className={bn ? 'font-bengali' : ''}>{bn ? 'রিডিং' : 'Reading'}</span>
                                    <span className="font-mono font-bold text-orange-700">+{formatLeaderboardNumber(readingPoints)}</span>
                                </div>
                            )}
                            {penalties > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span className={bn ? 'font-bengali' : ''}>{bn ? 'পেনাল্টি' : 'Penalties'}</span>
                                    <span className="font-mono font-bold">-{formatLeaderboardNumber(penalties)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-slate-900">
                                <span className={bn ? 'font-bengali' : ''}>{bn ? `${monthLabel} নেট` : `${monthLabel} net`}</span>
                                <span className="font-mono text-orange-800">{formatLeaderboardNumber(netPoints)}</span>
                            </div>
                        </div>
                    )}

                    {isNewPlayer && (
                        <p className={`text-[9px] font-semibold text-emerald-800 ${bn ? 'font-bengali' : ''}`}>
                            {bn ? 'যোগদান' : 'Joined'}{' '}
                            {player.profiles?.created_at
                                ? new Date(player.profiles.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short' })
                                : '—'}
                            {' · '}
                            {bn ? '≤ ৯০ দিন' : '≤ 90 days'}
                        </p>
                    )}

                    {isMostImproved && (
                        <div className="rounded-xl bg-sky-50 border border-sky-200 px-2.5 py-1.5 text-[11px] space-y-0.5">
                            <div className="flex justify-between text-sky-900">
                                <span className={bn ? 'font-bengali' : ''}>{bn ? 'গত মাস' : 'Last month'}</span>
                                <span className="font-mono font-bold">{formatLeaderboardNumber(player.prev_points || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sky-900">
                                <span className={bn ? 'font-bengali' : ''}>{bn ? 'চলতি মাস' : 'This month'}</span>
                                <span className="font-mono font-bold">{formatLeaderboardNumber(player.cur_points || player.points || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sky-950 font-bold">
                                <span className={bn ? 'font-bengali' : ''}>{bn ? 'উন্নতি' : 'Growth'}</span>
                                <span className="font-mono text-emerald-700">+{formatLeaderboardNumber(player.improvement || 0)}</span>
                            </div>
                        </div>
                    )}

                    {isTopLearner && (
                        <p className={`text-[11px] font-semibold text-purple-900 ${bn ? 'font-bengali' : ''}`}>
                            {bn ? 'পঠিত পাঠ' : 'Lessons'} · {player.lessons || 0}
                        </p>
                    )}

                    {isSuperseded && (
                        <p className={`text-[9px] font-bold text-amber-900 ${bn ? 'font-bengali' : ''}`}>
                            {bn ? 'অন্য তালিকায় বিজয়ী — পুরস্কার স্থানান্তরিত' : 'Won on a higher board — prize transferred'}
                        </p>
                    )}
                    {isReplacement && (
                        <p className={`text-[9px] font-bold text-emerald-800 ${bn ? 'font-bengali' : ''}`}>
                            {bn ? `রিপ্লেসমেন্ট (#${player.prize_rank})` : `Replacement (#${player.prize_rank})`}
                        </p>
                    )}

                    <div className="flex items-center justify-end gap-1.5">
                        {onOpenUserProgress && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenUserProgress(player.user_id, player, rank);
                                }}
                                className={`rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 ${bn ? 'font-bengali' : ''}`}
                            >
                                {bn ? 'প্রোফাইল' : 'Profile'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className={`rounded-lg bg-slate-900 px-3 py-1 text-[10px] font-black text-white ${bn ? 'font-bengali' : ''}`}
                        >
                            {bn ? 'ঠিক আছে' : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
