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
            leaderboard: "Top Performers",
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
            leaderboard: "সেরা পারফর্মার",
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

        // Timer Logic
        const updateTimer = () => {
            const now = new Date();
            const minutes = 59 - now.getMinutes();
            const seconds = 59 - now.getSeconds();
            setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

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



    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, district, points, avatar_url')
                .order('points', { ascending: false })
                .limit(5); // Limit to top 5 for minimal view

            if (error) throw error;
            setLeaderboard(data || []);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
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

        if (!activeQuiz.isLocal) {
            try {
                await supabase.from('quiz_attempts').insert({
                    user_id: user.id,
                    quiz_id: activeQuiz.id,
                    score: calculatedScore
                });
                const { data: profile } = await supabase.from('profiles').select('points').eq('id', user.id).single();
                await supabase.from('profiles').update({ points: (profile?.points || 0) + calculatedScore }).eq('id', user.id);
                fetchLeaderboard();
            } catch (error) {
                console.error('Error saving result:', error);
            }
        }
    };



    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {/* Minimal Header */}
            <div className="text-center mb-12 animate-fade-in">
                <div className="inline-block p-3 rounded-2xl bg-slate-50 mb-4 shadow-sm border border-slate-100">
                    <span className="text-4xl">🏆</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                    {t.title}
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    {t.subtitle}
                </p>
            </div>

            {/* Hourly Quiz Card Centered */}
            <div className="max-w-md mx-auto mb-16">
                {loading ? (
                    <SkeletonCard />
                ) : (
                    hourlyQuiz && (
                        <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-sm hover:shadow-blue-100 transition-all group relative overflow-hidden animate-scale-up">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-9xl">⏱️</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900">{t.hourly}</h2>
                                            <p className="text-xs text-blue-600 font-bold">Live Now</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-mono font-bold text-slate-800 tracking-wider">
                                            {timeLeft}
                                        </div>
                                        <div className="text-xs text-slate-400">Next in</div>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-slate-800 mb-2">{hourlyQuiz.title}</h3>
                                <p className="text-slate-500 mb-6 line-clamp-2">{hourlyQuiz.description}</p>

                                <div className="flex items-center gap-4 text-sm text-slate-500 mb-8">
                                    <span className="flex items-center gap-1">❓ 5 {t.questions}</span>
                                    <span className="flex items-center gap-1">🎫 50 {t.points}</span>
                                </div>

                                <button onClick={() => startQuiz(hourlyQuiz)} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-200 transition-colors flex items-center justify-center gap-2">
                                    <span>{t.play}</span>
                                    <span className="text-blue-200">→</span>
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* Leaderboard - Minimal List */}
            <div className="max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
                <h3 className="text-center font-bold text-slate-800 mb-8 flex items-center justify-center gap-2">
                    <span>🏅</span> {t.leaderboard}
                </h3>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
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
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 overflow-hidden">
                                            {item.avatar_url ? <img src={item.avatar_url} alt="" className="w-full h-full object-cover" /> : (item.full_name?.[0] || 'U')}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm sm:text-lg font-bold text-slate-900 truncate">
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
                                <div className="p-8 text-center text-slate-400">Loading leaders...</div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Quiz Modal */}
            {activeQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-10 animate-scale-up max-h-[90vh] overflow-y-auto">
                        {!quizSubmitted ? (
                            <>
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{activeQuiz.title}</h3>
                                        <p className="text-sm text-slate-500">{t.questions} {currentQuestionIndex + 1} / {quizQuestions.length}</p>
                                    </div>
                                    <button onClick={() => setActiveQuiz(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">✕</button>
                                </div>

                                <div className="mb-8">
                                    <div className="w-full bg-slate-100 h-2 rounded-full mb-6">
                                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}></div>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-semibold text-slate-800 leading-relaxed mb-6">
                                        {quizQuestions[currentQuestionIndex]?.question_text}
                                    </h2>
                                    <div className="space-y-3">
                                        {quizQuestions[currentQuestionIndex]?.options.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswerSelect(quizQuestions[currentQuestionIndex].id, idx)}
                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${userAnswers[quizQuestions[currentQuestionIndex].id] === idx
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                                                    : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-600'
                                                    }`}
                                            >
                                                <span className="mr-3 text-slate-400">{String.fromCharCode(65 + idx)}.</span> {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                                    <button
                                        disabled={currentQuestionIndex === 0}
                                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                        className="text-slate-500 hover:text-slate-800 font-semibold disabled:opacity-30 px-4"
                                    >
                                        ← Prev
                                    </button>
                                    {currentQuestionIndex === quizQuestions.length - 1 ? (
                                        <button onClick={submitQuiz} className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md">
                                            Finish Quiz
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
                                <h2 className="text-3xl font-bold text-slate-900 mb-2">{t.completed}</h2>
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
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
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
