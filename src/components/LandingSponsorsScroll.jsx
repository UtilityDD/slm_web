import React, { useMemo, useState } from 'react';
import { buildLandingSponsors } from '../utils/hallOfFamePrizes';

function SponsorAvatar({ name, logoCandidates = [] }) {
    const [candidateIndex, setCandidateIndex] = useState(0);
    const src = logoCandidates[candidateIndex];
    const initial = (name || '?').charAt(0).toUpperCase();

    if (!src) {
        return (
            <span className="landing-sponsor-avatar landing-sponsor-avatar--generic" aria-hidden>
                {initial}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt=""
            loading="lazy"
            className="landing-sponsor-avatar"
            onError={() => setCandidateIndex((prev) => prev + 1)}
        />
    );
}

function SponsorChip({ sponsor, isBn }) {
    return (
        <div className="landing-sponsor-chip">
            <SponsorAvatar name={sponsor.name} logoCandidates={sponsor.logoCandidates} />
            <span className={`min-w-0 truncate text-sm font-bold text-slate-800 ${isBn ? 'font-bengali' : ''}`}>
                {sponsor.name}
            </span>
        </div>
    );
}

export default function LandingSponsorsScroll({ language = 'bn', title = '' }) {
    const sponsors = useMemo(() => buildLandingSponsors(language), [language]);
    const isBn = language === 'bn';

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
        <section className="landing-sponsors relative z-10 mb-8 sm:mb-12" aria-label={title}>
            {title && (
                <h2 className={`mb-3 text-base font-black tracking-tight text-slate-900 sm:mb-4 sm:text-lg ${isBn ? 'font-bengali' : ''}`}>
                    {title}
                </h2>
            )}
            <div className="landing-sponsors-mask">
                <div className="landing-sponsors-marquee" aria-hidden={false}>
                    <div className="landing-sponsors-marquee-track">
                        <div className="landing-sponsors-marquee-group">
                            {halfA.map((sponsor, idx) => (
                                <SponsorChip key={`a-${sponsor.id}-${idx}`} sponsor={sponsor} isBn={isBn} />
                            ))}
                        </div>
                        <div className="landing-sponsors-marquee-group" aria-hidden="true">
                            {halfB.map((sponsor, idx) => (
                                <SponsorChip key={`b-${sponsor.id}-${idx}`} sponsor={sponsor} isBn={isBn} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
