/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';
import { cacheHelper } from '../../utils/cacheHelper';
import { PPE_ITEMS, CONDITIONS, AGE_OPTIONS, buildAnswersFromRows } from '../../data/ppeItems';
import LinemanPPEView from './ppe/LinemanPPEView';

// Phase: 'character' | 'welcome' | 'wizard' | 'summary'
const MyPPE = ({ user, language = 'bn', onClose, setCurrentView, embedded = false }) => {
    const [phase, setPhase] = useState('character');
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState([]); // {name, available, count, condition, age_months, usage}
    const [subStep, setSubStep] = useState(0); // 0=have?, 1=condition, 2=quantity, 3=age, 4=usage, 5=confirm
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [existingData, setExistingData] = useState([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [slideDir, setSlideDir] = useState('right'); // animation direction
    const cardRef = useRef(null);

    // Fetch existing data on mount
    useEffect(() => {
        fetchExistingData();
    }, [user]);

    const fetchExistingData = async () => {
        if (!user) {
            setLoading(false);
            initAnswers([]);
            return;
        }

        const cacheKey = `user_ppe_${user.id}`;
        const cached = cacheHelper.get(cacheKey);

        if (cached) {
            setExistingData(cached);
            initAnswers(cached);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('user_ppe')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const fetched = data || [];
            cacheHelper.set(cacheKey, fetched, 10);
            setExistingData(fetched);
            initAnswers(fetched);
        } catch (err) {
            console.error('Error fetching PPE:', err);
            initAnswers([]);
        } finally {
            setLoading(false);
        }
    };

    const initAnswers = (data) => {
        setAnswers(buildAnswersFromRows(data));
        setPhase('character');
    };

    const handleHave = (hasIt) => {
        const updated = [...answers];
        updated[currentStep] = { ...updated[currentStep], available: hasIt };
        setAnswers(updated);

        if (hasIt) {
            setSubStep(1);
        } else {
            setSubStep(5); // Show confirmation
        }
    };

    const handleCondition = (cond) => {
        const updated = [...answers];
        updated[currentStep] = { ...updated[currentStep], condition: cond };
        setAnswers(updated);
        setSubStep(2);
    };

    const handleQuantity = (qty) => {
        const updated = [...answers];
        updated[currentStep] = { ...updated[currentStep], count: qty };
        setAnswers(updated);
        setSubStep(3); // Go to age
    };

    const handleAge = (age_months) => {
        const updated = [...answers];
        updated[currentStep] = { ...updated[currentStep], age_months };
        setAnswers(updated);
        setSubStep(4); // Go to usage
    };

    const handleUsage = (usage) => {
        const updated = [...answers];
        updated[currentStep] = { ...updated[currentStep], usage };
        setAnswers(updated);
        setSubStep(5); // Show confirmation
    };

    const goToNextItem = () => {
        if (currentStep < PPE_ITEMS.length - 1) {
            setSlideDir('right');
            setCurrentStep(prev => prev + 1);
            setSubStep(0);
        } else {
            // Done! Save & show summary
            handleSave();
        }
    };

    const goToPrevItem = () => {
        if (currentStep > 0) {
            setSlideDir('left');
            setCurrentStep(prev => prev - 1);
            setSubStep(0);
        }
    };

    const handleSave = async () => {
        console.log('🔧 [MyPPE] Starting handleSave. user:', user?.id || 'NO USER');
        setIsSaving(true);
        setPhase('summary');

        if (!user) {
            console.warn('⚠️ [MyPPE] No user logged in — cannot save');
            setIsSaving(false);
            return;
        }

        try {
            const upsertItems = [];
            const deleteIds = [];

            for (const a of answers) {
                const details = `Usage: ${a.usage}`;

                if (a.available) {
                    upsertItems.push({
                        id: a.id || undefined, // Use undefined for new items
                        user_id: user.id,
                        name: a.name,
                        count: parseInt(a.count) || 1,
                        condition: a.condition,
                        age_months: parseInt(a.age_months) || 3,
                        details: details
                    });
                } else if (a.id) {
                    deleteIds.push(a.id);
                }
            }

            console.log('📦 [MyPPE] Saving data:', {
                upsertCount: upsertItems.length,
                deleteCount: deleteIds.length,
                table: 'user_ppe'
            });

            const operations = [];

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

            if (deleteIds.length > 0) {
                operations.push(
                    supabase
                        .from('user_ppe')
                        .delete()
                        .in('id', deleteIds)
                );
            }

            const results = await Promise.all(operations);

            let failed = false;
            results.forEach((res, idx) => {
                if (res.error) {
                    failed = true;
                    console.error(`❌ [MyPPE] Operation ${idx} failed:`, res.error);
                }
            });

            if (failed) {
                alert(language === 'en'
                    ? 'Failed to save some PPE items. Check console.'
                    : 'কিছু পিপিই সেভ করা যায়নি। কনসোল দেখুন।');
            } else {
                console.log('🎉 [MyPPE] PPE updated successfully!');
                cacheHelper.clear(`user_ppe_${user.id}`);
                await fetchExistingData();
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
                setPhase('character');
            }

        } catch (err) {
            console.error('💥 [MyPPE] Save error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const startWizard = () => {
        setPhase('wizard');
        setCurrentStep(0);
        setSubStep(0);
    };

    const editFromSummary = () => {
        setPhase('wizard');
        setCurrentStep(0);
        setSubStep(0);
    };

    const editItem = (itemName) => {
        const idx = PPE_ITEMS.findIndex(p => p.name === itemName);
        if (idx >= 0) {
            setPhase('wizard');
            setCurrentStep(idx);
            setSubStep(0);
        }
    };

    const haveItems = answers.filter(a => a.available);
    const missingItems = answers.filter(a => !a.available);
    const essentialMissing = missingItems.filter(a => PPE_ITEMS.find(p => p.name === a.name)?.essential);
    const progress = phase === 'wizard' ? ((currentStep + 1) / PPE_ITEMS.length) * 100 : 100;
    const currentItem = PPE_ITEMS[currentStep];

    // ========== WELCOME SCREEN ==========
    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-500 animate-pulse">
                        {language === 'en' ? 'Loading your gear...' : 'আপনার সরঞ্জাম লোড হচ্ছে...'}
                    </p>
                </div>
            </div>
        );
    }

    if (phase === 'character') {
        return (
            <LinemanPPEView
                user={user}
                language={language}
                onClose={onClose}
                setCurrentView={setCurrentView}
                embedded={embedded}
            />
        );
    }

    if (phase === 'welcome') {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-12 animate-fadeIn">
                <div className="max-w-sm w-full text-center space-y-8">
                    {/* Big Shield Animation */}
                    <div className="relative mx-auto w-32 h-32">
                        <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping"></div>
                        <div className="relative w-32 h-32 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/30">
                            <span className="text-6xl animate-bounce" style={{ animationDuration: '2s' }}>🛡️</span>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                            {language === 'en' ? 'My PPE Check' : 'আমার পিপিই চেক'}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            {language === 'en'
                                ? "Let's check what safety gear you have! It only takes a minute. Tap through each item — no typing needed! 🎯"
                                : "আসুন দেখি আপনার কাছে কোন সুরক্ষা সরঞ্জাম আছে! মাত্র এক মিনিটে হয়ে যাবে। প্রতিটি আইটেমে ট্যাপ করুন — টাইপ করার দরকার নেই! 🎯"}
                        </p>
                    </div>

                    {/* Item Preview Pills */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {PPE_ITEMS.slice(0, 6).map(item => (
                            <div key={item.name} className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-full text-xs font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1.5 border border-orange-100 dark:border-orange-800/30">
                                <span>{item.icon}</span>
                                <span>{language === 'bn' ? item.bn : item.name}</span>
                            </div>
                        ))}
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500">
                            +{PPE_ITEMS.length - 6} {language === 'en' ? 'more' : 'আরও'}
                        </div>
                    </div>

                    <button
                        onClick={startWizard}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <span>{language === 'en' ? "Let's Start!" : "শুরু করি!"}</span>
                        <span className="text-2xl">🚀</span>
                    </button>

                    {existingData.length > 0 && (
                        <button
                            onClick={() => setPhase('summary')}
                            className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            {language === 'en' ? 'View Current Status' : 'বর্তমান অবস্থা দেখুন'} →
                        </button>
                    )}

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-full py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors font-bold text-sm"
                        >
                            {language === 'en' ? '← Back to admin panel' : '← অ্যাডমিন প্যানেলে ফিরুন'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ========== WIZARD SCREEN ==========
    if (phase === 'wizard') {
        return (
            <div className="min-h-[70vh] flex flex-col px-4 py-4 animate-fadeIn">
                {/* Progress Bar */}
                <div className="max-w-lg mx-auto w-full mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                            {language === 'en' ? 'Progress' : 'অগ্রগতি'}
                        </span>
                        <span className="text-xs font-black text-slate-600 dark:text-slate-400">
                            {currentStep + 1} / {PPE_ITEMS.length}
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500 ease-out relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full"></div>
                        </div>
                    </div>
                    {/* Step dots */}
                    <div className="flex justify-between mt-2 px-0.5">
                        {PPE_ITEMS.map((_, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i < currentStep ? 'bg-orange-500' :
                                    i === currentStep ? 'bg-orange-600 scale-150' : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Main Card */}
                <div className="max-w-lg mx-auto w-full flex-1 flex flex-col" ref={cardRef}>
                    <div
                        key={`${currentStep}-${subStep}`}
                        className="flex-1 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col animate-slide-up-fade"
                    >
                        {/* Item Header */}
                        <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-6 text-white text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                            <div className="relative">
                                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/30 text-5xl">
                                    {currentItem.icon}
                                </div>
                                <h2 className="text-xl font-black">
                                    {language === 'bn' ? currentItem.bn : currentItem.name}
                                </h2>
                                <p className="text-orange-100 text-xs mt-1 font-medium opacity-90 italic">
                                    {currentItem.tip[language]}
                                </p>
                                {currentItem.essential && (
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-red-500/80 text-[9px] font-black uppercase tracking-wider rounded-full">
                                        {language === 'en' ? '★ Essential' : '★ অত্যাবশ্যক'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Question Area */}
                        <div className="flex-1 p-6 flex flex-col justify-center">
                            {subStep === 0 && (
                                <div className="space-y-4 text-center animate-fadeIn">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                                        {language === 'en'
                                            ? `Do you have a ${currentItem.name}?`
                                            : `আপনার কাছে ${currentItem.bn} আছে?`}
                                    </h3>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleHave(true)}
                                            className="flex-1 py-5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl font-black text-emerald-700 dark:text-emerald-400 text-lg active:scale-95 transition-all flex flex-col items-center gap-1"
                                        >
                                            <span className="text-3xl">✅</span>
                                            <span>{language === 'en' ? 'Yes!' : 'হ্যাঁ!'}</span>
                                        </button>
                                        <button
                                            onClick={() => handleHave(false)}
                                            className="flex-1 py-5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border-2 border-red-200 dark:border-red-800 rounded-2xl font-black text-red-700 dark:text-red-400 text-lg active:scale-95 transition-all flex flex-col items-center gap-1"
                                        >
                                            <span className="text-3xl">❌</span>
                                            <span>{language === 'en' ? 'No' : 'না'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {subStep === 1 && (
                                <div className="space-y-4 animate-fadeIn">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 text-center">
                                        {language === 'en' ? 'What condition is it in?' : 'এটির অবস্থা কেমন?'}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {CONDITIONS.map(c => (
                                            <button
                                                key={c.value}
                                                onClick={() => handleCondition(c.value)}
                                                className={`py-4 rounded-2xl font-bold text-sm border-2 active:scale-95 transition-all flex flex-col items-center gap-1 ${answers[currentStep]?.condition === c.value
                                                    ? `${c.color} text-white border-transparent shadow-lg`
                                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-300'
                                                    }`}
                                            >
                                                <span className="text-2xl">{c.emoji}</span>
                                                <span>{language === 'bn' ? c.bn : c.en}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {subStep === 2 && (
                                <div className="space-y-4 animate-fadeIn">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 text-center">
                                        {language === 'en' ? 'How many do you have?' : 'আপনার কাছে কতগুলো আছে?'}
                                    </h3>
                                    <div className="flex gap-3 justify-center">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button
                                                key={n}
                                                onClick={() => handleQuantity(n)}
                                                className={`w-14 h-14 rounded-2xl font-black text-xl border-2 active:scale-90 transition-all ${answers[currentStep]?.count === n
                                                    ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/20'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400'
                                                    }`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-center text-xs text-slate-400 mt-2">
                                        {language === 'en' ? 'Tap a number' : 'একটি সংখ্যায় ট্যাপ করুন'}
                                    </p>
                                </div>
                            )}

                            {subStep === 3 && (
                                <div className="space-y-4 animate-fadeIn">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 text-center">
                                        {language === 'en' ? 'How old is it?' : 'এটি কত পুরনো?'}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {AGE_OPTIONS.map(a => (
                                            <button
                                                key={a.value}
                                                onClick={() => handleAge(a.value)}
                                                className={`py-4 rounded-2xl font-bold text-sm border-2 active:scale-95 transition-all flex flex-col items-center gap-1 ${answers[currentStep]?.age_months === a.value
                                                    ? 'bg-orange-600 text-white border-orange-600 shadow-lg'
                                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-300'
                                                    }`}
                                            >
                                                <span className="text-2xl">{a.emoji}</span>
                                                <span>{language === 'bn' ? a.bn : a.en}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {subStep === 4 && (
                                <div className="space-y-4 animate-fadeIn">
                                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 text-center">
                                        {language === 'en' ? 'Is it personal or shared?' : 'এটি ব্যক্তিগত না শেয়ারড?'}
                                    </h3>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleUsage('Personal')}
                                            className="flex-1 py-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm active:scale-95 transition-all flex flex-col items-center gap-2 hover:border-orange-400"
                                        >
                                            <span className="text-3xl">👤</span>
                                            <span className="text-slate-800 dark:text-slate-200">{language === 'en' ? 'Personal' : 'ব্যক্তিগত'}</span>
                                            <span className="text-[10px] text-slate-400">{language === 'en' ? 'Only mine' : 'শুধু আমার'}</span>
                                        </button>
                                        <button
                                            onClick={() => handleUsage('Shared')}
                                            className="flex-1 py-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm active:scale-95 transition-all flex flex-col items-center gap-2 hover:border-orange-400"
                                        >
                                            <span className="text-3xl">👥</span>
                                            <span className="text-slate-800 dark:text-slate-200">{language === 'en' ? 'Shared' : 'শেয়ারড'}</span>
                                            <span className="text-[10px] text-slate-400">{language === 'en' ? 'Team use' : 'টিম ব্যবহার'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {subStep === 5 && (
                                <div className="space-y-5 text-center animate-fadeIn">
                                    {answers[currentStep]?.available ? (
                                        <>
                                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce" style={{ animationDuration: '1.5s', animationIterationCount: 1 }}>
                                                ✅
                                            </div>
                                            <h3 className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                                                {language === 'en' ? 'Recorded!' : 'রেকর্ড হয়েছে!'}
                                            </h3>
                                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 space-y-2 text-left border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{currentItem.icon}</span>
                                                    <span className="font-black text-slate-800 dark:text-slate-100">
                                                        {language === 'bn' ? currentItem.bn : currentItem.name}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 pl-10">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${answers[currentStep]?.condition === 'Good' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        answers[currentStep]?.condition === 'Fair' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {answers[currentStep]?.condition}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        ×{answers[currentStep]?.count}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400">
                                                        {AGE_OPTIONS.find(a => a.value === answers[currentStep]?.age_months)?.[language] || AGE_OPTIONS[0][language]}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        {answers[currentStep]?.usage === 'Shared' ? '👥' : '👤'} {answers[currentStep]?.usage}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-3xl">
                                                ❌
                                            </div>
                                            <h3 className="text-lg font-black text-red-600 dark:text-red-400">
                                                {language === 'en' ? 'Not Available' : 'নেই'}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {currentItem.essential
                                                    ? (language === 'en' ? '⚠️ This is an essential safety item!' : '⚠️ এটি একটি অত্যাবশ্যক সুরক্ষা সরঞ্জাম!')
                                                    : (language === 'en' ? 'No worries, this is optional.' : 'চিন্তার কিছু নেই, এটি ঐচ্ছিক।')
                                                }
                                            </p>
                                        </>
                                    )}
                                    <button
                                        onClick={goToNextItem}
                                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {currentStep < PPE_ITEMS.length - 1
                                            ? (language === 'en' ? 'Next Item →' : 'পরেরটি →')
                                            : (language === 'en' ? 'Finish & Save ✨' : 'শেষ করুন ও সংরক্ষণ করুন ✨')
                                        }
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-center mt-4 px-2">
                        <button
                            onClick={goToPrevItem}
                            disabled={currentStep === 0}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            ← {language === 'en' ? 'Back' : 'পিছনে'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========== SUMMARY SCREEN ==========
    if (phase === 'summary') {
        const safetyScore = Math.round((haveItems.length / PPE_ITEMS.length) * 100);
        const essentialScore = PPE_ITEMS.filter(p => p.essential).length;
        const essentialHave = haveItems.filter(a => PPE_ITEMS.find(p => p.name === a.name)?.essential).length;

        return (
            <div className="px-4 py-6 pb-24 animate-fadeIn max-w-lg mx-auto">
                {/* Confetti Effect */}
                {showConfetti && createPortal(
                    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute animate-confetti"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: '-5%',
                                    animationDelay: `${Math.random() * 2}s`,
                                    animationDuration: `${2 + Math.random() * 2}s`,
                                    fontSize: `${16 + Math.random() * 16}px`
                                }}
                            >
                                {['🎉', '⭐', '✨', '🛡️', '💪', '🎊'][Math.floor(Math.random() * 6)]}
                            </div>
                        ))}
                    </div>,
                    document.body
                )}

                {/* Score Card */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-3xl p-6 text-white text-center mb-6 shadow-xl shadow-orange-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="relative">
                        <div className="text-5xl font-black mb-1">{safetyScore}%</div>
                        <p className="text-orange-100 text-sm font-bold mb-3">
                            {language === 'en' ? 'Safety Gear Score' : 'সুরক্ষা সরঞ্জাম স্কোর'}
                        </p>
                        <div className="flex justify-center gap-4 text-xs">
                            <div className="bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                ✅ {haveItems.length} {language === 'en' ? 'Have' : 'আছে'}
                            </div>
                            <div className="bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                ❌ {missingItems.length} {language === 'en' ? 'Missing' : 'নেই'}
                            </div>
                        </div>
                        {essentialMissing.length > 0 && (
                            <div className="mt-3 bg-red-600/50 px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-sm animate-pulse">
                                ⚠️ {essentialMissing.length} {language === 'en' ? 'essential items missing!' : 'টি অত্যাবশ্যক সরঞ্জাম নেই!'}
                            </div>
                        )}
                        {essentialMissing.length === 0 && haveItems.length > 0 && (
                            <div className="mt-3 bg-emerald-600/50 px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-sm">
                                🎉 {language === 'en' ? 'All essential items covered!' : 'সব অত্যাবশ্যক সরঞ্জাম আছে!'}
                            </div>
                        )}
                    </div>
                </div>

                {/* You Have Section */}
                {haveItems.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-black text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2 uppercase tracking-wide px-1">
                            <span className="text-lg">✅</span>
                            {language === 'en' ? 'You Have' : 'আপনার কাছে আছে'} ({haveItems.length})
                        </h3>
                        <div className="space-y-2">
                            {haveItems.map(a => {
                                const item = PPE_ITEMS.find(p => p.name === a.name);
                                const condColor = a.condition === 'Good' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' :
                                    a.condition === 'Fair' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' :
                                        'text-red-600 bg-red-50 dark:bg-red-900/20';
                                return (
                                    <div key={a.name} onClick={() => editItem(a.name)} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3 shadow-sm cursor-pointer hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md active:scale-[0.98] transition-all">
                                        <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
                                            {item?.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                                                {language === 'bn' ? item?.bn : a.name}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${condColor}`}>
                                                    {a.condition}
                                                </span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                                    ×{a.count}
                                                </span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                                    {a.usage === 'Shared' ? '👥' : '👤'} {a.usage}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-slate-300 dark:text-slate-600 text-xs">✏️</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* You Don't Have Section */}
                {missingItems.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-black text-red-700 dark:text-red-400 mb-3 flex items-center gap-2 uppercase tracking-wide px-1">
                            <span className="text-lg">❌</span>
                            {language === 'en' ? "You Don't Have" : 'আপনার কাছে নেই'} ({missingItems.length})
                        </h3>
                        <div className="space-y-2">
                            {missingItems.map(a => {
                                const item = PPE_ITEMS.find(p => p.name === a.name);
                                return (
                                    <div key={a.name} onClick={() => editItem(a.name)} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-red-100 dark:border-red-900/30 flex items-center gap-3 shadow-sm opacity-70 cursor-pointer hover:opacity-100 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md active:scale-[0.98] transition-all">
                                        <div className="w-11 h-11 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-2xl shrink-0 grayscale">
                                            {item?.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                                                {language === 'bn' ? item?.bn : a.name}
                                            </h4>
                                            {item?.essential && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 mt-1 inline-block">
                                                    ⚠️ {language === 'en' ? 'Required' : 'প্রয়োজনীয়'}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-slate-300 dark:text-slate-600 text-xs">✏️</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 mt-8">
                    <button
                        onClick={() => setPhase('character')}
                        className="w-full py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-xl font-bold text-sm hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all"
                    >
                        {language === 'en' ? '← Back to Lineman' : '← আমার পিপিই-তে ফিরে যান'}
                    </button>
                    <button
                        onClick={editFromSummary}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span>🔄</span>
                        {language === 'en' ? 'Update PPE' : 'পিপিই আপডেট করুন'}
                    </button>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            {language === 'en' ? '← Done, back to admin panel' : '← সম্পন্ন, অ্যাডমিনে ফিরুন'}
                        </button>
                    )}

                    {isSaving && (
                        <div className="text-center text-sm text-orange-600 font-bold animate-pulse">
                            {language === 'en' ? 'Saving...' : 'সংরক্ষণ হচ্ছে...'}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default MyPPE;
