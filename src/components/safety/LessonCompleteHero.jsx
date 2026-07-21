import React, { useMemo } from 'react';

/**
 * Inspiring Material celebration hero for the lesson completion page.
 * Badge-forward success mark with soft ambient glow.
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
        <div className="lesson-complete-hero relative mx-auto flex h-[min(34vh,14rem)] w-full max-w-[16rem] shrink-0 items-center justify-center sm:h-52 sm:max-w-[18rem]">
            <div
                className="absolute inset-[8%] rounded-full bg-gradient-to-br from-orange-300/35 via-amber-200/25 to-emerald-200/20 blur-3xl"
                aria-hidden
            />
            <div
                className="absolute inset-[18%] rounded-full bg-orange-400/10 blur-2xl"
                aria-hidden
            />

            {!prefersReducedMotion && (
                <div className="pointer-events-none absolute inset-[-4%] overflow-hidden" aria-hidden>
                    {confettiColors.map((color, i) => (
                        <span
                            key={color}
                            className="absolute h-1.5 w-1.5 rounded-full opacity-80 animate-lesson-complete-spark"
                            style={{
                                left: `${10 + (i * 13) % 78}%`,
                                top: `${6 + (i * 15) % 72}%`,
                                backgroundColor: color,
                                animationDelay: `${i * 0.14}s`,
                            }}
                        />
                    ))}
                </div>
            )}

            <div
                className={`absolute inset-[14%] rounded-full border border-orange-200/70 ${
                    prefersReducedMotion ? '' : 'animate-lesson-complete-ring'
                }`}
                aria-hidden
            />
            <div
                className={`absolute inset-[22%] rounded-full border border-amber-200/50 ${
                    prefersReducedMotion ? '' : 'animate-lesson-complete-ring-slow'
                }`}
                aria-hidden
            />

            <div
                className={`relative z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 text-white shadow-xl shadow-orange-500/35 ring-4 ring-white/80 sm:h-28 sm:w-28 ${
                    prefersReducedMotion ? '' : 'animate-lesson-complete-pop'
                }`}
            >
                <span className="text-4xl drop-shadow-sm sm:text-5xl" aria-hidden>
                    {icon}
                </span>
                <span className="mt-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black tracking-wide text-white/95 sm:text-[10px]">
                    {badgeName}
                </span>
            </div>

            <div
                className="absolute bottom-[18%] right-[22%] z-20 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-[#fffdf7] bg-emerald-500 text-white shadow-lg sm:h-10 sm:w-10"
                aria-hidden
            >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        </div>
    );
}
