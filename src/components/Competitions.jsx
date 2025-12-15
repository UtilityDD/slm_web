import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Competitions({ language = 'en', user }) {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [hourlyQuiz, setHourlyQuiz] = useState(null);

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
        fetchQuizzes();
        fetchLeaderboard();
        fetchHourlyQuiz();
    }, []);

    const fetchHourlyQuiz = async () => {
        try {
            const response = await fetch('/quizzes/hourly_challenge.json');
            const data = await response.json();
            setHourlyQuiz({ ...data, isLocal: true });
        } catch (error) {
            console.error('Error fetching hourly quiz:', error);
        }
    };

    const fetchQuizzes = async () => {
        try {
            const { data, error } = await supabase
                .from('quizzes')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setQuizzes(data || []);
        } catch (error) {
            console.error('Error fetching quizzes:', error);
        } finally {
            setLoading(false);
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
            alert(t.loginReq);
            return;
        }
        setActiveQuiz(quiz);

        if (quiz.isLocal) {
            setQuizQuestions(quiz.questions || []);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setQuizSubmitted(false);
            setScore(0);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('quiz_questions')
                .select('*')
                .eq('quiz_id', quiz.id);

            if (error) throw error;
            setQuizQuestions(data || []);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setQuizSubmitted(false);
            setScore(0);
        } catch (error) {
            console.error('Error fetching questions:', error);
            alert('Failed to load quiz');
            setActiveQuiz(null);
        } finally {
            setLoading(false);
        }
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
            calculatedScore = Math.round((correctCount / quizQuestions.length) * activeQuiz.points_reward);
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

    const featuredQuiz = quizzes.find(q => q.title.includes('Monsoon')) || quizzes[0];

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

            {/* Quiz Cards - 2 Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto mb-16">
                {/* 1. Weekly Challenge */}
                {featuredQuiz && (
                    <div className="bg-white rounded-3xl p-8 border border-yellow-100 shadow-sm hover:shadow-yellow-100 transition-all group relative overflow-hidden animate-scale-up">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-9xl">⚡</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">{t.weekly}</h2>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">{featuredQuiz.title}</h3>
                            <p className="text-slate-500 mb-6 line-clamp-2">{featuredQuiz.description}</p>

                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-8">
                                <span className="flex items-center gap-1">⏱️ {featuredQuiz.duration_minutes} {t.mins}</span>
                                <span className="flex items-center gap-1">🎫 {featuredQuiz.points_reward} {t.points}</span>
                            </div>

                            <button onClick={() => startQuiz(featuredQuiz)} className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold shadow-md shadow-yellow-200 transition-colors">
                                {t.play}
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. Hourly Quiz */}
                {hourlyQuiz && (
                    <div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-sm hover:shadow-blue-100 transition-all group relative overflow-hidden animate-scale-up" style={{ animationDelay: '100ms' }}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-9xl">⏱️</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">{t.hourly}</h2>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">General Knowledge</h3>
                            <p className="text-slate-500 mb-6 line-clamp-2">{hourlyQuiz.description}</p>

                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-8">
                                <span className="flex items-center gap-1">⏱️ {hourlyQuiz.duration_minutes} {t.mins}</span>
                                <span className="flex items-center gap-1">🎫 {hourlyQuiz.points_reward} {t.points}</span>
                            </div>

                            <button onClick={() => startQuiz(hourlyQuiz)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-200 transition-colors">
                                {t.play}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Leaderboard - Minimal List */}
            <div className="max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
                <h3 className="text-center font-bold text-slate-800 mb-8 flex items-center justify-center gap-2">
                    <span>🏅</span> {t.leaderboard}
                </h3>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
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
