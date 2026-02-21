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

export default function Competitions({ language = 'bn', user, setCurrentView, isFullLeaderboard = false, userProfile, refreshProfile }) {
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
    const [expandedRows, setExpandedRows] = useState(new Set()); // Track expanded user rows
    const [showHint, setShowHint] = useState(false);
    const [hintViewedQuestions, setHintViewedQuestions] = useState(new Set());

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
            upcomingPowerPlay: "Upcoming Power Play",
            startsIn: "Starts in",
            closingIn: "Closing in",
            topPlayersToday: "Top Players Today",
            viewAll: "View All"
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
            upcomingPowerPlay: "পরবর্তী চ্যালেঞ্জ আসছে",
            startsIn: "শুরু হবে",
            closingIn: "শেষ হবে",
            topPlayersToday: "আজকের সেরা খেলোয়াড়",
            viewAll: "সব দেখুন"
        }
    }[language];

    const loadData = async () => {
        setLoading(true);
        setFetchError(false);
        try {
            // Run fetches in parallel to avoid blocking
            const promises = [
                fetchServerTime()
            ];

            if (isFullLeaderboard) {
                promises.push(fetchFullLeaderboard());
            } else {
                promises.push(fetchHourlyQuiz());
            }

            // Only fetch leaderboard if user is logged in
            if (user) {
                promises.push(fetchLeaderboard());
                promises.push(fetchTodayAttempts());
            }

            await Promise.all(promises);
        } catch (error) {
            console.error("Error loading competition data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [language, user]); // Re-run when language or user changes

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
            const rankData = await requestManager.fetch(
                `user_rank_${user.id}`,
                async () => {
                    const { data: myData, error: myError } = await supabase
                        .from('leaderboard_view')
                        .select('score')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (myError || !myData) return null;

                    const { count, error: countError } = await supabase
                        .from('leaderboard_view')
                        .select('*', { count: 'exact', head: true })
                        .gt('score', myData.score);

                    if (countError) throw countError;

                    return { rank: count + 1, score: myData.score };
                },
                { ttl: 5, swr: true, forceRefresh }
            );

            if (rankData) {
                setUserRank(rankData);
            }
        } catch (error) {
            console.error('Error fetching rank:', error);
        }
    };

    const fetchLeaderboard = async (forceRefresh = false) => {
        try {
            const formattedData = await requestManager.fetch(
                'leaderboard_top_10_v3',
                async () => {
                    const { data, error } = await supabase
                        .from('leaderboard_view')
                        .select('*')
                        .order('score', { ascending: false })
                        .limit(10);

                    if (error) throw error;

                    return data.map(item => ({
                        ...item,
                        points: item.score
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

    const fetchFullLeaderboard = async () => {
        setLoadingFull(true);
        try {
            const formattedData = await requestManager.fetch(
                'leaderboard_full_v3',
                async () => {
                    const { data, error } = await supabase
                        .from('leaderboard_view')
                        .select('*')
                        .order('score', { ascending: false })
                        .limit(50);

                    if (error) throw error;

                    return data.map(item => ({
                        ...item,
                        points: item.score
                    }));
                },
                { ttl: 5, swr: true }
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

    const goToGlobalLeaderboard = () => {
        if (typeof setCurrentView === 'function') {
            setCurrentView('leaderboard');
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
            const warning = language === 'en'
                ? 'Exiting now will result in 0 points for this hour. Are you sure?'
                : 'এখন বেরিয়ে গেলে আপনি এই ঘণ্টার জন্য ০ পয়েন্ট পাবেন। আপনি কি নিশ্চিত?';

            if (window.confirm(warning)) {
                // Submit with 0 score and max penalty (75 for 5 wrong/skipped questions if applicable)
                submitHourlyQuiz(0, 0);
                setActiveQuiz(null);
                storageUtils.removeItem('slm_hourly_active_quiz_state');
            }
        } else {
            setActiveQuiz(null);
        }
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

    const handleQuizComplete = async (finalScore, userResponses) => {
        if (!activeQuiz) return;

        const penalty = calculatePenalty(userResponses);

        setScore(finalScore);
        setQuizSubmitted(true);
        setActiveQuiz(null);

        // Immediate submission attempt
        // If logged in, submit immediately
        if (user) {
            await submitHourlyQuiz(finalScore, penalty);
        } else {
            // Not logged in - just show score and let them login to save if they want (future feature)
            // For now, we just show the score.
        }
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

        // Calculate penalty
        const penalty = calculatePenalty(userAnswers);
        calculatedScore -= penalty;

        setScore(calculatedScore);

        // Store individual counts for the results screen
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

        // IMMEDIATE LOCK: Update local state before network call to prevent race condition
        if (activeQuiz && activeQuiz.id === hourlyQuiz?.id) {
            setLastAttemptTime(attemptData.timestamp);
            const cacheKey = `last_attempt_${user.id}_${activeQuiz.id}`;
            cacheHelper.set(cacheKey, attemptData.timestamp, 5);
        }

        // Submit immediately if user is logged in
        if (user) {
            // This now handles Supabase RPC, profile refresh and leaderboard update
            await submitHourlyQuiz(calculatedScore, penalty);
        }
    };

    if (isFullLeaderboard) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                {/* Header Section */}
                <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
                                    🏆 {language === 'en' ? 'Global Leaderboard' : 'লিডারবোর্ড'}
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {language === 'en' ? 'Top performers across all regions' : ''}
                                </p>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800/50">
                                <span className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></span>
                                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                    {language === 'en' ? 'Live' : 'লাইভ'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Leaderboard Content */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4">
                    {user && userRank && !loadingFull && (() => {
                        const userBadge = getBadgeByLevel(userProfile?.training_level || 0);
                        return (
                            <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md p-3 sm:p-4 mb-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                                            {language === 'en' ? 'Your Standing' : 'আপনার অবস্থান'}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">#{userRank.rank}</p>
                                            {userBadge && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border shadow-sm ${userBadge.color}`}>
                                                    {language === 'en' ? userBadge.en : userBadge.bn}
                                                </span>
                                            )}
                                            {isSyncing ? (
                                                <div className="ml-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-100 dark:border-orange-800/30 flex items-center gap-1.5 animate-pulse">
                                                    <svg className="animate-spin h-3 w-3 text-orange-600 dark:text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300">Syncing...</span>
                                                </div>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">{userRank.score.toLocaleString()} pts</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-orange-600 dark:text-orange-300 border border-slate-200 dark:border-slate-600 overflow-hidden shrink-0">
                                        {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (userProfile?.full_name?.[0] || 'U')}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}


                    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shadow-lg shadow-slate-200/20 dark:shadow-none mb-8">
                        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
                            <table className="w-full">
                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 z-10">
                                    <tr>
                                        <th className="px-3 sm:px-4 py-2 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">
                                            {language === 'en' ? 'Rank' : 'র‍্যাঙ্ক'}
                                        </th>
                                        <th className="px-3 sm:px-4 py-2 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            {language === 'en' ? 'Player' : 'খেলোয়াড়'}
                                        </th>
                                        <th className="hidden sm:table-cell px-3 sm:px-4 py-2 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            {language === 'en' ? 'Level' : 'স্তর'}
                                        </th>
                                        <th className="px-3 sm:px-4 py-2 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            {language === 'en' ? 'Points' : 'পয়েন্ট'}
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
                                        fullLeaderboard.map((item, index) => {
                                            const isMe = item.user_id === user?.id;
                                            const badge = getBadgeByLevel(item.training_level);
                                            const getMedalIcon = (rank) => {
                                                if (rank === 1) return '🥇';
                                                if (rank === 2) return '🥈';
                                                if (rank === 3) return '🥉';
                                                return null;
                                            };
                                            const isExpanded = expandedRows.has(item.user_id);
                                            const toggleExpand = () => {
                                                setExpandedRows(prev => {
                                                    const newSet = new Set(prev);
                                                    if (newSet.has(item.user_id)) {
                                                        newSet.delete(item.user_id);
                                                    } else {
                                                        newSet.add(item.user_id);
                                                    }
                                                    return newSet;
                                                });
                                            };
                                            return (
                                                <React.Fragment key={index}>
                                                    <tr
                                                        onClick={toggleExpand}
                                                        className={`transition-colors border-b border-slate-50 dark:border-slate-700/50 cursor-pointer ${isMe ? 'bg-orange-50/50 dark:bg-orange-900/10' : 'hover:bg-slate-50/30 dark:hover:bg-slate-700/10'}`}
                                                    >
                                                        <td className="px-3 sm:px-4 py-2">
                                                            <div className="flex items-center gap-1.5 text-xs">
                                                                {getMedalIcon(index + 1) && (
                                                                    <span className="text-sm">{getMedalIcon(index + 1)}</span>
                                                                )}
                                                                <span className={`font-bold ${index < 3 ? 'text-orange-600' : 'text-slate-400'}`}>
                                                                    #{index + 1}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 sm:px-4 py-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-300/50 dark:border-slate-600/50 shadow-sm">
                                                                    {item.avatar_url ? (
                                                                        <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-[10px] uppercase">{item.full_name?.[0] || '?'}</div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <p className={`text-xs font-bold truncate ${isMe ? 'text-orange-700 dark:text-orange-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                            {isMe ? (language === 'en' ? 'You' : 'আপনি') : (item.full_name || 'Anonymous')}
                                                                        </p>
                                                                        {badge && (
                                                                            <span className={`sm:hidden inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold border shrink-0 ${badge.color}`}>
                                                                                {language === 'en' ? badge.en : badge.bn}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="hidden sm:table-cell px-3 sm:px-4 py-2">
                                                            {badge && (
                                                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                                                                    {language === 'en' ? badge.en : badge.bn}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 sm:px-4 py-2 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className={`text-xs font-black tabular-nums ${isMe ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                    {item.points.toLocaleString()}
                                                                </span>
                                                                {(item.completed_lessons?.length || 0) > 0 && (
                                                                    <span className="text-[8px] font-bold text-orange-500 flex items-center gap-0.5 leading-tight">
                                                                        <span>📖</span>
                                                                        {(item.completed_lessons.length * 20).toLocaleString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {/* Expanded District Row */}
                                                    {isExpanded && (
                                                        <tr className={`${isMe ? 'bg-orange-50/50 dark:bg-orange-900/5' : 'bg-slate-50/50 dark:bg-slate-700/10'}`}>
                                                            <td colSpan="4" className="px-4 sm:px-6 py-2">
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-[10px] text-slate-600 dark:text-slate-400 animate-fade-in py-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        </svg>
                                                                        <span className="font-bold">{language === 'en' ? 'District:' : 'জেলা:'}</span>
                                                                        <span>{item.district || (language === 'en' ? 'West Bengal' : 'পশ্চিমবঙ্গ')}</span>
                                                                    </div>
                                                                    {(item.total_penalties > 0) && (
                                                                        <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400 font-bold">
                                                                            <span className="text-xs">🔥</span>
                                                                            <span>{language === 'en' ? 'Total Points Lost:' : 'মোট পয়েন্ট হারানো:'}</span>
                                                                            <span>{item.total_penalties.toLocaleString()}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
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
                    </div>

                    {/* breathing room below list */}
                    <div className="h-12 sm:h-16"></div>
                </div>

                {/* Previously sticky Your Rank card removed in favor of inline placement */}
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
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Climb the power ladder</p>
                        </div>
                        {userRank && (
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shadow-sm ${getBadgeByLevel(userProfile?.training_level || 0).color}`}>
                                        {language === 'en' ? getBadgeByLevel(userProfile?.training_level || 0).en : getBadgeByLevel(userProfile?.training_level || 0).bn}
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
                                            ${isLive ? 'bg-white dark:bg-slate-900 border-orange-500 shadow-[0_10px_30px_-10px_rgba(249,115,22,0.3)] dark:shadow-none' :
                                                isPlayed ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-800' :
                                                    isNextChallenge ? 'bg-white dark:bg-slate-900 border-amber-400 shadow-[0_8px_20px_-8px_rgba(245,158,11,0.2)]' :
                                                        isMissed ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-70 grayscale' :
                                                            'bg-slate-50/30 dark:bg-slate-900/10 border-slate-50 dark:border-slate-900 opacity-40 cursor-default'}`}
                                    >
                                        <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                {isLive ? (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <LiveIndicator />
                                                            <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">{t.liveNow}</span>
                                                        </div>
                                                        <div className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-1">
                                                            {activeQuiz?.title || (language === 'en' ? 'Hourly Challenge' : 'সুরক্ষা চ্যালেঞ্জ')}
                                                        </div>
                                                        {timeLeft && (
                                                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                                <span className="text-[10px]">⏳</span> {t.closingIn} <span className="text-orange-600 dark:text-orange-400 font-mono">{timeLeft}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : isPlayed ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex flex-col items-center justify-center border border-green-100 dark:border-green-800/50">
                                                            <span className="text-[10px] font-black text-green-600 dark:text-green-400 leading-none mb-0.5">{t.scoreLabel}</span>
                                                            <span className="text-lg font-black text-green-700 dark:text-green-300">+{slot.score}</span>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none mb-1">{t.challengeCompleted}</div>
                                                            {slot.penalty > 0 ? (
                                                                <div className="text-[10px] font-bold text-red-500 dark:text-red-400 flex items-center gap-1">
                                                                    <span>⚠️</span> -{slot.penalty} {t.penaltyApplied}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                                                                    <span>✨</span> {t.perfectScore}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : isMissed ? (
                                                    <div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.missedTitle}</div>
                                                        <div className="text-sm font-bold text-slate-500 dark:text-slate-500 flex items-center gap-2">
                                                            <span>❄️</span> {t.missedDesc}
                                                        </div>
                                                    </div>
                                                ) : isNextChallenge ? (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{t.nextChallengeLabel}</span>
                                                        </div>
                                                        <div className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-1">
                                                            {t.upcomingPowerPlay}
                                                        </div>
                                                        {timeLeft && (
                                                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                                <span className="text-[10px]">⏰</span> {t.startsIn} <span className="text-amber-600 dark:text-amber-400 font-mono italic">{timeLeft}</span>
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

            {/* 3. MINI LEADERBOARD PREVIEW */}
            <div className="px-4 mb-20">
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">{t.topPlayersToday}</h3>
                        <button onClick={goToGlobalLeaderboard} className="text-orange-600 text-xs font-bold hover:underline">{t.viewAll}</button>
                    </div>
                    {/* Reuse mini list logic or simple placeholder for now */}
                    <div className="space-y-3">
                        {loading ? <SkeletonRow /> : leaderboard.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-6 text-center text-xs font-bold text-slate-400">#{idx + 1}</div>
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    {item.avatar_url ? <img src={item.avatar_url} className="w-full h-full object-cover" /> : null}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.full_name}</div>
                                    <div className="text-[10px] text-slate-500">{item.points.toLocaleString()} pts</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

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
    <div className="flex items-center p-4 border-b border-slate-50 dark:border-slate-700 last:border-0">
        <div className="w-6 h-4 bg-slate-100 dark:bg-slate-700 rounded shimmer mr-4"></div>
        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full shimmer mr-4"></div>
        <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-700 rounded shimmer"></div>
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700 rounded shimmer"></div>
        </div>
        <div className="h-6 w-12 bg-slate-100 dark:bg-slate-700 rounded shimmer"></div>
    </div>
);
