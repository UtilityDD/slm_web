import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatRemaining(current, duration) {
    if (!Number.isFinite(duration) || duration <= 0) return '—:—';
    const rem = Math.max(0, duration - (Number.isFinite(current) ? current : 0));
    return formatTime(rem);
}

/**
 * Full-screen listen mode for hosted lesson audio (Life Skills).
 */
export default function LessonRadioOverlay({ isOpen, onClose, src, language, lessonTitle }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const [loadFailed, setLoadFailed] = useState(false);

    const exit = useCallback(() => {
        const a = audioRef.current;
        if (a) {
            a.pause();
            a.currentTime = 0;
        }
        setPlaying(false);
        setProgress(0);
        setCurrent(0);
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) {
            const a = audioRef.current;
            if (a) {
                a.pause();
                a.currentTime = 0;
            }
            setPlaying(false);
            setProgress(0);
            setCurrent(0);
            setLoadFailed(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') exit();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, exit]);

    const toggle = useCallback(async () => {
        const a = audioRef.current;
        if (!a || loadFailed) return;
        if (playing) {
            a.pause();
            setPlaying(false);
            return;
        }
        try {
            await a.play();
            setPlaying(true);
        } catch {
            setPlaying(false);
        }
    }, [playing, loadFailed]);

    if (!isOpen || !src) return null;

    const t = {
        brand: 'SLM Radio',
        play: language === 'bn' ? 'চালু' : 'Play',
        pause: language === 'bn' ? 'থামান' : 'Pause',
        close: language === 'bn' ? 'বন্ধ' : 'Close',
        backToLesson: language === 'bn' ? 'পড়ায় ফিরুন' : 'Back to lesson',
        unavailable: language === 'bn' ? 'অডিও লোড হয়নি।' : 'Audio unavailable.',
    };

    const title = lessonTitle || (language === 'bn' ? 'লেসন' : 'Lesson');

    return createPortal(
        <div
            className="fixed inset-0 z-[220] flex flex-col bg-zinc-950/98 backdrop-blur-xl animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-radio-overlay-title"
        >
            <header className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">{t.brand}</p>
                <button
                    type="button"
                    onClick={exit}
                    aria-label={t.close}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-zinc-900/90 p-6 shadow-2xl shadow-black/40 sm:max-w-md sm:p-8">
                    <h2
                        id="lesson-radio-overlay-title"
                        className={`text-center text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {title}
                    </h2>

                    {loadFailed ? (
                        <p className={`mt-8 text-center text-sm text-zinc-400 ${language === 'bn' ? 'font-bengali' : ''}`}>{t.unavailable}</p>
                    ) : (
                        <>
                            <div className="mt-8 flex justify-center sm:mt-10">
                                <button
                                    type="button"
                                    onClick={toggle}
                                    aria-label={playing ? t.pause : t.play}
                                    className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-500 active:scale-[0.98] sm:h-[4.5rem] sm:w-[4.5rem]"
                                >
                                    {playing ? (
                                        <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                        </svg>
                                    ) : (
                                        <svg className="ml-0.5 h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <div
                                className="mt-8 border-t border-white/[0.06] pt-6"
                                aria-live="polite"
                                aria-atomic="true"
                                aria-label={
                                    language === 'bn'
                                        ? `${formatTime(current)} শোনা, ${formatRemaining(current, duration)} বাকি`
                                        : `${formatTime(current)} elapsed, ${formatRemaining(current, duration)} remaining`
                                }
                            >
                                <div className="relative h-1 overflow-hidden rounded-full bg-zinc-800">
                                    <div
                                        className="h-full rounded-full bg-indigo-500 transition-[width] duration-150 ease-linear"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="mt-4 flex items-baseline justify-between gap-4 font-mono tabular-nums">
                                    <span className="text-sm text-zinc-500 sm:text-base">{formatTime(current)}</span>
                                    <span className="text-lg font-medium text-zinc-200 sm:text-xl">{formatRemaining(current, duration)}</span>
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={exit}
                        aria-label={t.backToLesson}
                        className="mt-8 flex h-12 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-800/80 text-zinc-200 transition hover:bg-zinc-800 hover:text-white sm:mt-10"
                    >
                        <svg className="h-5 w-5 shrink-0 opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                    </button>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={src}
                preload="auto"
                playsInline
                onPlay={() => {
                    setPlaying(true);
                }}
                onPause={() => setPlaying(false)}
                onEnded={(e) => {
                    setPlaying(false);
                    setProgress(100);
                    const d = e.target.duration;
                    if (Number.isFinite(d) && d > 0) setCurrent(d);
                }}
                onLoadedMetadata={(e) => {
                    const d = e.target.duration;
                    setDuration(Number.isFinite(d) ? d : 0);
                }}
                onTimeUpdate={(e) => {
                    const a = e.target;
                    const d = a.duration;
                    if (!Number.isFinite(d) || d <= 0) return;
                    setCurrent(a.currentTime);
                    setProgress((a.currentTime / d) * 100);
                }}
                onError={() => {
                    setLoadFailed(true);
                    setPlaying(false);
                }}
            />
        </div>,
        document.body
    );
}
