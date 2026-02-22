import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import secureStorage from '../../utils/secureStorage';
import { supabase } from '../../supabaseClient';
import { calculateLevelFromProgress, getBadgeByLevel } from '../../utils/badgeUtils';
import { cacheHelper } from '../../utils/cacheHelper';
import { storageUtils } from '../../utils/storageUtils';
import { requestManager } from '../../utils/requestManager';
import ChapterQuizModal from '../ChapterQuizModal';
import CertificateModal from '../CertificateModal';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import LessonCelebration from './LessonCelebration';
import PPESurveyModal from './PPESurveyModal';
import Lottie from 'lottie-react';
import { DotLottiePlayer } from '@dotlottie/react-player';
import lottieEye from '../../assets/lottie_eye.json';
import sandyLoading from '../../assets/SandyLoading.lottie';
import calendarLottie from '../../assets/calendar.lottie';
import readingLottie from '../../assets/readding.lottie';
import protipLottie from '../../assets/protip.lottie';
import mythLottie from '../../assets/myth.lottie';

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

const TrainingChapterCard = React.memo(({ chapter, completedLessons, language, onClick }) => {
    const isFAQ = chapter.number === 10;
    const completedCount = completedLessons.filter(id => id && id.toString().startsWith(`${chapter.number}.`)).length;
    const progress = chapter.count > 0 ? Math.min(100, Math.round((completedCount / chapter.count) * 100)) : 0;

    return (
        <div
            onClick={() => onClick(chapter)}
            className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer group relative overflow-hidden lg:hover:-translate-y-2 lg:hover:shadow-2xl ${isFAQ
                ? 'bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border-violet-200 dark:border-violet-700 hover:border-violet-400 dark:hover:border-violet-500 shadow-sm hover:shadow-md lg:shadow-lg'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-md lg:shadow-lg lg:hover:shadow-orange-500/20'
                }`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-lg lg:rounded-2xl flex items-center justify-center text-lg lg:text-2xl font-bold border lg:shadow-md lg:group-hover:scale-110 transition-transform duration-300 ${isFAQ
                        ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                        : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white border-orange-500 dark:border-orange-700'
                        }`}>
                        {isFAQ ? '?' : chapter.number}
                    </div>
                    <div>
                        <h3 className={`font-bold leading-tight lg:text-xl transition-colors ${language === 'bn' ? 'font-bengali' : ''} ${isFAQ
                            ? 'text-violet-900 dark:text-violet-100 group-hover:text-violet-700 dark:group-hover:text-violet-300'
                            : 'text-slate-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400'
                            }`}>
                            {chapter.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                            {isFAQ ? (
                                language === 'en' ? 'Always Unlocked' : 'সবার জন্য উন্মুক্ত'
                            ) : (
                                language === 'en' ? (
                                    `${chapter.count} Days • ${chapter.count} Lessons`
                                ) : (
                                    `${chapter.count === 10 ? '১০' : chapter.count} দিন - ${chapter.count === 10 ? '১০' : chapter.count} পাঠ`
                                )
                            )}
                        </p>
                    </div>
                </div>
                {!isFAQ && progress === 100 && (
                    <div className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        {language === 'en' ? 'Done' : 'সম্পন্ন'}
                    </div>
                )}
                {isFAQ && (
                    <div className="text-violet-500 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        FAQ
                    </div>
                )}
            </div>

            {/* Progress Bar - Hide for FAQ */}
            {!isFAQ && (
                <>
                    <div className="w-full h-2 lg:h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2 shadow-inner">
                        <div
                            className={`h-full rounded-full transition-all duration-500 lg:group-hover:shadow-lg ${progress === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-orange-400 to-orange-600'}`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] lg:text-xs text-slate-400 font-semibold">
                            {completedCount}/{chapter.count} {language === 'en' ? 'Lessons' : 'পাঠ'}
                        </p>
                        <p className="text-[10px] lg:text-xs font-bold ${progress === 100 ? 'text-emerald-600' : 'text-orange-600'}">
                            {progress}%
                        </p>
                    </div>
                </>
            )}

            {isFAQ && (
                <p className="text-[10px] text-violet-400 dark:text-violet-500 mt-2 italic">
                    {language === 'en' ? 'Reference Guide' : 'রেফারেন্স গাইড'}
                </p>
            )}
        </div>
    );
});

export default function Training({ language = 'en', user, onProgressUpdate, setCurrentView }) {
    const [showWelcome, setShowWelcome] = useState(true);
    const [trainingChapters, setTrainingChapters] = useState([]);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [selectedSubchapter, setSelectedSubchapter] = useState(null); // Keep if needed for deeper nesting or legacy reasons
    const [trainingContent, setTrainingContent] = useState(null);
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [completedLessons, setCompletedLessons] = useState([]);
    const [faqSearchQuery, setFaqSearchQuery] = useState('');
    const [showCertificateModal, setShowCertificateModal] = useState(false);
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

        // Pattern for ((path)) -> Blinking eye icon to open modal
        // Pattern for [[path]] -> Inline embedded image
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
                        className="inline-flex items-center justify-center w-8 h-8 mx-1 bg-orange-100 dark:bg-orange-900/40 rounded-full text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-all border border-orange-200 dark:border-orange-800/50 align-middle shadow-sm hover:shadow-md"
                        title={isImage ? "Click to view image" : "Click to read more"}
                    >
                        <div className="w-8 h-8 pointer-events-none">
                            <Lottie
                                animationData={lottieEye}
                                loop={true}
                                autoplay={true}
                            />
                        </div>
                    </button>
                );
            } else if (part.startsWith('[[') && part.endsWith(']]')) {
                const imgPath = part.slice(2, -2);
                return (
                    <div key={index} className="my-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg group relative cursor-pointer" onClick={() => setActiveImageModal({ type: 'image', value: `/quizzes/${imgPath}` })}>
                        <img
                            src={`/quizzes/${imgPath}`}
                            alt="Inline lesson helper"
                            className="w-full h-auto object-cover max-h-[400px] transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="bg-black/50 backdrop-blur-md rounded-full p-3 text-white opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
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

    // Helper function to check if a lesson is unlocked
    const isLessonUnlocked = (chapterNum, subchapterNum) => {
        // First lesson of each chapter is always unlocked
        if (subchapterNum === 1) return true;

        // Check if previous lesson is completed
        const previousLessonId = `${chapterNum}.${subchapterNum - 1}`;
        return completedLessons.includes(previousLessonId);
    };

    const handleChapterClick = async (chapter) => {
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
                setSelectedChapter({ ...chapter, subchapters: subchapters.sort((a, b) => a.subchapterNum - b.subchapterNum) });
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
                setSelectedChapter({ ...chapter, subchapters: processed });
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

    const handleQuizComplete = (score) => {
        if (pendingLessonId) {
            finalizeLessonCompletion(pendingLessonId);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 md:mb-6 animate-slide-down">
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {language === 'en' ? '90 Days Training Program' : '৯০ দিনের প্রশিক্ষণ কর্মসূচি'}
                </h1>
            </div>

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
                <div className="loading-container-fixed animate-fade-in">
                    <div className="w-48 h-48 lg:w-64 lg:h-64 mb-4">
                        <DotLottiePlayer
                            src={sandyLoading}
                            autoplay
                            loop
                        />
                    </div>
                    <p className={`text-slate-500 font-bold ${language === 'bn' ? 'font-bengali text-xl' : 'text-lg tracking-wide'}`}>
                        {language === 'en' ? 'Preparing your safety journey...' : 'আপনার সুরক্ষা পথ প্রস্তুত করা হচ্ছে...'}
                    </p>
                </div>
            ) : !selectedChapter && !trainingContent ? (
                <div className="animate-fade-in-up">
                    {/* Gamified Journey Map Logic */}
                    {(() => {
                        const isMobile = window.innerWidth < 768;
                        const journeyChapters = trainingChapters.filter(c => c.number !== 10);

                        // Main Journey View
                        return (
                            <div className="relative max-w-4xl mx-auto pb-32">
                                {/* Desktop Background Decorative Elements */}
                                <div className="hidden lg:block absolute top-[10%] -left-64 w-96 h-96 bg-orange-200/20 dark:bg-orange-900/10 rounded-full blur-[120px] pointer-events-none"></div>
                                <div className="hidden lg:block absolute top-[40%] -right-64 w-96 h-96 bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
                                <div className="hidden lg:block absolute top-[70%] -left-64 w-96 h-96 bg-emerald-200/20 dark:bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none"></div>


                                {/* Header */}
                                <div className="text-center mb-16 pt-4">
                                    <div className="inline-block px-4 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-widest mb-4">
                                        {language === 'en' ? 'Interactive Curriculum' : 'ইন্টারঅ্যাক্টিভ পাঠ্যক্রম'}
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                                        {language === 'en' ? 'Safety Roadmap' : 'সেফটি রোডম্যাপ'}
                                    </h1>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto">
                                        {language === 'en' ? 'Complete each module to unlock the next step in your professional development.' : 'আপনার পেশাগত উন্নয়নের পরবর্তী ধাপ আনলক করতে প্রতিটি মডিউল সম্পূর্ণ করুন।'}
                                    </p>
                                </div>

                                {/* Journey Container */}
                                <div className="relative">

                                    {/* SVG Path Connector */}
                                    <svg
                                        className="absolute top-0 left-0 w-full h-full z-0 overflow-visible pointer-events-none"
                                        style={{ height: '100%' }}
                                        viewBox={`0 0 100 ${journeyChapters.length * 180}`}
                                        preserveAspectRatio="none"
                                    >
                                        <defs>
                                            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                                                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
                                                <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
                                            </linearGradient>
                                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feGaussianBlur stdDeviation="1.5" result="blur" />
                                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                            </filter>
                                        </defs>

                                        {/* Background Static Path (Curvy for Desktop) */}
                                        <path
                                            d={journeyChapters.map((_, i) => {
                                                if (i === journeyChapters.length - 1) return '';
                                                const startY = i * 180 + 60;
                                                const endY = (i + 1) * 180 + 60;
                                                const isLeftCur = i % 2 === 0;
                                                const nextLeft = (i + 1) % 2 === 0;

                                                const offset = isMobile ? 12 : 15;
                                                const x1 = isLeftCur ? (50 - offset) : (50 + offset);
                                                const x2 = nextLeft ? (50 - offset) : (50 + offset);

                                                // Bezier Curve: C x1 y1, x2 y2, x3 y3
                                                // For vertical flow, control points are mid-way vertically
                                                const cpY1 = startY + 60;
                                                const cpY2 = endY - 60;

                                                return i === 0
                                                    ? `M ${x1} ${startY} C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`
                                                    : `C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`;
                                            }).join(" ")}
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            fill="none"
                                            className="text-slate-200 dark:text-slate-800 transition-all duration-1000"
                                        />

                                        {/* Animated Progress Path (Curvy) */}
                                        <path
                                            d={journeyChapters.map((_, i) => {
                                                if (i === journeyChapters.length - 1) return '';
                                                const completedCount = completedLessons.filter(id => id && id.toString().startsWith(`${journeyChapters[i].number}.`)).length;
                                                if (completedCount < journeyChapters[i].count) return '';

                                                const startY = i * 180 + 60;
                                                const endY = (i + 1) * 180 + 60;
                                                const isLeftCur = i % 2 === 0;
                                                const nextLeft = (i + 1) % 2 === 0;

                                                const offset = isMobile ? 12 : 15;
                                                const x1 = isLeftCur ? (50 - offset) : (50 + offset);
                                                const x2 = nextLeft ? (50 - offset) : (50 + offset);
                                                const cpY1 = startY + 60;
                                                const cpY2 = endY - 60;

                                                return i === 0
                                                    ? `M ${x1} ${startY} C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`
                                                    : `C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`;
                                            }).join(" ")}
                                            stroke="url(#pathGradient)"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            fill="none"
                                            filter="url(#glow)"
                                            className="motion-safe:animate-pulse"
                                        />
                                    </svg>

                                    {/* Nodes Loop */}
                                    <div className="relative z-10 flex flex-col gap-0 pt-10">
                                        {journeyChapters.map((chapter, index) => {
                                            const completedCount = completedLessons.filter(id => id && id.toString().startsWith(`${chapter.number}.`)).length;
                                            const isCompleted = completedCount === chapter.count && chapter.count > 0;

                                            const isLocked = index > 0 && (() => {
                                                const prevChapter = trainingChapters.find(c => c.number === journeyChapters[index - 1].number);
                                                const prevCompletedCount = completedLessons.filter(id => id && id.toString().startsWith(`${prevChapter.number}.`)).length;
                                                return prevCompletedCount < prevChapter.count;
                                            })();

                                            const isActive = !isLocked && !isCompleted;
                                            const isLeftNode = index % 2 === 0;

                                            return (
                                                <div
                                                    key={chapter.number}
                                                    id={`chapter-node-${index}`}
                                                    className={`flex w-full h-[180px] items-center justify-center relative group`}
                                                >
                                                    {/* Side Info Card (Alternating) - Desktop Only */}
                                                    <div className={`hidden md:flex flex-col absolute top-1/2 -translate-y-1/2 w-[26rem] rounded-[2.5rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/40 dark:border-slate-800/40 transition-all duration-700 overflow-hidden
                                                            ${isLeftNode ? 'right-[80%] text-right items-end origin-right' : 'left-[80%] text-left items-start origin-left'}
                                                            ${isLocked ? 'opacity-40 grayscale scale-95' : 'opacity-100 group-hover:scale-[1.03]'}
                                                        `}>
                                                        {/* Path Connector with Pulse Dot */}
                                                        <div className={`absolute top-1/2 -translate-y-1/2 flex items-center ${isLeftNode ? '-right-14' : '-left-14'}`}>
                                                            <div className={`w-14 h-[1px] bg-gradient-to-r ${isLeftNode ? 'from-transparent to-orange-400' : 'from-orange-400 to-transparent'} opacity-50`}></div>
                                                            <div className={`w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)] ${isLeftNode ? '-ml-1.25' : '-mr-1.25'} animate-pulse`}></div>
                                                        </div>

                                                        {/* 1. Header Row (Title Only) */}
                                                        <div className="w-full px-8 pt-7 pb-4 bg-gradient-to-b from-white/20 to-transparent dark:from-slate-800/10">
                                                            <h3 className={`w-full font-black text-slate-900 dark:text-white tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis ${language === 'bn' ? 'font-bengali text-2xl' : 'text-xl'}`}>
                                                                {chapter.title}
                                                            </h3>
                                                            <div className={`w-12 h-1 mt-2 bg-gradient-to-r ${isLeftNode ? 'ml-auto from-orange-400 to-amber-400' : 'mr-auto from-orange-400 to-amber-400'} rounded-full opacity-80`}></div>
                                                        </div>

                                                        {/* 2. Metadata Layer (Horizontal Split) */}
                                                        <div className={`flex w-full items-center gap-6 px-8 py-4 ${isLeftNode ? 'flex-row-reverse' : 'flex-row'}`}>
                                                            {/* stylized number badge */}
                                                            <div className={`flex-shrink-0 w-14 h-14 rounded-3xl flex items-center justify-center text-xl font-black shadow-2xl border-2 ${isCompleted ? 'bg-emerald-500 border-emerald-200/50 text-white shadow-emerald-500/20' :
                                                                isLocked ? 'bg-slate-100 border-slate-200 text-slate-400 shadow-inner' :
                                                                    'bg-orange-600 border-orange-200/50 text-white shadow-orange-600/30'
                                                                }`}>
                                                                {index + 1 < 10 ? `0${index + 1}` : index + 1}
                                                            </div>

                                                            <div className={`flex flex-col gap-1.5 flex-grow ${isLeftNode ? 'items-end' : 'items-start'}`}>
                                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${isLocked ? 'bg-slate-100 text-slate-400 border-slate-200' :
                                                                    isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                        'bg-orange-50 text-orange-600 border-orange-200'
                                                                    }`}>
                                                                    {isLocked ? (language === 'en' ? 'LOCKED' : 'বন্ধ') :
                                                                        isCompleted ? (language === 'en' ? 'DONE' : 'সম্পন্ন') :
                                                                            (language === 'en' ? 'ACTIVE' : 'চলছে')}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 tracking-widest uppercase opacity-90">
                                                                        {chapter.count} {language === 'en' ? 'Lessons' : 'পাঠ'}
                                                                    </span>
                                                                    {!isLocked && (
                                                                        <span className={`text-[11px] font-black ${isCompleted ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                                            {Math.round((completedCount / chapter.count) * 100)}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 3. Minimalist Edge-to-Edge Progress Track (at very bottom) */}
                                                        {!isLocked && (
                                                            <div className="w-full h-1.5 bg-slate-100/30 dark:bg-slate-800/30 mt-auto">
                                                                <div
                                                                    className={`h-full transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.3)] ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-500 to-amber-400 animate-shimmer'}`}
                                                                    style={{ width: `${Math.round((completedCount / chapter.count) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* The Node Itself */}
                                                    <div
                                                        onClick={() => handleChapterClick(chapter)}
                                                        className={`
                                                                relative w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-500 z-20 hover:rotate-3
                                                                ${isLeftNode ? (isMobile ? '-translate-x-[12%]' : '-translate-x-[15%]') : (isMobile ? 'translate-x-[12%]' : 'translate-x-[15%]')}
                                                                ${isLocked
                                                                ? 'bg-slate-100 dark:bg-slate-800/50 border-4 border-slate-200 dark:border-slate-700/50 text-slate-400 shadow-inner'
                                                                : isCompleted
                                                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-4 border-emerald-200/50 dark:border-emerald-500/30 shadow-2xl shadow-emerald-500/20 text-white transform hover:scale-110 active:scale-95'
                                                                    : 'bg-gradient-to-br from-orange-500 to-amber-600 border-[6px] border-orange-100 dark:border-orange-500/30 shadow-2xl shadow-orange-500/40 text-white transform hover:scale-110 active:scale-95 animate-float-y'
                                                            }
                                                            `}
                                                    >
                                                        {/* Active Pulse Ring */}
                                                        {isActive && (
                                                            <div className="absolute inset-0 rounded-[2rem] border-4 border-orange-500 animate-ping opacity-50"></div>
                                                        )}

                                                        {/* Inner Content */}
                                                        <div className="flex flex-col items-center">
                                                            {isLocked ? (
                                                                <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                            ) : isCompleted ? (
                                                                <svg className="w-10 h-10 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                                            ) : (
                                                                <span className="text-3xl font-black">{chapter.number}</span>
                                                            )}
                                                        </div>

                                                        {/* Mobile Label popup (if needed) or simple number */}
                                                        {!isLocked && isActive && (
                                                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-full shadow-lg animate-bounce-subtle z-30">
                                                                {language === 'en' ? 'START HERE' : 'এখানে শুরু করুন'}
                                                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-600 rotate-45"></div>
                                                            </div>
                                                        )}

                                                        {/* Chapter Title for Mobile (Below node) */}
                                                        <div className="md:hidden absolute top-28 w-40 text-center">
                                                            <p className={`text-sm font-bold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                                                {chapter.title}
                                                            </p>
                                                            {isActive && (
                                                                <p className="text-[10px] text-orange-600 font-bold uppercase mt-1">
                                                                    {completedCount}/{chapter.count} {language === 'en' ? 'Done' : 'সম্পন্ন'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
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

                    {/* Certificate Button */}
                    {user && (
                        <div className="mt-12 flex justify-center pb-8">
                            <button
                                onClick={() => setShowCertificateModal(true)}
                                className="group relative inline-flex items-center justify-center px-8 py-3.5 lg:px-12 lg:py-5 font-bold text-white transition-all duration-300 bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl lg:rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 dark:focus:ring-white shadow-xl hover:shadow-2xl lg:hover:shadow-slate-900/40 dark:lg:hover:shadow-white/40 hover:scale-[1.02] lg:hover:scale-105 active:scale-95 border border-slate-800 dark:border-slate-200"
                            >
                                <span className="relative flex items-center gap-3 lg:gap-4">
                                    <svg className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-400 lg:group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2 .712V17a1 1 0 001 1z" />
                                    </svg>
                                    <span className="text-lg lg:text-2xl tracking-tight">View Achievement Certificate</span>
                                </span>
                            </button>
                        </div>
                    )}
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
                        /* FAQ View */
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 p-6 rounded-2xl mb-6 border border-violet-200 dark:border-violet-700">
                                <h2 className="text-2xl font-bold text-violet-900 dark:text-violet-100 mb-2">{selectedChapter.content.title}</h2>
                                <p className="text-violet-700 dark:text-violet-300 mb-4">{selectedChapter.content.subtitle}</p>

                                {/* Search Input */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder={language === 'en' ? 'Search questions, answers, or tags...' : 'প্রশ্ন, উত্তর বা ট্যাগ খুঁজুন...'}
                                        value={faqSearchQuery}
                                        onChange={(e) => setFaqSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none shadow-sm"
                                    />
                                    <div className="absolute left-3 top-3.5 text-violet-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {selectedChapter.content.questions
                                .filter(q => {
                                    if (!faqSearchQuery) return true;
                                    const query = faqSearchQuery.toLowerCase();
                                    return (
                                        q.question.toLowerCase().includes(query) ||
                                        q.answer.toLowerCase().includes(query) ||
                                        q.tags.some(tag => tag.toLowerCase().includes(query))
                                    );
                                })
                                .map((q, idx) => (
                                    <div key={q.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all">
                                        <details className="group">
                                            <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm shrink-0">
                                                        {q.id.replace('q', '')}
                                                    </div>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                                        {q.question}
                                                    </span>
                                                </div>
                                                <span className="transition group-open:rotate-180">
                                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                                </span>
                                            </summary>
                                            <div className="px-4 pb-4 pl-[3.25rem] text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-4 bg-slate-50/50 dark:bg-slate-900/30">
                                                <div>{renderTextWithImages(q.answer)}</div>
                                                {q.image && (
                                                    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm max-w-md">
                                                        <img
                                                            src={`/quizzes/faq_images/${q.image}`}
                                                            alt={q.question}
                                                            className="w-full h-auto object-cover"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {q.tags.map(tag => (
                                                        <span key={tag} className="px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                ))}

                            {selectedChapter.content.questions.filter(q => {
                                if (!faqSearchQuery) return true;
                                const query = faqSearchQuery.toLowerCase();
                                return (
                                    q.question.toLowerCase().includes(query) ||
                                    q.answer.toLowerCase().includes(query) ||
                                    q.tags.some(tag => tag.toLowerCase().includes(query))
                                );
                            }).length === 0 && (
                                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                        <div className="text-4xl mb-3">🔍</div>
                                        <p>{language === 'en' ? 'No results found' : 'কোন ফলাফল পাওয়া যায়নি'}</p>
                                    </div>
                                )}
                        </div>
                    ) : (
                        /* Regular Subchapter List - Redesigned as a Gallery */
                        <div className="relative group/gallery">
                            {/* Navigation Buttons - Desktop only */}
                            <button
                                onClick={() => scrollGallery('left')}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-30 w-12 h-12 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white transition-all duration-300 hidden lg:flex opacity-0 group-hover/gallery:opacity-100 group-hover/gallery:translate-x-0"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <button
                                onClick={() => scrollGallery('right')}
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-30 w-12 h-12 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white transition-all duration-300 hidden lg:flex opacity-0 group-hover/gallery:opacity-100 group-hover/gallery:-translate-x-0"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            <div
                                ref={galleryRef}
                                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-8 -mx-4 px-4 gap-6 scroll-smooth"
                            >
                                {selectedChapter.subchapters.map((subchapter, index) => {
                                    const isUnlocked = isLessonUnlocked(subchapter.chapterNum, subchapter.subchapterNum);
                                    const isCompleted = completedLessons.includes(subchapter.level_id);
                                    const isNext = isUnlocked && !isCompleted &&
                                        (index === 0 || completedLessons.includes(selectedChapter.subchapters[index - 1]?.level_id));

                                    return (
                                        <div
                                            key={subchapter.level_id}
                                            onClick={() => {
                                                if (!user || !isUnlocked) return;

                                                // PPE Survey Logic for Chapter 1
                                                if (subchapter.chapterNum === 1) {
                                                    const ppeItem = PPE_MAP[subchapter.subchapterNum];
                                                    if (ppeItem) {
                                                        const existingRecord = userPPEData.find(p => p.name === ppeItem.name);
                                                        const hasUsageDetail = existingRecord?.details?.startsWith('Usage:');

                                                        // Frequency Logic:
                                                        const visitKey = `ppe_visit_count_${user.id}_${ppeItem.name.replace(/\s+/g, '_')}`;
                                                        let visitCount = parseInt(localStorage.getItem(visitKey) || '0');

                                                        // 1. Missing data? Always show.
                                                        if (!existingRecord || !hasUsageDetail) {
                                                            setSurveyPPEItem(ppeItem);
                                                            setPendingSubchapter(subchapter);
                                                            setShowPPESurvey(true);
                                                            return;
                                                        }

                                                        // 2. Data exists? Every alternate visit (count % 2 === 0)
                                                        visitCount++;
                                                        localStorage.setItem(visitKey, visitCount.toString());

                                                        if (visitCount % 2 === 0) {
                                                            setSurveyPPEItem({ ...ppeItem, isReview: true });
                                                            setPendingSubchapter(subchapter);
                                                            setShowPPESurvey(true);
                                                            return;
                                                        }
                                                    }
                                                }

                                                setTrainingContent(subchapter);
                                                setActiveSectionIndex(0);
                                                setIsJournalMode(true);
                                            }}
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
                                })}
                            </div>

                            {/* Scroll Indicators */}
                            <div className="flex justify-center gap-1.5 mt-2">
                                {selectedChapter.subchapters.length > 1 && selectedChapter.subchapters.map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                ))}
                            </div>
                        </div>
                    )}
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
                        {/* Progress Header */}
                        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 pt-2 shadow-sm">
                            <div className="flex items-center justify-between px-4 pb-2">
                                <button
                                    onClick={() => {
                                        stop();
                                        setTrainingContent(null);
                                        setIsJournalMode(false);
                                    }}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                <div className="text-center flex-1 mx-4">
                                    <span className="text-[10px] uppercase font-bold text-orange-500 tracking-widest block mb-0.5">
                                        {trainingContent.badge_name || "Safety Journal"}
                                    </span>
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {trainingContent.level_title}
                                    </h2>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleReadLesson}
                                        className={`p-2 rounded-full transition-all ${isPlaying ? 'text-orange-600 bg-orange-50' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            {isPlaying ? (
                                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                            ) : (
                                                <path d="M8 5v14l11-7z" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 transition-all duration-500 ease-out"
                                    style={{ width: `${((activeSectionIndex + 1) / slides.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Slide Content Area */}
                        <div ref={lessonScrollRef} className="flex-1 overflow-y-auto relative bg-mimic-pattern">
                            <div key={activeSectionIndex} className="max-w-2xl mx-auto px-6 py-8 animate-fade-in mb-24">
                                {slides[activeSectionIndex]?.type === 'hero' && (
                                    <div className="space-y-8">
                                        <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-xl border border-white/20">
                                            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-6xl shadow-inner">
                                                📔
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider">
                                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                                Mission Objective
                                            </div>
                                            <h3 className={`text-3xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {trainingContent.level_title}
                                            </h3>
                                            <p className={`text-lg text-slate-600 dark:text-slate-400 leading-relaxed reading-content ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {renderTextWithImages(trainingContent.mission_briefing)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {slides[activeSectionIndex]?.type === 'section' && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20 text-white font-bold">
                                                {activeSectionIndex}
                                            </div>
                                            <h3 className={`text-2xl font-bold text-slate-900 dark:text-slate-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {slides[activeSectionIndex].title}
                                            </h3>
                                        </div>

                                        <div className="space-y-8">
                                            {slides[activeSectionIndex].points?.map((point, pIdx) => (
                                                <div key={pIdx} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 space-y-4">
                                                    <h4 className={`text-xl font-bold text-slate-900 dark:text-slate-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                        {point.item_name}
                                                    </h4>
                                                    {point.image_name && (
                                                        <div
                                                            className="rounded-2xl overflow-hidden cursor-zoom-in"
                                                            onClick={() => setActiveImageModal({ type: 'image', value: `/quizzes/${point.image_name}` })}
                                                        >
                                                            <img
                                                                src={`/quizzes/${point.image_name}`}
                                                                alt={point.item_name}
                                                                className="w-full h-auto object-cover max-h-80"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="space-y-3">
                                                        {point.specifications && (
                                                            <div className="flex gap-3">
                                                                <span className="text-orange-500 font-bold">📋</span>
                                                                <p className={`text-slate-700 dark:text-slate-300 leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                    {renderTextWithImages(point.specifications)}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {point.importance && (
                                                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                                                                <div className="flex items-center gap-2 mb-1 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                                                                    <span>💡</span>
                                                                    {language === 'en' ? 'Why it matters' : 'কেন গুরুত্বপূর্ণ'}
                                                                </div>
                                                                <p className={`text-slate-800 dark:text-slate-200 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                    {renderTextWithImages(point.importance)}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {point.daily_check && (
                                                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                                                                <div className="flex items-center gap-2 mb-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                                                                    <span>✓</span>
                                                                    {language === 'en' ? 'Pro Action' : 'করণীয় কাজ'}
                                                                </div>
                                                                <p className={`text-slate-800 dark:text-slate-200 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                    {renderTextWithImages(point.daily_check)}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {slides[activeSectionIndex]?.type === 'pro_tip' && (
                                    <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                        <div className="relative z-10 space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 flex-shrink-0 -ml-2">
                                                        <DotLottiePlayer
                                                            src={protipLottie}
                                                            autoplay
                                                            loop
                                                            className="w-full h-full scale-150"
                                                        />
                                                    </div>
                                                    <h3 className={`text-2xl font-bold ${language === 'bn' ? 'font-bengali text-3xl' : ''}`}>
                                                        {slides[activeSectionIndex].title}
                                                    </h3>
                                                </div>
                                                <div className="space-y-4">
                                                    {slides[activeSectionIndex].content?.map((tip, idx) => (
                                                        <div key={idx} className="flex gap-4 items-start">
                                                            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs flex-shrink-0 mt-1">✓</span>
                                                            <p className={`text-emerald-50 text-lg leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {renderTextWithImages(tip)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {slides[activeSectionIndex]?.type === 'myth_buster' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-12 h-12 flex-shrink-0 -ml-2">
                                                <DotLottiePlayer
                                                    src={mythLottie}
                                                    autoplay
                                                    loop
                                                    className="w-full h-full scale-150"
                                                />
                                            </div>
                                            <h3 className={`text-2xl font-bold text-red-600 dark:text-red-400 ${language === 'bn' ? 'font-bengali text-3xl' : ''}`}>
                                                {slides[activeSectionIndex].title}
                                            </h3>
                                        </div>
                                        <div className="space-y-4">
                                            {slides[activeSectionIndex].myths?.map((item, idx) => (
                                                <div key={idx} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-red-100 dark:border-red-900/20 shadow-sm">
                                                    <div className="p-5 bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20">
                                                        <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">{language === 'en' ? 'Common Myth' : 'ভুল ধারণা'}</p>
                                                        <p className={`text-slate-800 dark:text-slate-200 font-medium italic ${language === 'bn' ? 'font-bengali text-lg' : ''}`}>
                                                            "{renderTextWithImages(item.myth)}"
                                                        </p>
                                                    </div>
                                                    <div className="p-5 bg-emerald-50/50 dark:bg-emerald-900/10">
                                                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">{language === 'en' ? 'The Truth' : 'সঠিক তথ্য'}</p>
                                                        <p className={`text-slate-800 dark:text-slate-200 font-bold ${language === 'bn' ? 'font-bengali text-lg' : ''}`}>
                                                            {renderTextWithImages(item.reality || item.fact)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {slides[activeSectionIndex]?.type === 'advanced' && (
                                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-3xl shadow-lg text-white font-bold">
                                                🧪
                                            </div>
                                            <h3 className={`text-2xl font-bold ${language === 'bn' ? 'font-bengali text-3xl' : ''}`}>
                                                {slides[activeSectionIndex].title}
                                            </h3>
                                        </div>
                                        <div className="space-y-6">
                                            {slides[activeSectionIndex].facts?.map((fact, idx) => (
                                                <div key={idx} className="space-y-2 border-l-2 border-orange-500 pl-6">
                                                    <h4 className="text-orange-400 font-bold text-lg">{fact.title}</h4>
                                                    <p className={`text-slate-300 leading-relaxed ${language === 'bn' ? 'font-bengali text-lg' : ''}`}>
                                                        {renderTextWithImages(fact.content)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {slides[activeSectionIndex]?.type === 'completion' && (
                                    <div className="flex flex-col items-center justify-center space-y-10 py-8 text-center max-w-sm mx-auto">
                                        {/* Simplified Reward Visual */}
                                        <div className="relative w-full aspect-square max-w-[280px] mx-auto">
                                            <DotLottiePlayer
                                                src={readingLottie}
                                                autoplay
                                                loop
                                                className="w-full h-full"
                                            />
                                            {/* Minimal floating success badge */}
                                            <div className="absolute top-4 right-4 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 rotate-12 animate-bounce-in">
                                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className={`text-4xl font-black text-slate-900 dark:text-slate-100 leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {language === 'en' ? 'Session Complete!' : 'সেশন সম্পন্ন হয়েছে!'}
                                            </h3>
                                            <p className={`text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-2 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {language === 'en' ? 'You have successfully completed this safety mission. Ready to test your knowledge?' : 'আপনি সফলভাবে এই সুরক্ষা মিশনটি সম্পন্ন করেছেন। আপনার জ্ঞান পরীক্ষা করতে প্রস্তুত?'}
                                            </p>
                                        </div>

                                        <div className="w-full space-y-4 pt-2">
                                            {!completedLessons.includes(trainingContent.level_id) ? (
                                                <button
                                                    onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                                    className="w-full material-button-primary py-5 text-xl font-black shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-[0.98] transition-all"
                                                >
                                                    {language === 'en' ? 'Start Challenge' : 'চ্যালেঞ্জ শুরু করুন'}
                                                </button>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-4">
                                                    <button
                                                        onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                                        className="w-full material-button-primary py-5 text-xl font-black shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-all"
                                                    >
                                                        {language === 'en' ? 'Practice Quiz' : 'প্র্যাকটিস কুইজ'}
                                                    </button>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => {
                                                    setTrainingContent(null);
                                                    setIsJournalMode(false);
                                                }}
                                                className="w-full p-5 rounded-2xl font-bold bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                                            >
                                                {language === 'en' ? 'Close Mission' : 'মিশন শেষ করুন'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Navigation Footer */}
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 px-6 py-4 pb-8 flex items-center justify-between shadow-2xl relative z-10 transition-all duration-300">
                            <button
                                onClick={prevSlide}
                                disabled={isFirstSlide}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isFirstSlide ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:text-orange-500 active:scale-95'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="font-bold">{language === 'en' ? 'PREV' : 'আগের'}</span>
                            </button>

                            <div className="flex gap-1.5 h-1.5">
                                {slides.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === activeSectionIndex ? 'w-6 bg-orange-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}
                                    />
                                ))}
                            </div>

                            {!isLastSlide ? (
                                <button
                                    onClick={nextSlide}
                                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 hover:bg-orange-600 transition-all animate-bounce-in"
                                >
                                    <span className="font-bold">{language === 'en' ? 'NEXT' : 'পরের'}</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ) : (
                                <div className="w-20"></div> /* Placeholder for balance */
                            )}
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
                        questions={currentQuizQuestions}
                        onComplete={handleQuizComplete}
                        chapterTitle={trainingContent?.level_title}
                        language={language}
                    />,
                    document.body
                )
            }

            {
                showCertificateModal && createPortal(
                    (() => {
                        const currentLevel = calculateLevelFromProgress(completedLessons, trainingChapters);
                        const badge = getBadgeByLevel(currentLevel);
                        const badgeName = badge ? (language === 'en' ? badge.en : badge.bn) : (language === 'en' ? "Safety Trainee" : "সুরক্ষা প্রশিক্ষণার্থী");

                        return (
                            <CertificateModal
                                isOpen={showCertificateModal}
                                onClose={() => setShowCertificateModal(false)}
                                userName={user?.user_metadata?.full_name || 'Lineman'}
                                completionDate={new Date().toLocaleDateString()}
                                level={currentLevel}
                                badgeName={badgeName}
                                certificateId={`CERT-${user?.id?.slice(0, 8)}-${Date.now().toString().slice(-6)}`}
                            />
                        );
                    })(),
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
            {showWelcome && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-50 dark:bg-slate-900 animate-fade-in">
                    {/* Background Decorative Elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                    </div>

                    <div className="relative w-full max-w-lg px-6 flex flex-col items-center text-center space-y-4 md:space-y-6">
                        <div className="w-full flex flex-col items-center space-y-4 md:space-y-6">
                            {/* Lottie Animation */}
                            <div className="w-full aspect-square max-w-[120px] md:max-w-[180px] mx-auto filter drop-shadow-2xl">
                                <DotLottiePlayer
                                    src={readingLottie}
                                    autoplay
                                    loop
                                    className="w-full h-full"
                                />
                            </div>

                            {/* User Rating Indicator */}
                            {learningInsights && (
                                <div className="flex flex-col items-center gap-1.5 animate-entrance-pop">
                                    <div className="flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <svg key={i} className={`w-4 h-4 md:w-5 md:h-5 ${i < learningInsights.habitRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 dark:text-slate-700'}`} viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <span className={`text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ${language === 'bn' ? 'font-bengali' : ''}`}>
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
                                <div className="grid grid-cols-1 gap-3 md:gap-4 animate-entrance-pop text-left w-full max-w-md" style={{ animationDelay: '200ms' }}>
                                    {/* Habit Card */}
                                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-white/20 dark:border-slate-700/50 flex gap-3 md:gap-4 items-center">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shrink-0">
                                            🔥
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-slate-800 dark:text-white font-black leading-snug mb-0.5 md:mb-1 ${language === 'bn' ? 'font-bengali text-base md:text-lg' : 'text-xs md:text-sm'}`}>
                                                {learningInsights.habitFeedback}
                                            </p>
                                            <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400">
                                                {language === 'en' ? `You read ${learningInsights.weeklyDays} days this week!` : `এই সপ্তাহে ${learningInsights.weeklyDays} দিন পড়েছেন!`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Timing Card */}
                                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-3.5 md:p-5 rounded-2xl md:rounded-3xl border border-white/20 dark:border-slate-700/50 flex gap-3 md:gap-4 items-center">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shrink-0">
                                            {learningInsights.peakHour >= 6 && learningInsights.peakHour < 18 ? '☀️' : '🌙'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-slate-800 dark:text-white font-black leading-snug mb-0.5 md:mb-1 ${language === 'bn' ? 'font-bengali text-base md:text-lg' : 'text-xs md:text-sm'}`}>
                                                {learningInsights.timingFeedback}
                                            </p>
                                            <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400">
                                                {language === 'en' ? 'Peak Time' : 'পড়ার প্রিয় সময়'}: {learningInsights.isRandom ? (language === 'en' ? 'Variable' : 'অনিশ্চিত') : (learningInsights.peakHour === 0 ? '12 AM' : learningInsights.peakHour > 12 ? `${learningInsights.peakHour - 12} PM` : `${learningInsights.peakHour} AM`)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Proceed Button */}
                        <div className="w-full max-w-sm pt-0 md:pt-2 animate-entrance-pop" style={{ animationDelay: '300ms' }}>
                            <button
                                onClick={() => setShowWelcome(false)}
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
            )}
        </div >
    );
}
