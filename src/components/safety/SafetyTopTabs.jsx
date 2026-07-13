/* eslint-disable react/prop-types */
import React from 'react';

const TABS = [
    { id: 'my_ppe', en: 'My PPE', bn: 'আমার পিপিই' },
    { id: 'safety-library', en: 'Safety Library', bn: 'সুরক্ষা লাইব্রেরি' },
];

export default function SafetyTopTabs({ current, onNavigate, language = 'bn', className = '' }) {
    return (
        <div
            role="tablist"
            aria-label={language === 'en' ? 'Safety sections' : 'সুরক্ষা বিভাগ'}
            className={`nb-segment flex items-center gap-0.5 p-0.5 ${className}`}
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
                        className={`flex-1 px-3 py-2 text-xs sm:text-sm font-black whitespace-nowrap transition-colors duration-150 ${
                            isActive
                                ? 'nb-segment__tab--active'
                                : 'nb-segment__tab text-slate-600 hover:bg-orange-50'
                        } ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {language === 'en' ? tab.en : tab.bn}
                    </button>
                );
            })}
        </div>
    );
}
