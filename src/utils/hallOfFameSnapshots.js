/**
 * Closed-month Hall of Fame snapshots (localStorage).
 * Live monthly Rank stays on views — only past calendar months are stored here.
 */
import { storageUtils } from './storageUtils';

/** Bump with boardsVersion / gallery cache when archive shape or board logic changes. */
export const HOF_GALLERY_BOARDS_VERSION = 12;
export const HOF_GALLERY_CACHE_KEY = `hall_of_fame_gallery_v${HOF_GALLERY_BOARDS_VERSION}`;

export const HOF_START = { year: 2026, month: 3 };

export function hallOfFamePastMonths(now = new Date()) {
    const currentY = now.getFullYear();
    const currentM = now.getMonth() + 1;
    const months = [];
    let year = HOF_START.year;
    let month = HOF_START.month;
    while (year < currentY || (year === currentY && month < currentM)) {
        months.push({ year, month });
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    return months.slice(-12);
}

const MONTH_SNAPSHOT_PREFIX = `slm_hof_month_v${HOF_GALLERY_BOARDS_VERSION}_`;
const MONTH_SNAPSHOT_ANY_PREFIX = 'slm_hof_month_v';

function monthSnapshotKey(year, month) {
    return `${MONTH_SNAPSHOT_PREFIX}${year}_${month}`;
}

/** Reject snapshots whose prize ranks collided or lost user ids — those paint the wrong prize on a name. */
function snapshotPrizeRowsAreValid(entry) {
    const boards = entry?.boards;
    if (!boards || typeof boards !== 'object') return false;

    for (const rows of Object.values(boards)) {
        if (!Array.isArray(rows)) return false;
        const recipientRanks = [];
        for (const row of rows) {
            if (!row || typeof row !== 'object') return false;
            const status = row.prize_status;
            const isRecipient = status === 'winner' || status === 'replacement';
            if (!isRecipient) continue;
            const rank = Number(row.prize_rank);
            if (!row.user_id || !Number.isFinite(rank) || rank < 1 || rank > 3) return false;
            recipientRanks.push(rank);
        }
        if (new Set(recipientRanks).size !== recipientRanks.length) return false;
    }
    return true;
}

export function readMonthSnapshot(year, month) {
    const raw = storageUtils.getItem(monthSnapshotKey(year, month));
    if (!raw) return null;
    try {
        const entry = JSON.parse(raw);
        if (entry?.boardsVersion !== HOF_GALLERY_BOARDS_VERSION) return null;
        if (entry.year !== year || entry.month !== month) return null;
        if (!snapshotPrizeRowsAreValid(entry)) {
            storageUtils.removeItem(monthSnapshotKey(year, month));
            return null;
        }
        return entry;
    } catch {
        storageUtils.removeItem(monthSnapshotKey(year, month));
        return null;
    }
}

export function writeMonthSnapshot(entry) {
    if (!entry?.year || !entry?.month) return false;
    if (entry.boardsVersion !== HOF_GALLERY_BOARDS_VERSION) return false;
    if (!snapshotPrizeRowsAreValid(entry)) return false;
    return storageUtils.setItem(monthSnapshotKey(entry.year, entry.month), JSON.stringify(entry));
}

/** @param {{ year: number, month: number }[]} pastMonths */
export function readClosedMonthSnapshots(pastMonths) {
    const byKey = new Map();
    for (const { year, month } of pastMonths) {
        const entry = readMonthSnapshot(year, month);
        if (entry) byKey.set(`${year}-${month}`, entry);
    }
    return byKey;
}

export function allClosedMonthsSnapshotted(pastMonths, snapshotByKey) {
    if (!pastMonths.length) return true;
    return pastMonths.every(({ year, month }) => snapshotByKey.has(`${year}-${month}`));
}

export function peekCachedHallOfFame() {
    try {
        const pastMonths = hallOfFamePastMonths();
        const snapshotByKey = readClosedMonthSnapshots(pastMonths);
        if (allClosedMonthsSnapshotted(pastMonths, snapshotByKey)) {
            return pastMonths
                .slice()
                .reverse()
                .map(({ year, month }) => snapshotByKey.get(`${year}-${month}`));
        }
    } catch {
        return [];
    }
    return [];
}

export function clearAllMonthSnapshots() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key && key.startsWith(MONTH_SNAPSHOT_ANY_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => storageUtils.removeItem(key));
    } catch (err) {
        console.warn('[hof] snapshot clear failed:', err?.message || err);
    }
}

/** Drop snapshots from older boardsVersion prefixes so phones do not keep pairing prizes from a previous archive shape. */
export function clearObsoleteMonthSnapshots() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key && key.startsWith(MONTH_SNAPSHOT_ANY_PREFIX) && !key.startsWith(MONTH_SNAPSHOT_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => storageUtils.removeItem(key));
    } catch (err) {
        console.warn('[hof] obsolete snapshot clear failed:', err?.message || err);
    }
}
