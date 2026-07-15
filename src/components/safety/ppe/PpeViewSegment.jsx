/* eslint-disable react/prop-types */
import React from 'react';

/** Figure | List pill segment — lives in PPE content, not the Safety shell header. */
export default function PpeViewSegment({ view, onChange, language = 'bn', className = '' }) {
    const isFigure = view === 'figure';
    const isList = view === 'list';
    const bn = language === 'bn';

    return (
        <div
            role="tablist"
            aria-label={bn ? 'দৃশ্য' : 'View'}
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border border-slate-200/80 bg-slate-100/90 p-0.5 shadow-sm ${className}`}
        >
            <button
                type="button"
                role="tab"
                aria-selected={isFigure}
                onClick={() => onChange('figure')}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 sm:text-[11px] ${
                    isFigure
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25'
                        : 'text-slate-600 hover:text-slate-900'
                } ${bn ? 'font-bengali' : ''}`}
            >
                {bn ? 'ছবি' : 'Figure'}
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={isList}
                onClick={() => onChange('list')}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95 sm:text-[11px] ${
                    isList
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25'
                        : 'text-slate-600 hover:text-slate-900'
                } ${bn ? 'font-bengali' : ''}`}
            >
                {bn ? 'তালিকা' : 'List'}
            </button>
        </div>
    );
}
