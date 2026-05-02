import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Full-screen “radio listen” mode: blocks the rest of the UI until the user exits.
 * Intended for professional lesson MP3s (may differ from on-screen text).
 */
export default function LessonRadioOverlay({ isOpen, onClose, src, language, lessonTitle }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const [loadFailed, setLoadFailed] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const barRef = useRef(null);

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
            setHasStarted(false);
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

    const seekFromClientX = useCallback((clientX) => {
        const a = audioRef.current;
        const bar = barRef.current;
        if (!a || !bar || !Number.isFinite(a.duration) || a.duration <= 0) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        a.currentTime = ratio * a.duration;
        setCurrent(a.currentTime);
        setProgress(ratio * 100);
    }, []);

    if (!isOpen || !src) return null;

    const t = {
        badge: language === 'bn' ? 'লেসন অডিও' : 'Lesson audio',
        hint: language === 'bn' ? 'পাতার লেখা আর রেকর্ডিং আলাদা হতে পারে' : 'Recording may differ from the text on the slides',
        tap: language === 'bn' ? 'চালু করতে ট্যাপ করুন' : 'Tap to play',
        exit: language === 'bn' ? 'শেষ করে পড়ায় ফিরুন' : 'Exit & return to reading',
        unavailable: language === 'bn' ? 'এখন উপলব্ধ নয়।' : 'Not available now.',
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[220] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-radio-overlay-title"
        >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-1/4 top-0 h-[60vh] w-[70vw] rounded-full bg-indigo-600/25 blur-[100px]" />
                <div className="absolute -right-1/4 bottom-0 h-[50vh] w-[60vw] rounded-full bg-violet-600/20 blur-[90px]" />
            </div>

            <div className="relative z-10 flex shrink-0 items-center justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
                <button
                    type="button"
                    onClick={exit}
                    className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white/90 transition hover:bg-white/20"
                >
                    {language === 'bn' ? 'বন্ধ' : 'Close'}
                </button>
            </div>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
                    <p className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300/90">{t.badge}</p>
                    <h2
                        id="lesson-radio-overlay-title"
                        className={`mt-2 text-center text-xl font-black leading-snug text-white sm:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {lessonTitle || (language === 'bn' ? 'লেসন' : 'Lesson')}
                    </h2>
                    <p className={`mt-2 text-center text-xs font-medium text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>{t.hint}</p>

                    {loadFailed ? (
                        <p className={`mt-10 text-center text-sm font-semibold text-amber-200/90 ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {t.unavailable}
                        </p>
                    ) : (
                        <>
                            <div className="relative mt-10 flex h-44 items-center justify-center">
                                <span className="absolute h-36 w-36 animate-lesson-radio-pulse rounded-full bg-indigo-500/30" />
                                <span className="absolute h-28 w-28 animate-lesson-radio-pulse rounded-full bg-indigo-400/25 [animation-delay:0.4s]" />
                                <span className="absolute h-20 w-20 animate-lesson-radio-pulse rounded-full bg-white/10 [animation-delay:0.8s]" />
                                <button
                                    type="button"
                                    onClick={toggle}
                                    aria-label={playing ? (language === 'bn' ? 'থামান' : 'Pause') : t.tap}
                                    className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-white text-indigo-900 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-transform active:scale-95 hover:scale-105"
                                >
                                    {playing ? (
                                        <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                        </svg>
                                    ) : (
                                        <svg className="ml-1 h-10 w-10" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {!playing && !hasStarted && (
                                <p className={`mt-2 text-center text-[11px] font-bold uppercase tracking-wide text-indigo-200/80 ${language === 'bn' ? 'font-bengali normal-case' : ''}`}>
                                    {t.tap}
                                </p>
                            )}

                            <div className="mt-8 flex items-center justify-between gap-3 text-xs font-bold tabular-nums text-slate-400">
                                <span>{formatTime(current)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                            <div
                                ref={barRef}
                                role="slider"
                                tabIndex={0}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(progress)}
                                onKeyDown={(e) => {
                                    const a = audioRef.current;
                                    if (!a || !Number.isFinite(a.duration)) return;
                                    if (e.key === 'ArrowRight') {
                                        e.preventDefault();
                                        a.currentTime = Math.min(a.duration, a.currentTime + 5);
                                    }
                                    if (e.key === 'ArrowLeft') {
                                        e.preventDefault();
                                        a.currentTime = Math.max(0, a.currentTime - 5);
                                    }
                                }}
                                onClick={(e) => seekFromClientX(e.clientX)}
                                className="mt-1 h-2 w-full cursor-pointer rounded-full bg-slate-700"
                            >
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-[width] duration-100"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={exit}
                        className={`mt-10 w-full rounded-2xl border border-white/15 bg-white/5 py-3.5 text-sm font-black uppercase tracking-widest text-white/90 transition hover:bg-white/10 ${language === 'bn' ? 'font-bengali normal-case' : ''}`}
                    >
                        {t.exit}
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
                    setHasStarted(true);
                }}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                    setPlaying(false);
                    setProgress(100);
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
