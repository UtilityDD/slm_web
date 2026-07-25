import React from 'react';

const toBn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

/**
 * Compact 3D flip status for core-lesson monthly +20 on the complete screen.
 * Claim-ready and cooldown share one quiet card — no robotic body copy.
 */
export default function LessonScoreStatusFlip({
    language = 'en',
    daysLeft = 0,
    bonusPoints = 20,
    prefersReducedMotion = false,
    compact = false,
}) {
    const bn = language === 'bn';
    const onCooldown = daysLeft > 0;
    const pts = bn ? toBn(bonusPoints) : String(bonusPoints);
    const days = bn ? toBn(daysLeft) : String(daysLeft);

    const faceA = onCooldown
        ? {
              eyebrow: null,
              hero: days,
              unit: bn ? 'দিন' : daysLeft === 1 ? 'day' : 'days',
              sub: bn ? 'পর আবার পয়েন্ট' : 'then points again',
          }
        : {
              eyebrow: bn ? 'রিভিউ পুরস্কার' : 'Review reward',
              hero: `+${pts}`,
              unit: bn ? 'পয়েন্ট' : 'points',
              sub: null,
          };

    const faceB = onCooldown
        ? {
              title: bn ? 'এখন অনুশীলন করুন' : 'Practice for now',
          }
        : {
              title: bn ? 'প্রস্তুত হলে চ্যালেঞ্জ নিন' : 'Ready? Take the challenge',
          };

    const tone = onCooldown
        ? 'border-slate-200/90 bg-gradient-to-br from-slate-50 to-white text-slate-800'
        : 'border-amber-200/90 bg-gradient-to-br from-amber-50 via-orange-50 to-white text-amber-950';

    const heroTone = onCooldown ? 'text-slate-800' : 'text-orange-600';
    const pad = compact ? 'px-3 py-2.5' : 'px-4 py-3.5';
    const wrap = compact ? 'mt-2 max-w-[15.5rem]' : 'mt-4 max-w-[17rem]';
    const heroSize = compact ? 'text-[1.65rem]' : 'text-[2rem]';
    const innerMin = compact ? 'min-h-[4.35rem]' : '';

    if (prefersReducedMotion) {
        return (
            <div
                className={`mx-auto w-full rounded-2xl border text-center shadow-sm ${wrap} ${pad} ${tone}`}
                role="status"
            >
                {faceA.eyebrow && (
                    <p className={`text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 ${bn ? 'font-bengali tracking-normal normal-case' : ''}`}>
                        {faceA.eyebrow}
                    </p>
                )}
                <p className={`${faceA.eyebrow ? 'mt-1' : ''} font-black tabular-nums leading-none ${heroSize} ${heroTone} ${bn ? 'font-bengali' : ''}`}>
                    {faceA.hero}
                    <span className="ml-1.5 text-sm font-bold text-slate-500">{faceA.unit}</span>
                </p>
                {faceA.sub && (
                    <p className={`mt-1 text-xs font-bold text-slate-600 ${bn ? 'font-bengali' : ''}`}>{faceA.sub}</p>
                )}
                <p className={`mt-1.5 text-sm font-black leading-snug text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                    {faceB.title}
                </p>
            </div>
        );
    }

    return (
        <div className={`lesson-score-flip mx-auto w-full ${wrap}`} role="status">
            <div className={`lesson-score-flip__inner rounded-2xl border shadow-sm ${innerMin} ${tone}`}>
                <div className={`lesson-score-flip__face lesson-score-flip__face--a text-center ${pad}`}>
                    {faceA.eyebrow && (
                        <p className={`text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 ${bn ? 'font-bengali tracking-normal normal-case' : ''}`}>
                            {faceA.eyebrow}
                        </p>
                    )}
                    <p className={`${faceA.eyebrow ? 'mt-1' : ''} font-black tabular-nums leading-none tracking-tight ${heroSize} ${heroTone} ${bn ? 'font-bengali' : ''}`}>
                        {faceA.hero}
                        <span className={`ml-1.5 align-middle text-sm font-bold text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                            {faceA.unit}
                        </span>
                    </p>
                    {faceA.sub && (
                        <p className={`mt-1 text-xs font-bold leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                            {faceA.sub}
                        </p>
                    )}
                </div>
                <div className={`lesson-score-flip__face lesson-score-flip__face--b flex items-center justify-center text-center ${pad}`} aria-hidden>
                    <p className={`text-sm font-black leading-snug text-slate-900 sm:text-[0.95rem] ${bn ? 'font-bengali' : ''}`}>
                        {faceB.title}
                    </p>
                </div>
            </div>
        </div>
    );
}
