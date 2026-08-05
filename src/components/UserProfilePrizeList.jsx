import React, { useEffect, useState } from 'react';
import HallOfFamePrizeImage from './HallOfFamePrizeImage';
import { getBoardTabLabel, getHallOfFamePrizeViewCopy, getUserPrizeWins } from '../utils/hallOfFamePrizes';
import { getEncouragementCopy, getRankMedal } from '../utils/monthlyEncouragementBoards';
import { leaderboardService } from '../utils/leaderboardService';

export default function UserProfilePrizeList({ userId, language = 'bn' }) {
    const [prizeWins, setPrizeWins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [maximizedImage, setMaximizedImage] = useState(null);

    const copy = getHallOfFamePrizeViewCopy(language);
    const monthlyTabs = getEncouragementCopy(language).monthlyTabs;
    const title = language === 'en' ? 'Prizes won' : 'জিতে নেওয়া পুরস্কার';
    const emptyText = language === 'en'
        ? 'No month-end prizes recorded yet.'
        : 'এখনও কোনো মাস শেষের পুরস্কারের তথ্য নেই।';

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
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="mb-4 h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, idx) => (
                        <div key={idx} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <>
            <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 dark:border-slate-800 dark:from-amber-950/30 dark:to-orange-950/20 sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400">
                                🏆 {language === 'en' ? 'Hall of Fame' : 'মাসের সেরারা'}
                            </p>
                            <h2 className={`mt-1 text-xl font-black text-slate-900 dark:text-slate-100 sm:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {title}
                            </h2>
                        </div>
                        {prizeWins.length > 0 && (
                            <span className={`shrink-0 rounded-full border-2 border-slate-900 bg-white px-2.5 py-1 text-[10px] font-black text-orange-700 shadow-[2px_2px_0_#0f172a] ${language === 'bn' ? 'font-bengali' : 'nb-mono'}`}>
                                {prizeWins.length} {copy.userPrizesCount}
                            </span>
                        )}
                    </div>
                </div>

                {prizeWins.length === 0 ? (
                    <p className={`px-5 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400 sm:px-6 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {emptyText}
                    </p>
                ) : (
                    <ul className="divide-y divide-dashed divide-slate-200 dark:divide-slate-800">
                        {prizeWins.map((win) => (
                            <li
                                key={`${win.year}-${win.month}-${win.boardId}-${win.prizeRank}`}
                                className="flex items-start gap-3 px-5 py-3.5 sm:px-6 sm:py-4"
                            >
                                <button
                                    type="button"
                                    onClick={() => setMaximizedImage(win.prize.imageCandidates?.[0] || win.prize.imageUrl)}
                                    className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-slate-900 bg-white p-1.5 shadow-[2px_2px_0_#0f172a] transition-transform hover:-translate-y-0.5 sm:h-[4.5rem] sm:w-[4.5rem]"
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
                                        <span className={`text-slate-700 dark:text-slate-300 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {win.monthLabel}
                                        </span>
                                        <span className="text-slate-300" aria-hidden>·</span>
                                        <span className={`font-black text-slate-800 dark:text-slate-200 ${language === 'bn' ? 'font-bengali' : 'nb-mono'}`}>
                                            {win.rankLabel}
                                        </span>
                                        <span className="text-slate-300" aria-hidden>·</span>
                                        <span className={`text-orange-700 dark:text-orange-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {getBoardTabLabel(win.boardId, monthlyTabs)}
                                        </span>
                                    </p>
                                    <p className={`mt-1 text-sm font-black leading-snug text-slate-900 dark:text-slate-100 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {win.prize.title}
                                        {win.prize.caution ? (
                                            <>
                                                {' '}
                                                <span className="font-bold text-red-600 dark:text-red-400">({win.prize.caution})</span>
                                            </>
                                        ) : null}
                                    </p>
                                    {win.prize.imageAlt && (
                                        <p className={`mt-1 text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {win.prize.imageAlt}
                                        </p>
                                    )}
                                    {win.prize.sponsor && (
                                        <p className={`mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Courtesy of ' : 'সৌজন্যে '}
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{win.prize.sponsor}</span>
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
                    <div className="absolute inset-0 bg-slate-900/70" onClick={() => setMaximizedImage(null)} aria-hidden="true" />
                    <div className="relative max-h-[90vh] max-w-lg overflow-hidden border-4 border-slate-900 bg-white shadow-[8px_8px_0_#0f172a]">
                        <button
                            type="button"
                            onClick={() => setMaximizedImage(null)}
                            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-white font-black text-slate-700 shadow-[2px_2px_0_#0f172a]"
                            aria-label={language === 'en' ? 'Close' : 'বন্ধ করুন'}
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
