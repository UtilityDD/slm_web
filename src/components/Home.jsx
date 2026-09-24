import React, { useEffect, useMemo, useState } from 'react';
import HomeSkeleton from './loaders/HomeSkeleton';
import { UserIcon } from './icons';
import { firstTimeReadingPointsFromLessons, getBadgeByLevel } from '../utils/badgeUtils';
import {
  filterCoreCompletedLessonIds,
  buildLifeSkillWaitingScores,
  buildCoreLessonWaitingScores,
} from '../utils/trainingLessonIds';
import { CORE_LESSON_MONTHLY_BONUS_ENABLED, CORE_LESSON_MONTHLY_BONUS_LAUNCH_ISO } from '../config';
import { isGuestUser } from '../utils/guestPreview';
import { supabase } from '../supabaseClient';
import { storageUtils } from '../utils/storageUtils';
import { requestManager } from '../utils/requestManager';
import {
  formatMakeupMaxPoints,
  HOURLY_POINTS_PER_PACK,
} from '../utils/hourlyMakeup';
import {
  countOpenCatchUpSlots,
  getLiveHourlySlot,
  listPlayableHourlySlots,
} from '../utils/hourlyWindow';
import { resolveHomeLearningTopic } from '../utils/homeLearningTopic';
import {
  dismissSleepNudge,
  shouldShowSleepNudge,
} from '../utils/hourlyNightWindow';
import HomePrimaryActionCards from './HomePrimaryActionCards';
import IdentifyScoreGiftFab from './IdentifyScoreGiftFab';
import LifeSkillWaitingBalloon from './LifeSkillWaitingBalloon';
import { canStartIdentifyReal, fetchIdentifyScoreStatus } from '../utils/identifyRealScore';
import { isIdentifyGiftInRewardWindow } from '../utils/identifyGiftSchedule';
import { prefetchIdentifyCatalog } from '../utils/quizImagePrefetch';
import { loadSupplementaryCompletedModuleIds } from '../utils/supplementaryProgressStorage';
import HomeTeamReminderCard from './HomeTeamReminderCard';
import HomeTipBoard from './HomeTipBoard';
import LanguageSwitch from './LanguageSwitch';
import { useCachedAvatar } from '../hooks/useCachedAvatar';
import { fetchContactPendingCount, canViewContactResponses, getCachedSheetContacts } from '../utils/landingContactAdmin';
import { openExternalUrl } from '../utils/nativeAndroidUx';

const FACEBOOK_PAGE_URL = 'https://www.facebook.com/smartlineman';
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t';

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
  onOpenUserGuide,
}) {
  const bn = language === 'bn';
  const isAdmin = userProfile?.role === 'admin';
  const isSafetyMitra = userProfile?.role === 'safety mitra';
  /** Admin only: always show Home gift for testing (0 points). Safety Mitra uses normal window. */
  const identifyGiftStaffPreview = isAdmin;
  const canViewResponses = canViewContactResponses(userProfile);
  const [loading, setLoading] = useState(!userProfile && !!user);
  const [homeTip, setHomeTip] = useState(null);
  const [tipBoardOpen, setTipBoardOpen] = useState(false);
  const [isHourlyPending, setIsHourlyPending] = useState(true);
  const [hourlyChecked, setHourlyChecked] = useState(false);
  const [hourlyMaxPoints, setHourlyMaxPoints] = useState(HOURLY_POINTS_PER_PACK);
  const [hourlyClockTick, setHourlyClockTick] = useState(0);
  const [sleepNudgeTick, setSleepNudgeTick] = useState(0);
  const [userRank, setUserRank] = useState(null);
  const [learningTopic, setLearningTopic] = useState(null);
  const [contactPending, setContactPending] = useState(0);
  const [contactPendingReady, setContactPendingReady] = useState(false);
  /** Home gift: can_play today AND inside personal reward window (admin always in-window). */
  const [identifyGiftEligible, setIdentifyGiftEligible] = useState(false);
  const [identifyGiftInWindow, setIdentifyGiftInWindow] = useState(false);
  const [lifeSkillWaitingCount, setLifeSkillWaitingCount] = useState(0);
  const [lessonWaitingCount, setLessonWaitingCount] = useState(0);
  const avatarSrc = useCachedAvatar(user?.id, userProfile?.avatar_url, !!userProfile);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || isGuestUser(userProfile)) {
      setIdentifyGiftEligible(false);
      return undefined;
    }
    if (identifyGiftStaffPreview) {
      setIdentifyGiftEligible(true);
      return undefined;
    }
    const refreshGate = async () => {
      // Cache-first: avoid a Home status RPC when session already knows today's gate.
      const status = await fetchIdentifyScoreStatus({ force: false, userId: user.id });
      if (cancelled) return;
      const gate = canStartIdentifyReal({ user, userProfile, status });
      setIdentifyGiftEligible(Boolean(gate.ok));
    };
    void refreshGate();
    return () => {
      cancelled = true;
    };
  }, [user?.id, userProfile, identifyGiftStaffPreview]);

  useEffect(() => {
    if (!user?.id || isGuestUser(userProfile)) {
      setIdentifyGiftInWindow(false);
      return undefined;
    }
    const tick = () => {
      setIdentifyGiftInWindow(
        isIdentifyGiftInRewardWindow({
          userId: user.id,
          forceAdmin: identifyGiftStaffPreview,
        })
      );
    };
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [user?.id, userProfile, identifyGiftStaffPreview]);

  useEffect(() => {
    const giftOn = Boolean(
      user?.id
      && !isGuestUser(userProfile)
      && (identifyGiftStaffPreview || (identifyGiftEligible && identifyGiftInWindow))
    );
    if (!giftOn) return;
    prefetchIdentifyCatalog();
  }, [user?.id, userProfile, identifyGiftStaffPreview, identifyGiftEligible, identifyGiftInWindow]);

  useEffect(() => {
    if (!user?.id || isGuestUser(userProfile)) {
      setLifeSkillWaitingCount(0);
      setLessonWaitingCount(0);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const completedIds = loadSupplementaryCompletedModuleIds(user.id);
      const coreDone = filterCoreCompletedLessonIds(
        Array.isArray(userProfile?.completed_lessons) ? userProfile.completed_lessons : []
      );
      let moduleIds = [];
      try {
        const res = await fetch('/data/supplementary_modules.json');
        if (res.ok) {
          const rows = await res.json();
          moduleIds = (Array.isArray(rows) ? rows : []).map((row) => row?.id).filter(Boolean);
        }
      } catch {
        moduleIds = [];
      }
      const [lsRes, lessonRes] = await Promise.all([
        supabase
          .from('quiz_attempts')
          .select('quiz_id, created_at, score')
          .eq('user_id', user.id)
          .like('quiz_id', 'life_skill_bonus_%'),
        CORE_LESSON_MONTHLY_BONUS_ENABLED
          ? supabase
              .from('quiz_attempts')
              .select('quiz_id, created_at')
              .eq('user_id', user.id)
              .like('quiz_id', 'lesson_bonus_%')
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (cancelled) return;
      if (lsRes.error) {
        console.warn('Life Skill waiting scores load failed:', lsRes.error);
      }
      if (lessonRes.error) {
        console.warn('Lesson waiting scores load failed:', lessonRes.error);
      }
      const ls = buildLifeSkillWaitingScores({
        moduleIds,
        attempts: lsRes.data || [],
        completedIds,
      });
      const lessons = CORE_LESSON_MONTHLY_BONUS_ENABLED
        ? buildCoreLessonWaitingScores({
            completedIds: coreDone,
            attempts: lessonRes.data || [],
            launchIso: CORE_LESSON_MONTHLY_BONUS_LAUNCH_ISO,
          })
        : { waitingCount: 0 };
      setLifeSkillWaitingCount(ls.waitingCount);
      setLessonWaitingCount(lessons.waitingCount);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, userProfile]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoading(false);
  }, [userProfile, user]);

  useEffect(() => {
    if (!canViewResponses) {
      setContactPending(0);
      setContactPendingReady(true);
      return undefined;
    }
    let cancelled = false;
    const cachedPending = getCachedSheetContacts()?.pending;
    if (cachedPending != null && Number.isFinite(cachedPending)) {
      setContactPending(cachedPending);
      setContactPendingReady(true);
    } else {
      setContactPendingReady(false);
    }
    fetchContactPendingCount()
      .then((n) => {
        if (!cancelled) {
          setContactPending(n);
          setContactPendingReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContactPendingReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canViewResponses]);

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

  // Green dot + +50 when this hour or a recent catch-up hour is still open.
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
        const live = getLiveHourlySlot();
        const quizId = live.quizId;
        const dayPrefix = `hourly-challenge-${String(live.year).padStart(4, '0')}-${String(live.month).padStart(2, '0')}-${String(live.day).padStart(2, '0')}-`;

        const result = await requestManager.fetch(
          `hourly_eligibility_${user.id}_${quizId}`,
          async () => {
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

            if (liveError) throw liveError;

            const livePending = (liveRows || []).length === 0;
            const playedIds = [];
            if (!dayError && Array.isArray(dayRows)) {
              dayRows.forEach((row) => {
                if (row?.quiz_id) playedIds.push(row.quiz_id);
              });
            }
            const lastNightIds = listPlayableHourlySlots([], Date.now())
              .filter((slot) => slot.isLastNight)
              .map((slot) => slot.quizId);
            if (lastNightIds.length > 0) {
              const { data: nightRows, error: nightError } = await supabase
                .from('quiz_attempts')
                .select('quiz_id')
                .eq('user_id', user.id)
                .in('quiz_id', lastNightIds);
              if (nightError) throw nightError;
              (nightRows || []).forEach((row) => {
                if (row?.quiz_id) playedIds.push(row.quiz_id);
              });
            }
            const catchUp = countOpenCatchUpSlots(playedIds);
            return { pending: livePending || catchUp > 0, playedIds };
          },
          { ttl: 1, swr: true, forceRefresh: true }
        );

        if (cancelled || !result) return;

        setIsHourlyPending(result.pending);
        setHourlyChecked(true);
        setHourlyMaxPoints(HOURLY_POINTS_PER_PACK);
      } catch (err) {
        console.error('Error checking hourly challenge:', err);
      }
    };

    checkHourlyEligibility();
    const intervalId = setInterval(checkHourlyEligibility, 5 * 60 * 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') checkHourlyEligibility();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVis);
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
    return filterCoreCompletedLessonIds(profileOrProp);
  }, [completedLessonsProp, userProfile?.completed_lessons]);

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

  const trainingLevel = userProfile?.training_level || 1;
  const badge = getBadgeByLevel(trainingLevel, firstTimeReadingPointsFromLessons(coreLessons));
  const badgeName = bn ? badge.bn : badge.en;
  const displayName =
    userProfile?.full_name && !userProfile.full_name.includes('@')
      ? userProfile.full_name.split(' ')[0]
      : bn
        ? 'বন্ধু'
        : 'Friend';

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
  const hourlyDone = hourlyChecked && !isHourlyPending;
  const hourlyHourLabel = useMemo(() => {
    void hourlyClockTick;
    return formatIstHourLabel();
  }, [hourlyClockTick]);
  const hourlyWaitMinutes = useMemo(() => {
    void hourlyClockTick;
    return minutesUntilNextIstHour();
  }, [hourlyClockTick]);
  const showSleepNudge = useMemo(() => {
    void hourlyClockTick;
    void sleepNudgeTick;
    return shouldShowSleepNudge();
  }, [hourlyClockTick, sleepNudgeTick]);

  const go = (view) => {
    if (navigator.vibrate) navigator.vibrate(5);
    setCurrentView(view);
  };

  if (loading) {
    return (
      <div className="home-screen min-h-full">
        <div className="mx-auto max-w-lg p-4">
          <HomeSkeleton />
        </div>
      </div>
    );
  }

  const iconClass = 'home-3d-tile__glyph';
  const adminCards = [
    ...(isAdmin || isSafetyMitra
      ? [
          {
            id: 'porichalona',
            tone: 'manage',
            label: bn ? 'পরিচালনা' : 'Manage',
            onClick: () => go('admin'),
            ariaLabel: bn ? 'পরিচালনা — ব্যবহারকারী ও বিজ্ঞপ্তি' : 'Manage users and notices',
            icon: (
              <svg className={iconClass} viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M4 18v-1.3c0-2.02 2.68-3.2 6-3.2.63 0 1.24.05 1.82.14C11.33 14.35 11 15.2 11 16.1c0 .69.16 1.34.44 1.91H4zM10 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm6.5 2c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5zm1.04 5.21-1.75-1.75.7-.7 1.05 1.04 2.21-2.21.71.71-2.92 2.91z"
                />
              </svg>
            ),
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: 'safety-culture',
            tone: 'survey',
            label: bn ? 'সংস্কৃতি জরিপ' : 'Culture survey',
            onClick: () => go('safety-culture-admin'),
            ariaLabel: bn ? 'নিরাপত্তা সংস্কৃতি জরিপ' : 'Safety culture survey',
            icon: (
              <svg className={iconClass} viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M19.2 3H4.8C3.8 3 3 3.8 3 4.8v14.4c0 1 .8 1.8 1.8 1.8h14.4c1 0 1.8-.8 1.8-1.8V4.8c0-1-.8-1.8-1.8-1.8z"
                />
                <path
                  fill="#fff"
                  d="m10.4 16.1-4.15-4.15 1.25-1.25 2.9 2.9 6.1-6.1 1.25 1.25-7.35 7.35z"
                />
              </svg>
            ),
          },
        ]
      : []),
    ...(canViewResponses
      ? [
          {
            id: 'contact-responses',
            tone: 'contact',
            label: 'Contact Us',
            onClick: () => go('contact-responses'),
            ariaLabel: 'Contact Us',
            badge: contactPending > 0 ? contactPending : null,
            badgeLoading: !contactPendingReady,
            icon: (
              <svg className={iconClass} viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"
                />
              </svg>
            ),
          },
        ]
      : []),
  ];
  const workCards = [
    {
      id: 'sobai-firo',
      label: bn ? '৮ মন্ত্র' : '8 Mantra',
      onClick: () => go('sops'),
      ariaLabel: bn ? '৮ মন্ত্র — কাজের আগে আট কথা' : '8 Mantra — eight beats before work',
      icon: (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
          />
          <path
            fill="#fff"
            d="M12 7.1c-1.22 0-2.2.9-2.2 2.05 0 .72.38 1.34.96 1.7-.78.4-1.31 1.18-1.31 2.1 0 1.32 1.12 2.4 2.55 2.4s2.55-1.08 2.55-2.4c0-.92-.53-1.7-1.31-2.1.58-.36.96-.98.96-1.7 0-1.15-.98-2.05-2.2-2.05zm0 1.4c.42 0 .75.32.75.7 0 .39-.33.7-.75.7s-.75-.31-.75-.7c0-.38.33-.7.75-.7zm0 4.35c.55 0 1 .43 1 .98s-.45.97-1 .97-1-.42-1-.97.45-.98 1-.98z"
          />
        </svg>
      ),
    },
    {
      id: 'more',
      label: bn ? 'আরও' : 'More',
      onClick: () => go('menu'),
      ariaLabel: bn ? 'আরও' : 'More',
      icon: (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M13 13v8h8v-8h-8zM3 21h8v-8H3v8zM3 3v8h8V3H3zm13.66-1.31L11 7.34 16.66 13l5.66-5.66-5.66-5.65z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className={`home-screen min-h-full pb-28 text-slate-900 ${bn ? 'home-screen--bn' : ''}`}>

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
        <header className="home-greet home-greet--tight">
          <div className="home-greet__copy">
            <h1 className={`home-greet__name ${bn ? 'font-bengali' : ''}`}>
              <span className="home-greet__hello">{bn ? 'নমস্কার' : 'Hello'}, </span>
              {displayName}
            </h1>
            <p className={`home-greet__meta ${bn ? 'font-bengali' : ''}`}>
              <span>{badgeName}</span>
              <span className="home-greet__dot" aria-hidden>
                ·
              </span>
              <span className="home-greet__score">
                <span aria-hidden>★</span>
                {scoreDisplay}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => go('admin')}
            className="home-greet__avatar"
            aria-label={bn ? 'প্রোফাইল' : 'Profile'}
          >
            <span className="home-greet__photo">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" decoding="async" />
              ) : (
                <span className="home-greet__photo-fallback">
                  <UserIcon className="h-full w-full" />
                </span>
              )}
            </span>
          </button>
        </header>

        {/* Field tip — fixed display board for this visit; tap opens full board */}
        {homeTip?.text && (
          <button
            type="button"
            onClick={() => setTipBoardOpen(true)}
            className="home-tip-board home-tip-board--card mb-2 w-full text-left"
            aria-label={bn ? 'টিপ দেখুন' : 'View tip'}
          >
            <div className="home-tip-board__inner">
              <p
                className={`home-tip-board__text line-clamp-2 ${bn ? 'font-bengali' : ''}`}
              >
                {homeTip.text}
              </p>
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

        <div className="home-3d-board">
          <HomePrimaryActionCards
            bn={bn}
            hourlyDone={hourlyDone}
            hourLabel={hourlyHourLabel}
            pointsLabel={formatMakeupMaxPoints(hourlyMaxPoints)}
            waitMinutes={hourlyWaitMinutes}
            onHourlyClick={() => go('competitions')}
            onLearningClick={openLearningCard}
            showSleepNudge={showSleepNudge}
            onDismissSleepNudge={() => {
              dismissSleepNudge();
              setSleepNudgeTick((n) => n + 1);
            }}
          />
          <div className="home-3d-row">
            {workCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={card.onClick}
                aria-label={card.ariaLabel || card.label}
                className={`home-3d-tile home-3d-tile--${card.id === 'sobai-firo' ? 'safe' : 'folder'}`}
              >
                <span className="home-3d-tile__icon" aria-hidden>
                  {card.icon}
                </span>
                <span className={`home-3d-tile__label ${bn ? 'font-bengali' : ''}`}>
                  {card.label}
                </span>
              </button>
            ))}
          </div>
          {user?.id && !isGuestUser(userProfile) ? (
            <IdentifyScoreGiftFab
              language={language}
              alwaysShow={identifyGiftStaffPreview}
              eligible={identifyGiftStaffPreview || (identifyGiftEligible && identifyGiftInWindow)}
              visible
              onOpen={() => go('safety-library')}
            />
          ) : null}
          {user?.id && !isGuestUser(userProfile) ? (
            <LifeSkillWaitingBalloon
              language={language}
              lifeSkillCount={lifeSkillWaitingCount}
              lessonCount={lessonWaitingCount}
              alwaysShow={isAdmin}
              sleepCover={showSleepNudge && !isAdmin}
              onOpenLessons={() => {
                window.location.hash = '/training';
              }}
              onOpenLifeSkill={() => {
                window.location.hash = '/training?tab=supplementary';
              }}
            />
          ) : null}
        </div>

        {isAdmin || isSafetyMitra ? (
          <section
            className="more-staff"
            aria-label={bn ? 'অ্যাডমিন / সেফটি মিত্র' : 'Admin / Safety Mitra'}
          >
            <h2 className={`more-staff__title ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'অ্যাডমিন / সেফটি মিত্র' : 'Admin / Safety Mitra'}
            </h2>
            {adminCards.length > 0 ? (
              <div className="more-3d-list more-staff__list">
                {adminCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={card.onClick}
                    aria-label={card.ariaLabel || card.label}
                    className={`home-3d-tile more-3d-tile home-3d-tile--${card.tone || 'manage'}`}
                  >
                    <span className="home-3d-tile__icon" aria-hidden>
                      {card.icon}
                      {card.badgeLoading ? (
                        <span className="home-3d-tile__badge is-loading" />
                      ) : card.badge ? (
                        <span className="home-3d-tile__badge">
                          {card.badge > 99 ? '99+' : card.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className={`home-3d-tile__label ${bn ? 'font-bengali' : ''}`}>
                      {card.label}
                    </span>
                    <svg className="more-3d-tile__go" viewBox="0 0 24 24" aria-hidden>
                      <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                ))}
              </div>
            ) : null}
            {user?.id ? (
              <div className="more-staff__extra">
                <HomeTeamReminderCard userId={user.id} role={userProfile.role} language={language} />
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="home-connect">
          <div className="home-connect__row">
            <button
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                void openExternalUrl(FACEBOOK_PAGE_URL);
              }}
              aria-label={bn ? 'ফেসবুক পেজ' : 'Facebook Page'}
              className="home-connect__btn home-connect__btn--fb"
            >
              <span className="home-connect__icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
                </svg>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                void openExternalUrl(WHATSAPP_GROUP_URL);
              }}
              aria-label={bn ? 'হোয়াটসঅ্যাপ গ্রুপ' : 'WhatsApp Group'}
              className="home-connect__btn home-connect__btn--wa"
            >
              <span className="home-connect__icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </span>
            </button>
            <LanguageSwitch language={language} onChange={onLanguageChange} />
          </div>
        </div>

      </div>
    </div>
  );
}
