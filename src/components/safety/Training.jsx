import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import secureStorage from '../../utils/secureStorage';
import { supabase } from '../../supabaseClient';
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL, CORE_LESSON_MONTHLY_BONUS_ENABLED, CORE_LESSON_MONTHLY_BONUS_LAUNCH_ISO } from '../../config';
import HomeSkeleton from '../loaders/HomeSkeleton';
import { calculateLevelFromProgress, getBadgeByLevel, getRoadmapBadgeByLevel } from '../../utils/badgeUtils';
import { cacheHelper } from '../../utils/cacheHelper';
import { invalidateLeaderboardCaches } from '../../utils/leaderboardCacheKeys';
import { storageUtils } from '../../utils/storageUtils';
import { requestManager } from '../../utils/requestManager';
import ChapterQuizModal from '../ChapterQuizModal';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import LessonCelebration from './LessonCelebration';
import LessonCompleteHero from './LessonCompleteHero';
import LessonScoreStatusFlip from './LessonScoreStatusFlip';
import LessonContinueStrip from './LessonContinueStrip';
import LessonRadioOverlay from './LessonRadioOverlay';
import PPESurveyModal from './PPESurveyModal';
import OnboardingSequence from './OnboardingSequence';
import { DotLottiePlayer } from '@dotlottie/react-player';
import calendarLottie from '../../assets/calendar.lottie';
import protipLottie from '../../assets/protip.lottie';
import mythLottie from '../../assets/myth.lottie';
import clockLottie from '../../assets/clock.lottie';
import { resolveTrainingMediaSrc, trainingMediaRefLooksLikeImage } from '../../utils/trainingMediaUrl';
import {
    loadSupplementaryCompletedModuleIds,
    appendSupplementaryCompletion,
} from '../../utils/supplementaryProgressStorage';
import {
    filterCoreCompletedLessonIds,
    isSupplementaryProgressLessonId,
    buildLifeSkillBonusQuizId,
    buildLifeSkillActiveCooldowns,
    buildLifeSkillTotalsByModule,
    getLifeSkillScoreCooldownDaysLeft,
    LIFE_SKILL_MONTHLY_BONUS_POINTS,
    buildCoreLessonMonthlyBonusQuizId,
    buildCoreLessonActiveCooldowns,
    getCoreLessonScoreCooldownDaysLeft,
    lessonIdFromCoreLessonBonusQuizId,
    CORE_LESSON_MONTHLY_BONUS_POINTS,
} from '../../utils/trainingLessonIds';
import { logReadingHabitCompletion, logReadingHabitReview } from '../../utils/readingHabitLog';
import {
    consumeGateNavigation,
    consumeGateReviewTarget,
    consumeGateUnlockPending,
    peekGateUnlockPending,
    parseCoreLessonId as parseGateLessonId,
} from '../../utils/readingGateStorage';
import { pickSupplementaryListenSrc } from '../../utils/supplementaryAudioUrl';
import { useLifeSkillRadio } from '../../context/LifeSkillRadioContext';
import { blockGuestWrite, isGuestUser, guestPreviewText } from '../../utils/guestPreview';
import {
    FAQ_GROUPS,
    FAQ_PAGE_TITLE,
    filterFaqQuestions,
    getFaqGroupCounts,
    getFaqResultSummary,
    normalizeFaqTitle,
} from '../../utils/faqFilters';

const LOADING_TIPS = {
    en: [
        'Verify isolation and tagging before touching conductors.',
        'Inspect helmet, harness, and gloves before line work.',
        'Treat conductors as live until proven otherwise.',
        'Use only insulated tools rated for the voltage you work on.',
        'Follow your permit and work with a partner when required.',
    ],
    bn: [
        'স্পর্শ করার আগে আইসোলেশন ও ট্যাগিং যাচাই করুন।',
        'লাইনের কাজের আগে হেলমেট, হারনেস ও গ্লাভস দেখে নিন।',
        'প্রমাণ না হওয়া পর্যন্ত সব তার সচল মনে করুন।',
        'কাজের ভোল্টেজ অনুযায়ী অনুমোদিত ইনসুলেটেড টুল ব্যবহার করুন।',
        'পারমিট মেনে চলুন; প্রয়োজনে সঙ্গী নিয়ে কাজ করুন।',
    ],
};

/** Shared hardcover art for the lesson cover (preloaded on Training mount). */
const LESSON_COVER_IMAGE_SRC = '/assets/covers/lesson-cover-smartlineman.webp';

const ONBOARDING_COMPLETE_KEY = 'hasSeenOnboarding';
const ONBOARDING_LEGACY_DATE_KEY = 'lastOnboardingDate';
const DAILY_BRIEF_DISMISS_KEY = 'slm_daily_brief_dismissed';

function hasCompletedOnboarding() {
    if (typeof window === 'undefined') return true;
    if (localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true') return true;
    if (localStorage.getItem(ONBOARDING_LEGACY_DATE_KEY)) {
        localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        return true;
    }
    return false;
}

function isDailyBriefDismissedToday() {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(DAILY_BRIEF_DISMISS_KEY) === new Date().toDateString();
}

/** Home / deep links use `#/training?tab=supplementary` (aliases: life-skill, lifeskill). */
function readTrainingSurfaceFromHash() {
    if (typeof window === 'undefined') return 'core';
    const tabMatch = window.location.hash.match(/[?&]tab=([^&]*)/);
    if (!tabMatch) return 'core';
    const tab = decodeURIComponent(tabMatch[1]);
    if (tab === 'supplementary' || tab === 'life-skill' || tab === 'lifeskill') return 'supplementary';
    return 'core';
}

function writeTrainingSurfaceHash(surface) {
    if (typeof window === 'undefined') return;
    const next =
        surface === 'supplementary' ? '#/training?tab=supplementary' : '#/training';
    if (window.location.hash !== next) {
        window.history.replaceState(null, '', next);
    }
}

/** Short warning chime when lesson advance is blocked (user gesture present). */
function playLessonAdvanceBlockedChime() {
    if (typeof window === 'undefined') return;
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const master = ctx.createGain();
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        master.gain.value = reduce ? 0.1 : 0.2;
        master.connect(ctx.destination);

        const schedule = (delaySec, freqHz, durSec) => {
            const t0 = ctx.currentTime + delaySec;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freqHz, t0);
            osc.connect(g);
            g.connect(master);
            g.gain.setValueAtTime(0, t0);
            g.gain.linearRampToValueAtTime(1, t0 + 0.012);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + durSec);
            osc.start(t0);
            osc.stop(t0 + durSec + 0.02);
        };

        schedule(0, 820, 0.065);
        schedule(0.1, 620, 0.085);

        window.setTimeout(() => {
            ctx.close().catch(() => {});
        }, 400);
    } catch {
        /* ignore */
    }
}

const PPE_MAP = {
    1: { name: "Safety Helmet", icon: "🪖", image: "/quizzes/faq_images/Safety_Helmet.webp" },
    2: { name: "Safety Shoes/Boots", icon: "🥾", image: "/quizzes/faq_images/safety_shoe_1.webp" },
    3: { name: "Insulated Gloves", icon: "🧤", image: "/quizzes/faq_images/Electrical_Gloves.webp" },
    4: { name: "Reflective Jacket", icon: "🦺" },
    5: { name: "Safety Belt", icon: "🧗" },
    6: { name: "Full Body Harness", icon: "🧗‍♂️" },
    7: { name: "Voltage Detector", icon: "🔌" },
    8: { name: "Discharge Rod", icon: "🦯" },
    9: { name: "Safety Goggles", icon: "🥽" },
    10: { name: "Torch/Emergency Light", icon: "🔦" }
};

const toBengaliNumber = (num, lang) => {
    if (!num) return '';
    if (lang !== 'bn') return num;
    const bnNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(digit => bnNumbers[digit] || digit).join('');
};

/** Chapters 1–9 = main reading program (matches manifest core path). */
const CORE_PROGRAM_LAST_CHAPTER = 9;
const DEFAULT_CORE_CHAPTER_COUNTS = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 11, 7: 10, 8: 10, 9: 10 };

function getCoreChapterLessonCount(chapterNum, trainingChapters) {
    const chap = Array.isArray(trainingChapters) ? trainingChapters.find((c) => c.number === chapterNum) : null;
    if (chap && Number(chap.count) > 0) return Number(chap.count);
    return DEFAULT_CORE_CHAPTER_COUNTS[chapterNum] || 0;
}

function sumCoreProgramLessonTotal(trainingChapters) {
    let sum = 0;
    for (let n = 1; n <= CORE_PROGRAM_LAST_CHAPTER; n++) {
        sum += getCoreChapterLessonCount(n, trainingChapters);
    }
    return sum;
}

function countCoreProgramLessonsCompleted(completedLessons) {
    const core = filterCoreCompletedLessonIds(Array.isArray(completedLessons) ? completedLessons : []);
    return core.filter((id) => {
        const m = String(id).match(/^(\d+)\.(\d+)$/);
        if (!m) return false;
        const ch = parseInt(m[1], 10);
        return ch >= 1 && ch <= CORE_PROGRAM_LAST_CHAPTER;
    }).length;
}

/** First chapter in 1..9 with an incomplete lesson; null if all core lessons done. */
function getActiveCoreChapterNumber(completedLessons, trainingChapters) {
    const core = new Set(filterCoreCompletedLessonIds(Array.isArray(completedLessons) ? completedLessons : []));
    for (let n = 1; n <= CORE_PROGRAM_LAST_CHAPTER; n++) {
        const lessonCount = getCoreChapterLessonCount(n, trainingChapters);
        for (let i = 1; i <= lessonCount; i++) {
            if (!core.has(`${n}.${i}`)) return n;
        }
    }
    return null;
}

/**
 * Welcome-card copy from reading lesson ids only (chapters 1–9 vs manifest counts).
 * @returns {{ primary: string, secondary: string | null } | null}
 */
function buildLessonProgressWelcomeCopy({ completedLessons, trainingChapters, language, readingPoints }) {
    const total = sumCoreProgramLessonTotal(trainingChapters);
    const done = countCoreProgramLessonsCompleted(completedLessons);
    const activeChapter = getActiveCoreChapterNumber(completedLessons, trainingChapters);
    const levelNum = calculateLevelFromProgress(completedLessons, trainingChapters);
    const badge = getBadgeByLevel(levelNum, readingPoints || 0);

    if (language === 'bn') {
        const d = toBengaliNumber(done, 'bn');
        const t = toBengaliNumber(total, 'bn');
        const chBn = activeChapter != null ? toBengaliNumber(activeChapter, 'bn') : null;
        if (done === 0) {
            return {
                primary: 'এখনো কোনো পড়ার পাঠ শেষ করেননি। সময় হলে প্রথম পাঠটি খুলে নিন।',
                secondary: null,
            };
        }
        if (activeChapter === null) {
            return {
                primary: `মূল পাঠ ${t}টাই শেষ। অসাধারণ!`,
                secondary: `ধাপ: ${badge.bn}`,
            };
        }
        const primary = `পড়ার পাঠ ${d}টা শেষ, মোট ${t}টার মধ্যে। এখন ${chBn} নম্বর অধ্যায় চলছে।`;
        return {
            primary,
            secondary: `ধাপ: ${badge.bn}`,
        };
    }

    if (done === 0) {
        return {
            primary: "You haven't finished a reading lesson yet. Open the first lesson when you're ready.",
            secondary: null,
        };
    }
    if (activeChapter === null) {
        return {
            primary: `You've completed all ${total} core reading lessons. Excellent work!`,
            secondary: `Badge: ${badge.en}`,
        };
    }
    return {
        primary: `You've completed ${done} of ${total} reading lessons. You're in Chapter ${activeChapter}.`,
        secondary: `Badge: ${badge.en}`,
    };
}

/** Map internal id (e.g. supp_10_3) to LS03 when catalogue `lesson_code` is missing (cache / old data). */
const deriveLifeSkillCodeFromLevelId = (levelId) => {
    if (typeof levelId !== 'string') return '';
    const m = levelId.trim().match(/^supp_10_(\d{1,2})$/i);
    if (!m) return '';
    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n) || n < 1 || n > 99) return '';
    return `LS${String(n).padStart(2, '0')}`;
};

/** Header / hero: Life Skill modules use short codes (LS01); core lessons keep level_id.
 * Life Skill code digits always stay Latin (LS01), even in Bengali UI.
 */
const getTrainingHeaderLessonCode = (trainingContent, lang) => {
    if (!trainingContent?.level_id) return '';
    if (trainingContent.isSupplementary) {
        let code = '';
        if (typeof trainingContent.lesson_code === 'string' && trainingContent.lesson_code.trim()) {
            code = trainingContent.lesson_code.trim();
        } else {
            code = deriveLifeSkillCodeFromLevelId(trainingContent.level_id);
        }
        return code || '';
    }
    return lang === 'bn' ? toBengaliNumber(trainingContent.level_id, lang) : `${trainingContent.level_id}`;
};

const TrainingSkeleton = () => (
    <div className="mx-auto max-w-3xl animate-pulse space-y-4">
        {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 border-b border-slate-200 py-5">
                <div className="h-12 w-12 shrink-0 bg-slate-200 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-5 bg-slate-200 w-3/4 rounded"></div>
                    <div className="h-3 bg-slate-100 w-1/2 rounded"></div>
                    <div className="h-1.5 bg-slate-100 w-full max-w-md rounded-full"></div>
                </div>
            </div>
        ))}
    </div>
);

const TrainingChapterCard = React.memo(({ chapter, completedLessons, language, onClick }) => {
    const isFAQ = chapter.number === 10;
    const completedCount = completedLessons.filter(id => id && id.toString().startsWith(`${chapter.number}.`)).length;
    const progress = chapter.count > 0 ? Math.min(100, Math.round((completedCount / chapter.count) * 100)) : 0;

    return (
        <div
            onClick={() => onClick(chapter)}
            className={`flex cursor-pointer items-start gap-4 border-b-2 border-slate-900/10 px-1 py-5 transition-colors hover:bg-orange-50/40 active:bg-orange-50/60 sm:gap-5 sm:py-6 ${isFAQ ? 'hover:bg-violet-50/40' : ''}`}
        >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-black border-2 transition-colors ${isFAQ
                ? 'bg-violet-100 text-violet-600 border-violet-200'
                : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white border-orange-500'
                }`}>
                {isFAQ ? '?' : chapter.number}
            </div>

            <div className="min-w-0 flex-1">
                <h3 className={`font-black leading-snug text-lg sm:text-xl ${language === 'bn' ? 'font-bengali' : ''} ${isFAQ
                    ? 'text-violet-900 group-hover:text-violet-700'
                    : 'text-token-text-primary'
                    }`}>
                    {chapter.title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-token-text-muted sm:text-sm">
                    {isFAQ ? (
                        language === 'en' ? 'Reference Guide' : 'রেফারেন্স গাইড'
                    ) : (
                        language === 'en' ? (
                            `${chapter.count} lessons`
                        ) : (
                            `${toBengaliNumber(chapter.count, 'bn')}টি পাঠ`
                        )
                    )}
                </p>

                {!isFAQ && (
                    <div className="mt-3 space-y-1.5">
                        <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-token-bg-page">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${progress === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold text-token-text-muted">
                            <span>{completedCount}/{chapter.count} {language === 'en' ? 'complete' : 'সম্পন্ন'}</span>
                            <span className={progress === 100 ? 'text-emerald-600' : 'text-orange-600'}>{progress}%</span>
                        </div>
                    </div>
                )}

                {isFAQ && (
                    <p className="mt-2 text-xs font-bold text-violet-600">
                        {language === 'en' ? 'Access Knowledge →' : 'জ্ঞান অন্বেষণ করুন →'}
                    </p>
                )}
            </div>

            <span className="mt-1 shrink-0 text-slate-400" aria-hidden>→</span>
        </div>
    );
});

const TrainingSubChapterCard = React.memo(({ subchapter, isUnlocked, isCompleted, isNext, language, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`flex-shrink-0 w-[240px] sm:w-[280px] snap-center relative aspect-[3/4] rounded-[2.5rem] overflow-hidden transition-all duration-500 group ${isUnlocked ? 'cursor-pointer hover:scale-[1.02] hover:-translate-y-2' : 'cursor-not-allowed grayscale'
                }`}
        >
            {/* Book Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-700 ${isCompleted
                ? 'from-emerald-400 via-emerald-500 to-teal-600'
                : isUnlocked
                    ? 'from-orange-400 via-orange-500 to-rose-500'
                    : 'from-slate-400 to-slate-600'
                } ${isNext ? 'animate-pulse-slow' : ''}`} />

            {/* Decorative Patterns */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black rounded-full -ml-16 -mb-16 blur-3xl" />
            </div>

            {/* Glass Overlay */}
            <div className="absolute inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-[2px] border border-white/20" />

            {/* Content Layout */}
            <div className="absolute inset-0 p-8 flex flex-col items-center text-center">
                {/* Status Badge */}
                <div className={`self-end px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${isCompleted
                    ? 'bg-emerald-500/20 text-white border-emerald-400/30'
                    : isUnlocked
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-black/20 text-slate-300 border-white/10'
                    }`}>
                    {isCompleted ? (language === 'en' ? 'Done' : 'সম্পন্ন') : (isUnlocked ? (language === 'en' ? 'Ready' : 'শুরু করুন') : (language === 'en' ? 'Locked' : 'লক'))}
                </div>

                {/* Center Icon/Number */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mb-4 shadow-2xl transition-transform duration-500 group-hover:rotate-6 ${isCompleted ? 'bg-white/30' : 'bg-white/20'
                        }`}>
                        {isCompleted ? '⭐' : (isUnlocked ? '📖' : '🔒')}
                    </div>
                    <div className="text-[10px] font-black text-white/60 tracking-[0.2em] uppercase mb-1">
                        {language === 'en' ? 'Lesson' : 'পাঠ'} {subchapter.level_id}
                    </div>
                </div>

                {/* Title Section */}
                <div className="w-full">
                    <h4 className={`text-xl font-black text-white leading-tight mb-2 drop-shadow-lg ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {subchapter.level_title}
                    </h4>
                    <div className="h-1 w-12 bg-white/30 rounded-full mx-auto" />
                </div>
            </div>

            {/* Next Indicator */}
            {isNext && (
                <div className="absolute top-4 left-4">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full shadow-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[9px] font-black text-token-text-primary uppercase tracking-tighter">Next Up</span>
                    </div>
                </div>
            )}
        </div>
    );
});

/** Rank milestone — wide career plaque (clearly distinct from circular lesson nodes). */
function RankMilestone({ badge, language, isUnlocked, isCurrent, prefersReducedMotion }) {
    const name = language === 'en' ? badge.en : badge.bn;
    const tier = badge.level;
    const animateIn = isUnlocked && !prefersReducedMotion;
    const isActiveRank = isCurrent && isUnlocked;

    const shellClass = isActiveRank
        ? 'border-orange-400 bg-white shadow-lg shadow-orange-500/20 ring-2 ring-orange-400/35'
        : isUnlocked
            ? 'border-slate-200/80 bg-white shadow-md'
            : 'border-slate-200 bg-slate-50 shadow-sm opacity-90';
    const iconShell = isUnlocked
        ? `${badge.color} ${badge.medalText} shadow-sm`
        : 'bg-slate-200 text-slate-500 grayscale';
    const nameClass = isUnlocked ? 'text-slate-900' : 'text-slate-500';
    const nameSize = language === 'bn'
        ? 'font-bengali text-base sm:text-lg leading-snug'
        : 'text-[0.95rem] sm:text-base leading-snug tracking-tight';

    return (
        <div
            className={`training-rank-badge relative ${animateIn ? 'animate-rank-badge-in' : ''}`}
            role="img"
            aria-label={name}
        >
            <div
                className={[
                    'flex min-w-[11rem] max-w-[14rem] items-center gap-2.5 rounded-2xl border px-2.5 py-2.5 sm:min-w-[12rem] sm:max-w-[15rem] sm:gap-3 sm:px-3 sm:py-3',
                    shellClass,
                ].join(' ')}
            >
                <div
                    className={[
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl',
                        iconShell,
                        isUnlocked && tier >= 9 && !prefersReducedMotion ? 'animate-rank-medal-glow' : '',
                    ].filter(Boolean).join(' ')}
                    aria-hidden
                >
                    <span className="leading-none select-none">
                        {isUnlocked ? badge.icon : '🔒'}
                    </span>
                </div>
                <p className={`mb-0 min-w-0 flex-1 text-left font-black [overflow-wrap:anywhere] ${nameSize} ${nameClass}`}>
                    {name}
                </p>
            </div>
        </div>
    );
}

const LINEMAN_EMOJI_FALLBACK = '👷';

/** Open trail companion beside the next lesson — profile photo or lineman emoji + score. */
function RoadmapNextMarker({ language, score, prefersReducedMotion, anchorRight, avatarUrl, userId }) {
    const pointsLabel = language === 'en' ? 'points' : 'পয়েন্ট';
    const formattedScore = (score || 0).toLocaleString('en-US');
    const floatClass = !prefersReducedMotion ? 'sm:animate-roadmap-marker-float' : '';
    const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState(() => avatarUrl?.trim() || '');
    const [avatarFailed, setAvatarFailed] = useState(false);

    useEffect(() => {
        setAvatarFailed(false);
        const trimmed = avatarUrl?.trim() || '';
        if (trimmed) {
            setResolvedAvatarUrl(trimmed);
            return undefined;
        }

        if (!userId) {
            setResolvedAvatarUrl('');
            return undefined;
        }

        let cancelled = false;
        supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', userId)
            .maybeSingle()
            .then(({ data }) => {
                if (cancelled) return;
                setResolvedAvatarUrl(data?.avatar_url?.trim() || '');
            })
            .catch(() => {
                if (!cancelled) setResolvedAvatarUrl('');
            });

        return () => {
            cancelled = true;
        };
    }, [avatarUrl, userId]);

    const showProfilePhoto = Boolean(resolvedAvatarUrl) && !avatarFailed;

    return (
        <div
            className={[
                'roadmap-next-marker pointer-events-none absolute z-50',
                'max-[480px]:left-1/2 max-[480px]:top-[calc(100%+0.875rem)] max-[480px]:-translate-x-1/2',
                'min-[481px]:top-1/2 min-[481px]:-translate-y-1/2',
                anchorRight
                    ? 'min-[481px]:right-full min-[481px]:mr-4 sm:mr-0 sm:right-[110%]'
                    : 'min-[481px]:left-full min-[481px]:ml-4 sm:ml-0 sm:left-[110%]',
            ].join(' ')}
            role="status"
            aria-label={`${formattedScore} ${pointsLabel}`}
        >
            <div
                className={[
                    'animate-roadmap-marker-in flex items-center gap-2.5 px-0.5 py-1',
                    'max-[480px]:gap-3 max-[480px]:px-1 max-[480px]:py-1.5',
                    'sm:gap-3 sm:px-0 sm:py-0',
                    floatClass,
                ].join(' ')}
            >
                {!anchorRight && (
                    <span className="hidden h-0 w-5 shrink-0 border-t-2 border-dashed border-orange-500/60 sm:block" aria-hidden />
                )}

                <div
                    className={[
                        'relative flex items-center gap-2.5',
                        'max-[480px]:gap-3',
                        anchorRight ? 'sm:flex-row-reverse sm:gap-3' : 'sm:gap-3',
                    ].join(' ')}
                >
                    <div className="relative h-10 w-10 shrink-0 sm:h-14 sm:w-14">
                        <div className="absolute inset-0 rounded-full bg-orange-400/15 blur-md" aria-hidden />
                        <div className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-orange-400/70 ring-offset-2 ring-offset-[#fffdf7]">
                            {showProfilePhoto ? (
                                <img
                                    src={resolvedAvatarUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    onError={() => setAvatarFailed(true)}
                                />
                            ) : (
                                <span
                                    className="flex h-full w-full items-center justify-center bg-orange-50 text-xl leading-none sm:text-2xl"
                                    aria-hidden
                                >
                                    {LINEMAN_EMOJI_FALLBACK}
                                </span>
                            )}
                        </div>
                    </div>

                    <div
                        className={[
                            'flex min-w-0 flex-col gap-1',
                            anchorRight ? 'sm:items-end sm:text-right' : 'sm:items-start sm:text-left',
                        ].join(' ')}
                    >
                        <span className="text-sm font-black tabular-nums leading-none text-slate-900 sm:text-xl nb-mono">
                            {formattedScore}
                        </span>
                        <span
                            className={`text-[10px] font-bold leading-none text-orange-700/90 sm:text-[11px] ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wide nb-mono'}`}
                        >
                            {pointsLabel}
                        </span>
                    </div>
                </div>

                {anchorRight && (
                    <span className="hidden h-0 w-5 shrink-0 border-t-2 border-dashed border-orange-500/60 sm:block" aria-hidden />
                )}
            </div>
        </div>
    );
}

/** Inline ((media|label)) chip — compact in prose; thumbnail or icon only unless author set a label. */
function TrainingInlineMediaChip({ isImage, resolvedMedia, labelText, authorLabel, tapHint, language, onClick }) {
    const ariaLabel = `${labelText} — ${tapHint}`;
    const showLabel = Boolean(authorLabel);

    if (isImage) {
        return (
            <button
                type="button"
                aria-label={ariaLabel}
                title={ariaLabel}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClick();
                }}
                className={`group mx-0.5 inline-flex max-w-[9rem] cursor-pointer items-center gap-1 align-middle transition-transform duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${language === 'bn' ? 'font-bengali' : ''}`}
            >
                <span className="relative inline-flex h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm ring-2 ring-orange-400 ring-offset-1">
                    <img src={resolvedMedia} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 transition-colors group-hover:bg-slate-900/15" aria-hidden>
                        <svg className="h-3 w-3 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                </span>
                {showLabel && (
                    <span className="min-w-0 truncate border-b border-dashed border-orange-400 text-[0.82em] font-semibold leading-tight text-orange-700">
                        {labelText}
                    </span>
                )}
            </button>
        );
    }

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={`group mx-0.5 inline-flex cursor-pointer items-center gap-1 align-middle transition-transform duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${showLabel ? 'max-w-[9rem]' : ''} ${language === 'bn' ? 'font-bengali' : ''}`}
        >
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-orange-100 text-orange-800 shadow-sm ring-2 ring-orange-300 ring-offset-1 group-hover:bg-orange-200">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </span>
            {showLabel && (
                <span className="min-w-0 truncate border-b border-dashed border-orange-400 text-[0.82em] font-semibold leading-tight text-orange-700">
                    {labelText}
                </span>
            )}
        </button>
    );
}

/** Soft cream placeholder while lesson posters / modal images decode. */
function TrainingImageLoadPlaceholder({ language, className = '' }) {
    const label = language === 'en' ? 'Loading image…' : 'ছবি লোড হচ্ছে…';
    return (
        <div
            className={`relative flex w-full items-center justify-center overflow-hidden rounded-sm border border-slate-200/70 bg-[#f5f0e8] ${className}`}
            role="status"
            aria-live="polite"
            aria-label={label}
        >
            <div className="pointer-events-none absolute inset-0 shimmer opacity-70" aria-hidden />
            <div className="relative flex flex-col items-center gap-2.5 px-4 py-6">
                <div className="flex items-center gap-1.5" aria-hidden>
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-300 animate-pulse [animation-delay:300ms]" />
                </div>
                <span className={`text-[10px] font-semibold tracking-wide text-slate-500 sm:text-xs ${language === 'bn' ? 'font-bengali' : 'nb-mono'}`}>
                    {label}
                </span>
            </div>
        </div>
    );
}

/** Pinch, scroll, and drag zoom for lesson image preview modal. */
function TrainingImageZoomViewer({ src, alt, language }) {
    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [imgReady, setImgReady] = useState(false);
    const pinchRef = useRef({ startDist: 0, startScale: 1 });
    const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
    const lastTapRef = useRef(0);

    useEffect(() => {
        setScale(1);
        setPos({ x: 0, y: 0 });
        setImgReady(false);
    }, [src]);

    useEffect(() => {
        const img = imgRef.current;
        if (img?.complete && img.naturalWidth > 0) setImgReady(true);
    }, [src]);

    useEffect(() => {
        if (scale <= 1) setPos({ x: 0, y: 0 });
    }, [scale]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e) => {
            e.preventDefault();
            setScale((s) => Math.min(4, Math.max(1, s + (e.deltaY < 0 ? 0.12 : -0.12))));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [src]);

    const zoomHint = language === 'en'
        ? 'Pinch or scroll to zoom · drag to move · double-tap to reset'
        : 'চেপে/স্ক্রল করে জুম · টেনে সরান · দুবার ট্যাপে রিসেট';

    const clampScale = (value) => Math.min(4, Math.max(1, value));

    const onTouchStart = (e) => {
        if (e.touches.length === 2) {
            pinchRef.current = {
                startDist: Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                ),
                startScale: scale,
            };
            return;
        }
        if (e.touches.length === 1 && scale > 1) {
            dragRef.current = {
                active: true,
                startX: e.touches[0].clientX,
                startY: e.touches[0].clientY,
                originX: pos.x,
                originY: pos.y,
            };
        }
    };

    const onTouchMove = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const ratio = dist / (pinchRef.current.startDist || dist);
            setScale(clampScale(pinchRef.current.startScale * ratio));
            return;
        }
        if (e.touches.length === 1 && dragRef.current.active) {
            e.preventDefault();
            const dx = e.touches[0].clientX - dragRef.current.startX;
            const dy = e.touches[0].clientY - dragRef.current.startY;
            setPos({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy });
        }
    };

    const onTouchEnd = (e) => {
        dragRef.current.active = false;
        if (e.changedTouches.length !== 1) return;
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            setScale(1);
            setPos({ x: 0, y: 0 });
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
        }
    };

    const onMouseDown = (e) => {
        if (scale <= 1) return;
        e.preventDefault();
        dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            originX: pos.x,
            originY: pos.y,
        };
    };

    const onMouseMove = (e) => {
        if (!dragRef.current.active) return;
        setPos({
            x: dragRef.current.originX + (e.clientX - dragRef.current.startX),
            y: dragRef.current.originY + (e.clientY - dragRef.current.startY),
        });
    };

    const stopDrag = () => {
        dragRef.current.active = false;
    };

    return (
        <div className="flex min-h-0 w-full flex-1 flex-col">
            <p className={`mb-2 text-center text-[10px] font-medium text-slate-400 sm:text-xs ${language === 'bn' ? 'font-bengali' : ''}`}>
                {zoomHint}
            </p>
            <div
                ref={containerRef}
                className={`relative min-h-[min(50vh,420px)] w-full flex-1 overflow-hidden bg-white touch-none ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={stopDrag}
                onMouseLeave={stopDrag}
            >
                {!imgReady && (
                    <TrainingImageLoadPlaceholder
                        language={language}
                        className="absolute inset-0 min-h-[min(50vh,420px)]"
                    />
                )}
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    draggable={false}
                    onLoad={() => setImgReady(true)}
                    onError={() => setImgReady(true)}
                    className={`mx-auto max-h-[min(70vh,760px)] max-w-full select-none rounded-sm object-contain transition-opacity duration-300 ${
                        imgReady ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                        transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                        transformOrigin: 'center center',
                    }}
                />
            </div>
        </div>
    );
}

/** Lesson figure — tap opens enlarge modal; staying on it while reading auto-opens once. */
const FIGURE_DWELL_MS = 1400;

function TrainingLessonFigure({ src, alt, caption, onClick, language, className = '', inlineFloat = false }) {
    const enlargeLabel = language === 'en' ? 'Tap to enlarge' : 'বড় করে দেখতে ট্যাপ করুন';
    const inlineHint = language === 'en' ? 'Tap to view large' : 'বড় ছবি দেখতে ট্যাপ করুন';
    const dwellHint = language === 'en' ? 'Hold on the image to zoom…' : 'ছবির ওপর থাকলে জুম হবে…';
    const isInline = inlineFloat;
    const rootRef = useRef(null);
    const imgRef = useRef(null);
    const dwellTimerRef = useRef(null);
    const openedRef = useRef(false);
    const onClickRef = useRef(onClick);
    const [imgReady, setImgReady] = useState(false);
    const [dwelling, setDwelling] = useState(false);

    useEffect(() => {
        onClickRef.current = onClick;
    }, [onClick]);

    useEffect(() => {
        setImgReady(false);
        setDwelling(false);
        openedRef.current = false;
        if (dwellTimerRef.current) {
            window.clearTimeout(dwellTimerRef.current);
            dwellTimerRef.current = null;
        }
    }, [src]);

    useEffect(() => {
        const img = imgRef.current;
        if (img?.complete && img.naturalWidth > 0) setImgReady(true);
    }, [src]);

    useEffect(() => () => {
        if (dwellTimerRef.current) window.clearTimeout(dwellTimerRef.current);
    }, []);

    useEffect(() => {
        const el = rootRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return undefined;

        const clearDwell = () => {
            if (dwellTimerRef.current) {
                window.clearTimeout(dwellTimerRef.current);
                dwellTimerRef.current = null;
            }
            setDwelling(false);
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (openedRef.current) {
                    clearDwell();
                    return;
                }
                const visibleEnough = entry.isIntersecting && entry.intersectionRatio >= 0.55;
                if (!visibleEnough) {
                    clearDwell();
                    return;
                }
                const reduceMotion =
                    typeof window !== 'undefined' &&
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                if (reduceMotion) return;

                setDwelling(true);
                if (dwellTimerRef.current) window.clearTimeout(dwellTimerRef.current);
                dwellTimerRef.current = window.setTimeout(() => {
                    dwellTimerRef.current = null;
                    setDwelling(false);
                    if (openedRef.current) return;
                    openedRef.current = true;
                    onClickRef.current?.();
                }, FIGURE_DWELL_MS);
            },
            { threshold: [0, 0.55, 0.75, 1], rootMargin: '0px' }
        );

        observer.observe(el);
        return () => {
            observer.disconnect();
            clearDwell();
        };
    }, [src]);

    const openNow = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openedRef.current = true;
        setDwelling(false);
        if (dwellTimerRef.current) {
            window.clearTimeout(dwellTimerRef.current);
            dwellTimerRef.current = null;
        }
        onClick?.();
    };

    const buttonClass = isInline
        ? `my-3 sm:my-4 mx-auto block w-full max-w-md overflow-visible bg-transparent p-0 text-center ${className}`
        : `my-3 sm:my-4 mx-auto block w-full max-w-lg overflow-visible bg-transparent p-0 text-center clear-both ${className}`;

    const captionClass = `mb-1.5 sm:mb-2 text-center text-[11px] sm:text-xs font-bold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`;
    const hintClass = `mt-1.5 text-center text-[10px] font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`;

    return (
        <button
            ref={rootRef}
            type="button"
            onClick={openNow}
            title={enlargeLabel}
            aria-label={caption ? `${caption} — ${enlargeLabel}` : enlargeLabel}
            className={buttonClass}
        >
            {caption && (
                <p className={captionClass}>
                    {caption}
                </p>
            )}
            <div
                className={`relative mx-auto flex w-full justify-center overflow-hidden rounded-sm transition-transform duration-500 ease-out ${
                    dwelling ? 'scale-[1.03] ring-2 ring-orange-300/70 ring-offset-2 ring-offset-white' : 'scale-100'
                }`}
            >
                {!imgReady && (
                    <TrainingImageLoadPlaceholder
                        language={language}
                        className={isInline ? 'aspect-[4/5] w-full max-h-[22rem]' : 'aspect-[3/4] w-full'}
                    />
                )}
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    loading="lazy"
                    onLoad={() => setImgReady(true)}
                    onError={() => setImgReady(true)}
                    className={`mx-auto h-auto max-h-[min(70vh,36rem)] w-full max-w-full rounded-sm object-contain object-center transition-opacity duration-300 ${
                        imgReady ? 'relative opacity-100' : 'absolute inset-0 h-full w-full opacity-0'
                    }`}
                />
            </div>
            <p className={hintClass}>
                {dwelling ? dwellHint : isInline ? inlineHint : enlargeLabel}
            </p>
        </button>
    );
}

/** Full topic card body — reused in guided (one step) and overview (all open) modes */
function SectionPointFullCard({
    point,
    pIdx,
    language,
    renderTextWithImages,
    setActiveImageModal,
    showDoneButton,
    onStepDone,
    readingComfort = false,
}) {
    /* Gold-standard reading: soft Material card, ~17–19px body, generous leading (esp. Bengali). */
    const shell = readingComfort
        ? 'relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white py-5 pl-5 pr-4 shadow-sm sm:py-7 sm:pl-7 sm:pr-6 md:py-8 md:pl-8 md:pr-8'
        : 'relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white py-5 pl-5 pr-4 shadow-sm sm:py-6 sm:pl-6 sm:pr-5 md:py-7 md:pl-7 md:pr-7';
    const accent = pIdx % 2 === 0 ? 'bg-orange-500' : 'bg-amber-400';
    const stackGap = readingComfort ? 'space-y-5 sm:space-y-7 md:space-y-9' : 'space-y-4 sm:space-y-6 md:space-y-8';
    const titleCls = readingComfort
        ? `text-[1.25rem] sm:text-[1.5rem] md:text-[1.75rem] font-black text-slate-900 leading-snug tracking-tight ${language === 'bn' ? 'font-bengali leading-[1.5]' : ''}`
        : `text-[1.15rem] sm:text-xl md:text-[1.65rem] font-black text-slate-900 leading-snug tracking-tight ${language === 'bn' ? 'font-bengali leading-[1.5]' : ''}`;
    const specCls = readingComfort
        ? `text-[1.0625rem] sm:text-[1.125rem] md:text-[1.2rem] text-slate-700 leading-[1.75] sm:leading-[1.85] font-medium ${language === 'bn' ? 'font-bengali text-[1.1rem] sm:text-[1.175rem] md:text-[1.25rem] leading-[1.9] sm:leading-[2.05]' : ''}`
        : `text-[1.05rem] sm:text-[1.1rem] md:text-[1.175rem] text-slate-700 leading-[1.7] sm:leading-[1.8] font-medium ${language === 'bn' ? 'font-bengali text-[1.1rem] sm:text-[1.15rem] md:text-[1.225rem] leading-[1.85] sm:leading-[2]' : ''}`;
    const boxBody = readingComfort
        ? `text-[1.05rem] sm:text-[1.1rem] md:text-[1.15rem] text-slate-800 font-medium leading-[1.7] sm:leading-[1.85] ${language === 'bn' ? 'font-bengali leading-[1.85] sm:leading-[2.05]' : ''}`
        : `text-[1.025rem] sm:text-[1.075rem] md:text-[1.125rem] text-slate-800 font-medium leading-[1.65] sm:leading-[1.8] ${language === 'bn' ? 'font-bengali leading-[1.8] sm:leading-[2]' : ''}`;

    const [donePhase, setDonePhase] = useState('idle'); // idle | completing
    const doneTimerRef = useRef(null);

    useEffect(() => () => {
        if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current);
    }, []);

    const handleStepDoneClick = () => {
        if (donePhase === 'completing') return;
        const reduceMotion =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) {
            onStepDone?.();
            return;
        }
        setDonePhase('completing');
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
        doneTimerRef.current = window.setTimeout(() => {
            onStepDone?.();
        }, 520);
    };

    return (
        <div
            className={`${shell} lesson-topic-card ${
                showDoneButton
                    ? donePhase === 'completing'
                        ? 'is-completing'
                        : 'is-enter'
                    : ''
            }`}
        >
            <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden />
            <div className={`flex flex-col ${stackGap}`}>
                <h4 className={titleCls}>
                    {point.item_name}
                </h4>

                <div className="relative transition-all duration-500">
                    {point.image_name && (
                        <TrainingLessonFigure
                            src={resolveTrainingMediaSrc(point.image_name)}
                            alt={point.image_caption || point.item_name}
                            caption={point.image_caption}
                            language={language}
                            className={readingComfort ? 'mb-4 sm:mb-7 md:mb-9' : 'mb-4 sm:mb-6 md:mb-8'}
                            onClick={() => setActiveImageModal({
                                type: 'image',
                                value: resolveTrainingMediaSrc(point.image_name),
                                caption: point.image_caption,
                            })}
                        />
                    )}

                    <div className={readingComfort ? 'space-y-5 sm:space-y-7 md:space-y-9' : 'space-y-4 sm:space-y-6 md:space-y-8'}>
                        {point.specifications && (
                            <div className={`${specCls} space-y-2`}>
                                {renderTextWithImages(point.specifications)}
                            </div>
                        )}

                        <div className={`space-y-4 ${readingComfort ? 'sm:space-y-6 md:space-y-7' : 'sm:space-y-5'}`}>
                            {point.importance && (
                                <div className="overflow-hidden rounded-2xl border border-blue-100/90 bg-blue-50/70">
                                    <div
                                        className="flex h-8 items-center justify-end bg-gradient-to-l from-blue-100/90 to-transparent px-3"
                                        title={language === 'en' ? 'Why it matters' : 'কেন জরুরি'}
                                        aria-label={language === 'en' ? 'Why it matters' : 'কেন জরুরি'}
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-blue-600" aria-hidden>lightbulb</span>
                                    </div>
                                    <div className={`${boxBody} px-4 py-3 sm:px-5 sm:py-3.5`}>
                                        {renderTextWithImages(point.importance)}
                                    </div>
                                </div>
                            )}
                            {point.daily_check && (
                                <div className="overflow-hidden rounded-2xl border border-emerald-100/90 bg-emerald-50/70">
                                    <div
                                        className="flex h-8 items-center justify-end bg-gradient-to-l from-emerald-100/90 to-transparent px-3"
                                        title={language === 'en' ? 'Check yourself' : 'নিজে দেখুন'}
                                        aria-label={language === 'en' ? 'Check yourself' : 'নিজে দেখুন'}
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-emerald-600" aria-hidden>help</span>
                                    </div>
                                    <div className={`${boxBody} px-4 py-3 sm:px-5 sm:py-3.5`}>
                                        {renderTextWithImages(point.daily_check)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {showDoneButton && (
                    <div className="mt-1 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={handleStepDoneClick}
                            disabled={donePhase === 'completing'}
                            className={`lesson-topic-done-btn min-h-[48px] w-full rounded-full bg-orange-500 px-4 py-3.5 text-center text-[15px] font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] disabled:cursor-wait ${
                                donePhase === 'completing' ? 'is-completing' : ''
                            } ${language === 'bn' ? 'font-bengali' : ''}`}
                        >
                            {donePhase === 'completing'
                                ? language === 'en'
                                    ? 'Nice — next topic…'
                                    : 'দারুণ — পরের বিষয়…'
                                : language === 'en'
                                    ? 'I have read this — continue'
                                    : 'পড়ে ফেলেছি — এগিয়ে যান'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Training({
    language = 'en',
    user,
    userProfile: profile,
    showNotification,
    onProgressUpdate,
    onOpenUserProgress,
    setCurrentView,
    shellInterruptBusy = false,
}) {
    const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
    const [showDailyBrief, setShowDailyBrief] = useState(() => !isDailyBriefDismissedToday());
    const [trainingChapters, setTrainingChapters] = useState([]);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [lockedLessonModal, setLockedLessonModal] = useState(null);
    const [trainingContent, setTrainingContent] = useState(null);
    const [trainingLoading, setTrainingLoading] = useState(false);
    /** True after first chapter-list fetch finishes (success or error). Secondary widgets wait for this. */
    const [trainingHomeReady, setTrainingHomeReady] = useState(false);
    const [completedLessons, setCompletedLessons] = useState([]);
    const [faqSearchQuery, setFaqSearchQuery] = useState('');
    const [faqActiveGroup, setFaqActiveGroup] = useState('all');
    const [faqActiveTag, setFaqActiveTag] = useState('');
    const [isFaqTagsExpanded, setIsFaqTagsExpanded] = useState(false);
    /** FAQ opened via ?tab=faq (Home/More) — no Training back chevron; use bottom nav / system Back. */
    const [faqExitUsesHistory, setFaqExitUsesHistory] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [readingPoints, setReadingPoints] = useState(0);
    const { expanded: radioGlobalExpanded } = useLifeSkillRadio();

    // Supplementary Modules State — surface from Home deep link / hash (no in-page tabs)
    const [trainingTab, setTrainingTab] = useState(readTrainingSurfaceFromHash); // 'core' | 'supplementary'
    const [supplementaryModules, setSupplementaryModules] = useState([]);
    const [suppCompleted, setSuppCompleted] = useState([]);
    /** moduleId → ISO created_at of last Life Skill award still inside the 30-day cooldown. */
    const [lifeSkillScoreCooldownByModule, setLifeSkillScoreCooldownByModule] = useState(() => new Map());
    /** moduleId → lifetime points from this Life Skill card’s awards. */
    const [lifeSkillTotalsByModule, setLifeSkillTotalsByModule] = useState(() => new Map());
    /** lessonId → ISO effective award time while still inside the 30-day core re-claim cooldown. */
    const [coreLessonScoreCooldownByLesson, setCoreLessonScoreCooldownByLesson] = useState(() => new Map());

    const setTrainingSurface = useCallback((surface) => {
        setTrainingTab(surface);
        writeTrainingSurfaceHash(surface);
    }, []);

    // Quiz Modal State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [currentQuizQuestions, setCurrentQuizQuestions] = useState([]);
    const [pendingLessonId, setPendingLessonId] = useState(null);
    const [previousQuizQuestions, setPreviousQuizQuestions] = useState({});
    const [recentReward, setRecentReward] = useState(null);
    const [activeSectionIndex, setActiveSectionIndex] = useState(0); // For Journal Mode
    const [isJournalMode, setIsJournalMode] = useState(false);
    const [completionStripOpeningId, setCompletionStripOpeningId] = useState(null);
    const [coverFlipPhase, setCoverFlipPhase] = useState('idle'); // idle | open
    const coverFlipTimerRef = useRef(null);
    const COVER_OPEN_MS = 2200;
    const [activeImageModal, setActiveImageModal] = useState(null);
    const [showAllChapters, setShowAllChapters] = useState(false);
    const [showPPESurvey, setShowPPESurvey] = useState(false);
    const [surveyPPEItem, setSurveyPPEItem] = useState(null);
    const [pendingSubchapter, setPendingSubchapter] = useState(null);
    const [userPPEData, setUserPPEData] = useState([]);
    const galleryRef = useRef(null);
    /** Core journey scroller (title/index stay above; map scrolls underneath). */
    const roadmapScrollRef = useRef(null);
    const [supplementaryRadioOverlayOpen, setSupplementaryRadioOverlayOpen] = useState(false);
    /** True after audible listen (volume > 0, not muted) to ≥97% / end for current Life Skill session. */
    const [lifeSkillListenQualified, setLifeSkillListenQualified] = useState(false);
    const lifeSkillListenQualifiedRef = useRef(false);
    /** After quiz pass: force Listen overlay before awarding monthly points. */
    const [lifeSkillScoreGateActive, setLifeSkillScoreGateActive] = useState(false);
    const lessonScrollRef = useRef(null);
    const lessonScrollInnerRef = useRef(null);
    /** Visual-only page turn (does not affect next/prev gates or progress). */
    const prevLessonSectionIndexRef = useRef(0);
    const lessonPageTurnLessonIdRef = useRef(null);
    const [lessonPageTurnDir, setLessonPageTurnDir] = useState('forward'); // forward | back | celebrate
    const [lessonPageTurnTick, setLessonPageTurnTick] = useState(0);
    /** True when the lesson scroll pane is scrolled to the bottom (or content fits without scrolling). */
    const [lessonPaneScrolledToEnd, setLessonPaneScrolledToEnd] = useState(false);
    /** Section slide: steps completed (0..n); when equals n, guided flow is finished */
    const [sectionGuidedStepDone, setSectionGuidedStepDone] = useState(0);
    /** 'guided' = one card at a time; 'overview' = all cards open (after finishing guided) */
    const [sectionReaderMode, setSectionReaderMode] = useState('guided');
    /** When guided section is done (tick list): index of topic opened for reading, or null for list */
    const [sectionTickDetailIndex, setSectionTickDetailIndex] = useState(null);
    /** Section slide indices where guided reading was finished at least once (this lesson session) */
    const [completedSectionSlideIndices, setCompletedSectionSlideIndices] = useState(() => new Set());
    const completedSectionSlidesRef = useRef(new Set());
    completedSectionSlidesRef.current = completedSectionSlideIndices;
    /** `section` = topic cards incomplete; `scroll` = must scroll page to bottom first */
    const [lessonNavBlockedReason, setLessonNavBlockedReason] = useState(null);

    useEffect(() => {
        if (!lessonNavBlockedReason) return undefined;
        playLessonAdvanceBlockedChime();
        const t = setTimeout(() => setLessonNavBlockedReason(null), 3200);
        return () => clearTimeout(t);
    }, [lessonNavBlockedReason]);

    useEffect(() => {
        if (sectionReaderMode !== 'guided') return undefined;
        // Step 0: stay at top of the lesson pane so section headers and intro copy stay in view.
        // Scroll-to-active-card only after the user finishes a card and advances within the section.
        if (sectionGuidedStepDone < 1) return undefined;
        let cancelled = false;
        let raf2Id = 0;
        const raf1Id = requestAnimationFrame(() => {
            raf2Id = requestAnimationFrame(() => {
                if (cancelled) return;
                const container = lessonScrollRef.current;
                const el = document.getElementById('section-guided-active-anchor');
                if (!container || !el) return;
                const marginTop = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
                const cRect = container.getBoundingClientRect();
                const eRect = el.getBoundingClientRect();
                const nextTop = container.scrollTop + (eRect.top - cRect.top) - marginTop;
                container.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(raf1Id);
            cancelAnimationFrame(raf2Id);
        };
        // Intentionally omit activeSectionIndex: on slide change, step is updated in a later effect;
        // scrolling here would run with stale step and hide the new section header. nextSlide/prevSlide
        // already reset scrollTop to 0 when changing slides.
    }, [sectionGuidedStepDone, sectionReaderMode]);

    const touchStartXRef = useRef(0);
    const touchStartYRef = useRef(0);
    const audioRef = useRef(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [activeAudioChapter, setActiveAudioChapter] = useState(null);
    const [isHourlyPending, setIsHourlyPending] = useState(false);
    const [gateFocusTick, setGateFocusTick] = useState(0);
    const gateFocusPending = useMemo(
        () => (user?.id ? peekGateUnlockPending(user.id) : null),
        [user?.id, gateFocusTick]
    );
    const gateOpenAttemptRef = useRef(null);

    const notifyGateFocusRequired = useCallback(() => {
        if (!gateFocusPending?.lessonId) return;
        if (typeof showNotification !== 'function') return;
        showNotification(
            language === 'en'
                ? `Complete lesson ${gateFocusPending.lessonId} to unlock the hourly quiz.`
                : `ঘণ্টাভিত্তিক কুইজ খুলতে পাঠ ${gateFocusPending.lessonId} শেষ করুন।`,
            'info'
        );
    }, [gateFocusPending?.lessonId, language, showNotification]);
    const [userRank, setUserRank] = useState(null);
    const [showLessonIndex, setShowLessonIndex] = useState(false);
    const [expandedChapterIndex, setExpandedChapterIndex] = useState(null);
    /** lessonId → display title for Learning Index (from badge catalog B1–B9). */
    const [indexLessonTitles, setIndexLessonTitles] = useState(() => ({}));
    const indexLessonTitlesLoadedRef = useRef(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    const [loadingTipIndex, setLoadingTipIndex] = useState(0);

    const lessonProgressWelcome = useMemo(() => {
        if (!user?.id) return null;
        return buildLessonProgressWelcomeCopy({
            completedLessons,
            trainingChapters,
            language,
            readingPoints,
        });
    }, [user?.id, completedLessons, trainingChapters, language, readingPoints]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setPrefersReducedMotion(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    // Load lesson names for Learning Index (B1–B9 catalogs) once when opened.
    useEffect(() => {
        if (!showLessonIndex || indexLessonTitlesLoadedRef.current) return undefined;

        let cancelled = false;
        (async () => {
            try {
                const titles = await requestManager.fetch(
                    'training_index_lesson_titles',
                    async () => {
                        const maps = await Promise.all(
                            Array.from({ length: 9 }, (_, i) => {
                                const n = i + 1;
                                return fetch(`/quizzes/B${n}.json`)
                                    .then((r) => (r.ok ? r.json() : null))
                                    .catch(() => null);
                            })
                        );
                        const byId = {};
                        for (const badge of maps) {
                            if (!badge?.levels) continue;
                            for (const level of badge.levels) {
                                if (level?.level_id && level?.level_title) {
                                    byId[level.level_id] = level.level_title;
                                }
                            }
                        }
                        return byId;
                    },
                    { ttl: 3600, swr: true, forceRefresh: false }
                );
                if (cancelled) return;
                if (titles && typeof titles === 'object' && Object.keys(titles).length > 0) {
                    indexLessonTitlesLoadedRef.current = true;
                    setIndexLessonTitles(titles);
                }
            } catch (err) {
                console.warn('Could not load lesson index titles:', err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [showLessonIndex]);

    // Warm the lesson cover art so it is ready when a path lesson opens.
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const img = new Image();
        img.decoding = 'async';
        img.src = LESSON_COVER_IMAGE_SRC;

        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = LESSON_COVER_IMAGE_SRC;
        link.type = 'image/webp';
        document.head.appendChild(link);
        return () => {
            link.remove();
        };
    }, []);

    useEffect(() => {
        if (!selectedLesson) {
            setCoverFlipPhase('idle');
            return undefined;
        }
        if (coverFlipTimerRef.current) {
            clearTimeout(coverFlipTimerRef.current);
            coverFlipTimerRef.current = null;
        }
        setCoverFlipPhase('idle');
        return () => {
            if (coverFlipTimerRef.current) {
                clearTimeout(coverFlipTimerRef.current);
                coverFlipTimerRef.current = null;
            }
        };
    }, [selectedLesson?.level_id]);

    useEffect(() => {
        if (!trainingLoading) return undefined;
        setLoadingTipIndex(0);
        const n = LOADING_TIPS.en.length;
        const id = setInterval(() => {
            setLoadingTipIndex((i) => (i + 1) % n);
        }, 3200);
        return () => clearInterval(id);
    }, [trainingLoading]);

    // Load supplementary modules and progress
    useEffect(() => {
        const fetchSupplementary = async () => {
            try {
                const res = await fetch('/data/supplementary_modules.json');
                if (res.ok) {
                    const data = await res.json();
                    setSupplementaryModules(data);
                }
            } catch (err) {
                console.error("Error loading supplementary modules:", err);
            }
        };

        fetchSupplementary();

        if (user) {
            setSuppCompleted(loadSupplementaryCompletedModuleIds(user.id));
        } else {
            setSuppCompleted([]);
            setLifeSkillScoreCooldownByModule(new Map());
            setLifeSkillTotalsByModule(new Map());
        }
    }, [user]);

    // Life Skill per-card totals + 30-day cooldown (from quiz_attempts).
    useEffect(() => {
        if (!user || isGuestUser(profile)) {
            setLifeSkillScoreCooldownByModule(new Map());
            setLifeSkillTotalsByModule(new Map());
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('quiz_attempts')
                    .select('quiz_id, created_at, score')
                    .eq('user_id', user.id)
                    .like('quiz_id', 'life_skill_bonus_%');

                if (cancelled || error) {
                    if (error) console.error('Error loading life skill card scores:', error);
                    return;
                }

                const rows = data || [];
                setLifeSkillScoreCooldownByModule(buildLifeSkillActiveCooldowns(rows));
                setLifeSkillTotalsByModule(buildLifeSkillTotalsByModule(rows));
            } catch (err) {
                console.error('Error loading life skill card scores:', err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, profile]);

    // Core lesson 30-day re-claim cooldowns (quiz_attempts lesson_bonus_*). Feature-flagged; no RPC changes.
    useEffect(() => {
        if (!CORE_LESSON_MONTHLY_BONUS_ENABLED || !user || isGuestUser(profile)) {
            setCoreLessonScoreCooldownByLesson(new Map());
            return undefined;
        }

        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('quiz_attempts')
                    .select('quiz_id, created_at')
                    .eq('user_id', user.id)
                    .like('quiz_id', 'lesson_bonus_%');

                if (cancelled || error) {
                    if (error) console.error('Error loading core lesson score cooldowns:', error);
                    return;
                }

                setCoreLessonScoreCooldownByLesson(
                    buildCoreLessonActiveCooldowns(data || [], CORE_LESSON_MONTHLY_BONUS_LAUNCH_ISO)
                );
            } catch (err) {
                console.error('Error loading core lesson score cooldowns:', err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, profile]);

    const handleMarkSupplementaryRead = useCallback(
        (moduleId, { silent = false } = {}) => {
            if (!user) return;
            if (blockGuestWrite(profile, showNotification, language)) return;
            const updated = appendSupplementaryCompletion(user.id, moduleId);
            setSuppCompleted(updated);
            if (!silent && typeof showNotification === 'function') {
                showNotification(
                    language === 'en' ? 'Saved to your progress.' : 'আপনার অগ্রগতিতে সংরক্ষিত হয়েছে।'
                );
            }
        },
        [user, language, profile, showNotification]
    );

    const dismissDailyBrief = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(DAILY_BRIEF_DISMISS_KEY, new Date().toDateString());
        }
        setShowDailyBrief(false);
    }, []);

    const dailyBriefGreeting = useMemo(() => {
        const firstName = profile?.full_name?.trim().split(/\s+/)[0];
        if (language === 'bn') {
            return firstName ? `স্বাগতম, ${firstName}` : 'স্বাগতম';
        }
        return firstName ? `Welcome, ${firstName}` : 'Welcome';
    }, [profile?.full_name, language]);

    const handleHourlyChallengeClick = useCallback(() => {
        // Navigate first (same as Home). Reading-gate / lock modal is shown
        // on the competitions page when the user tries to start the quiz.
        if (!user?.id) return;
        setCurrentView('competitions');
    }, [user?.id, setCurrentView]);

    // Life Skills surfaces: keep scroll at top (window + app main scroller).
    useEffect(() => {
        const surface = trainingTab === 'supplementary' || !!trainingContent?.isSupplementary;
        if (!surface) return undefined;
        const id = requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            document.getElementById('main-scroll-container')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
        return () => cancelAnimationFrame(id);
    }, [trainingTab, trainingContent?.isSupplementary, trainingContent?.level_id]);

    const isTrainingNeoBrutalSurface = !showOnboarding;

    useEffect(() => {
        if (!isTrainingNeoBrutalSurface) return undefined;

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
    }, [isTrainingNeoBrutalSurface]);

    // Fetch user rank for leaderboard preview — after Training home is ready, and not while
    // a chapter/lesson is loading (frees bandwidth for Supabase lesson sync).
    useEffect(() => {
        if (!trainingHomeReady || trainingLoading) return;
        if (!user || isGuestUser(profile)) return;

        let cancelled = false;
        const fetchRank = async () => {
            try {
                const rankData = await requestManager.fetch(
                    `user_rank_all_time_${user.id}`,
                    async () => {
                        const { data: myData, error: myError } = await supabase
                            .from('leaderboard_view')
                            .select('score')
                            .eq('user_id', user.id)
                            .maybeSingle();

                        if (myError || !myData) return null;

                        const { count, error: countError } = await supabase
                            .from('leaderboard_view')
                            .select('*', { count: 'exact', head: true })
                            .gt('score', myData.score);

                        if (countError) throw countError;

                        return { rank: (count ?? 0) + 1, score: myData.score };
                    },
                    { ttl: 5, swr: true, forceRefresh: false }
                );

                if (!cancelled && rankData) {
                    setUserRank(rankData);
                }
            } catch (error) {
                console.error('Error fetching rank in training:', error);
            }
        };

        fetchRank();
        return () => { cancelled = true; };
    }, [trainingHomeReady, trainingLoading, user, completedLessons.length, profile]);

    // Hourly challenge eligibility — same deferral as rank (not on critical paint path).
    useEffect(() => {
        if (!trainingHomeReady || trainingLoading) return;
        if (!user) return;

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
                    setIsHourlyPending(data.length === 0);
                }
            } catch (err) {
                console.error("Error checking hourly challenge:", err);
            }
        };

        checkHourlyEligibility();

        const intervalId = setInterval(checkHourlyEligibility, 5 * 60 * 1000);
        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [trainingHomeReady, trainingLoading, user]);

    const toggleChapterAudio = (chapterNum) => {
        if (activeAudioChapter === chapterNum && isAudioPlaying) {
            audioRef.current?.pause();
            setIsAudioPlaying(false);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        const url = `https://raw.githubusercontent.com/UtilityDD/mahabani_audio/main/mahabani_amriterswad/bn/${chapterNum}.m4a`;
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => {
            setIsAudioPlaying(false);
            setActiveAudioChapter(null);
        };
        audioRef.current.play();
        setIsAudioPlaying(true);
        setActiveAudioChapter(chapterNum);
    };

    const stopChapterAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsAudioPlaying(false);
            setActiveAudioChapter(null);
        }
    };

    const beginLessonFromCover = useCallback(() => {
        if (!selectedLesson || coverFlipPhase === 'open') return;
        const openLesson = () => {
            stopChapterAudio();
            setTrainingContent(selectedLesson);
            setActiveSectionIndex(0);
            setIsJournalMode(true);
            setSelectedLesson(null);
            setCoverFlipPhase('idle');
        };
        if (prefersReducedMotion) {
            openLesson();
            return;
        }
        setCoverFlipPhase('open');
        if (coverFlipTimerRef.current) clearTimeout(coverFlipTimerRef.current);
        coverFlipTimerRef.current = setTimeout(() => {
            openLesson();
            coverFlipTimerRef.current = null;
        }, COVER_OPEN_MS);
    }, [selectedLesson, coverFlipPhase, prefersReducedMotion]);

    // Helper function to check if a lesson is unlocked (GLOBALLY SEQUENTIAL — FULL CHAIN)
    const isLessonUnlocked = useCallback((chapterNum, subchapterNum) => {
        // Admins can open any core lesson for QA; scoring and completion rules are unchanged elsewhere.
        if (profile?.role === 'admin') return true;

        // Very first lesson is always unlocked
        if (chapterNum === 1 && subchapterNum === 1) return true;

        // ALL previous chapters must be fully completed
        for (let c = 1; c < chapterNum; c++) {
            const chapter = trainingChapters.find(ch => ch.number === c);
            if (!chapter) return false;
            for (let i = 1; i <= chapter.count; i++) {
                if (!completedLessons.includes(`${c}.${i}`)) return false;
            }
        }

        // All previous lessons in the current chapter must be completed
        for (let i = 1; i < subchapterNum; i++) {
            if (!completedLessons.includes(`${chapterNum}.${i}`)) return false;
        }

        return true;
    }, [completedLessons, trainingChapters, profile?.role]);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // roadmapData memoization for optimization and scrolling support
    const roadmapData = useMemo(() => {
        if (!trainingChapters || trainingChapters.length === 0) return { items: [], height: 0, maxPath: 0, journeyChapters: [] };

        const journeyChapters = trainingChapters.filter(c => c.number !== 10);
        const items = [];

        journeyChapters.forEach((chapter) => {
            const badge = getRoadmapBadgeByLevel(chapter.number);
            const isChapterUnlocked = isLessonUnlocked(chapter.number, 1);
            items.push({
                type: 'milestone',
                isUnlocked: isChapterUnlocked,
                chapter: chapter,
                badge: badge,
                index: items.length
            });

            for (let i = 1; i <= chapter.count; i++) {
                const lessonId = `${chapter.number}.${i}`;
                items.push({
                    type: 'lesson',
                    id: lessonId,
                    chapterNumber: chapter.number,
                    lessonNumber: i,
                    isCompleted: completedLessons.includes(lessonId),
                    isUnlocked: isLessonUnlocked(chapter.number, i),
                    badge: badge,
                    title: `Lesson ${lessonId}`,
                    index: items.length
                });
            }
        });

        const maxPath = items.reduce((max, item, idx) => {
            return (item.isCompleted || item.isUnlocked) ? idx : max;
        }, 0);

        const nodeVerticalGap =
            typeof window !== 'undefined' && window.innerWidth < 640 ? 136 : 120;
        const height = items.length * nodeVerticalGap + 200;

        return { items, height, maxPath, nodeVerticalGap, journeyChapters };
    }, [trainingChapters, completedLessons, isLessonUnlocked]);

    /**
     * Completion page strip: real completed + really unlocked lessons only.
     * Never pretends the current unread lesson is done — that used to unlock
     * the next lesson before quiz pass and let users skip the chain (e.g. miss 1.1).
     */
    const completionNavLessons = useMemo(() => {
        if (!trainingContent || trainingContent.isSupplementary || !trainingChapters?.length) return [];
        const currentId = String(trainingContent.level_id || '');
        if (!currentId || !currentId.includes('.')) return [];

        const done = new Set(filterCoreCompletedLessonIds(completedLessons).map(String));

        const items = [];
        for (const chapter of trainingChapters.filter((c) => c.number !== 10)) {
            for (let i = 1; i <= chapter.count; i++) {
                const id = `${chapter.number}.${i}`;
                const isCurrent = id === currentId;
                const isCompleted = done.has(id);
                const isUnlocked = isCurrent || isLessonUnlocked(chapter.number, i);
                if (!isUnlocked && !isCompleted) continue;
                items.push({
                    id,
                    chapterNumber: chapter.number,
                    lessonNumber: i,
                    isCompleted,
                    isUnlocked,
                    isCurrent,
                    isNext: false,
                });
            }
        }

        const nextIdx = items.findIndex(
            (item) => item.isUnlocked && !item.isCurrent && !done.has(item.id)
        );
        // Prefer the first lesson after current that is unlocked; else first unlocked unread
        let marked = false;
        for (let i = 0; i < items.length; i++) {
            if (items[i].isCurrent) {
                for (let j = i + 1; j < items.length; j++) {
                    if (items[j].isUnlocked && !items[j].isCurrent) {
                        items[j] = { ...items[j], isNext: true };
                        marked = true;
                        break;
                    }
                }
                break;
            }
        }
        if (!marked && nextIdx >= 0) {
            items[nextIdx] = { ...items[nextIdx], isNext: true };
        }

        return items;
    }, [trainingContent, trainingChapters, completedLessons, isLessonUnlocked]);

    const openLifeSkillModule = useCallback(
        (module) => {
            const cardTitle = language === 'en' ? module.title_en : module.title_bn;
            setTrainingContent({
                level_id: module.id,
                lesson_code: module.lesson_code ?? null,
                level_title: cardTitle,
                manuscript_url: module.manuscript_url,
                isSupplementary: true,
                audio_url_en: module.audio_url_en ?? null,
                audio_url_bn: module.audio_url_bn ?? null,
            });
            setIsJournalMode(true);
            setActiveSectionIndex(0);
        },
        [language]
    );

    // Auto-scroll journey pane to current reading position (title/index stay outside this scroller)
    useEffect(() => {
        if (selectedChapter || trainingContent || trainingLoading || trainingTab !== 'core') return undefined;
        if (roadmapData.items.length === 0) return undefined;

        const nextLesson = roadmapData.items.find(
            (item) => item.type === 'lesson' && !item.isCompleted && item.isUnlocked
        );
        if (!nextLesson) return undefined;

        const timer = setTimeout(() => {
            const container = roadmapScrollRef.current;
            const scrollTarget = document.getElementById(`roadmap-node-${nextLesson.id}`);
            if (!container || !scrollTarget) return;

            const cRect = container.getBoundingClientRect();
            const eRect = scrollTarget.getBoundingClientRect();
            // Sit the next node in the upper third so path context stays below — not viewport-center.
            const topPad = Math.min(120, Math.max(48, cRect.height * 0.22));
            const nextTop = container.scrollTop + (eRect.top - cRect.top) - topPad;
            const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
            container.scrollTo({ top: Math.max(0, Math.min(nextTop, maxTop)), behavior: 'smooth' });
        }, 800);

        return () => clearTimeout(timer);
    }, [selectedChapter, trainingContent, trainingLoading, trainingTab, roadmapData.items]);

    const scrollGallery = (direction) => {
        if (galleryRef.current) {
            const scrollAmount = direction === 'left' ? -300 : 300;
            galleryRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const getSlides = (content) => {
        if (!content) return [];
        const slides = [];

        // Hero Slide
        slides.push({
            type: 'hero',
            level_title: content.level_title,
            badge_name: content.badge_name,
            level_id: content.level_id,
            mission_briefing: content.mission_briefing
        });

        // Section Slides
        if (content.sections) {
            content.sections.forEach(section => {
                slides.push({
                    type: 'section',
                    ...section
                });
            });
        }

        // Support Slides
        if (content.pro_tip) slides.push({ type: 'pro_tip', ...content.pro_tip });
        if (content.myth_buster) slides.push({ type: 'myth_buster', ...content.myth_buster });
        if (content.advanced_section) slides.push({ type: 'advanced', ...content.advanced_section });

        // Completion Slide
        slides.push({ type: 'completion', level_id: content.level_id });

        return slides;
    };

    const slides = getSlides(trainingContent);

    /** Reset auto-save guard when opening a different supplementary module. */
    const supplementaryAutoSavedRef = useRef(null);
    useEffect(() => {
        supplementaryAutoSavedRef.current = null;
        lifeSkillListenQualifiedRef.current = false;
        setLifeSkillListenQualified(false);
        setLifeSkillScoreGateActive(false);
        setSupplementaryRadioOverlayOpen(false);
    }, [trainingContent?.level_id]);

    /** Life Skills: persist completion silently when the learner reaches the last screen. */
    useEffect(() => {
        if (!user || !trainingContent?.isSupplementary || !trainingContent?.level_id) return;
        const slide = slides[activeSectionIndex];
        if (!slide || slide.type !== 'completion') return;
        const id = trainingContent.level_id;
        if (supplementaryAutoSavedRef.current === id) return;
        supplementaryAutoSavedRef.current = id;
        handleMarkSupplementaryRead(id, { silent: true });
    }, [user, trainingContent?.isSupplementary, trainingContent?.level_id, activeSectionIndex, slides, handleMarkSupplementaryRead]);

    useEffect(() => {
        setCompletedSectionSlideIndices(new Set());
    }, [trainingContent?.level_id]);

    useEffect(() => {
        if (trainingContent?.manuscript_url && !trainingContent.sections) {
            const loadSupplementaryContent = async () => {
                try {
                    const response = await fetch(trainingContent.manuscript_url);
                    if (response.ok) {
                        const data = await response.json();
                        
                        // Check if a quiz exists for this supplementary module
                        let hasQuiz = false;
                        try {
                            const quizFilename = `questions_${(data.level_id || trainingContent.level_id).replace('.', '_')}.json`;
                            const quizRes = await fetch(`/quizzes/${quizFilename}`);
                            hasQuiz = quizRes.ok;
                        } catch (e) {
                            console.error("Error checking supplementary quiz:", e);
                        }

                        setTrainingContent((prev) => ({
                            ...prev,
                            ...data,
                            hasQuiz,
                            lesson_code:
                                (typeof prev.lesson_code === 'string' && prev.lesson_code.trim()
                                    ? prev.lesson_code
                                    : deriveLifeSkillCodeFromLevelId(data.level_id || prev.level_id)) || null,
                        }));
                    }
                } catch (error) {
                    console.error("Error loading supplementary content:", error);
                }
            };
            loadSupplementaryContent();
        }
    }, [trainingContent]);

    useEffect(() => {
        if (!trainingContent) return;
        setSectionReaderMode('guided');
        setSectionTickDetailIndex(null);
        const sl = getSlides(trainingContent);
        const slide = sl[activeSectionIndex];
        const n = slide?.type === 'section' ? slide.points?.length ?? 0 : 0;
        const completed = completedSectionSlidesRef.current.has(activeSectionIndex);
        setSectionGuidedStepDone(n > 0 && completed ? n : 0);
    }, [activeSectionIndex, trainingContent]);

    useEffect(() => {
        if (!trainingContent) return;
        const sl = getSlides(trainingContent);
        const slide = sl[activeSectionIndex];
        if (slide?.type !== 'section') return;
        const n = slide.points?.length ?? 0;
        if (n === 0 || sectionGuidedStepDone < n) return;
        setCompletedSectionSlideIndices((prev) => {
            if (prev.has(activeSectionIndex)) return prev;
            const next = new Set(prev);
            next.add(activeSectionIndex);
            return next;
        });
    }, [sectionGuidedStepDone, activeSectionIndex, trainingContent]);

    const isLessonSectionAdvanceBlocked = () => {
        const slide = slides[activeSectionIndex];
        if (slide?.type !== 'section') return false;
        const n = slide.points?.length ?? 0;
        if (n === 0) return false;
        return sectionGuidedStepDone < n;
    };

    const checkLessonScrollReachedEnd = useCallback(() => {
        const el = lessonScrollRef.current;
        if (!el) return;
        const { scrollTop, clientHeight, scrollHeight } = el;
        const slackPx = 48;
        if (scrollHeight <= clientHeight + 12) {
            setLessonPaneScrolledToEnd(true);
            return;
        }
        setLessonPaneScrolledToEnd(scrollTop + clientHeight >= scrollHeight - slackPx);
    }, []);

    useEffect(() => {
        setLessonPaneScrolledToEnd(false);
    }, [activeSectionIndex, trainingContent?.level_id]);

    useEffect(() => {
        if (!trainingContent) return undefined;
        const el = lessonScrollRef.current;
        const inner = lessonScrollInnerRef.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(() => {
            checkLessonScrollReachedEnd();
        });
        ro.observe(el);
        if (inner) ro.observe(inner);
        let raf1 = 0;
        let raf2 = 0;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => checkLessonScrollReachedEnd());
        });
        const onWinResize = () => checkLessonScrollReachedEnd();
        window.addEventListener('resize', onWinResize);
        return () => {
            window.removeEventListener('resize', onWinResize);
            ro.disconnect();
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
    }, [activeSectionIndex, trainingContent, sectionGuidedStepDone, sectionReaderMode, checkLessonScrollReachedEnd]);

    const isFirstSlide = activeSectionIndex === 0;
    const isLastSlide = activeSectionIndex === slides.length - 1;
    const isNextDisabledByLessonRules =
        !isLastSlide && (isLessonSectionAdvanceBlocked() || !lessonPaneScrolledToEnd);

    // Soft book page-turn when the slide index changes — visual only.
    useEffect(() => {
        if (!trainingContent) {
            lessonPageTurnLessonIdRef.current = null;
            prevLessonSectionIndexRef.current = 0;
            setLessonPageTurnTick(0);
            return;
        }
        const lessonId = trainingContent.level_id ?? trainingContent.id ?? 'lesson';
        if (lessonPageTurnLessonIdRef.current !== lessonId) {
            lessonPageTurnLessonIdRef.current = lessonId;
            prevLessonSectionIndexRef.current = activeSectionIndex;
            setLessonPageTurnTick(0);
            return;
        }
        const prev = prevLessonSectionIndexRef.current;
        if (prev === activeSectionIndex) return;
        if (!prefersReducedMotion) {
            const arrivingAtCompletion =
                activeSectionIndex > prev && slides[activeSectionIndex]?.type === 'completion';
            setLessonPageTurnDir(
                arrivingAtCompletion ? 'celebrate' : activeSectionIndex > prev ? 'forward' : 'back'
            );
            setLessonPageTurnTick((t) => t + 1);
            if (arrivingAtCompletion && typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([12, 40, 18]);
            }
        }
        prevLessonSectionIndexRef.current = activeSectionIndex;
    }, [activeSectionIndex, trainingContent, prefersReducedMotion, slides[activeSectionIndex]?.type]);

    const nextSlide = () => {
        if (!isLastSlide) {
            if (isLessonSectionAdvanceBlocked()) {
                setLessonNavBlockedReason('section');
                return;
            }
            if (!lessonPaneScrolledToEnd) {
                setLessonNavBlockedReason('scroll');
                return;
            }
            setLessonPaneScrolledToEnd(false);
            setActiveSectionIndex(prev => prev + 1);
            if (lessonScrollRef.current) {
                lessonScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
            }
        }
    };

    const prevSlide = () => {
        if (!isFirstSlide) {
            setLessonPaneScrolledToEnd(false);
            setActiveSectionIndex(prev => prev - 1);
            if (lessonScrollRef.current) {
                lessonScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
            }
        }
    };

    const handleReaderTouchStart = (event) => {
        const touch = event.touches?.[0];
        if (!touch) return;
        touchStartXRef.current = touch.clientX;
        touchStartYRef.current = touch.clientY;
    };

    const handleReaderTouchEnd = (event) => {
        const touch = event.changedTouches?.[0];
        if (!touch) return;

        const deltaX = touch.clientX - touchStartXRef.current;
        const deltaY = touch.clientY - touchStartYRef.current;
        const isHorizontalSwipe = Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

        if (!isHorizontalSwipe) return;

        if (deltaX < 0) {
            nextSlide();
        } else {
            prevSlide();
        }
    };

    const chapterGridRef = useRef(null);

    // Dynamic background styles for different slide types
    const slideTypeStyles = {
        hero: 'bg-slate-50 dark:bg-slate-950',
        section: 'bg-orange-50/40 dark:bg-orange-950/10',
        pro_tip: 'bg-emerald-50/40 dark:bg-emerald-950/10',
        myth_buster: 'bg-red-50/40 dark:bg-red-950/10 dark:text-red-200',
        advanced: 'bg-indigo-50/40 dark:bg-indigo-950/10',
        completion: 'bg-slate-50 dark:bg-slate-950'
    };

    const { speak, pause, resume, stop, isPlaying, isPaused, activeId, isLoading } = useTextToSpeech(language);

    const handleLessonCompletionHourlyNav = useCallback(async () => {
        stop();
        setTrainingContent(null);
        setSelectedChapter(null);
        setSelectedLesson(null);
        setIsJournalMode(false);
        await handleHourlyChallengeClick();
    }, [stop, handleHourlyChallengeClick]);

    const supplementaryRadioSrc = useMemo(() => {
        if (!trainingContent?.isSupplementary) return '';
        return pickSupplementaryListenSrc(trainingContent, language);
    }, [trainingContent?.isSupplementary, trainingContent?.audio_url_en, trainingContent?.audio_url_bn, language]);

    const faqQuestions = selectedChapter?.isFAQ ? selectedChapter.content?.questions || [] : [];
    const faqGroupCounts = useMemo(() => getFaqGroupCounts(faqQuestions), [faqQuestions]);
    const faqFilteredQuestions = useMemo(
        () => filterFaqQuestions(faqQuestions, {
            query: faqSearchQuery,
            groupId: faqActiveGroup,
            tag: faqActiveTag,
        }),
        [faqQuestions, faqSearchQuery, faqActiveGroup, faqActiveTag]
    );
    const faqHasActiveFilters = faqSearchQuery.trim() !== '' || faqActiveGroup !== 'all' || faqActiveTag !== '';
    const faqResultSummary = useMemo(
        () => getFaqResultSummary(
            faqFilteredQuestions.length,
            faqQuestions.length,
            faqHasActiveFilters,
            language
        ),
        [faqFilteredQuestions.length, faqQuestions.length, faqHasActiveFilters, language]
    );

    const resetFaqFilters = useCallback(() => {
        setFaqSearchQuery('');
        setFaqActiveGroup('all');
        setFaqActiveTag('');
        setIsFaqTagsExpanded(false);
    }, []);

    useEffect(() => {
        if (!selectedChapter?.isFAQ) {
            resetFaqFilters();
        }
    }, [selectedChapter?.isFAQ, resetFaqFilters]);

    /** Life Skills: hide read-aloud when a hosted lesson track exists (radio-only for audio). */
    const hideReadAloudForSupplementaryRadio =
        !!trainingContent?.isSupplementary && !!supplementaryRadioSrc;

    useEffect(() => {
        if (!trainingContent) {
            setSupplementaryRadioOverlayOpen(false);
        }
    }, [trainingContent]);

    // Body scroll locking when full-page training is open
    useEffect(() => {
        if (trainingContent) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [trainingContent]);

    // Load completed lessons from localStorage and Supabase
    useEffect(() => {
        const loadProgress = async () => {
            if (!user) return;

            if (isGuestUser(profile)) {
                setCompletedLessons([]);
                setReadingPoints(0);
                return;
            }

            // 1. Load Local
            let localProgress = [];
            const saved = storageUtils.getItem(`training_progress_${user.id}`);
            if (saved) {
                localProgress = filterCoreCompletedLessonIds((JSON.parse(saved) || [])
                    .filter(id => id && typeof id === 'string' && !id.toUpperCase().includes('DEBUG') && !id.toUpperCase().includes('TEST')));
            }

            // 2. Load Remote
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('completed_lessons, reading_points, points')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error("Supabase error fetching lessons:", error);
                }

                if (data) {
                    // 🛡️ DETECT ADMIN RESET: 
                    // If server total points and lessons are both ZERO, 
                    // but we have local data, it means an Admin Reset occurred.
                    // We must respect the server and wipe local progress.
                    const isServerReset = (data.points === 0) && (!data.completed_lessons || data.completed_lessons.length === 0);

                    if (isServerReset && localProgress.length > 0) {
                        console.log('⚠️ Admin reset detected on server. Purging local progress...');
                        storageUtils.removeItem(`training_progress_${user.id}`);
                        setCompletedLessons([]);
                        setReadingPoints(0);
                        return; // Exit, everything is now reset to 0
                    }

                    console.log('✅ Lessons fetched from Supabase:', {
                        completed_lessons: data.completed_lessons?.length || 0,
                        reading_points: data.reading_points || 0,
                        sample_lessons: data.completed_lessons?.slice(0, 5)
                    });

                    // Set reading points
                    setReadingPoints(data.reading_points || 0);

                    if (data.completed_lessons) {
                        // 3. Merge (Union) — supplementary `supp_*` ids stay local-only, never in profile.completed_lessons
                        const remoteProgress = Array.isArray(data.completed_lessons) ? data.completed_lessons : [];
                        const remoteCore = filterCoreCompletedLessonIds(remoteProgress);
                        const merged = [...new Set([...localProgress, ...remoteCore])]
                            .filter(id => id && typeof id === 'string' && !id.toUpperCase().includes('DEBUG') && !id.toUpperCase().includes('TEST'));

                        setCompletedLessons(merged);
                        console.log(`📊 Total lessons after merge: ${merged.length}`);

                        const serverHadSupplementaryIds = remoteProgress.some(isSupplementaryProgressLessonId);
                        if (serverHadSupplementaryIds) {
                            void (async () => {
                                const { error } = await supabase
                                    .from('profiles')
                                    .update({ completed_lessons: merged })
                                    .eq('id', user.id);
                                if (error) {
                                    console.warn('Could not strip supplementary ids from profile completed_lessons:', error);
                                }
                            })();
                        }

                        // Update local storage if different or we removed supplementary junk
                        if (merged.length !== localProgress.length || serverHadSupplementaryIds) {
                            storageUtils.setItem(`training_progress_${user.id}`, JSON.stringify(merged));
                        }
                    } else {
                        // If no remote data, just set local
                        console.log('⚠️ No completed_lessons in Supabase, using local only');
                        setCompletedLessons(localProgress);
                    }
                } else {
                    // If no remote data, just set local
                    console.log('⚠️ No data from Supabase, using local only');
                    setCompletedLessons(localProgress);
                }
            } catch (err) {
                console.error("❌ Error syncing progress:", err);
                setCompletedLessons(localProgress);
            }
        };

        loadProgress();
    }, [user, profile]);

    // Custom parser: ((media|optional_label)) and [[image_ref|optional_layout]]
    // media / image_ref: filename under /quizzes/ OR full https URL (e.g. Google Drive from sheet sync). Drive links are normalized for <img>.
    // [[path|inline]] = compact figure (tap to enlarge). See utils/trainingMediaUrl.js.
    const renderTextWithImages = useCallback((text) => {
        if (!text) return null;

        const parts = text.split(/(\(\(.*?\)\)|\[\[.*?\]\])/g);

        return parts.map((part, index) => {
            if (part.startsWith('((') && part.endsWith('))')) {
                const raw = part.slice(2, -2);
                const pipeIdx = raw.indexOf('|');
                const mediaPart = pipeIdx >= 0 ? raw.slice(0, pipeIdx).trim() : raw.trim();
                const authorLabel = pipeIdx >= 0 ? raw.slice(pipeIdx + 1).trim() : '';
                const resolvedMedia = resolveTrainingMediaSrc(mediaPart);
                const isImage = trainingMediaRefLooksLikeImage(mediaPart);
                const defaultLabel = isImage
                    ? (language === 'en' ? 'Photo' : 'ছবি')
                    : (language === 'en' ? 'More' : 'আরও');
                const labelText = authorLabel || defaultLabel;
                const tapHint = language === 'en' ? 'Tap to open' : 'খুলতে ট্যাপ করুন';

                return (
                    <TrainingInlineMediaChip
                        key={index}
                        isImage={isImage}
                        resolvedMedia={resolvedMedia}
                        labelText={labelText}
                        authorLabel={authorLabel}
                        tapHint={tapHint}
                        language={language}
                        onClick={() => {
                            if (isImage) {
                                setActiveImageModal({ type: 'image', value: resolvedMedia });
                            } else {
                                setActiveImageModal({ type: 'text', value: raw });
                            }
                        }}
                    />
                );
            } else if (part.startsWith('[[') && part.endsWith(']]')) {
                const inner = part.slice(2, -2).trim();
                const segments = inner.split('|').map((s) => s.trim());
                const imgPathRaw = segments[0];
                const isInlineFigure = segments.some((s) => s.toLowerCase() === 'inline');
                const figureCaption = segments
                    .slice(1)
                    .filter((s) => s.toLowerCase() !== 'inline')
                    .join(' | ') || undefined;
                const resolvedSrc = resolveTrainingMediaSrc(imgPathRaw);
                const openModal = () => setActiveImageModal({ type: 'image', value: resolvedSrc, caption: figureCaption });

                if (isInlineFigure) {
                    return (
                        <TrainingLessonFigure
                            key={index}
                            src={resolvedSrc}
                            alt={figureCaption || ''}
                            caption={figureCaption}
                            language={language}
                            inlineFloat
                            onClick={openModal}
                        />
                    );
                }

                return (
                    <TrainingLessonFigure
                        key={index}
                        src={resolvedSrc}
                        alt={figureCaption || 'Inline lesson helper'}
                        caption={figureCaption}
                        language={language}
                        onClick={openModal}
                    />
                );
            }
            // Handle plain text: detect bullets, numbered lists, and newlines
            if (typeof part === 'string' && part.length > 0) {
                const lines = part.split('\n');
                if (lines.length <= 1) return part;

                return (
                    <span key={index}>
                        {lines.map((line, lineIdx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <br key={`br-${index}-${lineIdx}`} />;

                            // Detect bullet patterns: •, ●, ◦, ▪, -, *, ➤, ✓, ✔, ☑
                            const bulletMatch = trimmed.match(/^([•●◦▪\-\*➤✓✔☑]\s*)(.*)/);

                            if (bulletMatch) {
                                return (
                                    <span key={`line-${index}-${lineIdx}`} className="flex items-start gap-2 mt-2.5">
                                        <span className="text-orange-500/70 shrink-0 mt-0.5 select-none">{bulletMatch[1].trim()}</span>
                                        <span className="flex-1">{bulletMatch[2]}</span>
                                    </span>
                                );
                            }

                            // Regular line - just add a line break before it
                            return (
                                <React.Fragment key={`line-${index}-${lineIdx}`}>
                                    {lineIdx > 0 && <br />}
                                    {line}
                                </React.Fragment>
                            );
                        })}
                    </span>
                );
            }
            return part;
        });
    }, [language, setActiveImageModal]);

    // PPE survey data — after Training home is ready; pause while a chapter is loading.
    useEffect(() => {
        if (!trainingHomeReady || trainingLoading) return;
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('user_ppe')
                    .select('id, name, details')
                    .eq('user_id', user.id);
                if (error) throw error;
                if (!cancelled) setUserPPEData(data || []);
            } catch (error) {
                console.error('Error fetching PPE data for survey:', error);
            }
        })();
        return () => { cancelled = true; };
    }, [trainingHomeReady, trainingLoading, user?.id]);

    const fetchUserPPEData = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('user_ppe')
                .select('id, name, details')
                .eq('user_id', user.id);
            if (error) throw error;
            setUserPPEData(data || []);
        } catch (error) {
            console.error('Error fetching PPE data for survey:', error);
        }
    };

    // Fetch Training Chapters
    useEffect(() => {
        const fetchTrainingChapters = async () => {
            try {
                setTrainingLoading(true);
                setTrainingHomeReady(false);
                setFetchError(false); // Clear previous error on retry
                const data = await requestManager.fetch(
                    'training_manifest',
                    async () => {
                        const response = await fetch('/quizzes/training_manifest.json');
                        if (response.ok) {
                            return await response.json();
                        }
                        throw new Error('Manifest not found');
                    },
                    // Cache-first + SWR: do not force a network hit on every mount.
                    // Lesson bodies still sync from Supabase on chapter open.
                    { ttl: 60, swr: true, forceRefresh: false }
                );

                if (data) {
                    setTrainingChapters(data);
                }
            } catch (error) {
                console.error('Error fetching training chapters:', error);
                setFetchError(true);
            } finally {
                setTrainingLoading(false);
                setTrainingHomeReady(true);
            }
        };

        fetchTrainingChapters();
    }, [language]);


    const handleChapterClick = async (chapter, targetLessonNum = null, options = {}) => {
        const { autoStartReading = false, faqExitUsesHistory: faqExitFromHistory = false } = options;

        if (chapter?.number === 10) {
            setFaqExitUsesHistory(!!faqExitFromHistory);
        }

        const focusPending = user?.id ? peekGateUnlockPending(user.id) : null;
        if (focusPending?.lessonId) {
            const focusParsed = parseGateLessonId(focusPending.lessonId);
            if (focusParsed) {
                const wrongChapter = chapter.number !== focusParsed.chapterNum;
                const wrongLesson = targetLessonNum != null && targetLessonNum !== focusParsed.lessonNum;
                if (wrongChapter || wrongLesson) {
                    const assignedChapter = trainingChapters.find((c) => c.number === focusParsed.chapterNum);
                    if (assignedChapter) {
                        return handleChapterClick(assignedChapter, focusParsed.lessonNum, { autoStartReading: true });
                    }
                } else if (targetLessonNum == null && chapter.number === focusParsed.chapterNum) {
                    return handleChapterClick(chapter, focusParsed.lessonNum, { autoStartReading: true });
                }
            }
        }

        // Hard gate: never open a locked core lesson (completion strip used to bypass this).
        // Completed lessons stay open for re-read / monthly score even if the chain has gaps.
        if (
            targetLessonNum != null &&
            chapter?.number != null &&
            chapter.number !== 10 &&
            profile?.role !== 'admin'
        ) {
            const targetId = `${chapter.number}.${targetLessonNum}`;
            const alreadyDone =
                Array.isArray(completedLessons) && completedLessons.includes(targetId);
            if (!alreadyDone && !isLessonUnlocked(chapter.number, targetLessonNum)) {
                if (typeof showNotification === 'function') {
                    showNotification(
                        language === 'en'
                            ? `Lesson ${targetId} is locked. Finish the previous lesson quiz first.`
                            : `পাঠ ${targetId} লক আছে। আগে আগের পাঠের কুইজ শেষ করুন।`,
                        'info'
                    );
                }
                return;
            }
        }

        const currentBadge = getRoadmapBadgeByLevel(chapter.number);

        const openLessonTarget = (lesson) => {
            if (!lesson) return;
            const enriched = { ...lesson, badge: currentBadge, chapter };
            if (autoStartReading) {
                stopChapterAudio();
                setTrainingContent(enriched);
                setActiveSectionIndex(0);
                setIsJournalMode(true);
                setSelectedLesson(null);
                setSelectedChapter(null);
            } else {
                setSelectedLesson(enriched);
            }
        };

        setTrainingLoading(true);

        // Special handling for FAQ Chapter 10
        if (chapter.number === 10) {
            try {
                const data = await requestManager.fetch(
                    'chapter_10_qa_v2',
                    async () => {
                        const response = await fetch('/quizzes/chapter_10_qa.json');
                        if (response.ok) {
                            return await response.json();
                        }
                        return null;
                    },
                    { ttl: 60, swr: true }
                );
                if (data) {
                    setSelectedChapter({
                        ...chapter,
                        title: normalizeFaqTitle(chapter.title, language),
                        isFAQ: true,
                        content: {
                            ...data,
                            title: normalizeFaqTitle(data.title, language),
                        },
                    });
                }
            } catch (err) {
                console.error("Error loading FAQ chapter:", err);
            } finally {
                setTrainingLoading(false);
            }
            return;
        }

        // Lazy load subchapters with Versioned Sync
        try {
            // 1. Fetch metadata (id and version) for specific module
            const { data: remoteMetadata, error: metaError } = await supabase
                .from('training_chapters')
                .select('id, version, module_number, chapter_number')
                .eq('module_number', chapter.number)
                .eq('language', language)
                .eq('is_active', true);

            if (metaError) {
                console.warn("Versioning check failed, falling back to legacy fetch:", metaError);
                throw new Error("fallback");
            }

            if (!remoteMetadata || remoteMetadata.length === 0) {
                throw new Error("fallback");
            }

            // 2. Load locally stored content and compare versions
            const subchapters = [];
            const localVersions = secureStorage.getItem('training_content_versions') || {};
            let needsFullFetch = false;

            for (const meta of remoteMetadata) {
                const localContent = secureStorage.getItem(`training_content_${meta.id}`);
                const localVer = localVersions[meta.id];

                if (localContent && localVer === meta.version) {
                    // Use local encrypted content
                    subchapters.push({
                        ...localContent,
                        level_id: meta.id,
                        chapterNum: meta.module_number,
                        subchapterNum: meta.chapter_number
                    });
                } else {
                    // This chapter needs to be fetched/updated
                    needsFullFetch = true;
                    break;
                }
            }

            // 3. If everything is up-to-date locally, we are done
            if (!needsFullFetch && subchapters.length === remoteMetadata.length) {
                const sorted = subchapters.sort((a, b) => a.subchapterNum - b.subchapterNum);
                setSelectedChapter({ ...chapter, subchapters: sorted });
                if (targetLessonNum) {
                    openLessonTarget(sorted.find(s => s.subchapterNum === targetLessonNum));
                }
                setTrainingLoading(false);
                return;
            }

            // 4. Fetch full data if any mismatch found
            const { data: fullData, error: fetchError } = await supabase
                .rpc('get_chapters_by_module', {
                    module_num: chapter.number,
                    lang: language
                });

            if (fetchError) throw fetchError;

            if (fullData && fullData.length > 0) {
                const updatedVersions = { ...localVersions };
                const processed = fullData.map(row => {
                    // Save to secure storage
                    secureStorage.setItem(`training_content_${row.id}`, row.content);
                    updatedVersions[row.id] = row.version;

                    return {
                        ...row.content,
                        level_id: row.id,
                        chapterNum: row.module_number,
                        subchapterNum: row.chapter_number
                    };
                });

                // Update global version tracker
                secureStorage.setItem('training_content_versions', updatedVersions);
                const sorted = processed.sort((a, b) => a.subchapterNum - b.subchapterNum);
                setSelectedChapter({ ...chapter, subchapters: sorted });
                if (targetLessonNum) {
                    openLessonTarget(sorted.find(s => s.subchapterNum === targetLessonNum));
                }
            } else {
                // Fallback to legacy file fetch if DB returns empty
                const promises = [];
                for (let s = 1; s <= chapter.count; s++) {
                    promises.push(
                        fetch(`/quizzes/chapter_${chapter.number}_${s}.json`)
                            .then(r => r.ok ? r.json() : null)
                            .catch(() => null)
                    );
                }
                const results = await Promise.all(promises);
                const processed = results
                    .map((d, idx) => d ? { ...d, chapterNum: chapter.number, subchapterNum: idx + 1 } : null)
                    .filter(Boolean);
                setSelectedChapter({ ...chapter, subchapters: processed });
                if (targetLessonNum && processed) {
                    openLessonTarget(processed.find(s => s.subchapterNum === targetLessonNum));
                }
            }
        } catch (err) {
            console.error("Supabase sync failed, falling back to legacy fetch:", err);
            // Robust fallback for ANY error in the Supabase logic
            try {
                const promises = [];
                for (let s = 1; s <= chapter.count; s++) {
                    promises.push(
                        fetch(`/quizzes/chapter_${chapter.number}_${s}.json`)
                            .then(r => r.ok ? r.json() : null)
                            .catch(() => null)
                    );
                }
                const results = await Promise.all(promises);
                const processed = results
                    .map((d, idx) => d ? { ...d, chapterNum: chapter.number, subchapterNum: idx + 1 } : null)
                    .filter(Boolean);
                setSelectedChapter({ ...chapter, subchapters: processed });
                if (targetLessonNum && processed) {
                    openLessonTarget(processed.find(s => s.subchapterNum === targetLessonNum));
                }
            } catch (fallbackErr) {
                console.error("Critical failure loading subchapters:", fallbackErr);
            }
        } finally {
            setTrainingLoading(false);
        }
    };

    const openLessonFromCompletionStrip = useCallback(async (lessonItem) => {
        if (!lessonItem?.chapterNumber || !lessonItem?.lessonNumber) return;
        const currentId = String(trainingContent?.level_id || '');
        if (String(lessonItem.id) === currentId) {
            setActiveSectionIndex(0);
            requestAnimationFrame(() => {
                lessonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
            });
            return;
        }
        // Strip UI can be stale; re-check real unlock before navigating.
        const alreadyDone =
            Array.isArray(completedLessons) && completedLessons.includes(String(lessonItem.id));
        if (
            profile?.role !== 'admin' &&
            !alreadyDone &&
            !isLessonUnlocked(lessonItem.chapterNumber, lessonItem.lessonNumber)
        ) {
            if (typeof showNotification === 'function') {
                showNotification(
                    language === 'en'
                        ? `Lesson ${lessonItem.id} is locked. Pass this lesson's quiz to unlock the next one.`
                        : `পাঠ ${lessonItem.id} লক আছে। পরের পাঠ খুলতে এই পাঠের কুইজ পাস করুন।`,
                    'info'
                );
            }
            return;
        }
        const chapter = trainingChapters.find((c) => c.number === lessonItem.chapterNumber);
        if (!chapter) return;
        setCompletionStripOpeningId(lessonItem.id);
        try {
            stop();
            await handleChapterClick(chapter, lessonItem.lessonNumber, { autoStartReading: true });
        } finally {
            setCompletionStripOpeningId(null);
        }
    }, [
        trainingContent?.level_id,
        trainingChapters,
        stop,
        handleChapterClick,
        isLessonUnlocked,
        completedLessons,
        profile?.role,
        language,
        showNotification,
    ]);

    useEffect(() => {
        if (!user?.id || !trainingChapters?.length) return;

        const pending = peekGateUnlockPending(user.id);
        if (pending?.lessonId) {
            if (trainingContent?.level_id === pending.lessonId) return;
            const parsed = parseGateLessonId(pending.lessonId);
            if (!parsed) return;
            const chapter = trainingChapters.find((c) => c.number === parsed.chapterNum);
            if (!chapter) return;
            if (!trainingContent && !selectedLesson && !selectedChapter) {
                gateOpenAttemptRef.current = pending.lessonId;
                handleChapterClick(chapter, parsed.lessonNum, { autoStartReading: true });
            }
            return;
        }

        gateOpenAttemptRef.current = null;
        const nav = consumeGateNavigation(user.id);
        if (!nav?.chapterNum || !nav?.lessonNum) return;
        const chapter = trainingChapters.find((c) => c.number === nav.chapterNum);
        if (!chapter) return;
        handleChapterClick(chapter, nav.lessonNum, { autoStartReading: true });
    }, [user?.id, trainingChapters, trainingContent?.level_id, selectedLesson, selectedChapter]);

    // Gate lesson open is handled by consumeGateNavigation / unlock-pending effects above.

    useEffect(() => {
        const syncSurfaceFromHash = () => {
            const tabMatch = window.location.hash.match(/[?&]tab=([^&]*)/);
            const tab = tabMatch ? decodeURIComponent(tabMatch[1]) : null;

            if (tab === 'supplementary' || tab === 'life-skill' || tab === 'lifeskill') {
                setTrainingTab('supplementary');
                // Normalize aliases to the canonical Home deep link.
                if (tab !== 'supplementary') {
                    writeTrainingSurfaceHash('supplementary');
                }
                return;
            }

            if (tab === 'faq') {
                if (trainingChapters.length === 0) return;

                const faq = trainingChapters.find((c) => c.number === 10);
                if (!faq) return;

                window.history.replaceState(null, '', '#/training');
                setTrainingTab('core');
                handleChapterClick(faq, null, { faqExitUsesHistory: true });
                return;
            }

            // Plain `#/training` (Home / bottom nav) → core training home.
            setTrainingTab('core');
        };

        syncSurfaceFromHash();
        window.addEventListener('hashchange', syncSurfaceFromHash);
        return () => window.removeEventListener('hashchange', syncSurfaceFromHash);
    }, [trainingChapters]);

    // TTS Logic: Compile full lesson text
    const normalizeNarrationPart = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'number') return String(value);

        const punctuation = language === 'bn' ? '। ' : '. ';

        if (Array.isArray(value)) {
            return value
                .map(normalizeNarrationPart)
                .filter(Boolean)
                .join(punctuation);
        }
        if (typeof value === 'object') {
            const candidateKeys = ['text', 'title', 'content', 'value', 'description', 'item_name', 'importance', 'daily_check', 'specifications'];
            // For objects, we only take unique values to avoid duplication
            const values = [...new Set(candidateKeys
                .map((k) => normalizeNarrationPart(value[k]))
                .filter(Boolean))];
            return values.join(punctuation);
        }
        return '';
    };

    const getCurrentSlideNarrationText = () => {
        const currentSlide = slides[activeSectionIndex];
        if (!currentSlide) return '';

        let parts = [];
        const punctuation = language === 'bn' ? '। ' : '. ';

        if (currentSlide.type === 'hero') {
            parts.push(normalizeNarrationPart(currentSlide.level_title));
            parts.push(normalizeNarrationPart(currentSlide.mission_briefing));
        } else if (currentSlide.type === 'section') {
            parts.push(normalizeNarrationPart(currentSlide.title));
            currentSlide.points?.forEach(point => {
                // normalizeNarrationPart already handles object sub-fields intelligently
                parts.push(normalizeNarrationPart(point));
            });
        } else if (currentSlide.type === 'pro_tip') {
            parts.push(language === 'en' ? "Pro Tip" : "প্রো টিপ");
            currentSlide.content?.forEach(tip => parts.push(normalizeNarrationPart(tip)));
        } else if (currentSlide.type === 'myth_buster') {
            parts.push(normalizeNarrationPart(currentSlide.title));
            currentSlide.myths?.forEach(item => {
                // Only push the whole item if it's handled by normalizeNarrationPart, 
                // but since we want custom "Myth/Reality" labels, we do it manually.
                const mythText = (language === 'en' ? "Myth: " : "ভুল ধারণা: ") + normalizeNarrationPart(item.myth);
                const realityText = (language === 'en' ? "Reality: " : "সঠিক তথ্য: ") + normalizeNarrationPart(item.reality || item.fact);
                parts.push(mythText);
                parts.push(realityText);
            });
        } else if (currentSlide.type === 'advanced') {
            parts.push(normalizeNarrationPart(currentSlide.title));
            currentSlide.facts?.forEach(fact => {
                // Read the whole fact object which contains title and content
                parts.push(normalizeNarrationPart(fact));
            });
        } else if (currentSlide.type === 'completion') {
            if (trainingContent?.isSupplementary) {
                parts.push(language === 'en' ? 'Deep Insight Gained' : 'নতুন অভিজ্ঞতা অর্জন করলেন');
                parts.push(language === 'en' 
                    ? 'Taking care of yourself is as important as any technical skill. Well done.'
                    : 'নিজের যত্ন নেওয়া যেকোনো কারিগরি দক্ষতার মতোই সমান গুরুত্বপূর্ণ। আপনি দারুণ কাজ করেছেন!');
            } else {
                parts.push(language === 'en' ? 'Mission Accomplished!' : 'অভিনন্দন! আজকের মিশন সফলভাবে সম্পন্ন হয়েছে।');
                parts.push(language === 'en'
                    ? 'You have successfully completed this training lesson. Now, test your knowledge with a quick challenge!'
                    : 'আপনি এই ট্রেনিং পাঠটি সফলভাবে সম্পন্ন করেছেন। এবার একটি ছোট কুইজের মাধ্যমে আপনার জ্ঞান যাচাই করে নিন!');
            }
        }

        // Final fallback
        if (parts.filter(Boolean).length === 0) {
            parts.push(normalizeNarrationPart(currentSlide));
        }

        return parts.filter(Boolean).join(punctuation);
    };

    const handleReadLesson = async () => {
        setSupplementaryRadioOverlayOpen(false);
        const fullText = getCurrentSlideNarrationText();
        if (!fullText) return;
        const currentSpeechId = `lesson-slide-${activeSectionIndex}`;

        // Professional media-style toggle behavior
        if (activeId === currentSpeechId && isPlaying && !isPaused) {
            await pause();
            return;
        }

        // Resume same slide when paused or in a transient stopped-but-active state.
        if (activeId === currentSpeechId && (isPaused || !isPlaying)) {
            await resume();
            return;
        }

        await speak(fullText, currentSpeechId);
    };

    const closeLifeSkillSession = useCallback(
        (lessonId) => {
            if (lessonId) {
                handleMarkSupplementaryRead(lessonId, { silent: true });
            }
            setShowQuizModal(false);
            setPendingLessonId(null);
            setLifeSkillScoreGateActive(false);
            setSupplementaryRadioOverlayOpen(false);
            setTrainingContent(null);
            setIsJournalMode(false);
            setTrainingSurface('supplementary');
        },
        [handleMarkSupplementaryRead, setTrainingSurface]
    );

    const awardLifeSkillMonthlyPoints = useCallback(
        async (lessonId) => {
            if (!user || !lessonId || isGuestUser(profile)) {
                if (isGuestUser(profile) && typeof showNotification === 'function') {
                    showNotification(guestPreviewText(language, 'lessonResultGuest'), 'info');
                }
                return;
            }

            try {
                const { data: priorRows, error: priorError } = await supabase
                    .from('quiz_attempts')
                    .select('quiz_id, created_at')
                    .eq('user_id', user.id)
                    .like('quiz_id', `life_skill_bonus_${lessonId}_%`)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (priorError) {
                    console.error('Error checking life skill score cooldown:', priorError);
                } else {
                    const lastAwardAt = priorRows?.[0]?.created_at;
                    const daysLeft = getLifeSkillScoreCooldownDaysLeft(lastAwardAt);
                    if (daysLeft > 0) {
                        setLifeSkillScoreCooldownByModule((prev) => {
                            const next = new Map(prev);
                            next.set(lessonId, lastAwardAt);
                            return next;
                        });
                        if (typeof showNotification === 'function') {
                            showNotification(
                                language === 'en'
                                    ? `Practice saved — points again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
                                    : `অনুশীলন সংরক্ষিত — ${toBengaliNumber(daysLeft, 'bn')} দিন পর আবার পয়েন্ট পাবেন।`,
                                'info'
                            );
                        }
                        return;
                    }
                }

                const inputQuizId = buildLifeSkillBonusQuizId(lessonId);
                const { data: rpcData, error: rpcError } = await supabase.rpc('award_training_points', {
                    input_quiz_id: inputQuizId,
                    input_score: LIFE_SKILL_MONTHLY_BONUS_POINTS,
                    p_user_id: user.id,
                });

                if (rpcError) {
                    console.error('Error awarding life skill bonus:', rpcError);
                    if (typeof showNotification === 'function') {
                        showNotification(
                            language === 'en' ? 'Error saving points' : 'পয়েন্ট সেভ করতে ত্রুটি',
                            'error'
                        );
                    }
                    return;
                }

                const alreadyAwarded =
                    rpcData &&
                    typeof rpcData === 'object' &&
                    (rpcData.already_awarded === true || rpcData.already_awarded === 'true');

                const awardedAt = new Date().toISOString();
                setLifeSkillScoreCooldownByModule((prev) => {
                    const next = new Map(prev);
                    next.set(lessonId, awardedAt);
                    return next;
                });

                if (!alreadyAwarded) {
                    setLifeSkillTotalsByModule((prev) => {
                        const next = new Map(prev);
                        next.set(lessonId, (next.get(lessonId) || 0) + LIFE_SKILL_MONTHLY_BONUS_POINTS);
                        return next;
                    });
                    invalidateLeaderboardCaches(user.id);
                    cacheHelper.clear(`profile_${user.id}`);
                    setRecentReward(LIFE_SKILL_MONTHLY_BONUS_POINTS);
                    setTimeout(() => setRecentReward(null), 5000);
                    if (typeof showNotification === 'function') {
                        showNotification(
                            language === 'en'
                                ? `+${LIFE_SKILL_MONTHLY_BONUS_POINTS} points — Life Skill quiz. Next score in 30 days.`
                                : `+${LIFE_SKILL_MONTHLY_BONUS_POINTS} পয়েন্ট — লাইফ স্কিল কুইজ। পরবর্তী পয়েন্ট ৩০ দিন পর।`,
                            'success'
                        );
                    }
                } else if (typeof showNotification === 'function') {
                    showNotification(
                        language === 'en'
                            ? 'Practice saved — points already claimed for this module today.'
                            : 'অনুশীলন সংরক্ষিত — এই মডিউলের পয়েন্ট আজ ইতিমধ্যে নেওয়া হয়েছে।',
                        'info'
                    );
                }
            } catch (err) {
                console.error('Critical error awarding life skill points:', err);
                if (typeof showNotification === 'function') {
                    showNotification(
                        language === 'en' ? 'Error saving points' : 'পয়েন্ট সেভ করতে ত্রুটি',
                        'error'
                    );
                }
            }
        },
        [user, profile, language, showNotification]
    );

    /** After quiz pass: insist on listen when audio exists; award only outside cooldown. */
    const resolveLifeSkillScoreAfterPass = useCallback(
        async (lessonId) => {
            if (!lessonId) return;

            if (isGuestUser(profile)) {
                if (typeof showNotification === 'function') {
                    showNotification(guestPreviewText(language, 'lessonResultGuest'), 'info');
                }
                closeLifeSkillSession(lessonId);
                return;
            }

            const hasAudio = !!supplementaryRadioSrc;
            const cooldownDaysLeft = getLifeSkillScoreCooldownDaysLeft(
                lifeSkillScoreCooldownByModule.get(lessonId)
            );

            // Still require listen when audio exists (even during cooldown / practice).
            if (hasAudio && !lifeSkillListenQualifiedRef.current) {
                setPendingLessonId(lessonId);
                setShowQuizModal(false);
                setLifeSkillScoreGateActive(true);
                setSupplementaryRadioOverlayOpen(true);
                return;
            }

            if (cooldownDaysLeft > 0) {
                if (typeof showNotification === 'function') {
                    showNotification(
                        language === 'en'
                            ? `Practice saved — points again in ${cooldownDaysLeft} day${cooldownDaysLeft === 1 ? '' : 's'}.`
                            : `অনুশীলন সংরক্ষিত — ${toBengaliNumber(cooldownDaysLeft, 'bn')} দিন পর আবার পয়েন্ট পাবেন।`,
                        'info'
                    );
                }
                closeLifeSkillSession(lessonId);
                return;
            }

            await awardLifeSkillMonthlyPoints(lessonId);
            closeLifeSkillSession(lessonId);
        },
        [
            profile,
            language,
            showNotification,
            supplementaryRadioSrc,
            lifeSkillScoreCooldownByModule,
            awardLifeSkillMonthlyPoints,
            closeLifeSkillSession,
        ]
    );

    const awardCoreLessonMonthlyPoints = useCallback(
        async (lessonId) => {
            if (!CORE_LESSON_MONTHLY_BONUS_ENABLED || !user || !lessonId || isGuestUser(profile)) {
                return { awarded: false, skipped: true };
            }

            try {
                const { data: priorRows, error: priorError } = await supabase
                    .from('quiz_attempts')
                    .select('quiz_id, created_at')
                    .eq('user_id', user.id)
                    .or(
                        `quiz_id.eq.lesson_bonus_${lessonId},quiz_id.like.lesson_bonus_${lessonId}_%`
                    )
                    .order('created_at', { ascending: false })
                    .limit(40);

                if (priorError) {
                    console.error('Error checking core lesson score cooldown:', priorError);
                } else {
                    const forLesson = (priorRows || []).filter(
                        (row) => lessonIdFromCoreLessonBonusQuizId(row.quiz_id) === lessonId
                    );
                    const active = buildCoreLessonActiveCooldowns(
                        forLesson,
                        CORE_LESSON_MONTHLY_BONUS_LAUNCH_ISO
                    );
                    const lastAwardAt = active.get(lessonId);
                    const daysLeft = getCoreLessonScoreCooldownDaysLeft(lastAwardAt);
                    if (daysLeft > 0) {
                        setCoreLessonScoreCooldownByLesson((prev) => {
                            const next = new Map(prev);
                            next.set(lessonId, lastAwardAt);
                            return next;
                        });
                        if (typeof showNotification === 'function') {
                            showNotification(
                                language === 'en'
                                    ? `Practice saved — points again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
                                    : `অনুশীলন সংরক্ষিত — ${toBengaliNumber(daysLeft, 'bn')} দিন পর আবার পয়েন্ট পাবেন।`,
                                'info'
                            );
                        }
                        return { awarded: false, daysLeft };
                    }
                }

                const inputQuizId = buildCoreLessonMonthlyBonusQuizId(lessonId);
                const { data: rpcData, error: rpcError } = await supabase.rpc('award_training_points', {
                    input_quiz_id: inputQuizId,
                    input_score: CORE_LESSON_MONTHLY_BONUS_POINTS,
                    p_user_id: user.id,
                });

                if (rpcError) {
                    console.error('Error awarding core lesson monthly bonus:', rpcError);
                    if (typeof showNotification === 'function') {
                        showNotification(
                            language === 'en' ? 'Error saving points' : 'পয়েন্ট সেভ করতে ত্রুটি',
                            'error'
                        );
                    }
                    return { awarded: false, error: true };
                }

                const alreadyAwarded =
                    rpcData &&
                    typeof rpcData === 'object' &&
                    (rpcData.already_awarded === true || rpcData.already_awarded === 'true');

                const awardedAt = new Date().toISOString();
                setCoreLessonScoreCooldownByLesson((prev) => {
                    const next = new Map(prev);
                    next.set(lessonId, awardedAt);
                    return next;
                });

                if (!alreadyAwarded) {
                    invalidateLeaderboardCaches(user.id);
                    cacheHelper.clear(`profile_${user.id}`);
                    setRecentReward(CORE_LESSON_MONTHLY_BONUS_POINTS);
                    setTimeout(() => setRecentReward(null), 5000);
                    if (typeof showNotification === 'function') {
                        showNotification(
                            language === 'en'
                                ? `+${CORE_LESSON_MONTHLY_BONUS_POINTS} points — lesson review. Next score in 30 days.`
                                : `+${CORE_LESSON_MONTHLY_BONUS_POINTS} পয়েন্ট — পাঠ রিভিউ। পরবর্তী পয়েন্ট ৩০ দিন পর।`,
                            'success'
                        );
                    }
                    return { awarded: true };
                }

                if (typeof showNotification === 'function') {
                    showNotification(
                        language === 'en'
                            ? 'Practice saved — points already claimed for this lesson today.'
                            : 'অনুশীলন সংরক্ষিত — এই পাঠের পয়েন্ট আজ ইতিমধ্যে নেওয়া হয়েছে।',
                        'info'
                    );
                }
                return { awarded: false, alreadyAwarded: true };
            } catch (err) {
                console.error('Critical error awarding core lesson monthly points:', err);
                if (typeof showNotification === 'function') {
                    showNotification(
                        language === 'en' ? 'Error saving points' : 'পয়েন্ট সেভ করতে ত্রুটি',
                        'error'
                    );
                }
                return { awarded: false, error: true };
            }
        },
        [user, profile, language, showNotification]
    );

    const finalizeLessonCompletion = async (lessonId) => {
        if (isSupplementaryProgressLessonId(lessonId)) {
            await resolveLifeSkillScoreAfterPass(lessonId);
            return;
        }

        if (isGuestUser(profile)) {
            setShowQuizModal(false);
            setPendingLessonId(null);
            if (typeof showNotification === 'function') {
                showNotification(guestPreviewText(language, 'lessonResultGuest'), 'info');
            }
            return;
        }

        const current = Array.isArray(completedLessons) ? completedLessons : [];
        const updated = filterCoreCompletedLessonIds([...new Set([...current, lessonId])].filter(Boolean));
        const alreadyCompleted = completedLessons.includes(lessonId);
        const gateUnlock = user ? consumeGateUnlockPending(user.id, lessonId) : null;
        const gateReviewTarget = user && !gateUnlock ? consumeGateReviewTarget(user.id, lessonId) : false;
        const gateDrivenReview = alreadyCompleted && (gateUnlock?.kind === 'review' || gateReviewTarget);

        if (gateDrivenReview) {
            logReadingHabitReview(user.id, lessonId, profile);
            if (typeof showNotification === 'function') {
                showNotification(
                    language === 'en'
                        ? 'Review saved — hourly quiz unlocked.'
                        : 'রিভিউ সংরক্ষিত — ঘণ্টাভিত্তিক কুইজ খোলা হয়েছে।',
                    'success'
                );
            }
            setShowQuizModal(false);
            setPendingLessonId(null);
            setGateFocusTick((t) => t + 1);
            return;
        }

        if (!alreadyCompleted) {
            const bonusPoints = 20;
            let pointsAwarded = false;
            let progressSynced = false;

            // Always mark the lesson complete on quiz pass so the next lesson can unlock.
            // Points award is best-effort and must not block the unlock chain.
            setCompletedLessons(updated);
            if (user) {
                storageUtils.setItem(`training_progress_${user.id}`, JSON.stringify(updated));
            }

            if (user) {
                try {
                    const { error: rpcError } = await supabase.rpc('award_training_points', {
                        input_quiz_id: `lesson_bonus_${lessonId}`,
                        input_score: bonusPoints,
                        p_user_id: user.id,
                    });

                    if (rpcError) {
                        console.error('Error awarding lesson bonus:', rpcError);
                        if (typeof showNotification === 'function') {
                            showNotification(
                                language === 'en'
                                    ? 'Lesson progress saved, but points could not be awarded. Try again later if points are missing.'
                                    : 'পাঠের অগ্রগতি সেভ হয়েছে, কিন্তু পয়েন্ট যোগ হয়নি। পয়েন্ট না থাকলে পরে আবার চেষ্টা করুন।',
                                'info'
                            );
                        }
                    } else {
                        pointsAwarded = true;
                        invalidateLeaderboardCaches(user.id);
                        cacheHelper.clear(`profile_${user.id}`);
                        setRecentReward(bonusPoints);
                        setTimeout(() => setRecentReward(null), 5000);
                        if (CORE_LESSON_MONTHLY_BONUS_ENABLED) {
                            setCoreLessonScoreCooldownByLesson((prev) => {
                                const next = new Map(prev);
                                next.set(lessonId, new Date().toISOString());
                                return next;
                            });
                        }
                    }

                    logReadingHabitCompletion(user.id, lessonId, profile);
                    if (gateUnlock && !pointsAwarded && typeof showNotification === 'function') {
                        showNotification(
                            language === 'en'
                                ? 'Lesson saved — hourly quiz unlocked.'
                                : 'পাঠ সংরক্ষিত — ঘণ্টাভিত্তিক কুইজ খোলা হয়েছে।',
                            'success'
                        );
                    }
                } catch (err) {
                    console.error('Critical error in point awarding:', err);
                    logReadingHabitCompletion(user.id, lessonId, profile);
                    if (typeof showNotification === 'function') {
                        showNotification(
                            language === 'en'
                                ? 'Lesson progress saved, but points could not be awarded. Try again later if points are missing.'
                                : 'পাঠের অগ্রগতি সেভ হয়েছে, কিন্তু পয়েন্ট যোগ হয়নি। পয়েন্ট না থাকলে পরে আবার চেষ্টা করুন।',
                            'info'
                        );
                    }
                }

                const newLevel = calculateLevelFromProgress(updated, trainingChapters);
                const currentStoredLevel = profile?.training_level || 0;
                const updatePayload = {
                    completed_lessons: updated
                };

                if (newLevel > currentStoredLevel) {
                    updatePayload.training_level = newLevel;
                }

                console.log('📝 Syncing progress to Supabase...', updatePayload);
                let updateError = null;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    const { error } = await supabase
                        .from('profiles')
                        .update(updatePayload)
                        .eq('id', user.id);
                    if (!error) {
                        updateError = null;
                        progressSynced = true;
                        console.log('✅ Progress synced successfully!');
                        break;
                    }
                    updateError = error;
                    console.warn(`Profile sync attempt ${attempt}/3 failed:`, error);
                    await new Promise((r) => setTimeout(r, 350 * attempt));
                }

                if (updateError) {
                    console.error('❌ Failed to sync progress to Supabase after retries:', updateError);
                    if (typeof showNotification === 'function') {
                        showNotification(
                            language === 'en'
                                ? 'Lesson marked complete on this device, but server sync failed. Keep the app open and try again; contact support if this continues.'
                                : 'এই ডিভাইসে পাঠ সম্পন্ন দেখানো হয়েছে, কিন্তু সার্ভারে সেভ হয়নি। অ্যাপ খোলা রাখুন এবং আবার চেষ্টা করুন।',
                            'error'
                        );
                    }
                }
            }
            // Only force-refresh parent profile after a successful server write — otherwise
            // a stale fetch can wipe the local completed_lessons we just set.
            if (progressSynced && onProgressUpdate) {
                onProgressUpdate(updated, true);
            } else if (!user && onProgressUpdate) {
                onProgressUpdate(updated, false);
            }
        } else if (gateUnlock) {
            logReadingHabitReview(user.id, lessonId, profile);
            if (typeof showNotification === 'function') {
                showNotification(
                    language === 'en'
                        ? 'Review saved — hourly quiz unlocked.'
                        : 'রিভিউ সংরক্ষিত — ঘণ্টাভিত্তিক কুইজ খোলা হয়েছে।',
                    'success'
                );
            }
        } else if (CORE_LESSON_MONTHLY_BONUS_ENABLED && user) {
            // Voluntary re-read of a completed lesson — monthly +20 when off cooldown.
            await awardCoreLessonMonthlyPoints(lessonId);
        }
        setShowQuizModal(false);
        setPendingLessonId(null);
        setGateFocusTick((t) => t + 1);
    };

    const initiateLessonCompletion = async (lessonId) => {
        // Construct quiz filename based on lesson ID (e.g., "1.1" -> "questions_1_1.json", "supp_10_1" -> "questions_supp_10_1.json")
        const filename = `questions_${lessonId.replace('.', '_')}.json`;

        try {
            const response = await fetch(`/quizzes/${filename}`);
            if (!response.ok) {
                // If no quiz file exists, just complete the lesson
                finalizeLessonCompletion(lessonId);
                return;
            }

            const allQuestions = await response.json();

            if (allQuestions && allQuestions.length > 0) {
                // Separate image-based and text-based questions
                const isImageQuestion = (q) => {
                    const hasQuestionImage = !!q.image;
                    const hasImageOptions = Array.isArray(q.options) && q.options.some(opt =>
                        typeof opt === 'string' && (opt.startsWith('/') || opt.includes('.jpg') || opt.includes('.png') || opt.includes('.webp'))
                    );
                    return hasQuestionImage || hasImageOptions;
                };

                const imagePool = allQuestions.filter(isImageQuestion).sort(() => 0.5 - Math.random());
                const textPool = allQuestions.filter(q => !isImageQuestion(q)).sort(() => 0.5 - Math.random());

                // Pick up to 2 guaranteed image questions
                const guaranteedCount = Math.min(imagePool.length, 2);
                const selectedImageQuestions = imagePool.slice(0, guaranteedCount);

                // Remaining pool: unused image questions + all text questions
                const remainingPool = [...imagePool.slice(guaranteedCount), ...textPool].sort(() => 0.5 - Math.random());

                // Combine and shuffle up to 10 total
                let selected = [...selectedImageQuestions, ...remainingPool].slice(0, 10);
                selected = selected.sort(() => 0.5 - Math.random());

                // Update previous questions for next attempt
                setPreviousQuizQuestions(prev => ({
                    ...prev,
                    [lessonId]: selected.map(q => q.questionText)
                }));

                setCurrentQuizQuestions(selected);
                setPendingLessonId(lessonId);
                setShowQuizModal(true);
            } else {
                // Empty quiz file
                finalizeLessonCompletion(lessonId);
            }
        } catch (error) {
            console.error("Error loading quiz:", error);
            // On error (e.g., 404), just complete the lesson
            finalizeLessonCompletion(lessonId);
        }
    };

    const handleReadAgain = () => {
        setActiveSectionIndex(0);
        setShowQuizModal(false);
    };

    const handleQuizComplete = (score) => {
        if (!pendingLessonId) return;
        if (isSupplementaryProgressLessonId(pendingLessonId)) {
            void resolveLifeSkillScoreAfterPass(pendingLessonId);
            return;
        }
        finalizeLessonCompletion(pendingLessonId);
    };

    const handleLifeSkillListenQualified = useCallback(() => {
        lifeSkillListenQualifiedRef.current = true;
        setLifeSkillListenQualified(true);
        if (!lifeSkillScoreGateActive) return;
        const lessonId = pendingLessonId || trainingContent?.level_id;
        if (!lessonId || !isSupplementaryProgressLessonId(lessonId)) return;
        setLifeSkillScoreGateActive(false);
        setSupplementaryRadioOverlayOpen(false);
        void (async () => {
            await awardLifeSkillMonthlyPoints(lessonId);
            closeLifeSkillSession(lessonId);
        })();
    }, [
        lifeSkillScoreGateActive,
        pendingLessonId,
        trainingContent?.level_id,
        awardLifeSkillMonthlyPoints,
        closeLifeSkillSession,
    ]);

    const handleLifeSkillSkipWithoutScore = useCallback(() => {
        const lessonId = pendingLessonId || trainingContent?.level_id;
        setLifeSkillScoreGateActive(false);
        setSupplementaryRadioOverlayOpen(false);
        if (typeof showNotification === 'function') {
            showNotification(
                language === 'en'
                    ? 'No points this time — you left without listening.'
                    : 'এবার পয়েন্ট হয়নি — অডিও না শুনে বেরিয়ে এসেছেন।',
                'info'
            );
        }
        if (lessonId && isSupplementaryProgressLessonId(lessonId)) {
            closeLifeSkillSession(lessonId);
        }
    }, [pendingLessonId, trainingContent?.level_id, language, showNotification, closeLifeSkillSession]);

    const handleGuestQuizComplete = () => {
        setShowQuizModal(false);
        setPendingLessonId(null);
    };

    const handleQuizResultHourlyNav = useCallback(async ({ passed }) => {
        const lessonId = pendingLessonId;
        if (passed && lessonId && !isGuestUser(profile)) {
            await finalizeLessonCompletion(lessonId);
        } else {
            setShowQuizModal(false);
            setPendingLessonId(null);
        }
        stop();
        setTrainingContent(null);
        setSelectedChapter(null);
        setSelectedLesson(null);
        setIsJournalMode(false);
        await handleHourlyChallengeClick();
    }, [pendingLessonId, stop, handleHourlyChallengeClick, profile]);

    return (
        <div className="mx-auto flex h-full min-h-0 max-w-7xl flex-col animate-slide-down px-4 py-4 sm:px-6 sm:py-6">


            {fetchError && (
                <div className="max-w-md mx-auto mb-8 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-2xl text-center animate-fade-in">
                    <div className="text-3xl mb-3">📡</div>
                    <h3 className="text-red-800 dark:text-red-400 font-bold mb-2">
                        {language === 'en' ? 'Connection Error' : 'কানেকশন এরর'}
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-500 mb-4">
                        {language === 'en'
                            ? 'Unable to load training data. Please check your internet connection.'
                            : 'প্রশিক্ষণ তথ্য লোড করা সম্ভব হয়নি। আপনার ইন্টারনেট কানেকশন চেক করুন।'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                        >
                            {language === 'en' ? 'Retry' : 'আবার চেষ্টা করুন'}
                        </button>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.hash = '#/';
                                window.location.reload();
                            }}
                            className="px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                        >
                            {language === 'en' ? 'Reset Cache & Login' : 'ক্যাশ মুছে নতুন করে লগিন করুন'}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            {trainingLoading ? (
                <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center animate-fade-in">
                    {/* Lesson open / initial fetch — skip heavy Lottie; cover appears next */}
                    {!selectedChapter ? (
                        <div
                            className="loading-container-fixed"
                            aria-busy="true"
                            aria-label={language === 'en' ? 'Loading lesson' : 'পাঠ লোড হচ্ছে'}
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-1 w-28 overflow-hidden rounded-full bg-slate-200/90">
                                    <div className="h-full w-1/2 animate-pulse rounded-full bg-orange-400/90" />
                                </div>
                                {!trainingHomeReady && (
                                    <p className={`text-sm font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Loading…' : 'লোড হচ্ছে…'}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <TrainingSkeleton />
                            <p className={`mx-auto max-w-md px-4 text-center text-xs font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {LOADING_TIPS[language === 'bn' ? 'bn' : 'en'][loadingTipIndex % LOADING_TIPS.en.length]}
                            </p>
                        </div>
                    )}
                </div>
            ) : !selectedChapter && !trainingContent ? (
                <div className="flex min-h-0 flex-1 flex-col animate-fade-in-up text-slate-900">

                    {gateFocusPending?.lessonId && (
                        <div className={`mx-auto mb-3 w-full max-w-2xl shrink-0 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-center shadow-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                            <p className="text-sm font-bold text-slate-900">
                                {language === 'en'
                                    ? `Hourly quiz locked — opening lesson ${gateFocusPending.lessonId}…`
                                    : `ঘণ্টাভিত্তিক কুইজ লক — পাঠ ${gateFocusPending.lessonId} খোলা হচ্ছে…`}
                            </p>
                        </div>
                    )}

                    {trainingTab === 'core' ? (
                        <>
                    {/* Title + Index stay above the journey; path scrolls under a soft opaque→transparent veil. */}
                    <div className="relative z-20 shrink-0">
                        <div className="relative bg-[#fffdf7] px-2 pt-1">
                            <div className="relative mx-auto max-w-2xl">
                                {!trainingLoading && !radioGlobalExpanded && (
                                    <div className="absolute right-0 top-0 z-10 sm:right-1">
                                        <button
                                            type="button"
                                            onClick={handleHourlyChallengeClick}
                                            className="transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf7]"
                                            title={language === 'en' ? 'Hourly Challenge' : 'প্রতি ঘণ্টার চ্যালেঞ্জ'}
                                            aria-label={language === 'en' ? 'Hourly Challenge' : 'প্রতি ঘণ্টার চ্যালেঞ্জ'}
                                        >
                                            <div className="relative">
                                                <div className="h-11 w-11 drop-shadow-lg sm:h-14 sm:w-14">
                                                    <DotLottiePlayer
                                                        src={clockLottie}
                                                        autoplay
                                                        loop
                                                        className="h-full w-full filter saturate-150 contrast-125"
                                                    />
                                                </div>
                                                {isHourlyPending && (
                                                    <span className="absolute right-1 top-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                                                        <span className="relative inline-flex h-full w-full rounded-full border border-white bg-emerald-500 shadow-sm dark:border-slate-800" />
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                )}

                                <h1
                                    className={`px-12 text-center text-2xl font-black leading-tight tracking-tight text-slate-900 sm:px-16 sm:text-4xl md:text-5xl ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {language === 'en' ? 'Grow your professional knowledge' : 'পেশাগত জ্ঞান বাড়ান'}
                                </h1>

                                {(() => {
                                    const { journeyChapters } = roadmapData;
                                    const totalLessons = journeyChapters.reduce((acc, c) => acc + (c.count || 0), 0);
                                    const totalCompleted = completedLessons.filter((id) => {
                                        if (!id) return false;
                                        const chapterNum = parseInt(id.toString().split('.')[0], 10);
                                        return chapterNum >= 1 && chapterNum < 10;
                                    }).length;
                                    const doneStr =
                                        language === 'bn'
                                            ? totalCompleted === 0
                                                ? '০'
                                                : toBengaliNumber(totalCompleted, language) || String(totalCompleted)
                                            : String(totalCompleted);
                                    const totalStr =
                                        language === 'bn'
                                            ? totalLessons === 0
                                                ? '০'
                                                : toBengaliNumber(totalLessons, language) || String(totalLessons)
                                            : String(totalLessons);

                                    return (
                                        <div
                                            className="mx-auto mt-3 flex max-w-lg flex-wrap items-center justify-center gap-2.5 animate-fade-in-up sm:mt-4 sm:gap-3"
                                            style={{ animationDelay: '120ms' }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setShowLessonIndex(true)}
                                                className={`inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 ${language === 'bn' ? 'font-bengali' : ''}`}
                                            >
                                                <span aria-hidden>📑</span>
                                                {language === 'en' ? 'Index' : 'সূচীপত্র'}
                                            </button>
                                            {totalLessons > 0 ? (
                                                <span
                                                    className={`inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-4 py-2.5 text-sm font-black tabular-nums text-orange-800 shadow-sm ${language === 'bn' ? 'font-bengali' : ''}`}
                                                >
                                                    {doneStr} / {totalStr}
                                                </span>
                                            ) : null}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        {/* Opaque → transparent veil; path scrolls up underneath this */}
                        <div
                            className="pointer-events-none h-14 w-full sm:h-16"
                            style={{
                                background:
                                    'linear-gradient(to bottom, #fffdf7 0%, rgba(255,253,247,0.82) 32%, rgba(255,253,247,0.4) 62%, rgba(255,253,247,0.12) 82%, rgba(255,253,247,0) 100%)',
                            }}
                            aria-hidden
                        />
                    </div>

                    <div
                        ref={roadmapScrollRef}
                        className="relative z-0 -mt-14 min-h-0 flex-1 overflow-y-auto overscroll-y-contain scrollbar-hide sm:-mt-16"
                    >
                    {/* Gamified Journey Map Logic */}
                    {(() => {
                        const isMobile = window.innerWidth < 768;
                        const { items: roadmapItems, height: roadmapHeight, maxPath: maxPathIndex, nodeVerticalGap, journeyChapters } = roadmapData;
                        const currentTrainingLevel = calculateLevelFromProgress(completedLessons, trainingChapters);

                        // Main Journey View
                        return (
                            <div className="relative mx-auto max-w-2xl px-4 pb-8 pt-6 sm:px-2 sm:pt-8">
                                {/* Journey Container */}
                                <div className="relative" style={{ height: roadmapHeight }}>

                                    {/* SVG Path Connector */}
                                    <svg
                                        className="absolute top-0 left-0 w-full h-full z-0 overflow-visible pointer-events-none"
                                        viewBox={`0 0 100 ${roadmapHeight}`}
                                        preserveAspectRatio="none"
                                    >
                                        <defs>
                                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feGaussianBlur stdDeviation="1.5" result="blur" />
                                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                            </filter>
                                        </defs>

                                        {/* Static Background Path */}
                                        <path
                                            d={roadmapItems.map((_, i) => {
                                                if (i === roadmapItems.length - 1) return '';
                                                const startY = i * nodeVerticalGap + 60;
                                                const endY = (i + 1) * nodeVerticalGap + 60;
                                                const amplitude = isMobile ? 25 : 18;
                                                const x1 = 50 + Math.sin(i * 0.8) * amplitude;
                                                const x2 = 50 + Math.sin((i + 1) * 0.8) * amplitude;
                                                const cpY1 = startY + nodeVerticalGap / 2;
                                                const cpY2 = endY - nodeVerticalGap / 2;
                                                return i === 0
                                                    ? `M ${x1} ${startY} C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`
                                                    : `C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`;
                                            }).join(" ")}
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            fill="none"
                                            className="text-slate-200/80"
                                        />

                                        {/* Dynamic Progress Path */}
                                        <path
                                            d={(() => {
                                                if (maxPathIndex <= 0) return '';
                                                const pathParts = [];
                                                for (let i = 0; i < maxPathIndex; i++) {
                                                    const startY = i * nodeVerticalGap + 60;
                                                    const endY = (i + 1) * nodeVerticalGap + 60;
                                                    const amplitude = isMobile ? 25 : 18;
                                                    const x1 = 50 + Math.sin(i * 0.8) * amplitude;
                                                    const x2 = 50 + Math.sin((i + 1) * 0.8) * amplitude;
                                                    const cpY1 = startY + nodeVerticalGap / 2;
                                                    const cpY2 = endY - nodeVerticalGap / 2;
                                                    pathParts.push(i === 0
                                                        ? `M ${x1} ${startY} C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`
                                                        : `C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${endY}`);
                                                }
                                                return pathParts.join(" ");
                                            })()}
                                            stroke="#fb923c"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            fill="none"
                                            filter="url(#glow)"
                                            className="opacity-50"
                                        />
                                    </svg>

                                    {/* Nodes */}
                                    <div className="relative z-10">
                                        {roadmapItems.map((item, index) => {
                                            const amplitude = isMobile ? 25 : 18;
                                            const xPos = 50 + Math.sin(index * 0.8) * amplitude;
                                            const yPos = index * nodeVerticalGap + 60;

                                            if (item.type === 'milestone') {
                                                const firstLesson = roadmapItems[index + 1];
                                                const milestoneUnlocked = firstLesson ? firstLesson.isUnlocked : true;
                                                const isCurrentRank = currentTrainingLevel === item.chapter.number;
                                                return (
                                                    <div
                                                        key={`milestone-${item.chapter.number}`}
                                                        className="absolute z-10 transition-all duration-700"
                                                        style={{ left: `${xPos}%`, top: yPos, transform: 'translate(-50%, -50%)' }}
                                                    >
                                                        <RankMilestone
                                                            badge={item.badge}
                                                            language={language}
                                                            isUnlocked={milestoneUnlocked}
                                                            isCurrent={isCurrentRank}
                                                            prefersReducedMotion={prefersReducedMotion}
                                                        />
                                                    </div>
                                                );
                                            }

                                            const isNext = !item.isCompleted && item.isUnlocked;
                                            const scoreDaysLeft =
                                                CORE_LESSON_MONTHLY_BONUS_ENABLED && item.isCompleted
                                                    ? getCoreLessonScoreCooldownDaysLeft(
                                                          coreLessonScoreCooldownByLesson.get(item.id)
                                                      )
                                                    : 0;
                                            const scoreClaimReady =
                                                CORE_LESSON_MONTHLY_BONUS_ENABLED &&
                                                item.isCompleted &&
                                                scoreDaysLeft === 0;
                                            const roadmapStatusLabel = item.isCompleted
                                                ? !CORE_LESSON_MONTHLY_BONUS_ENABLED
                                                    ? language === 'en'
                                                        ? 'Read again'
                                                        : 'আবার পড়ুন'
                                                    : scoreDaysLeft > 0
                                                      ? language === 'en'
                                                          ? `Read again. Points in ${scoreDaysLeft} day${scoreDaysLeft === 1 ? '' : 's'}.`
                                                          : `আবার পড়ুন। ${toBengaliNumber(scoreDaysLeft, 'bn')} দিন পর পয়েন্ট।`
                                                      : language === 'en'
                                                        ? 'Read again. +20 points ready.'
                                                        : 'আবার পড়ুন। +২০ পয়েন্ট প্রস্তুত।'
                                                : item.isUnlocked
                                                  ? language === 'en'
                                                      ? 'Quick read'
                                                      : 'দ্রুত পড়ুন'
                                                  : language === 'en'
                                                    ? 'Locked'
                                                    : 'লক করা';
                                            return (
                                                <div
                                                    key={`lesson-${item.id}`}
                                                    id={`roadmap-node-${item.id}`}
                                                    role="button"
                                                    tabIndex={item.isUnlocked ? 0 : -1}
                                                    title={roadmapStatusLabel}
                                                    aria-label={`Lesson ${item.id}. ${roadmapStatusLabel}`}
                                                    onClick={() => {
                                                        if (item.isUnlocked) {
                                                            handleChapterClick(journeyChapters.find(c => c.number === item.chapterNumber), item.lessonNumber);
                                                        } else {
                                                            const chapterInfo = journeyChapters.find(c => c.number === item.chapterNumber);
                                                            setLockedLessonModal({
                                                                lessonId: item.id,
                                                                lessonNumber: item.lessonNumber,
                                                                chapterNumber: item.chapterNumber,
                                                                chapterTitle: chapterInfo?.title || '',
                                                                chapterLabel: language === 'en' ? `Chapter ${item.chapterNumber}` : `অধ্যায় ${toBengaliNumber(item.chapterNumber, language)}`
                                                            });
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (!item.isUnlocked) return;
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleChapterClick(
                                                                journeyChapters.find((c) => c.number === item.chapterNumber),
                                                                item.lessonNumber
                                                            );
                                                        }
                                                    }}
                                                    className={`group absolute z-20 flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-full border-2 transition-all duration-300 active:scale-95 sm:h-20 sm:w-20 ${
                                                        scoreClaimReady
                                                            ? 'border-amber-500/80 bg-amber-400 text-slate-900 shadow-md hover:shadow-lg'
                                                            : item.isCompleted
                                                              ? 'border-emerald-700/25 bg-emerald-400 text-slate-900 shadow-md hover:shadow-lg'
                                                              : item.isUnlocked
                                                                ? `border-slate-900/10 ${item.badge.color} text-slate-900 shadow-md hover:shadow-lg`
                                                                : 'cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500 opacity-80 shadow-sm grayscale'
                                                    } ${isNext ? 'animate-float-y border-orange-500 shadow-lg shadow-orange-500/30 ring-4 ring-orange-400/40' : ''}`}
                                                    style={{ left: `${xPos}%`, top: yPos, transform: 'translate(-50%, -50%)' }}
                                                >
                                                    {scoreClaimReady ? (
                                                        <span className="relative flex h-7 w-full items-center justify-center sm:h-8">
                                                            <span
                                                                className={`animate-lesson-score-ready-a absolute text-base font-black sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}
                                                            >
                                                                {toBengaliNumber(item.id, language)}
                                                            </span>
                                                            <span
                                                                className={`animate-lesson-score-ready-b absolute text-base font-black tabular-nums sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}
                                                            >
                                                                +{language === 'bn' ? toBengaliNumber(CORE_LESSON_MONTHLY_BONUS_POINTS, 'bn') : CORE_LESSON_MONTHLY_BONUS_POINTS}
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className={`text-base sm:text-lg font-black ${language === 'bn' ? 'font-bengali' : ''}`}>{toBengaliNumber(item.id, language)}</span>
                                                    )}
                                                    {/* Desktop-only hover chip — mobile has no hover; status is on the lesson screen + amber check. */}
                                                    <div className={`pointer-events-none absolute top-full z-50 mt-3 hidden w-max max-w-[11rem] rounded-full bg-slate-900/90 px-3 py-1.5 text-center text-[10px] font-bold text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity [@media(hover:hover)]:block [@media(hover:hover)]:group-hover:opacity-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                        {item.isCompleted ? (
                                                            !CORE_LESSON_MONTHLY_BONUS_ENABLED
                                                                ? (language === 'en' ? 'Read Again' : 'আবার পড়ুন')
                                                                : scoreDaysLeft > 0
                                                                  ? (language === 'en'
                                                                        ? `Read again · points in ${scoreDaysLeft}d`
                                                                        : `আবার পড়ুন · ${toBengaliNumber(scoreDaysLeft, 'bn')} দিনে পয়েন্ট`)
                                                                  : (language === 'en'
                                                                        ? 'Read again · +20 ready'
                                                                        : 'আবার পড়ুন · +২০ প্রস্তুত')
                                                        ) : item.isUnlocked ? (
                                                            language === 'en' ? 'Quick Read' : 'দ্রুত পড়ুন'
                                                        ) : (
                                                            language === 'en' ? 'Not so fast! 🔒' : 'ধৈর্য ধরুন! 🔒'
                                                        )}
                                                    </div>
                                                    {item.isCompleted && !scoreClaimReady && (
                                                        <div
                                                            className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-slate-900/20 bg-white text-emerald-600 shadow-sm sm:h-6 sm:w-6"
                                                            aria-hidden
                                                        >
                                                            <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    
                                                    {isNext && (
                                                        <RoadmapNextMarker
                                                            language={language}
                                                            score={userRank?.score || profile?.points || 0}
                                                            prefersReducedMotion={prefersReducedMotion}
                                                            anchorRight={xPos > 50}
                                                            avatarUrl={profile?.avatar_url}
                                                            userId={user?.id}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Aro Janun — entry card */}
                    <div className="group mt-12">
                        <button
                            type="button"
                            onClick={() => setCurrentView('aro-janun')}
                            className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99] sm:p-5 lg:p-6"
                        >
                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-slate-200/60 bg-teal-100 text-4xl text-teal-800 shadow-sm sm:h-20 sm:w-20 sm:text-5xl">
                                    🧰
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <h2 className={`text-lg font-black leading-tight tracking-tight text-slate-900 sm:text-xl lg:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Know More' : 'আরো জানুন'}
                                    </h2>
                                    <span className="inline-flex w-fit shrink-0 items-center gap-2 self-start rounded-full border border-slate-200/80 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider shadow-sm nb-mono sm:self-center">
                                        <span>{language === 'en' ? 'Browse Chapters' : 'অধ্যায় দেখুন'}</span>
                                        <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Video Library CTA */}
                    <div className="group mt-8">
                        <button
                            type="button"
                            onClick={() => setCurrentView('video-guide')}
                            className="w-full rounded-2xl bg-orange-500 p-4 text-left text-white shadow-md shadow-orange-500/30 transition-all hover:shadow-lg hover:shadow-orange-500/35 active:scale-[0.99] sm:p-5 lg:p-6"
                        >
                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/25 text-4xl shadow-sm sm:h-20 sm:w-20 sm:text-5xl">
                                    📺
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <h2 className={`text-lg font-black leading-tight tracking-tight sm:text-xl lg:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Video Learning Library' : 'ভিডিও লার্নিং লাইব্রেরি'}
                                    </h2>
                                    <span className="inline-flex w-fit shrink-0 items-center gap-2 self-start rounded-full border border-slate-200/80 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider shadow-sm nb-mono sm:self-center">
                                        <span>{language === 'en' ? 'Watch Now' : 'এখনই দেখুন'}</span>
                                        <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* FAQ CTA Card */}
                    <div className="group mt-8">
                        <button
                            type="button"
                            onClick={() => {
                                const faq = trainingChapters.find(c => c.number === 10);
                                if (faq) handleChapterClick(faq);
                            }}
                            className="w-full rounded-2xl bg-indigo-600 p-4 text-left text-white shadow-md shadow-indigo-600/25 transition-all hover:shadow-lg active:scale-[0.99] sm:p-5 lg:p-6"
                        >
                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/25 text-4xl shadow-sm sm:h-20 sm:w-20 sm:text-5xl">
                                    💡
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <h2 className={`text-lg font-black leading-tight tracking-tight sm:text-xl lg:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? FAQ_PAGE_TITLE.en : FAQ_PAGE_TITLE.bn}
                                    </h2>
                                    <span className="inline-flex w-fit shrink-0 items-center gap-2 self-start rounded-full border border-slate-200/80 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider shadow-sm nb-mono sm:self-center">
                                        <span>{language === 'en' ? 'Search Answers' : 'উত্তর খুঁজুন'}</span>
                                        <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>


                        {/* Professional Branding Footer */}
                        <div className="relative z-10 mb-24 mt-20 animate-fade-in-up text-center md:mb-12">
                            <div className="flex flex-col items-center gap-4">
                                <div className="nb-tag inline-flex items-center gap-2 bg-white px-4 py-1.5">
                                    <span className="h-2 w-2 animate-pulse bg-orange-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] nb-mono">Official Platform</span>
                                </div>
                                <a
                                    href={WEBSITE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-2xl font-black tracking-tight text-slate-900 transition-colors hover:text-orange-600"
                                >
                                    {WEBSITE_URL.replace('https://', '')}
                                </a>
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-xs font-medium text-slate-600">For support and inquiries:</p>
                                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm font-bold text-orange-600 transition-colors hover:text-orange-700">
                                        {SUPPORT_EMAIL}
                                    </a>
                                </div>
                                <div className="mt-4 h-0.5 w-40 bg-slate-900" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 nb-mono">
                                    {APP_NAME} v{CURRENT_APP_VERSION}
                                </p>
                            </div>
                        </div>
                    </div>
                    </>
                    ) : (
                        <>
                            <header className="mx-auto mb-4 w-full max-w-2xl shrink-0 px-4 pt-1 text-center sm:mb-6 sm:pt-2">
                                <h1
                                    className={`text-[2.25rem] font-black leading-[1.06] tracking-tight text-slate-900 sm:text-5xl md:text-6xl ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {language === 'en' ? 'Life Skill' : 'লাইফ স্কিল'}
                                </h1>
                                <p
                                    className={`mx-auto mt-3 max-w-md text-base font-bold leading-snug text-slate-600 sm:mt-4 sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {language === 'en'
                                        ? 'Without essential knowledge beyond the job, you can never become a truly smart professional.'
                                        : 'কাজের বাইরে কিছু জরুরি জ্ঞান না থাকলে আপনি কখনোই সত্যিকারের স্মার্ট পেশাদার হতে পারবেন না।'}
                                </p>
                            </header>
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scrollbar-hide">
                            <div className="mx-auto mb-20 grid max-w-7xl animate-fade-in-up grid-cols-1 gap-4 px-2 py-4 min-[420px]:grid-cols-2 sm:mb-28 sm:gap-5 sm:py-6 md:grid-cols-3 lg:mb-32">
                            {supplementaryModules.map((module) => {
                                const isCompleted = suppCompleted.includes(module.id);
                                const lastAwardAt = lifeSkillScoreCooldownByModule.get(module.id);
                                const daysUntilScore = lastAwardAt
                                    ? getLifeSkillScoreCooldownDaysLeft(lastAwardAt)
                                    : 0;
                                const onCooldown = daysUntilScore > 0;
                                const cardTotalPts = lifeSkillTotalsByModule.get(module.id) || 0;
                                const cardTitle = language === 'en' ? module.title_en : module.title_bn;
                                const nextScoreLabel = !onCooldown
                                    ? null
                                    : language === 'en'
                                      ? `Points claimed — available again in ${daysUntilScore} day${daysUntilScore === 1 ? '' : 's'}`
                                      : `পয়েন্ট নেওয়া হয়েছে — ${toBengaliNumber(daysUntilScore, 'bn')} দিন পর আবার পাবেন`;
                                const nextScoreChip = !onCooldown
                                    ? null
                                    : language === 'en'
                                      ? `Again in ${daysUntilScore}d`
                                      : `${toBengaliNumber(daysUntilScore, 'bn')} দিনে আবার`;
                                return (
                                    <button
                                        key={module.id}
                                        type="button"
                                        onClick={() => openLifeSkillModule(module)}
                                        className={`group relative aspect-[3/4] w-full max-h-[280px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf7] hover:shadow-md active:scale-[0.99] sm:max-h-[320px] md:aspect-[4/5] md:max-h-[360px] ${
                                            isCompleted ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#fffdf7]' : ''
                                        }`}
                                    >
                                        {/* Full-bleed media */}
                                        <div className="absolute inset-0 bg-slate-800">
                                            {module.image_url ? (
                                                <img
                                                    src={module.image_url}
                                                    alt=""
                                                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                                />
                                            ) : (
                                                <div
                                                    className={`flex h-full w-full items-center justify-center bg-gradient-to-br text-6xl sm:text-7xl ${
                                                        module.category === 'mental'
                                                            ? 'from-indigo-600 to-violet-700'
                                                            : module.category === 'financial'
                                                              ? 'from-emerald-600 to-teal-700'
                                                              : module.category === 'digital'
                                                                ? 'from-sky-600 to-blue-800'
                                                                : 'from-orange-600 to-rose-700'
                                                    }`}
                                                >
                                                    <span className="drop-shadow-lg" aria-hidden>
                                                        {module.icon || '📚'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Vignette: heavy bottom fade so titles read as part of the photo */}
                                        <div
                                            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black from-[4%] via-black/72 via-[36%] to-transparent to-[68%]"
                                            aria-hidden
                                        />
                                        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-12 sm:px-5 sm:pb-5 sm:pt-14 md:px-6 md:pb-6 md:pt-16">
                                            {cardTotalPts > 0 && (
                                                <p
                                                    className={`mb-1.5 text-xs font-bold tabular-nums tracking-wide text-amber-200 sm:text-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] ${
                                                        language === 'bn' ? 'font-bengali' : ''
                                                    }`}
                                                    title={
                                                        language === 'en'
                                                            ? `Total points from this Life Skill: ${cardTotalPts}`
                                                            : `এই লাইফ স্কিল থেকে মোট পয়েন্ট: ${toBengaliNumber(cardTotalPts, 'bn')}`
                                                    }
                                                >
                                                    {language === 'en'
                                                        ? `${cardTotalPts} pts`
                                                        : `${toBengaliNumber(cardTotalPts, 'bn')} পয়েন্ট`}
                                                </p>
                                            )}
                                            <h3
                                                className={`line-clamp-3 text-lg text-white sm:text-xl md:text-2xl lg:text-[1.65rem] [text-shadow:0_1px_2px_rgba(0,0,0,0.85),0_4px_20px_rgba(0,0,0,0.55),0_0_1px_rgba(0,0,0,0.9)] ${
                                                    language === 'bn'
                                                        ? 'font-bengali font-bold leading-[1.28] tracking-normal sm:leading-[1.26] md:leading-[1.3] lg:leading-snug'
                                                        : 'font-black leading-[1.12] tracking-tight sm:leading-[1.1] md:leading-tight lg:leading-snug'
                                                }`}
                                            >
                                                {cardTitle}
                                            </h3>
                                        </div>

                                        {onCooldown && (
                                            <div
                                                className={`absolute left-2 top-2 z-10 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[11px] font-bold tabular-nums tracking-tight text-white shadow-sm backdrop-blur-sm sm:left-3 sm:top-3 sm:text-xs ${
                                                    language === 'bn' ? 'font-bengali' : ''
                                                }`}
                                                title={nextScoreLabel}
                                            >
                                                <span className="sr-only">{nextScoreLabel}</span>
                                                <span aria-hidden>{nextScoreChip}</span>
                                            </div>
                                        )}

                                        {isCompleted && (
                                            <div
                                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500 text-white shadow-sm sm:right-3 sm:top-3 sm:h-9 sm:w-9"
                                                title={language === 'en' ? 'Completed' : 'সম্পন্ন'}
                                            >
                                                <span className="sr-only">
                                                    {language === 'en' ? 'Completed' : 'সম্পন্ন'}
                                                </span>
                                                <svg className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                            </div>
                            </div>
                        </>
                    )}
                </div>
            ) : selectedLesson ? (
                /* Lesson cover — opens when tapping a path lesson circle */
                <div className="fixed inset-0 z-[200] flex animate-slide-up-sheet flex-col overflow-hidden bg-[#fffdf7] safe-area-inset-top safe-area-inset-bottom">
                    <div className="relative z-10 flex h-full flex-col">
                        <div className="absolute left-3 top-3 z-30 sm:left-4 sm:top-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (gateFocusPending?.lessonId) {
                                        notifyGateFocusRequired();
                                        return;
                                    }
                                    stopChapterAudio();
                                    setSelectedLesson(null);
                                    setSelectedChapter(null);
                                }}
                                className="inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-md transition-all active:scale-95"
                                aria-label={language === 'en' ? 'Back' : 'ফিরে যান'}
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-5 pt-14 sm:px-6 sm:pb-8 sm:pt-16">
                            <div className="flex w-full max-w-[min(92vw,26rem)] flex-col items-center">
                                {/* Front-facing hardcover book */}
                                <div className="lesson-book-scene relative w-full">
                                    <div className="lesson-book relative mx-auto w-[92%] sm:w-[94%]">
                                        {/* Soft floor shadow */}
                                        <div className="lesson-book-shadow" aria-hidden />

                                        {/* Page block (right edge) */}
                                        <div className="lesson-book-pages" aria-hidden>
                                            <div className="lesson-book-pages-face" />
                                        </div>

                                        {/* Binding / spine (left) */}
                                        <div className="lesson-book-spine" aria-hidden>
                                            <div className="lesson-book-spine-ridge" />
                                        </div>

                                        {/* Front cover — turns open to reveal lesson */}
                                        <div className="lesson-book-cover relative aspect-[3/4.15] w-full">
                                            {/* Lesson page behind the cover */}
                                            <div className="lesson-book-interior">
                                                <div className="flex h-full flex-col overflow-hidden p-5 sm:p-6">
                                                    <div className="shrink-0 space-y-2 text-center">
                                                        <p className={`text-[10px] font-bold text-orange-600 sm:text-[11px] ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                                                            {language === 'en' ? 'Lesson' : 'পাঠ'}{' '}
                                                            {toBengaliNumber(
                                                                selectedLesson.level_id || `${selectedLesson.chapterNum}.${selectedLesson.subchapterNum}`,
                                                                language
                                                            )}
                                                        </p>
                                                        <div className="mx-auto h-1 w-12 rounded-full bg-orange-400/80" />
                                                        <h2 className={`text-base font-black leading-snug text-slate-900 sm:text-lg ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                                            {selectedLesson.level_title}
                                                        </h2>
                                                    </div>
                                                    <div className={`mt-4 flex-1 overflow-hidden text-center text-[13px] font-medium leading-[1.75] text-slate-700 sm:text-sm sm:leading-[1.8] ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                        {renderTextWithImages(selectedLesson.mission_briefing)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className={`lesson-book-cover-turn ${
                                                    coverFlipPhase === 'open' ? 'is-open' : ''
                                                }`}
                                            >
                                                <div className="lesson-book-cover-turn-front">
                                                    <div className="lesson-book-cover-art relative h-full w-full overflow-hidden">
                                                        <img
                                                            src={LESSON_COVER_IMAGE_SRC}
                                                            alt=""
                                                            width={900}
                                                            height={1350}
                                                            decoding="async"
                                                            fetchPriority="high"
                                                            className="absolute inset-0 h-full w-full object-cover"
                                                            style={{ objectPosition: 'center 26%' }}
                                                        />
                                                        <div
                                                            className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/20 to-slate-950/85"
                                                            aria-hidden
                                                        />
                                                        <div className="lesson-book-cover-sheen" aria-hidden />

                                                        {/* Rank name — clean top */}
                                                        <div className="absolute inset-x-0 top-0 z-10 px-6 pt-6 sm:px-7 sm:pt-7">
                                                            <div className="border-b border-white/30 pb-3.5 text-center">
                                                                <p className={`text-[10px] font-semibold tracking-[0.24em] text-orange-200/95 sm:text-[11px] ${language === 'bn' ? 'font-bengali tracking-normal' : 'uppercase'}`}>
                                                                    {language === 'en' ? 'Rank' : 'পদমর্যাদা'}
                                                                </p>
                                                                <p className={`mt-1.5 text-xl font-black leading-none text-white sm:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                    {language === 'en'
                                                                        ? (selectedLesson.badge?.en || 'Trainee')
                                                                        : (selectedLesson.badge?.bn || 'ট্রেইনি')}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Lesson title — bottom */}
                                                        <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 px-6 pb-6 pt-12 sm:px-7 sm:pb-7">
                                                            <p className={`text-xs font-bold text-orange-300 sm:text-[13px] ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                                                                {language === 'en' ? 'Lesson' : 'পাঠ'}{' '}
                                                                {toBengaliNumber(
                                                                    selectedLesson.level_id || `${selectedLesson.chapterNum}.${selectedLesson.subchapterNum}`,
                                                                    language
                                                                )}
                                                            </p>
                                                            <h1 className={`text-[1.35rem] font-black leading-snug tracking-tight text-white sm:text-[1.6rem] ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                                                {selectedLesson.level_title}
                                                            </h1>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="lesson-book-cover-turn-back" aria-hidden />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={beginLessonFromCover}
                                    disabled={coverFlipPhase === 'open'}
                                    className={`mt-5 inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-full border border-slate-300/90 bg-white/90 px-4 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-all duration-500 hover:border-orange-200 hover:bg-orange-50/80 hover:text-orange-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-0 sm:mt-6 sm:text-[13px] ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {language === 'en' ? 'Start Reading' : 'পড়া শুরু করুন'}
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : selectedChapter && !trainingContent ? (
                /* Subchapter List View or FAQ View */
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain text-slate-900">
                    {!selectedChapter.isFAQ && (
                        <button
                            type="button"
                            onClick={() => setSelectedChapter(null)}
                            className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-bold shadow-sm"
                        >
                            ← {language === 'en' ? 'Back to Chapters' : 'অধ্যায়ে ফিরে যান'}
                        </button>
                    )}

                    {selectedChapter.isFAQ ? (
                        <div className="animate-fade-in mx-auto max-w-3xl pb-[calc(5.5rem+3.25rem+env(safe-area-inset-bottom,0px))] md:pb-10">
                            <header className="sticky top-0 z-40 -mx-4 space-y-2.5 border-b border-slate-200/80 bg-[#fffdf7]/95 px-4 pb-3 pt-1 backdrop-blur-sm sm:-mx-6 sm:px-6">
                                <div className="flex items-center gap-3">
                                    {!faqExitUsesHistory ? (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedChapter(null)}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-900 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
                                            aria-label={language === 'en' ? 'Back to Training' : 'প্রশিক্ষণে ফিরে যান'}
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                        <h2 className={`truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? FAQ_PAGE_TITLE.en : FAQ_PAGE_TITLE.bn}
                                        </h2>
                                        <p className={`truncate text-xs font-semibold text-slate-500 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {faqResultSummary.primary}
                                            {faqResultSummary.secondary && (
                                                <span className="text-slate-400"> · {faqResultSummary.secondary}</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="search"
                                        placeholder={language === 'en' ? 'Search questions...' : 'প্রশ্ন খুঁজুন...'}
                                        value={faqSearchQuery}
                                        onChange={(e) => setFaqSearchQuery(e.target.value)}
                                        className={`w-full rounded-full border border-slate-200/80 bg-white py-2 pl-9 pr-9 text-sm font-semibold text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-200/60 ${language === 'bn' ? 'font-bengali' : ''}`}
                                    />
                                    {faqSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setFaqSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600"
                                            aria-label={language === 'en' ? 'Clear search' : 'খোঁজ মুছুন'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {(faqActiveGroup !== 'all' || faqActiveTag) && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {faqActiveGroup !== 'all' && (() => {
                                            const group = FAQ_GROUPS.find((g) => g.id === faqActiveGroup);
                                            const label = group ? (language === 'en' ? group.labelEn : group.labelBn) : faqActiveGroup;
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() => setFaqActiveGroup('all')}
                                                    className={`inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-white shadow-sm ${language === 'bn' ? 'font-bengali' : ''}`}
                                                >
                                                    <span>{label}</span>
                                                    <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            );
                                        })()}
                                        {faqActiveTag && (
                                            <button
                                                type="button"
                                                onClick={() => setFaqActiveTag('')}
                                                className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm nb-mono"
                                            >
                                                <span>{faqActiveTag}</span>
                                                <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                        {faqHasActiveFilters && (
                                            <button
                                                type="button"
                                                onClick={resetFaqFilters}
                                                className={`inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-slate-400 hover:bg-white ${language === 'bn' ? 'font-bengali' : ''}`}
                                            >
                                                {language === 'en' ? 'Clear all' : 'সব দেখুন'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </header>

                            <div className="space-y-3 pt-3">
                                <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                                    {FAQ_GROUPS.filter((group) => group.id === 'all' || (faqGroupCounts[group.id] || 0) > 0).map((group) => {
                                        const isActive = faqActiveGroup === group.id;
                                        return (
                                            <button
                                                key={group.id}
                                                type="button"
                                                onClick={() => setFaqActiveGroup(group.id)}
                                                className={`whitespace-nowrap rounded-full border border-slate-200/80 px-3 py-1.5 text-[10px] font-black shadow-sm transition-all active:scale-95 sm:text-xs ${
                                                    isActive
                                                        ? 'bg-orange-500 text-white'
                                                        : 'bg-white text-slate-700 hover:bg-orange-50'
                                                }`}
                                            >
                                                {language === 'en' ? group.labelEn : group.labelBn}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsFaqTagsExpanded(!isFaqTagsExpanded)}
                                    className={`text-xs font-bold text-slate-600 hover:text-orange-700 ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {isFaqTagsExpanded
                                        ? (language === 'en' ? 'Hide keywords' : 'শব্দ লুকান')
                                        : (language === 'en' ? 'Search by keyword' : 'শব্দ দিয়ে খুঁজুন')}
                                </button>

                                {isFaqTagsExpanded && (
                                    <div className="flex flex-wrap gap-1.5 border-t border-slate-200 pt-3">
                                        {Array.from(new Set(faqQuestions.flatMap((q) => q.tags || []))).sort().map((tag) => {
                                            const isActive = faqActiveTag.toLowerCase() === tag.toLowerCase();
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => setFaqActiveTag(isActive ? '' : tag)}
                                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold nb-mono ${
                                                        isActive
                                                            ? 'border-orange-300 bg-orange-500 text-white'
                                                            : 'border-slate-200/80 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50'
                                                    }`}
                                                >
                                                    {tag}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                            {faqFilteredQuestions.length === 0 ? (
                                <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
                                    <p className={`font-bold text-slate-600 ${language === 'bn' ? 'font-bengali text-base' : 'text-sm'}`}>
                                        {language === 'en' ? 'No questions match.' : 'কোনো প্রশ্ন মিলেনি।'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={resetFaqFilters}
                                        className="mt-4 rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-bold shadow-sm"
                                    >
                                        {language === 'en' ? 'Show all' : 'সব দেখুন'}
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                                    {faqFilteredQuestions.map((q) => {
                                        const shouldAutoOpen = faqHasActiveFilters && (
                                            faqFilteredQuestions.length <= 3 ||
                                            (faqSearchQuery && q.question.toLowerCase().includes(faqSearchQuery.toLowerCase()))
                                        );
                                        return (
                                            <details key={q.id} className="group" open={shouldAutoOpen}>
                                                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5">
                                                    <div className="min-w-0 pr-2">
                                                        {q.category && (
                                                            <span className="mb-1.5 inline-block rounded-full border border-orange-200/80 bg-orange-50 px-1.5 py-0.5 text-[9px] font-black text-orange-800">
                                                                {q.category}
                                                            </span>
                                                        )}
                                                        <p className={`font-bold leading-snug text-slate-900 ${language === 'bn' ? 'font-bengali text-base' : 'text-sm sm:text-base'}`}>
                                                            {q.question}
                                                        </p>
                                                    </div>
                                                    <svg
                                                        className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2.5"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path d="M6 9l6 6 6-6" />
                                                    </svg>
                                                </summary>
                                                <div className="border-t border-slate-100 px-4 pb-5 pt-3 sm:px-5">
                                                    <div className={`leading-relaxed text-slate-600 ${language === 'bn' ? 'font-bengali text-base' : 'text-sm'}`}>
                                                        {renderTextWithImages(q.answer)}
                                                    </div>

                                                    {q.image && (
                                                        <div className="mx-auto mt-4 max-w-md overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
                                                            <img
                                                                src={`/quizzes/faq_images/${q.image}`}
                                                                alt={q.question}
                                                                className="mx-auto h-auto w-full object-contain object-center"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    )}

                                                    {q.tags && q.tags.length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-1">
                                                            {q.tags.slice(0, 6).map((tag) => (
                                                                <button
                                                                    key={tag}
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setFaqActiveTag(faqActiveTag === tag ? '' : tag);
                                                                        setFaqSearchQuery('');
                                                                    }}
                                                                    className={`px-1.5 py-0.5 text-[9px] font-medium nb-mono ${
                                                                        faqActiveTag === tag
                                                                            ? 'text-orange-700 underline'
                                                                            : 'text-slate-400 hover:text-orange-600'
                                                                    }`}
                                                                >
                                                                    {tag}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </details>
                                        );
                                    })}
                                </div>
                            )}
                            </div>
                        </div>
                    ) : null}
                    {/* PPE Survey Modal */}
                    <PPESurveyModal
                        isOpen={showPPESurvey}
                        onClose={() => setShowPPESurvey(false)}
                        ppeItem={surveyPPEItem}
                        user={user}
                        existingId={userPPEData.find(p => p.name === surveyPPEItem?.name)?.id}
                        language={language}
                        onComplete={(ppeResult) => {
                            // 1. Optimistic UI Update: Update local state instantly
                            if (ppeResult) {
                                setUserPPEData(prev => {
                                    const filtered = prev.filter(p => p.name !== ppeResult.name);
                                    return [...filtered, ppeResult];
                                });
                            }
                            // 2. Refresh from DB silently in background (already handled by modal's internal fetch if needed, 
                            // but we refresh here to be sure of IDs etc later)
                            fetchUserPPEData();

                            // 3. Instant Transition: Proceed to lesson without waiting
                            if (pendingSubchapter) {
                                setTrainingContent(pendingSubchapter);
                                setActiveSectionIndex(0);
                                setIsJournalMode(true);
                                setPendingSubchapter(null);
                            }
                        }}
                    />
                </div>
            ) : null
            }

            {showDailyBrief && !shellInterruptBusy && trainingTab === 'core' && !trainingLoading && !showOnboarding && !selectedChapter && !trainingContent && createPortal(
                <div
                    className="fixed inset-0 z-[118] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-fade-in"
                    onClick={dismissDailyBrief}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="training-welcome-title"
                        className="relative w-full max-w-sm animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fffdf7] p-0 shadow-sm">
                            <div className="relative px-5 pb-5 pt-4">
                                <button
                                    type="button"
                                    onClick={dismissDailyBrief}
                                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
                                    aria-label={language === 'en' ? 'Dismiss greeting' : 'অভিবাদন বন্ধ করুন'}
                                >
                                    ×
                                </button>
                                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-orange-600 nb-mono">
                                    {language === 'en' ? 'Your reading journey' : 'আপনার পড়ার যাত্রা'}
                                </p>
                                <h2
                                    id="training-welcome-title"
                                    className={`pr-8 text-lg font-black leading-tight text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {dailyBriefGreeting}
                                </h2>
                                {lessonProgressWelcome?.primary && (
                                    <p className={`mt-2 text-sm font-semibold leading-snug text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {lessonProgressWelcome.primary}
                                    </p>
                                )}
                                {lessonProgressWelcome?.secondary && (
                                    <p className={`mt-2 inline-flex rounded-full border border-orange-200/80 bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {lessonProgressWelcome.secondary}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={dismissDailyBrief}
                                    className={`mt-4 w-full rounded-full bg-orange-500 py-2.5 text-sm font-black text-white shadow-md shadow-orange-500/30 ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {language === 'en' ? 'Continue' : 'চলুন'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {lockedLessonModal && createPortal(
                <div className="fixed inset-0 z-[210] flex animate-fade-in items-center justify-center bg-slate-900/55 p-4">
                    <div className="relative w-full max-w-md animate-scale-in" role="dialog" aria-modal="true">
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fffdf7] p-0 shadow-sm">
                            <div className="relative p-6 sm:p-7">
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-200/80 bg-orange-100 text-3xl text-orange-700 shadow-sm">
                                🔒
                            </div>

                            <div className="space-y-3 text-center">
                                <div className="inline-flex items-center rounded-full border border-slate-200/80 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] nb-mono">
                                    {language === 'en' ? 'Locked Level' : 'লক করা পাঠ'}
                                </div>

                                <h3 className={`text-2xl font-black leading-tight text-slate-900 sm:text-3xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {language === 'en' ? 'Complete previous lessons first' : 'আগের পাঠগুলো আগে শেষ করুন'}
                                </h3>

                                <p className={`text-sm leading-relaxed text-slate-600 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {language === 'en'
                                        ? `Lesson ${lockedLessonModal.lessonId} is locked until you finish the lessons before it.`
                                        : `${toBengaliNumber(lockedLessonModal.lessonId, language)} নম্বর পাঠটি এর আগের পাঠগুলো শেষ না করা পর্যন্ত লক থাকবে।`}
                                </p>

                                <div className="mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                                    <span className="rounded-full border border-orange-200/80 bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700">
                                        {lockedLessonModal.chapterLabel}
                                    </span>
                                    <span className="text-slate-600">
                                        {lockedLessonModal.chapterTitle || (language === 'en' ? 'Please continue your journey from earlier lessons.' : 'দয়া করে আগের পাঠগুলো শেষ করুন।')}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    type="button"
                                    onClick={() => setLockedLessonModal(null)}
                                    className="w-full rounded-full bg-orange-500 px-4 py-3.5 font-bold text-white shadow-md shadow-orange-500/30"
                                >
                                    {language === 'en' ? 'Got it' : 'বুঝেছি'}
                                </button>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Safety Journal UI - Immersive Slide-based Experience */}
            {
                trainingContent && createPortal(
                    <div className={`lesson-reader-root fixed inset-x-0 bottom-0 top-0 z-[120] flex animate-fade-in-up flex-col overflow-hidden bg-[#fffdf7] safe-area-inset-top safe-area-inset-bottom md:top-14 md:pt-0 lg:items-center lg:justify-center lg:bg-transparent ${
                        lifeSkillScoreGateActive || supplementaryRadioOverlayOpen ? 'pointer-events-none' : ''
                    }`}>
                        {/* Desktop desk atmosphere (replaces dark modal dim) */}
                        <div
                            className="lesson-reader-desk hidden lg:block"
                            onClick={() => {
                                if (lifeSkillScoreGateActive || supplementaryRadioOverlayOpen) return;
                                if (gateFocusPending?.lessonId) {
                                    notifyGateFocusRequired();
                                    return;
                                }
                                stop();
                                const wasLifeSkill = !!trainingContent?.isSupplementary;
                                setTrainingContent(null);
                                setIsJournalMode(false);
                                setSelectedChapter(null);
                                setSelectedLesson(null);
                                if (wasLifeSkill) setTrainingSurface('supplementary');
                            }}
                            aria-hidden
                        />
                        {/* Open book page — constrained reading measure on desktop */}
                        <div className="lesson-reader-page relative flex h-full w-full flex-col overflow-hidden lg:my-5 lg:h-[calc(100%-2.5rem)] lg:w-[min(44rem,92vw)] lg:max-w-[44rem] lg:rounded-sm lg:border lg:border-stone-300/70">
                            {/* Soft Material reading header */}
                            <div className="sticky top-0 z-[100] border-b border-stone-200/70 bg-[#fcfaf2]/95 backdrop-blur-md">
                                <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4 py-2.5 sm:h-16 sm:px-6 sm:py-3 lg:px-8">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (lifeSkillScoreGateActive || supplementaryRadioOverlayOpen) return;
                                            if (gateFocusPending?.lessonId) {
                                                notifyGateFocusRequired();
                                                return;
                                            }
                                            stop();
                                            const wasLifeSkill = !!trainingContent?.isSupplementary;
                                            setTrainingContent(null);
                                            setIsJournalMode(false);
                                            setSelectedChapter(null);
                                            setSelectedLesson(null);
                                            if (wasLifeSkill) setTrainingSurface('supplementary');
                                        }}
                                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
                                        aria-label={language === 'en' ? 'Close lesson' : 'পাঠ বন্ধ করুন'}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>

                                    <div className="mx-3 min-w-0 flex-1 text-center sm:mx-4">
                                        {gateFocusPending?.lessonId && (
                                            <p className={`mb-0.5 truncate text-[10px] font-bold text-orange-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {language === 'en'
                                                    ? 'Complete this lesson to unlock hourly quiz'
                                                    : 'ঘণ্টাভিত্তিক কুইজ খুলতে এই পাঠ শেষ করুন'}
                                            </p>
                                        )}
                                        <h2 className={`truncate text-[11px] font-bold text-slate-500 sm:text-xs ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            <span className="font-black text-orange-600">{getTrainingHeaderLessonCode(trainingContent, language)}</span>
                                            <span className="mx-1.5 text-slate-300">·</span>
                                            {trainingContent.level_title}
                                        </h2>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {!hideReadAloudForSupplementaryRadio ? (
                                            <button
                                                    type="button"
                                                    onClick={handleReadLesson}
                                                    disabled={isLoading}
                                                    title={isLoading
                                                        ? (language === 'en' ? 'Preparing audio...' : 'অডিও তৈরি হচ্ছে...')
                                                        : isPlaying && !isPaused
                                                            ? (language === 'en' ? 'Pause reading' : 'পড়া থামান')
                                                            : (language === 'en' ? 'Read aloud' : 'উচ্চস্বরে পড়ুন')}
                                                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${
                                                        isLoading ? 'animate-pulse border-orange-200 bg-orange-100 text-orange-700 shadow-sm' :
                                                        isPlaying && !isPaused ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/30' :
                                                        'border-slate-200/80 bg-white text-slate-600 shadow-sm hover:bg-orange-50 active:scale-95'
                                                    }`}
                                                >
                                                    <div className={`absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20 ${isPlaying && !isPaused && !isLoading ? 'block' : 'hidden'}`}></div>
                                                    <div className="relative z-10 flex items-center justify-center">
                                                        {isLoading ? (
                                                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : isPlaying && !isPaused ? (
                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M8 5v14l11-7z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </button>
                                        ) : (
                                            <div className="h-10 w-10 shrink-0" aria-hidden />
                                        )}
                                    </div>
                                </div>

                                {/* Soft progress bar */}
                                <div className="relative z-20 h-1.5 w-full bg-stone-200/70">
                                    <div
                                        className="h-full rounded-r-full bg-orange-500 transition-all duration-1000 ease-out"
                                        style={{ width: `${((activeSectionIndex + 1) / slides.length) * 100}%` }}
                                    />
                                </div>

                                {trainingContent?.isSupplementary ? (
                                    <div className="mx-auto w-full max-w-3xl px-4 pb-2 pt-1 lg:px-8">
                                        <button
                                            type="button"
                                            disabled={!supplementaryRadioSrc}
                                            title={
                                                supplementaryRadioSrc
                                                    ? undefined
                                                    : language === 'bn'
                                                        ? 'শুধুমাত্র GitHub-এ হোস্ট করা বৈধ অডিও লিঙ্ক থাকলে চালু হবে।'
                                                        : 'Enabled only when a valid GitHub-hosted audio URL is set for this lesson.'
                                            }
                                            onClick={() => {
                                                if (!supplementaryRadioSrc) return;
                                                stop();
                                                setSupplementaryRadioOverlayOpen(true);
                                            }}
                                            className={`flex w-full min-h-[48px] items-center justify-center gap-3 rounded-full py-3 text-sm font-black transition-all ${
                                                supplementaryRadioSrc
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 active:scale-[0.98]'
                                                    : 'cursor-not-allowed bg-slate-200 text-slate-500 opacity-75'
                                            } disabled:cursor-not-allowed disabled:opacity-70 ${language === 'bn' ? 'font-bengali' : ''}`}
                                        >
                                            <span className="text-xl" aria-hidden>
                                                📻
                                            </span>
                                            {language === 'bn' ? 'মনোযোগ দিয়ে শুনুন' : 'Listen (full screen)'}
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                            {lessonNavBlockedReason && (
                                <div className="pointer-events-none fixed inset-x-0 top-20 z-[118] flex justify-center px-3 sm:top-24">
                                    <div
                                        role="alert"
                                        aria-live="assertive"
                                        className={`training-advance-block-alert pointer-events-auto flex max-w-[min(20rem,92vw)] items-start gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50 px-3.5 py-2.5 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/40 ${language === 'bn' ? 'font-bengali' : ''}`}
                                    >
                                        <span
                                            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow-md dark:bg-amber-500"
                                            aria-hidden
                                        >
                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </span>
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-amber-950 dark:text-amber-100 sm:text-[11px]">
                                                {lessonNavBlockedReason === 'scroll'
                                                    ? language === 'bn'
                                                        ? 'আরও নিচে স্ক্রল করুন'
                                                        : 'Scroll down to continue'
                                                    : language === 'bn'
                                                        ? 'এখন যাওয়া যাবে না'
                                                        : 'Cannot advance yet'}
                                            </p>
                                            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-amber-950/95 dark:text-amber-50/95 sm:text-xs">
                                                {lessonNavBlockedReason === 'scroll'
                                                    ? language === 'bn'
                                                        ? 'পরের পাতায় যেতে এই পাতার একদম নিচ পর্যন্ত স্ক্রল করে পড়ুন।'
                                                        : 'Read this whole screen, then scroll to the very bottom to unlock Next.'
                                                    : language === 'bn'
                                                        ? 'আগে এই পাতার সব কার্ড পড়ুন। শেষ হলেই পরের পাতা খুলবে—পরে স্বাধীনভাবে যেতে পারবেন।'
                                                        : 'Finish every topic card here first. Then you can go on—and later move freely.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Slide Content Area */}
                            <div className="lesson-page-stage relative flex min-h-0 flex-1 flex-col">
                                {!prefersReducedMotion && lessonPageTurnTick > 0 && lessonPageTurnDir === 'celebrate' && (
                                    <div
                                        key={`celebrate-${lessonPageTurnTick}`}
                                        className="lesson-page-celebrate-burst"
                                        aria-hidden
                                    >
                                        <span className="lesson-page-celebrate-flash" />
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                                            <span
                                                key={i}
                                                className={`lesson-page-celebrate-confetti c-${i % 6}`}
                                                style={{
                                                    left: `${8 + ((i * 7) % 84)}%`,
                                                    animationDelay: `${0.04 * i}s`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {!prefersReducedMotion && lessonPageTurnTick > 0 && lessonPageTurnDir !== 'celebrate' && (
                                    <div
                                        key={`curl-${lessonPageTurnTick}`}
                                        className={`lesson-page-curl lesson-page-curl--${lessonPageTurnDir}`}
                                        aria-hidden
                                    >
                                        <div className="lesson-page-curl-front">
                                            <div className="lesson-page-curl-lines" />
                                            <div className="lesson-page-curl-sheen" />
                                            <div className="lesson-page-curl-fold" />
                                        </div>
                                        <div className="lesson-page-curl-back" />
                                    </div>
                                )}
                            {(() => {
                                const activeSlide = slides[activeSectionIndex];
                                const sectionPoints =
                                    activeSlide?.type === 'section' ? activeSlide.points ?? [] : [];
                                const isSupplementaryCompletion =
                                    activeSlide?.type === 'completion' && trainingContent?.isSupplementary;
                                const isCompletionSlide = activeSlide?.type === 'completion';
                                const isCelebrateArrival =
                                    !prefersReducedMotion &&
                                    lessonPageTurnTick > 0 &&
                                    lessonPageTurnDir === 'celebrate' &&
                                    activeSlide?.type === 'completion';
                                const pageTurnClass = prefersReducedMotion
                                    ? 'animate-fade-in-up'
                                    : lessonPageTurnTick > 0
                                        ? `lesson-page-sheet is-turn-${lessonPageTurnDir}`
                                        : 'animate-fade-in-up';
                                return (
                                    <div
                                        ref={lessonScrollRef}
                                        className={`relative flex-1 scroll-smooth transition-colors duration-700 ${
                                            isCompletionSlide
                                                ? 'min-h-0 overflow-x-hidden overflow-y-hidden'
                                                : 'overflow-y-auto'
                                        }`}
                                        onScroll={checkLessonScrollReachedEnd}
                                        onTouchStart={handleReaderTouchStart}
                                        onTouchEnd={handleReaderTouchEnd}
                                    >
                                        <div
                                            ref={lessonScrollInnerRef}
                                            key={activeSectionIndex}
                                            className={`mx-auto relative max-w-3xl px-4 sm:px-8 lg:px-10 ${pageTurnClass} ${
                                                isCompletionSlide
                                                    ? 'flex h-full min-h-0 flex-col items-center overflow-hidden py-2 pb-3 sm:py-6 sm:pb-8'
                                                    : 'px-5 py-8 pb-8 sm:py-10 sm:pb-10 lg:py-12'
                                            }`}
                                        >
                                            {activeSlide?.type === 'hero' && (
                                                <div className="flex flex-col items-center justify-center space-y-8 pb-12 pt-2 sm:space-y-9 sm:pb-14 sm:pt-4 lg:space-y-8 lg:pb-10">
                                                    <div className="w-full space-y-5 text-center sm:space-y-6">
                                                        <div className="space-y-3">
                                                            <p className={`text-[11px] font-bold text-orange-600 sm:text-xs ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                                                                {language === 'en'
                                                                    ? `Lesson ${getTrainingHeaderLessonCode(trainingContent, language)}`
                                                                    : `পাঠ ${getTrainingHeaderLessonCode(trainingContent, language)}`}
                                                            </p>
                                                            <div className="mx-auto h-1 w-14 rounded-full bg-orange-400/80" />
                                                        </div>

                                                        <h1 className={`px-2 text-[1.65rem] font-black leading-snug tracking-tight text-stone-900 sm:px-4 sm:text-[2rem] lg:text-[2.15rem] ${language === 'bn' ? 'font-bengali leading-[1.45]' : ''}`}>
                                                            {trainingContent.level_title}
                                                        </h1>
                                                    </div>

                                                    <div className="relative w-full max-w-prose">
                                                        <p className={`px-1 text-center text-[1.1rem] font-medium leading-[1.85] text-stone-800 sm:px-2 sm:text-[1.15rem] sm:leading-[1.9] lg:text-[1.175rem] lg:leading-[1.95] ${language === 'bn' ? 'font-bengali text-[1.2rem] leading-[2.05] sm:text-[1.25rem] sm:leading-[2.15]' : ''}`}>
                                                            {renderTextWithImages(trainingContent.mission_briefing)}
                                                        </p>
                                                    </div>

                                                    <div className="pb-2 pt-4 sm:pb-4 sm:pt-6">
                                                        <p className={`mx-auto max-w-sm text-center text-xs font-medium leading-relaxed text-stone-500 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                            {language === 'en'
                                                                ? 'Use the side arrows or swipe to turn the page.'
                                                                : 'পাতা উল্টাতে পাশের তীর চাপুন অথবা সোয়াইপ করুন।'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {activeSlide?.type === 'section' && (
                                                <article className="space-y-5 sm:space-y-7">
                                                    <header className="relative mb-3 border-b border-stone-200/70 pb-4 pt-1 sm:mb-5 sm:pb-5">
                                                        <p className={`mb-2 text-center font-bold text-orange-600 ${language === 'bn' ? 'font-bengali text-xs' : 'text-[11px] uppercase tracking-wider'}`}>
                                                            {language === 'en' ? 'In this part' : 'এই অংশে'}
                                                        </p>
                                                        <h3 className={`text-center text-[1.4rem] font-black leading-snug tracking-tight text-stone-900 sm:text-[1.75rem] lg:text-[1.85rem] ${language === 'bn' ? 'font-bengali leading-[1.45]' : ''}`}>
                                                            {activeSlide.title}
                                                        </h3>
                                                    </header>

                                                    {sectionReaderMode === 'overview' && sectionPoints.length > 0 && (
                                                        <div className="sticky top-0 z-20 -mx-2 mb-3 flex justify-center border-b border-stone-200/70 bg-[#fcfaf2]/95 px-2 py-2 backdrop-blur-md sm:-mx-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSectionTickDetailIndex(null);
                                                                    setSectionReaderMode('guided');
                                                                    requestAnimationFrame(() => {
                                                                        lessonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                                                                    });
                                                                }}
                                                                className={`rounded-full border border-stone-200/80 bg-white px-3.5 py-1.5 text-[12px] font-bold text-stone-700 shadow-sm transition-all hover:bg-orange-50 active:scale-95 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                            >
                                                                {language === 'en' ? '← Step-by-step' : '← ধাপে ধাপে'}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {sectionPoints.length > 0 && sectionReaderMode === 'guided' && sectionGuidedStepDone < sectionPoints.length && (
                                                        <>
                                                            <div
                                                                className="sticky top-0 z-20 -mx-2 mb-2 border-b border-stone-200/70 bg-[#fcfaf2]/95 px-2 py-2.5 backdrop-blur-md sm:-mx-4 sm:px-3"
                                                                aria-label={
                                                                    language === 'en'
                                                                        ? `Step ${sectionGuidedStepDone + 1} of ${sectionPoints.length}`
                                                                        : `ধাপ ${toBengaliNumber(sectionGuidedStepDone + 1, language)} / ${toBengaliNumber(sectionPoints.length, language)}`
                                                                }
                                                            >
                                                                <div className="flex items-center gap-2.5 px-0.5">
                                                                    <div className="flex h-1.5 min-w-0 flex-1 gap-1">
                                                                        {sectionPoints.map((_, i) => (
                                                                            <div
                                                                                key={i}
                                                                                className={`h-full min-w-0 flex-1 rounded-full ${i < sectionGuidedStepDone ? 'bg-emerald-500' : i === sectionGuidedStepDone ? 'bg-orange-500' : 'bg-slate-200'}`}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-500 sm:text-xs">
                                                                        {language === 'en'
                                                                            ? `${sectionGuidedStepDone + 1}/${sectionPoints.length}`
                                                                            : `${toBengaliNumber(sectionGuidedStepDone + 1, language)}/${toBengaliNumber(sectionPoints.length, language)}`}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4 sm:space-y-5">
                                                                {sectionPoints.map((point, pIdx) => {
                                                                    if (pIdx < sectionGuidedStepDone) {
                                                                        return (
                                                                            <div
                                                                                key={pIdx}
                                                                                className="lesson-topic-done-chip flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-3"
                                                                            >
                                                                                <span className="mt-0.5 shrink-0 text-base text-emerald-600" aria-hidden>✓</span>
                                                                                <h4 className={`min-w-0 flex-1 text-left text-[0.95rem] font-semibold leading-snug text-emerald-900 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                                    {point.item_name}
                                                                                </h4>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (pIdx === sectionGuidedStepDone) {
                                                                        return (
                                                                            <div key={pIdx} id="section-guided-active-anchor" className="scroll-mt-28">
                                                                                <SectionPointFullCard
                                                                                    point={point}
                                                                                    pIdx={pIdx}
                                                                                    language={language}
                                                                                    renderTextWithImages={renderTextWithImages}
                                                                                    setActiveImageModal={setActiveImageModal}
                                                                                    showDoneButton
                                                                                    onStepDone={() =>
                                                                                        setSectionGuidedStepDone((c) =>
                                                                                            Math.min(c + 1, sectionPoints.length)
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <div
                                                                            key={pIdx}
                                                                            className="rounded-xl border border-dashed border-slate-200 px-3 py-3.5"
                                                                        >
                                                                            <div className="flex items-start gap-3">
                                                                                <span className="mt-0.5 shrink-0 text-sm text-slate-400" aria-hidden>🔒</span>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <h4 className={`text-[0.95rem] font-medium leading-snug text-slate-500 line-clamp-3 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                                        {point.item_name}
                                                                                    </h4>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}

                                                    {sectionPoints.length > 0 && sectionReaderMode === 'guided' && sectionGuidedStepDone >= sectionPoints.length && (
                                                        <>
                                                            {sectionTickDetailIndex !== null &&
                                                            sectionPoints[sectionTickDetailIndex] != null ? (
                                                                <div className="space-y-4">
                                                                    <div className="sticky top-0 z-10 -mx-1 mb-1 border-b border-emerald-200/80 bg-[#fcfaf2]/98 px-1 py-2.5 backdrop-blur-md sm:-mx-2 sm:px-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSectionTickDetailIndex(null);
                                                                                requestAnimationFrame(() => {
                                                                                    lessonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                                                                                });
                                                                            }}
                                                                            className={`inline-flex items-center gap-2 rounded-xl border border-emerald-300/90 bg-white px-3 py-2 text-sm font-bold text-emerald-900 shadow-sm transition-colors hover:bg-emerald-50 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                        >
                                                                            <span aria-hidden>←</span>
                                                                            {language === 'en' ? 'Back to list' : 'তালিকায় ফিরুন'}
                                                                        </button>
                                                                    </div>
                                                                    <div className="mx-auto max-w-[40rem] rounded-2xl border border-emerald-200/40 bg-white/90 px-3 py-4 shadow-sm sm:px-5 sm:py-6 md:px-7 md:py-8">
                                                                        <SectionPointFullCard
                                                                            point={sectionPoints[sectionTickDetailIndex]}
                                                                            pIdx={sectionTickDetailIndex}
                                                                            language={language}
                                                                            renderTextWithImages={renderTextWithImages}
                                                                            setActiveImageModal={setActiveImageModal}
                                                                            showDoneButton={false}
                                                                            onStepDone={() => {}}
                                                                            readingComfort
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2 sm:space-y-3">
                                                                    {sectionPoints.map((point, pIdx) => (
                                                                        <button
                                                                            key={pIdx}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSectionTickDetailIndex(pIdx);
                                                                                requestAnimationFrame(() => {
                                                                                    lessonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                                                                                });
                                                                            }}
                                                                            className={`flex w-full items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3.5 text-left transition-colors hover:bg-emerald-50 sm:py-4 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                        >
                                                                            <span className="shrink-0 text-lg text-emerald-600" aria-hidden>
                                                                                ✓
                                                                            </span>
                                                                            <span className="min-w-0 flex-1">
                                                                                <span className="block text-sm font-bold leading-snug text-emerald-900">
                                                                                    {point.item_name}
                                                                                </span>
                                                                                <span className="mt-0.5 block text-[11px] font-medium text-emerald-800/75">
                                                                                    {language === 'en' ? 'Tap to read' : 'ট্যাপ করে পড়ুন'}
                                                                                </span>
                                                                            </span>
                                                                            <span className="shrink-0 self-center text-emerald-600/70" aria-hidden>
                                                                                →
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                    <div className="pt-3 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSectionTickDetailIndex(null);
                                                                                setSectionReaderMode('overview');
                                                                                requestAnimationFrame(() => {
                                                                                    lessonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                                                                                });
                                                                            }}
                                                                            className={`text-[11px] font-semibold text-emerald-800 underline decoration-emerald-600/60 underline-offset-2 hover:text-emerald-600 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                        >
                                                                            {language === 'en' ? 'All topics — full page' : 'সব বিষয় — সম্পূর্ণ পাতা'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {sectionReaderMode === 'overview' && sectionPoints.length > 0 && (
                                                        <div className="space-y-10 sm:space-y-12">
                                                            {sectionPoints.map((point, pIdx) => (
                                                                <div key={pIdx} className="group relative">
                                                                    <SectionPointFullCard
                                                                        point={point}
                                                                        pIdx={pIdx}
                                                                        language={language}
                                                                        renderTextWithImages={renderTextWithImages}
                                                                        setActiveImageModal={setActiveImageModal}
                                                                        showDoneButton={false}
                                                                        onStepDone={() => {}}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                </article>
                                            )}

                                            {activeSlide?.type === 'pro_tip' && (
                                                <div className="space-y-10 py-6 sm:space-y-12 sm:py-10">
                                                    <header className="mb-4 text-center sm:mb-6">
                                                        <h3 className={`text-[1.5rem] font-black tracking-tight text-slate-900 sm:text-3xl md:text-[2.15rem] ${language === 'bn' ? 'font-bengali leading-[1.45]' : ''}`}>
                                                            {language === 'en' ? activeSlide.title : 'মনে রাখবেন'}
                                                        </h3>
                                                    </header>

                                                    <div className="grid grid-cols-1 gap-5 sm:gap-6">
                                                        {activeSlide.content?.map((tip, idx) => (
                                                            <div key={idx} className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5 shadow-sm sm:p-7 md:p-8">
                                                                <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" aria-hidden />
                                                                <p className={`pl-1 text-[1.1rem] font-medium leading-[1.85] text-slate-800 sm:text-xl sm:leading-[1.95] md:text-[1.35rem] ${language === 'bn' ? 'font-bengali text-[1.15rem] leading-[2.05] sm:text-[1.3rem] md:text-[1.45rem]' : ''}`}>
                                                                    {renderTextWithImages(tip)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSlide?.type === 'myth_buster' && (
                                                <div className="space-y-10 py-6 sm:space-y-12 sm:py-10">
                                                    <header className="mb-4 text-center sm:mb-6">
                                                        <h3 className={`text-[1.5rem] font-black tracking-tight text-slate-900 sm:text-3xl md:text-[2.15rem] ${language === 'bn' ? 'font-bengali leading-[1.45]' : ''}`}>
                                                            {language === 'en' ? activeSlide.title : 'ভুল ধারণা মুছে ফেলুন'}
                                                        </h3>
                                                    </header>

                                                    {activeSlide.image_name && (
                                                        <TrainingLessonFigure
                                                            src={resolveTrainingMediaSrc(activeSlide.image_name)}
                                                            alt={activeSlide.image_caption || activeSlide.title}
                                                            caption={activeSlide.image_caption}
                                                            language={language}
                                                            className="mx-auto max-w-lg"
                                                            onClick={() => setActiveImageModal({
                                                                type: 'image',
                                                                value: resolveTrainingMediaSrc(activeSlide.image_name),
                                                                caption: activeSlide.image_caption,
                                                            })}
                                                        />
                                                    )}

                                                    <div className="space-y-8 sm:space-y-10">
                                                        {activeSlide.myths?.map((item, idx) => (
                                                            <div key={idx} className="space-y-3 sm:space-y-4">
                                                                <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4 shadow-sm sm:p-6 md:p-7">
                                                                    <span className={`mb-2 block text-[11px] font-bold text-rose-600 sm:mb-3 sm:text-xs ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wide'}`}>
                                                                        {language === 'en' ? 'Perspective' : 'ভুল ধারণা'}
                                                                    </span>
                                                                    <p className={`text-[1.05rem] font-medium italic leading-[1.75] text-slate-700 sm:text-lg sm:leading-[1.9] md:text-xl ${language === 'bn' ? 'font-bengali not-italic text-[1.1rem] sm:text-xl sm:leading-[2.05] md:text-[1.35rem]' : ''}`}>
                                                                        {renderTextWithImages(item.myth)}
                                                                    </p>
                                                                </div>

                                                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 shadow-sm sm:p-6 md:p-7">
                                                                    <span className={`mb-2 block text-[11px] font-bold text-emerald-700 sm:mb-3 sm:text-xs ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wide'}`}>
                                                                        {language === 'en' ? 'Verdict' : 'আসল কথা'}
                                                                    </span>
                                                                    <div className={`text-[1.05rem] font-bold leading-[1.75] text-slate-900 sm:text-lg sm:leading-[1.9] md:text-xl ${language === 'bn' ? 'font-bengali text-[1.1rem] sm:text-xl sm:leading-[2.05] md:text-[1.35rem]' : ''}`}>
                                                                        {renderTextWithImages(item.reality || item.fact)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSlide?.type === 'advanced' && (
                                                <div className="space-y-10 py-6 sm:space-y-12 sm:py-10">
                                                    <header className="mb-4 text-center sm:mb-6">
                                                        <h3 className={`text-[1.4rem] font-black tracking-tight text-slate-900 sm:text-3xl md:text-[2.15rem] ${language === 'bn' ? 'font-bengali leading-[1.45]' : ''}`}>
                                                            {activeSlide.title}
                                                        </h3>
                                                    </header>

                                                    <div className="grid grid-cols-1 gap-5 sm:gap-6">
                                                        {activeSlide.facts?.map((fact, idx) => (
                                                            <div key={idx} className="group">
                                                                <h4 className={`mb-3 flex items-center gap-3 text-[1.1rem] font-black text-indigo-600 sm:mb-4 sm:text-xl md:text-2xl ${language === 'bn' ? 'font-bengali leading-[1.5]' : ''}`}>
                                                                    <div className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                                                                    {fact.title}
                                                                </h4>
                                                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 shadow-sm sm:p-7">
                                                                    <p className={`text-[1.05rem] font-medium leading-[1.8] text-slate-800 sm:text-lg sm:leading-[1.9] md:text-xl ${language === 'bn' ? 'font-bengali text-[1.1rem] leading-[1.95] sm:text-xl sm:leading-[2.1]' : ''}`}>
                                                                        {renderTextWithImages(fact.content)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {slides[activeSectionIndex]?.type === 'completion' && (
                                                <div
                                                    className={`lesson-complete-stage lesson-complete-fit relative mx-auto flex h-full min-h-0 w-full max-w-lg flex-col items-center text-center ${
                                                        isCelebrateArrival ? 'lesson-complete-reveal' : 'animate-fade-in'
                                                    } ${
                                                        trainingContent.isSupplementary
                                                            ? 'justify-center gap-0 px-1 py-1 sm:py-4'
                                                            : 'justify-between gap-2 px-1 py-1 sm:justify-center sm:gap-4 sm:px-2 sm:py-4'
                                                    }`}
                                                >
                                                    {trainingContent.isSupplementary ? (
                                                        <div className={`relative z-10 flex w-full max-w-sm flex-col items-center gap-7 sm:gap-8 ${isCelebrateArrival ? 'lesson-complete-reveal__body' : 'animate-fade-in-up'}`}>
                                                            <div className="relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center sm:h-32 sm:w-32">
                                                                <div className="absolute inset-0 rounded-full bg-indigo-400/15 blur-2xl" aria-hidden />
                                                                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-4xl text-white shadow-lg shadow-indigo-500/30 sm:h-24 sm:w-24 sm:text-5xl" aria-hidden>
                                                                    ✨
                                                                </div>
                                                            </div>
                                                            <div className="w-full space-y-3 px-1">
                                                                <p className={`text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-500 ${language === 'bn' ? 'font-bengali tracking-normal normal-case' : ''}`}>
                                                                    {language === 'en' ? 'Well done' : 'সাবাশ'}
                                                                </p>
                                                                <h3
                                                                    className={`text-2xl font-black leading-snug tracking-tight text-slate-900 sm:text-3xl ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                >
                                                                    {language === 'en' ? 'Deep Insight Gained' : 'নতুন অভিজ্ঞতা অর্জন করলেন'}
                                                                </h3>
                                                                <p
                                                                    className={`mx-auto max-w-xs text-sm font-medium leading-relaxed text-slate-600 sm:text-[0.95rem] sm:leading-7 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                >
                                                                    {language === 'en'
                                                                        ? 'Taking care of yourself is as important as any technical skill.'
                                                                        : 'নিজের যত্ন নেওয়া যেকোনো কারিগরি দক্ষতার মতোই গুরুত্বপূর্ণ।'}
                                                                </p>
                                                            </div>

                                                            {trainingContent.hasQuiz ? (
                                                                <div className="flex w-full flex-col items-center gap-5 pt-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                                                        className="flex min-h-[54px] w-full items-center justify-center gap-3 rounded-full bg-orange-500 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-600 active:scale-[0.98] sm:text-lg"
                                                                    >
                                                                        <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        {language === 'en' ? 'Test your Knowledge' : 'আপনার জ্ঞান যাচাই করুন'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            stop();
                                                                            setTrainingContent(null);
                                                                            setIsJournalMode(false);
                                                                            setTrainingSurface('supplementary');
                                                                        }}
                                                                        className={`py-1 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                    >
                                                                        {language === 'en' ? '← Back to list' : '← তালিকায় ফিরে যান'}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        stop();
                                                                        setTrainingContent(null);
                                                                        setIsJournalMode(false);
                                                                        setTrainingSurface('supplementary');
                                                                    }}
                                                                    className={`py-1 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                >
                                                                    {language === 'en' ? '← Back to list' : '← তালিকায় ফিরে যান'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className={`relative z-10 flex h-full min-h-0 w-full flex-col items-center ${isCelebrateArrival ? 'lesson-complete-reveal__body' : 'animate-fade-in-up'}`}>
                                                            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 sm:gap-3">
                                                                <LessonCompleteHero
                                                                    badge={trainingContent.badge || getRoadmapBadgeByLevel(
                                                                        Number(String(trainingContent.level_id || '').split('.')[0]) || 1
                                                                    )}
                                                                    language={language}
                                                                    prefersReducedMotion={prefersReducedMotion}
                                                                    fitViewport
                                                                />

                                                                <div className="w-full shrink-0 space-y-1.5 px-2 sm:space-y-2.5">
                                                                    <p className={`text-[10px] font-bold text-orange-600 sm:text-xs ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-[0.16em]'}`}>
                                                                        {language === 'en'
                                                                            ? `Lesson ${getTrainingHeaderLessonCode(trainingContent, language)} complete`
                                                                            : `পাঠ ${getTrainingHeaderLessonCode(trainingContent, language)} সম্পন্ন`}
                                                                    </p>
                                                                    <h3 className={`text-[1.45rem] font-black leading-[1.15] tracking-tight text-slate-900 sm:text-4xl ${language === 'bn' ? 'font-bengali leading-snug' : ''}`}>
                                                                        {language === 'en' ? 'Mission Accomplished' : 'অভিনন্দন'}
                                                                    </h3>
                                                                    <p className={`mx-auto max-w-[18rem] text-[13px] font-medium leading-snug text-slate-600 sm:max-w-sm sm:text-base sm:leading-7 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                        {language === 'en'
                                                                            ? 'You finished this lesson. Take the challenge when you are ready.'
                                                                            : 'আপনি এই পাঠ শেষ করেছেন। প্রস্তুত হলে চ্যালেঞ্জ নিন।'}
                                                                    </p>
                                                                    {CORE_LESSON_MONTHLY_BONUS_ENABLED && (
                                                                        <LessonScoreStatusFlip
                                                                            language={language}
                                                                            daysLeft={getCoreLessonScoreCooldownDaysLeft(
                                                                                coreLessonScoreCooldownByLesson.get(trainingContent.level_id)
                                                                            )}
                                                                            bonusPoints={CORE_LESSON_MONTHLY_BONUS_POINTS}
                                                                            prefersReducedMotion={prefersReducedMotion}
                                                                            compact
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="mt-2 flex w-full max-w-sm shrink-0 flex-col items-center gap-2 sm:mt-6 sm:gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                                                    className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-[0.95rem] font-black text-white shadow-lg shadow-orange-500/35 transition-all hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] sm:min-h-[56px] sm:gap-3 sm:py-4 sm:text-lg"
                                                                >
                                                                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    {language === 'en' ? 'Start Challenge' : 'চ্যালেঞ্জ শুরু করুন'}
                                                                </button>

                                                                {user && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleLessonCompletionHourlyNav}
                                                                        className={`py-1 text-sm font-semibold text-emerald-700/90 transition-colors hover:text-emerald-800 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                    >
                                                                        {language === 'en' ? 'Or try hourly quiz →' : 'অথবা ঘণ্টাভিত্তিক কুইজ →'}
                                                                    </button>
                                                                )}

                                                                <div className="w-full border-t border-orange-100/90 pt-3 sm:pt-5">
                                                                    <LessonContinueStrip
                                                                        lessons={completionNavLessons}
                                                                        language={language}
                                                                        onSelect={openLessonFromCompletionStrip}
                                                                        openingId={completionStripOpeningId}
                                                                        compact
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {!isLastSlide && (
                                <div className="pointer-events-none absolute inset-y-8 inset-x-0 z-20 flex items-center justify-between px-1 sm:px-2">
                                    <div className="pointer-events-auto">
                                        <button
                                            type="button"
                                            onClick={prevSlide}
                                            disabled={isFirstSlide}
                                            aria-label={language === 'en' ? 'Previous page' : 'আগের পাতা'}
                                            className={`flex h-11 w-11 items-center justify-center rounded-full border bg-white/95 text-slate-700 shadow-md backdrop-blur-sm transition-all sm:h-12 sm:w-12 ${
                                                isFirstSlide
                                                    ? 'pointer-events-none border-transparent opacity-0'
                                                    : 'border-slate-200/80 hover:bg-orange-50 active:scale-95'
                                            }`}
                                        >
                                            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="pointer-events-auto">
                                        <button
                                            type="button"
                                            disabled={isNextDisabledByLessonRules}
                                            onClick={nextSlide}
                                            aria-label={language === 'en' ? 'Next page' : 'পরের পাতা'}
                                            title={
                                                isNextDisabledByLessonRules
                                                    ? language === 'en'
                                                        ? isLessonSectionAdvanceBlocked()
                                                            ? 'Finish all topic cards on this page first.'
                                                            : 'Scroll to the bottom of this page to go on.'
                                                        : isLessonSectionAdvanceBlocked()
                                                            ? 'আগে এই পাতার সব কার্ড শেষ করুন।'
                                                            : 'পরের পাতায় যেতে আগে নিচে স্ক্রল করে পড়ুন।'
                                                    : language === 'en'
                                                        ? 'Next page'
                                                        : 'পরের পাতা'
                                            }
                                            className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition-all sm:h-12 sm:w-12 ${
                                                isNextDisabledByLessonRules
                                                    ? 'cursor-not-allowed border-slate-200 bg-white/70 text-slate-400'
                                                    : 'border-orange-500 bg-orange-500 text-white shadow-orange-500/30 active:scale-95'
                                            }`}
                                        >
                                            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                            </div>

                            {!isLastSlide && slides.length > 1 && (
                                <div className="shrink-0 border-t border-stone-200/70 bg-[#fcfaf2]/95 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6 sm:py-3">
                                    <div className="mx-auto flex max-w-3xl items-center justify-center gap-4">
                                        <p className={`text-xs font-bold tabular-nums text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Page' : 'পাতা'}
                                            <span className="mx-1.5 text-orange-600">{activeSectionIndex + 1}</span>
                                            <span className="text-slate-300">/</span>
                                            <span className="ml-1.5">{slides[slides.length - 1]?.type === 'completion' ? slides.length - 1 : slides.length}</span>
                                        </p>
                                        {isNextDisabledByLessonRules && (
                                            <p className={`text-[10px] font-semibold text-amber-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {isLessonSectionAdvanceBlocked()
                                                    ? (language === 'en' ? 'Finish cards to continue' : 'কার্ড শেষ করুন')
                                                    : (language === 'en' ? 'Scroll down to continue' : 'নিচে স্ক্রল করুন')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Reward Celebration - Portalized Modal */}
            {
                recentReward && (
                    <LessonCelebration
                        points={recentReward}
                        language={language}
                        onClose={() => setRecentReward(null)}
                    />
                )
            }

            {/* Modals wrapped in Portals to fix Z-Index issues */}
            {
                showQuizModal && createPortal(
                    <ChapterQuizModal
                        isOpen={showQuizModal}
                        onClose={() => {
                            if (lifeSkillScoreGateActive) return;
                            setShowQuizModal(false);
                        }}
                        onReadAgain={handleReadAgain}
                        onHourlyQuiz={
                            isSupplementaryProgressLessonId(pendingLessonId || trainingContent?.level_id || '')
                                ? undefined
                                : handleQuizResultHourlyNav
                        }
                        questions={currentQuizQuestions}
                        onComplete={handleQuizComplete}
                        onGuestComplete={handleGuestQuizComplete}
                        guestPreview={isGuestUser(profile)}
                        chapterTitle={trainingContent?.level_title}
                        lessonId={trainingContent?.level_id}
                        lessonBadge={getTrainingHeaderLessonCode(trainingContent, language)}
                        language={language}
                        isLifeSkill={isSupplementaryProgressLessonId(
                            pendingLessonId || trainingContent?.level_id || ''
                        )}
                        lifeSkillNeedsListen={
                            !!trainingContent?.isSupplementary &&
                            !!supplementaryRadioSrc &&
                            !lifeSkillListenQualified
                        }
                        lifeSkillCooldownDays={getLifeSkillScoreCooldownDaysLeft(
                            lifeSkillScoreCooldownByModule.get(
                                pendingLessonId || trainingContent?.level_id
                            )
                        )}
                    />,
                    document.body
                )
            }

            {trainingContent?.isSupplementary &&
                supplementaryRadioSrc &&
                supplementaryRadioOverlayOpen &&
                createPortal(
                    <LessonRadioOverlay
                        isOpen={supplementaryRadioOverlayOpen}
                        onClose={() => {
                            if (lifeSkillScoreGateActive) return;
                            setSupplementaryRadioOverlayOpen(false);
                        }}
                        src={supplementaryRadioSrc}
                        language={language}
                        lessonTitle={trainingContent.level_title}
                        scoreGateMode={lifeSkillScoreGateActive}
                        bonusPoints={LIFE_SKILL_MONTHLY_BONUS_POINTS}
                        cooldownDays={
                            lifeSkillScoreGateActive
                                ? getLifeSkillScoreCooldownDaysLeft(
                                      lifeSkillScoreCooldownByModule.get(
                                          pendingLessonId || trainingContent?.level_id
                                      )
                                  )
                                : 0
                        }
                        onListenQualified={handleLifeSkillListenQualified}
                        onSkipWithoutScore={handleLifeSkillSkipWithoutScore}
                    />,
                    document.body
                )}


            {/* Image Preview Modal */}
            {
                activeImageModal && createPortal(
                    <div
                        className="fixed inset-0 z-[400] flex animate-fade-in items-center justify-center bg-slate-900/55 p-4 sm:p-6"
                        onClick={() => setActiveImageModal(null)}
                    >
                        <div
                            className={`relative flex max-h-[min(90vh,900px)] w-full flex-col overflow-hidden animate-scale-in ${
                                activeImageModal.type === 'image' ? 'max-w-5xl' : 'max-w-lg'
                            }`}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex max-h-[min(90vh,900px)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fffdf7] p-0 shadow-sm">
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setActiveImageModal(null)}
                                className="absolute right-3 top-3 z-10 rounded-full border border-slate-200/80 bg-white p-2 text-slate-900 shadow-sm sm:right-4 sm:top-4"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {activeImageModal.type === 'image' ? (
                                <div className="flex min-h-0 flex-1 flex-col bg-white p-4 pt-14 sm:p-8 sm:pt-16">
                                    {activeImageModal.caption && (
                                        <p className={`mb-2 max-w-full px-2 text-center text-xs font-black text-slate-600 nb-mono sm:mb-3 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {activeImageModal.caption}
                                        </p>
                                    )}
                                    <TrainingImageZoomViewer
                                        src={activeImageModal.value}
                                        alt={activeImageModal.caption || 'Preview'}
                                        language={language}
                                    />
                                </div>
                            ) : (
                                <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5 pt-14 sm:p-8 sm:pt-16">
                                    <div className="mb-3 flex items-center gap-2 text-orange-600">
                                        <svg className="h-7 w-7 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className={`text-xs font-bold uppercase tracking-wider text-slate-500 nb-mono ${language === 'bn' ? 'font-bengali tracking-normal' : ''}`}>
                                            {language === 'en' ? 'Details' : 'বিস্তারিত'}
                                        </span>
                                    </div>
                                    <p className={`text-left text-base font-medium leading-relaxed text-slate-800 sm:text-lg ${language === 'bn' ? 'font-bengali' : ''} whitespace-pre-line`}>
                                        {activeImageModal.value}
                                    </p>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
            {
                showOnboarding && !shellInterruptBusy && (
                    <OnboardingSequence
                        language={language}
                        onComplete={() => {
                            localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
                            localStorage.removeItem(ONBOARDING_LEGACY_DATE_KEY);
                            setShowOnboarding(false);
                        }}
                    />
                )
            }
            {/* Lessons Index Modal */}
            {showLessonIndex && createPortal(
                <div className="fixed inset-0 z-[120] flex animate-slide-in-right flex-col overflow-hidden bg-[#fffdf7] safe-area-inset-top safe-area-inset-bottom">
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white p-6">
                        <div>
                            <h2 className={`text-xl font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {language === 'en' ? 'Learning Index' : 'পাঠের সূচীপত্র'}
                            </h2>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-orange-600 nb-mono">
                                {language === 'en' ? 'Complete lessons one by one' : 'একের পর এক পাঠ সম্পন্ন করুন'}
                            </p>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setShowLessonIndex(false)}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable chapter list */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">
                        <div className="mx-auto max-w-3xl space-y-1 px-4 py-4 md:px-6 md:py-6">
                        {trainingChapters.filter(ch => ch.number !== 10).map((chapter, idx) => {
                            const isExpanded = expandedChapterIndex === idx;
                            const totalLessonsInChapter = chapter.count;
                            const completedInChapter = completedLessons.filter(id => id && id.toString().startsWith(`${chapter.number}.`)).length;
                            const isUnlocked = isLessonUnlocked(chapter.number, 1);
                            const chapterProgress = totalLessonsInChapter > 0
                                ? Math.round((completedInChapter / totalLessonsInChapter) * 100)
                                : 0;
                            
                            // Ordinal Helper
                            const getOrdinal = (n) => {
                                if (language === 'bn') {
                                    const bnOrdinals = ['১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম'];
                                    return bnOrdinals[n - 1] || `${toBengaliNumber(n, 'bn')}তম`;
                                }
                                const suffixes = ["th", "st", "nd", "rd"];
                                const v = n % 100;
                                return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
                            };

                            return (
                                <div key={chapter.number} className="animate-entrance-pop overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300">
                                    {/* Chapter Row */}
                                    <button 
                                        type="button"
                                        onClick={() => setExpandedChapterIndex(isExpanded ? null : idx)}
                                        className={`flex w-full items-start gap-3 p-4 text-left transition-colors sm:gap-4 sm:p-5 ${
                                            isExpanded ? 'bg-orange-50/80' : 'bg-white hover:bg-orange-50/40'
                                        }`}
                                    >
                                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 text-[11px] font-black ${
                                            isUnlocked ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                            {getOrdinal(chapter.number)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className={`text-base font-black leading-snug text-slate-900 sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {chapter.title}
                                            </h3>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <span className="text-[11px] font-semibold text-slate-500">
                                                    {totalLessonsInChapter} {language === 'en' ? 'lessons' : 'টি পাঠ'}
                                                </span>
                                                {completedInChapter > 0 && (
                                                    <span className={`text-[11px] font-bold ${completedInChapter === totalLessonsInChapter ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                        {completedInChapter === totalLessonsInChapter
                                                            ? (language === 'en' ? 'Complete' : 'সম্পন্ন')
                                                            : `${completedInChapter}/${totalLessonsInChapter} ${language === 'en' ? 'done' : 'সম্পন্ন'}`}
                                                    </span>
                                                )}
                                            </div>
                                            {!isExpanded && totalLessonsInChapter > 0 && (
                                                <div className="mt-2.5 h-1 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${chapterProgress === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                                        style={{ width: `${chapterProgress}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-orange-600' : ''}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Lessons list */}
                                    {isExpanded && (
                                        <div className="animate-fade-in border-t border-slate-200 bg-[#fffdf7] px-2 py-1.5 sm:px-3">
                                            {Array.from({ length: chapter.count }, (_, i) => {
                                                const lessonNum = i + 1;
                                                const lessonId = `${chapter.number}.${lessonNum}`;
                                                const isDone = completedLessons.includes(lessonId);
                                                const isLessonUnl = isLessonUnlocked(chapter.number, lessonNum);
                                                const lessonTitle = indexLessonTitles[lessonId];
                                                const lessonLabel = lessonTitle
                                                    || (language === 'en'
                                                        ? `Lesson ${lessonId}`
                                                        : `পাঠ ${toBengaliNumber(lessonId, language)}`);

                                                return (
                                                    <button
                                                        key={lessonId}
                                                        type="button"
                                                        disabled={!isLessonUnl}
                                                        onClick={() => {
                                                            setShowLessonIndex(false);
                                                            handleChapterClick(chapter, lessonNum);
                                                        }}
                                                        className={`flex w-full items-center gap-2.5 border-b border-slate-100/80 px-2 py-2 text-left transition-colors last:border-b-0 sm:gap-3 sm:px-2.5 sm:py-2.5 ${
                                                            isDone
                                                                ? 'hover:bg-emerald-50/60'
                                                                : isLessonUnl
                                                                    ? 'hover:bg-orange-50/60'
                                                                    : 'cursor-not-allowed opacity-50'
                                                        }`}
                                                        aria-label={
                                                            language === 'en'
                                                                ? `${lessonId}: ${lessonLabel}${isDone ? ', done' : isLessonUnl ? '' : ', locked'}`
                                                                : `${toBengaliNumber(lessonId, language)}: ${lessonLabel}${isDone ? ', সম্পন্ন' : isLessonUnl ? '' : ', লক'}`
                                                        }
                                                    >
                                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-black tabular-nums ${
                                                            isDone
                                                                ? 'bg-emerald-500 text-white'
                                                                : isLessonUnl
                                                                    ? 'bg-orange-100 text-orange-800'
                                                                    : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                            {language === 'bn' ? toBengaliNumber(lessonNum, language) : lessonNum}
                                                        </span>
                                                        <span className={`min-w-0 flex-1 text-[13px] font-semibold leading-snug sm:text-sm ${
                                                            isDone
                                                                ? 'text-emerald-800'
                                                                : isLessonUnl
                                                                    ? 'text-slate-800'
                                                                    : 'text-slate-400'
                                                        } ${language === 'bn' || lessonTitle ? 'font-bengali' : ''}`}>
                                                            {lessonLabel}
                                                        </span>
                                                        {!isDone && !isLessonUnl && (
                                                            <span className="shrink-0 text-xs text-slate-400" aria-hidden>🔒</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div >
    );
}
