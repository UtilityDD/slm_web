import React, { useEffect, useState } from 'react';

function CounterDigit({ digit, loading }) {
    return (
        <span
            className={`inline-flex items-center justify-center w-[0.7rem] sm:w-[0.85rem] h-full text-sm sm:text-base font-semibold tabular-nums leading-none text-amber-300/95 ${loading ? 'opacity-30' : ''}`}
            aria-hidden="true"
        >
            {loading ? '·' : digit}
        </span>
    );
}

export default function LandingVisitCounter({ value, loading, label, className = '' }) {
    const [display, setDisplay] = useState(0);
    const target = typeof value === 'number' && !Number.isNaN(value) ? value : 0;

    useEffect(() => {
        if (loading) return;
        if (target <= 0) {
            setDisplay(0);
            return;
        }

        const duration = 850;
        const start = performance.now();
        let frame;

        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - t) ** 3;
            setDisplay(Math.round(target * eased));
            if (t < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, loading]);

    const digits = loading ? '00000' : String(display);

    return (
        <div
            className={`inline-flex items-center h-9 sm:h-10 rounded-full border border-slate-200/80 bg-white/95 pl-3 pr-1.5 py-1 shadow-[0_2px_6px_rgba(15,23,42,0.08)] ${className}`}
            role="status"
            aria-live="polite"
            aria-busy={loading}
            aria-label={loading ? label : `${label} ${target}`}
        >
            <span className="text-xs sm:text-sm font-semibold text-slate-600 leading-none shrink-0 pr-2">
                {label}
            </span>
            <span
                className={`inline-flex items-center justify-center h-6 sm:h-7 min-w-[4.5rem] sm:min-w-[5.25rem] px-1.5 sm:px-2 rounded-md bg-gradient-to-b from-slate-800 to-slate-900 ring-1 ring-inset ring-white/10 ${loading ? 'animate-pulse' : ''}`}
                aria-hidden="true"
            >
                {digits.split('').map((digit, index) => (
                    <CounterDigit key={`${index}-${digit}`} digit={digit} loading={loading} />
                ))}
            </span>
        </div>
    );
}
