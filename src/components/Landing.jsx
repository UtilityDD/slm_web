import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { requestManager } from '../utils/requestManager';
import { leaderboardService } from '../utils/leaderboardService';
import { BOARD_IDS, getMonthlyPrizeDisplayList } from '../utils/monthlyEncouragementBoards';
import { APP_NAME, WEBSITE_URL } from '../config';
import { storageUtils } from '../utils/storageUtils';

const copy = {
  en: {
    tagline: 'Safety-first platform for West Bengal electrical linemen',
    heroTitle: 'Train. Compete. Stay Safe.',
    heroSubtitle:
      'SmartLineman helps linemen build safety habits, complete structured training, and earn recognition through fair competitions.',
    visionTitle: 'Our Vision',
    vision:
      'Every lineman in West Bengal works with confidence, modern safety knowledge, and community support—reducing accidents and protecting families.',
    missionTitle: 'Our Mission',
    mission:
      'Deliver practical 90-day training, daily safety tools, leaderboards, and rewards—so field work becomes safer and skills are visible.',
    statsUsers: 'Registered Linemen',
    statsToppers: 'Top Performers',
    statsPrizes: 'Prizes Awarded',
    topPlayers: 'New Player Leaders',
    newPlayersTopThree: 'Top 3 New Players',
    allTimeTopThree: 'All-Time — Top 3',
    login: 'Login',
    exploreLifeSkills: 'Explore Life Skills',
    lifeSkillsTitle: 'Life Skills Hub',
    lifeSkillsSubtitle: 'Short LS modules inside Training that build decision-making, communication, and field confidence.',
    lifeSkillsTrack: 'Life Skill track inside Training',
    lifeSkillsHint: 'Login to open Life Skill ✨ in Training',
    language: 'Language',
    live: 'Live community stats',
    loading: 'Loading…',
    pts: 'pts',
    prizeMonths: 'months with winners',
    footer: 'Empowering linemen through safety, learning, and recognition.',
  },
  bn: {
    tagline: 'পশ্চিমবঙ্গের লাইনম্যানদের নিরাপদ কাজের সঙ্গী',
    heroTitle: 'প্রশিক্ষণ নিন। প্রতিযোগিতা করুন। নিরাপদ থাকুন।',
    heroSubtitle:
      'স্মার্ট লাইনম্যানে নিরাপত্তার অভ্যাস গড়ে উঠবে, ধাপে ধাপে প্রশিক্ষণ হবে, আর ন্যায্য প্রতিযোগিতায় আপনার পরিশ্রমের স্বীকৃতি মিলবে।',
    visionTitle: 'আমাদের স্বপ্ন',
    vision:
      'পশ্চিমবঙ্গের প্রতিটি লাইনম্যান যেন আত্মবিশ্বাসে কাজ করে—আধুনিক নিরাপত্তা জানে, সহকর্মীর সাহায্য পায়, দুর্ঘটনা কমে, পরিবার নিরাপদ থাকে।',
    missionTitle: 'আমরা যা করি',
    mission:
      'মাঠের কাজের জন্য ৯০ দিনের প্রশিক্ষণ, নিরাপত্তার সরঞ্জাম, লিডারবোর্ড আর পুরস্কার—যাতে কাজ নিরাপদ হয় এবং ভালো কাজের কদর হয়।',
    statsUsers: 'যোগ দিয়েছেন',
    statsToppers: 'শীর্ষ পারফর্মার',
    statsPrizes: 'পুরস্কার দেওয়া হয়েছে',
    topPlayers: 'নতুন সদস্য — সেরা ৩',
    newPlayersTopThree: 'নতুন সদস্য — সেরা ৩ জন',
    allTimeTopThree: 'সর্বকালীন সেরা ৩ জন',
    login: 'লগইন',
    exploreLifeSkills: 'লাইফ স্কিল দেখুন',
    lifeSkillsTitle: 'লাইফ স্কিল',
    lifeSkillsSubtitle: 'প্রশিক্ষণ বিভাগের ছোট ছোট পাঠ—সিদ্ধান্ত নেওয়া, কথা বলা আর মাঠে আত্মবিশ্বাস বাড়ায়।',
    lifeSkillsTrack: 'প্রশিক্ষণে সব লাইফ স্কিল',
    lifeSkillsHint: 'সব লাইফ স্কিল খুলতে লগইন করুন ✨',
    language: 'ভাষা',
    live: 'এখনই লাইভ',
    loading: 'একটু অপেক্ষা…',
    pts: 'পয়েন্ট',
    prizeMonths: 'টি মাসে পুরস্কার',
    footer: 'নিরাপত্তা, শেখা আর স্বীকৃতি—লাইনম্যানের পাশে থাকি।',
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
  mental: { label_en: 'Mental Fitness', label_bn: 'মানসিক স্বাস্থ্য', color: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50' },
  financial: { label_en: 'Family Protection', label_bn: 'টাকা-পয়সা', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50' },
  digital: { label_en: 'Cyber Security', label_bn: 'অনলাইন নিরাপত্তা', color: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100/50' },
  social: { label_en: 'Professionalism', label_bn: 'কাজের আদব', color: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50' },
  health: { label_en: 'Field Health', label_bn: 'স্বাস্থ্য', color: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100/50' },
  family: { label_en: 'Child Security', label_bn: 'সন্তানের ভবিষ্যৎ', color: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100/50' },
  personal: { label_en: 'Healthy Life', label_bn: 'সুস্থ জীবন', color: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50' },
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
    'nb-card bg-amber-100',
    'nb-card bg-slate-100',
    'nb-card bg-orange-100',
  ];
  const rankBadgeText = bnFont ? ['১ম', '২য়', '৩য়'] : ['1st', '2nd', '3rd'];

  return (
    <section className="mb-8 sm:mb-10 relative z-10">
      <h2 className="text-base sm:text-lg font-black text-slate-900 mb-4 sm:mb-5 flex items-center gap-3">
        <SectionIconBadge name={iconName} tone={iconTone} />
        <span className="leading-snug nb-mono uppercase tracking-wide">{title}</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {players.map((player, idx) => {
          const isFirst = idx === 0;
          return (
            <div
              key={`${player.id}-${idx}`}
              className={`relative overflow-hidden flex flex-row items-center gap-4 sm:gap-5 p-4 sm:p-5 ${rankCardClass[idx] || rankCardClass[2]}`}
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

              <div className="min-w-0 flex-1 text-left pr-10 sm:pr-12">
                <p className="font-black text-lg sm:text-xl text-slate-900 truncate leading-snug">{player.name}</p>
                {(showScore || player.district) && (
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 sm:mt-2">
                    {showScore && (
                      <p className="nb-score-pill text-sm sm:text-base px-2.5 sm:px-3 py-1 tabular-nums">
                        {player.points} {ptsLabel}
                      </p>
                    )}
                    {player.district && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border-2 border-slate-900 nb-mono">
                        <LandingIcon name="mapPin" className="w-3.5 h-3.5 text-orange-500" />
                        {player.district}
                      </span>
                    )}
                  </div>
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
    <div className="nb-card p-3 sm:p-5">
      <div className="flex flex-col items-center text-center gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:text-left sm:gap-3">
        <div className={`nb-icon-badge w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center shrink-0 text-white ${ICON_TONES[tone] || ICON_TONES.orange}`}>
          <LandingIcon name={iconName} className="w-5 h-5 sm:w-7 sm:h-7" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 w-full">
          <p className="nb-stat-value text-2xl sm:text-4xl text-slate-900 leading-none">
            <AnimatedNumber value={value} loading={loading} />
          </p>
          <p className="nb-stat-label mt-1.5 sm:mt-1 line-clamp-2 sm:line-clamp-none">{label}</p>
          {sub && <p className="hidden sm:block text-[10px] font-bold text-slate-600 mt-1 truncate nb-mono">{sub}</p>}
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
    allTimeTop: [],
    prizesCount: 0,
    prizeMonths: 0,
  });
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

    async function loadStats() {
      setLoading(true);
      try {
        const [profilesResult, monthlyLeaderboard, encouragementBoards, allTimeLeaderboard, hallOfFame] = await Promise.all([
          requestManager.fetch(
            'landing_profiles_count',
            async () => {
              const { data, error } = await supabase.from('profiles').select('role, id');
              if (error) throw error;
              const linemen = (data || []).filter((p) => p.role === 'lineman').length;
              return { linemen };
            },
            { ttl: 10, swr: true }
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
        const allTimeTopThree = (allTimeLeaderboard || []).slice(0, 3).map(mapLandingPlayer);

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
            users: profilesResult?.linemen ?? 0,
            newPlayerTop: newPlayerTopThree,
            allTimeTop: allTimeTopThree,
            prizesCount,
            prizeMonths,
          });
        }
      } catch (err) {
        console.warn('Landing stats fetch failed:', err);
        if (!cancelled) {
          setStats((prev) => ({ ...prev, newPlayerTop: [], allTimeTop: [] }));
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
      className={`landing-page-light landing-neo-brutal min-h-full text-slate-900 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:pb-16 ${bnFont ? 'lang-bn' : 'font-sans'}`}
    >
      <div className="nb-hazard" aria-hidden="true" />

      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b-[2.5px] border-slate-900 bg-white safe-area-inset-top">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-baseline gap-1.5 select-none min-w-0">
            <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">SmartLineMan</span>
            <span className="text-[9px] sm:text-[10px] font-black text-slate-900 bg-orange-400 px-1.5 py-0.5 rounded border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] shrink-0 nb-mono">.in</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              className="flex border-2 border-slate-900 rounded-md overflow-hidden bg-white text-[11px] sm:text-xs font-bold nb-mono shadow-[3px_3px_0_#0f172a]"
              role="group"
              aria-label={t.language}
            >
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 px-2.5 sm:px-3 py-1.5 touch-manipulation border-r-2 border-slate-900 ${language === 'en' ? 'bg-orange-500 text-white' : 'bg-white text-slate-900 hover:bg-orange-50'}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('bn')}
                className={`min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 px-2.5 sm:px-3 py-1.5 touch-manipulation ${language === 'bn' ? 'bg-orange-500 text-white' : 'bg-white text-slate-900 hover:bg-orange-50'}`}
              >
                বাং
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('login')}
              className="inline-flex sm:hidden items-center min-h-[36px] px-3 py-1.5 nb-btn-primary text-xs font-bold touch-manipulation"
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

      <div className="max-w-5xl mx-auto px-3 sm:px-6 pb-8 sm:pb-16 relative">

        {/* Hero Section Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center pt-5 sm:pt-12 pb-8 sm:pb-12 relative z-10">
          <div className="lg:col-span-7 text-center lg:text-left">
            <h1 className={`font-black text-slate-900 leading-[1.2] sm:leading-tight mb-3 sm:mb-4 tracking-tight text-balance ${bnFont ? 'text-[1.6rem] sm:text-4xl md:text-6xl' : 'text-3xl sm:text-5xl md:text-6xl'}`}>
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
            
            <p className="hidden sm:block text-slate-500 text-sm font-semibold tracking-wider uppercase mb-2">{t.tagline}</p>
            <p className={`text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed mb-6 sm:mb-8 font-medium mx-auto lg:mx-0 ${bnFont ? 'landing-bn-reading' : ''}`}>{t.heroSubtitle}</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="hidden sm:inline-flex w-full sm:w-auto min-h-[48px] px-8 py-4 nb-btn-primary font-black text-lg touch-manipulation items-center justify-center"
              >
                {t.login}
              </button>
              <a
                href="#life-skills"
                className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 sm:py-4 nb-btn-secondary font-bold text-center flex items-center justify-center gap-2 touch-manipulation"
              >
                {t.exploreLifeSkills}
                <svg className="w-4 h-4 text-slate-400 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </a>
            </div>
          </div>

          {/* Desktop Right side preview mock card */}
          <div className="lg:col-span-5 hidden lg:block">
            <div className="nb-card p-6 select-none">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <SectionIconBadge name="shield" tone="emerald" className="w-9 h-9" />
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{language === 'bn' ? 'নিরাপত্তা মিটার' : 'Safety Meter'}</h4>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider nb-mono">{language === 'bn' ? 'লাইভ দেখুন' : 'Live Display'}</p>
                  </div>
                </div>
                <span className="nb-live-badge text-[10px] px-2 py-1">99.8% SAFE</span>
              </div>
              <div className="space-y-3.5">
                <div className="p-3 bg-white border-2 border-slate-900 rounded-md shadow-[3px_3px_0_#0f172a]">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5 nb-mono">
                    <span>{language === 'bn' ? 'আজ পিপিই ঠিক আছে কি না' : 'Daily PPE Checklist'}</span>
                    <span className="text-orange-600">100%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-3 border-2 border-slate-900 overflow-hidden">
                    <div className="bg-orange-500 h-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="p-3 bg-white border-2 border-slate-900 rounded-md shadow-[3px_3px_0_#0f172a]">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5 nb-mono">
                    <span>{language === 'bn' ? '৯০ দিনের নিরাপত্তা স্কোর' : '90 Days Safety Score'}</span>
                    <span className="text-indigo-600">940 pts</span>
                  </div>
                  <div className="w-full bg-slate-200 h-3 border-2 border-slate-900 overflow-hidden">
                    <div className="bg-indigo-600 h-full" style={{ width: '85%' }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 p-2.5 bg-orange-100 border-2 border-slate-900 rounded-md text-center shadow-[2px_2px_0_#0f172a]">
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-0.5 nb-mono">{language === 'bn' ? 'আজকের পাঠ' : 'Today\'s Lesson'}</p>
                    <p className="text-xs font-black text-slate-900">LS01 Stress</p>
                  </div>
                  <div className="flex-1 p-2.5 bg-emerald-100 border-2 border-slate-900 rounded-md text-center shadow-[2px_2px_0_#0f172a]">
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-0.5 nb-mono">{language === 'bn' ? 'র‍্যাঙ্ক' : 'Community Rank'}</p>
                    <p className="text-xs font-black text-slate-900 flex items-center justify-center gap-1">
                      <LandingIcon name="medal" className="w-3.5 h-3.5" />
                      Top 3
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Stats Grid — 3-up on mobile */}
        <section className="grid grid-cols-3 gap-2 sm:gap-5 mb-8 sm:mb-12 relative z-10">
          <StatTile label={t.statsUsers} value={stats.users} iconName="users" tone="orange" loading={loading} />
          <StatTile
            label={t.statsToppers}
            value={stats.newPlayerTop.length}
            iconName="userPlus"
            tone="emerald"
            loading={loading}
            sub={!loading && stats.newPlayerTop.length ? t.topPlayers : undefined}
          />
          <StatTile
            label={t.statsPrizes}
            value={stats.prizesCount}
            iconName="gift"
            tone="violet"
            loading={loading}
            sub={prizeSub}
          />
        </section>

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
          title={t.allTimeTopThree}
          iconName="trophy"
          iconTone="amber"
          players={stats.allTimeTop}
          ptsLabel={t.pts}
          bnFont={bnFont}
        />

        {/* Vision & Mission section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12 relative z-10">
          <article className="nb-card p-5 sm:p-7 bg-amber-50">
            <SectionIconBadge name="eye" tone="amber" className="mb-4" />
            <h2 className="text-xl font-black text-slate-900 mb-2.5">{t.visionTitle}</h2>
            <p className={`text-slate-700 leading-relaxed text-sm sm:text-base font-medium ${bnFont ? 'landing-bn-reading' : ''}`}>{t.vision}</p>
          </article>
          
          <article className="nb-card p-5 sm:p-7 bg-cyan-50">
            <SectionIconBadge name="target" tone="cyan" className="mb-4" />
            <h2 className="text-xl font-black text-slate-900 mb-2.5">{t.missionTitle}</h2>
            <p className={`text-slate-700 leading-relaxed text-sm sm:text-base font-medium ${bnFont ? 'landing-bn-reading' : ''}`}>{t.mission}</p>
          </article>
        </section>

        {/* Life Skills Course grid */}
        <section id="life-skills" className="mb-8 sm:mb-12 relative z-10 scroll-mt-20">
          <div className="nb-card p-4 sm:p-8 bg-white">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5 flex items-center gap-2.5">
                  <SectionIconBadge name="book" tone="indigo" className="w-9 h-9" />
                  <span className="nb-mono uppercase tracking-wide text-base sm:text-xl">{t.lifeSkillsTitle}</span>
                </h3>
                <p className="text-sm text-slate-500 max-w-2xl font-medium leading-relaxed">
                  {t.lifeSkillsSubtitle}
                </p>
              </div>
            </div>
            
            <div className="landing-life-skills-scroll flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6 -mx-1 px-1 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 snap-x snap-mandatory">
              {(lifeSkillModules.length
                ? lifeSkillModules
                : [
                    { lesson_code: 'LS01', title_en: 'Stress Management', title_bn: 'মানসিক চাপ নিয়ন্ত্রণ', category: 'mental', duration: '5 min' },
                    { lesson_code: 'LS02', title_en: 'Financial Awareness', title_bn: 'আর্থিক সচেতনতা', category: 'financial', duration: '8 min' },
                    { lesson_code: 'LS03', title_en: 'Digital Safety', title_bn: 'ডিজিটাল নিরাপত্তা', category: 'digital', duration: '6 min' },
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
                    className="group relative text-left p-4 sm:p-6 nb-card bg-indigo-50 hover:bg-indigo-100 active:translate-x-0.5 active:translate-y-0.5 flex flex-col justify-between min-h-[168px] sm:min-h-[180px] w-[min(78vw,280px)] sm:w-auto shrink-0 sm:shrink snap-center touch-manipulation"
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
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t-2 border-slate-900 pt-5">
              <button
                type="button"
                onClick={openLifeSkills}
                className="px-6 py-3 nb-btn-indigo text-sm font-black"
              >
                {t.lifeSkillsTrack}
              </button>
              <p className="text-xs text-slate-400 font-bold">
                {t.lifeSkillsHint}
              </p>
            </div>
          </div>
        </section>

        <footer className="nb-footer text-center sm:text-left text-xs pt-6 sm:pt-8 pb-8 mt-8 sm:mt-12">
          <p className="font-semibold text-slate-200">{t.footer}</p>
          <p className="mt-1.5 font-bold text-white">
            {APP_NAME} ·{' '}
            <a href={WEBSITE_URL} className="text-orange-400 hover:underline" target="_blank" rel="noopener noreferrer">
              {WEBSITE_URL.replace(/^https?:\/\//, '')}
            </a>
          </p>
        </footer>
      </div>

      {/* Mobile sticky Login CTA */}
      {!activeLifeSkill && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#fffdf7] border-t-[2.5px] border-slate-900">
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
                {language === 'bn' ? 'বন্ধ' : 'Close'}
                </button>
              </div>
            </header>

          <main ref={lifeSkillModalScrollRef} className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-24">
              <aside className="lg:col-span-4 space-y-4 sm:space-y-5 order-first lg:order-none lg:sticky lg:top-24 h-max">
                {/* Duration & Info */}
                <div className="nb-card p-4 sm:p-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-2 nb-mono">
                    {language === 'bn' ? 'এই পাঠ সম্পর্কে' : 'Module Info'}
                  </p>
                  {!!activeLifeSkill.duration && (
                    <p className="text-sm text-slate-600 font-bold">
                      <span>{language === 'bn' ? 'সময়' : 'Duration'}:</span> {activeLifeSkill.duration}
                    </p>
                  )}
                </div>

                {/* Audio Lesson Player — surfaced early on mobile */}
                {!!(activeLifeSkill.audio_url_en || activeLifeSkill.audio_url_bn) && (
                  <div className="nb-card p-4 sm:p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-2.5 nb-mono">
                      {language === 'bn' ? 'শুনে শুনে শিখুন' : 'Audio Lesson'}
                    </p>
                    <div className="bg-indigo-50 p-3 sm:p-4 border-2 border-slate-900 rounded-md text-center shadow-[3px_3px_0_#0f172a]">
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center nb-icon-badge bg-indigo-600">
                        <LandingIcon name="headphones" className="w-6 h-6" strokeWidth={2} />
                      </div>
                      <p className="text-xs font-bold text-slate-500 mb-3 sm:mb-4">{language === 'bn' ? 'মাঠে কাজের সময় শোনার জন্য' : 'Listen on-the-go during field work'}</p>
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
                    <p className="font-extrabold text-slate-500 mb-1.5">{language === 'bn' ? 'তথ্যের উৎস' : 'Information Trust'}</p>
                    {language === 'bn' ? activeLifeSkill.trusted_blurb_bn : activeLifeSkill.trusted_blurb_en}
                  </div>
                )}

                {/* Close & Action Panel — desktop sidebar */}
                <div className="hidden lg:block nb-card p-5 space-y-2.5">
                  <button
                    type="button"
                    onClick={openLifeSkills}
                    className="w-full py-3.5 nb-btn-indigo font-black text-sm"
                  >
                    {t.lifeSkillsTrack}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLifeSkill(null)}
                    className="w-full py-3.5 nb-btn-secondary text-sm font-bold"
                  >
                      {language === 'bn' ? 'বন্ধ' : 'Close'}
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
                    {language === 'bn' ? 'লোড হচ্ছে…' : 'Loading full content...'}
                  </div>
                )}

                {!activeLifeSkillLoading && translatedLifeSkillContent && (
                  <div className="space-y-5">
                    {!!translatedLifeSkillContent.mission_briefing && (
                      <article className={`nb-card p-4 sm:p-6 ${bnFont ? 'landing-bn-reading' : ''}`}>
                        <h5 className={`text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-3 nb-mono ${bnFont ? 'landing-bn-ui' : ''}`}>
                          {language === 'bn' ? 'শুরুর কথা' : 'Mission Briefing'}
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
                                    <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">{language === 'bn' ? 'কী করবেন' : 'Specifications'}</span>
                                    {point.specifications}
                                  </div>
                                )}
                                {!!point.importance && (
                                  <div className="text-sm text-slate-600 mt-3 pl-4 border-l-2 border-amber-300 font-medium">
                                    <span className="font-bold text-amber-500 block text-[10px] uppercase tracking-wider mb-0.5">{language === 'bn' ? 'কেন জরুরি' : 'Importance'}</span>
                                    {point.importance}
                                  </div>
                                )}
                                {!!point.daily_check && (
                                  <div className="text-sm text-indigo-900 mt-3 pl-4 border-l-2 border-indigo-400 bg-indigo-50/30 p-3 rounded-r-xl font-medium">
                                    <span className="font-bold text-indigo-600 flex items-center gap-1 text-[10px] uppercase tracking-wider mb-0.5">
                                      <LandingIcon name="sparkles" className="w-3 h-3" />
                                      {language === 'bn' ? 'আজই চেক করুন' : 'Daily Check'}
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
                      ? (language === 'bn' ? 'এখন এই পাঠ লোড হচ্ছে না। একটু পর আবার চেষ্টা করুন।' : 'Unable to load this content right now.')
                      : (language === 'bn'
                          ? 'এই পাঠের বাকি অংশ প্রশিক্ষণ বিভাগে পাবেন।'
                          : 'Full reading content for this module is available inside Training.')}
                  </div>
                )}
                {!!(activeLifeSkill.trusted_blurb_en || activeLifeSkill.trusted_blurb_bn) && (
                  <div className="lg:hidden nb-card border-dashed p-4 text-xs text-slate-600 leading-relaxed font-semibold">
                    <p className="font-extrabold text-slate-500 mb-1.5">{language === 'bn' ? 'তথ্যের উৎস' : 'Information Trust'}</p>
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
