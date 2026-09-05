import React, { useEffect, useState } from 'react';

export default function HallOfFamePrizeImage({ candidates, alt, className, onResolved }) {
    const [candidateIndex, setCandidateIndex] = useState(0);
    const list = Array.isArray(candidates) ? candidates : [];
    const candidateKey = list.join('|');
    const src = list[candidateIndex];

    useEffect(() => {
        setCandidateIndex(0);
        onResolved?.(null);
        // candidateKey is the stable fingerprint of this prize's files.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidateKey]);

    if (!src) {
        return (
            <div className={`flex items-center justify-center bg-amber-50 text-2xl ${className || ''}`} aria-hidden>
                🎁
            </div>
        );
    }

    return (
        <img
            key={src}
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
            onLoad={() => onResolved?.(src)}
            onError={() => setCandidateIndex((prev) => {
                const next = prev + 1;
                return next < list.length ? next : prev;
            })}
        />
    );
}
