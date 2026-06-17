/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { CORE_PPE_ITEMS, buildAnswersFromRows } from '../../../data/ppeItems';
import LinemanFigure from './LinemanFigure';
import PPEItemSheet from './PPEItemSheet';
import PPECompactList from './PPECompactList';
import { fetchUserPPE, saveSinglePPEItem } from './ppeSave';

/**
 * Interactive lineman PPE hub — tap gear on the figure, update one item at a time.
 * Uses existing user_ppe table only; no score/profile/quiz changes.
 */
export default function LinemanPPEView({ user, language = 'bn', onClose }) {
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

    if (loading) {
        return (
            <div className="h-[calc(100dvh-5.25rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-3rem)] flex items-center justify-center">
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
        <div className="flex flex-col w-full max-w-lg md:max-w-xl mx-auto px-2 sm:px-3 pt-1.5 pb-1 animate-fadeIn overflow-hidden h-[calc(100dvh-5.25rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-3rem)]">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between gap-2 mb-0.5">
                <div className="min-w-0">
                    <h1 className={`text-base font-black text-slate-900 dark:text-white leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en' ? 'My PPE' : 'আমার পিপিই'}
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {language === 'en' ? 'Tap a badge to update' : 'ব্যাজে ট্যাপ করে আপডেট করুন'}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg px-2.5 py-1 text-white text-center leading-none">
                        <div className="text-base font-black">{pct}%</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        {language === 'en' ? 'List' : 'তালিকা'}
                    </button>
                </div>
            </div>

            {/* Lineman figure — fills remaining viewport height */}
            <div className="flex-1 min-h-0 w-full relative overflow-visible">
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
