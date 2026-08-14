import React, { useEffect, useMemo, useState } from 'react';
import HomeSkeleton from './loaders/HomeSkeleton';
import { UserIcon } from './icons';
import { getBadgeByLevel } from '../utils/badgeUtils';
import { mergeCoreLessonProgressIds } from '../utils/trainingLessonIds';
import { openLinemanInviteWhatsApp } from '../utils/linemanInviteShare';
import { isGuestUser } from '../utils/guestPreview';
import { openExternalUrl } from '../utils/nativeAndroidUx';
import { supabase } from '../supabaseClient';
import { storageUtils } from '../utils/storageUtils';
import { requestManager } from '../utils/requestManager';
import {
  buildMakeupSession,
  countRecentMissedHours,
  formatMakeupMaxPoints,
  HOURLY_POINTS_PER_PACK,
} from '../utils/hourlyMakeup';
import { FAQ_PAGE_TITLE } from '../utils/faqFilters';
import { resolveHomeLearningTopic } from '../utils/homeLearningTopic';
import HomePrimaryActionCards from './HomePrimaryActionCards';
import HomeTipBoard from './HomeTipBoard';
import { useCachedAvatar } from '../hooks/useCachedAvatar';

/** Approximate core lesson count from training chapter defaults (display only). */
const APPROX_CORE_LESSON_TOTAL = 91;
const LAST_TIP_INDEX_KEY = 'slm_home_tip_last_index';
/** Current IST hourly quiz start hour, e.g. "2PM" (English digits always). */
function formatIstHourLabel() {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const hour24 = now.getUTCHours();
  const start12 = hour24 % 12 || 12;
  const startAmPm = hour24 < 12 ? 'AM' : 'PM';
  return `${start12}${startAmPm}`;
}

/** Minutes left until the next IST clock hour (at least 1 while still in this hour). */
function minutesUntilNextIstHour() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const msIntoHour =
    ((ist.getUTCMinutes() * 60 + ist.getUTCSeconds()) * 1000) + ist.getUTCMilliseconds();
  const msLeft = 60 * 60 * 1000 - msIntoHour;
  if (msLeft <= 0) return 1;
  return Math.max(1, Math.ceil(msLeft / 60000));
}

function normalizeHomeTip(tip) {
  if (!tip) return null;
  if (typeof tip === 'string') {
    const text = tip.trim();
    return text ? { text } : null;
  }
  if (typeof tip === 'object') {
    const text = String(tip.text || tip.rule || '').trim();
    return text ? { text } : null;
  }
  return null;
}

function pickRandomTipIndex(rulesLength, lastIndex) {
  if (rulesLength <= 0) return -1;
  if (rulesLength === 1) return 0;

  let nextIndex = Math.floor(Math.random() * rulesLength);
  if (Number.isFinite(lastIndex) && rulesLength > 1) {
    let guard = 0;
    while (nextIndex === lastIndex && guard < 8) {
      nextIndex = Math.floor(Math.random() * rulesLength);
      guard += 1;
    }
  }
  return nextIndex;
}

function readLastTipIndex() {
  try {
    const raw = localStorage.getItem(LAST_TIP_INDEX_KEY);
    if (raw != null) return Number.parseInt(raw, 10);
  } catch {
    // ignore
  }
  return -1;
}

function writeLastTipIndex(index) {
  try {
    localStorage.setItem(LAST_TIP_INDEX_KEY, String(index));
  } catch {
    // ignore
  }
}

export default function Home({
  setCurrentView,
  language,
  onLanguageChange,
  user,
  userProfile,
  completedLessons: completedLessonsProp,
  cultureSurveyPending = false,
}) {
  const bn = language === 'bn';
  const isAdmin = userProfile?.role === 'admin';
  const [loading, setLoading] = useState(!userProfile && !!user);
  const [homeTip, setHomeTip] = useState(null);
  const [tipBoardOpen, setTipBoardOpen] = useState(false);
  const [isHourlyPending, setIsHourlyPending] = useState(true);
  const [hourlyChecked, setHourlyChecked] = useState(false);
  const [hourlyMaxPoints, setHourlyMaxPoints] = useState(HOURLY_POINTS_PER_PACK);
  const [hourlyClockTick, setHourlyClockTick] = useState(0);
  const [lessonBonusAttempts, setLessonBonusAttempts] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [learningTopic, setLearningTopic] = useState(null);
  const avatarSrc = useCachedAvatar(user?.id, userProfile?.avatar_url, !!userProfile);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoading(false);
  }, [userProfile, user]);

  // Match Rank/Training/PPE: keep cream chrome while Home is open (desktop defaults to html.dark).
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark');

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const previousThemeColor = metaThemeColor?.getAttribute('content') || null;
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', '#fffdf7');

    return () => {
      const savedTheme = storageUtils.getItem('appTheme') || 'dark';
      if (savedTheme === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      if (previousThemeColor) {
        metaThemeColor.setAttribute('content', previousThemeColor);
      }
    };
  }, []);

  // Warm tip-board art while Home is open so tap opens instantly.
  useEffect(() => {
    const img = new Image();
    img.decoding = 'async';
    img.src = '/images/home-tip-lineman-blank-board.webp';
  }, []);

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

  // One fixed tip per Home visit — no auto-rotate while staying on the page.
  useEffect(() => {
    let cancelled = false;

    const fallback = normalizeHomeTip(
      bn
        ? 'যেকোনো কন্ডাক্টর স্পর্শ করার আগে সর্বদা ভোল্টেজ পরীক্ষা করুন।'
        : 'Always test for voltage before touching any conductor.'
    );

    const loadTip = async () => {
      try {
        const fileName = bn ? 'carousol.json' : 'carousol_en.json';
        const response = await fetch(`/quizzes/${fileName}`);
        const data = await response.json();
        const rules = Array.isArray(data.rules) ? data.rules : [];
        const nextIndex = pickRandomTipIndex(rules.length, readLastTipIndex());
        const tip = nextIndex >= 0 ? normalizeHomeTip(rules[nextIndex]) : null;

        if (cancelled) return;
        if (nextIndex >= 0) writeLastTipIndex(nextIndex);
        setHomeTip(tip || fallback);
      } catch {
        if (cancelled) return;
        setHomeTip(fallback);
      }
    };

    loadTip();
    return () => {
      cancelled = true;
    };
  }, [bn]);

  // Keep the hourly CTA clock label in sync with IST (and when tab becomes visible).
  useEffect(() => {
    const bump = () => setHourlyClockTick((n) => n + 1);
    const id = window.setInterval(bump, 30000);
    document.addEventListener('visibilitychange', bump);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', bump);
    };
  }, []);

  // Green dot + max points (+50 / +100 / …) when this hour's quiz is still open.
  useEffect(() => {
    if (!user?.id) {
      setIsHourlyPending(false);
      setHourlyChecked(false);
      setHourlyMaxPoints(HOURLY_POINTS_PER_PACK);
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
        const currentHour = now.getUTCHours();
        const hour = String(currentHour).padStart(2, '0');
        const quizId = `hourly-challenge-${year}-${month}-${day}-${hour}`;
        const dayPrefix = `hourly-challenge-${year}-${month}-${day}-`;

        const [{ data: liveRows, error: liveError }, { data: dayRows, error: dayError }] = await Promise.all([
          supabase
            .from('quiz_attempts')
            .select('id')
            .eq('user_id', user.id)
            .eq('quiz_id', quizId)
            .limit(1),
          supabase
            .from('quiz_attempts')
            .select('quiz_id')
            .eq('user_id', user.id)
            .like('quiz_id', `${dayPrefix}%`),
        ]);

        if (cancelled || liveError) return;

        const pending = (liveRows || []).length === 0;
        setIsHourlyPending(pending);
        setHourlyChecked(true);

        if (!pending) {
          setHourlyMaxPoints(HOURLY_POINTS_PER_PACK);
          return;
        }

        const playedHours = new Set();
        if (!dayError && Array.isArray(dayRows)) {
          dayRows.forEach((row) => {
            const h = parseInt(String(row.quiz_id).split('-').pop(), 10);
            if (!Number.isNaN(h)) playedHours.add(h);
          });
        }
        const makeup = buildMakeupSession(countRecentMissedHours(currentHour, playedHours));
        setHourlyMaxPoints(makeup.pointsReward);
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

  // Lightweight all-time rank for the Home header.
  useEffect(() => {
    if (!user?.id || isGuestUser(userProfile)) {
      setUserRank(null);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const rankData = await requestManager.fetch(
          `user_rank_all_time_${user.id}`,
          async () => {
            const { data: myData, error: myError } = await supabase
              .from('leaderboard_view')
              .select('score, reading_points')
              .eq('user_id', user.id)
              .maybeSingle();

            if (myError || !myData) return null;

            const myScoreValue = myData.score ?? 0;
            const { count, error: countError } = await supabase
              .from('leaderboard_view')
              .select('*', { count: 'exact', head: true })
              .gt('score', myScoreValue);

            if (countError) throw countError;

            return {
              rank: count + 1,
              score: myScoreValue,
            };
          },
          { ttl: 5, swr: true }
        );
        if (!cancelled) setUserRank(rankData || null);
      } catch (err) {
        console.warn('Home rank fetch failed:', err);
        if (!cancelled) setUserRank(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, userProfile]);

  const coreLessons = useMemo(() => {
    const fromProp = Array.isArray(completedLessonsProp) ? completedLessonsProp : [];
    const fromProfile = Array.isArray(userProfile?.completed_lessons)
      ? userProfile.completed_lessons
      : [];
    const profileOrProp = fromProp.length >= fromProfile.length ? fromProp : fromProfile;
    return mergeCoreLessonProgressIds(profileOrProp, lessonBonusAttempts);
  }, [completedLessonsProp, userProfile?.completed_lessons, lessonBonusAttempts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const topic = await resolveHomeLearningTopic({
          completedLessons: coreLessons,
          language,
          userId: user?.id || null,
        });
        if (!cancelled) setLearningTopic(topic);
      } catch (err) {
        console.warn('Home learning topic resolve failed:', err);
        if (!cancelled) {
          setLearningTopic({
            mode: 'fallback',
            title: null,
            target: 'training',
            lessonId: null,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coreLessons, language, user?.id]);

  const lessonCount = coreLessons.length;
  const progressPct = Math.min(100, Math.round((lessonCount / APPROX_CORE_LESSON_TOTAL) * 100));
  const trainingLevel = userProfile?.training_level || 1;
  const badge = getBadgeByLevel(trainingLevel, userProfile?.reading_points || 0);
  const badgeName = bn ? badge.bn : badge.en;
  const displayName =
    userProfile?.full_name && !userProfile.full_name.includes('@')
      ? userProfile.full_name.split(' ')[0]
      : bn
        ? 'বন্ধু'
        : 'Friend';

  const hasStarted = lessonCount > 0;
  const allCoreDone = learningTopic?.mode === 'daily';
  const trainingLabel =
    hasStarted || allCoreDone
      ? bn
        ? 'শিখতে থাকুন'
        : 'Continue Training'
      : bn
        ? 'শিখা শুরু করুন'
        : 'Start Training';
  const topicTitle = String(learningTopic?.title || '').trim();
  const topicPrefix = bn ? 'আজকের বিষয়:' : "Today's topic:";
  const trainingHintFallback = hasStarted
    ? bn
      ? `${lessonCount} পাঠ · Lv ${trainingLevel}`
      : `${lessonCount} lessons · Lv ${trainingLevel}`
    : bn
      ? '৯০ দিনের নিরাপত্তা পাঠ'
      : '90-day safety path';

  const openLearningCard = () => {
    if (navigator.vibrate) navigator.vibrate(5);
    const target = learningTopic?.target || 'training';
    if (target === 'life-skill') {
      window.location.hash = '/training?tab=supplementary';
      return;
    }
    if (target === 'aro-janun') {
      setCurrentView('aro-janun');
      return;
    }
    setCurrentView('training');
  };

  const scoreValue = Math.max(0, Number(userProfile?.points ?? userRank?.score ?? 0) || 0);
  const scoreDisplay = scoreValue.toLocaleString('en-IN');
  const rankDisplay = userRank?.rank != null ? `#${userRank.rank}` : null;
  const hourlyDone = hourlyChecked && !isHourlyPending;
  const hourlyHourLabel = useMemo(() => {
    void hourlyClockTick;
    return formatIstHourLabel();
  }, [hourlyClockTick]);
  const hourlyWaitMinutes = useMemo(() => {
    void hourlyClockTick;
    return minutesUntilNextIstHour();
  }, [hourlyClockTick]);

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

  const iconClass = 'h-5 w-5';
  const snapshotCards = [
    ...(isAdmin
      ? [
          {
            id: 'porichalona',
            label: bn ? 'পরিচালনা' : 'Manage',
            value: null,
            onClick: () => go('admin'),
            accent: 'border-purple-200 bg-purple-50/80 text-purple-950',
            iconWrap: 'bg-white/80 text-purple-700 border-purple-200/70',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ),
            ariaLabel: bn ? 'পরিচালনা — ব্যবহারকারী ও বিজ্ঞপ্তি' : 'Manage users and notices',
          },
          {
            id: 'safety-culture',
            label: bn ? 'সংস্কৃতি জরিপ' : 'Culture survey',
            value: null,
            onClick: () => go('safety-culture-admin'),
            accent: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
            iconWrap: 'bg-white/80 text-emerald-700 border-emerald-200/70',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            ),
            ariaLabel: bn ? 'নিরাপত্তা সংস্কৃতি জরিপ' : 'Safety culture survey',
          },
        ]
      : []),
    {
      id: 'progress',
      label: bn ? 'অগ্রগতি' : 'Progress',
      value: `${progressPct}%`,
      onClick: () => go('my-progress'),
      accent: 'border-teal-200 bg-teal-50/80 text-teal-900',
      iconWrap: 'bg-white/80 text-teal-600 border-teal-200/70',
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
      value: rankDisplay || (bn ? 'দেখুন' : 'View'),
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
      id: 'my-ppe',
      label: bn ? 'আমার পিপিই' : 'My PPE',
      value: null,
      onClick: () => go('my_ppe'),
      accent: 'border-orange-200 bg-orange-50/80 text-orange-900',
      iconWrap: 'bg-white/80 text-orange-600 border-orange-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M2 18h20" />
          <path d="M4 18v-3a8 8 0 0 1 16 0v3" />
          <path d="M12 5v3" />
          <path d="M9 18v2" />
          <path d="M15 18v2" />
        </svg>
      ),
      ariaLabel: bn ? 'আমার পিপিই' : 'My PPE',
    },
    {
      id: 'safety-library',
      label: bn ? 'চিনুন' : 'Identify',
      value: null,
      onClick: () => go('safety-library'),
      accent: 'border-indigo-200 bg-indigo-50/80 text-indigo-900',
      iconWrap: 'bg-white/80 text-indigo-600 border-indigo-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
      ),
      ariaLabel: bn ? 'চিনুন' : 'Identify',
    },
    {
      id: 'life-skill',
      label: bn ? 'লাইফ স্কিল' : 'Life Skill',
      value: null,
      onClick: () => {
        if (navigator.vibrate) navigator.vibrate(5);
        window.location.hash = '/training?tab=supplementary';
      },
      accent: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
      iconWrap: 'bg-white/80 text-emerald-600 border-emerald-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M12 3l1.8 5.5H20l-4.5 3.4 1.7 5.6L12 14.8 6.8 17.5l1.7-5.6L4 8.5h6.2L12 3Z" />
        </svg>
      ),
      ariaLabel: bn ? 'লাইফ স্কিল' : 'Life Skill',
    },
    {
      id: 'prizes',
      label: bn ? 'পুরস্কার' : 'Prizes',
      value: null,
      onClick: () => go('prizes'),
      accent: 'border-rose-200 bg-rose-50/80 text-rose-900',
      iconWrap: 'bg-white/80 text-rose-600 border-rose-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M20 12v10H4V12" />
          <path d="M2 7h20v5H2Z" />
          <path d="M12 22V7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" />
        </svg>
      ),
    },
    {
      id: 'video',
      label: bn ? 'ভিডিও' : 'Video',
      value: null,
      onClick: () => go('video-guide'),
      accent: 'border-sky-200 bg-sky-50/80 text-sky-900',
      iconWrap: 'bg-white/80 text-sky-600 border-sky-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      id: 'faq',
      label: bn ? 'কি কেন' : 'FAQ',
      value: null,
      onClick: () => {
        if (navigator.vibrate) navigator.vibrate(5);
        window.location.hash = '/training?tab=faq';
      },
      accent: 'border-yellow-200 bg-yellow-50/80 text-yellow-950',
      iconWrap: 'bg-white/80 text-amber-600 border-yellow-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      ),
      ariaLabel: bn ? FAQ_PAGE_TITLE.bn : FAQ_PAGE_TITLE.en,
    },
    {
      id: 'know-more',
      label: bn ? 'জানুন' : 'Know',
      value: null,
      onClick: () => go('aro-janun'),
      accent: 'border-violet-200 bg-violet-50/80 text-violet-900',
      iconWrap: 'bg-white/80 text-violet-600 border-violet-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
        </svg>
      ),
      ariaLabel: bn ? 'আরো জানুন' : 'Know More',
    },
    {
      id: 'more',
      label: bn ? 'আরও' : 'More',
      value: null,
      onClick: () => go('menu'),
      accent: 'border-slate-200 bg-slate-50/90 text-slate-800',
      iconWrap: 'bg-white/80 text-slate-600 border-slate-200/70',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`min-h-full bg-[#fffdf7] pb-28 text-slate-900 ${bn ? 'home-screen--bn' : ''}`}>

      <div className="mx-auto max-w-lg px-4 pt-4 sm:pt-5">
        {cultureSurveyPending && (
          <button
            type="button"
            onClick={() => go('safety-culture-survey')}
            className="mb-3 w-full rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-left shadow-sm active:scale-[0.99]"
          >
            <p className={`font-bold text-teal-900 ${bn ? 'font-bengali text-sm' : 'text-sm'}`}>
              {bn ? 'নিরাপত্তা সংস্কৃতি জরিপ' : 'Safety culture survey'}
            </p>
            <p className={`mt-1 text-teal-800/90 ${bn ? 'font-bengali text-xs' : 'text-xs'}`}>
              {bn
                ? 'হোমের যেকোনো মেনুতে ট্যাপ করলে জরিপে যাবেন। সৎভাবে শেষ করুন—পরেরবার ৯০ দিন পর।'
                : 'Any Home tap opens the survey. Finish honestly—next one after 90 days.'}
            </p>
          </button>
        )}
        <header className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-slate-500 ${bn ? 'font-bengali text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
              {bn ? 'নমস্কার' : 'Hello'}
            </p>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <h1 className={`min-w-0 truncate font-black leading-tight text-slate-900 ${bn ? 'font-bengali text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
                {displayName}
              </h1>
              <span
                className={`home-level-badge inline-flex shrink-0 items-center justify-center rounded-full px-2 font-black ${badge.color} ${bn ? 'home-level-badge--bn font-bengali' : 'py-0.5 text-[10px] uppercase leading-none tracking-wide sm:text-[11px]'}`}
              >
                <span className={bn ? 'home-level-badge__label' : undefined}>{badgeName}</span>
              </span>
            </div>
            <div className={`mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-slate-600 ${bn ? 'font-bengali text-sm' : 'text-xs'}`}>
              <button
                type="button"
                onClick={() => go('leaderboard')}
                className="inline-flex min-w-0 items-center gap-1 font-bold text-amber-800 transition-colors hover:text-amber-950 active:scale-[0.98]"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 6H5.5a2 2 0 0 0 0 4H7M17 6h1.5a2 2 0 0 1 0 4H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="truncate">{rankDisplay || (bn ? 'র‍্যাঙ্ক' : 'Rank')}</span>
              </button>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1 font-bold tabular-nums text-orange-800">
                <span className="text-amber-500" aria-hidden>
                  ★
                </span>
                {scoreDisplay}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => go('admin')}
            className="relative shrink-0 rounded-full transition-transform active:scale-95"
            aria-label={bn ? 'প্রোফাইল' : 'Profile'}
          >
            <div className="flex h-[4.75rem] w-[4.75rem] items-center justify-center overflow-hidden rounded-full border border-orange-200/80 bg-orange-400 text-slate-900 shadow-sm sm:h-[5.25rem] sm:w-[5.25rem]">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" decoding="async" />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-3.5 text-slate-900">
                  <UserIcon className="h-full w-full" />
                </div>
              )}
            </div>
            <span
              className="absolute bottom-0.5 left-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#fffdf7] bg-emerald-500"
              aria-hidden
            />
          </button>
        </header>

        {/* Field tip — fixed display board for this visit; tap opens full board */}
        {homeTip?.text && (
          <button
            type="button"
            onClick={() => setTipBoardOpen(true)}
            className="home-tip-board home-tip-board--card mb-4 w-full text-left sm:mb-5"
            aria-label={bn ? 'টিপ দেখুন' : 'View tip'}
          >
            <div className="home-tip-board__inner">
              <p
                className={`home-tip-board__text line-clamp-3 ${bn ? 'font-bengali' : ''}`}
              >
                {homeTip.text}
              </p>
              <span className={`home-tip-board__hint ${bn ? 'font-bengali' : ''}`}>
                {bn ? 'ট্যাপ করুন' : 'Tap to view'}
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </button>
        )}

        {tipBoardOpen && homeTip?.text && (
          <HomeTipBoard
            text={homeTip.text}
            language={language}
            onClose={() => setTipBoardOpen(false)}
          />
        )}

        <HomePrimaryActionCards
          bn={bn}
          hourlyDone={hourlyDone}
          hourLabel={hourlyHourLabel}
          pointsLabel={formatMakeupMaxPoints(hourlyMaxPoints)}
          waitMinutes={hourlyWaitMinutes}
          learningLabel={trainingLabel}
          topicPrefix={topicPrefix}
          topicTitle={topicTitle}
          hintFallback={trainingHintFallback}
          onHourlyClick={() => go('competitions')}
          onLearningClick={openLearningCard}
        />

        {/* Shortcuts — old compact tiles in 2 columns */}
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-5 sm:gap-3">
          {snapshotCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={card.onClick}
              aria-label={card.ariaLabel || card.label}
              className={`flex items-center gap-3 rounded-2xl border text-left shadow-sm transition-all active:scale-[0.99] ${card.accent} ${bn ? 'px-3 py-3' : 'px-3 py-2.5'}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${card.iconWrap}`}
                aria-hidden
              >
                {card.icon}
              </span>
              <span className="min-w-0 flex-1">
                <p className={`leading-snug ${bn ? 'font-bengali font-bold text-[15px]' : 'font-black text-sm'}`}>
                  {card.label}
                </p>
                {card.value ? (
                  <p className={`mt-0.5 tabular-nums opacity-75 ${bn ? 'font-bengali font-bold text-xs' : 'font-bold text-[11px]'}`}>
                    {card.value}
                  </p>
                ) : null}
              </span>
            </button>
          ))}
        </div>

        {/* Progress detail — desktop / larger phones only */}
        <div className="mb-4 hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm sm:mb-5 sm:block">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={`font-bold text-slate-700 ${bn ? 'font-bengali text-sm' : 'text-xs'}`}>
              {bn ? 'পড়ার অগ্রগতি' : 'Reading progress'}
            </p>
            <p className={`font-black tabular-nums text-orange-600 ${bn ? 'text-sm' : 'text-xs'}`}>{progressPct}%</p>
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
            <span className={`font-black text-red-800 ${bn ? 'font-bengali text-sm' : 'text-xs'}`}>
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
            <span className={`font-black text-emerald-800 ${bn ? 'font-bengali text-sm' : 'text-xs'}`}>
              {bn ? 'শেয়ার' : 'Invite'}
            </span>
          </button>
        </div>

        {/* Simple footer — language + Facebook (not shortcut cards) */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 border-t border-slate-200/70 pt-4">
          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(5);
              onLanguageChange?.(bn ? 'en' : 'bn');
            }}
            aria-label={bn ? 'ভাষা পরিবর্তন' : 'Change language'}
            title={bn ? 'ভাষা' : 'Language'}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3.5 text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            <span className="flex items-baseline gap-px font-black leading-none" aria-hidden>
              <span className={`text-[13px] ${!bn ? 'text-orange-600' : 'text-slate-400'}`}>A</span>
              <span className={`font-bengali text-[13px] ${bn ? 'text-orange-600' : 'text-slate-400'}`}>অ</span>
            </span>
            <span className={`text-xs font-bold ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'বাংলা' : 'English'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(5);
              void openExternalUrl('https://www.facebook.com/smartlineman');
            }}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3.5 text-sm font-bold text-[#1877F2] shadow-sm transition-all hover:bg-blue-50 active:scale-[0.98] ${bn ? 'font-bengali' : ''}`}
          >
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
            </svg>
            <span>{bn ? 'ফেসবুক' : 'Facebook'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(5);
              setCurrentView('amader-kotha');
            }}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-orange-200/90 bg-orange-50 px-3.5 text-sm font-bold text-orange-800 shadow-sm transition-all hover:bg-orange-100 active:scale-[0.98] ${bn ? 'font-bengali' : ''}`}
            aria-label={bn ? 'আমাদের কথা' : 'Our Story'}
          >
            <span aria-hidden>📖</span>
            <span>{bn ? 'আমাদের কথা' : 'Our Story'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
