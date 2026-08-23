/* eslint-disable react/prop-types */
import React from 'react';
import ContactResponsesCard from './ContactResponsesCard';

export default function ContactResponsesPage({
  language = 'bn',
  setCurrentView,
}) {
  const bn = language === 'bn';

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
        <h1 className="mb-3 font-sans text-lg font-black text-slate-900">
          Contact Us
        </h1>
        <ContactResponsesCard
          language={language}
          defaultOpen
          standalone
        />
      </div>
    </div>
  );
}
