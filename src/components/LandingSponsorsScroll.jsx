import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildLandingSponsors } from '../utils/hallOfFamePrizes';

/** Shared across chip + modal so we don't re-probe failed extensions on open. */
const sponsorPhotoStatus = new Map(); // url -> true | false

function firstCandidateIndex(candidates = []) {
    let firstUnknown = -1;
    for (let i = 0; i < candidates.length; i += 1) {
        const status = sponsorPhotoStatus.get(candidates[i]);
        if (status === true) return i;
        if (status === false) continue;
        if (firstUnknown === -1) firstUnknown = i;
    }
    return firstUnknown === -1 ? candidates.length : firstUnknown;
}

function preloadSponsorPhotos(sponsors = []) {
    for (const sponsor of sponsors) {
        const candidates = sponsor.logoCandidates || [];
        const tryAt = (idx) => {
            const url = candidates[idx];
            if (!url) return;
            const status = sponsorPhotoStatus.get(url);
            if (status === true) return;
            if (status === false) {
                tryAt(idx + 1);
                return;
            }
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
                sponsorPhotoStatus.set(url, true);
            };
            img.onerror = () => {
                sponsorPhotoStatus.set(url, false);
                tryAt(idx + 1);
            };
            img.src = url;
        };
        tryAt(firstCandidateIndex(candidates));
    }
}

/** Lightweight smiling fallback when no sponsor photo is available. */
function SponsorSmileAvatar({ gender = 'man', size = 'sm' }) {
    const sizeClass =
        size === 'lg'
            ? 'landing-sponsor-avatar landing-sponsor-avatar--portrait landing-sponsor-avatar--smile'
            : 'landing-sponsor-avatar landing-sponsor-avatar--smile';
    const isWoman = gender === 'woman';

    return (
        <span className={sizeClass} aria-hidden>
            <svg
                className="landing-sponsor-smile-svg"
                viewBox="0 0 64 64"
                width="100%"
                height="100%"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle cx="32" cy="32" r="30" fill="#fde68a" />
                {isWoman ? (
                    <>
                        <path
                            d="M10 30c2-14 12-22 22-22s20 8 22 22c-4-8-12-12-22-12S14 22 10 30Z"
                            fill="#78350f"
                        />
                        <path
                            d="M8 34c1.5-3 4-5 7-6 0 6 2 11 5 14H13c-2.5-2-4.2-5-5-8Z"
                            fill="#78350f"
                        />
                        <path
                            d="M56 34c-1.5-3-4-5-7-6 0 6-2 11-5 14h7c2.5-2 4.2-5 5-8Z"
                            fill="#78350f"
                        />
                    </>
                ) : (
                    <path
                        d="M14 28c1.5-10 9-16 18-16s16.5 6 18 16c-3.5-5-9-8-18-8s-14.5 3-18 8Z"
                        fill="#78350f"
                    />
                )}
                <circle cx="23.5" cy="30" r="2.4" fill="#0f172a" />
                <circle cx="40.5" cy="30" r="2.4" fill="#0f172a" />
                <path
                    d="M24 40c2.4 3.2 5.6 4.8 8 4.8s5.6-1.6 8-4.8"
                    stroke="#0f172a"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                />
                <circle cx="18.5" cy="36.5" r="3" fill="#fb923c" opacity="0.45" />
                <circle cx="45.5" cy="36.5" r="3" fill="#fb923c" opacity="0.45" />
            </svg>
        </span>
    );
}

function SponsorAvatar({ gender = 'man', logoCandidates = [], size = 'sm' }) {
    const candidatesKey = logoCandidates.join('|');
    const [candidateIndex, setCandidateIndex] = useState(() => firstCandidateIndex(logoCandidates));

    useEffect(() => {
        setCandidateIndex(firstCandidateIndex(logoCandidates));
    }, [candidatesKey, logoCandidates]);

    const src = logoCandidates[candidateIndex];
    const sizeClass =
        size === 'lg'
            ? 'landing-sponsor-avatar landing-sponsor-avatar--portrait'
            : 'landing-sponsor-avatar';
    const isPortrait = size === 'lg';

    if (!src) {
        return <SponsorSmileAvatar gender={gender} size={size} />;
    }

    return (
        <img
            src={src}
            alt=""
            loading={isPortrait ? 'eager' : 'lazy'}
            {...(isPortrait ? { fetchpriority: 'high' } : {})}
            decoding="async"
            className={sizeClass}
            onLoad={() => {
                sponsorPhotoStatus.set(src, true);
            }}
            onError={() => {
                sponsorPhotoStatus.set(src, false);
                setCandidateIndex((prev) => prev + 1);
            }}
        />
    );
}

function SponsorChip({ sponsor, isBn, onOpen }) {
    return (
        <button
            type="button"
            className="landing-sponsor-chip"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpen(sponsor);
            }}
            aria-haspopup="dialog"
        >
            <SponsorAvatar
                gender={sponsor.gender}
                logoCandidates={sponsor.logoCandidates}
            />
            <span className={`landing-sponsor-chip-name ${isBn ? 'font-bengali' : ''}`}>
                {sponsor.name}
            </span>
        </button>
    );
}

function SponsorIdentityCard({ sponsor, isBn, onClose, labels }) {
    const [closeArmed, setCloseArmed] = useState(false);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        // Ignore the same gesture that opened the sheet (ghost click on backdrop).
        const armClose = window.setTimeout(() => setCloseArmed(true), 320);
        window.addEventListener('keydown', onKey);
        return () => {
            window.clearTimeout(armClose);
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    return createPortal(
        <div className="landing-sponsor-sheet" role="presentation">
            <button
                type="button"
                className="landing-sponsor-sheet-backdrop"
                aria-label={labels.close}
                onClick={() => {
                    if (closeArmed) onClose();
                }}
            />
            <div className="landing-sponsor-sheet-panel">
                <button
                    type="button"
                    className="landing-sponsor-sheet-close"
                    onClick={onClose}
                    aria-label={labels.close}
                >
                    ×
                </button>
                <div
                    className="landing-sponsor-sheet-card"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="landing-sponsor-identity-title"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="landing-sponsor-sheet-body">
                        <div className="landing-sponsor-sheet-photo-wrap">
                            <SponsorAvatar
                                gender={sponsor.gender}
                                logoCandidates={sponsor.logoCandidates}
                                size="lg"
                            />
                        </div>
                        <p className={`landing-sponsor-sheet-thanks ${isBn ? 'font-bengali' : ''}`}>
                            {labels.thanks}
                        </p>
                        <p className="landing-sponsor-sheet-eyebrow">{labels.sponsor}</p>
                        <h3
                            id="landing-sponsor-identity-title"
                            className={`landing-sponsor-sheet-name ${isBn ? 'font-bengali' : ''}`}
                        >
                            {sponsor.name}
                        </h3>
                        {sponsor.detail ? (
                            <p className={`landing-sponsor-sheet-detail ${isBn ? 'font-bengali' : ''}`}>
                                {sponsor.detail}
                            </p>
                        ) : null}
                        <p className={`landing-sponsor-sheet-note ${isBn ? 'font-bengali' : ''}`}>
                            {labels.thanksNote}
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function LandingSponsorsScroll({ language = 'bn', title = '' }) {
    const sponsors = useMemo(() => buildLandingSponsors(language), [language]);
    const isBn = language === 'bn';
    const [activeSponsor, setActiveSponsor] = useState(null);

    const labels = isBn
        ? {
              sponsor: 'স্পনসর',
              close: 'বন্ধ করুন',
              thanks: 'ধন্যবাদ',
              thanksNote: 'আপনার সৌজন্যে আমরা এগিয়ে যেতে পারি।',
          }
        : {
              sponsor: 'Sponsor',
              close: 'Close',
              thanks: 'Thank you',
              thanksNote: 'Your kindness helps us keep going.',
          };

    // Warm the browser cache (and resolve working URL) before a chip is tapped.
    useEffect(() => {
        preloadSponsorPhotos(sponsors);
    }, [sponsors]);

    const openSponsor = useCallback((sponsor) => {
        setActiveSponsor(sponsor);
    }, []);

    const closeSponsor = useCallback(() => {
        setActiveSponsor(null);
    }, []);

    // Repeat enough times so the track is always wider than the viewport for seamless loop.
    const loopSponsors = useMemo(() => {
        if (!sponsors.length) return [];
        const minCopies = Math.max(4, Math.ceil(8 / sponsors.length));
        return Array.from({ length: minCopies }, () => sponsors).flat();
    }, [sponsors]);

    // Two identical halves — CSS animates -50% for a seamless infinite loop.
    const halfA = loopSponsors;
    const halfB = loopSponsors;

    if (!sponsors.length) return null;

    return (
        <section
            className={`landing-sponsors relative z-10 mb-8 sm:mb-12${activeSponsor ? ' is-open' : ''}`}
            aria-label={title}
        >
            {title && (
                <h2
                    className={`mb-3 text-base font-black tracking-tight text-slate-900 sm:mb-4 sm:text-lg ${isBn ? 'font-bengali' : ''}`}
                >
                    {title}
                </h2>
            )}
            <div className="landing-sponsors-mask">
                <div className="landing-sponsors-marquee">
                    <div className="landing-sponsors-marquee-track">
                        <div className="landing-sponsors-marquee-group">
                            {halfA.map((sponsor, idx) => (
                                <SponsorChip
                                    key={`a-${sponsor.id}-${idx}`}
                                    sponsor={sponsor}
                                    isBn={isBn}
                                    onOpen={openSponsor}
                                />
                            ))}
                        </div>
                        <div className="landing-sponsors-marquee-group" aria-hidden="true">
                            {halfB.map((sponsor, idx) => (
                                <SponsorChip
                                    key={`b-${sponsor.id}-${idx}`}
                                    sponsor={sponsor}
                                    isBn={isBn}
                                    onOpen={openSponsor}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {activeSponsor && (
                <SponsorIdentityCard
                    sponsor={activeSponsor}
                    isBn={isBn}
                    onClose={closeSponsor}
                    labels={labels}
                />
            )}
        </section>
    );
}
