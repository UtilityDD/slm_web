import React, { useState, useEffect, useRef } from 'react';
import { storageUtils } from '../utils/storageUtils';
import LandingPrizeCarousel from './LandingPrizeCarousel';
import LandingSupportContact from './LandingSupportContact';
import LandingVisitCounter from './LandingVisitCounter';
import LandingNonprofitLineman from './LandingNonprofitLineman';
import LandingPromoPeek from './LandingPromoPeek';
import { fetchVisitCount } from '../utils/landingVisitService';
import { isNativeCapacitorPlatform } from '../utils/webPush';
import { ANDROID_DOWNLOAD_PAGE_URL } from '../config';

/** Community proof figures shown on landing (marketing display). */
const LANDING_MEMBERS_DISPLAY = 500;
const LANDING_SAFETY_MITRA_DISPLAY = 20;

const copy = {
  en: {
    heroTitle: 'Learn while you play',
    heroSubtitle: 'From ordinary to smart',
    visionTitle: 'Our Vision',
    vision: 'Confident, safer work for every lineman—and peace of mind for families.',
    missionTitle: 'Our Mission',
    mission: '90 days of training, quizzes, contests, prizes, and recognition.',
    nonprofitTitle: '100% non-profit · volunteer-run',
    statsMembers: 'Members',
    statsSafetyMitra: 'Safety Mitra',
    viewLeaderboard: "See this month's toppers",
    advertiseChip: 'Advertise with us',
    engageSupportBtn: 'How can you support us?',
    engageContactBtn: 'Contact us',
    joinCta: 'Join',
    login: 'Login',
    downloadAndroid: 'Download Android App',
    language: 'Language',
    loading: 'Loading…',
    followFacebook: 'Follow on Facebook',
    visitLabel: 'Visit:',
  },
  bn: {
    heroTitle: 'খেলতে খেলতে শিখুন',
    heroSubtitle: 'সাধারণ থেকে স্মার্ট হয়ে উঠুন',
    visionTitle: 'আমাদের স্বপ্ন',
    vision: 'প্রতিটি লাইনম্যান নিরাপদে কাজ করুক—পরিবারও নিশ্চিন্ত থাকুক।',
    missionTitle: 'আমরা যা করি',
    mission: '৯০ দিনের প্রশিক্ষণ, কুইজ, প্রতিযোগিতা, পুরস্কার ও স্বীকৃতি।',
    nonprofitTitle: 'অলাভজনক উদ্যোগ · স্বেচ্ছাসেবীদের তৈরি',
    statsMembers: 'সদস্য',
    statsSafetyMitra: 'সেফটি মিত্র',
    viewLeaderboard: 'এই মাসের সেরাদের দেখুন',
    advertiseChip: 'বিজ্ঞাপন দিন',
    engageSupportBtn: 'কীভাবে সাহায্য করবেন?',
    engageContactBtn: 'যোগাযোগ করুন',
    joinCta: 'যোগ দিন',
    login: 'লগ ইন',
    downloadAndroid: 'অ্যান্ড্রয়েড অ্যাপ ডাউনলোড',
    language: 'ভাষা',
    loading: 'একটু অপেক্ষা করুন…',
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

function LandingLangToggle({ language, onLanguageChange, ariaLabel, compact = false }) {
  return (
    <div
      className={`landing-lang-toggle${compact ? ' landing-lang-toggle--compact' : ''}`}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={() => onLanguageChange('en')}
        className={`landing-lang-toggle__btn${language === 'en' ? ' is-active' : ''}`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onLanguageChange('bn')}
        className={`landing-lang-toggle__btn landing-lang-toggle__btn--bn font-bengali${language === 'bn' ? ' is-active' : ''}`}
        aria-pressed={language === 'bn'}
      >
        {compact ? 'বাং' : 'বাংলা'}
      </button>
    </div>
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

export default function Landing({ language, onLanguageChange, setCurrentView, motionReady = true }) {
  const t = copy[language] || copy.en;
  const [visitCount, setVisitCount] = useState(null);
  const [visitLoading, setVisitLoading] = useState(true);
  const [headerAway, setHeaderAway] = useState(false);
  const contactFormRef = useRef(null);
  // Native cold start: skip simultaneous hero entrance animations under the splash fade.
  const calmEntrance = isNativeCapacitorPlatform();
  const [ambientOn, setAmbientOn] = useState(!calmEntrance);

  useEffect(() => {
    if (!calmEntrance) {
      setAmbientOn(true);
      return undefined;
    }
    if (!motionReady) {
      setAmbientOn(false);
      return undefined;
    }
    const t = window.setTimeout(() => setAmbientOn(true), 700);
    return () => window.clearTimeout(t);
  }, [calmEntrance, motionReady]);

  // Transparent sticky bar: hide after leaving the top. Do not re-show on
  // mid-page scroll-up (that reintroduces overlap over content). Reveal only
  // when the user is back near the page top / hero.
  useEffect(() => {
    const scroller = document.getElementById('main-scroll-container');
    if (!scroller) return undefined;

    let ticking = false;
    const TOP_SHOW = 20;
    const HIDE_AFTER = 48;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.max(0, scroller.scrollTop);
        if (y <= TOP_SHOW) {
          setHeaderAway(false);
        } else if (y >= HIDE_AFTER) {
          setHeaderAway(true);
        }
        ticking = false;
      });
    };

    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    setVisitLoading(true);
    fetchVisitCount({ registeredUsers: LANDING_MEMBERS_DISPLAY })
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

  const bnFont = language === 'bn';
  const isNativeApp = isNativeCapacitorPlatform();

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
      className={`landing-page-light landing-modern min-h-full bg-[#fffdf7] text-slate-900 pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))] sm:pb-16 ${bnFont ? 'lang-bn' : 'font-sans'}${
        calmEntrance ? ' landing-skip-entrance' : ''
      }${!ambientOn ? ' landing-hold-ambient' : ''}`}
    >

      {/* Top bar */}
      <div className={`landing-header-bar sticky top-0 z-20${headerAway ? ' landing-header-bar--away' : ''}`}>
        <div className="mx-auto max-w-5xl px-3 sm:px-6">
          <div className="flex h-12 items-center justify-between gap-2 sm:h-14 sm:gap-3">
            <div className="flex min-w-0 select-none items-center gap-2 sm:gap-2.5">
              <img
                src="/icon-192.png"
                alt=""
                width={32}
                height={32}
                className="h-7 w-7 shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-slate-900/10 sm:h-8 sm:w-8 sm:rounded-[0.6rem]"
                decoding="async"
              />
              <span className="truncate text-sm font-black tracking-tight text-slate-900 sm:text-xl">
                SmartLineMan
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <LandingLangToggle
                language={language}
                onLanguageChange={onLanguageChange}
                ariaLabel={t.language}
                compact
              />
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className={`inline-flex min-h-[32px] items-center rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-orange-500/25 touch-manipulation transition-all active:scale-95 sm:hidden ${bnFont ? 'font-bengali' : ''}`}
              >
                {t.login}
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className={`hidden items-center rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-95 sm:inline-flex ${bnFont ? 'font-bengali' : ''}`}
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
                {language === 'bn' ? 'খেলতে' : 'While'}
              </span>
              <span className="landing-hero-lockup__line">
                {language === 'bn' ? 'খেলতে' : 'playing'}
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
              <span className="landing-join-cta__dot" aria-hidden="true" />
              <span className={bnFont ? 'font-bengali' : ''}>{t.joinCta}</span>
            </button>
          </div>

          {/* Walkway under Join — visible in first viewport; pairs with hotstick gag */}
          <aside
            className="landing-nonprofit-strip landing-nonprofit-strip--hero relative z-20"
            aria-label={t.nonprofitTitle}
          >
            <LandingNonprofitLineman active={ambientOn} />
            <p className={`landing-nonprofit-strip__title relative z-[1] ${bnFont ? 'font-bengali' : ''}`}>
              {t.nonprofitTitle}
            </p>
          </aside>
        </section>

        {/* Vision & Mission */}
        <section className="relative z-10 mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:gap-5 md:grid-cols-2">
          <article className="landing-vm-card landing-vm-card--vision">
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

        <div className="relative z-10 mb-8 flex justify-center sm:mb-10">
          <button
            type="button"
            onClick={() => setCurrentView('login')}
            className={`landing-month-toppers__board-link inline-flex min-h-[40px] items-center gap-1 touch-manipulation text-sm font-bold text-orange-600 transition-colors hover:text-orange-700 active:scale-[0.98] ${bnFont ? 'font-bengali' : ''}`}
          >
            <span>{t.viewLeaderboard}</span>
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <LandingPrizeCarousel language={language} />

        <div className="relative z-10 mb-3 flex justify-center sm:mb-4">
          <button
            type="button"
            onClick={() => contactFormRef.current?.openWithTopic('advertise')}
            className={`landing-advertise-chip touch-manipulation ${bnFont ? 'font-bengali' : ''}`}
            aria-label={t.advertiseChip}
          >
            {t.advertiseChip}
          </button>
        </div>

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

        <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-slate-200/70 py-6 sm:mt-10 sm:py-8">
          <LandingLangToggle
            language={language}
            onLanguageChange={onLanguageChange}
            ariaLabel={t.language}
          />

          <a
            href="https://www.facebook.com/smartlineman"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-[40px] items-center gap-1.5 text-sm font-bold text-[#1877F2] touch-manipulation transition-colors hover:text-blue-700 active:scale-[0.98] ${bnFont ? 'font-bengali' : ''}`}
          >
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
            </svg>
            <span>{t.followFacebook}</span>
          </a>
        </footer>
      </div>

      {/* Mobile sticky CTA: PWA pushes APK download; native app keeps Login */}
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
        {isNativeApp ? (
          <button
            type="button"
            onClick={() => setCurrentView('login')}
            className={`min-h-[52px] w-full rounded-full bg-orange-500 py-3.5 text-base font-black text-white shadow-lg shadow-orange-500/30 touch-manipulation transition-all active:scale-[0.98] ${bnFont ? 'font-bengali' : ''}`}
          >
            {t.login}
          </button>
        ) : (
          <a
            href={ANDROID_DOWNLOAD_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex min-h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-orange-600 to-orange-500 py-3.5 text-base font-black text-white shadow-lg shadow-orange-500/40 ring-2 ring-orange-300/80 touch-manipulation transition-all active:scale-[0.98] ${bnFont ? 'font-bengali' : ''}`}
          >
            {t.downloadAndroid}
          </a>
        )}
      </div>

      <LandingPromoPeek language={language} ready={ambientOn} />
    </div>
  );
}
