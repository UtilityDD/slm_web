import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { getBadgeByLevel } from '../utils/badgeUtils';
import { cacheHelper } from '../utils/cacheHelper';
import { storageUtils } from '../utils/storageUtils';
import { requestManager } from '../utils/requestManager';
import { DotLottiePlayer } from '@dotlottie/react-player';
import sandyLoading from '../assets/SandyLoading.lottie';

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

const stringToSeed = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
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
        if (date.getDate() === now.getDate()) return isBn ? 'আজ' : 'Today';
        return isBn ? 'গতকাল' : 'Yesterday';
    }
    if (diffInDays < 7) return isBn ? `${diffInDays} দিন আগে` : `${diffInDays}d ago`;
    
    // Default to short date
    return date.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short' });
};

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
    const [showHint, setShowHint] = useState(false);
    const [hintViewedQuestions, setHintViewedQuestions] = useState(new Set());
    const [showAbortWarningModal, setShowAbortWarningModal] = useState(false);
    
    // Hall of Fame Gallery State
    const [showHallOfFame, setShowHallOfFame] = useState(false);
    const [hallOfFameData, setHallOfFameData] = useState([]);
    const [loadingGallery, setLoadingGallery] = useState(false);

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
            highStakesDesc: "Wrong or skipped answers deduct 15 points",
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
            antiCheatExitConfirm: "Exit with 0 Points"
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
            highStakesDesc: "ভুল বা স্কিপ করা উত্তরের জন্য ১৫ পয়েন্ট কাটা হবে",
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
            antiCheatExitConfirm: "০ পয়েন্টে বের হোন"
        }
    }[language];

    const currentUserBadge = getBadgeByLevel((userProfile && userProfile.training_level) || 0);

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
                // Also fetch specific rank for the current view
                promises.push(fetchUserRank(forceRefresh));
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
    }, [language, user]); // Re-run when language/user change

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
            refreshProfile(user);

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

    const fetchHourlyQuiz = async () => {
        const now = getSyncedTime();
        // Use simpler strict format: YYYY-MM-DD-HH
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const hourId = `${year}-${month}-${day}-${hour}`;

        const cacheKey = `hourly_quiz_db_bn_v2_${hourId}`;

        try {
            const quizData = await requestManager.fetch(
                cacheKey,
                async () => {
                    const { data, error } = await supabase.rpc('get_random_hourly_questions', {
                        lang: 'bn',
                        limit_count: 5
                    });

                    if (error) throw error;

                    if (data && data.length > 0) {
                        return {
                            id: `hourly-challenge-${hourId}`, // Ensure this ID format is consistent
                            title: language === 'en' ? 'Hourly Safety Challenge' : 'প্রতি ঘন্টায় সুরক্ষা চ্যালেঞ্জ',
                            description: language === 'en' ? 'Test your safety knowledge! New questions every hour.' : 'আপনার সুরক্ষা জ্ঞান পরীক্ষা করুন! প্রতি ঘন্টায় নতুন প্রশ্ন।',
                            duration_minutes: 5,
                            points_reward: 50,
                            questions: data.map((q) => ({
                                id: q.id,
                                question_text: q.question_text,
                                options: q.options,
                                correct_option_index: q.correct_answer_index,
                                hint: q.hint,
                                category: q.category,
                                tags: q.tags
                            })),
                            isLocal: false
                        };
                    }
                    return null;
                },
                { ttl: 60, swr: true }
            );

            if (quizData) {
                setHourlyQuiz(quizData);
            }
        } catch (error) {
            console.error('Unexpected error fetching hourly quiz:', error);
            setFetchError(true);
        }
    };

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
                        reading_points: myData.reading_points || 0 
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
            const cacheKey = 'leaderboard_full_all_time';

            const formattedData = await requestManager.fetch(
                cacheKey,
                async () => {
                    const query = supabase
                        .from('leaderboard_view')
                        .select('*')
                        .order('score', { ascending: false });

                    const { data, error } = await query.limit(50);

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
                setFullLeaderboard(formattedData);
            }
        } catch (error) {
            console.error('Error fetching full leaderboard:', error);
        } finally {
            setLoadingFull(false);
        }
    };

    const fetchHallOfFameGallery = async () => {
        setLoadingGallery(true);
        try {
            const monthsToFetch = 12;
            const archive = [];
            const now = new Date();
            
            // Fetch past 12 months toppers
            // We'll do this in a single query by fetching recent records and grouping
            // or just loop for precision since it's only 12 small queries
            for (let i = 1; i <= monthsToFetch; i++) {
                const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const m = targetDate.getMonth() + 1;
                const y = targetDate.getFullYear();
                
                const { data, error } = await supabase
                    .from('monthly_leaderboard_view')
                    .select('*')
                    .eq('month_num', m)
                    .eq('year_num', y)
                    .order('points', { ascending: false })
                    .limit(3);
                
                if (!error && data && data.length > 0) {
                    archive.push({
                        month: m,
                        year: y,
                        winners: data
                    });
                }
            }
            setHallOfFameData(archive);
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

            // Deterministically pick 5 questions
            const shuffledQuestions = [...baseQuestions].sort(() => 0.5 - rng());
            const selectedQuestions = shuffledQuestions.slice(0, 5).map(q => {
                if (!q.options || q.options.length === 0) return q;

                const correctAnswerText = q.options[q.correct_option_index];
                const shuffledOptions = [...q.options].sort(() => 0.5 - rng());
                const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);

                return {
                    ...q,
                    options: shuffledOptions,
                    correct_option_index: newCorrectIndex !== -1 ? newCorrectIndex : q.correct_option_index
                };
            });
            setQuizQuestions(selectedQuestions);
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
        const currentPoints = userProfile?.points || userRank?.score || 0;
        const isHighStakes = currentPoints > 1000;
        let totalPenalty = 0;

        if (isHighStakes && quizQuestions.length > 0) {
            // Determine wrong OR skipped choices
            const wrongOrSkippedCount = quizQuestions.filter(q =>
                answers[q.id] !== q.correct_option_index
            ).length;

            totalPenalty = wrongOrSkippedCount * 15; // Deduct 15 points per WRONG or SKIPPED choice
        }
        return totalPenalty;
    };

    const handleAnswerSelect = (questionId, optionIndex) => {
        if (hintViewedQuestions.has(questionId)) return; // Prevent change if hint was viewed
        setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };



    const submitQuiz = async () => {
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

        // Calculate penalty (Only for High Stakes users > 1000 points)
        const currentPoints = userProfile?.points || userRank?.score || 0;
        const isHighStakes = currentPoints > 1000;
        let penalty = 0;

        if (isHighStakes) {
            penalty = quizQuestions.reduce((acc, q) => {
                const answer = userAnswers[q.id];
                if (answer === undefined || answer !== q.correct_option_index) {
                    return acc + 15; // 15 points penalty for wrong/skipped
                }
                return acc;
            }, 0);
        }
        
        calculatedScore = Math.max(0, calculatedScore - penalty);
        setScore(calculatedScore);

        setQuizResults({
            correct: correctCount,
            wrong: quizQuestions.filter(q => userAnswers[q.id] !== undefined && userAnswers[q.id] !== q.correct_option_index).length,
            skipped: quizQuestions.filter(q => userAnswers[q.id] === undefined).length,
            penalty: penalty,
            score: calculatedScore,
            pointsEarned: correctCount * pointsPerQuestion
        });
        setQuizSubmitted(true);

        // Save for Review (Local Storage)
        const attemptData = {
            timestamp: new Date().toISOString(),
            questions: quizQuestions,
            answers: userAnswers,
            score: calculatedScore,
            penalty: penalty
        };
        storageUtils.setItem(`review_${activeQuiz.id}`, JSON.stringify(attemptData));

        if (activeQuiz && activeQuiz.id === hourlyQuiz?.id) {
            setLastAttemptTime(attemptData.timestamp);
            const cacheKey = `last_attempt_${user.id}_${activeQuiz.id}`;
            cacheHelper.set(cacheKey, attemptData.timestamp, 5);
        }

        if (user) {
            await submitHourlyQuiz(calculatedScore, penalty);
        }
    };

    if (isFullLeaderboard) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
                {/* Header Section */}
                <div className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                                        {showHallOfFame 
                                            ? <><span className="text-3xl drop-shadow-sm">✨</span> {language === 'en' ? 'Monthly Stars' : 'মাসের সেরারা'}</>
                                            : <><span className="text-3xl drop-shadow-sm inline-block animate-spin-slow">🌍</span> {language === 'en' ? 'Global Rankings' : 'গ্লোবাল র‍্যাঙ্কিং'}</>
                                        }
                                    </h1>
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                                        <span className="w-4 h-px bg-slate-300 dark:bg-slate-700"></span>
                                        {showHallOfFame 
                                            ? (language === 'en' ? 'Celebrating Excellence' : 'সেরা পারফর্মারদের গ্যালারি') 
                                            : (language === 'en' ? 'Live Global Leaderboard' : 'লাইভ গ্লোবাল লিডারবোর্ড')}
                                    </p>
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        if (!showHallOfFame) fetchHallOfFameGallery();
                                        setShowHallOfFame(!showHallOfFame);
                                    }}
                                    className={`group relative flex items-center justify-center text-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl text-[10px] sm:text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-xl ${
                                        showHallOfFame 
                                        ? 'bg-slate-800 text-white border-2 border-slate-700 shadow-slate-900/20' 
                                        : 'bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white border-b-4 border-indigo-900/40 shadow-indigo-500/30'
                                    }`}
                                >
                                    <div className="flex flex-col items-center leading-tight">
                                        <span className={showHallOfFame ? 'text-slate-400 text-[9px]' : 'text-indigo-200 text-[9px]'}>
                                            {showHallOfFame 
                                                ? (language === 'en' ? 'Live' : 'লাইভ') 
                                                : (language === 'en' ? 'Awards' : 'মাসের সেরা')}
                                        </span>
                                        <span className="text-xs sm:text-sm font-black tracking-tight">
                                            {showHallOfFame 
                                                ? (language === 'en' ? 'Leaderboard' : 'লিডারবোর্ড') 
                                                : (language === 'en' ? 'Champions' : 'বিজয়ীরা')}
                                        </span>
                                    </div>

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

                {showHallOfFame ? (
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                        {loadingGallery ? (
                            <div className="flex flex-col items-center justify-center py-20 pointer-events-none">
                                <DotLottiePlayer src={sandyLoading} autoplay loop style={{ width: '120px', height: '120px' }} />
                                <p className="text-slate-400 font-bold mt-4 animate-pulse uppercase tracking-[0.2em] text-[10px]">{language === 'en' ? 'Opening the Gallery...' : 'গ্যালারি খোলা হচ্ছে...'}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-10 max-w-7xl mx-auto px-4 md:px-8">
                                {hallOfFameData.map((entry, idx) => (
                                    <div 
                                        key={`${entry.year}-${entry.month}`} 
                                        className="award-perspective group animate-slide-up"
                                        style={{ animationDelay: `${idx * 150}ms` }}
                                    >
                                        <div className="diamond-glass award-tilt rounded-[2rem] p-8 md:p-10 relative overflow-hidden transition-all duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.12)]">
                                            {/* Refined Background Accents */}
                                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 dark:bg-amber-400/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-amber-500/20 transition-all duration-1000"></div>
                                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
                                            
                                            {/* Header Section */}
                                            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4 relative z-10 border-b border-slate-200/50 dark:border-white/10 pb-6">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="h-px w-8 bg-indigo-500/50"></div>
                                                        <span className="text-[10px] font-black tracking-[0.3em] text-indigo-500 dark:text-indigo-400 uppercase">
                                                            {language === 'en' ? 'Monthly Stars' : 'মাসের সেরারা'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                        {new Date(entry.year, entry.month - 1).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' })}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-4 bg-white/50 dark:bg-black/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/50 dark:border-white/10 shadow-sm">
                                                    <div className="flex -space-x-3">
                                                        {entry.winners.map((w, i) => (
                                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm">
                                                                {w.avatar_url ? <img src={w.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200 dark:bg-slate-700"></div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                                                        {language === 'en' ? 'Platinum Class' : 'প্ল্যাটিনাম ক্লাস'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Winners Horizontal Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                                {entry.winners.slice(0, 3).map((winner, winIdx) => {
                                                    const isGold = winIdx === 0;
                                                    const metalClass = winIdx === 0 ? 'gold' : winIdx === 1 ? 'silver' : 'bronze';
                                                    
                                                    return (
                                                        <div 
                                                            key={winner.user_id} 
                                                            className={`relative p-6 rounded-[1.8rem] border transition-all duration-500 group/topper 
                                                                ${isGold 
                                                                    ? 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-slate-900/50 border-amber-200 dark:border-amber-500/20 shadow-lg shadow-amber-500/5' 
                                                                    : 'bg-white/40 dark:bg-slate-800/40 border-slate-100 dark:border-white/5 hover:border-indigo-500/30'}`}
                                                        >
                                                            {/* Medal Icon (SVG) */}
                                                            <div className="flex justify-between items-start mb-6">
                                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover/topper:scale-110 shadow-lg
                                                                    ${winIdx === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-900/60 shadow-amber-500/20' :
                                                                       winIdx === 1 ? 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 shadow-slate-500/10' :
                                                                       'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-900/50 shadow-orange-500/10'}`}>
                                                                    {winIdx === 0 ? (
                                                                        <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                                                                            <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z"/>
                                                                        </svg>
                                                                    ) : (
                                                                        <svg className="w-8 h-8 text-slate-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                                                            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${winIdx === 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                                        {winIdx === 0 ? (language === 'en' ? 'Champion' : 'বিজয়ী') : winIdx === 1 ? (language === 'en' ? 'Finalist' : 'রানার আপ') : (language === 'en' ? 'Finalist' : 'তৃতীয়')}
                                                                    </span>
                                                                    <p className={`text-2xl font-black tabular-nums ${isGold ? 'gold-metallic-text' : winIdx === 1 ? 'silver-metallic-text' : 'bronze-metallic-text'}`}>
                                                                        {(winner.points || 0).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 md:gap-4">
                                                                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border-2 transition-all duration-500 group-hover/topper:rotate-3 shadow-md ${isGold ? 'border-amber-400' : 'border-white dark:border-slate-700'}`}>
                                                                    {winner.avatar_url ? (
                                                                        <img src={winner.avatar_url} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-black text-slate-400">
                                                                            {(winner.full_name || '?')[0]}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-base sm:text-lg font-black tracking-tight leading-tight ${isGold ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                        {winner.full_name || 'Anonymous'}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className={`w-2 h-2 rounded-full ${isGold ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500/50'}`}></span>
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                                                                            {winner.slm_id || 'SLM-MEMBER'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="h-20"></div>
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-3">
                        {user && userRank && !loadingFull && (() => {
                        const userBadge = getBadgeByLevel(userProfile?.training_level || 0);
                        return (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5 mb-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-1">
                                            {language === 'en' ? 'Your Standing' : 'আপনার অবস্থান'}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">#{userRank.rank}</p>
                                            {userBadge && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border ${userBadge.color}`}>
                                                    {language === 'en' ? userBadge.en : userBadge.bn}
                                                </span>
                                            )}
                                                    <div className="flex flex-center gap-2 flex-wrap">
                                                        <p className="text-sm font-black text-slate-700 dark:text-slate-200 ml-1 tabular-nums">{(userRank.score || 0).toLocaleString()} {language === 'en' ? 'pts' : 'পয়েন্ট'}</p>
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/10">
                                                            <span className="text-[10px]">📖</span>
                                                            <span className="text-[10px] font-black text-orange-700 dark:text-orange-300 tabular-nums">
                                                                {(userRank.reading_points || 0).toLocaleString()} <span className="text-[8px] opacity-70 ml-0.5">{language === 'en' ? 'RDG' : 'রিডিং'}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                        </div>
                                        {userProfile?.last_login_at && (
                                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1.5">
                                                {language === 'en' ? 'Active' : 'সক্রিয়'} {formatLastActive(userProfile.last_login_at, language)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-orange-600 dark:text-orange-300 border border-slate-200 dark:border-slate-600 overflow-hidden shrink-0">
                                        {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (userProfile?.full_name?.[0] || 'U')}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {!loadingFull && fullLeaderboard.length > 0 && (() => {
                        let topPlayers = [];
                        if (fullLeaderboard.length === 1) {
                            topPlayers = [fullLeaderboard[0]];
                        } else if (fullLeaderboard.length === 2) {
                            topPlayers = [fullLeaderboard[1], fullLeaderboard[0]];
                        } else {
                            topPlayers = [fullLeaderboard[1], fullLeaderboard[0], fullLeaderboard[2]];
                        }
                        return (
                            <div className="flex flex-col items-center gap-4 mt-8 mb-16 max-w-6xl mx-auto px-4 w-full">
                                <div className={`flex flex-col md:flex-row items-center md:items-end justify-center gap-4 md:gap-6 w-full ${topPlayers.length < 3 ? 'md:max-w-2xl' : ''}`}>
                                    {topPlayers.map((item) => {
                                        const rank = item === fullLeaderboard[0] ? 1 : item === fullLeaderboard[1] ? 2 : 3;
                                        const badge = getBadgeByLevel(item.training_level || 0);
                                        const theme = {
                                            1: { bg: 'gold-gradient', text: 'text-amber-900 dark:text-amber-100', border: 'border-amber-400/50 shadow-amber-500/10', glow: 'medal-glow-1', icon: '👑', height: 'md:min-h-[380px]', order: 'order-1 md:order-2', scale: 'scale-105 md:scale-110 z-10' },
                                            2: { bg: 'silver-gradient', text: 'text-slate-900 dark:text-slate-100', border: 'border-slate-300/50 shadow-slate-400/5', glow: 'medal-glow-2', icon: '🥈', height: 'md:min-h-[340px]', order: 'order-2 md:order-1', scale: 'scale-100' },
                                            3: { bg: 'bronze-gradient', text: 'text-orange-950 dark:text-orange-100', border: 'border-orange-300/50 shadow-orange-500/5', glow: 'medal-glow-3', icon: '🥉', height: 'md:min-h-[320px]', order: 'order-3 md:order-3', scale: 'scale-95 md:scale-100' }
                                        }[rank];

                                        return (
                                            <article key={item.user_id} onClick={() => openUserProgress(item.user_id)} className={`${theme.order} ${theme.scale} ${theme.bg} ${theme.border} ${theme.glow} ${theme.height} w-full md:w-1/3 max-w-xs sm:max-w-sm rounded-[1.5rem] sm:rounded-3xl border leaderboard-podium-card p-4 sm:p-4 flex flex-col items-center justify-between cursor-pointer relative overflow-hidden min-h-[320px] md:h-auto`}>
                                                <div className="absolute top-0 right-0 p-2 sm:p-3"><span className="text-xl sm:text-4xl opacity-20 font-black italic">#{rank}</span></div>
                                                <div className={`text-3xl sm:text-4xl mb-1.5 sm:mb-2 ${rank === 1 ? 'animate-crown' : ''}`}>{theme.icon}</div>
                                                <div className="relative mb-2 sm:mb-3">
                                                    <div className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 ${rank === 1 ? 'border-amber-200/50' : 'border-white/30'} shadow-xl`}>
                                                        {item.avatar_url ? <img src={item.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white/20 text-2xl sm:text-3xl font-black uppercase">{(item.full_name || '?')[0]}</div>}
                                                    </div>
                                                    {item.last_login_at && (() => {
                                                        const d = new Date(item.last_login_at);
                                                        const now = new Date();
                                                        const isActive = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                                        return (
                                                            <span className="absolute -bottom-1 -right-1 flex h-3 w-3 sm:h-4 sm:w-4">
                                                                <span className={`relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white dark:border-slate-900 ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="text-center mb-2.5 sm:mb-4 min-w-0 w-full">
                                                    <p className={`text-base sm:text-lg font-black truncate ${theme.text} px-2`}>{item.full_name || 'Anonymous'}</p>
                                                    {badge && <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border uppercase tracking-wider backdrop-blur-sm bg-white/10 ${badge.color} border-white/20 mt-0.5 sm:mt-1 shadow-sm`}>{language === 'en' ? badge.en : badge.bn}</span>}
                                                </div>
                                                <div className="w-full bg-white/5 dark:bg-black/20 backdrop-blur-md rounded-2xl px-2.5 sm:px-3 py-3 sm:py-4 border border-white/10 flex flex-col items-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <p className={`text-2xl sm:text-4xl font-black tabular-nums ${theme.text} leading-none tracking-tighter`}>{(item.points || 0).toLocaleString()}</p>
                                                        <div className="flex flex-col items-center gap-0.5 mt-2 sm:mt-3">
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl bg-black/10 dark:bg-white/10 border border-white/5 shadow-inner">
                                                                <span className="text-[10px] sm:text-xs">📖</span>
                                                                <span className={`text-[10px] sm:text-xs font-black ${theme.text} opacity-90 tabular-nums`}>{(item.reading_points || 0).toLocaleString()}</span>
                                                            </div>
                                                            <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider opacity-60 ${theme.text}`}>{language === 'en' ? 'Reading' : 'রিডিং'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {(!loadingFull && fullLeaderboard.length > 0) ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm mb-8">
                            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
                                <table className="w-full">
                                    <thead className="sticky top-0 z-10 bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800/95 dark:to-slate-800/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                                        <tr>
                                            <th className="px-2 sm:px-4 py-2 text-left text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.1em]">
                                                {language === 'en' ? '#' : '#'}
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 text-left text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.1em]">
                                                {language === 'en' ? 'User' : 'ইউজার'}
                                            </th>
                                            <th className="hidden sm:table-cell px-3 sm:px-4 py-2.5 text-right text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.15em]">
                                                {language === 'en' ? 'Reading' : 'রিডিং'}
                                            </th>
                                            <th className="hidden sm:table-cell px-3 sm:px-4 py-2.5 text-right text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.15em]">
                                                {language === 'en' ? 'Loss' : 'পেনাল্টি'}
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 text-right text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.1em]">
                                                {language === 'en' ? 'Pts' : 'পয়েন্ট'}
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                                        {loadingFull ? (
                                            Array(12).fill(0).map((_, i) => (
                                                <tr key={i} className="h-14">
                                                    <td colSpan="5" className="px-4 sm:px-6 py-3"><SkeletonRow /></td>
                                                </tr>
                                            ))
                                        ) : fullLeaderboard.length > 0 ? (
                                            (fullLeaderboard.length >= 3 ? fullLeaderboard.slice(3) : fullLeaderboard).map((item, idx) => {
                                                const index = idx + (fullLeaderboard.length >= 3 ? 3 : 0);
                                                const isMe = item.user_id === user?.id;
                                                const badge = getBadgeByLevel(item.training_level);
                                                
                                                return (
                                                    <tr
                                                        key={item.user_id}
                                                        onClick={() => openUserProgress(item.user_id)}
                                                        className={`transition-all duration-300 border-b border-slate-100 dark:border-slate-800/40 cursor-pointer group ${isMe ? 'bg-orange-500/[0.03] dark:bg-orange-500/[0.05]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                                                    >
                                                        <td className="px-1.5 sm:px-4 py-4">
                                                            <div className="flex items-center gap-1.5 text-xs font-black">
                                                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${index < 3 ? 'bg-slate-100 dark:bg-slate-800 text-orange-600' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`}>
                                                                    {index + 1}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-1.5 sm:px-4 py-4">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="relative shrink-0">
                                                                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden border-2 transition-transform group-hover:scale-110 ${isMe ? 'border-orange-500/20' : 'border-white dark:border-slate-700'} shadow-sm`}>
                                                                        {item.avatar_url ? (
                                                                            <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase">{item.full_name?.[0] || '?'}</div>
                                                                        )}
                                                                    </div>
                                                                    {item.last_login_at && (() => {
                                                                        const d = new Date(item.last_login_at);
                                                                        const now = new Date();
                                                                        const isActive = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                                                        return (
                                                                            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                                                                                <span className={`relative inline-flex rounded-full h-3 w-3 border-2 border-white dark:border-slate-900 ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                                        <p className={`text-[13px] sm:text-sm font-black truncate leading-tight ${isMe ? 'text-orange-600 dark:text-orange-400' : 'text-slate-800 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400'}`}>
                                                                            {item.full_name || 'Anonymous'}
                                                                        </p>
                                                                        {isMe && (
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0"></span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                                        {item.last_login_at && (
                                                                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate">
                                                                                {formatLastActive(item.last_login_at, language).replace('Active ', '').replace('সক্রিয় ', '')}
                                                                            </p>
                                                                        )}
                                                                        {badge && (
                                                                            <span className={`text-[8px] font-black uppercase tracking-tighter transition-colors ${badge.color.split(' ')[1] || 'text-slate-400'}`}>
                                                                                {language === 'en' ? badge.en : badge.bn}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="hidden sm:table-cell px-3 sm:px-4 py-4 text-right">
                                                            <span className="text-sm font-black text-slate-600 dark:text-slate-400 tabular-nums">
                                                                {(item.reading_points || 0).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="hidden sm:table-cell px-3 sm:px-4 py-4 text-right">
                                                            <span className="text-sm font-black text-rose-500/80 dark:text-rose-400/80 tabular-nums">
                                                                -{(item.total_penalties || 0).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-1.5 sm:px-4 py-4 text-right">
                                                            <div className="flex flex-col items-end gap-1.5">
                                                                <span className={`text-base font-black tabular-nums leading-none ${isMe ? 'text-orange-600 dark:text-orange-400' : 'text-slate-800 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400'}`}>
                                                                    {(item.points || 0).toLocaleString()}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
                                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-100/50 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/20 text-orange-700 dark:text-orange-400">
                                                                        <span className="text-[10px]">📖</span>
                                                                        <span>{(item.reading_points || 0).toLocaleString()} <span className="text-[8px] opacity-70">{language === 'en' ? 'READING' : 'রিডিং'}</span></span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-4 sm:px-6 py-12 text-center">
                                                    <div className="text-slate-400">
                                                        <div className="text-4xl mb-3">🏆</div>
                                                        <p className="font-medium">{language === 'en' ? 'No rankings yet' : 'এখনও কোনো র‍্যাঙ্কিং নেই'}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* breathing room below list */}
                            <div className="h-12 sm:h-16"></div>
                        </div>
                    ) : null}
                </div>
                )}
            </main>
        );
    }

    return (
        <div className="max-w-md mx-auto min-h-screen relative pb-20">
            {/* 1. STICKY SCOREBOARD HEADER */}
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all duration-300">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                                <span className="text-2xl">🏆</span> {language === 'en' ? 'Daily Challenge' : 'দৈনিক চ্যালেঞ্জ'}
                            </h1>
                        </div>
                        {userRank && (
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shadow-sm ${currentUserBadge.color}`}>
                                        {language === 'en' ? currentUserBadge.en : currentUserBadge.bn}
                                    </span>
                                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">#{userRank.rank}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Total Score */}
                        <div className="bg-slate-100/50 dark:bg-slate-800/40 rounded-xl p-3 text-center border border-slate-200/50 dark:border-slate-700/50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.points}</p>
                            <p className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">{userRank?.score?.toLocaleString() || 0}</p>
                        </div>
                        {/* Today's Score */}
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center border border-orange-100 dark:border-orange-900/30">
                            <p className="text-[10px] font-black text-orange-400 dark:text-orange-500 uppercase tracking-widest mb-1">{language === 'en' ? 'Today' : 'আজ'}</p>
                            <p className="text-xl font-black text-orange-600 dark:text-orange-400 tabular-nums">+{getTodayScore().toLocaleString()}</p>
                        </div>
                        {/* Streak */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-900/30">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">{t.streak}</p>
                            <p className="text-xl font-black text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
                                {getStreak(buildHourlySlots())} <span className="text-lg animate-pulse">🔥</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. INFINITE SCROLL LADDER */}
            <div className="px-4 py-10 relative space-y-0" ref={ladderRef}>
                {/* Center Line Shadow */}
                <div className="absolute left-1/2 top-0 bottom-0 w-2 bg-slate-50 dark:bg-slate-950/20 -translate-x-1/2 z-0 blur-sm"></div>
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800/50 -translate-x-1/2 z-0"></div>

                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="relative z-10 flex min-h-[100px] items-center justify-center">
                            <div className="w-full max-w-[280px] h-20 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse"></div>
                        </div>
                    ))
                ) : (
                    buildHourlySlots().map((slot, index, arr) => {
                        const isLive = slot.status === 'live';
                        const isPlayed = slot.status === 'played';
                        const isMissed = slot.status === 'missed';
                        const isUpcoming = slot.status === 'upcoming';
                        const isNextChallenge = slot.status === 'upcoming-next';

                        return (
                            <div key={slot.hour} id={isLive ? 'node-live' : (isNextChallenge ? 'node-upcoming-next' : undefined)} className={`relative z-10 flex items-center justify-center py-5 ${isLive ? 'node-live py-8 my-2' : isNextChallenge ? 'py-6 my-1' : ''}`}>

                                {/* Connector Line to next node (if not last) */}
                                {index < arr.length - 1 && (
                                    <div className={`absolute top-1/2 left-1/2 w-1 -translate-x-1/2 h-[calc(100%+40px)] -z-10
                                        ${isUpcoming ? 'border-l-2 border-dashed border-slate-200 dark:border-slate-800' :
                                            isMissed ? 'bg-slate-200 dark:bg-slate-800' :
                                                'bg-gradient-to-b from-orange-400 to-orange-200 dark:from-orange-600 dark:to-orange-900/30'}`}>
                                    </div>
                                )}

                                {/* Main Card */}
                                <div className={`relative w-full max-w-[340px] transition-all duration-300 ${isLive ? 'scale-100' : 'scale-[0.98] opacity-95'}`}>

                                    {/* Hour Label Badge */}
                                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md z-20 border
                                        ${isLive ? 'bg-orange-600 text-white border-orange-400 shadow-orange-500/20' :
                                            isPlayed ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' :
                                                isNextChallenge ? 'bg-amber-500 text-white border-amber-300 shadow-amber-500/20' :
                                                    isMissed ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700' :
                                                        'bg-slate-50 dark:bg-slate-800/80 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-700'}`}>
                                        {slot.label}
                                    </div>

                                    {/* Card Content */}
                                    <button
                                        disabled={!isLive && !isPlayed}
                                        onClick={() => {
                                            if (isLive) startQuiz(hourlyQuiz);
                                            else if (isPlayed) startReview();
                                        }}
                                        className={`w-full overflow-hidden rounded-2xl border-2 relative group text-left transition-all active:scale-[0.98]
                                            ${isLive ? 'bg-white dark:bg-slate-900 border-rose-500 shadow-[0_10px_40px_-10px_rgba(244,63,94,0.3)] dark:shadow-none live-card-glow animate-pulse-rose' :
                                                isPlayed ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-800' :
                                                    isNextChallenge ? 'bg-white dark:bg-slate-900 border-amber-400 shadow-[0_8px_20px_-8px_rgba(245,158,11,0.2)]' :
                                                        isMissed ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-70 grayscale' :
                                                            'bg-slate-50/30 dark:bg-slate-900/10 border-slate-50 dark:border-slate-900 opacity-40 cursor-default'}`}
                                    >
                                        <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                {isLive ? (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex flex-col items-start gap-1">
                                                        <div className="flex items-center gap-2 mb-1 px-2.5 py-1 bg-rose-500/10 dark:bg-rose-500/20 rounded-full border border-rose-500/20">
                                                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                                                            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 tracking-tighter uppercase">{t.liveNow}</span>
                                                        </div>
                                                        {timeLeft && (
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                                                                    {timeLeft}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.timeLeft}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : isPlayed ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl bg-green-50/50 dark:bg-green-900/20 flex flex-col items-center justify-center border border-green-100/50 dark:border-green-800/30">
                                                            <span className="text-lg font-black text-green-600 dark:text-green-400">+{slot.score}</span>
                                                        </div>
                                                        {slot.penalty > 0 && (
                                                            <div className="text-xs font-bold text-red-400/80 dark:text-red-500/80">
                                                                -{slot.penalty}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : isMissed ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center border border-slate-100/50 dark:border-slate-800/50">
                                                            <span className="text-lg font-black text-slate-300 dark:text-slate-600">0</span>
                                                        </div>
                                                    </div>
                                                ) : isNextChallenge ? (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex flex-col items-start gap-1">
                                                        <div className="flex items-center gap-2 mb-1 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                                                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></div>
                                                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">{t.nextChallengeLabel}</span>
                                                        </div>
                                                        {timeLeft && (
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-2xl font-black text-slate-400/80 dark:text-slate-500/80 tabular-nums tracking-tighter">
                                                                    {timeLeft}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest lowercase">{t.startsIn}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-300 dark:text-slate-700 italic">
                                                            {t.upcomingStatus}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="shrink-0">
                                                {isLive ? (
                                                    <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/40 animate-pulse active:scale-90 transition-transform">
                                                        <svg className="w-6 h-6 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                                                    </div>
                                                ) : isPlayed ? (
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                    </div>
                                                ) : isNextChallenge ? (
                                                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border border-amber-200 dark:border-amber-800 overflow-hidden">
                                                        <DotLottiePlayer
                                                            src={sandyLoading}
                                                            autoplay
                                                            loop
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-700 border border-slate-200 dark:border-slate-800">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 3. MINI LEADERBOARD PREVIEW - COMPACT MOBILE */}
            <div className="px-4 mb-16 animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
                <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/20 dark:shadow-none">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight">{t.topPlayersToday}</h3>
                            <div className="h-0.5 w-6 bg-orange-500 rounded-full mt-0.5"></div>
                        </div>
                        <button
                            onClick={goToGlobalLeaderboard}
                            className="px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-black hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors border border-orange-100 dark:border-orange-800/30"
                        >
                            {t.viewAll}
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => <SkeletonRow key={i} />)
                        ) : leaderboard.length > 0 ? (
                            leaderboard.slice(0, 3).map((item, idx) => {
                                const rank = idx + 1;
                                const rankColors = {
                                    1: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
                                    2: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
                                    3: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                                }[rank];

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => openUserProgress(item.user_id)}
                                        className="flex items-center gap-3 group cursor-pointer p-2 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black border transition-transform group-hover:scale-110 ${rankColors}`}>
                                            {rank}
                                        </div>
                                        <div className="relative flex-shrink-0">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 ring-1 ring-transparent group-hover:ring-orange-500/20 transition-all">
                                                {item.avatar_url ? (
                                                    <img src={item.avatar_url} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase">{item.full_name?.[0] || 'U'}</div>
                                                )}
                                            </div>
                                            {item.last_login_at && (() => {
                                                const d = new Date(item.last_login_at);
                                                const now = new Date();
                                                const isActive = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                                return (
                                                    <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                                                        <span className={`relative inline-flex rounded-full h-2 w-2 border border-white dark:border-slate-900 ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                                                    </span>
                                                );
                                            })()}
                                            {rank === 1 && <span className="absolute -top-1 -left-1 text-[8px] animate-bounce">👑</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-tight">
                                                {item.full_name}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                                                    {item.points.toLocaleString()}
                                                </span>
                                                <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500">
                                                    <span>📖</span>
                                                    <span className="tabular-nums">{(item.reading_points || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-slate-300 dark:text-slate-700 transition-transform group-hover:translate-x-0.5">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-3 text-center text-slate-400 text-xs font-medium italic">No activity today</div>
                        )}
                    </div>
                </div>
            </div>


            {/* Floating Action Buttons */}
            <div className="fixed bottom-24 right-4 md:right-8 z-[70] flex flex-col gap-3">
                <a
                    href="https://www.facebook.com/smartlineman"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-[#1877F2] text-white rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(24,119,242,0.4)] hover:scale-110 hover:-translate-y-1 transition-all duration-300 border-2 border-white/20"
                    title="Facebook Page"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" /></svg>
                </a>
                <a
                    href="https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(37,211,102,0.4)] hover:scale-110 hover:-translate-y-1 transition-all duration-300 border-2 border-white/20"
                    title="WhatsApp Community"
                >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                </a>
            </div>

            {showAbortWarningModal && createPortal(
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-800/40 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-scale-in">
                        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">⚠️</div>
                                <div>
                                    <h3 className="text-lg font-black leading-tight">{t.antiCheatExitTitle}</h3>
                                    <p className="text-xs font-semibold text-red-100 mt-0.5 uppercase tracking-wider">Anti-Cheat Protection</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 space-y-3">
                            <p className={`text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {t.antiCheatExitDesc}
                            </p>
                            <p className={`text-xs sm:text-sm text-red-600 dark:text-red-400 font-bold ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {t.antiCheatExitPenalty}
                            </p>
                        </div>

                        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={cancelAbortQuiz}
                                className="w-full py-3 rounded-xl font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                {t.antiCheatStay}
                            </button>
                            <button
                                onClick={confirmAbortQuiz}
                                className="w-full py-3 rounded-xl font-black bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                            >
                                {t.antiCheatExitConfirm}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Quiz Modal (Keep Portal) */}
            {activeQuiz && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 animate-scale-in">
                        {!quizSubmitted ? (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{activeQuiz.title}</h3>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs text-slate-500">{t.questions} {currentQuestionIndex + 1} / {quizQuestions.length}</p>
                                            {userRank && userRank.score > 1000 && (
                                                <div className="flex items-center gap-1.5 animate-pulse">
                                                    <span className="text-xl">🔥</span>
                                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tight bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/30 whitespace-nowrap">
                                                        {language === 'en' ? 'Loss 15 for Wrong/Skip' : 'ভুল/স্কিপ -১৫'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={handleAbortQuiz} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">✕</button>
                                </div>

                                <div className="mb-8">
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mb-6">
                                        <div className="bg-orange-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}></div>
                                    </div>
                                    <div className="flex justify-between items-start gap-4 mb-6">
                                        <h2 className={`reading-content text-lg sm:text-xl font-bold ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {quizQuestions[currentQuestionIndex]?.question_text}
                                        </h2>
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
                                            className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 ${(userAnswers[quizQuestions[currentQuestionIndex]?.id] !== undefined || reviewMode)
                                                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                                                : 'bg-slate-50 dark:bg-slate-900 text-slate-200 dark:text-slate-700 border border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-40'
                                                }`}
                                            title={hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) ? (language === 'en' ? 'Answer Locked (Hint Viewed)' : 'উত্তর লক করা হয়েছে (ইঙ্গিত দেখা হয়েছে)') : (userAnswers[quizQuestions[currentQuestionIndex]?.id] === undefined && !reviewMode ? t.hintDisabled : t.hint)}
                                        >
                                            <span className="text-xl">💡</span>
                                        </button>
                                    </div>

                                    {showHint && (userAnswers[quizQuestions[currentQuestionIndex]?.id] !== undefined || reviewMode) && (
                                        <div className="mb-6 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl animate-fade-in">
                                            <div className="flex items-start gap-2">
                                                <span className="text-amber-500 mt-0.5">ℹ️</span>
                                                <p className={`text-sm text-amber-800 dark:text-amber-300 italic font-medium leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {quizQuestions[currentQuestionIndex]?.hint || t.noHint}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2.5">
                                        {quizQuestions[currentQuestionIndex]?.options?.map((option, idx) => {
                                            const isSelected = userAnswers[quizQuestions[currentQuestionIndex].id] === idx;
                                            const isCorrect = idx === quizQuestions[currentQuestionIndex].correct_option_index;

                                            let buttonClass = 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-400';

                                            if (reviewMode) {
                                                if (isCorrect) buttonClass = 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold';
                                                else if (isSelected && !isCorrect) buttonClass = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
                                                else buttonClass = 'border-slate-100 dark:border-slate-800 opacity-60';
                                            } else if (isSelected) {
                                                buttonClass = 'border-orange-600 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold';
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => !reviewMode && handleAnswerSelect(quizQuestions[currentQuestionIndex].id, idx)}
                                                    disabled={reviewMode || hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id)}
                                                    className={`w-full text-left p-3.5 rounded-lg border transition-all duration-200 ${buttonClass} ${hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) && !reviewMode ? 'cursor-not-allowed opacity-80' : ''}`}
                                                >
                                                    <span className="mr-3 text-slate-400 font-mono">{String.fromCharCode(65 + idx)}.</span>
                                                    <span className={`reading-content text-sm sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                        {option}
                                                    </span>
                                                    {reviewMode && isCorrect && <span className="float-right text-green-600">✓</span>}
                                                    {reviewMode && isSelected && !isCorrect && <span className="float-right text-red-600">✗</span>}
                                                    {hintViewedQuestions.has(quizQuestions[currentQuestionIndex]?.id) && !reviewMode && isSelected && <span className="float-right text-slate-400">🔒</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        disabled={currentQuestionIndex === 0}
                                        onClick={() => {
                                            setCurrentQuestionIndex(prev => prev - 1);
                                            setShowHint(false);
                                        }}
                                        className="text-slate-500 hover:text-slate-800 dark:text-slate-200 font-bold text-sm disabled:opacity-30 px-4"
                                    >
                                        ← Prev
                                    </button>
                                    {currentQuestionIndex === quizQuestions.length - 1 ? (
                                        <button onClick={reviewMode ? () => setActiveQuiz(null) : submitQuiz} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors ${reviewMode ? 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                            {reviewMode ? 'Close Review' : 'Finish Quiz'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setCurrentQuestionIndex(prev => prev + 1);
                                                setShowHint(false);
                                            }}
                                            className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition-colors"
                                        >
                                            Next →
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-6">
                                <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">🎉</div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{t.completed}</h2>

                                {/* Animated Score Popup */}
                                <div className="flex flex-col items-center justify-center mb-8 animate-scale-in">
                                    <div className={`text-6xl sm:text-7xl font-black mb-2 drop-shadow-sm ${(quizResults?.score || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                        }`}>
                                        {(quizResults?.score || 0) > 0 ? '+' : ''}{quizResults?.score || 0}
                                    </div>
                                    <div className={`text-xs sm:text-sm font-bold uppercase tracking-widest ${(quizResults?.score || 0) >= 0 ? 'text-green-600/70 dark:text-green-400/70' : 'text-red-600/70 dark:text-red-400/70'
                                        }`}>
                                        {(quizResults?.score || 0) >= 0
                                            ? (language === 'en' ? 'Points Earned' : 'পয়েন্ট অর্জিত')
                                            : (language === 'en' ? 'Points Lost' : 'পয়েন্ট হারানো')}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-8">
                                    <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
                                        <div className="text-[10px] font-bold text-green-600 uppercase tracking-tighter mb-1">Right</div>
                                        <div className="text-lg font-bold text-green-700 dark:text-green-400">+{quizResults?.pointsEarned || 0}</div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                                        <div className="text-[10px] font-bold text-red-600 uppercase tracking-tighter mb-1">Wrong</div>
                                        <div className="text-lg font-bold text-red-700 dark:text-red-400">-{quizResults?.penalty || 0}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/10 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Skipped</div>
                                        <div className="text-lg font-bold text-slate-600 dark:text-slate-400">{quizResults?.skipped || 0}</div>
                                    </div>
                                </div>

                                {userRank && (userProfile?.points || userRank?.score) > 1000 && (
                                    <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-100 dark:border-amber-900/30">
                                        <span>⚠️</span> {t.highStakesDesc}
                                    </div>
                                )}

                                <button onClick={() => { handleAbortQuiz(); setQuizSubmitted(false); }} className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors">
                                    {t.close}
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

const SkeletonCard = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg shimmer"></div>
            <div className="h-6 w-32 bg-slate-100 dark:bg-slate-700 rounded shimmer"></div>
        </div>
        <div className="h-8 w-3/4 bg-slate-100 dark:bg-slate-700 rounded mb-6 shimmer"></div>
        <div className="flex justify-center gap-8 mb-8">
            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-700 rounded shimmer"></div>
            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-700 rounded shimmer"></div>
        </div>
        <div className="h-12 w-full bg-slate-100 dark:bg-slate-700 rounded-lg shimmer"></div>
    </div>
);

const SkeletonRow = () => (
    <div className="flex items-center p-2 rounded-xl">
        <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg shimmer mr-3"></div>
        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg shimmer mr-3"></div>
        <div className="flex-1 space-y-1">
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded shimmer"></div>
            <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-700 rounded shimmer"></div>
        </div>
        <div className="w-3 h-3 bg-slate-100 dark:bg-slate-700 rounded shimmer"></div>
    </div>
);
