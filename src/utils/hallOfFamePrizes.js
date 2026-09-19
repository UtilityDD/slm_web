/**
 * Hall of Fame prize catalog (bundled JSON). Edit src/data/hallOfFamePrizes.json when month-end prizes are set.
 * Keys: year, month, boardId (main_champion | new_player | most_improved | top_learner), prizeRank (1–3).
 * Images: place files under public/prizes/. imageUrl may include or omit the extension —
 * the app tries .webp, .jpg, .jpeg, and .png automatically (e.g. "/prizes/2026-03-champion-1").
 */
import prizeCatalog from '../data/hallOfFamePrizes.json';
import {
    BOARD_IDS,
    BOARD_ORDER,
    getHallOfFameBoardKey,
    getEncouragementCopy,
    isPrizeRecipient,
} from './monthlyEncouragementBoards';

export const HOF_PRIZE_VIEW_STORAGE_KEY = 'slm_hof_prize_view';
/** Persist last browsed Hall of Fame month: `{ year, month }`. */
export const HOF_PRIZE_MONTH_STORAGE_KEY = 'slm_hof_prize_month';
/** User-facing modes: by month (detailed cards) or by winner. Legacy `compact` maps to detailed. */
export const HOF_VIEW_MODES = ['detailed', 'by_user'];

const BN_MONTH_SHORT = ['জানু', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুল', 'আগ', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];
const EN_MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Sort key YYYY-MM for chronological compare. */
export function hofMonthKey(year, month) {
    return `${Number(year)}-${String(Number(month)).padStart(2, '0')}`;
}

/** Distinct years in archive, newest first. */
export function listHofYears(hallOfFameData = []) {
    const years = new Set();
    for (const entry of hallOfFameData) {
        if (entry?.year != null) years.add(Number(entry.year));
    }
    return [...years].sort((a, b) => b - a);
}

/**
 * Months present for a year (objects with month + shortLabel), newest month first.
 */
export function listHofMonthsForYear(hallOfFameData = [], year, language = 'bn') {
    const y = Number(year);
    const months = new Set();
    for (const entry of hallOfFameData) {
        if (Number(entry?.year) === y && entry?.month != null) {
            months.add(Number(entry.month));
        }
    }
    const short = language === 'bn' ? BN_MONTH_SHORT : EN_MONTH_SHORT;
    return [...months]
        .sort((a, b) => b - a)
        .map((month) => ({
            month,
            shortLabel: short[month - 1] || String(month),
        }));
}

/** Archive sorted newest → oldest. */
export function sortHofArchiveNewestFirst(hallOfFameData = []) {
    return [...(hallOfFameData || [])].sort((a, b) =>
        hofMonthKey(b.year, b.month).localeCompare(hofMonthKey(a.year, a.month))
    );
}

export function findHofEntry(hallOfFameData = [], year, month) {
    const y = Number(year);
    const m = Number(month);
    return (hallOfFameData || []).find((e) => Number(e.year) === y && Number(e.month) === m) || null;
}

/**
 * Resolve a valid { year, month } from saved preference or latest archive entry.
 */
export function resolveHofBrowseMonth(hallOfFameData = [], saved = null) {
    const sorted = sortHofArchiveNewestFirst(hallOfFameData);
    if (sorted.length === 0) return null;

    if (saved?.year != null && saved?.month != null) {
        const hit = findHofEntry(sorted, saved.year, saved.month);
        if (hit) return { year: Number(hit.year), month: Number(hit.month) };
    }

    return { year: Number(sorted[0].year), month: Number(sorted[0].month) };
}

/**
 * Step ±1 through the archive (newest-first index). Returns next { year, month } or null.
 */
export function stepHofBrowseMonth(hallOfFameData = [], year, month, delta) {
    const sorted = sortHofArchiveNewestFirst(hallOfFameData);
    if (sorted.length === 0) return null;
    const key = hofMonthKey(year, month);
    const idx = sorted.findIndex((e) => hofMonthKey(e.year, e.month) === key);
    const nextIdx = (idx < 0 ? 0 : idx) + delta;
    if (nextIdx < 0 || nextIdx >= sorted.length) return null;
    const entry = sorted[nextIdx];
    return { year: Number(entry.year), month: Number(entry.month) };
}

export function readStoredHofBrowseMonth() {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(HOF_PRIZE_MONTH_STORAGE_KEY) : null;
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.year != null && parsed?.month != null) {
            return { year: Number(parsed.year), month: Number(parsed.month) };
        }
    } catch {
        /* ignore */
    }
    return null;
}

export function writeStoredHofBrowseMonth(year, month) {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(HOF_PRIZE_MONTH_STORAGE_KEY, JSON.stringify({ year: Number(year), month: Number(month) }));
    } catch {
        /* ignore */
    }
}

const PRIZE_IMAGE_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png'];

export function getPrizeImageBasePath(imageUrl = '') {
    const trimmed = imageUrl.trim();
    if (!trimmed) return '';
    return trimmed.replace(/\.(webp|jpe?g|png)$/i, '');
}

/** Ordered URLs to try — declared extension first, then webp/jpg/png fallbacks. */
export function getPrizeImageCandidates(imageUrl = '') {
    const trimmed = imageUrl.trim();
    if (!trimmed) return [];

    const base = getPrizeImageBasePath(trimmed);
    const declaredMatch = trimmed.match(/\.(webp|jpe?g|png)$/i);
    const declaredExt = declaredMatch?.[1]?.toLowerCase() || null;

    const extensions = declaredExt
        ? [
            declaredExt,
            ...PRIZE_IMAGE_EXTENSIONS.filter((ext) => ext !== declaredExt && !(declaredExt === 'jpeg' && ext === 'jpg') && !(declaredExt === 'jpg' && ext === 'jpeg')),
        ]
        : PRIZE_IMAGE_EXTENSIONS;

    const seen = new Set();
    return extensions
        .map((ext) => `${base}.${ext}`)
        .filter((url) => {
            if (seen.has(url)) return false;
            seen.add(url);
            return true;
        });
}

const prizeIndex = new Map(
    (prizeCatalog.prizes || []).map((entry) => [
        `${entry.year}-${entry.month}-${entry.boardId}-${entry.prizeRank}`,
        entry,
    ])
);

export function lookupHallOfFamePrize(year, month, boardId, prizeRank) {
    if (!year || !month || !boardId || prizeRank == null) return null;
    return prizeIndex.get(`${year}-${month}-${boardId}-${prizeRank}`) || null;
}

export function lookupHallOfFamePrizeForWinner(entry, boardTab, winner) {
    if (!entry || !winner?.prize_rank) return null;
    const boardId = getHallOfFameBoardKey(boardTab);
    return lookupHallOfFamePrize(entry.year, entry.month, boardId, winner.prize_rank);
}

export function resolvePrizeDisplay(prize, language = 'bn') {
    if (!prize) return null;
    const isBn = language === 'bn';
    const title = (isBn ? prize.title_bn : prize.title_en)?.trim() || '';
    const caution = (isBn ? prize.caution_bn : prize.caution_en)?.trim() || '';
    const sponsor = (isBn ? prize.sponsor_bn : prize.sponsor_en)?.trim() || '';
    const imageUrl = prize.imageUrl?.trim() || '';
    const imageCandidates = getPrizeImageCandidates(imageUrl);
    const imageAlt = (isBn ? prize.imageAlt_bn : prize.imageAlt_en)?.trim() || title || sponsor;

    if (!title && !sponsor && imageCandidates.length === 0) return null;

    return {
        title,
        caution,
        sponsor,
        imageUrl: imageCandidates[0] || null,
        imageCandidates,
        imageAlt,
    };
}

export function formatPrizeMonthLabel(year, month, language = 'bn') {
    return new Date(year, month - 1).toLocaleDateString(
        language === 'bn' ? 'bn-BD' : 'en-US',
        { month: 'long', year: 'numeric' }
    );
}

export function getBoardTabLabel(boardId, monthlyTabs = {}) {
    if (boardId === BOARD_IDS.MAIN) return monthlyTabs.champion || monthlyTabs[BOARD_IDS.MAIN];
    return monthlyTabs[boardId] || boardId;
}

/** Compact place label for prize lists (1st / 2nd / 3rd). */
export function getPrizeRankLabel(prizeRank, language = 'bn') {
    if (prizeRank === 1) return language === 'en' ? '1st' : '১ম';
    if (prizeRank === 2) return language === 'en' ? '2nd' : '২য়';
    if (prizeRank === 3) return language === 'en' ? '3rd' : '৩য়';
    return language === 'en' ? `#${prizeRank}` : `${prizeRank}`;
}

/** All prize wins across months and boards (only rows with catalog + prize recipient). */
export function collectAllUserPrizeWins(hallOfFameData, language = 'bn') {
    const wins = [];

    for (const entry of hallOfFameData || []) {
        for (const boardId of BOARD_ORDER) {
            const winners = entry.boards?.[boardId] || [];
            for (const winner of winners) {
                if (!isPrizeRecipient(winner)) continue;

                const rawPrize = lookupHallOfFamePrize(entry.year, entry.month, boardId, winner.prize_rank);
                const prize = resolvePrizeDisplay(rawPrize, language);
                if (!prize) continue;

                wins.push({
                    userId: winner.user_id,
                    fullName: winner.full_name,
                    avatarUrl: winner.avatar_url,
                    slmId: winner.slm_id,
                    district: winner.district,
                    year: entry.year,
                    month: entry.month,
                    monthLabel: formatPrizeMonthLabel(entry.year, entry.month, language),
                    boardId,
                    prizeRank: winner.prize_rank,
                    rankLabel: getPrizeRankLabel(winner.prize_rank, language),
                    prize,
                });
            }
        }
    }

    return wins;
}

export function groupPrizeWinsByUser(wins) {
    const map = new Map();

    for (const win of wins) {
        if (!win.userId) continue;
        if (!map.has(win.userId)) {
            map.set(win.userId, {
                userId: win.userId,
                fullName: win.fullName,
                avatarUrl: win.avatarUrl,
                slmId: win.slmId,
                district: win.district,
                prizes: [],
            });
        }
        map.get(win.userId).prizes.push(win);
    }

    return [...map.values()]
        .map((user) => ({
            ...user,
            prizes: user.prizes.sort((a, b) => {
                const dateCmp = `${b.year}-${String(b.month).padStart(2, '0')}`.localeCompare(
                    `${a.year}-${String(a.month).padStart(2, '0')}`
                );
                if (dateCmp !== 0) return dateCmp;
                if (a.boardId !== b.boardId) return a.boardId.localeCompare(b.boardId);
                return a.prizeRank - b.prizeRank;
            }),
        }))
        .sort((a, b) => {
            if (b.prizes.length !== a.prizes.length) return b.prizes.length - a.prizes.length;
            return (a.fullName || '').localeCompare(b.fullName || '', 'bn');
        });
}

export function getHallOfFamePrizeViewCopy(language = 'bn') {
    if (language === 'en') {
        return {
            byMonth: 'By month',
            byUser: 'By winner',
            userPrizesTitle: 'Prizes by winner',
            userPrizesSearch: 'Search winner name or SLM ID',
            userPrizesEmpty: 'No prize records yet.',
            userPrizesCount: 'prizes',
            sponsorPrefix: 'Courtesy of',
            prizeChip: 'Prize',
            noPrizeInfo: 'Prize details for this month are not added yet.',
            yearAll: 'All years',
            prevMonth: 'Previous month',
            nextMonth: 'Next month',
        };
    }
    return {
        byMonth: 'মাস অনুযায়ী',
        byUser: 'বিজয়ী অনুযায়ী',
        userPrizesTitle: 'বিজয়ীদের পুরস্কার তালিকা',
        userPrizesSearch: 'নাম বা এসএলএম আইডি খুঁজুন',
        userPrizesEmpty: 'এখনও কোনো পুরস্কারের তথ্য নেই।',
        userPrizesCount: 'টি পুরস্কার',
        sponsorPrefix: 'সৌজন্যে',
        prizeChip: 'পুরস্কার',
        noPrizeInfo: 'এই মাসের পুরস্কারের তথ্য এখনও যোগ হয়নি।',
        yearAll: 'সব বছর',
        prevMonth: 'আগের মাস',
        nextMonth: 'পরের মাস',
    };
}

export function getUserPrizeWins(hallOfFameData, userId, language = 'bn') {
    if (!userId) return [];
    return collectAllUserPrizeWins(hallOfFameData, language).filter((win) => win.userId === userId);
}

export function normalizeHallOfFameViewMode(mode) {
    if (mode === 'compact') return 'detailed';
    return HOF_VIEW_MODES.includes(mode) ? mode : 'detailed';
}

/** Slug for sponsor id / legacy logo paths. */
function sponsorLogoSlug(englishName = '') {
    return englishName
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
}

/**
 * Photo file stems under public/assets/sponsor/ (keep filenames as uploaded).
 * First English given name → actual file stem(s), including spelling variants.
 */
const SPONSOR_PHOTO_STEMS = {
    aritra: ['aritra'],
    prabhat: ['pravat', 'prabhat'],
    parbati: ['parbati'],
    jahangir: ['jahangir'],
    subrata: ['subrata'],
    nilkanth: ['nilkanta', 'nilkanth'],
    ujjwal: ['ujjwal'],
    hemanta: ['hemanta'],
    partha: ['partha'],
};

/** Gender for missing-photo smile avatar — default man. */
const SPONSOR_GENDER = {
    aritra: 'man',
    prabhat: 'man',
    parbati: 'man',
    jahangir: 'man',
    subrata: 'man',
    nilkanth: 'man',
    ujjwal: 'man',
    hemanta: 'man',
    partha: 'man',
};

function sponsorFirstToken(englishName = '') {
    return String(englishName || '')
        .trim()
        .split(/[\s,]+/)[0]
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function getSponsorGender(englishName = '') {
    const first = sponsorFirstToken(englishName);
    return SPONSOR_GENDER[first] || 'man';
}

/** Ordered photo URLs for a sponsor — /assets/sponsor/{stem}.{ext}, then legacy /images/sponsor. */
function getSponsorPhotoCandidates(englishName = '') {
    // Prefer webp (optimized), then jpeg (current source files), then other fallbacks.
    const SPONSOR_IMAGE_EXTENSIONS = ['webp', 'jpeg', 'jpg', 'png'];
    const first = sponsorFirstToken(englishName);
    const stems = SPONSOR_PHOTO_STEMS[first] || (first ? [first] : []);
    const urls = [];
    const seen = new Set();
    for (const stem of stems) {
        for (const ext of SPONSOR_IMAGE_EXTENSIONS) {
            const url = `/assets/sponsor/${stem}.${ext}`;
            if (!seen.has(url)) {
                seen.add(url);
                urls.push(url);
            }
        }
    }
    const slug = sponsorLogoSlug(englishName);
    if (slug) {
        for (const ext of SPONSOR_IMAGE_EXTENSIONS) {
            const url = `/images/sponsor/${slug}.${ext}`;
            if (!seen.has(url)) {
                seen.add(url);
                urls.push(url);
            }
        }
    }
    return urls;
}

/** Split "Name, title / place" into short name + remaining identity line. */
function splitSponsorIdentity(full = '') {
    const trimmed = String(full || '').trim();
    if (!trimmed) return { shortName: '', detail: '', full: '' };
    const comma = trimmed.indexOf(',');
    if (comma === -1) {
        return { shortName: trimmed, detail: '', full: trimmed };
    }
    const shortName = trimmed.slice(0, comma).trim();
    const detail = trimmed.slice(comma + 1).trim();
    return {
        shortName: shortName || trimmed,
        detail,
        full: trimmed,
    };
}

/**
 * Unique prize sponsors for the landing horizontal scroll.
 * Photos: public/assets/sponsor/{name}.webp (preferred) or .jpeg. Missing photos fall back to smile avatar in UI.
 */
export function buildLandingSponsors(language = 'bn') {
    const isBn = language === 'bn';
    const seen = new Map();

    for (const entry of prizeCatalog.prizes || []) {
        const key = (entry.sponsor_en || '').trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        const full = ((isBn ? entry.sponsor_bn : entry.sponsor_en) || entry.sponsor_en || '').trim();
        if (!full) continue;
        const { shortName, detail } = splitSponsorIdentity(full);
        const slug = sponsorLogoSlug(entry.sponsor_en || shortName);
        const english = entry.sponsor_en || shortName;
        const logoCandidates = getSponsorPhotoCandidates(english);
        seen.set(key, {
            id: slug || key.replace(/\s+/g, '-'),
            name: shortName,
            detail,
            full,
            gender: getSponsorGender(english),
            logoCandidates,
        });
    }

    return Array.from(seen.values());
}

/** Extra delivery photos for the public landing carousel (no winner / বিজেতা badge). */
const LANDING_GALLERY_PRIZE_IMAGES = Array.from({ length: 11 }, (_, i) => `/prizes/prize-${i + 1}`);

function shuffleInPlace(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = items[i];
        items[i] = items[j];
        items[j] = tmp;
    }
    return items;
}

function buildLandingGallerySlides(language = 'bn') {
    const alt = language === 'en' ? 'Prize delivered to a winner' : 'বিজয়ীর কাছে পুরস্কার পৌঁছেছে';
    return LANDING_GALLERY_PRIZE_IMAGES.map((imageUrl, index) => {
        const imageCandidates = getPrizeImageCandidates(imageUrl);
        return {
            id: `gallery-prize-${index + 1}`,
            year: null,
            month: null,
            prizeRank: null,
            rankLabel: null,
            monthLabel: null,
            boardLabel: null,
            winnerName: null,
            winnerAvatarUrl: null,
            winnerDistrict: null,
            title: '',
            caution: '',
            sponsor: '',
            imageUrl: imageCandidates[0] || null,
            imageCandidates,
            imageAlt: alt,
        };
    });
}

/** Public landing carousel — catalog + gallery only (no live winner names). */
export function buildLandingPrizeSlides(language = 'bn', hallOfFameData = []) {
    const monthlyTabs = getEncouragementCopy(language).monthlyTabs;
    const winnerByKey = new Map();

    for (const entry of hallOfFameData || []) {
        for (const boardId of BOARD_ORDER) {
            for (const winner of entry.boards?.[boardId] || []) {
                if (!isPrizeRecipient(winner)) continue;
                winnerByKey.set(
                    `${entry.year}-${entry.month}-${boardId}-${winner.prize_rank}`,
                    {
                        name: winner.full_name || null,
                        avatarUrl: winner.avatar_url || null,
                        district: winner.district || null,
                    }
                );
            }
        }
    }

    const rankLabels = language === 'en'
        ? { 1: '1st Prize', 2: '2nd Prize', 3: '3rd Prize' }
        : { 1: 'প্রথম পুরস্কার', 2: 'দ্বিতীয় পুরস্কার', 3: 'তৃতীয় পুরস্কার' };

    const catalogSlides = (prizeCatalog.prizes || [])
        .map((entry) => {
            const prize = resolvePrizeDisplay(entry, language);
            if (!prize) return null;
            const key = `${entry.year}-${entry.month}-${entry.boardId}-${entry.prizeRank}`;
            const winner = winnerByKey.get(key) || null;
            return {
                id: key,
                year: entry.year,
                month: entry.month,
                prizeRank: entry.prizeRank,
                rankLabel: rankLabels[entry.prizeRank] || getPrizeRankLabel(entry.prizeRank, language),
                monthLabel: formatPrizeMonthLabel(entry.year, entry.month, language),
                boardLabel: getBoardTabLabel(entry.boardId, monthlyTabs),
                winnerName: winner?.name || null,
                winnerAvatarUrl: winner?.avatarUrl || null,
                winnerDistrict: winner?.district || null,
                ...prize,
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            const monthCmp = `${b.year}-${String(b.month).padStart(2, '0')}`.localeCompare(
                `${a.year}-${String(a.month).padStart(2, '0')}`
            );
            if (monthCmp !== 0) return monthCmp;
            if (a.prizeRank !== b.prizeRank) return a.prizeRank - b.prizeRank;
            return a.boardLabel.localeCompare(b.boardLabel, language === 'bn' ? 'bn' : 'en');
        });

    // Mix delivery-gallery photos among catalog slides; gallery items never get a বিজেতা badge.
    return shuffleInPlace([...catalogSlides, ...buildLandingGallerySlides(language)]);
}
