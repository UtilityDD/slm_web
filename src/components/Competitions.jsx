import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Competitions({ language = 'en', user }) {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeQuiz, setActiveQuiz] = useState(null); // The quiz currently being taken
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({}); // { questionId: selectedOptionIndex }
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);

    const t = {
        en: {
            title: "Competitions & Quizzes",
            subtitle: "Test your knowledge, compete with peers, and win recognition.",
            weeklyChallenge: "WEEKLY CHALLENGE",
            questions: "Questions",
            duration: "Duration",
            points: "Points",
            participants: "Participants",
            startQuiz: "Start Quiz Now",
            dailyQuiz: "Daily Lightning Round",
            leaderboard: "Regional Leaderboard",
            yourStats: "Your Performance",
            hallOfFame: "Hall of Fame",
            loading: "Loading competitions...",
            submit: "Submit Quiz",
            next: "Next",
            previous: "Previous",
            completed: "Quiz Completed!",
            scoreMsg: "You scored",
            earned: "Points Earned",
            close: "Close",
            loginReq: "Please login to participate"
        },
        bn: {
            title: "প্রতিযোগিতা এবং কুইজ",
            subtitle: "আপনার জ্ঞান পরীক্ষা করুন, সহকর্মীদের সাথে প্রতিযোগিতা করুন এবং স্বীকৃতি জিতুন।",
            weeklyChallenge: "সাপ্তাহিক চ্যালেঞ্জ",
            questions: "প্রশ্ন",
            duration: "সময়",
            points: "পয়েন্ট",
            participants: "অংশগ্রহণকারী",
            startQuiz: "কুইজ শুরু করুন",
            dailyQuiz: "দৈনিক লাইটনিং রাউন্ড",
            leaderboard: "আঞ্চলিক লিডারবোর্ড",
            yourStats: "আপনার পারফরম্যান্স",
            hallOfFame: "হল অফ ফেম",
            loading: "প্রতিযোগিতা লোড হচ্ছে...",
            submit: "কুইজ জমা দিন",
            next: "পরবর্তী",
            previous: "পূর্ববর্তী",
            completed: "কুইজ সম্পন্ন হয়েছে!",
            scoreMsg: "আপনার স্কোর",
            earned: "অর্জিত পয়েন্ট",
            close: "বন্ধ করুন",
            loginReq: "অংশগ্রহণ করতে লগইন করুন"
        }
    }[language];

    useEffect(() => {
        fetchQuizzes();
        fetchLeaderboard();
    }, []);

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
                .limit(10);

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
        setLoading(true);
        try {
            let questions = [];

            if (quiz.questions_url) {
                // Fetch from JSON file
                const response = await fetch(quiz.questions_url);
                if (!response.ok) throw new Error('Failed to fetch quiz data');
                questions = await response.json();

                // Shuffle and select 10 random questions
                if (questions.length > 10) {
                    for (let i = questions.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [questions[i], questions[j]] = [questions[j], questions[i]];
                    }
                    questions = questions.slice(0, 10);
                }
            } else {
                // Fallback to database (legacy)
                const { data, error } = await supabase
                    .from('quiz_questions')
                    .select('*')
                    .eq('quiz_id', quiz.id);

                if (error) throw error;
                questions = data || [];
            }

            setQuizQuestions(questions);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setQuizSubmitted(false);
            setScore(0);
        } catch (error) {
            console.error('Error fetching questions:', error);
            alert('Failed to load quiz. Please try again.');
            setActiveQuiz(null);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (questionId, optionIndex) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: optionIndex
        }));
    };

    const submitQuiz = async () => {
        let calculatedScore = 0;
        let correctCount = 0;

        quizQuestions.forEach(q => {
            if (userAnswers[q.id] === q.correct_option_index) {
                correctCount++;
            }
        });

        // Simple scoring: (correct / total) * max_points
        if (quizQuestions.length > 0) {
            calculatedScore = Math.round((correctCount / quizQuestions.length) * activeQuiz.points_reward);
        }

        setScore(calculatedScore);
        setQuizSubmitted(true);

        try {
            // 1. Record Attempt
            await supabase.from('quiz_attempts').insert({
                user_id: user.id,
                quiz_id: activeQuiz.id,
                score: calculatedScore
            });

            // 2. Update User Points
            const { data: profile } = await supabase
                .from('profiles')
                .select('points')
                .eq('id', user.id)
                .single();

            const currentPoints = profile?.points || 0;

            await supabase
                .from('profiles')
                .update({ points: currentPoints + calculatedScore })
                .eq('id', user.id);

            // Refresh leaderboard
            fetchLeaderboard();

        } catch (error) {
            console.error('Error submitting quiz:', error);
            alert('Error saving results, but you scored: ' + calculatedScore);
        }
    };

    // Helper to find specific quizzes for UI slots
    const featuredQuiz = quizzes.find(q => q.title.includes('Monsoon')) || quizzes[0];
    const dailyQuiz = quizzes.find(q => q.title.includes('Daily')) || quizzes[1];

    if (loading && quizzes.length === 0) {
        return <div className="text-center py-20 text-slate-500">{t.loading}</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="mb-10 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                    {language === 'en' ? (
                        <>Competitions & <span className="text-blue-700">Quizzes</span></>
                    ) : (
                        <>{t.title}</>
                    )}
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    {t.subtitle}
                </p>
            </div>

            {/* Active Competitions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                {/* Main Featured Quiz */}
                {featuredQuiz && (
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                            FEATURED
                        </div>
                        <div className="p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mb-3">
                                        {t.weeklyChallenge}
                                    </span>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                        {featuredQuiz.title}
                                    </h2>
                                    <p className="text-slate-600">
                                        {featuredQuiz.description}
                                    </p>
                                </div>
                                <div className="text-5xl">⛈️</div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8 border-y border-slate-100 py-6">
                                <div className="text-center border-r border-slate-100">
                                    <div className="text-2xl font-bold text-slate-900">10</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wide">{t.questions}</div>
                                </div>
                                <div className="text-center border-r border-slate-100">
                                    <div className="text-2xl font-bold text-slate-900">{featuredQuiz.duration_minutes}m</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wide">{t.duration}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-slate-900">{featuredQuiz.points_reward}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wide">{t.points}</div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span>👥 100+ {t.participants}</span>
                                </div>
                                <button
                                    onClick={() => startQuiz(featuredQuiz)}
                                    className="w-full sm:w-auto px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                >
                                    {t.startQuiz}
                                </button>
                            </div>
                        </div>
                        <div className="h-2 bg-slate-100">
                            <div className="h-full w-3/4 bg-blue-600 rounded-r-full"></div>
                        </div>
                    </div>
                )}

                {/* Daily Quick Quiz */}
                {dailyQuiz && (
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg text-white p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">⚡</span>
                                <h3 className="text-xl font-bold">{dailyQuiz.title}</h3>
                            </div>

                            <p className="text-slate-300 mb-6 text-sm">
                                {dailyQuiz.description}
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">Time Limit</span>
                                    <span className="font-medium text-blue-300">{dailyQuiz.duration_minutes} Minutes</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">Reward</span>
                                    <span className="font-medium text-yellow-400">{dailyQuiz.points_reward} Points</span>
                                </div>
                            </div>

                            <button
                                onClick={() => startQuiz(dailyQuiz)}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-bold transition-all backdrop-blur-sm"
                            >
                                Play Now
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Leaderboard Column */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-900">🏆 {t.leaderboard}</h3>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rank</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Lineman</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Region</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leaderboard.map((item, index) => (
                                    <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xl">
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mr-3">
                                                    {item.full_name ? item.full_name.charAt(0) : 'U'}
                                                </div>
                                                <div className="text-sm font-medium text-slate-900">{item.full_name || 'Unknown User'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {item.district || 'West Bengal'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-700">
                                            {item.points}
                                        </td>
                                    </tr>
                                ))}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                                            No data available yet. Be the first to score!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Your Stats */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-900 mb-4">{t.yourStats}</h3>
                        {user ? (
                            <div className="flex items-center justify-between mb-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-slate-900">
                                        {leaderboard.find(l => l.full_name === user.user_metadata?.full_name)?.points || 0}
                                    </div>
                                    <div className="text-xs text-slate-500">Total Points</div>
                                </div>
                                <div className="text-center border-l border-slate-100 pl-4">
                                    <div className="text-2xl font-bold text-green-600">Active</div>
                                    <div className="text-xs text-slate-500">Status</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 py-4">Login to see stats</div>
                        )}

                    </div>
                </div>
            </div>

            {/* Quiz Modal */}
            {activeQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
                        {!quizSubmitted ? (
                            <>
                                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{activeQuiz.title}</h3>
                                        <p className="text-sm text-slate-500">Question {currentQuestionIndex + 1} of {quizQuestions.length}</p>
                                    </div>
                                    <button onClick={() => setActiveQuiz(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                                </div>

                                {quizQuestions.length > 0 ? (
                                    <div className="space-y-6">
                                        <div className="text-lg font-medium text-slate-800">
                                            {quizQuestions[currentQuestionIndex].question_text}
                                        </div>

                                        <div className="space-y-3">
                                            {quizQuestions[currentQuestionIndex].options.map((option, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleAnswerSelect(quizQuestions[currentQuestionIndex].id, idx)}
                                                    className={`w-full text-left p-4 rounded-xl border transition-all ${userAnswers[quizQuestions[currentQuestionIndex].id] === idx
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium shadow-sm'
                                                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <span className="inline-block w-6 h-6 rounded-full border border-slate-300 mr-3 text-center leading-5 text-xs text-slate-400">
                                                        {String.fromCharCode(65 + idx)}
                                                    </span>
                                                    {option}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex justify-between pt-6 border-t border-slate-100">
                                            <button
                                                disabled={currentQuestionIndex === 0}
                                                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                                className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                                            >
                                                {t.previous}
                                            </button>

                                            {currentQuestionIndex === quizQuestions.length - 1 ? (
                                                <button
                                                    onClick={submitQuiz}
                                                    className="px-8 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md"
                                                >
                                                    {t.submit}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                                    className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md"
                                                >
                                                    {t.next}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-10">Loading questions...</div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-10">
                                <div className="text-6xl mb-4">🎉</div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">{t.completed}</h3>
                                <p className="text-slate-600 mb-6">
                                    {t.scoreMsg}: <span className="text-3xl font-bold text-blue-700 block mt-2">{score} / {activeQuiz.points_reward}</span>
                                </p>
                                <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold mb-8">
                                    +{score} {t.points}
                                </div>
                                <button
                                    onClick={() => {
                                        setActiveQuiz(null);
                                        setQuizSubmitted(false);
                                    }}
                                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800"
                                >
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
