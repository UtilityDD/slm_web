import React, { useEffect, useMemo, useState } from 'react';
import HomeSkeleton from './loaders/HomeSkeleton';
import { UserIcon } from './icons';
import { getBadgeByLevel } from '../utils/badgeUtils';
import { mergeCoreLessonProgressIds } from '../utils/trainingLessonIds';
import { openLinemanInviteWhatsApp } from '../utils/linemanInviteShare';
import { supabase } from '../supabaseClient';
import { requestManager } from '../utils/requestManager';

/** Approximate core lesson count from training chapter defaults (display only). */
const APPROX_CORE_LESSON_TOTAL = 91;
const LAST_TIP_INDEX_KEY = 'slm_home_tip_last_index';

function pickRandomTip(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return '';
  if (rules.length === 1) return rules[0];

  let lastIndex = -1;
  try {
    const raw = localStorage.getItem(LAST_TIP_INDEX_KEY);
    if (raw != null) lastIndex = Number.parseInt(raw, 10);
  } catch {
    // ignore
  }

  let nextIndex = Math.floor(Math.random() * rules.length);
  if (Number.isFinite(lastIndex) && rules.length > 1) {
    let guard = 0;
    while (nextIndex === lastIndex && guard < 6) {
      nextIndex = Math.floor(Math.random() * rules.length);
      guard += 1;
    }
  }

  try {
    localStorage.setItem(LAST_TIP_INDEX_KEY, String(nextIndex));
  } catch {
    // ignore
  }

  return rules[nextIndex];
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
  const [homeTip, setHomeTip] = useState('');
  const [isHourlyPending, setIsHourlyPending] = useState(false);
  const [lessonBonusAttempts, setLessonBonusAttempts] = useState([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoading(false);
  }, [userProfile, user]);

  // Same source as My Progress: profiles.completed_lessons ∪ lesson_bonus_* awards.
  useEffect(() => {
    if (!user?.id) {
      setLessonBonusAttempts([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const attempts = await requestManager.fetch(
          `my_progress_attempts_${user.id}`,
          async () => {
            const { data, error } = await supabase
              .from('quiz_attempts')
              .select('quiz_id, score, penalty, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
          },
          { ttl: 5, swr: true }
        );
        if (!cancelled) setLessonBonusAttempts(Array.isArray(attempts) ? attempts : []);
      } catch (err) {
        console.warn('Home lesson progress fetch failed:', err);
        if (!cancelled) setLessonBonusAttempts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadTip = async () => {
      const fallback = bn
        ? 'যেকোনো কন্ডাক্টর স্পর্শ করার আগে সর্বদা ভোল্টেজ পরীক্ষা করুন।'
        : 'Always test for voltage before touching any conductor.';

      try {
        const response = await fetch('/quizzes/carousol.json');
        const data = await response.json();
        const rules = data.rules || [];
        const tip = pickRandomTip(rules) || fallback;
        if (!cancelled) setHomeTip(tip);
      } catch {
        if (!cancelled) setHomeTip(fallback);
      }
    };

    loadTip();
    return () => {
      cancelled = true;
    };
  }, [bn]);

  // Same read-only check as Training: green dot when this hour's quiz is still available.
  useEffect(() => {
    if (!user?.id) {
      setIsHourlyPending(false);
      return undefined;
    }

    let cancelled = false;
    const checkHourlyEligibility = async () => {
      try {
        const nowRaw = new Date();
        const now = new Date(nowRaw.getTime() + (5.5 * 60 * 60 * 1000));
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hour = String(now.getUTCHours()).padStart(2, '0');
        const quizId = `hourly-challenge-${year}-${month}-${day}-${hour}`;

        const { data, error } = await supabase
          .from('quiz_attempts')
          .select('id')
          .eq('user_id', user.id)
          .eq('quiz_id', quizId)
          .limit(1);

        if (!cancelled && !error) {
          setIsHourlyPending((data || []).length === 0);
        }
      } catch (err) {
        console.error('Error checking hourly challenge:', err);
      }
    };

    checkHourlyEligibility();
    const intervalId = setInterval(checkHourlyEligibility, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user?.id]);

  const coreLessons = useMemo(() => {
    const fromProp = Array.isArray(completedLessonsProp) ? completedLessonsProp : [];
    const fromProfile = Array.isArray(userProfile?.completed_lessons)
      ? userProfile.completed_lessons
      : [];
    const profileOrProp = fromProp.length >= fromProfile.length ? fromProp : fromProfile;
    return mergeCoreLessonProgressIds(profileOrProp, lessonBonusAttempts);
  }, [completedLessonsProp, userProfile?.completed_lessons, lessonBonusAttempts]);

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
  const primaryLabel = hasStarted
    ? bn
      ? 'প্রশিক্ষণ চালিয়ে যান'
      : 'Continue Training'
    : bn
      ? 'প্রশিক্ষণ শুরু করুন'
      : 'Start Training';
  const primaryHint = hasStarted
    ? bn
      ? `${lessonCount} পাঠ · Lv ${trainingLevel}`
      : `${lessonCount} lessons · Lv ${trainingLevel}`
    : bn
      ? '৯০ দিনের নিরাপত্তা পাঠ'
      : '90-day safety path';

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
      label: bn ? 'পিপিই' : 'PPE',
      value: bn ? 'সুরক্ষা' : 'Safety',
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

      <div className="mx-auto max-w-lg px-4 pt-4 sm:pt-5">
        <header className="mb-4 flex items-center gap-3 sm:mb-5">
          <button
            type="button"
            onClick={() => go('admin')}
            className="relative shrink-0 rounded-full transition-transform active:scale-95"
            aria-label={bn ? 'প্রোফাইল' : 'Profile'}
          >
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-orange-200/80 bg-orange-400 text-slate-900 shadow-sm sm:h-12 sm:w-12">
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
            <h1 className={`truncate text-xl font-black leading-tight text-slate-900 sm:text-2xl ${bn ? 'font-bengali' : ''}`}>
              {bn ? `নমস্কার, ${displayName}` : `Hello, ${displayName}`}
            </h1>
            <p className={`mt-0.5 hidden text-sm font-medium text-slate-600 sm:block ${bn ? 'font-bengali' : ''}`}>
              {bn
                ? `${badge.bn} · একটা ধাপ এগোন—পড়ুন বা খেলুন।`
                : `${badge.en} · One clear next step—read or play.`}
            </p>
          </div>
        </header>

        {/* Safety tip — attention-first, random each visit */}
        {homeTip && (
          <div className="home-safety-tip mb-4 rounded-2xl border border-orange-200/90 bg-gradient-to-br from-orange-50 via-amber-50/80 to-white px-3.5 py-3.5 shadow-sm sm:mb-5 sm:px-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-orange-600" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </span>
              <p className={`text-[10px] font-bold text-orange-700 ${bn ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                {bn ? 'সুরক্ষা টিপ' : 'Safety tip'}
              </p>
            </div>
            <p className="font-bengali text-sm font-semibold leading-relaxed text-slate-800 sm:text-[15px]">
              {homeTip}
            </p>
          </div>
        )}

        {/* Primary next action */}
        <button
          type="button"
          onClick={() => go('training')}
          className="mb-2.5 flex w-full items-center gap-3 rounded-2xl border border-orange-300/80 bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-3.5 text-left text-white shadow-md shadow-orange-600/25 transition-all hover:shadow-lg active:scale-[0.99] sm:mb-3 sm:py-4"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/20 sm:h-11 sm:w-11"
            aria-hidden
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-[15px] font-black leading-tight sm:text-base ${bn ? 'font-bengali' : ''}`}>
              {primaryLabel}
            </span>
            <span className={`mt-0.5 hidden text-[11px] font-semibold text-orange-50/95 sm:block ${bn ? 'font-bengali' : ''}`}>
              {primaryHint}
            </span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Secondary: play quiz */}
        <button
          type="button"
          onClick={() => go('competitions')}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50/40 active:scale-[0.99] sm:mb-5 sm:py-3.5"
        >
          <span
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-700 sm:h-10 sm:w-10"
            aria-hidden
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isHourlyPending && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-full w-full rounded-full border border-white bg-emerald-500 shadow-sm" />
              </span>
            )}
          </span>
          <span className={`min-w-0 flex-1 text-sm font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}>
            {bn ? 'ঘণ্টার কুইজ' : 'Hourly quiz'}
          </span>
          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Snapshots — icon + short value only on mobile */}
        <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-5 sm:gap-2.5">
          {snapshotCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={card.onClick}
              className={`flex flex-col items-center rounded-2xl border px-2 py-2.5 text-center shadow-sm transition-all active:scale-[0.98] sm:items-start sm:px-2.5 sm:py-3 sm:text-left ${card.accent}`}
            >
              <span
                className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full border ${card.iconWrap}`}
                aria-hidden
              >
                {card.icon}
              </span>
              <p className={`hidden text-[10px] font-bold opacity-80 sm:block ${bn ? 'font-bengali' : 'uppercase tracking-wide'}`}>
                {card.label}
              </p>
              <p className={`mt-0.5 text-sm font-black tabular-nums leading-none sm:mt-1 sm:text-lg ${bn ? 'font-bengali' : ''}`}>
                <span className="sm:hidden">{card.id === 'progress' ? card.value : card.label}</span>
                <span className="hidden sm:inline">{card.value}</span>
              </p>
            </button>
          ))}
        </div>

        {/* Progress detail — desktop / larger phones only */}
        <div className="mb-4 hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm sm:mb-5 sm:block">
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

        {/* Emergency + invite */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => go('emergency')}
            className="flex items-center justify-center gap-2 rounded-2xl border border-red-200/90 bg-red-50 px-3 py-3 transition-all active:scale-[0.99] sm:justify-start"
            aria-label={bn ? 'জরুরি' : 'Emergency'}
          >
            <span className="text-lg leading-none" aria-hidden>
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
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200/90 bg-emerald-50 px-3 py-3 transition-all active:scale-[0.99] sm:justify-start"
            aria-label={bn ? 'শেয়ার' : 'Invite'}
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
