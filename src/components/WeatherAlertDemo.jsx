import React, { useState } from 'react';
import { getAlertMessages } from '../utils/weatherAlert';

const MOCK_ALERTS = {
  warning: {
    active: true,
    level: 'warning',
    district: 'Howrah',
    reasons: ['rain', 'wind'],
    totalRainMm: 6.2,
    maxWindKmh: 42,
    hoursAhead: 6,
    fetchedAt: new Date().toISOString(),
  },
  danger: {
    active: true,
    level: 'danger',
    district: 'Kolkata',
    reasons: ['thunderstorm', 'rain', 'wind'],
    totalRainMm: 18,
    maxWindKmh: 58,
    hoursAhead: 6,
    fetchedAt: new Date().toISOString(),
  },
  cached: {
    active: true,
    level: 'warning',
    district: 'Darjeeling',
    reasons: ['rain'],
    totalRainMm: 8,
    maxWindKmh: 28,
    hoursAhead: 6,
    fetchedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    stale: true,
    offline: true,
  },
};

function AlertStrip({ alert, language, loading = false, isReminder = false }) {
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

  return (
    <div
      className={`w-full px-4 py-2.5 shadow-lg flex items-start gap-2 ${
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
        <button
          type="button"
          className="px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-white/20 border border-white/40"
        >
          {loading ? '…' : isBn ? 'রিফ্রেশ' : 'Refresh'}
        </button>
        <button type="button" className="p-1 rounded-full bg-white/10">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function PhoneFrame({ label, children }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <div className="w-[320px] rounded-[2rem] border-[6px] border-slate-800 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 overflow-hidden shadow-2xl">
        <div className="h-6 bg-slate-800 dark:bg-slate-700 flex items-center justify-center">
          <div className="w-16 h-3 rounded-full bg-slate-900 dark:bg-black" />
        </div>
        <div className="relative min-h-[420px] bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900">
          {children}
          <div className="pt-16 px-4 space-y-3 opacity-60">
            <div className="h-8 bg-white/70 dark:bg-slate-700/70 rounded-xl" />
            <div className="h-24 bg-white/70 dark:bg-slate-700/70 rounded-2xl" />
            <div className="h-24 bg-white/70 dark:bg-slate-700/70 rounded-2xl" />
            <div className="h-16 bg-white/70 dark:bg-slate-700/70 rounded-2xl" />
          </div>
        </div>
        <div className="h-10 bg-slate-800 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export default function WeatherAlertDemo({ language: initialLang = 'en', setCurrentView }) {
  const [language, setLanguage] = useState(initialLang);
  const [liveVisible, setLiveVisible] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12">
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black">Weather Alert UI Demo</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Lineman bad-weather banner preview</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                language === 'en'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('bn')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                language === 'bn'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              বাংলা
            </button>
            {setCurrentView && (
              <button
                type="button"
                onClick={() => setCurrentView('landing')}
                className="px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-300 dark:border-slate-600"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <section>
          <h2 className="text-lg font-bold mb-2">Live banner (same as in app)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Fixed to top of screen — this is what linemen see when bad weather is forecast.
          </p>
          <button
            type="button"
            onClick={() => setLiveVisible((v) => !v)}
            className="mb-4 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-bold dark:bg-slate-200 dark:text-slate-900"
          >
            {liveVisible ? 'Hide live demo' : 'Show live demo'}
          </button>
          {liveVisible && (
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden h-48 bg-slate-200 dark:bg-slate-800">
              <div className="absolute inset-x-0 top-0 z-10">
                <AlertStrip alert={MOCK_ALERTS.danger} language={language} />
              </div>
              <p className="absolute bottom-4 left-4 text-xs text-slate-500">App content below banner…</p>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold mb-6">All alert types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 justify-items-center">
            <PhoneFrame label="Warning — rain & wind">
              <div className="absolute inset-x-0 top-0 z-10">
                <AlertStrip alert={MOCK_ALERTS.warning} language={language} />
              </div>
            </PhoneFrame>
            <PhoneFrame label="Danger — thunderstorm">
              <div className="absolute inset-x-0 top-0 z-10">
                <AlertStrip alert={MOCK_ALERTS.danger} language={language} />
              </div>
            </PhoneFrame>
            <PhoneFrame label="Reminder (after 90 min)">
              <div className="absolute inset-x-0 top-0 z-10">
                <AlertStrip alert={MOCK_ALERTS.warning} language={language} isReminder />
              </div>
            </PhoneFrame>
            <PhoneFrame label="Offline / cached">
              <div className="absolute inset-x-0 top-0 z-10">
                <AlertStrip alert={MOCK_ALERTS.cached} language={language} />
              </div>
            </PhoneFrame>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-900">
          <h3 className="font-bold mb-2">Thresholds (next 6 hours)</h3>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
            <li>Amber: heavy rain (≥ 5 mm) or wind gusts ≥ 40 km/h</li>
            <li>Red: thunderstorm, rain ≥ 15 mm, or wind ≥ 55 km/h</li>
            <li>Dismiss hides for <strong>90 minutes</strong>, then reminds if weather still bad (max 3/day)</li>
            <li>Danger escalation (warning → red) shows immediately, even if dismissed</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
