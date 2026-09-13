import React from 'react';
import { createPortal } from 'react-dom';
import LeaderboardRankChip from './LeaderboardRankChip';
import ReadingLevelAvatarFrame from './ReadingLevelAvatarFrame';
import { formatLeaderboardNumber } from '../utils/monthlyEncouragementBoards';

/** Above SLM Radio FAB (104), mini bar (130), and expanded radio (220). */
const SCORE_MODAL_Z = 'z-[250]';

export default function AnnualTrophyDetailModal({
    player,
    isOpen,
    onClose,
    language = 'bn',
    isYou = false,
    onOpenUserProgress,
    onMaximizeImage,
}) {
    if (!isOpen || !player || typeof document === 'undefined') return null;

    const bn = language === 'bn';
    const grossPoints = Number(player.points_earned) || (Number(player.net_points) + (Number(player.penalties_incurred) || 0));
    const penalties = Number(player.penalties_incurred) || 0;
    const netPoints = Number(player.net_points) || 0;
    const activeDays = Number(player.active_days) || 0;
    const eligibleDays = Number(player.eligible_days) || 1;
    const consistencyRate = Math.min(1.0, activeDays / eligibleDays);
    const consistencyPct = player.consistency_pct ?? Math.round(consistencyRate * 100);
    const yearlyScore = player.yearly_score || Math.round(netPoints * (1 + consistencyRate));
    const isQualified = player.is_qualified ?? (activeDays >= 30);
    const daysNeeded = player.days_needed_to_qualify ?? Math.max(0, 30 - activeDays);
    const rangeLabel = bn ? '৭ মার্চ ২০২৬ – ৭ মার্চ ২০২৭' : '7 Mar 2026 – 7 Mar 2027';

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

            <div className="relative w-full max-w-[20rem] overflow-hidden rounded-2xl border border-amber-300/80 bg-white shadow-2xl my-auto">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-white flex items-center gap-2">
                    <span className="text-base shrink-0" aria-hidden="true">🏆</span>
                    <div className="min-w-0 flex-1">
                        <h3 className={`text-xs font-black leading-tight ${bn ? 'font-bengali' : ''}`}>
                            {bn ? 'লাইনম্যান দিবস স্কোর' : 'Lineman Day score'}
                        </h3>
                        <p className={`text-[9px] font-semibold text-white/85 ${bn ? 'font-bengali' : ''}`}>
                            {rangeLabel}
                        </p>
                    </div>
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
                            readingPoints={player.reading_points || 0}
                            language={language}
                            sizeClass="h-8 w-8"
                            avatarUrl={player.avatar_url}
                            fallbackLetter={player.full_name?.[0] || '?'}
                            onAvatarClick={(e) => {
                                e.stopPropagation();
                                onMaximizeImage?.(player.avatar_url, e);
                            }}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                <h4 className={`text-xs font-black text-slate-900 truncate ${bn ? 'font-bengali' : ''}`}>
                                    {player.full_name}
                                </h4>
                                {isYou && (
                                    <span className="rounded bg-amber-500 px-1 text-[7px] font-black text-white">
                                        {bn ? 'আপনি' : 'You'}
                                    </span>
                                )}
                            </div>
                            <p className="text-[9px] text-slate-500 truncate">
                                {player.district || (bn ? 'কোনো জেলা নেই' : 'No District')}
                            </p>
                        </div>
                        <LeaderboardRankChip rank={player.rank} size="sm" />
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-center">
                        <span className="font-mono text-xl font-black text-amber-950 tabular-nums leading-none">
                            {formatLeaderboardNumber(yearlyScore)}
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-2.5 py-2 text-[11px] space-y-1">
                        <div className="flex justify-between text-slate-600">
                            <span className={bn ? 'font-bengali' : ''}>{bn ? 'অর্জিত' : 'Earned'}</span>
                            <span className="font-mono font-bold text-slate-800">+{formatLeaderboardNumber(grossPoints)}</span>
                        </div>
                        {penalties > 0 && (
                            <div className="flex justify-between text-red-600">
                                <span className={bn ? 'font-bengali' : ''}>{bn ? 'পেনাল্টি' : 'Penalties'}</span>
                                <span className="font-mono font-bold">-{formatLeaderboardNumber(penalties)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-slate-900">
                            <span className={bn ? 'font-bengali' : ''}>{bn ? 'নেট পয়েন্ট' : 'Net'}</span>
                            <span className="font-mono text-amber-900">{formatLeaderboardNumber(netPoints)}</span>
                        </div>
                        <div className="flex justify-between text-amber-950 pt-1 border-t border-slate-200/80">
                            <span className={bn ? 'font-bengali' : ''}>{bn ? 'সক্রিয় দিন' : 'Active days'}</span>
                            <span className="font-mono font-bold">
                                {activeDays}/{eligibleDays} ({consistencyPct}%)
                            </span>
                        </div>
                        <p className="font-mono text-[10px] font-black text-amber-950 text-center pt-0.5">
                            {formatLeaderboardNumber(netPoints)} × (1 + {activeDays}/{eligibleDays}) = {formatLeaderboardNumber(yearlyScore)}
                        </p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-[9px] font-bold min-w-0 ${isQualified ? 'text-emerald-700' : 'text-amber-700'} ${bn ? 'font-bengali' : ''}`}>
                            {isQualified
                                ? (bn ? '✅ যোগ্য · ন্যূনতম ৩০ দিন' : '✅ Qualified · min 30d')
                                : (bn ? `⚠️ আর ${daysNeeded} দিন` : `⚠️ ${daysNeeded} more days`)}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {onOpenUserProgress && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onOpenUserProgress(player.user_id, {
                                            ...player,
                                            points: Number(player.lifetime_score) || Number(player.net_points) || 0,
                                            score: Number(player.yearly_score) || Number(player.net_points) || 0,
                                        }, player.rank);
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
            </div>
        </div>,
        document.body
    );
}
