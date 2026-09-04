import React, { useEffect, useState } from 'react';
import HallOfFamePrizeImage from './HallOfFamePrizeImage';
import { getBoardTabLabel, getHallOfFamePrizeViewCopy, getUserPrizeWins } from '../utils/hallOfFamePrizes';
import { getEncouragementCopy, getRankMedal } from '../utils/monthlyEncouragementBoards';
import { leaderboardService } from '../utils/leaderboardService';
import { peekCachedHallOfFame } from '../utils/hallOfFameSnapshots';

export default function UserProfilePrizeList({ userId, language = 'bn' }) {
    const [prizeWins, setPrizeWins] = useState(() => {
        const cached = peekCachedHallOfFame();
        return cached.length > 0 ? getUserPrizeWins(cached, userId, language) : [];
    });
    const [loading, setLoading] = useState(() => peekCachedHallOfFame().length === 0);
    const [maximizedImage, setMaximizedImage] = useState(null);

    const copy = getHallOfFamePrizeViewCopy(language);
    const monthlyTabs = getEncouragementCopy(language).monthlyTabs;
    const bn = language === 'bn';
    const title = bn ? 'জিতে নেওয়া পুরস্কার' : 'Prizes won';
    const emptyText = bn
        ? 'এখনও কোনো মাস শেষের পুরস্কারের তথ্য নেই।'
        : 'No month-end prizes recorded yet.';

    useEffect(() => {
        let active = true;

        (async () => {
            setLoading(true);
            try {
                const hallOfFameData = await leaderboardService.fetchHallOfFame(false);
                if (!active) return;
                setPrizeWins(getUserPrizeWins(hallOfFameData, userId, language));
            } catch {
                if (active) setPrizeWins([]);
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [userId, language]);

    if (loading) {
        return (
            <section className="rounded-2xl border border-orange-200/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 h-5 w-36 animate-pulse rounded bg-orange-100" />
                <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, idx) => (
                        <div key={idx} className="h-16 animate-pulse rounded-xl bg-orange-50" />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <>
            <section className="overflow-hidden rounded-2xl border border-orange-200/80 bg-white shadow-sm">
                <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50/80 to-white px-4 py-3.5 sm:px-5 sm:py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className={`text-[10px] font-bold text-orange-700 ${bn ? 'font-bengali' : 'uppercase tracking-[0.2em]'}`}>
                                {bn ? 'মাসের সেরারা' : 'Hall of Fame'}
                            </p>
                            <h2 className={`mt-0.5 text-lg font-black text-slate-900 sm:text-xl ${bn ? 'font-bengali' : ''}`}>
                                {title}
                            </h2>
                        </div>
                        {prizeWins.length > 0 && (
                            <span className={`shrink-0 rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-bold text-orange-700 ${bn ? 'font-bengali' : ''}`}>
                                {prizeWins.length} {copy.userPrizesCount}
                            </span>
                        )}
                    </div>
                </div>

                {prizeWins.length === 0 ? (
                    <p className={`px-4 py-7 text-center text-sm font-semibold text-slate-500 sm:px-5 ${bn ? 'font-bengali' : ''}`}>
                        {emptyText}
                    </p>
                ) : (
                    <ul className="divide-y divide-orange-50">
                        {prizeWins.map((win) => (
                            <li
                                key={`${win.year}-${win.month}-${win.boardId}-${win.prizeRank}`}
                                className="flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4"
                            >
                                <button
                                    type="button"
                                    onClick={() => setMaximizedImage(win.prize.imageCandidates?.[0] || win.prize.imageUrl)}
                                    className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-orange-200 bg-orange-50/50 p-1.5 transition-transform hover:-translate-y-0.5 active:scale-95 sm:h-[4.5rem] sm:w-[4.5rem]"
                                >
                                    <HallOfFamePrizeImage
                                        candidates={win.prize.imageCandidates || []}
                                        alt={win.prize.imageAlt || win.prize.title || ''}
                                        className="h-full w-full object-contain"
                                    />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                        <span aria-hidden>{getRankMedal(win.prizeRank)}</span>
                                        <span className={`text-slate-700 ${bn ? 'font-bengali' : ''}`}>
                                            {win.monthLabel}
                                        </span>
                                        <span className="text-slate-300" aria-hidden>·</span>
                                        <span className={`font-black text-slate-800 ${bn ? 'font-bengali' : ''}`}>
                                            {win.rankLabel}
                                        </span>
                                        <span className="text-slate-300" aria-hidden>·</span>
                                        <span className={`text-orange-700 ${bn ? 'font-bengali' : ''}`}>
                                            {getBoardTabLabel(win.boardId, monthlyTabs)}
                                        </span>
                                    </p>
                                    <p className={`mt-1 text-sm font-black leading-snug text-slate-900 sm:text-base ${bn ? 'font-bengali' : ''}`}>
                                        {win.prize.title}
                                        {win.prize.caution ? (
                                            <>
                                                {' '}
                                                <span className="font-bold text-red-600">({win.prize.caution})</span>
                                            </>
                                        ) : null}
                                    </p>
                                    {win.prize.imageAlt && (
                                        <p className={`mt-1 text-[11px] font-medium leading-relaxed text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                                            {win.prize.imageAlt}
                                        </p>
                                    )}
                                    {win.prize.sponsor && (
                                        <p className={`mt-1 text-[10px] font-semibold text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                                            {bn ? 'সৌজন্যে ' : 'Courtesy of '}
                                            <span className="font-bold text-slate-700">{win.prize.sponsor}</span>
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {maximizedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMaximizedImage(null)} aria-hidden="true" />
                    <div className="relative max-h-[90vh] max-w-lg overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-xl">
                        <button
                            type="button"
                            onClick={() => setMaximizedImage(null)}
                            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-700 shadow-sm"
                            aria-label={bn ? 'বন্ধ করুন' : 'Close'}
                        >
                            ×
                        </button>
                        <img src={maximizedImage} alt="" className="max-h-[85vh] w-full object-contain p-4" />
                    </div>
                </div>
            )}
        </>
    );
}
