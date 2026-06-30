import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HallOfFamePrizeImage from './HallOfFamePrizeImage';
import { buildLandingPrizeSlides } from '../utils/hallOfFamePrizes';
import { getRankMedal } from '../utils/monthlyEncouragementBoards';

const AUTO_MS = 5500;

export default function LandingPrizeCarousel({ language = 'bn', hallOfFameData = [], loading = false }) {
    const slides = useMemo(
        () => buildLandingPrizeSlides(language, hallOfFameData),
        [language, hallOfFameData]
    );
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const touchStartX = useRef(null);

    const title = language === 'en' ? 'Monthly prizes' : 'মাসিক পুরস্কার';

    const goTo = useCallback((next) => {
        if (slides.length === 0) return;
        setIndex((prev) => {
            if (typeof next === 'number') {
                return (next + slides.length) % slides.length;
            }
            return (prev + 1 + slides.length) % slides.length;
        });
    }, [slides.length]);

    const goPrev = useCallback(() => {
        setIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }, [slides.length]);

    useEffect(() => {
        setIndex(0);
    }, [slides.length, language]);

    useEffect(() => {
        if (slides.length <= 1 || paused) return undefined;
        const timer = setInterval(() => goTo(), AUTO_MS);
        return () => clearInterval(timer);
    }, [slides.length, paused, goTo]);

    if (loading) {
        return (
            <section className="relative z-10 mb-6 sm:mb-8">
                <div className="nb-card animate-pulse bg-white p-3 sm:p-4 rounded-xl">
                    <div className="mb-3 h-4 w-28 rounded bg-slate-200" />
                    <div className="aspect-[4/3] rounded-lg bg-slate-100" />
                </div>
            </section>
        );
    }

    if (slides.length === 0) {
        return null;
    }

    return (
        <section className="relative z-10 mb-6 sm:mb-8" aria-label={title}>
            <div
                className="nb-card overflow-hidden bg-white rounded-xl"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onFocusCapture={() => setPaused(true)}
                onBlurCapture={() => setPaused(false)}
                onTouchStart={(e) => {
                    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
                }}
                onTouchEnd={(e) => {
                    const start = touchStartX.current;
                    const end = e.changedTouches[0]?.clientX;
                    touchStartX.current = null;
                    if (start == null || end == null) return;
                    const delta = end - start;
                    if (Math.abs(delta) < 40) return;
                    if (delta < 0) goTo();
                    else goPrev();
                }}
            >
                <div className="flex items-center justify-between gap-2 border-b-2 border-slate-900/10 bg-amber-50/60 px-3 py-2.5 sm:px-4">
                    <h2 className={`truncate text-sm font-black text-slate-900 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                        🎁 {title}
                    </h2>
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={goPrev}
                            className="flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-white text-lg leading-none text-slate-800 shadow-[2px_2px_0_#0f172a] rounded-md active:translate-x-0.5 active:translate-y-0.5"
                            aria-label={language === 'en' ? 'Previous' : 'আগের'}
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            onClick={() => goTo()}
                            className="flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-white text-lg leading-none text-slate-800 shadow-[2px_2px_0_#0f172a] rounded-md active:translate-x-0.5 active:translate-y-0.5"
                            aria-label={language === 'en' ? 'Next' : 'পরের'}
                        >
                            ›
                        </button>
                    </div>
                </div>

                <div className="relative overflow-hidden">
                    <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${index * 100}%)` }}
                    >
                        {slides.map((item) => (
                            <article key={item.id} className="w-full shrink-0 px-3 py-3 sm:px-5 sm:py-4">
                                <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[9.5rem_1fr] sm:gap-5">
                                    <div className="relative flex items-center justify-center w-[6.5rem] h-[6.5rem] sm:w-[9.5rem] sm:h-[9.5rem] shrink-0">
                                        <HallOfFamePrizeImage
                                            candidates={item.imageCandidates || []}
                                            alt={item.imageAlt || item.title || ''}
                                            className="max-h-full max-w-full w-auto h-auto object-contain"
                                        />
                                        <span className="absolute -left-1 -top-1 text-lg sm:text-xl leading-none drop-shadow-sm" aria-hidden>
                                            {getRankMedal(item.prizeRank)}
                                        </span>
                                    </div>

                                    <div className="min-w-0 text-left">
                                        <p className={`truncate text-[10px] font-bold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {item.monthLabel}
                                            <span className="mx-1 text-slate-300" aria-hidden>·</span>
                                            {item.boardLabel}
                                        </p>
                                        <h3 className={`mt-0.5 line-clamp-2 text-sm font-black leading-snug text-slate-900 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {item.title}
                                        </h3>
                                        {item.sponsor && (
                                            <p className={`mt-1 truncate text-[10px] font-semibold text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                <span className={`font-bold text-slate-500 ${language === 'en' ? 'nb-mono uppercase tracking-wide' : ''}`}>
                                                    {language === 'en' ? 'Sponsor' : 'সৌজন্যে'}
                                                </span>
                                                <span className="mx-1 text-slate-300" aria-hidden>·</span>
                                                {item.sponsor}
                                            </p>
                                        )}
                                        {item.winnerName && (
                                            <p className={`mt-1 truncate text-[10px] font-bold text-orange-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {language === 'en' ? 'Winner' : 'বিজয়ী'} · {item.winnerName}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>

                {slides.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 border-t border-slate-200/80 px-3 py-2.5">
                        {slides.map((item, dotIdx) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => goTo(dotIdx)}
                                className={`h-1.5 rounded-full border border-slate-900 transition-all ${
                                    dotIdx === index ? 'w-5 bg-orange-500' : 'w-1.5 bg-white hover:bg-orange-100'
                                }`}
                                aria-label={`${dotIdx + 1}`}
                                aria-current={dotIdx === index ? 'true' : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
