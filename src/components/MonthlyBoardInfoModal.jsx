import React from 'react';
import { createPortal } from 'react-dom';
import {
    getEncouragementCopy,
    getRankMedal,
    getUserBoardPrizeRank,
    getBoardPrizeDisplayList,
    isPrizeSuperseded,
    PRIZE_STATUS,
} from '../utils/monthlyEncouragementBoards';

export default function MonthlyBoardInfoModal({
    open,
    onClose,
    language = 'bn',
    meta,
    encouragementData,
    userId,
    timeInfo,
    hourlyAvgInfo,
}) {
    if (!open) return null;

    const copy = getEncouragementCopy(language);
    const bn = language === 'bn';
    const boardId = meta?.boardId;
    const boardDisplay = boardId ? getBoardPrizeDisplayList(boardId, encouragementData) : [];
    const userRank = getUserBoardPrizeRank(userId, boardId, encouragementData?.prizeWinners || encouragementData?.tokenWinners);

    return createPortal(
        <div
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-scale-in"
                role="dialog"
                aria-labelledby="monthly-board-info-title"
                onClick={(e) => e.stopPropagation()}
            >
                <h3
                    id="monthly-board-info-title"
                    className={`text-base font-bold text-slate-900 dark:text-white ${bn ? 'font-bengali' : ''}`}
                >
                    {meta?.title || (bn ? 'লিডারবোর্ড সম্পর্কে' : 'Leaderboard info')}
                </h3>

                <div className="mt-3 space-y-4">
                    <section>
                        <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 ${bn ? 'font-bengali normal-case' : ''}`}>
                            {bn ? 'পুরস্কার' : 'Prizes'}
                        </p>
                        {meta?.prize && (
                            <p className={`mt-1 text-sm font-bold text-orange-600 dark:text-orange-400 ${bn ? 'font-bengali' : ''}`}>
                                {meta.prize}
                            </p>
                        )}
                        {meta?.rankBy && (
                            <p className={`mt-1 text-xs text-slate-500 dark:text-slate-400 ${bn ? 'font-bengali' : ''}`}>
                                {meta.rankBy}
                            </p>
                        )}
                    </section>

                    <section>
                        <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 ${bn ? 'font-bengali normal-case' : ''}`}>
                            {bn ? 'কীভাবে কাজ করে' : 'Rules'}
                        </p>
                        {meta?.logic && (
                            <p className={`mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-200 ${bn ? 'font-bengali' : ''}`}>
                                {meta.logic}
                            </p>
                        )}
                        <p className={`mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 ${bn ? 'font-bengali' : ''}`}>
                            {copy.prizeRule}
                        </p>
                        <p className={`mt-1 text-[11px] text-slate-500 dark:text-slate-400 ${bn ? 'font-bengali' : ''}`}>
                            {copy.prizeNote}
                        </p>
                    </section>

                    {boardDisplay.length > 0 && (
                        <section>
                            <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 ${bn ? 'font-bengali normal-case' : ''}`}>
                                {copy.prizeTitle}
                            </p>
                            <ul className="mt-2 space-y-2">
                                {boardDisplay.map(({ player, standing_rank, prize_rank, prize_status }, idx) => {
                                    const superseded = prize_status === PRIZE_STATUS.SUPERSEDED;
                                    const medalRank = superseded
                                        ? standing_rank
                                        : (prize_rank || standing_rank || idx + 1);

                                    return (
                                    <li
                                        key={`${player.user_id}-${prize_status || 'row'}-${idx}`}
                                        className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 ${
                                            superseded
                                                ? 'bg-slate-100/90 dark:bg-slate-800/50'
                                                : prize_status === PRIZE_STATUS.REPLACEMENT
                                                    ? 'bg-orange-50 dark:bg-orange-950/25'
                                                    : 'bg-slate-50 dark:bg-slate-800/80'
                                        }`}
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className={`text-base ${superseded ? 'opacity-40 grayscale' : ''}`}>
                                                {getRankMedal(medalRank)}
                                            </span>
                                            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                                <p className={`truncate text-xs font-bold ${
                                                    superseded
                                                        ? 'text-slate-400 line-through dark:text-slate-500'
                                                        : 'text-slate-800 dark:text-slate-100'
                                                }`}>
                                                    {player.full_name}
                                                </p>
                                                {superseded && (
                                                    <span className={`inline-block uppercase tracking-wider font-extrabold text-[7px] text-red-600 dark:text-red-500 border border-red-600 dark:border-red-500 rounded px-1 py-0.5 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_2px_rgba(220,38,38,0.1)] transform -rotate-[2deg] origin-center shrink-0 ${bn ? 'font-bengali' : ''}`}>
                                                        {copy.prizeSuperseded}
                                                    </span>
                                                )}
                                                {prize_status === PRIZE_STATUS.REPLACEMENT && (
                                                    <p className={`text-[10px] font-bold text-orange-600 dark:text-orange-400 ${bn ? 'font-bengali' : ''}`}>
                                                        {copy.prizeReplacement}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-[10px] font-bold text-slate-500">
                                            {superseded ? `#${standing_rank}` : `#${prize_rank || standing_rank}`}
                                        </span>
                                    </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}

                    {userRank && (
                        <p className={`rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 ${bn ? 'font-bengali' : ''}`}>
                            {bn
                                ? `আপনি এখন এই তালিকায় ${userRank} নম্বরে—পুরস্কারের লাইনে আছেন!`
                                : `You are #${userRank} on this list — in the prize zone`}
                        </p>
                    )}

                    {hourlyAvgInfo && (
                        <section>
                            <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 ${bn ? 'font-bengali normal-case' : ''}`}>
                                {bn ? 'ঘণ্টার কুইজ গড়' : 'Hourly average'}
                            </p>
                            <p className={`mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 ${bn ? 'font-bengali' : ''}`}>
                                {hourlyAvgInfo}
                            </p>
                        </section>
                    )}

                    {timeInfo && (
                        <section>
                            <p className={`text-[10px] font-black uppercase tracking-widest text-slate-400 ${bn ? 'font-bengali normal-case' : ''}`}>
                                {bn ? 'সময়সূচি' : 'Timing'}
                            </p>
                            <p className={`mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 ${bn ? 'font-bengali' : ''}`}>
                                {timeInfo}
                            </p>
                        </section>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                    {bn ? 'ঠিক আছে' : 'OK'}
                </button>
            </div>
        </div>,
        document.body
    );
}
