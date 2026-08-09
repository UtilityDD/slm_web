import React, { useEffect, useRef } from 'react';
import { hideNativeSplash } from '../utils/nativeAndroidUx';

/** Keep in sync with `.slm-boot-hold` CSS transition duration. */
export const BOOT_HOLD_EXIT_MS = 420;

/**
 * Cream hold with clean SmartLineMan wordmark until Landing/Home is ready.
 */
export default function AppBootSplash({
  exiting = false,
  onExitComplete,
  language = 'en',
}) {
  const bn = language === 'bn';
  const exitTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window.__hideStaticShell === 'function') {
      window.__hideStaticShell();
    }
    void hideNativeSplash(0);
  }, []);

  useEffect(() => {
    if (!exiting) return undefined;
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      onExitComplete?.();
    }, BOOT_HOLD_EXIT_MS + 30);
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, [exiting, onExitComplete]);

  return (
    <div
      className={`slm-boot-hold fixed inset-0 z-[10050] flex items-center justify-center ${
        exiting ? 'slm-boot-hold--exit' : ''
      }`}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label={bn ? 'স্মার্টলাইনম্যান লোড হচ্ছে' : 'SmartLineMan loading'}
    >
      <p className="slm-boot-wordmark" aria-hidden={false}>
        SmartLineMan
        <span className="slm-boot-wordmark__tld">.in</span>
      </p>
    </div>
  );
}
