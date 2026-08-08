import React, { useEffect, useMemo, useState } from 'react';
import HomeSkeleton from './loaders/HomeSkeleton';
import { UserIcon } from './icons';
import { getBadgeByLevel } from '../utils/badgeUtils';
import { filterCoreCompletedLessonIds } from '../utils/trainingLessonIds';
import { openLinemanInviteWhatsApp } from '../utils/linemanInviteShare';

/** Approximate core lesson count from training chapter defaults (display only). */
const APPROX_CORE_LESSON_TOTAL = 91;

function tipStorageKey() {
  const now = new Date();
  return `slm_home_tip_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export default function Home({
  setCurrentView,
  language,
  user,
  userProfile,
  completedLessons: completedLessonsProp,
}) {
  const bn = language === 'bn';
  const [loading, setLoading] = useState(!userProfile && !!user);
  const [dailyTip, setDailyTip] = useState('');
  const [tipVisible, setTipVisible] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoading(false);
  }, [userProfile, user]);

  useEffect(() => {
    let cancelled = false;

    const loadTip = async () => {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(tipStorageKey()) === '1') {
        return;
      }

      let tip = bn
        ? 'যেকোনো কন্ডাক্টর স্পর্শ করার আগে সর্বদা ভোল্টেজ পরীক্ষা করুন।'
        : 'Always test for voltage before touching any conductor.';

      try {
        const response = await fetch('/quizzes/carousol.json');
        const data = await response.json();
        const rules = data.rules || [];
        if (rules.length > 0) {
          const now = new Date();
          const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
          let hash = 0;
          for (let i = 0; i < dateStr.length; i++) {
            hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
            hash |= 0;
          }
          tip = rules[Math.abs(hash) % rules.length];
        }
      } catch {
        // Keep fallback tip
      }

      if (!cancelled) {
        setDailyTip(tip);
        setTipVisible(true);
      }
    };

    loadTip();
    return () => {
      cancelled = true;
    };
  }, [bn]);

  const coreLessons = useMemo(() => {
    const fromProp = Array.isArray(completedLessonsProp) ? completedLessonsProp : [];
    const fromProfile = Array.isArray(userProfile?.completed_lessons)
      ? userProfile.completed_lessons
      : [];
    const merged = fromProp.length >= fromProfile.length ? fromProp : fromProfile;
    return filterCoreCompletedLessonIds(merged);
  }, [completedLessonsProp, userProfile?.completed_lessons]);

  const lessonCount = coreLessons.length;
  const progressPct = Math.min(100, Math.round((lessonCount / APPROX_CORE_LESSON_TOTAL) * 100));
  const trainingLevel = userProfile?.training_level || 1;
  const badge = getBadgeByLevel(trainingLevel, userProfile?.reading_points || 0);
  const displayName =
    userProfile?.full_name && !userProfile.full_name.includes('@')
      ? userProfile.full_name.split(' ')[0]
      : bn
        ? 'বন্ধু'
        : 'Friend';

  const hasStarted = lessonCount > 0;
  const primaryCta = {
    view: 'training',
    label: hasStarted
      ? bn
        ? 'প্রশিক্ষণ চালিয়ে যান'
        : 'Continue Training'
      : bn
        ? 'প্রশিক্ষণ শুরু করুন'
        : 'Start Training',
    hint: hasStarted
      ? bn
        ? `${lessonCount} পাঠ সম্পন্ন · Lv ${trainingLevel}`
        : `${lessonCount} lessons done · Lv ${trainingLevel}`
      : bn
        ? '৯০ দিনের নিরাপত্তা পাঠ'
        : '90-day safety reading path',
  };

  const dismissTip = () => {
    setTipVisible(false);
    try {
      localStorage.setItem(tipStorageKey(), '1');
    } catch {
      // ignore
    }
  };

  const go = (view) => {
    if (navigator.vibrate) navigator.vibrate(5);
    setCurrentView(view);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#fffdf7]">
        <div className="mx-auto max-w-lg p-4">
          <HomeSkeleton />
        </div>
      </div>
    );
  }

  const iconClass = 'h-[18px] w-[18px]';
  const snapshotCards = [
    {
      id: 'progress',
      label: bn ? 'অগ্রগতি' : 'Progress',
      value: `${progressPct}%`,
      hint: bn ? `${lessonCount} / ~${APPROX_CORE_LESSON_TOTAL} পাঠ` : `${lessonCount} / ~${APPROX_CORE_LESSON_TOTAL} lessons`,
      onClick: () => go('my-progress'),
      accent: 'border-orange-200 bg-orange-50/80 text-orange-800',
      iconWrap: 'bg-white/80 text-orange-600 border-orange-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
    },
    {
      id: 'rank',
      label: bn ? 'র‍্যাঙ্ক' : 'Rank',
      value: bn ? 'দেখুন' : 'View',
      hint: bn ? 'মাসিক বোর্ড' : 'Monthly board',
      onClick: () => go('leaderboard'),
      accent: 'border-amber-200 bg-amber-50/80 text-amber-900',
      iconWrap: 'bg-white/80 text-amber-600 border-amber-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      ),
    },
    {
      id: 'safety',
      label: bn ? 'সুরক্ষা' : 'Safety',
      value: bn ? 'পিপিই' : 'PPE',
      hint: bn ? 'জরুরি সহায়তা' : 'Tools & emergency',
      onClick: () => go('my_ppe'),
      accent: 'border-teal-200 bg-teal-50/80 text-teal-900',
      iconWrap: 'bg-white/80 text-teal-600 border-teal-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-full bg-[#fffdf7] pb-28 text-slate-900">
      <div
        className="h-1 w-full shrink-0 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-lg px-4 pt-5">
        <header className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => go('admin')}
            className="relative shrink-0 rounded-full transition-transform active:scale-95"
            aria-label={bn ? 'প্রোফাইল' : 'Profile'}
          >
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-orange-200/80 bg-orange-400 text-slate-900 shadow-sm">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-2.5 text-slate-900">
                  <UserIcon className="h-full w-full" />
                </div>
              )}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#fffdf7] bg-emerald-500"
              aria-hidden
            />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className={`truncate text-2xl font-black leading-tight text-slate-900 ${bn ? 'font-bengali' : ''}`}>
              {bn ? `নমস্কার, ${displayName}` : `Hello, ${displayName}`}
            </h1>
            <p className={`mt-1 text-sm font-medium text-slate-600 ${bn ? 'font-bengali' : ''}`}>
              {bn
                ? `${badge.bn} · একটা ধাপ এগোন—পড়ুন বা খেলুন।`
                : `${badge.en} · One clear next step—read or play.`}
            </p>
          </div>
        </header>

        {/* Primary next action */}
        <button
          type="button"
          onClick={() => go(primaryCta.view)}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-orange-300/80 bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-4 text-left text-white shadow-md shadow-orange-600/25 transition-all hover:shadow-lg active:scale-[0.99]"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/20"
            aria-hidden
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-base font-black leading-tight ${bn ? 'font-bengali' : ''}`}>
              {primaryCta.label}
            </span>
            <span className={`mt-0.5 block text-[11px] font-semibold text-orange-50/95 ${bn ? 'font-bengali' : ''}`}>
              {primaryCta.hint}
            </span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Secondary: play quiz — navigate only, no scoring logic */}
        <button
          type="button"
          onClick={() => go('competitions')}
          className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-left shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50/40 active:scale-[0.99]"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-700"
            aria-hidden
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-sm font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'ঘণ্টার কুইজ খেলুন' : 'Play hourly quiz'}
            </span>
            <span className={`mt-0.5 block text-[11px] font-medium text-slate-500 ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'প্রতিযোগিতায় যোগ দিন' : 'Join today’s competition'}
            </span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Snapshots — display-only + navigation */}
        <div className="mb-5 grid grid-cols-3 gap-2.5">
          {snapshotCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={card.onClick}
              className={`rounded-2xl border px-2.5 py-3 text-left shadow-sm transition-all active:scale-[0.98] ${card.accent}`}
            >
              <span
                className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full border ${card.iconWrap}`}
                aria-hidden
              >
                {card.icon}
              </span>
              <p className={`text-[10px] font-bold opacity-80 ${bn ? 'font-bengali' : 'uppercase tracking-wide'}`}>
                {card.label}
              </p>
              <p className={`mt-1 text-lg font-black tabular-nums leading-none ${bn ? 'font-bengali' : ''}`}>
                {card.value}
              </p>
              <p className={`mt-1.5 text-[10px] font-semibold leading-snug opacity-75 ${bn ? 'font-bengali' : ''}`}>
                {card.hint}
              </p>
            </button>
          ))}
        </div>

        {/* Reading progress bar (local display only) */}
        <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={`text-xs font-bold text-slate-700 ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'পড়ার অগ্রগতি' : 'Reading progress'}
            </p>
            <p className="text-xs font-black tabular-nums text-orange-600">{progressPct}%</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Inline daily tip — no modal interrupt */}
        {tipVisible && dailyTip && (
          <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <p className={`text-[10px] font-bold text-orange-600 ${bn ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                {bn ? 'আজকের টিপ' : 'Today’s tip'}
              </p>
              <button
                type="button"
                onClick={dismissTip}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                aria-label={bn ? 'বন্ধ করুন' : 'Dismiss'}
              >
                {bn ? 'ঠিক আছে' : 'Got it'}
              </button>
            </div>
            <p className={`text-sm font-medium leading-relaxed text-slate-700 ${bn ? 'font-bengali' : ''}`}>
              {dailyTip}
            </p>
          </div>
        )}

        {/* Emergency + invite row */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => go('emergency')}
            className="flex items-center gap-2 rounded-2xl border border-red-200/90 bg-red-50 px-3 py-3 text-left transition-all active:scale-[0.99]"
          >
            <span className="text-lg" aria-hidden>
              🚨
            </span>
            <span className={`text-xs font-black text-red-800 ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'জরুরি' : 'Emergency'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(5);
              openLinemanInviteWhatsApp(language);
            }}
            className="flex items-center gap-2 rounded-2xl border border-emerald-200/90 bg-emerald-50 px-3 py-3 text-left transition-all active:scale-[0.99]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white" aria-hidden>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2a9.84 9.84 0 0 0-8.52 14.76L2 22l5.39-1.42A9.94 9.94 0 1 0 12.04 2Zm0 17.99a8.15 8.15 0 0 1-4.15-1.14l-.3-.18-3.2.84.85-3.12-.2-.32A8.15 8.15 0 1 1 12.04 20Zm4.47-6.1c-.24-.12-1.45-.72-1.68-.8-.22-.08-.38-.12-.55.12-.16.25-.63.8-.77.97-.14.16-.28.18-.53.06-.24-.12-1.03-.38-1.96-1.21a7.35 7.35 0 0 1-1.36-1.7c-.14-.24-.02-.37.1-.49.11-.11.25-.28.37-.42.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.3-.22.25-.85.83-.85 2.02s.87 2.34.99 2.5c.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.45-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28Z" />
              </svg>
            </span>
            <span className={`text-xs font-black text-emerald-800 ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'শেয়ার' : 'Invite'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
