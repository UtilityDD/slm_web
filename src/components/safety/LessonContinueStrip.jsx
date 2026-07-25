import React, { useEffect, useRef } from 'react';

const toBengaliNumber = (num, lang) => {
    if (!num) return '';
    if (lang !== 'bn') return String(num);
    const bnNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).split('').map((digit) => bnNumbers[digit] || digit).join('');
};

/**
 * Horizontal lesson session strip — completed + unlocked upcoming lessons.
 * Quiet circle row; a soft scroll peek hints that it can move sideways.
 */
export default function LessonContinueStrip({
    lessons = [],
    language = 'en',
    onSelect,
    openingId = null,
    compact = false,
}) {
    const scrollerRef = useRef(null);
    const currentRef = useRef(null);

    useEffect(() => {
        const node = currentRef.current;
        const scroller = scrollerRef.current;
        if (!node || !scroller) return undefined;

        const centerOnCurrent = () => {
            const target =
                node.offsetLeft - scroller.clientWidth / 2 + node.clientWidth / 2;
            scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
        };

        centerOnCurrent();

        const reduceMotion =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reduceMotion) return undefined;

        let peekBackTimer = 0;
        const peekTimer = window.setTimeout(() => {
            const maxScroll = scroller.scrollWidth - scroller.clientWidth;
            if (maxScroll <= 12) return;

            const start = scroller.scrollLeft;
            const roomRight = Math.max(0, maxScroll - start);
            const roomLeft = start;
            // Prefer a right peek so it feels like “more ahead”; fall back left.
            const peek =
                roomRight > 10
                    ? Math.min(56, roomRight)
                    : roomLeft > 10
                        ? -Math.min(56, roomLeft)
                        : 0;
            if (!peek) return;

            scroller.scrollTo({ left: start + peek, behavior: 'smooth' });
            peekBackTimer = window.setTimeout(() => {
                scroller.scrollTo({ left: start, behavior: 'smooth' });
            }, 520);
        }, 780);

        return () => {
            window.clearTimeout(peekTimer);
            window.clearTimeout(peekBackTimer);
        };
    }, [lessons]);

    if (!lessons.length) return null;

    return (
        <div className="lesson-continue-strip w-full max-w-full">
            <div
                ref={scrollerRef}
                className={`lesson-continue-strip__scroller flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                    compact ? 'gap-2.5 px-2 py-0.5 sm:gap-3.5 sm:px-3 sm:py-1' : 'gap-3.5 px-3 py-1 sm:gap-4'
                }`}
                role="list"
                aria-label={language === 'en' ? 'Open lessons' : 'খোলা পাঠসমূহ'}
            >
                {lessons.map((lesson) => {
                    const isOpening = openingId === lesson.id;
                    const label = language === 'bn'
                        ? toBengaliNumber(lesson.id, language)
                        : lesson.id;
                    const status = lesson.isCurrent
                        ? (language === 'en' ? 'Now' : 'এখন')
                        : lesson.isNext
                            ? (language === 'en' ? 'Next' : 'পরের')
                            : lesson.isCompleted
                                ? (language === 'en' ? 'Done' : 'সম্পন্ন')
                                : (language === 'en' ? 'Open' : 'খোলা');

                    const circleClass = lesson.isCurrent
                        ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/35 ring-4 ring-orange-200/80'
                        : lesson.isNext
                            ? 'border-orange-400 bg-white text-orange-600 shadow-md shadow-orange-500/20 ring-2 ring-orange-300/70'
                            : lesson.isCompleted
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 shadow-sm';

                    return (
                        <button
                            key={lesson.id}
                            type="button"
                            role="listitem"
                            ref={lesson.isCurrent || lesson.isNext ? currentRef : undefined}
                            disabled={isOpening || !lesson.isUnlocked}
                            onClick={() => onSelect?.(lesson)}
                            className={`group flex shrink-0 snap-center flex-col items-center touch-manipulation transition-transform active:scale-95 disabled:opacity-60 ${
                                compact ? 'w-11 sm:w-16' : 'w-14 sm:w-16'
                            }`}
                            aria-current={lesson.isCurrent ? 'true' : undefined}
                            aria-label={
                                language === 'en'
                                    ? `Lesson ${lesson.id}, ${status}`
                                    : `পাঠ ${label}, ${status}`
                            }
                        >
                            <span
                                className={`relative flex items-center justify-center rounded-full border-2 font-black tabular-nums transition-colors ${circleClass} ${
                                    compact
                                        ? 'h-10 w-10 text-xs sm:h-14 sm:w-14 sm:text-base'
                                        : 'h-12 w-12 text-sm sm:h-14 sm:w-14 sm:text-base'
                                }`}
                            >                                {language === 'bn' ? (
                                    <span className="font-bengali leading-none">{label}</span>
                                ) : (
                                    label
                                )}
                                {lesson.isCompleted && !lesson.isCurrent && (
                                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                                        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </span>
                                )}
                                {isOpening && (
                                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
