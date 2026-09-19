import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BrutalLoaderContent } from './loaders/PageLoader';
import { isNightSleepSlotHour } from '../utils/hourlyNightWindow';

function slotTimeParts(hour) {
    const hour12 = hour % 12 || 12;
    const period = hour < 12 ? 'AM' : 'PM';
    return { hour12, period };
}

function getSlotNetScore(slot) {
    return (Number(slot?.score) || 0) - (Number(slot?.penalty) || 0);
}

function formatSignedScore(value) {
    if (value > 0) return `+${value}`;
    return String(value);
}

/** Sky phase from hour (0–23). Sleep window = 11 PM–5 AM (same as Home nudge). */
function skyPhaseForHour(hour) {
    const h = ((Number(hour) % 24) + 24) % 24;
    if (isNightSleepSlotHour(h)) return 'sleep';
    if (h >= 6 && h < 8) return 'dawn';
    if (h >= 8 && h < 17) return 'day';
    if (h >= 17 && h < 20) return 'dusk';
    return 'night';
}

function SleepFigure({ className = 'h-16 w-16' }) {
    return (
        <svg className={className} viewBox="0 0 64 64" aria-hidden>
            <ellipse cx="32" cy="52" rx="22" ry="6" fill="currentColor" opacity="0.12" />
            <path
                d="M14 40c0-2.2 1.8-4 4-4h20c3.3 0 6 2.7 6 6v2H18c-2.2 0-4-1.8-4-4z"
                fill="currentColor"
                opacity="0.9"
            />
            <circle cx="44" cy="30" r="8" fill="currentColor" opacity="0.95" />
            <path d="M38 30h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
            <g fill="currentColor" opacity="0.75" className="hourly-sleep-zzz">
                <text x="8" y="18" fontSize="9" fontWeight="700">z</text>
                <text x="14" y="12" fontSize="11" fontWeight="700">z</text>
                <text x="21" y="7" fontSize="13" fontWeight="700">Z</text>
            </g>
        </svg>
    );
}

function SleepMark() {
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="7" fill="#6366f1" />
            <path d="M4.5 9.2c0-.9.7-1.6 1.6-1.6h4.2c1.1 0 2 .9 2 2v.4H6.1c-.9 0-1.6-.7-1.6-1.6z" fill="#e0e7ff" />
            <circle cx="11.2" cy="6.2" r="2.1" fill="#e0e7ff" />
            <text x="3.2" y="5.2" fill="#c7d2fe" fontSize="4.5" fontWeight="700">z</text>
        </svg>
    );
}

/**
 * Sun arcs 6 AM→6 PM (left→zenith→right).
 * Moon arcs 7 PM→5 AM across the *upper* sky only (never through title text).
 */
function celestialPos(hour) {
    const h = ((Number(hour) % 24) + 24) % 24;
    if (h >= 6 && h < 19) {
        const t = (h - 6) / 12;
        return {
            kind: 'sun',
            x: 34 + t * 212,
            // Day sun may dip toward horizon at edges; stay mostly above mid card
            y: 48 + (1 - Math.sin(t * Math.PI)) * 78,
            t,
        };
    }
    const nightIndex = h >= 19 ? h - 19 : h + 5;
    const t = nightIndex / 10;
    return {
        kind: 'moon',
        x: 42 + t * 196,
        // Keep moon in the top band so time/title stay clear
        y: 28 + Math.sin(t * Math.PI) * 22,
        t,
        sleep: isNightSleepSlotHour(h),
    };
}

function SkyDecor({ hour, phase }) {
    const pos = celestialPos(hour);
    const glowCx = `${(pos.x / 280) * 100}%`;
    const glowCy = `${(pos.y / 200) * 100}%`;
    const isMoon = pos.kind === 'moon';

    return (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 280 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <defs>
                <radialGradient id="hourly-celestial-glow" cx={glowCx} cy={glowCy} r="42%">
                    {isMoon ? (
                        <>
                            <stop offset="0%" stopColor={pos.sleep ? '#e0e7ff' : '#fef9c3'} stopOpacity="0.4" />
                            <stop offset="55%" stopColor={pos.sleep ? '#6366f1' : '#a5b4fc'} stopOpacity="0.12" />
                            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
                        </>
                    ) : (
                        <>
                            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
                            <stop offset="45%" stopColor={phase === 'dusk' ? '#fb923c' : phase === 'dawn' ? '#fdba74' : '#38bdf8'} stopOpacity="0.35" />
                            <stop offset="100%" stopColor={phase === 'dusk' ? '#a78bfa' : '#7dd3fc'} stopOpacity="0" />
                        </>
                    )}
                </radialGradient>
            </defs>
            <rect width="280" height="200" fill="url(#hourly-celestial-glow)" />

            {!isMoon && (
                <>
                    <ellipse cx="55" cy="78" rx="36" ry="13" fill="#fff" opacity="0.28" />
                    <ellipse cx="110" cy="58" rx="28" ry="11" fill="#fff" opacity="0.22" />
                </>
            )}
            {isMoon && (
                <>
                    {/* Blinking stars — keep clear of center title band */}
                    <g className="hourly-night-stars" fill="#fff">
                        <circle className="hourly-star hourly-star--a" cx="36" cy="52" r="1.35" />
                        <circle className="hourly-star hourly-star--b" cx="58" cy="78" r="1.05" />
                        <circle className="hourly-star hourly-star--c" cx="88" cy="44" r="1.2" />
                        <circle className="hourly-star hourly-star--d" cx="118" cy="68" r="0.9" />
                        <circle className="hourly-star hourly-star--a" cx="148" cy="38" r="1.15" />
                        <circle className="hourly-star hourly-star--b" cx="176" cy="72" r="1" />
                        <circle className="hourly-star hourly-star--c" cx="208" cy="48" r="1.25" />
                        <circle className="hourly-star hourly-star--d" cx="238" cy="66" r="0.95" />
                        <circle className="hourly-star hourly-star--a" cx="258" cy="92" r="1.1" />
                        <circle className="hourly-star hourly-star--b" cx="24" cy="108" r="0.85" />
                        <circle className="hourly-star hourly-star--c" cx="262" cy="128" r="1" />
                        <circle className="hourly-star hourly-star--d" cx="96" cy="118" r="0.8" />
                    </g>

                    {/* Soft night clouds — lower edges, under moon path */}
                    <g className="hourly-night-clouds" fill="#c7d2fe" opacity="0.22">
                        <g className="hourly-night-cloud hourly-night-cloud--a">
                            <ellipse cx="52" cy="158" rx="34" ry="11" />
                            <ellipse cx="34" cy="154" rx="16" ry="9" />
                            <ellipse cx="70" cy="152" rx="18" ry="10" />
                        </g>
                        <g className="hourly-night-cloud hourly-night-cloud--b" opacity="0.85">
                            <ellipse cx="210" cy="168" rx="40" ry="12" />
                            <ellipse cx="188" cy="164" rx="18" ry="9" />
                            <ellipse cx="232" cy="162" rx="20" ry="11" />
                        </g>
                        <g className="hourly-night-cloud hourly-night-cloud--c" opacity="0.7">
                            <ellipse cx="130" cy="178" rx="28" ry="9" />
                            <ellipse cx="114" cy="175" rx="14" ry="7" />
                            <ellipse cx="146" cy="174" rx="15" ry="8" />
                        </g>
                    </g>
                </>
            )}

            <g
                className="hourly-celestial-body"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
            >
                {isMoon ? (
                    <g opacity="0.88">
                        <circle r={18} fill={pos.sleep ? '#f8fafc' : '#fefce8'} />
                        <circle cx={-7} cy={-4} r={14} fill={pos.sleep ? '#312e81' : '#4338ca'} opacity="0.42" />
                    </g>
                ) : (
                    <g className="hourly-sky-sun">
                        <circle r={phase === 'dawn' || phase === 'dusk' ? 24 : 20} fill={phase === 'dusk' ? '#fb923c' : '#facc15'} />
                        <g stroke={phase === 'dusk' ? '#fdba74' : '#fde047'} strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
                            <path d="M0 -32v5M0 27v5M32 0h-5M-27 0h-5M22 -22l-3.5 3.5M-18.5 18.5l-3.5 3.5M22 22l-3.5 -3.5M-18.5 -18.5l-3.5 -3.5" />
                        </g>
                    </g>
                )}
            </g>
        </svg>
    );
}

function skyCardClass(phase, status) {
    const base = {
        dawn: 'hourly-sky-card--dawn text-amber-950',
        day: 'hourly-sky-card--day text-sky-950',
        dusk: 'hourly-sky-card--dusk text-white',
        night: 'hourly-sky-card--night text-indigo-50',
        sleep: 'hourly-sky-card--sleep text-indigo-50',
    }[phase] || 'hourly-sky-card--day text-sky-950';

    if (status === 'missed') return `${base} opacity-80`;
    if (status === 'played') return `${base} hourly-sky-card--done`;
    if (status === 'live' || status === 'open') return `${base} hourly-sky-card--playable`;
    return base;
}

function StatusMark({ status, sleepHour = false }) {
    if (status === 'played') {
        return (
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden>
                <circle cx="8" cy="8" r="7" fill="#34d399" />
                <path d="M4.8 8.2l2.1 2.1 4.3-4.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (status === 'live') {
        return (
            <svg className="hourly-strip-live-mark h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden>
                <circle cx="8" cy="8" r="7" fill="#f97316" />
                <circle cx="8" cy="8" r="2.5" fill="#fff" />
            </svg>
        );
    }
    if (status === 'open') {
        return (
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden>
                <circle cx="8" cy="8" r="6.25" fill="#fbbf24" stroke="#d97706" strokeWidth="1.25" />
            </svg>
        );
    }
    if (sleepHour) {
        return <SleepMark />;
    }
    if (status === 'upcoming-next') {
        return (
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden>
                <circle cx="8" cy="8" r="6.25" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.25" />
            </svg>
        );
    }
    if (status === 'missed') {
        return (
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden>
                <circle cx="8" cy="8" r="6.25" fill="#e2e8f0" />
                <path d="M5 8h6" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="5.75" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
        </svg>
    );
}

function cellTone(status, selected, sleepHour = false) {
    if (selected) {
        if (status === 'live') return 'bg-orange-500 text-white';
        if (status === 'open') return 'bg-amber-400 text-amber-950';
        if (status === 'played') return 'bg-emerald-500 text-white';
        if (status === 'upcoming-next') return 'bg-amber-200 text-amber-950';
        if (sleepHour) return 'bg-indigo-500 text-indigo-50';
        if (status === 'missed') return 'bg-slate-300 text-slate-700';
        return 'bg-white text-slate-800';
    }
    if (status === 'live') return 'bg-orange-100 text-orange-800';
    if (status === 'open') return 'bg-amber-50 text-amber-900';
    if (status === 'played') return 'bg-emerald-50 text-emerald-800';
    if (status === 'upcoming-next') return 'bg-amber-50/80 text-amber-800';
    if (sleepHour) return 'bg-indigo-50 text-indigo-700';
    if (status === 'missed') return 'bg-slate-100 text-slate-400';
    return 'bg-white/70 text-slate-400';
}

export default function HourlyDayRing({
    slots,
    language,
    timeLeft,
    loading,
    hourlyQuizRefreshBusy,
    labels,
    onPlaySlot,
    onReview,
    lastNightSlot = null,
}) {
    const bn = language === 'bn';
    const liveSlot = slots.find((s) => s.status === 'live');
    const openSlot = slots.find((s) => s.status === 'open');
    const nextSlot = slots.find((s) => s.status === 'upcoming-next');
    const defaultHour = liveSlot?.hour ?? openSlot?.hour ?? nextSlot?.hour ?? slots.find((s) => s.status === 'played')?.hour ?? 12;

    const [selectedHour, setSelectedHour] = useState(null);
    const stripRef = useRef(null);
    const cellRefs = useRef({});
    const stripJumping = useRef(false);
    const LOOP_COPIES = 3;
    const MID_COPY = 1;

    const loopedSlots = useMemo(() => {
        const out = [];
        for (let copy = 0; copy < LOOP_COPIES; copy += 1) {
            slots.forEach((slot) => {
                out.push({ ...slot, _copy: copy, _key: `${copy}-${slot.hour}` });
            });
        }
        return out;
    }, [slots]);

    useEffect(() => {
        setSelectedHour(null);
    }, [liveSlot?.hour, nextSlot?.hour]);

    const activeHour = selectedHour ?? defaultHour;
    const activeSlot = slots.find((s) => s.hour === activeHour) || liveSlot || nextSlot || slots[0];

    const latestReviewable = useMemo(() => {
        const played = slots.filter((s) => s.status === 'played' && s.quizId);
        if (!played.length) return null;
        const withReview = played.filter((s) => s.hasReview).sort((a, b) => b.hour - a.hour);
        if (withReview.length) return withReview[0];
        return [...played].sort((a, b) => b.hour - a.hour)[0];
    }, [slots]);

    const reviewTarget =
        activeSlot?.status === 'played' && activeSlot?.quizId
            ? activeSlot
            : latestReviewable;

    const reviewButtonLabel = (() => {
        if (!reviewTarget) return '';
        if (activeSlot?.status === 'played' && labels.reviewHour) {
            return labels.reviewHour.replace('%s', reviewTarget.label || '');
        }
        return labels.reviewLast || labels.reviewAnswers || (language === 'en' ? 'Review' : 'রিভিউ');
    })();

    const scrollStripToHour = (hour, { smooth = true } = {}) => {
        const el = cellRefs.current[`${MID_COPY}-${hour}`] || cellRefs.current[hour];
        const strip = stripRef.current;
        if (!el || !strip) return;
        const target = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
        strip.scrollTo({ left: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' });
    };

    const normalizeStripLoop = () => {
        const strip = stripRef.current;
        if (!strip || stripJumping.current) return;
        const setWidth = strip.scrollWidth / LOOP_COPIES;
        if (setWidth <= 0) return;
        if (strip.scrollLeft < setWidth * 0.45) {
            stripJumping.current = true;
            strip.scrollLeft += setWidth;
            stripJumping.current = false;
        } else if (strip.scrollLeft > setWidth * 1.55) {
            stripJumping.current = true;
            strip.scrollLeft -= setWidth;
            stripJumping.current = false;
        }
    };

    const syncHourFromStripCenter = () => {
        const strip = stripRef.current;
        if (!strip) return;
        const center = strip.scrollLeft + strip.clientWidth / 2;
        let bestHour = null;
        let bestDist = Infinity;
        Object.keys(cellRefs.current).forEach((key) => {
            if (!key.includes('-')) return;
            const el = cellRefs.current[key];
            if (!el) return;
            const mid = el.offsetLeft + el.offsetWidth / 2;
            const dist = Math.abs(mid - center);
            if (dist < bestDist) {
                bestDist = dist;
                bestHour = Number(key.split('-')[1]);
            }
        });
        if (bestHour != null && Number.isFinite(bestHour) && bestHour !== activeHour) {
            setSelectedHour(bestHour);
        }
    };

    const onStripScroll = () => {
        normalizeStripLoop();
        syncHourFromStripCenter();
    };

    useLayoutEffect(() => {
        if (loading) return undefined;
        const strip = stripRef.current;
        if (!strip) return undefined;

        const place = () => {
            scrollStripToHour(activeHour, { smooth: false });
        };
        place();
        const t = window.setTimeout(place, 40);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, slots.length]);

    if (loading) {
        return (
            <div
                className="flex min-h-0 flex-1 flex-col items-center justify-center py-8"
                role="status"
                aria-live="polite"
                aria-busy="true"
            >
                <BrutalLoaderContent
                    compact
                    message={language === 'bn' ? 'ঘণ্টার কুইজ লোড হচ্ছে…' : 'Loading hourly challenge…'}
                />
            </div>
        );
    }

    const { hour12, period } = slotTimeParts(activeSlot?.hour ?? 0);
    const canPlay = activeSlot?.status === 'live' || activeSlot?.status === 'open';
    const netScore = getSlotNetScore(activeSlot);
    const skyPhase = skyPhaseForHour(activeSlot?.hour ?? 12);
    const isSleep = skyPhase === 'sleep';
    const isDarkSky = isSleep || skyPhase === 'night' || skyPhase === 'dusk';

    let heroTitle = labels.upcomingStatus;
    let heroSub = '';

    if (activeSlot?.status === 'live') {
        heroTitle = language === 'en' ? 'Play' : 'খেলুন';
        heroSub = timeLeft || '';
    } else if (activeSlot?.status === 'open') {
        heroTitle = language === 'en' ? 'Play' : 'খেলুন';
        heroSub = Number.isFinite(Number(activeSlot.closesInMin))
            ? (bn ? `${activeSlot.closesInMin} মি` : `${activeSlot.closesInMin}m`)
            : '';
    } else if (activeSlot?.status === 'upcoming-next') {
        heroTitle = labels.nextChallengeLabel;
        heroSub = timeLeft || '';
    } else if (activeSlot?.status === 'played') {
        heroTitle = formatSignedScore(netScore);
        heroSub = bn ? 'সম্পন্ন' : 'Done';
    } else if (isSleep) {
        heroTitle = bn ? 'ঘুমানোর সময়' : 'Time to sleep';
        heroSub = '';
    } else if (activeSlot?.status === 'missed') {
        heroTitle = bn ? 'মিস' : 'Missed';
        heroSub = '';
    }

    const cardClass = `hourly-sky-card ${skyCardClass(skyPhase, activeSlot?.status)}`;
    const subClass = `mt-2 text-xl font-bold tabular-nums leading-none ${
        isDarkSky ? 'text-white/85' : 'opacity-80'
    }`;

    const heroInner = (
        <>
            <SkyDecor phase={skyPhase} hour={activeSlot?.hour ?? 12} />
            <div className="hourly-sky-card__rim" aria-hidden />
            <div className="hourly-sky-card__content relative z-[1] flex flex-col items-center justify-center px-5 text-center">
                <span className={`hourly-sky-card__time tabular-nums ${isDarkSky ? 'text-white/90' : 'text-black/45'}`}>
                    {hour12}
                    <span className="ml-1 text-[0.7em] font-bold">{period}</span>
                </span>
                {isSleep && !canPlay && activeSlot?.status !== 'played' ? (
                    <span className="mt-3 text-indigo-100">
                        <SleepFigure className="h-[4.25rem] w-[4.25rem]" />
                    </span>
                ) : null}
                <span className={`mt-2 text-3xl font-bold leading-none tracking-tight sm:text-4xl ${bn ? 'font-bengali' : ''}`}>
                    {heroTitle}
                </span>
                {heroSub ? <span className={subClass}>{heroSub}</span> : null}
                {canPlay ? (
                    <span
                        className={`mt-5 flex h-12 w-12 items-center justify-center rounded-full ${
                            isDarkSky ? 'bg-white/20 text-white' : 'bg-black/10'
                        }`}
                        aria-hidden
                    >
                        <svg className="ml-0.5 h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </span>
                ) : null}
                {isSleep && canPlay ? (
                    <span className="mt-3 text-indigo-100/90">
                        <SleepFigure className="h-10 w-10" />
                    </span>
                ) : null}
            </div>
        </>
    );

    return (
        <div className="flex min-h-0 w-full flex-1 flex-col">
            {/* Hero */}
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1">
                {canPlay ? (
                    <button
                        type="button"
                        id="node-live"
                        disabled={hourlyQuizRefreshBusy}
                        onClick={() => { void onPlaySlot?.(activeSlot.slot || activeSlot); }}
                        className={`${cardClass} disabled:opacity-60`}
                    >
                        {heroInner}
                    </button>
                ) : (
                    <div
                        id={activeSlot?.status === 'upcoming-next' ? 'node-upcoming-next' : undefined}
                        className={cardClass}
                    >
                        {heroInner}
                    </div>
                )}

                {lastNightSlot && typeof onPlaySlot === 'function' && (
                    <button
                        type="button"
                        disabled={hourlyQuizRefreshBusy}
                        onClick={() => { void onPlaySlot(lastNightSlot); }}
                        className={`mt-3 text-sm font-bold text-indigo-700 underline-offset-2 hover:underline disabled:opacity-50 ${bn ? 'font-bengali' : ''}`}
                    >
                        {bn ? 'গত রাত ১১টা' : 'Last night 11 PM'}
                    </button>
                )}

                {reviewTarget?.quizId && typeof onReview === 'function' && (
                    <button
                        type="button"
                        id="hourly-review-last"
                        onClick={() => onReview(reviewTarget.quizId)}
                        className={`mt-3 text-sm font-bold text-emerald-700 underline-offset-2 hover:underline ${bn ? 'font-bengali' : ''}`}
                    >
                        {reviewButtonLabel}
                    </button>
                )}
            </div>

            {/* Horizontal day strip — infinite loop */}
            <div className="hourly-strip-wrap shrink-0">
                <div
                    ref={stripRef}
                    className="hourly-strip-scroll flex snap-x snap-mandatory gap-2.5 overflow-x-auto"
                    role="listbox"
                    aria-label={language === 'en' ? 'Hours today' : 'আজকের ঘণ্টা'}
                    onScroll={onStripScroll}
                >
                    {loopedSlots.map((slot) => {
                        const selected = slot.hour === activeHour;
                        const parts = slotTimeParts(slot.hour);
                        const sleepHour = isNightSleepSlotHour(slot.hour);
                        return (
                            <button
                                key={slot._key}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                ref={(node) => {
                                    if (!node) return;
                                    cellRefs.current[slot._key] = node;
                                    if (slot._copy === MID_COPY) {
                                        cellRefs.current[slot.hour] = node;
                                    }
                                }}
                                onClick={() => {
                                    setSelectedHour(slot.hour);
                                    window.requestAnimationFrame(() => {
                                        scrollStripToHour(slot.hour, { smooth: true });
                                    });
                                }}
                                className={`hourly-strip-cell flex w-[3.35rem] shrink-0 snap-center flex-col items-center justify-center gap-1 rounded-2xl py-2.5 ${
                                    selected ? 'hourly-strip-cell--selected' : ''
                                } ${cellTone(slot.status, selected, sleepHour)}`}
                            >
                                <span className="text-lg font-bold leading-none tabular-nums">{parts.hour12}</span>
                                <span className="text-[0.6rem] font-bold leading-none opacity-70">{parts.period}</span>
                                <StatusMark status={slot.status} sleepHour={sleepHour} />
                            </button>
                        );
                    })}
                </div>
                <svg className="mx-auto mt-0.5 h-2 w-[min(100%,20rem)]" viewBox="0 0 320 8" aria-hidden>
                    <defs>
                        <linearGradient id="hourly-strip-rail" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#fdba74" stopOpacity="0.15" />
                            <stop offset="50%" stopColor="#fb923c" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#fdba74" stopOpacity="0.15" />
                        </linearGradient>
                    </defs>
                    <rect x="0" y="2.5" width="320" height="3" rx="1.5" fill="url(#hourly-strip-rail)" />
                </svg>
            </div>
        </div>
    );
}
