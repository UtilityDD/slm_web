import React, { useEffect, useRef } from 'react';

const toBengaliNumber = (num, lang) => {
    if (!num) return '';
    if (lang !== 'bn') return String(num);
    const bnNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).split('').map((digit) => bnNumbers[digit] || digit).join('');
};

/**
 * Horizontal lesson session strip — completed + unlocked upcoming lessons.
 * Lets learners jump lessons without returning to the training path page.
 */
export default function LessonContinueStrip({
    lessons = [],
    language = 'en',
    onSelect,
    openingId = null,
}) {
    const scrollerRef = useRef(null);
    const currentRef = useRef(null);

    useEffect(() => {
        const node = currentRef.current;
        const scroller = scrollerRef.current;
        if (!node || !scroller) return;
        const target =
            node.offsetLeft - scroller.clientWidth / 2 + node.clientWidth / 2;
        scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }, [lessons]);

    if (!lessons.length) return null;

    return (
        <div className="w-full max-w-full pt-1">
            <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
                <p className={`text-left text-[11px] font-bold text-slate-600 sm:text-xs ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {language === 'en' ? 'Your session — tap a lesson' : 'আপনার সেশন — পাঠে ট্যাপ করুন'}
                </p>
                <p className={`shrink-0 text-[10px] font-semibold text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {language === 'en' ? 'Swipe' : 'সোয়াইপ'} →
                </p>
            </div>

            <div
                ref={scrollerRef}
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                            className={`group flex w-[4.25rem] shrink-0 snap-center flex-col items-center gap-1.5 touch-manipulation transition-transform active:scale-95 disabled:opacity-60 sm:w-[4.5rem]`}
                            aria-current={lesson.isCurrent ? 'true' : undefined}
                            aria-label={
                                language === 'en'
                                    ? `Lesson ${lesson.id}, ${status}`
                                    : `পাঠ ${label}, ${status}`
                            }
                        >
                            <span className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-black tabular-nums transition-colors sm:h-14 sm:w-14 sm:text-base ${circleClass}`}>
                                {language === 'bn' ? (
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
                            <span
                                className={`max-w-full truncate text-[10px] font-bold leading-tight ${
                                    lesson.isCurrent || lesson.isNext ? 'text-orange-600' : 'text-slate-500'
                                } ${language === 'bn' ? 'font-bengali' : ''}`}
                            >
                                {status}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
