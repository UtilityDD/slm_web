import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildLandingSponsors } from '../utils/hallOfFamePrizes';

function SponsorAvatar({ name, logoCandidates = [], size = 'sm' }) {
    const [candidateIndex, setCandidateIndex] = useState(0);
    const src = logoCandidates[candidateIndex];
    const initial = (name || '?').charAt(0).toUpperCase();
    const sizeClass = size === 'lg' ? 'landing-sponsor-avatar landing-sponsor-avatar--lg' : 'landing-sponsor-avatar';

    if (!src) {
        return (
            <span className={`${sizeClass} landing-sponsor-avatar--generic`} aria-hidden>
                {initial}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt=""
            loading="lazy"
            className={sizeClass}
            onError={() => setCandidateIndex((prev) => prev + 1)}
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
            <div
                className="landing-sponsor-sheet-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="landing-sponsor-identity-title"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="landing-sponsor-sheet-close"
                    onClick={onClose}
                    aria-label={labels.close}
                >
                    ×
                </button>
                <div className="landing-sponsor-sheet-body">
                    <SponsorAvatar
                        name={sponsor.name}
                        logoCandidates={sponsor.logoCandidates}
                        size="lg"
                    />
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
        ? { sponsor: 'স্পনসর', close: 'বন্ধ করুন' }
        : { sponsor: 'Sponsor', close: 'Close' };

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
                <h2 className={`mb-3 text-base font-black tracking-tight text-slate-900 sm:mb-4 sm:text-lg ${isBn ? 'font-bengali' : ''}`}>
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
