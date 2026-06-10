import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { getBadgeByLevel } from '../utils/badgeUtils';
import { cacheHelper } from '../utils/cacheHelper';
import { storageUtils } from '../utils/storageUtils';
import { leaderboardService } from '../utils/leaderboardService';
import { requestManager } from '../utils/requestManager';
import { visualQuizService } from '../utils/visualQuizService';
import {
    filterQuestionsForTier,
    getHourlyStakesUi,
    getHourlyTier,
    getLifetimePoints,
    getPenaltyPerWrongForLifetime,
    pickQuestionsByDifficultyMix
} from '../utils/hourlyDifficulty';
import { DotLottiePlayer } from '@dotlottie/react-player';
import sandyLoading from '../assets/SandyLoading.lottie';
import HourlyPenaltyInfoModal from './HourlyPenaltyInfoModal';
import { MonthlyBoardHeader } from './MonthlyEncouragementBoards';
import MonthlyBoardInfoModal from './MonthlyBoardInfoModal';
import { checkReadingGate } from '../utils/readingHabitGate';
import { filterCoreCompletedLessonIds } from '../utils/trainingLessonIds';
import ReadingGateModal from './ReadingGateModal';
import {
    getEncouragementCopy,
    getHallOfFameWinners,
    getMonthlyBoardMeta,
    getMonthlyPrizeDisplayList,
    getMonthlyStandingsForPodium,
    formatMonthlyPlayerScore,
    getRankMedal,
    isPrizeSuperseded,
    isPrizeRecipient,
    PRIZE_STATUS,
    MONTHLY_SUB_TAB,
    MONTHLY_SUB_TAB_ORDER,
} from '../utils/monthlyEncouragementBoards';

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

const extractDriveFileId = (url) => {
    if (!url || typeof url !== 'string') return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\/|[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? (match[1] || match[2] || '') : '';
};

const buildDriveImageCandidates = (url) => {
    const trimmed = String(url || '').trim();
    if (!trimmed) return [];
    if (!trimmed.includes('drive.google.com')) return [trimmed];

    const id = extractDriveFileId(trimmed);
    if (!id) return [trimmed];

    return [
        `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
        `https://drive.google.com/uc?export=view&id=${id}`,
        `https://lh3.googleusercontent.com/d/${id}=w1200`
    ];
};

const toDisplayImageUrl = (url) => {
    const candidates = buildDriveImageCandidates(url);
    return candidates[0] || '';
};

const isImageOption = (option) => {
    const value = String(option || '').trim().toLowerCase();
    return (
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('/') ||
        value.includes('.png') ||
        value.includes('.jpg') ||
        value.includes('.jpeg') ||
        value.includes('.webp') ||
        value.includes('.gif')
    );
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

const handleImageLoadError = (event, originalUrl) => {
    const img = event.currentTarget;
    if (!img) return false;

    const candidates = buildDriveImageCandidates(originalUrl);
    if (!candidates.length) return true;

    const currentIndex = Number.parseInt(img.dataset.fallbackIndex || '0', 10);
    const nextIndex = currentIndex + 1;

    if (nextIndex < candidates.length) {
        img.dataset.fallbackIndex = String(nextIndex);
        img.src = candidates[nextIndex];
        return false;
    }
    return true;
};

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
    
    // Default to short date
    return date.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short' });
};

function formatChaseDisplayName(fullName) {
    const trimmed = (fullName || '').trim();
    if (!trimmed || trimmed.includes('@')) return null;
    const first = trimmed.split(/\s+/)[0];
    return first.length > 18 ? `${first.slice(0, 16)}…` : first;
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

function buildHourlyChaseMessage({ language, userRank, hoursLeft }) {
    if (!userRank) return null;

    const fmt = (n) => Number(n || 0).toLocaleString('en-US');
    const isBn = language === 'bn';

    if (userRank.rank === 1) {
        return isBn
            ? 'আপনি এখন শীর্ষে! প্রতি ঘণ্টার কুইজ খেলতে থাকুন — এক নম্বর ধরে রাখতে হবে।'
            : "You're #1 right now — keep playing every hour to stay on top.";
    }

    const rival = userRank.rival;
    if (!rival?.full_name) {
        return isBn
            ? (hoursLeft > 0
                ? `আজ আরও ${fmt(hoursLeft)}টা ঘণ্টার কুইজ বাকি। খেলতে থাকুন, পয়েন্ট জমতে থাকবে।`
                : 'আজকের সব ঘণ্টা শেষ — কাল আবার শুরু করুন, পয়েন্ট জমতে থাকবে।')
            : (hoursLeft > 0
                ? `${fmt(hoursLeft)} hour${hoursLeft === 1 ? '' : 's'} left today — keep playing to climb the board.`
                : "Today's hours are done — come back tomorrow and keep building your score.");
    }

    const name = formatChaseDisplayName(rival.full_name) || (isBn ? 'সহপ্রতিযোগী' : 'the player ahead');
    const gap = Math.max(0, rival.gap ?? 0);
    const rankLabel = rival.rank ? `#${rival.rank}` : '';
    const hoursBitBn = hoursLeft > 0
        ? ` আজ আরও ${fmt(hoursLeft)}টা ঘণ্টা বাকি — খেললে কাছে আসা সম্ভব।`
        : '';
    const hoursBitEn = hoursLeft > 0
        ? ` ${fmt(hoursLeft)} hour${hoursLeft === 1 ? '' : 's'} left today — play them to close the gap.`
        : '';

    if (gap <= 10) {
        return isBn
            ? `${name}${rankLabel ? ` (${rankLabel})` : ''} এর থেকে মাত্র ${fmt(gap)} পয়েন্ট পিছিয়ে! ভালো খেললে এক ঘণ্টাই যথেষ্ট।${hoursBitBn}`
            : `Only ${fmt(gap)} point${gap === 1 ? '' : 's'} behind ${name}${rankLabel ? ` (${rankLabel})` : ''}! One strong hour could do it.${hoursBitEn}`;
    }

    return isBn
        ? `${name}${rankLabel ? ` (${rankLabel})` : ''} এর চেয়ে ${fmt(gap)} পয়েন্ট কম।${hoursBitBn || ' ধীরে ধীরে ঘণ্টা ঘণ্টা খেললে জমে উঠবে।'}`
        : `You're ${fmt(gap)} points behind ${name}${rankLabel ? ` (${rankLabel})` : ''}.${hoursBitEn || ' Steady hour-by-hour play adds up.'}`;
}

export default function Competitions({ language = 'bn', user, setCurrentView, isFullLeaderboard = false, userProfile, refreshProfile, onOpenUserProgress }) {
    const [loading, setLoading] = useState(true);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [quizResults, setQuizResults] = useState(null);
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
    const [loadingFull, setLoadingFull] = useState(isFullLeaderboard);
    const [serverTimeOffset, setServerTimeOffset] = useState(0);
    const [fetchError, setFetchError] = useState(false);
    const [showCompactView, setShowCompactView] = useState(!isFullLeaderboard);
    const [leaderboardTab, setLeaderboardTab] = useState('all-time'); // 'all-time' or 'monthly'
    const [monthlyBoardTab, setMonthlyBoardTab] = useState(MONTHLY_SUB_TAB.CHAMPION);
    const [monthlyLeaderboard, setMonthlyLeaderboard] = useState([]);
    const [encouragementBoards, setEncouragementBoards] = useState(null);
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
    const [showHallOfFame, setShowHallOfFame] = useState(false);
    const [hallOfFameBoardTab, setHallOfFameBoardTab] = useState(MONTHLY_SUB_TAB.CHAMPION);
    const [hallOfFameData, setHallOfFameData] = useState([]);
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [maximizedAvatar, setMaximizedAvatar] = useState(null);
    const [showHallCelebration, setShowHallCelebration] = useState(false);
    const hallCelebrationShownRef = React.useRef(false);

    React.useEffect(() => {
        hourlyQuizRef.current = hourlyQuiz;
    }, [hourlyQuiz]);

    React.useEffect(() => {
        activeQuizRef.current = activeQuiz;
    }, [activeQuiz]);

    React.useEffect(() => {
        hourlyQuizRefreshBusyRef.current = hourlyQuizRefreshBusy;
    }, [hourlyQuizRefreshBusy]);

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
        }
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
            questions: quizQuestions,
            currentIndex: currentQuestionIndex,
            answers: userAnswers,
            hints: Array.from(hintViewedQuestions),
            timestamp: Date.now()
        };
        storageUtils.setItem('slm_hourly_active_quiz_state', state);
    }, [activeQuiz, quizQuestions, currentQuestionIndex, userAnswers, hintViewedQuestions, quizSubmitted]);

    useEffect(() => {
        const checkResumption = () => {
            const savedState = storageUtils.getItem('slm_hourly_active_quiz_state');
            if (savedState && hourlyQuiz && savedState.quizId === hourlyQuiz.id) {
                const stateTime = new Date(savedState.timestamp);
                const now = getSyncedTime();

                // Only resume if it's the same hour/day
                if (stateTime.getHours() === now.getHours() && stateTime.getDate() === now.getDate()) {
                    setQuizQuestions(savedState.questions);
                    setCurrentQuestionIndex(savedState.currentIndex);
                    setUserAnswers(savedState.answers);
                    setHintViewedQuestions(new Set(savedState.hints || []));
                    setActiveQuiz(hourlyQuiz);
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
            topPlayersToday: "Top Players Today",
            viewAll: "View All",
            antiCheatExitTitle: "Exit Quiz?",
            antiCheatExitDesc: "Exiting now will submit this hourly challenge with 0 points.",
            antiCheatExitPenalty: "This is an anti-cheating safeguard and cannot be undone.",
            antiCheatStay: "Continue Quiz",
            antiCheatExitConfirm: "Exit with 0 Points",
            searchLimitTitle: "Search Quota",
            searchConfirm: "Do you want to search Google? You have 2 searches per session (Used: %s/2).",
            searchExhausted: "Quota exhausted! You have used all 2 searches.",
            searchProceed: "Proceed",
            noDistrict: "No Update",
            leaderboardTimeInfo:
                "The server uses one time zone and your phone uses another, so “This month” here can look a little different from your calendar. All points still count—nothing is removed, and the contest stays fair."
        },
        bn: {
            title: "প্রতিযোগিতা",
            weekly: "সাপ্তাহিক চ্যালেঞ্জ",
            hourly: "ঘন্টাভিত্তিক কুইজ",
            play: "খেলুন",
            questions: "প্রশ্ন",
            mins: "মিনিট",
            points: "পয়েন্ট",
            leaderboard: "লিডারবোর্ড",
            completed: "কুইজ সম্পন্ন!",
            score: "আপনার স্কোর",
            close: "বন্ধ করুন",
            loginReq: "অংশগ্রহণ করতে লগইন করুন",
            highStakes: "হাই স্টেক",
            highStakesDesc: "মোট পয়েন্ট অনুযায়ী প্রতিটি ভুল উত্তরে পয়েন্ট কাটা হবে",
            selectAnswerToContinue: "চালিয়ে যেতে একটি উত্তর বেছে নিন।",
            syncing: "আপনার স্কোর সিঙ্ক হচ্ছে...",
            waitingNetwork: "নেটওয়ার্ক সংযোগের জন্য অপেক্ষা করা হচ্ছে...",
            autoRetry: "স্বয়ংক্রিয় পুনঃচেষ্টা সক্রিয়",
            previousPending: "পূর্ববর্তী প্রচেষ্টা সিঙ্কের জন্য অপেক্ষমাণ",
            retryNow: "এখনই পুনঃচেষ্টা করুন",
            syncSuccess: "স্কোর সফলভাবে সিঙ্ক হয়েছে!",
            syncFailed: "সিঙ্ক ব্যর্থ হয়েছে। অনুগ্রহ করে পুনঃচেষ্টা করুন।",
            hint: "ইঙ্গিত",
            hintDisabled: "ইঙ্গিত দেখতে একটি উত্তর নির্বাচন করুন",
            noHint: "এই প্রশ্নের জন্য কোনো ইঙ্গিত নেই",
            streak: "একটানা",
            missedTitle: "চ্যালেঞ্জ মিস করেছেন",
            missedDesc: "অর্জিত পয়েন্ট = ০",
            upcomingStatus: "আসন্ন চ্যালেঞ্জ",
            scoreLabel: "স্কোর",
            challengeCompleted: "চ্যালেঞ্জ সম্পন্ন",
            penaltyApplied: "পেনাল্টি প্রযোজ্য",
            perfectScore: "চমৎকার স্কোর!",
            liveNow: "এখন লাইভ",
            nextChallengeLabel: "পরবর্তী চ্যালেঞ্জ",
            upcomingPowerPlay: "পাওয়ার প্লে",
            startsIn: "শুরু",
            closingIn: "শেষ হতে বাকি",
            timeLeft: "সময় বাকি",
            topPlayersToday: "আজকের সেরা খেলোয়াড়",
            viewAll: "সব দেখুন",
            antiCheatExitTitle: "কুইজ থেকে বের হবেন?",
            antiCheatExitDesc: "এখন বের হলে এই ঘণ্টার চ্যালেঞ্জ ০ পয়েন্টে সাবমিট হবে।",
            antiCheatExitPenalty: "এটি এন্টি-চিট সুরক্ষা এবং পরে পরিবর্তন করা যাবে না।",
            antiCheatStay: "কুইজ চালিয়ে যান",
            antiCheatExitConfirm: "০ পয়েন্টে বের হোন",
            searchLimitTitle: "সার্চ লিমিট",
            searchConfirm: "আপনি কি এটি গুগলে খুঁজতে চান? প্রতি সেশনে আপনি মাত্র ২ বার সার্চ করতে পারবেন (ব্যবহৃত: %s/২)।",
            searchExhausted: "দুঃখিত! আপনার ২টির সার্চের কোটা শেষ হয়ে গেছে।",
            searchProceed: "সার্চ করুন",
            noDistrict: "আপডেট নেই",
            leaderboardTimeInfo:
                "সার্ভার ও ফোনের টাইম জোন আলাদা হওয়ায় ‘এই মাস’-এর নম্বরে সামান্য পার্থক্য দেখা যেতে পারে। তবে নিশ্চিন্ত থাকুন—সব পয়েন্টই সঠিকভাবে গণনা হচ্ছে। এগিয়ে চলুন! 💪"
        }
    }[language];

    const currentUserBadge = getBadgeByLevel((userProfile && userProfile.training_level) || 0);
    const hourlyLifetimePoints = getLifetimePoints(userProfile, userRank);
    const hourlyStakesUi = getHourlyStakesUi(hourlyLifetimePoints, language);
    const [showHourlyPenaltyInfoModal, setShowHourlyPenaltyInfoModal] = useState(false);
    const [showMonthlyBoardInfoModal, setShowMonthlyBoardInfoModal] = useState(false);
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
                promises.push(fetchFullLeaderboard(forceRefresh));
            } else {
                promises.push(fetchHourlyQuiz());
            }

            // Only fetch leaderboard if user is logged in
            if (user) {
                promises.push(fetchLeaderboard());
                promises.push(fetchTodayAttempts());
                promises.push(fetchUserRank(forceRefresh));
                
                // Background Pre-fetching for smoother experience
                // These won't block the main UI if they take longer
                fetchMonthlyLeaderboard(forceRefresh);
                fetchHallOfFameGallery(forceRefresh);
            }

            await Promise.all(promises);
        } catch (error) {
            console.error("Error loading competition data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Passing forceRefresh=true on mount or manual refresh
        loadData(true); 
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
        // Timer Logic
        const updateTimer = () => {
            const now = getSyncedTime();
            const minutes = 59 - now.getMinutes();
            const seconds = 59 - now.getSeconds();
            setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [serverTimeOffset]); // Update timer when offset is calculated

    // Simplified Hourly Quiz ID Generation
    const getHourlyQuizId = () => {
        const now = getSyncedTime();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        return `hourly-challenge-${year}-${month}-${day}-${hour}`;
    };

    // --- GAMIFIED LADDER: Data Layer ---
    const fetchTodayAttempts = async () => {
        if (!user) return;
        const now = getSyncedTime();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
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

    // Scroll to live node on mount/update
    useEffect(() => {
        if (ladderRef.current && !loading) {
            setTimeout(() => {
                const liveNode = document.getElementById('node-live') || document.getElementById('node-upcoming-next');
                if (liveNode) {
                    liveNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }
    }, [todayAttempts, loading, showCompactView]);


    const buildHourlySlots = () => {
        const now = getSyncedTime();
        const currentHour = now.getHours();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

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
            const last = new Date(lastAttemptTime);
            return last.getFullYear() === now.getFullYear() &&
                last.getMonth() === now.getMonth() &&
                last.getDate() === now.getDate() &&
                last.getHours() === currentHour;
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

            slots.push({
                hour: h,
                status,
                score: attempt?.score ?? null,
                penalty: attempt?.penalty ?? null,
                label: `${hour12} ${ampm}`,
            });
        }
        // Render 23 at top, 0 at bottom
        return slots.reverse();
    };

    const getTodayScore = () => todayAttempts.reduce((sum, a) => sum + (a.score || 0), 0);

    const getStreak = (slots) => {
        const now = getSyncedTime();
        const currentHour = now.getHours();
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

    const hourlyChaseMessage = useMemo(() => {
        if (isFullLeaderboard || !user || loading || !userRank) return null;
        const hoursLeft = buildHourlySlots().filter((slot) => (
            slot.status === 'live' || slot.status === 'upcoming' || slot.status === 'upcoming-next'
        )).length;
        return buildHourlyChaseMessage({ language, userRank, hoursLeft });
    }, [isFullLeaderboard, user, loading, language, userRank, todayAttempts, lastAttemptTime, serverTimeOffset]);


    /**
     * Direct submission logic for Hourly Quiz
     * No background queues. No complex retries.
     * Simple: Try -> Success (Lock) OR Fail (Show Error)
     */
    const submitHourlyQuiz = async (score, penalty) => {
        setIsSyncing(true);
        setSyncStatus('syncing');
        setSyncErrorMessage(null);

        // 1. Strict ID for the current hour
        const quizId = getHourlyQuizId();

        // 2. Sanitize Inputs (Postgres expects Integers)
        const cleanScore = Math.round(Number(score)) || 0;
        const cleanPenalty = Math.round(Number(penalty)) || 0;

        const params = {
            p_quiz_id: quizId,
            p_score: cleanScore,
            p_user_id: user.id
        };

        // Only attach penalty if non-zero (Matches Training.jsx success pattern)
        if (cleanPenalty > 0) {
            params.p_penalty = cleanPenalty;
        }

        console.log('Submitting Hourly Quiz:', params);

        try {
            // 3. Direct RPC Call
            const { error } = await supabase.rpc('submit_quiz_result_v2', params);

            if (error) throw error;

            // 3. Success: Lock the UI immediately
            setSyncStatus('success');

            // Update local state to show "Locked" view
            // We use the timestamp we generated to safeguard against drift
            const now = getSyncedTime();
            setLastAttemptTime(now.toISOString());
            setLastAttemptPenalty(penalty);

            // Update cache to prevent stale reads on reload
            const cacheKey = `last_attempt_${user.id}_${hourlyQuiz?.id}`; // Keep using hourlyQuiz.id for cache key consistency if needed, OR switch to strict ID. 
            // Better to use the strict ID for cache to avoid ambiguity? 
            // actually, hourlyQuiz.id in state currently comes from fetchHourlyQuiz which uses YYYYMMDDHH. 
            // Let's stick to updating the state that drives the UI.

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
            refreshProfile(user);

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
            window.open(`https://www.google.com/search?q=${query}`, '_blank');
            setShowSearchModal(false);
        }
    };

    /**
     * Safe wrapper for submit_quiz_result RPC
     * Handles cases where the database might not have the p_penalty parameter yet
     */
    const safeSubmitQuizResult = async (quizId, score, penalty = 0) => {
        // Use V2 function to bypass ambiguity issues
        // Simplify arguments to match successful pattern in Training.jsx
        const params = {
            p_quiz_id: quizId,
            p_score: score
        };

        // Only add penalty if explicitly present and non-zero
        if (penalty) {
            params.p_penalty = penalty;
        }

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

        const now = getSyncedTime();
        // Use simpler strict format: YYYY-MM-DD-HH
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const hourId = `${year}-${month}-${day}-${hour}`;

        const cacheKey = `hourly_quiz_db_bn_v4_${hourId}`;

        try {
            const quizData = await requestManager.fetch(
                cacheKey,
                async () => {
                    const [{ data, error }, visualQuestions] = await Promise.all([
                        supabase.rpc('get_random_hourly_questions', {
                            lang: 'bn',
                            // Larger pool for difficulty-tagged selection (5 shown per user).
                            limit_count: 50
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
                            title: language === 'en' ? 'Hourly Safety Challenge' : 'প্রতি ঘন্টায় সুরক্ষা চ্যালেঞ্জ',
                            description: language === 'en' ? 'Test your safety knowledge! New questions every hour.' : 'আপনার সুরক্ষা জ্ঞান পরীক্ষা করুন! প্রতি ঘন্টায় নতুন প্রশ্ন।',
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
    const beginHourlyQuiz = async () => {
        if (isFullLeaderboard) return;
        if (!user) {
            setCurrentView('login');
            return;
        }
        const completedLessons = filterCoreCompletedLessonIds(
            Array.isArray(userProfile?.completed_lessons) ? userProfile.completed_lessons : []
        );
        const gate = await checkReadingGate({
            userId: user.id,
            completedLessons,
            trainingChapters: null,
        });
        if (!gate.allowed) {
            setReadingGateBlock({ ...gate, userId: user.id });
            return;
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
        if (!user) return;

        try {
            const cacheKey = `user_rank_all_time_${user.id}`;

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
            const cacheKey = 'leaderboard_top_10_all_time';

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

                    return data.map(item => ({
                        ...item,
                        points: item.score ?? 0,
                        reading_points: item.reading_points ?? 0
                    }));
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
        setLoadingMonthly(true);
        try {
            const [data, boards] = await Promise.all([
                leaderboardService.fetchMonthly(forceRefresh),
                leaderboardService.fetchEncouragementBoards(forceRefresh, language),
            ]);
            if (data) setMonthlyLeaderboard(data);
            if (boards) setEncouragementBoards(boards);
        } catch (error) {
            console.error('Error fetching monthly leaderboard:', error);
        } finally {
            setLoadingMonthly(false);
        }
    };

    const fetchHallOfFameGallery = async (forceRefresh = false) => {
        const hasCurrentBoards = hallOfFameData.length > 0
            && hallOfFameData[0]?.boardsVersion === 8;
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

    const goToGlobalLeaderboard = () => {
        if (typeof setCurrentView === 'function') {
            setCurrentView('leaderboard');
        }
    };

    const openUserProgress = (userId) => {
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
            const last = new Date(lastAttemptTime);
            if (last.getFullYear() === now.getFullYear() &&
                last.getMonth() === now.getMonth() &&
                last.getDate() === now.getDate() &&
                last.getHours() === now.getHours()) {
                return;
            }
        }

        setActiveQuiz(quiz);
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

            const lifetimePoints = getLifetimePoints(userProfile, userRank);
            const tier = getHourlyTier(lifetimePoints);
            const eligibleForBand = filterQuestionsForTier(baseQuestions, tier);
            const selectionPool = eligibleForBand.length >= 5 ? eligibleForBand : baseQuestions;

            const shuffledQuestions = shuffleArray(selectionPool, rng);
            const recentImageSet = getRecentImageSet();
            const freshnessSorted = [...shuffledQuestions].sort((a, b) => {
                const aHasRecent = getQuestionImageKeys(a).some((img) => recentImageSet.has(img));
                const bHasRecent = getQuestionImageKeys(b).some((img) => recentImageSet.has(img));
                if (aHasRecent === bHasRecent) return 0;
                return aHasRecent ? 1 : -1; // non-recent visuals first
            });
            const picked = pickQuestionsByDifficultyMix(freshnessSorted, lifetimePoints, 5);

            // Ensure at least 1 visual question when available in the pool.
            const hasVisualInPool = freshnessSorted.some((q) => isVisualQuestion(q));
            const hasVisualInPicked = picked.some((q) => isVisualQuestion(q));
            if (hasVisualInPool && !hasVisualInPicked) {
                const fallbackVisual = freshnessSorted.slice(5).find((q) => isVisualQuestion(q));
                if (fallbackVisual) {
                    picked[picked.length - 1] = fallbackVisual;
                }
            }

            // Cap visual questions to max 2 when possible.
            const getVisualCount = (arr) => arr.filter((q) => isVisualQuestion(q)).length;
            let visualCount = getVisualCount(picked);
            if (visualCount > 2) {
                const remainingPool = freshnessSorted.slice(5);
                const pickedIds = () => new Set(picked.map((q) => String(q?.id || '')));
                for (let i = 0; i < picked.length && visualCount > 2; i++) {
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
        setReviewMode(false);
        setShowHint(false);
        setHintViewedQuestions(new Set());
    };

    const handleAbortQuiz = () => {
        if (activeQuiz && !quizSubmitted && !reviewMode) {
            setShowAbortWarningModal(true);
            return;
        }
        setActiveQuiz(null);
    };

    const confirmAbortQuiz = () => {
        // Submit with 0 score and max penalty rules applied in backend logic
        submitHourlyQuiz(0, 0);
        setActiveQuiz(null);
        storageUtils.removeItem('slm_hourly_active_quiz_state');
        setShowAbortWarningModal(false);
    };

    const cancelAbortQuiz = () => {
        setShowAbortWarningModal(false);
    };

    const startReview = () => {
        if (!hourlyQuiz) return;

        // Check for correct ID format first
        let saved = storageUtils.getItem(`review_${hourlyQuiz.id}`);

        // Fallback: Check for legacy ID (no dashes) if strict ID not found
        if (!saved) {
            const legacyId = hourlyQuiz.id.replace(/-/g, '').replace('hourlychallenge', 'hourly-challenge'); // simplistic fallback attempt or just reconstruct
            // Actually, easier to just check the other likely key
            // Our strict ID is hourly-challenge-YYYY-MM-DD-HH
            // Previous bad ID was hourly-challenge-YYYYMMDDHH
            const parts = hourlyQuiz.id.split('hourly-challenge-');
            if (parts.length > 1) {
                const ts = parts[1]; // YYYY-MM-DD-HH
                const legacyTs = ts.replace(/-/g, '');
                saved = storageUtils.getItem(`review_hourly-challenge-${legacyTs}`);
            }
        }

        if (!saved) return;
        const data = JSON.parse(saved);

        setActiveQuiz(hourlyQuiz);
        setQuizQuestions(data.questions);
        setUserAnswers(data.answers);
        setScore(data.score);
        setReviewMode(true);
        setQuizSubmitted(false);
        setCurrentQuestionIndex(0);
    };

    const calculatePenalty = (answers) => {
        const perWrong = getPenaltyPerWrongForLifetime(getLifetimePoints(userProfile, userRank));
        if (!perWrong || quizQuestions.length === 0) return 0;

        const wrongCount = quizQuestions.filter((q) =>
            answers[String(q.id)] !== undefined &&
            Number(answers[String(q.id)]) !== Number(q.correct_option_index)
        ).length;

        return wrongCount * perWrong;
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

        let calculatedScore = 0;
        let correctCount = 0;
        let wrongCount = 0;

        quizQuestions.forEach(q => {
            if (userAnswers[q.id] === q.correct_option_index) {
                correctCount++;
            } else {
                wrongCount++;
            }
        });

        let pointsPerQuestion = 10;
        if (activeQuiz && activeQuiz.points_reward && quizQuestions.length > 0) {
            pointsPerQuestion = Math.floor(activeQuiz.points_reward / quizQuestions.length);
        }
        calculatedScore = correctCount * pointsPerQuestion;

        const perWrong = getPenaltyPerWrongForLifetime(getLifetimePoints(userProfile, userRank));
        const penalty = perWrong
            ? quizQuestions.reduce((acc, q) => {
                const answer = userAnswers[String(q.id)];
                if (answer === undefined || Number(answer) !== Number(q.correct_option_index)) {
                    return acc + perWrong;
                }
                return acc;
            }, 0)
            : 0;
        
        // Final score for UI display
        const netScore = Math.max(0, calculatedScore - penalty);
        setScore(netScore);

        setQuizResults({
            correct: correctCount,
            wrong: quizQuestions.filter(q => userAnswers[q.id] !== undefined && userAnswers[q.id] !== q.correct_option_index).length,
            skipped: quizQuestions.filter(q => userAnswers[q.id] === undefined).length,
            penalty: penalty,
            score: netScore,
            pointsEarned: correctCount * pointsPerQuestion
        });
        setQuizSubmitted(true);

        // Save for Review (Local Storage) - Store the final net score for display
        const attemptData = {
            timestamp: new Date().toISOString(),
            questions: quizQuestions,
            answers: userAnswers,
            score: netScore, // User sees net score in review
            penalty: penalty
        };
        storageUtils.setItem(`review_${activeQuiz.id}`, JSON.stringify(attemptData));

        if (activeQuiz && activeQuiz.id === hourlyQuiz?.id) {
            setLastAttemptTime(attemptData.timestamp);
            const cacheKey = `last_attempt_${user.id}_${activeQuiz.id}`;
            cacheHelper.set(cacheKey, attemptData.timestamp, 5);
        }

        if (user) {
            // Send base score and penalty separately to RPC (which handles the math)
            await submitHourlyQuiz(calculatedScore, penalty);
        }
    };

    const hourlyCurrentQuestion =
        activeQuiz && Array.isArray(quizQuestions) && quizQuestions.length > 0
            ? quizQuestions[currentQuestionIndex]
            : null;
    const hourlyCurrentAnswered =
        reviewMode ||
        !!(hourlyCurrentQuestion && userAnswers[String(hourlyCurrentQuestion.id)] !== undefined);

    if (isFullLeaderboard) {
        return (
            <main className="neo-brutal min-h-screen text-slate-900">
                <div className="nb-hazard sticky top-0 z-[41]" aria-hidden="true" />

                {/* Header Section */}
                <div className="sticky top-[6px] z-40 bg-[#fffdf7]">
                    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                                        {showHallOfFame 
                                            ? <><span className="text-2xl sm:text-3xl">✨</span> {language === 'en' ? 'Monthly Stars' : 'মাসের সেরারা'}</>
                                            : <><span className="text-2xl sm:text-3xl inline-block animate-spin-slow">🌍</span> {language === 'en' ? 'Global Rankings' : 'গ্লোবাল র‍্যাঙ্কিং'}</>
                                        }
                                    </h1>
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        if (!showHallOfFame) fetchHallOfFameGallery();
                                        setShowHallOfFame(!showHallOfFame);
                                    }}
                                    className={`group relative flex items-center justify-center text-center px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black transition-all active:translate-x-0.5 active:translate-y-0.5 ${
                                        showHallOfFame
                                        ? 'nb-btn-secondary !shadow-[3px_3px_0_#0f172a]'
                                        : 'nb-btn-indigo !shadow-[3px_3px_0_#0f172a]'
                                    }`}
                                >
                                    <span className="text-xs sm:text-sm font-black tracking-tight">
                                        {showHallOfFame
                                            ? (language === 'en' ? 'Leaderboard' : 'লিডারবোর্ড')
                                            : (language === 'en' ? 'Bijoyi' : 'বিজয়ী')}
                                    </span>

                                    {/* Pulsating Star Accent */}
                                    <div className={`absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center pointer-events-none ${showHallOfFame ? 'text-amber-400' : 'text-indigo-200'}`}>
                                        <svg className="w-full h-full star-pulsate" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z"/>
                                        </svg>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            {/* Tab Navigation - All-Time vs Monthly */}
            {!showHallOfFame && (
                <div className="bg-[#fffdf7] pt-2 pb-3">
                    <div className="max-w-xs mx-auto px-3">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setLeaderboardTab('all-time')}
                                className={`flex-1 py-2 text-xs sm:text-sm font-black border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 ${leaderboardTab === 'all-time' ? 'bg-orange-500 text-white' : 'bg-white text-slate-700 hover:bg-orange-50'}`}
                            >
                                {language === 'en' ? 'All-Time' : 'সর্বকালীন'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLeaderboardTab('monthly');
                                    if (monthlyLeaderboard.length === 0) fetchMonthlyLeaderboard();
                                }}
                                className={`flex-1 py-2 text-xs sm:text-sm font-black border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 ${leaderboardTab === 'monthly' ? 'bg-orange-500 text-white' : 'bg-white text-slate-700 hover:bg-orange-50'}`}
                            >
                                {language === 'en' ? 'This Month' : 'এই মাস'}
                            </button>
                        </div>
                    </div>

                    {leaderboardTab === 'monthly' && (
                        <div className="mt-2 max-w-lg mx-auto px-3 overflow-x-auto">
                            <div className="flex min-w-max gap-1.5">
                                {MONTHLY_SUB_TAB_ORDER.map((tabId) => (
                                    <button
                                        key={tabId}
                                        type="button"
                                        onClick={() => setMonthlyBoardTab(tabId)}
                                        className={`whitespace-nowrap px-2.5 py-1.5 text-[10px] sm:text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 ${monthlyBoardTab === tabId ? 'bg-orange-500 text-white' : 'bg-white text-slate-700 hover:bg-orange-50'}`}
                                    >
                                        {encouragementCopy.monthlyTabs[tabId]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showHallOfFame ? (
                    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
                        {/* Overlay removed for professional cleaner look */}

                        {loadingGallery ? (
                            <div className="flex flex-col items-center justify-center py-20 pointer-events-none">
                                <div className="nb-card bg-white p-6 flex flex-col items-center gap-4">
                                    <div className="w-[120px] h-[120px] border-[3px] border-slate-900 bg-orange-50 shadow-[3px_3px_0_#0f172a] flex items-center justify-center overflow-hidden">
                                        <DotLottiePlayer src={sandyLoading} autoplay loop style={{ width: '100px', height: '100px' }} />
                                    </div>
                                    <p className="text-slate-800 font-black nb-mono uppercase tracking-[0.2em] text-[10px] animate-pulse">{language === 'en' ? 'Opening the Gallery…' : 'গ্যালারি খোলা হচ্ছে…'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5 sm:space-y-8 max-w-7xl mx-auto px-0 md:px-8">
                                <div className="nb-card bg-amber-50 p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl sm:text-2xl mt-0.5">🎉</span>
                                        <p className="font-bengali text-sm sm:text-base font-bold text-slate-700">
                                            মাসের বিজয়ীদের অভিনন্দন! পুরস্কার সংক্রান্ত আপডেট পেতে আমাদের Facebook পেজ ফলো করুন এবং WhatsApp গ্রুপে যুক্ত থাকুন।
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                        <a href="https://www.facebook.com/smartlineman" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 border-2 border-slate-900 bg-white text-[#1877F2] shadow-[2px_2px_0_#0f172a] hover:bg-blue-50 transition-colors">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" /></svg>
                                        </a>
                                        <a href="https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 border-2 border-slate-900 bg-white text-[#25D366] shadow-[2px_2px_0_#0f172a] hover:bg-green-50 transition-colors">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                        </a>
                                    </div>
                                </div>

                                <div className="max-w-lg mx-auto overflow-x-auto px-1">
                                    <div className="flex min-w-max gap-1.5">
                                        {MONTHLY_SUB_TAB_ORDER.map((tabId) => (
                                            <button
                                                key={tabId}
                                                type="button"
                                                onClick={() => setHallOfFameBoardTab(tabId)}
                                                className={`whitespace-nowrap px-2.5 py-1.5 text-[10px] sm:text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 ${hallOfFameBoardTab === tabId ? 'bg-orange-500 text-white' : 'bg-white text-slate-700 hover:bg-orange-50'}`}
                                            >
                                                {encouragementCopy.monthlyTabs[tabId]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <p className={`text-center text-[10px] sm:text-[11px] text-slate-600 font-semibold px-4 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {encouragementCopy.hallOfFamePrizeNote}
                                </p>

                            <div className="grid grid-cols-1 gap-6 sm:gap-8">
                                {hallOfFameData.map((entry, idx) => {
                                    const monthWinners = getHallOfFameWinners(entry, hallOfFameBoardTab);
                                    return (
                                    <div 
                                        key={`${entry.year}-${entry.month}-${hallOfFameBoardTab}`} 
                                        className="animate-slide-up"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className="nb-card p-4 sm:p-6 md:p-8 bg-white transition-all duration-300">
                                            
                                            {/* Header Section */}
                                            <div className="mb-4 sm:mb-6 border-b-2 border-slate-900 pb-3 sm:pb-4">
                                                <h3 className={`text-lg sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {new Date(entry.year, entry.month - 1).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' })}
                                                </h3>
                                            </div>

                                            {/* Winners Horizontal Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                                {monthWinners.length === 0 ? (
                                                    <p className="col-span-full nb-card border-dashed bg-amber-50 px-4 py-8 text-center text-xs text-slate-600 font-semibold">
                                                        {language === 'en' ? 'No winners for this category that month.' : 'সেই মাসে এই তালিকায় কেউ উঠেননি।'}
                                                    </p>
                                                ) : monthWinners.map((winner, winIdx) => {
                                                    const superseded = isPrizeSuperseded(winner);
                                                    const prizeRecipient = isPrizeRecipient(winner);
                                                    const medalRank = superseded
                                                        ? winner.standing_rank
                                                        : (winner.prize_rank || winner.standing_rank || winIdx + 1);
                                                    const isGold = !superseded && medalRank === 1;
                                                    
                                                    return (
                                                        <div 
                                                            key={`${winner.user_id}-${winner.prize_status || 'row'}-${winIdx}`} 
                                                            onClick={() => openUserProgress(winner.user_id)}
                                                            className={`relative p-3 sm:p-4 border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] transition-colors cursor-pointer flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-4 group active:translate-x-0.5 active:translate-y-0.5 ${
                                                                superseded
                                                                    ? 'bg-slate-100 opacity-60 grayscale hover:opacity-75'
                                                                    : prizeRecipient
                                                                        ? 'bg-orange-50 hover:bg-orange-100'
                                                                        : 'bg-white hover:bg-orange-50/40'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0 shadow-sm bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                                <span className={`text-lg ${superseded ? 'opacity-50' : ''}`}>
                                                                    {getRankMedal(medalRank)}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-1 sm:w-full items-center sm:items-start gap-3 min-w-0">
                                                                <div 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (winner.avatar_url) setMaximizedAvatar(winner.avatar_url);
                                                                    }}
                                                                    className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm cursor-zoom-in active:scale-95 transition-transform"
                                                                >
                                                                    {winner.avatar_url ? <img src={winner.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400">{(winner.full_name || '?')[0]}</div>}
                                                                </div>
                                                                
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                                        <p className={`text-xs sm:text-sm font-black truncate transition-colors ${
                                                                            superseded
                                                                                ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-400/70'
                                                                                : 'text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400'
                                                                        }`}>{winner.full_name || 'Anonymous'}</p>
                                                                        {superseded && (
                                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold bg-slate-200/80 text-slate-500 dark:bg-slate-700 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                                {encouragementCopy.prizeSuperseded}
                                                                            </span>
                                                                        )}
                                                                        {winner.prize_status === PRIZE_STATUS.REPLACEMENT && (
                                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                                {encouragementCopy.prizeReplacement}
                                                                            </span>
                                                                        )}
                                                                        {(() => {
                                                                            const badge = getBadgeByLevel(winner.training_level || 0, winner.all_time_reading_points || 0);
                                                                            return badge && (
                                                                                <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase ${badge.color}`}>
                                                                                    {language === 'en' ? badge.en : badge.bn}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-semibold leading-tight text-slate-500">
                                                                        <span className="shrink-0 tabular-nums nb-mono text-slate-600">
                                                                            {winner.slm_id || (language === 'en' ? 'SLM-MEMBER' : 'এসএলএম-সদস্য')}
                                                                        </span>
                                                                        <span className="shrink-0 text-slate-300" aria-hidden>·</span>
                                                                        <span className={`truncate ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                            {winner.district || t.noDistrict}
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="text-right sm:text-left shrink-0">
                                                                <p className={`text-base sm:text-xl font-black tabular-nums ${
                                                                    superseded
                                                                        ? 'text-slate-400 dark:text-slate-500'
                                                                        : isGold
                                                                            ? 'text-amber-600 dark:text-amber-500'
                                                                            : medalRank === 2
                                                                                ? 'text-slate-600 dark:text-slate-400'
                                                                                : 'text-orange-600 dark:text-orange-500'
                                                                }`}>
                                                                    {formatMonthlyPlayerScore(winner, hallOfFameBoardTab)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                            </div>
                        )}

                        <div className="h-20"></div>
                    </div>
                ) : (
                    <>
                    <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-3 pb-48 md:pb-56">
                    {leaderboardTab === 'monthly' && !loadingMonthly && monthlyBoardMeta && (
                        <div className="max-w-2xl mx-auto px-2">
                            <MonthlyBoardHeader
                                meta={monthlyBoardMeta}
                                language={language}
                                onInfoClick={() => setShowMonthlyBoardInfoModal(true)}
                            />
                        </div>
                    )}

                    {/* Winners Podium / List Container */}
                    <div className="space-y-4">
                        {(leaderboardTab === 'all-time' ? loadingFull : loadingMonthly) ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="nb-icon-badge w-14 h-14 flex items-center justify-center bg-orange-100 mb-3">
                                    <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                                </div>
                                <p className="text-xs font-black text-slate-600 mt-2 uppercase tracking-widest nb-mono">{t.loadingText || 'Loading Rankings...'}</p>
                            </div>
                        ) : (leaderboardTab === 'all-time' ? fullLeaderboard : activeMonthlyList).length > 0 ? (
                            <>
                                {/* Top 3 Podium (Reused logic) */}
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
                                    
                                    return (
                                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 items-end">
                                            {topPlayers.map((player, idx) => {
                                                const isWinner = topPlayers.length === 1 ? true : (topPlayers.length === 2 ? idx === 1 : idx === 1);
                                                const rank = topPlayers.length === 1 ? 1 : (topPlayers.length === 2 ? (idx === 0 ? 2 : 1) : (idx === 0 ? 2 : idx === 1 ? 1 : 3));
                                                const superseded = leaderboardTab === 'monthly' && isPrizeSuperseded(player);
                                                
                                                return (
                                                    <div key={player.user_id} className={`flex flex-col items-center ${isWinner && !superseded ? 'scale-110 mb-2' : 'mb-0'} ${superseded ? 'opacity-50 grayscale' : isWinner ? '' : 'opacity-90'}`}>
                                                        <div className="relative mb-3 flex flex-col items-center">
                                                            <div className="relative h-14 w-14 sm:h-20 sm:w-20 shrink-0">
                                                                {rank === 1 && (
                                                                    <div
                                                                        className="pointer-events-none absolute -right-3 -top-3 z-30 flex items-start justify-end sm:-right-4 sm:-top-4"
                                                                        aria-hidden
                                                                    >
                                                                        <span className="text-[1.2rem] leading-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)] sm:text-[1.45rem] dark:drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)]">
                                                                            👑
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (player.avatar_url) setMaximizedAvatar(player.avatar_url);
                                                                    }}
                                                                    className={`absolute inset-0 overflow-hidden border-2 border-slate-900 shadow-[3px_3px_0_#0f172a] cursor-zoom-in active:scale-95 transition-transform ${rank === 1 ? 'bg-amber-100' : rank === 2 ? 'bg-slate-100' : 'bg-orange-100'}`}
                                                                >
                                                                    {player.avatar_url ? <img src={player.avatar_url} className="h-full w-full object-cover" alt="" /> : <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xl font-bold text-slate-400 dark:bg-slate-800">{player.full_name?.[0]}</div>}

                                                                    {/* Status Indicator in Corner */}
                                                                    {(() => {
                                                                        const lastActiveDate = player.last_active || player.last_login_at;
                                                                        if (!lastActiveDate) return null;
                                                                        const date = new Date(lastActiveDate);
                                                                        const now = new Date();
                                                                        const diffInSeconds = Math.floor((now - date) / 1000);
                                                                        const isOnline = diffInSeconds < 300;
                                                                        const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

                                                                        if (!isToday) return null;

                                                                        return (
                                                                            <span className="absolute bottom-1 right-1 z-20 flex h-3 w-3">
                                                                                {isOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>}
                                                                                <span className={`relative inline-flex h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${isOnline ? 'bg-green-500' : 'bg-green-500/60'}`}></span>
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <div className={`nb-rank-badge absolute -bottom-2 left-1/2 z-20 flex h-6 w-6 -translate-x-1/2 items-center justify-center text-[10px] sm:h-8 sm:w-8 sm:text-xs ${rank === 1 ? 'bg-amber-400 text-amber-950' : rank === 2 ? 'bg-slate-300 text-slate-900' : 'bg-orange-300 text-orange-950'}`}>
                                                                {rank}
                                                            </div>
                                                        </div>
                                                        <p className={`text-[10px] sm:text-xs font-black truncate max-w-full text-center px-1 leading-tight ${
                                                            superseded
                                                                ? 'text-slate-500 dark:text-slate-400 line-through'
                                                                : 'text-slate-900 dark:text-white'
                                                        }`}>{player.full_name}</p>
                                                        {superseded && (
                                                            <p className={`text-[8px] font-bold text-slate-400 mt-0.5 text-center ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {encouragementCopy.prizeSuperseded}
                                                            </p>
                                                        )}
                                                        {leaderboardTab === 'monthly' && (
                                                            <p className="text-[7px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                                                                {player.district || t.noDistrict}
                                                            </p>
                                                         )}
                                                        <div className="flex items-center gap-1 mb-1">
                                                            {(() => {
                                                                const badge = getBadgeByLevel(
                                                                    player.training_level || 0, 
                                                                    player.all_time_reading_points !== undefined ? player.all_time_reading_points : (player.reading_points || 0)
                                                                );
                                                                return badge && (
                                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-tighter ${badge.color}`}>
                                                                        {language === 'en' ? badge.en : badge.bn}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <p className="text-[11px] font-black text-orange-600 dark:text-orange-400 tabular-nums">
                                                                {leaderboardTab === 'monthly'
                                                                    ? formatMonthlyPlayerScore(player, monthlyBoardTab)
                                                                    : (player.points || player.score || 0).toLocaleString()}
                                                            </p>
                                                            {leaderboardTab === 'all-time' && (
                                                                <div className="flex items-center gap-1 mt-0.5 opacity-80 scale-90">
                                                                    <span className="text-[9px]">📖</span>
                                                                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">{(player.reading_points || 0).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

                                {/* List View for others */}
                                <div className="nb-card overflow-hidden p-0 bg-white">
                                    {(leaderboardTab === 'all-time' ? fullLeaderboard : activeMonthlyList).map((item, idx) => {
                                        const superseded = leaderboardTab === 'monthly' && isPrizeSuperseded(item);
                                        const prizeRecipient = leaderboardTab === 'monthly' && isPrizeRecipient(item);
                                        const rankLabel = leaderboardTab === 'monthly' && item.standing_rank != null
                                            ? item.standing_rank
                                            : idx + 1;

                                        return (
                                        <div 
                                            key={`${item.user_id}-${item.prize_status || 'row'}-${idx}`}
                                            onClick={() => openUserProgress(item.user_id)}
                                            className={`flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 border-b-2 border-slate-900 last:border-b-0 transition-colors cursor-pointer group active:bg-orange-50/50 ${
                                                superseded
                                                    ? 'bg-slate-100 opacity-60 grayscale hover:opacity-75'
                                                    : prizeRecipient
                                                        ? 'bg-orange-50 hover:bg-orange-100/70'
                                                        : 'bg-white hover:bg-orange-50/30'
                                            }`}
                                        >
                                            <div className={`w-6 sm:w-8 shrink-0 text-center text-xs sm:text-sm font-black nb-mono transition-colors ${
                                                superseded ? 'text-slate-400' : 'text-slate-600 group-hover:text-orange-600'
                                            }`}>
                                                {rankLabel}
                                            </div>
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (item.avatar_url) setMaximizedAvatar(item.avatar_url);
                                                }}
                                                className="w-9 h-9 sm:w-10 sm:h-10 bg-white overflow-hidden border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] shrink-0 relative cursor-zoom-in active:scale-95 transition-transform"
                                            >
                                                {item.avatar_url ? <img src={item.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">{item.full_name?.[0]}</div>}
                                                
                                                {/* Status Indicator in Corner */}
                                                {(item.last_active || item.last_login_at) && (() => {
                                                    const lastActiveDate = item.last_active || item.last_login_at;
                                                    const date = new Date(lastActiveDate);
                                                    const now = new Date();
                                                    const diffInSeconds = Math.floor((now - date) / 1000);
                                                    const isOnline = diffInSeconds < 300;
                                                    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                                    
                                                    if (!isToday) return null;

                                                    return (
                                                        <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5 z-10">
                                                            {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-green-500' : 'bg-green-500/60'} border-2 border-white dark:border-slate-900`}></span>
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col mb-0.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className={`text-sm font-black truncate ${
                                                            superseded
                                                                ? 'text-slate-500 line-through decoration-slate-400/70'
                                                                : 'text-slate-900'
                                                        }`}>{item.full_name}</p>
                                                        {superseded && (
                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold bg-slate-200/80 text-slate-500 dark:bg-slate-700 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {encouragementCopy.prizeSuperseded}
                                                            </span>
                                                        )}
                                                        {item.prize_status === PRIZE_STATUS.REPLACEMENT && (
                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {encouragementCopy.prizeReplacement} · #{item.prize_rank}
                                                            </span>
                                                        )}
                                                        {(() => {
                                                            const badge = getBadgeByLevel(
                                                                item.training_level || 0, 
                                                                item.all_time_reading_points !== undefined ? item.all_time_reading_points : (item.reading_points || 0)
                                                            );
                                                            return badge && (
                                                                <span className={`text-[7px] px-1 py-0 rounded-sm border font-black uppercase tracking-tighter ${badge.color}`}>
                                                                    {language === 'en' ? badge.en : badge.bn}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                    {leaderboardTab === 'monthly' && (
                                                       <>
                                                           <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                                               <span className="w-1 h-1 rounded-full bg-orange-400"></span>
                                                               {item.district || t.noDistrict}
                                                           </p>
                                                           {item.eligibility_note && (
                                                               <p className="text-[9px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                                                                   {item.eligibility_note}
                                                               </p>
                                                           )}
                                                       </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {(item.last_active || item.last_login_at) && (() => {
                                                            const lastActiveDate = item.last_active || item.last_login_at;
                                                            const date = new Date(lastActiveDate);
                                                            const now = new Date();
                                                            const diffInSeconds = Math.floor((now - date) / 1000);
                                                            const isOnline = diffInSeconds < 300;
                                                            const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                                            
                                                            return (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`text-[10px] font-bold uppercase tracking-tight ${isOnline ? 'text-green-600 dark:text-green-400' : isToday ? 'text-green-600/70 dark:text-green-400/70' : 'text-slate-400'}`}>
                                                                        {isOnline 
                                                                            ? (language === 'en' ? 'Online' : 'অনলাইন') 
                                                                            : formatLastActive(lastActiveDate, language)
                                                                        }
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    {leaderboardTab === 'all-time' && (
                                                        <div className="nb-score-pill flex items-center gap-1 px-1.5 py-0.5 shrink-0 !text-[9px]">
                                                            <span className="text-[9px]">📖</span>
                                                            <span className="text-[9px] font-black tabular-nums">
                                                                {(item.reading_points || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`text-sm font-black tabular-nums nb-mono ${
                                                    superseded ? 'text-slate-400' : 'text-orange-700'
                                                }`}>
                                                    {leaderboardTab === 'monthly'
                                                        ? formatMonthlyPlayerScore(item, monthlyBoardTab)
                                                        : (item.points || item.score || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-16">
                                <div className="nb-card inline-block px-6 py-8 bg-white">
                                    <p className="text-slate-600 font-semibold italic">
                                {leaderboardTab === 'monthly' && monthlyBoardMeta?.emptyHint
                                    ? monthlyBoardMeta.emptyHint
                                    : (language === 'en' ? 'No rankings found for this category.' : 'এই বিভাগে কোনো র‍্যাঙ্কিং পাওয়া যায়নি।')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* My Position Sticky Bar */}
                {!showHallOfFame && user && userRank && !loadingFull && leaderboardTab === 'all-time' && (() => {
                    const userBadge = getBadgeByLevel(userProfile?.training_level || 0);
                    return (
                        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] md:bottom-8 left-0 right-0 z-50 px-4 md:px-8 pointer-events-none">
                            <div className="max-w-3xl mx-auto">
                                <div className="nb-card bg-white p-2.5 sm:p-4 pointer-events-auto border-orange-500">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="nb-label text-orange-700 mb-1">
                                                {language === 'en' ? 'Your Standing' : 'আপনার অবস্থান'}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xl sm:text-2xl font-black text-slate-900 nb-mono">#{userRank.rank}</p>
                                                {userBadge && (
                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${userBadge.color}`}>
                                                        {language === 'en' ? userBadge.en : userBadge.bn}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-black text-slate-800 ml-1 tabular-nums nb-mono">{(userRank.score || 0).toLocaleString()}</p>
                                                    <div className="nb-score-pill flex items-center gap-1 px-1.5 py-0.5 !text-[9px]">
                                                        <span className="text-[10px]">📖</span>
                                                        <span className="text-[9px] font-black tabular-nums">
                                                            {(userRank.reading_points || 0).toLocaleString()} <span className="text-[8px] opacity-70 ml-0.5">{language === 'en' ? 'RDG' : 'রিডিং'}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (userProfile?.avatar_url) setMaximizedAvatar(userProfile.avatar_url);
                                            }}
                                            className="w-10 h-10 sm:w-12 sm:h-12 bg-white flex items-center justify-center font-black text-orange-600 border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] overflow-hidden shrink-0 cursor-zoom-in active:scale-95 transition-transform"
                                        >
                                            {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (userProfile?.full_name?.[0] || 'U')}
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
                    <div className="absolute inset-0 bg-slate-900/55" onClick={() => setMaximizedAvatar(null)} aria-hidden="true" />
                    <div className="neo-brutal relative max-w-2xl w-full aspect-square bg-white overflow-hidden shadow-[4px_4px_0_#0f172a] animate-scale-in border-[2.5px] border-slate-900">
                        <button
                            type="button"
                            onClick={() => setMaximizedAvatar(null)}
                            className="absolute top-4 right-4 z-50 w-10 h-10 border-2 border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0_#0f172a] flex items-center justify-center"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <img src={maximizedAvatar} className="w-full h-full object-cover" alt="Maximized Avatar" />
                    </div>
                </div>
            )}

            <MonthlyBoardInfoModal
                open={showMonthlyBoardInfoModal}
                language={language}
                meta={monthlyBoardMeta}
                encouragementData={encouragementBoards}
                userId={user?.id}
                timeInfo={monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION ? t.leaderboardTimeInfo : null}
                onClose={() => setShowMonthlyBoardInfoModal(false)}
            />
        </main>
        );
    }

    return (
        <div className="neo-brutal max-w-md mx-auto min-h-screen relative pb-[calc(11rem+env(safe-area-inset-bottom))] md:pb-24 bg-[#fffdf7] text-slate-900">
            {/* 1. STICKY SCOREBOARD HEADER */}
            <div className="sticky top-0 z-30 border-b-2 border-slate-900 bg-[#fffdf7]">
                <div className="nb-hazard shrink-0" aria-hidden="true" />
                <div className="px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <h1 className={`flex min-w-0 items-center gap-1.5 text-base font-black tracking-tight text-slate-900 ${language === 'bn' ? 'font-bengali normal-case' : 'nb-mono uppercase'}`}>
                                <span className="shrink-0 text-lg" aria-hidden>🏆</span>
                                <span className="truncate">{language === 'en' ? '5 Quiz / Hour' : '৫ কুইজ / ঘণ্টা'}</span>
                            </h1>
                            <button
                                type="button"
                                onClick={() => setShowHourlyPenaltyInfoModal(true)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-slate-700 shadow-[2px_2px_0_#0f172a] transition-colors hover:bg-orange-50"
                                aria-label={language === 'en' ? 'Penalty info' : 'পেনাল্টি তথ্য'}
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                    <circle cx="12" cy="12" r="10" />
                                    <path strokeLinecap="round" d="M12 6v6l4 2" />
                                </svg>
                            </button>
                        </div>
                        {userRank && (
                            <div className="flex shrink-0 items-center gap-1.5">
                                <span className={`nb-tag px-2 py-0.5 text-[10px] font-bold ${currentUserBadge.color}`}>
                                    {language === 'en' ? currentUserBadge.en : currentUserBadge.bn}
                                </span>
                                <span className="nb-rank-badge bg-white px-2 py-0.5 text-sm font-black text-slate-800">#{userRank.rank}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="nb-card bg-white p-2 text-center">
                            <p className="nb-stat-label mb-0.5 text-[9px] leading-tight">{t.points}</p>
                            <p className="nb-stat-value text-base tabular-nums leading-none">{userRank?.score?.toLocaleString() || 0}</p>
                        </div>
                        <div className="nb-card bg-orange-50 p-2 text-center">
                            <p className="nb-stat-label mb-0.5 text-[9px] leading-tight text-orange-600">{language === 'en' ? 'Today' : 'আজ'}</p>
                            <p className="nb-stat-value text-base tabular-nums leading-none text-orange-600">+{getTodayScore().toLocaleString()}</p>
                        </div>
                        <div className="nb-card bg-amber-50 p-2 text-center">
                            <p className="nb-stat-label mb-0.5 text-[9px] leading-tight text-amber-600">{t.streak}</p>
                            <p className="nb-stat-value flex items-center justify-center gap-1 text-base leading-none text-amber-600">
                                {getStreak(buildHourlySlots())} <span className="text-sm">🔥</span>
                            </p>
                        </div>
                    </div>

                    {hourlyChaseMessage && (
                        <div className="mt-2.5 border-t-2 border-dashed border-slate-900/25 pt-2.5">
                            <div className="nb-card border-dashed bg-gradient-to-br from-orange-50 via-[#fffdf7] to-amber-50 px-2.5 py-2">
                                <div className="flex items-start gap-2">
                                    <span className="mt-0.5 shrink-0 text-sm leading-none" aria-hidden>💪</span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-[11px] font-semibold leading-snug text-slate-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {hourlyChaseMessage}
                                        </p>
                                        {userRank?.rank > 1 && userRank?.rival && (
                                            <button
                                                type="button"
                                                onClick={goToGlobalLeaderboard}
                                                className={`mt-1 text-[10px] font-bold text-orange-600 transition-colors hover:text-orange-700 ${language === 'bn' ? 'font-bengali' : 'nb-mono uppercase tracking-wide'}`}
                                            >
                                                {language === 'en' ? 'See full rankings →' : 'পুরো লিডারবোর্ড দেখুন →'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. HOURLY TIMELINE */}
            <div className="relative px-4 py-5" ref={ladderRef}>
                <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="nb-tag flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-800">
                        <span className="h-2 w-2 border border-slate-900 bg-emerald-500" aria-hidden />
                        {language === 'en' ? 'Done' : 'সম্পন্ন'}
                    </span>
                    <span className="nb-tag flex items-center gap-1.5 bg-orange-50 px-2 py-0.5 text-[9px] font-black text-orange-800">
                        <span className="h-2 w-2 border border-slate-900 bg-orange-500" aria-hidden />
                        {language === 'en' ? 'Live' : 'লাইভ'}
                    </span>
                    <span className="nb-tag flex items-center gap-1.5 bg-white px-2 py-0.5 text-[9px] font-black text-slate-600">
                        <span className="h-2 w-2 border border-dashed border-slate-500 bg-white" aria-hidden />
                        {language === 'en' ? 'Upcoming' : 'আসছে'}
                    </span>
                </div>

                {loading ? (
                    <div className="space-y-2 pl-7">
                        {Array(6).fill(0).map((_, i) => (
                            <div key={i} className="nb-card h-11 animate-pulse bg-white" />
                        ))}
                    </div>
                ) : (
                    <div className="relative pl-7">
                        <div className="absolute bottom-2 left-[9px] top-2 w-0.5 bg-slate-300" aria-hidden />

                        {buildHourlySlots().map((slot) => {
                            const isLive = slot.status === 'live';
                            const isPlayed = slot.status === 'played';
                            const isMissed = slot.status === 'missed';
                            const isNextChallenge = slot.status === 'upcoming-next';
                            const isPast = isPlayed || isMissed;

                            return (
                                <div
                                    key={slot.hour}
                                    id={isLive ? 'node-live' : (isNextChallenge ? 'node-upcoming-next' : undefined)}
                                    className={`relative ${isLive ? 'node-live py-2.5' : isNextChallenge ? 'py-2' : isPast ? 'py-1' : 'py-1'}`}
                                >
                                    <div
                                        className={`absolute left-[-19px] top-1/2 z-10 -translate-y-1/2 border-2 border-slate-900 ${
                                            isLive
                                                ? 'h-3.5 w-3.5 bg-orange-500 shadow-[2px_2px_0_#0f172a]'
                                                : isPlayed
                                                    ? 'h-2.5 w-2.5 bg-emerald-400 shadow-[1px_1px_0_#0f172a]'
                                                    : isMissed
                                                        ? 'h-2 w-2 bg-slate-300'
                                                        : isNextChallenge
                                                            ? 'h-3 w-3 bg-amber-300 shadow-[2px_2px_0_#0f172a]'
                                                            : 'h-2 w-2 border-dashed bg-white'
                                        }`}
                                        aria-hidden
                                    />

                                    {isLive ? (
                                        <button
                                            type="button"
                                            disabled={hourlyQuizRefreshBusy}
                                            onClick={() => { void beginHourlyQuiz(); }}
                                            className="live-card-glow w-full border-2 border-rose-500 bg-white p-3.5 text-left shadow-[4px_4px_0_#0f172a] transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                                        <span className="nb-tag bg-white px-2 py-0.5 text-[10px] font-black tabular-nums text-slate-800">{slot.label}</span>
                                                        <span className="inline-flex items-center gap-1 border-2 border-slate-900 bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-700 shadow-[1px_1px_0_#0f172a]">
                                                            <span className="h-1.5 w-1.5 animate-pulse bg-rose-500" aria-hidden />
                                                            {t.liveNow}
                                                        </span>
                                                    </div>
                                                    {hourlyQuizRefreshBusy && (
                                                        <p className="mb-1 text-[10px] font-bold text-amber-700 nb-mono">
                                                            {language === 'en' ? 'Updating quiz for this hour…' : 'এই ঘণ্টার কুইজ আপডেট হচ্ছে…'}
                                                        </p>
                                                    )}
                                                    {timeLeft && (
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-3xl font-black tabular-nums tracking-tight text-slate-900">{timeLeft}</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 nb-mono">{t.timeLeft}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-slate-900 bg-orange-600 text-white shadow-[3px_3px_0_#0f172a]">
                                                    <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                                                </div>
                                            </div>
                                        </button>
                                    ) : isNextChallenge ? (
                                        <div className="border-2 border-amber-500 bg-amber-50 px-3 py-2.5 shadow-[3px_3px_0_#0f172a]">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                                        <span className="nb-tag bg-white px-2 py-0.5 text-[10px] font-black tabular-nums">{slot.label}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-wide text-amber-800 nb-mono">{t.nextChallengeLabel}</span>
                                                    </div>
                                                    {timeLeft && (
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-xl font-black tabular-nums text-slate-900">{timeLeft}</span>
                                                            <span className="text-[10px] font-bold text-slate-600 nb-mono">{t.startsIn}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="h-10 w-10 shrink-0 overflow-hidden border-2 border-slate-900 bg-white shadow-[2px_2px_0_#0f172a]">
                                                    <DotLottiePlayer src={sandyLoading} autoplay loop />
                                                </div>
                                            </div>
                                        </div>
                                    ) : isPlayed ? (
                                        <button
                                            type="button"
                                            onClick={startReview}
                                            className="nb-btn-secondary group flex w-full items-center gap-2.5 px-2.5 py-2 text-left hover:border-emerald-600 hover:bg-emerald-50"
                                        >
                                            <span className="w-[3.25rem] shrink-0 text-[10px] font-black tabular-nums text-slate-600 nb-mono">{slot.label}</span>
                                            <span className="text-sm font-black tabular-nums text-emerald-600">+{slot.score}</span>
                                            {slot.penalty > 0 && (
                                                <span className="text-xs font-bold tabular-nums text-red-500 nb-mono">−{slot.penalty}</span>
                                            )}
                                            <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-slate-500 transition-colors group-hover:text-emerald-700 nb-mono">
                                                {language === 'en' ? 'Review' : 'দেখুন'}
                                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                            </span>
                                        </button>
                                    ) : isMissed ? (
                                        <div className="flex items-center gap-2.5 border-2 border-dashed border-slate-400 bg-slate-100 px-2.5 py-1.5 opacity-75 shadow-[1px_1px_0_#0f172a]">
                                            <span className="w-[3.25rem] shrink-0 text-[10px] font-bold tabular-nums text-slate-500 nb-mono">{slot.label}</span>
                                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 nb-mono">{language === 'en' ? 'Missed' : 'মিস'}</span>
                                            <span className="ml-auto text-xs font-black tabular-nums text-slate-500">0</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2.5 border-2 border-dashed border-slate-300 bg-white px-2.5 py-1.5 opacity-60">
                                            <span className="w-[3.25rem] shrink-0 text-[10px] font-bold tabular-nums text-slate-400 nb-mono">{slot.label}</span>
                                            <span className={`text-[10px] font-bold text-slate-500 ${language === 'bn' ? 'font-bengali' : 'nb-mono uppercase'}`}>{t.upcomingStatus}</span>
                                            <div className="ml-auto flex h-7 w-7 items-center justify-center border-2 border-slate-300 bg-slate-50 text-slate-400">
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 3. MINI LEADERBOARD PREVIEW */}
            <div className="mb-16 animate-slide-up-fade px-4" style={{ animationDelay: '200ms' }}>
                <div className="nb-card bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black tracking-tight text-slate-800 nb-mono uppercase">{t.topPlayersToday}</h3>
                            <div className="mt-0.5 h-0.5 w-6 bg-orange-500" />
                        </div>
                        <button
                            type="button"
                            onClick={goToGlobalLeaderboard}
                            className="nb-btn-secondary px-3 py-1 text-[10px] font-black text-orange-700 hover:bg-orange-100"
                        >
                            {t.viewAll}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => <SkeletonRow key={i} />)
                        ) : leaderboard.length > 0 ? (
                            leaderboard.slice(0, 3).map((item, idx) => {
                                const rank = idx + 1;
                                const rankColors = {
                                    1: 'bg-amber-100 text-amber-700 border-slate-900',
                                    2: 'bg-slate-100 text-slate-700 border-slate-900',
                                    3: 'bg-orange-50 text-orange-700 border-slate-900'
                                }[rank];

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => openUserProgress(item.user_id)}
                                        className="group flex cursor-pointer items-center gap-3 border-2 border-transparent p-2 transition-colors hover:border-slate-900 hover:bg-orange-50/50"
                                    >
                                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 text-xs font-black shadow-[2px_2px_0_#0f172a] nb-mono ${rankColors}`}>
                                            {rank}
                                        </div>
                                        <div className="relative h-8 w-8 shrink-0">
                                            {rank === 1 && (
                                                <span className="pointer-events-none absolute -right-2 -top-2 z-20 text-sm leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" aria-hidden>👑</span>
                                            )}
                                            <div className="h-full w-full overflow-hidden border-2 border-slate-900 bg-slate-100 transition-all group-hover:shadow-[2px_2px_0_#0f172a]">
                                                {item.avatar_url ? (
                                                    <img src={item.avatar_url} className="h-full w-full object-cover" alt="" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-slate-400">{item.full_name?.[0] || 'U'}</div>
                                                )}
                                            </div>
                                            {(item.last_active || item.last_login_at) && (() => {
                                                const lastActiveDate = item.last_active || item.last_login_at;
                                                const d = new Date(lastActiveDate);
                                                const now = new Date();
                                                const diffInSeconds = Math.floor((now - d) / 1000);
                                                const isOnline = diffInSeconds < 300;
                                                const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

                                                return isToday && (
                                                    <span className="absolute -bottom-0.5 -right-0.5 z-10 flex h-2.5 w-2.5">
                                                        {isOnline && <span className="absolute inline-flex h-full w-full animate-ping bg-green-400 opacity-75" />}
                                                        <span className={`relative inline-flex h-2.5 w-2.5 border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-green-500/60'}`} />
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-xs font-black leading-tight text-slate-800 transition-colors group-hover:text-orange-600">
                                                {item.full_name}
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-1.5">
                                                <span className="text-[10px] font-black tabular-nums leading-none text-slate-900">
                                                    {item.points.toLocaleString()}
                                                </span>
                                                {(item.last_active || item.last_login_at) && (
                                                    <span className="text-[9px] font-bold text-slate-500">
                                                        {formatLastActive(item.last_active || item.last_login_at, language)}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-0.5 border border-slate-900 bg-slate-50 px-1 py-0.5 text-[9px] font-bold text-slate-600">
                                                    <span>📖</span>
                                                    <span className="tabular-nums">{(item.reading_points || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-slate-400 transition-transform group-hover:translate-x-0.5">
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-3 text-center text-xs font-medium italic text-slate-500">{language === 'en' ? 'No activity today' : 'আজ কোনো কার্যকলাপ নেই'}</div>
                        )}
                    </div>
                </div>
            </div>


            {showAbortWarningModal && createPortal(
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/55 animate-fade-in">
                    <div className="neo-brutal w-full max-w-md animate-scale-in" role="dialog" aria-modal="true">
                        <div className="nb-card overflow-hidden p-0 bg-[#fffdf7]">
                            <div className="nb-hazard" aria-hidden="true" />
                            <div className="bg-red-600 text-white px-6 py-4 border-b-[2.5px] border-slate-900">
                                <div className="flex items-center gap-3">
                                    <div className="nb-icon-badge w-10 h-10 flex items-center justify-center bg-red-100 text-xl border-slate-900">⚠️</div>
                                    <div>
                                        <h3 className={`text-lg font-black leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>{t.antiCheatExitTitle}</h3>
                                        <p className="text-xs font-semibold text-red-100 mt-0.5 uppercase tracking-wider nb-mono">Anti-Cheat Protection</p>
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

                            <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t-2 border-slate-900 bg-white">
                                <button
                                    type="button"
                                    onClick={cancelAbortQuiz}
                                    className="w-full py-3 nb-btn-secondary font-bold"
                                >
                                    {t.antiCheatStay}
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmAbortQuiz}
                                    className="w-full py-3 nb-btn-danger font-black"
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
                    <div className="neo-brutal w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
                        <div className="nb-card overflow-hidden p-0 bg-[#fffdf7] max-h-[90vh] flex flex-col">
                            <div className="nb-hazard shrink-0" aria-hidden="true" />
                        {!quizSubmitted ? (
                            <>
                                <div className="flex justify-between items-center p-4 sm:p-6 border-b-2 border-slate-900 bg-white shrink-0">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">{activeQuiz.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-600 nb-mono">
                                            <span>{t.questions} {currentQuestionIndex + 1} / {quizQuestions.length}</span>
                                            {hourlyStakesUi.quizHint && (
                                                <span className="text-slate-500 tabular-nums before:content-['·'] before:mx-1">
                                                    {hourlyStakesUi.quizHint}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleAbortQuiz} className="w-8 h-8 flex items-center justify-center border-2 border-slate-900 bg-white text-slate-600 shadow-[2px_2px_0_#0f172a] hover:bg-orange-50 transition-colors">✕</button>
                                </div>

                                <div className="mb-0 overflow-y-auto flex-1 p-4 sm:p-6 text-slate-900">
                                    <div className="w-full bg-slate-200 border-2 border-slate-900 h-2 mb-6">
                                        <div className="bg-orange-600 h-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}></div>
                                    </div>
                                    <div className="flex justify-between items-start gap-4 mb-6">
                                        <div className="flex-1 min-w-0">
                                            {quizQuestions[currentQuestionIndex]?.question_image_url && (
                                                <div className="mb-4 overflow-hidden border-2 border-slate-900 bg-white shadow-[2px_2px_0_#0f172a]">
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
                                                                        className="mt-2 text-xs px-3 py-1.5 nb-btn-secondary bg-orange-50 text-orange-700 hover:bg-orange-100"
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
                                                    className="shrink-0 p-2 border-2 border-slate-900 bg-white shadow-[2px_2px_0_#0f172a] hover:bg-amber-50 text-slate-600 hover:text-amber-600 transition-all active:scale-90"
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
                                            className={`shrink-0 w-9 h-9 flex items-center justify-center border-2 border-slate-900 transition-all shadow-[2px_2px_0_#0f172a] active:scale-95 ${(userAnswers[quizQuestions[currentQuestionIndex]?.id] !== undefined || reviewMode)
                                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-40'
                                                }`}
                                            title={hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) ? (language === 'en' ? 'Answer Locked (Hint Viewed)' : 'উত্তর লক করা হয়েছে (ইঙ্গিত দেখা হয়েছে)') : (userAnswers[quizQuestions[currentQuestionIndex]?.id] === undefined && !reviewMode ? t.hintDisabled : t.hint)}
                                        >
                                            <span className="text-xl">💡</span>
                                        </button>
                                    </div>

                                    {showHint && (userAnswers[quizQuestions[currentQuestionIndex]?.id] !== undefined || reviewMode) && (
                                        <div className="mb-6 p-4 bg-amber-50 border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] animate-fade-in">
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

                                            let buttonClass = 'border-2 border-slate-900 bg-white hover:bg-orange-50 hover:border-orange-600 text-slate-950 shadow-[2px_2px_0_#0f172a]';

                                            if (reviewMode) {
                                                if (isCorrect) buttonClass = 'border-2 border-green-700 bg-green-50 text-green-950 font-bold shadow-[2px_2px_0_#15803d]';
                                                else if (isSelected && !isCorrect) buttonClass = 'border-2 border-red-700 bg-red-50 text-red-950 font-bold shadow-[2px_2px_0_#b91c1c]';
                                                else buttonClass = 'border-2 border-slate-500 bg-slate-50 text-slate-800';
                                            } else if (isSelected) {
                                                buttonClass = 'border-2 border-orange-600 bg-orange-50 text-orange-950 font-bold shadow-[3px_3px_0_#ea580c]';
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => !reviewMode && handleAnswerSelect(quizQuestions[currentQuestionIndex].id, idx)}
                                                    disabled={reviewMode || hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id)}
                                                    className={`w-full text-left p-3.5 transition-all duration-200 ${buttonClass} ${hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) && !reviewMode ? 'cursor-not-allowed' : ''}`}
                                                >
                                                    <span className="mr-3 font-mono nb-mono font-black text-inherit opacity-80">{String.fromCharCode(65 + idx)}.</span>
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
                                                                    className="ml-2 text-[11px] px-2 py-1 nb-btn-secondary bg-orange-50 text-orange-700"
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

                                <div className="flex flex-col gap-2 p-4 sm:p-6 border-t-2 border-slate-900 bg-white shrink-0">
                                    <div className="flex justify-between items-center">
                                        <button
                                            type="button"
                                            disabled={currentQuestionIndex === 0}
                                            onClick={() => {
                                                setCurrentQuestionIndex((prev) => prev - 1);
                                                setShowHint(false);
                                            }}
                                            className="nb-btn-secondary px-4 py-2 font-bold text-sm disabled:opacity-30"
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
                                                        ? 'nb-btn-secondary'
                                                        : hourlyCurrentAnswered
                                                          ? 'nb-btn-primary bg-green-600 hover:bg-green-500'
                                                          : 'nb-btn-secondary opacity-50 cursor-not-allowed'
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
                                                        ? 'nb-btn-primary'
                                                        : 'nb-btn-secondary opacity-50 cursor-not-allowed'
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
                        ) : (
                            <div className="text-center py-6 px-4 sm:px-6 overflow-y-auto">
                                <div className="nb-icon-badge w-20 h-20 bg-green-50 text-green-600 text-4xl flex items-center justify-center mx-auto mb-4">🎉</div>
                                <h2 className={`text-2xl font-black text-slate-900 mb-6 ${language === 'bn' ? 'font-bengali' : ''}`}>{t.completed}</h2>

                                <div className="flex flex-col items-center justify-center mb-8 animate-scale-in">
                                    <div className={`text-6xl sm:text-7xl font-black mb-2 nb-mono ${(quizResults?.score || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {(quizResults?.score || 0) > 0 ? '+' : ''}{quizResults?.score || 0}
                                    </div>
                                    <div className={`text-xs sm:text-sm font-bold uppercase tracking-widest nb-mono ${(quizResults?.score || 0) >= 0 ? 'text-green-600/80' : 'text-red-600/80'}`}>
                                        {(quizResults?.score || 0) >= 0
                                            ? (language === 'en' ? 'Points Earned' : 'পয়েন্ট অর্জিত')
                                            : (language === 'en' ? 'Points Lost' : 'পয়েন্ট হারানো')}
                                    </div>
                                </div>

                                <div className={`mx-auto mb-8 grid max-w-md gap-3 ${(quizResults?.penalty || 0) > 0 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
                                    <div className="nb-card bg-green-50 p-3">
                                        <div className="text-[10px] font-bold text-green-600 uppercase tracking-tighter mb-1 nb-mono">
                                            {language === 'bn' ? 'সঠিক' : 'Right'}
                                        </div>
                                        <div className="text-lg font-black text-green-700 tabular-nums">+{quizResults?.pointsEarned || 0}</div>
                                    </div>
                                    {(quizResults?.penalty || 0) > 0 && (
                                        <div className="nb-card bg-red-50 p-3">
                                            <div className="text-[10px] font-bold text-red-600 uppercase tracking-tighter mb-1 nb-mono">
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
                                            : `এই সংরক্ষিত প্রচেষ্টায় পুরনো ফরম্যাট থেকে ${quizResults.skipped}টি প্রশ্ন উত্তরহীন ছিল। নতুন কুইজে সব প্রশ্নের উত্তর দিতে হবে।`}
                                    </p>
                                )}

                                <button type="button" onClick={() => { handleAbortQuiz(); setQuizSubmitted(false); }} className="w-full py-3 nb-btn-primary font-bold">
                                    {t.close}
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
                <div className="neo-brutal fixed inset-0 z-[300] flex animate-fade-in items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4">
                    <div className="nb-card flex w-full max-w-sm animate-slide-up-sheet flex-col items-center overflow-hidden border-t-2 border-slate-900 bg-[#fffdf7] p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center sm:animate-scale-in sm:border-2 sm:pb-8 sm:shadow-[4px_4px_0_#0f172a]">
                        <div className="nb-hazard mb-4 w-full shrink-0" aria-hidden="true" />
                        <div className="mb-6 flex h-16 w-16 items-center justify-center border-2 border-slate-900 bg-white shadow-[3px_3px_0_#0f172a]">
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
                            <div className="w-full bg-slate-200 border-2 border-slate-900 h-2 mb-8 overflow-hidden">
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
                                    className="w-full py-4 nb-btn-indigo font-black text-sm"
                                >
                                    {t.searchProceed}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowSearchModal(false)}
                                className={`w-full py-4 font-bold text-sm ${searchCount >= MAX_SEARCH_QUOTA ? 'nb-btn-primary' : 'nb-btn-secondary'}`}
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
            />
            <MonthlyBoardInfoModal
                open={showMonthlyBoardInfoModal}
                language={language}
                meta={monthlyBoardMeta}
                encouragementData={encouragementBoards}
                userId={user?.id}
                timeInfo={monthlyBoardTab === MONTHLY_SUB_TAB.CHAMPION ? t.leaderboardTimeInfo : null}
                onClose={() => setShowMonthlyBoardInfoModal(false)}
            />
        </div>
    );
}

const SkeletonCard = () => (
    <div className="nb-card bg-white p-6 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-slate-200 border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] shimmer"></div>
            <div className="h-6 w-32 bg-slate-200 border border-slate-900 shimmer"></div>
        </div>
        <div className="h-8 w-3/4 bg-slate-200 border border-slate-900 mb-6 shimmer"></div>
        <div className="flex justify-center gap-8 mb-8">
            <div className="h-4 w-16 bg-slate-200 border border-slate-900 shimmer"></div>
            <div className="h-4 w-16 bg-slate-200 border border-slate-900 shimmer"></div>
        </div>
        <div className="h-12 w-full bg-slate-200 border-2 border-slate-900 shimmer"></div>
    </div>
);

const SkeletonRow = () => (
    <div className="flex items-center p-2">
        <div className="w-6 h-6 bg-slate-200 border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] shimmer mr-3"></div>
        <div className="w-8 h-8 bg-slate-200 border-2 border-slate-900 shimmer mr-3"></div>
        <div className="flex-1 space-y-1">
            <div className="h-3 w-24 bg-slate-200 border border-slate-900 shimmer"></div>
            <div className="h-2.5 w-16 bg-slate-100 border border-slate-300 shimmer"></div>
        </div>
        <div className="w-3 h-3 bg-slate-200 border border-slate-900 shimmer"></div>
    </div>
);
