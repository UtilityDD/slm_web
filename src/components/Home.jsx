import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import HomeSkeleton from './loaders/HomeSkeleton';

export default function Home({ setCurrentView, language, user, userProfile, t }) {
    const [score, setScore] = useState(userProfile?.points || 0);
    const [fullName, setFullName] = useState(userProfile?.full_name || null);
    const [loading, setLoading] = useState(!userProfile && !!user);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setScore(userProfile.points || 0);
            setFullName(userProfile.full_name);
            setLoading(false);
        } else if (user) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [userProfile, user]);

    const fetchProfile = async () => {
        if (!user) return;
        setLoading(true);
        setFetchError(false);
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
            console.error('Error fetching profile in Home:', error);
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        const shareUrl = "https://slm-web-eight.vercel.app/";
        const shareText = language === 'en'
            ? "⚡ Join SmartLineman - The ultimate safety and community app for West Bengal Linemen! " + shareUrl
            : "⚡ স্মার্ট লাইনম্যান অ্যাপে যোগ দিন - পশ্চিমবঙ্গের লাইনম্যানদের জন্য সেরা নিরাপত্তা এবং কমিউনিটি অ্যাপ! " + shareUrl;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'SmartLineman',
                    text: shareText,
                    url: shareUrl,
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                }
            }
        } else {
            // Fallback: Copy to clipboard or open WhatsApp
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
            window.open(whatsappUrl, '_blank');
        }
    };

    // Helper to get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return language === 'en' ? 'Good Morning' : 'সুপ্রভাত';
        if (hour < 18) return language === 'en' ? 'Good Afternoon' : 'শুভ অপরাহ্ন';
        return language === 'en' ? 'Good Evening' : 'শুভ সন্ধ্যা';
    };

    return (
        <main className="compact-container py-6 sm:py-10 mb-20">
            {loading ? (
                <HomeSkeleton />
            ) : (
                <>
                    {/* Minimal Hero Section */}
                    <div className="mb-8 sm:mb-10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-slate-400 dark:text-slate-400 font-medium block text-base sm:text-lg">{getGreeting()},</span>
                                    {fetchError && (
                                        <button
                                            onClick={() => { setLoading(true); fetchProfile(); }}
                                            className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-800 flex items-center gap-1 hover:bg-red-100 transition-colors"
                                        >
                                            <span>📡</span>
                                            {language === 'en' ? 'Retry' : 'আবার চেষ্টা করুন'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                                        {fullName || (user?.email ? user.email.split('@')[0] : (language === 'en' ? 'Lineman' : 'লাইনম্যান'))}
                                    </h1>
                                    {user && (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md">
                                            <span className="text-base">💎</span>
                                            <span className="text-sm font-bold">{score.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!user && (
                                <div
                                    onClick={() => setCurrentView('login')}
                                    className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border shadow-sm transition-all cursor-pointer bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                                >
                                    <span className="text-lg">🔒</span>
                                    <span className="text-sm font-semibold">
                                        {language === 'en' ? 'Login to view score' : 'স্কোর দেখতে লগইন করুন'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Access Grid (Bento Style) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 mb-12">
                        {/* Competitions - Featured Card */}
                        <div
                            onClick={() => setCurrentView('competitions')}
                            className="group bg-white dark:bg-slate-800 rounded-xl p-5 border border-blue-200 dark:border-blue-800 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-1"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                    <img src="/icons/competition.png" alt="Competition" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.nav.competitions}</h3>
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                </div>
                            </div>
                        </div>

                        {/* Safety Hub */}
                        <div
                            onClick={() => setCurrentView('safety')}
                            className="group bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800 hover:-translate-y-1"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                    <img src="/icons/safety.png" alt="Safety" className="w-full h-full object-contain" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.nav.safety}</h3>
                            </div>
                        </div>

                        {/* Community */}
                        <div
                            onClick={() => setCurrentView('community')}
                            className="group bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 hover:-translate-y-1"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                    <img src="/icons/community.png" alt="Community" className="w-full h-full object-contain" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.nav.community}</h3>
                            </div>
                        </div>

                        {/* Emergency */}
                        <div
                            onClick={() => setCurrentView('emergency')}
                            className="group bg-white dark:bg-slate-800 rounded-xl p-5 border border-red-200 dark:border-red-800 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-red-300 dark:hover:border-red-700 hover:-translate-y-1"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                    <img src="/icons/emergency.png" alt="Emergency" className="w-full h-full object-contain" />
                                </div>
                                <h3 className="text-lg font-bold text-red-700 dark:text-red-400">{t.nav.emergency}</h3>
                            </div>
                        </div>

                        {/* Admin Panel (Conditional) */}
                        {['admin', 'safety mitra'].includes(userProfile?.role) && (
                            <div
                                onClick={() => setCurrentView('admin')}
                                className="group bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 hover:-translate-y-1"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900/30 rounded-xl flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                        <img src="/icons/admin.png" alt="Admin" className="w-full h-full object-contain" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                        {userProfile?.role === 'safety mitra' ? t.nav.safetyMitra : t.nav.admin}
                                    </h3>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Share App Button */}
                    <div className="flex justify-center mb-8">
                        <button
                            onClick={handleShare}
                            className="w-full sm:w-auto px-8 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all hover:-translate-y-1 flex items-center justify-center gap-3"
                        >
                            <span className="text-[#25D366]">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                            </span>
                            <span className="font-bold text-base">Share</span>
                        </button>
                    </div>
                </>
            )}
        </main>
    );
}
