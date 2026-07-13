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
            className={`w-full flex items-center gap-2.5 py-2.5 px-3 border-b-2 border-slate-900 last:border-b-0 text-left bg-white ${
                onSelect ? 'hover:bg-orange-50 active:bg-orange-100 transition-colors' : ''
            }`}
        >
            <span className="text-lg w-7 text-center shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${has ? 'text-slate-900' : 'text-slate-400'}`}>
                    {label}
                </p>
                {has && (
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {answer.condition} · ×{answer.count} · {answer.usage === 'Shared' ? (language === 'en' ? 'Shared' : 'যৌথ') : (language === 'en' ? 'Personal' : 'ব্যক্তিগত')}
                    </p>
                )}
            </div>
            <div className="shrink-0 text-right">
                {has ? (
                    <span className="nb-tag inline-flex items-center gap-0.5 px-1.5 py-0.5 !bg-emerald-100 !text-emerald-800 text-[9px]">
                        ✓ {language === 'en' ? 'Yes' : 'আছে'}
                    </span>
                ) : (
                    <span className={`nb-tag inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] ${
                        item.essential
                            ? '!bg-red-100 !text-red-800'
                            : '!bg-slate-100 !text-slate-500'
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
            <div className="flex items-center justify-between px-3 py-2 border-2 border-b-0 border-slate-900 bg-orange-50">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 nb-mono">
                    {title}
                </span>
                <span className="text-[10px] font-black text-orange-600 tabular-nums">
                    {have}/{items.length}
                </span>
            </div>
            <div className="nb-card overflow-hidden p-0 !rounded-t-none border-t-0">
                {items.map((item) => (
                    <CompactRow key={item.name} item={item} answer={answerMap[item.name]} language={language} onSelect={onSelectItem} />
                ))}
            </div>
        </div>
    );
}

export default function PPECompactList({ answers, language = 'bn', onBack, onSelectItem, embedded = false }) {
    const haveTotal = answers.filter((a) => a.available).length;
    const pct = Math.round((haveTotal / PPE_ITEMS.length) * 100);

    return (
        <div className={`neo-brutal h-full min-h-0 flex flex-col max-w-lg mx-auto w-full ${embedded ? 'px-3 sm:px-6' : ''} animate-fadeIn`}>
            <div className={`shrink-0 ${embedded ? 'py-2' : 'px-3 py-3'}`}>
                <div className="nb-card px-3 py-2.5 bg-white">
                    <div className="flex items-center gap-2">
                        {!embedded && onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex items-center justify-center w-9 h-9 border-2 border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                                aria-label={language === 'en' ? 'Back' : 'ফিরে যান'}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div className="flex-1 min-w-0">
                            <h1 className={`text-sm font-black text-slate-900 leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {language === 'en' ? 'Gear list' : 'সরঞ্জাম তালিকা'}
                            </h1>
                            <p className="text-[11px] font-semibold text-slate-500">
                                {haveTotal}/{PPE_ITEMS.length} · {pct}%
                                {onSelectItem && (language === 'en' ? ' · tap to update' : ' · ট্যাপ করে আপডেট')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto py-1 pb-4">
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

            {!embedded && onBack && (
                <div className="shrink-0 px-3 py-3 border-t-2 border-slate-900 bg-[#fffdf7]">
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full nb-btn-secondary py-3 text-sm font-black flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                        {language === 'en' ? 'Back to figure' : 'ছবিতে ফিরে যান'}
                    </button>
                </div>
            )}
        </div>
    );
}
