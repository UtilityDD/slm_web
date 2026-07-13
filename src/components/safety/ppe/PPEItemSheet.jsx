/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PPE_ITEMS, CONDITIONS, AGE_OPTIONS } from '../../../data/ppeItems';

const choiceBtn = 'py-3 border-2 border-slate-900 bg-white font-bold text-sm text-slate-800 shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#0f172a] transition-transform';
const choiceBtnActive = 'py-3 border-2 border-slate-900 bg-orange-500 text-white font-bold text-sm shadow-[2px_2px_0_#0f172a]';

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
        <div className="neo-brutal fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/55 backdrop-blur-sm animate-fade-in">
            <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-[#fffdf7] border-t-[2.5px] border-x-[2.5px] border-slate-900 shadow-[0_-4px_0_#0f172a] animate-slide-up-fade max-h-[85vh] overflow-y-auto">
                <div className="nb-hazard shrink-0" aria-hidden="true" />

                <div className="sticky top-0 z-10 bg-[#fffdf7] border-b-2 border-slate-900 px-4 sm:px-6 pt-3 pb-3">
                    <div className="w-10 h-1.5 bg-slate-900 mx-auto mb-3" />
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 border-2 border-slate-900 bg-orange-50 flex items-center justify-center text-2xl shrink-0 shadow-[2px_2px_0_#0f172a]">
                            {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className={`text-base font-black text-slate-900 truncate ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {label}
                            </h2>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                {item.tip[language]}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center border-2 border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                            aria-label={language === 'en' ? 'Close' : 'বন্ধ'}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="px-4 sm:px-6 py-5 pb-8 space-y-5">
                    {step === 0 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-sm font-black text-center text-slate-900">
                                {language === 'en' ? 'Do you have this?' : 'এটি আপনার কাছে আছে?'}
                            </h3>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setDraft((d) => ({ ...d, available: true })); setStep(1); }}
                                    className="flex-1 py-4 border-2 border-slate-900 bg-emerald-50 font-black text-emerald-800 shadow-[3px_3px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5"
                                >
                                    <span className="text-2xl block mb-1">✅</span>
                                    {language === 'en' ? 'Yes' : 'হ্যাঁ'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleConfirm({ ...draft, available: false })}
                                    disabled={isSaving}
                                    className="flex-1 py-4 border-2 border-slate-900 bg-red-50 font-black text-red-800 shadow-[3px_3px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
                                >
                                    <span className="text-2xl block mb-1">❌</span>
                                    {language === 'en' ? "Don't have" : 'নেই'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-sm font-black text-center text-slate-900">
                                {language === 'en' ? 'Condition?' : 'অবস্থা কেমন?'}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {CONDITIONS.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => { setDraft((d) => ({ ...d, condition: c.value })); setStep(2); }}
                                        className={`flex flex-col items-center gap-1 active:scale-[0.98] transition-transform ${
                                            draft.condition === c.value
                                                ? `${c.color} text-white border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] py-3 font-bold text-sm`
                                                : choiceBtn
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
                            <h3 className="text-sm font-black text-center text-slate-900">
                                {language === 'en' ? 'How many?' : 'কতগুলো?'}
                            </h3>
                            <div className="flex gap-2 justify-center">
                                {[1, 2, 3, 4].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => { setDraft((d) => ({ ...d, count: n })); setStep(3); }}
                                        className={`w-14 h-14 font-black text-lg ${
                                            draft.count === n ? choiceBtnActive : choiceBtn
                                        }`}
                                    >
                                        {n === 4 ? '3+' : n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-sm font-black text-center text-slate-900">
                                {language === 'en' ? 'Personal or shared?' : 'ব্যক্তিগত নাকি যৌথ?'}
                            </h3>
                            <div className="flex gap-3">
                                {['Personal', 'Shared'].map((u) => (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => { setDraft((d) => ({ ...d, usage: u })); setStep(4); }}
                                        className={`flex-1 ${draft.usage === u ? choiceBtnActive : choiceBtn}`}
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
                            <h3 className="text-sm font-black text-center text-slate-900">
                                {language === 'en' ? 'How old is it?' : 'বয়স কত?'}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {AGE_OPTIONS.map((a) => (
                                    <button
                                        key={a.value}
                                        type="button"
                                        onClick={() => handleConfirm({ ...draft, available: true, age_months: a.value })}
                                        disabled={isSaving}
                                        className={`flex flex-col items-center gap-1 disabled:opacity-50 ${choiceBtn}`}
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
                            className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-800"
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
