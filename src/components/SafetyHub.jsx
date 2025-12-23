import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';
import ChapterQuizModal from './ChapterQuizModal';

const PPESkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
                <div className="space-y-2 mb-4">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
            </div>
        ))}
    </div>
);

const ProtocolCard = React.memo(({ level, index, onClick }) => (
    <div
        onClick={() => onClick(level)}
        className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition-all cursor-pointer group"
    >
        <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform">
                {index + 1}
            </div>
            <span className="text-slate-400 dark:text-slate-500">→</span>
        </div>
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-0.5">{level.level_name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{level.focus}</p>
    </div>
));

const TrainingChapterCard = React.memo(({ chapter, completedLessons, language, onClick }) => {
    const completedCount = completedLessons.filter(id => id && id.toString().startsWith(`${chapter.number}.`)).length;
    const progress = chapter.count > 0 ? Math.min(100, Math.round((completedCount / chapter.count) * 100)) : 0;

    return (
        <div
            onClick={() => onClick(chapter)}
            className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-lg font-bold border border-orange-100 dark:border-orange-900/50">
                        {chapter.number}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {chapter.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {chapter.count} {language === 'en' ? 'Lessons' : 'পাঠ'}
                        </p>
                    </div>
                </div>
                {progress === 100 && (
                    <div className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        {language === 'en' ? 'Done' : 'সম্পন্ন'}
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-right">
                {progress}% {language === 'en' ? 'Complete' : 'সম্পন্ন'}
            </p>
        </div>
    );
});

export default function SafetyHub({ language = 'en', user, setCurrentView }) {
    const [activeTab, setActiveTab] = useState('protocols');
    const [ppeList, setPpeList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newItem, setNewItem] = useState({
        name: '',
        age_months: '',
        condition: 'Good',
        details: '',
        count: 1
    });
    const [ppeChecklist, setPpeChecklist] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
    const [protocolsData, setProtocolsData] = useState(null);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [carouselData, setCarouselData] = useState(null);
    const [fetchError, setFetchError] = useState(false);

    // Quiz Modal State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [currentQuizQuestions, setCurrentQuizQuestions] = useState([]);
    const [pendingLessonId, setPendingLessonId] = useState(null);

    // Training Zone States
    const [trainingChapters, setTrainingChapters] = useState([]);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [selectedSubchapter, setSelectedSubchapter] = useState(null);
    const [trainingContent, setTrainingContent] = useState(null);
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [completedLessons, setCompletedLessons] = useState([]);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Load completed lessons from localStorage
    useEffect(() => {
        if (user) {
            const saved = localStorage.getItem(`training_progress_${user.id}`);
            if (saved) {
                setCompletedLessons(JSON.parse(saved));
            }
        }
    }, [user]);
    // Helper function to check if a lesson is unlocked
    const isLessonUnlocked = (chapterNum, subchapterNum) => {
        // First lesson of each chapter is always unlocked
        if (subchapterNum === 1) return true;

        // Check if previous lesson is completed
        const previousLessonId = `${chapterNum}.${subchapterNum - 1}`;
        return completedLessons.includes(previousLessonId);
    };

    // Finalize lesson completion after quiz (or if no quiz exists)
    const finalizeLessonCompletion = (lessonId) => {
        if (!completedLessons.includes(lessonId)) {
            const updated = [...completedLessons, lessonId];
            setCompletedLessons(updated);
            if (user) {
                localStorage.setItem(`training_progress_${user.id}`, JSON.stringify(updated));
            }
        }
        setShowQuizModal(false);
        setPendingLessonId(null);
    };

    // Initiate lesson completion - check for quiz first
    const initiateLessonCompletion = async (lessonId) => {
        if (completedLessons.includes(lessonId)) return;

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
                // Randomly select 10 questions
                const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, 10);

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
        // Here you could add logic to require a minimum score
        // For now, we just accept completion
        if (pendingLessonId) {
            finalizeLessonCompletion(pendingLessonId);
        }
    };

    const SAFETY_RULES = [
        {
            rule: language === 'en' ? "Min. Ground Clearance for LT line is 15 ft./ 4.6 meter." : "এলটি লাইনের জন্য ন্যূনতম গ্রাউন্ড ক্লিয়ারেন্স হল ১৫ ফুট/ ৪.৬ মিটার।",
            icon: "📏",
            color: "from-blue-600 to-indigo-600"
        },
        {
            rule: language === 'en' ? "Wear PPE -> Shut down -> Earthing -> Discharge -> Work." : "পিপিই পরুন -> শাট ডাউন -> আর্থিং -> ডিসচার্জ -> কাজ করুন।",
            icon: "⚡",
            color: "from-orange-600 to-red-600"
        },
        {
            rule: language === 'en' ? "Always use a safety belt and helmet while working at height." : "উচ্চতায় কাজ করার সময় সর্বদা সুরক্ষা বেল্ট এবং হেলমেট ব্যবহার করুন।",
            icon: "🧗",
            color: "from-emerald-600 to-teal-600"
        },
        {
            rule: language === 'en' ? "Check tools for damage before starting any maintenance work." : "যেকোনো রক্ষণাবেক্ষণের কাজ শুরু করার আগে সরঞ্জামগুলি ক্ষতির জন্য পরীক্ষা করুন।",
            icon: "🔧",
            color: "from-slate-700 to-slate-900"
        }
    ];

    const activeRules = carouselData?.rules || SAFETY_RULES.map(r => r.rule);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentRuleIndex((prev) => (prev + 1) % activeRules.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [activeRules.length]);

    useEffect(() => {
        const fetchProtocols = async () => {
            setFetchError(false);
            try {
                const fileName = language === 'en' ? 'protocol_en.json' : 'protocol.json';
                const response = await fetch(`/quizzes/${fileName}`);
                if (!response.ok) throw new Error('Failed to fetch protocols');
                const data = await response.json();
                setProtocolsData(data);
            } catch (error) {
                console.error('Error fetching protocols:', error);
                setFetchError(true);
            }
        };

        const fetchCarousel = async () => {
            try {
                const fileName = language === 'en' ? 'carousol_en.json' : 'carousol.json';
                const response = await fetch(`/quizzes/${fileName}`);
                if (!response.ok) throw new Error('Failed to fetch carousel');
                const data = await response.json();
                setCarouselData(data);
            } catch (error) {
                console.error('Error fetching carousel data:', error);
            }
        };

        const fetchTrainingChapters = async () => {
            try {
                setTrainingLoading(true);
                const response = await fetch('/quizzes/training_manifest.json');
                if (response.ok) {
                    const data = await response.json();
                    setTrainingChapters(data);
                } else {
                    throw new Error('Manifest not found');
                }
            } catch (error) {
                console.error('Error fetching training chapters:', error);
                setFetchError(true);
            } finally {
                setTrainingLoading(false);
            }
        };

        fetchProtocols();
        fetchCarousel();
        fetchTrainingChapters();
    }, [language]);

    const handleChapterClick = async (chapter) => {
        setTrainingLoading(true);
        // Lazy load subchapters
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
            const subchapters = results
                .map((data, idx) => data ? { ...data, chapterNum: chapter.number, subchapterNum: idx + 1 } : null)
                .filter(Boolean);

            setSelectedChapter({ ...chapter, subchapters });
        } catch (err) {
            console.error("Error loading chapter:", err);
        } finally {
            setTrainingLoading(false);
        }
    };

    const nextRule = () => {
        setCurrentRuleIndex((prev) => (prev + 1) % activeRules.length);
    };

    const prevRule = () => {
        setCurrentRuleIndex((prev) => (prev - 1 + activeRules.length) % activeRules.length);
    };

    const PPE_ITEMS = [
        { name: "Safety Helmet", icon: "🪖" },
        { name: "Safety Shoes/Boots", icon: "🥾" },
        { name: "Insulated Gloves", icon: "🧤" },
        { name: "Reflective Jacket", icon: "🦺" },
        { name: "Safety Belt", icon: "🧗" },
        { name: "Full Body Harness", icon: "🧗‍♂️" },
        { name: "Voltage Detector", icon: "🔌" },
        { name: "Discharge Rod", icon: "🦯" },
        { name: "Safety Goggles", icon: "🥽" },
        { name: "Raincoat", icon: "🧥" },
        { name: "Torch/Emergency Light", icon: "🔦" }
    ];

    useEffect(() => {
        if (activeTab === 'my_ppe' && user) {
            fetchPPE();
        }
    }, [activeTab, user]);

    const fetchPPE = async () => {
        if (!user) return;
        const cacheKey = `user_ppe_${user.id}`;
        const cachedPPE = cacheHelper.get(cacheKey);

        let data = cachedPPE;
        if (!data) {
            setLoading(true);
            try {
                const { data: fetchedData, error } = await supabase
                    .from('user_ppe')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                data = fetchedData || [];
                cacheHelper.set(cacheKey, data, 10);
            } catch (error) {
                console.error('Error fetching PPE:', error);
                data = [];
            } finally {
                setLoading(false);
            }
        }

        setPpeList(data);

        // Initialize checklist based on fetched data
        const checklist = PPE_ITEMS.map(item => {
            const existing = data.find(p => p.name === item.name);
            return {
                ...item,
                available: !!existing,
                id: existing?.id || null,
                count: existing?.count || 1,
                condition: existing?.condition || 'Good',
                age: existing?.age_months ?
                    (existing.age_months <= 6 ? '<6m' :
                        existing.age_months <= 12 ? '6-12m' :
                            existing.age_months <= 24 ? '1-2y' : '>2y') : '<6m',
                usage: existing?.details?.includes('Usage:') ?
                    existing.details.split('Usage:')[1].trim() : 'Personal'
            };
        });
        setPpeChecklist(checklist);
    };

    const handleSavePPE = async () => {
        if (!user) {
            setCurrentView('login');
            return;
        }
        setIsSaving(true);

        try {
            // Prepare data for batch operations
            const upsertItems = [];
            const deleteIds = [];

            for (const item of ppeChecklist) {
                const ageMonths = item.age === '<6m' ? 3 :
                    item.age === '6-12m' ? 9 :
                        item.age === '1-2y' ? 18 : 36;

                const details = `Usage: ${item.usage}`;

                if (item.available) {
                    // Prepare for upsert (handles both insert and update)
                    upsertItems.push({
                        id: item.id || undefined, // Include ID for updates, undefined for inserts
                        user_id: user.id,
                        name: item.name,
                        count: parseInt(item.count),
                        condition: item.condition,
                        age_months: ageMonths,
                        details: details
                    });
                } else if (item.id) {
                    // Collect IDs for deletion
                    deleteIds.push(item.id);
                }
            }

            // Execute batch operations
            const operations = [];

            // Batch upsert (insert/update)
            if (upsertItems.length > 0) {
                operations.push(
                    supabase
                        .from('user_ppe')
                        .upsert(upsertItems, {
                            onConflict: 'id',
                            ignoreDuplicates: false
                        })
                );
            }

            // Batch delete
            if (deleteIds.length > 0) {
                operations.push(
                    supabase
                        .from('user_ppe')
                        .delete()
                        .in('id', deleteIds)
                );
            }

            // Execute all operations concurrently
            await Promise.all(operations);

            cacheHelper.clear(`user_ppe_${user.id}`);
            await fetchPPE();
            alert('PPE Status updated successfully!');
        } catch (error) {
            console.error('Error saving PPE:', error);
            alert('Failed to save PPE status');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChecklistChange = (index, field, value) => {
        const updated = [...ppeChecklist];
        updated[index] = { ...updated[index], [field]: value };
        setPpeChecklist(updated);
    };

    const handleEditPPE = (item) => {
        setNewItem({
            name: item.name,
            age_months: item.age_months,
            condition: item.condition,
            details: item.details,
            count: item.count
        });
        setEditingId(item.id);
        setShowAddModal(true);
    };

    const handleDeletePPE = async (id) => {
        if (!confirm('Are you sure you want to remove this item?')) return;
        try {
            const { error } = await supabase
                .from('user_ppe')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Clear PPE cache
            cacheHelper.clear(`user_ppe_${user.id}`);

            fetchPPE();
        } catch (error) {
            console.error('Error deleting PPE:', error);
        }
    };

    const t = {
        en: {
            title: "Safety Hub",
            tabs: {
                protocols: "Protocols",
                training: "90 Days Training",
                my_ppe: "My PPE",
                report: "Report Incident"
            },
            protocols: {
                title: "Standard Operating Procedures",
                categories: ["High Voltage", "Maintenance", "Storm Safety", "First Aid"]
            },
            training: {
                title: "90 Days Training Program",
                watch: "Watch Now"
            },
            my_ppe: {
                title: "My Personal Protective Equipment",
                addBtn: "Add New PPE",
                editBtn: "Edit PPE",
                empty: "No PPE items added yet.",
                fields: {
                    name: "Item Name",
                    count: "Quantity",
                    age: "Age (Months)",
                    condition: "Condition",
                    details: "Details / Specs"
                },
                conditions: {
                    Good: "Good",
                    Fair: "Fair",
                    Damaged: "Damaged",
                    Expired: "Expired"
                }
            },
            report: {
                title: "Report a Hazard",
                form: {
                    location: "Location",
                    type: "Hazard Type",
                    desc: "Description",
                    photo: "Upload Photo",
                    submit: "Submit Report"
                }
            }
        },
        bn: {
            title: "সেফটি হাব",
            tabs: {
                protocols: "প্রোটোকল",
                training: "৯০ দিনের প্রশিক্ষণ",
                my_ppe: "আমার পিপিই",
                report: "রিপোর্ট করুন"
            },
            protocols: {
                title: "স্ট্যান্ডার্ড অপারেটিং প্রসিডিউর (SOP)",
                categories: ["উচ্চ ভোল্টেজ", "রক্ষণাবেক্ষণ", "ঝড় নিরাপত্তা", "প্রাথমিক চিকিৎসা"]
            },
            training: {
                title: "৯০ দিনের প্রশিক্ষণ কর্মসূচি",
                watch: "এখন দেখুন"
            },
            my_ppe: {
                title: "আমার ব্যক্তিগত সুরক্ষা সরঞ্জাম",
                addBtn: "নতুন পিপিই যোগ করুন",
                editBtn: "পিপিই সম্পাদনা করুন",
                empty: "এখনও কোন পিপিই যোগ করা হয়নি।",
                fields: {
                    name: "আইটেমের নাম",
                    count: "পরিমাণ",
                    age: "বয়স (মাস)",
                    condition: "অবস্থা",
                    details: "বিবরণ"
                },
                conditions: {
                    Good: "ভালো",
                    Fair: "মোটামুটি",
                    Damaged: "ক্ষতিগ্রস্ত",
                    Expired: "মেয়াদোত্তীর্ণ"
                }
            },
            report: {
                title: "বিপদ রিপোর্ট করুন",
                form: {
                    location: "অবস্থান",
                    type: "বিপদের ধরন",
                    desc: "বিবরণ",
                    photo: "ছবি আপলোড করুন",
                    submit: "রিপোর্ট জমা দিন"
                }
            }
        }
    }[language];

    return (
        <div className="compact-container py-6 sm:py-10 mb-20">
            {/* Header Section */}
            <div className="mb-8 text-center">
                <div className="inline-block p-2.5 rounded-full bg-orange-100 text-orange-600 text-2xl mb-3">
                    🦺
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                    {language === 'en' ? (
                        <>Safety <span className="text-orange-600">Hub</span></>
                    ) : (
                        <>{t.title}</>
                    )}
                </h1>
            </div>

            {/* Navigation Tabs - Compact */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
                {['protocols', 'training', 'my_ppe', 'report'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        {t.tabs[tab]}
                    </button>
                ))}
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
                            ? 'Unable to load safety data. Please check your internet connection.'
                            : 'সেফটি ডাটা লোড করা সম্ভব হয়নি। আপনার ইন্টারনেট কানেকশন চেক করুন।'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                    >
                        {language === 'en' ? 'Retry' : 'আবার চেষ্টা করুন'}
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="animate-slide-down">
                {activeTab === 'protocols' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Highlighted Safety Rule Carousel - Refined */}
                        {/* Highlighted Safety Rule Carousel - Refined */}
                        <div
                            className="md:col-span-2 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-900/5 rounded-2xl p-6 border border-orange-100 dark:border-orange-800/50 shadow-sm min-h-[220px] flex flex-col justify-center relative overflow-hidden group touch-pan-y"
                            onTouchStart={(e) => {
                                const touch = e.touches[0];
                                e.currentTarget.dataset.touchStartX = touch.clientX;
                            }}
                            onTouchEnd={(e) => {
                                const touch = e.changedTouches[0];
                                const startX = parseFloat(e.currentTarget.dataset.touchStartX);
                                const endX = touch.clientX;
                                if (startX - endX > 50) nextRule(); // Swipe Left
                                if (endX - startX > 50) prevRule(); // Swipe Right
                            }}
                        >
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 dark:bg-orange-600/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/20 dark:bg-orange-600/10 rounded-full blur-xl -ml-8 -mb-8 pointer-events-none"></div>

                            {/* Navigation Arrows - Desktop (Hover only) & Mobile (Side taps) */}
                            <button
                                onClick={prevRule}
                                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center border border-white/50 dark:border-slate-700 shadow-sm backdrop-blur-sm transition-all active:scale-95 z-20 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                aria-label="Previous rule"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <button
                                onClick={nextRule}
                                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center border border-white/50 dark:border-slate-700 shadow-sm backdrop-blur-sm transition-all active:scale-95 z-20 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                aria-label="Next rule"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 sm:px-12 py-2">
                                {/* Rule Text with Animation Key */}
                                <div key={currentRuleIndex} className="max-w-xl text-center animate-fade-in-up">
                                    <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 text-2xl shadow-inner">
                                        💡
                                    </div>
                                    <p className="text-slate-800 dark:text-slate-100 text-base sm:text-xl font-bold leading-relaxed tracking-tight">
                                        {activeRules[currentRuleIndex]}
                                    </p>
                                </div>
                            </div>

                            {/* Dot Indicators */}
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
                                {activeRules.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentRuleIndex(idx)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentRuleIndex
                                            ? 'w-6 bg-orange-500 shadow-sm'
                                            : 'w-1.5 bg-orange-200 dark:bg-orange-800/50 hover:bg-orange-300'
                                            }`}
                                        aria-label={`Go to rule ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Protocol Categories - Dynamic from JSON */}
                        {/* Protocol Categories - Dynamic from JSON */}
                        {protocolsData?.levels.map((level, index) => (
                            <ProtocolCard
                                key={index}
                                level={level}
                                index={index}
                                onClick={setSelectedLevel}
                            />
                        ))}
                    </div>
                )}

                {activeTab === 'training' && (
                    <div>
                        {trainingLoading ? (
                            <div className="text-center py-12">
                                <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-slate-500">Loading training content...</p>
                            </div>
                        ) : !selectedChapter && !trainingContent ? (
                            /* Chapter List View */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        ) : selectedChapter && !trainingContent ? (
                            /* Subchapter List View */
                            <div>
                                <button
                                    onClick={() => setSelectedChapter(null)}
                                    className="mb-6 flex items-center gap-2 text-orange-600 hover:text-orange-700 font-bold"
                                >
                                    ← {language === 'en' ? 'Back to Chapters' : 'অধ্যায়ে ফিরে যান'}
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedChapter.subchapters.map((subchapter, index) => {
                                        const isUnlocked = isLessonUnlocked(subchapter.chapterNum, subchapter.subchapterNum);
                                        const isCompleted = completedLessons.includes(subchapter.level_id);

                                        return (
                                            <div
                                                key={subchapter.level_id}
                                                onClick={() => {
                                                    if (!user) {
                                                        setShowLoginModal(true);
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
                            </div>
                        ) : trainingContent ? (
                            /* Content View */
                            <div className="max-w-4xl mx-auto">
                                <button
                                    onClick={() => {
                                        setTrainingContent(null);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="mb-6 flex items-center gap-2 text-orange-600 hover:text-orange-700 font-bold"
                                >
                                    ← {language === 'en' ? 'Back to Lessons' : 'পাঠে ফিরে যান'}
                                </button>

                                {/* Header */}
                                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white mb-6 shadow-lg">
                                    <div className="inline-block px-3 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-sm font-bold mb-3">
                                        {trainingContent.badge_name}
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2 reading-content">{trainingContent.level_title}</h2>
                                    <p className="text-sm opacity-90">Level {trainingContent.level_id}</p>
                                </div>

                                {/* Mission Briefing */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-5 rounded-r-xl mb-6">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">🎯</span>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">
                                                {language === 'en' ? 'Mission Briefing' : 'মিশন ব্রিফিং'}
                                            </h3>
                                            <p className="text-slate-700 dark:text-slate-300 reading-content leading-relaxed">
                                                {trainingContent.mission_briefing}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sections */}
                                {trainingContent.sections?.map((section, sIdx) => (
                                    <div key={sIdx} className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-6 shadow-sm border border-slate-200 dark:border-slate-700">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 reading-content">
                                            {section.title}
                                        </h3>
                                        <div className="space-y-6">
                                            {section.points?.map((point, pIdx) => (
                                                <div key={pIdx} className="border-l-2 border-orange-200 dark:border-orange-800 pl-4">
                                                    <h4 className="font-bold text-orange-600 dark:text-orange-400 mb-2 reading-content">
                                                        {point.item_name}
                                                    </h4>
                                                    {point.specifications && (
                                                        <div className="mb-3">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm">
                                                                    📋
                                                                </div>
                                                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                                                    {language === 'en' ? 'Details' : 'বিস্তারিত'}
                                                                </p>
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 reading-content leading-relaxed pl-8">
                                                                {point.specifications}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {point.importance && (
                                                        <div className="mb-3">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-sm">
                                                                    💡
                                                                </div>
                                                                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                                                    {language === 'en' ? 'Key Point' : 'মূল বিষয়'}
                                                                </p>
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 reading-content leading-relaxed pl-8">
                                                                {point.importance}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {point.daily_check && (
                                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm">
                                                                    ✓
                                                                </div>
                                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                                    {language === 'en' ? 'Quick Tip' : 'পরামর্শ'}
                                                                </p>
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-300 reading-content leading-relaxed pl-8">
                                                                {point.daily_check}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Pro Tips */}
                                {trainingContent.pro_tip && (
                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 mb-6 border border-emerald-200 dark:border-emerald-800">
                                        <div className="flex items-start gap-3 mb-4">
                                            <span className="text-2xl">💡</span>
                                            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 reading-content">
                                                {trainingContent.pro_tip.title}
                                            </h3>
                                        </div>
                                        <ul className="space-y-2">
                                            {trainingContent.pro_tip.content?.map((tip, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 reading-content leading-relaxed">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                                                    {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Myth Buster */}
                                {trainingContent.myth_buster && (
                                    <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-6 mb-6 border border-red-200 dark:border-red-800">
                                        <div className="flex items-start gap-3 mb-4">
                                            <span className="text-2xl">⚠️</span>
                                            <h3 className="text-lg font-bold text-red-700 dark:text-red-400 reading-content">
                                                {trainingContent.myth_buster.title}
                                            </h3>
                                        </div>
                                        <div className="space-y-4">
                                            {trainingContent.myth_buster.myths?.map((item, idx) => (
                                                <div key={idx} className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-4">
                                                    <div className="mb-3">
                                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-1">
                                                            {language === 'en' ? 'Myth' : 'মিথ'}
                                                        </p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 italic reading-content leading-relaxed">
                                                            "{item.myth}"
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">
                                                            {language === 'en' ? 'Reality' : 'বাস্তবতা'}
                                                        </p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 reading-content leading-relaxed">
                                                            {item.reality || item.fact}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Advanced Section */}
                                {trainingContent.advanced_section && (
                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-6 border border-indigo-200 dark:border-indigo-800">
                                        <div className="flex items-start gap-3 mb-4">
                                            <span className="text-2xl">🔬</span>
                                            <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 reading-content">
                                                {trainingContent.advanced_section.title}
                                            </h3>
                                        </div>
                                        <div className="space-y-4">
                                            {trainingContent.advanced_section.facts?.map((fact, idx) => (
                                                <div key={idx} className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-4">
                                                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-2 reading-content">
                                                        {fact.title}
                                                    </h4>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 reading-content leading-relaxed">
                                                        {fact.content}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Mark as Complete Button */}
                                <div className="space-y-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                                    {!completedLessons.includes(trainingContent.level_id) ? (
                                        <button
                                            onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                            className="w-full px-5 py-3 rounded-lg font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2"
                                        >
                                            <span>✓</span>
                                            {language === 'en' ? 'Mark as Complete' : 'সম্পন্ন হিসাবে চিহ্নিত করুন'}
                                        </button>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="w-full px-5 py-3 rounded-lg font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
                                                <span>✓</span>
                                                {language === 'en' ? 'Lesson Completed!' : 'পাঠ সম্পন্ন!'}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setTrainingContent(null);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="w-full px-5 py-3 rounded-lg font-bold transition-all bg-orange-600 text-white hover:bg-orange-700 flex items-center justify-center gap-2"
                                            >
                                                ← {language === 'en' ? 'Back to Lessons' : 'পাঠে ফিরে যান'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {activeTab === 'my_ppe' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.my_ppe.title}</h2>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <div className="p-8 text-center text-slate-400">Loading PPE list...</div>
                                ) : (
                                    ppeChecklist.map((item, idx) => (
                                        <div key={item.name} className={`p-3 sm:p-4 transition-colors ${item.available ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''}`}>
                                            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                                {/* Availability Checkbox */}
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.available}
                                                        onChange={(e) => handleChecklistChange(idx, 'available', e.target.checked)}
                                                        className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                                    />
                                                </div>

                                                {/* Icon & Name */}
                                                <div className="flex items-center gap-2 min-w-[140px] flex-1">
                                                    <span className="text-xl">{item.icon}</span>
                                                    <span className={`text-sm font-bold ${item.available ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                                                        {item.name}
                                                    </span>
                                                </div>

                                                {/* Compact Fields - Only show if available */}
                                                {item.available && (
                                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 ml-8 sm:ml-0">
                                                        {/* Qty */}
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] uppercase font-bold text-slate-400">Qty</span>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.count}
                                                                onChange={(e) => handleChecklistChange(idx, 'count', e.target.value)}
                                                                className="w-12 px-1 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                                                            />
                                                        </div>

                                                        {/* Quality */}
                                                        <select
                                                            value={item.condition}
                                                            onChange={(e) => handleChecklistChange(idx, 'condition', e.target.value)}
                                                            className="text-xs px-1 py-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                                                        >
                                                            <option value="Good">Good</option>
                                                            <option value="Fair">Fair</option>
                                                            <option value="Damaged">Damaged</option>
                                                        </select>

                                                        {/* Age */}
                                                        <select
                                                            value={item.age}
                                                            onChange={(e) => handleChecklistChange(idx, 'age', e.target.value)}
                                                            className="text-xs px-1 py-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                                                        >
                                                            <option value="<6m">&lt;6m</option>
                                                            <option value="6-12m">6-12m</option>
                                                            <option value="1-2y">1-2y</option>
                                                            <option value=">2y">&gt;2y</option>
                                                        </select>

                                                        {/* Usage */}
                                                        <select
                                                            value={item.usage}
                                                            onChange={(e) => handleChecklistChange(idx, 'usage', e.target.value)}
                                                            className="text-xs px-1 py-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                                                        >
                                                            <option value="Personal">Personal</option>
                                                            <option value="Shared">Shared</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-center">
                                <button
                                    onClick={handleSavePPE}
                                    disabled={isSaving}
                                    className={`px-10 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200 dark:shadow-none'}`}
                                >
                                    {isSaving ? 'Saving...' : 'Update PPE Status'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'report' && (
                    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-600 p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                                ⚠️
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t.report.title}</h2>
                        </div>

                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.location}</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-orange-500" placeholder="e.g. Sector 5, Pole 24" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.type}</label>
                                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-orange-500 bg-white dark:bg-slate-800">
                                        <option>Damaged Pole</option>
                                        <option>Loose Wire</option>
                                        <option>Sparking</option>
                                        <option>Tree Branch</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.desc}</label>
                                <textarea rows="4" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-orange-500" placeholder="Describe the issue..."></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.photo}</label>
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-all cursor-pointer">
                                    <span className="text-2xl block mb-2">📷</span>
                                    <span className="text-sm text-slate-500">Click to upload or take photo</span>
                                </div>
                            </div>

                            <button type="button" className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-md">
                                {t.report.form.submit}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Protocol Detail Modal */}
            <ProtocolDetailModal
                level={selectedLevel}
                onClose={() => setSelectedLevel(null)}
                language={language}
            />

            {/* Login Required Modal */}
            <LoginRequiredModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                language={language}
            />
            {/* Chapter Quiz Modal */}
            <ChapterQuizModal
                isOpen={showQuizModal}
                onClose={() => setShowQuizModal(false)}
                onComplete={handleQuizComplete}
                questions={currentQuizQuestions}
            />
        </div >
    );
}

const LoginRequiredModal = ({ isOpen, onClose, language }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-scale-in border border-slate-100 dark:border-slate-700">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                    🔒
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {language === 'en' ? 'Login Required' : 'লগইন প্রয়োজন'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    {language === 'en'
                        ? 'Please log in to access the training materials and track your progress.'
                        : 'প্রশিক্ষণ উপকরণ অ্যাক্সেস এবং আপনার অগ্রগতি ট্র্যাক করতে অনুগ্রহ করে লগ ইন করুন।'}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        {language === 'en' ? 'Close' : 'বন্ধ করুন'}
                    </button>
                    {/* Ideally this button would redirect to login, but for now we just show the message */}
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl font-bold bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/30"
                    >
                        {language === 'en' ? 'Got it' : 'বুঝেছি'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProtocolDetailModal = ({ level, onClose, language }) => {
    if (!level) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-700 animate-scale-in">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-800 p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xl font-bold">
                            {level.level_number}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">{level.level_name}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{level.focus}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-4 sm:p-6 space-y-6">
                    {/* Summary */}
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                        <p className={`reading-content font-medium ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {level.content.summary}
                        </p>
                    </div>

                    {/* Practical Tips */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                            <span>💡</span> {language === 'en' ? 'Practical Tips' : 'ব্যবহারিক টিপস'}
                        </h3>
                        <div className="space-y-3">
                            {level.content.practical_tips.map((tip, i) => (
                                <div key={i} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <span className="text-orange-500 font-bold">•</span>
                                    <p className={`reading-content text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>{tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Myths vs Facts */}
                    {level.content.myths_vs_facts && level.content.myths_vs_facts.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                <span>⚖️</span> {language === 'en' ? 'Myths vs Facts' : 'ভুল ধারণা বনাম বাস্তবতা'}
                            </h3>
                            <div className="space-y-4">
                                {level.content.myths_vs_facts.map((item, i) => (
                                    <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block mb-1">Myth</span>
                                            <p className={`reading-content text-xs ${language === 'bn' ? 'font-bengali' : ''}`}>{item.myth}</p>
                                        </div>
                                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
                                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider block mb-1">Fact</span>
                                            <p className={`reading-content text-xs font-medium ${language === 'bn' ? 'font-bengali' : ''}`}>{item.fact}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors"
                    >
                        {language === 'en' ? 'Got it' : 'বুঝেছি'}
                    </button>
                </div>
            </div>
        </div>

    );
};
