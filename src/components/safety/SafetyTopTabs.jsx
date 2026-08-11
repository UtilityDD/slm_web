/* eslint-disable react/prop-types */
import React from 'react';

const TABS = [
    { id: 'my_ppe', en: 'My PPE', bn: 'আমার পিপিই' },
    { id: 'safety-library', en: 'Identify', bn: 'চিনুন' },
];

export default function SafetyTopTabs({ current, onNavigate, language = 'bn', className = '' }) {
    return (
        <div
            role="tablist"
            aria-label={language === 'en' ? 'Safety sections' : 'সুরক্ষা বিভাগ'}
            className={`flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100/90 p-1 shadow-sm ${className}`}
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
                        className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-black transition-all duration-200 active:scale-[0.98] sm:text-sm ${
                            isActive
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                                : 'text-slate-600 hover:text-slate-900'
                        } ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {language === 'en' ? tab.en : tab.bn}
                    </button>
                );
            })}
        </div>
    );
}
