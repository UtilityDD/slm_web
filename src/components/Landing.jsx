import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { requestManager } from '../utils/requestManager';
import { leaderboardService } from '../utils/leaderboardService';
import { BOARD_IDS, getMonthlyPrizeDisplayList } from '../utils/monthlyEncouragementBoards';
import { storageUtils } from '../utils/storageUtils';
import LandingPrizeCarousel from './LandingPrizeCarousel';
import LandingVisitCounter from './LandingVisitCounter';
import { fetchVisitCount } from '../utils/landingVisitService';
import { fetchRegisteredUserCount } from '../utils/landingStatsService';

const copy = {
  en: {
    heroTitle: 'Train. Compete. Stay Safe.',
    heroSubtitle: 'Safety training, fair competitions, and recognition for West Bengal linemen.',
    visionTitle: 'Our Vision',
    vision:
      'Every lineman works with confidence and modern safety knowledge—reducing field accidents and protecting families.',
    missionTitle: 'Our Mission',
    mission: 'Practical 90-day training, daily safety tools, and fair rewards that make skills visible.',
    statsSection: 'Community',
    statsUsers: 'Registered Users',
    statsToppers: 'Top Performers',
    statsPrizes: 'Prizes Awarded',
    newPlayersTopThree: 'Top 3 — New Players',
    allTimeTopThree: 'Top 3 — All-Time',
    login: 'Login',
    exploreLifeSkills: 'Life Skills',
    lifeSkillsTitle: 'Life Skills',
    lifeSkillsSubtitle: 'Short modules on stress, money, and digital safety—inside Training.',
    lifeSkillsTrack: 'More life skills',
    language: 'Language',
    loading: 'Loading…',
    pts: 'pts',
    prizeMonths: 'months with winners',
    followFacebook: 'Follow on Facebook',
    visitLabel: 'Visit:',
    surakshaSathiBtn: 'Suraksha Sathi (SOPs / PTW)',
  },
  bn: {
    heroTitle: 'প্রশিক্ষণ নিন। প্রতিযোগিতায় অংশ নিন। সুরক্ষিত থাকুন।',
    heroSubtitle: 'পশ্চিমবঙ্গের বিদ্যুৎ কর্মীদের (লাইনম্যান) জন্য সহজ নিরাপত্তা প্রশিক্ষণ, সুস্থ প্রতিযোগিতা এবং যোগ্য সম্মান।',
    visionTitle: 'আমাদের স্বপ্ন',
    vision:
      'প্রতিটি বিদ্যুৎ কর্মী যেন আত্মবিশ্বাস ও সঠিক নিরাপত্তা জ্ঞান নিয়ে নিরাপদে কাজ করতে পারেন—যাতে কাজের জায়গায় দুর্ঘটনা কমে এবং প্রতিটি পরিবার সুরক্ষিত থাকে।',
    missionTitle: 'আমাদের লক্ষ্য',
    mission: '৯০ দিনের ব্যবহারিক প্রশিক্ষণ, প্রতিদিনের প্রয়োজনীয় নিরাপত্তা গাইড এবং ন্যায্য পুরস্কারের মাধ্যমে কর্মীদের দক্ষতাকে সবার সামনে তুলে ধরা।',
    statsSection: 'কমিউনিটি আপডেট',
    statsUsers: 'নিবন্ধিত লাইনম্যান',
    statsToppers: 'সেরা পারফর্মাররা',
    statsPrizes: 'পুরস্কার বিতরণ করা হয়েছে',
    newPlayersTopThree: 'নতুন খেলোয়াড়দের মধ্যে সেরা ৩',
    allTimeTopThree: 'সর্বকালের সেরা ৩ খেলোয়াড়',
    login: 'লগইন করুন',
    exploreLifeSkills: 'জীবন গড়ার দক্ষতা দেখুন',
    lifeSkillsTitle: 'জীবন গড়ার সাধারণ দক্ষতা (Life Skills)',
    lifeSkillsSubtitle: 'মানসিক চাপ কমানো, টাকা-পয়সার হিসাব ও মোবাইল নিরাপত্তা—প্রশিক্ষণের বিশেষ মডিউল।',
    lifeSkillsTrack: 'আরও দক্ষতা দেখুন',
    language: 'ভাষা',
    loading: 'লোড হচ্ছে…',
    pts: 'পয়েন্ট',
    prizeMonths: 'টি মাসে পুরস্কার প্রদান',
    followFacebook: 'আমাদের ফেসবুক পেজে যুক্ত হন',
    visitLabel: 'মোট ভিজিট:',
    surakshaSathiBtn: 'সুরক্ষা সাথী (SOPs / PTW)',
  },
};

const EN_PUBLIC_LIFE_SKILL_CONTENT = {
  LS01: {
    mission_briefing:
      'Lineman work demands not only physical stamina, but also mental steadiness. During storm duty, customer pressure, and high-risk operations, your ability to stay calm is a core professional skill. This module adapts practical stress-management techniques inspired by WHO guidance for real field situations.',
    sections: [
      {
        title: 'Recognize Early Stress Signals',
        points: [
          {
            item_name: 'What your body and mind may be telling you',
            specifications: 'Racing heartbeat, shaky hands, irritability, low appetite, or mental restlessness.',
            importance:
              "These are your body's built-in alarm responses. Ignoring them can increase the chance of error during height or live-line work.",
            daily_check: 'Ask yourself: “Am I overreacting to small triggers today?”',
          },
        ],
      },
      {
        title: 'Use the 5-4-3-2-1 Grounding Method',
        points: [
          {
            item_name: 'Bring attention back to the present',
            specifications:
              'Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.',
            importance:
              'This works like a circuit-breaker for anxiety loops and helps reset attention quickly before critical tasks.',
            daily_check: 'Practice for 2–5 minutes whenever you feel overloaded.',
          },
        ],
      },
      {
        title: 'Calming Breath: 4-7-8 Technique',
        points: [
          {
            item_name: 'Structured breathing to reduce stress load',
            specifications: 'Inhale for 4 seconds, hold for 7 seconds, exhale slowly for 8 seconds.',
            importance:
              'It slows your stress response and supports clearer decisions before switching, charging, or troubleshooting tasks.',
            daily_check: 'Use 3 rounds before starting a high-focus operation.',
          },
        ],
      },
      {
        title: 'Create a Work-to-Home Reset',
        points: [
          {
            item_name: 'Decompression after duty',
            specifications: 'Change out of duty wear, wash up, and sit quietly for a few minutes.',
            importance:
              'A reset routine prevents work stress from spilling into family life and improves long-term resilience.',
            daily_check: 'Give yourself a short reset before engaging at home.',
          },
        ],
      },
    ],
  },
  LS02: {
    mission_briefing:
      'Earning is hard; protecting earnings is harder. In a risk-heavy profession, financial clarity is part of family safety. This module explains practical money habits, insurance readiness, and debt-risk prevention aligned with public financial-awareness guidance in India.',
    sections: [
      {
        title: 'Secure Family Protection Basics',
        points: [
          {
            item_name: 'Keep nominations updated',
            specifications: 'Verify nominee details in bank, insurance, and PF records.',
            importance:
              'Without updated nomination, claim processes can become difficult for families during emergencies.',
            daily_check: 'Confirm nominee details in at least one key account this week.',
          },
          {
            item_name: 'Use essential protection schemes',
            specifications: 'Review low-cost life and accident coverage options available through formal channels.',
            importance: 'Small annual premiums can provide meaningful protection for high-risk workers.',
            daily_check: 'Check whether premium auto-debit is active and current.',
          },
        ],
      },
      {
        title: 'Avoid Loan Traps and Fraud',
        points: [
          {
            item_name: 'Be cautious with instant loan apps',
            specifications: 'Do not trust apps that promise quick loans without proper verification.',
            importance:
              'Predatory apps may misuse contact and personal data and pressure users even after repayment.',
            daily_check: 'Validate lenders through official and regulated channels only.',
          },
          {
            item_name: 'Respond safely to harassment threats',
            specifications: 'Do not panic-pay under pressure calls or abusive recovery tactics.',
            importance:
              'Fear-based payment often worsens the problem. Report suspicious behavior through official cyber channels promptly.',
            daily_check: 'Never share sensitive data or click unknown payment links.',
          },
        ],
      },
      {
        title: 'Build a Practical Savings Buffer',
        points: [
          {
            item_name: 'Maintain an emergency reserve',
            specifications: 'Target savings that can cover several months of essential expenses.',
            importance:
              'An emergency buffer reduces dependence on high-interest borrowing during job interruptions or crises.',
            daily_check: 'Prioritize one small savings action before a non-essential expense.',
          },
        ],
      },
    ],
  },
  LS03: {
    mission_briefing:
      'Smartphones improve productivity but can also create safety and fraud risk. This module focuses on practical digital discipline for field workers: attention safety during operations, fraud prevention, and immediate response steps if an incident occurs.',
    sections: [
      {
        title: 'Phone Discipline During Field Work',
        points: [
          {
            item_name: 'Prevent distraction around live risk',
            specifications: 'Keep phones silent and secured during pole, height, or live-line work.',
            importance:
              'A single alert distraction at the wrong moment can lead to serious operational error.',
            daily_check: 'Before starting field work, verify phone is in safe mode (silent/vibration).',
          },
        ],
      },
      {
        title: 'Protect Credentials and Transactions',
        points: [
          {
            item_name: 'Never share OTP, PIN, or passwords',
            specifications: 'Do not disclose credentials to callers claiming to be from bank, office, or authority.',
            importance: 'Credential sharing is the most common trigger for account compromise.',
            daily_check: 'Use a strict rule: no credential sharing on calls, ever.',
          },
          {
            item_name: 'Recognize intimidation scams',
            specifications: 'Treat fear-based legal threats on calls as suspicious unless verified officially.',
            importance:
              'Scammers use urgency and fear to force quick payments or data exposure.',
            daily_check: 'Disconnect and verify through official channels before taking action.',
          },
        ],
      },
      {
        title: 'Handle Unknown Calls and Links Safely',
        points: [
          {
            item_name: 'Be careful with unknown/international contacts',
            specifications: 'Avoid opening unknown links, attachments, or unsolicited callback requests.',
            importance:
              'Most phishing and social-engineering attempts begin with unverified contact vectors.',
            daily_check: 'If uncertain, do not click—verify first.',
          },
        ],
      },
      {
        title: 'Act Fast if Fraud Happens',
        points: [
          {
            item_name: 'Report immediately',
            specifications: 'Use official cybercrime reporting channels and your bank support without delay.',
            importance: 'Early reporting significantly improves the chance of limiting financial loss.',
            daily_check: 'Keep key emergency support numbers saved and accessible.',
          },
        ],
      },
    ],
  },
};

const categoryThemes = {
  mental: { label_en: 'Mental Fitness', label_bn: 'মানসিক সুস্থতা', color: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50' },
  financial: { label_en: 'Family Protection', label_bn: 'পারিবারিক সুরক্ষা', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50' },
  digital: { label_en: 'Cyber Security', label_bn: 'মোবাইল ও সাইবার নিরাপত্তা', color: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100/50' },
  social: { label_en: 'Professionalism', label_bn: 'পেশাদারিত্ব ও আচরণ', color: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50' },
  health: { label_en: 'Field Health', label_bn: 'মাঠে কাজের স্বাস্থ্য ও সুরক্ষা', color: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100/50' },
  family: { label_en: 'Child Security', label_bn: 'সন্তানের ভবিষ্যৎ ও সুরক্ষা', color: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100/50' },
  personal: { label_en: 'Healthy Life', label_bn: 'সুস্থ জীবনযাপন', color: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50' },
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

function getThisMonthTopThreeTitle(language) {
  const now = new Date();
  const day = now.getDate();
  if (language === 'bn') {
    const bnMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
    ];
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const formatBnNum = (num) => String(num).split('').map(d => bnDigits[Number(d)] || d).join('');
    return `মাসের সেরা ৩ — ${formatBnNum(day)}ই ${bnMonths[now.getMonth()]} পর্যন্ত`;
  }
  const monthName = now.toLocaleString('en', { month: 'long' });
  return `Top 3 — This Month (as of ${monthName} ${day})`;
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
      className={`nb-icon-badge w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0 text-white ${ICON_TONES[tone] || ICON_TONES.orange} ${className}`}
    >
      <LandingIcon name={name} className="w-5 h-5 sm:w-[1.35rem] sm:h-[1.35rem]" strokeWidth={2} />
    </div>
  );
}

function RankBadge({ rank, bnFont }) {
  const configs = [
    { bg: 'bg-amber-400', label: bnFont ? '১' : '1' },
    { bg: 'bg-slate-300', label: bnFont ? '২' : '2' },
    { bg: 'bg-orange-500 text-white', label: bnFont ? '৩' : '3' },
  ];
  const config = configs[rank] || configs[2];
  return (
    <span
      className={`nb-rank-badge inline-flex w-8 h-8 sm:w-9 sm:h-9 items-center justify-center text-xs sm:text-sm text-slate-900 ${config.bg}`}
    >
      {config.label}
    </span>
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
    return <span className="inline-block h-10 w-20 sm:h-12 sm:w-24 bg-slate-200/80 rounded-lg animate-pulse" />;
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

function pickTopLeaders(list, limit = 3) {
  return (list || [])
    .filter((row) => row.standing_rank != null && row.standing_rank <= limit)
    .sort((a, b) => a.standing_rank - b.standing_rank)
    .slice(0, limit)
    .map(mapLandingPlayer);
}

function LeaderPodiumGrid({ title, iconName, iconTone, players, ptsLabel, bnFont, showScore = true }) {
  if (!players?.length) return null;

  const rankCardClass = [
    'nb-card bg-amber-50/90',
    'nb-card bg-slate-50/90',
    'nb-card bg-orange-50/90',
  ];
  const rankBadgeText = bnFont ? ['১ম', '২য়', '৩য়'] : ['1st', '2nd', '3rd'];

  return (
    <section className="mb-8 sm:mb-10 relative z-10">
      <div className="flex items-center gap-3 mb-4 sm:mb-5">
        <SectionIconBadge name={iconName} tone={iconTone} className="rounded-lg" />
        <h2 className={`text-base sm:text-lg font-black text-slate-900 leading-snug ${bnFont ? 'font-bengali' : ''}`}>{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {players.map((player, idx) => {
          const isFirst = idx === 0;
          return (
            <div
              key={`${player.id}-${idx}`}
              className={`landing-podium-card relative overflow-hidden flex flex-row sm:flex-col items-center sm:text-center gap-3 sm:gap-3 p-4 sm:p-5 sm:pt-6 rounded-xl ${rankCardClass[idx] || rankCardClass[2]}`}
            >
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex items-center gap-1.5">
                <RankBadge rank={idx} bnFont={bnFont} />
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-slate-400">{rankBadgeText[idx]}</span>
              </div>

              {player.avatarUrl ? (
                <div className={`relative shrink-0 ${isFirst ? 'p-0.5 border-2 border-slate-900 rounded-lg bg-amber-400' : ''}`}>
                  <img
                    src={player.avatarUrl}
                    alt={player.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-md object-cover border-2 border-slate-900"
                  />
                </div>
              ) : (
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-md ${isFirst ? 'bg-amber-400 text-slate-900' : 'bg-white text-slate-700'} border-2 border-slate-900 flex items-center justify-center font-black text-3xl sm:text-4xl shrink-0 nb-mono`}>
                  {(player.name || '?').charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1 text-left sm:text-center pr-10 sm:pr-0 sm:w-full">
                <p className={`font-black text-lg sm:text-xl text-slate-900 truncate leading-snug ${bnFont ? 'font-bengali' : ''}`}>{player.name}</p>
                {showScore && (
                  <p className="nb-score-pill mt-1.5 sm:mt-2 inline-block text-sm sm:text-base px-2.5 sm:px-3 py-1 tabular-nums">
                    {player.points} {ptsLabel}
                  </p>
                )}
                {player.district && (
                  <p className={`mt-1 text-xs font-medium text-slate-500 truncate ${bnFont ? 'font-bengali' : ''}`}>
                    {player.district}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const StatTile = ({ label, value, iconName, tone = 'orange', loading, sub }) => {
  return (
    <div className="nb-card landing-stat-card p-4 sm:p-5 rounded-xl">
      <div className="flex flex-row items-center gap-3.5 sm:gap-4 text-left">
        <div className={`nb-icon-badge w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 text-white rounded-lg ${ICON_TONES[tone] || ICON_TONES.orange}`}>
          <LandingIcon name={iconName} className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="nb-stat-value text-2xl sm:text-3xl text-slate-900 leading-none tabular-nums">
            <AnimatedNumber value={value} loading={loading} />
          </p>
          <p className="nb-stat-label mt-1.5 text-[10px] sm:text-[11px] line-clamp-2">{label}</p>
          {sub && <p className="text-[10px] font-semibold text-slate-500 mt-1 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
};

export default function Landing({ language, onLanguageChange, setCurrentView, user }) {
  const t = copy[language] || copy.en;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    newPlayerTop: [],
    thisMonthTop: [],
    prizesCount: 0,
    prizeMonths: 0,
    hallOfFameData: [],
  });
  const [visitCount, setVisitCount] = useState(null);
  const [visitLoading, setVisitLoading] = useState(true);
  const [lifeSkillModules, setLifeSkillModules] = useState([]);
  const [activeLifeSkill, setActiveLifeSkill] = useState(null);
  const [activeLifeSkillContent, setActiveLifeSkillContent] = useState(null);
  const [activeLifeSkillLoading, setActiveLifeSkillLoading] = useState(false);
  const [activeLifeSkillError, setActiveLifeSkillError] = useState('');
  const lifeSkillModalScrollRef = useRef(null);

  const resetLifeSkillScroll = () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const appScroller = document.getElementById('main-scroll-container');
    if (appScroller) appScroller.scrollTop = 0;
    if (lifeSkillModalScrollRef.current) lifeSkillModalScrollRef.current.scrollTop = 0;
  };

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
        const [profilesResult, monthlyLeaderboard, encouragementBoards, allTimeLeaderboard, hallOfFame] = await Promise.all([
          requestManager.fetch(
            'landing_registered_count_v1',
            async () => {
              const users = await fetchRegisteredUserCount(supabase);
              return { users };
            },
            { ttl: 2, swr: false }
          ),
          leaderboardService.fetchMonthly(false).catch(() => []),
          leaderboardService.fetchEncouragementBoards(false, language).catch(() => null),
          leaderboardService.fetchAllTime(false).catch(() => []),
          leaderboardService.fetchHallOfFame(false).catch(() => []),
        ]);

        const newPlayerList = getMonthlyPrizeDisplayList(
          BOARD_IDS.NEW_PLAYER,
          monthlyLeaderboard,
          encouragementBoards
        );
        const newPlayerTopThree = pickTopLeaders(newPlayerList, 3);
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
            newPlayerTop: newPlayerTopThree,
            thisMonthTop: thisMonthTopThree,
            prizesCount,
            prizeMonths,
            hallOfFameData: Array.isArray(hallOfFame) ? hallOfFame : [],
          });
        }
      } catch (err) {
        console.warn('Landing stats fetch failed:', err);
        if (!cancelled) {
          setStats((prev) => ({ ...prev, newPlayerTop: [], thisMonthTop: [] }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadLifeSkillsPreview() {
      try {
        const response = await fetch('/data/supplementary_modules.json');
        if (!response.ok) return;
        const json = await response.json();
        const modules = Array.isArray(json) ? json.slice(0, 3) : [];
        if (!cancelled) setLifeSkillModules(modules);
      } catch {
        if (!cancelled) setLifeSkillModules([]);
      }
    }

    loadStats();
    loadLifeSkillsPreview();
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

  const prizeSub = useMemo(() => {
    if (loading) return '';
    if (stats.prizeMonths > 0) {
      return language === 'bn'
        ? `${stats.prizeMonths}${copy.bn.prizeMonths}`
        : `${stats.prizeMonths} ${copy.en.prizeMonths}`;
    }
    return '';
  }, [loading, stats.prizeMonths, language]);

  const translatedLifeSkillContent = useMemo(() => {
    if (!activeLifeSkillContent) return null;
    if (language !== 'en') return activeLifeSkillContent;
    const code = String(activeLifeSkill?.lesson_code || '').toUpperCase();
    return EN_PUBLIC_LIFE_SKILL_CONTENT[code] || activeLifeSkillContent;
  }, [activeLifeSkillContent, activeLifeSkill, language]);

  const openLifeSkills = () => {
    setCurrentView(user ? 'training' : 'login');
  };

  const scrollToLifeSkillsSection = () => {
    const section = document.getElementById('life-skills');
    const scroller = document.getElementById('main-scroll-container');
    if (!section) return;
    const headerOffset = 80;
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

  const openLifeSkillPreview = (module) => {
    if (!module || typeof module !== 'object') return;
    resetLifeSkillScroll();
    setActiveLifeSkill(module);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadActiveLifeSkillContent() {
      if (!activeLifeSkill?.manuscript_url) {
        setActiveLifeSkillContent(null);
        setActiveLifeSkillError('');
        return;
      }

      const lessonCode = String(activeLifeSkill.lesson_code || '').toUpperCase();
      const isPublicReadable = ['LS01', 'LS02', 'LS03'].includes(lessonCode);
      if (!isPublicReadable) {
        setActiveLifeSkillContent(null);
        setActiveLifeSkillError('');
        return;
      }

      setActiveLifeSkillLoading(true);
      setActiveLifeSkillError('');
      try {
        const response = await fetch(activeLifeSkill.manuscript_url);
        if (!response.ok) throw new Error('Failed to load content');
        const json = await response.json();
        if (!cancelled) setActiveLifeSkillContent(json);
      } catch (err) {
        if (!cancelled) {
          setActiveLifeSkillContent(null);
          setActiveLifeSkillError(err?.message || 'Failed to load content');
        }
      } finally {
        if (!cancelled) setActiveLifeSkillLoading(false);
      }
    }

    loadActiveLifeSkillContent();
    return () => {
      cancelled = true;
    };
  }, [activeLifeSkill]);

  useEffect(() => {
    if (!activeLifeSkill) return;
    resetLifeSkillScroll();
    const raf = requestAnimationFrame(() => resetLifeSkillScroll());
    const timer = setTimeout(() => resetLifeSkillScroll(), 30);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [activeLifeSkill]);

  const bnFont = language === 'bn';

  return (
    <div
      className={`landing-page-light landing-neo-brutal landing-modern min-h-full text-slate-900 pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))] sm:pb-16 ${bnFont ? 'lang-bn' : 'font-sans'}`}
    >
      <div className="nb-hazard" aria-hidden="true" />

      {/* Top bar */}
      <div className="sticky top-0 z-20 landing-header-bar safe-area-inset-top">
        <div className="max-w-5xl mx-auto px-3 sm:px-6">
          <div className="h-12 sm:h-14 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-baseline gap-1 select-none min-w-0">
              <span className="text-sm sm:text-xl font-black text-slate-900 tracking-tight truncate">SmartLineMan</span>
              <span className="text-[8px] sm:text-[10px] font-black text-slate-900 bg-orange-400 px-1 py-0.5 rounded border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] shrink-0 nb-mono">.in</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <div
                className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50/90 p-0.5 text-[9px] sm:text-[10px] font-semibold nb-mono shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                role="group"
                aria-label={t.language}
              >
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`min-h-[26px] min-w-[26px] sm:min-h-0 sm:min-w-0 px-2 sm:px-2.5 py-0.5 rounded-full touch-manipulation transition-colors ${language === 'en' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('bn')}
                  className={`min-h-[26px] min-w-[26px] sm:min-h-0 sm:min-w-0 px-2 sm:px-2.5 py-0.5 rounded-full touch-manipulation transition-colors ${language === 'bn' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  বাং
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="inline-flex sm:hidden items-center min-h-[32px] px-2.5 py-1 nb-btn-primary text-[11px] font-bold touch-manipulation"
              >
                {t.login}
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="hidden sm:inline-flex items-center px-5 py-2 nb-btn-primary text-sm font-bold"
              >
                {t.login}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 pb-8 sm:pb-16 relative">

        {/* Hero Section */}
        <section className="relative text-center max-w-3xl mx-auto pt-6 sm:pt-12 pb-8 sm:pb-10 z-10">
          <div className="landing-hero-glow" aria-hidden="true" />
          <h1 className={`font-black text-slate-900 leading-[1.25] sm:leading-tight mb-3 sm:mb-4 tracking-tight text-balance ${bnFont ? 'text-xl sm:text-3xl md:text-4xl' : 'text-2xl sm:text-4xl md:text-[2.75rem]'}`}>
            {language === 'bn' ? (
              <>
                প্রশিক্ষণ নিন। প্রতিযোগিতা করুন। <span className="text-orange-600">নিরাপদ থাকুন।</span>
              </>
            ) : (
              <>
                Train. Compete. <span className="text-orange-600">Stay Safe.</span>
              </>
            )}
          </h1>

          <p className={`text-sm sm:text-base text-slate-600 leading-relaxed mb-6 sm:mb-8 font-medium mx-auto max-w-2xl ${bnFont ? 'landing-bn-reading' : ''}`}>{t.heroSubtitle}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs sm:max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setCurrentView('sops')}
              className="w-full sm:w-auto min-h-[44px] px-6 py-3 nb-btn-primary font-black text-center flex items-center justify-center gap-2 touch-manipulation rounded-lg text-sm sm:text-base"
            >
              👷 {t.surakshaSathiBtn}
            </button>
            <button
              type="button"
              onClick={scrollToLifeSkillsSection}
              className="w-full sm:w-auto min-h-[44px] px-6 py-3 nb-btn-secondary font-bold text-center flex items-center justify-center gap-2 touch-manipulation rounded-lg text-sm sm:text-base"
            >
              {t.exploreLifeSkills}
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        </section>

        {/* Dynamic Stats Grid */}
        <section className="mb-8 sm:mb-10 relative z-10">
          <p className="landing-section-title mb-3 sm:mb-4">{t.statsSection}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatTile label={t.statsUsers} value={stats.users} iconName="users" tone="orange" loading={loading} />
          <StatTile
            label={t.statsToppers}
            value={stats.newPlayerTop.length}
            iconName="userPlus"
            tone="emerald"
            loading={loading}
          />
          <StatTile
            label={t.statsPrizes}
            value={stats.prizesCount}
            iconName="gift"
            tone="violet"
            loading={loading}
            sub={prizeSub}
          />
          </div>
        </section>

        <LandingPrizeCarousel
          language={language}
          hallOfFameData={stats.hallOfFameData}
          loading={loading}
        />

        {/* Top 3 new players, then all-time top 3 */}
        <LeaderPodiumGrid
          title={t.newPlayersTopThree}
          iconName="userPlus"
          iconTone="emerald"
          players={stats.newPlayerTop}
          ptsLabel={t.pts}
          bnFont={bnFont}
          showScore={false}
        />
        <LeaderPodiumGrid
          title={getThisMonthTopThreeTitle(language)}
          iconName="trophy"
          iconTone="amber"
          players={stats.thisMonthTop}
          ptsLabel={t.pts}
          bnFont={bnFont}
        />

        {/* Vision & Mission section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 mb-8 sm:mb-12 relative z-10">
          <article className="nb-card landing-podium-card p-5 sm:p-6 bg-amber-50/80 rounded-xl">
            <SectionIconBadge name="eye" tone="amber" className="mb-4 rounded-lg" />
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-2">{t.visionTitle}</h2>
            <p className={`text-slate-700 leading-relaxed text-sm sm:text-base font-medium ${bnFont ? 'landing-bn-reading' : ''}`}>{t.vision}</p>
          </article>

          <article className="nb-card landing-podium-card p-5 sm:p-6 bg-cyan-50/80 rounded-xl">
            <SectionIconBadge name="target" tone="cyan" className="mb-4 rounded-lg" />
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-2">{t.missionTitle}</h2>
            <p className={`text-slate-700 leading-relaxed text-sm sm:text-base font-medium ${bnFont ? 'landing-bn-reading' : ''}`}>{t.mission}</p>
          </article>
        </section>

        {/* Life Skills Course grid */}
        <section id="life-skills" className="mb-8 sm:mb-12 relative z-10 scroll-mt-20">
          <div className="nb-card p-4 sm:p-6 bg-white rounded-xl">
            <div className="flex items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <SectionIconBadge name="book" tone="indigo" className="w-10 h-10 rounded-lg shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1">{t.lifeSkillsTitle}</h3>
                  <p className="text-sm text-slate-500 max-w-2xl font-medium leading-relaxed">
                    {t.lifeSkillsSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openLifeSkills}
                className={`landing-text-link shrink-0 mt-0.5 sm:mt-1 flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 touch-manipulation ${bnFont ? 'font-bengali' : 'nb-mono'}`}
              >
                {t.lifeSkillsTrack}
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <div className="landing-life-skills-scroll flex sm:grid sm:grid-cols-3 gap-4 mb-5 sm:mb-6 -mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-visible pb-3 sm:pb-0 snap-x snap-mandatory">
              {(lifeSkillModules.length
                ? lifeSkillModules
                : [
                    { lesson_code: 'LS01', title_en: 'Stress Management', title_bn: 'মানসিক চাপ কমানোর উপায়', category: 'mental', duration: '5 min' },
                    { lesson_code: 'LS02', title_en: 'Financial Awareness', title_bn: 'টাকা-পয়সার হিসাব ও সঞ্চয়', category: 'financial', duration: '8 min' },
                    { lesson_code: 'LS03', title_en: 'Digital Safety', title_bn: 'মোবাইল ও ইন্টারনেট নিরাপত্তা', category: 'digital', duration: '6 min' },
                  ]).map((module, idx) => {
                const code = module.lesson_code || `LS${String(idx + 1).padStart(2, '0')}`;
                const title = language === 'bn' ? module.title_bn : module.title_en;
                const categoryKey = module.category || 'mental';
                const theme = categoryThemes[categoryKey] || { label_en: 'Life Skill', label_bn: 'লাইফ স্কিল', color: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50' };
                const catLabel = language === 'bn' ? theme.label_bn : theme.label_en;
                const durationText = module.duration || '5 min';
                const highlights = language === 'bn' ? module.highlights_bn : module.highlights_en;

                return (
                  <button
                    type="button"
                    onClick={() => openLifeSkillPreview(module)}
                    key={module?.id || code}
                    className="group relative text-left p-4 sm:p-5 nb-card bg-indigo-50/90 hover:bg-indigo-100/90 active:translate-x-0.5 active:translate-y-0.5 flex flex-col justify-between min-h-[160px] sm:min-h-[172px] w-[min(78vw,280px)] sm:w-auto shrink-0 sm:shrink snap-center touch-manipulation rounded-xl landing-podium-card"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`nb-tag px-2.5 py-1 ${theme.color}`}>
                          {catLabel}
                        </span>
                        <span className="nb-tag text-xs text-slate-700 bg-white px-2 py-0.5 flex items-center gap-1">
                          <LandingIcon name="clock" className="w-3.5 h-3.5" />
                          {durationText}
                        </span>
                      </div>
                      <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-700 mb-1 nb-mono">{code}</p>
                      <p className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors leading-snug mb-2 line-clamp-2">
                        {title}
                      </p>
                    </div>
                    {highlights && (
                      <p className="text-xs font-semibold text-slate-400 border-t border-slate-100 pt-2.5 mt-2 flex items-center gap-1.5 truncate">
                        <LandingIcon name="sparkles" className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {highlights}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

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
            <span className={`text-sm font-bold ${bnFont ? 'font-bengali' : 'nb-mono uppercase tracking-wide'}`}>
              {t.followFacebook}
            </span>
          </a>
        </footer>
      </div>

      {/* Mobile sticky visit counter + Login CTA */}
      {!activeLifeSkill && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] landing-sticky-cta">
          {(visitLoading || visitCount != null) && (
            <div className="flex justify-center mb-2">
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
            className="w-full min-h-[48px] py-3.5 nb-btn-primary font-black text-base touch-manipulation"
          >
            {t.login}
          </button>
        </div>
      )}

      {/* Modern Full Screen Interactive Reading Dashboard Modal */}
      {activeLifeSkill && (
        <div className={`fixed inset-0 z-50 nb-modal flex flex-col animate-toast-in overflow-hidden ${bnFont ? 'lang-bn' : 'font-sans'}`}>
          <header className="sticky top-0 z-10 nb-modal-header safe-area-inset-top shrink-0">
            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-start sm:items-center justify-between gap-2 sm:gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="nb-tag text-[10px] sm:text-xs text-indigo-700 bg-indigo-100 px-2 sm:px-2.5 py-0.5">{activeLifeSkill.lesson_code || 'LS'}</span>
                  {activeLifeSkill.duration && (
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <LandingIcon name="clock" className="w-3 h-3" />
                      {activeLifeSkill.duration}
                    </span>
                  )}
                </div>
                <h4 className={`text-base sm:text-xl font-black text-slate-900 leading-snug mt-1 sm:mt-1.5 ${bnFont ? 'line-clamp-2 sm:truncate' : 'truncate'}`}>
                  {language === 'bn' ? activeLifeSkill.title_bn : activeLifeSkill.title_en}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveLifeSkill(null)}
                className="min-h-[40px] px-3 sm:px-4 py-2 nb-btn-secondary text-xs sm:text-sm font-bold shrink-0 touch-manipulation"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </header>

          <main ref={lifeSkillModalScrollRef} className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-24">
              <aside className="lg:col-span-4 space-y-4 sm:space-y-5 order-first lg:order-none lg:sticky lg:top-24 h-max">
                {/* Audio Lesson Player — surfaced early on mobile */}
                {!!(activeLifeSkill.audio_url_en || activeLifeSkill.audio_url_bn) && (
                  <div className="nb-card p-4 sm:p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-2.5 nb-mono">
                      {language === 'bn' ? 'অডিও লেসন (কানে শুনুন)' : 'Audio Lesson'}
                    </p>
                    <div className="bg-indigo-50 p-3 sm:p-4 border-2 border-slate-900 rounded-md text-center shadow-[3px_3px_0_#0f172a]">
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center nb-icon-badge bg-indigo-600">
                        <LandingIcon name="headphones" className="w-6 h-6" strokeWidth={2} />
                      </div>
                      <p className="text-xs font-bold text-slate-500 mb-3 sm:mb-4">{language === 'bn' ? 'চালিয়ে শুনুন' : 'Listen'}</p>
                      <audio
                        controls
                        preload="none"
                        className="w-full custom-audio-player focus:outline-none"
                        src={(language === 'bn' ? activeLifeSkill.audio_url_bn : activeLifeSkill.audio_url_en) || activeLifeSkill.audio_url_en || activeLifeSkill.audio_url_bn}
                      />
                    </div>
                  </div>
                )}

                {/* Trusted Blurb guidance — desktop sidebar */}
                {!!(activeLifeSkill.trusted_blurb_en || activeLifeSkill.trusted_blurb_bn) && (
                  <div className="hidden lg:block nb-card border-dashed p-5 text-xs text-slate-600 leading-relaxed font-semibold">
                    <p className="font-extrabold text-slate-500 mb-1.5">{language === 'bn' ? 'নির্ভরযোগ্য তথ্যের উৎস' : 'Information Trust'}</p>
                    {language === 'bn' ? activeLifeSkill.trusted_blurb_bn : activeLifeSkill.trusted_blurb_en}
                  </div>
                )}

                {/* Open in Training — desktop sidebar */}
                <div className="hidden lg:block nb-card p-5">
                  <button
                    type="button"
                    onClick={openLifeSkills}
                    className="w-full py-3.5 nb-btn-indigo font-black text-sm"
                  >
                    {t.lifeSkillsTrack}
                  </button>
                </div>
                </aside>

              <section className="lg:col-span-8 space-y-4 sm:space-y-5">
                {activeLifeSkill.image_url && (
                  <img
                    src={activeLifeSkill.image_url}
                    alt={language === 'bn' ? activeLifeSkill.title_bn : activeLifeSkill.title_en}
                    className="w-full h-52 sm:h-80 md:h-96 object-cover rounded-md border-2 border-slate-900 shadow-[4px_4px_0_#0f172a]"
                  />
                )}

                <div className={`nb-card p-4 sm:p-6 ${bnFont ? 'landing-bn-reading' : ''}`}>
                  <p className="text-base leading-relaxed text-slate-700 font-medium">
                    {language === 'bn' ? activeLifeSkill.description_bn : activeLifeSkill.description_en}
                  </p>
                  {!!(activeLifeSkill.highlights_en || activeLifeSkill.highlights_bn) && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                      {(language === 'bn' ? activeLifeSkill.highlights_bn : activeLifeSkill.highlights_en).split('•').map((item, idx) => (
                        <span key={idx} className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                          {item.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {activeLifeSkillLoading && (
                  <div className="nb-card p-4 sm:p-6 flex items-center justify-center gap-3 text-slate-600 font-bold text-sm sm:text-base">
                    <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0"></span>
                    {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading full content...'}
                  </div>
                )}

                {!activeLifeSkillLoading && translatedLifeSkillContent && (
                  <div className="space-y-5">
                    {!!translatedLifeSkillContent.mission_briefing && (
                      <article className={`nb-card p-4 sm:p-6 ${bnFont ? 'landing-bn-reading' : ''}`}>
                        <h5 className={`text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-3 nb-mono ${bnFont ? 'landing-bn-ui' : ''}`}>
                          {language === 'bn' ? 'মূল ধারণা (Briefing)' : 'Mission Briefing'}
                        </h5>
                        <p className="text-sm sm:text-base leading-relaxed text-slate-700 font-medium">{translatedLifeSkillContent.mission_briefing}</p>
                      </article>
                    )}

                    {Array.isArray(translatedLifeSkillContent.sections) &&
                      translatedLifeSkillContent.sections.map((section, sectionIdx) => (
                        <article key={`${section.title}-${sectionIdx}`} className={`nb-card p-4 sm:p-6 ${bnFont ? 'landing-bn-reading' : ''}`}>
                          <h6 className={`text-base sm:text-lg font-black text-slate-900 mb-3 sm:mb-4 flex items-center gap-2 ${bnFont ? 'landing-bn-ui' : ''}`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 animate-pulse" />
                            {section.title}
                          </h6>
                          <div className="space-y-3 sm:space-y-4">
                            {(section.points || []).map((point, pointIdx) => (
                              <div key={`${point.item_name}-${pointIdx}`} className="border-2 border-slate-900 rounded-md p-4 sm:p-5 bg-white shadow-[2px_2px_0_#0f172a]">
                                <p className="font-black text-base text-slate-800 flex items-start gap-2">
                                  <span className="text-indigo-600 mt-0.5">▪</span>
                                  {point.item_name}
                                </p>
                                  {!!point.specifications && (
                                  <div className="text-sm text-slate-600 mt-2.5 pl-4 border-l-2 border-slate-200 font-medium">
                                    <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">{language === 'bn' ? 'সঠিক নিয়ম ও করণীয়' : 'Specifications'}</span>
                                    {point.specifications}
                                  </div>
                                )}
                                {!!point.importance && (
                                  <div className="text-sm text-slate-600 mt-3 pl-4 border-l-2 border-amber-300 font-medium">
                                    <span className="font-bold text-amber-500 block text-[10px] uppercase tracking-wider mb-0.5">{language === 'bn' ? 'কেন এটি প্রয়োজনীয়' : 'Importance'}</span>
                                    {point.importance}
                                  </div>
                                )}
                                {!!point.daily_check && (
                                  <div className="text-sm text-indigo-900 mt-3 pl-4 border-l-2 border-indigo-400 bg-indigo-50/30 p-3 rounded-r-xl font-medium">
                                    <span className="font-bold text-indigo-600 flex items-center gap-1 text-[10px] uppercase tracking-wider mb-0.5">
                                      <LandingIcon name="sparkles" className="w-3 h-3" />
                                      {language === 'bn' ? 'নিজেকে যাচাই করুন' : 'Daily Check'}
                                    </span>
                                    {point.daily_check}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                  </div>
                )}

                {!activeLifeSkillLoading && !activeLifeSkillContent && (
                  <div className="nb-card border-dashed p-4 sm:p-6 text-center text-slate-500 font-bold text-sm">
                    {activeLifeSkillError
                      ? (language === 'bn' ? 'এই মডিউলটি লোড করা যাচ্ছে না। একটু পরে আবার চেষ্টা করে দেখুন।' : 'Unable to load this content right now.')
                      : (language === 'bn'
                          ? 'এই মডিউলটির সম্পূর্ণ লেখাটি ট্রেনিং (Training) বিভাগে পাওয়া যাবে।'
                          : 'Full reading content for this module is available inside Training.')}
                  </div>
                )}
                {!!(activeLifeSkill.trusted_blurb_en || activeLifeSkill.trusted_blurb_bn) && (
                  <div className="lg:hidden nb-card border-dashed p-4 text-xs text-slate-600 leading-relaxed font-semibold">
                    <p className="font-extrabold text-slate-500 mb-1.5">{language === 'bn' ? 'নির্ভরযোগ্য তথ্যের উৎস' : 'Information Trust'}</p>
                    {language === 'bn' ? activeLifeSkill.trusted_blurb_bn : activeLifeSkill.trusted_blurb_en}
                  </div>
                )}
              </section>
            </div>
          </main>

          {/* Mobile lesson actions */}
          <div className="lg:hidden shrink-0 border-t-[2.5px] border-slate-900 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={openLifeSkills}
              className="w-full min-h-[44px] py-3 nb-btn-indigo font-black text-sm touch-manipulation"
            >
              {t.lifeSkillsTrack}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
