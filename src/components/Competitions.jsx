import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Competitions({ language = 'en', user, setCurrentView }) {
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
    const [loadingFull, setLoadingFull] = useState(false);
    const [serverTimeOffset, setServerTimeOffset] = useState(0);

    const getSyncedTime = () => {
        return new Date(Date.now() + serverTimeOffset);
    };

    const t = {
        en: {
            title: "Competitions",
            subtitle: "Challenge yourself and win recognition.",
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
            loginReq: "Please login to participate"
        },
        bn: {
            title: "প্রতিযোগিতা",
            subtitle: "নিজেকে চ্যালেঞ্জ করুন এবং স্বীকৃতি জিতুন।",
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
            loginReq: "অংশগ্রহণ করতে লগইন করুন"
        }
    }[language];

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                await fetchServerTime();
                await Promise.all([
                    fetchHourlyQuiz(),
                    fetchLeaderboard()
                ]);
            } catch (error) {
                console.error("Error loading competition data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []); // Run once on mount

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

    const fetchServerTime = async () => {
        try {
            // Try to get server time from Supabase
            const { data, error } = await supabase.rpc('get_server_time');
            if (data) {
                const serverTime = new Date(data).getTime();
                const localTime = Date.now();
                setServerTimeOffset(serverTime - localTime);
            } else {
                // Fallback: Use a public time API if RPC fails
                const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
                if (response.ok) {
                    const data = await response.json();
                    const serverTime = new Date(data.datetime).getTime();
                    const localTime = Date.now();
                    setServerTimeOffset(serverTime - localTime);
                }
            }
        } catch (error) {
            console.error('Error fetching server time:', error);
        }
    };

    const fetchHourlyQuiz = async () => {
        try {
            const response = await fetch('/quizzes/hourly_challenge.json');
            if (response.ok) {
                const data = await response.json();
                setHourlyQuiz({ ...data, isLocal: true });
            }
        } catch (error) {
            console.error('Error fetching hourly quiz:', error);
        }
    };

    const fetchLastAttempt = async (quizId) => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('quiz_attempts')
                .select('created_at')
                .eq('user_id', user.id)
                .eq('quiz_id', quizId)
                .limit(1);

            if (data && data.length > 0) {
                setLastAttemptTime(data[0].created_at);
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



    const fetchUserRank = async () => {
        if (!user) return;
        try {
            // 1. Get my score
            const { data: myData, error: myError } = await supabase
                .from('leaderboard_view')
                .select('score')
                .eq('user_id', user.id)
                .single();

            if (myError || !myData) return;

            // 2. Count people with MORE points than me
            const { count, error: countError } = await supabase
                .from('leaderboard_view')
                .select('*', { count: 'exact', head: true })
                .gt('score', myData.score);

            if (!countError) {
                setUserRank({ rank: count + 1, score: myData.score });
            }
        } catch (error) {
            console.error('Error fetching rank:', error);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            // Query the View which already handles deduping and MAX score
            const { data, error } = await supabase
                .from('leaderboard_view')
                .select('*')
                .order('score', { ascending: false })
                .limit(10);

            if (error) throw error;

            // View returns flat structure
            const formattedData = data.map(item => ({
                ...item, // Keep all fields including user_id if available
                points: item.score
            }));

            setLeaderboard(formattedData || []);

            // Also fetch my specific rank
            if (user) fetchUserRank();

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            if (error.code === '42P01') {
                console.warn("View doesn't exist yet");
            }
        }
    };

    const fetchFullLeaderboard = async () => {
        setLoadingFull(true);
        setShowFullLeaderboard(true);
        try {
            const { data, error } = await supabase
                .from('leaderboard_view')
                .select('*')
                .order('score', { ascending: false })
                .limit(50); // Fetch top 50 for now

            if (error) throw error;

            const formattedData = data.map(item => ({
                ...item,
                points: item.score
            }));
            setFullLeaderboard(formattedData || []);
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
        setActiveQuiz(quiz);

        // Randomly select 5 questions
        if (quiz.questions && quiz.questions.length > 0) {
            const shuffled = [...quiz.questions].sort(() => 0.5 - Math.random());
            setQuizQuestions(shuffled.slice(0, 5));
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
        quizQuestions.forEach(q => {
            if (userAnswers[q.id] === q.correct_option_index) correctCount++;
        });
        if (quizQuestions.length > 0) {
            calculatedScore = correctCount * 10;
        }
        setScore(calculatedScore);
        setQuizSubmitted(true);

        // Always attempt to save result, regardless of quiz source
        try {
            // Use the RPC function for atomic transaction
            const { error } = await supabase.rpc('submit_quiz_result', {
                p_quiz_id: activeQuiz.id || 'unknown_quiz', // Fallback ID if missing
                p_score: calculatedScore
            });

            if (error) throw error;

            // Refresh leaderboard to show updated score immediately
            fetchLeaderboard();
            // Refresh my rank
            fetchUserRank();
            // Refresh lock status
            if (activeQuiz && activeQuiz.id) {
                fetchLastAttempt(activeQuiz.id);
            }

            // Save for Review (Local Storage)
            const attemptData = {
                timestamp: new Date().toISOString(),
                questions: quizQuestions,
                answers: userAnswers,
                score: calculatedScore
            };
            localStorage.setItem(`review_${activeQuiz.id}`, JSON.stringify(attemptData));

        } catch (error) {
            console.error('Error saving result:', error);
            alert(`Error saving score: ${error.message || 'Unknown error'}`);
        }
    };



    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {/* Minimal Header */}
            <div className="text-center mb-12 animate-fade-in">
                <div className="inline-block p-3 rounded-2xl bg-slate-50 mb-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <span className="text-4xl">🏆</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
                    {t.title}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    {t.subtitle}
                </p>
            </div>

            {/* Hourly Quiz Card - Redesigned for Impact */}
            <div className="max-w-md mx-auto mb-16">
                {loading ? (
                    <SkeletonCard />
                ) : (
                    hourlyQuiz && (
                        <div className="relative group animate-scale-up">
                            {/* Decorative Background Glow */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

                            <div className="relative bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                                {/* Top Badge & Timer */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold tracking-wider uppercase">
                                        {t.hourly}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{timeLeft}</span>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="text-center mb-8">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2 leading-tight">
                                        {language === 'en' ? '5 Quizzes Every Hour!' : 'প্রতি ঘন্টায় ৫টি কুইজ!'}
                                    </h3>
                                    <p className="text-blue-600 dark:text-blue-400 font-bold text-lg mb-4">
                                        {language === 'en' ? 'Learn & Win Recognition' : 'শিখুন এবং স্বীকৃতি জিতুন'}
                                    </p>
                                    <div className="flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <span className="text-xl mb-1">📝</span>
                                            <span className="font-medium">5 {t.questions}</span>
                                        </div>
                                        <div className="w-px h-8 bg-slate-100 dark:bg-slate-700"></div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-xl mb-1">💎</span>
                                            <span className="font-medium">50 {t.points}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => startQuiz(hourlyQuiz)}
                                    disabled={(() => {
                                        if (!lastAttemptTime) return false;
                                        const last = new Date(lastAttemptTime);
                                        const now = getSyncedTime();
                                        return last.getHours() === now.getHours() && last.getDate() === now.getDate();
                                    })()}
                                    className={`w-full py-4 rounded-2xl font-bold transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3 shadow-lg ${(() => {
                                        if (!lastAttemptTime) return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none';
                                        const last = new Date(lastAttemptTime);
                                        const now = getSyncedTime();
                                        const isLocked = last.getHours() === now.getHours() && last.getDate() === now.getDate();

                                        return isLocked
                                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none';
                                    })()
                                        }`}
                                >
                                    {(() => {
                                        if (!lastAttemptTime) return (
                                            <>
                                                <span>{t.play}</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                            </>
                                        );
                                        const last = new Date(lastAttemptTime);
                                        const now = getSyncedTime();
                                        const isLocked = last.getHours() === now.getHours() && last.getDate() === now.getDate();

                                        if (isLocked) {
                                            const minutesLeft = 60 - now.getMinutes();
                                            return (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    <span>Next in {minutesLeft}m</span>
                                                </>
                                            );
                                        }
                                        return (
                                            <>
                                                <span>{t.play}</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                            </>
                                        );
                                    })()}
                                </button>

                                {lastAttemptTime && (
                                    <button
                                        onClick={startReview}
                                        className="w-full mt-4 py-3 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-sm"
                                    >
                                        Review Last Attempt
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* Leaderboard - Minimal List */}
            <div className="max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
                <h3 className="text-center font-bold text-slate-800 dark:text-slate-200 mb-8 flex items-center justify-center gap-2">
                    <span>🏅</span> {t.leaderboard}
                </h3>
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100">
                    {loading ? (
                        <>
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </>
                    ) : (
                        <>
                            {leaderboard.map((item, index) => (
                                <div key={index} className="flex items-center p-4 sm:p-6 hover:bg-slate-50 transition-colors">
                                    <div className="font-bold text-slate-300 w-8 text-lg">#{index + 1}</div>
                                    <div className="flex-shrink-0 mr-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-400 overflow-hidden">
                                            {item.avatar_url ? <img src={item.avatar_url} alt="" className="w-full h-full object-cover" /> : (item.full_name?.[0] || 'U')}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                                            {item.full_name || 'Anonymous'}
                                        </p>
                                        <p className="text-xs sm:text-sm text-slate-500 truncate">
                                            {item.district || 'West Bengal'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm sm:text-lg font-bold text-blue-600">
                                            {item.points}
                                        </div>
                                        <div className="text-xs text-slate-400">{t.points}</div>
                                    </div>
                                </div>
                            ))}
                            {leaderboard.length === 0 && (
                                <div className="p-8 text-center text-slate-400">No participants yet. Be the first!</div>
                            )}

                            {/* View All Button */}
                            {leaderboard.length > 0 && (
                                <div className="p-4 text-center border-t border-slate-50">
                                    <button
                                        onClick={fetchFullLeaderboard}
                                        className="text-blue-600 font-bold hover:text-blue-700 text-sm"
                                    >
                                        View Full Leaderboard
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
            {showFullLeaderboard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-3xl sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 z-10">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Leaderboard</h3>
                            <button onClick={() => setShowFullLeaderboard(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {loadingFull ? (
                                <div className="text-center py-10 text-slate-400">Loading...</div>
                            ) : (
                                <div className="space-y-2">
                                    {fullLeaderboard.map((item, index) => (
                                        <div key={index} className={`flex items-center p-3 rounded-xl ${item.user_id === user?.id ? 'bg-blue-50 border border-blue-100' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'}`}>
                                            <div className={`font-bold w-10 text-lg ${index < 3 ? 'text-yellow-500' : 'text-slate-400'}`}>#{index + 1}</div>
                                            <div className="w-10 h-10 rounded-full bg-slate-100 mr-3 overflow-hidden flex-shrink-0">
                                                {item.avatar_url ? <img src={item.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">{item.full_name?.[0]}</div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold truncate ${item.user_id === user?.id ? 'text-blue-700' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {item.user_id === user?.id ? 'You' : item.full_name}
                                                </div>
                                                <div className="text-xs text-slate-500">{item.district}</div>
                                            </div>
                                            <div className={`font-bold ${item.user_id === user?.id ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'}`}>{item.points}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Quiz Modal */}
            {activeQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-10 animate-scale-up max-h-[90vh] overflow-y-auto">
                        {!quizSubmitted ? (
                            <>
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{activeQuiz.title}</h3>
                                        <p className="text-sm text-slate-500">{t.questions} {currentQuestionIndex + 1} / {quizQuestions.length}</p>
                                    </div>
                                    <button onClick={() => setActiveQuiz(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">✕</button>
                                </div>

                                <div className="mb-8">
                                    <div className="w-full bg-slate-100 h-2 rounded-full mb-6">
                                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}></div>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200 leading-relaxed mb-6">
                                        {quizQuestions[currentQuestionIndex]?.question_text}
                                    </h2>
                                    <div className="space-y-3">
                                        {quizQuestions[currentQuestionIndex]?.options.map((option, idx) => {
                                            const isSelected = userAnswers[quizQuestions[currentQuestionIndex].id] === idx;
                                            const isCorrect = idx === quizQuestions[currentQuestionIndex].correct_option_index;

                                            let buttonClass = 'border-slate-100 dark:border-slate-700 hover:border-blue-200 hover:bg-slate-50 text-slate-600 dark:text-slate-400';

                                            if (reviewMode) {
                                                if (isCorrect) buttonClass = 'border-green-500 bg-green-50 text-green-700 font-bold';
                                                else if (isSelected && !isCorrect) buttonClass = 'border-red-500 bg-red-50 text-red-700';
                                                else buttonClass = 'border-slate-100 dark:border-slate-700 opacity-60';
                                            } else if (isSelected) {
                                                buttonClass = 'border-blue-600 bg-blue-50 text-blue-700 font-bold';
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => !reviewMode && handleAnswerSelect(quizQuestions[currentQuestionIndex].id, idx)}
                                                    disabled={reviewMode}
                                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${buttonClass}`}
                                                >
                                                    <span className="mr-3 text-slate-400">{String.fromCharCode(65 + idx)}.</span> {option}
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
                                        className="text-slate-500 hover:text-slate-800 dark:text-slate-200 font-semibold disabled:opacity-30 px-4"
                                    >
                                        ← Prev
                                    </button>
                                    {currentQuestionIndex === quizQuestions.length - 1 ? (
                                        <button onClick={reviewMode ? () => setActiveQuiz(null) : submitQuiz} className={`px-8 py-3 rounded-xl font-bold shadow-md ${reviewMode ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                            {reviewMode ? 'Close Review' : 'Finish Quiz'}
                                        </button>
                                    ) : (
                                        <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md">
                                            Next →
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 animate-scale-up">🎉</div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t.completed}</h2>
                                <p className="text-slate-500 mb-8">{t.score}</p>
                                <div className="text-6xl font-bold text-blue-600 mb-2">{score}</div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">Total Points Earned</div>
                                <button onClick={() => { setActiveQuiz(null); setQuizSubmitted(false); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-xl shadow-slate-200">
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
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse"></div>
            <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="h-8 w-3/4 bg-slate-200 rounded mb-4 animate-pulse"></div>
        <div className="h-4 w-full bg-slate-200 rounded mb-2 animate-pulse"></div>
        <div className="h-4 w-2/3 bg-slate-200 rounded mb-6 animate-pulse"></div>
        <div className="flex gap-4 mb-8">
            <div className="h-4 w-20 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-20 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="h-12 w-full bg-slate-200 rounded-xl animate-pulse"></div>
    </div>
);

const SkeletonRow = () => (
    <div className="flex items-center p-4 sm:p-6 border-b border-slate-50 last:border-0">
        <div className="w-8 h-8 bg-slate-200 rounded animate-pulse mr-4"></div>
        <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse mr-4"></div>
        <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="h-6 w-12 bg-slate-200 rounded animate-pulse"></div>
    </div>
);
