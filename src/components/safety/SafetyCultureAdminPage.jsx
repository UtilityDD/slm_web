/* eslint-disable react/prop-types */
import React from 'react';
import SafetyCultureAdminPanel from './SafetyCultureAdminPanel';

/**
 * Full-page admin surface for the safety culture survey tab
 * (concept, reports, questions, preview) — opened from Home card.
 */
export default function SafetyCultureAdminPage({
  language = 'bn',
  setCurrentView,
  onPreviewFlow,
}) {
  const bn = language === 'bn' || language === 'বাংলা';

  return (
    <div className="min-h-full bg-[#fffdf7] pb-28 text-slate-900">
      <div className="mx-auto max-w-lg px-4 pt-4 sm:pt-5">
        <button
          type="button"
          onClick={() => setCurrentView?.('home')}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm active:scale-[0.98]"
        >
          <span aria-hidden>←</span>
          {bn ? 'হোমে ফিরুন' : 'Back to Home'}
        </button>

        <h1 className={`mb-3 font-black text-slate-900 ${bn ? 'font-bengali text-xl' : 'text-lg'}`}>
          {bn ? 'নিরাপত্তা সংস্কৃতি জরিপ' : 'Safety culture survey'}
        </h1>

        <SafetyCultureAdminPanel
          language={language}
          onPreviewFlow={onPreviewFlow}
          defaultOpen
          standalone
        />
      </div>
    </div>
  );
}
