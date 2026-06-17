/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { CORE_PPE_ITEMS, OTHER_PPE_ITEMS, buildAnswersFromRows } from '../../../data/ppeItems';
import LinemanFigure from './LinemanFigure';
import PPEItemSheet from './PPEItemSheet';
import PPECompactList from './PPECompactList';
import SafetyTopTabs from '../SafetyTopTabs';
import { fetchUserPPE, saveSinglePPEItem } from './ppeSave';

/**
 * Interactive lineman PPE hub — tap gear on the figure, update one item at a time.
 * Uses existing user_ppe table only; no score/profile/quiz changes.
 */
export default function LinemanPPEView({ user, language = 'bn', onClose, setCurrentView }) {
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState([]);
    const [selectedName, setSelectedName] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveFlash, setSaveFlash] = useState(null);
    const [equipAnim, setEquipAnim] = useState(null); // { name, action: 'equip'|'unequip'|'update' }
    const [pendingUnequip, setPendingUnequip] = useState(null);
    const [view, setView] = useState('figure'); // 'figure' | 'list'

    const loadData = useCallback(async () => {
        if (!user?.id) {
            setAnswers(buildAnswersFromRows([]));
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const rows = await fetchUserPPE(user.id);
            setAnswers(buildAnswersFromRows(rows));
        } catch (err) {
            console.error('[LinemanPPE] fetch error:', err);
            setAnswers(buildAnswersFromRows([]));
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSaveItem = async (updated) => {
        if (!user?.id) return;
        setIsSaving(true);
        const prev = answers.find((a) => a.name === updated.name);
        const wasAvailable = !!prev?.available;

        try {
            const saved = await saveSinglePPEItem(user.id, updated);

            if (!saved.available && wasAvailable) {
                setPendingUnequip(saved.name);
                setAnswers((p) => p.map((a) => (a.name === saved.name ? saved : a)));
                setEquipAnim({ name: saved.name, action: 'unequip' });
                setSaveFlash({ name: saved.name, action: 'unequip' });
                setTimeout(() => {
                    setPendingUnequip(null);
                    setEquipAnim(null);
                    setSaveFlash(null);
                }, 480);
            } else {
                setAnswers((p) => p.map((a) => (a.name === saved.name ? saved : a)));
                const action = saved.available ? (wasAvailable ? 'update' : 'equip') : 'unequip';
                setEquipAnim({ name: saved.name, action });
                setSaveFlash({ name: saved.name, action });
                setTimeout(() => {
                    setEquipAnim(null);
                    setSaveFlash(null);
                }, 520);
            }

            setSelectedName(null);
            if (view === 'list' && saved.available && !wasAvailable) {
                setView('figure');
            }
        } catch (err) {
            console.error('[LinemanPPE] save error:', err);
            alert(language === 'en' ? 'Could not save. Try again.' : 'সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।');
        } finally {
            setIsSaving(false);
        }
    };

    const displayAnswers = pendingUnequip
        ? answers.map((a) => (a.name === pendingUnequip ? { ...a, available: true } : a))
        : answers;

    const coreNames = new Set(CORE_PPE_ITEMS.map((p) => p.name));
    const equipped = displayAnswers.filter((a) => a.available && coreNames.has(a.name)).length;
    const pct = Math.round((equipped / CORE_PPE_ITEMS.length) * 100);

    const otherNames = new Set(OTHER_PPE_ITEMS.map((p) => p.name));
    const otherEquipped = displayAnswers.filter((a) => a.available && otherNames.has(a.name)).length;

    if (loading) {
        return (
            <div className="h-full min-h-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-500">
                        {language === 'en' ? 'Loading your gear...' : 'সরঞ্জাম লোড হচ্ছে...'}
                    </p>
                </div>
            </div>
        );
    }

    const selectedAnswer = answers.find((a) => a.name === selectedName);

    if (view === 'list') {
        return (
            <>
                <PPECompactList
                    answers={displayAnswers}
                    language={language}
                    onBack={() => setView('figure')}
                    onSelectItem={setSelectedName}
                />
                {selectedName && (
                    <PPEItemSheet
                        itemName={selectedName}
                        answer={selectedAnswer}
                        language={language}
                        isSaving={isSaving}
                        onClose={() => setSelectedName(null)}
                        onSave={handleSaveItem}
                    />
                )}
            </>
        );
    }

    return (
        <div className="neo-brutal flex flex-col w-full h-full min-h-0 overflow-hidden text-slate-900 animate-fadeIn">
            <div className="nb-hazard" aria-hidden="true" />

            {/* Header band — identical to Safety Library */}
            <div className="shrink-0 bg-[#fffdf7] py-4 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between gap-4">
                        {setCurrentView ? (
                            <div className="flex items-center gap-3 flex-1 min-w-0 animate-in fade-in slide-in-from-left-4 duration-300">
                                <SafetyTopTabs
                                    current="my_ppe"
                                    onNavigate={setCurrentView}
                                    language={language}
                                    className="flex-1 min-w-0 max-w-sm"
                                />
                            </div>
                        ) : (
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                {language === 'en' ? 'My PPE' : 'আমার পিপিই'}
                            </h1>
                        )}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className="shrink-0 px-3 py-2 border-2 border-slate-900 bg-white text-slate-900 text-xs font-black shadow-[3px_3px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#0f172a] transition-transform"
                            >
                                {language === 'en' ? 'List' : 'তালিকা'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-0">

            {/* Equipped progress status */}
            <div className="shrink-0 w-full max-w-xs mx-auto">
                <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-bold text-slate-500 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en'
                            ? `${equipped}/${CORE_PPE_ITEMS.length} equipped`
                            : `${CORE_PPE_ITEMS.length}টির মধ্যে ${equipped}টি আছে`}
                    </span>
                    <span className="text-[11px] font-black text-orange-600 dark:text-orange-400 tabular-nums">{pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            <p className={`shrink-0 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-tight mt-1.5 ${language === 'bn' ? 'font-bengali' : ''}`}>
                {language === 'en' ? 'Tap a badge to update' : 'ব্যাজে ট্যাপ করে আপডেট করুন'}
            </p>

            {/* Lineman figure — fills remaining viewport height, sits right below the hint */}
            <div className="flex-1 min-h-0 w-full relative overflow-visible flex items-start justify-center">
                <div className={`h-full w-full transition-transform duration-300 overflow-visible ${saveFlash?.action === 'equip' ? 'scale-[1.02]' : ''}`}>
                    <LinemanFigure
                        answers={displayAnswers}
                        selectedName={selectedName}
                        onSelectItem={setSelectedName}
                        language={language}
                        equipAnim={equipAnim}
                    />
                </div>
                {saveFlash && (
                    <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-black shadow-lg animate-fadeIn ${
                        saveFlash.action === 'unequip' ? 'bg-slate-500' : 'bg-emerald-500'
                    }`}>
                        {saveFlash.action === 'unequip'
                            ? (language === 'en' ? 'Removed' : 'সরানো হয়েছে')
                            : saveFlash.action === 'update'
                                ? (language === 'en' ? 'Updated!' : 'আপডেট!')
                                : (language === 'en' ? 'Equipped!' : 'যোগ হয়েছে!')}
                    </div>
                )}
            </div>

            {OTHER_PPE_ITEMS.length > 0 && (
                <button
                    type="button"
                    onClick={() => setView('list')}
                    className="shrink-0 mt-2 mb-1 w-full max-w-xs mx-auto flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all"
                >
                    <span className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">🧰</span>
                        <span className={`text-xs font-bold text-slate-700 dark:text-slate-200 truncate ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {language === 'en' ? 'Other gear' : 'অন্যান্য সরঞ্জাম'}
                        </span>
                        <span className="text-[11px] font-black text-orange-600 dark:text-orange-400 tabular-nums shrink-0">
                            {otherEquipped}/{OTHER_PPE_ITEMS.length}
                        </span>
                    </span>
                    <span className={`flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en' ? 'View & update' : 'দেখুন ও আপডেট করুন'}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden>
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                    </span>
                </button>
            )}
            </div>

            {selectedName && (
                <PPEItemSheet
                    itemName={selectedName}
                    answer={selectedAnswer}
                    language={language}
                    isSaving={isSaving}
                    onClose={() => setSelectedName(null)}
                    onSave={handleSaveItem}
                />
            )}
        </div>
    );
}
