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
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-scale-in"
                role="dialog"
                aria-labelledby="hourly-penalty-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <h3
                    id="hourly-penalty-modal-title"
                    className={`text-base font-bold text-slate-900 dark:text-white ${bn ? 'font-bengali' : ''}`}
                >
                    {copy.title}
                </h3>
                <p className={`mt-2 text-sm text-slate-600 dark:text-slate-300 ${bn ? 'font-bengali' : ''}`}>
                    {copy.body}
                </p>
                <ul className={`mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400 ${bn ? 'font-bengali' : ''}`}>
                    {copy.tiers.map((line) => (
                        <li key={line}>{line}</li>
                    ))}
                </ul>
                <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                    {bn ? 'ঠিক আছে' : 'OK'}
                </button>
                {showDontShowAgain && (
                    <label
                        className={`mt-3 flex cursor-pointer items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 ${bn ? 'font-bengali' : ''}`}
                    >
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => onDontShowAgainChange?.(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/40"
                        />
                        {bn ? 'আর দেখাবেন না' : "Don't show again"}
                    </label>
                )}
            </div>
        </div>,
        document.body
    );
}
