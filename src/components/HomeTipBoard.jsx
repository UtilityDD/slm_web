import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { pushNativeBackHandler } from '../utils/nativeAndroidUx';

/** Size tier so longer tips still fill the board without overflowing. */
function tipLengthClass(text) {
  const len = String(text || '').trim().length;
  if (len > 140) return 'is-xl';
  if (len > 95) return 'is-lg';
  if (len > 55) return 'is-md';
  return 'is-sm';
}

/**
 * Full-screen tip scene: blank-board artwork with tip text fitted on the board.
 */
export default function HomeTipBoard({ text, language = 'bn', onClose }) {
  const bn = language === 'bn';
  const lengthClass = useMemo(() => tipLengthClass(text), [text]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const pop = pushNativeBackHandler(() => {
      onClose?.();
      return true;
    });
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      pop();
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="home-tip-stage fixed inset-0 z-[1100]"
      role="dialog"
      aria-modal="true"
      aria-label={bn ? 'নিরাপত্তা টিপ' : 'Safety tip'}
    >
      {/* Frame matches art aspect so board % coords stay locked to the image */}
      <div className="home-tip-stage__viewport">
        <div className="home-tip-stage__frame">
          <img
            src="/images/home-tip-lineman-blank-board.webp"
            alt=""
            decoding="async"
            className="home-tip-stage__art pointer-events-none select-none"
          />

          <div className="home-tip-stage__embed" aria-live="polite">
            <p
              className={`home-tip-stage__embed-text ${lengthClass} ${bn ? 'font-bengali is-bn' : ''}`}
            >
              {text}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="home-tip-stage__close absolute left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-sm transition active:scale-95 sm:left-5 sm:top-5"
        aria-label={bn ? 'বন্ধ' : 'Close'}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>,
    document.body
  );
}
