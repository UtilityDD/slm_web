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

export default function Home({ setCurrentView, language, user, userProfile, t, refreshProfile }) {
    const [score, setScore] = useState(userProfile?.points || 0);
    const [fullName, setFullName] = useState(userProfile?.full_name || null);
    const [completedLessonsCount, setCompletedLessonsCount] = useState(userProfile?.completed_lessons?.length || 0);
    const [totalPenalties, setTotalPenalties] = useState(userProfile?.total_penalties || 0);
    const [loading, setLoading] = useState(!userProfile && !!user);
    const [fetchError, setFetchError] = useState(false);
    const [visitorName, setVisitorName] = useState('');
    const [showTipModal, setShowTipModal] = useState(false);
    const [dailyTip, setDailyTip] = useState('');

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

        // Setup Daily Tip from Carousel Resources (Always Bengali)
        const fetchDailyTip = async () => {
            try {
                const response = await fetch('/quizzes/carousol.json');
                const data = await response.json();
                const rules = data.rules || [];

                if (rules.length > 0) {
                    const now = new Date();
                    const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
                    let hash = 0;
                    for (let i = 0; i < dateStr.length; i++) {
                        hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
                        hash |= 0;
                    }
                    setDailyTip(rules[Math.abs(hash) % rules.length]);
                }
            } catch (err) {
                console.error('Error fetching daily tip:', err);
                // Fallback tip if fetch fails
                setDailyTip(language === 'en' ? "Always test for voltage before touching any conductor." : "যেকোনো কন্ডাক্টর স্পর্শ করার আগে সর্বদা ভোল্টেজ পরীক্ষা করুন।");
            }
        };

        fetchDailyTip();
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
                    {/* Material You Inspired Hero Section */}
                    <div className="mb-8 px-2 transition-all duration-500 animate-slide-up-fade">
                        <div className="flex flex-col sm:flex-row items-baseline justify-between gap-2 mb-6">
                            <div className="min-w-0">
                                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-1 block opacity-80">{getGreeting()}</span>
                                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                                    {fullName || (user?.email ? user.email.split('@')[0] : visitorName)}
                                </h1>
                            </div>

                            {user && (
                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-950/20 dark:shadow-white/10 transition-transform active:scale-95">
                                        <span className="text-sm">💎</span>
                                        <span className="text-base font-black tracking-tighter">{score.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2 sm:mt-0 ml-1">
                                        {completedLessonsCount > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800/30 shadow-sm">
                                                <span className="text-xs">📖</span>
                                                <span className="text-xs font-black tracking-tight">+{completedLessonsCount * 20}</span>
                                            </div>
                                        )}
                                        {totalPenalties > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 shadow-sm">
                                                <span className="text-xs">🔥</span>
                                                <span className="text-xs font-black tracking-tight">-{totalPenalties.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Integrated Daily Insight Card (Replaces Floating Button) */}
                        <div
                            onClick={() => setShowTipModal(true)}
                            className="group relative bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2rem] p-5 text-white shadow-xl shadow-orange-500/20 cursor-pointer overflow-hidden transition-all active:scale-[0.98] active:brightness-95"
                        >
                            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
                            <div className="relative flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                                    💡
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">{language === 'en' ? 'Safety Insight' : 'সুরক্ষা টিপ'}</p>
                                    <p className="text-sm font-bold leading-tight line-clamp-1 italic">"{dailyTip}"</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">
                                    →
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modern High-Impact Grid */}
                    <div className="grid grid-cols-2 gap-4 sm:gap-6 px-2 mb-10">
                        {/* Competitions */}
                        <div
                            onClick={() => setCurrentView('competitions')}
                            className="group relative bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border-b-4 border-blue-500/20 dark:border-blue-500/10 shadow-xl shadow-slate-200/50 dark:shadow-none cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 active:scale-95 flex flex-col items-center justify-center text-center aspect-square"
                        >
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-50 dark:bg-blue-900/10 rounded-3xl flex items-center justify-center p-4 mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner">
                                <CompetitionIcon className="w-full h-full text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tighter">{t.nav.competitions}</h3>
                        </div>

                        {/* 90 Days Training */}
                        <div
                            onClick={() => setCurrentView('training')}
                            className="group relative bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border-b-4 border-green-500/20 dark:border-green-500/10 shadow-xl shadow-slate-200/50 dark:shadow-none cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/20 hover:-translate-y-2 active:scale-95 flex flex-col items-center justify-center text-center aspect-square"
                        >
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-50 dark:bg-green-900/10 rounded-3xl flex items-center justify-center p-4 mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-inner">
                                <TrainingIcon className="w-full h-full text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tighter">{t.nav.training}</h3>
                        </div>

                        {/* Community */}
                        <div
                            onClick={() => setCurrentView('community')}
                            className="group relative bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border-b-4 border-indigo-500/20 dark:border-indigo-500/10 shadow-xl shadow-slate-200/50 dark:shadow-none cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2 active:scale-95 flex flex-col items-center justify-center text-center aspect-square"
                        >
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl flex items-center justify-center p-4 mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner">
                                <CommunityIcon className="w-full h-full text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tighter">{t.nav.community}</h3>
                        </div>

                        {/* Emergency */}
                        <div
                            onClick={() => setCurrentView('emergency')}
                            className="group relative bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border-b-4 border-red-500/20 dark:border-red-500/10 shadow-xl shadow-slate-200/50 dark:shadow-none cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-red-500/20 hover:-translate-y-2 active:scale-95 flex flex-col items-center justify-center text-center aspect-square"
                        >
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-red-50 dark:bg-red-900/10 rounded-3xl flex items-center justify-center p-4 mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-inner">
                                <EmergencyIcon className="w-full h-full text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-red-700 dark:text-red-400 leading-tight tracking-tighter">{t.nav.emergency}</h3>
                        </div>
                    </div>

                    {/* Modern Secondary Actions */}
                    <div className="flex flex-col gap-4 px-2 mb-12">
                        <button
                            onClick={handleShare}
                            className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white rounded-[1.5rem] border border-slate-200 dark:border-slate-800 flex items-center justify-between group transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-600">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Share App</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spread Safety</p>
                                </div>
                            </div>
                            <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </div>


                    {/* Daily Tip Modal */}
                    {showTipModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up border border-slate-100 dark:border-slate-700">
                                <div className="bg-amber-500 p-6 text-white text-center relative">
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-3 backdrop-blur-md">
                                        💡
                                    </div>
                                    <h3 className="text-xl font-bold uppercase tracking-wider">
                                        {language === 'en' ? 'Daily Safety Tip' : 'আজকের সুরক্ষা টিপ'}
                                    </h3>
                                    <p className="text-amber-100 text-xs mt-1 font-medium">
                                        {new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="p-8 text-center">
                                    <p className="text-slate-700 dark:text-slate-300 text-lg font-medium leading-relaxed mb-8 italic">
                                        "{dailyTip}"
                                    </p>
                                    <button
                                        onClick={() => setShowTipModal(false)}
                                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                                    >
                                        {language === 'en' ? 'Got it!' : 'বুঝেছি!'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
