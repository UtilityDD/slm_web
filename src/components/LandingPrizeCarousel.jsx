import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HallOfFamePrizeImage from './HallOfFamePrizeImage';
import { buildLandingPrizeSlides } from '../utils/hallOfFamePrizes';

const AUTO_MS = 5500;

export default function LandingPrizeCarousel({ language = 'bn', hallOfFameData = [], loading = false }) {
    const slides = useMemo(
        () => buildLandingPrizeSlides(language, hallOfFameData),
        [language, hallOfFameData]
    );
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const touchStartX = useRef(null);

    const title = language === 'en' ? 'Prizes distributed' : 'পুরস্কার বিতরণ';
    const isBn = language === 'bn';

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
            <section className="relative z-10 mb-8 sm:mb-10">
                <div className="mb-3 h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-100 sm:aspect-[16/10]" />
            </section>
        );
    }

    if (slides.length === 0) {
        return null;
    }

    return (
        <section className="relative z-10 mb-8 sm:mb-10" aria-label={title}>
            <h2 className={`mb-3 text-base font-black tracking-tight text-slate-900 sm:mb-4 sm:text-lg ${isBn ? 'font-bengali' : ''}`}>
                {title}
            </h2>

            <div
                className="landing-prize-clean group relative overflow-hidden rounded-2xl"
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
                <div className="relative overflow-hidden">
                    <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{ transform: `translateX(-${index * 100}%)` }}
                    >
                        {slides.map((item) => (
                            <article key={item.id} className="relative w-full shrink-0">
                                <div className="landing-prize-clean__stage relative aspect-[4/3] w-full sm:aspect-[16/10]">
                                    <span className="landing-prize-watermark" aria-hidden>
                                        SmartLineman.in
                                    </span>

                                    <div className="relative z-[1] flex h-full w-full items-center justify-center px-10 py-8 sm:px-14 sm:py-10">
                                        <HallOfFamePrizeImage
                                            candidates={item.imageCandidates || []}
                                            alt={item.imageAlt || item.title || ''}
                                            className="h-auto max-h-full w-auto max-w-[85%] object-contain drop-shadow-md sm:max-w-[70%]"
                                        />
                                    </div>

                                    {item.winnerName && (
                                        <p className={`landing-prize-winner-name ${isBn ? 'font-bengali' : ''}`}>
                                            {item.winnerName}
                                        </p>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>

                    {slides.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={goPrev}
                                className="absolute left-2 top-1/2 z-[2] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-xl leading-none text-slate-800 shadow-sm backdrop-blur transition active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
                                aria-label={isBn ? 'আগের' : 'Previous'}
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo()}
                                className="absolute right-2 top-1/2 z-[2] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-xl leading-none text-slate-800 shadow-sm backdrop-blur transition active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
                                aria-label={isBn ? 'পরের' : 'Next'}
                            >
                                ›
                            </button>
                        </>
                    )}
                </div>

                {slides.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 z-[2] flex items-center justify-center gap-1.5">
                        {slides.map((item, dotIdx) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => goTo(dotIdx)}
                                className={`h-1.5 rounded-full transition-all ${
                                    dotIdx === index ? 'w-5 bg-orange-500' : 'w-1.5 bg-white/80'
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
