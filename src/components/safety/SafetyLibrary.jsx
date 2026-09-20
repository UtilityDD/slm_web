import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { libraryService } from '../../utils/libraryService';
import { storageUtils } from '../../utils/storageUtils';
import {
    toSafetyLibraryDisplayUrl,
    handleSafetyLibraryImageError,
} from '../../utils/safetyLibraryImageUrl';
import { pushIdentifyRecent, readIdentifyRecents } from '../../utils/safetyLibraryRecents';
import { readIdentifyPracticeScore } from '../../utils/safetyLibraryPractice';
import {
    fetchIdentifyScoreStatus,
    canStartIdentifyReal,
    isIdentifyAdmin,
} from '../../utils/identifyRealScore';
import { consumeIdentifyRealLaunch } from '../../utils/identifyGiftLaunch';
import { invalidateLeaderboardCaches } from '../../utils/leaderboardCacheKeys';
import { getIdentifyChartPage, hasIdentifyChartPage } from '../../data/identifyCharts';
import IdentifyPractice from './IdentifyPractice';
import IdentifyChartPage from './IdentifyChartPage';
import IdentifyChartThumb from './IdentifyChartThumb';
import { getChartTopic } from './identifyChartIcons';

const CATEGORY_ORDER = ['PPE', 'Tools', 'Insulators', 'AB Cable Items', 'Charts', 'Others'];
const VIDEO_NUDGE_AFTER_MS = 60_000;
const VIDEO_NUDGE_HOLD_MS = 16_000;
const VIDEO_NUDGE_FADE_MS = 2400;

const CATEGORY_LABELS = {
    All: { bn: 'সব', en: 'All' },
    PPE: { bn: 'পিপিই', en: 'PPE' },
    Tools: { bn: 'টুলস', en: 'Tools' },
    Insulators: { bn: 'ইনসুলেটর', en: 'Insulators' },
    Charts: { bn: 'চার্ট', en: 'Charts' },
    'AB Cable Items': { bn: 'এবি কেবল সরঞ্জাম', en: 'AB cable accessories' },
    Others: { bn: 'অন্যান্য', en: 'Others' },
};

function categoryLabel(catId, language) {
    const row = CATEGORY_LABELS[catId];
    if (!row) return catId || '';
    return language === 'en' ? row.en : row.bn;
}

function chartPageSearchText(itemId) {
    const page = getIdentifyChartPage(itemId);
    if (!page) return '';
    const bits = [page.kicker, page.intro, page.tip, page.warning];
    for (const step of page.steps || []) {
        bits.push(step.title, step.ok, step.bad);
    }
    if (page.compare) {
        bits.push(page.compare.wrong?.title, ...(page.compare.wrong?.points || []));
        bits.push(page.compare.right?.title, ...(page.compare.right?.points || []));
    }
    for (const table of page.tables || []) {
        bits.push(table.title, table.note, ...(table.headers || []));
        for (const row of table.rows || []) bits.push(...row);
    }
    for (const card of page.cards || []) {
        bits.push(card.title, ...(card.points || []));
    }
    for (const section of page.sections || []) {
        bits.push(section.title, ...(section.points || []));
    }
    if (page.flow) bits.push(...page.flow);
    return bits.filter(Boolean).join(' ');
}

function itemMatchesSearch(item, rawQuery, language) {
    const q = String(rawQuery || '').trim().toLowerCase();
    if (!q) return true;
    const hay = [
        item.name_bn,
        item.function_bn,
        item.guide_bn,
        item.category,
        categoryLabel(item.category, 'bn'),
        categoryLabel(item.category, 'en'),
        categoryLabel(item.category, language),
        chartPageSearchText(item.id),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return hay.includes(q);
}

const SearchIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

const ShieldCheckIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="m9 12 2 2 4-4"></path>
    </svg>
);

const LineChartIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 3v18h18"></path>
        <path d="m19 9-5 5-4-4-3 3"></path>
    </svg>
);

const InfoIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

const ChevronLeftIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m15 18-6-6 6-6"></path>
    </svg>
);

const ChevronRightIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6"></path>
    </svg>
);

/** Magnifying glass + minus (zoom out) */
const MagnifierMinusIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="10.5" cy="10.5" r="6.25" />
        <path d="M15 15l4.5 4.5" />
        <path d="M8 10.5h5" strokeWidth="2.25" />
    </svg>
);

/** Magnifying glass + plus (zoom in) */
const MagnifierPlusIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="10.5" cy="10.5" r="6.25" />
        <path d="M15 15l4.5 4.5" />
        <path d="M10.5 8v5M8 10.5h5" strokeWidth="2.25" />
    </svg>
);

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

const ImageSlider = forwardRef(function ImageSlider(
    {
        images,
        alt,
        aspect = 'aspect-[4/3]',
        showControls = true,
        enableZoom = false,
        /** When `enableZoom`, omit in-image pill and drive zoom from parent (e.g. modal toolbar). */
        zoomChrome = 'overlay',
        /** Fires whenever zoom level changes (pinch, buttons, slide change). */
        onZoomChange,
        /** Tall charts: let image use natural height so the modal scroll body can scroll vertically at 1× zoom. */
        naturalImageHeight = false,
        /** Fill a sized parent (e.g. 2/3 viewport) — image scales up/down with object-contain. */
        fillFrame = false,
        /** Auto-rotate slides every 3s when multiple images (off in detail modal). */
        autoAdvance = true,
        emptyLabel = 'No photo',
    },
    ref
) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slideDirection, setSlideDirection] = useState(1);
    const [validImages, setValidImages] = useState(images || []);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const viewportRef = useRef(null);
    const zoomRef = useRef(1);
    const pointersRef = useRef(new Map());
    const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1 });
    const globalListenersAttachedRef = useRef(false);
    const globalMoveWrapperRef = useRef(null);
    const globalUpWrapperRef = useRef(null);
    const activeImageRef = useRef(null);
    const dragRef = useRef({
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0
    });

    const clampPan = useCallback((nx, ny, z) => {
        const el = viewportRef.current;
        if (!el || z <= 1.001) return { x: 0, y: 0 };
        const w = el.clientWidth;
        const h = el.clientHeight;
        const maxX = w * (z - 1) * 0.52 + 48;
        const maxY = h * (z - 1) * 0.52 + 48;
        return {
            x: Math.max(-maxX, Math.min(maxX, nx)),
            y: Math.max(-maxY, Math.min(maxY, ny))
        };
    }, []);

    useEffect(() => {
        setValidImages(images || []);
        setSlideDirection(1);
        setCurrentIndex(0);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [images]);

    const advanceSlide = useCallback(
        (step) => {
            const len = validImages?.length || 0;
            if (len <= 1) return;
            const direction = step >= 0 ? 1 : -1;
            setSlideDirection(direction);
            setCurrentIndex((prev) => (prev + step + len) % len);
        },
        [validImages]
    );

    useEffect(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [currentIndex]);

    useEffect(() => {
        setPan((p) => clampPan(p.x, p.y, zoom));
    }, [zoom, clampPan]);

    const panRef = useRef(pan);
    useEffect(() => {
        panRef.current = pan;
    }, [pan]);

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    useEffect(() => {
        onZoomChange?.(zoom);
    }, [zoom, onZoomChange]);

    useImperativeHandle(
        ref,
        () => ({
            zoomIn: () => {
                setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
            },
            zoomOut: () => {
                setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
            },
            resetZoom: () => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
            }
        }),
        []
    );

    const detachGlobalPointerListeners = useCallback(() => {
        if (!globalListenersAttachedRef.current) return;
        globalListenersAttachedRef.current = false;
        const mv = globalMoveWrapperRef.current;
        const up = globalUpWrapperRef.current;
        if (mv) window.removeEventListener('pointermove', mv, true);
        if (up) {
            window.removeEventListener('pointerup', up, true);
            window.removeEventListener('pointercancel', up, true);
        }
    }, []);

    useEffect(() => {
        if (!enableZoom) return;
        const onMove = (e) => {
            if (!pointersRef.current.has(e.pointerId)) return;
            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (pinchRef.current.active && pointersRef.current.size >= 2) {
                const pts = [...pointersRef.current.values()];
                const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                const { startDist, startZoom } = pinchRef.current;
                const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, startZoom * (d / startDist)));
                setZoom(next);
                return;
            }

            const d = dragRef.current;
            if (d.active && !pinchRef.current.active && e.pointerId === d.pointerId) {
                const dx = e.clientX - d.startX;
                const dy = e.clientY - d.startY;
                setPan(clampPan(d.originX + dx, d.originY + dy, zoomRef.current));
            }
        };

        const onEnd = (e) => {
            if (!pointersRef.current.has(e.pointerId)) return;
            pointersRef.current.delete(e.pointerId);

            if (pinchRef.current.active && pointersRef.current.size < 2) {
                pinchRef.current.active = false;
            }

            const d = dragRef.current;
            if (d.active && d.pointerId === e.pointerId) {
                const pid = d.pointerId;
                d.active = false;
                d.pointerId = null;
                setIsDragging(false);
                const vp = viewportRef.current;
                if (vp) {
                    try {
                        vp.releasePointerCapture(pid);
                    } catch {
                        /* ignore */
                    }
                }
            }

            if (pointersRef.current.size === 0) {
                detachGlobalPointerListeners();
            }
        };

        globalMoveWrapperRef.current = onMove;
        globalUpWrapperRef.current = onEnd;
        return () => {
            detachGlobalPointerListeners();
            pointersRef.current.clear();
            pinchRef.current.active = false;
        };
    }, [enableZoom, clampPan, detachGlobalPointerListeners]);

    useEffect(() => {
        if (!autoAdvance || !validImages || validImages.length <= 1 || !showControls) return;
        const interval = setInterval(() => {
            if (enableZoom && (zoomRef.current > 1.001 || pinchRef.current.active)) return;
            advanceSlide(1);
        }, 3000);
        return () => clearInterval(interval);
    }, [autoAdvance, validImages, showControls, enableZoom, advanceSlide]);

    /** iOS/Android: stop the modal scroll parent from eating touch moves while zoomed (touch-none is not always enough). */
    useEffect(() => {
        const el = viewportRef.current;
        if (!enableZoom || !el || zoom <= 1.001) return;
        const blockParentScroll = (e) => {
            e.preventDefault();
        };
        el.addEventListener('touchmove', blockParentScroll, { passive: false });
        return () => el.removeEventListener('touchmove', blockParentScroll);
    }, [enableZoom, zoom]);

    const onViewportPointerDown = useCallback(
        (e) => {
            if (!enableZoom) return;
            if (e.button !== undefined && e.button !== 0) return;
            const target = e.target;
            if (target instanceof Element && (target.closest('[data-zoom-ui]') || target.closest('button'))) return;

            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (!globalListenersAttachedRef.current) {
                const mv = globalMoveWrapperRef.current;
                const up = globalUpWrapperRef.current;
                if (mv && up) {
                    globalListenersAttachedRef.current = true;
                    window.addEventListener('pointermove', mv, true);
                    window.addEventListener('pointerup', up, true);
                    window.addEventListener('pointercancel', up, true);
                }
            }

            if (pointersRef.current.size >= 2) {
                if (dragRef.current.active) {
                    const pid = dragRef.current.pointerId;
                    dragRef.current = {
                        active: false,
                        pointerId: null,
                        startX: 0,
                        startY: 0,
                        originX: 0,
                        originY: 0
                    };
                    setIsDragging(false);
                    try {
                        viewportRef.current?.releasePointerCapture(pid);
                    } catch {
                        /* ignore */
                    }
                }
                const pts = [...pointersRef.current.values()];
                const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                pinchRef.current = {
                    active: true,
                    startDist: Math.max(dist, 8),
                    startZoom: zoomRef.current
                };
                return;
            }

            if (zoomRef.current > 1.001) {
                dragRef.current = {
                    active: true,
                    pointerId: e.pointerId,
                    startX: e.clientX,
                    startY: e.clientY,
                    originX: panRef.current.x,
                    originY: panRef.current.y
                };
                setIsDragging(true);
                try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                    /* ignore */
                }
            }
        },
        [enableZoom]
    );

    const onLostPointerCapture = useCallback(
        (e) => {
            if (dragRef.current.pointerId !== e.pointerId) return;
            dragRef.current.active = false;
            dragRef.current.pointerId = null;
            setIsDragging(false);
            pointersRef.current.delete(e.pointerId);
            if (pinchRef.current.active && pointersRef.current.size < 2) {
                pinchRef.current.active = false;
            }
            if (pointersRef.current.size === 0) {
                detachGlobalPointerListeners();
            }
        },
        [detachGlobalPointerListeners]
    );

    const handleImageError = (url) => {
        const updated = validImages.filter(img => img !== url);
        setValidImages(updated);
        if (currentIndex >= updated.length && updated.length > 0) {
            setSlideDirection(1);
            setCurrentIndex(0);
        }
    };

    useEffect(() => {
        if (!activeImageRef.current || (validImages?.length || 0) <= 1) return;
        const fromX = slideDirection >= 0 ? 28 : -28;
        activeImageRef.current.animate(
            [
                { opacity: 0, transform: `translateX(${fromX}px) scale(0.985)` },
                { opacity: 1, transform: 'translateX(0) scale(1)' }
            ],
            {
                duration: 340,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'both'
            }
        );
    }, [currentIndex, slideDirection, validImages]);

    if (!validImages || validImages.length === 0) {
        return (
            <div className={`${fillFrame ? 'h-full w-full' : aspect} flex flex-col items-center justify-center border-b border-slate-200/80 bg-slate-100 p-4 text-center text-slate-400`}>
                <svg className="mb-2 h-8 w-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] font-bold opacity-40">{emptyLabel}</span>
            </div>
        );
    }

    const canZoomIn = zoom < ZOOM_MAX - 0.01;
    const canZoomOut = zoom > ZOOM_MIN + 0.01;

    const boxAspect = fillFrame ? 'h-full w-full' : naturalImageHeight ? 'w-full min-h-0' : aspect;
    const touchClass =
        enableZoom && zoom > 1.001
            ? `touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`
            : enableZoom
              ? 'touch-pan-y'
              : '';

    return (
        <div
            ref={enableZoom ? viewportRef : undefined}
            onPointerDown={enableZoom ? onViewportPointerDown : undefined}
            onLostPointerCapture={enableZoom ? onLostPointerCapture : undefined}
            className={`group/slider relative flex select-none justify-center bg-white ${boxAspect} [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] ${
                naturalImageHeight && !fillFrame ? 'items-start overflow-x-hidden overflow-y-visible' : 'items-center overflow-hidden'
            } ${touchClass}`}
        >
            {showControls && validImages.length > 1 && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        advanceSlide(-1);
                    }}
                    className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white opacity-100 backdrop-blur-sm transition-all hover:bg-black/45"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
            )}

            <div
                className={
                    fillFrame
                        ? 'flex h-full w-full items-center justify-center p-2'
                        : naturalImageHeight
                          ? 'flex w-full items-start justify-center p-1'
                          : 'flex min-h-full min-w-full items-center justify-center p-1'
                }
                style={{
                    transform: enableZoom ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : `scale(${zoom})`,
                    transformOrigin: fillFrame || !naturalImageHeight ? 'center center' : 'top center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
            >
                <img
                    ref={activeImageRef}
                    key={currentIndex}
                    src={toSafetyLibraryDisplayUrl(validImages[currentIndex])}
                    alt={`${alt} ${currentIndex + 1}`}
                    draggable={false}
                    data-fallback-index="0"
                    onDragStart={(e) => e.preventDefault()}
                    onError={(e) => {
                        if (handleSafetyLibraryImageError(e, validImages[currentIndex])) {
                            handleImageError(validImages[currentIndex]);
                        }
                    }}
                    className={`object-contain filter drop-shadow-md transition-opacity duration-300 ${
                        fillFrame
                            ? 'h-full w-full'
                            : naturalImageHeight
                              ? 'h-auto w-full max-w-full'
                              : 'h-auto w-auto max-h-full max-w-full'
                    } ${enableZoom ? '' : 'zoom-in-95 duration-500 group-hover/slider:scale-105'}`}
                />
            </div>

            {enableZoom && zoomChrome !== 'none' && (
                <div
                    data-zoom-ui
                    className={`pointer-events-auto absolute z-20 flex items-center gap-0.5 rounded-full border border-white/15 bg-black/45 px-1 py-1 backdrop-blur-md ${
                        showControls && validImages.length > 1 ? 'bottom-10 left-3' : 'bottom-3 left-3'
                    }`}
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
                        }}
                        disabled={!canZoomOut}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold leading-none text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Zoom out"
                    >
                        −
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setZoom(1);
                        }}
                        className="min-w-[2.25rem] px-1.5 py-1 text-[10px] font-bold tabular-nums text-white/90 transition-colors hover:text-white"
                        aria-label="Reset zoom"
                    >
                        {zoom <= 1.001 ? '1×' : `${zoom.toFixed(2).replace(/\.?0+$/, '')}×`}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
                        }}
                        disabled={!canZoomIn}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold leading-none text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Zoom in"
                    >
                        +
                    </button>
                </div>
            )}

            {showControls && validImages.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            advanceSlide(1);
                        }}
                        className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white opacity-100 backdrop-blur-sm transition-all hover:bg-black/45"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                    <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/20 px-1.5 py-0.5 backdrop-blur-md dark:bg-white/20">
                        {validImages.map((_, i) => (
                            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-2 bg-orange-500' : 'w-1 bg-white/50'}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
});

ImageSlider.displayName = 'ImageSlider';

const SkeletonShimmer = ({ className = '' }) => (
    <div
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        aria-hidden
    >
        <div className="absolute inset-y-0 w-[55%] -skew-x-12 bg-gradient-to-r from-transparent via-orange-100/80 to-transparent animate-safety-shimmer" />
    </div>
);

const SafetyLibraryLoadingView = ({ language }) => {
    const copy =
        language === 'bn'
            ? { line: 'ছবি আসছে…', sub: 'একটু দাঁড়ান' }
            : { line: 'Loading photos…', sub: 'Just a moment' };

    return (
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden p-3 sm:p-8" aria-busy="true" aria-live="polite">
            <div className="mb-6 flex flex-col items-center gap-3 py-2 sm:py-4">
                <div className="nb-icon-badge relative flex h-[4.5rem] w-[4.5rem] items-center justify-center bg-orange-100">
                    <ShieldCheckIcon className="relative h-8 w-8 text-orange-600 animate-safety-float" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-sm font-black tracking-tight text-slate-800 nb-mono uppercase">{copy.line}</p>
                    <p className="text-[11px] font-semibold text-slate-500">{copy.sub}</p>
                </div>
            </div>

            <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4">
                {Array.from({ length: 8 }, (_, i) => (
                    <div
                        key={i}
                        className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white"
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                        <div className="relative aspect-square overflow-hidden bg-slate-100">
                            <SkeletonShimmer className="opacity-90" />
                        </div>
                        <div className="space-y-1.5 px-2 py-2">
                            <div className="mx-auto h-2.5 w-[88%] rounded bg-slate-200" />
                            <div className="mx-auto h-2.5 w-[62%] rounded bg-slate-100" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GridImage = ({ images, alt, language }) => {
    const [randomImage] = useState(() => {
        if (!images || images.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * images.length);
        return images[randomIndex];
    });
    const [failed, setFailed] = useState(false);

    if (!randomImage || failed) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 p-4 text-slate-400">
                <span className={`text-[10px] font-bold opacity-40 ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {language === 'en' ? 'No photo' : 'ছবি নেই'}
                </span>
            </div>
        );
    }

    return (
        <img
            src={toSafetyLibraryDisplayUrl(randomImage)}
            alt={alt}
            data-fallback-index="0"
            onError={(e) => {
                if (handleSafetyLibraryImageError(e, randomImage)) {
                    setFailed(true);
                }
            }}
            className="h-full w-full object-contain object-center p-1.5 filter drop-shadow-sm transition-transform duration-500 group-hover:scale-[1.04] sm:p-2"
        />
    );
};

export default function SafetyLibrary({ language, setCurrentView, embedded = false, user = null, userProfile = null, refreshProfile = null }) {
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('PPE');
    const [selectedItem, setSelectedItem] = useState(null);
    const [categories, setCategories] = useState([]);
    const [recentIds, setRecentIds] = useState(() => readIdentifyRecents());
    const [practiceOpen, setPracticeOpen] = useState(false);
    const [practiceScoringMode, setPracticeScoringMode] = useState('practice');
    /** Practice opened from real-score rules → quit returns to rules info. */
    const [practiceFromRules, setPracticeFromRules] = useState(false);
    const [modeGateOpen, setModeGateOpen] = useState(false);
    const [practiceScore, setPracticeScore] = useState(() => readIdentifyPracticeScore());
    const [identifyStatus, setIdentifyStatus] = useState(null);
    const [modeGateMessage, setModeGateMessage] = useState('');
    const [scoreSheetOpen, setScoreSheetOpen] = useState(false);
    const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
    const [videoNudge, setVideoNudge] = useState('');
    const videoNudgeDoneRef = useRef(false);
    const videoDwellLeftRef = useRef(VIDEO_NUDGE_AFTER_MS);
    const tabsRef = useRef(null);
    const detailSliderRef = useRef(null);
    const [detailZoomLevel, setDetailZoomLevel] = useState(1);
    /** Modal only: stack when opening a related chart from a product item. */
    const [modalBrowseStack, setModalBrowseStack] = useState([]);

    useEffect(() => {
        setDetailZoomLevel(1);
    }, [selectedItem?.id]);

    /** Home gift FAB: open straight into real mode (UI launch flag). */
    useEffect(() => {
        if (!consumeIdentifyRealLaunch()) return;
        setPracticeScoringMode('real');
        setPracticeFromRules(false);
        setPracticeOpen(true);
        setModeGateOpen(false);
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (!user?.id) {
            setIdentifyStatus(null);
            return undefined;
        }
        (async () => {
            // Cache-first; only hits network when session has no today’s status.
            const status = await fetchIdentifyScoreStatus({ force: false, userId: user.id });
            if (!cancelled) setIdentifyStatus(status);
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    useEffect(() => {
        if (
            loading
            || practiceOpen
            || videoNudge
            || videoNudgeDoneRef.current
            || typeof setCurrentView !== 'function'
        ) {
            return undefined;
        }
        const started = Date.now();
        const timer = window.setTimeout(() => {
            setVideoNudge('in');
        }, videoDwellLeftRef.current);
        return () => {
            window.clearTimeout(timer);
            videoDwellLeftRef.current = Math.max(0, videoDwellLeftRef.current - (Date.now() - started));
        };
    }, [loading, practiceOpen, videoNudge, setCurrentView]);

    useEffect(() => {
        if (videoNudge !== 'in') return undefined;
        const hide = window.setTimeout(() => {
            setVideoNudge('out');
        }, VIDEO_NUDGE_HOLD_MS);
        return () => window.clearTimeout(hide);
    }, [videoNudge]);

    useEffect(() => {
        if (videoNudge !== 'out') return undefined;
        const gone = window.setTimeout(() => {
            setVideoNudge('');
            videoNudgeDoneRef.current = true;
        }, VIDEO_NUDGE_FADE_MS);
        return () => window.clearTimeout(gone);
    }, [videoNudge]);

    useEffect(() => {
        if (!selectedItem) setModalBrowseStack([]);
    }, [selectedItem]);

    useEffect(() => {
        if (embedded) return undefined;

        const html = document.documentElement;
        html.classList.remove('dark');

        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const previousThemeColor = metaThemeColor?.getAttribute('content') || null;
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', '#fffdf7');

        return () => {
            const savedTheme = storageUtils.getItem('appTheme') || 'dark';
            if (savedTheme === 'dark') {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
            if (previousThemeColor) {
                metaThemeColor.setAttribute('content', previousThemeColor);
            }
        };
    }, [embedded]);

    // Scroll Hint Effect
    useEffect(() => {
        if (categories.length > 0 && tabsRef.current) {
            const container = tabsRef.current;
            setTimeout(() => {
                container.scrollTo({ left: 100, behavior: 'smooth' });
                setTimeout(() => {
                    container.scrollTo({ left: 0, behavior: 'smooth' });
                }, 800);
            }, 500);
        }
    }, [categories.length]);

    const t = {
        en: {
            title: 'Identify',
            searchPlaceholder: 'Helmet, gloves…',
            noResults: 'Nothing like that here',
            priceLabel: 'Price:',
            guideLabel: 'Remember',
            aboutLabel: 'What this is',
            recentsLabel: 'Just now',
            videoGuides: 'Videos',
            practiceCta: 'Try',
            practiceBadgeAria: 'Familiarity',
            scoreAll: 'All time',
            scorePractice: 'Practice',
            scoreReal: 'Real score',
            scoreRealEmpty: 'Not set yet',
            relatedChartLabel: 'Chart',
            allCategory: 'All',
            retry: 'Try again',
            details: 'Details',
            noPhoto: 'No photo',
            zoomInAria: 'Bigger',
            zoomOutAria: 'Smaller',
            zoomToolbarAria: 'Make the picture bigger or smaller',
            relatedOpenAriaPrefix: 'Open',
            backPreviousAria: 'Go back',
            closeAria: 'Close',
            quitTitle: 'Leave practice?',
            quitStay: 'Stay',
            quitLeave: 'Leave',
            modeGateTitle: 'How well do you know?',
            modePractice: 'Practice',
            modePracticeHint: 'Local score only — no leaderboard',
            modeReal: 'Real score',
            modeRealHint: 'Endless · clue 8s · others 5s · 1 try / day',
            modeRealAdminHint: 'Admin preview — play anytime',
            modeRealPlayed: 'Already played today — come back tomorrow',
            modeRealLogin: 'Sign in to play real score',
            modeRealGuest: 'Guest accounts cannot save real score',
            modeCancel: 'Cancel',
            identifyScoreLabel: 'Identify score',
        },
        bn: {
            title: 'পরিচিতি',
            searchPlaceholder: 'হেলমেট, গ্লাভস…',
            noResults: 'এমন কিছু নেই',
            priceLabel: 'মূল্য:',
            guideLabel: 'খেয়াল রাখুন',
            aboutLabel: 'এটা কী',
            recentsLabel: 'এইমাত্র',
            videoGuides: 'ভিডিও',
            practiceCta: 'কতটা চেনেন?',
            practiceBadgeAria: 'চেনা',
            scoreAll: 'মোট',
            scorePractice: 'প্র্যাকটিস',
            scoreReal: 'আসল স্কোর',
            scoreRealEmpty: 'এখনো নেই',
            relatedChartLabel: 'চার্ট',
            allCategory: 'সব',
            retry: 'আবার',
            details: 'বিস্তারিত',
            noPhoto: 'ছবি নেই',
            zoomInAria: 'বড় করুন',
            zoomOutAria: 'ছোট করুন',
            zoomToolbarAria: 'ছবি বড় বা ছোট করুন',
            relatedOpenAriaPrefix: '',
            backPreviousAria: 'পিছনে',
            closeAria: 'বন্ধ',
            quitTitle: 'বন্ধ করবেন?',
            quitStay: 'থাকুন',
            quitLeave: 'বন্ধ করুন',
            modeGateTitle: 'কতটা চেনেন?',
            modePractice: 'প্র্যাকটিস',
            modePracticeHint: 'শুধু স্থানীয় স্কোর — লিডারবোর্ডে নয়',
            modeReal: 'আসল স্কোর',
            modeRealHint: 'অন্তহীন · বর্ণনা ৮ সেকেন্ড · অন্যান্য ৫ · দিনে ১ বার',
            modeRealAdminHint: 'অ্যাডমিন প্রিভিউ — যেকোনো সময় খেলুন',
            modeRealPlayed: 'আজকের সুযোগ শেষ — কাল আসুন',
            modeRealLogin: 'আসল স্কোরের জন্য লগইন করুন',
            modeRealGuest: 'গেস্ট অ্যাকাউন্টে আসল স্কোর জমা হয় না',
            modeCancel: 'বাতিল',
            identifyScoreLabel: 'পরিচিতি স্কোর',
        }
    }[language];

    const isAdmin = isIdentifyAdmin(userProfile);
    const savedIdentifyScore = identifyStatus?.score;

    const closeDetailModal = useCallback(() => {
        setModalBrowseStack([]);
        setSelectedItem(null);
    }, []);

    const openItemDetail = useCallback((item) => {
        setModalBrowseStack([]);
        setSelectedItem(item);
        if (item?.id) setRecentIds(pushIdentifyRecent(item.id));
    }, []);

    const goToRelatedChart = useCallback(
        (rel) => {
            const full = items.find((i) => i.id === rel.id);
            if (!full || !hasIdentifyChartPage(full.id)) return;
            setModalBrowseStack((prev) => (selectedItem ? [...prev, selectedItem] : prev));
            setSelectedItem(full);
            setRecentIds(pushIdentifyRecent(full.id));
        },
        [items, selectedItem]
    );

    const popModalBrowseBack = useCallback(() => {
        setModalBrowseStack((prev) => {
            if (prev.length === 0) return prev;
            const restore = prev[prev.length - 1];
            setSelectedItem(restore);
            return prev.slice(0, -1);
        });
    }, []);

    const fetchLibrary = async (force = false) => {
        try {
            setLoading(true);
            setError(null);
            const data = await libraryService.fetchLibrary(force);
            if (!data || data.length === 0) throw new Error("No data found");
            setItems(data);
            setFilteredItems(data);
            const uniqueCats = [...new Set(data.map((item) => item.category))].filter(Boolean);
            uniqueCats.sort((a, b) => {
                const ia = CATEGORY_ORDER.indexOf(a);
                const ib = CATEGORY_ORDER.indexOf(b);
                return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
            });
            const dynamicCategories = uniqueCats.map((cat) => ({ id: cat }));
            setCategories(dynamicCategories);
            if (dynamicCategories.length > 0 && !activeCategory) {
                setActiveCategory(dynamicCategories[0].id);
            }
        } catch (error) {
            setError({ message: error.message, technical: error.stack?.split('\n')[0] || 'Check Internet' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLibrary(); }, []);

    useEffect(() => {
        const filtered = items.filter((item) => {
            const matchesSearch = itemMatchesSearch(item, searchQuery, language);
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
        setFilteredItems(filtered);
    }, [searchQuery, activeCategory, items, language]);

    const recentItems = useMemo(() => {
        if (!recentIds.length || !items.length) return [];
        const byId = new Map(items.map((item) => [item.id, item]));
        return recentIds.map((id) => byId.get(id)).filter(Boolean);
    }, [recentIds, items]);

    const selectedChartPage = useMemo(
        () => (selectedItem ? getIdentifyChartPage(selectedItem.id) : null),
        [selectedItem]
    );

    /** Product modals only: related Charts that have an in-app detail page. */
    const chartRelatedForModal = useMemo(() => {
        if (!selectedItem?.related_items?.length || selectedChartPage) return [];
        return selectedItem.related_items.filter(
            (r) => r.category === 'Charts' && hasIdentifyChartPage(r.id)
        );
    }, [selectedItem, selectedChartPage]);

    const chipCategories = useMemo(
        () => [{ id: 'All' }, ...categories],
        [categories]
    );

    const categoryCounts = useMemo(() => {
        const counts = { All: items.length };
        for (const item of items) {
            if (!item.category) continue;
            counts[item.category] = (counts[item.category] || 0) + 1;
        }
        return counts;
    }, [items]);

    const showRecents = !loading && !searchQuery.trim() && recentItems.length > 0;

    const startPracticeMode = useCallback(async (mode) => {
        setModeGateMessage('');
        if (mode === 'real') {
            let status = identifyStatus;
            if (user?.id) {
                status = await fetchIdentifyScoreStatus({ userId: user.id });
                setIdentifyStatus(status);
            }
            const gate = canStartIdentifyReal({ user, userProfile, status });
            if (!gate.ok) {
                const msg = gate.reason === 'login'
                    ? t.modeRealLogin
                    : gate.reason === 'guest'
                        ? t.modeRealGuest
                        : t.modeRealPlayed;
                setModeGateMessage(msg);
                return;
            }
        }
        setPracticeScoringMode(mode);
        setPracticeFromRules(false);
        setModeGateOpen(false);
        setPracticeOpen(true);
    }, [identifyStatus, user, userProfile, t.modeRealLogin, t.modeRealGuest, t.modeRealPlayed]);

    const searchAndCategories = (
        <div className={`shrink-0 bg-[#fffdf7] ${embedded ? 'border-b border-slate-200/80' : ''}`}>
            <div className={`max-w-7xl mx-auto space-y-3 ${embedded ? 'px-4 sm:px-8 py-3' : 'py-4 px-4 sm:px-8'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <h1
                            className={`min-w-0 truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl ${
                                language === 'bn' ? 'font-bengali' : ''
                            }`}
                        >
                            {t.title}
                        </h1>
                        {(practiceScore || user?.id) ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setScoreSheetOpen(true);
                                    if (user?.id) {
                                        void fetchIdentifyScoreStatus({ force: true, userId: user.id }).then((status) => {
                                            setIdentifyStatus(status);
                                        });
                                    }
                                }}
                                className={`identify-familiarity-badge shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-black tabular-nums text-white shadow-sm sm:text-xs ${
                                    language === 'bn' ? 'font-bengali' : ''
                                }`}
                                title={t.scoreAll}
                                aria-label={t.scoreAll}
                            >
                                {practiceScore ? `${practiceScore.lifePercent}%` : (savedIdentifyScore != null ? savedIdentifyScore : '—')}
                            </button>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        {practiceOpen ? (
                            <button
                                type="button"
                                onClick={() => setQuitConfirmOpen(true)}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                                aria-label={t.closeAria}
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        ) : (
                            <div className="relative flex shrink-0 items-center gap-2">
                                {!loading ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void startPracticeMode('practice');
                                        }}
                                        className={`rounded-full border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-800 shadow-sm transition-all hover:bg-slate-50 active:scale-95 sm:px-3 sm:text-xs ${
                                            language === 'bn' ? 'font-bengali' : ''
                                        }`}
                                        aria-label={t.practiceCta}
                                    >
                                        {t.practiceCta}
                                    </button>
                                ) : null}
                                {typeof setCurrentView === 'function' && videoNudge ? (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('video-guide')}
                                        className={`identify-video-nudge absolute right-0 top-[calc(100%+0.4rem)] z-20 whitespace-nowrap rounded-full bg-orange-500 px-3 py-1.5 text-xs font-black text-white shadow-sm sm:text-sm ${
                                            videoNudge === 'out' ? 'identify-video-nudge--out' : ''
                                        } ${language === 'bn' ? 'font-bengali' : ''}`}
                                    >
                                        {t.videoGuides}
                                    </button>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>

                {practiceOpen ? null : loading ? (
                    <div className="relative h-11 w-full overflow-hidden rounded-full border border-slate-200/80 bg-white shadow-sm">
                        <SkeletonShimmer />
                    </div>
                ) : (
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="search"
                            placeholder={t.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`nb-input w-full !min-h-[44px] py-2.5 pl-9 pr-3 text-sm !rounded-full !border-slate-200 !shadow-sm ${language === 'bn' ? 'font-bengali' : ''}`}
                        />
                    </div>
                )}

                {practiceOpen ? null : (
                <div ref={tabsRef} className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5 scroll-smooth">
                    {loading ? (
                        <>
                            {[56, 72, 64, 80, 68, 52, 60].map((w, i) => (
                                <div
                                    key={i}
                                    className="relative h-9 shrink-0 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100 shadow-sm"
                                    style={{ width: `${w}px` }}
                                >
                                    <SkeletonShimmer />
                                </div>
                            ))}
                        </>
                    ) : (
                        chipCategories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveCategory(cat.id)}
                                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-center text-[11px] font-bold shadow-sm transition-all active:scale-95 sm:text-xs ${
                                    language === 'bn' ? 'font-bengali' : ''
                                } ${
                                    activeCategory === cat.id
                                        ? 'bg-orange-500 text-white shadow-orange-500/25'
                                        : 'border border-slate-200/80 bg-white text-slate-700 hover:bg-orange-50'
                                }`}
                            >
                                <span>{categoryLabel(cat.id, language)}</span>
                                <span
                                    className={`tabular-nums ${
                                        activeCategory === cat.id
                                            ? 'text-white/85'
                                            : 'text-slate-400'
                                    }`}
                                >
                                    {categoryCounts[cat.id] ?? 0}
                                </span>
                            </button>
                        ))
                    )}
                </div>
                )}
            </div>
        </div>
    );

    const libraryContent = (
        <div
            className={
                practiceOpen
                    ? 'mx-auto flex h-full min-h-0 w-full max-w-7xl min-w-0 flex-col overflow-hidden p-2 sm:p-4'
                    : `mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-2.5 pb-3 pt-2 sm:p-8 ${embedded ? 'pb-24' : ''}`
            }
        >

                {practiceOpen ? (
                    <div className="flex h-full min-h-0 w-full flex-col">
                        <IdentifyPractice
                            key={practiceScoringMode}
                            language={language}
                            items={items}
                            score={practiceScore}
                            scoringMode={practiceScoringMode}
                            canReplayReal={isAdmin}
                            userId={user?.id || null}
                            onRequestPracticeMode={() => {
                                setPracticeFromRules(true);
                                setPracticeScoringMode('practice');
                            }}
                            onScoreSaved={setPracticeScore}
                            onIdentifySubmitResult={(result) => {
                                if (result?.ok) {
                                    setIdentifyStatus((prev) => ({
                                        ...(prev || {}),
                                        ok: true,
                                        score: result.score,
                                        asked: result.asked,
                                        mistakes: result.mistakes,
                                        played_on: result.played_on,
                                        played_today: true,
                                        can_play: Boolean(result.preview || isAdmin),
                                        is_admin: Boolean(result.preview || isAdmin),
                                        points_awarded: result.points_awarded ?? 0,
                                    }));
                                    if (
                                        typeof refreshProfile === 'function'
                                        && user
                                        && !result.preview
                                        && Number(result.points_awarded) > 0
                                    ) {
                                        invalidateLeaderboardCaches(user.id);
                                        void refreshProfile(user, true);
                                    }
                                }
                            }}
                        />
                    </div>
                ) : null}

                {practiceOpen || !loading ? null : (
                    <SafetyLibraryLoadingView language={language} />
                )}

                {!practiceOpen && showRecents ? (
                    <div className="mb-3 rounded-xl border border-slate-200/70 bg-slate-50/90 px-2 py-2 sm:mb-4 sm:px-2.5 sm:py-2.5">
                        <p className={`mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px] ${language === 'bn' ? 'font-bengali normal-case tracking-normal' : ''}`}>
                            {t.recentsLabel}
                        </p>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                            {recentItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => openItemDetail(item)}
                                    className="w-14 shrink-0 text-left sm:w-[3.75rem]"
                                >
                                    <div className="aspect-square overflow-hidden rounded-lg border border-white bg-white shadow-sm ring-1 ring-slate-200/60">
                                        {hasIdentifyChartPage(item.id) ? (
                                            <IdentifyChartThumb
                                                chartId={item.id}
                                                name={item.name_bn}
                                                language={language}
                                                kind={getIdentifyChartPage(item.id)?.kind}
                                                compact
                                            />
                                        ) : (
                                            <GridImage images={item.images} alt={item.name_bn} language={language} />
                                        )}
                                    </div>
                                    <span className={`mt-1 line-clamp-1 text-center text-[9px] font-semibold leading-tight text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {hasIdentifyChartPage(item.id) ? getChartTopic(item.id).shortBn : item.name_bn}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {!practiceOpen && !loading && filteredItems.length > 0 ? (
                    <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4">
                        {filteredItems.map((item) => {
                            const isChart = hasIdentifyChartPage(item.id);
                            return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => openItemDetail(item)}
                                className="group flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-sm transition-all hover:border-orange-200 hover:shadow-md active:scale-[0.98]"
                            >
                                <div className="relative aspect-square w-full min-w-0 shrink-0 overflow-hidden bg-slate-50">
                                    {isChart ? (
                                        <IdentifyChartThumb
                                            chartId={item.id}
                                            name={item.name_bn}
                                            language={language}
                                            kind={getIdentifyChartPage(item.id)?.kind}
                                            compact
                                        />
                                    ) : (
                                        <GridImage images={item.images} alt={item.name_bn} language={language} />
                                    )}
                                </div>
                                {isChart ? null : (
                                <div className="flex min-h-[2.75rem] w-full min-w-0 items-center justify-center px-1.5 py-1.5 sm:min-h-[3rem] sm:px-2">
                                    <h3 className={`line-clamp-2 w-full min-w-0 break-words text-center text-[11px] font-bold leading-tight text-slate-900 transition-colors group-hover:text-orange-600 sm:text-xs ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {item.name_bn}
                                    </h3>
                                </div>
                                )}
                            </button>
                            );
                        })}
                    </div>
                ) : !practiceOpen && !loading ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
                            <LineChartIcon className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                            <p className={`text-sm font-black text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>{t.noResults}</p>
                        </div>
                    </div>
                ) : null}

                {/* Detail modal — compact sheet chrome */}
                {selectedItem && (
                    <div className="fixed inset-0 z-[11000] flex items-end justify-center p-0 animate-fade-in sm:items-start sm:px-4 sm:pb-4 sm:pt-20 lg:px-6 lg:pb-6 lg:pt-24">
                        <div className="absolute inset-0 bg-slate-900/55" onClick={closeDetailModal} aria-hidden="true" />

                        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-[#fffdf7] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-2xl animate-slide-up sm:h-[min(calc(100dvh-6rem),820px)] sm:max-h-[calc(100dvh-6rem)] sm:w-[min(96vw,980px)] sm:max-w-none sm:rounded-2xl sm:pb-0 sm:pt-0 sm:animate-scale-in lg:h-[min(calc(100dvh-7rem),820px)] lg:max-h-[calc(100dvh-7rem)]">
                            <div className="mx-auto mb-0.5 mt-1.5 h-1 w-10 shrink-0 cursor-pointer rounded-full bg-slate-300 sm:hidden" onClick={closeDetailModal} aria-hidden="true" />

                            <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-1.5 border-b border-slate-200/80 bg-white/95 px-2.5 py-1.5 backdrop-blur-md sm:px-4 sm:py-2">
                                <div className="flex min-w-0 items-center gap-1.5">
                                    {modalBrowseStack.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={popModalBrowseBack}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-900 transition-all hover:bg-slate-50 active:scale-95"
                                            aria-label={t.backPreviousAria}
                                        >
                                            <ChevronLeftIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                    <span className={`shrink-0 rounded-full border border-orange-200/70 bg-orange-50 px-1.5 py-0.5 text-[8px] font-bold text-orange-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {categoryLabel(selectedItem.category, language)}
                                    </span>
                                    <h2
                                        className={`min-w-0 flex-1 truncate text-left text-[13px] font-bold leading-snug tracking-tight text-slate-900 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}
                                        title={selectedItem.name_bn}
                                    >
                                        {selectedItem.name_bn}
                                    </h2>
                                </div>
                                {selectedChartPage ? (
                                    <span className="justify-self-center" aria-hidden />
                                ) : (
                                    <div
                                        role="toolbar"
                                        aria-label={t.zoomToolbarAria}
                                        data-zoom-ui
                                        className="flex items-center gap-0.5 justify-self-center rounded-full border border-slate-200/80 bg-slate-100/90 p-0.5"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => detailSliderRef.current?.zoomOut()}
                                            disabled={detailZoomLevel <= ZOOM_MIN + 0.01}
                                            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                                            aria-label={t.zoomOutAria}
                                        >
                                            <MagnifierMinusIcon className="h-[15px] w-[15px]" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => detailSliderRef.current?.zoomIn()}
                                            disabled={detailZoomLevel >= ZOOM_MAX - 0.01}
                                            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                                            aria-label={t.zoomInAria}
                                        >
                                            <MagnifierPlusIcon className="h-[15px] w-[15px]" />
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={closeDetailModal}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center justify-self-end rounded-full border border-slate-200/80 bg-white text-slate-900 transition-all hover:bg-slate-50 active:scale-95"
                                    aria-label={t.closeAria}
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {chartRelatedForModal.length > 0 && (
                                <div className="flex shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-b border-slate-200/80 bg-amber-50/80 px-2.5 py-1 no-scrollbar [-webkit-overflow-scrolling:touch] sm:px-4">
                                    <span className={`shrink-0 text-[9px] font-bold text-amber-800/80 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {t.relatedChartLabel}
                                    </span>
                                    {chartRelatedForModal.map((chart) => (
                                        <button
                                            key={chart.id}
                                            type="button"
                                            onClick={() => goToRelatedChart(chart)}
                                            className={`inline-flex h-7 max-w-[min(100%,12rem)] shrink-0 items-center gap-1 rounded-full border border-amber-200/80 bg-white py-0 pl-1 pr-2 text-left text-[10px] font-bold leading-tight text-slate-800 transition-all hover:bg-orange-50 active:scale-95 sm:max-w-[14rem] ${language === 'bn' ? 'font-bengali' : ''}`}
                                            aria-label={[t.relatedOpenAriaPrefix, chart.name_bn].filter(Boolean).join(' ')}
                                        >
                                            <LineChartIcon className="h-3 w-3 shrink-0 text-amber-700" aria-hidden />
                                            <span className="min-w-0 truncate">{chart.name_bn}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar sm:overflow-hidden">
                                {selectedChartPage ? (
                                    <div className="sm:h-full sm:overflow-y-auto sm:bg-[#fffdf7] sm:no-scrollbar">
                                        <IdentifyChartPage
                                            page={selectedChartPage}
                                            language={language}
                                            title={selectedItem.name_bn}
                                            chartId={selectedItem.id}
                                        />
                                    </div>
                                ) : (
                                <div className="flex min-h-0 flex-col sm:h-full sm:flex-row sm:items-start">
                                <div className="flex shrink-0 justify-center bg-white px-3 py-2.5 sm:w-[min(42%,280px)] sm:shrink-0 sm:border-r sm:border-slate-200/80 sm:px-4 sm:py-4">
                                    <div className="group/modal-img relative aspect-square w-[min(52vw,220px)] sm:w-full sm:max-w-[240px]">
                                    <ImageSlider
                                        key={selectedItem.id}
                                        ref={detailSliderRef}
                                        images={selectedItem.images}
                                        alt={selectedItem.name_bn}
                                        aspect="h-full w-full"
                                        showControls={true}
                                        enableZoom
                                        zoomChrome="none"
                                        onZoomChange={setDetailZoomLevel}
                                        fillFrame
                                        autoAdvance={false}
                                        emptyLabel={t.noPhoto}
                                    />
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1 space-y-3 p-3 pb-8 sm:h-full sm:overflow-y-auto sm:bg-[#fffdf7] sm:p-4 sm:pb-8 sm:no-scrollbar">
                                    {selectedItem.approx_price_inr && selectedItem.approx_price_inr !== '---' && (
                                        <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-emerald-800">
                                            <span className="text-[9px]">₹</span>
                                            <span className="text-[11px] font-bold tabular-nums">{selectedItem.approx_price_inr}</span>
                                        </div>
                                    )}

                                    {selectedItem.function_bn && (
                                        <div className="space-y-1 border-b border-slate-200/70 pb-3">
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <InfoIcon className="h-3 w-3" />
                                                <span className={`text-[10px] font-bold ${language === 'bn' ? 'font-bengali' : ''}`}>{t.aboutLabel}</span>
                                            </div>
                                            <p className={`text-[13px] font-medium leading-snug text-slate-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {selectedItem.function_bn}
                                            </p>
                                        </div>
                                    )}

                                    {selectedItem.guide_bn && (
                                        <div className="space-y-1 rounded-lg bg-amber-50/80 px-2.5 py-2">
                                            <div className={`flex items-center gap-1.5 text-[10px] font-bold text-orange-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                {t.guideLabel}
                                            </div>
                                            <p className={`text-xs font-medium leading-snug text-slate-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {selectedItem.guide_bn}
                                            </p>
                                        </div>
                                    )}


                                </div>
                                </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );

    const quitSheet = quitConfirmOpen && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[12100] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/45" onClick={() => setQuitConfirmOpen(false)} aria-hidden="true" />
            <div className="relative w-full max-w-sm rounded-3xl border border-slate-200/80 bg-[#fffdf7] px-5 py-5 shadow-2xl">
                <h2 className={`text-center text-base font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {t.quitTitle}
                </h2>
                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setQuitConfirmOpen(false)}
                        className={`min-h-[48px] flex-1 rounded-full border border-slate-200/80 bg-white text-sm font-black text-slate-700 shadow-sm active:scale-[0.98] ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {t.quitStay}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setQuitConfirmOpen(false);
                            if (practiceFromRules && practiceScoringMode === 'practice') {
                                setPracticeFromRules(false);
                                setPracticeScoringMode('real');
                                return;
                            }
                            setPracticeFromRules(false);
                            setPracticeOpen(false);
                            setPracticeScoringMode('practice');
                        }}
                        className={`min-h-[48px] flex-1 rounded-full bg-orange-500 text-sm font-black text-white shadow-sm active:scale-[0.98] ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {t.quitLeave}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    const modeGateSheet = modeGateOpen && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[12100] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/45" onClick={() => { setModeGateOpen(false); setModeGateMessage(''); }} aria-hidden="true" />
            <div className="relative w-full max-w-sm rounded-3xl border border-slate-200/80 bg-[#fffdf7] px-5 py-5 shadow-2xl">
                <h2 className={`text-center text-base font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {t.modeGateTitle}
                </h2>
                {savedIdentifyScore != null ? (
                    <p className={`mt-2 text-center text-xs font-bold tabular-nums text-orange-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {t.identifyScoreLabel}: {savedIdentifyScore}
                    </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-2.5">
                    <button
                        type="button"
                        onClick={() => startPracticeMode('practice')}
                        className={`rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left shadow-sm active:scale-[0.99] ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        <span className="block text-sm font-black text-slate-900">{t.modePractice}</span>
                        <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-slate-500">{t.modePracticeHint}</span>
                    </button>
                    {isAdmin ? (
                        <button
                            type="button"
                            onClick={() => startPracticeMode('real')}
                            className={`rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-left shadow-sm active:scale-[0.99] ${language === 'bn' ? 'font-bengali' : ''}`}
                        >
                            <span className="block text-sm font-black text-orange-700">{t.modeReal}</span>
                            <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-orange-700/70">
                                {t.modeRealAdminHint}
                            </span>
                        </button>
                    ) : null}
                    {modeGateMessage ? (
                        <p className={`text-center text-[11px] font-bold text-rose-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {modeGateMessage}
                        </p>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => { setModeGateOpen(false); setModeGateMessage(''); }}
                        className={`mt-1 min-h-[44px] rounded-full border border-slate-200/80 bg-white text-sm font-bold text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {t.modeCancel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    const scoreSheet = scoreSheetOpen && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/45" onClick={() => setScoreSheetOpen(false)} aria-hidden="true" />
            <div className="relative w-full max-w-xs rounded-3xl border border-slate-200/80 bg-[#fffdf7] px-5 pb-6 pt-5 shadow-2xl">
                <button
                    type="button"
                    onClick={() => setScoreSheetOpen(false)}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-slate-400"
                    aria-label={t.closeAria}
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <p className={`text-center text-xs font-black uppercase tracking-wide text-slate-500 ${language === 'bn' ? 'font-bengali normal-case tracking-normal' : ''}`}>
                    {t.scoreAll}
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-4">
                    <p className={`text-center text-[11px] font-black text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {t.scorePractice}
                    </p>
                    {practiceScore ? (
                        <>
                            <p className="mt-1.5 text-center text-4xl font-black tabular-nums leading-none text-orange-600">
                                {practiceScore.lifePercent}%
                            </p>
                            <p className="mt-2 text-center text-base font-black tabular-nums text-slate-900">
                                {practiceScore.lifeCorrect}/{practiceScore.lifeTotal}
                            </p>
                        </>
                    ) : (
                        <p className={`mt-2 text-center text-sm font-semibold text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {t.scoreRealEmpty}
                        </p>
                    )}
                </div>

                <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-4">
                    <p className={`text-center text-[11px] font-black text-orange-700/80 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {t.scoreReal}
                    </p>
                    {savedIdentifyScore != null ? (
                        <p className="mt-1.5 text-center text-4xl font-black tabular-nums leading-none text-orange-700">
                            {savedIdentifyScore}
                        </p>
                    ) : (
                        <p className={`mt-2 text-center text-sm font-semibold text-orange-700/50 ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {t.scoreRealEmpty}
                        </p>
                    )}
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    if (embedded) {
        return (
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                {searchAndCategories}
                <div
                    className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden ${
                        practiceOpen ? 'overflow-hidden' : 'overflow-y-auto'
                    }`}
                >
                    {libraryContent}
                </div>
                {scoreSheet}
                {quitSheet}
                {modeGateSheet}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fffdf7] pb-20 text-slate-900">
            <div className="sticky top-0 z-[100] border-b border-slate-200/80 bg-[#fffdf7]/90 backdrop-blur-md">
                {searchAndCategories}
            </div>
            {libraryContent}
            {scoreSheet}
            {quitSheet}
            {modeGateSheet}
        </div>
    );
}
