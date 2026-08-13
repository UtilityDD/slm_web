/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { CORE_PPE_ITEMS, OTHER_PPE_ITEMS, buildAnswersFromRows } from '../../../data/ppeItems';
import LinemanFigure from './LinemanFigure';
import PPEItemSheet from './PPEItemSheet';
import PPECompactList from './PPECompactList';
import PpeViewSegment from './PpeViewSegment';
import { fetchUserPPE, saveSinglePPEItem } from './ppeSave';

/**
 * Interactive lineman PPE hub — tap gear on the figure, update one item at a time.
 * Uses existing user_ppe table only; no score/profile/quiz changes.
 */
export default function LinemanPPEView({
    user,
    language = 'bn',
    embedded = false,
    view: controlledView,
    onViewChange,
}) {
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState([]);
    const [selectedName, setSelectedName] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveFlash, setSaveFlash] = useState(null);
    const [equipAnim, setEquipAnim] = useState(null); // { name, action: 'equip'|'unequip'|'update' }
    const [pendingUnequip, setPendingUnequip] = useState(null);
    const [internalView, setInternalView] = useState('figure'); // 'figure' | 'list'
    const view = controlledView ?? internalView;
    const setView = onViewChange ?? setInternalView;

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
            <div className="flex h-full min-h-0 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-14 w-14 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                    <p className="text-sm font-bold text-slate-500">
                        {language === 'en' ? 'Loading your gear...' : 'সরঞ্জাম লোড হচ্ছে...'}
                    </p>
                </div>
            </div>
        );
    }

    const selectedAnswer = answers.find((a) => a.name === selectedName);

    const pageTitle = language === 'en' ? 'My PPE' : 'আমার পিপিই';

    /** Fixed toolbar — same place for figure and list so the toggle never jumps. */
    const viewToolbar = (
        <div className={`shrink-0 ${embedded ? 'px-3 pt-2 sm:px-6' : 'px-4 pt-3 sm:px-6'}`}>
            <div className="mx-auto mb-3 w-full max-w-xs text-center">
                <h1
                    className={`text-xl font-black tracking-tight text-slate-900 sm:text-2xl ${
                        language === 'bn' ? 'font-bengali' : ''
                    }`}
                >
                    {pageTitle}
                </h1>
            </div>
            <div className="mx-auto flex w-full max-w-xs items-center justify-center">
                <PpeViewSegment view={view} onChange={setView} language={language} />
            </div>
        </div>
    );

    const figureBody = (
        <div className={`flex min-h-0 flex-1 flex-col w-full max-w-7xl mx-auto ${embedded ? 'px-3 sm:px-6' : 'px-4 sm:px-6'} pb-0 pt-2`}>
            <div className="mx-auto w-full max-w-xs shrink-0 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-bold text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en'
                            ? `${equipped}/${CORE_PPE_ITEMS.length} essentials`
                            : `অত্যাবশ্যক ${equipped}/${CORE_PPE_ITEMS.length}`}
                    </span>
                    <span className="text-[11px] font-black tabular-nums text-orange-600">{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                        className="h-full rounded-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <p className={`mt-1.5 text-center text-[10px] font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {language === 'en' ? 'Tap a badge on the lineman' : 'লাইনম্যানের ব্যাজে ট্যাপ করুন'}
                </p>
            </div>

            <div className="relative mt-2 flex w-full flex-1 min-h-0 items-start justify-center overflow-visible">
                <div className={`h-full w-full overflow-visible transition-transform duration-300 ${saveFlash?.action === 'equip' ? 'scale-[1.02]' : ''}`}>
                    <LinemanFigure
                        answers={displayAnswers}
                        selectedName={selectedName}
                        onSelectItem={setSelectedName}
                        language={language}
                        equipAnim={equipAnim}
                    />
                </div>
                {saveFlash && (
                    <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 animate-fadeIn rounded-full px-3.5 py-1.5 text-xs font-black text-white shadow-lg ${
                        saveFlash.action === 'unequip' ? 'bg-slate-600' : 'bg-emerald-600'
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
                    className="mx-auto mb-2 mt-2 flex w-full max-w-xs shrink-0 items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 text-sm">🧰</span>
                        <span className={`truncate text-xs font-bold text-slate-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {language === 'en' ? 'Others' : 'অন্যান্য'}
                        </span>
                        <span className="shrink-0 text-[11px] font-black tabular-nums text-orange-600">
                            {otherEquipped}/{OTHER_PPE_ITEMS.length}
                        </span>
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden>
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </button>
            )}
        </div>
    );

    const listBody = (
        <div className="min-h-0 flex-1 overflow-hidden">
            <PPECompactList
                answers={displayAnswers}
                language={language}
                onBack={() => setView('figure')}
                onSelectItem={setSelectedName}
                embedded={embedded}
                hideViewSegment
            />
        </div>
    );

    const content = (
        <>
            {viewToolbar}
            {view === 'list' ? listBody : figureBody}
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

    if (embedded) {
        return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
                {content}
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#fffdf7] text-slate-900 animate-fadeIn">
            {content}
        </div>
    );
}
