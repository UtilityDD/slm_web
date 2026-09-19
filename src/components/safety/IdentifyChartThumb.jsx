import React from 'react';
import { ACCENT_STYLES, TopicIcon, getChartTopic } from './identifyChartIcons';

/**
 * Icon-first thumbnail for Identify chart grid cards.
 */
export default function IdentifyChartThumb({
    chartId,
    name,
    language = 'bn',
    kind = 'howto',
    compact = false,
}) {
    const bn = language === 'bn';
    const topic = getChartTopic(chartId);
    const accent = ACCENT_STYLES[topic.accent] || ACCENT_STYLES.orange;
    const label = topic.shortBn || name;

    return (
        <div
            className={`identify-chart-thumb relative flex h-full w-full min-w-0 flex-col items-center justify-center overflow-hidden bg-gradient-to-br ${accent.soft} ${
                compact ? 'gap-1 px-1.5' : 'gap-2.5 px-3'
            }`}
            aria-hidden
        >
            <div className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-white/50 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-6 -left-4 h-16 w-16 rounded-full bg-white/40 blur-2xl" />

            <div className={`relative flex shrink-0 items-center justify-center ${compact ? 'h-9 w-9' : 'h-16 w-16 sm:h-[4.25rem] sm:w-[4.25rem]'}`}>
                <span className={`absolute inset-0 rounded-[1.15rem] bg-gradient-to-br ${accent.blob} opacity-95 shadow-lg shadow-orange-500/25`} />
                <span className="relative text-white drop-shadow-sm">
                    <TopicIcon name={topic.icon} className={compact ? 'h-4 w-4' : 'h-8 w-8 sm:h-9 sm:w-9'} />
                </span>
            </div>

            <span
                className={`relative line-clamp-2 max-w-full min-w-0 break-words rounded-full px-2 py-0.5 text-center font-black leading-tight ring-1 ring-inset ${accent.chip} ${accent.ring} ${
                    compact ? 'text-[9px]' : 'text-[10px] sm:text-[11px]'
                } ${bn ? 'font-bengali' : ''}`}
            >
                {label}
            </span>

            {!compact ? (
                <span className="relative flex h-1.5 w-8 overflow-hidden rounded-full bg-white/70 ring-1 ring-black/5">
                    <span className={`h-full w-full bg-gradient-to-r ${accent.blob} opacity-80`} />
                </span>
            ) : null}

            {/* kind hint — tiny corner glyph */}
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-lg bg-white/80 text-slate-500 shadow-sm ring-1 ring-black/5">
                <TopicIcon
                    name={kind === 'table' ? 'table' : kind === 'compare' ? 'compare' : kind === 'cards' ? 'cards' : kind === 'sections' ? 'book' : 'list'}
                    className="h-3 w-3"
                />
            </span>
        </div>
    );
}
