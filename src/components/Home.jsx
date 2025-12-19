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
                        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/20 mt-2">
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
                </div>

                {/* Community - Large Card 3 */}
                <div
                    onClick={() => setCurrentView('community')}
                    className="group material-card p-5 sm:p-6 cursor-pointer"
                >
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform shadow-sm">💬</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">{t.nav.community}</h3>
                </div>

                {/* Emergency - Special Card */}
                <div
                    onClick={() => setCurrentView('emergency')}
                    className="group bg-red-50 dark:bg-red-900/10 rounded-3xl p-5 sm:p-6 border border-red-100 dark:border-red-900/30 cursor-pointer transition-all hover:shadow-lg hover:border-red-200 dark:hover:border-red-800 hover:-translate-y-1 col-span-1 sm:col-span-2 lg:col-span-1"
                >
                    <div className="w-10 h-10 bg-white dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center text-xl mb-4 shadow-sm group-hover:scale-110 transition-transform">🚨</div>
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-1 tracking-tight">{t.nav.emergency}</h3>
                </div>
            </div>

            {/* Campaign / Share App Button */}
            <div className="flex justify-center mb-8">
                <button
                    onClick={() => setCurrentView('campaign')}
                    className="w-full sm:w-auto px-8 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-full shadow-md border border-slate-200 dark:border-slate-700 hover:shadow-lg transform transition-all hover:-translate-y-1 flex items-center justify-center gap-3 group"
                >
                    <span className="text-2xl text-[#25D366]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.968.56 2.054.854 3.179.854h.001c3.181 0 5.768-2.586 5.768-5.766.001-3.18-2.587-5.766-5.768-5.766zm0 10.162h-.001c-1.004 0-1.988-.263-2.846-.763l-.203-.12-2.113.553.563-2.057-.132-.213c-.56-.906-.856-1.963-.856-3.048 0-2.423 1.971-4.394 4.396-4.394 1.174 0 2.278.457 3.107 1.287.83.83 1.287 1.934 1.287 3.108 0 2.423-1.972 4.394-4.396 4.394zm2.406-3.288c-.132-.066-.78-.385-.901-.429-.12-.044-.207-.066-.294.066-.087.132-.339.429-.415.517-.076.088-.153.099-.285.033-.132-.066-.558-.206-1.063-.657-.393-.35-.658-.783-.735-.915-.077-.132-.008-.204.058-.27.06-.059.132-.154.198-.231.066-.077.088-.132.132-.22.044-.088.022-.165-.011-.231-.033-.066-.294-.709-.403-.971-.106-.253-.213-.219-.294-.223l-.251-.004c-.087 0-.229.033-.349.165-.12.132-.461.451-.461 1.1s.472 1.275.538 1.363c.066.088.928 1.417 2.248 1.987.314.135.559.216.753.277.32.102.611.087.842.053.257-.038.78-.319.89-.627.11-.308.11-.572.066-.627-.044-.055-.165-.088-.297-.154z" />
                        </svg>
                    </span>
                    <span className="font-bold text-base">Share</span>
                </button>
            </div>
        </main>
    );
}
