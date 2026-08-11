import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { CELEBRATION_SPLASH } from '../config/celebrationSplash';

/**
 * Full-screen seasonal celebration overlay (mobile-first).
 * Portaled to body so Suspense/view transitions cannot hide it.
 * Swap image/copy/dates in celebrationSplash.js for future occasions.
 * Dismisses only on user tap (no auto-advance).
 */
export default function CelebrationSplash({
  language = 'bn',
  config = CELEBRATION_SPLASH,
  onDismiss,
}) {
  const bn = language === 'bn';
  const dismissedRef = useRef(false);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismiss?.();
  };

  const title = bn ? config.title.bn : config.title.en;
  const subtitle = bn ? config.subtitle.bn : config.subtitle.en;
  const continueLabel = bn ? config.continueLabel.bn : config.continueLabel.en;
  const dateLabel = bn
    ? (config.dateLabel?.bn || '')
    : (config.dateLabel?.en || config.dateLabel?.bn || '');

  const node = (
    <div
      className="celebration-splash fixed inset-0 z-[10060] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={dismiss}
    >
      <img
        src={config.image}
        srcSet={`${config.image} 720w, ${config.imageDesktop || config.image} 1024w`}
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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="celebration-splash__copy mx-auto w-full max-w-md pt-2 text-center">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/85">
            India
          </p>
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
          <p
            className={`mx-auto mt-3 max-w-sm text-sm font-semibold leading-relaxed text-white/95 sm:text-base ${
              bn ? 'font-bengali' : ''
            }`}
          >
            {subtitle}
          </p>
        </div>

        <div className="mx-auto w-full max-w-md pb-2">
          <button
            type="button"
            className={`celebration-splash__cta w-full rounded-2xl px-4 py-3 text-sm font-bold text-white/95 active:scale-[0.98] ${
              bn ? 'font-bengali' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
          >
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}
