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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mb-20">
            {/* Minimal Hero Section */}
            <div className="mb-10 sm:mb-12">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                            <span className="text-slate-400 dark:text-slate-400 font-medium block text-lg sm:text-xl mb-1">{getGreeting()},</span>
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
                        className={`flex items-center gap-3 px-4 py-2 rounded-full border shadow-sm transition-all cursor-pointer ${user
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                            }`}
                    >
                        {user ? (
                            <>
                                <span className="text-xl">⭐</span>
                                <span className="text-sm font-bold">
                                    {language === 'en' ? 'My Score:' : 'আমার স্কোর:'} <span className="text-lg">{score.toLocaleString()}</span>
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
                            {language === 'en' ? 'Hourly Safety Challenge' : 'ঘন্টাভিত্তিক নিরাপত্তা চ্যালেঞ্জ'}
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
                    className="group bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer transition-all hover:shadow-md hover:border-orange-200 hover:-translate-y-1"
                >
                    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🦺</div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t.nav.safety}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                        {language === 'en' ? 'Access protocols & guidelines' : 'প্রোটোকল এবং নির্দেশিকা অ্যাক্সেস করুন'}
                    </p>
                </div>

                {/* Community - Large Card 3 */}
                <div
                    onClick={() => setCurrentView('community')}
                    className="group bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer transition-all hover:shadow-md hover:border-blue-200 hover:-translate-y-1"
                >
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">💬</div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t.nav.community}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
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
        </main>
    );
}
