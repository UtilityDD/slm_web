import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { completedLessonsForBadge, firstTimeReadingPointsFromLessons, getBadgeByLevel } from '../utils/badgeUtils';
import { cacheHelper } from '../utils/cacheHelper';
import { storageUtils } from '../utils/storageUtils';
import { leaderboardService } from '../utils/leaderboardService';
import { requestManager } from '../utils/requestManager';
import { visualQuizService } from '../utils/visualQuizService';
import {
    handleImageLoadError,
    isImageOption,
    toDisplayImageUrl,
} from '../utils/visualQuizImageUtils';
import {
    collectHourlyImageUrls,
    preloadHourlyImages,
    quizImageWaitCopy,
    useQuizImageGate,
} from '../utils/quizImageGate';
import { prefetchHourlyBank } from '../utils/quizImagePrefetch';
import { openExternalUrl } from '../utils/nativeAndroidUx';
import {
    filterQuestionsForTier,
    getHourlyStakesUi,
    getHourlyTier,
    getLifetimePoints,
    getPenaltyPerWrongForLifetime,
    capHourlyAttemptPenalty,
    pickQuestionsByDifficultyMix
} from '../utils/hourlyDifficulty';
import {
    HOURLY_QUESTIONS_PER_PACK,
} from '../utils/hourlyMakeup';
import {
    formatHourlyQuizId,
    getLiveHourlySlot,
    hourIdFromParts,
    isHourlyQuizIdOpen,
    listPlayableHourlySlots,
    minutesUntilHourlySlotCloses,
    parseHourlyQuizId,
    HOURLY_POINTS_PER_SET,
    HOURLY_QUESTIONS_PER_SET,
} from '../utils/hourlyWindow';
import {
    estimateAccuracyFromAttempts,
    getPackTimerCopy,
    isPackOnTime,
    packIndexForQuestion,
    resolveGreenSeconds,
    scoreQuestionsWithPackTimers,
} from '../utils/hourlyTiming';
import HourlyPenaltyInfoModal from './HourlyPenaltyInfoModal';
import HourlyDayRing from './HourlyDayRing';
import { MonthlyBoardHeader } from './MonthlyEncouragementBoards';
import MonthlyBoardInfoModal from './MonthlyBoardInfoModal';
import MonthWinnersReveal from './MonthWinnersReveal';
import { checkReadingGate } from '../utils/readingHabitGate';
import { filterCoreCompletedLessonIds } from '../utils/trainingLessonIds';
import ReadingGateModal from './ReadingGateModal';
import { invalidateLeaderboardCaches } from '../utils/leaderboardCacheKeys';
import { blockGuestWrite, isGuestUser, guestPreviewText } from '../utils/guestPreview';
import { BrutalLoaderContent } from './loaders/PageLoader';
import {
    getEncouragementCopy,
    getHallOfFameWinners,
    getMonthlyBoardMeta,
    getMonthlyPrizeDisplayList,
    getMonthlyStandingsForPodium,
    formatMonthlyPlayerScore,
    formatHourlyAvgPerDay,
    formatLeaderboardNumber,
    getHourlyAvgPerDay,
    isPrizeSuperseded,
    isPrizeRecipient,
    PRIZE_STATUS,
    BOARD_IDS,
    MONTHLY_SUB_TAB,
    MONTHLY_SUB_TAB_ORDER,
} from '../utils/monthlyEncouragementBoards';
import {
    HOF_PRIZE_VIEW_STORAGE_KEY,
    HOF_PRIZE_MONTH_STORAGE_KEY,
    getHallOfFamePrizeViewCopy,
    normalizeHallOfFameViewMode,
    listHofYears,
    listHofMonthsForYear,
    findHofEntry,
    resolveHofBrowseMonth,
    stepHofBrowseMonth,
    readStoredHofBrowseMonth,
    writeStoredHofBrowseMonth,
} from '../utils/hallOfFamePrizes';
import {
    HOF_GALLERY_BOARDS_VERSION,
    hallOfFamePastMonths,
    peekCachedHallOfFame,
} from '../utils/hallOfFameSnapshots';
import HallOfFameWinnerCard from './HallOfFameWinnerCard';
import HallOfFameUserPrizesView from './HallOfFameUserPrizesView';
import LeaderboardRankChip from './LeaderboardRankChip';
import ReadingLevelAvatarFrame from './ReadingLevelAvatarFrame';
import LeaderboardUserSheet from './LeaderboardUserSheet';
import AvatarPhoto, { imagePreviewFromEvent } from './AvatarPhoto';
import { AVATAR_EDGE } from '../utils/avatarImage';
import AnnualGrandTrophyLeaderboard from './AnnualGrandTrophyLeaderboard';
import MonthlyScoreDetailModal from './MonthlyScoreDetailModal';
import { fetchAnnualGrandTrophy } from '../utils/dailyActivityService';

/** Sync peek of SWR monthly cache so Rank can paint before network. */
function peekCachedMonthlyLeaderboard() {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const data = cacheHelper.get(`leaderboard_monthly_ist_badge_${y}_${m}`);
    return Array.isArray(data) ? data : [];
}

function peekCachedEncouragementBoards(lang = 'bn') {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    return cacheHelper.get(`leaderboard_encouragement_ist_badge_${y}_${m}_${lang}`) || null;
}

const LiveIndicator = () => (
    <div className="live-pulse" title="Live Now">
        <span className="live-pulse-ring"></span>
        <span className="live-pulse-dot"></span>
    </div>
);

// Deterministic PRNG for Anti-Cheat
const seedRandom = (seed) => {
    let m = 0x80000000;
    let a = 1103515245;
    let c = 12345;
    let state = seed ? seed : Math.floor(Math.random() * (m - 1));
    return function () {
        state = (a * state + c) % m;
        return state / (m - 1);
    };
};

// Fisher-Yates Shuffle for robust deterministic randomization
const shuffleArray = (array, rng) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const stringToSeed = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const isVisualQuestion = (question) => {
    if (!question) return false;
    if (String(question.question_image_url || '').trim()) return true;
    return Array.isArray(question.options) && question.options.some((opt) => isImageOption(opt));
};

const getQuestionImageKeys = (question) => {
    if (!question) return [];
    const keys = [];
    const qImage = String(question.question_image_url || '').trim();
    if (qImage) keys.push(qImage);
    if (Array.isArray(question.options)) {
        question.options.forEach((opt) => {
            if (isImageOption(opt)) {
                const value = String(opt || '').trim();
                if (value) keys.push(value);
            }
        });
    }
    return [...new Set(keys)];
};

const LEADERBOARD_BN_MONTHS = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

// Utility to format last active date
const formatLastActive = (dateString, language) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    const isBn = language === 'bn';

    if (diffInSeconds < 60) return isBn ? 'এইমাত্র' : 'Just now';
    if (diffInMinutes < 60) return isBn ? `${diffInMinutes} মিনিট আগে` : `${diffInMinutes}m ago`;
    if (diffInHours < 24) {
        if (date.getDate() === now.getDate()) return isBn ? `${diffInHours} ঘণ্টা আগে` : `${diffInHours}h ago`;
        return isBn ? 'গতকাল' : 'Yesterday';
    }
    if (diffInDays < 7) return isBn ? `${diffInDays} দিন আগে` : `${diffInDays}d ago`;
    
    // Default to short date — Latin digits on leaderboard
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

function formatLeaderboardDistrict(district) {
    const value = (district || '').trim();
    return value || null;
}

function MonthlyHourlyAvgPill({ hourly, language, encouragementBoards, align = 'center' }) {
    const year = encouragementBoards?.year;
    const month = encouragementBoards?.month;
    const fullLabel = formatHourlyAvgPerDay(hourly, language, year, month);
    if (!fullLabel) return null;

    const avg = getHourlyAvgPerDay(hourly, year, month);
    if (avg == null) return null;

    const rounded = Math.round(avg);
    const valueText = rounded <= 0
        ? '<1'
        : formatLeaderboardNumber(rounded, { maximumFractionDigits: 0 });
    const unitText = language === 'bn' ? 'ঘ/দিন' : 'hr/d';

    return (
        <span
            title={fullLabel}
            aria-label={fullLabel}
            className={`inline-flex items-baseline gap-0.5 leading-none ${
                align === 'end' ? 'justify-end' : 'justify-center'
            }`}
        >
            <span className="text-[10px] font-black tabular-nums text-slate-600">{valueText}</span>
            <span className={`text-[8px] font-bold text-slate-400 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-tight'}`}>
                {unitText}
            </span>
        </span>
    );
}

/** Top-3 podium / strip: first name only (display). */
function formatPodiumFirstName(fullName) {
    const trimmed = (fullName || '').trim();
    if (!trimmed) return '';
    const base = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
    const first = base.split(/\s+/)[0] || base;
    return first.length > 14 ? `${first.slice(0, 12)}…` : first;
}

function CountUpNumber({ value, format = (n) => n, className, duration = 700 }) {
    const target = Number(value) || 0;
    const [display, setDisplay] = useState(target);
    const fromRef = React.useRef(target);
    const rafRef = React.useRef(null);

    useEffect(() => {
        const from = fromRef.current;
        const to = target;
        if (from === to) {
            setDisplay(to);
            return undefined;
        }
        const start = performance.now();
        const step = (now) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(from + (to - from) * eased));
            if (p < 1) {
                rafRef.current = requestAnimationFrame(step);
            } else {
                fromRef.current = to;
            }
        };
        rafRef.current = requestAnimationFrame(step);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            fromRef.current = to;
        };
    }, [target, duration]);

    return <span className={className}>{format(display)}</span>;
}

/** Convert a date to an IST (UTC+5:30) date representation for timezone safety */
const getIstDate = (date) => {
    if (!date) return new Date();
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
};

/** Clock label for a frozen hourly quiz id, e.g. "6 PM". */
function hourlyClockLabel(quizId) {
    const slot = parseHourlyQuizId(quizId);
    if (!slot) return null;
    const hour12 = slot.hour % 12 || 12;
    const ampm = slot.hour < 12 ? 'AM' : 'PM';
    return `${hour12} ${ampm}`;
}

export default function Competitions({
    language = 'bn',
    user,
    setCurrentView,
    isFullLeaderboard = false,
    surface: surfaceProp,
    userProfile,
    refreshProfile,
    onOpenUserProgress,
    showNotification,
    sponsorAdOpen = false,
    monthWinnersBlocked = false,
    onMonthWinnersRevealOpenChange,
    onHourlyQuizPlayChange,
}) {
    /** 'play' | 'rank' | 'prizes' — UI surface only; scoring/fetch logic unchanged. */
    const surface = surfaceProp || (isFullLeaderboard ? 'rank' : 'play');
    const isPrizesSurface = surface === 'prizes';
    const isRankSurface = surface === 'rank';
    const showFullBoards = surface === 'rank' || surface === 'prizes';
    const [loading, setLoading] = useState(true);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [quizResults, setQuizResults] = useState(null);
    const [submitRejected, setSubmitRejected] = useState(null); // { type: 'time' | 'other', message }
    /** Per-set green timer (full vs half points). */
    const [packGreenSeconds, setPackGreenSeconds] = useState(120);
    const [packStartTimes, setPackStartTimes] = useState([]); // ms epoch per pack index
    const [packOnTimeFlags, setPackOnTimeFlags] = useState([]); // boolean per pack
    const [packTimerTick, setPackTimerTick] = useState(0);
    const packTimingRef = React.useRef({ greenSeconds: 120, starts: [], onTime: [] });
    const usedHourlyQuestionIdsRef = React.useRef(new Set());
    const [leaderboard, setLeaderboard] = useState([]);
    const [hourlyQuiz, setHourlyQuiz] = useState(null);
    const hourlyQuizRef = React.useRef(null);
    const activeQuizRef = React.useRef(null);
    const hourlyQuizRefreshBusyRef = React.useRef(false);
    const [hourlyQuizRefreshBusy, setHourlyQuizRefreshBusy] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [lastAttemptTime, setLastAttemptTime] = useState(null);
    const [lastAttemptPenalty, setLastAttemptPenalty] = useState(0);
    const [reviewMode, setReviewMode] = useState(false);
    const [userRank, setUserRank] = useState(null);
    const [fullLeaderboard, setFullLeaderboard] = useState([]);
    const [loadingFull, setLoadingFull] = useState(false);
    const [serverTimeOffset, setServerTimeOffset] = useState(0);
    const [fetchError, setFetchError] = useState(false);
    const [showCompactView, setShowCompactView] = useState(!isFullLeaderboard);
    const [leaderboardTab, setLeaderboardTab] = useState('monthly'); // 'monthly' | 'annual' | 'all-time'
    const [annualLeaderboard, setAnnualLeaderboard] = useState([]);
    const [loadingAnnual, setLoadingAnnual] = useState(false);
    const [monthlyBoardTab, setMonthlyBoardTab] = useState(MONTHLY_SUB_TAB.CHAMPION);
    const [monthlyLeaderboard, setMonthlyLeaderboard] = useState(() => (
        isFullLeaderboard ? peekCachedMonthlyLeaderboard() : []
    ));
    const [encouragementBoards, setEncouragementBoards] = useState(() => (
        isFullLeaderboard ? peekCachedEncouragementBoards(language) : null
    ));
    const [loadingMonthly, setLoadingMonthly] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [hintViewedQuestions, setHintViewedQuestions] = useState(new Set());
    const [showAbortWarningModal, setShowAbortWarningModal] = useState(false);
    const [imageRetryTick, setImageRetryTick] = useState({});
    const [failedImageKeys, setFailedImageKeys] = useState({});
    const [readingGateBlock, setReadingGateBlock] = useState(null);
    const hourlyGateQuestion = (!quizSubmitted && !reviewMode && activeQuiz)
        ? quizQuestions[currentQuestionIndex]
        : null;
    const { ready: hourlyImagesReady } = useQuizImageGate(
        collectHourlyImageUrls(hourlyGateQuestion),
        toDisplayImageUrl
    );

    // Search Quota State
    const [searchCount, setSearchCount] = useState(0);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [hourlySearchText, setHourlySearchText] = useState('');
    const MAX_SEARCH_QUOTA = 2;
    
    // Hall of Fame Gallery State
    const [showHallOfFame, setShowHallOfFame] = useState(isPrizesSurface);
    const [hallOfFameBoardTab, setHallOfFameBoardTab] = useState(MONTHLY_SUB_TAB.CHAMPION);
    const [hallOfFameData, setHallOfFameData] = useState(() => (isPrizesSurface || isRankSurface ? peekCachedHallOfFame() : []));
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [maximizedAvatar, setMaximizedAvatar] = useState(null);
    const openMaximizedImage = (url, event, extra = {}) => {
        if (!url) return;
        setMaximizedAvatar({
            url,
            previewSrc: imagePreviewFromEvent(event),
            title: extra.title || '',
            subtitle: extra.subtitle || '',
            kind: extra.kind || 'avatar',
        });
    };
    const [hallOfFamePrizeView, setHallOfFamePrizeView] = useState(() => {
        const saved = storageUtils.getItem(HOF_PRIZE_VIEW_STORAGE_KEY);
        return normalizeHallOfFameViewMode(saved);
    });
    const [hallOfFameUserPrizeFilter, setHallOfFameUserPrizeFilter] = useState(null);
    const [hofBrowseMonth, setHofBrowseMonth] = useState(() => {
        const cached = isPrizesSurface || isRankSurface ? peekCachedHallOfFame() : [];
        return resolveHofBrowseMonth(cached, readStoredHofBrowseMonth());
    });
    const hallOfFamePrizeViewCopy = getHallOfFamePrizeViewCopy(language);

    const hofYears = useMemo(() => listHofYears(hallOfFameData), [hallOfFameData]);
    const hofMonthsForYear = useMemo(
        () => (hofBrowseMonth ? listHofMonthsForYear(hallOfFameData, hofBrowseMonth.year, language) : []),
        [hallOfFameData, hofBrowseMonth, language]
    );
    const selectedHofEntry = useMemo(
        () => (hofBrowseMonth ? findHofEntry(hallOfFameData, hofBrowseMonth.year, hofBrowseMonth.month) : null),
        [hallOfFameData, hofBrowseMonth]
    );
    const canHofPrev = useMemo(
        () => Boolean(hofBrowseMonth && stepHofBrowseMonth(hallOfFameData, hofBrowseMonth.year, hofBrowseMonth.month, 1)),
        [hallOfFameData, hofBrowseMonth]
    );
    const canHofNext = useMemo(
        () => Boolean(hofBrowseMonth && stepHofBrowseMonth(hallOfFameData, hofBrowseMonth.year, hofBrowseMonth.month, -1)),
        [hallOfFameData, hofBrowseMonth]
    );

    const selectHofBrowseMonth = useCallback((year, month) => {
        const next = { year: Number(year), month: Number(month) };
        setHofBrowseMonth(next);
        writeStoredHofBrowseMonth(next.year, next.month);
        try {
            storageUtils.setItem(HOF_PRIZE_MONTH_STORAGE_KEY, JSON.stringify(next));
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (!hallOfFameData?.length) {
            setHofBrowseMonth(null);
            return;
        }
        const resolved = resolveHofBrowseMonth(hallOfFameData, hofBrowseMonth || readStoredHofBrowseMonth());
        if (!resolved) {
            setHofBrowseMonth(null);
            return;
        }
        if (
            !hofBrowseMonth
            || Number(hofBrowseMonth.year) !== resolved.year
            || Number(hofBrowseMonth.month) !== resolved.month
        ) {
            setHofBrowseMonth(resolved);
            writeStoredHofBrowseMonth(resolved.year, resolved.month);
        }
    // Only re-resolve when archive identity changes, not on every browse click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hallOfFameData]);

    React.useEffect(() => {
        hourlyQuizRef.current = hourlyQuiz;
    }, [hourlyQuiz]);

    React.useEffect(() => {
        activeQuizRef.current = activeQuiz;
    }, [activeQuiz]);

    React.useEffect(() => {
        hourlyQuizRefreshBusyRef.current = hourlyQuizRefreshBusy;
    }, [hourlyQuizRefreshBusy]);

    // Timed hourly attempt is on screen — shell ads must wait (pack timer keeps running).
    React.useEffect(() => {
        if (typeof onHourlyQuizPlayChange !== 'function') return;
        onHourlyQuizPlayChange(!isFullLeaderboard && Boolean(activeQuiz) && !quizSubmitted && !reviewMode);
    }, [isFullLeaderboard, activeQuiz, quizSubmitted, reviewMode, onHourlyQuizPlayChange]);

    React.useEffect(() => {
        if (typeof onHourlyQuizPlayChange !== 'function') return undefined;
        return () => onHourlyQuizPlayChange(false);
    }, [onHourlyQuizPlayChange]);

    // Gamified Ladder state
    const [todayAttempts, setTodayAttempts] = useState([]);
    const ladderRef = React.useRef(null);

    // Offline sync state
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null); // 'syncing', 'waiting', 'success', 'failed'
    const [pendingSubmission, setPendingSubmission] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [syncErrorMessage, setSyncErrorMessage] = useState(null);
    const IMAGE_REPEAT_COOLDOWN_HOURS = 10;

    const getImageHistoryStorageKey = () => `slm_hourly_image_history_${user?.id || 'anon'}`;

    const getRecentImageSet = () => {
        try {
            const saved = storageUtils.getItem(getImageHistoryStorageKey());
            const now = getSyncedTime().getTime();
            const threshold = now - (IMAGE_REPEAT_COOLDOWN_HOURS * 60 * 60 * 1000);
            const rows = Array.isArray(saved) ? saved : [];
            const recent = rows.filter((entry) => entry && entry.image && Number(entry.ts) >= threshold);
            return new Set(recent.map((entry) => entry.image));
        } catch {
            return new Set();
        }
    };

    const storeSelectedQuestionImages = (questions) => {
        try {
            const key = getImageHistoryStorageKey();
            const saved = storageUtils.getItem(key);
            const now = getSyncedTime().getTime();
            const threshold = now - (IMAGE_REPEAT_COOLDOWN_HOURS * 60 * 60 * 1000);
            const existing = Array.isArray(saved) ? saved : [];
            const kept = existing.filter((entry) => entry && entry.image && Number(entry.ts) >= threshold);
            const additions = (questions || [])
                .flatMap((q) => getQuestionImageKeys(q))
                .map((image) => ({ image, ts: now }));
            storageUtils.setItem(key, [...kept, ...additions]);
        } catch (error) {
            console.warn('Could not persist image-repeat history:', error);
        }
    };

    const buildRetryImageSrc = (rawUrl, imageKey) => {
        const base = toDisplayImageUrl(rawUrl);
        if (!base) return '';
        const sep = base.includes('?') ? '&' : '?';
        return `${base}${sep}retry=${imageRetryTick[imageKey] || 0}`;
    };

    const retryImageLoad = (imageKey) => {
        setFailedImageKeys((prev) => ({ ...prev, [imageKey]: false }));
        setImageRetryTick((prev) => ({ ...prev, [imageKey]: (prev[imageKey] || 0) + 1 }));
    };

    useEffect(() => {
        if (!showHallOfFame) {
            return;
        }
        // Always land on মাসের সেরা / Champion when opening Hall of Fame
        setHallOfFameBoardTab(MONTHLY_SUB_TAB.CHAMPION);
    }, [showHallOfFame]);

    // Congrats link row is static + dismissible — no timed banner / victory sound.

    // PERSISTENCE & ANTI-CHEAT LOGIC
    useEffect(() => {
        if (!activeQuiz || quizSubmitted) return;

        const state = {
            quizId: activeQuiz.id,
            points_reward: activeQuiz.points_reward,
            packGreenSeconds,
            packStartTimes,
            packOnTimeFlags,
            questions: quizQuestions,
            currentIndex: currentQuestionIndex,
            answers: userAnswers,
            hints: Array.from(hintViewedQuestions),
            timestamp: Date.now()
        };
        storageUtils.setItem('slm_hourly_active_quiz_state', state);
    }, [activeQuiz, quizQuestions, currentQuestionIndex, userAnswers, hintViewedQuestions, quizSubmitted, packGreenSeconds, packStartTimes, packOnTimeFlags]);

    useEffect(() => {
        const checkResumption = () => {
            const savedState = storageUtils.getItem('slm_hourly_active_quiz_state');
            if (!savedState?.quizId || activeQuiz) return;
            const nowMs = getSyncedTime().getTime();
            const questionCount = Array.isArray(savedState.questions) ? savedState.questions.length : 0;
            const staleMakeup = questionCount === 0
                || questionCount > HOURLY_QUESTIONS_PER_SET
                || Number(savedState.points_reward) > HOURLY_POINTS_PER_SET;
            if (
                staleMakeup
                || !isHourlyQuizIdOpen(savedState.quizId, nowMs)
                || playedHourlyIdSet().has(savedState.quizId)
            ) {
                storageUtils.removeItem('slm_hourly_active_quiz_state');
                return;
            }
            setQuizQuestions(savedState.questions || []);
            setCurrentQuestionIndex(savedState.currentIndex || 0);
            setUserAnswers(savedState.answers || {});
            setHintViewedQuestions(new Set(savedState.hints || []));
            const green = savedState.packGreenSeconds || 120;
            const starts = Array.isArray(savedState.packStartTimes) ? savedState.packStartTimes : [];
            const onTime = Array.isArray(savedState.packOnTimeFlags) ? savedState.packOnTimeFlags : [];
            setPackGreenSeconds(green);
            setPackStartTimes(starts);
            setPackOnTimeFlags(onTime);
            packTimingRef.current = { greenSeconds: green, starts, onTime };
            setActiveQuiz({
                id: savedState.quizId,
                title: language === 'en' ? 'Hourly quiz' : 'ঘণ্টার কুইজ',
                points_reward: savedState.points_reward ?? HOURLY_POINTS_PER_SET,
                questions: savedState.questions || [],
            });
            setQuizSubmitted(false);
        };

        if (!activeQuiz) {
            checkResumption();
        }
    }, [hourlyQuiz, activeQuiz, todayAttempts]);

    const getSyncedTime = () => {
        return new Date(Date.now() + serverTimeOffset);
    };

    const t = {
        en: {
            title: "Competitions",
            weekly: "Weekly Challenge",
            hourly: "Hourly Quiz",
            play: "Play Now",
            questions: "Questions",
            mins: "Mins",
            points: "Pts",
            leaderboard: "Leaderboard",
            completed: "Quiz Completed!",
            score: "Your Score",
            close: "Close",
            loginReq: "Please login to participate",
            highStakes: "High Stakes",
            highStakesDesc: "Wrong answers deduct points based on your lifetime score",
            selectAnswerToContinue: "Select an answer to continue.",
            syncing: "Syncing your score...",
            waitingNetwork: "Waiting for network connection...",
            autoRetry: "Auto-retry enabled",
            previousPending: "Previous attempt pending sync",
            retryNow: "Retry Now",
            syncSuccess: "Score synced successfully!",
            syncFailed: "Sync failed. Please retry.",
            hint: "Hint",
            hintDisabled: "Select an answer to see hint",
            noHint: "No hint available for this question",
            streak: "In a Row",
            missedTitle: "CHALLENGE MISSED",
            missedDesc: "Points Earned = 0",
            upcomingStatus: "Challenge Upcoming",
            scoreLabel: "SCORE",
            challengeCompleted: "Challenge Completed",
            penaltyApplied: "penalty applied",
            perfectScore: "Perfect Score!",
            liveNow: "LIVE NOW",
            nextChallengeLabel: "NEXT CHALLENGE",
            upcomingPowerPlay: "Power Play",
            startsIn: "Starts",
            closingIn: "Ends in",
            timeLeft: "Time Left",
            reviewAnswers: "Review answers",
            reviewHour: "Review %s quiz",
            reviewUnavailable: "Review isn’t available on this device for that hour.",
            reviewLast: "Review last attempt",
            hourlyLoading: "Loading hourly challenge…",
            loadingText: "Loading rankings…",
            galleryLoading: "Opening the gallery…",
            topPlayersToday: "Top Players Today",
            viewAll: "View All",
            antiCheatExitTitle: "Exit Quiz?",
            antiCheatExitDesc: "Exiting scores 0 for this hour only.",
            antiCheatExitMakeup: "",
            antiCheatExitPenalty: "This is an anti-cheating safeguard and cannot be undone.",
            antiCheatStay: "Continue Quiz",
            antiCheatExitConfirm: "Exit with 0 Points",
            searchLimitTitle: "Search Quota",
            searchConfirm: "Do you want to search Google? You have 2 searches per session (Used: %s/2).",
            searchExhausted: "Quota exhausted! You have used all 2 searches.",
            searchProceed: "Proceed",
            noDistrict: "No Update",
            leaderboardTimeInfo:
                "India time (IST). Scores shown are after penalties."
        },
        bn: {
            title: "প্রতিযোগিতা",
            weekly: "সাপ্তাহিক কুইজ",
            hourly: "ঘণ্টার কুইজ",
            play: "খেলুন",
            questions: "প্রশ্ন",
            mins: "মিনিট",
            points: "পয়েন্ট",
            leaderboard: "লিডারবোর্ড",
            completed: "কুইজ শেষ!",
            score: "স্কোর",
            close: "বন্ধ",
            loginReq: "খেলতে লগইন করুন",
            highStakes: "হাই স্টেকস",
            highStakesDesc: "ভুল উত্তর দিলে পয়েন্ট কাটা যাবে",
            selectAnswerToContinue: "এগিয়ে যেতে উত্তর সিলেক্ট করুন।",
            syncing: "স্কোর সেভ হচ্ছে...",
            waitingNetwork: "ইন্টারনেটের জন্য অপেক্ষা করা হচ্ছে...",
            autoRetry: "অটো-রিট্রাই চালু আছে",
            previousPending: "আগের স্কোর সেভ হচ্ছে...",
            retryNow: "আবার চেষ্টা করুন",
            syncSuccess: "স্কোর সেভ হয়েছে!",
            syncFailed: "সেভ করা যায়নি। আবার চেষ্টা করুন।",
            hint: "ইঙ্গিত",
            hintDisabled: "আগে উত্তর সিলেক্ট করুন",
            noHint: "কোনো ইঙ্গিত নেই",
            streak: "একটানা",
            missedTitle: "কুইজ মিস হয়েছে",
            missedDesc: "০ পয়েন্ট",
            upcomingStatus: "কুইজ আসছে",
            scoreLabel: "স্কোর",
            challengeCompleted: "কুইজ শেষ",
            penaltyApplied: "পেনাল্টি",
            perfectScore: "সব উত্তর সঠিক!",
            liveNow: "এখন লাইভ",
            nextChallengeLabel: "পরের কুইজ",
            reviewAnswers: "উত্তর দেখুন",
            reviewHour: "%s-এর উত্তর দেখুন",
            reviewUnavailable: "এই ঘণ্টার উত্তর এই ডিভাইসে সংরক্ষিত নেই।",
            reviewLast: "শেষ প্রচেষ্টা দেখুন",
            hourlyLoading: "ঘণ্টার কুইজ লোড হচ্ছে…",
            loadingText: "র‍্যাঙ্কিং লোড হচ্ছে…",
            galleryLoading: "গ্যালারি খোলা হচ্ছে…",
            upcomingPowerPlay: "পাওয়ার প্লে",
            startsIn: "সময় বাকি",
            closingIn: "শেষ হতে বাকি",
            timeLeft: "সময় বাকি",
            topPlayersToday: "আজকের সেরা",
            viewAll: "সব দেখুন",
            antiCheatExitTitle: "কুইজ থেকে বের হবেন?",
            antiCheatExitDesc: "এখন বের হলে এই ঘণ্টায় ০ পয়েন্ট পাবেন।",
            antiCheatExitMakeup: "",
            antiCheatExitPenalty: "নকল ঠেকাতে এই নিয়মটি এড়ানো যাবে না।",
            antiCheatStay: "কুইজ খেলতে থাকুন",
            antiCheatExitConfirm: "বের হয়ে যান (০ পয়েন্ট)",
            searchLimitTitle: "গুগল সার্চ",
            searchConfirm: "গুগল সার্চ করবেন? প্রতি সেশনে মাত্র ২ বার করতে পারবেন (ব্যবহৃত: %s/২)।",
            searchExhausted: "সার্চের সুযোগ শেষ!",
            searchProceed: "সার্চ করুন",
            noDistrict: "তথ্য নেই",
            leaderboardTimeInfo:
                "ভারতীয় সময় (IST) অনুযায়ী। পেনাল্টি বাদ দিয়ে স্কোর।"
        }
    }[language];

    const hourlyLifetimePoints = getLifetimePoints(userProfile, userRank);
    const hourlyStakesUi = getHourlyStakesUi(hourlyLifetimePoints, language);
    const [showHourlyPenaltyInfoModal, setShowHourlyPenaltyInfoModal] = useState(false);
    const [showMonthlyBoardInfoModal, setShowMonthlyBoardInfoModal] = useState(false);
    const [leaderboardUserSheet, setLeaderboardUserSheet] = useState(null);
    const [selectedMonthlyDetailPlayer, setSelectedMonthlyDetailPlayer] = useState(null);
    const encouragementCopy = getEncouragementCopy(language);
    const activeMonthlyList = leaderboardTab === 'monthly'
        ? getMonthlyPrizeDisplayList(monthlyBoardTab, monthlyLeaderboard, encouragementBoards)
        : [];
    const monthlyPodiumList = leaderboardTab === 'monthly'
        ? getMonthlyStandingsForPodium(monthlyBoardTab, monthlyLeaderboard, encouragementBoards)
        : [];
    const monthlyBoardMeta = leaderboardTab === 'monthly'
        ? getMonthlyBoardMeta(monthlyBoardTab, language, encouragementBoards)
        : null;

    const loadData = async (forceRefresh = false) => {
        setLoading(true);
        setFetchError(false);
        
        try {
            await fetchServerTime();
            const promises = [];

            if (isFullLeaderboard) {
                // Rank / Prizes: cache-first monthly boards (force only when caller asks)
                promises.push(fetchMonthlyLeaderboard(forceRefresh));
                if (leaderboardTab === 'annual') {
                    promises.push(fetchAnnualLeaderboard(forceRefresh));
                }
            } else {
                promises.push(fetchHourlyQuiz());
            }

            if (user) {
                if (isFullLeaderboard) {
                    // Soft user rank for all-time sticky bar; skip Play-only fetches
                    promises.push(fetchUserRank(forceRefresh));
                    if (isPrizesSurface) {
                        fetchHallOfFameGallery(forceRefresh);
                    } else if (isRankSurface) {
                        // Month winners reveal — warm after paint, never force on open
                        queueMicrotask(() => {
                            fetchHallOfFameGallery(false);
                        });
                    }
                } else {
                    // Play: hourly quiz attempts + user rank only. Do not pull monthly/HoF/full
                    promises.push(fetchTodayAttempts());
                    promises.push(fetchUserRank(forceRefresh));
                }
            }

            await Promise.all(promises);
        } catch (error) {
            console.error("Error loading competition data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // All surfaces open cache-first. Quiz submit still force-refreshes the ladder.
        loadData(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
        const mainContent = document.getElementById('main-scroll-container');
        if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'instant' });
    }, [language, user]); // Re-run when language/user change

    useEffect(() => {
        if (!isFullLeaderboard) return undefined;

        const html = document.documentElement;
        html.classList.remove('dark');

        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const previousThemeColor = metaThemeColor?.getAttribute('content') || null;
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', '#fffdf7');

        return () => {
            const savedTheme = storageUtils.getItem('appTheme') || 'dark';
            if (savedTheme === 'dark') {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
            if (previousThemeColor) {
                metaThemeColor.setAttribute('content', previousThemeColor);
            }
        };
    }, [isFullLeaderboard]);

    useEffect(() => {
        // Hourly countdown is Play-only — skip on Rank/Prizes to avoid 1s full-tree re-renders
        if (isFullLeaderboard) return undefined;

        const updateTimer = () => {
            const now = getIstDate(getSyncedTime());
            const minutes = 59 - now.getUTCMinutes();
            const seconds = 59 - now.getUTCSeconds();
            setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [serverTimeOffset, isFullLeaderboard]);

    const getHourlyQuizId = () => getLiveHourlySlot(getSyncedTime().getTime()).quizId;

    const playedHourlyIdSet = () => new Set((todayAttempts || []).map((row) => String(row.quiz_id || '')));

    const fetchTodayAttempts = async () => {
        if (!user) return;
        const nowMs = getSyncedTime().getTime();
        const live = getLiveHourlySlot(nowMs);
        const prefix = `hourly-challenge-${hourIdFromParts(live.year, live.month, live.day, live.hour).slice(0, 10)}-`;
        const playable = listPlayableHourlySlots([], nowMs);
        const extraIds = playable
            .filter((slot) => slot.isLastNight)
            .map((slot) => slot.quizId);

        try {
            let query = supabase
                .from('quiz_attempts')
                .select('quiz_id, score, penalty, created_at')
                .eq('user_id', user.id)
                .like('quiz_id', `${prefix}%`);

            const { data, error } = await query.order('created_at', { ascending: true });

            let rows = (!error && data) ? data : [];
            if (extraIds.length > 0) {
                const { data: extra, error: extraError } = await supabase
                    .from('quiz_attempts')
                    .select('quiz_id, score, penalty, created_at')
                    .eq('user_id', user.id)
                    .in('quiz_id', extraIds);
                if (extraError) throw extraError;
                if (Array.isArray(extra)) {
                    const seen = new Set(rows.map((row) => row.quiz_id));
                    extra.forEach((row) => {
                        if (!seen.has(row.quiz_id)) rows = [...rows, row];
                    });
                }
            }
            setTodayAttempts(rows);
        } catch (e) {
            console.error('Error fetching today attempts:', e);
        }
    };

    // Scroll to live node only when it would sit below the fold (avoid unnecessary scroll on compact layout)
    useEffect(() => {
        if (ladderRef.current && !loading) {
            const timer = window.setTimeout(() => {
                const liveNode = document.getElementById('node-live') || document.getElementById('node-upcoming-next');
                if (!liveNode) return;
                const rect = liveNode.getBoundingClientRect();
                const navClearance = 88;
                if (rect.bottom > window.innerHeight - navClearance || rect.top < 0) {
                    liveNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 300);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [todayAttempts, loading, showCompactView]);


    const buildHourlySlots = () => {
        const nowMs = getSyncedTime().getTime();
        const live = getLiveHourlySlot(nowMs);
        const currentHour = live.hour;
        const year = live.year;
        const month = String(live.month).padStart(2, '0');
        const day = String(live.day).padStart(2, '0');
        const playedIds = playedHourlyIdSet();
        const playable = listPlayableHourlySlots(playedIds, nowMs);
        const playableByHour = new Map();
        playable.forEach((slot) => {
            if (!slot.isLastNight) playableByHour.set(slot.hour, slot);
        });

        const attemptMap = {};
        todayAttempts.forEach((a) => {
            const parsed = parseHourlyQuizId(a.quiz_id);
            if (!parsed) return;
            if (parsed.year === live.year && parsed.month === live.month && parsed.day === live.day) {
                attemptMap[parsed.hour] = a;
            }
        });

        const isCurrentHourPlayed = Boolean(attemptMap[currentHour] || playedIds.has(live.quizId));

        const slots = [];
        for (let h = 0; h <= 23; h++) {
            const attempt = attemptMap[h];
            const quizId = formatHourlyQuizId(live.year, live.month, live.day, h);
            let status;
            if (h === currentHour) {
                status = isCurrentHourPlayed ? 'played' : 'live';
            } else if (h < currentHour) {
                if (attempt) status = 'played';
                else if (playableByHour.has(h)) status = 'open';
                else status = 'missed';
            } else if (h === currentHour + 1 && isCurrentHourPlayed) {
                status = 'upcoming-next';
            } else {
                status = 'upcoming';
            }

            const hour12 = h % 12 || 12;
            const ampm = h < 12 ? 'AM' : 'PM';
            const playableSlot = playableByHour.get(h);
            const hasReview = Boolean(
                storageUtils.getItem(`review_${quizId}`) ||
                storageUtils.getItem(`review_hourly-challenge-${year}${month}${day}${String(h).padStart(2, '0')}`)
            );

            slots.push({
                hour: h,
                status,
                score: attempt?.score ?? null,
                penalty: attempt?.penalty ?? null,
                label: `${hour12} ${ampm}`,
                quizId,
                hasReview,
                closesInMin: playableSlot ? minutesUntilHourlySlotCloses(playableSlot, nowMs) : null,
                slot: playableSlot || (status === 'live' ? live : null),
            });
        }
        return slots.reverse();
    };

    const getLastNightOpenSlot = () => {
        const nowMs = getSyncedTime().getTime();
        return listPlayableHourlySlots(playedHourlyIdSet(), nowMs).find((slot) => slot.isLastNight) || null;
    };

    const getTodayNetScore = () => todayAttempts.reduce(
        (sum, attempt) => sum + (Number(attempt.score) || 0) - (Number(attempt.penalty) || 0),
        0
    );

    const syncPackTimingRef = (patch) => {
        packTimingRef.current = { ...packTimingRef.current, ...patch };
    };

    const ensurePackTimerStarted = (packIdx, greenOverride = null, extraWaitMs = 0) => {
        const green = greenOverride ?? packTimingRef.current.greenSeconds ?? packGreenSeconds;
        const starts = [...(packTimingRef.current.starts || [])];
        const wait = Math.max(0, Number(extraWaitMs) || 0);
        if (!starts[packIdx]) {
            starts[packIdx] = Date.now();
            setPackStartTimes(starts);
            syncPackTimingRef({ starts, greenSeconds: green });
            return;
        }
        if (wait > 0) {
            starts[packIdx] = Number(starts[packIdx]) + wait;
            setPackStartTimes(starts);
            syncPackTimingRef({ starts, greenSeconds: green });
        }
    };

    const finalizePackTimer = (packIdx) => {
        const { greenSeconds, starts, onTime } = packTimingRef.current;
        const flags = [...(onTime || [])];
        if (flags[packIdx] !== undefined) return flags;
        const start = starts?.[packIdx];
        flags[packIdx] = start ? isPackOnTime(start, greenSeconds, Date.now()) : true;
        setPackOnTimeFlags(flags);
        syncPackTimingRef({ onTime: flags });
        return flags;
    };

    /**
     * Direct submission logic for Hourly Quiz
     * No background queues. No complex retries.
     * Simple: Try -> Success (Lock) OR Fail (Show Error)
     * quizIdOverride freezes the hour started (makeup session must not hop on rollover).
     */
    const submitHourlyQuiz = async (score, penalty, quizIdOverride = null) => {
        if (blockGuestWrite(userProfile, showNotification, language)) {
            return;
        }
        setIsSyncing(true);
        setSyncStatus('syncing');
        setSyncErrorMessage(null);
        setSubmitRejected(null);

        // Prefer the hour frozen at Play (active session); never invent a past makeup id.
        const quizId = quizIdOverride || activeQuiz?.id || getHourlyQuizId();

        // 2. Sanitize Inputs (Postgres expects Integers)
        const cleanScore = Math.max(0, Math.min(HOURLY_POINTS_PER_SET, Math.round(Number(score)) || 0));
        const cleanPenalty = Math.max(0, Math.min(HOURLY_POINTS_PER_SET, Math.round(Number(penalty)) || 0));

        const params = {
            p_quiz_id: quizId,
            p_score: cleanScore,
            p_penalty: cleanPenalty,
            p_user_id: user.id
        };

        console.log('Submitting Hourly Quiz:', params);

        try {
            // 3. Direct RPC Call
            const { data, error } = await supabase.rpc('submit_quiz_result_v2', params);

            if (error) throw error;

            // 3a. Server accepted the call but refused to award (e.g. device clock changed).
            //     The DB returns { success: false, error } without a SQL error, so handle it here.
            if (data && data.success === false) {
                const isTimeBlock = data.error === 'hourly_time_mismatch';
                const isWindowClosed = data.error === 'hourly_window_closed';
                const isGuestBlock = data.error === 'guest_preview';
                setSyncStatus('failed');
                setSubmitRejected({
                    type: isWindowClosed ? 'window' : isTimeBlock ? 'time' : isGuestBlock ? 'guest' : 'other',
                    message: isGuestBlock
                        ? guestPreviewText(language, 'blockedBody')
                        : isWindowClosed
                        ? (language === 'en'
                            ? 'This hour has closed. Your score was not counted.'
                            : 'এই ঘণ্টা বন্ধ হয়ে গেছে। স্কোর যোগ করা যায়নি।')
                        : isTimeBlock
                        ? (language === 'en'
                            ? 'This score was not counted. Your device clock does not match the real time, so this hourly play is invalid. Please set your phone date & time to "Automatic" and play during the live hour.'
                            : 'ফোনের সময় ঠিক না থাকায় স্কোর যোগ করা যায়নি। সময় "অটোমেটিক" সেট করে চলতি ঘণ্টার কুইজ খেলুন।')
                        : (data.message || data.error || (language === 'en' ? 'Submission was not accepted.' : 'সাবমিট করা যায়নি।')),
                });
                return;
            }

            // 3b. Success: Lock the UI immediately
            setSyncStatus('success');

            // Update local state to show "Locked" view
            // We use the timestamp we generated to safeguard against drift
            const now = getSyncedTime();
            setLastAttemptTime(now.toISOString());
            setLastAttemptPenalty(penalty);

            // Also refresh leaderboard and attempts for immediate feedback
            const mockAttempt = {
                quiz_id: quizId,
                score: cleanScore,
                penalty: cleanPenalty,
                completed_at: now.toISOString()
            };
            setTodayAttempts(prev => {
                const exists = prev.some(a => a.quiz_id === quizId);
                if (exists) return prev;
                return [mockAttempt, ...prev];
            });

            invalidateLeaderboardCaches(user?.id);
            if (isFullLeaderboard) {
                fetchFullLeaderboard(true);
                fetchMonthlyLeaderboard(true);
                fetchAnnualLeaderboard(); // respect 10-min SWR; no force — table grows to ~400k rows by year end
            }
            if (user) fetchUserRank(true);
            refreshProfile(user, true);

            // Update updated_at in profiles table to reflect recent activity
            await supabase
                .from('profiles')
                .update({ updated_at: now.toISOString() })
                .eq('id', user.id);

        } catch (error) {
            console.error('Submission failed:', error);
            setSyncStatus('failed'); // This will show the "Retry" button

            if (error.message?.includes('JWT') || error.code === 'P0001' || error.message?.includes('authenticated')) {
                setSyncErrorMessage('Session expired. Please login again.');
            } else {
                setSyncErrorMessage(error.message || 'Submission failed');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleHourlyGoogleSearch = (text) => {
        if (!text) return;
        setHourlySearchText(text);
        setShowSearchModal(true);
    };

    const confirmHourlyGoogleSearch = () => {
        if (searchCount < MAX_SEARCH_QUOTA) {
            setSearchCount(prev => prev + 1);
            const query = encodeURIComponent(hourlySearchText);
            void openExternalUrl(`https://www.google.com/search?q=${query}`);
            setShowSearchModal(false);
        }
    };

    /**
     * Safe wrapper for submit_quiz_result RPC
     * Handles cases where the database might not have the p_penalty parameter yet
     */
    const safeSubmitQuizResult = async (quizId, score, penalty = 0) => {
        const params = {
            p_quiz_id: quizId,
            p_score: score,
            p_penalty: penalty,
            p_user_id: user?.id
        };

        const result = await supabase.rpc('submit_quiz_result_v2', params);

        if (result.error) {
            console.error('submit_quiz_result_v2 RPC Error:', result.error);
        }
        return result;
    };

    // Retry a single submission
    const retrySubmission = async (submission, index = 0) => {
        try {
            console.log(`Retrying submission ${index + 1}:`, submission);
            setSyncStatus('syncing');

            const { error } = await safeSubmitQuizResult(
                submission.quiz_id,
                submission.score,
                submission.penalty || 0
            );

            if (error) {
                // If the error is "duplicate key" (23505), it means the sync actually worked 
                // in a previous attempt but the client didn't get the success response.
                // We should treat this as a success and remove it from the queue.
                if (error.code === '23505') {
                    console.log('Submission already exists in database (23505), treating as success.');
                } else {
                    throw error;
                }
            }

            // Success - remove from queue
            await clearPendingSubmission(submission);
            setSyncStatus('success');
            setSyncErrorMessage(null);

            // Update local penalty state
            if (submission.penalty) {
                setLastAttemptPenalty(submission.penalty);
            }

            // Refresh data
            await fetchTodayAttempts();
            invalidateLeaderboardCaches(user?.id);
            if (isFullLeaderboard) {
                await fetchFullLeaderboard(true);
                await fetchMonthlyLeaderboard(true);
            }
            if (user) await fetchUserRank(true);
            if (submission.quiz_id === hourlyQuiz?.id) {
                // Update local state immediately to lock the UI
                setLastAttemptTime(submission.timestamp);

                // Update cache directly with known timestamp to prevent stale reads
                const cacheKey = `last_attempt_${user.id}_${submission.quiz_id}`;
                cacheHelper.set(cacheKey, submission.timestamp, 5); // Cache for 5 mins
            }

            console.log('Successfully synced submission:', submission);
        } catch (error) {
            console.error('Retry failed:', error);
            setSyncStatus('failed');
            setSyncErrorMessage(error.message || 'Unknown error');
            setRetryCount(prev => prev + 1);
            throw error;
        }
    };

    // Clear pending submission after success
    const clearPendingSubmission = async (submission) => {
        try {
            const pending = storageUtils.getItem('pending_quiz_submissions');
            if (!pending) return;

            const queue = JSON.parse(pending);
            const filtered = queue.filter(item =>
                !(item.quiz_id === submission.quiz_id && item.timestamp === submission.timestamp)
            );

            if (filtered.length > 0) {
                storageUtils.setItem('pending_quiz_submissions', JSON.stringify(filtered));
                setPendingSubmission(filtered[0] || null);
            } else {
                storageUtils.removeItem('pending_quiz_submissions');
                setPendingSubmission(null);
            }
        } catch (error) {
            console.error('Error clearing pending submission:', error);
        }
    };

    const fetchServerTime = async () => {
        try {
            const offset = await requestManager.fetch(
                'server_time_offset',
                async () => {
                    const { data, error } = await supabase.rpc('get_server_time');
                    if (data) {
                        const serverTime = new Date(data).getTime();
                        return serverTime - Date.now();
                    }
                    // Fallback to WorldTimeAPI
                    const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
                    if (response.ok) {
                        const timeData = await response.json();
                        const serverTime = new Date(timeData.datetime).getTime();
                        return serverTime - Date.now();
                    }
                    return 0;
                },
                { ttl: 30, swr: true }
            );
            setServerTimeOffset(offset || 0);
        } catch (error) {
            console.error('Error fetching server time:', error);
        }
    };

    const fetchHourlyQuiz = async (forceRefresh = false, hourIdOverride = null) => {
        if (isFullLeaderboard) return null;

        const live = getLiveHourlySlot(getSyncedTime().getTime());
        const hourId = hourIdOverride || live.hourId;
        const quizId = `hourly-challenge-${hourId}`;
        const cacheKey = `hourly_quiz_db_bn_v5_${hourId}_${user?.id || 'anon'}`;

        try {
            const quizData = await requestManager.fetch(
                cacheKey,
                async () => {
                    const seededArgs = {
                        lang: 'bn',
                        limit_count: 30,
                        p_user_id: user?.id || null,
                        p_quiz_id: quizId,
                    };
                    let rpcResult = await supabase.rpc('get_random_hourly_questions', seededArgs);
                    if (rpcResult.error) {
                        rpcResult = await supabase.rpc('get_random_hourly_questions', {
                            lang: 'bn',
                            limit_count: 30,
                        });
                    }
                    const { data, error } = rpcResult;
                    const visualQuestions = await visualQuizService.fetchVisualQuestions({
                        language: 'bn',
                        hourId,
                    });

                    if (error) throw error;

                    const dbQuestions = (data || []).map((q) => ({
                        id: q.id,
                        question_text: q.question_text,
                        options: q.options,
                        correct_option_index: q.correct_answer_index,
                        hint: q.hint,
                        category: q.category,
                        tags: q.tags
                    }));

                    const mergedQuestionMap = new Map();
                    [...dbQuestions, ...(visualQuestions || [])].forEach((q) => {
                        if (!q || !q.id) return;
                        mergedQuestionMap.set(String(q.id), q);
                    });
                    const mergedQuestions = [...mergedQuestionMap.values()];

                    if (mergedQuestions.length > 0) {
                        return {
                            id: quizId,
                            title: language === 'en' ? 'Hourly quiz' : 'ঘণ্টার কুইজ',
                            description: language === 'en' ? 'Test your safety knowledge! New questions every hour.' : 'নিরাপত্তা জ্ঞান পরীক্ষা করুন! প্রতি ঘণ্টায় নতুন প্রশ্ন।',
                            duration_minutes: 5,
                            points_reward: HOURLY_POINTS_PER_SET,
                            questions: mergedQuestions,
                            isLocal: false
                        };
                    }
                    return null;
                },
                { ttl: 60, swr: true, forceRefresh }
            );

            if (quizData && quizData.id === getHourlyQuizId()) {
                setHourlyQuiz(quizData);
            }
            return quizData ?? null;
        } catch (error) {
            console.error('Unexpected error fetching hourly quiz:', error);
            setFetchError(true);
            return null;
        }
    };

    /** Ensures hourly payload matches the current clock hour (fixes stale quiz after hour rollover). */
    const beginHourlyQuiz = async (options = {}) => {
        if (isFullLeaderboard) return;
        if (!user) {
            setCurrentView('login');
            return;
        }
        const isAdmin = userProfile?.role === 'admin';
        const bypassReadingGate = Boolean(options.bypassReadingGate) && isAdmin;
        /** Admin preview may reopen an already-played hour to inspect the modal UI. */
        const allowAdminPreviewReplay = bypassReadingGate;

        if (!bypassReadingGate) {
            const completedLessons = filterCoreCompletedLessonIds(
                Array.isArray(userProfile?.completed_lessons) ? userProfile.completed_lessons : []
            );
            const gate = await checkReadingGate({
                userId: user.id,
                completedLessons,
                trainingChapters: null,
                guestPreview: isGuestUser(userProfile),
            });
            if (!gate.allowed) {
                setReadingGateBlock({
                    ...gate,
                    userId: user.id,
                    canAdminPreview: isAdmin,
                });
                return;
            }
        } else {
            setReadingGateBlock(null);
        }

        setHourlyQuizRefreshBusy(true);
        try {
            const nowMs = getSyncedTime().getTime();
            let target = getLiveHourlySlot(nowMs);
            if (options.slot?.quizId) {
                if (!isHourlyQuizIdOpen(options.slot.quizId, nowMs)) {
                    if (typeof showNotification === 'function') {
                        showNotification(
                            language === 'en'
                                ? 'This hour has closed. Pick another open hour.'
                                : 'এই ঘণ্টা বন্ধ হয়ে গেছে। অন্য খোলা ঘণ্টা বেছে নিন।',
                            'error'
                        );
                    }
                    return;
                }
                const parsed = parseHourlyQuizId(options.slot.quizId);
                target = {
                    ...options.slot,
                    quizId: options.slot.quizId,
                    hourId: options.slot.hourId
                        || (parsed ? hourIdFromParts(parsed.year, parsed.month, parsed.day, parsed.hour) : target.hourId),
                };
            }
            if (!allowAdminPreviewReplay && playedHourlyIdSet().has(target.quizId)) return;
            const quiz = await fetchHourlyQuiz(true, target.hourId);
            if (!quiz) return;
            await startQuiz({ ...quiz, id: target.quizId }, { allowAdminPreviewReplay });
        } finally {
            setHourlyQuizRefreshBusy(false);
        }
    };

    // Refresh hourly quiz when the clock hour changes while this screen stays mounted.
    React.useEffect(() => {
        if (isFullLeaderboard) return undefined;
        const tick = () => {
            if (activeQuizRef.current || hourlyQuizRefreshBusyRef.current) return;
            const expected = getHourlyQuizId();
            const cur = hourlyQuizRef.current;
            if (cur && cur.id !== expected) {
                fetchHourlyQuiz(true).catch(() => {});
            }
        };
        const id = window.setInterval(tick, 12000);
        return () => window.clearInterval(id);
    }, [isFullLeaderboard, serverTimeOffset, language]);

    const fetchLastAttempt = async (quizId) => {
        if (!user) return;

        // Check local storage (Review Cache) for immediate penalty feedback
        try {
            const localData = storageUtils.getItem(`review_${quizId}`);
            if (localData) {
                const parsed = JSON.parse(localData);
                if (parsed.penalty !== undefined) {
                    setLastAttemptPenalty(parsed.penalty);
                }
            }
        } catch (e) {
            console.error('Error reading local penalty:', e);
        }

        const cacheKey = `last_attempt_${user.id}_${quizId}`;
        const cached = cacheHelper.get(cacheKey);

        if (cached && cached.time) {
            setLastAttemptTime(cached.time);
            setLastAttemptPenalty(cached.penalty || 0);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('quiz_attempts')
                .select('created_at, penalty')
                .eq('user_id', user.id)
                .eq('quiz_id', quizId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                setLastAttemptTime(data[0].created_at);
                setLastAttemptPenalty(data[0].penalty || 0);
                cacheHelper.set(cacheKey, { time: data[0].created_at, penalty: data[0].penalty || 0 }, 5); // Cache for 5 mins
            }
        } catch (error) {
            console.error('Error fetching last attempt:', error);
        }
    };

    useEffect(() => {
        if (user && hourlyQuiz) {
            fetchLastAttempt(hourlyQuiz.id);
        }
    }, [user, hourlyQuiz]);

    const fetchUserRank = async (forceRefresh = false) => {
        if (!user || isGuestUser(userProfile)) {
            setUserRank(null);
            return;
        }

        try {
            const cacheKey = `user_rank_all_time_rdg_${user.id}`;

            const rankData = await requestManager.fetch(
                cacheKey,
                async () => {
                    const query = supabase
                        .from('leaderboard_view')
                        .select('score, reading_points')
                        .eq('user_id', user.id);

                    const { data: myData, error: myError } = await query.maybeSingle();

                    if (myError || !myData) return null;

                    const myScoreValue = myData.score ?? 0;

                    const countQuery = supabase
                        .from('leaderboard_view')
                        .select('*', { count: 'exact', head: true })
                        .gt('score', myScoreValue);

                    const { count, error: countError } = await countQuery;

                    if (countError) throw countError;

                    return {
                        rank: count + 1,
                        score: myScoreValue,
                        reading_points: myData.reading_points || 0,
                    };
                },
                { ttl: 5, swr: true, forceRefresh }
            );

            if (rankData) {
                setUserRank(rankData);
            } else {
                setUserRank(null);
            }
        } catch (error) {
            console.error('Error fetching rank:', error);
        }
    };

    const fetchLeaderboard = async (forceRefresh = false) => {
        if (user) fetchUserRank(forceRefresh);
    };

    const fetchAnnualLeaderboard = async (forceRefresh = false) => {
        setLoadingAnnual(true);
        try {
            const data = await fetchAnnualGrandTrophy(forceRefresh);
            if (data && Array.isArray(data)) {
                setAnnualLeaderboard(data);
            }
        } catch (error) {
            console.error('Error fetching annual leaderboard:', error);
        } finally {
            setLoadingAnnual(false);
        }
    };

    const fetchFullLeaderboard = async (forceRefresh = false) => {
        setLoadingFull(true);
        try {
            const data = await leaderboardService.fetchAllTime(forceRefresh);
            if (data) setFullLeaderboard(data);
        } catch (error) {
            console.error('Error fetching full leaderboard:', error);
        } finally {
            setLoadingFull(false);
        }
    };

    const fetchMonthlyLeaderboard = async (forceRefresh = false) => {
        // Paint from disk cache immediately when remounting with empty React state
        if (!forceRefresh) {
            const cachedMonthly = peekCachedMonthlyLeaderboard();
            const cachedBoards = peekCachedEncouragementBoards(language);
            if (cachedMonthly.length > 0) setMonthlyLeaderboard(cachedMonthly);
            if (cachedBoards) setEncouragementBoards(cachedBoards);
        }

        // Always track load for empty sub-tabs; UI only blocks when the visible list is empty
        setLoadingMonthly(true);
        try {
            const [monthlyResult, boardsResult] = await Promise.allSettled([
                leaderboardService.fetchMonthly(forceRefresh),
                leaderboardService.fetchEncouragementBoards(forceRefresh, language),
            ]);

            if (monthlyResult.status === 'fulfilled' && monthlyResult.value) {
                setMonthlyLeaderboard(monthlyResult.value);
            } else if (monthlyResult.status === 'rejected') {
                console.error('Error fetching monthly standings:', monthlyResult.reason);
            }

            if (boardsResult.status === 'fulfilled' && boardsResult.value) {
                setEncouragementBoards(boardsResult.value);
            } else if (boardsResult.status === 'rejected') {
                console.error('Error fetching encouragement boards:', boardsResult.reason);
            }
        } catch (error) {
            console.error('Error fetching monthly leaderboard:', error);
        } finally {
            setLoadingMonthly(false);
        }
    };

    const fetchHallOfFameGallery = async (forceRefresh = false) => {
        const pastCount = hallOfFamePastMonths().length;
        const hasCurrentBoards = hallOfFameData.length >= pastCount
            && hallOfFameData[0]?.boardsVersion === HOF_GALLERY_BOARDS_VERSION;
        if (!forceRefresh && hasCurrentBoards) return;
        
        if (hallOfFameData.length === 0) {
            setLoadingGallery(true);
        }
        try {
            const archive = await leaderboardService.fetchHallOfFame(forceRefresh);
            if (archive && Array.isArray(archive) && archive.length > 0) {
                setHallOfFameData(archive);
            }
        } catch (error) {
            console.error('Error fetching gallery:', error);
        } finally {
            setLoadingGallery(false);
        }
    };

    React.useEffect(() => {
        if (isPrizesSurface) {
            setShowHallOfFame(true);
            fetchHallOfFameGallery();
            return;
        }
        if (isRankSurface) {
            setShowHallOfFame(false);
        }
    }, [surface, isPrizesSurface, isRankSurface]);

    const switchToMonthlyLeaderboard = () => {
        setLeaderboardTab('monthly');
    };

    const switchToAnnualLeaderboard = () => {
        setLeaderboardTab('annual');
        if (annualLeaderboard.length === 0) {
            fetchAnnualLeaderboard();
        }
    };

    const switchToAllTimeLeaderboard = () => {
        setLeaderboardTab('all-time');
        if (fullLeaderboard.length === 0) {
            fetchFullLeaderboard();
        }
    };

    const openUserPrizeHistory = (userId) => {
        setHallOfFameUserPrizeFilter(userId);
        setHallOfFamePrizeView('by_user');
        storageUtils.setItem(HOF_PRIZE_VIEW_STORAGE_KEY, 'by_user');
    };

    const openUserProgress = (userId, preview = null, rank = null) => {
        const isSelf = Boolean(user?.id && userId === user.id);
        if (isSelf && typeof onOpenUserProgress === 'function') {
            onOpenUserProgress(userId);
            return;
        }
        // Anyone else: open LeaderboardUserSheet (PublicPrideCard for linemen, full admin sheet for admin)
        setLeaderboardUserSheet({ userId, preview, rank });
    };

    const startQuiz = async (quiz, options = {}) => {
        if (!user) {
            setCurrentView('login');
            return;
        }

        // Check if there's a pending submission for this quiz
        if ((pendingSubmission && pendingSubmission.quiz_id === quiz.id) || isSyncing) {
            alert(t.previousPending + '. ' + (isOnline ? t.retryNow : t.waitingNetwork));
            return;
        }

        if (
            !options.allowAdminPreviewReplay
            && (playedHourlyIdSet().has(quiz.id) || (todayAttempts || []).some((row) => row.quiz_id === quiz.id))
        ) {
            return;
        }

        const questionTotal = HOURLY_QUESTIONS_PER_SET;
        const lifetimePoints = getLifetimePoints(userProfile, userRank);

        let recentAccuracy = null;
        let accuracySamples = 0;
        try {
            const { data: recentAttempts } = await supabase
                .from('quiz_attempts')
                .select('score, penalty')
                .eq('user_id', user.id)
                .like('quiz_id', 'hourly-challenge-%')
                .order('created_at', { ascending: false })
                .limit(20);
            const est = estimateAccuracyFromAttempts(recentAttempts || []);
            recentAccuracy = est.accuracy;
            accuracySamples = est.sampleSize;
        } catch (err) {
            console.warn('Hourly accuracy preview failed:', err);
        }

        const greenSeconds = resolveGreenSeconds({
            accuracy: recentAccuracy,
            sampleSize: accuracySamples,
            lifetimePoints,
        });
        const packCount = Math.max(1, Math.ceil(questionTotal / HOURLY_QUESTIONS_PER_PACK));
        const initialStarts = Array.from({ length: packCount }, () => null);
        initialStarts[0] = Date.now();
        setPackGreenSeconds(greenSeconds);
        setPackStartTimes(initialStarts);
        setPackOnTimeFlags([]);
        packTimingRef.current = {
            greenSeconds,
            starts: initialStarts,
            onTime: [],
        };

        const sessionQuiz = {
            ...quiz,
            points_reward: HOURLY_POINTS_PER_SET,
        };
        setActiveQuiz(sessionQuiz);
        setSearchCount(0);

        // Seeded Randomization for Anti-Cheat: User-specific and Hour-specific
        const seed = stringToSeed(user.id + quiz.id);
        const rng = seedRandom(seed);

        // Deterministic selection and shuffling
        if (quiz.questions && quiz.questions.length > 0) {
            // First sort by ID/Text to ensure consistent initial order before shuffling
            const baseQuestions = [...quiz.questions].sort((a, b) => {
                const idA = String(a.id || a.question_text);
                const idB = String(b.id || b.question_text);
                return idA.localeCompare(idB);
            });

            const tier = getHourlyTier(lifetimePoints);
            const eligibleForBand = filterQuestionsForTier(baseQuestions, tier, questionTotal);
            const selectionPool = eligibleForBand.length >= questionTotal ? eligibleForBand : baseQuestions;

            const shuffledQuestions = shuffleArray(selectionPool, rng);
            const usedIds = usedHourlyQuestionIdsRef.current;
            const unusedFirst = [...shuffledQuestions].sort((a, b) => {
                const aUsed = usedIds.has(String(a?.id || ''));
                const bUsed = usedIds.has(String(b?.id || ''));
                if (aUsed === bUsed) return 0;
                return aUsed ? 1 : -1;
            });
            const picked = pickQuestionsByDifficultyMix(unusedFirst, lifetimePoints, questionTotal);

            const hasVisualInPool = unusedFirst.some((q) => isVisualQuestion(q));
            const hasVisualInPicked = picked.some((q) => isVisualQuestion(q));
            if (hasVisualInPool && !hasVisualInPicked) {
                const fallbackVisual = unusedFirst.slice(questionTotal).find((q) => isVisualQuestion(q));
                if (fallbackVisual) {
                    picked[picked.length - 1] = fallbackVisual;
                }
            }

            const maxVisual = 2;
            const getVisualCount = (arr) => arr.filter((q) => isVisualQuestion(q)).length;
            let visualCount = getVisualCount(picked);
            if (visualCount > maxVisual) {
                const remainingPool = unusedFirst.slice(questionTotal);
                const pickedIds = () => new Set(picked.map((q) => String(q?.id || '')));
                for (let i = 0; i < picked.length && visualCount > maxVisual; i++) {
                    if (!isVisualQuestion(picked[i])) continue;
                    const used = pickedIds();
                    const replacement = remainingPool.find(
                        (q) => !isVisualQuestion(q) && q?.id && !used.has(String(q.id))
                    );
                    if (replacement) {
                        picked[i] = replacement;
                        visualCount = getVisualCount(picked);
                    }
                }
            }

            const selectedQuestions = picked.map(q => {
                if (!q.options || q.options.length === 0) return q;

                const correctAnswerText = q.options[q.correct_option_index];
                const shuffledOptions = shuffleArray(q.options, rng);
                const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);

                return {
                    ...q,
                    options: shuffledOptions,
                    correct_option_index: newCorrectIndex !== -1 ? newCorrectIndex : q.correct_option_index
                };
            });
            setQuizQuestions(selectedQuestions);
            selectedQuestions.forEach((q) => {
                if (q?.id) usedHourlyQuestionIdsRef.current.add(String(q.id));
            });
            storeSelectedQuestionImages(selectedQuestions);
        } else {
            setQuizQuestions([]);
        }

        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setQuizSubmitted(false);
        setScore(0);
        setSubmitRejected(null);
        setReviewMode(false);
        setShowHint(false);
        setHintViewedQuestions(new Set());
    };

    // Per-set green timer: finalize previous pack when moving forward; start after pictures are visible.
    useEffect(() => {
        if (!activeQuiz || quizSubmitted || reviewMode) return undefined;
        const packIdx = packIndexForQuestion(currentQuestionIndex);
        const prevPack = packTimingRef.current._uiPack;
        if (prevPack !== undefined && packIdx > prevPack) {
            for (let p = prevPack; p < packIdx; p += 1) finalizePackTimer(p);
        }
        packTimingRef.current._uiPack = packIdx;

        const waitKey = `${activeQuiz.id || ''}:${currentQuestionIndex}`;
        if (packTimingRef.current._waitKey !== waitKey) {
            packTimingRef.current._waitKey = waitKey;
            packTimingRef.current._waitStartedAt = Date.now();
        }
        if (!hourlyImagesReady) return undefined;

        const waitMs = packTimingRef.current._waitStartedAt
            ? Date.now() - packTimingRef.current._waitStartedAt
            : 0;
        packTimingRef.current._waitStartedAt = 0;
        const alreadyStarted = Boolean(packTimingRef.current.starts?.[packIdx]);
        ensurePackTimerStarted(packIdx, null, alreadyStarted ? waitMs : 0);
        return undefined;
    }, [activeQuiz, quizSubmitted, reviewMode, currentQuestionIndex, hourlyImagesReady]);

    useEffect(() => {
        if (isFullLeaderboard) return;
        const bank = hourlyQuiz?.questions;
        if (!bank?.length) return;
        prefetchHourlyBank(bank);
    }, [isFullLeaderboard, hourlyQuiz]);

    useEffect(() => {
        if (!activeQuiz || quizSubmitted || reviewMode) return;
        prefetchHourlyBank(quizQuestions);
    }, [activeQuiz, quizSubmitted, reviewMode, quizQuestions]);

    useEffect(() => {
        if (!activeQuiz || quizSubmitted || reviewMode || !hourlyImagesReady) return undefined;
        const next = quizQuestions.slice(currentQuestionIndex + 1, currentQuestionIndex + 3);
        next.forEach((question) => preloadHourlyImages(collectHourlyImageUrls(question)));
        return undefined;
    }, [activeQuiz, quizSubmitted, reviewMode, hourlyImagesReady, currentQuestionIndex, quizQuestions]);

    useEffect(() => {
        if (!activeQuiz || quizSubmitted || reviewMode) return undefined;
        setPackTimerTick((n) => n + 1);
        const id = window.setInterval(() => setPackTimerTick((n) => n + 1), 1000);
        return () => window.clearInterval(id);
    }, [activeQuiz, quizSubmitted, reviewMode, packStartTimes, packGreenSeconds]);

    const handleAbortQuiz = () => {
        if (activeQuiz && !quizSubmitted && !reviewMode) {
            setShowAbortWarningModal(true);
            return;
        }
        setActiveQuiz(null);
    };

    const confirmAbortQuiz = () => {
        if (isGuestUser(userProfile)) {
            setActiveQuiz(null);
            storageUtils.removeItem('slm_hourly_active_quiz_state');
            setShowAbortWarningModal(false);
            return;
        }
        // Submit with 0 score — locks this hour only.
        submitHourlyQuiz(0, 0, activeQuiz?.id || null);
        setActiveQuiz(null);
        storageUtils.removeItem('slm_hourly_active_quiz_state');
        setShowAbortWarningModal(false);
    };

    const cancelAbortQuiz = () => {
        setShowAbortWarningModal(false);
    };

    const loadReviewPayload = (quizId) => {
        if (!quizId) return null;
        let saved = storageUtils.getItem(`review_${quizId}`);
        if (!saved) {
            const parts = String(quizId).split('hourly-challenge-');
            if (parts.length > 1) {
                const legacyTs = parts[1].replace(/-/g, '');
                saved = storageUtils.getItem(`review_hourly-challenge-${legacyTs}`);
            }
        }
        if (!saved) return null;
        try {
            const data = JSON.parse(saved);
            if (!data?.questions?.length) return null;
            return data;
        } catch {
            return null;
        }
    };

    const startReview = (quizId) => {
        const id = quizId || hourlyQuiz?.id;
        if (!id) return;

        const data = loadReviewPayload(id);
        if (!data) {
            window.alert(t.reviewUnavailable);
            return;
        }

        setActiveQuiz({
            id,
            title: language === 'en' ? 'Hourly quiz' : 'ঘণ্টার কুইজ',
            description: language === 'en' ? 'Review mode' : 'রিভিউ মোড',
            duration_minutes: 5,
            points_reward: 50,
        });
        setQuizQuestions(data.questions);
        setUserAnswers(data.answers || {});
        setScore(data.score || 0);
        setReviewMode(true);
        setQuizSubmitted(false);
        setShowHint(false);
        setCurrentQuestionIndex(0);
    };

    const calculatePenalty = (answers) => {
        const perWrong = getPenaltyPerWrongForLifetime(getLifetimePoints(userProfile, userRank));
        if (!perWrong || quizQuestions.length === 0) return 0;

        const wrongCount = quizQuestions.filter((q) =>
            answers[String(q.id)] !== undefined &&
            Number(answers[String(q.id)]) !== Number(q.correct_option_index)
        ).length;

        return capHourlyAttemptPenalty(wrongCount * perWrong);
    };

    const handleAnswerSelect = (questionId, optionIndex) => {
        if (!hourlyImagesReady) return;
        if (hintViewedQuestions.has(questionId)) return; // Prevent change if hint was viewed
        setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };



    const submitQuiz = async () => {
        if (quizQuestions.some((q) => userAnswers[String(q.id)] === undefined)) {
            console.warn('Hourly submit blocked: not all questions have an answer.');
            return;
        }

        const isGuest = isGuestUser(userProfile);

        // Finalize every pack timer before scoring (current pack included).
        const packCount = Math.max(1, Math.ceil(quizQuestions.length / HOURLY_QUESTIONS_PER_PACK));
        let flags = [...(packTimingRef.current.onTime || [])];
        for (let p = 0; p < packCount; p += 1) {
            if (flags[p] === undefined) {
                flags = finalizePackTimer(p) || flags;
            }
        }
        // Re-read after finalize
        flags = [...(packTimingRef.current.onTime || [])];
        for (let p = 0; p < packCount; p += 1) {
            if (flags[p] === undefined) flags[p] = true;
        }

        const timed = scoreQuestionsWithPackTimers(quizQuestions, userAnswers, flags);
        const calculatedScore = timed.timedScore;
        const correctCount = timed.correct;

        const perWrong = getPenaltyPerWrongForLifetime(getLifetimePoints(userProfile, userRank));
        const rawPenalty = perWrong
            ? quizQuestions.reduce((acc, q) => {
                const answer = userAnswers[String(q.id)];
                if (answer === undefined || Number(answer) !== Number(q.correct_option_index)) {
                    return acc + perWrong;
                }
                return acc;
            }, 0)
            : 0;
        const penalty = capHourlyAttemptPenalty(rawPenalty);
        
        // Final score for UI display
        const netScore = Math.max(0, calculatedScore - penalty);
        setScore(netScore);
        setSubmitRejected(null);

        setQuizResults({
            correct: correctCount,
            wrong: timed.wrong,
            skipped: quizQuestions.filter(q => userAnswers[q.id] === undefined).length,
            penalty: penalty,
            score: netScore,
            pointsEarned: calculatedScore,
            fullRaw: timed.fullRaw,
            latePacks: timed.latePacks,
            quizId: activeQuiz?.id || null,
            savedHourLabel: hourlyClockLabel(activeQuiz?.id),
            clockMoved: (() => {
                const saved = parseHourlyQuizId(activeQuiz?.id);
                const live = getLiveHourlySlot(getSyncedTime().getTime());
                if (!saved) return false;
                return saved.year !== live.year || saved.month !== live.month || saved.day !== live.day || saved.hour !== live.hour;
            })(),
            liveHourLabel: hourlyClockLabel(getLiveHourlySlot(getSyncedTime().getTime()).quizId),
            openCount: listPlayableHourlySlots(
                new Set([...playedHourlyIdSet(), String(activeQuiz?.id || '')]),
                getSyncedTime().getTime()
            ).length,
        });
        setQuizSubmitted(true);

        if (isGuest) {
            return;
        }

        // Save for Review (Local Storage) - Store the final net score for display
        const attemptData = {
            timestamp: new Date().toISOString(),
            questions: quizQuestions,
            answers: userAnswers,
            score: netScore, // User sees net score in review
            penalty: penalty,
            latePacks: timed.latePacks,
        };
        storageUtils.setItem(`review_${activeQuiz.id}`, JSON.stringify(attemptData));

        if (activeQuiz && activeQuiz.id === hourlyQuiz?.id) {
            setLastAttemptTime(attemptData.timestamp);
            const cacheKey = `last_attempt_${user.id}_${activeQuiz.id}`;
            cacheHelper.set(cacheKey, attemptData.timestamp, 5);
        }

        if (user) {
            // Send time-adjusted score and penalty separately to RPC (which handles the math)
            await submitHourlyQuiz(calculatedScore, penalty, activeQuiz.id);
        }
    };

    const hourlyCurrentQuestion =
        activeQuiz && Array.isArray(quizQuestions) && quizQuestions.length > 0
            ? quizQuestions[currentQuestionIndex]
            : null;
    const hourlyImageOptionsMode = Boolean(
        hourlyCurrentQuestion
        && Array.isArray(hourlyCurrentQuestion.options)
        && hourlyCurrentQuestion.options.some((opt) => isImageOption(opt))
    );
    const activeHourLabel = hourlyClockLabel(activeQuiz?.id);
    const hourlyCurrentAnswered =
        reviewMode ||
        !!(hourlyCurrentQuestion && userAnswers[String(hourlyCurrentQuestion.id)] !== undefined);

    const currentPackIdx = packIndexForQuestion(currentQuestionIndex);
    const packTimerUi = (() => {
        void packTimerTick;
        if (!activeQuiz || quizSubmitted || reviewMode) return null;
        const start = packStartTimes[currentPackIdx] || packTimingRef.current.starts?.[currentPackIdx];
        const green = packGreenSeconds || packTimingRef.current.greenSeconds || 120;
        if (!start) {
            return getPackTimerCopy(language, { remainingSec: green, onTime: true, greenSeconds: green });
        }
        const finalized = packOnTimeFlags[currentPackIdx];
        const elapsed = (Date.now() - start) / 1000;
        const onTime = finalized === false ? false : elapsed <= green;
        const remainingSec = Math.max(0, Math.ceil(green - elapsed));
        return getPackTimerCopy(language, { remainingSec, onTime, greenSeconds: green });
    })();

    if (showFullBoards) {
        return (
            <main className="min-h-screen bg-[#fffdf7] text-slate-900">

                {/* Sticky controls — tabs first, no page title */}
                <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#fffdf7]/90 backdrop-blur-md">
                    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
                        {!showHallOfFame && (
                            <>
                                <div className="flex w-full min-w-0 gap-1.5 rounded-2xl bg-slate-100 p-1 shadow-inner mb-2">
                                    <button
                                        type="button"
                                        onClick={switchToMonthlyLeaderboard}
                                        className={`flex-1 min-w-0 truncate rounded-xl py-2 px-3 text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                                            leaderboardTab === 'monthly'
                                                ? 'bg-white text-orange-600 shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900'
                                        } ${language === 'bn' ? 'font-bengali' : ''}`}
                                    >
                                        <span>📅</span>
                                        <span>{language === 'en' ? 'Monthly' : 'চলতি মাস'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={switchToAnnualLeaderboard}
                                        className={`flex-1 min-w-0 truncate rounded-xl py-2 px-3 text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                                            leaderboardTab === 'annual'
                                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm'
                                                : 'text-amber-800 hover:text-amber-950'
                                        } ${language === 'bn' ? 'font-bengali' : ''}`}
                                    >
                                        <span>🏆</span>
                                        <span>{language === 'en' ? 'Lineman Day' : 'লাইনম্যান দিবস'}</span>
                                    </button>
                                </div>

                                {leaderboardTab === 'monthly' && (
                                    <div
                                        className="flex w-full min-w-0 gap-1 rounded-full bg-slate-100/90 p-1 shadow-sm"
                                        role="tablist"
                                        aria-label={language === 'en' ? 'Monthly boards' : 'মাসিক বোর্ড'}
                                    >
                                        {MONTHLY_SUB_TAB_ORDER.map((tabId) => (
                                            <button
                                                key={tabId}
                                                type="button"
                                                role="tab"
                                                aria-selected={monthlyBoardTab === tabId}
                                                onClick={() => setMonthlyBoardTab(tabId)}
                                                title={encouragementCopy.monthlyTabs[tabId]}
                                                className={`flex-1 min-w-0 truncate rounded-full px-2 py-2 text-[12px] font-black leading-tight transition-all active:scale-[0.98] sm:px-3 sm:py-2.5 sm:text-sm ${
                                                    monthlyBoardTab === tabId
                                                        ? 'bg-white text-orange-600 shadow-sm'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                } ${language === 'bn' ? 'font-bengali' : ''}`}
                                            >
                                                <span className="sm:hidden">
                                                    {encouragementCopy.monthlyTabsShort?.[tabId] || encouragementCopy.monthlyTabs[tabId]}
                                                </span>
                                                <span className="hidden sm:inline">
                                                    {encouragementCopy.monthlyTabs[tabId]}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {showHallOfFame && (
                            <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-black text-slate-900 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {language === 'en' ? 'Prizes' : 'পুরস্কার'}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <a
                                        href="https://www.facebook.com/smartlineman"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Facebook"
                                        title={language === 'bn' ? 'Facebook-এ যোগ দিন' : 'Join us on Facebook'}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1877F2] ring-1 ring-slate-200/80 transition-transform hover:bg-blue-50 active:scale-95"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
                                        </svg>
                                    </a>
                                    <a
                                        href="https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="WhatsApp"
                                        title={language === 'bn' ? 'WhatsApp গ্রুপে যোগ দিন' : 'Join our WhatsApp group'}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#25D366] ring-1 ring-slate-200/80 transition-transform hover:bg-green-50 active:scale-95"
                                    >
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            {showHallOfFame ? (
                    <div className="mx-auto max-w-6xl px-3 pb-3 pt-1.5 sm:px-6 sm:pb-4 sm:pt-2 lg:px-8">
                        {loadingGallery ? (
                            <div
                                className="flex min-h-[min(40vh,320px)] flex-col items-center justify-center py-12"
                                role="status"
                                aria-live="polite"
                                aria-busy="true"
                            >
                                <BrutalLoaderContent compact message={t.galleryLoading} />
                            </div>
                        ) : (
                            <div className="mx-auto max-w-5xl space-y-2">
                                <div className="mx-auto max-w-lg space-y-1.5 px-0.5">
                                    <div
                                        className="grid grid-cols-2 gap-0.5 rounded-full bg-slate-100/90 p-0.5"
                                        role="group"
                                        aria-label={language === 'en' ? 'Hall of Fame view' : 'হল অফ ফেম দেখার ধরন'}
                                    >
                                        <button
                                            type="button"
                                            aria-pressed={hallOfFamePrizeView !== 'by_user'}
                                            onClick={() => {
                                                setHallOfFamePrizeView('detailed');
                                                storageUtils.setItem(HOF_PRIZE_VIEW_STORAGE_KEY, 'detailed');
                                                setHallOfFameUserPrizeFilter(null);
                                                setHallOfFameBoardTab(MONTHLY_SUB_TAB.CHAMPION);
                                            }}
                                            className={`min-h-[32px] rounded-full px-3 py-1 text-xs font-bold transition-colors active:scale-[0.98] sm:text-sm ${language === 'bn' ? 'font-bengali' : ''} ${
                                                hallOfFamePrizeView !== 'by_user'
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            {hallOfFamePrizeViewCopy.byMonth}
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={hallOfFamePrizeView === 'by_user'}
                                            onClick={() => {
                                                setHallOfFamePrizeView('by_user');
                                                storageUtils.setItem(HOF_PRIZE_VIEW_STORAGE_KEY, 'by_user');
                                            }}
                                            className={`min-h-[32px] rounded-full px-3 py-1 text-xs font-bold transition-colors active:scale-[0.98] sm:text-sm ${language === 'bn' ? 'font-bengali' : ''} ${
                                                hallOfFamePrizeView === 'by_user'
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            {hallOfFamePrizeViewCopy.byUser}
                                        </button>
                                    </div>

                                    {hallOfFamePrizeView !== 'by_user' && hofBrowseMonth ? (
                                        <>
                                            <div className="flex items-center gap-1">
                                                {hofYears.length > 0 ? (
                                                    <div className="max-w-[30%] shrink-0 overflow-x-auto no-scrollbar sm:max-w-[7.5rem]">
                                                        <div className="flex min-w-max gap-1">
                                                            {hofYears.map((year) => (
                                                                <button
                                                                    key={year}
                                                                    type="button"
                                                                    aria-pressed={hofBrowseMonth.year === year}
                                                                    onClick={() => {
                                                                        const months = listHofMonthsForYear(hallOfFameData, year, language);
                                                                        const nextMonth = months[0]?.month || 1;
                                                                        selectHofBrowseMonth(year, nextMonth);
                                                                    }}
                                                                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums transition-colors ${
                                                                        hofBrowseMonth.year === year
                                                                            ? 'bg-orange-500 text-white'
                                                                            : 'bg-white text-slate-600 ring-1 ring-slate-200/80'
                                                                    }`}
                                                                >
                                                                    {year}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    disabled={!canHofPrev}
                                                    aria-label={hallOfFamePrizeViewCopy.prevMonth}
                                                    onClick={() => {
                                                        const prev = stepHofBrowseMonth(
                                                            hallOfFameData,
                                                            hofBrowseMonth.year,
                                                            hofBrowseMonth.month,
                                                            1
                                                        );
                                                        if (prev) selectHofBrowseMonth(prev.year, prev.month);
                                                    }}
                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200/80 disabled:opacity-30"
                                                >
                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
                                                    <div className="flex min-w-max gap-1">
                                                        {hofMonthsForYear.map(({ month, shortLabel }) => (
                                                            <button
                                                                key={month}
                                                                type="button"
                                                                aria-pressed={hofBrowseMonth.month === month}
                                                                onClick={() => selectHofBrowseMonth(hofBrowseMonth.year, month)}
                                                                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${language === 'bn' ? 'font-bengali' : ''}` +
                                                                    (hofBrowseMonth.month === month
                                                                        ? ' bg-slate-900 text-white'
                                                                        : ' bg-white text-slate-600 ring-1 ring-slate-200/80')}
                                                            >
                                                                {shortLabel}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={!canHofNext}
                                                    aria-label={hallOfFamePrizeViewCopy.nextMonth}
                                                    onClick={() => {
                                                        const next = stepHofBrowseMonth(
                                                            hallOfFameData,
                                                            hofBrowseMonth.year,
                                                            hofBrowseMonth.month,
                                                            -1
                                                        );
                                                        if (next) selectHofBrowseMonth(next.year, next.month);
                                                    }}
                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200/80 disabled:opacity-30"
                                                >
                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <div className="flex gap-0.5 overflow-x-auto no-scrollbar border-b border-slate-200/80">
                                                {MONTHLY_SUB_TAB_ORDER.map((tabId) => (
                                                    <button
                                                        key={tabId}
                                                        type="button"
                                                        onClick={() => setHallOfFameBoardTab(tabId)}
                                                        className={`whitespace-nowrap px-2 py-1.5 text-[11px] font-bold transition-colors sm:text-xs ${language === 'bn' ? 'font-bengali' : ''} ${
                                                            hallOfFameBoardTab === tabId
                                                                ? 'border-b-2 border-orange-500 text-orange-700'
                                                                : 'border-b-2 border-transparent text-slate-500'
                                                        }`}
                                                    >
                                                        {encouragementCopy.monthlyTabs[tabId]}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : null}
                                </div>

                            {hallOfFamePrizeView === 'by_user' ? (
                                <HallOfFameUserPrizesView
                                    hallOfFameData={hallOfFameData}
                                    language={language}
                                    monthlyTabs={encouragementCopy.monthlyTabs}
                                    filterUserId={hallOfFameUserPrizeFilter}
                                    onClearFilter={() => setHallOfFameUserPrizeFilter(null)}
                                    onOpenUserProgress={openUserProgress}
                                    onMaximizeImage={openMaximizedImage}
                                />
                            ) : (
                            <div className="mx-auto max-w-lg">
                                {selectedHofEntry ? (() => {
                                    const monthWinners = getHallOfFameWinners(selectedHofEntry, hallOfFameBoardTab);
                                    return (
                                        <div className={
                                            monthWinners.length === 0
                                                ? ''
                                                : 'grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5'
                                        }>
                                            {monthWinners.length === 0 ? (
                                                <p className={`rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {language === 'en' ? 'No winners for this category that month.' : 'সেই মাসে এই তালিকায় কেউ উঠেননি।'}
                                                </p>
                                            ) : monthWinners.map((winner, winIdx) => (
                                                <HallOfFameWinnerCard
                                                    key={`${selectedHofEntry.year}-${selectedHofEntry.month}-${winner.user_id}-${winner.prize_rank || 'none'}-${winner.prize_status || 'row'}`}
                                                    winner={winner}
                                                    winIdx={winIdx}
                                                    entry={selectedHofEntry}
                                                    boardTab={hallOfFameBoardTab}
                                                    language={language}
                                                    noDistrictLabel={t.noDistrict}
                                                    encouragementCopy={encouragementCopy}
                                                    viewMode="detailed"
                                                    onOpenUserProgress={openUserProgress}
                                                    onMaximizeImage={openMaximizedImage}
                                                    onViewUserPrizes={openUserPrizeHistory}
                                                />
                                            ))}
                                        </div>
                                    );
                                })() : (
                                    <p className={`rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'No prize months yet.' : 'এখনও কোনো মাসের পুরস্কার নেই।'}
                                    </p>
                                )}
                            </div>
                            )}
                            </div>
                        )}

                        <div className="h-6"></div>
                    </div>
                ) : (
                    <>
                    <div className={`max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-3 ${leaderboardTab === 'all-time' ? 'pb-48 md:pb-56' : 'pb-24 md:pb-28'}`}>
                    {leaderboardTab === 'annual' ? (
                        <AnnualGrandTrophyLeaderboard
                            annualLeaderboard={annualLeaderboard}
                            loading={loadingAnnual}
                            language={language}
                            currentUserId={user?.id}
                            onOpenUserProgress={openUserProgress}
                            onMaximizeImage={openMaximizedImage}
                            onRefresh={() => fetchAnnualLeaderboard(true)}
                        />
                    ) : (
                        <>
                            {leaderboardTab === 'monthly' && (
                                <div className="mx-auto mb-1 max-w-2xl px-2 sm:mb-2">
                                    {monthlyBoardMeta ? (
                                        <MonthlyBoardHeader
                                            meta={monthlyBoardMeta}
                                            language={language}
                                            monthlyBoardTab={monthlyBoardTab}
                                            onInfoClick={() => setShowMonthlyBoardInfoModal(true)}
                                        />
                                    ) : (
                                        <div className="h-8" aria-hidden />
                                    )}
                                </div>
                            )}

                            {/* Winners Podium / List Container */}
                            <div className="space-y-4">
                        {(() => {
                            const boardList = leaderboardTab === 'all-time' ? fullLeaderboard : activeMonthlyList;
                            const boardLoading = leaderboardTab === 'all-time' ? loadingFull : loadingMonthly;
                            const showBoardLoader = boardLoading && boardList.length === 0;

                            if (showBoardLoader) {
                                return (
                                    <div
                                        className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm"
                                        role="status"
                                        aria-live="polite"
                                        aria-busy="true"
                                    >
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <SkeletonRow key={i} />
                                        ))}
                                    </div>
                                );
                            }

                            if (boardList.length === 0) {
                                return (
                            <div className="text-center py-16">
                                <div className="inline-block rounded-2xl border border-slate-200/80 bg-white px-6 py-8 shadow-sm">
                                    <p className="text-slate-600 font-semibold italic">
                                {leaderboardTab === 'monthly' && monthlyBoardMeta?.emptyHint
                                    ? monthlyBoardMeta.emptyHint
                                    : (language === 'en' ? 'No rankings found for this category.' : 'এই বিভাগে কোনো র‍্যাঙ্কিং পাওয়া যায়নি।')}
                                    </p>
                                </div>
                            </div>
                                );
                            }

                            return (
                            <>
                                {/* Top 3 Podium Stage */}
                                {(() => {
                                    const list = monthlyPodiumList;
                                    if (!list || list.length === 0) return null;

                                    let topPlayers = [];
                                    if (list.length === 1) {
                                        topPlayers = [list[0]];
                                    } else if (list.length === 2) {
                                        topPlayers = [list[1], list[0]];
                                    } else {
                                        topPlayers = [list[1], list[0], list[2]];
                                    }

                                    const resolveRank = (idx) => (
                                        topPlayers.length === 1
                                            ? 1
                                            : (topPlayers.length === 2 ? (idx === 0 ? 2 : 1) : (idx === 0 ? 2 : idx === 1 ? 1 : 3))
                                    );

                                    const rankRing = {
                                        1: 'ring-[3px] ring-amber-400 shadow-[0_0_32px_rgba(251,191,36,0.45)]',
                                        2: 'ring-[3px] ring-slate-300 shadow-[0_0_20px_rgba(148,163,184,0.4)]',
                                        3: 'ring-[3px] ring-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.4)]',
                                    };
                                    const pedestalClass = {
                                        1: 'h-14 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 sm:h-16',
                                        2: 'h-10 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 sm:h-12',
                                        3: 'h-8 bg-gradient-to-b from-orange-300 via-orange-400 to-amber-600 sm:h-10',
                                    };

                                    return (
                                        <div className="leaderboard-podium-stage relative mb-5 overflow-visible rounded-3xl border border-orange-200/70 bg-gradient-to-b from-amber-50 via-orange-50/50 to-white px-2 pb-2 pt-11 shadow-lg shadow-orange-500/10 sm:mb-6 sm:px-5 sm:pb-3 sm:pt-12 animate-fade-in">
                                            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
                                                <div className="absolute -left-8 top-0 h-36 w-36 rounded-full bg-amber-300/35 blur-3xl" />
                                                <div className="absolute -right-10 top-6 h-32 w-32 rounded-full bg-orange-400/25 blur-3xl" />
                                            </div>

                                            <div className="relative z-10 grid grid-cols-3 items-end gap-2 sm:gap-4">
                                                {topPlayers.map((player, idx) => {
                                                    const isWinner = topPlayers.length === 1 ? true : (topPlayers.length === 2 ? idx === 1 : idx === 1);
                                                    const rank = resolveRank(idx);
                                                    const superseded = isPrizeSuperseded(player);
                                                    const displayName = formatPodiumFirstName(player.full_name);
                                                    const formattedScore = formatMonthlyPlayerScore(player, monthlyBoardTab);

                                                    return (
                                                        <div
                                                            key={player.user_id}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setSelectedMonthlyDetailPlayer({ ...player, standing_rank: rank })}
                                                            onKeyDown={(e) => { 
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    setSelectedMonthlyDetailPlayer({ ...player, standing_rank: rank });
                                                                }
                                                            }}
                                                            className={`flex flex-col items-center cursor-pointer transition-transform active:scale-[0.97] ${isWinner ? '-translate-y-1.5' : ''} ${superseded ? 'opacity-70' : ''}`}
                                                        >
                                                            <div className="relative mb-2.5 flex flex-col items-center">
                                                                {rank === 1 && (
                                                                    <span className="pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 sm:-top-10" aria-hidden="true">
                                                                        <span className="animate-crown block text-2xl leading-none sm:text-3xl">👑</span>
                                                                    </span>
                                                                )}
                                                                <div className={`relative ${isWinner ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-14 w-14 sm:h-16 sm:w-16'} shrink-0`}>
                                                                    <div
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openMaximizedImage(player.avatar_url, e);
                                                                        }}
                                                                        className={`absolute inset-0 cursor-zoom-in overflow-hidden rounded-full border-[3px] border-white bg-white transition-transform active:scale-95 sm:border-4 ${rankRing[rank] || ''}`}
                                                                    >
                                                                        {player.avatar_url ? (
                                                                            <AvatarPhoto url={player.avatar_url} edge={AVATAR_EDGE.podium} className="h-full w-full object-cover" alt="" />
                                                                        ) : (
                                                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-xl font-black text-slate-500 sm:text-2xl">
                                                                                {displayName?.[0] || '?'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <p className={`mb-1 max-w-full px-0.5 text-center text-xs font-black leading-tight ${superseded ? 'text-slate-400 line-through' : 'text-slate-900'} sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                <span className="block truncate">{displayName}</span>
                                                            </p>

                                                            {/* Consistency Pill for Champion & New Player */}
                                                            {(monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION || monthlyBoardTab === BOARD_IDS.MAIN || monthlyBoardTab === BOARD_IDS.NEW_PLAYER) && player.active_days != null && (
                                                                <span className="mb-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-100/90 px-1.5 py-0.5 text-[9px] font-black text-amber-900 sm:text-[10px]">
                                                                    <span>🔥</span>
                                                                    <span>{player.active_days}{language === 'bn' ? 'দিন' : 'd'}</span>
                                                                    <span className="text-amber-700 font-semibold">({player.consistency_pct ?? 0}%)</span>
                                                                </span>
                                                            )}

                                                            {/* Monthly Score */}
                                                            <span className="mb-2 font-mono text-xs font-black text-orange-950 sm:text-sm">
                                                                {formattedScore}
                                                            </span>

                                                            <div
                                                                className={`flex w-full items-start justify-center rounded-t-2xl pt-1.5 shadow-inner ${pedestalClass[rank]}`}
                                                                aria-hidden="true"
                                                            >
                                                                <span className="text-sm font-black text-white drop-shadow-sm sm:text-base">
                                                                    {rank}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* List View */}
                                <div className={`overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 ${leaderboardTab === 'monthly' ? 'animate-fade-in' : 'overflow-hidden'}`}>
                                    {(leaderboardTab === 'all-time' ? fullLeaderboard : activeMonthlyList).map((item, idx) => {
                                        const superseded = leaderboardTab === 'monthly' && isPrizeSuperseded(item);
                                        const prizeRecipient = leaderboardTab === 'monthly' && isPrizeRecipient(item);
                                        const rankLabel = leaderboardTab === 'monthly' && item.standing_rank != null
                                            ? item.standing_rank
                                            : idx + 1;
                                        const isTopThree = Number(rankLabel) >= 1 && Number(rankLabel) <= 3;
                                        const isMonthly = leaderboardTab === 'monthly';
                                        const isYou = !!(user?.id && item.user_id === user.id);

                                        return (
                                        <div 
                                            key={`${item.user_id}-${item.prize_status || 'row'}-${idx}`}
                                            onClick={() => setSelectedMonthlyDetailPlayer({ ...item, standing_rank: rankLabel })}
                                            className={`flex items-center gap-2 border-b border-slate-100 transition-colors last:border-b-0 last:rounded-b-2xl group cursor-pointer active:bg-orange-50/60 first:rounded-t-2xl sm:gap-3 ${
                                                isMonthly ? 'min-h-[52px] px-2.5 py-2.5 pr-3 sm:px-4 sm:py-3' : 'p-2.5 sm:gap-4 sm:p-4'
                                            } ${
                                                superseded
                                                    ? 'bg-slate-100 hover:bg-slate-200/50'
                                                    : isYou && isMonthly
                                                        ? 'border-l-[3px] border-l-orange-500 bg-orange-50/70 hover:bg-orange-50'
                                                        : isMonthly && Number(rankLabel) === 1
                                                            ? 'bg-amber-50/50 hover:bg-amber-50/80'
                                                            : prizeRecipient
                                                                ? 'bg-orange-50 hover:bg-orange-100/70'
                                                                : !isMonthly && isTopThree
                                                                    ? 'bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-transparent hover:from-amber-50'
                                                                    : 'bg-white hover:bg-orange-50/40'
                                            }`}
                                        >
                                            <div className="flex w-5 shrink-0 items-center justify-center sm:w-6">
                                                <LeaderboardRankChip
                                                    rank={rankLabel}
                                                    superseded={superseded}
                                                    size="sm"
                                                />
                                            </div>
                                            {(() => {
                                                const readingPts = firstTimeReadingPointsFromLessons(completedLessonsForBadge(item));
                                                const onlineSlot = leaderboardTab === 'monthly' && (item.last_active || item.last_login_at) && (() => {
                                                    const lastActiveDate = item.last_active || item.last_login_at;
                                                    const date = new Date(lastActiveDate);
                                                    const now = new Date();
                                                    const diffInSeconds = Math.floor((now - date) / 1000);
                                                    const isOnline = diffInSeconds < 300;
                                                    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                                    if (!isToday) return null;
                                                    return (
                                                        <span className="absolute -right-0.5 -top-0.5 z-10 flex h-2.5 w-2.5">
                                                            {isOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />}
                                                            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-green-500/60'}`} />
                                                        </span>
                                                    );
                                                })();

                                                return (
                                                    <ReadingLevelAvatarFrame
                                                        level={item.training_level || 0}
                                                        readingPoints={readingPts}
                                                        language={language}
                                                        sizeClass={isMonthly ? 'h-9 w-9' : 'h-9 w-9 sm:h-10 sm:w-10'}
                                                        avatarUrl={item.avatar_url}
                                                        fallbackLetter={item.full_name?.[0] || '?'}
                                                        faded={superseded}
                                                        onAvatarClick={(e) => {
                                                            e.stopPropagation();
                                                            openMaximizedImage(item.avatar_url, e);
                                                        }}
                                                        onlineSlot={onlineSlot || null}
                                                    />
                                                );
                                            })()}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <p className={`truncate text-sm font-black leading-tight ${
                                                            superseded
                                                                ? 'text-slate-400 line-through decoration-slate-300'
                                                                : 'text-slate-900'
                                                        }`}>{item.full_name}</p>
                                                        {isYou && isMonthly && (
                                                            <span className={`shrink-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white ${language === 'bn' ? 'font-bengali normal-case' : ''}`}>
                                                                {language === 'en' ? 'You' : 'আপনি'}
                                                            </span>
                                                        )}
                                                        {superseded && (
                                                            <span className={`inline-block shrink-0 uppercase tracking-wider font-extrabold text-[7px] leading-none text-red-600 border border-red-600 rounded px-1 py-0.5 bg-white/95 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {encouragementCopy.prizeSuperseded}
                                                            </span>
                                                        )}
                                                        {item.prize_status === PRIZE_STATUS.REPLACEMENT && (
                                                            <span className={`shrink-0 text-[7px] leading-none px-1 py-0.5 rounded font-bold bg-orange-100 text-orange-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {encouragementCopy.prizeReplacement} · #{item.prize_rank}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`mt-0.5 flex items-center gap-1.5 min-w-0 ${superseded ? 'opacity-40' : ''}`}>
                                                        {leaderboardTab === 'all-time' ? (
                                                            formatLeaderboardDistrict(item.district) && (
                                                                <span className={`text-[10px] font-bold text-slate-500 truncate max-w-[9rem] ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                    {formatLeaderboardDistrict(item.district)}
                                                                </span>
                                                            )
                                                        ) : (
                                                        (item.last_active || item.last_login_at) && (() => {
                                                            const lastActiveDate = item.last_active || item.last_login_at;
                                                            const date = new Date(lastActiveDate);
                                                            const now = new Date();
                                                            const diffInSeconds = Math.floor((now - date) / 1000);
                                                            const isOnline = diffInSeconds < 300;
                                                            const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                                            
                                                            return (
                                                                <span className={`text-[9px] font-bold uppercase tracking-tight sm:text-[10px] ${isOnline ? 'text-green-600' : isToday ? 'text-green-600/70' : 'text-slate-400'}`}>
                                                                    {isOnline 
                                                                        ? (language === 'en' ? 'Online' : 'অনলাইন') 
                                                                        : formatLastActive(lastActiveDate, language)
                                                                    }
                                                                </span>
                                                            );
                                                        })()
                                                        )}
                                                        {leaderboardTab === 'all-time' && (
                                                            <div className="flex shrink-0 items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-[9px] font-black text-orange-800 shadow-sm">
                                                                <span className="text-[9px]">📖</span>
                                                                <span className="text-[9px] font-black tabular-nums">
                                                                    {formatLeaderboardNumber(item.reading_points || 0)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {leaderboardTab === 'monthly' && item.eligibility_note && (
                                                        <p className="mt-0.5 text-[9px] font-medium text-amber-600 line-clamp-1">
                                                            {item.eligibility_note}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 pl-1">
                                                <p className={`font-black tabular-nums leading-none ${
                                                    isMonthly ? 'text-[15px] sm:text-base' : 'text-sm'
                                                } ${
                                                    superseded ? 'text-slate-400 opacity-60' : 'text-orange-700'
                                                }`}>
                                                    {leaderboardTab === 'monthly'
                                                        ? formatMonthlyPlayerScore(item, monthlyBoardTab)
                                                        : formatLeaderboardNumber(item.points || item.score || 0)}
                                                </p>
                                                {leaderboardTab === 'monthly' && (
                                                    <div className={superseded ? "opacity-35" : ""}>
                                                        {(monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION || monthlyBoardTab === BOARD_IDS.MAIN || monthlyBoardTab === BOARD_IDS.NEW_PLAYER) && item.active_days != null ? (
                                                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-900 leading-none">
                                                                <span>🔥</span>
                                                                <span>{item.active_days}{language === 'bn' ? 'দিন' : 'd'}</span>
                                                                <span className="text-amber-700 font-bold">({item.consistency_pct ?? 0}%)</span>
                                                            </span>
                                                        ) : (
                                                            <MonthlyHourlyAvgPill
                                                                hourly={item.hourly}
                                                                language={language}
                                                                encouragementBoards={encouragementBoards}
                                                                align="end"
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                    })}
                                </div>
                            </>
                            );
                        })()}
                    </div>
                        </>
                    )}
                </div>

                {/* My Position Sticky Bar — portal so it stacks above SLM Radio FAB (outside scroll root) */}
                {!showHallOfFame && user && userRank && !loadingFull && leaderboardTab === 'all-time' && (() => {
                    const userBadge = getBadgeByLevel(
                        userProfile?.training_level || 0,
                        firstTimeReadingPointsFromLessons(userProfile?.completed_lessons)
                    );
                    return createPortal(
                        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] md:bottom-8 left-0 right-0 z-[120] px-4 md:px-8 pointer-events-none">
                            <div className="max-w-3xl mx-auto">
                                <div className="pointer-events-auto overflow-hidden rounded-2xl border border-orange-300/60 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 p-[1px] shadow-xl shadow-orange-500/30">
                                    <div className="rounded-[0.9rem] bg-gradient-to-br from-white via-orange-50 to-amber-50 p-2.5 sm:p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className={`mb-1 text-[10px] font-black tracking-wider text-orange-700 ${language === 'bn' ? 'font-bengali normal-case tracking-normal' : 'uppercase'}`}>
                                                {language === 'en' ? 'Your Standing' : 'আপনার অবস্থান'}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xl font-black tabular-nums text-slate-900 sm:text-2xl">#{userRank.rank}</p>
                                                {userBadge && (
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold sm:text-[11px] ${userBadge.color} ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                        {language === 'en' ? userBadge.en : userBadge.bn}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="ml-1 text-sm font-black tabular-nums text-slate-800">{formatLeaderboardNumber(userRank.score || 0)}</p>
                                                    <div className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-black text-white shadow-sm">
                                                        <span className="text-[10px]">📖</span>
                                                        <span className="text-[9px] font-black tabular-nums">
                                                            {formatLeaderboardNumber(userRank.reading_points || 0)} <span className="ml-0.5 text-[8px] opacity-85">{language === 'en' ? 'RDG' : 'রিডিং'}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openMaximizedImage(userProfile?.avatar_url, e);
                                            }}
                                            className="flex h-11 w-11 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white font-black text-orange-600 shadow-lg shadow-orange-500/30 ring-2 ring-orange-400 transition-transform active:scale-95 sm:h-12 sm:w-12"
                                        >
                                            {userProfile?.avatar_url ? <AvatarPhoto url={userProfile.avatar_url} edge={AVATAR_EDGE.card} alt="Avatar" className="w-full h-full object-cover" /> : (userProfile?.full_name?.[0] || 'U')}
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    );
                })()}
                </>
            )}

            {/* Avatar Viewer Modal */}
            {maximizedAvatar && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-10 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMaximizedAvatar(null)} aria-hidden="true" />
                    <div className={`relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl animate-scale-in ${maximizedAvatar.kind === 'prize' ? 'max-h-[90vh]' : 'aspect-square'}`}>
                        <button
                            type="button"
                            onClick={() => setMaximizedAvatar(null)}
                            className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-900 shadow-md transition-transform active:scale-95"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        {maximizedAvatar.kind === 'prize' ? (
                            <img
                                src={typeof maximizedAvatar === 'string' ? maximizedAvatar : maximizedAvatar.url}
                                alt={maximizedAvatar.title || ''}
                                className="max-h-[72vh] w-full object-contain bg-slate-50 p-4"
                            />
                        ) : (
                            <AvatarPhoto
                                url={typeof maximizedAvatar === 'string' ? maximizedAvatar : maximizedAvatar.url}
                                placeholderSrc={typeof maximizedAvatar === 'string' ? '' : maximizedAvatar.previewSrc}
                                edge={AVATAR_EDGE.full}
                                placeholderEdge={AVATAR_EDGE.card}
                                className="h-full w-full object-cover"
                                alt={maximizedAvatar.title || ''}
                                fetchpriority="high"
                            />
                        )}
                        {(maximizedAvatar.title || maximizedAvatar.subtitle) && (
                            <div className="border-t border-slate-100 bg-white px-4 py-3 text-center">
                                {maximizedAvatar.title ? (
                                    <p className={`truncate text-base font-semibold text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {maximizedAvatar.title}
                                    </p>
                                ) : null}
                                {maximizedAvatar.subtitle ? (
                                    <p className={`mt-0.5 truncate text-sm text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {maximizedAvatar.subtitle}
                                    </p>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <MonthlyScoreDetailModal
                player={selectedMonthlyDetailPlayer}
                isOpen={Boolean(selectedMonthlyDetailPlayer)}
                onClose={() => setSelectedMonthlyDetailPlayer(null)}
                monthlyBoardTab={monthlyBoardTab}
                language={language}
                isYou={Boolean(user?.id && selectedMonthlyDetailPlayer?.user_id === user.id)}
                onOpenUserProgress={openUserProgress}
                onMaximizeImage={openMaximizedImage}
            />

            <MonthlyBoardInfoModal
                open={showMonthlyBoardInfoModal}
                language={language}
                meta={monthlyBoardMeta}
                onClose={() => setShowMonthlyBoardInfoModal(false)}
            />

            <LeaderboardUserSheet
                open={Boolean(leaderboardUserSheet)}
                userId={leaderboardUserSheet?.userId}
                preview={leaderboardUserSheet?.preview}
                rank={leaderboardUserSheet?.rank}
                language={language}
                context={{
                    tab: leaderboardTab,
                    monthlyBoardTab,
                    boardTitle: monthlyBoardMeta?.title,
                }}
                viewerUserId={user?.id || null}
                viewerIsAdmin={userProfile?.role === 'admin'}
                hallOfFameData={hallOfFameData}
                onClose={() => setLeaderboardUserSheet(null)}
            />

            <MonthWinnersReveal
                language={language}
                hallOfFameData={hallOfFameData}
                ready={!loadingGallery && !loadingMonthly && hallOfFameData.length > 0}
                active={
                    isRankSurface
                    && leaderboardTab === 'monthly'
                    && !showHallOfFame
                    && !leaderboardUserSheet
                    && !showMonthlyBoardInfoModal
                }
                blocked={Boolean(sponsorAdOpen) || Boolean(monthWinnersBlocked)}
                isAdmin={userProfile?.role === 'admin'}
                onOpenChange={onMonthWinnersRevealOpenChange}
            />
        </main>
        );
    }

    return (
        <div className={`relative mx-auto flex h-[100dvh] max-h-[100dvh] max-w-md flex-col overflow-hidden bg-[#fffdf7] text-slate-900 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:h-screen md:max-h-screen md:pb-28 ${language === 'bn' ? 'font-bengali' : ''}`}>
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-80"
                aria-hidden
                style={{
                    background:
                        'radial-gradient(ellipse 90% 60% at 10% -10%, rgba(255,154,98,0.28), transparent 55%)',
                }}
            />

            {/* Thin header */}
            <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-3 sm:px-5 sm:pt-4">
                <div className="flex min-w-0 items-center gap-2">
                    <h1 className={`truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en' ? 'Hourly Quiz' : 'ঘণ্টার কুইজ'}
                    </h1>
                    <button
                        type="button"
                        onClick={() => setShowHourlyPenaltyInfoModal(true)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-500 ring-1 ring-slate-200/70"
                        aria-label={language === 'en' ? 'Penalty info' : 'পেনাল্টি তথ্য'}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                            <circle cx="12" cy="12" r="10" />
                            <path strokeLinecap="round" d="M12 6v6l4 2" />
                        </svg>
                    </button>
                </div>
                {!loading && (
                    <p className="shrink-0 text-lg font-bold tabular-nums text-orange-600">
                        <CountUpNumber
                            value={getTodayNetScore()}
                            format={(n) => `${n > 0 ? '+' : ''}${formatLeaderboardNumber(n)}`}
                        />
                    </p>
                )}
            </header>

            {/* Main: hero + horizontal strip — fits remaining viewport */}
            <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pt-1 sm:px-5" ref={ladderRef}>
                {loading ? (
                    <div
                        className="flex min-h-0 flex-1 flex-col items-center justify-center"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                    >
                        <BrutalLoaderContent
                            compact
                            message={t.hourlyLoading}
                        />
                    </div>
                ) : (
                    <HourlyDayRing
                        slots={buildHourlySlots()}
                        language={language}
                        timeLeft={timeLeft}
                        loading={false}
                        hourlyQuizRefreshBusy={hourlyQuizRefreshBusy}
                        lastNightSlot={getLastNightOpenSlot()}
                        labels={{
                            liveNow: t.liveNow,
                            nextChallengeLabel: t.nextChallengeLabel,
                            startsIn: t.startsIn,
                            timeLeft: t.timeLeft,
                            upcomingStatus: t.upcomingStatus,
                            reviewAnswers: t.reviewAnswers,
                            reviewHour: t.reviewHour,
                            reviewLast: t.reviewLast,
                        }}
                        onPlaySlot={(slot) => { void beginHourlyQuiz({ slot }); }}
                        onReview={startReview}
                    />
                )}
                {userProfile?.role === 'admin' && !loading && (
                    <button
                        type="button"
                        disabled={hourlyQuizRefreshBusy}
                        onClick={() => { void beginHourlyQuiz({ bypassReadingGate: true }); }}
                        className={`shrink-0 py-1 text-center text-xs font-semibold text-slate-400 underline-offset-2 hover:text-orange-600 hover:underline disabled:opacity-50 ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {language === 'bn'
                            ? 'অ্যাডমিন প্রিভিউ'
                            : 'Admin preview'}
                    </button>
                )}
            </div>

            {showAbortWarningModal && createPortal(
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/55 animate-fade-in">
                    <div className="w-full max-w-md animate-scale-in" role="dialog" aria-modal="true">
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fffdf7] shadow-xl">
                                                        <div className="bg-red-500 text-white px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-xl">⚠️</div>
                                    <div>
                                        <h3 className={`text-lg font-black leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>{t.antiCheatExitTitle}</h3>
                                        <p className="text-xs font-semibold text-red-100 mt-0.5 uppercase tracking-wider">Anti-Cheat Protection</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-5 space-y-3 bg-[#fffdf7]">
                                <p className={`text-sm sm:text-base font-semibold text-slate-800 leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {t.antiCheatExitDesc}
                                </p>
                                <p className={`text-xs sm:text-sm text-red-600 font-bold ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {t.antiCheatExitPenalty}
                                </p>
                            </div>

                            <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200/80 bg-white">
                                <button
                                    type="button"
                                    onClick={cancelAbortQuiz}
                                    className="w-full py-3 rounded-full border border-slate-200/80 bg-white px-4 py-3 font-bold text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-[0.99]"
                                >
                                    {t.antiCheatStay}
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmAbortQuiz}
                                    className="w-full py-3 rounded-full bg-red-500 px-4 py-3 font-black text-white shadow-sm transition-all hover:bg-red-600 active:scale-[0.99]"
                                >
                                    {t.antiCheatExitConfirm}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Quiz Modal (Keep Portal) */}
            {activeQuiz && createPortal(
                <div className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-900/50 animate-fade-in sm:items-center sm:p-4">
                    <div
                        className={`flex w-full max-w-2xl flex-col animate-scale-in ${
                            hourlyImageOptionsMode && !quizSubmitted
                                ? 'h-[100dvh] max-h-[100dvh] sm:h-[min(90vh,720px)] sm:max-h-[90vh]'
                                : 'max-h-[100dvh] sm:max-h-[90vh]'
                        }`}
                    >
                        <div
                            className={`flex min-h-0 flex-col overflow-hidden rounded-t-2xl border border-slate-200/70 bg-[#fffdf7] shadow-lg sm:rounded-2xl ${
                                hourlyImageOptionsMode && !quizSubmitted
                                    ? 'h-full'
                                    : 'max-h-[100dvh] sm:max-h-[90vh]'
                            }`}
                        >
                                                    {!quizSubmitted ? (
                            <>
                                <div className="flex shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white/95 px-3 py-2 backdrop-blur-sm sm:gap-2.5 sm:px-4 sm:py-2.5">
                                    <div className="min-w-0 flex-1">
                                        <h3 className={`truncate text-[15px] font-bold leading-tight text-slate-900 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'bn' ? 'ঘণ্টার কুইজ' : 'Hourly quiz'}
                                        </h3>
                                        <div className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium tabular-nums text-slate-400 sm:text-[11px] ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {activeHourLabel && (
                                                <span>
                                                    {reviewMode
                                                        ? (language === 'en'
                                                            ? `Review · ${activeHourLabel}`
                                                            : `রিভিউ · ${activeHourLabel}`)
                                                        : (language === 'en'
                                                            ? `This set is ${activeHourLabel}`
                                                            : `এই সেট ${activeHourLabel}`)}
                                                </span>
                                            )}
                                            {activeHourLabel && <span className="text-slate-300">·</span>}
                                            <span>{currentQuestionIndex + 1}/{quizQuestions.length}</span>
                                            {hourlyStakesUi.quizHint && (
                                                <span className="text-slate-400">· {hourlyStakesUi.quizHint}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        {packTimerUi && (
                                            <div
                                                role="status"
                                                aria-live="polite"
                                                aria-label={packTimerUi.ariaLabel}
                                                className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
                                                    packTimerUi.tone === 'green'
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-amber-500 text-white'
                                                }`}
                                            >
                                                <svg className="h-3 w-3 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                                    <circle cx="12" cy="12" r="9" />
                                                    <path strokeLinecap="round" d="M12 7v5l3 2" />
                                                </svg>
                                                <span className="text-xs font-bold tabular-nums leading-none tracking-tight">
                                                    {packTimerUi.tone === 'green' ? packTimerUi.badge : packTimerUi.pointsMark}
                                                </span>
                                                {packTimerUi.tone === 'green' && (
                                                    <span className="text-[10px] font-bold leading-none opacity-90" aria-hidden>
                                                        {packTimerUi.pointsMark}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleAbortQuiz}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                                            aria-label={language === 'bn' ? 'বন্ধ' : 'Close'}
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div
                                    className={`mb-0 min-h-0 flex-1 p-3 text-slate-900 sm:p-4 ${
                                        hourlyImageOptionsMode
                                            ? 'flex flex-col overflow-hidden'
                                            : 'overflow-y-auto'
                                    }`}
                                >
                                    <div className={`h-1 w-full overflow-hidden rounded-full bg-slate-200/80 ${hourlyImageOptionsMode ? 'mb-2 shrink-0' : 'mb-3 sm:mb-3.5'}`}>
                                        <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}></div>
                                    </div>
                                    {!reviewMode && !hourlyImagesReady ? (
                                        <p className={`mb-2 text-center text-[12px] font-bold text-slate-500 ${hourlyImageOptionsMode ? 'shrink-0' : ''} ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {quizImageWaitCopy(language)}
                                        </p>
                                    ) : null}
                                    <div className={`flex items-start justify-between gap-2.5 ${hourlyImageOptionsMode ? 'mb-2 shrink-0 sm:mb-2.5 sm:gap-2' : 'mb-3 sm:mb-4 sm:gap-3'}`}>
                                        <div className="min-w-0 flex-1">
                                            {quizQuestions[currentQuestionIndex]?.question_image_url && !hourlyImageOptionsMode && (
                                                <div className="mb-3 overflow-hidden rounded-xl border border-slate-200/70 bg-white">
                                                    {(() => {
                                                        const questionImageKey = `q_${quizQuestions[currentQuestionIndex]?.id || currentQuestionIndex}`;
                                                        return (
                                                            <>
                                                    <img
                                                        key={questionImageKey}
                                                        src={buildRetryImageSrc(quizQuestions[currentQuestionIndex]?.question_image_url, questionImageKey)}
                                                        alt={language === 'en' ? 'Question visual' : 'প্রশ্নের ছবি'}
                                                        className="w-full max-h-56 object-contain sm:max-h-64"
                                                        data-fallback-index="0"
                                                        onError={(e) => {
                                                            const exhausted = handleImageLoadError(e, quizQuestions[currentQuestionIndex]?.question_image_url);
                                                            if (exhausted) {
                                                                setFailedImageKeys((prev) => ({ ...prev, [questionImageKey]: true }));
                                                            }
                                                        }}
                                                    />
                                                            {failedImageKeys[questionImageKey] && (
                                                                <div className="px-3 pb-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => retryImageLoad(questionImageKey)}
                                                                        className="mt-2 rounded-full border border-orange-200/80 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                                                                    >
                                                                        {language === 'en' ? 'Retry image' : 'ছবি আবার লোড করুন'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                            <div className="flex items-start justify-between gap-2.5">
                                                <h2 className={`min-w-0 flex-1 font-bold tracking-tight text-slate-900 ${
                                                    hourlyImageOptionsMode
                                                        ? `line-clamp-3 text-sm leading-snug sm:text-[15px] ${language === 'bn' ? 'font-bengali leading-relaxed' : ''}`
                                                        : `text-base leading-snug sm:text-lg sm:leading-snug ${language === 'bn' ? 'font-bengali leading-relaxed sm:leading-relaxed' : ''}`
                                                }`}>
                                                    {quizQuestions[currentQuestionIndex]?.question_text}
                                                </h2>
                                                <button
                                                    type="button"
                                                    onClick={() => handleHourlyGoogleSearch(quizQuestions[currentQuestionIndex]?.question_text)}
                                                    className="shrink-0 rounded-full border border-slate-200/70 bg-white p-1.5 text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 active:scale-90"
                                                    title={language === 'en' ? 'Search Google' : 'গুগল সার্চ'}
                                                >
                                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newShowHint = !showHint;
                                                setShowHint(newShowHint);
                                                if (newShowHint) {
                                                    const qId = quizQuestions[currentQuestionIndex]?.id;
                                                    setHintViewedQuestions(prev => {
                                                        const next = new Set(prev);
                                                        next.add(qId);
                                                        return next;
                                                    });
                                                }
                                            }}
                                            disabled={userAnswers[quizQuestions[currentQuestionIndex]?.id] === undefined && !reviewMode}
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${(userAnswers[quizQuestions[currentQuestionIndex]?.id] !== undefined || reviewMode)
                                                ? 'border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                : 'cursor-not-allowed border-slate-200/70 bg-slate-50 text-slate-300 opacity-50'
                                                }`}
                                            title={hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) ? (language === 'en' ? 'Answer Locked (Hint Viewed)' : 'উত্তর লক করা হয়েছে (ইঙ্গিত দেখা হয়েছে)') : (userAnswers[quizQuestions[currentQuestionIndex]?.id] === undefined && !reviewMode ? t.hintDisabled : t.hint)}
                                        >
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {showHint && (userAnswers[quizQuestions[currentQuestionIndex]?.id] !== undefined || reviewMode) && (
                                        <div className={`rounded-xl border border-amber-200/70 bg-amber-50/90 px-3 py-2.5 animate-fade-in ${hourlyImageOptionsMode ? 'mb-2 shrink-0' : 'mb-4'}`}>
                                            <div className="flex items-start gap-2">
                                                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                                    <circle cx="12" cy="12" r="9" />
                                                    <path strokeLinecap="round" d="M12 8v5m0 3h.01" />
                                                </svg>
                                                <p className={`text-[13px] font-medium leading-relaxed text-amber-900 ${language === 'bn' ? 'font-bengali' : ''} ${hourlyImageOptionsMode ? 'line-clamp-3' : ''}`}>
                                                    {quizQuestions[currentQuestionIndex]?.hint || t.noHint}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div
                                        className={
                                            hourlyImageOptionsMode
                                                ? 'grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5 sm:gap-2'
                                                : 'space-y-2'
                                        }
                                    >
                                        {quizQuestions[currentQuestionIndex]?.options?.map((option, idx) => {
                                            const isSelected = userAnswers[quizQuestions[currentQuestionIndex].id] === idx;
                                            const isCorrect = idx === quizQuestions[currentQuestionIndex].correct_option_index;
                                            const optionIsImage = isImageOption(option);

                                            let buttonClass = 'rounded-xl border border-slate-200/70 bg-white text-slate-900 hover:border-orange-200 hover:bg-orange-50/60';

                                            if (reviewMode) {
                                                if (isCorrect) buttonClass = 'rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 font-semibold';
                                                else if (isSelected && !isCorrect) buttonClass = 'rounded-xl border border-rose-200 bg-rose-50 text-rose-950 font-semibold';
                                                else buttonClass = 'rounded-xl border border-slate-200/60 bg-slate-50/80 text-slate-600';
                                            } else if (isSelected) {
                                                buttonClass = 'rounded-xl border border-orange-300 bg-orange-50 text-orange-950 font-semibold ring-1 ring-orange-200/80';
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => !reviewMode && hourlyImagesReady && handleAnswerSelect(quizQuestions[currentQuestionIndex].id, idx)}
                                                    disabled={reviewMode || !hourlyImagesReady || hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id)}
                                                    className={`${buttonClass} text-left transition-all duration-200 ${
                                                        hourlyImageOptionsMode && optionIsImage
                                                            ? 'relative flex min-h-0 min-w-0 flex-col overflow-hidden p-1.5 sm:p-2'
                                                            : 'flex w-full items-start gap-2.5 p-3'
                                                    } ${hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) && !reviewMode ? 'cursor-not-allowed' : ''}`}
                                                >
                                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
                                                        hourlyImageOptionsMode && optionIsImage
                                                            ? 'absolute left-1.5 top-1.5 z-10 shadow-sm'
                                                            : 'mt-0.5'
                                                    } ${
                                                        isSelected && !reviewMode
                                                            ? 'bg-orange-500 text-white'
                                                            : reviewMode && isCorrect
                                                              ? 'bg-emerald-500 text-white'
                                                              : reviewMode && isSelected && !isCorrect
                                                                ? 'bg-rose-500 text-white'
                                                                : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {String.fromCharCode(65 + idx)}
                                                    </span>
                                                    <span className={`min-w-0 ${hourlyImageOptionsMode && optionIsImage ? 'flex h-full w-full flex-1 items-center justify-center' : 'flex-1'}`}>
                                                    {optionIsImage ? (
                                                        <>
                                                            <img
                                                                key={`o_${quizQuestions[currentQuestionIndex]?.id || currentQuestionIndex}_${idx}`}
                                                                src={buildRetryImageSrc(option, `o_${quizQuestions[currentQuestionIndex]?.id || currentQuestionIndex}_${idx}`)}
                                                                alt={`${language === 'en' ? 'Option' : 'অপশন'} ${String.fromCharCode(65 + idx)}`}
                                                                className={
                                                                    hourlyImageOptionsMode
                                                                        ? 'h-full w-full object-contain object-center'
                                                                        : 'inline-block max-h-28 w-auto max-w-full rounded-lg object-contain'
                                                                }
                                                                data-fallback-index="0"
                                                                onError={(e) => {
                                                                    const optionImageKey = `o_${quizQuestions[currentQuestionIndex]?.id || currentQuestionIndex}_${idx}`;
                                                                    const exhausted = handleImageLoadError(e, option);
                                                                    if (exhausted) {
                                                                        setFailedImageKeys((prev) => ({ ...prev, [optionImageKey]: true }));
                                                                    }
                                                                }}
                                                            />
                                                            {failedImageKeys[`o_${quizQuestions[currentQuestionIndex]?.id || currentQuestionIndex}_${idx}`] && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(evt) => {
                                                                        evt.stopPropagation();
                                                                        retryImageLoad(`o_${quizQuestions[currentQuestionIndex]?.id || currentQuestionIndex}_${idx}`);
                                                                    }}
                                                                    className={`rounded-full border border-orange-200/80 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700 ${
                                                                        hourlyImageOptionsMode ? 'absolute bottom-1.5 right-1.5 z-10' : 'ml-2'
                                                                    }`}
                                                                >
                                                                    {language === 'en' ? 'Retry' : 'রিলোড'}
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className={`text-sm font-medium leading-snug text-inherit sm:text-[15px] ${language === 'bn' ? 'font-bengali leading-relaxed' : ''}`}>
                                                            {option}
                                                        </span>
                                                    )}
                                                    </span>
                                                    {reviewMode && isCorrect && (
                                                        <svg className={`h-4 w-4 shrink-0 text-emerald-600 ${hourlyImageOptionsMode && optionIsImage ? 'absolute right-1.5 top-1.5 z-10' : 'mt-0.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                    {reviewMode && isSelected && !isCorrect && (
                                                        <svg className={`h-4 w-4 shrink-0 text-rose-600 ${hourlyImageOptionsMode && optionIsImage ? 'absolute right-1.5 top-1.5 z-10' : 'mt-0.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    )}
                                                    {hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) && !reviewMode && isSelected && (
                                                        <svg className={`h-4 w-4 shrink-0 text-slate-400 ${hourlyImageOptionsMode && optionIsImage ? 'absolute right-1.5 top-1.5 z-10' : 'mt-0.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex shrink-0 flex-col gap-1.5 border-t border-slate-200/70 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-4 sm:pt-3.5 sm:pb-3.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            disabled={currentQuestionIndex === 0}
                                            onClick={() => {
                                                setCurrentQuestionIndex((prev) => prev - 1);
                                                setShowHint(false);
                                            }}
                                            className="rounded-full border border-slate-200/70 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
                                        >
                                            ← Prev
                                        </button>
                                        {currentQuestionIndex === quizQuestions.length - 1 ? (
                                            <button
                                                type="button"
                                                disabled={!reviewMode && !hourlyCurrentAnswered}
                                                onClick={reviewMode ? () => setActiveQuiz(null) : submitQuiz}
                                                aria-disabled={!reviewMode && !hourlyCurrentAnswered}
                                                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                                                    reviewMode
                                                        ? 'border border-slate-200/70 bg-white text-slate-700'
                                                        : hourlyCurrentAnswered
                                                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                          : 'cursor-not-allowed border border-slate-200/70 bg-white text-slate-400 opacity-50'
                                                }`}
                                            >
                                                {reviewMode ? 'Close Review' : 'Finish Quiz'}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={!reviewMode && !hourlyCurrentAnswered}
                                                onClick={() => {
                                                    setCurrentQuestionIndex((prev) => prev + 1);
                                                    setShowHint(false);
                                                }}
                                                aria-disabled={!reviewMode && !hourlyCurrentAnswered}
                                                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                                                    reviewMode || hourlyCurrentAnswered
                                                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                                                        : 'cursor-not-allowed border border-slate-200/70 bg-white text-slate-400 opacity-50'
                                                }`}
                                            >
                                                Next →
                                            </button>
                                        )}
                                    </div>
                                    {!reviewMode && !hourlyCurrentAnswered && (
                                        <p
                                            className={`text-center text-[11px] font-medium text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}
                                            role="status"
                                        >
                                            {t.selectAnswerToContinue}
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : submitRejected ? (
                            <div className="overflow-y-auto px-4 py-8 text-center sm:px-6">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                </div>
                                <h2 className={`mb-2 text-xl font-bold text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {submitRejected.type === 'time'
                                        ? (language === 'en' ? 'Score not counted' : 'স্কোর গণনা হয়নি')
                                        : (language === 'en' ? 'Not saved' : 'সংরক্ষণ হয়নি')}
                                </h2>
                                <p className={`mx-auto mb-5 max-w-md text-sm leading-relaxed text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {submitRejected.message}
                                </p>
                                {submitRejected.type === 'window' && (
                                    <div className={`mx-auto mb-5 max-w-md rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-left text-xs leading-relaxed text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? 'That hour is no longer open. You can still play any hour that is still orange or amber on the ring.'
                                            : 'সেই ঘণ্টা আর খোলা নেই। রিং-এ যে ঘণ্টা কমলা বা অ্যাম্বার আছে সেগুলো খেলতে পারবেন।'}
                                    </div>
                                )}
                                {submitRejected.type === 'time' && (
                                    <div className={`mx-auto mb-5 max-w-md rounded-xl border border-amber-200/70 bg-amber-50/90 p-3 text-left text-xs leading-relaxed text-amber-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? 'How to fix: Phone Settings → Date & time → turn ON "Set automatically". Then reopen the hourly challenge.'
                                            : 'সমাধান: ফোন সেটিংস → তারিখ ও সময় → "স্বয়ংক্রিয়ভাবে সেট করুন" চালু করুন। তারপর আবার ঘণ্টার চ্যালেঞ্জ খুলুন।'}
                                    </div>
                                )}
                                <button type="button" onClick={() => { handleAbortQuiz(); setQuizSubmitted(false); setSubmitRejected(null); }} className="w-full rounded-full bg-orange-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-600 active:scale-[0.99]">
                                    {t.close}
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-y-auto px-4 py-8 text-center sm:px-6">
                                <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${isGuestUser(userProfile) ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {isGuestUser(userProfile) ? (
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <h2 className={`mb-5 text-xl font-bold text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {isGuestUser(userProfile)
                                        ? (language === 'en' ? 'Preview complete' : 'প্রিভিউ সম্পন্ন')
                                        : t.completed}
                                </h2>

                                <div className="mb-6 flex flex-col items-center justify-center animate-scale-in">
                                    <div className={`mb-1 text-5xl font-bold tabular-nums sm:text-6xl ${(quizResults?.score || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {(quizResults?.score || 0) > 0 ? '+' : ''}{quizResults?.score || 0}
                                    </div>
                                    <div className={`text-[11px] font-semibold uppercase tracking-wide ${(quizResults?.score || 0) >= 0 ? 'text-emerald-600/70' : 'text-rose-600/70'}`}>
                                        {isGuestUser(userProfile)
                                            ? (language === 'en' ? 'Practice score' : 'অনুশীলন স্কোর')
                                            : ((quizResults?.score || 0) >= 0
                                                ? (language === 'en' ? 'Points Earned' : 'পয়েন্ট অর্জিত')
                                                : (language === 'en' ? 'Points Lost' : 'পয়েন্ট হারানো'))}
                                    </div>
                                </div>

                                {isGuestUser(userProfile) && (
                                    <div className={`mx-auto mb-5 max-w-md rounded-xl border border-sky-200/70 bg-sky-50/90 px-3.5 py-2.5 text-left text-xs leading-relaxed text-sky-900 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {guestPreviewText(language, 'hourlyResultGuest')}
                                    </div>
                                )}

                                {quizResults?.savedHourLabel && (
                                    <p className={`mx-auto mb-1.5 max-w-md text-center text-xs font-semibold leading-relaxed text-slate-600 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? `Saved for ${quizResults.savedHourLabel}.`
                                            : `স্কোর যোগ হয়েছে ${quizResults.savedHourLabel}-এর জন্য।`}
                                    </p>
                                )}
                                {quizResults?.clockMoved && quizResults?.liveHourLabel && (
                                    <p className={`mx-auto mb-1.5 max-w-md text-center text-xs leading-relaxed text-slate-500 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? `${quizResults.liveHourLabel} is a new quiz. This score is not for that hour.`
                                            : `${quizResults.liveHourLabel} আলাদা কুইজ। এই স্কোর সেই ঘণ্টার নয়।`}
                                    </p>
                                )}
                                {(quizResults?.openCount || 0) > 0 && (
                                    <p className={`mx-auto mb-3 max-w-md text-center text-xs leading-relaxed text-slate-500 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? 'More hours are still open. Close and tap the clock to play them.'
                                            : 'আরও ঘণ্টা খোলা আছে। বন্ধ করে ঘড়িতে ট্যাপ করে খেলুন।'}
                                    </p>
                                )}
                                {(quizResults?.latePacks || 0) > 0 && (
                                    <p className={`mx-auto mb-5 max-w-md text-center text-xs leading-relaxed text-amber-700 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? `${quizResults.latePacks} set(s) finished after green time → those points are half.`
                                            : `${quizResults.latePacks}টি সেট সবুজ সময়ের পরে শেষ — সেগুলোর পয়েন্ট অর্ধেক।`}
                                    </p>
                                )}

                                <div className={`mx-auto mb-6 grid max-w-md gap-2 ${(quizResults?.penalty || 0) > 0 ? 'grid-cols-2' : 'grid-cols-1 max-w-[11rem]'}`}>
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/90 px-3 py-2.5">
                                        <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                                            {language === 'bn' ? 'সঠিক' : 'Right'}
                                        </div>
                                        <div className="text-base font-bold tabular-nums text-emerald-700">+{quizResults?.pointsEarned || 0}</div>
                                    </div>
                                    {(quizResults?.penalty || 0) > 0 && (
                                        <div className="rounded-xl border border-rose-100 bg-rose-50/90 px-3 py-2.5">
                                            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                                                {language === 'bn' ? 'পেনাল্টি' : 'Penalty'}
                                            </div>
                                            <div className="text-base font-bold tabular-nums text-rose-700">-{quizResults.penalty}</div>
                                        </div>
                                    )}
                                </div>
                                {(quizResults?.skipped || 0) > 0 && (
                                    <p className={`mb-5 text-center text-[11px] text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? `This saved attempt includes ${quizResults.skipped} unanswered question(s) from an older format. New quizzes require every answer.`
                                            : `আগের বারের কুইজে ${quizResults.skipped}টি প্রশ্নের উত্তর দেওয়া হয়নি। নতুন নিয়ম অনুযায়ী সব প্রশ্নের উত্তর দেওয়া বাধ্যতামূলক।`}
                                    </p>
                                )}

                                {/* Sync Status Footer */}
                                {!isGuestUser(userProfile) && (
                                    <div className="mx-auto mb-5 max-w-xs rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 text-xs font-semibold">
                                        {syncStatus === 'syncing' && (
                                            <div className="flex items-center justify-center gap-2 text-amber-600">
                                                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-500" />
                                                {language === 'en' ? 'Syncing with server...' : 'সার্ভারের সাথে সিঙ্ক হচ্ছে...'}
                                            </div>
                                        )}
                                        {syncStatus === 'success' && (
                                            <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                                </svg>
                                                {language === 'en' ? 'Successfully saved to server!' : 'সার্ভারে সফলভাবে সংরক্ষিত হয়েছে!'}
                                            </div>
                                        )}
                                        {syncStatus === 'failed' && (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="text-rose-600">
                                                    <span className="inline-flex items-center gap-1">
                                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                                        </svg>
                                                        {language === 'en' ? 'Failed to save to server' : 'সার্ভারে সেভ করা যায়নি'}
                                                    </span>
                                                    {syncErrorMessage && <p className="mt-0.5 text-[10px] font-normal text-slate-400">{syncErrorMessage}</p>}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => submitHourlyQuiz(
                                                        quizResults?.pointsEarned,
                                                        quizResults?.penalty,
                                                        quizResults?.quizId || activeQuiz?.id || null
                                                    )}
                                                    className="rounded-full bg-amber-500 px-3 py-1.5 text-[10px] font-bold uppercase text-white transition-colors hover:bg-amber-600 active:scale-95"
                                                >
                                                    {language === 'en' ? 'Retry Save' : 'পুনরায় চেষ্টা করুন'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button type="button" onClick={() => { handleAbortQuiz(); setQuizSubmitted(false); }} className="w-full rounded-full bg-orange-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-600 active:scale-[0.99]">
                                    {isGuestUser(userProfile) ? guestPreviewText(language, 'hourlyCloseGuest') : t.close}
                                </button>
                            </div>
                        )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Google Search Confirmation Modal */}
            {showSearchModal && createPortal(
                <div className="fixed inset-0 z-[300] flex animate-fade-in items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4">
                    <div className="flex w-full max-w-sm animate-slide-up-sheet flex-col items-center overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center shadow-xl sm:animate-scale-in sm:rounded-2xl sm:pb-8">
                                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                            <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                        </div>

                        <h3 className="mb-2 text-xl font-black text-slate-900 tracking-tight">
                            {searchCount >= MAX_SEARCH_QUOTA ? t.searchExhausted : t.searchLimitTitle}
                        </h3>

                        <p className={`mb-8 text-sm text-slate-600 leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {searchCount >= MAX_SEARCH_QUOTA
                                ? (language === 'en' ? 'Limit reached. Use your skills to finish!' : 'নিজের বুদ্ধি খাটিয়ে চ্যালেঞ্জ শেষ করুন!')
                                : t.searchConfirm.replace('%s', searchCount)}
                        </p>

                        {searchCount < MAX_SEARCH_QUOTA && (
                            <div className="w-full bg-slate-200 rounded-full h-2 mb-8 overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-700"
                                    style={{ width: `${(searchCount / MAX_SEARCH_QUOTA) * 100}%` }}
                                />
                            </div>
                        )}

                        <div className="flex flex-col w-full gap-3">
                            {searchCount < MAX_SEARCH_QUOTA && (
                                <button
                                    type="button"
                                    onClick={confirmHourlyGoogleSearch}
                                    className="w-full py-4 rounded-full bg-orange-500 text-white font-black text-sm shadow-sm shadow-orange-500/30 transition-all hover:bg-orange-600 active:scale-[0.99]"
                                >
                                    {t.searchProceed}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowSearchModal(false)}
                                className={`w-full py-4 font-bold text-sm ${searchCount >= MAX_SEARCH_QUOTA ? 'rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30' : 'rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm'}`}
                            >
                                {searchCount >= MAX_SEARCH_QUOTA ? (language === 'en' ? 'Got it' : 'বুঝেছি') : t.close}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <HourlyPenaltyInfoModal
                open={showHourlyPenaltyInfoModal}
                language={language}
                lifetimePoints={hourlyLifetimePoints}
                onClose={() => setShowHourlyPenaltyInfoModal(false)}
            />
            <ReadingGateModal
                block={readingGateBlock}
                language={language}
                onClose={() => setReadingGateBlock(null)}
                setCurrentView={setCurrentView}
                onAdminPreview={
                    readingGateBlock?.canAdminPreview
                        ? () => {
                            setReadingGateBlock(null);
                            void beginHourlyQuiz({ bypassReadingGate: true });
                        }
                        : undefined
                }
            />
            <MonthlyBoardInfoModal
                open={showMonthlyBoardInfoModal}
                language={language}
                meta={monthlyBoardMeta}
                onClose={() => setShowMonthlyBoardInfoModal(false)}
            />
            <LeaderboardUserSheet
                open={Boolean(leaderboardUserSheet)}
                userId={leaderboardUserSheet?.userId}
                preview={leaderboardUserSheet?.preview}
                rank={leaderboardUserSheet?.rank}
                language={language}
                context={{
                    tab: leaderboardTab,
                    monthlyBoardTab,
                    boardTitle: monthlyBoardMeta?.title,
                }}
                viewerUserId={user?.id || null}
                viewerIsAdmin={userProfile?.role === 'admin'}
                hallOfFameData={hallOfFameData}
                onClose={() => setLeaderboardUserSheet(null)}
            />
        </div>
    );
}

const SkeletonCard = () => (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-full bg-slate-200 shimmer"></div>
            <div className="h-6 w-32 rounded-lg bg-slate-200 shimmer"></div>
        </div>
        <div className="mb-6 h-8 w-3/4 rounded-lg bg-slate-200 shimmer"></div>
        <div className="mb-8 flex justify-center gap-8">
            <div className="h-4 w-16 rounded bg-slate-200 shimmer"></div>
            <div className="h-4 w-16 rounded bg-slate-200 shimmer"></div>
        </div>
        <div className="h-12 w-full rounded-full bg-slate-200 shimmer"></div>
    </div>
);

const SkeletonRow = () => (
    <div className="flex items-center p-2">
        <div className="mr-3 h-6 w-6 rounded-full bg-slate-200 shimmer"></div>
        <div className="mr-3 h-8 w-8 rounded-full bg-slate-200 shimmer"></div>
        <div className="flex-1 space-y-1">
            <div className="h-3 w-24 rounded bg-slate-200 shimmer"></div>
            <div className="h-2.5 w-16 rounded bg-slate-100 shimmer"></div>
        </div>
        <div className="h-3 w-3 rounded bg-slate-200 shimmer"></div>
    </div>
);
