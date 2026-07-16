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
                <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="aspect-[4/3] bg-slate-100 sm:aspect-[16/10]" />
                    <div className="space-y-2 p-4">
                        <div className="h-4 w-40 rounded-full bg-slate-200" />
                        <div className="h-3 w-24 rounded-full bg-slate-100" />
                    </div>
                </div>
            </section>
        );
    }

    if (slides.length === 0) {
        return null;
    }

    const isBn = language === 'bn';

    return (
        <section className="relative z-10 mb-8 sm:mb-10" aria-label={title}>
            <div className="mb-3 flex items-center gap-2">
                <span className="text-base sm:text-lg" aria-hidden>🎁</span>
                <h2 className={`text-base font-black tracking-tight text-slate-900 sm:text-lg ${isBn ? 'font-bengali' : ''}`}>
                    {title}
                </h2>
            </div>

            <div
                className="landing-prize-showcase group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
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
                            <article key={item.id} className="w-full shrink-0">
                                <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50/50 p-5 sm:aspect-[16/10] sm:p-8">
                                    <HallOfFamePrizeImage
                                        candidates={item.imageCandidates || []}
                                        alt={item.imageAlt || item.title || ''}
                                        className="h-auto max-h-full w-auto max-w-full object-contain drop-shadow-md"
                                    />

                                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/95 px-2.5 py-1 text-xs font-black text-slate-900 shadow-sm backdrop-blur sm:left-4 sm:top-4">
                                        <span aria-hidden>{getRankMedal(item.prizeRank)}</span>
                                        <span>{item.rankLabel}</span>
                                    </span>

                                    <span className={`absolute right-3 top-3 max-w-[55%] truncate rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur sm:right-4 sm:top-4 ${isBn ? 'font-bengali' : ''}`}>
                                        {item.monthLabel}
                                    </span>
                                </div>

                                <div className="border-t border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
                                    <p className={`text-[11px] font-bold uppercase tracking-wide text-orange-600 ${isBn ? 'font-bengali tracking-normal' : ''}`}>
                                        {item.boardLabel}
                                    </p>
                                    <h3 className={`mt-1 line-clamp-2 text-base font-black leading-snug text-slate-900 sm:text-lg ${isBn ? 'font-bengali' : ''}`}>
                                        {item.title}
                                    </h3>

                                    {item.winnerName && (
                                        <div className="mt-2.5 flex items-center gap-2.5">
                                            {item.winnerAvatarUrl ? (
                                                <img
                                                    src={item.winnerAvatarUrl}
                                                    alt={item.winnerName}
                                                    loading="lazy"
                                                    className="h-9 w-9 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
                                                />
                                            ) : (
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-slate-900 shadow-sm">
                                                    {item.winnerName.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                            <div className="min-w-0">
                                                <p className={`text-[10px] font-bold uppercase tracking-wide text-slate-400 ${isBn ? 'font-bengali tracking-normal' : ''}`}>
                                                    {isBn ? 'বিজয়ী' : 'Winner'}
                                                </p>
                                                <p className={`truncate text-sm font-black leading-tight text-slate-900 ${isBn ? 'font-bengali' : ''}`}>
                                                    {item.winnerName}
                                                    {item.winnerDistrict && (
                                                        <span className="font-semibold text-slate-500"> · {item.winnerDistrict}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {item.sponsor && (
                                        <p className={`mt-2 truncate text-xs font-semibold text-slate-500 ${isBn ? 'font-bengali' : ''}`}>
                                            {isBn ? 'সৌজন্যে' : 'Sponsor'}
                                            <span className="mx-1 text-slate-300" aria-hidden>·</span>
                                            {item.sponsor}
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
                                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-xl leading-none text-slate-800 shadow-sm backdrop-blur transition active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
                                aria-label={isBn ? 'আগের' : 'Previous'}
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo()}
                                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-xl leading-none text-slate-800 shadow-sm backdrop-blur transition active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
                                aria-label={isBn ? 'পরের' : 'Next'}
                            >
                                ›
                            </button>
                        </>
                    )}
                </div>

                {slides.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 px-3 py-2.5">
                        {slides.map((item, dotIdx) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => goTo(dotIdx)}
                                className={`h-1.5 rounded-full transition-all ${
                                    dotIdx === index ? 'w-5 bg-orange-500' : 'w-1.5 bg-slate-300 hover:bg-orange-200'
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
