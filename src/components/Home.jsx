import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import HomeSkeleton from './loaders/HomeSkeleton';
import {
    CompetitionIcon,
    TrainingIcon,
    SafetyIcon,
    CommunityIcon,
    EmergencyIcon,
    AdminIcon
} from './icons';

export default function Home({ setCurrentView, language, user, userProfile, t }) {
    const [score, setScore] = useState(userProfile?.points || 0);
    const [fullName, setFullName] = useState(userProfile?.full_name || null);
    const [completedLessonsCount, setCompletedLessonsCount] = useState(userProfile?.completed_lessons?.length || 0);
    const [totalPenalties, setTotalPenalties] = useState(userProfile?.total_penalties || 0);
    const [loading, setLoading] = useState(!userProfile && !!user);
    const [fetchError, setFetchError] = useState(false);
    const [visitorName, setVisitorName] = useState('');

    const visitorNames = {
        en: ['Lineman', 'Hero', 'Superhero', 'Friend', 'Champion', 'Safety Star'],
        bn: ['লাইনম্যান', 'হিরো', 'সুপারহিরো', 'বন্ধু', 'চ্যাম্পিয়ন', 'সুরক্ষা তারকা']
    };

    useEffect(() => {
        if (userProfile) {
            setScore(userProfile.points || 0);
            setFullName(userProfile.full_name);
            setCompletedLessonsCount(userProfile.completed_lessons?.length || 0);
            setTotalPenalties(userProfile.total_penalties || 0);
            setLoading(false);
        } else if (user) {
            fetchProfile();
        } else {
            setLoading(false);
            // Randomize name for visitor
            const names = visitorNames[language] || visitorNames.en;
            const randomName = names[Math.floor(Math.random() * names.length)];
            setVisitorName(randomName);
        }
    }, [userProfile, user, language]);

    const fetchProfile = async () => {
        if (!user) return;
        setLoading(true);
        setFetchError(false);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('points, full_name, completed_lessons, total_penalties')
                .eq('id', user.id)
                .single();

            if (data) {
                setScore(data.points || 0);
                setFullName(data.full_name);
                setCompletedLessonsCount(data.completed_lessons?.length || 0);
                setTotalPenalties(data.total_penalties || 0);
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
        <main className="compact-container py-6 sm:py-10 md:mb-6">
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
                                        {fullName || (user?.email ? user.email.split('@')[0] : visitorName)}
                                    </h1>
                                    {user && (
                                        <div className="flex flex-col sm:flex-row items-baseline gap-2">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md">
                                                <span className="text-base">💎</span>
                                                <span className="text-sm font-bold">{score.toLocaleString()}</span>
                                            </div>
                                            {completedLessonsCount > 0 && (
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800/50 text-[10px] font-bold">
                                                    <span>📖</span>
                                                    <span>{language === 'en' ? 'Reading Reward: ' : 'পড়ার পুরস্কার: '}+{completedLessonsCount * 20}</span>
                                                </div>
                                            )}
                                            {totalPenalties > 0 && (
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/50 text-[10px] font-bold">
                                                    <span>🔥</span>
                                                    <span>{language === 'en' ? 'Points Lost: ' : 'মোট পয়েন্ট হারানো: '}{totalPenalties.toLocaleString()}</span>
                                                </div>
                                            )}
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

                    {/* Quick Access Grid (Bento Style - 2 Column Mobile) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 mb-12">
                        {/* Competitions - Featured Card */}
                        <div
                            onClick={() => setCurrentView('competitions')}
                            className="group relative bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-blue-100 dark:border-blue-900/30 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center text-center aspect-[4/3] sm:aspect-square"
                        >
                            <div className="absolute top-3 right-3">
                                <span className="flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                            </div>
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center p-3 mb-4 group-hover:scale-110 transition-transform duration-300">
                                <CompetitionIcon className="w-full h-full text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{t.nav.competitions}</h3>
                        </div>

                        {/* 90 Days Training - New Button */}
                        <div
                            onClick={() => setCurrentView('training')}
                            className="group bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-green-100 dark:border-green-900/30 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center text-center aspect-[4/3] sm:aspect-square"
                        >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center p-3 mb-4 group-hover:scale-110 transition-transform duration-300">
                                <TrainingIcon className="w-full h-full text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{t.nav.training}</h3>
                        </div>

                        {/* Safety */}
                        <div
                            onClick={() => setCurrentView('safety')}
                            className="group bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-orange-100 dark:border-orange-900/30 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center text-center aspect-[4/3] sm:aspect-square"
                        >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center p-3 mb-4 group-hover:scale-110 transition-transform duration-300">
                                <SafetyIcon className="w-full h-full text-orange-600 dark:text-orange-400" />
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{t.nav.safety}</h3>
                        </div>

                        {/* Community */}
                        <div
                            onClick={() => setCurrentView('community')}
                            className="group bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-indigo-100 dark:border-indigo-900/30 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center text-center aspect-[4/3] sm:aspect-square"
                        >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center p-3 mb-4 group-hover:scale-110 transition-transform duration-300">
                                <CommunityIcon className="w-full h-full text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{t.nav.community}</h3>
                        </div>

                        {/* Emergency */}
                        <div
                            onClick={() => setCurrentView('emergency')}
                            className="group bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-red-100 dark:border-red-900/30 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10 hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center text-center aspect-[4/3] sm:aspect-square"
                        >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center p-3 mb-4 group-hover:scale-110 transition-transform duration-300">
                                <EmergencyIcon className="w-full h-full text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-red-700 dark:text-red-400 leading-tight">{t.nav.emergency}</h3>
                        </div>

                        {/* Admin Panel (Conditional) */}
                        {/* Admin Panel / Safety Mitra (Active for Admin/Safety Mitra, Disabled for others) */}
                        {['admin', 'safety mitra'].includes(userProfile?.role) ? (
                            <div
                                onClick={() => setCurrentView('admin')}
                                className="group bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center text-center aspect-[4/3] sm:aspect-square"
                            >
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 dark:bg-slate-900/30 rounded-2xl flex items-center justify-center p-3 mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <AdminIcon className="w-full h-full text-slate-600 dark:text-slate-400" />
                                </div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                    {userProfile?.role === 'safety mitra' ? t.nav.safetyMitra : t.nav.admin}
                                </h3>
                            </div>
                        ) : (
                            <div
                                className="group bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center aspect-[4/3] sm:aspect-square opacity-60 cursor-not-allowed"
                            >
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center p-3 mb-4 grayscale">
                                    <AdminIcon className="w-full h-full text-slate-400 dark:text-slate-500" />
                                </div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-400 dark:text-slate-500 leading-tight">
                                    {t.nav.safetyMitra || (language === 'en' ? 'Safety Mitra' : 'সেফটি মিত্র')}
                                </h3>
                            </div>
                        )}
                    </div>

                    {/* Share App Button */}
                    <div className="flex justify-center mb-8">
                        <button
                            onClick={handleShare}
                            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
                        >
                            <span className="text-[#25D366]">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                            </span>
                            <span className="font-bold text-base">Share App</span>
                        </button>
                    </div>
                </>
            )}
        </main>
    );
}
