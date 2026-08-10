import React, { useState, useEffect, useMemo } from 'react';
import { PRACTICAL_FIELD_CHAPTERS } from '../../data/practicalFieldChapters';
import { storageUtils } from '../../utils/storageUtils';

const SearchIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const ChevronLeftIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m15 18-6-6 6-6" />
    </svg>
);

const ChevronRightIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6" />
    </svg>
);

function SectionHeading({ children, tone = 'slate', bn }) {
    const tones = {
        slate: 'text-slate-800',
        emerald: 'text-emerald-800',
        rose: 'text-rose-700',
        teal: 'text-teal-800',
        orange: 'text-orange-800',
    };
    return (
        <h2 className={`mb-3 text-sm font-black tracking-tight sm:text-base ${tones[tone] || tones.slate} ${bn ? 'font-bengali' : ''}`}>
            {children}
        </h2>
    );
}

function SoftPanel({ children, className = '' }) {
    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
            {children}
        </div>
    );
}

function ChapterDetailBody({ chapter, language }) {
    const bn = language === 'bn';
    const detail = bn ? chapter.detail_bn : chapter.detail_en;
    const hasDetail = Boolean(detail?.steps?.length);

    if (!hasDetail) {
        return (
            <div className="space-y-4">
                <p className={`text-sm font-semibold leading-relaxed text-slate-700 sm:text-base ${bn ? 'font-bengali' : ''}`}>
                    {bn ? chapter.desc_bn : chapter.desc_en}
                </p>
                <SoftPanel>
                    <ul className={`space-y-2.5 text-sm text-slate-800 ${bn ? 'font-bengali' : ''}`}>
                        {(bn ? chapter.topics_bn : chapter.topics_en)?.map((topic) => (
                            <li key={topic} className="flex items-start gap-2.5">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-hidden />
                                <span className="font-semibold">{topic}</span>
                            </li>
                        ))}
                    </ul>
                </SoftPanel>
                <p className={`text-xs font-semibold text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                    {bn ? 'সম্পূর্ণ অধ্যায় শীঘ্রই আসছে।' : 'Full chapter content is coming soon.'}
                </p>
            </div>
        );
    }

    return (
        <div className={bn ? 'font-bengali' : ''}>
            <p className="mb-5 text-sm font-semibold leading-relaxed text-slate-700 sm:text-base">
                {detail.intro}
            </p>

            <section className="mb-6">
                <SectionHeading tone="emerald" bn={bn}>
                    {bn ? 'লক্ষ্য' : 'Objectives'}
                </SectionHeading>
                <SoftPanel className="border-emerald-100 bg-emerald-50/40">
                    <ul className="space-y-2.5">
                        {detail.objectives?.map((item) => (
                            <li key={item} className="flex items-start gap-2.5 text-sm font-semibold text-slate-900 sm:text-base">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </SoftPanel>
            </section>

            {detail.tools?.length > 0 && (
                <section className="mb-6">
                    <SectionHeading tone="slate" bn={bn}>
                        {bn ? 'সরঞ্জাম' : 'Tools'}
                    </SectionHeading>
                    {typeof detail.tools[0] === 'object' ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {detail.tools.map((item) => (
                                <div
                                    key={item.name}
                                    className="flex flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition-transform active:scale-[0.98]"
                                >
                                    {item.image && (
                                        <div className="mb-2 flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-1">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </div>
                                    )}
                                    <span className="block text-center text-xs font-black leading-tight text-slate-900">
                                        {item.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <SoftPanel>
                            <ul className="space-y-1.5 text-xs font-semibold text-slate-800 sm:text-sm">
                                {detail.tools.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <span className="text-orange-500">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </SoftPanel>
                    )}
                </section>
            )}

            {detail.materials?.length > 0 && (
                <section className="mb-6">
                    <SectionHeading tone="slate" bn={bn}>
                        {bn ? 'উপকরণ' : 'Materials'}
                    </SectionHeading>
                    <SoftPanel>
                        <ul className="space-y-1.5 text-xs font-semibold text-slate-800 sm:text-sm">
                            {detail.materials.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <span className="text-orange-500">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </SoftPanel>
                </section>
            )}

            {detail.steps?.map((step) => (
                <section key={step.title} className="mb-6">
                    <h2 className="mb-2 text-base font-black text-slate-900 sm:text-lg">
                        {step.title}
                    </h2>
                    {step.note && (
                        <p className="mb-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-amber-950 sm:text-sm">
                            {step.note}
                        </p>
                    )}
                    {step.image && (
                        <div className="my-4 max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
                            {step.caption && (
                                <p className="mb-2 border-b border-dashed border-slate-200 pb-2 text-center text-xs font-bold text-slate-500">
                                    {step.caption}
                                </p>
                            )}
                            <img
                                src={step.image}
                                alt={step.caption || step.title}
                                className="h-auto w-full rounded-xl object-contain"
                            />
                        </div>
                    )}
                    <ol className="space-y-2.5">
                        {step.items.map((item, idx) => (
                            <li key={item} className="flex items-start gap-3 text-sm font-semibold leading-relaxed text-slate-900 sm:text-base">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white shadow-sm shadow-orange-500/25">
                                    {idx + 1}
                                </span>
                                <span className="pt-0.5">{item}</span>
                            </li>
                        ))}
                    </ol>
                </section>
            ))}

            {detail.safety?.length > 0 && (
                <section className="mb-6">
                    <SectionHeading tone="rose" bn={bn}>
                        {bn ? 'নিরাপত্তা' : 'Safety'}
                    </SectionHeading>
                    <SoftPanel className="border-rose-200/80 bg-rose-50/70">
                        <ul className="space-y-2">
                            {detail.safety.map((item) => (
                                <li key={item} className="flex items-start gap-2 text-xs font-semibold text-rose-950 sm:text-sm">
                                    <span className="mt-0.5 shrink-0 text-rose-500" aria-hidden>!</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </SoftPanel>
                </section>
            )}

            {detail.practical_tips?.length > 0 && (
                <section className="mb-6 border-t border-slate-200/80 pt-6">
                    <SectionHeading tone="teal" bn={bn}>
                        {bn ? 'বাস্তবক্ষেত্রের জরুরি টিপস' : 'Practical Field Tips'}
                    </SectionHeading>
                    <div className="space-y-3">
                        {detail.practical_tips.map((tip, idx) => (
                            <SoftPanel key={idx} className="border-teal-100 bg-teal-50/40">
                                <h3 className="mb-1.5 text-sm font-black text-teal-900">
                                    {tip.title}
                                </h3>
                                <p className="text-xs font-semibold leading-relaxed text-slate-700 sm:text-sm">{tip.text}</p>
                            </SoftPanel>
                        ))}
                    </div>
                </section>
            )}

            {detail.standard_values?.length > 0 && (
                <section className="mb-2">
                    <SectionHeading tone="slate" bn={bn}>
                        {detail.standard_values_title || (bn ? 'আর্থ রেজিস্ট্যান্সের আদর্শ মান' : 'Standard Earth Resistance Values')}
                    </SectionHeading>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                        <table className="w-full border-collapse text-left text-xs sm:text-sm">
                            <thead>
                                <tr className="border-b border-slate-200/80 bg-orange-50/80">
                                    <th className="p-3 font-black text-slate-900">
                                        {detail.standard_values_headers?.[0] || (bn ? 'ইনস্টলেশনের ধরন' : 'Installation Type')}
                                    </th>
                                    <th className="p-3 font-black text-slate-900">
                                        {detail.standard_values_headers?.[1] || (bn ? 'প্রস্তাবিত সর্বোচ্চ রোধ' : 'Recommended Max Resistance')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.standard_values.map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 last:border-none">
                                        <td className="p-3 font-semibold text-slate-800">
                                            {row.type}
                                        </td>
                                        <td className="p-3 font-black text-emerald-700">
                                            {row.value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}

export default function AroJanun({ language }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const bn = language === 'bn';

    const t = {
        en: {
            title: 'Know More',
            searchPlaceholder: 'Search chapter...',
            noResults: 'No chapters found',
            cancel: 'Cancel',
            read: 'Read',
            backToList: 'Back to chapters',
        },
        bn: {
            title: 'আরো জানুন',
            searchPlaceholder: 'অধ্যায় খুঁজুন...',
            noResults: 'কোনো অধ্যায় পাওয়া যায়নি',
            cancel: 'বাতিল',
            read: 'পড়ুন',
            backToList: 'অধ্যায়ের তালিকায় ফিরুন',
        },
    }[language];

    useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('dark');

        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const previousThemeColor = metaThemeColor?.getAttribute('content') || null;
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', '#fffdf7');

        return () => {
            const savedTheme = storageUtils.getItem('appTheme') || 'dark';
            if (savedTheme === 'dark') {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
            if (previousThemeColor) {
                metaThemeColor.setAttribute('content', previousThemeColor);
            }
        };
    }, []);

    const filteredChapters = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return PRACTICAL_FIELD_CHAPTERS;
        return PRACTICAL_FIELD_CHAPTERS.filter((chapter) => {
            const title = (language === 'en' ? chapter.title_en : chapter.title_bn).toLowerCase();
            const desc = (language === 'en' ? chapter.desc_en : chapter.desc_bn).toLowerCase();
            const topics = (language === 'en' ? chapter.topics_en : chapter.topics_bn).join(' ').toLowerCase();
            return title.includes(q) || desc.includes(q) || topics.includes(q) || chapter.code.toLowerCase().includes(q);
        });
    }, [language, searchQuery]);

    const searchInputClass =
        'w-full rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-orange-50/40 focus:ring-2 focus:ring-orange-200/60';

    const headerTitle = selectedChapter
        ? (language === 'en' ? selectedChapter.title_en : selectedChapter.title_bn)
        : t.title;

    return (
        <div className="min-h-screen bg-[#fffdf7] pb-24 text-slate-900">
            <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#fffdf7]/95 backdrop-blur">
                <div className="mx-auto max-w-7xl space-y-3 px-4 py-3 sm:px-8 sm:py-4">
                    <div className="flex items-center justify-between gap-4">
                        {!isSearchExpanded || selectedChapter ? (
                            <>
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    {selectedChapter ? (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedChapter(null)}
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
                                            aria-label={t.backToList}
                                        >
                                            <ChevronLeftIcon className="h-5 w-5" />
                                        </button>
                                    ) : null}
                                    <h1 className={`line-clamp-2 text-lg font-black tracking-tight text-slate-900 sm:text-2xl ${bn ? 'font-bengali' : ''}`}>
                                        {headerTitle}
                                    </h1>
                                </div>
                                {!selectedChapter && (
                                    <button
                                        type="button"
                                        onClick={() => setIsSearchExpanded(true)}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-all hover:bg-orange-50 active:scale-95 sm:hidden"
                                        aria-label={t.searchPlaceholder}
                                    >
                                        <SearchIcon className="h-5 w-5" />
                                    </button>
                                )}
                                {!selectedChapter && (
                                    <div className="relative hidden max-w-md flex-1 sm:block">
                                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder={t.searchPlaceholder}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className={searchInputClass}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-1 items-center gap-2">
                                <div className="relative min-w-0 flex-1">
                                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder={t.searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={searchInputClass}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}
                                    className={`shrink-0 rounded-full px-3 py-2 text-xs font-black text-orange-600 transition-colors hover:bg-orange-50 ${bn ? 'font-bengali' : 'uppercase tracking-wide'}`}
                                >
                                    {t.cancel}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl p-4 sm:p-8">
                {selectedChapter ? (
                    <article className="mx-auto max-w-3xl">
                        <div className="mb-5 flex flex-wrap items-center gap-2.5">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-200/80 bg-violet-50 text-2xl shadow-sm">
                                <span aria-hidden>{selectedChapter.icon}</span>
                            </div>
                            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                                {selectedChapter.code}
                            </span>
                            <span className="rounded-full border border-teal-200/80 bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-teal-800">
                                {bn ? selectedChapter.duration_bn : selectedChapter.duration_en}
                            </span>
                        </div>
                        <ChapterDetailBody chapter={selectedChapter} language={language} />
                    </article>
                ) : filteredChapters.length > 0 ? (
                    <div className="mx-auto max-w-4xl space-y-3">
                        {filteredChapters.map((chapter) => {
                            const title = bn ? chapter.title_bn : chapter.title_en;
                            const desc = bn ? chapter.desc_bn : chapter.desc_en;
                            const duration = bn ? chapter.duration_bn : chapter.duration_en;
                            const topics = bn ? chapter.topics_bn : chapter.topics_en;
                            return (
                                <button
                                    key={chapter.id}
                                    type="button"
                                    onClick={() => setSelectedChapter(chapter)}
                                    className="group flex w-full items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50/40 active:scale-[0.99] sm:gap-4 sm:p-5"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-200/70 bg-violet-50 text-xl shadow-sm sm:h-14 sm:w-14 sm:text-2xl">
                                        <span aria-hidden>{chapter.icon}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                                                {chapter.code}
                                            </span>
                                            <span className="text-[10px] font-bold text-teal-700">
                                                {duration}
                                            </span>
                                        </div>
                                        <h2 className={`mb-1.5 text-base font-black leading-snug text-slate-900 group-hover:text-orange-700 sm:text-lg ${bn ? 'font-bengali' : ''}`}>
                                            {title}
                                        </h2>
                                        <p className={`mb-2 text-sm font-medium leading-relaxed text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                                            {desc}
                                        </p>
                                        {topics?.length > 0 && (
                                            <p className={`text-xs font-semibold leading-relaxed text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                                                {topics.join(' · ')}
                                            </p>
                                        )}
                                    </div>
                                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-orange-500 opacity-70 transition-all group-hover:bg-orange-100 group-hover:opacity-100" aria-hidden>
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-sm">
                        <p className={`text-base font-black text-slate-700 ${bn ? 'font-bengali' : ''}`}>{t.noResults}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
