/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { Share } from '@capacitor/share';
import { WEBSITE_URL } from '../../config';
import { AWARENESS_STORIES } from '../../data/awarenessStories';
import { storageUtils } from '../../utils/storageUtils';

function usePrefersReducedMotion() {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduce(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);
    return reduce;
}

/** Neo-brutal story card: framed photo + typographic body */
const StoryCard = ({ story, onOpen, language }) => {
    const title = story.title[language];
    const excerpt = story.excerpt[language];
    const category = story.category[language];
    const openLabel =
        language === 'en'
            ? `Open story: ${title}. ${excerpt}`
            : `গল্প খুলুন: ${title}। ${excerpt}`;

    return (
        <button
            type="button"
            onClick={() => onOpen(story)}
            aria-label={openLabel}
            className="group nb-card overflow-hidden p-0 w-full text-left transition-[transform,box-shadow] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:translate-x-0.5 active:translate-y-0.5 touch-manipulation"
        >
            <div className="relative h-48 sm:h-56 overflow-hidden border-b-2 border-slate-900">
                <img
                    src={story.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
                />
            </div>

            <div className="p-5 sm:p-6 bg-white">
                <span className="nb-tag inline-block px-2.5 py-1 bg-orange-100 text-orange-800 mb-3">
                    {category}
                </span>

                <h2
                    className={`text-xl font-black leading-tight tracking-tight text-slate-900 sm:text-2xl mb-2 ${
                        language === 'bn' ? 'font-bengali' : ''
                    }`}
                >
                    {title}
                </h2>
                <p
                    className={`text-sm leading-relaxed text-slate-600 line-clamp-4 sm:text-base ${
                        language === 'bn' ? 'font-bengali' : ''
                    }`}
                >
                    {excerpt}
                </p>
                <div className="mt-4 flex items-center gap-2 border-t-2 border-slate-900 pt-3 text-sm font-black text-orange-600 nb-mono uppercase tracking-wide">
                    <span>{language === 'en' ? 'Read full account' : 'সম্পূর্ণ বর্ণনা পড়ুন'}</span>
                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                        →
                    </span>
                </div>
            </div>
        </button>
    );
};

const AwarenessStories = ({ setCurrentView, language = 'en', initialStoryId = null, onInitialStoryConsumed }) => {
    const [selectedStory, setSelectedStory] = useState(null);
    const [detailScrollY, setDetailScrollY] = useState(0);
    const [loadMoreRevealed, setLoadMoreRevealed] = useState(false);
    const reduceMotion = usePrefersReducedMotion();
    const stories = AWARENESS_STORIES;

    const handleDetailScroll = (e) => {
        setDetailScrollY(e.target.scrollTop);
    };

    useEffect(() => {
        if (!initialStoryId) return;
        const s = stories.find((st) => st.id === initialStoryId);
        if (s) {
            setDetailScrollY(0);
            setSelectedStory(s);
        }
        onInitialStoryConsumed?.();
    }, [initialStoryId, onInitialStoryConsumed, stories]);

    // Match landing/login: light neo-brutal while this page is open.
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

    const handleShare = async (story) => {
        try {
            await Share.share({
                title: story.title[language],
                text: `${story.title[language]}\n\n${story.excerpt[language]}\n\nStay safe with SmartLineMan.`,
                url: WEBSITE_URL,
                dialogTitle: language === 'en' ? 'Share story' : 'গল্প শেয়ার'
            });
        } catch (err) {
            console.error('Share failed:', err);
        }
    };

    const backLabel = selectedStory
        ? language === 'en'
            ? 'Back to story list'
            : 'গল্পের তালিকায় ফিরুন'
        : language === 'en'
            ? 'Back to home'
            : 'হোমে ফিরুন';

    return (
        <div className="neo-brutal relative z-[20] flex h-full min-h-0 w-full flex-1 flex-col text-slate-900">
            <div className="nb-hazard shrink-0" aria-hidden="true" />

            <header className="shrink-0 border-b-[2.5px] border-slate-900 bg-white safe-area-inset-top">
                <div className="mx-auto grid w-full max-w-lg grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 px-3 py-3 sm:max-w-xl sm:px-4">
                    <button
                        type="button"
                        onClick={() => (selectedStory ? setSelectedStory(null) : setCurrentView('home'))}
                        aria-label={backLabel}
                        className="flex h-11 w-11 items-center justify-center justify-self-start border-2 border-slate-900 bg-white text-slate-900 shadow-[3px_3px_0_#0f172a] transition hover:bg-orange-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="min-w-0 justify-self-center text-center">
                        {!selectedStory ? (
                            <div className="px-1">
                                <p
                                    className={`text-lg font-black leading-tight tracking-tight text-slate-900 sm:text-xl ${
                                        language === 'bn' ? 'font-bengali' : ''
                                    }`}
                                >
                                    {language === 'bn' ? (
                                        <span>ছিন্নভিন্ন স্বপ্ন</span>
                                    ) : (
                                        <span>Shattered Dreams</span>
                                    )}
                                </p>
                                {language === 'bn' && (
                                    <p className="font-bengali mt-1 text-[11px] tracking-wide text-slate-500 font-semibold">
                                        কিছু না-ফেরা মানুষের গল্প
                                    </p>
                                )}
                                {language === 'en' && (
                                    <p className="mt-1 text-[11px] tracking-wide text-slate-500 font-semibold nb-mono uppercase">
                                        Stories of those who never returned
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p
                                className={`line-clamp-2 px-1 text-sm font-black leading-snug text-slate-900 sm:text-base ${
                                    language === 'bn' ? 'font-bengali' : ''
                                }`}
                            >
                                {selectedStory.title[language]}
                            </p>
                        )}
                    </div>

                    <div className="h-11 w-11 shrink-0 justify-self-end" aria-hidden />
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
                {!selectedStory ? (
                    <div className="mx-auto w-full max-w-lg px-4 pb-10 pt-6 sm:max-w-xl sm:px-5 sm:pt-7">
                        <h1 className="sr-only">
                            {language === 'bn' ? 'ছিন্নভিন্ন স্বপ্ন, কিছু না-ফেরা মানুষের গল্প' : 'Shattered Dreams, stories of those who never returned'}
                        </h1>

                        <div className="flex flex-col gap-5 sm:gap-6" role="feed" aria-label={language === 'en' ? 'Stories' : 'গল্পসমূহ'}>
                            {stories.map((story) => (
                                <StoryCard
                                    key={story.id}
                                    story={story}
                                    language={language}
                                    onOpen={(s) => {
                                        setDetailScrollY(0);
                                        setSelectedStory(s);
                                    }}
                                />
                            ))}
                            <div className={`w-full ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {!loadMoreRevealed ? (
                                    <button
                                        type="button"
                                        onClick={() => setLoadMoreRevealed(true)}
                                        aria-expanded={false}
                                        className="min-h-[48px] w-full nb-btn-secondary px-4 py-3 text-sm font-black"
                                    >
                                        {language === 'en' ? 'Load more stories' : 'আরও গল্প লোড করুন'}
                                    </button>
                                ) : (
                                    <p
                                        role="status"
                                        aria-live="polite"
                                        className="nb-card border-dashed bg-amber-50 px-4 py-4 text-center text-sm leading-relaxed text-slate-700 font-semibold sm:text-base"
                                    >
                                        {language === 'en'
                                            ? 'May this list end here. Let no other family\'s dreams be shattered.'
                                            : 'এই তালিকা এখানেই শেষ হোক। আর কোনো পরিবারের স্বপ্ন যেন ছিন্নভিন্ন না হয়।'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <article
                        onScroll={handleDetailScroll}
                        className="min-h-full animate-fadeIn lg:overflow-visible"
                    >
                        <div className="lg:grid lg:min-h-full lg:grid-cols-2">
                            <div className="relative min-h-[48vh] w-full overflow-hidden border-b-2 border-slate-900 sm:min-h-[52vh] lg:sticky lg:top-0 lg:min-h-screen lg:border-b-0 lg:border-r-2">
                                <img
                                    src={selectedStory.image}
                                    alt=""
                                    className="absolute inset-0 h-[120%] w-full object-cover motion-reduce:transform-none"
                                    style={{
                                        transform:
                                            !reduceMotion && typeof window !== 'undefined' && window.innerWidth < 1024
                                                ? `translateY(${detailScrollY * 0.2}px)`
                                                : 'none'
                                    }}
                                />
                                <div className="absolute inset-x-0 bottom-0 z-10 border-t-2 border-slate-900 bg-white p-5 sm:p-8 lg:p-10">
                                    <span className="nb-tag inline-block px-2.5 py-1 bg-orange-100 text-orange-800 mb-2">
                                        {selectedStory.category[language]}
                                    </span>
                                    <h1 className={`text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-4xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {selectedStory.title[language]}
                                    </h1>
                                </div>
                            </div>

                            <div className="px-4 py-6 sm:px-6 sm:py-8 lg:py-10 lg:pl-8 lg:pr-10">
                                <div className="mx-auto max-w-prose space-y-6">
                                    <div className="nb-card p-4 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div
                                                className="nb-icon-badge flex h-11 w-11 shrink-0 items-center justify-center bg-orange-500 text-sm font-black text-white"
                                                aria-hidden
                                            >
                                                SLM
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-900">
                                                    {language === 'en' ? 'Verified account' : 'যাচাই করা বর্ণনা'}
                                                </p>
                                                <p className="text-xs text-slate-500 font-semibold">
                                                    {language === 'en' ? 'For awareness, not gossip' : 'সচেতনতার জন্য, গসিপ নয়'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleShare(selectedStory)}
                                            aria-label={language === 'en' ? 'Share this story' : 'এই গল্প শেয়ার করুন'}
                                            className="flex h-11 w-11 shrink-0 items-center justify-center nb-btn-secondary !p-0 !min-h-0"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                                />
                                            </svg>
                                        </button>
                                    </div>

                                    <div
                                        className={`nb-card p-5 sm:p-6 text-base leading-relaxed text-slate-700 sm:text-lg ${language === 'bn' ? 'font-bengali leading-relaxed' : ''} reading-content`}
                                    >
                                        {selectedStory.fullContent[language]}
                                    </div>

                                    <aside
                                        className={`nb-card p-5 sm:p-6 bg-amber-50 ${language === 'bn' ? 'font-bengali' : ''}`}
                                        aria-label={language === 'en' ? 'Takeaway for this story' : 'এই গল্প থেকে মনে রাখার কথা'}
                                    >
                                        <p className="nb-label text-orange-700">
                                            {language === 'en' ? 'Remember' : 'মনে রাখবেন'}
                                        </p>
                                        <p className="mt-2 text-base font-bold leading-relaxed text-slate-800 sm:text-lg">
                                            {selectedStory.moral[language]}
                                        </p>
                                    </aside>

                                    <div className="flex flex-col gap-3 pb-6 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedStory(null);
                                                setDetailScrollY(0);
                                            }}
                                            className="min-h-[48px] flex-1 nb-btn-primary px-4 py-3 text-sm font-black"
                                        >
                                            {language === 'en' ? 'Back to list' : 'তালিকায় ফিরুন'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleShare(selectedStory)}
                                            className="min-h-[48px] flex-1 nb-btn-secondary px-4 py-3 text-sm font-black"
                                        >
                                            {language === 'en' ? 'Share' : 'শেয়ার'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>
                )}
            </main>
        </div>
    );
};

export default AwarenessStories;
