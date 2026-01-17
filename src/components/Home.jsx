import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import HomeSkeleton from './loaders/HomeSkeleton';
import {
    CompetitionIcon,
    TrainingIcon,
    SafetyIcon,
    CommunityIcon,
    EmergencyIcon,
    AdminIcon,
    UserIcon,
    MyPPEIcon,
    LeaderboardIcon,
    HandbookIcon,
    MyToolsIcon,
    ShareIcon,
    NotificationIcon
} from './icons';
import ShareModal from './ShareModal';
import { getBadgeByLevel } from '../utils/badgeUtils';

export default function Home({ setCurrentView, language, user, userProfile, t, refreshProfile }) {
    const [fullName, setFullName] = useState(userProfile?.full_name || '');
    const [slmId, setSlmId] = useState(userProfile?.slm_id || '');
    const [role, setRole] = useState(userProfile?.role || 'Lineman');
    const [score, setScore] = useState(userProfile?.points || 0);

    const readingPoints = userProfile?.reading_points || 0;
    const [trainingLevel, setTrainingLevel] = useState(userProfile?.training_level || 0);
    const [completedLessonsCount, setCompletedLessonsCount] = useState(userProfile?.completed_lessons?.length || 0);
    const [totalPenalties, setTotalPenalties] = useState(userProfile?.total_penalties || 0);
    const [loading, setLoading] = useState(!userProfile && !!user);
    const [fetchError, setFetchError] = useState(false);
    const [visitorName, setVisitorName] = useState('');
    const [showTipModal, setShowTipModal] = useState(false);
    const [dailyTip, setDailyTip] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState("https://github.com/UtilityDD/slm_web/releases/latest");

    const visitorNames = {
        en: ['Lineman', 'Hero', 'Superhero', 'Friend', 'Champion', 'Safety Star'],
        bn: ['লাইনম্যান', 'হিরো', 'সুপারহিরো', 'বন্ধু', 'চ্যাম্পিয়ন', 'সুরক্ষা তারকা']
    };

    useEffect(() => {
        // Scroll to top when component mounts
        window.scrollTo({ top: 0, behavior: 'instant' });

        if (userProfile) {
            setScore(userProfile.points || 0);
            setFullName(userProfile.full_name);

            setSlmId(userProfile.slm_id);
            setRole(userProfile.role || 'Lineman');
            setTrainingLevel(userProfile.training_level || 0);
            setCompletedLessonsCount(userProfile.completed_lessons?.length || 0);
            setTotalPenalties(userProfile.total_penalties || 0);
            setLoading(false);
        } else if (user) {
            fetchProfile();
        } else {
            setLoading(false);
            const names = visitorNames[language] || visitorNames.en;
            setVisitorName(names[Math.floor(Math.random() * names.length)]);
        }

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
                    setShowTipModal(true);
                }
            } catch (err) {
                console.error('Error fetching daily tip:', err);
                setDailyTip(language === 'en' ? "Always test for voltage before touching any conductor." : "যেকোনো কন্ডাক্টর স্পর্শ করার আগে সর্বদা ভোল্টেজ পরীক্ষা করুন।");
                setShowTipModal(true);
            }
        };

        const fetchLatestShareUrl = async () => {
            try {
                const { data, error } = await supabase
                    .from('app_versions')
                    .select('update_url')
                    .order('version_code', { ascending: false })
                    .limit(1)
                    .single();

                if (data?.update_url) {
                    setShareUrl(data.update_url);
                }
            } catch (err) {
                console.error('Error fetching share URL:', err);
            }
        };

        fetchDailyTip();
        fetchLatestShareUrl();
    }, [userProfile, user, language]);

    const fetchProfile = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) {
                setScore(data.points || 0);
                setReadingPoints(data.reading_points || 0);
                setFullName(data.full_name);
                setSlmId(data.slm_id);
                setRole(data.role || 'Lineman');
                setTrainingLevel(data.training_level || 0);
                setCompletedLessonsCount(data.completed_lessons?.length || 0);
                setTotalPenalties(data.total_penalties || 0);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    const navItems = [
        { id: 'training', label: { en: 'Training', bn: 'প্রশিক্ষণ' }, icon: <TrainingIcon />, color: '#f97316' }, // Orange
        { id: 'sops', label: { en: 'Safety (SOP)', bn: 'এসওপি' }, icon: <SafetyIcon />, color: '#16a34a' },     // Green
        { id: 'community', label: { en: 'Community', bn: 'কমিউনিটি' }, icon: <CommunityIcon />, color: '#f59e0b' }, // Amber/Yellow-ish
        { id: 'emergency', label: { en: 'Emergency', bn: 'জরুরি' }, icon: <EmergencyIcon />, color: '#dc2626' },   // Red
        { id: 'my_ppe', label: { en: 'My PPE', bn: 'আমার পিপিই' }, icon: <MyPPEIcon />, color: '#facc15' },               // Yellow
        { id: 'leaderboard', label: { en: 'Leaderboard', bn: 'লিডারবোর্ড' }, icon: <LeaderboardIcon />, color: '#fb923c' },         // Light Orange
        { id: 'guide', label: { en: 'Handbook', bn: 'হ্যান্ডবুক' }, icon: <HandbookIcon />, color: '#22c55e' },               // Green
        { id: 'competitions', label: { en: 'Competitions', bn: 'প্রতিযোগিতা' }, icon: <CompetitionIcon />, color: '#ea580c' }, // Deep Orange
        { id: 'my_tools', label: { en: 'My Tools', bn: 'আমার সরঞ্জাম' }, icon: <MyToolsIcon />, color: '#795548' },           // Brown (Industry)
        { id: 'share', label: { en: 'Share App', bn: 'শেয়ার অ্যাপ' }, icon: <ShareIcon />, color: '#fbbf24', action: handleShare }, // Gold
        { id: 'admin', label: { en: 'Admin', bn: 'অ্যাডমিন' }, icon: <AdminIcon />, color: '#475569' },                    // Slate (System)
        { id: 'notifications', label: { en: 'Notifications', bn: 'বিজ্ঞপ্তি' }, icon: <NotificationIcon />, color: '#f97316' },     // Orange
    ];

    const handleNav = (item) => {
        if (item.action) {
            item.action();
            return;
        }
        if (item.redirectTo || item.tab) {
            window.location.hash = `/${item.redirectTo || item.id}?tab=${item.tab}`;
        } else {
            setCurrentView(item.id);
        }
    };

    return (
        <div className="min-h-screen bg-mimic-pattern pb-12">
            {loading ? (
                <div className="p-4"><HomeSkeleton /></div>
            ) : (
                <>
                    {/* Integrated Safety Orange Hero Section */}
                    <div className="bg-[#ea580c] dark:bg-[#d64a0a] pt-6 pb-12 px-6 rounded-b-[2.5rem] shadow-lg shadow-orange-900/10 dark:shadow-black/20">
                        <div className="max-w-4xl mx-auto flex items-center justify-between gap-6 overflow-hidden">
                            <div className="flex-1 min-w-0">
                                {/* Line 1: Username + Training Badge */}
                                <div className="flex items-center gap-2 mb-2 min-w-0">
                                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white truncate">
                                        {(fullName && !fullName.includes('@')) ? fullName : (user ? 'Guest' : visitorName)}
                                    </h1>
                                    {trainingLevel > 0 && getBadgeByLevel(trainingLevel) && (
                                        <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-tight shadow-sm shrink-0 ${getBadgeByLevel(trainingLevel).color}`}>
                                            {language === 'en' ? getBadgeByLevel(trainingLevel).en : getBadgeByLevel(trainingLevel).bn}
                                        </div>
                                    )}
                                </div>
                                {/* Line 2: Member ID */}
                                <p className="text-orange-50 text-sm font-medium tracking-wide uppercase opacity-90 mb-1">
                                    ID: {slmId || user?.id?.slice(0, 8).toUpperCase() || 'LINEMAN001'}
                                </p>
                                {/* Line 3: Role */}
                                <p className="text-orange-50 text-sm font-medium opacity-90 capitalize mb-3">
                                    {role}-Member
                                </p>
                                {/* Line 4: Total Score + Reading Rewards */}
                                <div className="flex items-center gap-2">
                                    <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-bold uppercase tracking-wider border border-white/20">
                                        💎 {score.toLocaleString()}
                                    </div>
                                    <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-bold uppercase tracking-wider border border-white/20">
                                        📖 {readingPoints.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white/30 p-1 shrink-0 bg-white/10 backdrop-blur-sm overflow-hidden shadow-2xl">
                                <div className="w-full h-full rounded-full bg-orange-100 flex items-center justify-center text-4xl overflow-hidden">
                                    {userProfile?.avatar_url ? (
                                        <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full text-orange-400 flex items-center justify-center p-2">
                                            <UserIcon className="w-full h-full opacity-80" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hero section ends here, Awareness banner follows */}

                    {/* Awareness Banner - High Impact */}
                    <div className="max-w-4xl mx-auto px-4 mt-6">
                        <div
                            className="relative overflow-hidden group cursor-pointer"
                            onClick={() => setCurrentView('accident-stories')}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-slate-900 rounded-2xl animate-pulse-slow opacity-90"></div>
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500"></div>

                            <div className="relative p-5 sm:p-6 rounded-2xl border border-white/10 flex items-center gap-4 sm:gap-6">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl sm:text-4xl shadow-inner shrink-0 animate-bounce-subtle">
                                    ⚠️
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white text-base sm:text-lg font-bold leading-tight mb-1 drop-shadow-md">
                                        {language === 'bn' ? 'একটি সতর্কবার্তা' : 'A Warning Message'}
                                    </h3>
                                    <p className="text-red-50 text-xs sm:text-sm font-medium leading-relaxed opacity-90">
                                        {language === 'bn'
                                            ? 'উদাসীনতা আর অবহেলার নির্মম বলি হয়ে অকালে হারিয়ে যাচ্ছে কত প্রাণ!'
                                            : 'Countless lives are lost prematurely as victims of indifference and negligence!'}
                                    </p>
                                    <div className="mt-3 inline-flex items-center gap-2 text-white text-[10px] font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-all">
                                        {language === 'bn' ? 'বিস্তারিত পড়ুন' : 'Read Full Story'}
                                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>

                                {/* Decorative elements */}
                                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
                            </div>

                            {/* Border Glow for Focus */}
                            <div className="absolute inset-0 rounded-2xl border-2 border-red-500/50 animate-pulse pointer-events-none"></div>
                        </div>
                    </div>

                    {/* Mimic Grid Layout */}
                    <div className="max-w-4xl mx-auto px-4 mt-8">
                        <div className="grid grid-cols-3 gap-3 sm:gap-6">
                            {navItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleNav(item)}
                                    className="mimic-card aspect-square text-center"
                                >
                                    <div
                                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl mb-3 shadow-sm border border-black/5"
                                        style={{ backgroundColor: item.color, color: '#fff' }}
                                    >
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                                            {typeof item.icon === 'string' ? item.icon : React.cloneElement(item.icon, { className: 'w-full h-full' })}
                                        </div>
                                    </div>
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 leading-tight">
                                        {item.label[language]}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Daily Tip Modal */}
                    {showTipModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700">
                                <div className="bg-[#ea580c] p-6 text-white text-center relative">
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-3 backdrop-blur-md">💡</div>
                                    <h3 className="text-xl font-bold uppercase tracking-wider">{language === 'en' ? 'Survival Tip' : 'বেঁচে থাকার টিপ'}</h3>
                                    <p className="text-orange-50 text-xs mt-1 font-medium">{new Date().toLocaleDateString()}</p>
                                </div>
                                <div className="p-8 text-center">
                                    <p className="text-slate-700 dark:text-slate-300 text-lg font-medium leading-relaxed mb-8 italic">"{dailyTip}"</p>
                                    <button onClick={() => setShowTipModal(false)} className="w-full py-3 bg-[#ea580c] text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                                        {language === 'en' ? 'Stay Safe' : 'নিরাপদ থাকুন'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Share Modal */}
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        shareUrl={shareUrl}
                        language={language}
                    />
                </>
            )}
        </div>
    );
}
