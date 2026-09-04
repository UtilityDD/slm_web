import React, { useState } from 'react';
import LeaderboardRankChip from './LeaderboardRankChip';
import ReadingLevelAvatarFrame from './ReadingLevelAvatarFrame';
import AvatarPhoto from './AvatarPhoto';
import { AVATAR_EDGE } from '../utils/avatarImage';
import { formatLeaderboardNumber } from '../utils/monthlyEncouragementBoards';
import { BrutalLoaderContent } from './loaders/PageLoader';
import AnnualTrophyDetailModal from './AnnualTrophyDetailModal';

/** Top-3 podium: first name only for compact display */
function formatPodiumFirstName(fullName) {
    const trimmed = (fullName || '').trim();
    if (!trimmed) return '';
    const base = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
    const first = base.split(/\s+/)[0] || base;
    return first.length > 14 ? `${first.slice(0, 12)}…` : first;
}

export default function AnnualGrandTrophyLeaderboard({
    annualLeaderboard = [],
    loading = false,
    language = 'bn',
    currentUserId,
    onOpenUserProgress,
    onMaximizeImage,
    onRefresh,
}) {
    const bn = language === 'bn';
    const [selectedDetailPlayer, setSelectedDetailPlayer] = useState(null);

    if (loading && annualLeaderboard.length === 0) {
        return (
            <div className="flex min-h-[300px] flex-col items-center justify-center py-12" role="status">
                <BrutalLoaderContent compact message={bn ? 'বার্ষিক ট্রফি তালিকা তৈরি হচ্ছে…' : 'Loading Annual Trophy…'} />
            </div>
        );
    }

    const qualifiedPlayers = annualLeaderboard.filter((p) => p.is_qualified);
    const topThree = qualifiedPlayers.slice(0, 3);
    const restList = annualLeaderboard.slice(topThree.length);

    // Podium re-ordering: [Silver (#2), Gold (#1), Bronze (#3)]
    let podiumOrdered = [];
    if (topThree.length === 1) {
        podiumOrdered = [topThree[0]];
    } else if (topThree.length === 2) {
        podiumOrdered = [topThree[1], topThree[0]];
    } else if (topThree.length >= 3) {
        podiumOrdered = [topThree[1], topThree[0], topThree[2]];
    }

    const rankRing = {
        1: 'ring-[3px] ring-amber-400 shadow-[0_0_32px_rgba(251,191,36,0.45)]',
        2: 'ring-[3px] ring-slate-300 shadow-[0_0_20px_rgba(148,163,184,0.4)]',
        3: 'ring-[3px] ring-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.4)]',
    };
    const pedestalClass = {
        1: 'h-14 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 sm:h-16',
        2: 'h-10 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 sm:h-12',
        3: 'h-8 bg-gradient-to-b from-orange-300 via-orange-400 to-amber-600 sm:h-10',
    };

    return (
        <div className="space-y-4 animate-fade-in pb-24 md:pb-28">
            {/* Header Banner - Compact & Clean */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-50/60 px-4 py-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl sm:text-2xl shrink-0" aria-hidden="true">🏆</span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h2 className={`text-sm sm:text-base font-black text-slate-900 leading-tight truncate ${bn ? 'font-bengali' : ''}`}>
                                {bn ? '৭ই মার্চ বার্ষিক ট্রফি' : '7th March Annual Trophy'}
                            </h2>
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-800 leading-none">
                                2026-27
                            </span>
                        </div>
                        <p className={`mt-0.5 text-[11px] font-semibold text-amber-900/80 truncate ${bn ? 'font-bengali' : ''}`}>
                            {bn ? 'স্কোর × (১ + ধারাবাহিকতা)' : 'Score × (1 + Consistency)'}
                        </p>
                    </div>
                </div>

                <div className="shrink-0">
                    <span className="inline-flex items-center rounded-full bg-white/90 border border-amber-200/90 px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-xs">
                        {bn ? 'ন্যূনতম ৩০ দিন' : 'Min 30 days'}
                    </span>
                </div>
            </div>

            {/* Top 3 Podium */}
            {topThree.length > 0 && (
                <div className="leaderboard-podium-stage relative overflow-visible rounded-3xl border border-amber-200/70 bg-gradient-to-b from-amber-50/90 via-orange-50/40 to-white px-2 pb-2 pt-10 shadow-lg shadow-amber-500/10 sm:px-5 sm:pb-3 sm:pt-12">
                    <div className="relative z-10 grid grid-cols-3 items-end gap-2 sm:gap-4">
                        {podiumOrdered.map((player) => {
                            const rank = player.rank;
                            const isWinner = rank === 1;
                            const displayName = formatPodiumFirstName(player.full_name);

                            return (
                                <div
                                    key={player.user_id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedDetailPlayer(player)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') setSelectedDetailPlayer(player);
                                    }}
                                    className={`flex flex-col items-center cursor-pointer transition-transform active:scale-[0.97] ${
                                        isWinner ? '-translate-y-1.5' : ''
                                    }`}
                                >
                                    <div className="relative mb-2 flex flex-col items-center">
                                        {rank === 1 && (
                                            <span className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2" aria-hidden="true">
                                                <span className="block text-2xl leading-none sm:text-3xl">👑</span>
                                            </span>
                                        )}
                                        <div className={`relative ${isWinner ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-14 w-14 sm:h-16 sm:w-16'} shrink-0`}>
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onMaximizeImage?.(player.avatar_url, e);
                                                }}
                                                className={`absolute inset-0 cursor-zoom-in overflow-hidden rounded-full border-[3px] border-white bg-white sm:border-4 ${
                                                    rankRing[rank] || ''
                                                }`}
                                            >
                                                {player.avatar_url ? (
                                                    <AvatarPhoto url={player.avatar_url} edge={AVATAR_EDGE.podium} className="h-full w-full object-cover" alt="" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-xl font-black text-slate-500 sm:text-2xl">
                                                        {displayName?.[0] || '?'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <p className={`mb-1 max-w-full px-0.5 text-center text-xs font-black leading-tight text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                                        <span className="block truncate">{displayName}</span>
                                    </p>

                                    {/* Consistency Pill */}
                                    <span className="mb-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-100/80 px-1.5 py-0.5 text-[9px] font-black text-amber-900 sm:text-[10px]">
                                        <span>🔥</span>
                                        <span>{player.active_days}d</span>
                                        <span className="text-amber-700 font-semibold">({player.consistency_pct}%)</span>
                                    </span>

                                    {/* Yearly Grand Score */}
                                    <span className="mb-2 font-mono text-xs font-black text-amber-950 sm:text-sm">
                                        {formatLeaderboardNumber(player.yearly_score)}
                                    </span>

                                    <div className={`flex w-full items-start justify-center rounded-t-2xl pt-1.5 shadow-inner ${pedestalClass[rank]}`} aria-hidden="true">
                                        <span className="text-sm font-black text-white drop-shadow-sm sm:text-base">
                                            {rank}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* List Rows */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                {annualLeaderboard.map((item) => {
                    const isYou = Boolean(currentUserId && item.user_id === currentUserId);
                    const isTopThree = item.rank <= 3 && item.is_qualified;

                    return (
                        <div
                            key={item.user_id}
                            onClick={() => setSelectedDetailPlayer(item)}
                            className={`flex items-center gap-2.5 border-b border-slate-100 p-3 transition-colors last:border-b-0 cursor-pointer active:bg-orange-50/60 sm:gap-4 sm:p-4 ${
                                isYou
                                    ? 'border-l-[3px] border-l-amber-500 bg-amber-50/60 hover:bg-amber-50/80'
                                    : isTopThree
                                        ? 'bg-amber-50/25 hover:bg-amber-50/50'
                                        : 'hover:bg-slate-50'
                            }`}
                        >
                            {/* Rank Chip */}
                            <div className="flex w-6 shrink-0 items-center justify-center">
                                <LeaderboardRankChip rank={item.rank} size="sm" />
                            </div>

                            {/* Avatar */}
                            <ReadingLevelAvatarFrame
                                level={item.training_level || 0}
                                readingPoints={item.reading_lessons * 20}
                                language={language}
                                sizeClass="h-10 w-10 sm:h-11 sm:w-11"
                                avatarUrl={item.avatar_url}
                                fallbackLetter={item.full_name?.[0] || '?'}
                                onAvatarClick={(e) => {
                                    e.stopPropagation();
                                    onMaximizeImage?.(item.avatar_url, e);
                                }}
                            />

                            {/* Center Info */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <p className={`truncate text-sm font-black leading-tight text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                                        {item.full_name}
                                    </p>
                                    {isYou && (
                                        <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                                            {bn ? 'আপনি' : 'You'}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs">
                                    {/* Active Days Badge */}
                                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-100/70 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                                        <span>🔥</span>
                                        <span>{item.active_days} {bn ? 'দিন' : 'days'}</span>
                                        <span className="text-amber-700 font-semibold">({item.consistency_pct}%)</span>
                                    </span>

                                    {/* Penalty Tag if any */}
                                    {item.penalties_incurred > 0 && (
                                        <span className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1 py-0.5 text-[9px] font-semibold text-red-600">
                                            <span>⚠️ -{formatLeaderboardNumber(item.penalties_incurred)}</span>
                                        </span>
                                    )}

                                    {/* Qualification Pill if not yet qualified */}
                                    {!item.is_qualified && (
                                        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                                            {bn ? `যোগ্যতা: আর ${item.days_needed_to_qualify} দিন` : `${item.days_needed_to_qualify}d to qualify`}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right Score Column */}
                            <div className="text-right shrink-0 pl-1">
                                <div className="flex flex-col items-end">
                                    <p className="font-mono text-base font-black tabular-nums leading-none text-amber-900 sm:text-lg">
                                        {formatLeaderboardNumber(item.yearly_score)}
                                    </p>
                                    <span className="mt-0.5 text-[9px] font-semibold text-slate-400">
                                        {formatLeaderboardNumber(item.net_points)} pts (+{item.consistency_pct}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Score Breakdown Modal */}
            <AnnualTrophyDetailModal
                player={selectedDetailPlayer}
                isOpen={Boolean(selectedDetailPlayer)}
                onClose={() => setSelectedDetailPlayer(null)}
                language={language}
                isYou={Boolean(currentUserId && selectedDetailPlayer?.user_id === currentUserId)}
                onOpenUserProgress={onOpenUserProgress}
                onMaximizeImage={onMaximizeImage}
            />
        </div>
    );
}
