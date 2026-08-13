import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import HallOfFamePrizeImage from './HallOfFamePrizeImage';
import AvatarPhoto from './AvatarPhoto';
import { AVATAR_EDGE } from '../utils/avatarImage';
import {
    buildMonthWinnerRevealSlides,
    getLatestDeclaredPrizeMonth,
    hasSeenMonthWinners,
    markMonthWinnersSeen,
} from '../utils/monthWinnersReveal';

const DWELL_MS = 1300;
const INTRO_MS = 1100;
const WINNER_FACE_MS = 2400;
const PRIZE_FACE_MS = 2600;
const EXIT_MS = 320;

function playTone(ctx, master, freq, start, duration, type = 'triangle', volume = 0.12) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
}

function playNoiseBurst(ctx, master, start, duration = 0.18, volume = 0.08) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(start);
    src.stop(start + duration + 0.02);
}

/** Soft opening fanfare when the modal appears. */
function playRevealOpenSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const master = ctx.createGain();
        master.gain.value = 0.14;
        master.connect(ctx.destination);
        const now = ctx.currentTime + 0.02;

        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            playTone(ctx, master, freq, now + i * 0.11, 0.28, 'triangle', 0.1);
        });
        playTone(ctx, master, 1318.51, now + 0.48, 0.4, 'sine', 0.07);

        setTimeout(() => {
            if (ctx.state !== 'closed') ctx.close().catch(() => {});
        }, 1600);
    } catch {
        // ignore
    }
}

/** Punchy celebration burst when a winner photo appears. */
function playWinnerBurstSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const master = ctx.createGain();
        master.gain.value = 0.18;
        master.connect(ctx.destination);
        const now = ctx.currentTime + 0.01;

        // Confetti-like noise pop
        playNoiseBurst(ctx, master, now, 0.16, 0.1);

        // Bright major sparkle arpeggio
        const sparkle = [784, 988, 1175, 1568, 1976];
        sparkle.forEach((freq, i) => {
            playTone(ctx, master, freq, now + 0.04 + i * 0.045, 0.2, i % 2 ? 'sine' : 'triangle', 0.11 - i * 0.012);
        });

        // Warm resolve chord
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            playTone(ctx, master, freq, now + 0.28 + i * 0.02, 0.45, 'sine', 0.07);
        });

        setTimeout(() => {
            if (ctx.state !== 'closed') ctx.close().catch(() => {});
        }, 1200);
    } catch {
        // ignore
    }
}

const BURST_PARTICLES = [
    { x: 0, y: -1, delay: 0 },
    { x: 0.7, y: -0.7, delay: 0.04 },
    { x: 1, y: 0, delay: 0.02 },
    { x: 0.7, y: 0.7, delay: 0.06 },
    { x: 0, y: 1, delay: 0.03 },
    { x: -0.7, y: 0.7, delay: 0.05 },
    { x: -1, y: 0, delay: 0.01 },
    { x: -0.7, y: -0.7, delay: 0.07 },
    { x: 0.4, y: -0.9, delay: 0.08 },
    { x: 0.9, y: 0.35, delay: 0.05 },
    { x: -0.35, y: 0.9, delay: 0.09 },
    { x: -0.95, y: -0.25, delay: 0.04 },
];

function WinnerAvatar({ name, src }) {
    const [failed, setFailed] = useState(false);
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

    if (!src || failed) {
        return (
            <span className="month-winners-reveal__avatar-fallback" aria-hidden>
                {initial}
            </span>
        );
    }

    return (
        <AvatarPhoto
            url={src}
            edge={AVATAR_EDGE.podium}
            alt=""
            className="month-winners-reveal__avatar-img"
            loading="eager"
            onError={() => setFailed(true)}
        />
    );
}

function WinnerBurst({ active, reduceMotion }) {
    if (!active || reduceMotion) return null;
    return (
        <div className="month-winners-burst" aria-hidden>
            <span className="month-winners-burst__ring" />
            <span className="month-winners-burst__ring month-winners-burst__ring--late" />
            <span className="month-winners-burst__flash" />
            {BURST_PARTICLES.map((p, i) => (
                <span
                    key={i}
                    className={`month-winners-burst__dot c-${i % 5}`}
                    style={{
                        '--bx': p.x,
                        '--by': p.y,
                        animationDelay: `${p.delay}s`,
                    }}
                />
            ))}
            {Array.from({ length: 6 }, (_, i) => (
                <span
                    key={`s-${i}`}
                    className="month-winners-burst__star"
                    style={{
                        '--rot': `${i * 60}deg`,
                        animationDelay: `${0.02 + i * 0.03}s`,
                    }}
                />
            ))}
        </div>
    );
}

/**
 * Soft celebration slideshow over the monthly leaderboard for the latest
 * declared prize month. Once per month (localStorage). Tiny ✕ to dismiss.
 * Admins always see it for review (seen flag ignored, not written).
 *
 * Per winner: show photo → flip card → prize + sponsor → next.
 */
export default function MonthWinnersReveal({
    language = 'bn',
    hallOfFameData = [],
    ready = false,
    active = false,
    blocked = false,
    isAdmin = false,
    onOpenChange,
}) {
    const isBn = language === 'bn';
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false);
    const [phase, setPhase] = useState('intro'); // intro | slides | exiting
    const [slideIndex, setSlideIndex] = useState(0);
    const [face, setFace] = useState('winner'); // winner | prize
    const [reduceMotion, setReduceMotion] = useState(false);

    const monthRef = useRef(null); // { year, month }
    const timersRef = useRef([]);
    const startedKeyRef = useRef(null);
    const onOpenChangeRef = useRef(onOpenChange);
    onOpenChangeRef.current = onOpenChange;

    useEffect(() => {
        onOpenChangeRef.current?.(open);
        return () => {
            if (open) onOpenChangeRef.current?.(false);
        };
    }, [open]);

    const clearTimers = useCallback(() => {
        timersRef.current.forEach((t) => clearTimeout(t));
        timersRef.current = [];
    }, []);

    const schedule = useCallback((fn, ms) => {
        const id = setTimeout(fn, ms);
        timersRef.current.push(id);
        return id;
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReduceMotion(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    const targetMonth = useMemo(
        () => getLatestDeclaredPrizeMonth(hallOfFameData),
        [hallOfFameData]
    );

    const slides = useMemo(() => {
        if (!targetMonth) return [];
        return buildMonthWinnerRevealSlides(
            language,
            hallOfFameData,
            targetMonth.year,
            targetMonth.month
        );
    }, [language, hallOfFameData, targetMonth]);

    const monthKey = targetMonth
        ? `${targetMonth.year}-${targetMonth.month}`
        : null;

    const finish = useCallback((opts = {}) => {
        // Admins never persist "seen" so they can re-review on next visit.
        const markSeen = !isAdmin && opts.markSeen !== false;
        const month = monthRef.current;
        if (markSeen && month) markMonthWinnersSeen(month.year, month.month);
        clearTimers();
        setPhase('exiting');
        setVisible(false);
        schedule(() => {
            setOpen(false);
            setPhase('intro');
            setSlideIndex(0);
            setFace('winner');
            monthRef.current = null;
            if (!markSeen) {
                startedKeyRef.current = null;
            }
        }, reduceMotion ? 0 : EXIT_MS);
    }, [clearTimers, isAdmin, reduceMotion, schedule]);

    useEffect(() => {
        if (!active) startedKeyRef.current = null;
    }, [active]);

    useEffect(() => {
        if (!ready || !active || blocked || open) return;
        if (!targetMonth || slides.length === 0) return;
        if (!isAdmin && hasSeenMonthWinners(targetMonth.year, targetMonth.month)) return;
        if (startedKeyRef.current === monthKey) return;

        const dwell = schedule(() => {
            if (!isAdmin && hasSeenMonthWinners(targetMonth.year, targetMonth.month)) return;
            startedKeyRef.current = monthKey;
            monthRef.current = { year: targetMonth.year, month: targetMonth.month };
            setOpen(true);
            setPhase('intro');
            setSlideIndex(0);
            setFace('winner');
            requestAnimationFrame(() => setVisible(true));
            if (!reduceMotion) playRevealOpenSound();
        }, DWELL_MS);

        return () => clearTimeout(dwell);
    }, [
        ready,
        active,
        blocked,
        open,
        isAdmin,
        targetMonth,
        slides.length,
        monthKey,
        reduceMotion,
        schedule,
    ]);

    useEffect(() => {
        if (!open) return;
        if (blocked || !active) {
            finish({ markSeen: false });
        }
    }, [blocked, active, open, finish]);

    // Celebration burst + sound each time a winner photo face appears
    useEffect(() => {
        if (!open || !visible || phase !== 'slides' || face !== 'winner') return;
        if (reduceMotion) return;
        playWinnerBurstSound();
    }, [open, visible, phase, face, slideIndex, reduceMotion]);

    // Intro → winner face → flip to prize → next winner → finish
    useEffect(() => {
        if (!open || !visible || phase === 'exiting') return undefined;
        clearTimers();

        const winnerMs = reduceMotion ? 700 : WINNER_FACE_MS;
        const prizeMs = reduceMotion ? 800 : PRIZE_FACE_MS;

        if (phase === 'intro') {
            schedule(() => {
                setFace('winner');
                setSlideIndex(0);
                setPhase('slides');
            }, reduceMotion ? 400 : INTRO_MS);
            return clearTimers;
        }

        if (phase === 'slides') {
            if (face === 'winner') {
                schedule(() => setFace('prize'), winnerMs);
            } else if (slideIndex >= slides.length - 1) {
                schedule(() => finish({ markSeen: true }), prizeMs);
            } else {
                schedule(() => {
                    setFace('winner');
                    setSlideIndex((i) => i + 1);
                }, prizeMs);
            }
            return clearTimers;
        }

        return undefined;
    }, [
        open,
        visible,
        phase,
        face,
        slideIndex,
        slides.length,
        reduceMotion,
        clearTimers,
        schedule,
        finish,
    ]);

    useEffect(() => () => clearTimers(), [clearTimers]);

    if (!open || slides.length === 0) return null;

    const slide = slides[Math.min(slideIndex, slides.length - 1)];
    const monthLabel = slide?.monthLabel || '';
    const copy = isBn
        ? {
              congrats: 'অভিনন্দন',
              winnersOfMonth: 'মাসের বিজয়ী',
              winners: 'বিজয়ী ঘোষণা',
              close: 'বন্ধ',
              winner: 'বিজেতা',
              prize: 'পুরস্কার',
              courtesy: 'সৌজন্যে',
          }
        : {
              congrats: 'Congratulations',
              winnersOfMonth: 'Winners of the month',
              winners: 'Winners',
              close: 'Close',
              winner: 'Winner',
              prize: 'Prize',
              courtesy: 'Courtesy of',
          };

    const flipped = face === 'prize';

    return createPortal(
        <div
            className={`month-winners-reveal ${visible ? 'is-visible' : ''} ${
                reduceMotion ? 'is-reduced' : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={`${copy.winnersOfMonth} — ${monthLabel}`}
        >
            <div className="month-winners-reveal__dim" aria-hidden />

            <div className="month-winners-reveal__card">
                <button
                    type="button"
                    className="month-winners-reveal__close"
                    onClick={() => finish({ markSeen: true })}
                    aria-label={copy.close}
                >
                    ×
                </button>

                {!reduceMotion && (
                    <div className="month-winners-reveal__fx" aria-hidden>
                        {Array.from({ length: 14 }, (_, i) => (
                            <span key={i} className={`month-winners-spark s-${i % 6}`} />
                        ))}
                        <span className="month-winners-sweep" />
                    </div>
                )}

                <header className="month-winners-reveal__header">
                    <p className={`month-winners-reveal__header-label ${isBn ? 'font-bengali' : ''}`}>
                        {copy.winnersOfMonth}
                    </p>
                    <h2 className={`month-winners-reveal__header-month ${isBn ? 'font-bengali' : ''}`}>
                        {monthLabel}
                    </h2>
                </header>

                {phase === 'intro' || phase === 'exiting' ? (
                    <div className="month-winners-reveal__intro">
                        <h3 className={`month-winners-reveal__title ${isBn ? 'font-bengali' : ''}`}>
                            {copy.congrats}
                        </h3>
                    </div>
                ) : (
                    <div className="month-winners-reveal__slide">
                        <div className="month-winners-reveal__meta">
                            <span className="month-winners-reveal__medal" aria-hidden>
                                {slide.medal}
                            </span>
                            <div className="min-w-0">
                                <p className={`month-winners-reveal__board ${isBn ? 'font-bengali' : ''}`}>
                                    {slide.boardLabel}
                                    <span className="month-winners-reveal__rank"> · {slide.rankLabel}</span>
                                </p>
                            </div>
                        </div>

                        <div className="month-winners-flip" key={slide.id}>
                            <div
                                className={`month-winners-flip__inner ${flipped ? 'is-flipped' : ''} ${
                                    reduceMotion ? 'is-instant' : ''
                                }`}
                            >
                                {/* Front — winner photo */}
                                <div className="month-winners-flip__face month-winners-flip__front">
                                    <p className={`month-winners-flip__label ${isBn ? 'font-bengali' : ''}`}>
                                        {copy.winner}
                                    </p>
                                    <div className="month-winners-reveal__avatar-stage">
                                        <WinnerBurst
                                            active={face === 'winner'}
                                            reduceMotion={reduceMotion}
                                        />
                                        <div className="month-winners-reveal__avatar-wrap">
                                            <WinnerAvatar
                                                name={slide.winnerName}
                                                src={slide.winnerAvatarUrl}
                                            />
                                        </div>
                                    </div>
                                    <p className={`month-winners-reveal__name ${isBn ? 'font-bengali' : ''}`}>
                                        {slide.winnerName}
                                    </p>
                                    {slide.winnerDistrict ? (
                                        <p className={`month-winners-reveal__district ${isBn ? 'font-bengali' : ''}`}>
                                            {slide.winnerDistrict}
                                        </p>
                                    ) : null}
                                </div>

                                {/* Back — prize + sponsor */}
                                <div className="month-winners-flip__face month-winners-flip__back">
                                    <p className={`month-winners-flip__label ${isBn ? 'font-bengali' : ''}`}>
                                        {copy.prize}
                                    </p>
                                    <div className="month-winners-reveal__prize-stage">
                                        <HallOfFamePrizeImage
                                            candidates={slide.imageCandidates || []}
                                            alt={slide.imageAlt || slide.title || ''}
                                            className="month-winners-reveal__prize-img"
                                        />
                                    </div>
                                    {slide.title ? (
                                        <p className={`month-winners-reveal__prize-title ${isBn ? 'font-bengali' : ''}`}>
                                            {slide.title}
                                            {slide.caution ? (
                                                <>
                                                    {' '}
                                                    <span className="text-red-600">({slide.caution})</span>
                                                </>
                                            ) : null}
                                        </p>
                                    ) : null}
                                    {slide.sponsor ? (
                                        <p className={`month-winners-reveal__sponsor ${isBn ? 'font-bengali' : ''}`}>
                                            {copy.courtesy}{' '}
                                            <span>{slide.sponsor.split(',')[0]}</span>
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="month-winners-reveal__dots" aria-hidden>
                            {slides.map((s, i) => (
                                <span
                                    key={s.id}
                                    className={`month-winners-reveal__dot ${
                                        i === slideIndex ? 'is-active' : ''
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
