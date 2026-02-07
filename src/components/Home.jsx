import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

const CountUp = ({ end, duration = 1000, start = true }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!start) return;

        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Easing function: easeOutExpo
            const easeOutExpo = 1 - Math.pow(2, -10 * percentage);
            setCount(Math.floor(easeOutExpo * end));

            if (progress < duration) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, start]);

    return <span>{count.toLocaleString()}</span>;
};

export default function Home({ setCurrentView, language, user, userProfile, t, refreshProfile }) {
    const [fullName, setFullName] = useState(userProfile?.full_name || '');
    const [slmId, setSlmId] = useState(userProfile?.slm_id || '');
    const [role, setRole] = useState(userProfile?.role || 'Lineman');
    const [score, setScore] = useState(userProfile?.points || 0);

    const [readingPoints, setReadingPoints] = useState(userProfile?.reading_points || 0);
    const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || '');
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
    const [emotionalImageIndex, setEmotionalImageIndex] = useState(0);
    const [currentChapter, setCurrentChapter] = useState('1.1');

    const emotionalImages = [
        '/assets/emotional/lineman.png',
        '/assets/emotional/child.png',
        '/assets/emotional/wife.png',
        '/assets/emotional/mother.png',
        '/assets/emotional/eyes.png'
    ];

    const visitorNames = {
        en: ['Lineman', 'Hero', 'Superhero', 'Friend', 'Champion', 'Safety Star'],
        bn: ['লাইনম্যান', 'হিরো', 'সুপারহিরো', 'বন্ধু', 'চ্যাম্পিয়ন', 'সুরক্ষা তারকা']
    };

    useEffect(() => {
        // Scroll to top when component mounts
        window.scrollTo({ top: 0, behavior: 'instant' });

        if (userProfile) {
            setScore(userProfile.points || 0);
            setReadingPoints(userProfile.reading_points || 0);
            setFullName(userProfile.full_name);
            setAvatarUrl(userProfile.avatar_url);
            setSlmId(userProfile.slm_id);
            setRole(userProfile.role || 'Lineman');
            setTrainingLevel(userProfile.training_level || 0);
            setCompletedLessonsCount(userProfile.completed_lessons?.length || 0);
            setTotalPenalties(userProfile.total_penalties || 0);

            // Get the most recent chapter from completed lessons (only continuous reading)
            if (userProfile.completed_lessons && userProfile.completed_lessons.length > 0) {
                const lessons = userProfile.completed_lessons
                    .map(id => id.toString())
                    .filter(id => id.match(/^\d+\.\d+$/))
                    .map(id => {
                        const [chapter, lesson] = id.split('.').map(Number);
                        return { chapter, lesson, id };
                    })
                    .sort((a, b) => {
                        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
                        return a.lesson - b.lesson;
                    });

                // Find the last continuously completed lesson
                let lastContinuousChapter = 1;
                let lastContinuousLesson = 0;

                for (let i = 0; i < lessons.length; i++) {
                    const { chapter, lesson } = lessons[i];

                    // Check if this is the next expected lesson in sequence
                    if (chapter === lastContinuousChapter && lesson === lastContinuousLesson + 1) {
                        lastContinuousLesson = lesson;
                    } else if (chapter === lastContinuousChapter + 1 && lesson === 1 && lastContinuousLesson > 0) {
                        // Moving to next chapter - this is valid
                        lastContinuousChapter = chapter;
                        lastContinuousLesson = lesson;
                    } else {
                        // Non-continuous reading detected, stop here
                        break;
                    }
                }

                // Set next lesson to read
                if (lastContinuousLesson > 0) {
                    setCurrentChapter(`${lastContinuousChapter}.${lastContinuousLesson + 1}`);
                } else {
                    setCurrentChapter('1.1');
                }
            } else {
                setCurrentChapter('1.1');
            }

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

        const imageInterval = setInterval(() => {
            setEmotionalImageIndex(prev => (prev + 1) % emotionalImages.length);
        }, 4000);

        fetchDailyTip();
        fetchLatestShareUrl();

        return () => clearInterval(imageInterval);
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
                setAvatarUrl(data.avatar_url);
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
        <div className="min-h-screen bg-mimic-pattern pb-12 animate-fadeIn">
            {loading ? (
                <div className="p-4"><HomeSkeleton /></div>
            ) : (
                <>
                    {/* Integrated Safety Orange Hero Section - Desktop Optimized - Compact */}
                    <div className="bg-[#ea580c] dark:bg-[#d64a0a] pt-4 pb-6 lg:pb-8 rounded-b-3xl shadow-lg shadow-orange-900/10 dark:shadow-black/20">
                        <div className="max-w-7xl mx-auto mobile-container">
                            {/* Desktop: Two-column layout, Mobile: Stacked */}
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-8">
                                {/* Left Column: Profile Info */}
                                <div className="flex items-center gap-4 lg:flex-1">
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full border-4 border-white/30 p-1 shrink-0 bg-white/10 backdrop-blur-sm overflow-hidden shadow-2xl">
                                        <div className="w-full h-full rounded-full bg-orange-100 flex items-center justify-center text-4xl overflow-hidden">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full text-orange-400 flex items-center justify-center p-2">
                                                    <UserIcon className="w-full h-full opacity-80" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {/* Line 1: Username + Training Badge */}
                                        <div className="flex items-center gap-2 mb-1.5 min-w-0">
                                            <h1 className="text-lg sm:text-xl lg:text-3xl font-bold text-white truncate">
                                                {(fullName && !fullName.includes('@')) ? fullName : (user ? 'Guest' : visitorName)}
                                            </h1>
                                            {trainingLevel > 0 && getBadgeByLevel(trainingLevel) && (
                                                <div className={`px-2 py-0.5 lg:px-2.5 lg:py-0.5 rounded-lg text-[9px] lg:text-[10px] font-bold border uppercase tracking-tight shadow-sm shrink-0 ${getBadgeByLevel(trainingLevel).color}`}>
                                                    {language === 'en' ? getBadgeByLevel(trainingLevel).en : getBadgeByLevel(trainingLevel).bn}
                                                </div>
                                            )}
                                        </div>
                                        {/* Line 2: Member ID */}
                                        <p className="text-orange-50 text-xs lg:text-sm font-medium tracking-wide uppercase opacity-90 mb-0.5">
                                            ID: {slmId || user?.id?.slice(0, 8).toUpperCase() || 'LINEMAN001'}
                                        </p>
                                        {/* Line 3: Role */}
                                        <p className="text-orange-50 text-xs lg:text-sm font-medium opacity-90 capitalize mb-2">
                                            {role}-Member
                                        </p>
                                        {/* Line 4: Total Score + Reading Rewards */}
                                        <div className="flex items-center gap-2">
                                            <div className="px-2.5 py-1 lg:px-3 lg:py-1.5 bg-white/10 backdrop-blur-xl rounded-full text-white text-[9px] lg:text-xs font-bold uppercase tracking-wider border border-white/30 shadow-sm flex items-center gap-1">
                                                <span className="opacity-80 text-sm lg:text-base">💎</span>
                                                {loading ? '...' : <CountUp end={score} start={!showTipModal && !!dailyTip} />}
                                            </div>
                                            <div className="px-2.5 py-1 lg:px-3 lg:py-1.5 bg-white/10 backdrop-blur-xl rounded-full text-white text-[9px] lg:text-xs font-bold uppercase tracking-wider border border-white/30 shadow-sm flex items-center gap-1">
                                                <span className="opacity-80 text-sm lg:text-base">📖</span>
                                                {loading ? '...' : <CountUp end={readingPoints} start={!showTipModal && !!dailyTip} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Stats Cards - Desktop Only */}
                                <div className="hidden lg:flex lg:flex-col gap-3 lg:w-80">
                                    {/* Current Reading Chapter */}
                                    <div
                                        className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all cursor-pointer active:scale-[0.98]"
                                        onClick={() => setCurrentView('training')}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-xl shrink-0">
                                                📖
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-orange-100 text-[10px] uppercase tracking-wider font-semibold opacity-80 mb-1">
                                                    {language === 'en' ? 'Continue Reading' : 'পড়া চালিয়ে যান'}
                                                </div>
                                                <div className="text-white text-xl font-bold mb-0.5">
                                                    {language === 'en' ? `Chapter ${currentChapter}` : `অধ্যায় ${currentChapter}`}
                                                </div>
                                                <div className="text-orange-100 text-xs opacity-90">
                                                    {language === 'en' ? 'Next in your training path' : 'আপনার প্রশিক্ষণ পথে পরবর্তী'}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                                    <div className="text-white text-xl font-black">
                                                        {currentChapter.split('.')[0]}
                                                    </div>
                                                </div>
                                                <div className="text-orange-100 text-[9px] uppercase font-semibold opacity-75 mt-0.5 text-center">
                                                    {language === 'en' ? 'Level' : 'স্তর'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Summary */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="bg-white/10 backdrop-blur-xl rounded-lg p-3 border border-white/20">
                                            <div className="text-orange-100 text-[9px] uppercase tracking-wider font-semibold opacity-80 mb-0.5">
                                                {language === 'en' ? 'Lessons' : 'পাঠ'}
                                            </div>
                                            <div className="text-white text-2xl font-black">{completedLessonsCount}</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-xl rounded-lg p-3 border border-white/20">
                                            <div className="text-orange-100 text-[9px] uppercase tracking-wider font-semibold opacity-80 mb-0.5">
                                                {language === 'en' ? 'Chapter' : 'অধ্যায়'}
                                            </div>
                                            <div className="text-white text-2xl font-black">{currentChapter.split('.')[0]}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hero section ends here, Awareness banner follows */}

                    {/* Awareness Banner - High Impact */}
                    <div className="max-w-7xl mx-auto px-4 mt-6 lg:mt-8">
                        <div
                            className="relative overflow-hidden group cursor-pointer rounded-3xl bg-slate-950 shadow-2xl border border-white/5 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
                            onClick={() => setCurrentView('accident-stories')}
                        >
                            {/* The main emotional photo on the left with fade */}
                            <div className="absolute inset-y-0 left-0 w-full sm:w-2/3 pointer-events-none">
                                <img
                                    src={emotionalImages[emotionalImageIndex]}
                                    alt="Emotional scene"
                                    className="h-full w-full object-cover transition-all duration-1000 ease-in-out"
                                    key={emotionalImageIndex}
                                    style={{
                                        maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%)',
                                        WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%)'
                                    }}
                                />
                            </div>

                            {/* Sophisticated Gradient Overlays */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-950/40 to-slate-950/95"></div>
                            <div className="absolute inset-0 border-2 border-red-500/20 rounded-3xl animate-pulse pointer-events-none"></div>

                            {/* Progress bar at bottom */}
                            <div className="absolute bottom-0 left-0 h-1 bg-red-600/30 w-full">
                                <div
                                    className="h-full bg-red-600 transition-all duration-[4000ms] ease-linear"
                                    style={{ width: '100%' }}
                                    key={emotionalImageIndex}
                                ></div>
                            </div>

                            {/* Content container - shifted right to avoid covering the face too much */}
                            <div className="relative p-7 sm:p-10 min-h-[180px] flex flex-col justify-center">
                                <div className="max-w-[70%] ml-auto text-right">
                                    <h3 className="text-white text-xl sm:text-3xl font-black leading-tight mb-2 drop-shadow-xl tracking-tight uppercase italic">
                                        {language === 'bn' ? 'করুণ কাহিনী!' : 'A Tragic Story'}
                                    </h3>
                                    <p className="text-red-100 text-sm sm:text-base font-bold leading-relaxed opacity-95 drop-shadow-md italic mb-5">
                                        {language === 'bn'
                                            ? 'উদাসীনতা আর অবহেলার নির্মম বলি হয়ে অকালে হারিয়ে যাচ্ছে কত প্রাণ!'
                                            : 'Countless lives are lost prematurely as victims of indifference and negligence!'}
                                    </p>
                                    <div className="inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest bg-red-600 hover:bg-red-700 px-6 py-3 rounded-full shadow-xl active:scale-95 transition-all">
                                        {language === 'bn' ? 'বিস্তারিত পড়ুন' : 'Read Full Story'}
                                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mimic Grid Layout - Responsive */}
                    <div className="max-w-7xl mx-auto px-4 mt-8 lg:mt-12">
                        {/* Responsive Grid: 3 cols mobile, 4 tablet, 6 desktop */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                            {navItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleNav(item)}
                                    className="mimic-card aspect-square text-center group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                                >
                                    <div
                                        className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center text-xl sm:text-2xl mb-3 shadow-sm border border-black/5 mx-auto group-hover:scale-110 transition-transform duration-300"
                                        style={{ backgroundColor: item.color, color: '#fff' }}
                                    >
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center">
                                            {typeof item.icon === 'string' ? item.icon : React.cloneElement(item.icon, { className: 'w-full h-full' })}
                                        </div>
                                    </div>
                                    <p className="text-[10px] sm:text-xs lg:text-sm font-bold text-slate-600 dark:text-slate-400 leading-tight group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                                        {item.label[language]}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Daily Tip Modal */}
                    {showTipModal && createPortal(
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
                        </div>,
                        document.body
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
