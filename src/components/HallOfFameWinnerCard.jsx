import React, { useMemo, useState } from 'react';
import { getBadgeByLevel } from '../utils/badgeUtils';
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

const RANK_STYLES = {
    1: {
        header: 'bg-gradient-to-r from-amber-400 to-yellow-300',
        ring: 'ring-amber-400/60',
        accent: 'text-amber-700',
        label_bn: '১ম পুরস্কার',
        label_en: '1st Prize',
    },
    2: {
        header: 'bg-gradient-to-r from-slate-300 to-slate-200',
        ring: 'ring-slate-300/80',
        accent: 'text-slate-700',
        label_bn: '২য় পুরস্কার',
        label_en: '2nd Prize',
    },
    3: {
        header: 'bg-gradient-to-r from-orange-300 to-amber-200',
        ring: 'ring-orange-300/70',
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
            className={`flex h-full flex-col overflow-hidden border-2 border-slate-900 bg-white shadow-[3px_3px_0_#0f172a] transition-transform hover:-translate-y-0.5 ${style.ring} ring-2 ring-offset-2`}
        >
            <div className={`flex items-center justify-between gap-2 border-b-2 border-slate-900 px-3 py-2 ${style.header}`}>
                <div className="flex items-center gap-2">
                    <span className="text-xl leading-none" aria-hidden>{getRankMedal(medalRank)}</span>
                    <p className={`text-xs font-black uppercase tracking-wide sm:text-sm ${style.accent} ${language === 'bn' ? 'font-bengali normal-case' : 'nb-mono'}`}>
                        {rankLabel}
                    </p>
                </div>
            </div>

            <div className="flex flex-1 flex-col p-3 sm:p-4">
                <div className="mb-3 overflow-hidden border-2 border-slate-900 shadow-[2px_2px_0_#0f172a]">
                    <button
                        type="button"
                        onClick={() => (onViewUserPrizes ? onViewUserPrizes(winner.user_id) : onOpenUserProgress(winner.user_id))}
                        className={`flex w-full items-center gap-2 border-b-2 border-slate-900 bg-slate-900 px-3 py-2 text-left transition-colors hover:bg-orange-600 ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        <span className="shrink-0 text-base leading-none" aria-hidden>{getRankMedal(medalRank)}</span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-300 nb-mono">
                                {language === 'en' ? 'Winner' : 'বিজয়ী'}
                            </p>
                            <p className="truncate text-sm font-black text-white sm:text-base">
                                {winner.full_name || 'Anonymous'}
                            </p>
                        </div>
                    </button>

                    {hasPrizeImage ? (
                        <button
                            type="button"
                            onClick={() => onMaximizeImage(resolvedImageUrl || imageCandidates[0])}
                            className="group/img relative flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-b from-slate-50 to-white p-3 transition-transform active:scale-[0.99]"
                        >
                            <HallOfFamePrizeImage
                                candidates={imageCandidates}
                                alt={prize.imageAlt || prize.title || ''}
                                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover/img:scale-105"
                                onResolved={setResolvedImageUrl}
                            />
                            <span className="pointer-events-none absolute bottom-2 right-2 border border-slate-900 bg-white/90 px-1.5 py-0.5 text-[9px] font-black text-slate-600 opacity-0 transition-opacity group-hover/img:opacity-100">
                                {language === 'en' ? 'Tap to enlarge' : 'বড় করে দেখুন'}
                            </span>
                        </button>
                    ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center bg-amber-50 text-4xl" aria-hidden>
                            🎁
                        </div>
                    )}
                </div>

                {prize.title && (
                    <h4 className={`text-sm font-black leading-snug text-slate-900 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {prize.title}
                    </h4>
                )}

                {prize.imageAlt && (
                    <p className={`mt-1.5 text-[11px] font-medium leading-relaxed text-slate-600 sm:text-xs ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {prize.imageAlt}
                    </p>
                )}

                {prize.sponsor && (
                    <div className="mt-auto pt-1">
                        <div className="border-t border-dashed border-amber-200 pt-3">
                            <p className={`text-[10px] font-bold uppercase tracking-wider text-amber-700 ${language === 'bn' ? 'font-bengali normal-case' : 'nb-mono'}`}>
                                {language === 'en' ? 'Courtesy of' : 'সৌজন্যে'}
                            </p>
                            <p className={`mt-0.5 text-xs font-black text-slate-800 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {prize.sponsor}
                            </p>
                        </div>
                    </div>
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
                className={`flex items-center gap-2 border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[10px] text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}
            >
                <span aria-hidden>{getRankMedal(medalRank)}</span>
                <span className="truncate">{winner.full_name || 'Anonymous'}</span>
                {superseded && (
                    <span className="shrink-0 font-extrabold text-[8px] text-red-600 dark:text-red-500 border border-red-600 dark:border-red-500 rounded px-1.5 py-0.5 bg-white shadow-[0_1px_2px_rgba(220,38,38,0.1)] transform -rotate-[2deg] origin-center">{encouragementCopy.prizeSuperseded}</span>
                )}
                {winner.prize_status === PRIZE_STATUS.REPLACEMENT && (
                    <span className="shrink-0 font-bold text-orange-700">{encouragementCopy.prizeReplacement}</span>
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
            className={`group flex cursor-pointer flex-col gap-2 border-l-4 py-3 pl-2.5 pr-1.5 transition-colors active:bg-orange-50 sm:pl-3.5 ${
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
                            if (winner.avatar_url) onMaximizeImage(winner.avatar_url);
                        }}
                        className={`h-11 w-11 cursor-zoom-in overflow-hidden border-2 border-slate-900 bg-slate-100 transition-transform active:scale-95 sm:h-12 sm:w-12 ${superseded ? 'opacity-40 grayscale' : ''}`}
                    >
                        {winner.avatar_url ? (
                            <img src={winner.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-slate-400">
                                {(winner.full_name || '?')[0]}
                            </div>
                        )}
                    </div>
                    <span
                        className={`absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center border border-slate-900 bg-white text-sm leading-none shadow-[1px_1px_0_#0f172a] ${superseded ? 'opacity-40 grayscale' : ''}`}
                        aria-hidden
                    >
                        {getRankMedal(medalRank)}
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p
                                className={`truncate text-xs font-black leading-tight sm:text-sm ${
                                    superseded
                                        ? 'text-slate-400 line-through decoration-slate-300'
                                        : 'text-slate-900 group-hover:text-orange-600'
                                }`}
                            >
                                {winner.full_name || 'Anonymous'}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {superseded && (
                                    <span className={`inline-block uppercase tracking-wider font-extrabold text-[8px] text-red-600 dark:text-red-500 border-2 border-red-600 dark:border-red-500 rounded px-1.5 py-0.5 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(220,38,38,0.15)] transform -rotate-[3deg] origin-center shrink-0 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {encouragementCopy.prizeSuperseded}
                                    </span>
                                )}
                                {winner.prize_status === PRIZE_STATUS.REPLACEMENT && (
                                    <span className={`text-[9px] font-bold text-orange-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {encouragementCopy.prizeReplacement}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className={`shrink-0 text-sm font-black tabular-nums sm:text-base ${scoreTone}`}>
                            {formatMonthlyPlayerScore(winner, boardTab)}
                        </p>
                    </div>

                    <p className="mt-1 flex min-w-0 items-center gap-1 text-[10px] font-semibold leading-tight text-slate-500">
                        <span className="shrink-0 tabular-nums text-slate-600 nb-mono">
                            {winner.slm_id || (language === 'en' ? 'SLM' : 'এসএলএম')}
                        </span>
                        <span className="text-slate-300" aria-hidden>·</span>
                        <span className={`truncate ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {winner.district || noDistrictLabel}
                        </span>
                        {(() => {
                            const badge = getBadgeByLevel(winner.training_level || 0, winner.all_time_reading_points || 0);
                            if (!badge) return null;
                            return (
                                <>
                                    <span className="text-slate-300" aria-hidden>·</span>
                                    <span className={`hidden truncate text-[9px] font-bold uppercase sm:inline ${badge.color}`}>
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
