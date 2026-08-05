/**
 * Month winners reveal — once-per-month client gate (no DB).
 * Seen state lives in localStorage.
 */

import prizeCatalog from '../data/hallOfFamePrizes.json';
import {
    BOARD_ORDER,
    getEncouragementCopy,
    isPrizeRecipient,
} from './monthlyEncouragementBoards';
import {
    formatPrizeMonthLabel,
    getBoardTabLabel,
    getPrizeRankLabel,
    lookupHallOfFamePrize,
    resolvePrizeDisplay,
} from './hallOfFamePrizes';
import { storageUtils } from './storageUtils';

const SEEN_KEY_PREFIX = 'slm_month_winners_seen_';

export function monthWinnersSeenKey(year, month) {
    return `${SEEN_KEY_PREFIX}${year}-${String(month).padStart(2, '0')}`;
}

export function hasSeenMonthWinners(year, month) {
    if (!year || !month) return true;
    try {
        return storageUtils.getItem(monthWinnersSeenKey(year, month)) === '1';
    } catch {
        return false;
    }
}

export function markMonthWinnersSeen(year, month) {
    if (!year || !month) return;
    try {
        storageUtils.setItem(monthWinnersSeenKey(year, month), '1');
    } catch {
        // private mode / quota — may show again next visit
    }
}

function monthHasCatalogPrizes(year, month) {
    return (prizeCatalog.prizes || []).some(
        (p) => p.year === year && p.month === month
    );
}

function monthHasPrizeRecipients(entry) {
    if (!entry?.boards) return false;
    return BOARD_ORDER.some((boardId) =>
        (entry.boards[boardId] || []).some((w) => isPrizeRecipient(w))
    );
}

/**
 * Newest Hall-of-Fame month that has both catalog prizes and prize recipients.
 * hallOfFameData is expected newest-first.
 */
export function getLatestDeclaredPrizeMonth(hallOfFameData = []) {
    for (const entry of hallOfFameData || []) {
        const year = entry.year;
        const month = entry.month;
        if (!year || !month) continue;
        if (!monthHasCatalogPrizes(year, month)) continue;
        if (!monthHasPrizeRecipients(entry)) continue;
        return { year, month, entry };
    }
    return null;
}

const BOARD_SORT = Object.fromEntries(BOARD_ORDER.map((id, i) => [id, i]));

/**
 * Ordered reveal slides for one month (champion → new → improved, ranks 1–3).
 * Only prize recipients with a catalog prize.
 */
export function buildMonthWinnerRevealSlides(language = 'bn', hallOfFameData = [], year, month) {
    if (!year || !month) return [];

    const monthlyTabs = getEncouragementCopy(language).monthlyTabs;
    const entry = (hallOfFameData || []).find((e) => e.year === year && e.month === month);
    if (!entry) return [];

    const rankLabels =
        language === 'en'
            ? { 1: '1st', 2: '2nd', 3: '3rd' }
            : { 1: '১ম', 2: '২য়', 3: '৩য়' };

    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const slides = [];

    for (const boardId of BOARD_ORDER) {
        const winners = (entry.boards?.[boardId] || []).filter((w) => isPrizeRecipient(w));
        for (const winner of winners) {
            const rawPrize = lookupHallOfFamePrize(year, month, boardId, winner.prize_rank);
            const prize = resolvePrizeDisplay(rawPrize, language);
            if (!prize) continue;

            slides.push({
                id: `${year}-${month}-${boardId}-${winner.prize_rank}`,
                year,
                month,
                boardId,
                prizeRank: winner.prize_rank,
                medal: medals[winner.prize_rank] || '🏆',
                rankLabel: rankLabels[winner.prize_rank] || getPrizeRankLabel(winner.prize_rank, language),
                monthLabel: formatPrizeMonthLabel(year, month, language),
                boardLabel: getBoardTabLabel(boardId, monthlyTabs),
                winnerName: winner.full_name || null,
                winnerAvatarUrl: winner.avatar_url || null,
                winnerDistrict: winner.district || null,
                ...prize,
            });
        }
    }

    return slides.sort((a, b) => {
        const boardCmp = (BOARD_SORT[a.boardId] ?? 99) - (BOARD_SORT[b.boardId] ?? 99);
        if (boardCmp !== 0) return boardCmp;
        return a.prizeRank - b.prizeRank;
    });
}
