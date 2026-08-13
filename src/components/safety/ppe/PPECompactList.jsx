/* eslint-disable react/prop-types */
import React from 'react';
import { PPE_ITEMS, CORE_PPE_ITEMS, OTHER_PPE_ITEMS } from '../../../data/ppeItems';
import PpeViewSegment from './PpeViewSegment';
import PpeItemIcon from './PpeItemIcon';

function CompactRow({ item, answer, language, onSelect }) {
    const label = language === 'bn' ? item.bn : item.name;
    const has = answer?.available;
    const Tag = onSelect ? 'button' : 'div';

    return (
        <Tag
            type={onSelect ? 'button' : undefined}
            onClick={onSelect ? () => onSelect(item.name) : undefined}
            className={`flex w-full items-center gap-2.5 border-b border-slate-100 bg-white px-3 py-2.5 text-left last:border-b-0 ${
                onSelect ? 'transition-colors hover:bg-orange-50 active:bg-orange-100' : ''
            }`}
        >
            <PpeItemIcon item={item} size="sm" rounded="rounded-lg" />
            <div className="min-w-0 flex-1">
                <p className={`truncate text-xs font-bold ${has ? 'text-slate-900' : 'text-slate-400'}`}>
                    {label}
                </p>
                {has && (
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                        {answer.condition} · ×{answer.count} · {answer.usage === 'Shared' ? (language === 'en' ? 'Shared' : 'যৌথ') : (language === 'en' ? 'Personal' : 'ব্যক্তিগত')}
                    </p>
                )}
            </div>
            <div className="shrink-0 text-right">
                {has ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                        ✓ {language === 'en' ? 'Yes' : 'আছে'}
                    </span>
                ) : (
                    <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${
                        item.essential
                            ? 'border-red-200/80 bg-red-50 text-red-800'
                            : 'border-slate-200/80 bg-slate-100 text-slate-500'
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
        <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-orange-50/90 px-3 py-2">
                <span className={`text-[10px] font-black text-slate-700 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                    {title}
                </span>
                <span className="text-[10px] font-black tabular-nums text-orange-600">
                    {have}/{items.length}
                </span>
            </div>
            <div>
                {items.map((item) => (
                    <CompactRow key={item.name} item={item} answer={answerMap[item.name]} language={language} onSelect={onSelectItem} />
                ))}
            </div>
        </div>
    );
}

export default function PPECompactList({
    answers,
    language = 'bn',
    onBack,
    onSelectItem,
    embedded = false,
    hideViewSegment = false,
    view = 'list',
    onViewChange,
}) {
    const haveTotal = answers.filter((a) => a.available).length;
    const pct = Math.round((haveTotal / PPE_ITEMS.length) * 100);
    const showSegment = !hideViewSegment && typeof onViewChange === 'function';

    return (
        <div className={`mx-auto flex h-full min-h-0 w-full max-w-lg flex-col ${embedded ? 'px-3 sm:px-6' : ''}`}>
            <div className={`shrink-0 ${embedded ? 'py-2' : 'px-3 py-3'}`}>
                <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                        {!embedded && onBack && !showSegment && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                                aria-label={language === 'en' ? 'Back' : 'ফিরে যান'}
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div className="min-w-0 flex-1">
                            <h1 className={`text-sm font-black leading-tight text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {language === 'en' ? 'Gear list' : 'সরঞ্জাম তালিকা'}
                            </h1>
                            <p className="text-[11px] font-semibold text-slate-500">
                                {haveTotal}/{PPE_ITEMS.length} · {pct}%
                                {onSelectItem && (language === 'en' ? ' · tap to update' : ' · ট্যাপ করে আপডেট')}
                            </p>
                        </div>
                        {showSegment && (
                            <PpeViewSegment view={view} onChange={onViewChange} language={language} />
                        )}
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-1 pb-4">
                <Section
                    title={language === 'en' ? 'Essential' : 'অত্যাবশ্যক'}
                    items={CORE_PPE_ITEMS}
                    answers={answers}
                    language={language}
                    onSelectItem={onSelectItem}
                />
                {OTHER_PPE_ITEMS.length > 0 && (
                    <Section
                        title={language === 'en' ? 'Others' : 'অন্যান্য'}
                        items={OTHER_PPE_ITEMS}
                        answers={answers}
                        language={language}
                        onSelectItem={onSelectItem}
                    />
                )}
            </div>

            {!embedded && onBack && !showSegment && (
                <div className="shrink-0 border-t border-slate-200/80 bg-[#fffdf7] px-3 py-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white py-3 text-sm font-black text-slate-800 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                        {language === 'en' ? 'Back to figure' : 'ছবিতে ফিরে যান'}
                    </button>
                </div>
            )}
        </div>
    );
}
