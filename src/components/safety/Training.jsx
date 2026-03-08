import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import secureStorage from '../../utils/secureStorage';
import { supabase } from '../../supabaseClient';
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL } from '../../config';
import HomeSkeleton from '../loaders/HomeSkeleton';
import { calculateLevelFromProgress, getBadgeByLevel } from '../../utils/badgeUtils';
import { cacheHelper } from '../../utils/cacheHelper';
import { storageUtils } from '../../utils/storageUtils';
import { requestManager } from '../../utils/requestManager';
import ChapterQuizModal from '../ChapterQuizModal';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import LessonCelebration from './LessonCelebration';
import PPESurveyModal from './PPESurveyModal';
import OnboardingSequence from './OnboardingSequence';
import Lottie from 'lottie-react';
import { DotLottiePlayer } from '@dotlottie/react-player';
import lottieEye from '../../assets/lottie_eye.json';
import sandyLoading from '../../assets/SandyLoading.lottie';
import calendarLottie from '../../assets/calendar.lottie';
import readingLottie from '../../assets/readding.lottie';
import protipLottie from '../../assets/protip.lottie';
import mythLottie from '../../assets/myth.lottie';
import clockLottie from '../../assets/clock.lottie';

const PPE_MAP = {
    1: { name: "Safety Helmet", icon: "🪖", image: "/quizzes/faq_images/Safety_Helmet.webp" },
    2: { name: "Safety Shoes/Boots", icon: "🥾", image: "/quizzes/faq_images/safety_shoe_1.webp" },
    3: { name: "Insulated Gloves", icon: "🧤", image: "/quizzes/faq_images/Electrical_Gloves.webp" },
    4: { name: "Reflective Jacket", icon: "🦺" },
    5: { name: "Safety Belt", icon: "🧗" },
    6: { name: "Full Body Harness", icon: "🧗‍♂️" },
    7: { name: "Voltage Detector", icon: "🔌" },
    8: { name: "Discharge Rod", icon: "🦯" },
    9: { name: "Safety Goggles", icon: "🥽" },
    10: { name: "Torch/Emergency Light", icon: "🔦" }
};

const toBengaliNumber = (num, lang) => {
    if (!num) return '';
    if (lang !== 'bn') return num;
    const bnNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(digit => bnNumbers[digit] || digit).join('');
};

const TrainingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[...Array(6)].map((_, i) => (
            <div key={i} className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full mb-2"></div>
                <div className="flex justify-between">
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/4"></div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/4"></div>
                </div>
            </div>
        ))}
    </div>
);

const TrainingChapterCard = React.memo(({ chapter, completedLessons, language, onClick }) => {
    const isFAQ = chapter.number === 10;
    const completedCount = completedLessons.filter(id => id && id.toString().startsWith(`${chapter.number}.`)).length;
    const progress = chapter.count > 0 ? Math.min(100, Math.round((completedCount / chapter.count) * 100)) : 0;

    return (
        <div
            onClick={() => onClick(chapter)}
            className={`p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer group relative overflow-hidden active:scale-95 animate-entrance-pop ${isFAQ
                ? 'bg-gradient-to-br from-violet-50/50 to-fuchsia-100/30 dark:from-violet-900/10 dark:to-fuchsia-900/10 border-violet-100 dark:border-violet-800/40 hover:border-violet-400 dark:hover:border-violet-500 shadow-sm hover:shadow-xl lg:hover:-translate-y-2'
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50 hover:border-orange-200 dark:hover:border-orange-800 hover:shadow-2xl lg:hover:-translate-y-2'
                }`}
        >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full transition-opacity duration-500 opacity-0 group-hover:opacity-20 pointer-events-none ${isFAQ ? 'bg-violet-500' : 'bg-orange-500'}`}></div>

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${isFAQ
                        ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                        : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                        }`}>
                        {isFAQ ? '?' : chapter.number}
                    </div>
                    <div>
                        <h3 className={`font-black tracking-tight leading-tight text-lg lg:text-xl transition-colors ${language === 'bn' ? 'font-bengali' : ''} ${isFAQ
                            ? 'text-violet-900 dark:text-violet-100 group-hover:text-violet-700 dark:group-hover:text-violet-300'
                            : 'text-slate-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400'
                            }`}>
                            {chapter.title}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                            {isFAQ ? (
                                language === 'en' ? 'Reference Guide' : 'রেফারেন্স গাইড'
                            ) : (
                                language === 'en' ? (
                                    `${chapter.count} Lessons`
                                ) : (
                                    `${toBengaliNumber(chapter.count, 'bn')}টি পাঠ`
                                )
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Bar Area */}
            {!isFAQ && (
                <div className="space-y-3 relative z-10">
                    <div className="w-full h-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-full overflow-hidden shadow-inner border border-slate-100 dark:border-slate-800">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out relative ${progress === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-orange-400 to-orange-600'}`}
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 shimmer opacity-30"></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {completedCount}/{chapter.count} {language === 'en' ? 'Complete' : 'সম্পন্ন'}
                        </span>
                        <span className={`text-xs font-black ${progress === 100 ? 'text-emerald-500' : 'text-orange-500'}`}>
                            {progress}%
                        </span>
                    </div>
                </div>
            )}

            {isFAQ && (
                <div className="mt-4 flex items-center gap-1.5 text-violet-500 font-black text-[10px] uppercase tracking-wider">
                    {language === 'en' ? 'Access Knowledge' : 'জ্ঞান অন্বেষণ করুন'} <span>→</span>
                </div>
            )}
        </div>
    );
});

const TrainingSubChapterCard = React.memo(({ subchapter, isUnlocked, isCompleted, isNext, language, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`flex-shrink-0 w-[240px] sm:w-[280px] snap-center relative aspect-[3/4] rounded-[2.5rem] overflow-hidden transition-all duration-500 group ${isUnlocked ? 'cursor-pointer hover:scale-[1.02] hover:-translate-y-2' : 'cursor-not-allowed grayscale'
                }`}
        >
            {/* Book Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-700 ${isCompleted
                ? 'from-emerald-400 via-emerald-500 to-teal-600'
                : isUnlocked
                    ? 'from-orange-400 via-orange-500 to-rose-500'
                    : 'from-slate-400 to-slate-600'
                } ${isNext ? 'animate-pulse-slow' : ''}`} />

            {/* Decorative Patterns */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black rounded-full -ml-16 -mb-16 blur-3xl" />
            </div>

            {/* Glass Overlay */}
            <div className="absolute inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-[2px] border border-white/20" />

            {/* Content Layout */}
            <div className="absolute inset-0 p-8 flex flex-col items-center text-center">
                {/* Status Badge */}
                <div className={`self-end px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${isCompleted
                    ? 'bg-emerald-500/20 text-white border-emerald-400/30'
                    : isUnlocked
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-black/20 text-slate-300 border-white/10'
                    }`}>
                    {isCompleted ? (language === 'en' ? 'Done' : 'সম্পন্ন') : (isUnlocked ? (language === 'en' ? 'Ready' : 'শুরু করুন') : (language === 'en' ? 'Locked' : 'লক'))}
                </div>

                {/* Center Icon/Number */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mb-4 shadow-2xl transition-transform duration-500 group-hover:rotate-6 ${isCompleted ? 'bg-white/30' : 'bg-white/20'
                        }`}>
                        {isCompleted ? '⭐' : (isUnlocked ? '📖' : '🔒')}
                    </div>
                    <div className="text-[10px] font-black text-white/60 tracking-[0.2em] uppercase mb-1">
                        {language === 'en' ? 'Lesson' : 'পাঠ'} {subchapter.level_id}
                    </div>
                </div>

                {/* Title Section */}
                <div className="w-full">
                    <h4 className={`text-xl font-black text-white leading-tight mb-2 drop-shadow-lg ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {subchapter.level_title}
                    </h4>
                    <div className="h-1 w-12 bg-white/30 rounded-full mx-auto" />
                </div>
            </div>

            {/* Next Indicator */}
            {isNext && (
                <div className="absolute top-4 left-4">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full shadow-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-tighter">Next Up</span>
                    </div>
                </div>
            )}
        </div>
    );
});

export default function Training({ language = 'en', user, onProgressUpdate, setCurrentView }) {
    const [showOnboarding, setShowOnboarding] = useState(() => {
        const today = new Date().toDateString();
        const lastSeenDate = localStorage.getItem('lastOnboardingDate');
        return lastSeenDate !== today;
    });
    const [showWelcome, setShowWelcome] = useState(() => {
        // Defer welcome if onboarding is active
        const today = new Date().toDateString();
        const lastSeenDate = localStorage.getItem('lastOnboardingDate');
        if (lastSeenDate !== today) return false;

        // Only show once per session. Use sessionStorage so it resets when browser closes or tab reloads fully.
        const hasSeenWelcome = sessionStorage.getItem('hasSeenTrainingWelcome');
        return !hasSeenWelcome;
    });
    const [trainingChapters, setTrainingChapters] = useState([]);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [trainingContent, setTrainingContent] = useState(null);
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [completedLessons, setCompletedLessons] = useState([]);
    const [faqSearchQuery, setFaqSearchQuery] = useState('');
    const [isFaqTagsExpanded, setIsFaqTagsExpanded] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [readingPoints, setReadingPoints] = useState(0);

    // Quiz Modal State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [currentQuizQuestions, setCurrentQuizQuestions] = useState([]);
    const [pendingLessonId, setPendingLessonId] = useState(null);
    const [previousQuizQuestions, setPreviousQuizQuestions] = useState({});
    const [recentReward, setRecentReward] = useState(null);
    const [activeSectionIndex, setActiveSectionIndex] = useState(0); // For Journal Mode
    const [isJournalMode, setIsJournalMode] = useState(false);
    const [activeImageModal, setActiveImageModal] = useState(null);
    const [showAllChapters, setShowAllChapters] = useState(false);
    const [learningInsights, setLearningInsights] = useState(null);
    const [isInsightsLoading, setIsInsightsLoading] = useState(false);
    const [showPPESurvey, setShowPPESurvey] = useState(false);
    const [surveyPPEItem, setSurveyPPEItem] = useState(null);
    const [pendingSubchapter, setPendingSubchapter] = useState(null);
    const [userPPEData, setUserPPEData] = useState([]);
    const galleryRef = useRef(null);
    const lessonScrollRef = useRef(null);
    const audioRef = useRef(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [activeAudioChapter, setActiveAudioChapter] = useState(null);
    const [isHourlyPending, setIsHourlyPending] = useState(false);
    const [userRank, setUserRank] = useState(null);

    // Fetch user rank for leaderboard preview
    useEffect(() => {
        const fetchRank = async () => {
            if (!user) return;
            try {
                const rankData = await requestManager.fetch(
                    `user_rank_${user.id}`,
                    async () => {
                        const { data: myData, error: myError } = await supabase
                            .from('leaderboard_view')
                            .select('score')
                            .eq('user_id', user.id)
                            .maybeSingle();

                        if (myError || !myData) return null;

                        const { count, error: countError } = await supabase
                            .from('leaderboard_view')
                            .select('*', { count: 'exact', head: true })
                            .gt('score', myData.score);

                        if (countError) throw countError;

                        return { rank: count + 1, score: myData.score };
                    },
                    { ttl: 5, swr: true, forceRefresh: false }
                );

                if (rankData) {
                    setUserRank(rankData);
                }
            } catch (error) {
                console.error('Error fetching rank in training:', error);
            }
        };

        fetchRank();
    }, [user]);

    useEffect(() => {
        const checkHourlyEligibility = async () => {
            if (!user) return;
            try {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hour = String(now.getHours()).padStart(2, '0');
                const quizId = `hourly-challenge-${year}-${month}-${day}-${hour}`;

                const { data, error } = await supabase
                    .from('quiz_attempts')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('quiz_id', quizId)
                    .limit(1);

                if (!error) {
                    setIsHourlyPending(data.length === 0);
                }
            } catch (err) {
                console.error("Error checking hourly challenge:", err);
            }
        };

        checkHourlyEligibility();

        // Setup an interval to check this every 5 minutes in case the hour rolls over while they are just sitting on the page
        const intervalId = setInterval(checkHourlyEligibility, 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [user]);

    const toggleChapterAudio = (chapterNum) => {
        if (activeAudioChapter === chapterNum && isAudioPlaying) {
            audioRef.current?.pause();
            setIsAudioPlaying(false);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        const url = `https://raw.githubusercontent.com/UtilityDD/mahabani_audio/main/mahabani_amriterswad/bn/${chapterNum}.m4a`;
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => {
            setIsAudioPlaying(false);
            setActiveAudioChapter(null);
        };
        audioRef.current.play();
        setIsAudioPlaying(true);
        setActiveAudioChapter(chapterNum);
    };

    const stopChapterAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsAudioPlaying(false);
            setActiveAudioChapter(null);
        }
    };



    // Helper function to check if a lesson is unlocked (GLOBALLY SEQUENTIAL — FULL CHAIN)
    const isLessonUnlocked = useCallback((chapterNum, subchapterNum) => {
        // Very first lesson is always unlocked
        if (chapterNum === 1 && subchapterNum === 1) return true;

        // ALL previous chapters must be fully completed
        for (let c = 1; c < chapterNum; c++) {
            const chapter = trainingChapters.find(ch => ch.number === c);
            if (!chapter) return false;
            for (let i = 1; i <= chapter.count; i++) {
                if (!completedLessons.includes(`${c}.${i}`)) return false;
            }
        }

        // All previous lessons in the current chapter must be completed
        for (let i = 1; i < subchapterNum; i++) {
            if (!completedLessons.includes(`${chapterNum}.${i}`)) return false;
        }

        return true;
    }, [completedLessons, trainingChapters]);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // roadmapData memoization for optimization and scrolling support
    const roadmapData = useMemo(() => {
        if (!trainingChapters || trainingChapters.length === 0) return { items: [], height: 0, maxPath: 0, journeyChapters: [] };

        const journeyChapters = trainingChapters.filter(c => c.number !== 10);
        const items = [];

        const badgeLevels = [
            { level: 1, en: "Trainee", bn: "ট্রেইনি", color: "bg-slate-500", count: 0 },
            { level: 2, en: "Junior", bn: "জুনিয়র", color: "bg-blue-600", count: 2 },
            { level: 3, en: "Technician", bn: "টেকনিশিয়ান", color: "bg-cyan-600", count: 5 },
            { level: 4, en: "Skilled", bn: "স্কিলড", color: "bg-emerald-600", count: 10 },
            { level: 5, en: "Advanced", bn: "অ্যাডভান্সড", color: "bg-indigo-600", count: 20 },
            { level: 6, en: "Senior", bn: "সিনিয়র", color: "bg-violet-600", count: 35 },
            { level: 7, en: "Supervisor", bn: "সুপারভাইজার", color: "bg-purple-600", count: 50 },
            { level: 8, en: "Specialist", bn: "স্পেশালিস্ট", color: "bg-rose-600", count: 70 },
            { level: 9, en: "Expert", bn: "এক্সপার্ট", color: "bg-orange-600", count: 100 }
        ];

        const getBadgeByLevel = (lvl) => badgeLevels.find(b => b.level === lvl) || badgeLevels[0];

        journeyChapters.forEach((chapter) => {
            const badge = getBadgeByLevel(chapter.number);
            const isChapterUnlocked = isLessonUnlocked(chapter.number, 1);
            items.push({
                type: 'milestone',
                isUnlocked: isChapterUnlocked,
                chapter: chapter,
                badge: badge,
                index: items.length
            });

            for (let i = 1; i <= chapter.count; i++) {
                const lessonId = `${chapter.number}.${i}`;
                items.push({
                    type: 'lesson',
                    id: lessonId,
                    chapterNumber: chapter.number,
                    lessonNumber: i,
                    isCompleted: completedLessons.includes(lessonId),
                    isUnlocked: isLessonUnlocked(chapter.number, i),
                    badge: badge,
                    title: `Lesson ${lessonId}`,
                    index: items.length
                });
            }
        });

        const maxPath = items.reduce((max, item, idx) => {
            return (item.isCompleted || item.isUnlocked) ? idx : max;
        }, 0);

        const nodeVerticalGap = 120;
        const height = items.length * nodeVerticalGap + 200;

        return { items, height, maxPath, nodeVerticalGap, journeyChapters };
    }, [trainingChapters, completedLessons, isLessonUnlocked]);

    // Auto-scroll to current reading position
    useEffect(() => {
        if (!selectedChapter && !trainingContent && !trainingLoading && roadmapData.items.length > 0) {
            const nextLesson = roadmapData.items.find(item => item.type === 'lesson' && !item.isCompleted && item.isUnlocked);

            if (nextLesson) {
                const timer = setTimeout(() => {
                    const scrollTarget = document.getElementById(`roadmap-node-${nextLesson.id}`);
                    if (scrollTarget) {
                        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 800);
                return () => clearTimeout(timer);
            }
        }
    }, [selectedChapter, trainingContent, trainingLoading, roadmapData.items]);

    const scrollGallery = (direction) => {
        if (galleryRef.current) {
            const scrollAmount = direction === 'left' ? -300 : 300;
            galleryRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const getSlides = (content) => {
        if (!content) return [];
        const slides = [];

        // Hero Slide
        slides.push({
            type: 'hero',
            level_title: content.level_title,
            badge_name: content.badge_name,
            level_id: content.level_id,
            mission_briefing: content.mission_briefing
        });

        // Section Slides
        if (content.sections) {
            content.sections.forEach(section => {
                slides.push({
                    type: 'section',
                    ...section
                });
            });
        }

        // Support Slides
        if (content.pro_tip) slides.push({ type: 'pro_tip', ...content.pro_tip });
        if (content.myth_buster) slides.push({ type: 'myth_buster', ...content.myth_buster });
        if (content.advanced_section) slides.push({ type: 'advanced', ...content.advanced_section });

        // Completion Slide
        slides.push({ type: 'completion', level_id: content.level_id });

        return slides;
    };

    const slides = getSlides(trainingContent);
    const isFirstSlide = activeSectionIndex === 0;
    const isLastSlide = activeSectionIndex === slides.length - 1;
    const nextSlide = () => {
        if (!isLastSlide) {
            setActiveSectionIndex(prev => prev + 1);
            if (lessonScrollRef.current) {
                lessonScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
            }
        }
    };

    const prevSlide = () => {
        if (!isFirstSlide) {
            setActiveSectionIndex(prev => prev - 1);
            if (lessonScrollRef.current) {
                lessonScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
            }
        }
    };

    const chapterGridRef = useRef(null);

    // Dynamic background styles for different slide types
    const slideTypeStyles = {
        hero: 'bg-slate-50 dark:bg-slate-950',
        section: 'bg-orange-50/40 dark:bg-orange-950/10',
        pro_tip: 'bg-emerald-50/40 dark:bg-emerald-950/10',
        myth_buster: 'bg-red-50/40 dark:bg-red-950/10 dark:text-red-200',
        advanced: 'bg-indigo-50/40 dark:bg-indigo-950/10',
        completion: 'bg-slate-50 dark:bg-slate-950'
    };

    const { speak, pause, resume, stop, isPlaying, isPaused } = useTextToSpeech(language);

    // Body scroll locking when full-page training is open
    useEffect(() => {
        if (trainingContent) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [trainingContent]);

    // Load completed lessons from localStorage and Supabase
    useEffect(() => {
        const loadProgress = async () => {
            if (!user) return;

            // 1. Load Local
            let localProgress = [];
            const saved = storageUtils.getItem(`training_progress_${user.id}`);
            if (saved) {
                localProgress = JSON.parse(saved);
            }

            // 2. Load Remote
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('completed_lessons, reading_points')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error("Supabase error fetching lessons:", error);
                }

                if (data) {
                    console.log('✅ Lessons fetched from Supabase:', {
                        completed_lessons: data.completed_lessons?.length || 0,
                        reading_points: data.reading_points || 0,
                        sample_lessons: data.completed_lessons?.slice(0, 5)
                    });

                    // Set reading points
                    setReadingPoints(data.reading_points || 0);

                    if (data.completed_lessons) {
                        // 3. Merge (Union)
                        const remoteProgress = Array.isArray(data.completed_lessons) ? data.completed_lessons : [];
                        const merged = [...new Set([...localProgress, ...remoteProgress])];

                        setCompletedLessons(merged);
                        console.log(`📊 Total lessons after merge: ${merged.length}`);

                        // Update local storage if different
                        if (merged.length !== localProgress.length) {
                            storageUtils.setItem(`training_progress_${user.id}`, JSON.stringify(merged));
                        }
                    } else {
                        // If no remote data, just set local
                        console.log('⚠️ No completed_lessons in Supabase, using local only');
                        setCompletedLessons(localProgress);
                    }
                } else {
                    // If no remote data, just set local
                    console.log('⚠️ No data from Supabase, using local only');
                    setCompletedLessons(localProgress);
                }
            } catch (err) {
                console.error("❌ Error syncing progress:", err);
                setCompletedLessons(localProgress);
            }
        };

        loadProgress();
    }, [user]);

    // Fetch and Calculate Learning Insights
    useEffect(() => {
        const fetchInsights = async () => {
            if (!user) return;
            setIsInsightsLoading(true);

            try {
                const { data, error } = await supabase
                    .from('quiz_attempts')
                    .select('created_at, quiz_id')
                    .eq('user_id', user.id)
                    .like('quiz_id', 'lesson_bonus_%')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    // 1. Calculate Streak
                    const dates = data.map(d => new Date(d.created_at).toDateString());
                    const uniqueDates = [...new Set(dates)];
                    let streak = 0;
                    const today = new Date().toDateString();
                    const yesterday = new Date(Date.now() - 86400000).toDateString();

                    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
                        streak = 1;
                        for (let i = 0; i < uniqueDates.length - 1; i++) {
                            const d1 = new Date(uniqueDates[i]);
                            const d2 = new Date(uniqueDates[i + 1]);
                            const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
                            if (diff === 1) streak++;
                            else break;
                        }
                    }

                    // 2. Peak Hour
                    const hours = data.map(d => new Date(d.created_at).getHours());
                    const hourCounts = {};
                    hours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1);
                    const peakHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b, 0);

                    // 3. Weekly Momentum & Days
                    const lastWeek = new Date(Date.now() - 7 * 86400000);
                    const weeklyLessons = data.filter(d => new Date(d.created_at) > lastWeek);
                    const weeklyCons = weeklyLessons.length;
                    const weeklyDays = [...new Set(weeklyLessons.map(d => new Date(d.created_at).toDateString()))].length;

                    // --- NEW: Descriptive Feedback & Ratings ---

                    // Habit Feedback (Based on Streak)
                    let habitRating = 1;
                    let habitFeedback = "";
                    if (streak >= 7) { habitRating = 5; habitFeedback = language === 'en' ? "Amazing consistency! You're a pro." : "আপনার শেখার আগ্রহ দারুণ! নিয়মিত বজায় রাখুন।"; }
                    else if (streak >= 3) { habitRating = 4; habitFeedback = language === 'en' ? "Good job! You're reading regularly." : "আপনার শেখার আগ্রহ ভাল। নিয়মিত পড়ছেন।"; }
                    else if (streak >= 1) { habitRating = 3; habitFeedback = language === 'en' ? "Occasional learner. Aim for daily reading!" : "আপনি মাঝেমধ্যে পড়েন। নিয়মিত হওয়ার চেষ্টা করুন।"; }
                    else { habitRating = 2; habitFeedback = language === 'en' ? "A bit irregular. Try to read every day!" : "আপনি ভীষণ অনিয়মিত। প্রতিদিন পড়ার অভ্যাস করুন।"; }
                    if (data.length === 0) { habitRating = 1; habitFeedback = language === 'en' ? "Start your journey today!" : "আজই আপনার শেখার যাত্রা শুরু করুন!"; }

                    // Timing Feedback (Based on Peak Hour)
                    let timingFeedback = "";
                    let timingRating = 5;
                    const maxFreq = hourCounts[peakHour] || 0;
                    const isRandom = data.length >= 3 && maxFreq < 2;

                    if (isRandom) {
                        timingRating = 3;
                        timingFeedback = language === 'en' ? "Your learning time is inconsistent. Try setting a fixed schedule for better results!" : "আপনার পড়ার কোনো নির্দিষ্ট সময় নেই। প্রতিদিন একটি নির্দিষ্ট সময়ে পড়ার অভ্যাস করলে ভালো ফল পাবেন।";
                    } else if (peakHour >= 5 && peakHour < 11) {
                        timingFeedback = language === 'en' ? "You usually read in the morning! Very good habit." : "আপনি সাধারণত সকালে পড়েন! খুব ভাল অভ্যাস।";
                    } else if (peakHour >= 11 && peakHour < 16) {
                        timingFeedback = language === 'en' ? "Great use of daylight for learning!" : "আপনি দিনের আলোয় শিখছেন!";
                    } else if (peakHour >= 16 && peakHour < 21) {
                        timingFeedback = language === 'en' ? "Productive evening learner. Keep it up!" : "আপনি বিকেলের সময় ব্যবহার করছেন।";
                    } else if (peakHour >= 21 || peakHour < 1) {
                        timingFeedback = language === 'en' ? "Quiet night learning. Stay focused!" : "আপনি রাতে শান্তিতে শিখতে পছন্দ করেন। চালিয়ে যান!";
                    } else {
                        timingFeedback = language === 'en' ? "Learning at late hours. Get enough rest too!" : "আপনি অনেক রাত পর্যন্ত পড়ছেন। পর্যাপ্ত বিশ্রামও নিন!";
                    }

                    // Weekly Momentum Feedback
                    let weeklyRating = 1;
                    let weeklyFeedback = "";
                    if (data.length === 0) {
                        weeklyRating = 1;
                        weeklyFeedback = language === 'en' ? "Your journey starts now! Complete your first lesson." : "আপনার যাত্রা মাত্র শুরু হলো! আজই প্রথম পাঠ সম্পন্ন করুন।";
                    } else if (weeklyCons >= 5) {
                        weeklyRating = 5;
                        weeklyFeedback = language === 'en' ? "Great speed this week! Learning fast." : "এই সপ্তাহে দুর্দান্ত গতি ছিল! আপনি দ্রুত শিখছেন।";
                    } else if (weeklyCons >= 2) {
                        weeklyRating = 4;
                        weeklyFeedback = language === 'en' ? "Steady progress this week." : "শিখনের গতি মাঝারি। আরও একটু চেষ্টা করুন।";
                    } else {
                        weeklyRating = 2;
                        weeklyFeedback = language === 'en' ? "Low momentum this week. Start again!" : "এই সপ্তাহে গতি বেশ কম। আবার শুরু করুন!";
                    }

                    setLearningInsights({
                        streak,
                        peakHour: parseInt(peakHour, 10),
                        isRandom,
                        weeklyMomentum: weeklyCons,
                        weeklyDays,
                        totalLessons: data.length,
                        habitRating,
                        habitFeedback,
                        timingFeedback,
                        timingRating,
                        weeklyRating,
                        weeklyFeedback
                    });
                }
            } catch (err) {
                console.error("Error calculating insights:", err);
            } finally {
                setIsInsightsLoading(false);
            }
        };

        fetchInsights();
    }, [user, completedLessons, language]);

    // Custom parser for interactive content: ((image_path|label)) and [[image_path]]
    const renderTextWithImages = (text) => {
        if (!text) return null;

        const parts = text.split(/(\(\(.*?\)\)|\[\[.*?\]\])/g);

        return parts.map((part, index) => {
            if (part.startsWith('((') && part.endsWith('))')) {
                const content = part.slice(2, -2);
                const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(content);

                return (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isImage) {
                                setActiveImageModal({ type: 'image', value: `/quizzes/${content}` });
                            } else {
                                setActiveImageModal({ type: 'text', value: content });
                            }
                        }}
                        className="inline-flex items-center justify-center w-10 h-10 mx-1.5 bg-white dark:bg-slate-800 rounded-2xl text-orange-600 dark:text-orange-400 hover:scale-110 active:scale-90 transition-all border border-orange-100 dark:border-slate-700 align-middle shadow-md hover:shadow-orange-500/10 group relative"
                        title={isImage ? "Click to view image" : "Click to read more"}
                    >
                        <div className="w-10 h-10 pointer-events-none p-1">
                            <Lottie
                                animationData={lottieEye}
                                loop={true}
                                autoplay={true}
                            />
                        </div>
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[8px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-widest z-50">
                            {isImage ? 'View Insight' : 'Read Info'}
                        </span>
                    </button>
                );
            } else if (part.startsWith('[[') && part.endsWith(']]')) {
                const imgPath = part.slice(2, -2);
                return (
                    <div key={index} className="my-10 group relative cursor-pointer" onClick={() => setActiveImageModal({ type: 'image', value: `/quizzes/${imgPath}` })}>
                        <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-[3rem] scale-90 group-hover:scale-100 transition-transform duration-700 opacity-0 group-hover:opacity-30"></div>
                        <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl transition-all duration-500 group-hover:scale-[1.02]">
                            <img
                                src={`/quizzes/${imgPath}`}
                                alt="Inline lesson helper"
                                className="w-full h-auto object-cover max-h-[500px] transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-end pb-8">
                                <div className="bg-white/20 backdrop-blur-md rounded-full px-6 py-2.5 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Enlarge Insight
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }
            // Handle plain text: detect bullets, numbered lists, and newlines
            if (typeof part === 'string' && part.length > 0) {
                const lines = part.split('\n');
                if (lines.length <= 1) return part;

                return (
                    <span key={index}>
                        {lines.map((line, lineIdx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <br key={`br-${index}-${lineIdx}`} />;

                            // Detect bullet patterns: •, ●, ◦, ▪, -, *, ➤, ✓, ✔, ☑
                            const bulletMatch = trimmed.match(/^([•●◦▪\-\*➤✓✔☑]\s*)(.*)/);

                            if (bulletMatch) {
                                return (
                                    <span key={`line-${index}-${lineIdx}`} className="flex items-start gap-2 mt-2.5">
                                        <span className="text-orange-500/70 shrink-0 mt-0.5 select-none">{bulletMatch[1].trim()}</span>
                                        <span className="flex-1">{bulletMatch[2]}</span>
                                    </span>
                                );
                            }

                            // Regular line - just add a line break before it
                            return (
                                <React.Fragment key={`line-${index}-${lineIdx}`}>
                                    {lineIdx > 0 && <br />}
                                    {line}
                                </React.Fragment>
                            );
                        })}
                    </span>
                );
            }
            return part;
        });
    };

    useEffect(() => {
        if (user?.id) {
            fetchUserPPEData();
        }
    }, [user?.id]);

    const fetchUserPPEData = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('user_ppe')
                .select('id, name, details')
                .eq('user_id', user.id);
            if (error) throw error;
            setUserPPEData(data || []);
        } catch (error) {
            console.error('Error fetching PPE data for survey:', error);
        }
    };

    // Fetch Training Chapters
    useEffect(() => {
        const fetchTrainingChapters = async () => {
            try {
                setTrainingLoading(true);
                setFetchError(false); // Clear previous error on retry
                const data = await requestManager.fetch(
                    'training_manifest',
                    async () => {
                        const response = await fetch('/quizzes/training_manifest.json');
                        if (response.ok) {
                            return await response.json();
                        }
                        throw new Error('Manifest not found');
                    },
                    { ttl: 60, swr: true, forceRefresh: true }
                );

                if (data) {
                    setTrainingChapters(data);
                }
            } catch (error) {
                console.error('Error fetching training chapters:', error);
                setFetchError(true);
            } finally {
                setTrainingLoading(false);
            }
        };

        fetchTrainingChapters();
    }, [language]);


    const handleChapterClick = async (chapter, targetLessonNum = null) => {
        // Local access to badge levels for enrichment
        const badgeLevels = [
            { level: 1, en: "Trainee", bn: "ট্রেইনি", color: "bg-slate-500", count: 0 },
            { level: 2, en: "Junior", bn: "জুনিয়র", color: "bg-blue-600", count: 2 },
            { level: 3, en: "Technician", bn: "টেকনিশিয়ান", color: "bg-cyan-600", count: 5 },
            { level: 4, en: "Skilled", bn: "স্কিলড", color: "bg-emerald-600", count: 10 },
            { level: 5, en: "Advanced", bn: "অ্যাডভান্সড", color: "bg-indigo-600", count: 20 },
            { level: 6, en: "Senior", bn: "সিনিয়র", color: "bg-violet-600", count: 35 },
            { level: 7, en: "Supervisor", bn: "সুপারভাইজার", color: "bg-purple-600", count: 50 },
            { level: 8, en: "Specialist", bn: "স্পেশালিস্ট", color: "bg-rose-600", count: 70 },
            { level: 9, en: "Expert", bn: "এক্সপার্ট", color: "bg-orange-600", count: 100 }
        ];
        const currentBadge = badgeLevels.find(b => b.level === chapter.number) || badgeLevels[0];

        setTrainingLoading(true);

        // Special handling for FAQ Chapter 10
        if (chapter.number === 10) {
            try {
                const data = await requestManager.fetch(
                    'chapter_10_qa',
                    async () => {
                        const response = await fetch('/quizzes/chapter_10_qa.json');
                        if (response.ok) {
                            return await response.json();
                        }
                        return null;
                    },
                    { ttl: 60, swr: true }
                );
                if (data) {
                    setSelectedChapter({ ...chapter, isFAQ: true, content: data });
                }
            } catch (err) {
                console.error("Error loading FAQ chapter:", err);
            } finally {
                setTrainingLoading(false);
            }
            return;
        }

        // Lazy load subchapters with Versioned Sync
        try {
            // 1. Fetch metadata (id and version) for specific module
            const { data: remoteMetadata, error: metaError } = await supabase
                .from('training_chapters')
                .select('id, version, module_number, chapter_number')
                .eq('module_number', chapter.number)
                .eq('language', language)
                .eq('is_active', true);

            if (metaError) {
                console.warn("Versioning check failed, falling back to legacy fetch:", metaError);
                throw new Error("fallback");
            }

            if (!remoteMetadata || remoteMetadata.length === 0) {
                throw new Error("fallback");
            }

            // 2. Load locally stored content and compare versions
            const subchapters = [];
            const localVersions = secureStorage.getItem('training_content_versions') || {};
            let needsFullFetch = false;

            for (const meta of remoteMetadata) {
                const localContent = secureStorage.getItem(`training_content_${meta.id}`);
                const localVer = localVersions[meta.id];

                if (localContent && localVer === meta.version) {
                    // Use local encrypted content
                    subchapters.push({
                        ...localContent,
                        level_id: meta.id,
                        chapterNum: meta.module_number,
                        subchapterNum: meta.chapter_number
                    });
                } else {
                    // This chapter needs to be fetched/updated
                    needsFullFetch = true;
                    break;
                }
            }

            // 3. If everything is up-to-date locally, we are done
            if (!needsFullFetch && subchapters.length === remoteMetadata.length) {
                const sorted = subchapters.sort((a, b) => a.subchapterNum - b.subchapterNum);
                setSelectedChapter({ ...chapter, subchapters: sorted });
                if (targetLessonNum) {
                    const lesson = sorted.find(s => s.subchapterNum === targetLessonNum);
                    if (lesson) {
                        setSelectedLesson({ ...lesson, badge: currentBadge, chapter: chapter });
                    }
                }
                setTrainingLoading(false);
                return;
            }

            // 4. Fetch full data if any mismatch found
            const { data: fullData, error: fetchError } = await supabase
                .rpc('get_chapters_by_module', {
                    module_num: chapter.number,
                    lang: language
                });

            if (fetchError) throw fetchError;

            if (fullData && fullData.length > 0) {
                const updatedVersions = { ...localVersions };
                const processed = fullData.map(row => {
                    // Save to secure storage
                    secureStorage.setItem(`training_content_${row.id}`, row.content);
                    updatedVersions[row.id] = row.version;

                    return {
                        ...row.content,
                        level_id: row.id,
                        chapterNum: row.module_number,
                        subchapterNum: row.chapter_number
                    };
                });

                // Update global version tracker
                secureStorage.setItem('training_content_versions', updatedVersions);
                const sorted = processed.sort((a, b) => a.subchapterNum - b.subchapterNum);
                setSelectedChapter({ ...chapter, subchapters: sorted });
                if (targetLessonNum) {
                    const lesson = sorted.find(s => s.subchapterNum === targetLessonNum);
                    if (lesson) {
                        setSelectedLesson({ ...lesson, badge: currentBadge, chapter: chapter });
                    }
                }
            } else {
                // Fallback to legacy file fetch if DB returns empty
                const promises = [];
                for (let s = 1; s <= chapter.count; s++) {
                    promises.push(
                        fetch(`/quizzes/chapter_${chapter.number}_${s}.json`)
                            .then(r => r.ok ? r.json() : null)
                            .catch(() => null)
                    );
                }
                const results = await Promise.all(promises);
                const processed = results
                    .map((d, idx) => d ? { ...d, chapterNum: chapter.number, subchapterNum: idx + 1 } : null)
                    .filter(Boolean);
                setSelectedChapter({ ...chapter, subchapters: processed });
                if (targetLessonNum && processed) {
                    const lesson = processed.find(s => s.subchapterNum === targetLessonNum);
                    if (lesson) {
                        setSelectedLesson({ ...lesson, badge: currentBadge, chapter: chapter });
                    }
                }
            }
        } catch (err) {
            console.error("Supabase sync failed, falling back to legacy fetch:", err);
            // Robust fallback for ANY error in the Supabase logic
            try {
                const promises = [];
                for (let s = 1; s <= chapter.count; s++) {
                    promises.push(
                        fetch(`/quizzes/chapter_${chapter.number}_${s}.json`)
                            .then(r => r.ok ? r.json() : null)
                            .catch(() => null)
                    );
                }
                const results = await Promise.all(promises);
                const processed = results
                    .map((d, idx) => d ? { ...d, chapterNum: chapter.number, subchapterNum: idx + 1 } : null)
                    .filter(Boolean);
                setSelectedChapter({ ...chapter, subchapters: processed });
                if (targetLessonNum && processed) {
                    const lesson = processed.find(s => s.subchapterNum === targetLessonNum);
                    if (lesson) {
                        setSelectedLesson({ ...lesson, badge: currentBadge, chapter: chapter });
                    }
                }
            } catch (fallbackErr) {
                console.error("Critical failure loading subchapters:", fallbackErr);
            }
        } finally {
            setTrainingLoading(false);
        }
    };

    // TTS Logic: Compile full lesson text
    const handleReadLesson = () => {
        const currentSlide = slides[activeSectionIndex];
        if (!currentSlide) return;

        let parts = [];

        if (currentSlide.type === 'hero') {
            parts.push(currentSlide.level_title);
            parts.push(currentSlide.mission_briefing);
        } else if (currentSlide.type === 'section') {
            parts.push(currentSlide.title);
            currentSlide.points?.forEach(point => {
                parts.push(point.item_name);
                if (point.specifications) parts.push(point.specifications);
                if (point.importance) parts.push(point.importance);
                if (point.daily_check) parts.push(point.daily_check);
            });
        } else if (currentSlide.type === 'pro_tip') {
            parts.push("Pro Tip");
            currentSlide.content?.forEach(tip => parts.push(tip));
        } else if (currentSlide.type === 'myth_buster') {
            parts.push(currentSlide.title);
            currentSlide.myths?.forEach(item => {
                parts.push((language === 'en' ? "Myth: " : "ভুল ধারণা: ") + item.myth);
                parts.push((language === 'en' ? "Reality: " : "সঠিক তথ্য: ") + (item.reality || item.fact));
            });
        } else if (currentSlide.type === 'advanced') {
            parts.push(currentSlide.title);
            currentSlide.facts?.forEach(fact => {
                parts.push(fact.title);
                parts.push(fact.content);
            });
        }

        const fullText = parts.join(". ");
        speak(fullText);
    };

    const finalizeLessonCompletion = async (lessonId) => {
        const alreadyCompleted = completedLessons.includes(lessonId);

        if (!alreadyCompleted) {
            // First time completion bonus
            const bonusPoints = 20;

            if (user) {
                try {
                    await supabase.rpc('submit_quiz_result_v2', {
                        p_quiz_id: `lesson_bonus_${lessonId}`,
                        p_score: bonusPoints
                    });

                    // Force leaderboard and rank to refresh immediately 
                    cacheHelper.clear('leaderboard_top_10_v3');
                    cacheHelper.clear('leaderboard_full_v3');
                    cacheHelper.clear(`user_rank_${user.id}`);

                    setRecentReward(bonusPoints);
                    // Clear reward message after 5 seconds
                    setTimeout(() => setRecentReward(null), 5000);
                } catch (err) {
                    console.error('Error awarding lesson bonus:', err);
                }
            }

            const updated = [...completedLessons, lessonId];
            setCompletedLessons(updated);

            if (user) {
                storageUtils.setItem(`training_progress_${user.id}`, JSON.stringify(updated));

                // Sync to Supabase (Level + Detailed Progress)
                const newLevel = calculateLevelFromProgress(updated, trainingChapters);
                await supabase.from('profiles')
                    .update({
                        training_level: newLevel,
                        completed_lessons: updated
                    })
                    .eq('id', user.id);
            }
            if (onProgressUpdate) {
                onProgressUpdate(updated);
            }
        }
        setShowQuizModal(false);
        setPendingLessonId(null);
    };

    const initiateLessonCompletion = async (lessonId) => {
        // Construct quiz filename based on lesson ID (e.g., "1.1" -> "questions_1_1.json")
        const filename = `questions_${lessonId.replace('.', '_')}.json`;

        try {
            const response = await fetch(`/quizzes/${filename}`);
            if (!response.ok) {
                // If no quiz file exists, just complete the lesson
                finalizeLessonCompletion(lessonId);
                return;
            }

            const allQuestions = await response.json();

            if (allQuestions && allQuestions.length > 0) {
                // Separate image-based and text-based questions
                const isImageQuestion = (q) => {
                    const hasQuestionImage = !!q.image;
                    const hasImageOptions = Array.isArray(q.options) && q.options.some(opt =>
                        typeof opt === 'string' && (opt.startsWith('/') || opt.includes('.jpg') || opt.includes('.png') || opt.includes('.webp'))
                    );
                    return hasQuestionImage || hasImageOptions;
                };

                const imagePool = allQuestions.filter(isImageQuestion).sort(() => 0.5 - Math.random());
                const textPool = allQuestions.filter(q => !isImageQuestion(q)).sort(() => 0.5 - Math.random());

                // Pick up to 2 guaranteed image questions
                const guaranteedCount = Math.min(imagePool.length, 2);
                const selectedImageQuestions = imagePool.slice(0, guaranteedCount);

                // Remaining pool: unused image questions + all text questions
                const remainingPool = [...imagePool.slice(guaranteedCount), ...textPool].sort(() => 0.5 - Math.random());

                // Combine and shuffle up to 10 total
                let selected = [...selectedImageQuestions, ...remainingPool].slice(0, 10);
                selected = selected.sort(() => 0.5 - Math.random());

                // Update previous questions for next attempt
                setPreviousQuizQuestions(prev => ({
                    ...prev,
                    [lessonId]: selected.map(q => q.questionText)
                }));

                setCurrentQuizQuestions(selected);
                setPendingLessonId(lessonId);
                setShowQuizModal(true);
            } else {
                // Empty quiz file
                finalizeLessonCompletion(lessonId);
            }
        } catch (error) {
            console.error("Error loading quiz:", error);
            // On error (e.g., 404), just complete the lesson
            finalizeLessonCompletion(lessonId);
        }
    };

    const handleReadAgain = () => {
        setActiveSectionIndex(0);
        setShowQuizModal(false);
    };

    const handleQuizComplete = (score) => {
        if (pendingLessonId) {
            finalizeLessonCompletion(pendingLessonId);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 md:mb-6 animate-slide-down">


            {fetchError && (
                <div className="max-w-md mx-auto mb-8 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-2xl text-center animate-fade-in">
                    <div className="text-3xl mb-3">📡</div>
                    <h3 className="text-red-800 dark:text-red-400 font-bold mb-2">
                        {language === 'en' ? 'Connection Error' : 'কানেকশন এরর'}
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-500 mb-4">
                        {language === 'en'
                            ? 'Unable to load training data. Please check your internet connection.'
                            : 'প্রশিক্ষণ তথ্য লোড করা সম্ভব হয়নি। আপনার ইন্টারনেট কানেকশন চেক করুন।'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                        >
                            {language === 'en' ? 'Retry' : 'আবার চেষ্টা করুন'}
                        </button>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.hash = '#/';
                                window.location.reload();
                            }}
                            className="px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                        >
                            {language === 'en' ? 'Reset Cache & Login' : 'ক্যাশ মুছে নতুন করে লগিন করুন'}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            {trainingLoading ? (
                <div className="animate-fade-in relative z-10">
                    {/* Only show Lottie if we're not loading subchapters within a main chapter */}
                    {!selectedChapter ? (
                        <div className="loading-container-fixed">
                            <div className="w-48 h-48 lg:w-64 lg:h-64 mb-4">
                                <DotLottiePlayer
                                    src={sandyLoading}
                                    autoplay
                                    loop
                                />
                            </div>
                            <p className={`text-slate-500 font-black animate-pulse ${language === 'bn' ? 'font-bengali text-xl' : 'text-lg tracking-widest uppercase opacity-70'}`}>
                                {language === 'en' ? 'Preparing Lesson...' : 'পাঠ প্রস্তুত করা হচ্ছে...'}
                            </p>
                        </div>
                    ) : (
                        <TrainingSkeleton />
                    )}
                </div>
            ) : !selectedChapter && !trainingContent ? (
                <div className="animate-fade-in-up">
                    {/* Gamified Journey Map Logic */}
                    {(() => {
                        const isMobile = window.innerWidth < 768;
                        const { items: roadmapItems, height: roadmapHeight, maxPath: maxPathIndex, nodeVerticalGap, journeyChapters } = roadmapData;

                        // Main Journey View
                        return (
                            <div className="relative max-w-2xl mx-auto pb-32">
                                {/* Header */}
                                <div className="text-center mb-16 pt-4 space-y-3">
                                    <h1 className={`text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Learn' : 'শিখুন'}
                                    </h1>
                                    <p className={`text-xl text-slate-500 dark:text-slate-400 font-bold max-w-lg mx-auto ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Master your safety skills' : 'আপনার পেশাগত জ্ঞান বাড়ান'}
                                    </p>

                                    {/* Minimal Leaderboard Stats */}
                                    {userRank && (
                                        <button
                                            onClick={() => setCurrentView('leaderboard')}
                                            className="mx-auto mt-6 px-6 py-2.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-full border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-lg hover:bg-white/90 dark:hover:bg-slate-800/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-between gap-5 text-slate-700 dark:text-slate-300 animate-fade-in-up"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl inline-block drop-shadow-sm">🏆</span>
                                                <div className="flex flex-col items-start translate-y-[1px]">
                                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black leading-none mb-0.5">{language === 'en' ? 'Global Rank' : 'অবস্থান'}</span>
                                                    <span className="text-base font-black leading-none">#{(userRank.rank || 0).toLocaleString('en-US')}</span>
                                                </div>
                                            </div>
                                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl text-orange-500 inline-block drop-shadow-sm">⚡</span>
                                                <div className="flex flex-col items-start translate-y-[1px]">
                                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black leading-none mb-0.5">{language === 'en' ? 'Total Score' : 'মোট স্কোর'}</span>
                                                    <span className="text-base font-black leading-none">{(userRank.score || 0).toLocaleString('en-US')}</span>
                                                </div>
                                            </div>
                                            <svg className="w-4 h-4 ml-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Global Progress Dashboard */}
                                    {(() => {
                                        const totalLessons = journeyChapters.reduce((acc, c) => acc + (c.count || 0), 0);
                                        const totalCompleted = completedLessons.filter(id => {
                                            if (!id) return false;
                                            const chapterNum = parseInt(id.toString().split('.')[0]);
                                            return chapterNum >= 1 && chapterNum < 10;
                                        }).length;
                                        const overallProgressPercentage = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

                                        if (totalLessons === 0) return null;

                                        return (
                                            <div className="max-w-md mx-auto mt-8 p-5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-slate-700/50 shadow-2xl animate-entrance-pop">
                                                <div className="flex items-center justify-center md:justify-between mb-4 px-1">
                                                    <div className="hidden md:flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-lg">🏆</div>
                                                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                                            {language === 'en' ? 'Your Progress' : 'আপনার অগ্রগতি'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-3 py-1.5 rounded-xl border border-orange-100 dark:border-orange-900 text-[10px] shadow-sm">
                                                        {totalCompleted} / {totalLessons} {language === 'en' ? 'STEPS' : 'ধাপ'}
                                                    </span>
                                                </div>

                                                <div className="relative h-5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800 mb-4 shadow-inner">
                                                    <div
                                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all duration-1000 ease-out z-0"
                                                        style={{ width: `${overallProgressPercentage}%` }}
                                                    >
                                                        <div className="absolute inset-0 shimmer-fast opacity-30"></div>
                                                    </div>
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 drop-shadow-sm">
                                                            {overallProgressPercentage}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Journey Container */}
                                <div className="relative" style={{ height: roadmapHeight }}>

                                    {/* SVG Path Connector */}
                                    <svg
                                        className="absolute top-0 left-0 w-full h-full z-0 overflow-visible pointer-events-none"
                                        viewBox={`0 0 100 ${roadmapHeight}`}
                                        preserveAspectRatio="none"
                                    >
                                        <defs>
                                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feGaussianBlur stdDeviation="1.5" result="blur" />
                                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                            </filter>
                                        </defs>

                                        {/* Static Background Path */}
                                        <path
                                            d={roadmapItems.map((_, i) => {
                                                if (i === roadmapItems.length - 1) return '';
                                                const startY = i * nodeVerticalGap + 60;
                                                const endY = (i + 1) * nodeVerticalGap + 60;
                                                const amplitude = isMobile ? 25 : 18;
                                                const x1 = 50 + Math.sin(i * 0.8) * amplitude;
                                                const x2 = 50 + Math.sin((i + 1) * 0.8) * amplitude;
                                                const cpY1 = startY + nodeVerticalGap / 2;
                                                const cpY2 = endY - nodeVerticalGap / 2;
                                                return i === 0
                                                    ? `M ${x1} ${startY} C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`
                                                    : `C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`;
                                            }).join(" ")}
                                            stroke="currentColor"
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            fill="none"
                                            className="text-slate-100 dark:text-slate-800/50"
                                        />

                                        {/* Dynamic Progress Path */}
                                        <path
                                            d={(() => {
                                                if (maxPathIndex <= 0) return '';
                                                const pathParts = [];
                                                for (let i = 0; i < maxPathIndex; i++) {
                                                    const startY = i * nodeVerticalGap + 60;
                                                    const endY = (i + 1) * nodeVerticalGap + 60;
                                                    const amplitude = isMobile ? 25 : 18;
                                                    const x1 = 50 + Math.sin(i * 0.8) * amplitude;
                                                    const x2 = 50 + Math.sin((i + 1) * 0.8) * amplitude;
                                                    const cpY1 = startY + nodeVerticalGap / 2;
                                                    const cpY2 = endY - nodeVerticalGap / 2;
                                                    pathParts.push(i === 0
                                                        ? `M ${x1} ${startY} C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`
                                                        : `C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`);
                                                }
                                                return pathParts.join(" ");
                                            })()}
                                            stroke="#f97316"
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            fill="none"
                                            filter="url(#glow)"
                                            className="opacity-40"
                                        />
                                    </svg>

                                    {/* Nodes */}
                                    <div className="relative z-10">
                                        {roadmapItems.map((item, index) => {
                                            const amplitude = isMobile ? 25 : 18;
                                            const xPos = 50 + Math.sin(index * 0.8) * amplitude;
                                            const yPos = index * nodeVerticalGap + 60;

                                            if (item.type === 'milestone') {
                                                const firstLesson = roadmapItems[index + 1];
                                                const milestoneUnlocked = firstLesson ? firstLesson.isUnlocked : true;
                                                return (
                                                    <div key={`milestone-${item.chapter.number}`} className="absolute transition-all duration-700 z-10" style={{ left: `${xPos}%`, top: yPos, transform: 'translate(-50%, -50%)' }}>
                                                        <div className={`p-2 px-5 rounded-2xl border-2 backdrop-blur-xl flex flex-col items-center shadow-xl transition-all ${milestoneUnlocked ? `${item.badge.color} scale-105 border-white/80 dark:border-slate-700 animate-node-glow` : 'bg-slate-200/50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 grayscale opacity-80'}`}>
                                                            <div className="text-center">
                                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-0">{language === 'en' ? 'Rank' : 'পদমর্যাদা'}</p>
                                                                <h3 className={`font-black whitespace-nowrap ${language === 'bn' ? 'font-bengali text-base' : 'text-xs'}`}>{language === 'en' ? item.badge.en : item.badge.bn}</h3>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const isNext = !item.isCompleted && item.isUnlocked;
                                            return (
                                                <div
                                                    key={`lesson-${item.id}`}
                                                    id={`roadmap-node-${item.id}`}
                                                    onClick={() => {
                                                        if (item.isUnlocked) {
                                                            handleChapterClick(journeyChapters.find(c => c.number === item.chapterNumber), item.lessonNumber);
                                                        } else {
                                                            alert(language === 'en' ? 'Complete previous lessons first!' : 'আগের পাঠগুলো আগে শেষ করুন!');
                                                        }
                                                    }}
                                                    className={`absolute w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-500 z-20 group ${item.isCompleted ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-4 border-emerald-100 dark:border-emerald-500/30 text-white shadow-xl hover:scale-110' : item.isUnlocked ? `${item.badge.color} border-4 border-white dark:border-slate-700 text-slate-900 dark:text-white shadow-xl hover:scale-110 active:scale-95` : 'bg-slate-200/50 dark:bg-slate-800/80 border-4 border-slate-300/50 dark:border-slate-700/50 text-slate-400 dark:text-slate-500 shadow-inner grayscale cursor-not-allowed opacity-80'} ${isNext ? 'animate-float-y ring-4 ring-orange-500/30' : ''}`}
                                                    style={{ left: `${xPos}%`, top: yPos, transform: isNext ? undefined : 'translate(-50%, -50%)' }}
                                                >
                                                    <span className={`text-base sm:text-lg font-black ${language === 'bn' ? 'font-bengali' : ''}`}>{toBengaliNumber(item.id, language)}</span>
                                                    <div className={`absolute top-full mt-3 w-32 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-xl text-[10px] text-white font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                        {item.isCompleted ? (
                                                            language === 'en' ? 'Read Again' : 'আবার পড়ুন'
                                                        ) : item.isUnlocked ? (
                                                            language === 'en' ? 'Quick Read' : 'দ্রুত পড়ুন'
                                                        ) : (
                                                            language === 'en' ? 'Not so fast! 🔒' : 'ধৈর্য ধরুন! 🔒'
                                                        )}
                                                    </div>
                                                    {item.isCompleted && (
                                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg text-white">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Video Library CTA */}
                    <div className="mt-12 group">
                        <button
                            onClick={() => setCurrentView('video-guide')}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01]"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-6 text-center md:text-left">
                                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl lg:text-5xl shadow-inner">
                                        📺
                                    </div>
                                    <div>
                                        <h2 className={`text-2xl lg:text-3xl font-black mb-1 lg:mb-2 tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Video Learning Library' : 'ভিডিও লার্নিং লাইব্রেরি'}
                                        </h2>
                                        <p className={`text-orange-50 text-sm lg:text-base font-medium opacity-90 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Explore topic-wise safety guides and training videos' : 'বিষয়ভিত্তিক নিরাপত্তা গাইড এবং প্রশিক্ষণ ভিডিও দেখুন'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-black uppercase tracking-wider text-sm transition-all border border-white/30 shadow-lg">
                                    <span>{language === 'en' ? 'Watch Now' : 'এখনই দেখুন'}</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* FAQ CTA Card */}
                    <div className="mt-8 group">
                        <button
                            onClick={() => {
                                const faq = trainingChapters.find(c => c.number === 10);
                                if (faq) handleChapterClick(faq);
                            }}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01]"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-6 text-center md:text-left">
                                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl lg:text-5xl shadow-inner">
                                        💡
                                    </div>
                                    <div>
                                        <h2 className={`text-2xl lg:text-3xl font-black mb-1 lg:mb-2 tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Quick Help & FAQ' : 'কি, কেন?, কিভাবে?'}
                                        </h2>
                                        <p className={`text-violet-50 text-sm lg:text-base font-medium opacity-90 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Get answers to common safety questions and procedures' : 'আপনার মনে আসা সব প্রশ্নের সহজ সমাধান ও গাইড'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-black uppercase tracking-wider text-sm transition-all border border-white/30 shadow-lg">
                                    <span>{language === 'en' ? 'Search Answers' : 'উত্তর খুঁজুন'}</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    </div>


                    {/* Professional Branding Footer */}
                    <div className="mt-20 mb-32 text-center relative z-10 animate-fade-in-up">
                        <div className="flex flex-col items-center gap-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Official Platform</span>
                            </div>
                            <a
                                href={WEBSITE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-2xl font-black text-slate-900 dark:text-white tracking-tight hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                            >
                                {WEBSITE_URL.replace('https://', '')}
                            </a>
                            <div className="flex flex-col gap-1 items-center">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">For support and inquiries:</p>
                                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 transition-colors">
                                    {SUPPORT_EMAIL}
                                </a>
                            </div>
                            <div className="mt-4 w-40 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent"></div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {APP_NAME} v{CURRENT_APP_VERSION}
                            </p>
                        </div>
                    </div>
                </div>
            ) : selectedLesson ? (
                /* Full Page Book Preview Overlay */
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-10 animate-fade-in overflow-hidden">
                    {/* Immersive Background */}
                    <div className={`absolute inset-0 ${selectedLesson.badge?.color || 'bg-slate-900'} opacity-20 dark:opacity-40 animate-pulse-slow`} />
                    <div className="absolute inset-0 backdrop-blur-3xl bg-white/40 dark:bg-slate-900/60" />

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-orange-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

                    <div className="relative w-full max-w-2xl aspect-[3/4.5] sm:aspect-[3/4] bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden border border-white/50 dark:border-slate-700/50 flex flex-col group animate-entrance-pop">
                        {/* Top Design Element */}
                        <div className={`h-24 sm:h-32 w-full ${selectedLesson.badge?.color || 'bg-orange-500'} relative overflow-hidden shrink-0`}>
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.4),transparent)]" />
                            <button
                                onClick={() => {
                                    stopChapterAudio();
                                    setSelectedLesson(null);
                                    setSelectedChapter(null);
                                }}
                                className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all z-20"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Immersive Content */}
                        <div className="flex-1 p-8 sm:p-12 flex flex-col items-center justify-between text-center">
                            <div className="w-full space-y-6">
                                {/* Rank Badge & Audio */}
                                <div className="flex flex-col items-center">
                                    <div className="relative group/audio">
                                        <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] ${selectedLesson.badge?.color || 'bg-orange-500'} flex items-center justify-center text-4xl sm:text-6xl text-white shadow-2xl animate-subtle-float relative`}>
                                            <div className="absolute inset-0 rounded-[2.5rem] border-4 border-white/30 animate-ping opacity-20" />
                                            📖
                                        </div>

                                        {/* Audio Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleChapterAudio(selectedLesson.chapterNum);
                                            }}
                                            className={`absolute -bottom-2 -right-2 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 z-30 ${activeAudioChapter === selectedLesson.chapterNum && isAudioPlaying
                                                ? 'bg-orange-500 text-white scale-110'
                                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:scale-105'
                                                }`}
                                        >
                                            {activeAudioChapter === selectedLesson.chapterNum && isAudioPlaying ? (
                                                <div className="flex items-end gap-0.5 h-4">
                                                    <div className="w-1 bg-white animate-audio-bar-1" />
                                                    <div className="w-1 bg-white animate-audio-bar-2" />
                                                    <div className="w-1 bg-white animate-audio-bar-3" />
                                                </div>
                                            ) : (
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                                            )}
                                        </button>
                                    </div>

                                    <div className="mt-6 flex flex-col items-center gap-1">
                                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                                            {language === 'en' ? 'Chapter Status' : 'পদমর্যাদা'}
                                        </span>
                                        <h4 className={`text-xl sm:text-2xl font-black ${selectedLesson.badge?.color.replace('bg-', 'text-') || 'text-orange-500'} tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? selectedLesson.badge?.en : selectedLesson.badge?.bn}
                                        </h4>
                                    </div>
                                </div>

                                {/* Title Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-px w-10 bg-slate-200 dark:bg-slate-700" />
                                        <span className={`text-xs font-black text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Lesson' : 'পাঠ'} {toBengaliNumber(selectedLesson.level_id || `${selectedLesson.chapterNum}.${selectedLesson.subchapterNum}`, language)}
                                        </span>
                                        <div className="h-px w-10 bg-slate-200 dark:bg-slate-700" />
                                    </div>
                                    <h2 className={`text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {selectedLesson.level_title}
                                    </h2>
                                </div>
                            </div>

                            {/* Action Button - Next Arrow */}
                            <button
                                onClick={() => {
                                    stopChapterAudio();
                                    setTrainingContent(selectedLesson);
                                    setActiveSectionIndex(0);
                                    setIsJournalMode(true);
                                    setSelectedLesson(null);
                                }}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 relative group/btn"
                            >
                                <div className="absolute inset-0 rounded-full border-4 border-slate-900/10 dark:border-white/10 animate-ping opacity-40" />
                                <svg className="w-10 h-10 sm:w-12 sm:h-12 translate-x-1 group-hover/btn:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            ) : selectedChapter && !trainingContent ? (
                /* Subchapter List View or FAQ View */
                <div>
                    <button
                        onClick={() => setSelectedChapter(null)}
                        className="mb-6 flex items-center gap-2 text-orange-600 hover:text-orange-700 font-bold"
                    >
                        ← {language === 'en' ? 'Back to Chapters' : 'অধ্যায়ে ফিরে যান'}
                    </button>

                    {selectedChapter.isFAQ ? (
                        /* Redesigned FAQ View */
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-gradient-to-br from-violet-100/40 via-violet-50/20 to-fuchsia-100/30 dark:from-violet-900/40 dark:via-slate-800/40 dark:to-fuchsia-900/30 p-6 sm:p-8 rounded-[2.5rem] mb-8 border border-violet-200/50 dark:border-violet-700/50 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                                <div className="relative z-10">
                                    <h2 className="text-3xl font-black text-slate-800 dark:text-violet-100 mb-2 tracking-tight">
                                        {selectedChapter.content.title}
                                    </h2>
                                    <p className="text-slate-500 dark:text-violet-300/70 mb-8 font-bold">
                                        {selectedChapter.content.subtitle}
                                    </p>

                                    {/* Modernized Search Input */}
                                    <div className="relative group max-w-2xl">
                                        <div className="absolute inset-0 bg-violet-500/10 blur-xl group-focus-within:bg-violet-500/20 transition-all rounded-2xl"></div>
                                        <div className="relative flex items-center bg-white dark:bg-slate-900/80 backdrop-blur-xl border-2 border-slate-100 dark:border-violet-900/30 rounded-2xl overflow-hidden transition-all group-focus-within:border-violet-500 group-focus-within:ring-4 ring-violet-500/10">
                                            <div className="pl-5 text-violet-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={language === 'en' ? 'Search topics, questions, or tags...' : 'বিষয়, প্রশ্ন বা ট্যাগ খুঁজুন...'}
                                                value={faqSearchQuery}
                                                onChange={(e) => setFaqSearchQuery(e.target.value)}
                                                className={`w-full px-4 py-4 bg-transparent text-slate-900 dark:text-slate-100 font-bold outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 ${language === 'bn' ? 'font-bengali text-lg' : ''}`}
                                            />
                                            {faqSearchQuery && (
                                                <button
                                                    onClick={() => setFaqSearchQuery('')}
                                                    className="pr-4 text-slate-400 hover:text-violet-500 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Keyword Discovery Hub - Innovative Ribbon Layout */}
                                    <div className="mt-8">
                                        <div className="flex items-center justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest pl-2">Popular Keywords</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></div>
                                            </div>
                                            <button
                                                onClick={() => setIsFaqTagsExpanded(!isFaqTagsExpanded)}
                                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest hover:bg-violet-600 hover:text-white transition-all border border-violet-100 dark:border-violet-800"
                                            >
                                                {isFaqTagsExpanded ? (
                                                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" /></svg> Collapse</>
                                                ) : (
                                                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg> View All</>
                                                )}
                                            </button>
                                        </div>

                                        <div className={`relative ${!isFaqTagsExpanded ? 'after:absolute after:top-0 after:right-0 after:h-full after:w-20 after:bg-gradient-to-l after:from-violet-50/50 dark:after:from-slate-800/50 after:to-transparent after:pointer-events-none' : ''}`}>
                                            <div className={`${isFaqTagsExpanded ? 'flex flex-wrap' : 'flex overflow-x-auto scrollbar-hide pb-2 px-1'} gap-2 transition-all duration-500`}>
                                                {Array.from(new Set(selectedChapter.content.questions.flatMap(q => q.tags || []))).sort().map(tag => {
                                                    const isActive = faqSearchQuery.toLowerCase() === tag.toLowerCase();
                                                    return (
                                                        <button
                                                            key={tag}
                                                            onClick={() => setFaqSearchQuery(isActive ? '' : tag)}
                                                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 border ${isActive
                                                                ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-600/30 scale-105'
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 active:scale-95'
                                                                }`}
                                                        >
                                                            #{tag}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Question List */}
                            <div className="grid gap-4">
                                {selectedChapter.content.questions
                                    .filter(q => {
                                        if (!faqSearchQuery) return true;
                                        const query = faqSearchQuery.toLowerCase();
                                        return (
                                            q.question.toLowerCase().includes(query) ||
                                            q.answer.toLowerCase().includes(query) ||
                                            (q.tags && q.tags.some(tag => tag.toLowerCase().includes(query)))
                                        );
                                    })
                                    .map((q, idx) => {
                                        const isOpen = faqSearchQuery && q.question.toLowerCase().includes(faqSearchQuery.toLowerCase());
                                        return (
                                            <div
                                                key={q.id}
                                                className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden hover:shadow-2xl hover:border-violet-300 dark:hover:border-violet-500/50 transition-all duration-500 group shadow-lg shadow-slate-200/20 dark:shadow-none"
                                            >
                                                <details
                                                    className="group/details"
                                                    open={isOpen}
                                                >
                                                    <summary className="flex items-center justify-between p-4 sm:p-6 cursor-pointer list-none select-none">
                                                        <div className="flex items-start sm:items-center gap-3 sm:gap-5">
                                                            <div className="mt-1 sm:mt-0 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-lg shadow-violet-500/20 transition-all duration-500 group-hover/details:rotate-6 group-hover/details:scale-110 shrink-0">
                                                                Q{toBengaliNumber(idx + 1, language)}
                                                            </div>
                                                            <span className={`font-black text-slate-800 dark:text-slate-100 leading-snug transition-colors group-hover/details:text-violet-600 dark:group-hover/details:text-violet-400 ${language === 'bn' ? 'font-bengali text-lg sm:text-xl' : 'text-base sm:text-lg'}`}>
                                                                {q.question}
                                                            </span>
                                                        </div>
                                                        <div className="ml-4 w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 shrink-0 transition-all duration-500 group-open/details:rotate-180 group-open/details:bg-violet-600 group-open/details:text-white">
                                                            <svg fill="none" height="20" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                                                        </div>
                                                    </summary>
                                                    <div className="px-4 sm:px-8 pb-6 sm:pb-8 pt-0 sm:pt-2">
                                                        <div className="flex gap-3 sm:gap-5">
                                                            <div className="hidden sm:flex w-12 flex-col items-center shrink-0">
                                                                <div className="w-px h-full bg-gradient-to-b from-violet-200 to-transparent dark:from-violet-800/50"></div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <span className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em] bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-md">Answer</span>
                                                                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/50"></div>
                                                                </div>

                                                                <div className={`text-slate-600 dark:text-slate-300 leading-relaxed ${language === 'bn' ? 'font-bengali text-lg' : 'font-medium'}`}>
                                                                    {renderTextWithImages(q.answer)}
                                                                </div>

                                                                {q.image && (
                                                                    <div className="mt-6 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden border-2 sm:border-8 border-white dark:border-slate-800 shadow-2xl max-w-full sm:max-w-lg transform hover:scale-[1.01] transition-transform duration-500">
                                                                        <img
                                                                            src={`/quizzes/faq_images/${q.image}`}
                                                                            alt={q.question}
                                                                            className="w-full h-auto object-cover"
                                                                            loading="lazy"
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div className="mt-8 flex flex-wrap gap-2">
                                                                    {q.tags && q.tags.map(tag => (
                                                                        <button
                                                                            key={tag}
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                setFaqSearchQuery(tag);
                                                                            }}
                                                                            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all border border-slate-100 dark:border-slate-700"
                                                                        >
                                                                            #{tag}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </details>
                                            </div>
                                        );
                                    })}


                            </div>
                        </div>
                    ) : null}
                    {/* PPE Survey Modal */}
                    <PPESurveyModal
                        isOpen={showPPESurvey}
                        onClose={() => setShowPPESurvey(false)}
                        ppeItem={surveyPPEItem}
                        user={user}
                        existingId={userPPEData.find(p => p.name === surveyPPEItem?.name)?.id}
                        language={language}
                        onComplete={(ppeResult) => {
                            // 1. Optimistic UI Update: Update local state instantly
                            if (ppeResult) {
                                setUserPPEData(prev => {
                                    const filtered = prev.filter(p => p.name !== ppeResult.name);
                                    return [...filtered, ppeResult];
                                });
                            }
                            // 2. Refresh from DB silently in background (already handled by modal's internal fetch if needed, 
                            // but we refresh here to be sure of IDs etc later)
                            fetchUserPPEData();

                            // 3. Instant Transition: Proceed to lesson without waiting
                            if (pendingSubchapter) {
                                setTrainingContent(pendingSubchapter);
                                setActiveSectionIndex(0);
                                setIsJournalMode(true);
                                setPendingSubchapter(null);
                            }
                        }}
                    />
                </div>
            ) : null
            }

            {/* Safety Journal UI - Immersive Slide-based Experience */}
            {
                trainingContent && createPortal(
                    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col safe-area-inset-top animate-fade-in-up">
                        <div className="flex flex-col h-full overflow-hidden book-page-texture">
                            {/* Simple Book-like Header */}
                            <div className="sticky top-0 z-[100] bg-white/40 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5">
                                <div className="px-5 py-3 flex items-center h-16">
                                    <button
                                        onClick={() => {
                                            stop();
                                            setTrainingContent(null);
                                            setIsJournalMode(false);
                                            setSelectedChapter(null);
                                            setSelectedLesson(null);
                                        }}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-slate-500 transition-all active:scale-90"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>

                                    <div className="text-center flex-1 mx-4 min-w-0">
                                        <h2 className={`text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] truncate ${language === 'bn' ? 'font-bengali tracking-normal' : ''}`}>
                                            <span className="text-orange-500/80 font-black">{language === 'en' ? `${trainingContent.level_id}` : toBengaliNumber(trainingContent.level_id, language)}</span>
                                            <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                                            {trainingContent.level_title}
                                        </h2>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                stop();
                                                setTrainingContent(null);
                                                setIsJournalMode(false);
                                                setSelectedChapter(null);
                                                setSelectedLesson(null);
                                                setCurrentView('safety-library');
                                            }}
                                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30 hover:bg-orange-100 transition-all shadow-sm"
                                        >
                                            <span className="text-sm animate-rotate-y inline-block">🛡️</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest">{language === 'en' ? 'Library' : 'লাইব্রেরি'}</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                stop();
                                                setTrainingContent(null);
                                                setIsJournalMode(false);
                                                setSelectedChapter(null);
                                                setSelectedLesson(null);
                                                setCurrentView('safety-library');
                                            }}
                                            className="sm:hidden w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 transition-all"
                                        >
                                            <span className="text-xl animate-rotate-y inline-block">🛡️</span>
                                        </button>

                                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block opacity-50"></div>

                                        <button
                                            onClick={handleReadLesson}
                                            className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-500 ${isPlaying ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40 scale-105' : 'text-slate-400 hover:text-orange-500'}`}
                                        >
                                            <div className={`absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20 ${isPlaying ? 'block' : 'hidden'}`}></div>
                                            <svg className="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                                {isPlaying ? (
                                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                                ) : (
                                                    <path d="M8 5v14l11-7z" />
                                                )}
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Modern Progress Bar */}
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 relative z-20">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                                        style={{ width: `${((activeSectionIndex + 1) / slides.length) * 100}%` }}
                                    >
                                        <div className="absolute top-0 right-0 w-4 h-full bg-white/40 skew-x-12 opacity-50"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Slide Content Area */}
                            {(() => {
                                const activeSlide = slides[activeSectionIndex];
                                return (
                                    <div ref={lessonScrollRef} className={`flex-1 overflow-y-auto relative book-page-texture book-gutter scroll-smooth transition-colors duration-700`}>
                                        <div key={activeSectionIndex} className="max-w-2xl mx-auto px-7 sm:px-10 md:px-14 py-14 animate-fade-in-up mb-32">
                                            {activeSlide?.type === 'hero' && (
                                                <div className="flex flex-col items-center justify-center pt-6 pb-20 space-y-12">
                                                    <div className="w-full space-y-8 text-center">
                                                        <div className="space-y-4">
                                                            <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-600">
                                                                {language === 'en' ? `Session ${trainingContent.level_id}` : `পাঠ ${toBengaliNumber(trainingContent.level_id, language)}`}
                                                            </p>
                                                            <div className="h-px w-24 bg-slate-200 dark:bg-slate-800 mx-auto"></div>
                                                        </div>

                                                        <h1 className={`text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-100 leading-snug tracking-tight px-4 ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                                            {trainingContent.level_title}
                                                        </h1>
                                                    </div>

                                                    <div className="max-w-md w-full relative">
                                                        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800/30 blur-2xl -z-10 rounded-full"></div>
                                                        <p className={`text-lg text-slate-700 dark:text-slate-400 leading-[2] font-serif italic text-center px-4 ${language === 'bn' ? 'font-bengali text-[1.35rem] leading-[2.2]' : ''}`}>
                                                            {renderTextWithImages(trainingContent.mission_briefing)}
                                                        </p>
                                                    </div>

                                                    <div className="pt-20">
                                                        <div className="flex flex-col items-center gap-4 text-slate-300 dark:text-slate-700">
                                                            <div className="h-16 w-px bg-current"></div>
                                                            <span className="text-[10px] uppercase font-black tracking-widest">Start Journey</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {slides[activeSectionIndex]?.type === 'section' && (
                                                <div className="space-y-16">
                                                    <header className="text-center mb-12 sm:mb-16 px-2">
                                                        <h3 className={`text-2xl sm:text-3xl md:text-5xl font-black text-slate-800 dark:text-slate-100 leading-snug tracking-tight ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                                            {slides[activeSectionIndex].title}
                                                        </h3>
                                                    </header>

                                                    <div className="space-y-16 sm:space-y-20">
                                                        {slides[activeSectionIndex].points?.map((point, pIdx) => (
                                                            <div key={pIdx} className="group relative">
                                                                <div className="flex flex-col space-y-6 sm:space-y-8">
                                                                    <div className="flex items-baseline gap-3 sm:gap-4">
                                                                        <span className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-orange-500/20 select-none leading-none">
                                                                            {(pIdx + 1).toString().padStart(2, '0')}
                                                                        </span>
                                                                        <h4 className={`text-xl sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-200 leading-snug ${language === 'bn' ? 'font-bengali leading-[1.5]' : ''}`}>
                                                                            {point.item_name}
                                                                        </h4>
                                                                    </div>

                                                                    <div className="relative pl-0 md:pl-12 transition-all duration-500">
                                                                        {point.image_name && (
                                                                            <div
                                                                                className="mb-8 sm:mb-10 rounded-2xl sm:rounded-[2.5rem] overflow-hidden cursor-zoom-in shadow-2xl shadow-black/5"
                                                                                onClick={() => setActiveImageModal({ type: 'image', value: `/quizzes/${point.image_name}` })}
                                                                            >
                                                                                <img
                                                                                    src={`/quizzes/${point.image_name}`}
                                                                                    alt={point.item_name}
                                                                                    className="w-full h-auto object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
                                                                                    loading="lazy"
                                                                                />
                                                                            </div>
                                                                        )}

                                                                        <div className="space-y-6 sm:space-y-8">
                                                                            {point.specifications && (
                                                                                <p className={`text-lg sm:text-xl text-slate-700 dark:text-slate-300 leading-[1.9] font-medium ${language === 'bn' ? 'font-bengali text-xl sm:text-2xl leading-[2.1]' : ''}`}>
                                                                                    {renderTextWithImages(point.specifications)}
                                                                                </p>
                                                                            )}

                                                                            <div className="grid grid-cols-1 gap-6">
                                                                                {point.importance && (
                                                                                    <div className="bg-blue-500/5 dark:bg-blue-400/5 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-blue-500/10 backdrop-blur-sm">
                                                                                        <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                                                                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-500/60">{language === 'en' ? 'Strategy' : 'কৌশল'}</span>
                                                                                        </div>
                                                                                        <p className={`text-base sm:text-lg md:text-xl text-slate-800 dark:text-slate-200 font-bold leading-[1.8] ${language === 'bn' ? 'font-bengali leading-[2.0]' : ''}`}>
                                                                                            {renderTextWithImages(point.importance)}
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                                {point.daily_check && (
                                                                                    <div className="bg-emerald-500/5 dark:bg-emerald-400/5 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-emerald-500/10 backdrop-blur-sm">
                                                                                        <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                                                                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-500/60">{language === 'en' ? 'Action Plan' : 'কর্মপরিকল্পনা'}</span>
                                                                                        </div>
                                                                                        <p className={`text-base sm:text-lg md:text-xl text-slate-800 dark:text-slate-200 font-bold leading-[1.8] ${language === 'bn' ? 'font-bengali leading-[2.0]' : ''}`}>
                                                                                            {renderTextWithImages(point.daily_check)}
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="h-px w-full bg-slate-100 dark:bg-slate-800/50 mt-20 opacity-50"></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSlide?.type === 'pro_tip' && (
                                                <div className="space-y-16 py-10">
                                                    <header className="text-center mb-8">
                                                        <h3 className={`text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                            {language === 'en' ? activeSlide.title : 'মনে রাখবেন'}
                                                        </h3>
                                                    </header>

                                                    <div className="grid grid-cols-1 gap-8">
                                                        {activeSlide.content?.map((tip, idx) => (
                                                            <div key={idx} className="relative p-8 rounded-[2.5rem] bg-emerald-100/5 dark:bg-emerald-900/5 border border-emerald-500/10 backdrop-blur-md shadow-sm overflow-hidden">
                                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/30"></div>
                                                                <p className={`text-lg sm:text-xl md:text-2xl text-slate-700 dark:text-slate-300 leading-[1.9] font-medium ${language === 'bn' ? 'font-bengali text-xl sm:text-2xl md:text-[1.7rem] leading-[2.1]' : ''}`}>
                                                                    {renderTextWithImages(tip)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSlide?.type === 'myth_buster' && (
                                                <div className="space-y-16 py-10">
                                                    <header className="text-center mb-8">
                                                        <h3 className={`text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                            {language === 'en' ? activeSlide.title : 'ভুল ধারণা মুছে ফেলুন'}
                                                        </h3>
                                                    </header>

                                                    <div className="space-y-12">
                                                        {activeSlide.myths?.map((item, idx) => (
                                                            <div key={idx} className="space-y-4">
                                                                <div className="p-8 rounded-[2rem] bg-red-500/[0.03] dark:bg-red-900/[0.03] border border-red-500/10">
                                                                    <span className="text-[10px] uppercase font-black tracking-widest text-red-500/50 mb-3 block">
                                                                        {language === 'en' ? 'Perspective' : 'ভুল ধারণা'}
                                                                    </span>
                                                                    <p className={`text-lg sm:text-xl text-slate-600 dark:text-slate-400 italic font-medium leading-[1.9] ${language === 'bn' ? 'font-bengali text-xl sm:text-2xl leading-[2.1]' : ''}`}>
                                                                        "{renderTextWithImages(item.myth)}"
                                                                    </p>
                                                                </div>

                                                                <div className="p-8 rounded-[2rem] bg-emerald-500/[0.03] dark:bg-emerald-900/[0.03] border border-emerald-500/10 shadow-sm">
                                                                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500/50 mb-3 block">
                                                                        {language === 'en' ? 'Verdict' : 'আসল কথা'}
                                                                    </span>
                                                                    <p className={`text-lg sm:text-xl text-slate-800 dark:text-slate-200 font-bold leading-[1.9] ${language === 'bn' ? 'font-bengali text-xl sm:text-2xl leading-[2.1]' : ''}`}>
                                                                        {renderTextWithImages(item.reality || item.fact)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSlide?.type === 'advanced' && (
                                                <div className="space-y-16 py-10">
                                                    <header className="text-center mb-8">
                                                        <h3 className={`text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                            {activeSlide.title}
                                                        </h3>
                                                    </header>

                                                    <div className="grid grid-cols-1 gap-10">
                                                        {activeSlide.facts?.map((fact, idx) => (
                                                            <div key={idx} className="group">
                                                                <h4 className={`text-2xl font-black text-indigo-600 dark:text-indigo-400 mb-6 flex items-center gap-3 ${language === 'bn' ? 'font-bengali text-3xl' : ''}`}>
                                                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                                    {fact.title}
                                                                </h4>
                                                                <div className="p-8 rounded-[2.5rem] bg-indigo-500/[0.02] dark:bg-indigo-400/[0.02] border border-indigo-500/10 shadow-sm backdrop-blur-sm">
                                                                    <p className={`text-lg sm:text-xl text-slate-700 dark:text-slate-300 leading-[1.9] font-medium ${language === 'bn' ? 'font-bengali text-xl sm:text-2xl leading-[2.1]' : ''}`}>
                                                                        {renderTextWithImages(fact.content)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {slides[activeSectionIndex]?.type === 'completion' && (
                                                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-sm mx-auto animate-fade-in py-10">
                                                    <div className="relative w-64 h-64 mb-10">
                                                        <div className="absolute inset-0 bg-orange-500/5 dark:bg-orange-500/5 blur-[60px] rounded-full"></div>
                                                        <DotLottiePlayer
                                                            src={readingLottie}
                                                            autoplay
                                                            loop
                                                            className="w-full h-full relative z-10 grayscale-[0.3] hover:grayscale-0 transition-all duration-700"
                                                        />
                                                    </div>

                                                    <div className="space-y-4 mb-14">
                                                        <h3 className={`text-3xl md:text-4xl font-black text-slate-800 dark:text-white ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                            {language === 'en'
                                                                ? `Mission Complete`
                                                                : `মিশন সম্পন্ন`}
                                                        </h3>
                                                        <div className="h-px w-16 bg-slate-200 dark:bg-slate-800 mx-auto"></div>
                                                    </div>

                                                    <div className="w-full space-y-6">
                                                        <button
                                                            onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                                            className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-5 rounded-[2rem] text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                                        >
                                                            {language === 'en' ? 'Start Challenge' : 'চ্যালেঞ্জ শুরু করুন'}
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setTrainingContent(null);
                                                                setSelectedChapter(null);
                                                                setIsJournalMode(false);
                                                            }}
                                                            className="w-full py-4 flex flex-col items-center gap-2 group"
                                                        >
                                                            <div className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-slate-400 transition-all">
                                                                <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                                                                </svg>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Minimal Paper-like Footer Navigation */}
                            <div className="fixed bottom-0 left-0 right-0 bg-transparent px-6 py-6 pb-12 flex items-center justify-between safe-area-inset-bottom">
                                <button
                                    onClick={prevSlide}
                                    disabled={isFirstSlide}
                                    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isFirstSlide ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-75 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                <div className="flex items-center gap-1.5 px-4 py-2 bg-black/5 dark:bg-white/5 backdrop-blur-md rounded-full">
                                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                        {activeSectionIndex + 1} / {slides.length}
                                    </span>
                                </div>

                                {!isLastSlide ? (
                                    <button
                                        onClick={nextSlide}
                                        className="flex items-center justify-center w-12 h-12 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-75 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                ) : (
                                    <div className="w-12"></div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Reward Celebration - Portalized Modal */}
            {
                recentReward && (
                    <LessonCelebration
                        points={recentReward}
                        language={language}
                        onClose={() => setRecentReward(null)}
                    />
                )
            }

            {/* Modals wrapped in Portals to fix Z-Index issues */}
            {
                showQuizModal && createPortal(
                    <ChapterQuizModal
                        isOpen={showQuizModal}
                        onClose={() => setShowQuizModal(false)}
                        onReadAgain={handleReadAgain}
                        questions={currentQuizQuestions}
                        onComplete={handleQuizComplete}
                        chapterTitle={trainingContent?.level_title}
                        lessonId={trainingContent?.level_id}
                        language={language}
                    />,
                    document.body
                )
            }


            {/* Image Preview Modal */}
            {
                activeImageModal && createPortal(
                    <div
                        className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in"
                        onClick={() => setActiveImageModal(null)}
                    >
                        <div
                            className="relative max-w-5xl w-full bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-scale-in"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setActiveImageModal(null)}
                                className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="p-4 sm:p-8 h-full flex items-center justify-center bg-slate-900 border-t border-white/5">
                                {activeImageModal.type === 'image' ? (
                                    <img
                                        src={activeImageModal.value}
                                        alt="Preview"
                                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                                    />
                                ) : (
                                    <div className="max-w-xl w-full bg-slate-800 p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl animate-scale-in">
                                        <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Details
                                        </h3>
                                        <p className="text-base sm:text-lg text-slate-200 leading-relaxed whitespace-pre-line text-left font-medium">
                                            {activeImageModal.value}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
            {/* Welcome Modal Overlay */}
            {
                showWelcome && createPortal(
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-50 dark:bg-slate-900 animate-fade-in">
                        {/* Background Decorative Elements */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                        </div>

                        <div className="relative w-full max-w-lg px-6 flex flex-col items-center text-center space-y-4 md:space-y-6">
                            <div className="w-full flex flex-col items-center space-y-4 md:space-y-6">
                                {/* Lottie Animation */}
                                <div className="w-full aspect-square max-w-[160px] md:max-w-[240px] mx-auto filter drop-shadow-2xl">
                                    <DotLottiePlayer
                                        src={readingLottie}
                                        autoplay
                                        loop
                                        className="w-full h-full"
                                    />
                                </div>

                                {/* User Rating Indicator */}
                                {learningInsights && (
                                    <div className="flex flex-col items-center gap-2 animate-entrance-pop">
                                        <div className="flex gap-1.5">
                                            {[...Array(5)].map((_, i) => (
                                                <svg key={i} className={`w-6 h-6 md:w-8 md:h-8 ${i < learningInsights.habitRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 dark:text-slate-700'}`} viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                        <span className={`text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Your Skill Rating' : 'আপনার রেটিং'}
                                        </span>
                                    </div>
                                )}

                                {/* Welcome Text */}
                                <div className="space-y-1.5 md:space-y-3 animate-entrance-pop" style={{ animationDelay: '100ms' }}>
                                    <h1 className={`text-2xl md:text-4xl font-black text-slate-900 dark:text-slate-100 leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Welcome!' : 'স্বাগতম!'}
                                    </h1>
                                    <p className={`text-base md:text-xl font-bold text-slate-600 dark:text-slate-400 ${language === 'bn' ? 'font-bengali opacity-90' : ''}`}>
                                        {language === 'en' ? 'How are you learning?' : 'আপনি কেমন শিখছেন?'}
                                    </p>
                                </div>

                                {/* Learning Insights Block */}
                                {learningInsights && (
                                    <div className="grid grid-cols-1 gap-3 animate-entrance-pop text-left w-full max-w-sm" style={{ animationDelay: '200ms' }}>
                                        {/* Habit Card */}
                                        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-4 rounded-3xl border border-white/20 dark:border-slate-700/50 flex gap-4 items-center">
                                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                                                🔥
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-slate-800 dark:text-white font-black leading-snug ${learningInsights.habitRating > 2 ? 'mb-1' : ''} ${language === 'bn' ? 'font-bengali text-base md:text-lg' : 'text-xs md:text-sm'}`}>
                                                    {learningInsights.habitFeedback}
                                                </p>
                                                {learningInsights.habitRating > 2 && (
                                                    <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400">
                                                        {language === 'en' ? `You read ${learningInsights.weeklyDays} days this week!` : `এই সপ্তাহে ${learningInsights.weeklyDays} দিন পড়েছেন!`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Proceed Button */}
                            <div className="w-full max-w-sm pt-0 md:pt-2 animate-entrance-pop" style={{ animationDelay: '300ms' }}>
                                <button
                                    onClick={() => {
                                        sessionStorage.setItem('hasSeenTrainingWelcome', 'true');
                                        setShowWelcome(false);
                                    }}
                                    className="w-full material-button-primary py-4 md:py-5 text-xl md:text-2xl font-black shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-95 transition-all group"
                                >
                                    <span className="flex items-center justify-center gap-3">
                                        {language === 'en' ? 'Proceed' : 'এগিয়ে যান'}
                                        <svg className="w-7 h-7 group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Floating Challenge Button */}
            {
                !selectedChapter && !trainingContent && !showWelcome && !trainingLoading && createPortal(
                    <button
                        onClick={() => setCurrentView('competitions')}
                        className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-[90] hover:scale-110 active:scale-95 transition-transform duration-300 drop-shadow-2xl animate-entrance-pop focus:outline-none"
                        title={language === 'en' ? 'Hourly Challenge' : 'প্রতি ঘণ্টার চ্যালেঞ্জ'}
                    >
                        <div className="relative">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-xl">
                                <DotLottiePlayer
                                    src={clockLottie}
                                    autoplay
                                    loop
                                    className="w-full h-full filter saturate-150 contrast-125"
                                />
                            </div>
                            {isHourlyPending && (
                                <span className="absolute top-2 right-2 flex h-3 w-3 sm:h-3.5 sm:w-3.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500 border border-white dark:border-slate-800 shadow-sm"></span>
                                </span>
                            )}
                        </div>
                    </button>,
                    document.body
                )
            }
            {
                showOnboarding && (
                    <OnboardingSequence
                        language={language}
                        onComplete={() => {
                            const today = new Date().toDateString();
                            localStorage.setItem('lastOnboardingDate', today);
                            localStorage.setItem('hasSeenOnboarding', 'true');
                            setShowOnboarding(false);
                            // After onboarding, show the welcome modal if not seen in session
                            const hasSeenWelcome = sessionStorage.getItem('hasSeenTrainingWelcome');
                            if (!hasSeenWelcome) {
                                setShowWelcome(true);
                            }
                        }}
                    />
                )
            }
        </div >
    );
}
