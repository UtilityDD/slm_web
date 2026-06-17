/* eslint-disable react/prop-types */
import React from 'react';
import { PPE_ITEMS, CORE_PPE_ITEMS, OTHER_PPE_ITEMS } from '../../../data/ppeItems';

function CompactRow({ item, answer, language, onSelect }) {
    const label = language === 'bn' ? item.bn : item.name;
    const has = answer?.available;
    const Tag = onSelect ? 'button' : 'div';

    return (
        <Tag
            type={onSelect ? 'button' : undefined}
            onClick={onSelect ? () => onSelect(item.name) : undefined}
            className={`w-full flex items-center gap-2.5 py-2.5 px-3 border-b border-slate-100 dark:border-slate-800 last:border-0 text-left ${
                onSelect ? 'hover:bg-orange-50/50 dark:hover:bg-orange-900/10 active:bg-orange-50 dark:active:bg-orange-900/20 transition-colors' : ''
            }`}
        >
            <span className="text-lg w-7 text-center shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${has ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    {label}
                </p>
                {has && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {answer.condition} · ×{answer.count} · {answer.usage === 'Shared' ? (language === 'en' ? 'Shared' : 'যৌথ') : (language === 'en' ? 'Personal' : 'ব্যক্তিগত')}
                    </p>
                )}
            </div>
            <div className="shrink-0 text-right">
                {has ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/25 px-2 py-1 rounded-full">
                        ✓ {language === 'en' ? 'Yes' : 'আছে'}
                    </span>
                ) : (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${
                        item.essential
                            ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/25'
                            : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                    }`}>
                        {language === 'en' ? 'No' : 'নেই'}
                    </span>
                )}
            </div>
        </Tag>
    );
}

function Section({ title, items, answers, language, onSelectItem }) {
    const answerMap = Object.fromEntries(answers.map((a) => [a.name, a]));
    const have = items.filter((i) => answerMap[i.name]?.available).length;

    return (
        <div className="mb-3">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-t-xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {title}
                </span>
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                    {have}/{items.length}
                </span>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {items.map((item) => (
                    <CompactRow key={item.name} item={item} answer={answerMap[item.name]} language={language} onSelect={onSelectItem} />
                ))}
            </div>
        </div>
    );
}

/**
 * Read-only compact PPE status list — no edit forms.
 */
export default function PPECompactList({ answers, language = 'bn', onBack, onSelectItem }) {
    const haveTotal = answers.filter((a) => a.available).length;
    const pct = Math.round((haveTotal / PPE_ITEMS.length) * 100);

    return (
        <div className="h-full min-h-full flex flex-col max-w-lg mx-auto w-full animate-fadeIn">
            {/* Header + back */}
            <div className="shrink-0 sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 px-3 py-2.5">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600 active:scale-95 transition-all shrink-0"
                        aria-label={language === 'en' ? 'Back' : 'ফিরে যান'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className={`text-base font-black text-slate-900 dark:text-white leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {language === 'en' ? 'My PPE List' : 'আমার পিপিই তালিকা'}
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {haveTotal}/{PPE_ITEMS.length} {language === 'en' ? 'items' : 'টি'} · {pct}%
                            {onSelectItem && (language === 'en' ? ' · tap to update' : ' · ট্যাপ করে আপডেট')}
                        </p>
                    </div>
                </div>
            </div>

            {/* List body */}
            <div className="flex-1 overflow-y-auto px-3 py-3 pb-4">
                <Section
                    title={language === 'en' ? 'Core gear' : 'মূল সরঞ্জাম'}
                    items={CORE_PPE_ITEMS}
                    answers={answers}
                    language={language}
                    onSelectItem={onSelectItem}
                />
                {OTHER_PPE_ITEMS.length > 0 && (
                    <Section
                        title={language === 'en' ? 'Other gear' : 'অন্যান্য সরঞ্জাম'}
                        items={OTHER_PPE_ITEMS}
                        answers={answers}
                        language={language}
                        onSelectItem={onSelectItem}
                    />
                )}
            </div>

            {/* Bottom back (thumb reach) */}
            <div className="shrink-0 px-3 py-3 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
                <button
                    type="button"
                    onClick={onBack}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                    {language === 'en' ? 'Back to figure' : 'ছবিতে ফিরে যান'}
                </button>
            </div>
        </div>
    );
}
