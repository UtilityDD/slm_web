import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { getBadgeByLevel } from '../utils/badgeUtils';
import { cacheHelper } from '../utils/cacheHelper';
import { storageUtils } from '../utils/storageUtils';
import { requestManager } from '../utils/requestManager';

const LiveIndicator = () => (
    <div className="live-pulse" title="Live Now">
        <span className="live-pulse-ring"></span>
        <span className="live-pulse-dot"></span>
    </div>
);

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

    // Offline sync state
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null); // 'syncing', 'waiting', 'success', 'failed'
    const [pendingSubmission, setPendingSubmission] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [syncErrorMessage, setSyncErrorMessage] = useState(null);

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
            noHint: "No hint available for this question"
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
            noHint: "এই প্রশ্নের জন্য কোনো ইঙ্গিত নেই"
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

            // Also refresh leaderboard for immediate feedback
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
        if (pendingSubmission && pendingSubmission.quiz_id === quiz.id) {
            alert(t.previousPending + '. ' + (isOnline ? t.retryNow : t.waitingNetwork));
            return;
        }

        setActiveQuiz(quiz);

        // Randomly select 5 questions and shuffle their options
        if (quiz.questions && quiz.questions.length > 0) {
            const shuffledQuestions = [...quiz.questions].sort(() => 0.5 - Math.random());
            const selectedQuestions = shuffledQuestions.slice(0, 5).map(q => {
                if (!q.options || q.options.length === 0) return q;

                // Store the correct answer text before shuffling options
                const correctAnswerText = q.options[q.correct_option_index];

                // Shuffle the options array
                const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());

                // Find the new index of the correct answer
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

        // Submit immediately if user is logged in
        if (user) {
            await submitHourlyQuiz(calculatedScore, penalty);
        }

        // IMMEDIATE LOCK: Update local state to show countdown timer instantly
        // This ensures "Play Now" is disabled regardless of network status
        if (activeQuiz && activeQuiz.id === hourlyQuiz?.id) {
            setLastAttemptTime(attemptData.timestamp);
            const cacheKey = `last_attempt_${user.id}_${activeQuiz.id}`;
            cacheHelper.set(cacheKey, attemptData.timestamp, 5);
        }

        // Attempt to save to Supabase
        setIsSyncing(true);
        setSyncStatus('syncing');

        try {
            // Use the safe RPC helper to handle potential database version mismatches
            const { error } = await safeSubmitQuizResult(
                activeQuiz.id || 'unknown_quiz',
                calculatedScore,
                penalty
            );

            if (error) throw error;

            // Success!
            setSyncStatus('success');
            setSyncErrorMessage(null);
            // setIsSyncing(false); // Moved down to keep loading state valid during fetch
            setLastAttemptPenalty(penalty);

            // Refresh leaderboard to show updated score immediately (bypass cache)
            await fetchLeaderboard(true);
            // Refresh my rank (bypass cache)
            await fetchUserRank(true);
            // Sync with global profile state for instant sidebar/home update
            if (refreshProfile) {
                await refreshProfile(user);
            }

            setIsSyncing(false); // Now we are done

            // Refresh lock status
            if (activeQuiz && activeQuiz.id) {
                cacheHelper.clear(`last_attempt_${user.id}_${activeQuiz.id}`);
                fetchLastAttempt(activeQuiz.id);
            }

        } catch (error) {
            console.error('Error saving result:', error);
            setIsSyncing(false);
            setSyncStatus('failed');

            if (error.message?.includes('JWT') || error.code === 'P0001' || error.message?.includes('authenticated')) {
                setSyncErrorMessage('Session expired. Please login again.');
            } else {
                setSyncErrorMessage(error.message || 'Sync failed');
            }
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {/* Minimal Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        {t.title}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {lastAttemptPenalty > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-red-50 text-red-700 border border-red-100 font-bold text-sm animate-fade-in shadow-sm">
                            <span className="text-lg">🔥</span>
                            <span className="hidden xs:inline">{language === 'en' ? 'Last Loss:' : 'শেষ হারানো:'}</span>
                            <span>-{lastAttemptPenalty}</span>
                        </div>
                    )}
                    <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-orange-50 text-orange-700 border border-orange-100 font-bold text-sm`}>
                        <span className="text-lg">🏆</span>
                        {language === 'en' ? 'Competition Mode' : 'প্রতিযোগিতা মোড'}
                    </div>
                </div>
            </div>

            {/* Hourly Quiz Card - Redesigned for Impact */}
            <div className="max-w-md mx-auto mb-12">
                {loading ? (
                    <SkeletonCard />
                ) : hourlyQuiz ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-orange-200 dark:border-orange-800 shadow-sm text-center">
                        <div className="mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">
                                5 {language === 'en' ? 'Quizzes Every Hour!' : 'কুইজ প্রতি ঘন্টায়!'}
                            </h2>
                            <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex flex-col items-center">
                                    <span className="text-xl mb-1">📝</span>
                                    <span className="font-bold">5 {t.questions}</span>
                                </div>
                                <div className="w-px h-8 bg-slate-100 dark:bg-slate-700"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-xl mb-1">💎</span>
                                    <span className="font-bold">50 {t.points}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Area */}
                        {/* Sync Status Indicator */}
                        {(isSyncing || pendingSubmission) && (
                            <div className={`mb-3 p-3 rounded-lg border ${syncStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                                syncStatus === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                    syncStatus === 'waiting' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                                        'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {isSyncing && (
                                            <svg className="animate-spin h-4 w-4 text-orange-600 dark:text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        <div>
                                            <div className={`text-xs font-medium ${syncStatus === 'success' ? 'text-green-700 dark:text-green-300' :
                                                syncStatus === 'failed' ? 'text-red-700 dark:text-red-300' :
                                                    syncStatus === 'waiting' ? 'text-yellow-700 dark:text-yellow-300' :
                                                        'text-orange-700 dark:text-orange-300'
                                                }`}>
                                                {syncStatus === 'syncing' ? t.syncing :
                                                    syncStatus === 'waiting' ? t.waitingNetwork :
                                                        syncStatus === 'success' ? t.syncSuccess :
                                                            syncStatus === 'failed' ? t.syncFailed :
                                                                t.syncing}
                                            </div>
                                            {syncErrorMessage && syncStatus === 'failed' && (
                                                <div className="text-[9px] text-red-500/80 dark:text-red-400/80 mt-0.5 font-medium max-w-[150px] truncate" title={syncErrorMessage}>
                                                    Error: {syncErrorMessage}
                                                </div>
                                            )}
                                            {syncStatus === 'waiting' && (
                                                <div className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-0.5">
                                                    {t.autoRetry}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {syncStatus === 'failed' && !isSyncing && (
                                        syncErrorMessage?.includes('Session expired') ? (
                                            <button
                                                onClick={() => setCurrentView('login')}
                                                className="px-3 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded transition-colors"
                                            >
                                                {language === 'en' ? 'Login' : 'লগইন'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => submitHourlyQuiz(score, lastAttemptPenalty)} // Retry with last calculated values
                                                className="px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                                            >
                                                {t.retryNow}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        {(() => {
                            if (!lastAttemptTime) {
                                return (
                                    <button
                                        onClick={() => startQuiz(hourlyQuiz)}
                                        disabled={pendingSubmission && pendingSubmission.quiz_id === hourlyQuiz.id}
                                        className={`w-full py-3 ${(pendingSubmission && pendingSubmission.quiz_id === hourlyQuiz.id)
                                            ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-400'
                                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                                            } font-bold rounded-lg transition-colors flex items-center justify-center gap-2`}
                                    >
                                        <span>{t.play}</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </button>
                                );
                            }

                            const last = new Date(lastAttemptTime);
                            const now = getSyncedTime();
                            const isLocked =
                                last.getFullYear() === now.getFullYear() &&
                                last.getMonth() === now.getMonth() &&
                                last.getDate() === now.getDate() &&
                                last.getHours() === now.getHours();

                            if (isLocked) {
                                const minutesLeft = 59 - now.getMinutes();
                                const secondsLeft = 59 - now.getSeconds();
                                const timeString = `${minutesLeft}:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;

                                return (
                                    <div className="space-y-4">
                                        {/* Locked Status Card */}
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Next Quiz In</div>
                                                    <div className="flex items-baseline gap-3">
                                                        <div className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-300">
                                                            {timeString}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Optional: Add a small icon or secondary label if needed */}
                                            </div>
                                        </div>

                                        <button
                                            onClick={startReview}
                                            className="w-full py-3 rounded-lg font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all text-sm flex items-center justify-center gap-2"
                                        >
                                            <span>Review Last Attempt</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </button>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-3">
                                    {lastAttemptPenalty > 0 && (
                                        <div className="text-center mb-1">
                                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tight bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/30">
                                                Last Penalty: -{lastAttemptPenalty} Points
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => startQuiz(hourlyQuiz)}
                                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span>{t.play}</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </button>
                                    <button
                                        onClick={startReview}
                                        className="w-full py-2 rounded-lg font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all text-xs"
                                    >
                                        Review Last Attempt
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 text-center shadow-sm animate-fade-in">
                        <div className="w-20 h-20 mx-auto mb-6 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center relative">
                            <span className="text-4xl">📡</span>
                            {!isOnline && (
                                <div className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center">
                                    <span className="text-[10px] text-white font-bold">!</span>
                                </div>
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                            {language === 'en' ? 'Connection Lost' : 'সংযোগ বিচ্ছিন্ন হয়েছে'}
                        </h3>

                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                            {language === 'en'
                                ? "We can't reach the safety servers right now. Don't worry, we'll automatically reconnect when you're back online."
                                : "আমরা এই মুহূর্তে সার্ভারের সাথে সংযোগ করতে পারছি না। চিন্তা করবেন না, ইন্টারনেট ফিরে এলে আমরা স্বয়ংক্রিয়ভাবে আবার চেষ্টা করব।"}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => loadData()}
                                disabled={loading}
                                className={`w-full py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${loading
                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 active:scale-95'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>{language === 'en' ? 'Checking...' : 'পরীক্ষা করা হচ্ছে...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>{language === 'en' ? 'Try Again Now' : 'এখনই আবার চেষ্টা করুন'}</span>
                                    </>
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                {language === 'en' ? 'Auto-refresh active' : 'স্বয়ংক্রিয় রিফ্রেশ সক্রিয়'}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Leaderboard - Minimal List */}
            <div className="max-w-5xl mx-auto">
                <h3 className="text-center font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center justify-center gap-2 text-sm">
                    <span>🏅</span> {t.leaderboard}
                </h3>

                {user && userRank && !loading && (
                    <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md p-3 sm:p-4 mb-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                                    {language === 'en' ? 'Your Standing' : 'আপনার অবস্থান'}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">#{userRank.rank}</p>
                                    {getBadgeByLevel(userProfile?.training_level || 0) && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border shadow-sm ${getBadgeByLevel(userProfile?.training_level || 0).color}`}>
                                            {language === 'en' ? getBadgeByLevel(userProfile?.training_level || 0).en : getBadgeByLevel(userProfile?.training_level || 0).bn}
                                        </span>
                                    )}
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">{userRank.score.toLocaleString()} pts</p>
                                </div>
                            </div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-orange-600 dark:text-orange-300 border border-slate-200 dark:border-slate-600 overflow-hidden shrink-0">
                                {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (userProfile?.full_name?.[0] || 'U')}
                            </div>
                        </div>
                    </div>
                )}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                    {loading ? (
                        <>
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </>
                    ) : !user ? (
                        <div className="p-8 text-center">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-sm">
                                {language === 'en' ? 'Login to view Leaderboard' : 'লিডারবোর্ড দেখতে লগইন করুন'}
                            </h4>
                            <button
                                onClick={() => setCurrentView('login')}
                                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors text-xs"
                            >
                                {language === 'en' ? 'Login Now' : 'এখনই লগইন করুন'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Podium-Style Top 3 */}
                            {leaderboard.length >= 3 && (
                                <div className="px-4 py-6 sm:py-8">
                                    {/* Winners podium */}
                                    <div className="flex items-end justify-center gap-2 sm:gap-4 mb-6 max-w-md mx-auto">
                                        {/* 2nd Place (Left) */}
                                        <div className="flex-1 flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                            <div className="relative mb-2">
                                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center font-bold text-white border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden">
                                                    {leaderboard[1].avatar_url ? (
                                                        <img src={leaderboard[1].avatar_url} alt="2nd" className="w-full h-full object-cover" />
                                                    ) : (
                                                        leaderboard[1].full_name?.[0] || 'U'
                                                    )}
                                                </div>
                                                <div className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-600 rounded-full flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-lg border-2 border-white dark:border-slate-800">
                                                    2
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-t-xl px-3 py-4 sm:py-6 w-full flex flex-col items-center shadow-xl border-t-4 border-slate-400 dark:border-slate-500">
                                                <p className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 truncate w-full text-center mb-1">{leaderboard[1].full_name || 'Anonymous'}</p>
                                                <p className="text-[10px] sm:text-xs font-bold text-orange-600 dark:text-orange-400">🏆 {leaderboard[1].points.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* 1st Place (Center - Tallest) */}
                                        <div className="flex-1 flex flex-col items-center animate-slide-up" style={{ animationDelay: '0s' }}>
                                            <div className="relative mb-2">
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 flex items-center justify-center font-bold text-white border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden">
                                                    {leaderboard[0].avatar_url ? (
                                                        <img src={leaderboard[0].avatar_url} alt="1st" className="w-full h-full object-cover" />
                                                    ) : (
                                                        leaderboard[0].full_name?.[0] || 'U'
                                                    )}
                                                </div>
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl animate-bounce-subtle">
                                                    👑
                                                </div>
                                                <div className="absolute -bottom-2  -right-2 w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-black text-sm sm:text-base shadow-xl border-2 border-white dark:border-slate-800">
                                                    1
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-b from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 rounded-t-xl px-3 py-6 sm:py-10 w-full flex flex-col items-center shadow-2xl border-t-4 border-yellow-500">
                                                <p className="text-sm sm:text-base font-black text-slate-800 dark:text-yellow-200 truncate w-full text-center mb-1">{leaderboard[0].full_name || 'Anonymous'}</p>
                                                <p className="text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400">🏆 {leaderboard[0].points.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* 3rd Place (Right) */}
                                        <div className="flex-1 flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                            <div className="relative mb-2">
                                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800 flex items-center justify-center font-bold text-white border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden">
                                                    {leaderboard[2].avatar_url ? (
                                                        <img src={leaderboard[2].avatar_url} alt="3rd" className="w-full h-full object-cover" />
                                                    ) : (
                                                        leaderboard[2].full_name?.[0] || 'U'
                                                    )}
                                                </div>
                                                <div className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800 rounded-full flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-lg border-2 border-white dark:border-slate-800">
                                                    3
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-b from-amber-200 to-amber-300 dark:from-amber-900/40 dark:to-amber-800/40 rounded-t-xl px-3 py-3 sm:py-5 w-full flex flex-col items-center shadow-xl border-t-4 border-amber-600 dark:border-amber-700">
                                                <p className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200 truncate w-full text-center mb-1">{leaderboard[2].full_name || 'Anonymous'}</p>
                                                <p className="text-[10px] sm:text-xs font-bold text-orange-600 dark:text-orange-400">🏆 {leaderboard[2].points.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Remaining positions (4th onwards) */}
                            {(() => {
                                const entries = showCompactView
                                    ? (() => {
                                        const userIndex = leaderboard.findIndex(item => item.user_id === user?.id);
                                        // If user is rank 4 or lower, show them extra
                                        if (userIndex >= 3) {
                                            const userEntry = { ...leaderboard[userIndex], actualIndex: userIndex, isRemoteUser: true };
                                            // Show some entries around or just the user
                                            return [userEntry];
                                        }
                                        return []; // No extra entries if user in top 3 or compact view doesn't need them
                                    })()
                                    : leaderboard.slice(3);

                                return entries.map((item, index) => {
                                    const actualIndex = item.actualIndex !== undefined ? item.actualIndex : index + 3;
                                    const isUserRow = item.user_id === user?.id;
                                    const showDivider = showCompactView && actualIndex >= 3;

                                    return (
                                        <React.Fragment key={item.user_id || actualIndex}>
                                            {showDivider && (
                                                <div className="px-4 py-2 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-y border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <div className="h-px flex-1 bg-slate-300 dark:bg-slate-600"></div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Position</span>
                                                        <div className="h-px flex-1 bg-slate-300 dark:bg-slate-600"></div>
                                                    </div>
                                                </div>
                                            )}
                                            <div
                                                className={`flex items-center p-3 sm:p-4 transition-all duration-300 relative overflow-hidden border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${isUserRow
                                                    ? 'bg-orange-50/50 dark:bg-orange-900/10'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                                    }`}
                                            >
                                                {/* User Row Shimmer Effect */}
                                                {isUserRow && (
                                                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                                                        <div className="shimmer h-full w-full"></div>
                                                    </div>
                                                )}

                                                <div className="flex flex-col items-center justify-center w-7 sm:w-8 shrink-0">
                                                    <span className="text-sm sm:text-base font-black text-slate-400 dark:text-slate-500">
                                                        #{actualIndex + 1}
                                                    </span>
                                                </div>

                                                <div className="relative shrink-0 mx-2">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm">
                                                        {item.avatar_url ? (
                                                            <img src={item.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            item.full_name?.[0] || 'U'
                                                        )}
                                                    </div>
                                                    {/* Live / Activity Indicator */}
                                                    <div className="absolute -bottom-1 -right-1 z-10">
                                                        {isUserRow ? (
                                                            <LiveIndicator />
                                                        ) : (
                                                            item.updated_at && (new Date() - new Date(item.updated_at) < 15 * 60 * 1000) && (
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" title="Recently Active"></div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h4 className={`font-bold truncate text-sm sm:text-base ${isUserRow ? 'text-orange-700 dark:text-orange-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                            {item.full_name || 'Anonymous'} {isUserRow && language === 'en' && '(You)'}
                                                        </h4>
                                                        {item.training_level > 0 && getBadgeByLevel(item.training_level) && (
                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-tighter border shadow-sm shrink-0 ${getBadgeByLevel(item.training_level).color}`}>
                                                                {language === 'en' ? getBadgeByLevel(item.training_level).en : getBadgeByLevel(item.training_level).bn}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                                                        <span className="flex items-center gap-1">🏆 {item.points.toLocaleString()} {t.points}</span>
                                                        {(item.completed_lessons?.length > 0) && (
                                                            <span className="flex items-center gap-1 opacity-75">📚 {item.completed_lessons.length}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                });
                            })()}
                            {leaderboard.length === 0 && (
                                <div className="p-8 text-center text-slate-400">
                                    {fetchError ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-2xl">📡</span>
                                            <p className="text-sm font-medium">
                                                {language === 'en'
                                                    ? "Unable to load leaderboard. Please check your connection."
                                                    : "লিডারবোর্ড লোড করা সম্ভব হয়নি। আপনার ইন্টারনেট কানেকশন চেক করুন।"}
                                            </p>
                                            <button
                                                onClick={() => fetchLeaderboard(true)}
                                                className="mt-2 text-xs text-orange-600 font-bold hover:underline"
                                            >
                                                {language === 'en' ? "Try Again" : "আবার চেষ্টা করুন"}
                                            </button>
                                        </div>
                                    ) : (
                                        language === 'en' ? "No participants yet. Be the first!" : "এখনও কেউ অংশগ্রহণ করেনি। আপনিই প্রথম হোন!"
                                    )}
                                </div>
                            )}

                            {/* View All/Collapse Button */}
                            {leaderboard.length > 3 && (
                                <div className="p-3 text-center bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        onClick={goToGlobalLeaderboard}
                                        className="text-orange-600 dark:text-orange-400 font-bold hover:underline text-sm flex items-center gap-2 mx-auto"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {language === 'en' ? 'View Full Leaderboard' : 'সম্পূর্ণ লিডারবোর্ড দেখুন'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Sticky My Rank (if User exists and Rank exists) */}
                {user && userRank && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 p-4 shadow-2xl transform transition-transform duration-300 z-40 sm:hidden">
                        <div className="flex items-center justify-between max-w-sm mx-auto">
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-bold text-slate-400">#{userRank.rank}</span>
                                <div className="text-sm">
                                    <div className="font-bold text-slate-800 dark:text-slate-200">You</div>
                                    <div className="text-slate-500 text-xs">{userRank.score} pts</div>
                                </div>
                            </div>
                            <button onClick={goToGlobalLeaderboard} className="text-orange-600 text-sm font-bold">View All</button>
                        </div>
                    </div>
                )}
            </div>


            {/* Quiz Modal */}
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
                                    <button onClick={() => setActiveQuiz(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">✕</button>
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

                                <button onClick={() => { setActiveQuiz(null); setQuizSubmitted(false); }} className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors">
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
