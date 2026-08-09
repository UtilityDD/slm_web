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
  const label = bn ? 'অ্যান্ড্রয়েড অ্যাপ' : 'Android App';

  return (
    <a
      href={ANDROID_DOWNLOAD_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-500/30 transition-all hover:bg-orange-600 active:scale-[0.98] touch-manipulation ${bn ? 'font-bengali' : ''} ${className}`}
    >
      {label}
    </a>
  );
}
