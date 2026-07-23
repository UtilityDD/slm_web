import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Score unlock requires audible listen through this fraction of the track. */
const QUALIFY_PROGRESS = 0.97;

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

function isAudible(audio) {
    if (!audio) return false;
    return !audio.muted && Number(audio.volume) > 0;
}

function bnNum(n) {
    return String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
}

function copyFor(language, bonusPoints, cooldownDays = 0) {
    const bn = language === 'bn';
    const pts = bn ? bnNum(bonusPoints) : String(bonusPoints);
    const days = bn ? bnNum(cooldownDays) : String(cooldownDays);
    const onCooldown = cooldownDays > 0;

    if (onCooldown) {
        return {
            bn,
            brand: bn ? 'শুনুন' : 'Listen',
            play: bn ? 'চালু করুন' : 'Play',
            pause: bn ? 'থামান' : 'Pause',
            close: bn ? 'বন্ধ' : 'Close',
            backToLesson: bn ? 'পাঠে ফিরুন' : 'Back to lesson',
            unavailable: bn ? 'অডিও এখন লোড হয়নি। একটু পরে চেষ্টা করুন।' : 'Audio could not load. Try again shortly.',
            offerEyebrow: bn ? 'কুইজ পাস' : 'Quiz passed',
            offerTitle: bn ? 'এবার অডিও শুনুন' : 'Now listen to the audio',
            offerBody: bn
                ? `মন দিয়ে অডিওটা শুনুন। পয়েন্ট এখন নয়—${days} দিন পর আবার পাবেন। প্রায় শেষ পর্যন্ত শুনতে হবে।`
                : `Please listen through the audio. Points unlock again in ${days} day${cooldownDays === 1 ? '' : 's'}—not this time.`,
            offerCta: bn ? 'অডিও শুনুন' : 'Listen now',
            offerSkip: bn ? 'পরে শুনব' : 'Maybe later',
            exitWithoutListen: bn ? 'অডিও না শুনে বের হন' : 'Exit without listening',
            listenHint: bn
                ? 'ভলিউম চালু রেখে শুনুন। এবার অনুশীলন—পয়েন্ট পরে।'
                : 'Keep volume on. This round is practice—points come later.',
            volume: bn ? 'ভলিউম' : 'Volume',
            volumeHint: bn ? 'ভলিউম চালু রেখে শুনুন।' : 'Please keep the volume on.',
            remaining: bn ? 'বাকি' : 'left',
            skipTitle: bn ? 'অডিও শোনা জরুরি' : 'Listening matters',
            skipBody: bn
                ? 'কুইজের পর অডিও শোনা দরকার। তবুও এখন বের হবেন?'
                : 'Please listen after the quiz. Exit anyway?',
            skipCancel: bn ? 'শুনতে থাকি' : 'Keep listening',
            skipConfirm: bn ? 'শোনা ছাড়া বের হই' : 'Exit without listening',
            successTitle: bn ? 'শোনা সম্পন্ন!' : 'Listening complete!',
            successBody: bn
                ? `অনুশীলন হয়ে গেছে। পয়েন্ট ${days} দিন পর।`
                : `Practice saved. Points again in ${days} day${cooldownDays === 1 ? '' : 's'}.`,
            showPointsBadge: false,
            cooldownDays,
        };
    }

    return {
        bn,
        brand: bn ? 'শুনুন' : 'Listen',
        play: bn ? 'চালু করুন' : 'Play',
        pause: bn ? 'থামান' : 'Pause',
        close: bn ? 'বন্ধ' : 'Close',
        backToLesson: bn ? 'পাঠে ফিরুন' : 'Back to lesson',
        unavailable: bn ? 'অডিও এখন লোড হয়নি। একটু পরে চেষ্টা করুন।' : 'Audio could not load. Try again shortly.',
        offerEyebrow: bn ? 'কুইজ পাস' : 'Quiz passed',
        offerTitle: bn ? 'অডিও শুনলেই পয়েন্ট' : 'Listen to earn points',
        offerBody: bn
            ? `এই অডিওটা মন দিয়ে শুনলে আপনি পাবেন +${pts} পয়েন্ট। প্রায় শেষ পর্যন্ত শুনতে হবে।`
            : `Listen through this audio to earn +${pts} points. Finish nearly the whole track.`,
        offerCta: bn ? 'অডিও শুনে পয়েন্ট নিন' : 'Listen & claim points',
        offerSkip: bn ? 'পরে শুনব' : 'Maybe later',
        exitWithoutListen: bn ? 'অডিও না শুনে বের হন' : 'Exit without listening',
        listenHint: bn ? 'ভলিউম চালু রেখে শুনুন — শেষের দিকে এলে পয়েন্ট আনলক হবে।' : 'Keep volume on. Points unlock near the end.',
        volume: bn ? 'ভলিউম' : 'Volume',
        volumeHint: bn ? 'ভলিউম বন্ধ থাকলে পয়েন্ট পাবেন না।' : 'Turn the volume up to earn points.',
        remaining: bn ? 'বাকি' : 'left',
        skipTitle: bn ? 'পয়েন্ট পাবেন না' : 'No points this time',
        skipBody: bn
            ? 'অডিও না শুনলে এখন পয়েন্ট যোগ হবে না। তবুও বের হবেন?'
            : 'If you leave without listening, points will not be added. Exit anyway?',
        skipCancel: bn ? 'শুনতে থাকি' : 'Keep listening',
        skipConfirm: bn ? 'পয়েন্ট ছাড়া বের হই' : 'Exit without points',
        successTitle: bn ? 'শোনা সম্পন্ন!' : 'Listening complete!',
        successBody: bn ? `+${pts} পয়েন্ট যোগ হচ্ছে…` : `Adding +${pts} points…`,
        showPointsBadge: true,
        cooldownDays: 0,
    };
}

/**
 * Full-screen listen mode for hosted lesson audio (Life Skills).
 * scoreGateMode: offer card → flip → audio; qualify at 97% audible progress.
 */
export default function LessonRadioOverlay({
    isOpen,
    onClose,
    src,
    language,
    lessonTitle,
    scoreGateMode = false,
    bonusPoints = 20,
    cooldownDays = 0,
    onListenQualified,
    onSkipWithoutScore,
}) {
    const audioRef = useRef(null);
    const qualifiedRef = useRef(false);
    const flipTimerRef = useRef(null);
    const successTimerRef = useRef(null);

    const [face, setFace] = useState(scoreGateMode ? 'offer' : 'listen'); // offer | listen | success
    const [flipped, setFlipped] = useState(!scoreGateMode);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const [loadFailed, setLoadFailed] = useState(false);
    const [volume, setVolume] = useState(1);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [volumeHint, setVolumeHint] = useState(false);

    const resetPlayback = useCallback(() => {
        const a = audioRef.current;
        if (a) {
            a.pause();
            a.currentTime = 0;
        }
        setPlaying(false);
        setProgress(0);
        setCurrent(0);
        setShowSkipConfirm(false);
        setVolumeHint(false);
    }, []);

    const clearTimers = useCallback(() => {
        if (flipTimerRef.current) {
            clearTimeout(flipTimerRef.current);
            flipTimerRef.current = null;
        }
        if (successTimerRef.current) {
            clearTimeout(successTimerRef.current);
            successTimerRef.current = null;
        }
    }, []);

    const finishQualified = useCallback(() => {
        if (typeof onListenQualified === 'function') {
            onListenQualified();
        }
        if (scoreGateMode) {
            resetPlayback();
            onClose();
        }
    }, [onClose, onListenQualified, resetPlayback, scoreGateMode]);

    const markQualified = useCallback(() => {
        if (qualifiedRef.current) return;
        qualifiedRef.current = true;
        if (scoreGateMode) {
            setFace('success');
            setPlaying(false);
            const a = audioRef.current;
            if (a) a.pause();
            successTimerRef.current = setTimeout(() => {
                finishQualified();
            }, 1100);
            return;
        }
        if (typeof onListenQualified === 'function') {
            onListenQualified();
        }
    }, [finishQualified, onListenQualified, scoreGateMode]);

    const tryQualifyFromAudio = useCallback(
        (audio, { ended = false } = {}) => {
            if (!audio || qualifiedRef.current) return;
            if (!isAudible(audio)) {
                if (scoreGateMode && (ended || audio.currentTime / (audio.duration || 1) >= QUALIFY_PROGRESS)) {
                    setVolumeHint(true);
                }
                return;
            }
            const d = audio.duration;
            if (!Number.isFinite(d) || d <= 0) return;
            const ratio = audio.currentTime / d;
            if (ended || ratio >= QUALIFY_PROGRESS) {
                setVolumeHint(false);
                markQualified();
            }
        },
        [markQualified, scoreGateMode]
    );

    const exitNormal = useCallback(() => {
        clearTimers();
        resetPlayback();
        onClose();
    }, [clearTimers, onClose, resetPlayback]);

    const requestExit = useCallback(() => {
        if (scoreGateMode && !qualifiedRef.current && face !== 'success') {
            setShowSkipConfirm(true);
            return;
        }
        if (face === 'success') return;
        exitNormal();
    }, [exitNormal, face, scoreGateMode]);

    const confirmSkip = useCallback(() => {
        setShowSkipConfirm(false);
        clearTimers();
        resetPlayback();
        if (typeof onSkipWithoutScore === 'function') {
            onSkipWithoutScore();
        } else {
            onClose();
        }
    }, [clearTimers, onClose, onSkipWithoutScore, resetPlayback]);

    const startListenFace = useCallback(() => {
        if (flipped && face === 'listen') return;
        setFlipped(true);
        flipTimerRef.current = setTimeout(() => {
            setFace('listen');
        }, 280);
    }, [face, flipped]);

    useEffect(() => {
        if (!isOpen) {
            clearTimers();
            resetPlayback();
            qualifiedRef.current = false;
            setLoadFailed(false);
            setDuration(0);
            setFace(scoreGateMode ? 'offer' : 'listen');
            setFlipped(!scoreGateMode);
            return;
        }
        qualifiedRef.current = false;
        setLoadFailed(false);
        setFace(scoreGateMode ? 'offer' : 'listen');
        setFlipped(!scoreGateMode);
        const a = audioRef.current;
        if (a) {
            a.volume = volume;
            a.muted = false;
        }
    }, [isOpen, scoreGateMode, resetPlayback, clearTimers]); // volume applied below

    useEffect(() => {
        const a = audioRef.current;
        if (a) {
            a.volume = volume;
            if (volume > 0) a.muted = false;
        }
    }, [volume]);

    useEffect(() => () => clearTimers(), [clearTimers]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (showSkipConfirm) {
                    setShowSkipConfirm(false);
                } else {
                    requestExit();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, requestExit, showSkipConfirm]);

    const toggle = useCallback(async () => {
        const a = audioRef.current;
        if (!a || loadFailed || face !== 'listen') return;
        if (playing) {
            a.pause();
            setPlaying(false);
            return;
        }
        if (scoreGateMode && !isAudible(a)) {
            setVolumeHint(true);
            a.volume = Math.max(volume, 0.65);
            a.muted = false;
            setVolume(a.volume);
        }
        try {
            await a.play();
            setPlaying(true);
            setVolumeHint(false);
        } catch {
            setPlaying(false);
        }
    }, [face, playing, loadFailed, scoreGateMode, volume]);

    if (!isOpen || !src) return null;

    const t = copyFor(language, bonusPoints, cooldownDays);
    const title = lessonTitle || (t.bn ? 'লাইফ স্কিল' : 'Life Skill');
    const progressPct = Math.min(100, Math.max(0, progress));
    const showOfferFace = scoreGateMode && !flipped;
    const showListenFace = flipped && face !== 'success';
    const showSuccessFace = face === 'success';

    return createPortal(
        <div
            className="fixed inset-0 z-[220] flex flex-col animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-radio-overlay-title"
        >
            <div
                className="absolute inset-0 bg-[#1c1914]/72 backdrop-blur-md"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(15,23,42,0.35),_transparent_50%)]"
                aria-hidden
            />

            <header className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-5">
                <p className={`text-[11px] font-semibold tracking-[0.18em] text-amber-100/80 ${t.bn ? 'font-bengali tracking-normal' : 'uppercase'}`}>
                    {t.brand}
                </p>
                <button
                    type="button"
                    onClick={requestExit}
                    aria-label={t.close}
                    disabled={showSuccessFace}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-amber-50/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-3 sm:px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <div className="w-full max-w-sm" style={{ perspective: '1400px' }}>
                    <div
                        className="relative w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{
                            transformStyle: 'preserve-3d',
                            transform: flipped || showSuccessFace ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            minHeight: flipped || showSuccessFace ? '28rem' : undefined,
                        }}
                    >
                        {/* Offer face — in-flow when visible so CTA is never cropped */}
                        <div
                            className={`${
                                flipped || showSuccessFace ? 'absolute inset-0' : 'relative'
                            } flex flex-col rounded-[1.75rem] border border-amber-200/60 bg-[#fffdf7] shadow-2xl shadow-black/30`}
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                            aria-hidden={!showOfferFace}
                        >
                            <div className="h-1.5 w-full shrink-0 rounded-t-[1.75rem] bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" aria-hidden />
                            <div className="flex flex-col px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
                                <p className={`text-center text-xs font-bold uppercase tracking-wider text-orange-600/90 ${t.bn ? 'font-bengali normal-case tracking-normal' : ''}`}>
                                    {t.offerEyebrow}
                                </p>
                                <h2
                                    id={showOfferFace ? 'lesson-radio-overlay-title' : undefined}
                                    className={`mt-2 text-center text-xl font-black leading-snug text-slate-900 sm:text-2xl ${t.bn ? 'font-bengali' : ''}`}
                                >
                                    {t.offerTitle}
                                </h2>
                                <p className={`mt-1.5 line-clamp-2 text-center text-sm font-medium text-slate-500 ${t.bn ? 'font-bengali' : ''}`}>
                                    {title}
                                </p>

                                {t.showPointsBadge ? (
                                    <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 sm:h-[4.5rem] sm:w-[4.5rem]">
                                        <span className={`text-xl font-black tabular-nums sm:text-2xl ${t.bn ? 'font-bengali' : ''}`}>
                                            +{t.bn ? bnNum(bonusPoints) : bonusPoints}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-700 ring-1 ring-slate-200 sm:h-[4.5rem] sm:w-[4.5rem]">
                                        <span aria-hidden>🎧</span>
                                    </div>
                                )}

                                <p className={`mt-4 text-center text-sm leading-relaxed text-slate-600 ${t.bn ? 'font-bengali' : ''}`}>
                                    {t.offerBody}
                                </p>

                                <div className="mt-6 flex flex-col gap-2.5">
                                    <button
                                        type="button"
                                        onClick={startListenFace}
                                        className={`flex min-h-12 w-full items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-black leading-snug text-white shadow-md shadow-orange-500/30 transition hover:bg-orange-600 active:scale-[0.98] ${t.bn ? 'font-bengali' : ''}`}
                                    >
                                        {t.offerCta}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowSkipConfirm(true)}
                                        className={`flex min-h-11 w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 ${t.bn ? 'font-bengali' : ''}`}
                                    >
                                        {t.offerSkip}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Listen / success face */}
                        <div
                            className="absolute inset-0 flex flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#1a1714] text-amber-50 shadow-2xl shadow-black/40"
                            style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                            }}
                            aria-hidden={!showListenFace && !showSuccessFace}
                        >
                            {showSuccessFace ? (
                                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40">
                                        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h2 className={`mt-5 text-xl font-black text-white sm:text-2xl ${t.bn ? 'font-bengali' : ''}`}>
                                        {t.successTitle}
                                    </h2>
                                    <p className={`mt-2 text-sm font-medium text-amber-100/80 ${t.bn ? 'font-bengali' : ''}`}>
                                        {t.successBody}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                                    <h2
                                        id={showListenFace ? 'lesson-radio-overlay-title' : undefined}
                                        className={`shrink-0 text-center text-lg font-bold leading-snug text-amber-50 sm:text-xl ${t.bn ? 'font-bengali' : ''}`}
                                    >
                                        {title}
                                    </h2>
                                    {scoreGateMode && (
                                        <p className={`mt-2 shrink-0 text-center text-xs leading-relaxed text-amber-100/70 sm:text-sm ${t.bn ? 'font-bengali' : ''}`}>
                                            {t.listenHint}
                                        </p>
                                    )}

                                    {loadFailed ? (
                                        <p className={`mt-10 text-center text-sm text-amber-100/60 ${t.bn ? 'font-bengali' : ''}`}>
                                            {t.unavailable}
                                        </p>
                                    ) : (
                                        <div className="flex min-h-0 flex-1 flex-col">
                                            <div className="mt-6 flex justify-center sm:mt-8">
                                                <button
                                                    type="button"
                                                    onClick={toggle}
                                                    aria-label={playing ? t.pause : t.play}
                                                    className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[#1a1714] shadow-lg shadow-orange-900/40 transition hover:brightness-105 active:scale-[0.97] sm:h-[4.5rem] sm:w-[4.5rem]"
                                                >
                                                    {playing && (
                                                        <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" aria-hidden />
                                                    )}
                                                    {playing ? (
                                                        <svg className="relative h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="relative ml-0.5 h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="mt-6">
                                                <div
                                                    className="h-1.5 overflow-hidden rounded-full bg-white/10"
                                                    aria-live="polite"
                                                    aria-atomic="true"
                                                    aria-label={
                                                        t.bn
                                                            ? `${formatTime(current)} শোনা, ${formatRemaining(current, duration)} বাকি`
                                                            : `${formatTime(current)} elapsed, ${formatRemaining(current, duration)} remaining`
                                                    }
                                                >
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-[width] duration-150 ease-linear"
                                                        style={{ width: `${progressPct}%` }}
                                                    />
                                                </div>
                                                <div className="mt-3 flex items-baseline justify-between gap-3 font-mono tabular-nums text-amber-50/80">
                                                    <span className="text-sm">{formatTime(current)}</span>
                                                    <span className={`text-xs font-semibold text-amber-100/50 ${t.bn ? 'font-bengali font-mono' : ''}`}>
                                                        {formatRemaining(current, duration)} {t.remaining}
                                                    </span>
                                                </div>
                                            </div>

                                            {(scoreGateMode || volumeHint) && (
                                                <div className="mt-4">
                                                    <label
                                                        className={`mb-1.5 flex items-center justify-between text-[11px] font-semibold text-amber-100/55 ${
                                                            t.bn ? 'font-bengali' : 'uppercase tracking-wide'
                                                        }`}
                                                    >
                                                        <span>{t.volume}</span>
                                                        <span className="font-mono tabular-nums text-amber-100/80">
                                                            {Math.round(volume * 100)}%
                                                        </span>
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={1}
                                                        step={0.05}
                                                        value={volume}
                                                        onChange={(e) => {
                                                            const v = Number(e.target.value);
                                                            setVolume(v);
                                                            if (v > 0) setVolumeHint(false);
                                                        }}
                                                        className="w-full accent-amber-400"
                                                        aria-label={t.volume}
                                                    />
                                                    {volumeHint && (
                                                        <p className={`mt-2 text-center text-xs font-medium text-amber-300 ${t.bn ? 'font-bengali' : ''}`}>
                                                            {t.volumeHint}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-auto shrink-0 pt-5">
                                        {scoreGateMode ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowSkipConfirm(true)}
                                                className={`flex min-h-11 w-full items-center justify-center rounded-full border border-amber-200/25 bg-white/5 px-4 py-2.5 text-sm font-bold text-amber-100/90 transition hover:bg-white/10 hover:text-white ${t.bn ? 'font-bengali' : ''}`}
                                            >
                                                {t.exitWithoutListen}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={exitNormal}
                                                aria-label={t.backToLesson}
                                                className="flex h-11 w-full items-center justify-center rounded-full border border-white/10 text-amber-50/80 transition hover:bg-white/5"
                                            >
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showSkipConfirm &&
                createPortal(
                    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true">
                        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-amber-200/40 bg-[#fffdf7] p-5 shadow-2xl sm:p-6">
                            <h3 className={`text-base font-black text-slate-900 sm:text-lg ${t.bn ? 'font-bengali' : ''}`}>{t.skipTitle}</h3>
                            <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${t.bn ? 'font-bengali' : ''}`}>{t.skipBody}</p>
                            <div className="mt-5 flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSkipConfirm(false)}
                                    className={`h-11 rounded-full bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 ${t.bn ? 'font-bengali' : ''}`}
                                >
                                    {t.skipCancel}
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmSkip}
                                    className={`h-11 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 ${t.bn ? 'font-bengali' : ''}`}
                                >
                                    {t.skipConfirm}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            <audio
                ref={audioRef}
                src={src}
                preload="auto"
                playsInline
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={(e) => {
                    setPlaying(false);
                    setProgress(100);
                    const d = e.target.duration;
                    if (Number.isFinite(d) && d > 0) setCurrent(d);
                    tryQualifyFromAudio(e.target, { ended: true });
                }}
                onLoadedMetadata={(e) => {
                    const d = e.target.duration;
                    setDuration(Number.isFinite(d) ? d : 0);
                    e.target.volume = volume;
                    e.target.muted = false;
                }}
                onTimeUpdate={(e) => {
                    const a = e.target;
                    const d = a.duration;
                    if (!Number.isFinite(d) || d <= 0) return;
                    setCurrent(a.currentTime);
                    setProgress((a.currentTime / d) * 100);
                    tryQualifyFromAudio(a);
                }}
                onVolumeChange={(e) => {
                    const a = e.target;
                    if (!a.muted && a.volume !== volume) {
                        setVolume(a.volume);
                    }
                    if (isAudible(a)) setVolumeHint(false);
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
