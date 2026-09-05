import React, { useMemo, useState } from 'react';
import HallOfFamePrizeImage from './HallOfFamePrizeImage';
import AvatarPhoto from './AvatarPhoto';
import { AVATAR_EDGE } from '../utils/avatarImage';
import { getHallOfFamePrizeViewCopy, groupPrizeWinsByUser, collectAllUserPrizeWins, getBoardTabLabel } from '../utils/hallOfFamePrizes';
import { getEncouragementCopy, getRankMedal } from '../utils/monthlyEncouragementBoards';

function WinnerPrizeTile({ win, language, boardLabel, onMaximizeImage }) {
    const bn = language === 'bn';
    const subtitle = [win.monthLabel, boardLabel].filter(Boolean).join(' · ');

    return (
        <button
            type="button"
            onClick={(e) => onMaximizeImage(win.prize.imageCandidates?.[0] || win.prize.imageUrl, e, {
                kind: 'prize',
                title: win.prize.title || '',
                subtitle,
            })}
            className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-slate-200/80 transition-transform active:scale-[0.98]"
        >
            <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-slate-50">
                <div className="absolute inset-0 flex items-center justify-center p-1.5">
                    <HallOfFamePrizeImage
                        key={(win.prize.imageCandidates || []).join('|') || win.prize.imageUrl || 'empty'}
                        candidates={win.prize.imageCandidates || []}
                        alt={win.prize.imageAlt || win.prize.title || ''}
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
                <span
                    className="absolute left-1.5 top-1.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-xl leading-none shadow-md ring-1 ring-black/5"
                    aria-label={win.rankLabel}
                >
                    {getRankMedal(win.prizeRank)}
                </span>
            </div>
            <div className="h-11 shrink-0 border-t border-slate-100 px-1.5 py-1.5">
                <p className={`truncate text-[10px] font-medium leading-tight text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                    {win.monthLabel}
                </p>
                <p className={`mt-0.5 truncate text-[11px] font-semibold leading-tight text-slate-800 ${bn ? 'font-bengali' : ''}`}>
                    {boardLabel || '\u00a0'}
                </p>
            </div>
        </button>
    );
}

export default function HallOfFameUserPrizesView({
    hallOfFameData,
    language,
    filterUserId = null,
    onClearFilter,
    onOpenUserProgress,
    onMaximizeImage,
}) {
    const copy = getHallOfFamePrizeViewCopy(language);
    const [search, setSearch] = useState('');
    const bn = language === 'bn';
    const monthlyTabs = getEncouragementCopy(language).monthlyTabs;

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
        <div className="mx-auto max-w-xl space-y-4">
            <div className="flex items-center gap-2">
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={copy.userPrizesSearch}
                    className={`min-w-0 flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200/90 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-300/70 ${bn ? 'font-bengali' : ''}`}
                />
                {filterUserId && onClearFilter && (
                    <button
                        type="button"
                        onClick={onClearFilter}
                        className={`shrink-0 rounded-full bg-white px-3 py-2 text-xs font-semibold text-orange-700 shadow-sm ring-1 ring-slate-200/90 ${bn ? 'font-bengali' : ''}`}
                    >
                        {language === 'en' ? 'All' : 'সব'}
                    </button>
                )}
            </div>

            {filteredUsers.length === 0 ? (
                <p className={`rounded-3xl bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/80 ${bn ? 'font-bengali' : ''}`}>
                    {copy.userPrizesEmpty}
                </p>
            ) : (
                <div className="space-y-4">
                    {filteredUsers.map((user) => (
                        <article
                            key={user.userId}
                            className="rounded-3xl bg-gradient-to-b from-amber-50/80 via-white to-white shadow-sm ring-1 ring-amber-100/80"
                        >
                            <button
                                type="button"
                                onClick={() => onOpenUserProgress(user.userId)}
                                className="flex w-full items-center gap-3 px-4 pb-1 pt-4 text-left"
                            >
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-orange-50 ring-2 ring-white shadow">
                                    {user.avatarUrl ? (
                                        <AvatarPhoto url={user.avatarUrl} edge={AVATAR_EDGE.card} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-orange-600">
                                            {(user.fullName || '?')[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`truncate text-base font-semibold tracking-tight text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                                        {user.fullName || 'Anonymous'}
                                    </p>
                                    {user.district ? (
                                        <p className={`mt-0.5 truncate text-xs text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                                            {user.district}
                                        </p>
                                    ) : null}
                                </div>
                                <span className={`shrink-0 text-xs tabular-nums text-slate-400 ${bn ? 'font-bengali' : ''}`}>
                                    {user.prizes.length}
                                </span>
                            </button>

                            <div className="grid grid-cols-3 gap-2 px-3 pb-3.5 pt-2">
                                {user.prizes.map((win) => (
                                    <WinnerPrizeTile
                                        key={`${win.year}-${win.month}-${win.boardId}-${win.prizeRank}`}
                                        win={win}
                                        language={language}
                                        boardLabel={getBoardTabLabel(win.boardId, monthlyTabs)}
                                        onMaximizeImage={onMaximizeImage}
                                    />
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
