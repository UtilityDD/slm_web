import React, { useEffect, useMemo, useState } from 'react';
import { BrutalLoaderContent } from './loaders/PageLoader';

const CX = 140;
const CY = 140;
const R_OUT = 118;
const R_IN = 74;
const SEG = 360 / 24;
const PAD = 1.1;

const THEME = {
    played: { fill: '#34d399', stroke: 'transparent' },
    live: { fill: '#f97316', stroke: 'transparent' },
    missed: { fill: '#cbd5e1', stroke: 'transparent' },
    'upcoming-next': { fill: '#fbbf24', stroke: 'transparent' },
    upcoming: { fill: '#f1f5f9', stroke: 'transparent' },
};

function polar(cx, cy, r, deg) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegmentPath(cx, cy, rOut, rIn, startDeg, endDeg) {
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    const sOut = polar(cx, cy, rOut, startDeg);
    const eOut = polar(cx, cy, rOut, endDeg);
    const sIn = polar(cx, cy, rIn, endDeg);
    const eIn = polar(cx, cy, rIn, startDeg);
    return [
        `M ${sOut.x} ${sOut.y}`,
        `A ${rOut} ${rOut} 0 ${largeArc} 1 ${eOut.x} ${eOut.y}`,
        `L ${sIn.x} ${sIn.y}`,
        `A ${rIn} ${rIn} 0 ${largeArc} 0 ${eIn.x} ${eIn.y}`,
        'Z',
    ].join(' ');
}

function hourLabelPos(hour, radius) {
    const mid = hour * SEG + SEG / 2 - 90;
    return polar(CX, CY, radius, mid);
}

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

function HourlyTimeBadge({ hour, variant = 'default', className = '' }) {
    const { hour12, period } = slotTimeParts(hour);
    const variants = {
        default: 'border-slate-200/80 bg-white text-slate-900 shadow-sm',
        live: 'border-orange-300 bg-orange-500 text-white shadow-md shadow-orange-500/35',
        played: 'border-emerald-200 bg-emerald-400 text-slate-900 shadow-sm',
        missed: 'border-slate-200 bg-slate-100 text-slate-500 shadow-sm',
        next: 'border-amber-200 bg-amber-300 text-slate-900 shadow-sm',
        upcoming: 'border-dashed border-slate-300 bg-white text-slate-400',
    };

    return (
        <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border sm:h-12 sm:w-12 ${variants[variant]} ${className}`}>
            <span className="text-base font-black leading-none tabular-nums sm:text-lg">{hour12}</span>
            <span className={`mt-0.5 text-[7px] font-bold tracking-[0.12em] sm:text-[8px] ${variant === 'live' ? 'text-orange-100' : 'text-slate-500'}`}>
                {period}
            </span>
        </div>
    );
}

function ScoreBlock({ label, value, suffix, accent = 'slate' }) {
    const accents = {
        slate: 'text-slate-900',
        orange: 'text-orange-600',
        amber: 'text-amber-600',
        emerald: 'text-emerald-700',
    };
    return (
        <div className="min-w-0 shrink-0 text-right">
            <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-slate-500 sm:text-[9px]">{label}</p>
            <p className={`text-lg font-black tabular-nums leading-none sm:text-xl ${accents[accent]}`}>
                {value}
                {suffix ? <span className="ml-1 text-xs font-bold text-red-500 sm:text-sm">{suffix}</span> : null}
            </p>
        </div>
    );
}

function RingCenterFocus({ activeSlot, language, timeLeft, labels, hourlyQuizRefreshBusy }) {
    if (!activeSlot) return null;
    const { hour12, period } = slotTimeParts(activeSlot.hour);
    const bn = language === 'bn';

    if (activeSlot.status === 'live') {
        return (
            <div className="flex flex-col items-center justify-center text-center">
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-orange-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" aria-hidden />
                    {labels.liveNow}
                </span>
                {timeLeft ? (
                    <p className="text-3xl font-black tabular-nums leading-none tracking-tight text-slate-900 sm:text-4xl">
                        {timeLeft}
                    </p>
                ) : (
                    <p className="text-2xl font-black tabular-nums text-slate-900">
                        {hour12}
                        <span className="ml-1 text-xs font-bold text-slate-400">{period}</span>
                    </p>
                )}
                {hourlyQuizRefreshBusy ? (
                    <p className="mt-1 text-[9px] font-bold text-amber-600">{bn ? 'আপডেট…' : 'Updating…'}</p>
                ) : (
                    <p className={`mt-1 text-[10px] font-semibold text-slate-500 ${bn ? 'font-bengali' : 'uppercase tracking-wide'}`}>
                        {labels.timeLeft}
                    </p>
                )}
            </div>
        );
    }

    if (activeSlot.status === 'upcoming-next') {
        return (
            <div className="flex flex-col items-center justify-center text-center">
                <span className={`mb-1 text-[9px] font-black uppercase tracking-wider text-amber-600 ${bn ? 'font-bengali normal-case' : ''}`}>
                    {labels.nextChallengeLabel}
                </span>
                {timeLeft ? (
                    <p className="text-3xl font-black tabular-nums leading-none tracking-tight text-slate-900 sm:text-4xl">
                        {timeLeft}
                    </p>
                ) : (
                    <p className="text-2xl font-black tabular-nums text-slate-900">
                        {hour12}
                        <span className="ml-1 text-xs font-bold text-slate-400">{period}</span>
                    </p>
                )}
                <p className={`mt-1 text-[10px] font-semibold text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                    {bn ? 'শুরু হতে বাকি' : 'Starts in'}
                </p>
            </div>
        );
    }

    if (activeSlot.status === 'played') {
        const netScore = getSlotNetScore(activeSlot);
        return (
            <div className="flex flex-col items-center justify-center text-center">
                <span className="mb-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                    {bn ? 'নেট স্কোর' : 'Net score'}
                </span>
                <p className="text-3xl font-black tabular-nums leading-none text-emerald-600 sm:text-4xl">
                    {formatSignedScore(netScore)}
                </p>
                {activeSlot.penalty > 0 && (
                    <p className="mt-1 text-[11px] font-bold text-red-500">
                        {bn ? 'পেনাল্টি' : 'Penalty'} −{activeSlot.penalty}
                    </p>
                )}
            </div>
        );
    }

    if (activeSlot.status === 'missed') {
        return (
            <div className="flex flex-col items-center justify-center text-center">
                <p className="text-2xl font-black tabular-nums text-slate-400">
                    {hour12}
                    <span className="ml-1 text-xs font-bold text-slate-300">{period}</span>
                </p>
                <p className={`mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${bn ? 'font-bengali normal-case' : ''}`}>
                    {bn ? 'মিস' : 'Missed'}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-black tabular-nums text-slate-500">
                {hour12}
                <span className="ml-1 text-xs font-bold text-slate-400">{period}</span>
            </p>
            <p className={`mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${bn ? 'font-bengali normal-case' : ''}`}>
                {labels.upcomingStatus}
            </p>
        </div>
    );
}

export default function HourlyDayRing({
    slots,
    language,
    timeLeft,
    loading,
    hourlyQuizRefreshBusy,
    labels,
    onPlayLive,
    onReview,
}) {
    const liveSlot = slots.find((s) => s.status === 'live');
    const nextSlot = slots.find((s) => s.status === 'upcoming-next');
    const defaultHour = liveSlot?.hour ?? nextSlot?.hour ?? slots.find((s) => s.status === 'played')?.hour ?? 12;

    const [selectedHour, setSelectedHour] = useState(null);

    useEffect(() => {
        setSelectedHour(null);
    }, [liveSlot?.hour, nextSlot?.hour]);

    const activeHour = selectedHour ?? defaultHour;
    const activeSlot = slots.find((s) => s.hour === activeHour) || liveSlot || nextSlot || slots[0];
    const playedCount = useMemo(() => slots.filter((s) => s.status === 'played').length, [slots]);
    const missedCount = useMemo(() => slots.filter((s) => s.status === 'missed').length, [slots]);
    const pendingCount = Math.max(0, slots.length - playedCount - missedCount);

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
        return labels.reviewLast || labels.reviewAnswers || (language === 'en' ? 'Review answers' : 'উত্তর দেখুন');
    })();

    if (loading) {
        return (
            <div
                className="mx-auto flex min-h-[min(60vh,420px)] w-full max-w-sm flex-col items-center justify-center py-8"
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

    const contentWidth = 'w-full max-w-[min(82vw,300px)]';
    const liveMidDeg = liveSlot ? liveSlot.hour * SEG + SEG / 2 - 90 : null;
    const liveMarker = liveMidDeg != null ? polar(CX, CY, (R_OUT + R_IN) / 2, liveMidDeg) : null;

    return (
        <div className="mx-auto flex w-full max-w-sm flex-col items-center">
            <div className={`relative aspect-square ${contentWidth}`}>
                <div
                    className="pointer-events-none absolute inset-[6%] rounded-full bg-gradient-to-b from-white via-orange-50/40 to-amber-50/30 shadow-[0_12px_40px_-12px_rgba(249,115,22,0.28)]"
                    aria-hidden
                />
                {liveSlot && (
                    <div
                        className="hourly-ring-aura pointer-events-none absolute inset-[4%] rounded-full"
                        aria-hidden
                    />
                )}

                <svg
                    viewBox="0 0 280 280"
                    className="relative z-[1] h-full w-full"
                    role="img"
                    aria-label={language === 'en' ? '24 hour day progress' : '২৪ ঘণ্টার দিনের অগ্রগতি'}
                >
                    <defs>
                        <radialGradient id="hourly-hub" cx="50%" cy="45%" r="55%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="100%" stopColor="#fff7ed" />
                        </radialGradient>
                    </defs>

                    <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} fill="none" stroke="#e2e8f0" strokeWidth={R_OUT - R_IN + 2} />

                    {slots.map((slot) => {
                        const isSelected = slot.hour === activeHour;
                        const isLive = slot.status === 'live';
                        const grow = isSelected ? 4 : isLive ? 2.5 : 0;
                        const startDeg = slot.hour * SEG + PAD - 90;
                        const endDeg = (slot.hour + 1) * SEG - PAD - 90;
                        const theme = THEME[slot.status] || THEME.upcoming;
                        return (
                            <path
                                key={slot.hour}
                                d={donutSegmentPath(CX, CY, R_OUT + grow, R_IN - grow * 0.35, startDeg, endDeg)}
                                fill={theme.fill}
                                stroke={isSelected ? '#ea580c' : 'none'}
                                strokeWidth={isSelected ? 2 : 0}
                                opacity={slot.status === 'upcoming' ? 0.55 : isSelected ? 1 : 0.92}
                                className={`cursor-pointer outline-none transition-[opacity] duration-200 ease-out focus:outline-none focus-visible:outline-none ${
                                    isLive ? 'hourly-ring-live' : 'hover:opacity-100'
                                }`}
                                style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                                onClick={(e) => {
                                    setSelectedHour(slot.hour);
                                    e.currentTarget.blur();
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedHour(slot.hour);
                                    }
                                }}
                                aria-label={`${slotTimeParts(slot.hour).hour12} ${slotTimeParts(slot.hour).period} ${slot.status}`}
                            />
                        );
                    })}

                    {[0, 6, 12, 18].map((h) => {
                        const outer = hourLabelPos(h, R_OUT + 14);
                        const { hour12 } = slotTimeParts(h);
                        return (
                            <text
                                key={h}
                                x={outer.x}
                                y={outer.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#94a3b8"
                                fontSize="9"
                                fontWeight="700"
                            >
                                {hour12}
                            </text>
                        );
                    })}

                    {liveMarker && (
                        <g transform={`translate(${liveMarker.x}, ${liveMarker.y})`}>
                            <circle
                                r="5.5"
                                fill="#fff"
                                stroke="#ea580c"
                                strokeWidth="2.5"
                                className="hourly-ring-live-bead origin-center"
                                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                            />
                        </g>
                    )}

                    <circle cx={CX} cy={CY} r={R_IN - 8} fill="url(#hourly-hub)" stroke="#fed7aa" strokeWidth="1" />
                </svg>

                <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
                    <div className="flex h-[46%] w-[46%] items-center justify-center rounded-full">
                        <RingCenterFocus
                            activeSlot={activeSlot}
                            language={language}
                            timeLeft={timeLeft}
                            labels={labels}
                            hourlyQuizRefreshBusy={hourlyQuizRefreshBusy}
                        />
                    </div>
                </div>
            </div>

            <div className={`mt-3 flex items-center justify-center gap-1.5 ${contentWidth}`}>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    <span className="tabular-nums">{playedCount}</span>
                    {language === 'en' ? 'done' : 'শেষ'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    <span className="tabular-nums">{missedCount}</span>
                    {language === 'en' ? 'miss' : 'মিস'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                    <span className="tabular-nums">{pendingCount}</span>
                    {language === 'en' ? 'left' : 'বাকি'}
                </span>
            </div>

            <div
                id={activeSlot?.status === 'live' ? 'node-live' : activeSlot?.status === 'upcoming-next' ? 'node-upcoming-next' : undefined}
                className={`mt-3 flex min-h-[72px] items-stretch sm:mt-4 sm:min-h-[84px] ${contentWidth}`}
            >
                {activeSlot?.status === 'live' ? (
                    <button
                        type="button"
                        disabled={hourlyQuizRefreshBusy}
                        onClick={() => { void onPlayLive(); }}
                        className="live-card-glow group w-full overflow-hidden rounded-2xl border border-orange-200/80 bg-white p-0 text-left shadow-md shadow-orange-500/10 transition-all hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        <div className="relative z-10 flex items-stretch">
                            <div className="flex shrink-0 items-center border-r border-slate-200/80 bg-orange-50 px-2.5 py-2.5 sm:px-3">
                                <HourlyTimeBadge hour={activeSlot.hour} variant="live" />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className={`text-sm font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Play now' : 'এখন খেলুন'}
                                    </p>
                                    <p className={`mt-0.5 text-[11px] font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {labels.liveNow}
                                        {timeLeft ? ` · ${timeLeft}` : ''}
                                    </p>
                                </div>
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/35 transition-transform group-hover:scale-105">
                                    <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                                </div>
                            </div>
                        </div>
                    </button>
                ) : activeSlot?.status === 'upcoming-next' ? (
                    <div className="w-full overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-[#fffdf7] to-white p-0 shadow-sm">
                        <div className="flex h-full items-stretch">
                            <div className="flex shrink-0 items-center border-r border-slate-200/80 bg-white px-2.5 py-2.5 sm:px-3">
                                <HourlyTimeBadge hour={activeSlot.hour} variant="next" />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className={`text-sm font-black text-amber-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {labels.nextChallengeLabel}
                                    </p>
                                    {timeLeft && (
                                        <p className="mt-0.5 text-xl font-black tabular-nums leading-none text-slate-900">
                                            {timeLeft}
                                        </p>
                                    )}
                                </div>
                                <div
                                    className="hourly-wait-clock flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-100 text-amber-700 sm:h-11 sm:w-11"
                                    aria-hidden
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="9" />
                                        <path strokeLinecap="round" d="M12 7v5l3 2" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeSlot?.status === 'played' ? (
                    <div className="w-full overflow-hidden rounded-2xl border border-emerald-200/80 bg-emerald-50 p-0 shadow-sm">
                        <div className="flex items-stretch">
                            <div className="flex shrink-0 items-center border-r border-slate-200/80 bg-white px-2.5 py-2.5 sm:px-3">
                                <HourlyTimeBadge hour={activeSlot.hour} variant="played" />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5">
                                <p className={`min-w-0 flex-1 text-sm font-black text-emerald-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {language === 'en' ? 'Completed' : 'সম্পন্ন'}
                                </p>
                                <ScoreBlock
                                    label={language === 'en' ? 'Net score' : 'নেট স্কোর'}
                                    value={formatSignedScore(getSlotNetScore(activeSlot))}
                                    suffix={activeSlot.penalty > 0
                                        ? `${language === 'en' ? 'Penalty ' : 'পেনাল্টি '}−${activeSlot.penalty}`
                                        : null}
                                    accent="emerald"
                                />
                            </div>
                        </div>
                    </div>
                ) : activeSlot?.status === 'missed' ? (
                    <div className="w-full overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-0">
                        <div className="flex h-full items-stretch">
                            <div className="flex shrink-0 items-center border-r border-dashed border-slate-300 bg-white px-2.5 py-2.5 sm:px-3">
                                <HourlyTimeBadge hour={activeSlot.hour} variant="missed" />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5">
                                <p className={`text-sm font-bold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {language === 'en' ? 'Missed slot' : 'মিস হয়েছে'}
                                </p>
                                <ScoreBlock label={language === 'en' ? 'Score' : 'স্কোর'} value="0" accent="slate" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white p-0 shadow-sm">
                        <div className="flex h-full items-stretch">
                            <div className="flex shrink-0 items-center border-r border-dashed border-slate-300 bg-slate-50 px-2.5 py-2.5 sm:px-3">
                                <HourlyTimeBadge hour={activeSlot?.hour ?? 0} variant="upcoming" />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5">
                                <p className={`text-sm font-bold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {labels.upcomingStatus}
                                </p>
                                <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400">
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {reviewTarget?.quizId && typeof onReview === 'function' && (
                <button
                    type="button"
                    onClick={() => onReview(reviewTarget.quizId)}
                    className={`mt-2.5 flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.99] ${contentWidth} ${language === 'bn' ? 'font-bengali' : ''}`}
                >
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z" />
                    </svg>
                    <span>{reviewButtonLabel}</span>
                </button>
            )}
        </div>
    );
}
