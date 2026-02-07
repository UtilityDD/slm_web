import React, { useState, useEffect } from 'react';
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

export default function Training({ language = 'en', user, onProgressUpdate }) {
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
    const [activeImageModal, setActiveImageModal] = useState(null); // { type: 'image', value: 'url' } or { type: 'text', value: 'content' }

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
                        className="inline-flex items-center justify-center w-8 h-8 mx-1 bg-orange-100 dark:bg-orange-900/40 rounded-full text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-all animate-blink border border-orange-200 dark:border-orange-800/50 align-middle"
                        title={isImage ? "Click to view image" : "Click to read more"}
                    >
                        <svg className="w-5 h-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
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
        if (!trainingContent) return;

        let parts = [];

        // Add Mission Briefing
        if (trainingContent.mission_briefing) {
            parts.push((language === 'en' ? "Mission Briefing. " : "মূল কথা। ") + trainingContent.mission_briefing);
        }

        // Add Main Content Sections
        if (trainingContent.sections) {
            trainingContent.sections.forEach(section => {
                if (section.title) parts.push(section.title);
                if (section.points) {
                    section.points.forEach(point => {
                        if (point.item_name) parts.push(point.item_name);
                        if (point.specifications) parts.push(point.specifications);
                        if (point.importance) parts.push(point.importance);
                        if (point.daily_check) parts.push(point.daily_check);
                    });
                }
            });
        }

        // Add Pro Tips (JSON structure: "pro_tip" object with "content" array)
        const pt = trainingContent.pro_tip || trainingContent.pro_tips;
        if (pt) {
            if (pt.title) parts.push(pt.title);
            if (pt.content && Array.isArray(pt.content)) {
                pt.content.forEach(tip => parts.push(tip));
            } else if (Array.isArray(pt)) {
                pt.forEach(tip => parts.push(tip));
            }
        }

        // Add Myth Busters (JSON structure: "myth_buster" object with "myths" array)
        const mb = trainingContent.myth_buster || trainingContent.myth_busters;
        if (mb) {
            if (mb.title) parts.push(mb.title);
            const myths = mb.myths || mb;
            if (Array.isArray(myths)) {
                myths.forEach(item => {
                    if (item.myth) parts.push((language === 'en' ? "Myth: " : "ভুল ধারণা: ") + item.myth);
                    if (item.reality || item.fact) parts.push((language === 'en' ? "Reality: " : "সঠিক তথ্য: ") + (item.reality || item.fact));
                });
            }
        }

        // Add Advanced Sections (JSON structure: "advanced_section" object with "facts" array)
        const adv = trainingContent.advanced_section || trainingContent.advanced_sections;
        if (adv) {
            if (adv.title) parts.push(adv.title);
            const facts = adv.facts || adv.content || adv;
            if (Array.isArray(facts)) {
                facts.forEach(section => {
                    if (section.title) parts.push(section.title);
                    if (section.content) parts.push(section.content);
                    else if (typeof section === 'string') parts.push(section);
                });
            }
        }

        // Join everything with periods to ensure pauses between blocks
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

            {/* Network Error UI */}
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

            <div>
                {trainingLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-slate-500">Loading training content...</p>
                    </div>
                ) : !selectedChapter && !trainingContent ? (
                    /* Chapter List View */
                    <>
                        {/* Progress Stats Section - Top of Page */}
                        <div className="mb-8 lg:mb-12">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                                {/* Total Chapters */}
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl lg:rounded-3xl p-5 lg:p-6 border border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                            <span className="text-2xl lg:text-3xl">📚</span>
                                        </div>
                                    </div>
                                    <div className="text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1 lg:mb-2">
                                        {trainingChapters.length - 1}
                                    </div>
                                    <div className="text-xs lg:text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                        {language === 'en' ? 'Total Chapters' : 'মোট অধ্যায়'}
                                    </div>
                                </div>

                                {/* Completed Chapters */}
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl lg:rounded-3xl p-5 lg:p-6 border border-emerald-200 dark:border-emerald-700 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                            <span className="text-2xl lg:text-3xl">✅</span>
                                        </div>
                                    </div>
                                    <div className="text-3xl lg:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-1 lg:mb-2">
                                        {trainingChapters.filter(ch => {
                                            if (ch.number === 10) return false;
                                            const completed = completedLessons.filter(id => id && id.toString().startsWith(`${ch.number}.`)).length;
                                            return completed === ch.count;
                                        }).length}
                                    </div>
                                    <div className="text-xs lg:text-sm font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                                        {language === 'en' ? 'Completed Chapters' : 'সম্পন্ন অধ্যায়'}
                                    </div>
                                </div>

                                {/* Total Lessons */}
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl lg:rounded-3xl p-5 lg:p-6 border border-orange-200 dark:border-orange-700 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-orange-500/10 rounded-xl flex items-center justify-center">
                                            <span className="text-2xl lg:text-3xl">📖</span>
                                        </div>
                                    </div>
                                    <div className="text-3xl lg:text-4xl font-bold text-orange-600 dark:text-orange-400 mb-1 lg:mb-2">
                                        {trainingChapters.reduce((sum, ch) => sum + (ch.number === 10 ? 0 : ch.count), 0)}
                                    </div>
                                    <div className="text-xs lg:text-sm font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
                                        {language === 'en' ? 'Total Lessons' : 'মোট পাঠ'}
                                    </div>
                                </div>

                                {/* Completed Lessons */}
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl lg:rounded-3xl p-5 lg:p-6 border border-purple-200 dark:border-purple-700 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                            <span className="text-2xl lg:text-3xl">🎯</span>
                                        </div>
                                    </div>
                                    <div className="text-3xl lg:text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1 lg:mb-2">
                                        {completedLessons.filter(id => {
                                            const str = id.toString();
                                            return str.match(/^\d+\.\d+$/) && !str.startsWith('10.');
                                        }).length}
                                    </div>
                                    <div className="text-xs lg:text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                        {language === 'en' ? 'Completed Lessons' : 'সম্পন্ন পাঠ'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Hero Section */}
                        <div className="hidden lg:block mb-12">
                            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-3xl p-10 text-white shadow-2xl shadow-orange-500/30 border border-orange-400/20 overflow-hidden relative">
                                {/* Decorative Background Pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-300 rounded-full blur-3xl"></div>
                                </div>

                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex-1">
                                        <h1 className="text-5xl font-black mb-4 tracking-tight">
                                            {language === 'en' ? 'Master Electrical Safety' : 'বৈদ্যুতিক নিরাপত্তায় পারদর্শী হন'}
                                        </h1>
                                        <p className="text-orange-100 text-lg font-medium max-w-2xl mb-6">
                                            {language === 'en' ? 'Complete training modules, earn badges, and become a certified safety expert.' : 'প্রশিক্ষণ মডিউল সম্পন্ন করুন, ব্যাজ অর্জন করুন এবং একজন সার্টিফাইড সেফটি এক্সপার্ট হয়ে উঠুন।'}
                                        </p>

                                        {/* Progress Bar */}
                                        <div className="max-w-2xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-semibold text-orange-100">
                                                    {language === 'en' ? 'Overall Progress' : 'সামগ্রিক অগ্রগতি'}
                                                </span>
                                                <span className="text-2xl font-black">
                                                    {Math.round((completedLessons.filter(id => {
                                                        const str = id.toString();
                                                        return str.match(/^\d+\.\d+$/) && !str.startsWith('10.');
                                                    }).length / trainingChapters.reduce((sum, ch) => sum + (ch.number === 10 ? 0 : ch.count), 0)) * 100) || 0}%
                                                </span>
                                            </div>
                                            <div className="h-4 bg-white/20 backdrop-blur-sm rounded-full overflow-hidden border border-white/30">
                                                <div
                                                    className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 transition-all duration-1000 ease-out shadow-lg"
                                                    style={{
                                                        width: `${Math.round((completedLessons.filter(id => {
                                                            const str = id.toString();
                                                            return str.match(/^\d+\.\d+$/) && !str.startsWith('10.');
                                                        }).length / trainingChapters.reduce((sum, ch) => sum + (ch.number === 10 ? 0 : ch.count), 0)) * 100) || 0}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Achievement Badges */}
                                    <div className="hidden xl:flex items-center gap-4">
                                        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 min-w-[140px]">
                                            <div className="text-5xl mb-2">📊</div>
                                            <div className="text-3xl font-black mb-1">
                                                {readingPoints || 0}
                                            </div>
                                            <div className="text-orange-200 text-xs font-bold uppercase tracking-wider">
                                                {language === 'en' ? 'Reading Score' : 'পঠন স্কোর'}
                                            </div>
                                        </div>

                                        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 min-w-[140px]">
                                            <div className="text-5xl mb-2">⚡</div>
                                            <div className="text-3xl font-black mb-1">
                                                {(() => {
                                                    const totalLessons = trainingChapters.reduce((sum, ch) => sum + (ch.number === 10 ? 0 : ch.count), 0);
                                                    if (!totalLessons) return 90;
                                                    const completed = completedLessons.filter(id => {
                                                        const str = id.toString();
                                                        return str.match(/^\d+\.\d+$/) && !str.startsWith('10.');
                                                    }).length;
                                                    const progress = completed / totalLessons;
                                                    const daysLeft = Math.max(0, 90 - Math.floor(progress * 90));
                                                    return isNaN(daysLeft) ? 90 : daysLeft;
                                                })()}
                                            </div>
                                            <div className="text-orange-200 text-xs font-bold uppercase tracking-wider">
                                                {language === 'en' ? 'Days Left' : 'দিন বাকি'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8">
                            {trainingChapters.map((chapter) => (
                                <TrainingChapterCard
                                    key={chapter.number}
                                    chapter={chapter}
                                    completedLessons={completedLessons}
                                    language={language}
                                    onClick={handleChapterClick}
                                />
                            ))}
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
                    </>
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
                            /* Regular Subchapter List */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedChapter.subchapters.map((subchapter, index) => {
                                    const isUnlocked = isLessonUnlocked(subchapter.chapterNum, subchapter.subchapterNum);
                                    const isCompleted = completedLessons.includes(subchapter.level_id);

                                    return (
                                        <div
                                            key={subchapter.level_id}
                                            onClick={() => {
                                                if (!user) {
                                                    // Handle login logic if needed, or pass prop
                                                    return;
                                                }
                                                if (isUnlocked) {
                                                    setTrainingContent(subchapter);
                                                }
                                            }}
                                            className={`bg-white dark:bg-slate-800 p-3 rounded-lg border transition-all flex items-center gap-3 ${isUnlocked
                                                ? 'border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-sm cursor-pointer'
                                                : 'border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed'
                                                } ${isCompleted ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''} group`}
                                        >
                                            {/* ID Box - Always Visible */}
                                            <div className={`w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold flex-shrink-0 border ${isCompleted
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                                : isUnlocked
                                                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30'
                                                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-100 dark:border-slate-700'
                                                }`}>
                                                {subchapter.level_id}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                        {subchapter.badge_name}
                                                    </span>
                                                    {isCompleted && (
                                                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                                                    )}
                                                    {!isUnlocked && (
                                                        <span className="text-[10px] text-slate-400">🔒</span>
                                                    )}
                                                </div>
                                                <h4 className={`font-bold text-sm truncate ${isUnlocked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'
                                                    }`}>
                                                    {subchapter.level_title}
                                                </h4>
                                            </div>

                                            {/* Arrow Icon */}
                                            {isUnlocked && (
                                                <div className="text-slate-300 dark:text-slate-600 group-hover:text-orange-500 transition-colors">
                                                    →
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div >
                ) : null}
            </div>

            {/* Full Page Content View - Using Portal to bypass parent layout constraints */}
            {trainingContent && createPortal(
                <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 overflow-y-auto animate-slide-up w-full">
                    {/* Sticky Header */}
                    <div className="sticky top-0 z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm gap-3 safe-area-inset-top">
                        <button
                            onClick={() => {
                                stop();
                                setTrainingContent(null);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 flex-shrink-0"
                            title={language === 'en' ? 'Back to Lessons' : 'পাঠে ফিরে যান'}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex-1 text-center min-w-0">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {trainingContent.level_id && `${trainingContent.level_id}. `}{trainingContent.level_title}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Audio Controls (TTS) */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                                {!isPlaying ? (
                                    <button
                                        onClick={handleReadLesson}
                                        className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg text-orange-600 dark:text-orange-400 transition-all"
                                        title={language === 'en' ? 'Read Lesson' : 'পাঠ শুনুন'}
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </button>
                                ) : (
                                    <>
                                        {isPaused ? (
                                            <button
                                                onClick={resume}
                                                className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg text-orange-600 dark:text-orange-400"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={pause}
                                                className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg text-orange-600 dark:text-orange-400"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                                </svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={stop}
                                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M6 6h12v12H6z" />
                                            </svg>
                                        </button>
                                        {/* Pulsing "Reading" Indicator */}
                                        {!isPaused && (
                                            <div className="flex gap-0.5 px-1">
                                                <div className="w-1 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-1 h-4 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-1 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Complete Button for Training Content */}
                            {!completedLessons.includes(trainingContent.level_id) && (
                                <button
                                    onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                    title={language === 'en' ? 'Mark Completed' : 'সম্পন্ন চিহ্নিত করুন'}
                                >
                                    ✓
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 lg:px-8 py-6 sm:py-8 lg:py-10 pb-16 lg:pb-20">
                        {/* Hero Header */}
                        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-2xl lg:rounded-3xl p-8 lg:p-12 text-white mb-8 lg:mb-12 shadow-xl border border-orange-400/20">
                            <div className="inline-block px-4 py-1.5 lg:px-5 lg:py-2 rounded-full bg-white/20 backdrop-blur-md text-xs lg:text-sm uppercase tracking-wide font-semibold mb-4 lg:mb-5 border border-white/30">
                                {trainingContent.badge_name}
                            </div>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 lg:mb-4 reading-content leading-tight">
                                {trainingContent.level_title}
                            </h2>
                            <p className="text-orange-50 text-sm lg:text-base font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg animate-pulse"></span>
                                Level {trainingContent.level_id}
                            </p>
                        </div>

                        {/* Mission Briefing */}
                        <div className="bg-gradient-to-br from-orange-50 via-orange-50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border-l-4 border-orange-500 p-6 lg:p-8 rounded-r-2xl mb-8 lg:mb-12 shadow-md hover:shadow-lg transition-all duration-300">
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={() => speak((language === 'en' ? "Mission Briefing. " : "মূল কথা। ") + trainingContent.mission_briefing)}
                                    className="px-3 py-1.5 lg:px-4 lg:py-2 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-orange-700 dark:text-orange-400 font-semibold transition-all flex items-center gap-2 text-xs uppercase tracking-tight shadow-sm border border-orange-200/50 dark:border-orange-500/30"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                                    </svg>
                                    {language === 'en' ? 'Listen' : 'শুনুন'}
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3 lg:gap-4">
                                    <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xl lg:text-3xl flex-shrink-0 shadow-md">
                                        🎯
                                    </div>
                                    <h3 className="font-semibold text-orange-900 dark:text-orange-100 uppercase tracking-wide text-sm lg:text-base">
                                        {language === 'en' ? 'Mission Briefing' : 'মূল কথা'}
                                    </h3>
                                </div>
                                <p className={`text-slate-800 dark:text-slate-200 reading-content leading-relaxed text-base lg:text-lg whitespace-pre-line ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {renderTextWithImages(trainingContent.mission_briefing)}
                                </p>
                            </div>
                        </div>

                        {/* Sections */}
                        <div className="space-y-10 lg:space-y-14">
                            {trainingContent.sections?.map((section, sIdx) => (
                                <div key={sIdx} className="bg-white dark:bg-slate-800 rounded-2xl p-6 lg:p-10 shadow-md border border-slate-200 dark:border-slate-700">
                                    <div className="flex flex-col gap-3 lg:gap-4 mb-6 lg:mb-8 border-b border-slate-200 dark:border-slate-700 pb-4 lg:pb-6">
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => {
                                                    let text = section.title + ". ";
                                                    if (section.points) {
                                                        section.points.forEach(p => {
                                                            text += (p.item_name || "") + ". " + (p.specifications || "") + ". " + (p.importance || "") + ". " + (p.daily_check || "") + ". ";
                                                        });
                                                    }
                                                    speak(text);
                                                }}
                                                className="px-3 py-1.5 lg:px-4 lg:py-2 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg text-orange-700 dark:text-orange-400 font-semibold transition-all flex items-center gap-2 text-xs uppercase tracking-tight shadow-sm border border-orange-200 dark:border-orange-500/30"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                                                </svg>
                                                {language === 'en' ? 'Listen' : 'শুনুন'}
                                            </button>
                                        </div>
                                        <h3 className={`text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 reading-content flex items-center gap-3 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            <span className="w-1 lg:w-1.5 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full flex-shrink-0"></span>
                                            {section.title}
                                        </h3>
                                    </div>
                                    <div className="space-y-8 lg:space-y-12">
                                        {section.points?.map((point, pIdx) => (
                                            <div key={pIdx} className="relative pl-0 sm:pl-6 lg:pl-8 border-l-0 sm:border-l-2 border-orange-300 dark:border-orange-800/50">
                                                <div className="hidden sm:block absolute left-[-5px] top-1.5 w-3 h-3 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 border-2 border-white dark:border-slate-800 shadow-md"></div>

                                                {/* Mobile: Top Border Separator */}
                                                <div className="sm:hidden w-full h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700 dark:to-transparent mb-4"></div>

                                                <h4 className={`font-semibold text-slate-900 dark:text-slate-100 mb-5 lg:mb-6 reading-content text-lg lg:text-xl leading-snug ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {point.item_name}
                                                </h4>
                                                {point.image_name && (
                                                    <div className="mb-8 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-900/50">
                                                        <img
                                                            src={`/quizzes/${point.image_name}`}
                                                            alt={point.item_name}
                                                            className="w-full h-auto object-cover max-h-96"
                                                            loading="lazy"
                                                        />
                                                        {point.image_caption && (
                                                            <div className="bg-white dark:bg-slate-800/80 px-5 py-4 border-t border-slate-100 dark:border-slate-700">
                                                                <p className="text-base text-slate-600 dark:text-slate-400 italic text-center font-medium leading-relaxed">
                                                                    {point.image_caption}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="space-y-6 lg:space-y-8">
                                                    {point.specifications && (
                                                        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/80 dark:to-slate-800/50 p-5 lg:p-7 rounded-xl lg:rounded-2xl border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow duration-300 relative group/block">
                                                            <div className="flex justify-end mb-3 opacity-0 group-hover/block:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => speak((language === 'en' ? "Details. " : "বিস্তারিত। ") + point.specifications)}
                                                                    className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg text-orange-600 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-tight border border-orange-200 dark:border-orange-500/20 shadow-sm"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                                                                    </svg>
                                                                    {language === 'en' ? 'Listen' : 'শুনুন'}
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-3 mb-3 lg:mb-4">
                                                                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                                                                    <span className="text-xl lg:text-2xl">📋</span>
                                                                </div>
                                                                <p className="text-xs lg:text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
                                                                    {language === 'en' ? 'Details' : 'বিস্তারিত'}
                                                                </p>
                                                            </div>
                                                            <p className={`text-base lg:text-lg text-slate-700 dark:text-slate-300 reading-content leading-relaxed whitespace-pre-line ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {renderTextWithImages(point.specifications)}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {point.importance && (
                                                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10 p-5 lg:p-7 rounded-xl lg:rounded-2xl border-l-4 border-amber-500 shadow-sm hover:shadow-md transition-shadow duration-300 relative group/block">
                                                            <div className="flex justify-end mb-3 opacity-0 group-hover/block:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => speak((language === 'en' ? "Why it matters. " : "কেন এটি গুরুত্বপূর্ণ। ") + point.importance)}
                                                                    className="px-3 py-1.5 bg-amber-100/70 dark:bg-amber-800/30 hover:bg-amber-200 dark:hover:bg-amber-800/40 rounded-lg text-amber-700 dark:text-amber-400 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-tight border border-amber-200 dark:border-amber-500/20 shadow-sm"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                                                                    </svg>
                                                                    {language === 'en' ? 'Listen' : 'শুনুন'}
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-3 mb-3 lg:mb-4">
                                                                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                                                    <span className="text-xl lg:text-2xl">💡</span>
                                                                </div>
                                                                <p className="text-xs lg:text-sm font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                                                                    {language === 'en' ? 'Why it matters' : 'কেন গুরুত্বপূর্ণ'}
                                                                </p>
                                                            </div>
                                                            <p className={`text-base lg:text-lg font-medium text-slate-800 dark:text-slate-200 reading-content leading-relaxed whitespace-pre-line ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {renderTextWithImages(point.importance)}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {point.daily_check && (
                                                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 p-5 lg:p-7 rounded-xl lg:rounded-2xl border-l-4 border-emerald-500 shadow-sm hover:shadow-md transition-shadow duration-300 relative group/block">
                                                            <div className="flex justify-end mb-3 opacity-0 group-hover/block:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => speak((language === 'en' ? "Action item. " : "করণীয় কাজ। ") + point.daily_check)}
                                                                    className="px-3 py-1.5 bg-emerald-100/70 dark:bg-emerald-800/30 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 rounded-lg text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-tight border border-emerald-200 dark:border-emerald-500/20 shadow-sm"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                                                                    </svg>
                                                                    {language === 'en' ? 'Listen' : 'শুনুন'}
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-3 mb-3 lg:mb-4">
                                                                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                                                    <span className="text-xl lg:text-2xl">✓</span>
                                                                </div>
                                                                <p className="text-xs lg:text-sm font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
                                                                    {language === 'en' ? 'Action Item' : 'করণীয় কাজ'}
                                                                </p>
                                                            </div>
                                                            <p className={`text-base lg:text-lg text-slate-800 dark:text-slate-200 reading-content leading-relaxed whitespace-pre-line ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {renderTextWithImages(point.daily_check)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pro Tips */}
                        {trainingContent.pro_tip && (
                            <div className="mt-16 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl p-8 sm:p-10 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10">
                                <div className="flex flex-col gap-4 mb-10">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => {
                                                let text = trainingContent.pro_tip.title + ". ";
                                                trainingContent.pro_tip.content?.forEach(tip => text += tip + ". ");
                                                speak(text);
                                            }}
                                            className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-800 dark:hover:bg-emerald-700 rounded-lg transition-all text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 text-[10px] uppercase tracking-tight shadow-sm border border-emerald-200/50 dark:border-emerald-500/20 font-bold"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                                            </svg>
                                            {language === 'en' ? 'Listen' : 'এই অংশটি শুনুন'}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 sm:gap-5">
                                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-xl sm:text-3xl shadow-sm text-emerald-600 dark:text-emerald-400">
                                            💡
                                        </div>
                                        <div>
                                            <h3 className={`text-2xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-100 reading-content leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {trainingContent.pro_tip.title}
                                            </h3>
                                            <p className="text-emerald-700 dark:text-emerald-400 text-sm mt-1 font-bold uppercase tracking-wider">{language === 'en' ? 'Expert Advice' : 'বিশেষজ্ঞের পরামর্শ'}</p>
                                        </div>
                                    </div>
                                </div>
                                <ul className="space-y-6">
                                    {trainingContent.pro_tip.content?.map((tip, idx) => (
                                        <li key={idx} className={`flex items-start gap-3 sm:gap-5 text-slate-800 dark:text-emerald-50 reading-content leading-loose text-lg sm:text-xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            <span className="w-8 h-8 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1 shadow-sm">✓</span>
                                            <span className="flex-1 font-medium">{renderTextWithImages(tip)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Myth Buster */}
                        {trainingContent.myth_buster && (
                            <div className="mt-16 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 border-2 border-red-100 dark:border-red-900/30 shadow-lg">
                                <div className="flex flex-col gap-4 mb-10">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => {
                                                let text = trainingContent.myth_buster.title + ". ";
                                                trainingContent.myth_buster.myths?.forEach(item => {
                                                    text += (language === 'en' ? "Myth: " : "ভুল ধারণা: ") + item.myth + ". " + (language === 'en' ? "Reality: " : "সঠিক তথ্য: ") + (item.reality || item.fact) + ". ";
                                                });
                                                speak(text);
                                            }}
                                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 rounded-lg transition-all text-red-700 dark:text-red-400 flex items-center gap-1.5 text-[10px] uppercase tracking-tight font-bold border border-red-200/50 dark:border-red-800/50 shadow-sm"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                                            </svg>
                                            {language === 'en' ? 'Listen' : 'এই অংশটি শুনুন'}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 sm:gap-5">
                                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-xl sm:text-3xl shadow-sm">
                                            ⚠️
                                        </div>
                                        <div>
                                            <h3 className="text-2xl sm:text-3xl font-bold text-red-800 dark:text-red-400 reading-content">
                                                {trainingContent.myth_buster.title}
                                            </h3>
                                            <p className="text-red-600/80 dark:text-red-400/80 text-sm mt-1 font-bold uppercase tracking-wider">{language === 'en' ? 'Common Misconceptions' : 'ভুল ধারণা বনাম সঠিক তথ্য'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    {trainingContent.myth_buster.myths?.map((item, idx) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl p-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <div className="p-6 bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-red-500 text-xl">❌</span>
                                                    <p className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                                                        {language === 'en' ? 'Myth' : 'ভুল ধারণা'}
                                                    </p>
                                                </div>
                                                <p className="text-lg sm:text-xl text-slate-800 dark:text-slate-200 italic reading-content leading-relaxed font-medium">
                                                    "{renderTextWithImages(item.myth)}"
                                                </p>
                                            </div>
                                            <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-emerald-500 text-xl">✅</span>
                                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                                        {language === 'en' ? 'Reality' : 'সঠিক তথ্য'}
                                                    </p>
                                                </div>
                                                <p className="text-lg sm:text-xl text-slate-800 dark:text-slate-200 reading-content leading-relaxed font-medium">
                                                    {renderTextWithImages(item.reality || item.fact)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Advanced Section */}
                        {trainingContent.advanced_section && (
                            <div className="mt-12 bg-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl hover:shadow-2xl transition-shadow">
                                <div className="flex flex-col gap-4 mb-8">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => {
                                                let text = trainingContent.advanced_section.title + ". ";
                                                trainingContent.advanced_section.facts?.forEach(f => text += f.title + ". " + f.content + ". ");
                                                speak(text);
                                            }}
                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white flex items-center gap-1.5 text-[10px] uppercase tracking-tight font-bold border border-white/20 shadow-sm"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                                            </svg>
                                            {language === 'en' ? 'Listen' : 'এই অংশটি শুনুন'}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-2xl shadow-sm">
                                            🧪
                                        </div>
                                        <h3 className={`text-2xl sm:text-3xl font-bold reading-content ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {trainingContent.advanced_section.title}
                                        </h3>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    {trainingContent.advanced_section.facts?.map((fact, idx) => (
                                        <div key={idx} className="bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/10 hover:border-white/20 hover:bg-white/8 transition-all group/block relative">
                                            <div className="flex justify-end mb-2 opacity-0 group-hover/block:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => speak(fact.title + ". " + fact.content)}
                                                    className="px-2 py-1 bg-white/10 rounded-md text-white flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tight border border-white/20"
                                                >
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                                                    </svg>
                                                    {language === 'en' ? 'Listen' : 'এই অংশটি শুনুন'}
                                                </button>
                                            </div>
                                            <div className="flex items-start justify-between mb-4">
                                                <h4 className="font-bold text-orange-300 reading-content text-lg sm:text-xl">
                                                    {fact.title}
                                                </h4>
                                            </div>
                                            <p className="text-slate-200 reading-content leading-relaxed text-base whitespace-pre-line">
                                                {renderTextWithImages(fact.content)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mark as Complete Button stack */}
                        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                            {!completedLessons.includes(trainingContent.level_id) ? (
                                <>
                                    <button
                                        onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                        className="w-full px-8 py-4 rounded-2xl font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 text-lg active:scale-95"
                                    >
                                        <span className="text-xl">✓</span>
                                        {language === 'en' ? 'Mark as Complete' : 'সম্পন্ন হিসেবে চিহ্নিত করুন'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTrainingContent(null);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="w-full mt-4 px-8 py-4 rounded-2xl font-bold transition-all bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-3 text-lg active:scale-95"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        {language === 'en' ? 'Back to Lessons' : 'পাঠে ফিরে যান'}
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-full px-8 py-4 rounded-2xl font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-3 text-lg border border-emerald-200 dark:border-emerald-800">
                                        <span className="text-xl">✓</span>
                                        {language === 'en' ? 'Lesson Completed!' : 'পাঠ সম্পন্ন হয়েছে!'}
                                    </div>

                                    {/* Reward feedback removed from here, moved to global portal below */}

                                    <button
                                        onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                        className="w-full px-8 py-4 rounded-2xl font-bold transition-all bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3 text-lg active:scale-95"
                                    >
                                        <span className="text-xl">📝</span>
                                        {language === 'en' ? 'Practice Quiz' : 'প্র্যাকটিস কুইজ'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTrainingContent(null);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="w-full px-8 py-4 rounded-2xl font-bold transition-all bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 flex items-center justify-center gap-3 text-lg active:scale-95"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        {language === 'en' ? 'Back to Lessons' : 'পাঠে ফিরে যান'}
                                    </button>
                                </div>
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
        </div >
    );
}
