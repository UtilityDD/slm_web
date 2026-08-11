import React from 'react';
import { createPortal } from 'react-dom';
import { getEncouragementCopy } from '../utils/monthlyEncouragementBoards';

/** Short board rules only — standings stay on the page. */
export default function MonthlyBoardInfoModal({
    open,
    onClose,
    language = 'bn',
    meta,
}) {
    if (!open) return null;

    const copy = getEncouragementCopy(language);
    const bn = language === 'bn';

    return createPortal(
        <div
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-scale-in"
                role="dialog"
                aria-labelledby="monthly-board-info-title"
                onClick={(e) => e.stopPropagation()}
            >
                <h3
                    id="monthly-board-info-title"
                    className={`text-base font-bold text-slate-900 dark:text-white ${bn ? 'font-bengali' : ''}`}
                >
                    {meta?.title || (bn ? 'নিয়ম' : 'Rules')}
                </h3>

                <div className={`mt-3 space-y-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200 ${bn ? 'font-bengali' : ''}`}>
                    {meta?.logic && <p>{meta.logic}</p>}
                    <p>{copy.prizeRule}</p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                    {bn ? 'ঠিক আছে' : 'OK'}
                </button>
            </div>
        </div>,
        document.body
    );
}
