/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PPE_ITEMS, CONDITIONS, AGE_OPTIONS } from '../../../data/ppeItems';

/**
 * Bottom sheet — quick tap-to-answer editor for one PPE item.
 */
export default function PPEItemSheet({ itemName, answer, language = 'bn', onSave, onClose, isSaving }) {
    const item = PPE_ITEMS.find((p) => p.name === itemName);
    const [draft, setDraft] = useState(() => ({
        available: answer?.available ?? false,
        count: answer?.count ?? 1,
        condition: answer?.condition ?? 'Good',
        age_months: answer?.age_months ?? 3,
        usage: answer?.usage ?? 'Personal'
    }));
    const [step, setStep] = useState(answer?.available ? 1 : 0);

    if (!item) return null;

    const label = language === 'bn' ? item.bn : item.name;

    const handleConfirm = async (finalDraft) => {
        await onSave({
            name: item.name,
            id: answer?.id || null,
            ...finalDraft
        });
    };

    const sheet = (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2rem] shadow-2xl animate-slide-up-fade max-h-[85vh] overflow-y-auto">
                {/* Handle + header */}
                <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 rounded-t-[2rem] border-b border-slate-100 dark:border-slate-800 px-6 pt-4 pb-3">
                    <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-3xl shrink-0">
                            {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className={`text-lg font-black text-slate-900 dark:text-white truncate ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {label}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {item.tip[language]}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5 pb-8 space-y-5">
                    {step === 0 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-base font-black text-center text-slate-800 dark:text-slate-100">
                                {language === 'en' ? `Do you have this?` : `এটি আপনার কাছে আছে?`}
                            </h3>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setDraft((d) => ({ ...d, available: true })); setStep(1); }}
                                    className="flex-1 py-5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 font-black text-emerald-700 dark:text-emerald-400 active:scale-95 transition-all"
                                >
                                    <span className="text-2xl block mb-1">✅</span>
                                    {language === 'en' ? 'Yes' : 'হ্যাঁ'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleConfirm({ ...draft, available: false })}
                                    disabled={isSaving}
                                    className="flex-1 py-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 font-black text-red-700 dark:text-red-400 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <span className="text-2xl block mb-1">❌</span>
                                    {language === 'en' ? "Don't have" : 'নেই'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-sm font-black text-center text-slate-700 dark:text-slate-200">
                                {language === 'en' ? 'Condition?' : 'অবস্থা কেমন?'}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {CONDITIONS.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => { setDraft((d) => ({ ...d, condition: c.value })); setStep(2); }}
                                        className={`py-3 rounded-xl font-bold text-sm border-2 active:scale-95 transition-all flex flex-col items-center gap-1 ${
                                            draft.condition === c.value
                                                ? `${c.color} text-white border-transparent`
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <span>{c.emoji}</span>
                                        <span>{language === 'bn' ? c.bn : c.en}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-sm font-black text-center text-slate-700 dark:text-slate-200">
                                {language === 'en' ? 'How many?' : 'কতগুলো?'}
                            </h3>
                            <div className="flex gap-2 justify-center">
                                {[1, 2, 3, 4].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => { setDraft((d) => ({ ...d, count: n })); setStep(3); }}
                                        className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 font-black text-lg text-orange-700 dark:text-orange-300 active:scale-95"
                                    >
                                        {n === 4 ? '3+' : n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-sm font-black text-center text-slate-700 dark:text-slate-200">
                                {language === 'en' ? 'Personal or shared?' : 'ব্যক্তিগত নাকি যৌথ?'}
                            </h3>
                            <div className="flex gap-3">
                                {['Personal', 'Shared'].map((u) => (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => { setDraft((d) => ({ ...d, usage: u })); setStep(4); }}
                                        className="flex-1 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-black text-sm active:scale-95"
                                    >
                                        {u === 'Personal' ? '👤' : '👥'}{' '}
                                        {language === 'en' ? u : u === 'Personal' ? 'ব্যক্তিগত' : 'যৌথ'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-sm font-black text-center text-slate-700 dark:text-slate-200">
                                {language === 'en' ? 'How old is it?' : 'বয়স কত?'}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {AGE_OPTIONS.map((a) => (
                                    <button
                                        key={a.value}
                                        type="button"
                                        onClick={() => handleConfirm({ ...draft, available: true, age_months: a.value })}
                                        disabled={isSaving}
                                        className="py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-100 dark:border-orange-800 font-bold text-sm active:scale-95 disabled:opacity-50 flex flex-col items-center gap-1"
                                    >
                                        <span>{a.emoji}</span>
                                        <span>{language === 'bn' ? a.bn : a.en}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step > 0 && step < 4 && (
                        <button
                            type="button"
                            onClick={() => setStep((s) => Math.max(0, s - 1))}
                            className="w-full py-2 text-sm font-bold text-slate-400"
                        >
                            ← {language === 'en' ? 'Back' : 'পিছনে'}
                        </button>
                    )}

                    {isSaving && (
                        <div className="text-center text-sm font-bold text-orange-600 animate-pulse">
                            {language === 'en' ? 'Saving...' : 'সংরক্ষণ হচ্ছে...'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(sheet, document.body);
}
