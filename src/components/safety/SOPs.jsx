import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const SOPDetailModal = ({ level, onClose, language }) => {
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

const SOPCard = React.memo(({ level, index, onClick }) => (
    <div
        onClick={() => onClick(level)}
        className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition-all cursor-pointer group"
    >
        <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform">
                {index + 1}
            </div>
            <span className="text-slate-400 dark:text-slate-500">
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
        </div>
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-0.5">{level.level_name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{level.focus}</p>
    </div>
));

const GroupedSOPCard = React.memo(({ levels, onClick, language }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    return (
        <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20">
                        📋
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">
                            {language === 'bn' ? 'সব কাজের সাধারণ নিয়ম' : 'General Rules for All Work'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {language === 'bn' ? 'ধাপ ১ থেকে ৫' : 'Steps 1 to 5'}
                        </p>
                    </div>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 text-slate-400 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 animate-fade-in border-t border-slate-100 dark:border-slate-700 pt-6">
                    {levels.map((level, index) => (
                        <div
                            key={index}
                            onClick={() => onClick(level)}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer group transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm font-bold group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                {index + 1}
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                                {level.level_name}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

const SOPs = ({ language }) => {
    const [sopData, setSopData] = useState(null);
    const [carouselData, setCarouselData] = useState(null);
    const [fetchError, setFetchError] = useState(false);
    const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
    const [selectedLevel, setSelectedLevel] = useState(null);

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
        const fetchSOP = async () => {
            setFetchError(false);
            try {
                const fileName = language === 'en' ? 'protocol_en.json' : 'protocol.json';
                const response = await fetch(`/quizzes/${fileName}`);
                if (!response.ok) throw new Error('Failed to fetch SOP');
                const data = await response.json();
                setSopData(data);
            } catch (error) {
                console.error('Error fetching SOP:', error);
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

        fetchSOP();
        fetchCarousel();
    }, [language]);

    const nextRule = () => {
        setCurrentRuleIndex((prev) => (prev + 1) % activeRules.length);
    };

    const prevRule = () => {
        setCurrentRuleIndex((prev) => (prev - 1 + activeRules.length) % activeRules.length);
    };

    if (fetchError) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800 text-center">
                <p className="text-red-600 dark:text-red-400 font-medium">
                    {language === 'en' ? 'Failed to load SOP content.' : 'এসওপি কন্টেন্ট লোড করতে ব্যর্থ হয়েছে।'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition"
                >
                    {language === 'en' ? 'Retry' : 'পুনরায় চেষ্টা করুন'}
                </button>
            </div>
        );
    }

    if (!sopData) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">

            {/* Safety Rules Carousel */}
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl overflow-hidden group">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl animate-bounce-subtle">
                                {SAFETY_RULES[currentRuleIndex % SAFETY_RULES.length]?.icon || "🛡️"}
                            </span>
                            <div>
                                <h3 className="text-orange-400 font-bold uppercase tracking-wider text-xs mb-1">
                                    {language === 'en' ? 'Safety First' : 'সুরক্ষাই প্রথম'}
                                </h3>
                                <div className="text-white font-medium text-lg min-h-[3.5rem] flex items-center">
                                    {activeRules[currentRuleIndex]}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Indicators */}
                    <div className="flex justify-center gap-2 mt-4">
                        {activeRules.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentRuleIndex(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentRuleIndex ? 'w-8 bg-orange-500' : 'w-2 bg-slate-600 hover:bg-slate-500'}`}
                            ></button>
                        ))}
                    </div>

                    {/* Nav Buttons (Visible on Hover/Mobile) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); prevRule(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition lg:opacity-0 lg:group-hover:opacity-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); nextRule(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition lg:opacity-0 lg:group-hover:opacity-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            {/* SOP Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* General SOP Group (First 5) */}
                {sopData.levels && sopData.levels.length > 5 && (
                    <GroupedSOPCard
                        levels={sopData.levels.slice(0, 5)}
                        onClick={setSelectedLevel}
                        language={language}
                    />
                )}

                {/* Remaining SOPs */}
                {sopData.levels && sopData.levels.slice(5).map((level, index) => (
                    <SOPCard
                        key={index + 5}
                        level={level}
                        index={index + 5}
                        onClick={setSelectedLevel}
                    />
                ))}
            </div>

            {selectedLevel && createPortal(
                <SOPDetailModal
                    level={selectedLevel}
                    onClose={() => setSelectedLevel(null)}
                    language={language}
                />,
                document.body
            )}
        </div>
    );
};

export default SOPs;
