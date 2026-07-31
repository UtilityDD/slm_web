import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { requestManager } from '../utils/requestManager';
import { leaderboardService } from '../utils/leaderboardService';
import { storageUtils } from '../utils/storageUtils';
import LandingPrizeCarousel from './LandingPrizeCarousel';
import LandingSponsorsScroll from './LandingSponsorsScroll';
import LandingSupportContact from './LandingSupportContact';
import LandingVisitCounter from './LandingVisitCounter';
import LandingNonprofitLineman from './LandingNonprofitLineman';
import PwaInstallFab from './PwaInstallFab';
import { fetchVisitCount } from '../utils/landingVisitService';
import { fetchRegisteredUserCount } from '../utils/landingStatsService';

/** Community proof figures shown on landing (marketing display). */
const LANDING_MEMBERS_DISPLAY = 500;
const LANDING_SAFETY_MITRA_DISPLAY = 20;

const copy = {
  en: {
    heroTitle: 'Learn while you play',
    heroSubtitle: 'From ordinary to smart',
    visionTitle: 'Our Vision',
    vision:
      'Every lineman works with confidence and modern safety knowledge—reducing field accidents and protecting families.',
    missionTitle: 'Our Mission',
    mission: '90 days of simple training, quizzes, contests, prizes, and recognition.',
    nonprofitTitle: '100% non-profit · volunteer-run',
    nonprofitBody: 'SmartLineman is built and run by volunteers—no profit motive, only safer work for linemen.',
    statsMembers: 'Members',
    statsSafetyMitra: 'Safety Mitra',
    monthToppersTitle: 'This month’s leaders',
    podiumOpenSlot: 'Your spot awaits',
    podiumOpenHint: 'Keep learning',
    sponsorsTitle: 'Our sponsors',
    engageSupportBtn: 'How can you support us?',
    engageContactBtn: 'Contact us',
    joinCta: 'Join',
    login: 'Login',
    language: 'Language',
    loading: 'Loading…',
    pts: 'pts',
    followFacebook: 'Follow on Facebook',
    visitLabel: 'Visit:',
  },
  bn: {
    heroTitle: 'খেলতে খেলতে শিখুন',
    heroSubtitle: 'সাধারণ থেকে স্মার্ট হয়ে উঠুন',
    visionTitle: 'আমাদের স্বপ্ন',
    vision:
      'আমরা চাই, প্রতিটি লাইনম্যান আত্মবিশ্বাস ও সঠিক নিরাপত্তা জ্ঞান নিয়ে মাঠে নিরাপদে কাজ করতে পারেন। দুর্ঘটনা কমবে, পরিবারও নিশ্চিন্ত থাকবে।',
    missionTitle: 'আমরা যা করি',
    mission: '৯০ দিনের সহজ প্রশিক্ষণ, কুইজ, প্রতিযোগিতা, পুরস্কার আর স্বীকৃতি।',
    nonprofitTitle: 'অলাভজনক উদ্যোগ · স্বেচ্ছাসেবীদের তৈরি',
    nonprofitBody:
      'স্মার্ট লাইনম্যান গড়ে তুলেছেন স্বেচ্ছাসেবীরাই। এখানে লাভের হিসাব নেই—আছে শুধু লাইনম্যানদের নিরাপদ কাজের অঙ্গীকার।',
    statsMembers: 'সদস্য',
    statsSafetyMitra: 'সেফটি মিত্র',
    monthToppersTitle: 'এই মাসের সেরা তিনজন',
    podiumOpenSlot: 'এখানে আপনার নাম হতে পারে',
    podiumOpenHint: 'শিখতে থাকুন, এগিয়ে যান',
    sponsorsTitle: 'যাঁরা পাশে দাঁড়িয়েছেন',
    engageSupportBtn: 'কীভাবে সাহায্য করবেন?',
    engageContactBtn: 'যোগাযোগ করুন',
    joinCta: 'যোগ দিন',
    login: 'লগ ইন করুন',
    language: 'ভাষা',
    loading: 'একটু অপেক্ষা করুন…',
    pts: 'পয়েন্ট',
    followFacebook: 'ফেসবুকে আমাদের সঙ্গে থাকুন',
    visitLabel: 'মোট ভিজিট',
  },
};

function formatCount(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k+`;
  return String(n);
}

const LANDING_ICON_PATHS = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  userPlus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M12 8v13" />
      <path d="M3 12h18" />
      <path d="M12 8c-2-3-6-3-6 0s4 3 6 0z" />
      <path d="M12 8c2-3 6-3 6 0s-4 3-6 0z" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 4H4.5a2.5 2.5 0 0 0 0 5H7" />
      <path d="M17 4h2.5a2.5 2.5 0 0 1 0 5H17" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="m5.6 5.6 1.4 1.4" />
      <path d="m17 17 1.4 1.4" />
      <path d="m18.4 5.6-1.4 1.4" />
      <path d="m7 17-1.4 1.4" />
      <path d="M12 8l1.2 3.6L17 12l-3.8 1.2L12 17l-1.2-3.8L7 12l3.8-1.2L12 8z" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  headphones: (
    <>
      <path d="M3 14h2.5a2 2 0 0 0 2-2V9a7 7 0 0 1 14 0v3a2 2 0 0 0 2 2H21" />
      <path d="M3 14a2 2 0 0 0 2 2h1v-4H3z" />
      <path d="M21 14a2 2 0 0 1-2 2h-1v-4h3z" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.5" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5" />
    </>
  ),
};

function getMonthToppersSubtitle(language) {
  const now = new Date();
  const day = now.getDate();
  if (language === 'bn') {
    const bnMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
    ];
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const formatBnNum = (num) => String(num).split('').map((d) => bnDigits[Number(d)] || d).join('');
    return `${bnMonths[now.getMonth()]} মাস · ${formatBnNum(day)} তারিখ পর্যন্ত`;
  }
  const monthName = now.toLocaleString('en', { month: 'long' });
  return `${monthName} · as of day ${day}`;
}

function LandingIcon({ name, className = 'w-5 h-5', strokeWidth = 1.75 }) {
  const paths = LANDING_ICON_PATHS[name];
  if (!paths) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

const ICON_TONES = {
  orange: 'bg-orange-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-400',
  cyan: 'bg-cyan-500',
  indigo: 'bg-indigo-600',
  violet: 'bg-violet-600',
};

function SectionIconBadge({ name, tone = 'orange', className = '' }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm sm:h-11 sm:w-11 ${ICON_TONES[tone] || ICON_TONES.orange} ${className}`}
    >
      <LandingIcon name={name} className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={2} />
    </div>
  );
}

function AnimatedNumber({ value, loading }) {
  const [display, setDisplay] = useState(0);
  const target = typeof value === 'number' && !Number.isNaN(value) ? value : 0;

  useEffect(() => {
    if (loading) return;
    if (target === 0) {
      setDisplay(0);
      return;
    }
    const duration = 900;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, loading]);

  if (loading) {
    return <span className="inline-block h-6 w-12 animate-pulse rounded-md bg-slate-200/80 sm:h-7 sm:w-14" />;
  }
  return <span>{formatCount(display)}</span>;
}

function mapLandingPlayer(row) {
  return {
    id: row.user_id || row.id || row.name,
    name: row.full_name || row.name || '—',
    points: Number(row.points ?? row.score) || 0,
    district: row.district || '',
    avatarUrl: row.avatar_url || row.profile_image_url || row.photo_url || '',
  };
}

function MonthToppers({
  title,
  subtitle,
  players,
  ptsLabel,
  bnFont,
  fillTo = 3,
  emptyTitle = '',
  emptyHint = '',
}) {
  const realPlayers = players || [];
  if (!realPlayers.length) return null;

  const slots = Array.from({ length: Math.max(realPlayers.length, fillTo) }, (_, idx) => realPlayers[idx] || null);
  // Visual podium order on all sizes: 2nd · 1st · 3rd (champion stays center)
  const podiumOrder = slots.length === 3 ? ['order-2', 'order-1', 'order-3'] : ['', '', ''];

  return (
    <section className="landing-month-toppers relative z-10 mb-8 sm:mb-10">
      <div className="mb-5 text-center sm:mb-6">
        <h2 className={`text-lg font-black tracking-tight text-slate-900 sm:text-xl ${bnFont ? 'font-bengali' : ''}`}>
          {title}
        </h2>
        {subtitle && (
          <p className={`mt-1 text-xs font-semibold text-slate-500 sm:text-sm ${bnFont ? 'font-bengali' : ''}`}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="landing-month-toppers__row">
        {slots.map((player, rankIdx) => {
          const isEmpty = !player;
          const isFirst = rankIdx === 0 && !isEmpty;
          return (
            <div
              key={isEmpty ? `empty-${rankIdx}` : `${player.id}-${rankIdx}`}
              className={`landing-month-topper ${isFirst ? 'landing-month-topper--champ' : ''} ${isEmpty ? 'landing-month-topper--empty' : ''} ${podiumOrder[rankIdx] || ''}`}
              aria-label={isEmpty ? emptyTitle : undefined}
            >
              <div className="relative mx-auto shrink-0">
                {isEmpty ? (
                  <div className="landing-podium-avatar landing-podium-avatar--empty landing-month-topper__avatar flex items-center justify-center text-3xl font-black text-slate-300">
                    ?
                  </div>
                ) : player.avatarUrl ? (
                  <img
                    src={player.avatarUrl}
                    alt={player.name}
                    className={`landing-podium-avatar landing-month-topper__avatar object-cover ${isFirst ? 'landing-podium-avatar--champ' : ''}`}
                  />
                ) : (
                  <div className={`landing-podium-avatar landing-month-topper__avatar flex items-center justify-center text-2xl font-black sm:text-3xl ${isFirst ? 'bg-amber-400 text-slate-900 landing-podium-avatar--champ' : 'bg-white text-slate-700'}`}>
                    {(player.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className={`landing-podium-rank absolute -bottom-0.5 -right-0.5 inline-flex h-7 w-7 items-center justify-center text-xs font-black sm:h-8 sm:w-8 sm:text-sm ${
                    isEmpty ? 'landing-podium-rank--empty' : ''
                  }`}
                  data-rank={rankIdx}
                >
                  {bnFont ? ['১', '২', '৩'][rankIdx] : rankIdx + 1}
                </span>
              </div>

              <div className="mt-3 min-w-0 w-full space-y-0.5 text-center">
                {isEmpty ? (
                  <>
                    <p className={`truncate text-sm font-bold text-slate-400 ${bnFont ? 'font-bengali' : ''}`}>{emptyTitle || '?'}</p>
                    <p className={`truncate text-[11px] font-medium text-slate-400/90 ${bnFont ? 'font-bengali' : ''}`}>{emptyHint || ''}</p>
                  </>
                ) : (
                  <>
                    <p className={`landing-month-topper__name font-black text-slate-900 ${bnFont ? 'font-bengali' : ''}`}>{player.name}</p>
                    <p className="text-xs font-bold tabular-nums text-orange-700 sm:text-sm">
                      {player.points} <span className="font-semibold text-orange-600/80">{ptsLabel}</span>
                    </p>
                    {player.district && (
                      <p className={`truncate text-[11px] font-medium text-slate-500 ${bnFont ? 'font-bengali' : ''}`}>{player.district}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SlimStat({ label, value, suffix = '', loading, bnFont }) {
  return (
    <div className="landing-slim-stat">
      <p className="text-xl font-black leading-none tabular-nums text-slate-900 sm:text-2xl">
        <AnimatedNumber value={value} loading={loading} />
        {!loading && suffix ? <span>{suffix}</span> : null}
      </p>
      <p className={`mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11px] ${bnFont ? 'font-bengali tracking-normal' : ''}`}>
        {label}
      </p>
    </div>
  );
}

export default function Landing({ language, onLanguageChange, setCurrentView, onInstallModalOpenChange }) {
  const t = copy[language] || copy.en;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    thisMonthTop: [],
    prizesCount: 0,
    prizeMonths: 0,
    hallOfFameData: [],
  });
  const [visitCount, setVisitCount] = useState(null);
  const [visitLoading, setVisitLoading] = useState(true);
  const contactFormRef = useRef(null);

  // Landing is always shown in light theme, regardless of global app theme.
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
    metaThemeColor.setAttribute('content', '#f8fafc');

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

  useEffect(() => {
    let cancelled = false;
    setVisitLoading(true);
    fetchVisitCount()
      .then((count) => {
        if (!cancelled) {
          setVisitCount(count);
          setVisitLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setVisitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (visitCount != null || visitLoading || !stats.users) return;
    let cancelled = false;
    fetchVisitCount({ registeredUsers: stats.users })
      .then((count) => {
        if (!cancelled && count != null) setVisitCount(count);
      });
    return () => {
      cancelled = true;
    };
  }, [stats.users, visitCount, visitLoading]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      try {
        const [profilesResult, monthlyLeaderboard, hallOfFame] = await Promise.all([
          requestManager.fetch(
            'landing_registered_count_v1',
            async () => {
              const users = await fetchRegisteredUserCount(supabase);
              return { users };
            },
            { ttl: 2, swr: false }
          ),
          leaderboardService.fetchMonthly(false).catch(() => []),
          leaderboardService.fetchHallOfFame(false).catch(() => []),
        ]);

        const thisMonthTopThree = (monthlyLeaderboard || []).slice(0, 3).map(mapLandingPlayer);

        let prizesCount = 0;
        let prizeMonths = 0;
        if (Array.isArray(hallOfFame)) {
          prizeMonths = hallOfFame.length;
          prizesCount = hallOfFame.reduce((acc, month) => {
            if (month.prizeWinners?.winners?.length) {
              return acc + month.prizeWinners.winners.length;
            }
            if (month.boards) {
              return acc + Object.values(month.boards).reduce(
                (s, arr) => s + (arr?.filter((w) => w.prize_rank != null && w.prize_status !== 'superseded').length || 0),
                0
              );
            }
            return acc + (month.winners?.length || 0);
          }, 0);
        }

        if (!cancelled) {
          setStats({
            users: profilesResult?.users ?? 0,
            thisMonthTop: thisMonthTopThree,
            prizesCount,
            prizeMonths,
            hallOfFameData: Array.isArray(hallOfFame) ? hallOfFame : [],
          });
        }
      } catch (err) {
        console.warn('Landing stats fetch failed:', err);
        if (!cancelled) {
          setStats((prev) => ({ ...prev, thisMonthTop: [] }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [language]);

  // Refresh registered count when user returns to the tab (avoids stale landing stats).
  useEffect(() => {
    const refreshCount = () => {
      if (document.visibilityState !== 'visible') return;
      fetchRegisteredUserCount(supabase)
        .then((users) => {
          setStats((prev) => (prev.users === users ? prev : { ...prev, users }));
        })
        .catch(() => {});
    };
    document.addEventListener('visibilitychange', refreshCount);
    return () => document.removeEventListener('visibilitychange', refreshCount);
  }, []);

  const bnFont = language === 'bn';

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    const scroller = document.getElementById('main-scroll-container');
    if (!section) return;
    const headerOffset = 72;
    if (scroller) {
      const top =
        section.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        headerOffset;
      scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      return;
    }
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={`landing-page-light landing-modern min-h-full bg-[#fffdf7] text-slate-900 pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))] sm:pb-16 ${bnFont ? 'lang-bn' : 'font-sans'}`}
    >
      <div
        className="h-1 w-full shrink-0 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
        aria-hidden="true"
      />

      {/* Top bar */}
      <div className="landing-header-bar sticky top-0 z-20 safe-area-inset-top">
        <div className="mx-auto max-w-5xl px-3 sm:px-6">
          <div className="flex h-12 items-center justify-between gap-2 sm:h-14 sm:gap-3">
            <div className="flex min-w-0 select-none items-baseline gap-1.5">
              <span className="truncate text-sm font-black tracking-tight text-slate-900 sm:text-xl">SmartLineMan</span>
              <span className="shrink-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[8px] font-black text-white shadow-sm sm:text-[10px]">.in</span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <div
                className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-100/90 p-0.5 text-[9px] font-semibold shadow-sm sm:text-[10px]"
                role="group"
                aria-label={t.language}
              >
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`min-h-[28px] min-w-[28px] rounded-full px-2 py-0.5 touch-manipulation transition-all active:scale-95 sm:min-h-0 sm:min-w-0 sm:px-2.5 ${language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('bn')}
                  className={`min-h-[28px] min-w-[28px] rounded-full px-2 py-0.5 touch-manipulation transition-all active:scale-95 sm:min-h-0 sm:min-w-0 sm:px-2.5 ${language === 'bn' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  বাং
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="inline-flex min-h-[32px] items-center rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-orange-500/25 touch-manipulation transition-all active:scale-95 sm:hidden"
              >
                {t.login}
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="hidden items-center rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-95 sm:inline-flex"
              >
                {t.login}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-5xl px-3 pb-8 sm:px-6 sm:pb-16">

        {/* Hero Section */}
        <section className="relative z-10 mx-auto max-w-3xl pt-7 pb-8 text-center sm:pt-14 sm:pb-10">
          <div className="landing-hero-glow" aria-hidden="true" />
          <p className="landing-hero-brand mb-5 sm:mb-7">
            SmartLineMan<span className="landing-hero-brand-tld">.in</span>
          </p>
          <h1
            className={`landing-hero-lockup ${bnFont ? 'landing-bn-ui' : ''}`}
            aria-label={language === 'bn' ? 'খেলতে খেলতে শিখুন' : 'Learn while you play'}
          >
            <span className="landing-hero-lockup__stack">
              <span className="landing-hero-lockup__line">
                {language === 'bn' ? 'খেলতে' : 'Play'}
              </span>
              <span className="landing-hero-lockup__line">
                {language === 'bn' ? 'খেলতে' : 'Play'}
              </span>
            </span>
            <span className="landing-hero-lockup__rule" aria-hidden="true" />
            <span className="landing-hero-lockup__side">
              {language === 'bn' ? 'শিখুন' : 'Learn'}
            </span>
          </h1>
          <p className={`landing-hero-sub ${bnFont ? 'landing-bn-ui' : ''}`}>
            {language === 'bn' ? (
              <>
                সাধারণ থেকে <span className="landing-hero-accent">স্মার্ট</span> হয়ে উঠুন
              </>
            ) : (
              <>
                From ordinary to <span className="landing-hero-accent">smart</span>
              </>
            )}
          </p>
          <div className="landing-join-block">
            <button
              type="button"
              onClick={() => contactFormRef.current?.openWithTopic('join')}
              className="landing-join-cta touch-manipulation"
            >
              <span className={bnFont ? 'landing-bn-ui' : ''}>{t.joinCta}</span>
              <svg
                className="landing-join-cta__tap"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M10 10V4.5a1.75 1.75 0 0 1 3.5 0V12" />
                <path d="M13.5 10.5a1.75 1.75 0 0 1 3.5 0V12" />
                <path d="M17 11a1.75 1.75 0 0 1 3.5 0v4a6.5 6.5 0 0 1-6.5 6.5h-1.5a6 6 0 0 1-4.24-1.76l-3.6-3.6a1.75 1.75 0 0 1 2.48-2.48L10 15.5" />
              </svg>
            </button>
          </div>
        </section>

        {/* Non-profit / volunteer highlight */}
        <aside className="landing-nonprofit-strip relative z-20 mb-6 sm:mb-8" aria-label={t.nonprofitTitle}>
          <LandingNonprofitLineman />
          <SectionIconBadge name="sparkles" tone="emerald" className="relative z-[1] h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
          <div className="relative z-[1] min-w-0">
            <p className={`text-sm font-black leading-snug text-slate-900 sm:text-base ${bnFont ? 'font-bengali' : ''}`}>
              {t.nonprofitTitle}
            </p>
            <p className={`mt-0.5 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm ${bnFont ? 'font-bengali landing-bn-reading' : ''}`}>
              {t.nonprofitBody}
            </p>
          </div>
        </aside>

        {/* Vision & Mission — near top */}
        <section className="relative z-10 mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:gap-5 md:grid-cols-2">
          <article className="landing-vm-card landing-vm-card--vision relative">
            <SectionIconBadge name="eye" tone="amber" className="mb-3 sm:mb-4" />
            <h2 className={`mb-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl ${bnFont ? 'font-bengali' : ''}`}>{t.visionTitle}</h2>
            <p className={`text-sm font-medium leading-relaxed text-slate-700 sm:text-base ${bnFont ? 'landing-bn-reading' : ''}`}>{t.vision}</p>
          </article>

          <article className="landing-vm-card landing-vm-card--mission">
            <SectionIconBadge name="target" tone="cyan" className="mb-3 sm:mb-4" />
            <h2 className={`mb-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl ${bnFont ? 'font-bengali' : ''}`}>{t.missionTitle}</h2>
            <p className={`text-sm font-medium leading-relaxed text-slate-700 sm:text-base ${bnFont ? 'landing-bn-reading' : ''}`}>{t.mission}</p>
          </article>
        </section>

        {/* Community proof strip */}
        <section className="landing-slim-stats relative z-10 mb-8 sm:mb-10" aria-label={language === 'bn' ? 'আমাদের কমিউনিটি' : 'Community'}>
          <SlimStat
            label={t.statsMembers}
            value={LANDING_MEMBERS_DISPLAY}
            suffix="+"
            loading={false}
            bnFont={bnFont}
          />
          <span className="landing-slim-stats__divider" aria-hidden />
          <SlimStat
            label={t.statsSafetyMitra}
            value={LANDING_SAFETY_MITRA_DISPLAY}
            suffix="+"
            loading={false}
            bnFont={bnFont}
          />
        </section>

        <MonthToppers
          title={t.monthToppersTitle}
          subtitle={getMonthToppersSubtitle(language)}
          players={stats.thisMonthTop}
          ptsLabel={t.pts}
          bnFont={bnFont}
          fillTo={3}
          emptyTitle={t.podiumOpenSlot}
          emptyHint={t.podiumOpenHint}
        />

        <LandingPrizeCarousel
          language={language}
          hallOfFameData={stats.hallOfFameData}
          loading={loading}
        />

        <LandingSponsorsScroll language={language} title={t.sponsorsTitle} />

        <div className="landing-engage-ctas relative z-10 mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={() => scrollToSection('support')}
            className="landing-engage-cta landing-engage-cta--support touch-manipulation"
          >
            <span className={bnFont ? 'font-bengali' : ''}>{t.engageSupportBtn}</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('contact')}
            className="landing-engage-cta landing-engage-cta--contact touch-manipulation"
          >
            <span className={bnFont ? 'font-bengali' : ''}>{t.engageContactBtn}</span>
          </button>
        </div>

        <LandingSupportContact ref={contactFormRef} language={language} />

        {(visitLoading || visitCount != null) && (
          <div className="hidden sm:flex justify-center mt-10 sm:mt-12">
            <LandingVisitCounter
              value={visitCount ?? 0}
              loading={visitLoading}
              label={t.visitLabel}
              className={bnFont ? 'font-bengali' : 'font-mono'}
            />
          </div>
        )}

        <footer className="flex justify-center py-6 sm:py-8 mt-6 sm:mt-10">
          <a
            href="https://www.facebook.com/smartlineman"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-facebook-link inline-flex items-center justify-center gap-2.5 min-h-[44px] px-5 py-2.5 touch-manipulation"
          >
            <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
            </svg>
            <span className={`text-sm font-bold ${bnFont ? 'font-bengali' : 'uppercase tracking-wide'}`}>
              {t.followFacebook}
            </span>
          </a>
        </footer>
      </div>

      {/* Mobile sticky visit counter + Login CTA */}
      <div className="landing-sticky-cta fixed inset-x-0 bottom-0 z-30 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
        {(visitLoading || visitCount != null) && (
          <div className="mb-2 flex justify-center">
            <LandingVisitCounter
              value={visitCount ?? 0}
              loading={visitLoading}
              label={t.visitLabel}
              className={bnFont ? 'font-bengali' : 'font-mono'}
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setCurrentView('login')}
          className="min-h-[52px] w-full rounded-full bg-orange-500 py-3.5 text-base font-black text-white shadow-lg shadow-orange-500/30 touch-manipulation transition-all active:scale-[0.98]"
        >
          {t.login}
        </button>
      </div>

      <PwaInstallFab
        language={language}
        aboveStickyCta
        onOpenChange={onInstallModalOpenChange}
      />
    </div>
  );
}
