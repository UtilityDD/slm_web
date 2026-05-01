import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AWARENESS_STORIES } from '../data/awarenessStories';

const IDLE_MS = 4 * 60 * 1000;
const COOLDOWN_MS = 25 * 60 * 1000;
const APP_GRACE_MS = 50 * 1000;
const MOVE_THROTTLE_MS = 1200;

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
        appEligibleAtRef.current = Date.now() + APP_GRACE_MS;
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
        const delay = waitApp + waitCd + IDLE_MS;
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
        cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
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
        cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
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

    return (
        <div
            className={`fixed inset-0 z-[140] flex flex-col items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] transition-opacity duration-300 ease-out ${
                visible ? 'opacity-100' : 'opacity-0'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="idle-story-reminder-title"
        >
            <div className="absolute inset-0 bg-slate-950/82 backdrop-blur-[2px]" aria-hidden />

            <button
                type="button"
                ref={closeBtnRef}
                onClick={closeOverlay}
                aria-label={language === 'en' ? 'Close' : 'বন্ধ করুন'}
                className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-lg transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:right-5 sm:top-[max(1rem,env(safe-area-inset-top))] sm:h-16 sm:w-16"
            >
                <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="relative z-[1] w-full max-w-md">
                <div
                    className={`overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-transform duration-300 ease-out ${
                        visible ? 'translate-y-0 scale-100' : 'translate-y-3 scale-[0.98]'
                    } ${reduceMotion ? 'transition-none' : ''}`}
                >
                    <div className="relative aspect-[4/5] max-h-[min(72vh,620px)] w-full sm:aspect-[3/4]">
                        <img src={story.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/88" aria-hidden />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent" aria-hidden />

                        <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/90 sm:text-[11px]">{category}</p>
                            <h2
                                id="idle-story-reminder-title"
                                className={`mt-2 text-2xl font-bold leading-tight text-white drop-shadow-md sm:text-3xl ${bn ? 'font-bengali' : ''}`}
                            >
                                {title}
                            </h2>
                            <p className={`mt-3 line-clamp-4 text-sm leading-relaxed text-slate-100/95 sm:text-base ${bn ? 'font-bengali' : ''}`}>
                                {excerpt}
                            </p>
                            <button
                                type="button"
                                onClick={handleRead}
                                className="mt-6 min-h-[48px] w-full rounded-xl bg-orange-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:text-base"
                            >
                                {language === 'en' ? 'Read full story' : 'সম্পূর্ণ গল্প পড়ুন'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
