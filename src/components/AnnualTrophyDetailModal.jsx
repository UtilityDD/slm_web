import React from 'react';
import LeaderboardRankChip from './LeaderboardRankChip';
import ReadingLevelAvatarFrame from './ReadingLevelAvatarFrame';
import { formatLeaderboardNumber } from '../utils/monthlyEncouragementBoards';

export default function AnnualTrophyDetailModal({
    player,
    isOpen,
    onClose,
    language = 'bn',
    isYou = false,
    onOpenUserProgress,
    onMaximizeImage,
}) {
    if (!isOpen || !player) return null;

    const bn = language === 'bn';
    const grossPoints = Number(player.points_earned) || (Number(player.net_points) + (Number(player.penalties_incurred) || 0));
    const penalties = Number(player.penalties_incurred) || 0;
    const netPoints = Number(player.net_points) || 0;
    const activeDays = Number(player.active_days) || 0;
    const eligibleDays = Number(player.eligible_days) || 1;
    const consistencyRate = Math.min(1.0, activeDays / eligibleDays);
    const consistencyPct = player.consistency_pct ?? Math.round(consistencyRate * 100);
    const multiplier = (1 + consistencyRate).toFixed(4);
    const yearlyScore = player.yearly_score || Math.round(netPoints * (1 + consistencyRate));
    const lifetimeScore = player.lifetime_score || netPoints;
    const isQualified = player.is_qualified ?? (activeDays >= 30);
    const daysNeeded = player.days_needed_to_qualify ?? Math.max(0, 30 - activeDays);

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
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-300/80 bg-white shadow-2xl my-auto z-10">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        <h3 className={`text-sm font-black leading-tight ${bn ? 'font-bengali' : ''}`}>
                            {bn ? 'স্কোর হিসাব' : 'Score Details'}
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
                            readingPoints={player.reading_points || 0}
                            language={language}
                            sizeClass="h-10 w-10"
                            avatarUrl={player.avatar_url}
                            fallbackLetter={player.full_name?.[0] || '?'}
                            onAvatarClick={(e) => {
                                e.stopPropagation();
                                onMaximizeImage?.(player.avatar_url, e);
                            }}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                <h4 className={`text-sm font-black text-slate-900 truncate ${bn ? 'font-bengali' : ''}`}>
                                    {player.full_name}
                                </h4>
                                {isYou && (
                                    <span className="rounded bg-amber-500 px-1 py-0.2 text-[8px] font-black text-white">
                                        {bn ? 'আপনি' : 'You'}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">
                                {player.district || (bn ? 'কোনো জেলা নেই' : 'No District')}
                            </p>
                        </div>
                        <LeaderboardRankChip rank={player.rank} size="sm" />
                    </div>

                    {/* 2-Column Summary: Lifetime vs Grand Score */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                            <span className="text-[10px] font-bold text-slate-500 block">
                                {bn ? 'সর্বকালীন স্কোর' : 'Lifetime Score'}
                            </span>
                            <span className="font-mono text-base font-black text-slate-900 tabular-nums">
                                {formatLeaderboardNumber(lifetimeScore)}
                            </span>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-2.5">
                            <span className="text-[10px] font-bold text-amber-800 block">
                                {bn ? 'বার্ষিক গ্র্যান্ড স্কোর' : 'Grand Trophy Score'}
                            </span>
                            <span className="font-mono text-base font-black text-amber-950 tabular-nums">
                                {formatLeaderboardNumber(yearlyScore)}
                            </span>
                        </div>
                    </div>

                    {/* Concise Breakdown Table */}
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-600">
                            <span>{bn ? 'অর্জিত পয়েন্ট' : 'Points Earned'}</span>
                            <span className="font-mono font-bold text-slate-800">+{formatLeaderboardNumber(grossPoints)}</span>
                        </div>
                        {penalties > 0 && (
                            <div className="flex justify-between text-red-600">
                                <span>{bn ? 'পেনাল্টি' : 'Penalties'}</span>
                                <span className="font-mono font-bold">-{formatLeaderboardNumber(penalties)}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                            <span>{bn ? 'বার্ষিক নেট পয়েন্ট' : 'Annual Net Points'}</span>
                            <span className="font-mono text-amber-900">{formatLeaderboardNumber(netPoints)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                            <span>{bn ? 'সক্রিয় দিন' : 'Active Days'}</span>
                            <span className="font-mono font-bold text-amber-900">
                                {activeDays}/{eligibleDays} {bn ? 'দিন' : 'days'} (+{consistencyPct}%)
                            </span>
                        </div>
                    </div>

                    {/* Step-by-Step Formula Line */}
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-2.5 text-center">
                        <p className="font-mono text-xs font-black text-amber-950">
                            {formatLeaderboardNumber(netPoints)} × {multiplier} = {formatLeaderboardNumber(yearlyScore)}
                        </p>
                    </div>

                    {/* Qualification status badge */}
                    <div className="flex items-center justify-between text-[10px] font-bold px-1">
                        {isQualified ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                                <span>✅</span>
                                <span>{bn ? 'অফিশিয়াল ট্রফির যোগ্য' : 'Officially Qualified'}</span>
                            </span>
                        ) : (
                            <span className="text-amber-700 flex items-center gap-1">
                                <span>⚠️</span>
                                <span>{bn ? `আর ${daysNeeded} দিন খেলতে হবে` : `${daysNeeded} more active days needed`}</span>
                            </span>
                        )}
                        <span className="text-slate-400 font-medium">
                            {bn ? 'ন্যূনতম ৩০ দিন' : 'Min 30d'}
                        </span>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="border-t border-slate-100 bg-slate-50 px-3.5 py-2.5 flex items-center justify-end gap-2">
                    {onOpenUserProgress && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onOpenUserProgress(player.user_id, player, player.rank);
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
