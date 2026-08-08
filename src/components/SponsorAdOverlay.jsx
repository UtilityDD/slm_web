import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchActiveSponsorAd, hasSeenSponsorAd, markSponsorAdSeen } from '../utils/sponsorAdService';
import SponsorSolarStoryMorph, { SOLAR_STORY_MORPH_IMAGE, SOLAR_STORY_DURATION_SEC } from './SponsorSolarStoryMorph';

/**
 * Full-screen sponsor interstitial — typography-led, staged motion,
 * distinct from the app theme. Once per session; admin preview via `preview`.
 * Does not auto-close: after the timer, a red × close control appears.
 */
export default function SponsorAdOverlay({
    language = 'en',
    blocked = false,
    /** Wait this many ms on an eligible screen before showing (e.g. logged-out dwell). */
    minDwellMs = 0,
    preview = null,
    onPreviewClose,
    onOpenChange,
    /** Opens landing-page Contact us section (id=contact). */
    onOpenLandingContact,
}) {
    const [ad, setAd] = useState(null);
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false);
    const [stage, setStage] = useState(0);
    const [timeDone, setTimeDone] = useState(false);
    const [remaining, setRemaining] = useState(0);
    const [headlineIndex, setHeadlineIndex] = useState(0);
    const [headlineVisible, setHeadlineVisible] = useState(true);
    const [reduceMotion, setReduceMotion] = useState(false);

    const previewModeRef = useRef(false);
    const holdTimerRef = useRef(null);
    const tickTimerRef = useRef(null);
    const fadeTimerRef = useRef(null);
    const stageTimersRef = useRef([]);
    const headlineRotateRef = useRef(null);
    const headlineFadeRef = useRef(null);
    const closeBtnRef = useRef(null);

    const isEn = language !== 'bn';

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const setMq = () => setReduceMotion(mq.matches);
        setMq();
        mq.addEventListener('change', setMq);
        return () => mq.removeEventListener('change', setMq);
    }, []);

    const clearStageTimers = useCallback(() => {
        stageTimersRef.current.forEach((t) => clearTimeout(t));
        stageTimersRef.current = [];
    }, []);

    const clearTimers = useCallback(() => {
        [holdTimerRef, tickTimerRef, fadeTimerRef, headlineRotateRef, headlineFadeRef].forEach((ref) => {
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
        setTimeDone(false);
        const wasPreview = previewModeRef.current;
        clearTimers();
        const fadeMs = reduceMotion ? 0 : 320;
        fadeTimerRef.current = setTimeout(() => {
            fadeTimerRef.current = null;
            previewModeRef.current = false;
            setOpen(false);
            setAd(null);
            if (wasPreview && typeof onPreviewClose === 'function') onPreviewClose();
        }, fadeMs);
    }, [clearTimers, onPreviewClose, reduceMotion]);

    const runStagger = useCallback(() => {
        clearStageTimers();
        if (reduceMotion) {
            setStage(6);
            return;
        }
        const steps = [
            [80, 1],
            [280, 2],
            [520, 3],
            [780, 4],
            [1180, 5],
            [1480, 6],
        ];
        steps.forEach(([delay, next]) => {
            const t = setTimeout(() => setStage(next), delay);
            stageTimersRef.current.push(t);
        });
    }, [clearStageTimers, reduceMotion]);

    const startShow = useCallback(
        (row, { isPreview }) => {
            if (!row) return;
            clearTimers();
            previewModeRef.current = isPreview;
            let seconds = Math.max(2, Math.min(30, Number(row.display_seconds) || 5));
            // Morph story finishes in ~7s — don't hold the close control longer than that.
            if (row.image_url === SOLAR_STORY_MORPH_IMAGE) {
                seconds = Math.min(seconds, SOLAR_STORY_DURATION_SEC);
            }
            setAd(row);
            setOpen(true);
            setTimeDone(false);
            setRemaining(seconds);
            setHeadlineIndex(0);
            setHeadlineVisible(true);
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
            if (rotating.length > 1 && !reduceMotion) {
                headlineRotateRef.current = setInterval(() => {
                    setHeadlineVisible(false);
                    if (headlineFadeRef.current) clearTimeout(headlineFadeRef.current);
                    headlineFadeRef.current = setTimeout(() => {
                        headlineFadeRef.current = null;
                        setHeadlineIndex((i) => (i + 1) % rotating.length);
                        setHeadlineVisible(true);
                    }, 280);
                }, 2200);
            } else if (rotating.length > 1 && reduceMotion) {
                headlineRotateRef.current = setInterval(() => {
                    setHeadlineIndex((i) => (i + 1) % rotating.length);
                }, 2200);
            }

            tickTimerRef.current = setInterval(() => {
                setRemaining((r) => (r > 1 ? r - 1 : 0));
            }, 1000);
            // Hold for duration, then reveal close — do not auto-dismiss.
            holdTimerRef.current = setTimeout(() => {
                holdTimerRef.current = null;
                if (tickTimerRef.current) {
                    clearInterval(tickTimerRef.current);
                    tickTimerRef.current = null;
                }
                setRemaining(0);
                setTimeDone(true);
            }, seconds * 1000);
        },
        [clearTimers, reduceMotion, runStagger]
    );

    useEffect(() => {
        if (!preview?.key) return;
        const row = preview.ad;
        if (!row) return;
        clearTimers();
        startShow(row, { isPreview: true });
    }, [preview?.key, preview?.ad, clearTimers, startShow]);

    useEffect(() => {
        if (blocked || open || preview?.key) return;
        let cancelled = false;
        let dwellTimer = null;

        const tryShow = () => {
            fetchActiveSponsorAd().then((row) => {
                if (cancelled || !row?.id) return;
                if (hasSeenSponsorAd(row.id)) return;
                startShow(row, { isPreview: false });
            });
        };

        const waitMs = Math.max(0, Number(minDwellMs) || 0);
        if (waitMs > 0) {
            dwellTimer = setTimeout(tryShow, waitMs);
        } else {
            tryShow();
        }

        return () => {
            cancelled = true;
            if (dwellTimer) clearTimeout(dwellTimer);
        };
    }, [blocked, open, preview?.key, startShow, minDwellMs]);

    useEffect(() => {
        if (blocked && open && !previewModeRef.current) finish();
    }, [blocked, open, finish]);

    useEffect(() => {
        const onKey = (e) => {
            if (open && e.key === 'Escape' && timeDone) finish();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, timeDone, finish]);

    useEffect(() => {
        if (timeDone) closeBtnRef.current?.focus();
    }, [timeDone]);

    useEffect(() => {
        if (typeof onOpenChange === 'function') onOpenChange(open);
    }, [open, onOpenChange]);

    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    useEffect(() => () => clearTimers(), [clearTimers]);

    const rotatingHeadlines = useMemo(() => {
        if (Array.isArray(ad?.headlines)) {
            const list = ad.headlines.map((h) => String(h || '').trim()).filter(Boolean);
            if (list.length) return list;
        }
        const single = (ad?.headline || '').trim();
        return single ? [single] : [];
    }, [ad?.headline, ad?.headlines]);

    const activeHeadline = rotatingHeadlines[headlineIndex % Math.max(rotatingHeadlines.length, 1)] || '';

    const headlineWords = useMemo(() => {
        const text = activeHeadline.trim();
        if (!text) return [];
        return text.split(/\s+/);
    }, [activeHeadline]);

    if (!open || !ad) return null;

    const isLight = ad.theme === 'light';
    const isAdAsk = ad.contact_safety_mitra === true;
    const bnText = /[\u0980-\u09FF]/.test(
        `${rotatingHeadlines.join(' ')}${ad.subtext || ''}${ad.sponsor_name || ''}`
    );
    const bnFont = !isEn || bnText ? 'font-bengali' : '';
    const closeLabel = isEn ? 'Close' : 'বন্ধ করুন';
    const waitLabel = isEn ? 'Please wait' : 'অপেক্ষা করুন';
    const sponsoredLabel = isAdAsk
        ? isEn
            ? 'Advertise with us'
            : 'বিজ্ঞাপনের সুযোগ'
        : isEn
          ? 'Sponsored'
          : 'স্পনসর্ড';
    const durationSec = (() => {
        let sec = Math.max(2, Math.min(30, Number(ad.display_seconds) || 5));
        if (ad.image_url === SOLAR_STORY_MORPH_IMAGE) {
            sec = Math.min(sec, SOLAR_STORY_DURATION_SEC);
        }
        return sec;
    })();
    const progressPct = timeDone
        ? 100
        : visible
          ? ((durationSec - remaining) / durationSec) * 100
          : 0;

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
    /* Advertise / ask ads: CTA opens the in-app contact form, never mailto. */
    const useLandingContact = isAdAsk && typeof onOpenLandingContact === 'function';
    const ctaHref = useLandingContact ? null : mailtoHref || webHref;
    const ctaExternal = !useLandingContact && !mailtoHref && !!webHref;
    const ctaLabel =
        ad.cta_label ||
        (isEn ? 'Contact us' : 'যোগাযোগ করুন');
    const noMoneyLabel = isEn ? 'We do not take any money' : 'আমরা কোনো টাকা নিই না';

    const handleLandingContact = () => {
        const fadeMs = reduceMotion ? 0 : 320;
        finish();
        window.setTimeout(() => {
            if (typeof onOpenLandingContact === 'function') onOpenLandingContact();
        }, fadeMs);
    };

    const contactItems = [
        /* Skip mailto on ask ads — contact CTA / form is the path */
        !isAdAsk &&
            ad.contact_email && {
                key: 'email',
                href: mailtoHref,
                label: ad.contact_email,
                icon: 'M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm0 2v.5l9 5.5 9-5.5V7l-9 5.5L3 7z',
            },
        ...String(ad.contact_phone || '')
            .split(/[|,;/]+/)
            .map((raw) => raw.trim())
            .filter(Boolean)
            .map((phone, idx) => {
                const digits = phone.replace(/\D/g, '');
                const pretty =
                    digits.length === 10
                        ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
                        : phone;
                return {
                    key: `phone-${idx}-${digits || phone}`,
                    href: `tel:${digits || phone}`,
                    label: pretty,
                    emphasize: true,
                    icon: 'M2.5 5.5A2.5 2.5 0 015 3h1.3a1 1 0 01.95.68l1 3a1 1 0 01-.25 1L7.6 9.1a12 12 0 005.3 5.3l1.42-1.4a1 1 0 011-.25l3 1a1 1 0 01.68.95V16a2.5 2.5 0 01-2.5 2.5A13.5 13.5 0 012.5 5.5z',
                };
            }),
        !isAdAsk &&
            ad.contact_url && {
                key: 'url',
                href: webHref,
                label: /wa\.me|whatsapp/i.test(String(ad.contact_url))
                    ? isEn
                        ? 'WhatsApp'
                        : 'WhatsApp'
                    : ad.contact_url.replace(/^https?:\/\//i, ''),
                icon: /wa\.me|whatsapp/i.test(String(ad.contact_url))
                    ? 'M12.04 2a9.84 9.84 0 0 0-8.52 14.76L2 22l5.39-1.42A9.94 9.94 0 1 0 12.04 2Zm0 17.99a8.15 8.15 0 0 1-4.15-1.14l-.3-.18-3.2.84.85-3.12-.2-.32A8.15 8.15 0 1 1 12.04 20Zm4.47-6.1c-.24-.12-1.45-.72-1.68-.8-.22-.08-.38-.12-.55.12-.16.25-.63.8-.77.97-.14.16-.28.18-.53.06-.24-.12-1.03-.38-1.96-1.21a7.35 7.35 0 0 1-1.36-1.7c-.14-.24-.02-.37.1-.49.11-.11.25-.28.37-.42.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.3-.22.25-.85.83-.85 2.02s.87 2.34.99 2.5c.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.45-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28Z'
                    : 'M3.9 12a5 5 0 015-5h3v2h-3a3 3 0 000 6h3v2h-3a5 5 0 01-5-5zm6-1h4v2h-4v-2zm2.1-4h3a5 5 0 010 10h-3v-2h3a3 3 0 000-6h-3V7z',
                external: true,
                emphasize: /wa\.me|whatsapp/i.test(String(ad.contact_url)),
                whatsapp: /wa\.me|whatsapp/i.test(String(ad.contact_url)),
            },
    ].filter(Boolean);

    const on = (min) => reduceMotion || stage >= min;
    const anim = (min) => (on(min) ? 'is-in' : '');

    const overlay = (
        <div
            className={`sponsor-ad-root fixed inset-0 z-[230] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden ${
                isLight ? 'sponsor-ad-light' : 'sponsor-ad-dark'
            } ${visible ? 'is-visible' : ''} ${reduceMotion ? 'sponsor-ad-reduce' : ''} ${bnFont} ${
                timeDone ? 'sponsor-ad-ready' : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={ad.sponsor_name ? `${sponsoredLabel}: ${ad.sponsor_name}` : sponsoredLabel}
        >
            <div className="sponsor-ad-atmosphere" aria-hidden>
                <div className="sponsor-ad-orb sponsor-ad-orb-a" />
                <div className="sponsor-ad-orb sponsor-ad-orb-b" />
                <div className="sponsor-ad-orb sponsor-ad-orb-c" />
                <div className="sponsor-ad-light-sweep" />
                <div className="sponsor-ad-shade-wave" />
                <div className="sponsor-ad-grain" />
                <div className="sponsor-ad-vignette" />
            </div>

            <div className="sponsor-ad-progress" aria-hidden>
                <div className="sponsor-ad-progress-fill" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
            </div>

            <div className={`sponsor-ad-chrome ${anim(1)}`}>
                <span className="sponsor-ad-badge">
                    <span className="sponsor-ad-badge-dot" />
                    {sponsoredLabel}
                </span>
                {!timeDone ? (
                    <span className="sponsor-ad-wait" aria-live="polite">
                        <span className="sponsor-ad-wait-label">{waitLabel}</span>
                        <span className="sponsor-ad-wait-count">{remaining}</span>
                    </span>
                ) : (
                    <button
                        type="button"
                        ref={closeBtnRef}
                        onClick={finish}
                        className="sponsor-ad-close-x"
                        aria-label={closeLabel}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="sponsor-ad-stage">
                {ad.logo_url && (
                    <div className={`sponsor-ad-logo ${anim(1)}`}>
                        <img src={ad.logo_url} alt={ad.sponsor_name || ''} />
                    </div>
                )}

                {ad.sponsor_name && (
                    <div className={`sponsor-ad-brand ${anim(1)}`}>
                        <p className="sponsor-ad-name">{ad.sponsor_name}</p>
                        {!isAdAsk && (
                            <span className="sponsor-ad-brand-rule" aria-hidden />
                        )}
                    </div>
                )}

                {ad.image_url && (
                    <div className={`sponsor-ad-product ${anim(2)}${ad.image_url === SOLAR_STORY_MORPH_IMAGE ? ' sponsor-ad-product--morph' : ''}`}>
                        <div className="sponsor-ad-product-glow" aria-hidden />
                        {ad.image_url === SOLAR_STORY_MORPH_IMAGE ? (
                            <SponsorSolarStoryMorph reduceMotion={reduceMotion} />
                        ) : (
                            <img
                                src={ad.image_url}
                                alt={ad.headline || ad.sponsor_name || ''}
                                className={reduceMotion ? '' : 'sponsor-ad-product-float'}
                            />
                        )}
                    </div>
                )}

                {headlineWords.length > 0 && (
                    <h1
                        className={`sponsor-ad-headline ${anim(4)} ${
                            headlineVisible ? 'is-headline-in' : 'is-headline-out'
                        }`}
                        aria-label={activeHeadline}
                        aria-live="polite"
                    >
                        {headlineWords.map((word, i) => (
                            <span
                                key={`${activeHeadline}-${word}-${i}`}
                                className="sponsor-ad-word"
                                style={{ '--i': i }}
                            >
                                <span className="sponsor-ad-word-inner">{word}</span>
                                {i < headlineWords.length - 1 ? ' ' : ''}
                            </span>
                        ))}
                    </h1>
                )}

                {rotatingHeadlines.length > 0 && (
                    <div className={`sponsor-ad-rule ${anim(4)}`} aria-hidden />
                )}

                {ad.subtext && (
                    <p className={`sponsor-ad-sub ${anim(5)}`}>{ad.subtext}</p>
                )}

                {isAdAsk && (
                    <p className={`sponsor-ad-no-money ${anim(5)}`} role="status">
                        {noMoneyLabel}
                    </p>
                )}

                {useLandingContact ? (
                    <button
                        type="button"
                        onClick={handleLandingContact}
                        className={`sponsor-ad-cta ${anim(6)}`}
                    >
                        <span>{ctaLabel}</span>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                    </button>
                ) : (
                    ctaHref && (
                        <a
                            href={ctaHref}
                            target={ctaExternal ? '_blank' : undefined}
                            rel={ctaExternal ? 'noopener noreferrer' : undefined}
                            className={`sponsor-ad-cta ${anim(6)}`}
                        >
                            <span>{ctaLabel}</span>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                        </a>
                    )
                )}

                {(ad.contact_safety_mitra || isAdAsk) && (
                    <p className={`sponsor-ad-mitra-cue ${anim(6)}`}>
                        {isEn
                            ? 'Please contact your known Safety Mitra'
                            : 'পরিচিত সেফটি মিত্রের সাথে যোগাযোগ করুন'}
                    </p>
                )}
            </div>

            {contactItems.length > 0 && (
                <div className={`sponsor-ad-footer ${anim(6)}`}>
                    <div className="sponsor-ad-footer-inner">
                        {contactItems.map((item) =>
                            item.static || !item.href ? (
                                <span key={item.key} className="sponsor-ad-contact sponsor-ad-contact-static">
                                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                        <path d={item.icon} />
                                    </svg>
                                    <span>{item.label}</span>
                                </span>
                            ) : (
                                <a
                                    key={item.key}
                                    href={item.href}
                                    target={item.external ? '_blank' : undefined}
                                    rel={item.external ? 'noopener noreferrer' : undefined}
                                    className={`sponsor-ad-contact${item.emphasize ? ' sponsor-ad-contact--hot' : ''}${item.whatsapp ? ' sponsor-ad-contact--wa' : ''}`}
                                >
                                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                        <path d={item.icon} />
                                    </svg>
                                    <span>{item.label}</span>
                                </a>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(overlay, document.body);
}
