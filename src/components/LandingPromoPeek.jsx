import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { pushNativeBackHandler } from '../utils/nativeAndroidUx';
import {
  appGuideShortThumb,
  youtubeShortsEmbedSrc,
  youtubeShortsPoster,
} from '../data/appUserGuideShorts';
import {
  LANDING_PROMO_DISMISS_KEY,
  LANDING_PROMO_PEEK_DELAY_MS,
  LANDING_PROMO_SHORT,
} from '../data/landingPromoShort';

const { videoId } = LANDING_PROMO_SHORT;

function wasDismissed() {
  try {
    return sessionStorage.getItem(LANDING_PROMO_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    sessionStorage.setItem(LANDING_PROMO_DISMISS_KEY, '1');
  } catch {
    /* private mode */
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function lockPageScroll() {
  const scroller = document.getElementById('main-scroll-container');
  const prev = {
    body: document.body.style.overflow,
    scroll: scroller?.style.overflow || '',
  };
  document.body.style.overflow = 'hidden';
  if (scroller) scroller.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = prev.body;
    if (scroller) scroller.style.overflow = prev.scroll;
  };
}

/**
 * Quiet right-edge peek on the public landing page.
 * After a dwell, a Shorts thumbnail slides in; tap morphs it into a
 * full-page poster with a play control, then the YouTube embed.
 */
export default function LandingPromoPeek({ language = 'bn', ready = true }) {
  const bn = language === 'bn';
  const [phase, setPhase] = useState(() => (wasDismissed() ? 'gone' : 'waiting'));
  const [posterSrc, setPosterSrc] = useState(() => youtubeShortsPoster(videoId));
  const swipeX = useRef(null);
  const swipedRef = useRef(false);
  const rootRef = useRef(null);

  const open = phase === 'open' || phase === 'playing';
  const peeking = phase === 'peek';

  useEffect(() => {
    if (!ready || wasDismissed()) return undefined;
    const delay = prefersReducedMotion() ? 1800 : LANDING_PROMO_PEEK_DELAY_MS;
    const timer = window.setTimeout(() => {
      if (wasDismissed()) return;
      setPhase('peek');
    }, delay);
    return () => window.clearTimeout(timer);
  }, [ready]);

  const collapse = useCallback(() => {
    setPhase('peek');
  }, []);

  const dismiss = useCallback(() => {
    rememberDismissed();
    if (prefersReducedMotion()) {
      setPhase('gone');
      return;
    }
    setPhase('leaving');
  }, []);

  const expand = useCallback(() => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    if (navigator.vibrate) navigator.vibrate(5);
    setPhase('open');
  }, []);

  const play = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(8);
    setPhase('playing');
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const unlock = lockPageScroll();
    const pop = pushNativeBackHandler(() => {
      if (phase === 'playing') {
        setPhase('open');
        return true;
      }
      collapse();
      return true;
    });
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (phase === 'playing') {
        setPhase('open');
        return;
      }
      collapse();
    };
    window.addEventListener('keydown', onKey);

    let meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute('content') || null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#050505');

    return () => {
      unlock();
      pop();
      window.removeEventListener('keydown', onKey);
      if (previous) meta.setAttribute('content', previous);
    };
  }, [open, phase, collapse]);

  const onPeekPointerDown = (e) => {
    if (!peeking) return;
    swipeX.current = e.clientX;
  };

  const onPeekPointerUp = (e) => {
    if (!peeking || swipeX.current == null) return;
    const dx = e.clientX - swipeX.current;
    swipeX.current = null;
    if (dx > 40) {
      swipedRef.current = true;
      dismiss();
    }
  };

  const onLeaveEnd = (e) => {
    if (phase !== 'leaving') return;
    if (e.target !== rootRef.current) return;
    if (e.propertyName && e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
    setPhase('gone');
  };

  useEffect(() => {
    if (phase !== 'leaving') return undefined;
    const timer = window.setTimeout(() => setPhase('gone'), 800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (typeof document === 'undefined' || phase === 'gone') {
    return null;
  }

  const title = bn ? LANDING_PROMO_SHORT.titleBn : LANDING_PROMO_SHORT.titleEn;
  const peekLabel = bn ? 'প্রোমো ভিডিও দেখুন' : 'Watch promo video';
  const playLabel = bn ? 'ভিডিও চালান' : 'Play video';
  const closeLabel = bn ? 'বন্ধ' : 'Close';
  const dismissLabel = bn ? 'এখন নয়' : 'Not now';
  const kicker = bn ? 'প্রোমো' : 'Promo';

  const rootClass = [
    'landing-promo',
    `landing-promo--${phase}`,
    open ? 'is-open' : '',
    phase === 'playing' ? 'is-playing' : '',
  ].filter(Boolean).join(' ');

  return createPortal(
    <div
      ref={rootRef}
      className={rootClass}
      role={open ? 'dialog' : undefined}
      aria-modal={open ? 'true' : undefined}
      aria-hidden={phase === 'waiting' || phase === 'leaving' ? true : undefined}
      aria-label={open ? title : undefined}
      onTransitionEnd={onLeaveEnd}
      onPointerDown={onPeekPointerDown}
      onPointerUp={onPeekPointerUp}
      onPointerCancel={() => { swipeX.current = null; }}
      onClick={phase === 'open' ? play : undefined}
    >
      <img
        className="landing-promo__shot"
        src={posterSrc}
        alt=""
        decoding="async"
        onError={() => setPosterSrc(appGuideShortThumb(videoId))}
      />

      {phase === 'playing' && (
        <div className="landing-promo__player">
          <div className="landing-promo__frame">
            <iframe
              src={youtubeShortsEmbedSrc(videoId)}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen={false}
            />
          </div>
        </div>
      )}

      {peeking && (
        <>
          <button
            type="button"
            className="landing-promo__hit"
            onClick={expand}
            aria-label={peekLabel}
          />
          <button
            type="button"
            className="landing-promo__dismiss"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            aria-label={dismissLabel}
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
          <span className="landing-promo__mini-play" aria-hidden>
            <svg className="ml-px h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="m7 4 12 8-12 8V4z" />
            </svg>
          </span>
        </>
      )}

      {open && (
        <div className="landing-promo__chrome">
          <p className={`landing-promo__kicker ${bn ? 'font-bengali' : ''}`}>{kicker}</p>
          <button
            type="button"
            className="landing-promo__close"
            onClick={(e) => {
              e.stopPropagation();
              collapse();
            }}
            aria-label={closeLabel}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {phase === 'open' && (
        <>
          <button
            type="button"
            className="landing-promo__play"
            onClick={(e) => {
              e.stopPropagation();
              play();
            }}
            aria-label={playLabel}
          >
            <svg className="ml-1 h-9 w-9 sm:h-10 sm:w-10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="m7 4 12 8-12 8V4z" />
            </svg>
          </button>
          <p className={`landing-promo__title ${bn ? 'font-bengali' : ''}`}>{title}</p>
        </>
      )}
    </div>,
    document.body
  );
}
