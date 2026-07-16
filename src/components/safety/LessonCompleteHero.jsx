import React, { useMemo } from 'react';

/**
 * Inspiring Material celebration hero for the lesson completion page.
 * Replaces the weak reading Lottie with a badge-forward success mark.
 */
export default function LessonCompleteHero({
    badge,
    language = 'en',
    prefersReducedMotion = false,
}) {
    const icon = badge?.icon || '🏆';
    const badgeName = language === 'bn' ? (badge?.bn || 'ট্রেইনি') : (badge?.en || 'Trainee');
    const confettiColors = useMemo(
        () => ['#fb923c', '#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'],
        []
    );

    return (
        <div className="relative mx-auto flex h-[min(26vh,11rem)] w-[min(26vh,11rem)] max-w-[min(78vw,11rem)] shrink-0 items-center justify-center sm:h-44 sm:w-44">
            <div className="absolute inset-0 rounded-full bg-orange-400/15 blur-2xl sm:blur-3xl" aria-hidden />

            {!prefersReducedMotion && (
                <div className="pointer-events-none absolute inset-[-12%] overflow-hidden" aria-hidden>
                    {confettiColors.map((color, i) => (
                        <span
                            key={color}
                            className="absolute h-1.5 w-1.5 rounded-full opacity-80 animate-lesson-complete-spark"
                            style={{
                                left: `${12 + (i * 14) % 76}%`,
                                top: `${8 + (i * 17) % 70}%`,
                                backgroundColor: color,
                                animationDelay: `${i * 0.12}s`,
                            }}
                        />
                    ))}
                </div>
            )}

            <div
                className={`absolute inset-3 rounded-full border-2 border-orange-200/80 ${
                    prefersReducedMotion ? '' : 'animate-lesson-complete-ring'
                }`}
                aria-hidden
            />
            <div
                className={`absolute inset-6 rounded-full border border-amber-200/70 ${
                    prefersReducedMotion ? '' : 'animate-lesson-complete-ring-slow'
                }`}
                aria-hidden
            />

            <div
                className={`relative z-10 flex h-[4.75rem] w-[4.75rem] flex-col items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/40 sm:h-24 sm:w-24 ${
                    prefersReducedMotion ? '' : 'animate-lesson-complete-pop'
                }`}
            >
                <span className="text-3xl drop-shadow-sm sm:text-4xl" aria-hidden>
                    {icon}
                </span>
                <span className="mt-0.5 rounded-full bg-white/20 px-1.5 py-px text-[8px] font-black uppercase tracking-wide text-white/95 sm:text-[9px]">
                    {badgeName}
                </span>
            </div>

            <div
                className="absolute -bottom-0.5 -right-0.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-md sm:h-9 sm:w-9"
                aria-hidden
            >
                <svg className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        </div>
    );
}
