import React from 'react';

/**
 * Text-only printed chart tile.
 */
export default function IdentifyChartThumb({
    name,
    language = 'bn',
    compact = false,
}) {
    const bn = language === 'bn';

    return (
        <div
            className={`identify-chart-thumb identify-chart-thumb--text ${compact ? 'identify-chart-thumb--compact' : ''}`}
            aria-hidden
        >
            <div className="identify-chart-thumb-paper">
                {compact ? null : (
                    <span className={`identify-chart-thumb-kicker ${bn ? 'font-bengali' : ''}`}>
                        {bn ? 'চার্ট' : 'Chart'}
                    </span>
                )}
                <p className={`identify-chart-thumb-title ${bn ? 'font-bengali' : ''}`}>
                    {name}
                </p>
            </div>
        </div>
    );
}
