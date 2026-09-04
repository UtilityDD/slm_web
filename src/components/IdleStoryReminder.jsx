import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AWARENESS_STORIES, EMOTIONAL_IMAGE_FOCUS } from '../data/awarenessStories';

const IDLE_MS = 4 * 60 * 1000;
const COOLDOWN_MS = 25 * 60 * 1000;
const APP_GRACE_MS = 50 * 1000;
const MOVE_THROTTLE_MS = 1200;

/** Dev-only: open `?idleTest=1` (see idle-story-test.html) for fast automated checks. */
function resolveIdleTiming() {
    if (
        import.meta.env.DEV &&
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('idleTest') === '1'
    ) {
        return { idleMs: 600, appGraceMs: 0, cooldownMs: 800 };
    }
    return { idleMs: IDLE_MS, appGraceMs: APP_GRACE_MS, cooldownMs: COOLDOWN_MS };
}

function pickStory(storyId) {
    const pool = AWARENESS_STORIES;
    if (!pool.length) return null;
    if (storyId) {
        return pool.find((s) => s.id === storyId) || pool[0];
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * After inactivity, fades in one random story card over the app.
 * z-[140]: below Logout / update modals (1000+).
 * preview: { storyId?: string, key: number } — admin force-open overlay.
 */
export default function IdleStoryReminder({
    language,
    currentView,
    setCurrentView,
    onRequestOpenStory,
    blocked,
    preview = null,
    onPreviewClose,
}) {
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false);
    const [story, setStory] = useState(null);
    const [reduceMotion, setReduceMotion] = useState(false);
    const timerRef = useRef(null);
    const lastBumpRef = useRef(0);
    const cooldownUntilRef = useRef(0);
    const appEligibleAtRef = useRef(0);
    const closeBtnRef = useRef(null);
    const fadeOutTimerRef = useRef(null);
    const previewModeRef = useRef(false);

    useEffect(() => {
        appEligibleAtRef.current = Date.now() + resolveIdleTiming().appGraceMs;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const setMq = () => setReduceMotion(mq.matches);
        setMq();
        mq.addEventListener('change', setMq);
        return () => mq.removeEventListener('change', setMq);
    }, []);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const clearFadeTimer = useCallback(() => {
        if (fadeOutTimerRef.current) {
            clearTimeout(fadeOutTimerRef.current);
            fadeOutTimerRef.current = null;
        }
    }, []);

    const armIdleTimer = useCallback(() => {
        clearTimer();
        if (blocked) return;
        const now = Date.now();
        const waitApp = Math.max(0, appEligibleAtRef.current - now);
        const waitCd = Math.max(0, cooldownUntilRef.current - now);
        const delay = waitApp + waitCd + resolveIdleTiming().idleMs;
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (document.visibilityState !== 'visible' || blocked) return;
            const picked = pickStory();
            if (!picked) return;
            previewModeRef.current = false;
            setStory(picked);
            setOpen(true);
            requestAnimationFrame(() => setVisible(true));
        }, delay);
    }, [blocked, clearTimer]);

    const bumpActivity = useCallback(
        (immediate = false) => {
            const now = Date.now();
            if (!immediate && now - lastBumpRef.current < MOVE_THROTTLE_MS) return;
            lastBumpRef.current = now;
            if (open) return;
            armIdleTimer();
        },
        [open, armIdleTimer]
    );

    const closeOverlay = useCallback(() => {
        setVisible(false);
        const wasPreview = previewModeRef.current;
        if (!wasPreview) {
            cooldownUntilRef.current = Date.now() + resolveIdleTiming().cooldownMs;
        }
        clearFadeTimer();
        const fadeMs = reduceMotion ? 0 : 220;
        fadeOutTimerRef.current = setTimeout(() => {
            fadeOutTimerRef.current = null;
            previewModeRef.current = false;
            setOpen(false);
            setStory(null);
            if (wasPreview && typeof onPreviewClose === 'function') {
                onPreviewClose();
            }
            armIdleTimer();
        }, fadeMs);
    }, [armIdleTimer, clearFadeTimer, onPreviewClose, reduceMotion]);

    useEffect(() => {
        if (!preview?.key) return;
        const picked = pickStory(preview.storyId);
        if (!picked) return;
        clearTimer();
        clearFadeTimer();
        previewModeRef.current = true;
        setStory(picked);
        setOpen(true);
        requestAnimationFrame(() => setVisible(true));
    }, [preview?.key, preview?.storyId, clearFadeTimer, clearTimer]);

    useEffect(() => {
        const onKey = (e) => {
            if (open && e.key === 'Escape') {
                closeOverlay();
                return;
            }
            bumpActivity(true);
        };
        const onPointerDown = () => bumpActivity(true);
        const onScroll = () => bumpActivity(false);
        const onVisibility = () => {
            if (document.visibilityState === 'visible') bumpActivity(true);
            else clearTimer();
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('scroll', onScroll, true);
        document.addEventListener('visibilitychange', onVisibility);
        bumpActivity(true);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('scroll', onScroll, true);
            document.removeEventListener('visibilitychange', onVisibility);
            clearTimer();
            clearFadeTimer();
        };
    }, [bumpActivity, clearFadeTimer, clearTimer, closeOverlay, open]);

    useEffect(() => {
        if (blocked && open && !previewModeRef.current) closeOverlay();
    }, [blocked, closeOverlay, open]);

    useEffect(() => {
        if (currentView === 'accident-stories' && open) closeOverlay();
    }, [closeOverlay, currentView, open]);

    useEffect(() => {
        if (!open || !visible) return;
        closeBtnRef.current?.focus();
    }, [open, visible]);

    useEffect(() => {
        if (!blocked && !open) armIdleTimer();
    }, [armIdleTimer, blocked, open]);

    const handleRead = useCallback(() => {
        if (!story) return;
        const id = story.id;
        const wasPreview = previewModeRef.current;
        setVisible(false);
        if (!wasPreview) {
            cooldownUntilRef.current = Date.now() + resolveIdleTiming().cooldownMs;
        }
        clearFadeTimer();
        const fadeMs = reduceMotion ? 0 : 180;
        fadeOutTimerRef.current = setTimeout(() => {
            fadeOutTimerRef.current = null;
            previewModeRef.current = false;
            setOpen(false);
            setStory(null);
            if (wasPreview && typeof onPreviewClose === 'function') {
                onPreviewClose();
            }
            onRequestOpenStory(id);
            setCurrentView('accident-stories');
            armIdleTimer();
        }, fadeMs);
    }, [armIdleTimer, clearFadeTimer, onPreviewClose, onRequestOpenStory, reduceMotion, setCurrentView, story]);

    if (!open || !story) return null;

    const title = story.title[language];
    const bn = language === 'bn';
    const t = {
        en: {
            viewMore: 'Read this shattered dream…',
            close: 'Close'
        },
        bn: {
            viewMore: 'ছিন্নভিন্ন স্বপ্নের কথা পড়ুন…',
            close: 'বন্ধ করুন'
        }
    }[language];

    const fadeClass = reduceMotion
        ? ''
        : visible
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-[1.02]';

    return (
        <div
            className={`fixed inset-0 z-[140] transition-opacity duration-300 ease-out ${
                visible ? 'opacity-100' : 'opacity-0'
            } ${reduceMotion ? 'transition-none' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="idle-story-reminder-title"
        >
            {/* Full-page image — tap opens the full story */}
            <button
                type="button"
                onClick={handleRead}
                className={`absolute inset-0 block h-full w-full overflow-hidden text-left transition-transform duration-300 ease-out ${fadeClass} ${
                    reduceMotion ? 'transition-none' : ''
                }`}
                aria-label={`${title}. ${t.viewMore}`}
            >
                <img
                    src={story.image}
                    alt=""
                    decoding="async"
                    fetchpriority="high"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: EMOTIONAL_IMAGE_FOCUS[story.image] || 'center 20%' }}
                />
                {/* Soft bottom gradient so the cue stays readable */}
                <div
                    className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-900/70 via-slate-900/25 to-transparent"
                    aria-hidden
                />
                <span
                    className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 pb-[max(1.75rem,env(safe-area-inset-bottom,0px)+1rem)] text-sm font-black text-white drop-shadow-md ${
                        bn ? 'font-bengali' : 'uppercase tracking-wide'
                    }`}
                >
                    <span className="rounded-full border border-white/35 bg-white/15 px-4 py-2.5 backdrop-blur-sm">
                        {t.viewMore}
                    </span>
                </span>
            </button>

            {/* Floating header: story title + close */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-gradient-to-b from-slate-900/55 via-slate-900/20 to-transparent pt-[env(safe-area-inset-top,0px)]">
                <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 sm:px-5">
                    <h2
                        id="idle-story-reminder-title"
                        className={`min-w-0 flex-1 text-base font-black leading-snug text-white drop-shadow-sm sm:text-lg ${
                            bn ? 'font-bengali' : ''
                        }`}
                    >
                        {title}
                    </h2>
                    <button
                        type="button"
                        ref={closeBtnRef}
                        onClick={closeOverlay}
                        aria-label={t.close}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/95 text-slate-700 shadow-md backdrop-blur transition-all hover:bg-orange-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
