import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FLAG_SPARKLES = [
  { x: '28%', y: '22%', s: 9, d: '0s', c: 'gold' },
  { x: '48%', y: '12%', s: 13, d: '0.35s', c: 'white' },
  { x: '68%', y: '26%', s: 8, d: '0.7s', c: 'saffron' },
  { x: '40%', y: '38%', s: 11, d: '0.15s', c: 'white' },
  { x: '58%', y: '48%', s: 7, d: '1.1s', c: 'gold' },
  { x: '22%', y: '44%', s: 6, d: '0.55s', c: 'saffron' },
  { x: '76%', y: '18%', s: 10, d: '0.9s', c: 'white' },
  { x: '34%', y: '62%', s: 8, d: '1.4s', c: 'gold' },
  { x: '54%', y: '28%', s: 6, d: '0.25s', c: 'saffron' },
  { x: '72%', y: '58%', s: 12, d: '0.8s', c: 'white' },
  { x: '44%', y: '8%', s: 7, d: '1.25s', c: 'gold' },
  { x: '30%', y: '52%', s: 9, d: '0.45s', c: 'white' },
  { x: '62%', y: '70%', s: 6, d: '1.6s', c: 'saffron' },
  { x: '50%', y: '42%', s: 8, d: '0.05s', c: 'gold' },
];

/**
 * Full-screen seasonal celebration overlay (mobile-first).
 * Portaled to body so Suspense/view transitions cannot hide it.
 * Swap campaigns in celebrationSplash.js for future occasions.
 * Dismisses on the arrow (or backdrop tap).
 */
export default function CelebrationSplash({
  language = 'bn',
  config,
  onDismiss,
  previewNav = null,
}) {
  const bn = language === 'bn';
  const dismissedRef = useRef(false);
  const previewNavRef = useRef(previewNav);
  const onDismissRef = useRef(onDismiss);
  previewNavRef.current = previewNav;
  onDismissRef.current = onDismiss;

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismissRef.current?.();
  };

  const hasPreviewNav = Boolean(previewNav);
  useEffect(() => {
    if (!hasPreviewNav) return undefined;
    const onKey = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previewNavRef.current?.onPrev?.();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        previewNavRef.current?.onNext?.();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasPreviewNav]);

  if (!config?.image) return null;

  const isIndependence = config.variant === 'independence';
  const isMaxim = config.variant === 'maxim' && config.maxim;
  const maximKicker = isMaxim ? (bn ? config.maxim.kicker?.bn : config.maxim.kicker?.en) : '';
  const maximLines = isMaxim ? ((bn ? config.maxim.lines?.bn : config.maxim.lines?.en) || []) : [];
  const maximLabel = [maximKicker, ...maximLines].filter(Boolean).join(' ');
  const posterSrc = isMaxim
    ? (bn ? (config.image || config.maxim.imageBn) : (config.imageEn || config.maxim.imageEn || config.image))
    : config.image;
  const posterDesktop = isMaxim
    ? (bn
      ? (config.imageDesktop || config.maxim.imageBnDesktop)
      : (config.imageEnDesktop || config.maxim.imageEnDesktop || config.imageDesktop))
    : config.imageDesktop;

  const goPrev = (e) => {
    e?.stopPropagation?.();
    previewNav?.onPrev?.();
  };
  const goNext = (e) => {
    e?.stopPropagation?.();
    previewNav?.onNext?.();
  };

  const title = bn ? config.title?.bn : config.title?.en;
  const subtitle = bn ? config.subtitle?.bn : config.subtitle?.en;
  const continueLabel = bn ? config.continueLabel?.bn : config.continueLabel?.en;
  const kicker = bn ? config.kicker?.bn : config.kicker?.en;
  const dateLabel = bn
    ? (config.dateLabel?.bn || '')
    : (config.dateLabel?.en || config.dateLabel?.bn || '');

  const footLines =
    (bn ? config.footLines?.bn : config.footLines?.en) || (title ? [title] : []);

  const topCopy = !isIndependence && !isMaxim ? (
    <div className="celebration-splash__copy mx-auto w-full max-w-md pt-2 text-center">
      {kicker ? (
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/85">
          {kicker}
        </p>
      ) : null}
      <h1
        className={`text-[1.85rem] font-black leading-tight text-white drop-shadow-md sm:text-4xl ${
          bn ? 'font-bengali celebration-splash__display' : ''
        }`}
      >
        {title}
      </h1>
      {dateLabel ? (
        <p
          className={`celebration-splash__date mt-2.5 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide text-white sm:text-sm ${
            bn ? 'font-bengali' : ''
          }`}
        >
          {dateLabel}
        </p>
      ) : null}
      {subtitle ? (
        <p
          className={`mx-auto mt-3 max-w-sm text-sm font-semibold leading-relaxed text-white/95 sm:text-base ${
            bn ? 'font-bengali' : ''
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  ) : null;

  const node = (
    <div
      className={`celebration-splash fixed inset-0 z-[10060] flex flex-col${
        isIndependence ? ' celebration-splash--independence' : ''
      }${isMaxim ? ' celebration-splash--maxim' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={maximLabel || title || 'Smart Lineman'}
      onClick={dismiss}
    >
      <img
        src={posterSrc}
        srcSet={
          posterDesktop && posterDesktop !== posterSrc
            ? `${posterSrc} 720w, ${posterDesktop} 1024w`
            : undefined
        }
        sizes="(max-width: 767px) 100vw, 42rem"
        alt=""
        width={config.imageWidth}
        height={config.imageHeight}
        decoding="async"
        fetchPriority="high"
        className="celebration-splash__img absolute inset-0 h-full w-full"
        draggable={false}
      />
      <div className="celebration-splash__veil absolute inset-0" aria-hidden />
      {previewNav ? (
        <>
          <p className="celebration-splash__nav-count" aria-live="polite">
            {previewNav.index + 1} / {previewNav.total}
          </p>
          <button
            type="button"
            className="celebration-splash__nav is-prev"
            aria-label={bn ? 'আগেরটি' : 'Previous'}
            onClick={goPrev}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                d="M19 12H7m0 0 5-5M7 12l5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="celebration-splash__nav is-next"
            aria-label={bn ? 'পরেরটি' : 'Next'}
            onClick={goNext}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                d="M5 12h12m0 0-5-5m5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      ) : null}
      {isIndependence ? (
        <div className="celebration-splash__sparkles" aria-hidden>
          {FLAG_SPARKLES.map((sparkle, i) => (
            <span
              key={i}
              className={`celebration-splash__sparkle is-${sparkle.c}`}
              style={{
                '--x': sparkle.x,
                '--y': sparkle.y,
                '--s': `${sparkle.s}px`,
                '--d': sparkle.d,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className={`relative z-10 flex min-h-0 flex-1 flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] ${previewNav ? 'px-14' : 'px-5'}`}>
        {topCopy}

        {isMaxim ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2">
            <p className={`celebration-splash__maxim ${bn ? 'font-bengali' : ''}`}>
              {maximKicker ? (
                <span className="celebration-splash__maxim-kicker">{maximKicker}</span>
              ) : null}
              {maximLines.map((line, i) => (
                <span key={`${line}-${i}`} className="celebration-splash__maxim-line">
                  {line}
                </span>
              ))}
            </p>
          </div>
        ) : null}

        <div className="mx-auto mt-auto flex w-full max-w-lg flex-col items-center gap-4 pb-2 pt-4">
          {isIndependence && footLines.length ? (
            <p
              className={`celebration-splash__tiranga ${bn ? 'font-bengali celebration-splash__display' : ''}`}
              aria-label={title}
            >
              {footLines.map((line, i) => (
                <span key={`${line}-${i}`} className={`celebration-splash__tiranga-band is-${i}`}>
                  {line}
                </span>
              ))}
            </p>
          ) : null}
          <button
            type="button"
            className="celebration-splash__arrow"
            aria-label={continueLabel || (bn ? 'এগিয়ে যান' : 'Continue')}
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                d="M5 12h12m0 0-5-5m5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}
