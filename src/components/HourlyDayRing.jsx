import React, { useEffect, useMemo, useState } from 'react';

const CX = 140;
const CY = 140;
const R_OUT = 112;
const R_IN = 86;
const SEG = 360 / 24;
const PAD = 1.4;

const THEME = {
    played: { fill: '#34d399', stroke: '#0f172a' },
    live: { fill: '#ea580c', stroke: '#0f172a' },
    missed: { fill: '#cbd5e1', stroke: '#64748b' },
    'upcoming-next': { fill: '#fbbf24', stroke: '#0f172a' },
    upcoming: { fill: '#fffdf7', stroke: '#94a3b8' },
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

function HourlyTimeBadge({ hour, variant = 'default', className = '' }) {
    const { hour12, period } = slotTimeParts(hour);
    const variants = {
        default: 'border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0_#0f172a]',
        live: 'border-orange-600 bg-orange-500 text-white shadow-[2px_2px_0_#0f172a]',
        played: 'border-emerald-700 bg-emerald-400 text-slate-900 shadow-[2px_2px_0_#0f172a]',
        missed: 'border-slate-500 bg-slate-200 text-slate-600 shadow-[1px_1px_0_#0f172a]',
        next: 'border-amber-600 bg-amber-300 text-slate-900 shadow-[2px_2px_0_#0f172a]',
        upcoming: 'border-dashed border-slate-400 bg-white text-slate-400',
    };

    return (
        <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center border-2 rounded-lg sm:h-12 sm:w-12 ${variants[variant]} ${className}`}>
            <span className="nb-mono text-base font-black leading-none tabular-nums sm:text-lg">{hour12}</span>
            <span className={`nb-mono mt-0.5 text-[7px] font-bold tracking-[0.12em] sm:text-[8px] ${variant === 'live' ? 'text-orange-100' : 'text-slate-500'}`}>
                {period}
            </span>
        </div>
    );
}

function ClockTick({ hour }) {
    const pos = hourLabelPos(hour, R_OUT + 20);
    const { hour12, period } = slotTimeParts(hour);
    return (
        <g transform={`translate(${pos.x}, ${pos.y})`}>
            <text textAnchor="middle" dominantBaseline="middle" fill="#475569" fontSize="10" fontWeight="800" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {hour12}
            </text>
            <text textAnchor="middle" y="8" fill="#94a3b8" fontSize="6.5" fontWeight="700" letterSpacing="0.08em" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {period}
            </text>
        </g>
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
            <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-slate-500 nb-mono sm:text-[9px]">{label}</p>
            <p className={`text-lg font-black tabular-nums leading-none nb-mono sm:text-xl ${accents[accent]}`}>
                {value}
                {suffix ? <span className="ml-1 text-xs font-bold text-red-500 sm:text-sm">{suffix}</span> : null}
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

    const centerStats = [
        { key: 'done', count: playedCount, color: '#059669', en: 'DONE', bn: 'শেষ' },
        { key: 'miss', count: missedCount, color: '#64748b', en: 'MISS', bn: 'মিস' },
        { key: 'left', count: pendingCount, color: '#d97706', en: 'LEFT', bn: 'বাকি' },
    ];

    if (loading) {
        return (
            <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-2 sm:gap-3">
                <div className="aspect-square w-full max-w-[min(72vw,260px)] animate-pulse rounded-full border-2 border-slate-300 bg-white sm:max-w-[280px]" />
                <div className="nb-card h-16 w-full max-w-[min(72vw,260px)] animate-pulse bg-white sm:max-w-[280px] sm:h-20" />
            </div>
        );
    }

    const contentWidth = 'w-full max-w-[min(72vw,260px)] sm:max-w-[280px]';

    return (
        <div className="mx-auto flex w-full max-w-sm flex-col items-center">
            <div className={`relative aspect-square ${contentWidth}`}>
                <svg
                    viewBox="0 0 280 280"
                    className="h-full w-full drop-shadow-[3px_3px_0_rgba(15,23,42,0.1)]"
                    role="img"
                    aria-label={language === 'en' ? '24 hour day progress' : '২৪ ঘণ্টার দিনের অগ্রগতি'}
                >
                    <circle cx={CX} cy={CY} r={R_OUT + 10} fill="#fffdf7" stroke="#0f172a" strokeWidth="2.5" />

                    <circle cx={CX} cy={CY} r={R_OUT + 5} fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    {playedCount > 0 && (
                        <circle
                            cx={CX}
                            cy={CY}
                            r={R_OUT + 5}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                            strokeLinecap="round"
                            pathLength="24"
                            strokeDasharray={`${playedCount} 24`}
                            transform={`rotate(-90 ${CX} ${CY})`}
                            style={{ transition: 'stroke-dasharray 0.6s ease' }}
                        />
                    )}

                    {slots.map((slot) => {
                        const startDeg = slot.hour * SEG + PAD - 90;
                        const endDeg = (slot.hour + 1) * SEG - PAD - 90;
                        const isSelected = slot.hour === activeHour;
                        const isLive = slot.status === 'live';
                        const theme = THEME[slot.status] || THEME.upcoming;
                        return (
                            <path
                                key={slot.hour}
                                d={donutSegmentPath(CX, CY, R_OUT, R_IN, startDeg, endDeg)}
                                fill={theme.fill}
                                stroke={isSelected ? '#ea580c' : theme.stroke}
                                strokeWidth={isSelected ? 2.5 : isLive ? 2 : 1.25}
                                strokeDasharray={slot.status === 'upcoming' ? '2 2' : undefined}
                                className={`cursor-pointer transition-all duration-150 ${isLive ? 'hourly-ring-live' : 'hover:brightness-95'}`}
                                onClick={() => setSelectedHour(slot.hour)}
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

                    {[0, 6, 12, 18].map((h) => <ClockTick key={h} hour={h} />)}

                    <circle cx={CX} cy={CY} r={R_IN - 5} fill="#fff" stroke="#0f172a" strokeWidth="2" />
                    {centerStats.map((stat, i) => {
                        const y = CY - 23 + i * 23;
                        return (
                            <g key={stat.key}>
                                <circle cx={CX - 30} cy={y} r="3.5" fill={stat.color} stroke="#0f172a" strokeWidth="1" />
                                <text
                                    x={CX - 19}
                                    y={y}
                                    textAnchor="start"
                                    dominantBaseline="central"
                                    fill={stat.color}
                                    fontSize="17"
                                    fontWeight="800"
                                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                >
                                    {stat.count}
                                </text>
                                <text
                                    x={CX + 30}
                                    y={y}
                                    textAnchor="end"
                                    dominantBaseline="central"
                                    fill="#94a3b8"
                                    fontSize="8"
                                    fontWeight="700"
                                    letterSpacing="0.06em"
                                    style={{ fontFamily: language === 'en' ? "'IBM Plex Mono', monospace" : "'Hind Siliguri', sans-serif" }}
                                >
                                    {language === 'en' ? stat.en : stat.bn}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            <div
                id={activeSlot?.status === 'live' ? 'node-live' : activeSlot?.status === 'upcoming-next' ? 'node-upcoming-next' : undefined}
                className={`mt-3 flex min-h-[74px] items-stretch sm:mt-4 sm:min-h-[88px] ${contentWidth}`}
            >
                {activeSlot?.status === 'live' ? (
                    <button
                        type="button"
                        disabled={hourlyQuizRefreshBusy}
                        onClick={() => { void onPlayLive(); }}
                        className="live-card-glow nb-card group w-full overflow-hidden border-rose-600 bg-white p-0 text-left transition active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        <div className="relative z-10 flex items-stretch">
                            <div className="flex shrink-0 items-center border-r-2 border-slate-900 bg-orange-50 px-2 py-2 sm:px-3 sm:py-3">
                                <HourlyTimeBadge hour={activeSlot.hour} variant="live" />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-3">
                                <div className="min-w-0">
                                    <span className="nb-live-badge inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] sm:px-2 sm:text-[9px]">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" aria-hidden />
                                        {labels.liveNow}
                                    </span>
                                    {hourlyQuizRefreshBusy && (
                                        <p className="mt-0.5 text-[9px] font-bold text-amber-700 nb-mono sm:text-[10px]">
                                            {language === 'en' ? 'Updating…' : 'আপডেট…'}
                                        </p>
                                    )}
                                    {timeLeft && (
                                        <div className="mt-1 flex items-baseline gap-1.5 sm:mt-1.5 sm:gap-2">
                                            <span className="text-2xl font-black tabular-nums text-slate-900 nb-mono sm:text-3xl">{timeLeft}</span>
                                            <span className="text-[9px] font-bold uppercase text-slate-500 nb-mono sm:text-[10px]">{labels.timeLeft}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-slate-900 bg-orange-600 text-white shadow-[2px_2px_0_#0f172a] sm:h-11 sm:w-11 sm:shadow-[3px_3px_0_#0f172a]">
                                    <svg className="ml-0.5 h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                                </div>
                            </div>
                        </div>
                    </button>
                ) : activeSlot?.status === 'upcoming-next' ? (
                    <div className="nb-card w-full overflow-hidden border-amber-500 bg-gradient-to-br from-amber-50 via-[#fffdf7] to-white p-0">
                        <div className="flex h-full items-stretch">
                            <div className="flex shrink-0 items-center border-r-2 border-slate-900 bg-white px-2 py-2 sm:px-3 sm:py-3">
                                <HourlyTimeBadge hour={activeSlot.hour} variant="next" />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-2 py-2 sm:px-3 sm:py-3">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-wide text-amber-800 nb-mono sm:text-[10px]">
                                        {labels.nextChallengeLabel}
                                    </p>
                                    {timeLeft && (
                                        <div className="mt-1">
                                            <p className={`text-[9px] font-semibold text-slate-600 sm:text-[10px] ${language === 'bn' ? 'font-bengali' : 'nb-mono'}`}>
                                                {language === 'bn' ? 'শুরু হতে বাকি' : 'Starts in'}
                                            </p>
                                            <p className="text-2xl font-black tabular-nums leading-none text-slate-900 nb-mono sm:text-3xl">
                                                {timeLeft}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div
                                    className="hourly-wait-clock flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-amber-600 bg-amber-100 text-amber-700 shadow-[2px_2px_0_#0f172a] sm:h-11 sm:w-11"
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
                    <button
                        type="button"
                        onClick={onReview}
                        className="nb-card group w-full overflow-hidden border-emerald-600 bg-emerald-50 p-0 text-left transition hover:shadow-[4px_4px_0_#0f172a] sm:hover:shadow-[6px_6px_0_#0f172a]"
                    >
                        <div className="flex items-stretch">
                            <div className="flex shrink-0 items-center border-r-2 border-slate-900 bg-white px-2 py-2 sm:px-3 sm:py-3">
                                <HourlyTimeBadge hour={activeSlot.hour} variant="played" />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-3">
                                <p className="min-w-0 flex-1 text-[9px] font-black uppercase tracking-wide text-emerald-700 nb-mono sm:text-[10px]">
                                    {language === 'en' ? 'Done' : 'সম্পন্ন'}
                                </p>
                                <ScoreBlock
                                    label={language === 'en' ? 'Score' : 'স্কোর'}
                                    value={`+${activeSlot.score}`}
                                    suffix={activeSlot.penalty > 0 ? `−${activeSlot.penalty}` : null}
                                    accent="emerald"
                                />
                                <span className="hidden shrink-0 items-center gap-1 text-[9px] font-bold text-slate-500 group-hover:text-emerald-700 nb-mono sm:flex sm:text-[10px]">
                                    {language === 'en' ? 'Review' : 'দেখুন'}
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                </span>
                            </div>
                        </div>
                    </button>
                ) : activeSlot?.status === 'missed' ? (
                    <div className="nb-card w-full overflow-hidden border-dashed border-slate-500 bg-slate-100 p-0 opacity-90">
                        <div className="flex h-full items-stretch">
                            <div className="flex shrink-0 items-center border-r-2 border-dashed border-slate-500 bg-white px-2 py-2 sm:px-3 sm:py-3">
                                <HourlyTimeBadge hour={activeSlot.hour} variant="missed" />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-3">
                                <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 nb-mono sm:text-[10px]">{language === 'en' ? 'Missed' : 'মিস'}</p>
                                <ScoreBlock label={language === 'en' ? 'Score' : 'স্কোর'} value="0" accent="slate" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="nb-card w-full overflow-hidden border-dashed border-slate-400 bg-white p-0">
                        <div className="flex h-full items-stretch">
                            <div className="flex shrink-0 items-center border-r-2 border-dashed border-slate-400 bg-slate-50 px-2 py-2 sm:px-3 sm:py-3">
                                <HourlyTimeBadge hour={activeSlot?.hour ?? 0} variant="upcoming" />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-3">
                                <p className="text-[9px] font-bold uppercase text-slate-500 nb-mono sm:text-[10px]">{labels.upcomingStatus}</p>
                                <div className="ml-auto flex h-7 w-7 items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 sm:h-8 sm:w-8">
                                    <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={`mt-2 flex flex-wrap items-center justify-center gap-2 sm:mt-3 sm:gap-3 ${contentWidth}`}>
                <span className="nb-tag flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 text-[8px] text-emerald-800 sm:gap-1.5 sm:px-2 sm:text-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full border border-slate-900 bg-emerald-500 sm:h-2 sm:w-2" aria-hidden />
                    {language === 'en' ? 'Done' : 'সম্পন্ন'}
                </span>
                <span className="nb-tag flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 text-[8px] text-slate-600 sm:gap-1.5 sm:px-2 sm:text-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full border border-slate-900 bg-slate-400 sm:h-2 sm:w-2" aria-hidden />
                    {language === 'en' ? 'Missed' : 'মিস'}
                </span>
                <span className="nb-tag flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 text-[8px] text-amber-800 sm:gap-1.5 sm:px-2 sm:text-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full border border-slate-900 bg-amber-500 sm:h-2 sm:w-2" aria-hidden />
                    {language === 'en' ? 'Pending' : 'বাকি'}
                </span>
            </div>
        </div>
    );
}
