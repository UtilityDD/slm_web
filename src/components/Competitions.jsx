import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { getBadgeByLevel } from '../utils/badgeUtils';
import { cacheHelper } from '../utils/cacheHelper';

export default function Competitions({ language = 'bn', user, setCurrentView, isFullLeaderboard = false, userProfile }) {
    const [loading, setLoading] = useState(true);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [hourlyQuiz, setHourlyQuiz] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [lastAttemptTime, setLastAttemptTime] = useState(null);
    const [reviewMode, setReviewMode] = useState(false);
    const [userRank, setUserRank] = useState(null);
    const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
    const [fullLeaderboard, setFullLeaderboard] = useState([]);
    const [loadingFull, setLoadingFull] = useState(isFullLeaderboard);
    const [serverTimeOffset, setServerTimeOffset] = useState(0);
    const [fetchError, setFetchError] = useState(false);
    const [showCompactView, setShowCompactView] = useState(!isFullLeaderboard);

    // Offline sync state
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null); // 'syncing', 'waiting', 'success', 'failed'
    const [pendingSubmission, setPendingSubmission] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

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
            highStakes: "High Stakes Mode Active",
            highStakesDesc: "Wrong answers deduct 5 points",
            syncing: "Syncing your score...",
            waitingNetwork: "Waiting for network connection...",
            autoRetry: "Auto-retry enabled",
            previousPending: "Previous attempt pending sync",
            retryNow: "Retry Now",
            syncSuccess: "Score synced successfully!",
            syncFailed: "Sync failed. Please retry."
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
            highStakes: "হাই স্টেক মোড সক্রিয়",
            highStakesDesc: "ভুল উত্তরের জন্য ৫ পয়েন্ট কাটা হবে",
            syncing: "আপনার স্কোর সিঙ্ক হচ্ছে...",
            waitingNetwork: "নেটওয়ার্ক সংযোগের জন্য অপেক্ষা করা হচ্ছে...",
            autoRetry: "স্বয়ংক্রিয় পুনঃচেষ্টা সক্রিয়",
            previousPending: "পূর্ববর্তী প্রচেষ্টা সিঙ্কের জন্য অপেক্ষমাণ",
            retryNow: "এখনই পুনঃচেষ্টা করুন",
            syncSuccess: "স্কোর সফলভাবে সিঙ্ক হয়েছে!",
            syncFailed: "সিঙ্ক ব্যর্থ হয়েছে। অনুগ্রহ করে পুনঃচেষ্টা করুন।"
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

    // Network monitoring and pending submission queue
    const handleOnline = () => {
        setIsOnline(true);
        console.log('Network restored');
        // Auto-refresh data when network returns
        if (!hourlyQuiz || fetchError) {
            loadData();
        }
        processPendingQueue();
    };

    const handleOffline = () => {
        setIsOnline(false);
        console.log('Network offline');
    };

    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check for pending submissions on mount
        checkPendingSubmissions();

        // Subtle polling fallback for connectivity check (every 30s)
        const pollInterval = setInterval(() => {
            if (!navigator.onLine && isOnline) {
                handleOffline();
            } else if (navigator.onLine && !isOnline) {
                handleOnline();
            }
        }, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(pollInterval);
        };
    }, [isOnline, hourlyQuiz, fetchError]);

    // Prevent body scroll when full leaderboard modal is open
    useEffect(() => {
        if (showFullLeaderboard) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showFullLeaderboard]);

    // Check for pending submissions in LocalStorage
    const checkPendingSubmissions = () => {
        try {
            const pending = localStorage.getItem('pending_quiz_submissions');
            if (pending) {
                const submissions = JSON.parse(pending);
                if (submissions && submissions.length > 0) {
                    setPendingSubmission(submissions[0]); // Show first pending
                    // Auto-process if online
                    if (navigator.onLine) {
                        processPendingQueue();
                    }
                }
            }
        } catch (error) {
            console.error('Error checking pending submissions:', error);
        }
    };

    // Save failed submission to queue
    const savePendingSubmission = (quizData) => {
        try {
            const existing = localStorage.getItem('pending_quiz_submissions');
            const queue = existing ? JSON.parse(existing) : [];

            // Avoid duplicates
            const isDuplicate = queue.some(item =>
                item.quiz_id === quizData.quiz_id &&
                item.timestamp === quizData.timestamp
            );

            if (!isDuplicate) {
                queue.push(quizData);
                localStorage.setItem('pending_quiz_submissions', JSON.stringify(queue));
                setPendingSubmission(quizData);
                console.log('Saved pending submission:', quizData);
            }
        } catch (error) {
            console.error('Error saving pending submission:', error);
        }
    };

    // Process all pending submissions
    const processPendingQueue = async () => {
        try {
            const pending = localStorage.getItem('pending_quiz_submissions');
            if (!pending) return;

            const queue = JSON.parse(pending);
            if (queue.length === 0) return;

            setIsSyncing(true);
            setSyncStatus('syncing');

            for (let i = 0; i < queue.length; i++) {
                const submission = queue[i];
                await retrySubmission(submission, i);
            }
        } catch (error) {
            console.error('Error processing pending queue:', error);
            setSyncStatus('failed');
        } finally {
            setIsSyncing(false);
        }
    };

    // Retry a single submission
    const retrySubmission = async (submission, index = 0) => {
        try {
            console.log(`Retrying submission ${index + 1}:`, submission);
            setSyncStatus('syncing');

            const { error } = await supabase.rpc('submit_quiz_result', {
                p_quiz_id: submission.quiz_id,
                p_score: submission.score
            });

            if (error) throw error;

            // Success - remove from queue
            await clearPendingSubmission(submission);
            setSyncStatus('success');

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
            setRetryCount(prev => prev + 1);
            throw error;
        }
    };

    // Clear pending submission after success
    const clearPendingSubmission = async (submission) => {
        try {
            const pending = localStorage.getItem('pending_quiz_submissions');
            if (!pending) return;

            const queue = JSON.parse(pending);
            const filtered = queue.filter(item =>
                !(item.quiz_id === submission.quiz_id && item.timestamp === submission.timestamp)
            );

            if (filtered.length > 0) {
                localStorage.setItem('pending_quiz_submissions', JSON.stringify(filtered));
                setPendingSubmission(filtered[0] || null);
            } else {
                localStorage.removeItem('pending_quiz_submissions');
                setPendingSubmission(null);
            }
        } catch (error) {
            console.error('Error clearing pending submission:', error);
        }
    };

    const fetchServerTime = async () => {
        const cachedOffset = cacheHelper.get('server_time_offset');
        if (cachedOffset !== null) {
            setServerTimeOffset(cachedOffset);
            return;
        }

        try {
            const { data, error } = await supabase.rpc('get_server_time');
            if (data) {
                const serverTime = new Date(data).getTime();
                const localTime = Date.now();
                const offset = serverTime - localTime;
                setServerTimeOffset(offset);
                cacheHelper.set('server_time_offset', offset, 30); // Cache for 30 mins
            } else {
                const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
                if (response.ok) {
                    const data = await response.json();
                    const serverTime = new Date(data.datetime).getTime();
                    const localTime = Date.now();
                    const offset = serverTime - localTime;
                    setServerTimeOffset(offset);
                    cacheHelper.set('server_time_offset', offset, 30);
                }
            }
        } catch (error) {
            console.error('Error fetching server time:', error);
        }
    };

    const fetchHourlyQuiz = async () => {
        // Cache key includes language to separate EN/BN quizzes
        const cacheKey = `hourly_quiz_db_bn`;
        const cachedQuiz = cacheHelper.get(cacheKey);

        if (cachedQuiz) {
            setHourlyQuiz(cachedQuiz);
            return;
        }

        try {
            // Fetch 5 random questions from Supabase
            const { data, error } = await supabase.rpc('get_random_hourly_questions', {
                lang: 'bn',
                limit_count: 5
            });

            if (error) {
                console.error('Error fetching hourly quiz from DB:', error);
                setFetchError(true);
                return;
            }

            if (data && data.length > 0) {
                const quizData = {
                    id: 'hourly-challenge',
                    title: language === 'en' ? 'Hourly Safety Challenge' : 'প্রতি ঘন্টায় সুরক্ষা চ্যালেঞ্জ',
                    description: language === 'en' ? 'Test your safety knowledge! New questions every hour.' : 'আপনার সুরক্ষা জ্ঞান পরীক্ষা করুন! প্রতি ঘন্টায় নতুন প্রশ্ন।',
                    duration_minutes: 5,
                    points_reward: 50,
                    questions: data.map((q, index) => ({
                        id: q.id, // Use DB ID
                        question_text: q.question_text,
                        options: q.options,
                        correct_option_index: q.correct_answer_index,
                        category: q.category,
                        tags: q.tags
                    })),
                    isLocal: false // It's now remote
                };

                setHourlyQuiz(quizData);
                // Cache for 1 hour (60 mins) so user sees same quiz for an hour
                cacheHelper.set(cacheKey, quizData, 60);
            } else {
                console.warn('No questions returned from DB');
            }
        } catch (error) {
            console.error('Unexpected error fetching hourly quiz:', error);
            setFetchError(true);
        }
    };

    const fetchLastAttempt = async (quizId) => {
        if (!user) return;
        const cacheKey = `last_attempt_${user.id}_${quizId}`;
        const cachedAttempt = cacheHelper.get(cacheKey);
        if (cachedAttempt) {
            setLastAttemptTime(cachedAttempt);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('quiz_attempts')
                .select('created_at')
                .eq('user_id', user.id)
                .eq('quiz_id', quizId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                setLastAttemptTime(data[0].created_at);
                cacheHelper.set(cacheKey, data[0].created_at, 5); // Cache for 5 mins
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
        const cacheKey = `user_rank_${user.id}`;

        if (!forceRefresh) {
            const cachedRank = cacheHelper.get(cacheKey);
            if (cachedRank) {
                setUserRank(cachedRank);
                return;
            }
        }

        try {
            const { data: myData, error: myError } = await supabase
                .from('leaderboard_view')
                .select('score')
                .eq('user_id', user.id)
                .single();

            if (myError || !myData) return;

            const { count, error: countError } = await supabase
                .from('leaderboard_view')
                .select('*', { count: 'exact', head: true })
                .gt('score', myData.score);

            if (!countError) {
                const rankData = { rank: count + 1, score: myData.score };
                setUserRank(rankData);
                cacheHelper.set(cacheKey, rankData, 5); // Cache for 5 mins
            }
        } catch (error) {
            console.error('Error fetching rank:', error);
        }
    };

    const fetchLeaderboard = async (forceRefresh = false) => {
        if (!forceRefresh) {
            const cachedLeaderboard = cacheHelper.get('leaderboard_top_10_v2');
            if (cachedLeaderboard) {
                setLeaderboard(cachedLeaderboard);
                if (user) fetchUserRank();
                return;
            }
        }

        try {
            const { data, error } = await supabase
                .from('leaderboard_view')
                .select('*')
                .order('score', { ascending: false })
                .limit(10);

            if (error) throw error;

            const formattedData = data.map(item => ({
                ...item,
                points: item.score
            }));

            setLeaderboard(formattedData || []);
            cacheHelper.set('leaderboard_top_10_v2', formattedData || [], 5); // Cache for 5 mins

            if (user) fetchUserRank(forceRefresh);

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setFetchError(true);
        }
    };

    const fetchFullLeaderboard = async () => {
        setLoadingFull(true);
        setShowFullLeaderboard(true);

        const cachedFull = cacheHelper.get('leaderboard_full_v2');
        if (cachedFull) {
            setFullLeaderboard(cachedFull);
            setLoadingFull(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('leaderboard_view')
                .select('*')
                .order('score', { ascending: false })
                .limit(50);

            if (error) throw error;

            const formattedData = data.map(item => ({
                ...item,
                points: item.score
            }));
            setFullLeaderboard(formattedData || []);
            cacheHelper.set('leaderboard_full_v2', formattedData || [], 5); // Cache for 5 mins
        } catch (error) {
            console.error('Error fetching full leaderboard:', error);
        } finally {
            setLoadingFull(false);
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
    };

    const startReview = () => {
        const saved = localStorage.getItem(`review_${hourlyQuiz.id}`);
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

    const handleAnswerSelect = (questionId, optionIndex) => {
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

        const isHighStakes = userRank && userRank.score > 1000;

        if (quizQuestions.length > 0) {
            calculatedScore = correctCount * 10;
            if (isHighStakes) {
                calculatedScore -= (wrongCount * 5);
            }
        }
        setScore(calculatedScore);
        setQuizSubmitted(true);

        // Save for Review (Local Storage) - do this first
        const attemptData = {
            timestamp: new Date().toISOString(),
            questions: quizQuestions,
            answers: userAnswers,
            score: calculatedScore
        };
        localStorage.setItem(`review_${activeQuiz.id}`, JSON.stringify(attemptData));

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
            // Use the RPC function for atomic transaction
            const { error } = await supabase.rpc('submit_quiz_result', {
                p_quiz_id: activeQuiz.id || 'unknown_quiz',
                p_score: calculatedScore
            });

            if (error) throw error;

            // Success!
            setSyncStatus('success');
            setIsSyncing(false);

            // Refresh leaderboard to show updated score immediately (bypass cache)
            await fetchLeaderboard(true);
            // Refresh my rank (bypass cache)
            await fetchUserRank(true);

            // Refresh lock status
            if (activeQuiz && activeQuiz.id) {
                cacheHelper.clear(`last_attempt_${user.id}_${activeQuiz.id}`);
                fetchLastAttempt(activeQuiz.id);
            }

        } catch (error) {
            console.error('Error saving result:', error);
            setIsSyncing(false);

            // Save to pending queue for retry
            const pendingData = {
                quiz_id: activeQuiz.id || 'unknown_quiz',
                user_id: user.id,
                score: calculatedScore,
                timestamp: attemptData.timestamp,
                questions: quizQuestions,
                answers: userAnswers,
                retry_count: 0
            };

            savePendingSubmission(pendingData);

            if (!navigator.onLine) {
                setSyncStatus('waiting');
                alert(t.waitingNetwork + ' ' + t.autoRetry);
            } else {
                setSyncStatus('failed');
                alert(t.syncFailed + ' ' + error.message);
            }
        }
    };

    if (isFullLeaderboard) {
        return (
            <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10 min-h-screen flex flex-col">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                            {language === 'en' ? 'Global Leaderboard' : 'গ্লোবাল লিডারবোর্ড'}
                        </h2>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 font-bold mt-1.5 flex items-center gap-1.5">
                            <span className="text-base">⚡</span>
                            {language === 'en' ? 'Updates every 5 minutes' : 'প্রতি ৫ মিনিটে আপডেট হয়'}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">Rank</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Player</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">District</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Points</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {loadingFull ? (
                                    Array(10).fill(0).map((_, i) => (
                                        <tr key={i} className="h-16">
                                            <td colSpan="4" className="px-6 py-1"><SkeletonRow /></td>
                                        </tr>
                                    ))
                                ) : (
                                    fullLeaderboard.map((item, index) => {
                                        const isMe = item.user_id === user?.id;
                                        const badge = getBadgeByLevel(item.training_level);
                                        return (
                                            <tr key={index} className={`transition-colors h-16 ${isMe ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30'}`}>
                                                <td className="px-6 py-1 text-center">
                                                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm
                                                        ${index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                                            index === 1 ? 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600' :
                                                                index === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                                                    'text-slate-400'}`}>
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden ring-2 ring-white dark:ring-slate-800">
                                                            {item.avatar_url ? (
                                                                <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold uppercase">{item.full_name?.[0] || '?'}</div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-bold text-sm truncate ${isMe ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                                                    {isMe ? (language === 'en' ? 'You' : 'আপনি') : (item.full_name || 'Anonymous')}
                                                                </span>
                                                                {badge && (
                                                                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-tighter ${badge.color}`}>
                                                                        {language === 'en' ? badge.en : badge.bn}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 sm:hidden">{item.district}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-1 hidden sm:table-cell">
                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.district || 'West Bengal'}</span>
                                                </td>
                                                <td className="px-6 py-1 text-right">
                                                    <span className={`text-sm font-black ${isMe ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {item.points.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {!loadingFull && fullLeaderboard.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="text-4xl mb-4">🏆</div>
                            <p className="text-slate-500 font-medium">{language === 'en' ? 'No rankings yet' : 'এখনও কোনো র‍্যাঙ্কিং নেই'}</p>
                        </div>
                    )}
                </div>

                {/* My Rank Sticky Bar */}
                {user && userRank && !loadingFull && (
                    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none">
                        <div className="max-w-md mx-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl shadow-2xl p-5 flex items-center justify-between animate-slide-up pointer-events-auto border border-slate-800 dark:border-slate-200">
                            <div className="flex items-center gap-5">
                                <div className="text-3xl font-black text-blue-400 tracking-tighter">#{userRank.rank}</div>
                                <div className="w-px h-10 bg-slate-800 dark:bg-slate-200"></div>
                                <div>
                                    <div className="font-black text-xs uppercase tracking-widest text-slate-400">Your Standing</div>
                                    <div className="text-lg font-black">{userRank.score.toLocaleString()} <span className="text-[10px] text-slate-500">POINTS</span></div>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-slate-800 dark:bg-slate-100 flex items-center justify-center font-black text-blue-400 border border-slate-700 dark:border-slate-200 overflow-hidden shadow-inner">
                                {userProfile?.avatar_url ? <img src={userProfile.avatar_url} className="w-full h-full object-cover" /> : (userProfile?.full_name?.[0] || 'U')}
                            </div>
                        </div>
                    </div>
                )}
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

                <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 font-bold text-sm`}>
                    <span className="text-lg">🏆</span>
                    {language === 'en' ? 'Competition Mode' : 'প্রতিযোগিতা মোড'}
                </div>
            </div>

            {/* Hourly Quiz Card - Redesigned for Impact */}
            <div className="max-w-md mx-auto mb-12">
                {loading ? (
                    <SkeletonCard />
                ) : hourlyQuiz ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-blue-200 dark:border-blue-800 shadow-sm text-center">
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
                                        'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {isSyncing && (
                                            <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        <div>
                                            <div className={`text-xs font-medium ${syncStatus === 'success' ? 'text-green-700 dark:text-green-300' :
                                                syncStatus === 'failed' ? 'text-red-700 dark:text-red-300' :
                                                    syncStatus === 'waiting' ? 'text-yellow-700 dark:text-yellow-300' :
                                                        'text-blue-700 dark:text-blue-300'
                                                }`}>
                                                {syncStatus === 'syncing' ? t.syncing :
                                                    syncStatus === 'waiting' ? t.waitingNetwork :
                                                        syncStatus === 'success' ? t.syncSuccess :
                                                            syncStatus === 'failed' ? t.syncFailed :
                                                                t.syncing}
                                            </div>
                                            {syncStatus === 'waiting' && (
                                                <div className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-0.5">
                                                    {t.autoRetry}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {syncStatus === 'failed' && !isSyncing && (
                                        <button
                                            onClick={processPendingQueue}
                                            className="px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                                        >
                                            {t.retryNow}
                                        </button>
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
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
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
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Next Quiz In</div>
                                            <div className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-300">
                                                {timeString}
                                            </div>
                                        </div>

                                        <button
                                            onClick={startReview}
                                            className="w-full py-3 rounded-lg font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-sm flex items-center justify-center gap-2"
                                        >
                                            <span>Review Last Attempt</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </button>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => startQuiz(hourlyQuiz)}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
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
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-95'
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
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
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
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-xs"
                            >
                                {language === 'en' ? 'Login Now' : 'এখনই লগইন করুন'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {(() => {
                                // Determine which entries to show
                                const displayEntries = showCompactView
                                    ? (() => {
                                        const top3 = leaderboard.slice(0, 3);
                                        const userIndex = leaderboard.findIndex(item => item.user_id === user?.id);

                                        // If user is in top 3 or not found, just show top 3
                                        if (userIndex === -1 || userIndex < 3) {
                                            return top3;
                                        }

                                        // Otherwise, show top 3 + user's position
                                        const userEntry = { ...leaderboard[userIndex], actualIndex: userIndex };
                                        return [...top3, userEntry];
                                    })()
                                    : leaderboard;

                                return displayEntries.map((item, displayIndex) => {
                                    const isUserRow = item.user_id === user?.id;
                                    const actualIndex = item.actualIndex !== undefined ? item.actualIndex : displayIndex;
                                    const showDivider = showCompactView && displayIndex === 3;

                                    return (
                                        <React.Fragment key={item.user_id || displayIndex}>
                                            {showDivider && (
                                                <div className="px-4 py-2 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <div className="h-px flex-1 bg-slate-300 dark:bg-slate-600"></div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Position</span>
                                                        <div className="h-px flex-1 bg-slate-300 dark:bg-slate-600"></div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`flex items-center p-3 sm:p-4 transition-colors ${isUserRow
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                                }`}>
                                                <div className={`font-bold w-6 text-sm ${actualIndex < 3 ? 'text-yellow-500' : 'text-slate-300'
                                                    }`}>#{actualIndex + 1}</div>
                                                <div className="flex-shrink-0 mr-3">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400 overflow-hidden">
                                                        {item.avatar_url ? <img src={item.avatar_url} alt="" className="w-full h-full object-cover" /> : (item.full_name?.[0] || 'U')}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                                            {item.full_name || 'Anonymous'} {isUserRow && '(You)'}
                                                        </p>
                                                        {getBadgeByLevel(item.training_level) && (
                                                            <div className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-tight ${getBadgeByLevel(item.training_level).color}`}>
                                                                {language === 'en' ? getBadgeByLevel(item.training_level).en : getBadgeByLevel(item.training_level).bn}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                                                        {item.district || 'West Bengal'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-sm sm:text-base font-bold ${isUserRow ? 'text-blue-600 dark:text-blue-400' : 'text-blue-600 dark:text-blue-400'
                                                        }`}>
                                                        {item.points}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t.points}</div>
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
                                                className="mt-2 text-xs text-blue-600 font-bold hover:underline"
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
                                        onClick={fetchFullLeaderboard}
                                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-sm flex items-center gap-2 mx-auto"
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
                            <button onClick={fetchFullLeaderboard} className="text-blue-600 text-sm font-bold">View All</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Full Leaderboard Modal */}
            {showFullLeaderboard && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Leaderboard</h3>
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5 flex items-center gap-1">
                                    <span>⚡</span> {language === 'en' ? 'Updates every 5 minutes' : 'প্রতি ৫ মিনিটে আপডেট হয়'}
                                </p>
                            </div>
                            <button onClick={() => setShowFullLeaderboard(false)} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {loadingFull ? (
                                <div className="text-center py-10 text-slate-400">Loading...</div>
                            ) : (
                                <div className="space-y-2">
                                    {fullLeaderboard.map((item, index) => (
                                        <div key={index} className={`flex items-center p-3 rounded-lg border transition-all ${item.user_id === user?.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                                            }`}>
                                            <div className={`font-bold w-10 text-base ${index < 3 ? 'text-yellow-500' : 'text-slate-400'}`}>#{index + 1}</div>
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 mr-3 overflow-hidden flex-shrink-0">
                                                {item.avatar_url ? <img src={item.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">{item.full_name?.[0]}</div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className={`font-bold truncate text-sm ${item.user_id === user?.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                        {item.user_id === user?.id ? 'You' : item.full_name}
                                                    </div>
                                                    {getBadgeByLevel(item.training_level) && (
                                                        <div className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-tight ${getBadgeByLevel(item.training_level).color}`}>
                                                            {language === 'en' ? getBadgeByLevel(item.training_level).en : getBadgeByLevel(item.training_level).bn}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-500">{item.district}</div>
                                            </div>
                                            <div className={`font-bold text-sm ${item.user_id === user?.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>{item.points}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Quiz Modal */}
            {activeQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                        {!quizSubmitted ? (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{activeQuiz.title}</h3>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs text-slate-500">{t.questions} {currentQuestionIndex + 1} / {quizQuestions.length}</p>
                                            {userRank && userRank.score > 1000 && (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 animate-pulse">
                                                    <span className="text-[10px]">🔥</span>
                                                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{t.highStakes}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveQuiz(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">✕</button>
                                </div>

                                <div className="mb-8">
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mb-6">
                                        <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}></div>
                                    </div>
                                    <h2 className={`reading-content text-lg sm:text-xl font-bold mb-6 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {quizQuestions[currentQuestionIndex]?.question_text}
                                    </h2>
                                    <div className="space-y-2.5">
                                        {quizQuestions[currentQuestionIndex]?.options?.map((option, idx) => {
                                            const isSelected = userAnswers[quizQuestions[currentQuestionIndex].id] === idx;
                                            const isCorrect = idx === quizQuestions[currentQuestionIndex].correct_option_index;

                                            let buttonClass = 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-400';

                                            if (reviewMode) {
                                                if (isCorrect) buttonClass = 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold';
                                                else if (isSelected && !isCorrect) buttonClass = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
                                                else buttonClass = 'border-slate-100 dark:border-slate-800 opacity-60';
                                            } else if (isSelected) {
                                                buttonClass = 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold';
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => !reviewMode && handleAnswerSelect(quizQuestions[currentQuestionIndex].id, idx)}
                                                    disabled={reviewMode}
                                                    className={`w-full text-left p-3.5 rounded-lg border transition-all duration-200 ${buttonClass}`}
                                                >
                                                    <span className="mr-3 text-slate-400 font-mono">{String.fromCharCode(65 + idx)}.</span>
                                                    <span className={`reading-content text-sm sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                        {option}
                                                    </span>
                                                    {reviewMode && isCorrect && <span className="float-right text-green-600">✓</span>}
                                                    {reviewMode && isSelected && !isCorrect && <span className="float-right text-red-600">✗</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        disabled={currentQuestionIndex === 0}
                                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                        className="text-slate-500 hover:text-slate-800 dark:text-slate-200 font-bold text-sm disabled:opacity-30 px-4"
                                    >
                                        ← Prev
                                    </button>
                                    {currentQuestionIndex === quizQuestions.length - 1 ? (
                                        <button onClick={reviewMode ? () => setActiveQuiz(null) : submitQuiz} className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors ${reviewMode ? 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                            {reviewMode ? 'Close Review' : 'Finish Quiz'}
                                        </button>
                                    ) : (
                                        <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors">
                                            Next →
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-6">
                                <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🎉</div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t.completed}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.score}</p>
                                <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">{score}</div>
                                {userRank && userRank.score > 1000 && (
                                    <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-100 dark:border-red-900/30">
                                        <span>⚠️</span> {t.highStakesDesc}
                                    </div>
                                )}
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">Total Points Earned</div>
                                <button onClick={() => { setActiveQuiz(null); setQuizSubmitted(false); }} className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors">
                                    {t.close}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
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
