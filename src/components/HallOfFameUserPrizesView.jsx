import React, { useMemo, useState } from 'react';
import HallOfFamePrizeImage from './HallOfFamePrizeImage';
import { getBoardTabLabel, getHallOfFamePrizeViewCopy, groupPrizeWinsByUser, collectAllUserPrizeWins } from '../utils/hallOfFamePrizes';
import { getRankMedal } from '../utils/monthlyEncouragementBoards';

export default function HallOfFameUserPrizesView({
    hallOfFameData,
    language,
    monthlyTabs,
    filterUserId = null,
    onClearFilter,
    onOpenUserProgress,
    onMaximizeImage,
}) {
    const copy = getHallOfFamePrizeViewCopy(language);
    const [search, setSearch] = useState('');

    const groupedUsers = useMemo(() => {
        const wins = collectAllUserPrizeWins(hallOfFameData, language);
        return groupPrizeWinsByUser(wins);
    }, [hallOfFameData, language]);

    const filteredUsers = useMemo(() => {
        let list = groupedUsers;
        if (filterUserId) {
            list = list.filter((user) => user.userId === filterUserId);
        }
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((user) => {
            const name = (user.fullName || '').toLowerCase();
            const slm = (user.slmId || '').toLowerCase();
            return name.includes(q) || slm.includes(q);
        });
    }, [groupedUsers, filterUserId, search]);

    return (
        <div className="mx-auto max-w-3xl space-y-4 px-1">
            <div className="text-center">
                <h3 className={`text-sm font-black text-slate-900 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {copy.userPrizesTitle}
                </h3>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={copy.userPrizesSearch}
                    className={`w-full border-2 border-slate-900 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-[2px_2px_0_#0f172a] outline-none focus:bg-orange-50 ${language === 'bn' ? 'font-bengali' : ''}`}
                />
                {filterUserId && onClearFilter && (
                    <button
                        type="button"
                        onClick={onClearFilter}
                        className={`shrink-0 border-2 border-slate-900 bg-white px-3 py-2 text-[10px] font-black text-slate-700 shadow-[2px_2px_0_#0f172a] hover:bg-orange-50 ${language === 'bn' ? 'font-bengali' : 'nb-mono uppercase'}`}
                    >
                        {language === 'en' ? 'Show all' : 'সব দেখুন'}
                    </button>
                )}
            </div>

            {filteredUsers.length === 0 ? (
                <p className={`nb-card border-dashed bg-amber-50 px-4 py-10 text-center text-xs font-semibold text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {copy.userPrizesEmpty}
                </p>
            ) : (
                <div className="space-y-3">
                    {filteredUsers.map((user) => (
                        <article
                            key={user.userId}
                            className="overflow-hidden border-2 border-slate-900 bg-white shadow-[3px_3px_0_#0f172a]"
                        >
                            <button
                                type="button"
                                onClick={() => onOpenUserProgress(user.userId)}
                                className="flex w-full items-center gap-3 border-b-2 border-slate-900 bg-orange-50 px-3 py-2.5 text-left transition-colors hover:bg-orange-100"
                            >
                                <div className="h-10 w-10 shrink-0 overflow-hidden border-2 border-slate-900 bg-slate-100">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-slate-400">
                                            {(user.fullName || '?')[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`truncate text-sm font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {user.fullName || 'Anonymous'}
                                    </p>
                                    {user.slmId && (
                                        <p className="text-[10px] font-semibold text-slate-500 nb-mono">{user.slmId}</p>
                                    )}
                                </div>
                                <span className={`shrink-0 rounded-full border-2 border-slate-900 bg-white px-2 py-0.5 text-[10px] font-black text-orange-700 ${language === 'bn' ? 'font-bengali' : 'nb-mono'}`}>
                                    {user.prizes.length} {copy.userPrizesCount}
                                </span>
                            </button>

                            <ul className="divide-y divide-dashed divide-slate-200">
                                {user.prizes.map((win) => (
                                    <li
                                        key={`${win.year}-${win.month}-${win.boardId}-${win.prizeRank}`}
                                        className="flex items-start gap-2.5 px-3 py-2.5"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => onMaximizeImage(win.prize.imageCandidates?.[0] || win.prize.imageUrl)}
                                            className="h-14 w-14 shrink-0 overflow-hidden border border-slate-900 bg-white p-1 shadow-[1px_1px_0_#0f172a]"
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
                                                <span className={`text-slate-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {win.monthLabel}
                                                </span>
                                                <span className="text-slate-300" aria-hidden>·</span>
                                                <span className={`font-black text-slate-800 ${language === 'bn' ? 'font-bengali' : 'nb-mono'}`}>
                                                    {win.rankLabel}
                                                </span>
                                                <span className="text-slate-300" aria-hidden>·</span>
                                                <span className={`text-orange-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {getBoardTabLabel(win.boardId, monthlyTabs)}
                                                </span>
                                            </p>
                                            <p className={`mt-0.5 text-xs font-black leading-snug text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {win.prize.title}
                                            </p>
                                            {win.prize.sponsor && (
                                                <p className={`mt-0.5 truncate text-[10px] font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {language === 'en' ? 'Courtesy of ' : 'সৌজন্যে '}
                                                    {win.prize.sponsor}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
