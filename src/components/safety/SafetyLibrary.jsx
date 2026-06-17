import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { libraryService } from '../../utils/libraryService';
import { storageUtils } from '../../utils/storageUtils';
import SafetyTopTabs from './SafetyTopTabs';

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

const WrenchIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
);

const TreeIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 19 7-7 3 3-7 7-3-3z"></path>
        <path d="m18 13-1.5-7.5L12 2l-4.5 3.5L6 13"></path>
        <path d="M12 19V5"></path>
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

const getGoogleDriveDirectLink = (url) => {
    if (!url) return '';
    if (!url.includes('drive.google.com')) return url;
    const match = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/);
    const id = match ? (match[1] || match[2]) : '';
    const today = new Date().toISOString().split('T')[0];
    return id ? `https://lh3.googleusercontent.com/u/0/d/${id}?v=${today}` : url;
};

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
        naturalImageHeight = false
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
        if (!validImages || validImages.length <= 1 || !showControls) return;
        const interval = setInterval(() => {
            if (enableZoom && (zoomRef.current > 1.001 || pinchRef.current.active)) return;
            advanceSlide(1);
        }, 3000);
        return () => clearInterval(interval);
    }, [validImages, showControls, enableZoom, advanceSlide]);

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
            <div className={`${aspect} bg-slate-100 flex flex-col items-center justify-center p-4 text-slate-400 text-center border-b-2 border-slate-900`}>
                <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>
            </div>
        );
    }

    const canZoomIn = zoom < ZOOM_MAX - 0.01;
    const canZoomOut = zoom > ZOOM_MIN + 0.01;

    const boxAspect = naturalImageHeight ? 'w-full min-h-0' : aspect;
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
                naturalImageHeight ? 'items-start overflow-x-hidden overflow-y-visible' : 'items-center overflow-hidden'
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
                    naturalImageHeight
                        ? 'flex w-full items-start justify-center p-1'
                        : 'flex min-h-full min-w-full items-center justify-center p-1'
                }
                style={{
                    transform: enableZoom ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : `scale(${zoom})`,
                    transformOrigin: naturalImageHeight ? 'top center' : 'center center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
            >
                <img
                    ref={activeImageRef}
                    key={currentIndex}
                    src={getGoogleDriveDirectLink(validImages[currentIndex])}
                    alt={`${alt} ${currentIndex + 1}`}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onError={() => handleImageError(validImages[currentIndex])}
                    className={`object-contain filter drop-shadow-md transition-opacity duration-300 ${
                        naturalImageHeight
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
            ? { line: 'তথ্য লোড হচ্ছে…', sub: 'স্প্রেডশিট থেকে লাইব্রেরি আসছে' }
            : { line: 'Loading library…', sub: 'Fetching items from the sheet' };

    return (
        <div className="max-w-7xl mx-auto p-3 sm:p-8" aria-busy="true" aria-live="polite">
            <div className="mb-6 flex flex-col items-center gap-3 py-2 sm:py-4">
                <div className="nb-icon-badge relative flex h-[4.5rem] w-[4.5rem] items-center justify-center bg-orange-100">
                    <ShieldCheckIcon className="relative h-8 w-8 text-orange-600 animate-safety-float" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-sm font-black tracking-tight text-slate-800 nb-mono uppercase">{copy.line}</p>
                    <p className="text-[11px] font-semibold text-slate-500">{copy.sub}</p>
                </div>
            </div>

            <div className="mb-4 sm:mb-6 h-[4.5rem] sm:h-[4.75rem] overflow-hidden nb-card bg-white relative">
                <SkeletonShimmer />
                <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-3">
                    <div className="h-10 w-10 shrink-0 border-2 border-slate-900 bg-slate-200 shadow-[2px_2px_0_#0f172a]" />
                    <div className="space-y-2">
                        <div className="h-3.5 w-36 bg-slate-200 border border-slate-900 sm:w-48" />
                        <div className="h-2.5 w-24 bg-slate-100 border border-slate-300" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {Array.from({ length: 8 }, (_, i) => (
                    <div
                        key={i}
                        className="overflow-hidden nb-card bg-white p-0"
                        style={{ animationDelay: `${i * 70}ms` }}
                    >
                        <div className="relative aspect-square overflow-hidden bg-slate-100">
                            <SkeletonShimmer className="opacity-90" />
                            <div className="absolute left-2 top-2 h-4 w-14 bg-slate-300 border border-slate-900" />
                        </div>
                        <div className="space-y-2 p-2.5 sm:p-4">
                            <div className="mx-auto h-3 w-[88%] bg-slate-200 border border-slate-300" />
                            <div className="mx-auto h-3 w-[62%] bg-slate-100 border border-slate-200" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GridImage = ({ images, alt, aspect = 'aspect-square' }) => {
    const [randomImage] = useState(() => {
        if (!images || images.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * images.length);
        return images[randomIndex];
    });

    if (!randomImage) {
        return (
            <div className={`${aspect} bg-slate-100 flex flex-col items-center justify-center p-4 text-slate-400`}>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>
            </div>
        );
    }

    return (
        <div className={`${aspect} bg-white relative overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}>
            <img
                src={getGoogleDriveDirectLink(randomImage)}
                alt={alt}
                className="max-h-full w-full object-contain filter drop-shadow-sm p-2"
            />
        </div>
    );
};

export default function SafetyLibrary({ language, setCurrentView }) {
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('PPE');
    const [selectedItem, setSelectedItem] = useState(null);
    const [categories, setCategories] = useState([]);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const tabsRef = useRef(null);
    const detailSliderRef = useRef(null);
    const [detailZoomLevel, setDetailZoomLevel] = useState(1);
    /** Modal only: breadcrumb stack when jumping via Related items chips. */
    const [modalBrowseStack, setModalBrowseStack] = useState([]);

    useEffect(() => {
        setDetailZoomLevel(1);
    }, [selectedItem?.id]);

    useEffect(() => {
        if (!selectedItem) setModalBrowseStack([]);
    }, [selectedItem]);

    useEffect(() => {
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
    }, []);

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

    const getCategoryMetadata = (catId) => {
        const metadata = {
            'PPE': { icon: <ShieldCheckIcon className="w-4 h-4" /> },
            'Tools': { icon: <WrenchIcon className="w-4 h-4" /> },
            'Insulators': { icon: <TreeIcon className="w-4 h-4" /> },
            'Charts': { icon: <LineChartIcon className="w-4 h-4" /> },
            'Others': { icon: <InfoIcon className="w-4 h-4" /> }
        };
        return metadata[catId] || { icon: <InfoIcon className="w-4 h-4" /> };
    };

    const t = {
        en: {
            title: 'Safety Library',
            searchPlaceholder: 'Search...',
            noResults: 'No items found',
            priceLabel: 'Price:',
            guideLabel: 'Usage Guide',
            aboutLabel: 'About',
            retry: 'Retry',
            details: 'Details',
            zoomInAria: 'Zoom in',
            zoomOutAria: 'Zoom out',
            zoomToolbarAria: 'Image zoom controls',
            relatedOpenAriaPrefix: 'Open related item:',
            backPreviousAria: 'Previous item',
            myPpeTitle: 'My PPE',
            myPpeSubtitle: 'Tap gear on your lineman to update'
        },
        bn: {
            title: 'সুরক্ষা লাইব্রেরি',
            searchPlaceholder: 'খুঁজুন...',
            noResults: 'কিছু পাওয়া যায়নি',
            priceLabel: 'মূল্য:',
            guideLabel: 'দরকারি টিপ',
            aboutLabel: 'সম্পর্কে',
            retry: 'আবার চেষ্টা করুন',
            details: 'বিস্তারিত',
            zoomInAria: 'বড় করুন',
            zoomOutAria: 'ছোট করুন',
            zoomToolbarAria: 'ছবির জুম নিয়ন্ত্রণ',
            relatedOpenAriaPrefix: 'খুলুন:',
            backPreviousAria: 'আগের আইটেমে ফিরুন',
            myPpeTitle: 'আমার পিপিই',
            myPpeSubtitle: 'লাইনম্যানে সরঞ্জামে ট্যাপ করে আপডেট করুন'
        }
    }[language];

    const closeDetailModal = useCallback(() => {
        setModalBrowseStack([]);
        setSelectedItem(null);
    }, []);

    const openItemDetail = useCallback((item) => {
        setModalBrowseStack([]);
        setSelectedItem(item);
    }, []);

    const goToRelatedLibraryItem = useCallback(
        (rel) => {
            const full = items.find((i) => i.id === rel.id);
            if (!full) return;
            setModalBrowseStack((prev) => (selectedItem ? [...prev, selectedItem] : prev));
            setSelectedItem(full);
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
            const uniqueCats = [...new Set(data.map(item => item.category))].filter(Boolean);
            const dynamicCategories = uniqueCats.map(cat => ({
                id: cat,
                label: cat,
                ...getCategoryMetadata(cat)
            }));
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
        const filtered = items.filter(item => {
            const matchesSearch = (item.name_bn || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
        setFilteredItems(filtered);
    }, [searchQuery, activeCategory, items]);

    const chartRelatedForModal = useMemo(() => {
        if (!selectedItem?.related_items?.length) return [];
        return selectedItem.related_items.filter((r) => r.category === 'Charts');
    }, [selectedItem]);

    return (
        <div className="neo-brutal min-h-screen pb-20 text-slate-900">
            <div className="nb-hazard sticky top-0 z-[101]" aria-hidden="true" />

            {/* Sticky Header */}
            <div className="sticky top-[6px] z-[100] bg-[#fffdf7] py-4 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        {!isSearchExpanded ? (
                            <>
                                <div className="flex items-center gap-3 flex-1 min-w-0 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <SafetyTopTabs
                                        current="safety-library"
                                        onNavigate={setCurrentView}
                                        language={language}
                                        className="flex-1 min-w-0 max-w-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => !loading && setIsSearchExpanded(true)}
                                        className="sm:hidden w-9 h-9 flex items-center justify-center border-2 border-slate-900 bg-white text-slate-900 shadow-[3px_3px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
                                    >
                                        <SearchIcon className="w-5 h-5" />
                                    </button>

                                    {loading ? (
                                        <div className="hidden sm:block h-10 max-w-md w-full min-w-[200px] overflow-hidden nb-card bg-white relative">
                                            <SkeletonShimmer />
                                        </div>
                                    ) : (
                                        <div className="hidden sm:block relative max-w-md w-full">
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                                            <input
                                                type="text"
                                                placeholder={t.searchPlaceholder}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="nb-input !min-h-[40px] py-2 pl-9 pr-3 text-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                                <div className="relative flex-1">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder={t.searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="nb-input py-2.5 pl-9 pr-3 text-sm"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}
                                    className="px-3 py-2 text-sm font-black text-orange-600 nb-mono uppercase active:scale-95"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    <div ref={tabsRef} className="flex gap-2 overflow-x-auto no-scrollbar pb-1 scroll-smooth">
                        {loading ? (
                            <>
                                {[56, 72, 64, 80, 68, 52, 60].map((w, i) => (
                                    <div
                                        key={i}
                                        className="relative h-9 shrink-0 overflow-hidden border-2 border-slate-900 bg-slate-100 shadow-[2px_2px_0_#0f172a]"
                                        style={{ width: `${w}px` }}
                                    >
                                        <SkeletonShimmer />
                                    </div>
                                ))}
                            </>
                        ) : (
                            categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-4 py-2 text-[10px] sm:text-xs font-black transition-all whitespace-nowrap border-2 border-slate-900 text-center shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#0f172a]
                                        ${activeCategory === cat.id
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-white text-slate-700 hover:bg-orange-50'}`}
                                >
                                    {cat.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-3 sm:p-8">

                {loading ? (
                    <SafetyLibraryLoadingView language={language} />
                ) : (
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setCurrentView('video-guide')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setCurrentView('video-guide');
                            }
                        }}
                        className="mb-4 sm:mb-6 nb-btn-primary p-4 flex items-center justify-between cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 border-2 border-slate-900 bg-white text-orange-600 flex items-center justify-center shrink-0 shadow-[2px_2px_0_#0f172a]">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </div>
                            <div>
                                <h3 className="font-black text-sm sm:text-base leading-tight">
                                    {language === 'en' ? 'Watch Video Guides' : 'ভিডিও গাইড দেখুন'}
                                </h3>
                            </div>
                        </div>
                        <div className="w-8 h-8 border-2 border-slate-900 bg-white/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                        </div>
                    </div>
                )}

                {!loading && filteredItems.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => openItemDetail(item)}
                                className="group nb-card overflow-hidden p-0 flex flex-col cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                            >
                                <div className="relative aspect-square">
                                    <GridImage images={item.images} alt={item.name_bn} aspect="h-full" />
                                    <div className="absolute top-2 left-2">
                                        <span className="nb-tag px-1.5 py-0.5 bg-orange-100 text-orange-800 text-[8px]">
                                            {item.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2.5 sm:p-4 flex-grow flex flex-col justify-center bg-white">
                                    <h3 className="text-[11px] sm:text-sm font-black text-slate-900 leading-tight line-clamp-2 text-center group-hover:text-orange-600 transition-colors">
                                        {item.name_bn}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : !loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px]">
                        <div className="nb-card p-8 text-center bg-white">
                            <LineChartIcon className="w-12 h-12 mb-3 mx-auto text-slate-300" />
                            <p className="text-sm font-black text-slate-600">{t.noResults}</p>
                        </div>
                    </div>
                ) : null}

                {/* Premium Detail Modal - Optimized for High-End UX */}
                {selectedItem && (
                    <div className="fixed inset-0 z-[11000] flex items-end sm:items-start justify-center p-0 sm:px-4 sm:pt-20 sm:pb-4 lg:px-6 lg:pt-24 lg:pb-6 animate-fade-in">
                        <div className="absolute inset-0 bg-slate-900/55" onClick={closeDetailModal} aria-hidden="true" />

                        <div className="neo-brutal relative flex h-[100dvh] w-full flex-col overflow-hidden border-[2.5px] border-slate-900 bg-[#fffdf7] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[4px_4px_0_#0f172a] sm:h-[min(calc(100dvh-6rem),940px)] sm:max-h-[calc(100dvh-6rem)] sm:w-[min(96vw,1220px)] sm:max-w-none sm:rounded-lg sm:pb-0 sm:pt-0 lg:h-[min(calc(100dvh-7rem),940px)] lg:max-h-[calc(100dvh-7rem)] animate-slide-up sm:animate-scale-in">
                            <div className="nb-hazard shrink-0" aria-hidden="true" />
                            <div className="mx-auto mt-2 mb-1 h-1.5 w-12 shrink-0 cursor-pointer bg-slate-900 sm:hidden" onClick={closeDetailModal} aria-hidden="true" />

                            <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 border-b-2 border-slate-900 bg-white px-3 py-2 sm:px-6 sm:py-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    {modalBrowseStack.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={popModalBrowseBack}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5"
                                            aria-label={t.backPreviousAria}
                                        >
                                            <ChevronLeftIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                    <span className="nb-tag shrink-0 px-2 py-1 bg-orange-100 text-orange-800 text-[8px]">
                                        {selectedItem.category}
                                    </span>
                                    <h2
                                        className="min-w-0 flex-1 truncate text-left text-[13px] font-black leading-snug tracking-tight text-slate-900 sm:text-sm"
                                        title={selectedItem.name_bn}
                                    >
                                        {selectedItem.name_bn}
                                    </h2>
                                </div>
                                <div
                                    role="toolbar"
                                    aria-label={t.zoomToolbarAria}
                                    data-zoom-ui
                                    className="flex items-center gap-0.5 justify-self-center border-2 border-slate-900 bg-white p-0.5 shadow-[2px_2px_0_#0f172a]"
                                >
                                    <button
                                        type="button"
                                        onClick={() => detailSliderRef.current?.zoomOut()}
                                        disabled={detailZoomLevel <= ZOOM_MIN + 0.01}
                                        className="flex h-7 w-7 items-center justify-center text-slate-700 hover:bg-orange-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                                        aria-label={t.zoomOutAria}
                                    >
                                        <MagnifierMinusIcon className="h-[15px] w-[15px]" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => detailSliderRef.current?.zoomIn()}
                                        disabled={detailZoomLevel >= ZOOM_MAX - 0.01}
                                        className="flex h-7 w-7 items-center justify-center text-slate-700 hover:bg-orange-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                                        aria-label={t.zoomInAria}
                                    >
                                        <MagnifierPlusIcon className="h-[15px] w-[15px]" />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeDetailModal}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center justify-self-end border-2 border-slate-900 bg-white text-slate-900 shadow-[3px_3px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5"
                                    aria-label={language === 'en' ? 'Close' : 'বন্ধ করুন'}
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {chartRelatedForModal.length > 0 && (
                                <div className="flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-hidden border-b-2 border-slate-900 bg-amber-50 px-3 py-1.5 no-scrollbar [-webkit-overflow-scrolling:touch] sm:px-6 sm:py-2">
                                    {chartRelatedForModal.map((chart) => (
                                        <button
                                            key={chart.id}
                                            type="button"
                                            onClick={() => goToRelatedLibraryItem(chart)}
                                            className="inline-flex h-8 max-w-[min(100%,12rem)] shrink-0 items-center gap-1.5 border-2 border-slate-900 bg-white py-0 pl-1.5 pr-2 text-left text-[10px] font-bold leading-tight text-slate-800 shadow-[2px_2px_0_#0f172a] hover:bg-orange-50 active:translate-x-0.5 active:translate-y-0.5 sm:max-w-[14rem]"
                                            aria-label={`${t.relatedOpenAriaPrefix} ${chart.name_bn}`}
                                        >
                                            <LineChartIcon className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
                                            <span className="min-w-0 truncate">{chart.name_bn}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedItem.related_items?.some((rel) => rel.category !== 'Charts') && (
                                <div className="flex shrink-0 flex-nowrap gap-2 overflow-x-auto overflow-y-hidden border-b-2 border-slate-900 bg-white px-3 py-2 no-scrollbar [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-x-visible sm:px-6 sm:py-3">
                                    {selectedItem.related_items
                                        .filter((rel) => rel.category !== 'Charts')
                                        .map((rel) => (
                                        <button
                                            key={rel.id}
                                            type="button"
                                            onClick={() => goToRelatedLibraryItem(rel)}
                                            className="inline-flex max-w-[min(100%,18rem)] shrink-0 items-center gap-1.5 border-2 border-slate-900 bg-white py-1 pl-3 pr-2 text-left text-[11px] font-bold text-slate-800 shadow-[2px_2px_0_#0f172a] hover:bg-orange-50 active:translate-x-0.5 active:translate-y-0.5 sm:max-w-full"
                                            aria-label={`${t.relatedOpenAriaPrefix} ${rel.name_bn}`}
                                        >
                                            <span className="min-w-0 flex-1 truncate">{rel.name_bn}</span>
                                            <span className="nb-tag shrink-0 px-1.5 py-0.5 bg-orange-100 text-orange-800 text-[9px]">
                                                {rel.category}
                                            </span>
                                            <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-orange-600" aria-hidden />
                                        </button>
                                        ))}
                                </div>
                            )}

                            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar sm:overflow-hidden">
                                <div className="sm:grid sm:h-full sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] sm:items-stretch">
                                <div
                                    className={`group/modal-img relative w-full shrink-0 bg-white sm:h-full sm:border-r-2 border-slate-900 ${
                                        selectedItem.category === 'Charts' ? 'sm:overflow-y-auto sm:no-scrollbar' : 'sm:overflow-hidden'
                                    }`}
                                >
                                    <ImageSlider
                                        key={selectedItem.id}
                                        ref={detailSliderRef}
                                        images={selectedItem.images}
                                        alt={selectedItem.name_bn}
                                        aspect="h-full"
                                        showControls={true}
                                        enableZoom
                                        zoomChrome="none"
                                        onZoomChange={setDetailZoomLevel}
                                        naturalImageHeight
                                    />
                                </div>

                                <div className="p-6 sm:h-full sm:overflow-y-auto sm:bg-[#fffdf7] sm:p-8 sm:pb-14 sm:pr-8 sm:pl-7 sm:no-scrollbar pb-32 space-y-6">
                                    <div className="space-y-3 pb-6 border-b-2 border-slate-900">
                                        {selectedItem.approx_price_inr !== '---' && (
                                            <div className="nb-score-pill inline-flex items-center gap-1.5 px-2.5 py-1 !bg-emerald-100 !text-emerald-800">
                                                <span className="text-[10px]">₹</span>
                                                <span className="text-xs tabular-nums">{selectedItem.approx_price_inr}</span>
                                            </div>
                                        )}
                                    </div>

                                    {selectedItem.category !== 'Charts' && selectedItem.function_bn && (
                                        <div className="nb-card p-4 sm:p-5 space-y-2 bg-white">
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <InfoIcon className="w-3.5 h-3.5" />
                                                <span className="nb-label">{t.aboutLabel}</span>
                                            </div>
                                            <p className="text-[14px] sm:text-base text-slate-700 leading-relaxed font-semibold">
                                                {selectedItem.function_bn}
                                            </p>
                                        </div>
                                    )}

                                    {selectedItem.category !== 'Charts' && selectedItem.guide_bn && (
                                        <div className="nb-card p-4 sm:p-5 bg-amber-50 space-y-2">
                                            <div className="flex items-center gap-2 text-orange-700 font-black text-[10px] uppercase tracking-wider nb-mono">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                {t.guideLabel}
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-bold italic">
                                                "{selectedItem.guide_bn}"
                                            </p>
                                        </div>
                                    )}


                                </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
