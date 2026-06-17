/* eslint-disable react/prop-types */
import React from 'react';

/**
 * Clean segmented control to switch between the My PPE (lineman) page and the
 * Safety Library page. Navigation only — no data/score side effects.
 */
const TABS = [
    { id: 'my_ppe', en: 'My PPE', bn: 'আমার পিপিই' },
    { id: 'safety-library', en: 'Safety Library', bn: 'সুরক্ষা লাইব্রেরি' },
];

export default function SafetyTopTabs({ current, onNavigate, language = 'bn', className = '' }) {
    return (
        <div
            role="tablist"
            aria-label={language === 'en' ? 'Safety sections' : 'সুরক্ষা বিভাগ'}
            className={`flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${className}`}
        >
            {TABS.map((tab) => {
                const isActive = current === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => { if (!isActive && onNavigate) onNavigate(tab.id); }}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                            isActive
                                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        } ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {language === 'en' ? tab.en : tab.bn}
                    </button>
                );
            })}
        </div>
    );
}
