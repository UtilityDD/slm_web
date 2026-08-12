import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { pushNativeBackHandler } from '../utils/nativeAndroidUx';
import { downloadHomeTipBoardImage } from '../utils/homeTipBoardExport';

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
  const [downloading, setDownloading] = useState(false);

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

  const handleDownload = async () => {
    if (downloading || !text) return;
    setDownloading(true);
    try {
      await downloadHomeTipBoardImage({ text, language });
    } catch (err) {
      console.error('Tip image download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

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
            width={1024}
            height={1536}
            decoding="async"
            fetchPriority="high"
            className="home-tip-stage__art pointer-events-none select-none"
            draggable={false}
          />

          <div className="home-tip-stage__embed" aria-live="polite">
            <p
              className={`home-tip-stage__embed-text ${lengthClass} ${bn ? 'font-bengali is-bn' : ''}`}
            >
              {text}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="home-tip-stage__close"
            aria-label={bn ? 'বন্ধ' : 'Close'}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="home-tip-stage__download"
            aria-label={bn ? 'ছবি ডাউনলোড' : 'Download image'}
            aria-busy={downloading || undefined}
          >
            {downloading ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <path d="M12 4v10" strokeLinecap="round" />
                <path d="M8 10l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 19h14" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
