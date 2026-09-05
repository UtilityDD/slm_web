import React, { useMemo, useState } from 'react';
import { completedLessonsForBadge, firstTimeReadingPointsFromLessons, getBadgeByLevel } from '../utils/badgeUtils';
import {
    formatMonthlyPlayerScore,
    getRankMedal,
    isPrizeRecipient,
    isPrizeSuperseded,
    PRIZE_STATUS,
} from '../utils/monthlyEncouragementBoards';
import {
    getPrizeImageCandidates,
    lookupHallOfFamePrizeForWinner,
    resolvePrizeDisplay,
} from '../utils/hallOfFamePrizes';
import HallOfFamePrizeImage from './HallOfFamePrizeImage';
import AvatarPhoto from './AvatarPhoto';
import { AVATAR_EDGE } from '../utils/avatarImage';

const RANK_STYLES = {
    1: {
        header: 'bg-gradient-to-r from-amber-400 to-yellow-300',
        ring: 'ring-amber-400/50',
        accent: 'text-amber-800',
        label_bn: '১ম পুরস্কার',
        label_en: '1st Prize',
    },
    2: {
        header: 'bg-gradient-to-r from-slate-300 to-slate-200',
        ring: 'ring-slate-300/70',
        accent: 'text-slate-700',
        label_bn: '২য় পুরস্কার',
        label_en: '2nd Prize',
    },
    3: {
        header: 'bg-gradient-to-r from-orange-300 to-amber-200',
        ring: 'ring-orange-300/60',
        accent: 'text-orange-800',
        label_bn: '৩য় পুরস্কার',
        label_en: '3rd Prize',
    },
};

function PrizeFocusCard({
    medalRank,
    prize,
    winner,
    language,
    onOpenUserProgress,
    onMaximizeImage,
    onViewUserPrizes,
}) {
    const style = RANK_STYLES[medalRank] || RANK_STYLES[3];
    const rankLabel = language === 'bn' ? style.label_bn : style.label_en;
    const imageCandidates = useMemo(
        () => prize.imageCandidates?.length ? prize.imageCandidates : getPrizeImageCandidates(prize.imageUrl || ''),
        [prize.imageCandidates, prize.imageUrl]
    );
    const [resolvedImageUrl, setResolvedImageUrl] = useState(null);
    const hasPrizeImage = imageCandidates.length > 0;

    return (
        <article
            className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm transition-transform hover:-translate-y-0.5 ${style.ring} ring-1 ring-offset-1 ring-offset-[#fffdf7]`}
        >
            <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-slate-50">
                {hasPrizeImage ? (
                    <button
                        type="button"
                        onClick={(e) => onMaximizeImage(resolvedImageUrl || imageCandidates[0], e, {
                            kind: 'prize',
                            title: prize.title || '',
                            subtitle: rankLabel,
                        })}
                        className="group/img absolute inset-0 flex items-center justify-center p-2 sm:p-2.5"
                    >
                        <HallOfFamePrizeImage
                            key={imageCandidates.join('|') || 'empty'}
                            candidates={imageCandidates}
                            alt={prize.imageAlt || prize.title || ''}
                            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover/img:scale-105"
                            onResolved={setResolvedImageUrl}
                        />
                    </button>
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-amber-50 text-3xl" aria-hidden>
                        🎁
                    </div>
                )}
                <div className={`pointer-events-none absolute left-2 top-2 z-10 flex h-10 min-w-10 items-center justify-center rounded-full px-1.5 shadow-md ${style.header}`}>
                    <span className="text-2xl leading-none" aria-hidden>{getRankMedal(medalRank)}</span>
                </div>
            </div>

            <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2">
                <button
                    type="button"
                    onClick={() => (onViewUserPrizes ? onViewUserPrizes(winner.user_id) : onOpenUserProgress(winner.user_id))}
                    className={`truncate text-left text-[13px] font-black leading-tight text-slate-900 hover:text-orange-600 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}
                >
                    {winner.full_name || 'Anonymous'}
                </button>
                {prize.title && (
                    <h4 className={`mt-0.5 line-clamp-2 text-xs font-bold leading-snug text-slate-700 sm:text-[13px] ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {prize.title}
                        {prize.caution ? (
                            <>
                                {' '}
                                <span className="font-bold text-red-600">({prize.caution})</span>
                            </>
                        ) : null}
                    </h4>
                )}
                {prize.sponsor && (
                    <p className={`mt-auto pt-1.5 text-[10px] font-semibold leading-tight text-amber-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        <span className="font-bold text-amber-600">{language === 'en' ? 'Sponsor' : 'স্পনসর'}</span>
                        {' · '}
                        {prize.sponsor}
                    </p>
                )}
            </div>
        </article>
    );
}

export default function HallOfFameWinnerCard({
    winner,
    winIdx,
    entry,
    boardTab,
    language,
    noDistrictLabel,
    encouragementCopy,
    viewMode = 'compact',
    onOpenUserProgress,
    onMaximizeImage,
    onViewUserPrizes,
}) {
    const superseded = isPrizeSuperseded(winner);
    const prizeRecipient = isPrizeRecipient(winner);
    const medalRank = superseded
        ? winner.standing_rank
        : (winner.prize_rank || winner.standing_rank || winIdx + 1);
    const isGold = !superseded && medalRank === 1;

    const rawPrize = prizeRecipient ? lookupHallOfFamePrizeForWinner(entry, boardTab, winner) : null;
    const prize = resolvePrizeDisplay(rawPrize, language);
    const isPrizeView = viewMode === 'detailed' && prizeRecipient && Boolean(prize);

    if (isPrizeView) {
        return (
            <PrizeFocusCard
                medalRank={medalRank}
                prize={prize}
                winner={winner}
                language={language}
                onOpenUserProgress={onOpenUserProgress}
                onMaximizeImage={onMaximizeImage}
                onViewUserPrizes={onViewUserPrizes}
            />
        );
    }

    if (viewMode === 'detailed' && !prizeRecipient) {
        return (
            <div
                className={`flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}
            >
                <span aria-hidden>{getRankMedal(medalRank)}</span>
                <span className="truncate font-semibold">{winner.full_name || 'Anonymous'}</span>
                {superseded && (
                    <span className="shrink-0 rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-extrabold text-red-600 shadow-sm">{encouragementCopy.prizeSuperseded}</span>
                )}
                {winner.prize_status === PRIZE_STATUS.REPLACEMENT && (
                    <span className="shrink-0 text-[11px] font-bold text-orange-700">{encouragementCopy.prizeReplacement}</span>
                )}
            </div>
        );
    }

    const scoreTone = superseded
        ? 'text-slate-400'
        : isGold
            ? 'text-amber-600'
            : medalRank === 2
                ? 'text-slate-600'
                : 'text-orange-600';

    return (
        <div
            onClick={() => onOpenUserProgress(winner.user_id)}
            className={`group flex cursor-pointer flex-col gap-2 border-l-4 py-3.5 pl-2.5 pr-1.5 transition-colors active:bg-orange-50 sm:pl-3.5 ${
                superseded
                    ? 'border-slate-200 hover:bg-slate-50'
                    : prizeRecipient
                        ? 'border-orange-400 hover:bg-orange-50/60'
                        : 'border-transparent hover:bg-orange-50/30'
            }`}
        >
            <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            if (winner.avatar_url) onMaximizeImage(winner.avatar_url, e);
                        }}
                        className={`h-11 w-11 cursor-zoom-in overflow-hidden rounded-full border border-orange-200/80 bg-orange-50 shadow-sm transition-transform active:scale-95 sm:h-12 sm:w-12 ${superseded ? 'opacity-40 grayscale' : ''}`}
                    >
                        {winner.avatar_url ? (
                            <AvatarPhoto url={winner.avatar_url} edge={AVATAR_EDGE.card} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-orange-600">
                                {(winner.full_name || '?')[0]}
                            </div>
                        )}
                    </div>
                    <span
                        className={`absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white text-sm leading-none shadow-sm ${superseded ? 'opacity-40 grayscale' : ''}`}
                        aria-hidden
                    >
                        {getRankMedal(medalRank)}
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p
                                className={`truncate text-sm font-black leading-tight sm:text-[15px] ${
                                    superseded
                                        ? 'text-slate-400 line-through decoration-slate-300'
                                        : 'text-slate-900 group-hover:text-orange-600'
                                }`}
                            >
                                {winner.full_name || 'Anonymous'}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                {superseded && (
                                    <span className={`inline-block shrink-0 rounded-full border border-red-200 bg-white/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-red-600 shadow-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {encouragementCopy.prizeSuperseded}
                                    </span>
                                )}
                                {winner.prize_status === PRIZE_STATUS.REPLACEMENT && (
                                    <span className={`text-[11px] font-bold text-orange-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {encouragementCopy.prizeReplacement}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className={`shrink-0 text-base font-black tabular-nums sm:text-lg ${scoreTone}`}>
                            {formatMonthlyPlayerScore(winner, boardTab)}
                        </p>
                    </div>

                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-semibold leading-tight text-slate-500">
                        <span className="shrink-0 tabular-nums text-slate-600">
                            {winner.slm_id || (language === 'en' ? 'SLM' : 'এসএলএম')}
                        </span>
                        <span className="text-slate-300" aria-hidden>·</span>
                        <span className={`truncate ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {winner.district || noDistrictLabel}
                        </span>
                        {(() => {
                            const badge = getBadgeByLevel(
                                winner.training_level || 0,
                                firstTimeReadingPointsFromLessons(completedLessonsForBadge(winner))
                            );
                            if (!badge) return null;
                            return (
                                <>
                                    <span className="text-slate-300" aria-hidden>·</span>
                                    <span className={`hidden truncate rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase sm:inline ${badge.color}`}>
                                        {language === 'en' ? badge.en : badge.bn}
                                    </span>
                                </>
                            );
                        })()}
                    </p>
                </div>
            </div>
        </div>
    );
}
