import React, { useEffect, useId, useRef, useState } from 'react';
import { getBadgeByLevel } from '../utils/badgeUtils';
import AvatarPhoto from './AvatarPhoto';
import { AVATAR_EDGE } from '../utils/avatarImage';

/** Quiet metal rim — upgrades subtly with stage. */
export function getReadingFrameRingClass(level) {
    const n = Number(level) || 1;
    if (n >= 9) return 'ring-2 ring-orange-400';
    if (n >= 7) return 'ring-2 ring-fuchsia-300';
    if (n >= 5) return 'ring-2 ring-sky-300';
    if (n >= 3) return 'ring-2 ring-cyan-300';
    return 'ring-2 ring-slate-200';
}

/**
 * Pro avatar plate: circle photo + subtle tier ring + L# caption under the face.
 * Tap L# for full stage name (mobile-friendly).
 * `readingPoints` must be first-time unique-lesson points, not cumulative re-reads.
 */
export default function ReadingLevelAvatarFrame({
    level = 0,
    readingPoints = 0,
    language = 'bn',
    sizeClass = 'h-9 w-9',
    avatarUrl,
    displayEdge = AVATAR_EDGE.list,
    fallbackLetter = '?',
    onAvatarClick,
    onlineSlot = null,
    cornerSlot = null,
    className = '',
    faded = false,
}) {
    const badge = getBadgeByLevel(level, readingPoints);
    const stage = badge?.level || 1;
    const fullName = language === 'en' ? (badge?.en || '') : (badge?.bn || '');
    const label = `L${stage}`;
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const tipId = useId();
    const bn = language === 'bn';

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
        };
        const timer = window.setTimeout(() => setOpen(false), 2200);
        document.addEventListener('pointerdown', onDoc, true);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('pointerdown', onDoc, true);
        };
    }, [open]);

    return (
        <div
            ref={rootRef}
            className={`relative inline-flex shrink-0 flex-col items-center ${faded ? 'opacity-40 grayscale' : ''} ${className}`}
        >
            <div className={`relative ${sizeClass}`}>
                <div
                    role={onAvatarClick ? 'button' : undefined}
                    tabIndex={onAvatarClick ? 0 : undefined}
                    onClick={onAvatarClick}
                    onKeyDown={onAvatarClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onAvatarClick(e); } : undefined}
                    className={`h-full w-full overflow-hidden rounded-full border-2 border-white bg-white shadow-sm ${getReadingFrameRingClass(stage)} ${onAvatarClick ? 'cursor-zoom-in transition-transform active:scale-95' : ''}`}
                >
                    {avatarUrl ? (
                        <AvatarPhoto url={avatarUrl} edge={displayEdge} alt="" className="h-full w-full object-cover" draggable={false} />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-black text-slate-500">
                            {fallbackLetter}
                        </div>
                    )}
                </div>
                {cornerSlot}
                {onlineSlot}
            </div>

            {/* L# sits under the photo — never covers the face */}
            <button
                type="button"
                className={`z-20 -mt-1.5 flex h-[15px] min-w-[1.35rem] items-center justify-center rounded-full px-1 text-[8px] font-black tabular-nums leading-none tracking-tight shadow-sm transition-transform active:scale-95 ${badge.color}`}
                aria-label={fullName || label}
                aria-expanded={open}
                aria-controls={open ? tipId : undefined}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setOpen((v) => !v);
                }}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {label}
            </button>

            {open && fullName && (
                <span
                    id={tipId}
                    role="status"
                    className={`pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200/90 bg-slate-900 px-2 py-1 text-[10px] font-bold leading-none text-white shadow-lg ${bn ? 'font-bengali' : ''}`}
                >
                    {fullName}
                    <span
                        className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-slate-900"
                        aria-hidden
                    />
                </span>
            )}
        </div>
    );
}
