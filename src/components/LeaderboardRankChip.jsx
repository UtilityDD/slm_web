import React from 'react';

/** Text color for place — no filled circles (keeps rows less crowded next to avatars). */
export function getLeaderboardRankTextClass(rank, { superseded = false } = {}) {
    if (superseded) return 'text-slate-400';
    const n = Number(rank);
    if (n === 1) return 'text-amber-500';
    if (n === 2) return 'text-slate-400';
    if (n === 3) return 'text-orange-500';
    return 'text-slate-500';
}

const SIZE = {
    sm: 'min-w-[1.25rem] text-[11px] sm:text-xs',
    md: 'min-w-[1.35rem] text-xs sm:text-sm',
    lg: 'min-w-[1.5rem] text-sm sm:text-base',
};

/**
 * Compact place number for leaderboard rows — plain tabular text, not a circle.
 */
export default function LeaderboardRankChip({
    rank,
    superseded = false,
    size = 'md',
    className = '',
    title,
}) {
    const label = rank == null || rank === '' ? '—' : String(rank);
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center font-black tabular-nums leading-none tracking-tight ${SIZE[size] || SIZE.md} ${getLeaderboardRankTextClass(rank, { superseded })} ${className}`}
            title={title}
            aria-label={title || `Rank ${label}`}
        >
            {label}
        </span>
    );
}
