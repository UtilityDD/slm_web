import React, { useState } from 'react';

export default function HallOfFamePrizeImage({ candidates, alt, className, onResolved }) {
    const [candidateIndex, setCandidateIndex] = useState(0);
    const src = candidates[candidateIndex];

    if (!src) {
        return (
            <div className={`flex items-center justify-center bg-amber-50 text-2xl ${className || ''}`} aria-hidden>
                🎁
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
            onLoad={() => onResolved?.(src)}
            onError={() => setCandidateIndex((prev) => prev + 1)}
        />
    );
}
