import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Home({ setCurrentView, language, user, t }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loadingLeaders, setLoadingLeaders] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('full_name, district, points, avatar_url')
                    .order('points', { ascending: false })
                    .limit(3);
                setLeaderboard(data || []);
            } catch (error) {
                console.error('Error fetching leaders:', error);
            } finally {
                setLoadingLeaders(false);
            }
        };
        fetchLeaders();
    }, []);

    // Helper to get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return language === 'en' ? 'Good Morning' : 'সুপ্রভাত';
        if (hour < 18) return language === 'en' ? 'Good Afternoon' : 'শুভ অপরাহ্ন';
        return language === 'en' ? 'Good Evening' : 'শুভ সন্ধ্যা';
    };

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mb-20">
            {/* Minimal Hero Section */}
            <div className="mb-10 sm:mb-12">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                            <span className="text-slate-400 font-medium block text-lg sm:text-xl mb-1">{getGreeting()},</span>
                            {user?.email ? (user.email.split('@')[0]) : (language === 'en' ? 'Lineman' : 'লাইনম্যান')}
                        </h1>
                        <p className="text-slate-500 mt-2 max-w-xl text-sm sm:text-base">
                            {language === 'en'
                                ? "Here's your daily safety and performance overview."
                                : "এখানে আপনার দৈনিক নিরাপত্তা এবং পারফরম্যান্স ওভারভিউ।"
                            }
                        </p>
                    </div>
                    {/* Compact Status Pill */}
                    <div
                        onClick={() => !user && setCurrentView('login')}
                        className={`flex items-center gap-3 px-4 py-2 rounded-full border shadow-sm transition-all cursor-pointer ${user
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                            }`}
                    >
                        {user ? (
                            <>
                                <span className="text-xl">⭐</span>
                                <span className="text-sm font-bold">
                                    {language === 'en' ? 'My Score:' : 'আমার স্কোর:'} <span className="text-lg">1,250</span>
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="text-lg">🔒</span>
                                <span className="text-sm font-semibold">
                                    {language === 'en' ? 'Login to view score' : 'স্কোর দেখতে লগইন করুন'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Access Grid (Bento Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
                {/* Competitions - Large Card 1 */}
                <div
                    onClick={() => setCurrentView('competitions')}
                    className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl mb-6">🏆</div>
                        <h3 className="text-xl font-bold mb-2">{t.nav.competitions}</h3>
                        <p className="text-blue-100 text-sm leading-relaxed mb-4">
                            {language === 'en' ? 'Join the Weekly Challenge' : 'সাপ্তাহিক চ্যালেঞ্জে যোগ দিন'}
                        </p>
                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/10 px-3 py-1 rounded-lg backdrop-blur-md">
                            <span>Live Now</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                        </div>
                    </div>
                </div>

                {/* Safety Hub - Large Card 2 */}
                <div
                    onClick={() => setCurrentView('safety')}
                    className="group bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 cursor-pointer transition-all hover:shadow-md hover:border-orange-200 hover:-translate-y-1"
                >
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🦺</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t.nav.safety}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        {language === 'en' ? 'Access protocols & guidelines' : 'প্রোটোকল এবং নির্দেশিকা অ্যাক্সেস করুন'}
                    </p>
                </div>

                {/* Community - Large Card 3 */}
                <div
                    onClick={() => setCurrentView('community')}
                    className="group bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 cursor-pointer transition-all hover:shadow-md hover:border-blue-200 hover:-translate-y-1"
                >
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">💬</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t.nav.community}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        {language === 'en' ? 'Connect with peers' : 'সহকর্মীদের সাথে সংযোগ করুন'}
                    </p>
                </div>

                {/* Emergency - Special Card */}
                <div
                    onClick={() => setCurrentView('emergency')}
                    className="group bg-red-50 rounded-3xl p-6 sm:p-8 border border-red-100 cursor-pointer transition-all hover:shadow-md hover:border-red-200 hover:-translate-y-1"
                >
                    <div className="w-12 h-12 bg-white text-red-600 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-sm">🚨</div>
                    <h3 className="text-xl font-bold text-red-700 mb-2">{t.nav.emergency}</h3>
                    <p className="text-red-600/80 text-sm leading-relaxed">
                        {language === 'en' ? 'SOS & Quick Support' : 'SOS এবং দ্রুত সহায়তা'}
                    </p>
                </div>
            </div>

            {/* Content Grid: Leaderboard & Updates */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Top Performers (Compact List) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">{t.nav.leaderboard}</h2>
                        <button
                            onClick={() => setCurrentView('competitions')}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            {language === 'en' ? 'View All' : 'সব দেখুন'}
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {loadingLeaders ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="flex items-center p-4 border-b border-slate-50 last:border-0">
                                    <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse mr-4"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse"></div>
                                        <div className="h-3 w-16 bg-slate-100 rounded animate-pulse"></div>
                                    </div>
                                    <div className="h-5 w-10 bg-slate-100 rounded animate-pulse"></div>
                                </div>
                            ))
                        ) : (
                            leaderboard.map((leader, i) => (
                                <div key={i} className={`flex items-center justify-between p-4 ${i !== leaderboard.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50 transition-colors`}>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xl">{['🥇', '🥈', '🥉'][i] || '🏅'}</span>
                                        <div>
                                            <div className="font-semibold text-slate-900 text-sm">{leader.full_name || 'Anonymous'}</div>
                                            <div className="text-xs text-slate-500">{leader.district || 'West Bengal'}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-blue-700">{leader.points}</div>
                                    </div>
                                </div>
                            ))
                        )}
                        {!loadingLeaders && leaderboard.length === 0 && (
                            <div className="p-4 text-center text-slate-400 text-sm">No leaders found</div>
                        )}
                    </div>
                </div>

                {/* Notifications / News */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900">{language === 'en' ? 'Highlights' : 'হাইলাইট'}</h2>

                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer" onClick={() => setCurrentView('community')}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <span className="inline-block px-3 py-1 rounded-lg bg-white/10 text-xs font-semibold mb-4 backdrop-blur-sm">Storm Alert</span>
                            <h3 className="font-bold text-lg mb-2">Kalbaishakhi Warning</h3>
                            <p className="text-slate-300 text-sm mb-4">
                                {language === 'en' ? 'Check updated protocols for optimal safety today.' : 'আজকের সর্বোত্তম নিরাপত্তার জন্য আপডেট করা প্রোটোকল দেখুন।'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-blue-300 font-medium group-hover:text-blue-200 transition-colors">
                                <span>Read Guidelines</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setCurrentView('competitions')}>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">WE</div>
                            <div>
                                <h4 className="font-semibold text-slate-900 text-sm">New Seminar Added</h4>
                                <p className="text-xs text-slate-500 mt-1">WBSEDCL Safety Workshop • Tomorrow, 10 AM</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
