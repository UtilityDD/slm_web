import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import HomeSkeleton from './loaders/HomeSkeleton';

export default function Home({ setCurrentView, language, user, t }) {
    const [score, setScore] = useState(0);
    const [fullName, setFullName] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('points, full_name')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setScore(data.points || 0);
                    setFullName(data.full_name);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        // Simulate a minimum loading time for better UX
        const timer = setTimeout(() => {
            fetchProfile();
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
    }, [user]);

    // Helper to get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return language === 'en' ? 'Good Morning' : 'সুপ্রভাত';
        if (hour < 18) return language === 'en' ? 'Good Afternoon' : 'শুভ অপরাহ্ন';
        return language === 'en' ? 'Good Evening' : 'শুভ সন্ধ্যা';
    };

    if (loading) {
        return <HomeSkeleton />;
    }

    return (
        <main className="compact-container py-6 sm:py-10 mb-20">
            {/* Minimal Hero Section */}
            <div className="mb-8 sm:mb-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                            <span className="text-slate-400 dark:text-slate-400 font-medium block text-base sm:text-lg mb-0.5">{getGreeting()},</span>
                            {fullName || (user?.email ? user.email.split('@')[0] : (language === 'en' ? 'Lineman' : 'লাইনম্যান'))}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl text-sm sm:text-base">
                            {language === 'en'
                                ? "Here's your daily safety and performance overview."
                                : "এখানে আপনার দৈনিক নিরাপত্তা এবং পারফরম্যান্স ওভারভিউ।"
                            }
                        </p>
                    </div>
                    {/* Compact Status Pill */}
                    <div
                        onClick={() => !user && setCurrentView('login')}
                        className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border shadow-sm transition-all cursor-pointer ${user
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                            }`}
                    >
                        {user ? (
                            <>
                                <span className="text-lg">⭐</span>
                                <span className="text-xs font-bold">
                                    {language === 'en' ? 'My Score:' : 'আমার স্কোর:'} <span className="text-base">{score.toLocaleString()}</span>
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
                    className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-5 sm:p-6 text-white shadow-lg cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border border-white/10"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl mb-4">🏆</div>
                        <h3 className="text-lg font-bold mb-1 tracking-tight">{t.nav.competitions}</h3>
                        <p className="text-blue-100 text-sm leading-relaxed mb-4 font-medium">
                            {language === 'en' ? 'Hourly Safety Challenge' : 'ঘন্টাভিত্তিক নিরাপত্তা চ্যালেঞ্জ'}
                        </p>
                        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                            <span>Live Now</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        </div>
                    </div>
                </div>

                {/* Safety Hub - Large Card 2 */}
                <div
                    onClick={() => setCurrentView('safety')}
                    className="group material-card p-5 sm:p-6 cursor-pointer"
                >
                    <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform shadow-sm">🦺</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">{t.nav.safety}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
                        {language === 'en' ? 'Access protocols & guidelines' : 'প্রোটোকল এবং নির্দেশিকা অ্যাক্সেস করুন'}
                    </p>
                </div>

                {/* Campaign - New Card */}
                <div
                    onClick={() => setCurrentView('campaign')}
                    className="group material-card p-5 sm:p-6 cursor-pointer bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-100 dark:border-indigo-800"
                >
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform shadow-sm">📢</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">
                        {language === 'en' ? 'Campaign' : 'ক্যাম্পেইন'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
                        {language === 'en' ? 'Create posters & share app' : 'পোস্টার তৈরি করুন এবং অ্যাপ শেয়ার করুন'}
                    </p>
                </div>

                {/* Community - Large Card 3 */}
                <div
                    onClick={() => setCurrentView('community')}
                    className="group material-card p-5 sm:p-6 cursor-pointer"
                >
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform shadow-sm">💬</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">{t.nav.community}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
                        {language === 'en' ? 'Connect with peers' : 'সহকর্মীদের সাথে সংযোগ করুন'}
                    </p>
                </div>

                {/* Emergency - Special Card */}
                <div
                    onClick={() => setCurrentView('emergency')}
                    className="group bg-red-50 dark:bg-red-900/10 rounded-3xl p-5 sm:p-6 border border-red-100 dark:border-red-900/30 cursor-pointer transition-all hover:shadow-lg hover:border-red-200 dark:hover:border-red-800 hover:-translate-y-1 col-span-1 sm:col-span-2 lg:col-span-1"
                >
                    <div className="w-10 h-10 bg-white dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center text-xl mb-4 shadow-sm group-hover:scale-110 transition-transform">🚨</div>
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-1 tracking-tight">{t.nav.emergency}</h3>
                    <p className="text-red-600/80 dark:text-red-400/80 text-sm leading-relaxed font-medium">
                        {language === 'en' ? 'SOS & Quick Support' : 'SOS এবং দ্রুত সহায়তা'}
                    </p>
                </div>
            </div>
        </main>
    );
}
