import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { completedLessonsForBadge, firstTimeReadingPointsFromLessons, getBadgeByLevel } from '../utils/badgeUtils';
import { cacheHelper } from '../utils/cacheHelper';
import { storageUtils } from '../utils/storageUtils';
import { leaderboardService, overlayCumulativeReading } from '../utils/leaderboardService';
import { requestManager } from '../utils/requestManager';
import { visualQuizService } from '../utils/visualQuizService';
import {
    handleImageLoadError,
    isImageOption,
    toDisplayImageUrl,
} from '../utils/visualQuizImageUtils';
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
    buildMakeupSession,
    countRecentMissedHours,
    getMakeupCopy,
    HOURLY_QUESTIONS_PER_PACK,
} from '../utils/hourlyMakeup';
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
    MONTHLY_SUB_TAB,
    MONTHLY_SUB_TAB_ORDER,
} from '../utils/monthlyEncouragementBoards';
import {
    HOF_PRIZE_VIEW_STORAGE_KEY,
    getHallOfFamePrizeViewCopy,
    normalizeHallOfFameViewMode,
} from '../utils/hallOfFamePrizes';
import { HOF_GALLERY_BOARDS_VERSION } from '../utils/hallOfFameSnapshots';
import HallOfFameWinnerCard from './HallOfFameWinnerCard';
import HallOfFameUserPrizesView from './HallOfFameUserPrizesView';
import LeaderboardRankChip from './LeaderboardRankChip';
import ReadingLevelAvatarFrame from './ReadingLevelAvatarFrame';
import LeaderboardUserSheet from './LeaderboardUserSheet';
import AvatarPhoto, { imagePreviewFromEvent } from './AvatarPhoto';
import { AVATAR_EDGE } from '../utils/avatarImage';

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

function formatChaseDisplayName(fullName) {
    const trimmed = (fullName || '').trim();
    if (!trimmed || trimmed.includes('@')) return null;
    const first = trimmed.split(/\s+/)[0];
    return first.length > 18 ? `${first.slice(0, 16)}…` : first;
}

/** Top-3 podium / strip: first name only (display). */
function formatPodiumFirstName(fullName) {
    const trimmed = (fullName || '').trim();
    if (!trimmed) return '';
    const base = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
    const first = base.split(/\s+/)[0] || base;
    return first.length > 14 ? `${first.slice(0, 12)}…` : first;
}

/** Display-only: read rival one rank above for chase banner. Never used for scoring or writes. */
async function fetchRivalAheadForDisplay(myScoreValue) {
    const { data: rivalRow, error: rivalError } = await supabase
        .from('leaderboard_view')
        .select('user_id, full_name, score')
        .gt('score', myScoreValue)
        .order('score', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (rivalError) throw rivalError;
    if (!rivalRow) return null;

    const rivalScore = rivalRow.score ?? 0;
    const { count: rivalAheadCount, error: rivalRankError } = await supabase
        .from('leaderboard_view')
        .select('*', { count: 'exact', head: true })
        .gt('score', rivalScore);

    if (rivalRankError) throw rivalRankError;

    return {
        user_id: rivalRow.user_id,
        full_name: rivalRow.full_name,
        score: rivalScore,
        rank: rivalAheadCount + 1,
        gap: rivalScore - myScoreValue,
    };
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

function buildHourlyChaseMessage({ language, userRank, hoursLeft }) {
    if (!userRank) return null;

    const fmt = (n) => formatLeaderboardNumber(n);
    const isBn = language === 'bn';

    if (userRank.rank === 1) {
        return isBn
            ? 'আপনি এখন শীর্ষে! এক নম্বর জায়গা ধরে রাখতে খেলতে থাকুন।'
            : "You're #1 right now — keep playing every hour to stay on top.";
    }

    const rival = userRank.rival;
    if (!rival?.full_name) {
        return isBn
            ? (hoursLeft > 0
                ? `আজ আরও ${fmt(hoursLeft)}টি কুইজ বাকি আছে, খেলে পয়েন্ট বাড়িয়ে নিন!`
                : 'আজকের সব কুইজ শেষ! কাল আবার নতুন উদ্যমে শুরু করুন।')
            : (hoursLeft > 0
                ? `${fmt(hoursLeft)} hour${hoursLeft === 1 ? '' : 's'} left today — keep playing to climb the board.`
                : "Today's hours are done — come back tomorrow and keep building your score.");
    }

    const name = formatChaseDisplayName(rival.full_name) || (isBn ? 'সহপ্রতিযোগী' : 'the player ahead');
    const gap = Math.max(0, rival.gap ?? 0);
    const rankLabel = rival.rank ? `#${rival.rank}` : '';
    const hoursBitBn = hoursLeft > 0
        ? ` আজ আরও ${fmt(hoursLeft)}টি কুইজ বাকি আছে — খেললে ব্যবধান কমানো সম্ভব!`
        : '';
    const hoursBitEn = hoursLeft > 0
        ? ` ${fmt(hoursLeft)} hour${hoursLeft === 1 ? '' : 's'} left today — play them to close the gap.`
        : '';

    if (gap <= 10) {
        return isBn
            ? `${name}${rankLabel ? ` (${rankLabel})` : ''} থেকে মাত্র ${fmt(gap)} পয়েন্ট পিছিয়ে! ভালো খেললে এক ঘণ্টাই যথেষ্ট।${hoursBitBn}`
            : `Only ${fmt(gap)} point${gap === 1 ? '' : 's'} behind ${name}${rankLabel ? ` (${rankLabel})` : ''}! One strong hour could do it.${hoursBitEn}`;
    }

    return isBn
        ? `${name}${rankLabel ? ` (${rankLabel})` : ''} এর চেয়ে ${fmt(gap)} পয়েন্ট কম।${hoursBitBn || ' প্রতি ঘণ্টা খেলে ব্যবধান কমিয়ে ফেলুন!'}`
        : `You're ${fmt(gap)} points behind ${name}${rankLabel ? ` (${rankLabel})` : ''}.${hoursBitEn || ' Steady hour-by-hour play adds up.'}`;
}

/** Convert a date to an IST (UTC+5:30) date representation for timezone safety */
const getIstDate = (date) => {
    if (!date) return new Date();
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
};

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
    const [leaderboardTab, setLeaderboardTab] = useState('monthly'); // 'monthly' | 'all-time'
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

    // Search Quota State
    const [searchCount, setSearchCount] = useState(0);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [hourlySearchText, setHourlySearchText] = useState('');
    const MAX_SEARCH_QUOTA = 2;
    
    // Hall of Fame Gallery State
    const [showHallOfFame, setShowHallOfFame] = useState(isPrizesSurface);
    const [hallOfFameBoardTab, setHallOfFameBoardTab] = useState(MONTHLY_SUB_TAB.CHAMPION);
    const [hallOfFameData, setHallOfFameData] = useState([]);
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
    const [showHallCelebration, setShowHallCelebration] = useState(false);
    const hallCelebrationShownRef = React.useRef(false);
    const [hallOfFamePrizeView, setHallOfFamePrizeView] = useState(() => {
        const saved = storageUtils.getItem(HOF_PRIZE_VIEW_STORAGE_KEY);
        return normalizeHallOfFameViewMode(saved);
    });
    const [hallOfFameUserPrizeFilter, setHallOfFameUserPrizeFilter] = useState(null);
    const hallOfFamePrizeViewCopy = getHallOfFamePrizeViewCopy(language);

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
            hallCelebrationShownRef.current = false;
            setShowHallCelebration(false);
            return;
        }
        // Always land on মাসের সেরা / Champion when opening Hall of Fame
        setHallOfFameBoardTab(MONTHLY_SUB_TAB.CHAMPION);
    }, [showHallOfFame]);

    useEffect(() => {
        if (!showHallOfFame || loadingGallery || hallOfFameData.length === 0 || hallCelebrationShownRef.current) return;

        const playCelebrationSound = () => {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();
                const now = ctx.currentTime + 0.04;
                const master = ctx.createGain();
                master.gain.value = 0.16;
                master.connect(ctx.destination);

                const playVoice = (freq, start, duration, type = 'triangle', volume = 0.2) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, start);
                    osc.frequency.exponentialRampToValueAtTime(freq * 1.008, start + duration * 0.6);
                    gain.gain.setValueAtTime(0.0001, start);
                    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                    osc.connect(gain);
                    gain.connect(master);
                    osc.start(start);
                    osc.stop(start + duration + 0.02);
                };

                // Warm bass bed for richness
                [130.81, 146.83, 164.81].forEach((freq, idx) => {
                    playVoice(freq, now + idx * 0.26, 0.34, 'sine', 0.08);
                });

                // Main victory motif (major progression)
                const motif = [
                    { n: 523.25, t: 0.00, d: 0.20 },
                    { n: 659.25, t: 0.16, d: 0.20 },
                    { n: 783.99, t: 0.32, d: 0.24 },
                    { n: 1046.5, t: 0.50, d: 0.30 },
                    { n: 1318.51, t: 0.76, d: 0.34 }
                ];
                motif.forEach(({ n, t, d }) => playVoice(n, now + t, d, 'triangle', 0.12));

                // Sparkle harmonics for polished finish
                [1567.98, 2093.0].forEach((freq, idx) => {
                    playVoice(freq, now + 0.68 + idx * 0.13, 0.22, 'sine', 0.05);
                });

                setTimeout(() => {
                    if (ctx.state !== 'closed') ctx.close().catch(() => {});
                }, 1900);
            } catch {
                // Non-critical UI effect; skip if audio is blocked.
            }
        };

        const startTimer = setTimeout(() => {
            hallCelebrationShownRef.current = true;
            setShowHallCelebration(true);
            playCelebrationSound();
        }, 1200);

        const stopTimer = setTimeout(() => {
            setShowHallCelebration(false);
        }, 5600);

        return () => {
            clearTimeout(startTimer);
            clearTimeout(stopTimer);
        };
    }, [showHallOfFame, loadingGallery, hallOfFameData.length]);

    // PERSISTENCE & ANTI-CHEAT LOGIC
    useEffect(() => {
        if (!activeQuiz || quizSubmitted) return;

        const state = {
            quizId: activeQuiz.id,
            points_reward: activeQuiz.points_reward,
            makeupPacks: activeQuiz.makeupPacks,
            makeupMissed: activeQuiz.makeupMissed,
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
            if (savedState && hourlyQuiz && savedState.quizId === hourlyQuiz.id) {
                const stateTime = new Date(savedState.timestamp);
                const now = getSyncedTime();

                const istState = getIstDate(stateTime);
                const istNow = getIstDate(now);

                // Only resume if it's the same hour/day in IST
                if (istState.getUTCHours() === istNow.getUTCHours() &&
                    istState.getUTCDate() === istNow.getUTCDate() &&
                    istState.getUTCFullYear() === istNow.getUTCFullYear()) {
                    setQuizQuestions(savedState.questions);
                    setCurrentQuestionIndex(savedState.currentIndex);
                    setUserAnswers(savedState.answers);
                    setHintViewedQuestions(new Set(savedState.hints || []));
                    const green = savedState.packGreenSeconds || 120;
                    const starts = Array.isArray(savedState.packStartTimes) ? savedState.packStartTimes : [];
                    const onTime = Array.isArray(savedState.packOnTimeFlags) ? savedState.packOnTimeFlags : [];
                    setPackGreenSeconds(green);
                    setPackStartTimes(starts);
                    setPackOnTimeFlags(onTime);
                    packTimingRef.current = { greenSeconds: green, starts, onTime };
                    setActiveQuiz({
                        ...hourlyQuiz,
                        points_reward: savedState.points_reward ?? hourlyQuiz.points_reward ?? 50,
                        makeupPacks: savedState.makeupPacks ?? 1,
                        makeupMissed: savedState.makeupMissed ?? 0,
                    });
                    setQuizSubmitted(false);
                    console.log('Restored quiz state for anti-cheat protection');
                } else {
                    storageUtils.removeItem('slm_hourly_active_quiz_state');
                }
            }
        };

        if (hourlyQuiz && !activeQuiz) {
            checkResumption();
        }
    }, [hourlyQuiz, activeQuiz]);

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
            antiCheatExitDesc: "Exiting now will submit this hourly challenge with 0 points.",
            antiCheatExitMakeup: "This also cancels every set in this quiz.",
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
            antiCheatExitDesc: "এখন বের হলে এই কুইজে ০ পয়েন্ট পাবেন।",
            antiCheatExitMakeup: "বেরোলে এই কুইজের সব সেটের পয়েন্টই যাবে।",
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

    const currentUserBadge = getBadgeByLevel(
        (userProfile && userProfile.training_level) || 0,
        firstTimeReadingPointsFromLessons(userProfile?.completed_lessons)
    );
    const hourlyLifetimePoints = getLifetimePoints(userProfile, userRank);
    const hourlyStakesUi = getHourlyStakesUi(hourlyLifetimePoints, language);
    const [showHourlyPenaltyInfoModal, setShowHourlyPenaltyInfoModal] = useState(false);
    const [showMonthlyBoardInfoModal, setShowMonthlyBoardInfoModal] = useState(false);
    const [leaderboardUserSheet, setLeaderboardUserSheet] = useState(null);
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
            // Run fetches in parallel to avoid blocking
            const promises = [
                fetchServerTime()
            ];

            if (isFullLeaderboard) {
                // Rank / Prizes: cache-first monthly boards (force only when caller asks)
                promises.push(fetchMonthlyLeaderboard(forceRefresh));
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
                    // Play: hourly quiz + compact ladder only. Do not pull monthly/HoF
                    // (those belong to Rank/Prizes and were the fat uncached path).
                    promises.push(fetchLeaderboard(forceRefresh));
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

    // Simplified Hourly Quiz ID Generation
    const getHourlyQuizId = () => {
        const now = getIstDate(getSyncedTime());
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hour = String(now.getUTCHours()).padStart(2, '0');
        return `hourly-challenge-${year}-${month}-${day}-${hour}`;
    };

    // --- GAMIFIED LADDER: Data Layer ---
    const fetchTodayAttempts = async () => {
        if (!user) return;
        const now = getIstDate(getSyncedTime());
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const prefix = `hourly-challenge-${year}-${month}-${day}-`;

        try {
            const { data, error } = await supabase
                .from('quiz_attempts')
                .select('quiz_id, score, penalty, created_at')
                .eq('user_id', user.id)
                .like('quiz_id', `${prefix}%`)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setTodayAttempts(data);
            }
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
        const now = getIstDate(getSyncedTime());
        const currentHour = now.getUTCHours();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');

        // Build a map of hour -> attempt
        const attemptMap = {};
        todayAttempts.forEach(a => {
            // quiz_id format: hourly-challenge-YYYY-MM-DD-HH
            const hourStr = a.quiz_id.split('-').pop();
            const hour = parseInt(hourStr, 10);
            if (!isNaN(hour)) {
                attemptMap[hour] = a;
            }
        });

        // Check if current hour is locked (already played)
        const isCurrentHourPlayed = !!attemptMap[currentHour] || (lastAttemptTime && (() => {
            const last = getIstDate(new Date(lastAttemptTime));
            return last.getUTCFullYear() === now.getUTCFullYear() &&
                last.getUTCMonth() === now.getUTCMonth() &&
                last.getUTCDate() === now.getUTCDate() &&
                last.getUTCHours() === currentHour;
        })());

        const slots = [];
        // Show hours 0 to 23
        for (let h = 0; h <= 23; h++) {
            const attempt = attemptMap[h];
            let status;
            if (h === currentHour) {
                status = isCurrentHourPlayed ? 'played' : 'live';
            } else if (h < currentHour) {
                status = attempt ? 'played' : 'missed';
            } else if (h === currentHour + 1 && isCurrentHourPlayed) {
                status = 'upcoming-next';
            } else {
                status = 'upcoming';
            }

            // Adjust label for 12-hour format
            const hour12 = h % 12 || 12;
            const ampm = h < 12 ? 'AM' : 'PM';

            const quizId = `hourly-challenge-${year}-${month}-${day}-${String(h).padStart(2, '0')}`;
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
            });
        }
        // Render 23 at top, 0 at bottom
        return slots.reverse();
    };

    const getTodayNetScore = () => todayAttempts.reduce(
        (sum, attempt) => sum + (Number(attempt.score) || 0) - (Number(attempt.penalty) || 0),
        0
    );

    const getStreak = (slots) => {
        const now = getIstDate(getSyncedTime());
        const currentHour = now.getUTCHours();
        let streak = 0;
        // Count consecutive played hours ending at current/last hour
        // Slots are already reversed (23 -> 0)

        let counting = false;
        // Find start point: either current hour (if played) or previous hour
        // Since slots are 23..0, we iterate
        for (const slot of slots) {
            if (slot.hour > currentHour) continue; // Future

            // If it's current hour and live, skip (doesn't break streak yet, but doesn't count)
            if (slot.hour === currentHour && slot.status === 'live') continue;

            if (slot.status === 'played') {
                streak++;
                counting = true;
            } else if (counting) {
                // Break streak if we hit a non-played slot (missed) after starting count
                break;
            } else if (slot.status === 'missed') {
                // If we haven't started counting yet and hit a miss, streak is 0
                break;
            }
        }
        return streak;
    };

    const getLiveMakeupPreview = () => {
        const now = getIstDate(getSyncedTime());
        const currentHour = now.getUTCHours();
        const playedHours = new Set();
        todayAttempts.forEach((a) => {
            const hour = parseInt(String(a.quiz_id).split('-').pop(), 10);
            if (!Number.isNaN(hour)) playedHours.add(hour);
        });
        if (lastAttemptTime) {
            const last = getIstDate(new Date(lastAttemptTime));
            if (
                last.getUTCFullYear() === now.getUTCFullYear() &&
                last.getUTCMonth() === now.getUTCMonth() &&
                last.getUTCDate() === now.getUTCDate()
            ) {
                playedHours.add(last.getUTCHours());
            }
        }
        const makeupMissed = countRecentMissedHours(currentHour, playedHours);
        return buildMakeupSession(makeupMissed);
    };

    const syncPackTimingRef = (patch) => {
        packTimingRef.current = { ...packTimingRef.current, ...patch };
    };

    const ensurePackTimerStarted = (packIdx, greenOverride = null) => {
        const green = greenOverride ?? packTimingRef.current.greenSeconds ?? packGreenSeconds;
        const starts = [...(packTimingRef.current.starts || [])];
        if (!starts[packIdx]) {
            starts[packIdx] = Date.now();
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

    const hourlyChaseMessage = useMemo(() => {
        if (isFullLeaderboard || !user || loading || !userRank) return null;
        const hoursLeft = buildHourlySlots().filter((slot) => (
            slot.status === 'live' || slot.status === 'upcoming' || slot.status === 'upcoming-next'
        )).length;
        const makeup = getLiveMakeupPreview();
        const makeupCopy = getMakeupCopy(language, makeup.makeupMissed, makeup.packs, makeup.pointsReward);
        if (makeupCopy.chaseHint && makeup.makeupMissed > 0) {
            return makeupCopy.chaseHint;
        }
        return buildHourlyChaseMessage({ language, userRank, hoursLeft });
    }, [isFullLeaderboard, user, loading, language, userRank, todayAttempts, lastAttemptTime, serverTimeOffset]);


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
        const cleanScore = Math.round(Number(score)) || 0;
        const cleanPenalty = Math.round(Number(penalty)) || 0;

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
                const isGuestBlock = data.error === 'guest_preview';
                setSyncStatus('failed');
                setSubmitRejected({
                    type: isTimeBlock ? 'time' : isGuestBlock ? 'guest' : 'other',
                    message: isGuestBlock
                        ? guestPreviewText(language, 'blockedBody')
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

            fetchLeaderboard(true);
            fetchFullLeaderboard(true);
            fetchMonthlyLeaderboard(true);
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
            await fetchLeaderboard(true);
            await fetchFullLeaderboard(true);
            await fetchMonthlyLeaderboard(true);
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

    const fetchHourlyQuiz = async (forceRefresh = false) => {
        if (isFullLeaderboard) return null;

        const now = getIstDate(getSyncedTime());
        // Use simpler strict format: YYYY-MM-DD-HH
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hour = String(now.getUTCHours()).padStart(2, '0');
        const hourId = `${year}-${month}-${day}-${hour}`;

        const cacheKey = `hourly_quiz_db_bn_v4_${hourId}`;

        try {
            const quizData = await requestManager.fetch(
                cacheKey,
                async () => {
                    const [{ data, error }, visualQuestions] = await Promise.all([
                        supabase.rpc('get_random_hourly_questions', {
                            lang: 'bn',
                            // Larger pool for difficulty mix + up to 6 makeup packs (30 Q).
                            limit_count: 80
                        }),
                        visualQuizService.fetchVisualQuestions({ language: 'bn', hourId })
                    ]);

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
                            id: `hourly-challenge-${hourId}`, // Ensure this ID format is consistent
                            title: language === 'en' ? 'Hourly quiz' : 'ঘণ্টার কুইজ',
                            description: language === 'en' ? 'Test your safety knowledge! New questions every hour.' : 'নিরাপত্তা জ্ঞান পরীক্ষা করুন! প্রতি ঘণ্টায় নতুন প্রশ্ন।',
                            duration_minutes: 5,
                            points_reward: 50,
                            questions: mergedQuestions,
                            isLocal: false
                        };
                    }
                    return null;
                },
                { ttl: 60, swr: true, forceRefresh }
            );

            if (quizData) {
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
            let quiz = hourlyQuizRef.current;
            const expectedId = getHourlyQuizId();
            if (!quiz || quiz.id !== expectedId) {
                quiz = await fetchHourlyQuiz(true);
            }
            if (quiz && quiz.id !== getHourlyQuizId()) {
                quiz = await fetchHourlyQuiz(true);
            }
            if (!quiz) return;
            await startQuiz(quiz);
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
                        .select('score, reading_points, completed_lessons')
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

                    const [overlaid] = await overlayCumulativeReading([{
                        user_id: user.id,
                        completed_lessons: myData.completed_lessons,
                        reading_points: myData.reading_points || 0,
                    }]);

                    return {
                        rank: count + 1,
                        score: myScoreValue,
                        reading_points: overlaid?.reading_points || myData.reading_points || 0,
                    };
                },
                { ttl: 5, swr: true, forceRefresh }
            );

            if (rankData) {
                const rival = await requestManager.fetch(
                    `user_rival_ahead_${user.id}`,
                    () => fetchRivalAheadForDisplay(rankData.score),
                    { ttl: 5, swr: true, forceRefresh }
                ).catch(() => null);

                setUserRank({ ...rankData, rival: rival || null });
            } else {
                setUserRank(null);
            }
        } catch (error) {
            console.error('Error fetching rank:', error);
        }
    };

    const fetchLeaderboard = async (forceRefresh = false) => {
        try {
            const cacheKey = 'leaderboard_top_10_all_time_rdg';

            const formattedData = await requestManager.fetch(
                cacheKey,
                async () => {
                    const query = supabase
                        .from('leaderboard_view')
                        .select('*')
                        .order('score', { ascending: false })
                        .limit(10);

                    const { data, error } = await query;

                    if (error) throw error;

                    return overlayCumulativeReading((data || []).map(item => ({
                        ...item,
                        points: item.score ?? 0,
                        reading_points: item.reading_points ?? 0
                    })));
                },
                { ttl: 5, swr: true, forceRefresh }
            );

            if (formattedData) {
                setLeaderboard(formattedData);
            }
            if (user) fetchUserRank(forceRefresh);

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setFetchError(true);
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
        const hasCurrentBoards = hallOfFameData.length > 0
            && hallOfFameData[0]?.boardsVersion === HOF_GALLERY_BOARDS_VERSION;
        if (!forceRefresh && hasCurrentBoards) return;
        
        setLoadingGallery(true);
        try {
            const archive = await leaderboardService.fetchHallOfFame(forceRefresh);
            if (archive) setHallOfFameData(archive);
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

    const goToGlobalLeaderboard = () => {
        if (typeof setCurrentView === 'function') {
            setCurrentView('leaderboard');
        }
    };

    const switchToMonthlyLeaderboard = () => {
        setLeaderboardTab('monthly');
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
        if (isFullLeaderboard) {
            setLeaderboardUserSheet({ userId, preview, rank });
            return;
        }
        if (typeof onOpenUserProgress === 'function') {
            onOpenUserProgress(userId);
        }
    };

    const startQuiz = async (quiz) => {
        if (!user) {
            setCurrentView('login');
            return;
        }

        // Check if there's a pending submission for this quiz
        if ((pendingSubmission && pendingSubmission.quiz_id === quiz.id) || isSyncing) {
            alert(t.previousPending + '. ' + (isOnline ? t.retryNow : t.waitingNetwork));
            return;
        }

        // Double-check if already played this hour (Race Condition Guard)
        const now = getSyncedTime();
        if (lastAttemptTime) {
            const last = getIstDate(new Date(lastAttemptTime));
            const istNow = getIstDate(now);
            if (last.getUTCFullYear() === istNow.getUTCFullYear() &&
                last.getUTCMonth() === istNow.getUTCMonth() &&
                last.getUTCDate() === istNow.getUTCDate() &&
                last.getUTCHours() === istNow.getUTCHours()) {
                return;
            }
        }

        // Freeze makeup at Play: missed hours stay missed; live quiz grows by packs.
        const makeup = getLiveMakeupPreview();
        const questionTotal = makeup.questionCount;
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
            points_reward: makeup.pointsReward,
            makeupPacks: makeup.packs,
            makeupMissed: makeup.makeupMissed,
            packGreenSeconds: greenSeconds,
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
            const recentImageSet = getRecentImageSet();
            const freshnessSorted = [...shuffledQuestions].sort((a, b) => {
                const aHasRecent = getQuestionImageKeys(a).some((img) => recentImageSet.has(img));
                const bHasRecent = getQuestionImageKeys(b).some((img) => recentImageSet.has(img));
                if (aHasRecent === bHasRecent) return 0;
                return aHasRecent ? 1 : -1; // non-recent visuals first
            });
            const picked = pickQuestionsByDifficultyMix(freshnessSorted, lifetimePoints, questionTotal);

            // Ensure at least 1 visual question when available in the pool.
            const hasVisualInPool = freshnessSorted.some((q) => isVisualQuestion(q));
            const hasVisualInPicked = picked.some((q) => isVisualQuestion(q));
            if (hasVisualInPool && !hasVisualInPicked) {
                const fallbackVisual = freshnessSorted.slice(questionTotal).find((q) => isVisualQuestion(q));
                if (fallbackVisual) {
                    picked[picked.length - 1] = fallbackVisual;
                }
            }

            // Cap visual questions to max 2 when possible (or packs, whichever is higher up to 4).
            const maxVisual = Math.min(4, Math.max(2, makeup.packs));
            const getVisualCount = (arr) => arr.filter((q) => isVisualQuestion(q)).length;
            let visualCount = getVisualCount(picked);
            if (visualCount > maxVisual) {
                const remainingPool = freshnessSorted.slice(questionTotal);
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

    // Per-set green timer: finalize previous pack when moving forward; start timer on new pack.
    useEffect(() => {
        if (!activeQuiz || quizSubmitted || reviewMode) return undefined;
        const packIdx = packIndexForQuestion(currentQuestionIndex);
        const prevPack = packTimingRef.current._uiPack;
        if (prevPack !== undefined && packIdx > prevPack) {
            for (let p = prevPack; p < packIdx; p += 1) finalizePackTimer(p);
        }
        ensurePackTimerStarted(packIdx);
        packTimingRef.current._uiPack = packIdx;
        return undefined;
    }, [activeQuiz, quizSubmitted, reviewMode, currentQuestionIndex]);

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
        // Submit with 0 score — locks this live hour (makeup packs included).
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
            makeupMissed: activeQuiz?.makeupMissed || 0,
            makeupPacks: activeQuiz?.makeupPacks || 1,
            quizId: activeQuiz?.id || null,
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
            makeupMissed: activeQuiz?.makeupMissed || 0,
            makeupPacks: activeQuiz?.makeupPacks || 1,
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
                        {!showHallOfFame && leaderboardTab === 'monthly' && (
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
                                        className={`flex-1 min-w-0 truncate rounded-full px-2 py-2.5 text-[13px] font-black leading-tight transition-all active:scale-[0.98] sm:px-3 sm:py-3 sm:text-base ${
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

                        {!showHallOfFame && leaderboardTab === 'all-time' && (
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={switchToMonthlyLeaderboard}
                                    className={`inline-flex min-w-0 items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                    <span className="truncate sm:hidden">
                                        {language === 'en' ? 'Monthly' : 'মাসিক'}
                                    </span>
                                    <span className="hidden truncate sm:inline">
                                        {language === 'en' ? 'Monthly leaderboard' : 'মাসিক লিডারবোর্ড'}
                                    </span>
                                </button>
                            </div>
                        )}

                        {showHallOfFame && (
                            <div className="flex items-center">
                                <p className={`text-sm font-black text-slate-900 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {language === 'en' ? 'Prizes' : 'পুরস্কার'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

            {showHallOfFame ? (
                    <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
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
                            <div className="mx-auto max-w-5xl space-y-3 sm:space-y-4">
                                {/* Congrats banner: slides in from top and pushes content, then collapses out */}
                                <div
                                    className={`hof-congrats-banner grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
                                        showHallCelebration ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                    }`}
                                    aria-hidden={!showHallCelebration}
                                >
                                    <div className="min-h-0 overflow-hidden">
                                        <div
                                            className={`flex flex-col gap-4 rounded-2xl border border-amber-100 bg-amber-50/90 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                                                showHallCelebration ? 'animate-hof-banner-in' : ''
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-xl sm:text-2xl mt-0.5" aria-hidden>🎉</span>
                                                <p className="font-bengali text-sm sm:text-base font-bold text-slate-700">
                                                    মাসের বিজয়ীদের অভিনন্দন! পুরস্কার সংক্রান্ত আপডেট পেতে আমাদের Facebook পেজ ফলো করুন এবং WhatsApp গ্রুপে যুক্ত থাকুন।
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                                <a href="https://www.facebook.com/smartlineman" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-[#1877F2] shadow-sm transition-all hover:bg-blue-50 hover:shadow-md active:scale-95" tabIndex={showHallCelebration ? 0 : -1}>
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" /></svg>
                                                </a>
                                                <a href="https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-[#25D366] shadow-sm transition-all hover:bg-green-50 hover:shadow-md active:scale-95" tabIndex={showHallCelebration ? 0 : -1}>
                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mx-auto max-w-lg space-y-2 px-0.5">
                                    <div
                                        className="grid grid-cols-2 gap-1 rounded-full border border-slate-200/80 bg-white p-0.5 shadow-sm"
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
                                            className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-black transition-all active:scale-[0.98] sm:text-sm ${language === 'bn' ? 'font-bengali' : ''} ${
                                                hallOfFamePrizeView !== 'by_user'
                                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                                                    : 'text-slate-600 hover:bg-orange-50'
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
                                            className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-black transition-all active:scale-[0.98] sm:text-sm ${language === 'bn' ? 'font-bengali' : ''} ${
                                                hallOfFamePrizeView === 'by_user'
                                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                                                    : 'text-slate-600 hover:bg-orange-50'
                                            }`}
                                        >
                                            {hallOfFamePrizeViewCopy.byUser}
                                        </button>
                                    </div>

                                    {hallOfFamePrizeView !== 'by_user' && (
                                        <div className="w-full overflow-x-auto no-scrollbar">
                                            <div className="flex min-w-max gap-1 pb-0.5">
                                                {MONTHLY_SUB_TAB_ORDER.map((tabId) => (
                                                    <button
                                                        key={tabId}
                                                        type="button"
                                                        onClick={() => setHallOfFameBoardTab(tabId)}
                                                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-black shadow-sm transition-all active:scale-95 sm:px-3.5 sm:text-[13px] ${language === 'bn' ? 'font-bengali' : ''} ${hallOfFameBoardTab === tabId ? 'bg-orange-500 text-white shadow-orange-500/25' : 'border border-slate-200/80 bg-white text-slate-700 hover:bg-orange-50'}`}
                                                    >
                                                        {encouragementCopy.monthlyTabs[tabId]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                {hallOfFameData.map((entry, idx) => {
                                    const monthWinners = getHallOfFameWinners(entry, hallOfFameBoardTab);
                                    return (
                                    <div 
                                        key={`${entry.year}-${entry.month}-${hallOfFameBoardTab}`} 
                                        className="animate-slide-up"
                                        style={{ animationDelay: `${idx * 60}ms` }}
                                    >
                                        <div className="rounded-2xl border border-amber-100/80 bg-gradient-to-b from-white to-amber-50/30 p-2.5 shadow-sm sm:p-3.5">
                                            <div className="mb-2 flex items-center gap-2 border-b border-amber-100/80 pb-1.5 sm:mb-2.5">
                                                <span className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" aria-hidden />
                                                <h3 className={`text-sm font-black tracking-tight text-slate-900 sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {language === 'bn'
                                                        ? `${LEADERBOARD_BN_MONTHS[entry.month - 1]} ${entry.year}`
                                                        : new Date(entry.year, entry.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                </h3>
                                            </div>

                                            <div className={
                                                monthWinners.length === 0
                                                    ? ''
                                                    : 'grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3'
                                            }>
                                                {monthWinners.length === 0 ? (
                                                    <p className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-8 text-center text-xs font-semibold text-slate-600">
                                                        {language === 'en' ? 'No winners for this category that month.' : 'সেই মাসে এই তালিকায় কেউ উঠেননি।'}
                                                    </p>
                                                ) : monthWinners.map((winner, winIdx) => (
                                                    <HallOfFameWinnerCard
                                                        key={`${winner.user_id}-${winner.prize_status || 'row'}-${winIdx}`}
                                                        winner={winner}
                                                        winIdx={winIdx}
                                                        entry={entry}
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
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                            )}
                            </div>
                        )}

                        <div className="h-10"></div>
                    </div>
                ) : (
                    <>
                    <div className={`max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-3 ${leaderboardTab === 'all-time' ? 'pb-48 md:pb-56' : 'pb-24 md:pb-28'}`}>
                    {leaderboardTab === 'monthly' && (
                        <div className="mx-auto mb-1 max-w-2xl px-2 sm:mb-2">
                            {monthlyBoardMeta ? (
                                <MonthlyBoardHeader
                                    meta={monthlyBoardMeta}
                                    language={language}
                                    monthlyBoardTab={monthlyBoardTab}
                                    onInfoClick={() => setShowMonthlyBoardInfoModal(true)}
                                    onAllTimeClick={switchToAllTimeLeaderboard}
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
                                {/* Top 3 — compact strip on monthly; tall podium on all-time */}
                                {(() => {
                                    const list = leaderboardTab === 'all-time' ? fullLeaderboard : monthlyPodiumList;
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

                                    // --- Monthly: compact Top 3 strip ---
                                    if (leaderboardTab === 'monthly') {
                                        return (
                                            <div className="mb-3 animate-fade-in overflow-visible rounded-2xl border border-orange-200/70 bg-gradient-to-b from-amber-50/90 via-[#fffdf7] to-white px-3 py-3.5 shadow-md shadow-orange-500/10 sm:mb-4 sm:px-5 sm:py-4">
                                                <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
                                                    {topPlayers.map((player, idx) => {
                                                        const rank = resolveRank(idx);
                                                        const isWinner = topPlayers.length === 1 ? true : idx === 1;
                                                        const superseded = isPrizeSuperseded(player);
                                                        const displayName = formatPodiumFirstName(player.full_name);
                                                        const avatarSize = isWinner
                                                            ? 'h-14 w-14 sm:h-16 sm:w-16'
                                                            : 'h-12 w-12 sm:h-14 sm:w-14';

                                                        return (
                                                            <div
                                                                key={player.user_id}
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => openUserProgress(player.user_id, player, rank)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openUserProgress(player.user_id, player, rank); }}
                                                                className={`flex min-h-[7.25rem] flex-col items-center justify-end cursor-pointer transition-transform active:scale-[0.97] sm:min-h-[8rem] ${isWinner && !superseded ? '-translate-y-0.5' : ''} ${superseded ? 'opacity-70' : ''}`}
                                                            >
                                                                <div className="relative mb-1.5 shrink-0">
                                                                    <ReadingLevelAvatarFrame
                                                                        level={player.training_level || 0}
                                                                        readingPoints={firstTimeReadingPointsFromLessons(completedLessonsForBadge(player))}
                                                                        language={language}
                                                                        sizeClass={avatarSize}
                                                                        avatarUrl={player.avatar_url}
                                                                        displayEdge={AVATAR_EDGE.card}
                                                                        fallbackLetter={displayName?.[0] || '?'}
                                                                        faded={superseded}
                                                                        onAvatarClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openMaximizedImage(player.avatar_url, e);
                                                                        }}
                                                                        cornerSlot={(
                                                                            <LeaderboardRankChip
                                                                                rank={rank}
                                                                                superseded={superseded}
                                                                                size="sm"
                                                                                className="absolute -left-1 -top-0.5 z-10 rounded bg-white/95 px-1 py-0.5 shadow-sm"
                                                                            />
                                                                        )}
                                                                    />
                                                                </div>
                                                                <p className={`max-w-full px-0.5 text-center text-[11px] font-black leading-tight sm:text-xs ${
                                                                    superseded ? 'text-slate-400 line-through' : 'text-slate-900'
                                                                } ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                    <span className="block truncate">{displayName}</span>
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // --- All-time: existing tall podium ---
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
                                        <div className="leaderboard-podium-stage relative mb-5 overflow-visible rounded-3xl border border-orange-200/70 bg-gradient-to-b from-amber-50 via-orange-50/50 to-white px-2 pb-2 pt-11 shadow-lg shadow-orange-500/10 sm:mb-6 sm:px-5 sm:pb-3 sm:pt-12">
                                            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden>
                                                <div className="absolute -left-8 top-0 h-36 w-36 rounded-full bg-amber-300/35 blur-3xl" />
                                                <div className="absolute -right-10 top-6 h-32 w-32 rounded-full bg-orange-400/25 blur-3xl" />
                                            </div>

                                            <div className="relative z-10 grid grid-cols-3 items-end gap-2 sm:gap-4">
                                            {topPlayers.map((player, idx) => {
                                                const isWinner = topPlayers.length === 1 ? true : (topPlayers.length === 2 ? idx === 1 : idx === 1);
                                                const rank = resolveRank(idx);
                                                const superseded = false;
                                                const displayName = formatPodiumFirstName(player.full_name);

                                                return (
                                                    <div
                                                        key={player.user_id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => openUserProgress(player.user_id, player, rank)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openUserProgress(player.user_id, player, rank); }}
                                                        className={`flex flex-col items-center cursor-pointer transition-transform active:scale-[0.97] ${isWinner ? '-translate-y-1.5' : ''}`}
                                                    >
                                                        <div className="relative mb-2.5 flex flex-col items-center">
                                                            {rank === 1 && (
                                                                <span className="pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 sm:-top-10" aria-hidden>
                                                                    <span className="animate-crown block text-2xl leading-none sm:text-3xl">👑</span>
                                                                </span>
                                                            )}
                                                            <div className={`relative ${isWinner ? 'h-[5.25rem] w-[5.25rem] sm:h-28 sm:w-28' : 'h-[4.35rem] w-[4.35rem] sm:h-24 sm:w-24'} shrink-0`}>
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
                                                                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-2xl font-black text-slate-500 sm:text-3xl">
                                                                            {displayName?.[0] || '?'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <p className={`mb-2 max-w-full px-0.5 text-center text-xs font-black leading-snug text-slate-900 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                            <span className="block truncate">{displayName}</span>
                                                        </p>

                                                        <div
                                                            className={`flex w-full items-start justify-center rounded-t-2xl pt-1.5 shadow-inner ${pedestalClass[rank]}`}
                                                            aria-hidden
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
                                            onClick={() => openUserProgress(item.user_id, item, rankLabel)}
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
                                                        <MonthlyHourlyAvgPill
                                                            hourly={item.hourly}
                                                            language={language}
                                                            encouragementBoards={encouragementBoards}
                                                            align="end"
                                                        />
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
                </div>

                {/* My Position Sticky Bar */}
                {!showHallOfFame && user && userRank && !loadingFull && leaderboardTab === 'all-time' && (() => {
                    const userBadge = getBadgeByLevel(
                        userProfile?.training_level || 0,
                        firstTimeReadingPointsFromLessons(userProfile?.completed_lessons)
                    );
                    return (
                        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] md:bottom-8 left-0 right-0 z-50 px-4 md:px-8 pointer-events-none">
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
                        </div>
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
                                fetchPriority="high"
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
        <div className="max-w-md mx-auto relative bg-[#fffdf7] text-slate-900 min-h-[100dvh] pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:min-h-screen md:pb-28">
            {/* 1. STICKY SCOREBOARD HEADER */}
            <div className="sticky top-0 z-30 shrink-0 border-b border-slate-200/80 bg-[#fffdf7]/95 backdrop-blur">
                <div className="px-3 py-2 sm:px-4 sm:py-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <h1 className={`truncate text-base font-black leading-tight tracking-tight text-slate-900 sm:text-lg ${language === 'bn' ? 'font-bengali normal-case' : ''}`}>
                                    {language === 'en' ? 'Hourly Quiz' : 'ঘণ্টার কুইজ'}
                                </h1>
                                <button
                                    type="button"
                                    onClick={() => setShowHourlyPenaltyInfoModal(true)}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-colors hover:bg-orange-50 sm:h-7 sm:w-7"
                                    aria-label={language === 'en' ? 'Penalty info' : 'পেনাল্টি তথ্য'}
                                >
                                    <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                        <circle cx="12" cy="12" r="10" />
                                        <path strokeLinecap="round" d="M12 6v6l4 2" />
                                    </svg>
                                </button>
                            </div>
                            <p className={`mt-0.5 hidden text-[10px] font-semibold text-slate-600 sm:block sm:text-[11px] ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {language === 'en' ? '5 quizzes / hour' : 'প্রতি ঘণ্টায় ৫ কুইজ'}
                            </p>
                        </div>
                        {userRank && (
                            <div className="flex shrink-0 items-center gap-1.5">
                                <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm sm:inline-flex ${currentUserBadge.color}`}>
                                    {language === 'en' ? currentUserBadge.en : currentUserBadge.bn}
                                </span>
                                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-black text-white shadow-sm shadow-orange-500/30 sm:px-2.5 sm:py-1 sm:text-sm">#{userRank.rank}</span>
                            </div>
                        )}
                    </div>

                    {!loading && (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:mt-3">
                        <div className="grid grid-cols-3 divide-x divide-slate-200/80">
                            <div className="bg-white px-1.5 py-2 text-center sm:px-3 sm:py-3">
                                <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-slate-500 sm:mb-1 sm:text-[9px]">{t.points}</p>
                                <p className="text-base font-black tabular-nums leading-none text-slate-900 sm:text-xl">{formatLeaderboardNumber(userRank?.score)}</p>
                            </div>
                            <div className="bg-orange-50 px-1.5 py-2 text-center sm:px-3 sm:py-3">
                                <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-orange-700 sm:mb-1 sm:text-[9px]">
                                    {language === 'en' ? 'Today · Net' : 'আজ · নেট'}
                                </p>
                                <p className="text-base font-black tabular-nums leading-none text-orange-600 sm:text-xl">
                                    <CountUpNumber
                                        value={getTodayNetScore()}
                                        format={(n) => `${n > 0 ? '+' : ''}${formatLeaderboardNumber(n)}`}
                                    />
                                </p>
                            </div>
                            <div className="bg-amber-50 px-1.5 py-2 text-center sm:px-3 sm:py-3">
                                <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-amber-700 sm:mb-1 sm:text-[9px]">{t.streak}</p>
                                <p className="font-black flex items-center justify-center gap-0.5 text-base leading-none text-amber-600 sm:gap-1 sm:text-xl">
                                    <span className="tabular-nums">{getStreak(buildHourlySlots())}</span>
                                    <span className="text-sm sm:text-base" aria-hidden>🔥</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    )}

                    {!loading && hourlyChaseMessage && (
                        <div className="mt-2 border-t border-dashed border-slate-200/80 pt-2">
                            <div className="rounded-2xl border border-dashed border-orange-200/80 bg-gradient-to-br from-orange-50 via-[#fffdf7] to-amber-50 px-2 py-1.5 shadow-sm">
                                <div className="flex items-start gap-1.5">
                                    <span className="mt-0.5 shrink-0 text-xs leading-none" aria-hidden>💪</span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`line-clamp-2 text-[10px] font-semibold leading-snug text-slate-800 sm:text-[11px] ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {hourlyChaseMessage}
                                        </p>
                                        {userRank?.rank > 1 && userRank?.rival && (
                                            <button
                                                type="button"
                                                onClick={goToGlobalLeaderboard}
                                                className={`mt-0.5 text-[9px] font-bold text-orange-600 transition-colors hover:text-orange-700 sm:text-[10px] ${language === 'bn' ? 'font-bengali' : ' tracking-wide'}`}
                                            >
                                                {language === 'en' ? 'Rankings →' : 'লিডারবোর্ড →'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. 24-HOUR DAY RING */}
            <div className="relative flex flex-col items-center px-3 pb-2 pt-3 sm:px-4 sm:pb-3 sm:pt-5" ref={ladderRef}>
                {loading ? (
                    <div
                        className="flex min-h-[min(70vh,520px)] w-full flex-col items-center justify-center py-8"
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
                        slots={[...buildHourlySlots()].reverse()}
                        language={language}
                        timeLeft={timeLeft}
                        loading={false}
                        hourlyQuizRefreshBusy={hourlyQuizRefreshBusy}
                        makeupPreview={getLiveMakeupPreview()}
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
                        onPlayLive={beginHourlyQuiz}
                        onReview={startReview}
                    />
                )}
                {userProfile?.role === 'admin' && !loading && (
                    <button
                        type="button"
                        disabled={hourlyQuizRefreshBusy}
                        onClick={() => { void beginHourlyQuiz({ bypassReadingGate: true }); }}
                        className={`mt-1.5 text-center text-[10px] font-bold text-slate-500 underline-offset-2 hover:text-orange-600 hover:underline disabled:opacity-50 ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {language === 'bn'
                            ? 'অ্যাডমিন: রিডিং লক ছাড়া প্রিভিউ'
                            : 'Admin: preview without reading lock'}
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
                                {(activeQuiz?.makeupMissed || 0) > 0 && (
                                    <p className={`text-xs sm:text-sm text-orange-700 font-bold ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {t.antiCheatExitMakeup}
                                    </p>
                                )}
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
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/55 animate-fade-in">
                    <div className="w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fffdf7] shadow-xl max-h-[90vh] flex flex-col">
                                                    {!quizSubmitted ? (
                            <>
                                <div className="flex items-center gap-2 border-b border-slate-200/80 bg-white px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3 shrink-0">
                                    <div className="min-w-0 flex-1">
                                        <h3 className={`truncate text-base font-black leading-tight text-slate-900 sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'bn' ? 'ঘণ্টার কুইজ' : 'Hourly quiz'}
                                        </h3>
                                        <div className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-bold tabular-nums text-slate-500 sm:text-xs ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            <span>{currentQuestionIndex + 1}/{quizQuestions.length}</span>
                                            {(activeQuiz?.makeupPacks || 1) > 1 && (
                                                <span className="text-orange-600">
                                                    · {language === 'en'
                                                        ? `Set ${Math.min(activeQuiz.makeupPacks, Math.floor(currentQuestionIndex / 5) + 1)}/${activeQuiz.makeupPacks}`
                                                        : `সেট ${Math.min(activeQuiz.makeupPacks, Math.floor(currentQuestionIndex / 5) + 1)}/${activeQuiz.makeupPacks}`}
                                                </span>
                                            )}
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
                                                className={`flex items-center gap-1 rounded-full border px-2 py-1 shadow-sm ${
                                                    packTimerUi.tone === 'green'
                                                        ? 'border-emerald-300 bg-emerald-500 text-white'
                                                        : 'border-amber-300 bg-amber-500 text-white'
                                                }`}
                                            >
                                                <svg className="h-3.5 w-3.5 opacity-95" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                                    <circle cx="12" cy="12" r="9" />
                                                    <path strokeLinecap="round" d="M12 7v5l3 2" />
                                                </svg>
                                                <span className="text-sm font-black tabular-nums leading-none tracking-tight">
                                                    {packTimerUi.tone === 'green' ? packTimerUi.badge : packTimerUi.pointsMark}
                                                </span>
                                                {packTimerUi.tone === 'green' && (
                                                    <span className="text-[11px] font-black leading-none opacity-95" aria-hidden>
                                                        {packTimerUi.pointsMark}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleAbortQuiz}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm hover:bg-orange-50 transition-colors"
                                            aria-label={language === 'bn' ? 'বন্ধ' : 'Close'}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-0 overflow-y-auto flex-1 p-3 sm:p-5 text-slate-900">
                                    <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 sm:mb-4">
                                        <div className="h-full bg-orange-600 transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}></div>
                                    </div>
                                    <div className="flex justify-between items-start gap-3 mb-4 sm:mb-6">
                                        <div className="flex-1 min-w-0">
                                            {quizQuestions[currentQuestionIndex]?.question_image_url && (
                                                <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                                                    {(() => {
                                                        const questionImageKey = `q_${quizQuestions[currentQuestionIndex]?.id || currentQuestionIndex}`;
                                                        return (
                                                            <>
                                                    <img
                                                        src={buildRetryImageSrc(quizQuestions[currentQuestionIndex]?.question_image_url, questionImageKey)}
                                                        alt={language === 'en' ? 'Question visual' : 'প্রশ্নের ছবি'}
                                                        className="w-full max-h-64 object-contain"
                                                        loading="lazy"
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
                                                                        className="mt-2 text-xs px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
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
                                            <div className="flex items-start justify-between gap-3">
                                                <h2 className={`min-w-0 flex-1 text-lg font-black leading-snug tracking-tight text-slate-950 sm:text-xl sm:leading-snug ${language === 'bn' ? 'font-bengali leading-relaxed sm:leading-relaxed' : ''}`}>
                                                    {quizQuestions[currentQuestionIndex]?.question_text}
                                                </h2>
                                                <button
                                                    type="button"
                                                    onClick={() => handleHourlyGoogleSearch(quizQuestions[currentQuestionIndex]?.question_text)}
                                                    className="shrink-0 p-2 rounded-full border border-slate-200/80 bg-white shadow-sm hover:bg-amber-50 text-slate-600 hover:text-amber-600 transition-all active:scale-90"
                                                    title={language === 'en' ? 'Search Google' : 'গুগল সার্চ'}
                                                >
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
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
                                            className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-slate-200/80 transition-all shadow-sm active:scale-95 ${(userAnswers[quizQuestions[currentQuestionIndex]?.id] !== undefined || reviewMode)
                                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-40'
                                                }`}
                                            title={hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) ? (language === 'en' ? 'Answer Locked (Hint Viewed)' : 'উত্তর লক করা হয়েছে (ইঙ্গিত দেখা হয়েছে)') : (userAnswers[quizQuestions[currentQuestionIndex]?.id] === undefined && !reviewMode ? t.hintDisabled : t.hint)}
                                        >
                                            <span className="text-xl">💡</span>
                                        </button>
                                    </div>

                                    {showHint && (userAnswers[quizQuestions[currentQuestionIndex]?.id] !== undefined || reviewMode) && (
                                        <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200/80 shadow-sm animate-fade-in">
                                            <div className="flex items-start gap-2">
                                                <span className="text-amber-500 mt-0.5">ℹ️</span>
                                                <p className={`text-sm text-amber-900 italic font-medium leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {quizQuestions[currentQuestionIndex]?.hint || t.noHint}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2.5">
                                        {quizQuestions[currentQuestionIndex]?.options?.map((option, idx) => {
                                            const isSelected = userAnswers[quizQuestions[currentQuestionIndex].id] === idx;
                                            const isCorrect = idx === quizQuestions[currentQuestionIndex].correct_option_index;

                                            let buttonClass = 'rounded-2xl border border-slate-200/80 bg-white hover:bg-orange-50 hover:border-orange-300 text-slate-950 shadow-sm';

                                            if (reviewMode) {
                                                if (isCorrect) buttonClass = 'rounded-2xl border border-emerald-300 bg-emerald-50 text-green-950 font-bold shadow-sm';
                                                else if (isSelected && !isCorrect) buttonClass = 'rounded-2xl border border-red-300 bg-red-50 text-red-950 font-bold shadow-sm';
                                                else buttonClass = 'rounded-2xl border border-slate-200 bg-slate-50 text-slate-800';
                                            } else if (isSelected) {
                                                buttonClass = 'rounded-2xl border border-orange-400 bg-orange-50 text-orange-950 font-bold shadow-sm';
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => !reviewMode && handleAnswerSelect(quizQuestions[currentQuestionIndex].id, idx)}
                                                    disabled={reviewMode || hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id)}
                                                    className={`w-full text-left p-3.5 transition-all duration-200 ${buttonClass} ${hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) && !reviewMode ? 'cursor-not-allowed' : ''}`}
                                                >
                                                    <span className="mr-3 font-mono font-black text-inherit opacity-80">{String.fromCharCode(65 + idx)}.</span>
                                                    {isImageOption(option) ? (
                                                        <>
                                                            <img
                                                                src={buildRetryImageSrc(option, `o_${quizQuestions[currentQuestionIndex]?.id || currentQuestionIndex}_${idx}`)}
                                                                alt={`${language === 'en' ? 'Option' : 'অপশন'} ${String.fromCharCode(65 + idx)}`}
                                                                className="inline-block max-h-28 w-auto max-w-full object-contain rounded"
                                                                loading="lazy"
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
                                                                    className="ml-2 text-[11px] px-2 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-700"
                                                                >
                                                                    {language === 'en' ? 'Retry' : 'রিলোড'}
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className={`text-sm sm:text-base font-bold leading-snug text-inherit ${language === 'bn' ? 'font-bengali leading-relaxed' : ''}`}>
                                                            {option}
                                                        </span>
                                                    )}
                                                    {reviewMode && isCorrect && <span className="float-right text-green-600">✓</span>}
                                                    {reviewMode && isSelected && !isCorrect && <span className="float-right text-red-600">✗</span>}
                                                    {hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) && !reviewMode && isSelected && <span className="float-right text-slate-400">🔒</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 p-4 sm:p-6 border-t border-slate-200/80 bg-white shrink-0">
                                    <div className="flex justify-between items-center">
                                        <button
                                            type="button"
                                            disabled={currentQuestionIndex === 0}
                                            onClick={() => {
                                                setCurrentQuestionIndex((prev) => prev - 1);
                                                setShowHint(false);
                                            }}
                                            className="rounded-full border border-slate-200/80 bg-white px-4 py-2 font-bold text-sm text-slate-700 shadow-sm disabled:opacity-30"
                                        >
                                            ← Prev
                                        </button>
                                        {currentQuestionIndex === quizQuestions.length - 1 ? (
                                            <button
                                                type="button"
                                                disabled={!reviewMode && !hourlyCurrentAnswered}
                                                onClick={reviewMode ? () => setActiveQuiz(null) : submitQuiz}
                                                aria-disabled={!reviewMode && !hourlyCurrentAnswered}
                                                className={`px-6 py-2.5 font-bold text-sm transition-colors ${
                                                    reviewMode
                                                        ? 'rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm'
                                                        : hourlyCurrentAnswered
                                                          ? 'rounded-full bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'
                                                          : 'rounded-full border border-slate-200/80 bg-white text-slate-400 opacity-50 cursor-not-allowed'
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
                                                className={`px-6 py-2.5 font-bold text-sm transition-colors ${
                                                    reviewMode || hourlyCurrentAnswered
                                                        ? 'rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                                                        : 'rounded-full border border-slate-200/80 bg-white text-slate-400 opacity-50 cursor-not-allowed'
                                                }`}
                                            >
                                                Next →
                                            </button>
                                        )}
                                    </div>
                                    {!reviewMode && !hourlyCurrentAnswered && (
                                        <p
                                            className={`text-center text-xs font-semibold text-amber-700 ${language === 'bn' ? 'font-bengali' : ''}`}
                                            role="status"
                                        >
                                            {t.selectAnswerToContinue}
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : submitRejected ? (
                            <div className="text-center py-6 px-4 sm:px-6 overflow-y-auto">
                                <div className="w-20 h-20 rounded-full bg-red-50 text-red-600 text-4xl flex items-center justify-center mx-auto mb-4">⛔</div>
                                <h2 className={`text-2xl font-black text-slate-900 mb-3 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {submitRejected.type === 'time'
                                        ? (language === 'en' ? 'Score not counted' : 'স্কোর গণনা হয়নি')
                                        : (language === 'en' ? 'Not saved' : 'সংরক্ষণ হয়নি')}
                                </h2>
                                <p className={`mx-auto mb-6 max-w-md text-sm leading-relaxed text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {submitRejected.message}
                                </p>
                                {submitRejected.type === 'time' && (
                                    <div className={`mx-auto mb-6 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? 'How to fix: Phone Settings → Date & time → turn ON "Set automatically". Then reopen the hourly challenge.'
                                            : 'সমাধান: ফোন সেটিংস → তারিখ ও সময় → "স্বয়ংক্রিয়ভাবে সেট করুন" চালু করুন। তারপর আবার ঘণ্টার চ্যালেঞ্জ খুলুন।'}
                                    </div>
                                )}
                                <button type="button" onClick={() => { handleAbortQuiz(); setQuizSubmitted(false); setSubmitRejected(null); }} className="w-full py-3 rounded-full bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/30 transition-all hover:bg-orange-600 active:scale-[0.99]">
                                    {t.close}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-6 px-4 sm:px-6 overflow-y-auto">
                                <div className={`w-20 h-20 rounded-full text-4xl flex items-center justify-center mx-auto mb-4 ${isGuestUser(userProfile) ? 'bg-sky-50 text-sky-600' : 'bg-green-50 text-green-600'}`}>
                                    {isGuestUser(userProfile) ? '👀' : '🎉'}
                                </div>
                                <h2 className={`text-2xl font-black text-slate-900 mb-6 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {isGuestUser(userProfile)
                                        ? (language === 'en' ? 'Preview complete' : 'প্রিভিউ সম্পন্ন')
                                        : t.completed}
                                </h2>

                                <div className="flex flex-col items-center justify-center mb-8 animate-scale-in">
                                    <div className={`text-6xl sm:text-7xl font-black mb-2 ${(quizResults?.score || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {(quizResults?.score || 0) > 0 ? '+' : ''}{quizResults?.score || 0}
                                    </div>
                                    <div className={`text-xs sm:text-sm font-bold uppercase tracking-widest ${(quizResults?.score || 0) >= 0 ? 'text-green-600/80' : 'text-red-600/80'}`}>
                                        {isGuestUser(userProfile)
                                            ? (language === 'en' ? 'Practice score' : 'অনুশীলন স্কোর')
                                            : ((quizResults?.score || 0) >= 0
                                                ? (language === 'en' ? 'Points Earned' : 'পয়েন্ট অর্জিত')
                                                : (language === 'en' ? 'Points Lost' : 'পয়েন্ট হারানো'))}
                                    </div>
                                </div>

                                {isGuestUser(userProfile) && (
                                    <div className={`mx-auto mb-6 max-w-md rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-xs leading-relaxed text-sky-900 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {guestPreviewText(language, 'hourlyResultGuest')}
                                    </div>
                                )}

                                {(quizResults?.makeupMissed || 0) > 0 && (
                                    <p className={`mx-auto mb-4 max-w-md text-center text-xs leading-relaxed text-slate-600 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {getMakeupCopy(
                                            language,
                                            quizResults.makeupMissed,
                                            quizResults.makeupPacks,
                                            (quizResults.makeupPacks || 1) * 50
                                        ).resultsNote}
                                    </p>
                                )}
                                {(quizResults?.latePacks || 0) > 0 && (
                                    <p className={`mx-auto mb-6 max-w-md text-center text-xs leading-relaxed text-amber-700 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? `${quizResults.latePacks} set(s) finished after green time → those points are half.`
                                            : `${quizResults.latePacks}টি সেট সবুজ সময়ের পরে শেষ — সেগুলোর পয়েন্ট অর্ধেক।`}
                                    </p>
                                )}

                                <div className={`mx-auto mb-8 grid max-w-md gap-3 ${(quizResults?.penalty || 0) > 0 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 shadow-sm">
                                        <div className="text-[10px] font-bold text-green-600 uppercase tracking-tighter mb-1">
                                            {language === 'bn' ? 'সঠিক' : 'Right'}
                                        </div>
                                        <div className="text-lg font-black text-green-700 tabular-nums">+{quizResults?.pointsEarned || 0}</div>
                                    </div>
                                    {(quizResults?.penalty || 0) > 0 && (
                                        <div className="rounded-2xl border border-red-100 bg-red-50 p-3 shadow-sm">
                                            <div className="text-[10px] font-bold text-red-600 uppercase tracking-tighter mb-1">
                                                {language === 'bn' ? 'পেনাল্টি' : 'Penalty'}
                                            </div>
                                            <div className="text-lg font-black text-red-700 tabular-nums">-{quizResults.penalty}</div>
                                        </div>
                                    )}
                                </div>
                                {(quizResults?.skipped || 0) > 0 && (
                                    <p className={`mb-6 text-center text-[11px] text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? `This saved attempt includes ${quizResults.skipped} unanswered question(s) from an older format. New quizzes require every answer.`
                                            : `আগের বারের কুইজে ${quizResults.skipped}টি প্রশ্নের উত্তর দেওয়া হয়নি। নতুন নিয়ম অনুযায়ী সব প্রশ্নের উত্তর দেওয়া বাধ্যতামূলক।`}
                                    </p>
                                )}

                                {/* Sync Status Footer */}
                                {!isGuestUser(userProfile) && (
                                    <div className="mt-2 mb-6 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm max-w-xs mx-auto text-xs font-bold">
                                        {syncStatus === 'syncing' && (
                                            <div className="flex items-center justify-center gap-2 text-amber-600">
                                                <span className="h-2 w-2 animate-ping rounded-full bg-amber-500" />
                                                {language === 'en' ? 'Syncing with server...' : 'সার্ভারের সাথে সিঙ্ক হচ্ছে...'}
                                            </div>
                                        )}
                                        {syncStatus === 'success' && (
                                            <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                                                <span>✓</span>
                                                {language === 'en' ? 'Successfully saved to server!' : 'সার্ভারে সফলভাবে সংরক্ষিত হয়েছে!'}
                                            </div>
                                        )}
                                        {syncStatus === 'failed' && (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="text-red-600">
                                                    ⚠️ {language === 'en' ? 'Failed to save to server' : 'সার্ভারে সেভ করা যায়নি'}
                                                    {syncErrorMessage && <p className="text-[10px] text-slate-500 font-normal mt-0.5">{syncErrorMessage}</p>}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => submitHourlyQuiz(
                                                        quizResults?.pointsEarned,
                                                        quizResults?.penalty,
                                                        quizResults?.quizId || activeQuiz?.id || null
                                                    )}
                                                    className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase text-[10px] shadow-sm active:scale-95"
                                                >
                                                    {language === 'en' ? 'Retry Save' : 'পুনরায় চেষ্টা করুন'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button type="button" onClick={() => { handleAbortQuiz(); setQuizSubmitted(false); }} className="w-full py-3 rounded-full bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/30 transition-all hover:bg-orange-600 active:scale-[0.99]">
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
