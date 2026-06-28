import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AWARENESS_STORIES } from '../data/awarenessStories';

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

/**
 * After inactivity, fades in one random story card over the app.
 * z-[140]: below Logout / update modals (1000+).
 */
export default function IdleStoryReminder({
    language,
    currentView,
    setCurrentView,
    onRequestOpenStory,
    blocked
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
            const pool = AWARENESS_STORIES;
            if (!pool.length) return;
            const picked = pool[Math.floor(Math.random() * pool.length)];
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
        cooldownUntilRef.current = Date.now() + resolveIdleTiming().cooldownMs;
        clearFadeTimer();
        const fadeMs = reduceMotion ? 0 : 220;
        fadeOutTimerRef.current = setTimeout(() => {
            fadeOutTimerRef.current = null;
            setOpen(false);
            setStory(null);
            armIdleTimer();
        }, fadeMs);
    }, [armIdleTimer, clearFadeTimer, reduceMotion]);

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
        if (blocked && open) closeOverlay();
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
        setVisible(false);
        cooldownUntilRef.current = Date.now() + resolveIdleTiming().cooldownMs;
        clearFadeTimer();
        const fadeMs = reduceMotion ? 0 : 180;
        fadeOutTimerRef.current = setTimeout(() => {
            fadeOutTimerRef.current = null;
            setOpen(false);
            setStory(null);
            onRequestOpenStory(id);
            setCurrentView('accident-stories');
            armIdleTimer();
        }, fadeMs);
    }, [armIdleTimer, clearFadeTimer, onRequestOpenStory, reduceMotion, setCurrentView, story]);

    if (!open || !story) return null;

    const title = story.title[language];
    const excerpt = story.excerpt[language];
    const category = story.category[language];
    const bn = language === 'bn';
    const t = {
        en: {
            context: 'A moment to remember',
            read: 'Read full story',
            dismiss: 'Not now',
            close: 'Close'
        },
        bn: {
            context: 'একটু মনে রাখার সময়',
            read: 'সম্পূর্ণ গল্প পড়ুন',
            dismiss: 'এখন নয়',
            close: 'বন্ধ করুন'
        }
    }[language];

    const cardMotion = reduceMotion
        ? ''
        : visible
          ? 'translate-y-0 sm:scale-100'
          : 'translate-y-full sm:translate-y-3 sm:scale-[0.98]';

    return (
        <div
            className={`fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-300 ease-out ${
                visible ? 'opacity-100' : 'opacity-0'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="idle-story-reminder-title"
        >
            <div
                className="absolute inset-0 bg-slate-900/55"
                aria-hidden
                onClick={closeOverlay}
            />

            <div
                className={`neo-brutal relative z-[1] w-full sm:max-w-sm transition-transform duration-300 ease-out ${cardMotion} ${
                    reduceMotion ? 'transition-none' : ''
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="nb-card overflow-hidden p-0 rounded-none sm:rounded-lg border-t-[2.5px] sm:border-[2.5px] border-slate-900 shadow-[0_-4px_0_#0f172a] sm:shadow-[4px_4px_0_#0f172a]">
                    <div className="nb-hazard" aria-hidden="true" />

                    <div className="flex items-center gap-3 border-b-2 border-slate-900 bg-[#fffdf7] px-4 py-3 sm:px-5">
                        <p
                            className={`min-w-0 flex-1 text-sm font-black leading-snug text-slate-900 sm:text-base ${
                                bn ? 'font-bengali' : 'nb-mono uppercase tracking-wide'
                            }`}
                        >
                            {t.context}
                        </p>
                        <button
                            type="button"
                            ref={closeBtnRef}
                            onClick={closeOverlay}
                            aria-label={t.close}
                            className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-slate-900 shadow-[3px_3px_0_#0f172a] transition hover:bg-orange-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="relative h-44 sm:h-48 overflow-hidden border-b-2 border-slate-900">
                        <img src={story.image} alt="" className="h-full w-full object-cover" />
                    </div>

                    <div className="bg-white px-5 py-5 sm:px-6 sm:py-6">
                        <span className="nb-tag mb-3 inline-block bg-orange-100 px-2.5 py-1 text-orange-800">
                            {category}
                        </span>
                        <h2
                            id="idle-story-reminder-title"
                            className={`text-xl font-black leading-tight tracking-tight text-slate-900 sm:text-2xl ${
                                bn ? 'font-bengali' : ''
                            }`}
                        >
                            {title}
                        </h2>
                        <p
                            className={`mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600 sm:text-base ${
                                bn ? 'font-bengali' : ''
                            }`}
                        >
                            {excerpt}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 border-t-2 border-slate-900 bg-white p-4 sm:flex-row sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
                        <button
                            type="button"
                            onClick={handleRead}
                            className="order-1 min-h-[48px] w-full flex-1 px-4 py-3 text-sm font-black nb-btn-primary sm:order-2 sm:text-base"
                        >
                            {t.read}
                        </button>
                        <button
                            type="button"
                            onClick={closeOverlay}
                            className={`order-2 min-h-[48px] w-full flex-1 px-4 py-3 text-sm font-black nb-btn-secondary sm:order-1 sm:text-base ${
                                bn ? 'font-bengali' : ''
                            }`}
                        >
                            {t.dismiss}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
