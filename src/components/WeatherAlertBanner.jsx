import React from 'react';
import { createPortal } from 'react-dom';
import { getAlertMessages } from '../utils/weatherAlert';

/**
 * Top banner for bad-weather alerts (rain, wind, thunderstorm) based on user district.
 */
export default function WeatherAlertBanner({
  alert,
  visible,
  language = 'en',
  isReminder = false,
  onDismiss,
  onRefresh,
  loading = false,
}) {
  if (!visible || !alert?.active) return null;

  const messages = getAlertMessages(alert, language, { isReminder });
  if (!messages) return null;

  const isDanger = alert.level === 'danger';
  const isBn = language === 'bn';
  const staleNote =
    alert.stale || alert.offline || alert.fetchError
      ? isBn
        ? ' (সংরক্ষিত পূর্বাভাস)'
        : ' (cached forecast)'
      : '';

  return createPortal(
    <div className="fixed top-0 left-0 right-0 z-[9998] flex flex-col items-center pointer-events-none">
      <div
        role="alert"
        aria-live="assertive"
        className={`w-full px-4 py-2.5 shadow-lg flex items-start gap-2 animate-slide-down pointer-events-auto ${
          isDanger ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
        }`}
      >
        <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">
          {isDanger ? '⛈️' : '🌧️'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">
            {messages.title}
            {staleNote}
          </p>
          <p className="text-xs mt-0.5 opacity-95 leading-snug">{messages.body}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
              title={isBn ? 'আবহাওয়া রিফ্রেশ' : 'Refresh weather'}
              aria-label={isBn ? 'রিফ্রেশ' : 'Refresh'}
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 3v5h-5" />
              </svg>
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label={isBn ? 'বন্ধ করুন' : 'Dismiss'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
