/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { Share } from '@capacitor/share';
import { WEBSITE_URL } from '../../config';
import { AWARENESS_STORIES, EMOTIONAL_IMAGE_FOCUS } from '../../data/awarenessStories';
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

function storyImageFocus(src) {
    return EMOTIONAL_IMAGE_FOCUS[src] || 'center 20%';
}

function storyParagraphs(text) {
    return String(text || '')
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
}

function FadeIn({ children, delay = 0, className = '' }) {
    return (
        <div
            className={`amader-kotha__fade ${className}`}
            style={{ animationDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

const StoryCard = ({ story, onOpen, onShare, language, priority = false }) => {
    const title = story.title[language];
    const excerpt = story.excerpt[language];
    const category = story.category[language];
    const bn = language === 'bn';
    const openLabel =
        language === 'en'
            ? `Open story: ${title}. ${excerpt}`
            : `ঘটনা দেখুন: ${title}। ${excerpt}`;

    return (
        <article className="group relative flex flex-col overflow-hidden rounded-[1.65rem] border border-orange-200/70 bg-white shadow-[0_10px_30px_rgba(194,65,12,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(194,65,12,0.15)]">
            <button
                type="button"
                onClick={() => onOpen(story)}
                aria-label={openLabel}
                className="relative aspect-[16/11] w-full overflow-hidden bg-orange-50 text-left touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
                <img
                    src={story.image}
                    alt=""
                    decoding="async"
                    loading={priority ? 'eager' : 'lazy'}
                    fetchpriority={priority ? 'high' : 'auto'}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    style={{ objectPosition: storyImageFocus(story.image) }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute left-3.5 top-3.5 flex items-center gap-2">
                    <span
                        className={`rounded-full bg-white/95 px-3 py-1 text-[11px] font-black tracking-wide text-orange-950 shadow-sm backdrop-blur ${
                            bn ? 'font-bengali' : ''
                        }`}
                    >
                        {category}
                    </span>
                    <span
                        className={`rounded-full bg-rose-600/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur ${
                            bn ? 'font-bengali' : ''
                        }`}
                    >
                        {bn ? 'সত্য ঘটনা' : 'True Account'}
                    </span>
                </div>
            </button>

            <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                <div>
                    <button
                        type="button"
                        onClick={() => onOpen(story)}
                        className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-lg"
                    >
                        <h2
                            className={`text-xl font-black leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-orange-600 sm:text-2xl ${
                                bn ? 'font-bengali amader-kotha__display' : ''
                            }`}
                        >
                            {title}
                        </h2>
                    </button>
                    <p
                        className={`mt-2.5 text-sm font-semibold leading-relaxed text-slate-600 line-clamp-3 sm:text-[15px] ${
                            bn ? 'font-bengali' : ''
                        }`}
                    >
                        {excerpt}
                    </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-orange-100/80 pt-4">
                    <button
                        type="button"
                        onClick={() => onOpen(story)}
                        className={`inline-flex items-center gap-1.5 rounded-full border border-orange-200/90 bg-orange-50/80 px-3.5 py-1.5 text-xs font-black text-orange-900 shadow-2xs transition-all hover:bg-orange-100 hover:shadow-xs active:scale-95 ${
                            bn ? 'font-bengali' : ''
                        }`}
                    >
                        <span>{bn ? 'পুরো ঘটনা পড়ুন' : 'Read full story'}</span>
                        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                            →
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onShare(story)}
                        aria-label={bn ? 'শেয়ার করুন' : 'Share story'}
                        title={bn ? 'শেয়ার করুন' : 'Share story'}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 active:scale-90"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </article>
    );
};

const AwarenessStories = ({ setCurrentView, language = 'en', initialStoryId = null, onInitialStoryConsumed }) => {
    const [selectedStory, setSelectedStory] = useState(null);
    const [detailScrollY, setDetailScrollY] = useState(0);
    const [loadMoreRevealed, setLoadMoreRevealed] = useState(false);
    const reduceMotion = usePrefersReducedMotion();
    const stories = AWARENESS_STORIES;
    const bn = language === 'bn';

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

        const prevTitle = document.title;
        document.title = bn
            ? 'করুণ কাহিনী · ছিন্নভিন্ন স্বপ্ন — SmartLineMan'
            : 'Tragic Stories · Shattered Dreams — SmartLineMan';

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
            document.title = prevTitle;
        };
    }, [bn]);

    // Prefetch story images so opening a card feels instant.
    useEffect(() => {
        stories.forEach((story) => {
            const img = new Image();
            img.decoding = 'async';
            img.src = story.image;
        });
    }, [stories]);

    const handleShare = async (story) => {
        const title = story.title[language];
        const body =
            story.shareText?.[language] ||
            `${story.excerpt[language]}\n\n${story.moral[language]}`;
        const site = (WEBSITE_URL || 'https://smartlineman.in').replace(/\/$/, '');
        const closer =
            language === 'en'
                ? `Read more on SmartLineMan — and join our lineman community:\n${site}`
                : `SmartLineMan-এ আরও পড়ুন — আমাদের লাইনম্যান কমিউনিটিতে যোগ দিন:\n${site}`;
        try {
            await Share.share({
                title,
                text: `${title}\n\n${body}\n\n${closer}`,
                url: site,
                dialogTitle: language === 'en' ? 'Share this story' : 'এই ঘটনা শেয়ার করুন'
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

    const detailParagraphs = selectedStory
        ? storyParagraphs(selectedStory.fullContent[language])
        : [];

    return (
        <div className={`amader-kotha min-h-screen bg-[#fffdf7] pb-28 text-slate-900 ${bn ? 'font-bengali' : ''}`}>
            {/* Sticky Header */}
            <header className="sticky top-0 z-40 border-b border-orange-200/50 bg-[#fffdf7]/92 backdrop-blur-md safe-area-inset-top">
                <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
                    <button
                        type="button"
                        onClick={() => (selectedStory ? setSelectedStory(null) : setCurrentView('home'))}
                        aria-label={backLabel}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m15 18-6-6 6-6" />
                        </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className={`truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl ${bn ? 'amader-kotha__display' : ''}`}>
                            {selectedStory ? selectedStory.title[language] : (bn ? 'করুণ কাহিনী' : 'Tragic Stories')}
                        </h1>
                        {!selectedStory && (
                            <p className="truncate text-xs font-semibold text-orange-800/80">
                                {bn ? 'ছিন্নভিন্ন স্বপ্ন · কিছু না-ফেরা মানুষের গল্প' : 'Shattered Dreams · Stories of Those Who Never Returned'}
                            </p>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 sm:pt-8">
                {!selectedStory ? (
                    <div className="space-y-8">
                        {/* Top Hero Poster Card — In the style of Amader Kotha */}
                        <FadeIn>
                            <section className="amader-kotha__poster overflow-hidden rounded-[1.75rem] border border-orange-200/60 bg-white shadow-[0_16px_40px_rgba(194,65,12,0.12)]">
                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 sm:aspect-[16/9]">
                                    <img
                                        src="/assets/emotional/lineman.webp"
                                        alt={bn ? 'লাইনম্যানের পরিবারের ছবি' : 'Lineman family waiting'}
                                        decoding="async"
                                        fetchpriority="high"
                                        className="h-full w-full object-cover object-top"
                                    />
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                                    <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                                        <span className="inline-block rounded-full bg-rose-600/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-sm backdrop-blur">
                                            {bn ? 'সচেতনতার শিক্ষা' : 'Life Awareness'}
                                        </span>
                                        <p className="mt-2 text-xl font-black text-white drop-shadow-sm sm:text-2xl">
                                            {bn ? '‘লাইন তো বন্ধই ছিল—তবু ঘরে ফেরা হলো না।’' : '“The line seemed dead—yet he never returned.”'}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-orange-100 bg-gradient-to-b from-orange-50/80 to-[#fffdf7] px-5 py-5 text-center sm:px-8 sm:py-6">
                                    <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-orange-700/80">
                                        {bn ? 'স্মার্ট লাইনম্যান · জীবনের শপথ' : 'SMARTLINEMAN · LIFE PLEDGE'}
                                    </p>
                                    <h2 className={`text-2xl font-black leading-tight text-orange-950 sm:text-3xl ${bn ? 'amader-kotha__display' : ''}`}>
                                        {bn ? 'ছিন্নভিন্ন স্বপ্ন — কিছু না-ফেরা মানুষের কথা' : 'Shattered Dreams — The Unreturned'}
                                    </h2>
                                    <p className="mx-auto mt-3 max-w-lg text-[15px] font-semibold leading-relaxed text-slate-700 sm:text-base">
                                        {bn
                                            ? 'কাজের একটু তাড়াহুড়ো বা সামান্য অসাবধানতায় এক নিমেষে নিভে গেছে বহু তাজা প্রাণ। রেখে গেছে এক বুক হাহাকার আর অসহায় পরিবার। এই ঘটনাগুলো কাউকে ভয় দেখাতে নয়—মাঠে নামার আগে নিজেকে নিরাপদে বাড়ি ফেরানোর শপথ মনে করিয়ে দিতে।'
                                            : 'A moment of haste or an unchecked back-feed has taken precious lives, leaving behind shattered families. These accounts are not to frighten, but to remind us that returning home safe is our highest duty.'}
                                    </p>
                                </div>
                            </section>
                        </FadeIn>

                        {/* Mantra Box — In the style of Amader Kotha */}
                        <FadeIn delay={100}>
                            <section className="amader-kotha__mantra rounded-[1.75rem] px-6 py-6 text-center sm:px-8">
                                <span className="inline-block text-2xl" aria-hidden>🕯️</span>
                                <p className={`mt-2 text-lg font-black leading-snug text-slate-900 sm:text-xl ${bn ? 'amader-kotha__display' : ''}`}>
                                    {bn
                                        ? 'একটি দুর্ঘটনা শুধু একজন লাইনম্যানকে কাড়ে না, একটি পুরো পরিবারকে চিরদিনের জন্য অন্ধকারে ঠেলে দেয়।'
                                        : 'A workplace accident does not just take a lineman; it plunges an entire family into darkness forever.'}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-orange-900/80">
                                    {bn
                                        ? 'পারমিট, ডিসচার্জ রড ও পূর্ণ পিপিই ছাড়া কখনো লাইনে হাত দেবেন না।'
                                        : 'Never touch a wire without written permits, discharge rods, and full PPE.'}
                                </p>
                            </section>
                        </FadeIn>

                        {/* Stories Grid */}
                        <FadeIn delay={160}>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className={`text-lg font-black text-slate-900 sm:text-xl ${bn ? 'amader-kotha__display' : ''}`}>
                                        {bn ? 'বাস্তব ঘটনার বিবরণ' : 'Documented Accounts'}
                                    </h3>
                                    <span className="text-xs font-bold text-orange-800">
                                        {stories.length} {bn ? 'টি ঘটনা' : 'Cases'}
                                    </span>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    {stories.map((story, index) => (
                                        <StoryCard
                                            key={story.id}
                                            story={story}
                                            language={language}
                                            priority={index === 0}
                                            onOpen={(s) => {
                                                setDetailScrollY(0);
                                                setSelectedStory(s);
                                            }}
                                            onShare={handleShare}
                                        />
                                    ))}
                                </div>
                            </div>
                        </FadeIn>

                        {/* End of list heartfelt message */}
                        <FadeIn delay={220}>
                            <div className="pt-2">
                                {!loadMoreRevealed ? (
                                    <button
                                        type="button"
                                        onClick={() => setLoadMoreRevealed(true)}
                                        aria-expanded={false}
                                        className="min-h-[48px] w-full rounded-full border border-orange-200/90 bg-orange-50/70 px-4 py-3 text-sm font-bold text-orange-900 shadow-2xs transition-all hover:bg-orange-100 active:scale-[0.99]"
                                    >
                                        {bn ? 'তালিকার সমাপ্তি দেখুন' : 'View list conclusion'}
                                    </button>
                                ) : (
                                    <div
                                        role="status"
                                        className="rounded-2xl border border-dashed border-rose-300 bg-rose-50/80 p-5 text-center shadow-xs"
                                    >
                                        <span className="text-2xl" aria-hidden>🕊️</span>
                                        <p className={`mt-2 text-base font-black text-rose-950 sm:text-lg ${bn ? 'amader-kotha__display' : ''}`}>
                                            {bn
                                                ? 'এই তালিকা এখানেই শেষ হোক। আর কোনো পরিবারের স্বপ্ন যেন ছিন্নভিন্ন না হয়।'
                                                : "May this list end here. Let no other family's dreams be shattered."}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-rose-800/80">
                                            {bn
                                                ? 'নিরাপদ থাকুন, সহকর্মীকে নিরাপদে রাখুন। বাড়ি ফিরুন হাসিমুখে।'
                                                : 'Stay safe, protect your brothers, and return home with a smile.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </FadeIn>
                    </div>
                ) : (
                    /* Single Story View — Styled with Amader Kotha Aesthetics */
                    <article
                        onScroll={handleDetailScroll}
                        className="animate-fadeIn space-y-6 pb-6"
                    >
                        {/* Poster Header */}
                        <section className="amader-kotha__poster overflow-hidden rounded-[1.75rem] border border-orange-200/70 bg-white shadow-[0_16px_40px_rgba(194,65,12,0.12)]">
                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950 sm:aspect-[16/9]">
                                <img
                                    src={selectedStory.image}
                                    alt=""
                                    decoding="async"
                                    fetchpriority="high"
                                    className="h-full w-full object-cover"
                                    style={{
                                        objectPosition: storyImageFocus(selectedStory.image),
                                        transform:
                                            !reduceMotion && typeof window !== 'undefined' && window.innerWidth < 1024
                                                ? `translateY(${detailScrollY * 0.12}px)`
                                                : 'none'
                                    }}
                                />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                                <div className="absolute left-4 top-4">
                                    <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-black text-orange-950 shadow-sm backdrop-blur">
                                        {selectedStory.category[language]}
                                    </span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                                    <h1
                                        className={`text-2xl font-black leading-tight text-white drop-shadow-md sm:text-3xl lg:text-4xl ${
                                            bn ? 'font-bengali amader-kotha__display' : ''
                                        }`}
                                    >
                                        {selectedStory.title[language]}
                                    </h1>
                                </div>
                            </div>

                            {/* Trust Bar & Share Button */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-orange-100 bg-orange-50/70 px-5 py-3.5 sm:px-6">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white shadow-xs">
                                        SLM
                                    </span>
                                    <div>
                                        <p className="text-xs font-black text-slate-900">
                                            {bn ? 'স্মার্ট লাইনম্যান সচেতনতা সেল' : 'SLM Safety Awareness Cell'}
                                        </p>
                                        <p className="text-[11px] font-semibold text-slate-500">
                                            {bn ? 'সত্য ঘটনা · সচেতনতার শিক্ষা' : 'Documented Field Case'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleShare(selectedStory)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/90 bg-white px-3 py-1.5 text-xs font-bold text-orange-900 shadow-2xs transition-all hover:bg-orange-50 active:scale-95"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                        />
                                    </svg>
                                    <span>{bn ? 'শেয়ার করুন' : 'Share'}</span>
                                </button>
                            </div>
                        </section>

                        {/* Article Text Content */}
                        <div className="rounded-[1.75rem] border border-orange-100/90 bg-white p-6 shadow-sm sm:p-8">
                            <div
                                className={`space-y-4 text-[1.05rem] leading-[1.8] text-slate-800 sm:text-lg sm:leading-[1.85] ${
                                    bn ? 'font-bengali' : ''
                                }`}
                            >
                                {detailParagraphs.map((para, i) => (
                                    <p key={i} className="text-justify sm:text-left">
                                        {para}
                                    </p>
                                ))}
                            </div>
                        </div>

                        {/* Moral / Takeaway — Styled like Amader Kotha Mantra */}
                        <section className="amader-kotha__mantra rounded-[1.75rem] p-6 text-left shadow-sm sm:p-7">
                            <div className="flex items-center gap-2">
                                <span className="text-xl" aria-hidden>⚠️</span>
                                <h3 className={`text-base font-black text-rose-900 sm:text-lg ${bn ? 'amader-kotha__display' : ''}`}>
                                    {bn ? 'এই ঘটনা থেকে মনে রাখার শিক্ষা' : 'Critical Takeaway from This Case'}
                                </h3>
                            </div>
                            <p className={`mt-3 text-lg font-black leading-snug text-slate-900 sm:text-xl ${bn ? 'amader-kotha__display' : ''}`}>
                                {selectedStory.moral[language]}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-orange-950/80">
                                {bn
                                    ? 'আপনার সুরক্ষা শুধু আপনার নয়—আপনার পুরো পরিবারের বেঁচে থাকার অবলম্বন।'
                                    : 'Your personal safety is the lifeline of your entire household.'}
                            </p>
                        </section>

                        {/* Bottom Buttons */}
                        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStory(null);
                                    setDetailScrollY(0);
                                }}
                                className="min-h-[48px] flex-1 rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-orange-500/30 transition-all hover:bg-orange-600 active:scale-[0.98]"
                            >
                                {bn ? '← অন্য ঘটনাগুলো দেখুন' : '← Back to stories'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleShare(selectedStory)}
                                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full border border-orange-200/90 bg-orange-50 px-5 py-3 text-sm font-bold text-orange-900 shadow-2xs transition-all hover:bg-orange-100 active:scale-[0.98]"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                    />
                                </svg>
                                <span>{bn ? 'সহকর্মীদের সাথে শেয়ার করুন' : 'Share with colleagues'}</span>
                            </button>
                        </div>
                    </article>
                )}
            </main>
        </div>
    );
};

export default AwarenessStories;
