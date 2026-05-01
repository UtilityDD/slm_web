/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { Share } from '@capacitor/share';
import { WEBSITE_URL } from '../../config';
import { AWARENESS_STORIES } from '../../data/awarenessStories';

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

/** Full-width vertical card: large photo + typographic overlay */
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
                className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-left shadow-2xl shadow-black/50
                transition-[transform,box-shadow] duration-200
                hover:border-white/20 hover:shadow-black/60
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
                active:scale-[0.995] min-h-[min(58vh,560px)] sm:min-h-[520px]"
        >
            <img
                src={story.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
            />
            {/* Readability: top dim + bottom heavy scrim */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent" aria-hidden />

            <div className="relative flex h-full min-h-[inherit] flex-col justify-between p-5 sm:p-7 md:p-8">
                <div className="flex items-start justify-between gap-3 pt-1">
                    <span className="inline-flex max-w-[85%] items-center border-l-2 border-orange-500 bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-100 backdrop-blur-sm sm:text-[11px]">
                        {category}
                    </span>
                </div>

                <div className="space-y-3 sm:space-y-4">
                    <h2
                        className={`text-2xl font-bold leading-[1.15] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:text-3xl md:text-[1.85rem] ${
                            language === 'bn' ? 'font-bengali' : ''
                        }`}
                    >
                        {title}
                    </h2>
                    <p
                        className={`max-w-prose text-[15px] leading-relaxed text-slate-100/95 line-clamp-4 sm:text-base sm:leading-relaxed ${
                            language === 'bn' ? 'font-bengali' : ''
                        }`}
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                    >
                        {excerpt}
                    </p>
                    <div className="flex items-center gap-2 border-t border-white/15 pt-3 text-sm font-semibold text-orange-200">
                        <span>{language === 'en' ? 'Read full account' : 'সম্পূর্ণ বর্ণনা পড়ুন'}</span>
                        <span aria-hidden className="text-orange-400 transition-transform group-hover:translate-x-0.5">
                            →
                        </span>
                    </div>
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
        <div className="relative z-[20] flex h-full min-h-0 w-full flex-1 flex-col bg-slate-950 text-slate-100">
            <header className="shrink-0 border-b border-red-900/35 bg-slate-950/95 backdrop-blur-md safe-area-inset-top">
                <div className="mx-auto grid w-full max-w-lg grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 px-3 py-3 sm:max-w-xl sm:px-4">
                    <button
                        type="button"
                        onClick={() => (selectedStory ? setSelectedStory(null) : setCurrentView('home'))}
                        aria-label={backLabel}
                        className="flex h-11 w-11 items-center justify-center justify-self-start rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="min-w-0 justify-self-center text-center">
                        {!selectedStory ? (
                            <div className="px-1">
                                <p
                                    className={`text-lg font-bold leading-tight tracking-tight text-white sm:text-xl ${
                                        language === 'bn' ? 'font-bengali' : ''
                                    }`}
                                >
                                    {language === 'bn' ? (
                                        <span className="text-slate-100">ছিন্নভিন্ন স্বপ্ন</span>
                                    ) : (
                                        <span className="text-slate-100">Shattered Dreams</span>
                                    )}
                                </p>
                                {language === 'bn' && (
                                    <p className="font-bengali mt-1 text-[11px] tracking-wide text-slate-400">
                                        কিছু না-ফেরা মানুষের গল্প
                                    </p>
                                )}
                                {language === 'en' && (
                                    <p className="mt-1 text-[11px] tracking-wide text-slate-400">
                                        Stories of those who never returned
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p
                                className={`line-clamp-2 px-1 text-sm font-semibold leading-snug text-white sm:text-base ${
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

            <main className="min-h-0 flex-1 overflow-y-auto bg-slate-950 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
                {!selectedStory ? (
                    <div className="mx-auto w-full max-w-lg px-4 pb-10 pt-7 sm:max-w-xl sm:px-5 sm:pt-8">
                        <h1 className="sr-only">
                            {language === 'bn' ? 'ছিন্নভিন্ন স্বপ্ন, কিছু না-ফেরা মানুষের গল্প' : 'Shattered Dreams, stories of those who never returned'}
                        </h1>

                        <div className="flex flex-col gap-6 sm:gap-8" role="feed" aria-label={language === 'en' ? 'Stories' : 'গল্পসমূহ'}>
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
                                        className="flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:scale-[0.99]"
                                    >
                                        {language === 'en' ? 'Load more stories' : 'আরও গল্প লোড করুন'}
                                    </button>
                                ) : (
                                    <p
                                        role="status"
                                        aria-live="polite"
                                        className="rounded-2xl border border-dashed border-white/15 bg-slate-900/50 px-4 py-4 text-center text-sm leading-relaxed text-slate-300 sm:text-base"
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
                        className="min-h-full animate-fadeIn bg-slate-950 lg:overflow-visible"
                    >
                        <div className="lg:grid lg:min-h-full lg:grid-cols-2">
                            <div className="relative min-h-[48vh] w-full overflow-hidden sm:min-h-[52vh] lg:sticky lg:top-0 lg:min-h-screen">
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
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-black/40" aria-hidden />
                                <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-8 lg:p-10">
                                    <span className="mb-2 inline-flex border-l-2 border-orange-500 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-100 backdrop-blur-sm sm:text-[11px]">
                                        {selectedStory.category[language]}
                                    </span>
                                    <h1 className={`mt-2 text-2xl font-bold leading-tight text-white drop-shadow-lg sm:text-3xl lg:text-4xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {selectedStory.title[language]}
                                    </h1>
                                </div>
                            </div>

                            <div className="border-t border-white/10 bg-slate-950 px-5 py-8 sm:px-8 lg:border-t-0 lg:py-12 lg:pl-10 lg:pr-12">
                                <div className="mx-auto max-w-prose space-y-8">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div
                                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-sm font-bold text-white"
                                                aria-hidden
                                            >
                                                SLM
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-white">
                                                    {language === 'en' ? 'Verified account' : 'যাচাই করা বর্ণনা'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {language === 'en' ? 'For awareness, not gossip' : 'সচেতনতার জন্য, গসিপ নয়'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleShare(selectedStory)}
                                            aria-label={language === 'en' ? 'Share this story' : 'এই গল্প শেয়ার করুন'}
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
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
                                        className={`text-lg leading-relaxed text-slate-200 sm:text-xl ${language === 'bn' ? 'font-bengali leading-relaxed' : ''} reading-content`}
                                    >
                                        {selectedStory.fullContent[language]}
                                    </div>

                                    <aside
                                        className={`rounded-2xl border-l-4 border-orange-500 bg-orange-950/30 px-5 py-5 ${language === 'bn' ? 'font-bengali' : ''}`}
                                        aria-label={language === 'en' ? 'Takeaway for this story' : 'এই গল্প থেকে মনে রাখার কথা'}
                                    >
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-300/90">
                                            {language === 'en' ? 'Remember' : 'মনে রাখবেন'}
                                        </p>
                                        <p className="mt-2 text-base font-medium leading-relaxed text-orange-50 sm:text-lg">
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
                                            className="min-h-[48px] flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:scale-[0.99]"
                                        >
                                            {language === 'en' ? 'Back to list' : 'তালিকায় ফিরুন'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleShare(selectedStory)}
                                            className="min-h-[48px] flex-1 rounded-xl border border-white/20 bg-transparent px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:scale-[0.99]"
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
