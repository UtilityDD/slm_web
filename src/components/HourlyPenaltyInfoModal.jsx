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
            className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/55 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="neo-brutal w-full sm:max-w-sm animate-slide-up-sheet sm:animate-bounce-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="hourly-penalty-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="nb-card overflow-hidden p-0 rounded-none sm:rounded-lg border-t-[2.5px] sm:border-[2.5px] border-slate-900 shadow-[0_-4px_0_#0f172a] sm:shadow-[4px_4px_0_#0f172a]">
                    <div className="nb-hazard" aria-hidden="true" />

                    <div className="p-5 sm:p-6 text-center sm:text-left bg-[#fffdf7]">
                        <div className="nb-icon-badge w-12 h-12 flex items-center justify-center mx-auto sm:mx-0 mb-4 bg-orange-100 text-orange-700">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                <circle cx="12" cy="12" r="10" />
                                <path strokeLinecap="round" d="M12 6v6l4 2" />
                            </svg>
                        </div>

                        <h3
                            id="hourly-penalty-modal-title"
                            className={`text-lg sm:text-xl font-black text-slate-900 mb-1 nb-mono uppercase tracking-tight ${bn ? 'font-bengali normal-case tracking-normal' : ''}`}
                        >
                            {copy.title}
                        </h3>
                        <p className={`text-[11px] font-bold uppercase tracking-wide text-orange-600 nb-mono ${bn ? 'font-bengali normal-case' : ''}`}>
                            {copy.intro}
                        </p>
                        <p className={`mt-3 text-sm font-semibold leading-snug text-slate-700 ${bn ? 'font-bengali' : ''}`}>
                            {copy.body}
                        </p>

                        <p className={`mt-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 nb-mono ${bn ? 'font-bengali normal-case' : ''}`}>
                            {copy.tiersLabel}
                        </p>
                        <ul className={`space-y-1.5 ${bn ? 'font-bengali' : ''}`}>
                            {copy.tiers.map((line) => (
                                <li
                                    key={line}
                                    className="rounded-md border-2 border-slate-900 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-[2px_2px_0_#0f172a] nb-mono"
                                >
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-4 sm:p-5 border-t-2 border-slate-900 bg-white pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full min-h-[48px] py-3 nb-btn-primary font-black text-base"
                        >
                            {bn ? 'বুঝেছি' : 'Got it'}
                        </button>
                        {showDontShowAgain && (
                            <label
                                className={`mt-3 flex cursor-pointer items-center justify-center gap-2 text-xs font-bold text-slate-600 nb-mono ${bn ? 'font-bengali' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={dontShowAgain}
                                    onChange={(e) => onDontShowAgainChange?.(e.target.checked)}
                                    className="h-4 w-4 border-2 border-slate-900 text-orange-600 focus:ring-0 focus:ring-offset-0 rounded-none"
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
