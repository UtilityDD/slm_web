import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchActiveSponsorAd, hasSeenSponsorAd, markSponsorAdSeen } from '../utils/sponsorAdService';
import { claimSoftInterrupt, SOFT_INTERRUPT_IDS } from '../utils/sessionInterruptBudget';
import { SOLAR_STORY_MORPH_IMAGE } from './SponsorSolarStoryMorph';

/**
 * Minimal sponsor strip — Standing-card family, animated copy, dismiss anytime.
 * Every other app open; admin preview via `preview`.
 */
export default function SponsorAdOverlay({
    language = 'en',
    blocked = false,
    minDwellMs = 0,
    preview = null,
    onPreviewClose,
    onOpenChange,
    onOpenLandingContact,
}) {
    const [ad, setAd] = useState(null);
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false);
    const [stage, setStage] = useState(0);
    const [headlineIndex, setHeadlineIndex] = useState(0);
    const [headlineIn, setHeadlineIn] = useState(true);
    const [reduceMotion, setReduceMotion] = useState(false);

    const previewModeRef = useRef(false);
    const blockedRef = useRef(blocked);
    const dwellTimerRef = useRef(null);
    const fadeTimerRef = useRef(null);
    const stageTimersRef = useRef([]);
    const headlineRotateRef = useRef(null);
    const headlineFadeRef = useRef(null);

    const isEn = language !== 'bn';

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const apply = () => setReduceMotion(mq.matches);
        apply();
        mq.addEventListener('change', apply);
        return () => mq.removeEventListener('change', apply);
    }, []);

    const clearStageTimers = useCallback(() => {
        stageTimersRef.current.forEach((t) => clearTimeout(t));
        stageTimersRef.current = [];
    }, []);

    const clearTimers = useCallback(() => {
        [dwellTimerRef, fadeTimerRef, headlineRotateRef, headlineFadeRef].forEach((ref) => {
            if (ref.current) {
                clearTimeout(ref.current);
                clearInterval(ref.current);
                ref.current = null;
            }
        });
        clearStageTimers();
    }, [clearStageTimers]);

    const finish = useCallback(() => {
        setVisible(false);
        setStage(0);
        const wasPreview = previewModeRef.current;
        clearTimers();
        fadeTimerRef.current = setTimeout(() => {
            fadeTimerRef.current = null;
            previewModeRef.current = false;
            setOpen(false);
            setAd(null);
            if (wasPreview && typeof onPreviewClose === 'function') onPreviewClose();
        }, reduceMotion ? 0 : 240);
    }, [clearTimers, onPreviewClose, reduceMotion]);

    const runStagger = useCallback(() => {
        clearStageTimers();
        if (reduceMotion) {
            setStage(4);
            return;
        }
        [
            [40, 1],
            [160, 2],
            [320, 3],
            [480, 4],
        ].forEach(([delay, next]) => {
            stageTimersRef.current.push(setTimeout(() => setStage(next), delay));
        });
    }, [clearStageTimers, reduceMotion]);

    const startShow = useCallback(
        (row, { isPreview }) => {
            if (!row) return;
            if (!isPreview && !claimSoftInterrupt(SOFT_INTERRUPT_IDS.sponsor)) return;
            clearTimers();
            previewModeRef.current = isPreview;
            setAd(row);
            setOpen(true);
            setHeadlineIndex(0);
            setHeadlineIn(true);
            setStage(0);
            setVisible(false);

            requestAnimationFrame(() => {
                setVisible(true);
                runStagger();
            });
            if (!isPreview) markSponsorAdSeen(row.id);

            const rotating = Array.isArray(row.headlines)
                ? row.headlines.map((h) => String(h || '').trim()).filter(Boolean)
                : [];
            if (rotating.length > 1) {
                headlineRotateRef.current = setInterval(() => {
                    if (reduceMotion) {
                        setHeadlineIndex((i) => (i + 1) % rotating.length);
                        return;
                    }
                    setHeadlineIn(false);
                    if (headlineFadeRef.current) clearTimeout(headlineFadeRef.current);
                    headlineFadeRef.current = setTimeout(() => {
                        headlineFadeRef.current = null;
                        setHeadlineIndex((i) => (i + 1) % rotating.length);
                        setHeadlineIn(true);
                    }, 280);
                }, 2600);
            }
        },
        [clearTimers, reduceMotion, runStagger]
    );

    useEffect(() => {
        blockedRef.current = blocked;
    }, [blocked]);

    useEffect(() => {
        if (!preview?.key) return;
        if (!preview.ad) return;
        clearTimers();
        startShow(preview.ad, { isPreview: true });
    }, [preview?.key, preview?.ad, clearTimers, startShow]);

    useEffect(() => {
        if (blocked || open || preview?.key) return;
        let cancelled = false;

        const tryShow = () => {
            if (cancelled || blockedRef.current) return;
            fetchActiveSponsorAd().then((row) => {
                if (cancelled || blockedRef.current || !row?.id) return;
                if (hasSeenSponsorAd(row.id)) return;
                startShow(row, { isPreview: false });
            });
        };

        const waitMs = Math.max(0, Number(minDwellMs) || 0);
        if (waitMs > 0) dwellTimerRef.current = setTimeout(tryShow, waitMs);
        else tryShow();

        return () => {
            cancelled = true;
            if (dwellTimerRef.current) {
                clearTimeout(dwellTimerRef.current);
                dwellTimerRef.current = null;
            }
        };
    }, [blocked, open, preview?.key, startShow, minDwellMs]);

    useEffect(() => {
        if (blocked && open && !previewModeRef.current) finish();
    }, [blocked, open, finish]);

    useEffect(() => {
        const onKey = (e) => {
            if (open && e.key === 'Escape') finish();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, finish]);

    useEffect(() => {
        if (typeof onOpenChange === 'function') onOpenChange(open);
    }, [open, onOpenChange]);

    useEffect(() => () => clearTimers(), [clearTimers]);

    const rotatingHeadlines = useMemo(() => {
        if (Array.isArray(ad?.headlines)) {
            const list = ad.headlines.map((h) => String(h || '').trim()).filter(Boolean);
            if (list.length) return list;
        }
        const single = (ad?.headline || '').trim();
        return single ? [single] : [];
    }, [ad?.headline, ad?.headlines]);

    const activeHeadline =
        rotatingHeadlines[headlineIndex % Math.max(rotatingHeadlines.length, 1)] || '';

    if (!open || !ad) return null;

    const isAdAsk = ad.contact_safety_mitra === true;
    const bnText = /[\u0980-\u09FF]/.test(
        `${rotatingHeadlines.join(' ')}${ad.subtext || ''}${ad.sponsor_name || ''}`
    );
    const bnFont = !isEn || bnText ? 'font-bengali' : '';
    const closeLabel = isEn ? 'Close' : 'বন্ধ করুন';
    const sponsoredLabel = isAdAsk
        ? isEn
            ? 'Advertise with us'
            : 'বিজ্ঞাপনের সুযোগ'
        : isEn
          ? 'Sponsored'
          : 'স্পনসর্ড';

    const mailtoHref = ad.contact_email
        ? `mailto:${ad.contact_email}?subject=${encodeURIComponent(
              isEn ? 'Advertise on Smart Lineman' : 'স্মার্ট লাইনম্যানে বিজ্ঞাপন দিতে চাই'
          )}`
        : null;
    const webHref = ad.contact_url
        ? /^https?:\/\//i.test(ad.contact_url)
            ? ad.contact_url
            : `https://${ad.contact_url}`
        : null;
    const useLandingContact = isAdAsk && typeof onOpenLandingContact === 'function';
    const ctaHref = useLandingContact ? null : mailtoHref || webHref;
    const ctaExternal = !useLandingContact && !mailtoHref && !!webHref;
    const ctaLabel = ad.cta_label || (isEn ? 'Contact us' : 'যোগাযোগ করুন');
    const noMoneyLabel = isEn ? 'We do not take any money' : 'আমরা কোনো টাকা নিই না';

    const thumbUrl =
        ad.logo_url ||
        (ad.image_url && ad.image_url !== SOLAR_STORY_MORPH_IMAGE ? ad.image_url : null);

    const handleLandingContact = () => {
        finish();
        window.setTimeout(() => {
            if (typeof onOpenLandingContact === 'function') onOpenLandingContact();
        }, 200);
    };

    const on = (min) => reduceMotion || stage >= min;
    const anim = (min) => (on(min) ? 'sponsor-strip-in' : 'sponsor-strip-wait');

    const strip = (
        <div
            className={`sponsor-strip-root pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-0 right-0 z-[115] px-4 md:bottom-8 md:px-8 ${
                visible ? 'is-visible' : ''
            } ${reduceMotion ? 'sponsor-strip-reduce' : ''}`}
        >
            <div className="pointer-events-auto mx-auto max-w-3xl">
                <div
                    className={`overflow-hidden rounded-2xl border border-orange-300/70 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 p-[1px] shadow-xl shadow-orange-500/30 ${bnFont}`}
                    role="dialog"
                    aria-label={ad.sponsor_name ? `${sponsoredLabel}: ${ad.sponsor_name}` : sponsoredLabel}
                >
                    <div className="rounded-[0.9rem] bg-gradient-to-br from-white via-orange-50/95 to-amber-50 p-3 sm:p-3.5">
                        <div className="flex items-start gap-3">
                            <div className={`shrink-0 ${anim(1)}`}>
                                {thumbUrl ? (
                                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-orange-200/90 bg-white shadow-sm sm:h-16 sm:w-16">
                                        <img src={thumbUrl} alt="" className="h-full w-full object-contain p-1.5" />
                                    </div>
                                ) : (
                                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-xl font-black text-white shadow-md sm:h-16 sm:w-16">
                                        ✦
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0 flex-1 pt-0.5">
                                <p
                                    className={`sponsor-strip-eyebrow ${anim(1)} text-[10px] font-black tracking-wider text-orange-700 sm:text-[11px] ${
                                        isEn && !bnText ? 'uppercase' : 'normal-case tracking-normal'
                                    }`}
                                >
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500 align-middle shadow-[0_0_0_3px_rgba(249,115,22,0.25)]" />
                                    <span className="ml-1.5 align-middle">
                                        {sponsoredLabel}
                                        {ad.sponsor_name ? ` · ${ad.sponsor_name}` : ''}
                                    </span>
                                </p>

                                <div
                                    className={`sponsor-strip-headline-wrap ${anim(2)} mt-1 min-h-[1.5rem] sm:min-h-[1.75rem]`}
                                    aria-live="polite"
                                >
                                    {activeHeadline ? (
                                        <p
                                            key={`${activeHeadline}-${headlineIndex}`}
                                            className={`sponsor-strip-headline text-[15px] font-black leading-snug text-slate-900 sm:text-lg ${
                                                headlineIn ? 'is-headline-in' : 'is-headline-out'
                                            }`}
                                        >
                                            {activeHeadline}
                                        </p>
                                    ) : null}
                                </div>

                                {ad.subtext ? (
                                    <p className={`sponsor-strip-sub ${anim(3)} mt-1.5 text-[12px] font-semibold leading-relaxed text-slate-600 sm:text-[13px]`}>
                                        {ad.subtext}
                                    </p>
                                ) : null}

                                {isAdAsk ? (
                                    <p className={`sponsor-strip-perk ${anim(3)} mt-1.5 text-[11px] font-bold text-emerald-700`}>
                                        {noMoneyLabel}
                                    </p>
                                ) : null}

                                <div className={`sponsor-strip-actions ${anim(4)} mt-2.5 flex flex-wrap items-center gap-2`}>
                                    {useLandingContact ? (
                                        <button
                                            type="button"
                                            onClick={handleLandingContact}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-[11px] font-black text-white shadow-sm shadow-orange-500/30 transition-transform active:scale-95 sm:text-xs"
                                        >
                                            {ctaLabel}
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                                            </svg>
                                        </button>
                                    ) : ctaHref ? (
                                        <a
                                            href={ctaHref}
                                            target={ctaExternal ? '_blank' : undefined}
                                            rel={ctaExternal ? 'noopener noreferrer' : undefined}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3.5 py-1.5 text-[11px] font-black text-white shadow-sm shadow-orange-500/30 transition-transform active:scale-95 sm:text-xs"
                                        >
                                            {ctaLabel}
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                                            </svg>
                                        </a>
                                    ) : null}
                                    {isAdAsk ? (
                                        <span className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">
                                            {isEn ? 'Ask your Safety Mitra' : 'সেফটি মিত্রকে জানান'}
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={finish}
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-transform active:scale-95 ${anim(1)}`}
                                aria-label={closeLabel}
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(strip, document.body);
}
