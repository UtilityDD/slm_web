import React from 'react';
import { ANDROID_DOWNLOAD_PAGE_URL } from '../config';
import { isNativeCapacitorPlatform } from '../utils/webPush';

/**
 * Web/PWA-only link to the official Android APK download page.
 * Hidden inside the Capacitor app (already installed).
 */
export default function AndroidAppDownloadCta({
  language = 'en',
  className = '',
}) {
  if (typeof window !== 'undefined' && isNativeCapacitorPlatform()) return null;

  const bn = language === 'bn';

  return (
    <a
      href={ANDROID_DOWNLOAD_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`home-3d-tile more-3d-tile home-3d-tile--android more-android-cta ${className}`.trim()}
      aria-label={bn ? 'অ্যান্ড্রয়েড অ্যাপ ডাউনলোড' : 'Download Android app'}
    >
      <span className="home-3d-tile__icon" aria-hidden>
        <svg className="home-3d-tile__glyph" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M17.6 11.48 19.44 8.3c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-2.86-1.21-6.08-1.21-8.94 0L5.65 7.67c-.19-.29-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C3.18 13.32 1.88 16.62 1.54 20h20.92c-.34-3.38-1.64-6.68-4.86-8.52zM7 17.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"
          />
        </svg>
      </span>
      <span className="more-android-cta__copy">
        <span className={`home-3d-tile__label ${bn ? 'font-bengali' : ''}`}>
          {bn ? 'অ্যান্ড্রয়েড অ্যাপ' : 'Android app'}
        </span>
        <span className={`more-android-cta__sub ${bn ? 'font-bengali' : ''}`}>
          {bn ? 'ডাউনলোড এপিকে' : 'Download APK'}
        </span>
      </span>
      <svg className="more-3d-tile__go" viewBox="0 0 24 24" aria-hidden>
        <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M12 5v12m0 0-4.2-4.2M12 17l4.2-4.2M5 20h14" />
      </svg>
    </a>
  );
}
