import React from 'react';
import { createPortal } from 'react-dom';
import { getHourlyPenaltyModalCopy } from '../utils/hourlyDifficulty';

export default function HourlyPenaltyInfoModal({
    open,
    language = 'en',
    lifetimePoints = 0,
    onClose,
    showDontShowAgain = false,
    dontShowAgain = false,
    onDontShowAgainChange,
}) {
    if (!open) return null;

    const copy = getHourlyPenaltyModalCopy(lifetimePoints, language);
    const bn = language === 'bn';

    return createPortal(
        <div
            className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/45 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-sm animate-slide-up-sheet sm:animate-scale-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="hourly-penalty-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
                    <div
                        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
                        aria-hidden="true"
                    />

                    <div className="p-5 pt-7 text-center sm:p-6 sm:text-left">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-sm sm:mx-0">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                <circle cx="12" cy="12" r="10" />
                                <path strokeLinecap="round" d="M12 6v6l4 2" />
                            </svg>
                        </div>

                        <h3
                            id="hourly-penalty-modal-title"
                            className={`mb-1 text-lg font-black text-slate-900 sm:text-xl ${bn ? 'font-bengali' : ''}`}
                        >
                            {copy.title}
                        </h3>
                        <p className={`text-[11px] font-black text-orange-600 ${bn ? 'font-bengali' : 'uppercase tracking-wide'}`}>
                            {copy.intro}
                        </p>
                        <p className={`mt-3 text-sm font-semibold leading-snug text-slate-700 ${bn ? 'font-bengali' : ''}`}>
                            {copy.body}
                        </p>

                        <p className={`mb-2 mt-4 text-[10px] font-black text-slate-500 ${bn ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                            {copy.tiersLabel}
                        </p>
                        <ul className={`space-y-1.5 ${bn ? 'font-bengali' : ''}`}>
                            {copy.tiers.map((line) => (
                                <li
                                    key={line}
                                    className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm"
                                >
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="border-t border-slate-200/80 bg-white/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-5 sm:pb-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`w-full min-h-[48px] rounded-full bg-orange-500 py-3 text-base font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] ${bn ? 'font-bengali' : ''}`}
                        >
                            {bn ? 'বুঝেছি' : 'Got it'}
                        </button>
                        {showDontShowAgain && (
                            <label
                                className={`mt-3 flex cursor-pointer items-center justify-center gap-2 text-xs font-bold text-slate-600 ${bn ? 'font-bengali' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={dontShowAgain}
                                    onChange={(e) => onDontShowAgainChange?.(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
                                />
                                {bn ? 'আর দেখাবেন না' : "Don't show again"}
                            </label>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
