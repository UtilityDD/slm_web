import React from 'react';

export default function Competitions({ language = 'en' }) {
    const t = {
        en: {
            title: "Competitions & Quizzes",
            subtitle: "Test your knowledge, compete with peers, and win recognition.",
            weeklyChallenge: "WEEKLY CHALLENGE",
            quizTitle: "Monsoon Safety Protocol Quiz",
            quizDesc: "Master the essential safety guidelines for working during heavy rains and storms.",
            questions: "Questions",
            duration: "Duration",
            points: "Points",
            participants: "Participants",
            startQuiz: "Start Quiz Now",
            dailyQuiz: "Daily Lightning Round",
            dailyDesc: "5 quick questions to keep your safety knowledge sharp.",
            leaderboard: "Regional Leaderboard",
            yourStats: "Your Performance",
            hallOfFame: "Hall of Fame"
        },
        bn: {
            title: "প্রতিযোগিতা এবং কুইজ",
            subtitle: "আপনার জ্ঞান পরীক্ষা করুন, সহকর্মীদের সাথে প্রতিযোগিতা করুন এবং স্বীকৃতি জিতুন।",
            weeklyChallenge: "সাপ্তাহিক চ্যালেঞ্জ",
            quizTitle: "বর্ষাকালীন নিরাপত্তা প্রোটোকল কুইজ",
            quizDesc: "ভারী বৃষ্টি এবং ঝড়ের সময় কাজ করার জন্য প্রয়োজনীয় নিরাপত্তা নির্দেশিকা আয়ত্ত করুন।",
            questions: "প্রশ্ন",
            duration: "সময়",
            points: "পয়েন্ট",
            participants: "অংশগ্রহণকারী",
            startQuiz: "কুইজ শুরু করুন",
            dailyQuiz: "দৈনিক লাইটনিং রাউন্ড",
            dailyDesc: "আপনার নিরাপত্তা জ্ঞান তীক্ষ্ণ রাখতে ৫টি দ্রুত প্রশ্ন।",
            leaderboard: "আঞ্চলিক লিডারবোর্ড",
            yourStats: "আপনার পারফরম্যান্স",
            hallOfFame: "হল অফ ফেম"
        }
    }[language];

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
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                        ENDING SOON
                    </div>
                    <div className="p-8">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mb-3">
                                    {t.weeklyChallenge}
                                </span>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                    {t.quizTitle}
                                </h2>
                                <p className="text-slate-600">
                                    {t.quizDesc}
                                </p>
                            </div>
                            <div className="text-5xl">⛈️</div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8 border-y border-slate-100 py-6">
                            <div className="text-center border-r border-slate-100">
                                <div className="text-2xl font-bold text-slate-900">15</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide">{t.questions}</div>
                            </div>
                            <div className="text-center border-r border-slate-100">
                                <div className="text-2xl font-bold text-slate-900">20m</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide">{t.duration}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900">500</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide">{t.points}</div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>👥 1,245 {t.participants}</span>
                                <span>•</span>
                                <span>Ends in 2 days</span>
                            </div>
                            <button className="w-full sm:w-auto px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                                {t.startQuiz}
                            </button>
                        </div>
                    </div>
                    <div className="h-2 bg-slate-100">
                        <div className="h-full w-3/4 bg-blue-600 rounded-r-full"></div>
                    </div>
                </div>

                {/* Daily Quick Quiz */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg text-white p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">⚡</span>
                            <h3 className="text-xl font-bold">{t.dailyQuiz}</h3>
                        </div>

                        <p className="text-slate-300 mb-6 text-sm">
                            {t.dailyDesc}
                        </p>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Today's Topic</span>
                                <span className="font-medium text-blue-300">Earthing Procedures</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Time Limit</span>
                                <span className="font-medium text-blue-300">2 Minutes</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Reward</span>
                                <span className="font-medium text-yellow-400">50 Points + Badge</span>
                            </div>
                        </div>

                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-bold transition-all backdrop-blur-sm">
                            Play Now
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Leaderboard Column */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-900">🏆 {t.leaderboard}</h3>
                        <div className="flex gap-2">
                            <select className="bg-white border border-slate-200 text-slate-600 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                                <option>This Week</option>
                                <option>This Month</option>
                                <option>All Time</option>
                            </select>
                            <select className="bg-white border border-slate-200 text-slate-600 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                                <option>All Regions</option>
                                <option>Kolkata</option>
                                <option>Howrah</option>
                                <option>Siliguri</option>
                                <option>Durgapur</option>
                            </select>
                        </div>
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
                                {[
                                    { rank: 1, name: "Rajesh Kumar", region: "Kolkata (North)", score: 2450, badge: "🥇" },
                                    { rank: 2, name: "Amit Patel", region: "Howrah (Central)", score: 2380, badge: "🥈" },
                                    { rank: 3, name: "Suresh Singh", region: "Siliguri (North)", score: 2310, badge: "🥉" },
                                    { rank: 4, name: "Vikram Rao", region: "Durgapur (West)", score: 2250, badge: "🏅" },
                                    { rank: 5, name: "Manoj Sharma", region: "Asansol (West)", score: 2190, badge: "🏅" },
                                ].map((item) => (
                                    <tr key={item.rank} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xl">{item.badge}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mr-3">
                                                    {item.name.charAt(0)}
                                                </div>
                                                <div className="text-sm font-medium text-slate-900">{item.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {item.region}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-700">
                                            {item.score}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-center">
                            <button className="text-sm font-medium text-blue-700 hover:text-blue-800">
                                View Full Leaderboard
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Your Stats */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-900 mb-4">{t.yourStats}</h3>
                        <div className="flex items-center justify-between mb-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900">12</div>
                                <div className="text-xs text-slate-500">Quizzes</div>
                            </div>
                            <div className="text-center border-l border-slate-100 pl-4">
                                <div className="text-2xl font-bold text-green-600">85%</div>
                                <div className="text-xs text-slate-500">Avg Score</div>
                            </div>
                            <div className="text-center border-l border-slate-100 pl-4">
                                <div className="text-2xl font-bold text-blue-700">450</div>
                                <div className="text-xs text-slate-500">Rank</div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Safety Expert</span>
                                <span className="text-yellow-500">★★★★☆</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Technical Knowledge</span>
                                <span className="text-yellow-500">★★★☆☆</span>
                            </div>
                        </div>
                    </div>

                    {/* Past Winners */}
                    <div>
                        <h3 className="font-bold text-slate-900 mb-4">{t.hallOfFame}</h3>
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-100 flex items-center gap-4">
                                <div className="text-3xl">👑</div>
                                <div>
                                    <div className="text-xs font-bold text-yellow-700 uppercase">Last Month's Champion</div>
                                    <div className="font-bold text-slate-900">Ramesh Gupta</div>
                                    <div className="text-xs text-slate-500">Score: 9,850</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
