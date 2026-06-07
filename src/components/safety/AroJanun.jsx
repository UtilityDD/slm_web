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

function ChapterDetailBody({ chapter, language }) {
    const detail = language === 'bn' ? chapter.detail_bn : chapter.detail_en;
    const hasDetail = Boolean(detail?.steps?.length);

    if (!hasDetail) {
        return (
            <div className="space-y-4">
                <p className={`text-sm font-semibold leading-relaxed text-slate-700 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {language === 'en' ? chapter.desc_en : chapter.desc_bn}
                </p>
                <ul className={`space-y-2 text-sm text-slate-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {(language === 'en' ? chapter.topics_en : chapter.topics_bn)?.map((topic) => (
                        <li key={topic} className="flex items-start gap-2">
                            <span className="mt-1.5 h-2 w-2 shrink-0 border border-slate-900 bg-orange-500" aria-hidden />
                            <span className="font-semibold">{topic}</span>
                        </li>
                    ))}
                </ul>
                <p className={`text-xs font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {language === 'en' ? 'Full chapter content is coming soon.' : 'সম্পূর্ণ অধ্যায় শীঘ্রই আসছে।'}
                </p>
            </div>
        );
    }

    return (
        <div className={language === 'bn' ? 'font-bengali' : ''}>
            <p className="mb-5 text-sm font-semibold leading-relaxed text-slate-800 sm:text-base">
                {detail.intro}
            </p>

            <section className="mb-6">
                <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-emerald-800 nb-mono">
                    {language === 'en' ? 'Objectives' : 'লক্ষ্য'}
                </h2>
                <ul className="space-y-2">
                    {detail.objectives?.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm font-semibold text-slate-900 sm:text-base">
                            <span className="mt-1.5 h-2 w-2 shrink-0 border border-slate-900 bg-emerald-500" aria-hidden />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </section>

            {detail.tools?.length > 0 && (
                <section className="mb-6">
                    <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-800 nb-mono">
                        {language === 'en' ? 'Tools' : 'সরঞ্জাম'}
                    </h2>
                    <ul className="nb-card space-y-1.5 bg-white p-4 text-xs font-semibold text-slate-800 sm:text-sm">
                        {detail.tools.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                                <span className="text-orange-600">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {detail.materials?.length > 0 && (
                <section className="mb-6">
                    <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-800 nb-mono">
                        {language === 'en' ? 'Materials' : 'উপকরণ'}
                    </h2>
                    <ul className="nb-card space-y-1.5 bg-white p-4 text-xs font-semibold text-slate-800 sm:text-sm">
                        {detail.materials.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                                <span className="text-orange-600">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {detail.steps?.map((step) => (
                <section key={step.title} className="mb-6">
                    <h2 className="mb-2 text-base font-black text-slate-900 sm:text-lg">
                        {step.title}
                    </h2>
                    {step.note && (
                        <p className="mb-3 border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-950 sm:text-sm">
                            {step.note}
                        </p>
                    )}
                    <ol className="space-y-2.5">
                        {step.items.map((item, idx) => (
                            <li key={item} className="flex items-start gap-3 text-sm font-semibold leading-relaxed text-slate-900 sm:text-base">
                                <span className="nb-tag flex h-6 w-6 shrink-0 items-center justify-center bg-slate-900 text-[10px] font-black text-white nb-mono">
                                    {idx + 1}
                                </span>
                                <span className="pt-0.5">{item}</span>
                            </li>
                        ))}
                    </ol>
                </section>
            ))}

            {detail.safety?.length > 0 && (
                <section className="mb-2">
                    <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-rose-700 nb-mono">
                        {language === 'en' ? 'Safety' : 'নিরাপত্তা'}
                    </h2>
                    <ul className="nb-card space-y-2 border-rose-200 bg-rose-50 p-4">
                        {detail.safety.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-xs font-semibold text-rose-950 sm:text-sm">
                                <span aria-hidden>⚠</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}

export default function AroJanun({ language, setCurrentView }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [selectedChapter, setSelectedChapter] = useState(null);

    const t = {
        en: {
            title: 'Know More',
            searchPlaceholder: 'Search chapter...',
            noResults: 'No chapters found',
            back: 'Back',
            cancel: 'Cancel',
            read: 'Read',
            backToList: 'Back to chapters',
        },
        bn: {
            title: 'আরো জানুন',
            searchPlaceholder: 'অধ্যায় খুঁজুন...',
            noResults: 'কোনো অধ্যায় পাওয়া যায়নি',
            back: 'ফিরুন',
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
        'w-full border-2 border-slate-900 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 shadow-[2px_2px_0_#0f172a] outline-none placeholder:text-slate-400 focus:shadow-[3px_3px_0_#0f172a]';

    const handleBack = () => {
        if (selectedChapter) {
            setSelectedChapter(null);
            return;
        }
        setCurrentView('training');
    };

    const headerTitle = selectedChapter
        ? (language === 'en' ? selectedChapter.title_en : selectedChapter.title_bn)
        : t.title;

    return (
        <div className="neo-brutal min-h-screen bg-[#fffdf7] pb-24 text-slate-900">
            <div className="nb-hazard sticky top-0 z-[41]" aria-hidden="true" />

            <div className="sticky top-[6px] z-40 border-b-[2.5px] border-slate-900 bg-white">
                <div className="mx-auto max-w-7xl space-y-3 px-4 py-3 sm:px-8 sm:py-4">
                    <div className="flex items-center justify-between gap-4">
                        {!isSearchExpanded || selectedChapter ? (
                            <>
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0_#0f172a] transition-transform hover:bg-orange-50 active:translate-x-0.5 active:translate-y-0.5"
                                        aria-label={selectedChapter ? t.backToList : t.back}
                                    >
                                        <ChevronLeftIcon className="h-5 w-5" />
                                    </button>
                                    <h1 className={`line-clamp-2 text-lg font-black tracking-tight text-slate-900 sm:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {headerTitle}
                                    </h1>
                                </div>
                                {!selectedChapter && (
                                    <button
                                        type="button"
                                        onClick={() => setIsSearchExpanded(true)}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-slate-700 shadow-[2px_2px_0_#0f172a] transition-transform hover:bg-orange-50 active:translate-x-0.5 active:translate-y-0.5 sm:hidden"
                                        aria-label={t.searchPlaceholder}
                                    >
                                        <SearchIcon className="h-5 w-5" />
                                    </button>
                                )}
                                {!selectedChapter && (
                                    <div className="relative hidden max-w-md flex-1 sm:block">
                                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
                                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder={t.searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={`${searchInputClass} py-2.5`}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}
                                    className="shrink-0 px-2 py-2 text-xs font-black text-orange-700 nb-mono uppercase tracking-wide"
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
                        <div className="mb-5 flex flex-wrap items-center gap-2">
                            <div className={`nb-icon-badge flex h-14 w-14 items-center justify-center text-2xl ${selectedChapter.badgeClass}`}>
                                <span aria-hidden>{selectedChapter.icon}</span>
                            </div>
                            <span className="nb-tag bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white nb-mono">
                                {selectedChapter.code}
                            </span>
                            <span className="nb-tag bg-teal-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-teal-900 nb-mono">
                                {language === 'en' ? selectedChapter.duration_en : selectedChapter.duration_bn}
                            </span>
                        </div>
                        <ChapterDetailBody chapter={selectedChapter} language={language} />
                    </article>
                ) : filteredChapters.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 lg:grid-cols-3">
                        {filteredChapters.map((chapter) => {
                            const title = language === 'en' ? chapter.title_en : chapter.title_bn;
                            const desc = language === 'en' ? chapter.desc_en : chapter.desc_bn;
                            const duration = language === 'en' ? chapter.duration_en : chapter.duration_bn;
                            const topics = language === 'en' ? chapter.topics_en : chapter.topics_bn;
                            return (
                                <button
                                    key={chapter.id}
                                    type="button"
                                    onClick={() => setSelectedChapter(chapter)}
                                    className="group nb-card flex h-full flex-col bg-white p-4 text-left transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 sm:p-5"
                                >
                                    <div className="mb-3 flex items-start justify-between gap-2">
                                        <div className={`nb-icon-badge flex h-11 w-11 shrink-0 items-center justify-center text-xl ${chapter.badgeClass}`}>
                                            <span aria-hidden>{chapter.icon}</span>
                                        </div>
                                        <span className="nb-tag shrink-0 bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-800 nb-mono">
                                            {chapter.code}
                                        </span>
                                    </div>
                                    <h2 className={`mb-1.5 text-base font-black leading-snug text-slate-900 group-hover:text-orange-700 sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {title}
                                    </h2>
                                    <p className={`mb-3 flex-1 text-xs font-semibold leading-relaxed text-slate-700 line-clamp-2 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {desc}
                                    </p>
                                    <div className="mb-3 flex flex-wrap gap-1.5">
                                        {topics.map((topic) => (
                                            <span
                                                key={topic}
                                                className="border border-slate-900 bg-[#fffdf7] px-1.5 py-0.5 text-[9px] font-bold text-slate-800 nb-mono"
                                            >
                                                {topic}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between border-t-2 border-slate-900 pt-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 nb-mono">{duration}</span>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 nb-mono">
                                            {t.read} →
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="nb-card mx-auto max-w-md border-dashed bg-amber-50 py-16 text-center">
                        <p className={`text-base font-black text-slate-700 ${language === 'bn' ? 'font-bengali' : ''}`}>{t.noResults}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
