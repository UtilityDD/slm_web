import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import secureStorage from '../../utils/secureStorage';
import { supabase } from '../../supabaseClient';
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL } from '../../config';
import HomeSkeleton from '../loaders/HomeSkeleton';
import { badgeLevels, calculateLevelFromProgress, getBadgeByLevel, getRoadmapBadgeByLevel } from '../../utils/badgeUtils';
import { cacheHelper } from '../../utils/cacheHelper';
import { invalidateLeaderboardCaches } from '../../utils/leaderboardCacheKeys';
import { storageUtils } from '../../utils/storageUtils';
import { requestManager } from '../../utils/requestManager';
import ChapterQuizModal from '../ChapterQuizModal';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import LessonCelebration from './LessonCelebration';
import LessonRadioOverlay from './LessonRadioOverlay';
import PPESurveyModal from './PPESurveyModal';
import OnboardingSequence from './OnboardingSequence';
import { DotLottiePlayer } from '@dotlottie/react-player';
import sandyLoading from '../../assets/SandyLoading.lottie';
import calendarLottie from '../../assets/calendar.lottie';
import readingLottie from '../../assets/readding.lottie';
import protipLottie from '../../assets/protip.lottie';
import mythLottie from '../../assets/myth.lottie';
import clockLottie from '../../assets/clock.lottie';
import { resolveTrainingMediaSrc, trainingMediaRefLooksLikeImage } from '../../utils/trainingMediaUrl';
import {
    loadSupplementaryCompletedModuleIds,
    appendSupplementaryCompletion,
} from '../../utils/supplementaryProgressStorage';
import { filterCoreCompletedLessonIds, isSupplementaryProgressLessonId } from '../../utils/trainingLessonIds';
import { logReadingHabitCompletion, logReadingHabitReview } from '../../utils/readingHabitLog';
import { checkReadingGate } from '../../utils/readingHabitGate';
import {
    consumeGateNavigation,
    consumeGateReviewTarget,
    consumeGateUnlockPending,
    peekGateUnlockPending,
    parseCoreLessonId as parseGateLessonId,
} from '../../utils/readingGateStorage';
import ReadingGateModal from '../ReadingGateModal';
import { pickSupplementaryListenSrc } from '../../utils/supplementaryAudioUrl';
import { useLifeSkillRadio } from '../../context/LifeSkillRadioContext';
import { getLifetimePoints } from '../../utils/hourlyDifficulty';
import HourlyPenaltyInfoModal from '../HourlyPenaltyInfoModal';

const HOURLY_PENALTY_MODAL_SKIP_KEY = 'slm_hourly_penalty_info_skip';

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

/** localStorage JSON `{ visits, dismissed }`; legacy v1 `'1'` = dismissed. */
const LIFE_SKILLS_HINT_STORAGE_KEY = 'slm_training_lifeskills_hint_v2';
const LIFE_SKILLS_HINT_LEGACY_KEY = 'slm_training_lifeskills_hint_v1';
/** Show hint on core training home for this many visits, then stop (unless dismissed earlier). */
const MAX_LIFE_SKILLS_HINT_VISITS = 3;

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

function readLifeSkillsHintState() {
    if (typeof window === 'undefined') return { visits: 0, dismissed: true };
    try {
        if (localStorage.getItem(LIFE_SKILLS_HINT_LEGACY_KEY) === '1') {
            return { visits: MAX_LIFE_SKILLS_HINT_VISITS, dismissed: true };
        }
        const raw = localStorage.getItem(LIFE_SKILLS_HINT_STORAGE_KEY);
        if (!raw) return { visits: 0, dismissed: false };
        const o = JSON.parse(raw);
        return {
            visits: typeof o.visits === 'number' && o.visits >= 0 ? o.visits : 0,
            dismissed: !!o.dismissed,
        };
    } catch {
        return { visits: 0, dismissed: false };
    }
}

function writeLifeSkillsHintState(state) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(LIFE_SKILLS_HINT_STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* ignore */
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

/** Max wait (ms) before opening a life skill (no progress in main path through 3.10). */
const LIFE_SKILL_OPEN_MAX_WAIT_MS = 60_000;

const TECHNICIAN_BADGE = badgeLevels.find((b) => b.level === 3) || { en: 'Technician', bn: 'টেকনিশিয়ান' };

function parseCoreLessonId(id) {
    const m = String(id).match(/^(\d+)\.(\d+)$/);
    if (!m) return null;
    return { ch: parseInt(m[1], 10), n: parseInt(m[2], 10) };
}

/** True if lesson `a` is strictly after `b` on the main path (same chapter: higher number; else higher chapter). */
function coreLessonIdStrictlyAfter(aId, bId) {
    const a = parseCoreLessonId(aId);
    const b = parseCoreLessonId(bId);
    if (!a || !b) return false;
    if (a.ch !== b.ch) return a.ch > b.ch;
    return a.n > b.n;
}

/** Ordered ids from 1.1 through 3.10 (clamped to manifest counts for chapters 1–3). */
function buildLifeSkillGateLessonIds(trainingChapters) {
    const ids = [];
    for (let ch = 1; ch <= 3; ch += 1) {
        const cnt = getCoreChapterLessonCount(ch, trainingChapters);
        if (cnt <= 0) continue;
        const cap = ch === 3 ? Math.min(10, cnt) : cnt;
        for (let i = 1; i <= cap; i += 1) {
            ids.push(`${ch}.${i}`);
        }
    }
    return ids;
}

/**
 * No wait: every lesson in the 1.1…3.10 gate segment is done, or any completed core lesson is strictly after the gate end (e.g. 4.1).
 */
function hasZeroLifeSkillGateDelay(coreSet, gateIds) {
    if (!gateIds.length) return true;
    const lastGateId = gateIds[gateIds.length - 1];
    for (const id of coreSet) {
        if (typeof id === 'string' && coreLessonIdStrictlyAfter(id, lastGateId)) return true;
    }
    let d = 0;
    for (const id of gateIds) {
        if (coreSet.has(id)) d += 1;
    }
    return d >= gateIds.length;
}

/**
 * First catalogue card (index 0) is always instant. Others: linear 60s→0s over progress through lessons 1.1…3.10; 0 after 3.10 (or beyond).
 */
function getLifeSkillOpenDelayMs(moduleIndex, completedLessons, trainingChapters) {
    if (moduleIndex === 0) return 0;
    const gateIds = buildLifeSkillGateLessonIds(trainingChapters);
    if (!gateIds.length) return 0;
    const coreArr = filterCoreCompletedLessonIds(Array.isArray(completedLessons) ? completedLessons : []);
    const coreSet = new Set(coreArr);
    if (hasZeroLifeSkillGateDelay(coreSet, gateIds)) return 0;
    let d = 0;
    for (const id of gateIds) {
        if (coreSet.has(id)) d += 1;
    }
    const n = gateIds.length;
    const raw = LIFE_SKILL_OPEN_MAX_WAIT_MS * (1 - d / n);
    return Math.min(LIFE_SKILL_OPEN_MAX_WAIT_MS, Math.max(0, Math.round(raw)));
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

/** Header / hero: Life Skill modules use short codes (LS01); core lessons keep level_id. */
const getTrainingHeaderLessonCode = (trainingContent, lang) => {
    if (!trainingContent?.level_id) return '';
    if (trainingContent.isSupplementary) {
        let code = '';
        if (typeof trainingContent.lesson_code === 'string' && trainingContent.lesson_code.trim()) {
            code = trainingContent.lesson_code.trim();
        } else {
            code = deriveLifeSkillCodeFromLevelId(trainingContent.level_id);
        }
        if (code) {
            return lang === 'bn' ? toBengaliNumber(code, 'bn') : code;
        }
    }
    return lang === 'bn' ? toBengaliNumber(trainingContent.level_id, lang) : `${trainingContent.level_id}`;
};

const TrainingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[...Array(6)].map((_, i) => (
            <div key={i} className="p-6 nb-card bg-white">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-slate-200 border-2 border-slate-900 shadow-[2px_2px_0_#0f172a]"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 border border-slate-900 w-3/4"></div>
                        <div className="h-3 bg-slate-100 border border-slate-300 w-1/2"></div>
                    </div>
                </div>
                <div className="w-full h-2 bg-slate-100 border border-slate-900 mb-2"></div>
                <div className="flex justify-between">
                    <div className="h-3 bg-slate-100 border border-slate-300 w-1/4"></div>
                    <div className="h-3 bg-slate-100 border border-slate-300 w-1/4"></div>
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
            className={`p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer group relative overflow-hidden active:scale-95 animate-entrance-pop ${isFAQ
                ? 'bg-gradient-to-br from-violet-50/50 to-fuchsia-100/30 dark:from-violet-900/10 dark:to-fuchsia-900/10 border-violet-100 dark:border-violet-800/40 hover:border-violet-400 dark:hover:border-violet-500 shadow-sm hover:shadow-xl lg:hover:-translate-y-2'
                : 'bg-token-bg-surface border-token-border hover:border-orange-200 dark:hover:border-orange-800 hover:shadow-2xl lg:hover:-translate-y-2'
                }`}
        >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full transition-opacity duration-500 opacity-0 group-hover:opacity-20 pointer-events-none ${isFAQ ? 'bg-violet-500' : 'bg-orange-500'}`}></div>

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${isFAQ
                        ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                        : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                        }`}>
                        {isFAQ ? '?' : chapter.number}
                    </div>
                    <div>
                        <h3 className={`font-black tracking-tight leading-tight text-lg lg:text-xl transition-colors ${language === 'bn' ? 'font-bengali' : ''} ${isFAQ
                            ? 'text-violet-900 dark:text-violet-100 group-hover:text-violet-700 dark:group-hover:text-violet-300'
                            : 'text-token-text-primary group-hover:text-orange-600 dark:group-hover:text-orange-400'
                            }`}>
                            {chapter.title}
                        </h3>
                        <p className="text-[11px] font-bold text-token-text-muted uppercase tracking-widest mt-1">
                            {isFAQ ? (
                                language === 'en' ? 'Reference Guide' : 'রেফারেন্স গাইড'
                            ) : (
                                language === 'en' ? (
                                    `${chapter.count} Lessons`
                                ) : (
                                    `${toBengaliNumber(chapter.count, 'bn')}টি পাঠ`
                                )
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Bar Area */}
            {!isFAQ && (
                <div className="space-y-3 relative z-10">
                    <div className="w-full h-2.5 bg-token-bg-page rounded-full overflow-hidden shadow-inner border border-token-border">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out relative ${progress === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-orange-400 to-orange-600'}`}
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 shimmer opacity-30"></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-token-text-muted">
                            {completedCount}/{chapter.count} {language === 'en' ? 'Complete' : 'সম্পন্ন'}
                        </span>
                        <span className={`text-xs font-black ${progress === 100 ? 'text-emerald-500' : 'text-orange-500'}`}>
                            {progress}%
                        </span>
                    </div>
                </div>
            )}

            {isFAQ && (
                <div className="mt-4 flex items-center gap-1.5 text-violet-500 font-black text-[10px] uppercase tracking-wider">
                    {language === 'en' ? 'Access Knowledge' : 'জ্ঞান অন্বেষণ করুন'} <span>→</span>
                </div>
            )}
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

/** Rank milestone on the learning path — unified medal-on-box badge. */
function RankMilestone({ badge, language, isUnlocked, isCurrent, prefersReducedMotion }) {
    const name = language === 'en' ? badge.en : badge.bn;
    const tier = badge.level;
    const medalSize =
        tier >= 8 ? 'h-12 w-12 text-2xl' :
        tier >= 5 ? 'h-11 w-11 text-xl' :
        'h-10 w-10 text-lg';
    const shadowClass = tier >= 7 ? 'shadow-[4px_4px_0_#0f172a]' : 'shadow-[3px_3px_0_#0f172a]';
    const animateIn = isUnlocked && !prefersReducedMotion;
    const isActiveRank = isCurrent && isUnlocked;
    const borderClass = isActiveRank ? 'border-orange-600' : isUnlocked ? 'border-slate-900' : 'border-slate-400';
    const activeShadow = isActiveRank ? 'shadow-[4px_4px_0_#ea580c] sm:shadow-[5px_5px_0_#ea580c]' : shadowClass;
    const shellClass = isUnlocked
        ? `${badge.color} ${badge.medalText}`
        : 'bg-slate-200 text-slate-500 grayscale opacity-85';
    const namePad = language === 'bn'
        ? 'px-4 pb-2.5 pt-7 sm:px-5 sm:pb-3 sm:pt-8'
        : 'px-3.5 pb-2 pt-6 sm:px-4 sm:pb-2.5 sm:pt-6';
    const nameSize = language === 'bn'
        ? 'font-bengali text-[0.95rem] sm:text-base leading-[1.4]'
        : 'text-xs sm:text-sm leading-tight';

    return (
        <div
            className={`training-rank-badge relative ${animateIn ? 'animate-rank-badge-in' : ''}`}
            role="img"
            aria-label={name}
        >
            <div className={`relative min-w-[6.75rem] border-2 text-center sm:min-w-[7.25rem] ${borderClass} ${activeShadow} ${shellClass}`}>
                <div
                    className={`absolute left-1/2 top-0 z-10 flex ${medalSize} -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 ${borderClass} ${isUnlocked ? `${badge.color} ${badge.medalText}` : 'bg-slate-200 text-slate-500'} ${isUnlocked && tier >= 9 && !prefersReducedMotion ? 'animate-rank-medal-glow' : ''}`}
                >
                    <span aria-hidden className="leading-none select-none">
                        {isUnlocked ? badge.icon : '🔒'}
                    </span>
                </div>
                <p className={`mb-0 font-black ${namePad} ${nameSize} whitespace-nowrap`}>
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
                <span className="relative inline-flex h-7 w-7 shrink-0 overflow-hidden rounded-sm border border-slate-900 bg-white shadow-[1px_1px_0_#0f172a] ring-2 ring-orange-400 ring-offset-1">
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
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-900 bg-orange-100 text-orange-800 shadow-[1px_1px_0_#0f172a] ring-2 ring-orange-300 ring-offset-1 group-hover:bg-orange-200">
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

/** Pinch, scroll, and drag zoom for lesson image preview modal. */
function TrainingImageZoomViewer({ src, alt, language }) {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const pinchRef = useRef({ startDist: 0, startScale: 1 });
    const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
    const lastTapRef = useRef(0);

    useEffect(() => {
        setScale(1);
        setPos({ x: 0, y: 0 });
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
                <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    className="mx-auto max-h-[min(70vh,760px)] max-w-full select-none rounded-sm object-contain"
                    style={{
                        transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                        transformOrigin: 'center center',
                    }}
                />
            </div>
        </div>
    );
}

/** Lesson figure — full-width on topic cards and inline in text boxes. Tap opens enlarge modal. */
function TrainingLessonFigure({ src, alt, caption, onClick, language, className = '', inlineFloat = false }) {
    const enlargeLabel = language === 'en' ? 'Tap to enlarge' : 'বড় করে দেখতে ট্যাপ করুন';
    const inlineHint = language === 'en' ? 'Tap to view large' : 'বড় ছবি দেখতে ট্যাপ করুন';
    const isInline = inlineFloat;

    const buttonClass = isInline
        ? `my-3 sm:my-4 block w-full overflow-hidden bg-transparent p-0 text-left ${className}`
        : `my-3 sm:my-4 block w-full max-w-lg overflow-hidden bg-transparent p-0 text-left clear-both ${className}`;

    const captionClass = `mb-1.5 sm:mb-2 text-center text-[10px] sm:text-xs font-black text-slate-600 nb-mono ${language === 'bn' ? 'font-bengali' : ''}`;
    const hintClass = `mt-1.5 text-center text-[10px] font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`;

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick?.();
            }}
            title={enlargeLabel}
            aria-label={caption ? `${caption} — ${enlargeLabel}` : enlargeLabel}
            className={buttonClass}
        >
            {caption && (
                <p className={captionClass}>
                    {caption}
                </p>
            )}
            <img src={src} alt={alt} className="h-auto w-full rounded-sm object-contain" loading="lazy" />
            {isInline && (
                <p className={hintClass}>
                    {inlineHint}
                </p>
            )}
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
    const shell = readingComfort
        ? 'relative overflow-hidden border-2 border-slate-900 bg-white p-4 sm:p-6 md:p-10 shadow-[3px_3px_0_#0f172a]'
        : 'relative overflow-hidden border-2 border-slate-900 bg-white p-4 sm:p-6 md:p-8 shadow-[4px_4px_0_#0f172a] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5';
    const stackGap = readingComfort ? 'space-y-4 sm:space-y-7 md:space-y-10' : 'space-y-4 sm:space-y-6 md:space-y-8';
    const titleCls = readingComfort
        ? `text-xl sm:text-2xl md:text-[1.95rem] font-black text-slate-900 leading-snug ${language === 'bn' ? 'font-bengali leading-[1.45]' : ''}`
        : `text-lg sm:text-2xl md:text-3xl font-black text-slate-900 leading-snug ${language === 'bn' ? 'font-bengali leading-[1.5]' : ''}`;
    const specCls = readingComfort
        ? `text-sm sm:text-lg md:text-[1.35rem] text-slate-700 leading-[1.75] sm:leading-[2.05] font-medium ${language === 'bn' ? 'font-bengali sm:text-[1.2rem] md:text-[1.35rem] leading-[1.8] sm:leading-[2.15]' : ''}`
        : `text-sm sm:text-lg md:text-xl text-slate-700 leading-[1.7] sm:leading-[1.9] font-medium ${language === 'bn' ? 'font-bengali sm:text-xl md:text-2xl leading-[1.85] sm:leading-[2.1]' : ''}`;
    const boxPad = readingComfort ? 'p-3.5 sm:p-6 md:p-9' : 'p-3.5 sm:p-5 md:p-8';
    const boxBody = readingComfort
        ? `text-sm sm:text-base md:text-[1.2rem] text-slate-900 font-bold leading-[1.65] sm:leading-[1.95] ${language === 'bn' ? 'font-bengali leading-[1.7] sm:leading-[2.1]' : ''}`
        : `text-sm sm:text-base md:text-lg text-slate-900 font-bold leading-[1.6] sm:leading-[1.8] ${language === 'bn' ? 'font-bengali leading-[1.65] sm:leading-[2.0]' : ''}`;

    return (
        <div className={shell}>
            <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${pIdx % 2 === 0 ? 'bg-orange-500' : 'bg-amber-500'}`}
                aria-hidden
            />
            <div className={`flex flex-col ${stackGap} pl-3 sm:pl-4`}>
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
                            className={readingComfort ? 'mb-4 sm:mb-7 md:mb-9' : 'mb-4 sm:mb-6 md:mb-10'}
                            onClick={() => setActiveImageModal({
                                type: 'image',
                                value: resolveTrainingMediaSrc(point.image_name),
                                caption: point.image_caption,
                            })}
                        />
                    )}

                    <div className={readingComfort ? 'space-y-4 sm:space-y-7 md:space-y-10' : 'space-y-4 sm:space-y-6 md:space-y-8'}>
                        {point.specifications && (
                            <div className={`${specCls} space-y-1.5 sm:space-y-2`}>
                                {renderTextWithImages(point.specifications)}
                            </div>
                        )}

                        <div className={`grid grid-cols-1 ${readingComfort ? 'gap-3 sm:gap-6 md:gap-8' : 'gap-3 sm:gap-5 md:gap-6'}`}>
                            {point.importance && (
                                <div className={`border-2 border-slate-900 bg-blue-50 ${boxPad} shadow-[2px_2px_0_#0f172a]`}>
                                    <div className="mb-2 flex items-center gap-2 sm:mb-3 md:mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 nb-mono sm:text-xs">{language === 'en' ? 'Strategy' : 'কৌশল'}</span>
                                    </div>
                                    <div className={boxBody}>
                                        {renderTextWithImages(point.importance)}
                                    </div>
                                </div>
                            )}
                            {point.daily_check && (
                                <div className={`border-2 border-slate-900 bg-emerald-50 ${boxPad} shadow-[2px_2px_0_#0f172a]`}>
                                    <div className="mb-2 flex items-center gap-2 sm:mb-3 md:mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 nb-mono sm:text-xs">{language === 'en' ? 'Action Plan' : 'কর্মপরিকল্পনা'}</span>
                                    </div>
                                    <div className={boxBody}>
                                        {renderTextWithImages(point.daily_check)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {showDoneButton && (
                    <div className="mt-2 border-t-2 border-slate-900 pt-6">
                        <button
                            type="button"
                            onClick={onStepDone}
                            className="nb-btn-primary w-full px-4 py-3.5 text-center text-sm font-black"
                        >
                            {language === 'en' ? 'I have read this — continue' : 'পড়ে ফেলেছি — এগিয়ে যান'}
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
}) {
    const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
    const [showDailyBrief, setShowDailyBrief] = useState(() => !isDailyBriefDismissedToday());
    const [trainingChapters, setTrainingChapters] = useState([]);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [lockedLessonModal, setLockedLessonModal] = useState(null);
    const [trainingContent, setTrainingContent] = useState(null);
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [completedLessons, setCompletedLessons] = useState([]);
    const [faqSearchQuery, setFaqSearchQuery] = useState('');
    const [isFaqTagsExpanded, setIsFaqTagsExpanded] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [readingPoints, setReadingPoints] = useState(0);
    const { expanded: radioGlobalExpanded } = useLifeSkillRadio();

    // Supplementary Modules State
    const [trainingTab, setTrainingTab] = useState('core'); // 'core' | 'supplementary'
    const [supplementaryModules, setSupplementaryModules] = useState([]);
    const [suppCompleted, setSuppCompleted] = useState([]);
    const [showLifeSkillsHint, setShowLifeSkillsHint] = useState(() => {
        const s = readLifeSkillsHintState();
        return !s.dismissed && s.visits < MAX_LIFE_SKILLS_HINT_VISITS;
    });
    const lifeSkillsHintHomeBumpRef = useRef(false);

    // Quiz Modal State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [currentQuizQuestions, setCurrentQuizQuestions] = useState([]);
    const [pendingLessonId, setPendingLessonId] = useState(null);
    const [previousQuizQuestions, setPreviousQuizQuestions] = useState({});
    const [recentReward, setRecentReward] = useState(null);
    const [activeSectionIndex, setActiveSectionIndex] = useState(0); // For Journal Mode
    const [isJournalMode, setIsJournalMode] = useState(false);
    const [activeImageModal, setActiveImageModal] = useState(null);
    const [showAllChapters, setShowAllChapters] = useState(false);
    const [showPPESurvey, setShowPPESurvey] = useState(false);
    const [surveyPPEItem, setSurveyPPEItem] = useState(null);
    const [pendingSubchapter, setPendingSubchapter] = useState(null);
    const [userPPEData, setUserPPEData] = useState([]);
    const galleryRef = useRef(null);
    const [supplementaryRadioOverlayOpen, setSupplementaryRadioOverlayOpen] = useState(false);
    /** Countdown overlay while opening a life skill (encourages core reading first; first module has no wait). */
    const [lifeSkillWaitUi, setLifeSkillWaitUi] = useState(null);
    const lifeSkillWaitTimersRef = useRef(null);
    const lessonScrollRef = useRef(null);
    const lessonScrollInnerRef = useRef(null);
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
    const [readingGateBlock, setReadingGateBlock] = useState(null);
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
    const [showHourlyPenaltyModal, setShowHourlyPenaltyModal] = useState(false);
    const [hourlyPenaltyDontShowAgain, setHourlyPenaltyDontShowAgain] = useState(false);
    const [userRank, setUserRank] = useState(null);
    const [showLessonIndex, setShowLessonIndex] = useState(false);
    const [expandedChapterIndex, setExpandedChapterIndex] = useState(null);
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
        }
    }, [user]);

    const handleMarkSupplementaryRead = useCallback(
        (moduleId, { silent = false } = {}) => {
            if (!user) return;
            const updated = appendSupplementaryCompletion(user.id, moduleId);
            setSuppCompleted(updated);
            if (!silent && typeof showNotification === 'function') {
                showNotification(
                    language === 'en' ? 'Saved to your progress.' : 'আপনার অগ্রগতিতে সংরক্ষিত হয়েছে।'
                );
            }
        },
        [user, language]
    );

    const dismissLifeSkillsHint = useCallback(() => {
        const s = readLifeSkillsHintState();
        writeLifeSkillsHintState({ ...s, dismissed: true });
        setShowLifeSkillsHint(false);
    }, []);

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

    const hourlyLifetimePoints = useMemo(
        () => getLifetimePoints(profile, userRank),
        [profile, userRank]
    );
    const handleHourlyChallengeClick = useCallback(async () => {
        if (!user?.id) return;
        const gate = await checkReadingGate({
            userId: user.id,
            completedLessons,
            trainingChapters,
        });
        if (!gate.allowed) {
            setReadingGateBlock({ ...gate, userId: user.id });
            return;
        }
        if (!storageUtils.getItem(`${HOURLY_PENALTY_MODAL_SKIP_KEY}_${user.id}`)) {
            setHourlyPenaltyDontShowAgain(false);
            setShowHourlyPenaltyModal(true);
            return;
        }
        setCurrentView('competitions');
    }, [user?.id, completedLessons, trainingChapters, setCurrentView]);

    const closeHourlyPenaltyModalAndGo = useCallback(() => {
        if (hourlyPenaltyDontShowAgain && user?.id) {
            storageUtils.setItem(`${HOURLY_PENALTY_MODAL_SKIP_KEY}_${user.id}`, '1');
        }
        setShowHourlyPenaltyModal(false);
        setCurrentView('competitions');
    }, [hourlyPenaltyDontShowAgain, user?.id, setCurrentView]);

    useEffect(() => {
        if (trainingTab !== 'supplementary') return;
        const s = readLifeSkillsHintState();
        writeLifeSkillsHintState({ ...s, dismissed: true });
        setShowLifeSkillsHint(false);
    }, [trainingTab]);

    const clearLifeSkillWaitTimers = useCallback(() => {
        const t = lifeSkillWaitTimersRef.current;
        if (t?.intervalId) clearInterval(t.intervalId);
        if (t?.timeoutId) clearTimeout(t.timeoutId);
        lifeSkillWaitTimersRef.current = null;
    }, []);

    useEffect(() => {
        if (trainingTab !== 'supplementary') {
            clearLifeSkillWaitTimers();
            setLifeSkillWaitUi(null);
        }
    }, [trainingTab, clearLifeSkillWaitTimers]);

    useEffect(
        () => () => {
            const t = lifeSkillWaitTimersRef.current;
            if (t?.intervalId) clearInterval(t.intervalId);
            if (t?.timeoutId) clearTimeout(t.timeoutId);
        },
        []
    );

    // Count core-home "visits" for Life Skills hint; cap at MAX_LIFE_SKILLS_HINT_VISITS.
    useEffect(() => {
        if (selectedChapter || trainingContent) {
            lifeSkillsHintHomeBumpRef.current = false;
            return;
        }
        if (trainingTab !== 'core') {
            lifeSkillsHintHomeBumpRef.current = false;
            return;
        }
        if (lifeSkillsHintHomeBumpRef.current) return;
        lifeSkillsHintHomeBumpRef.current = true;

        const s = readLifeSkillsHintState();
        if (s.dismissed) {
            setShowLifeSkillsHint(false);
            return;
        }
        if (s.visits >= MAX_LIFE_SKILLS_HINT_VISITS) {
            setShowLifeSkillsHint(false);
            return;
        }
        setShowLifeSkillsHint(true);
        writeLifeSkillsHintState({ ...s, visits: s.visits + 1 });
    }, [selectedChapter, trainingContent, trainingTab]);

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

    // Fetch user rank for leaderboard preview
    useEffect(() => {
        const fetchRank = async () => {
            if (!user) return;
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

                        return { rank: count + 1, score: myData.score };
                    },
                    { ttl: 5, swr: true, forceRefresh: false }
                );

                if (rankData) {
                    setUserRank(rankData);
                }
            } catch (error) {
                console.error('Error fetching rank in training:', error);
            }
        };

        fetchRank();
    }, [user, completedLessons.length]);

    useEffect(() => {
        const checkHourlyEligibility = async () => {
            if (!user) return;
            try {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hour = String(now.getHours()).padStart(2, '0');
                const quizId = `hourly-challenge-${year}-${month}-${day}-${hour}`;

                const { data, error } = await supabase
                    .from('quiz_attempts')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('quiz_id', quizId)
                    .limit(1);

                if (!error) {
                    setIsHourlyPending(data.length === 0);
                }
            } catch (err) {
                console.error("Error checking hourly challenge:", err);
            }
        };

        checkHourlyEligibility();

        // Setup an interval to check this every 5 minutes in case the hour rolls over while they are just sitting on the page
        const intervalId = setInterval(checkHourlyEligibility, 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [user]);

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

    const openLifeSkillModule = useCallback(
        (module, moduleIndex) => {
            const cardTitle = language === 'en' ? module.title_en : module.title_bn;
            const doOpen = () => {
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
            };
            const delayMs =
                profile?.role === 'admin'
                    ? 0
                    : getLifeSkillOpenDelayMs(moduleIndex, completedLessons, trainingChapters);
            if (delayMs <= 0) {
                doOpen();
                return;
            }
            clearLifeSkillWaitTimers();
            const totalSec = Math.max(1, Math.ceil(delayMs / 1000));
            const startedAt = Date.now();
            const levelNum = calculateLevelFromProgress(completedLessons, trainingChapters);
            const userBadge = getBadgeByLevel(levelNum, readingPoints || 0);
            setLifeSkillWaitUi({
                cardTitle,
                secondsLeft: totalSec,
                currentBadgeEn: userBadge.en,
                currentBadgeBn: userBadge.bn,
            });
            lifeSkillWaitTimersRef.current = {
                intervalId: setInterval(() => {
                    const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
                    const left = Math.max(0, totalSec - elapsedSec);
                    setLifeSkillWaitUi((prev) => (prev ? { ...prev, secondsLeft: left } : null));
                }, 250),
                timeoutId: setTimeout(() => {
                    clearLifeSkillWaitTimers();
                    setLifeSkillWaitUi(null);
                    doOpen();
                }, delayMs),
            };
        },
        [language, completedLessons, trainingChapters, readingPoints, clearLifeSkillWaitTimers, profile?.role]
    );

    // Auto-scroll to current reading position
    useEffect(() => {
        if (!selectedChapter && !trainingContent && !trainingLoading && roadmapData.items.length > 0) {
            const nextLesson = roadmapData.items.find(item => item.type === 'lesson' && !item.isCompleted && item.isUnlocked);

            if (nextLesson) {
                const timer = setTimeout(() => {
                    const scrollTarget = document.getElementById(`roadmap-node-${nextLesson.id}`);
                    if (scrollTarget) {
                        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 800);
                return () => clearTimeout(timer);
            }
        }
    }, [selectedChapter, trainingContent, trainingLoading, roadmapData.items]);

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
                        setTrainingContent((prev) => ({
                            ...prev,
                            ...data,
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

    const supplementaryRadioSrc = useMemo(() => {
        if (!trainingContent?.isSupplementary) return '';
        return pickSupplementaryListenSrc(trainingContent, language);
    }, [trainingContent?.isSupplementary, trainingContent?.audio_url_en, trainingContent?.audio_url_bn, language]);

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
    }, [user]);

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

    useEffect(() => {
        if (user?.id) {
            fetchUserPPEData();
        }
    }, [user?.id]);

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
                    { ttl: 60, swr: true, forceRefresh: true }
                );

                if (data) {
                    setTrainingChapters(data);
                }
            } catch (error) {
                console.error('Error fetching training chapters:', error);
                setFetchError(true);
            } finally {
                setTrainingLoading(false);
            }
        };

        fetchTrainingChapters();
    }, [language]);


    const handleChapterClick = async (chapter, targetLessonNum = null, options = {}) => {
        const { autoStartReading = false } = options;

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
                    'chapter_10_qa',
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
                    setSelectedChapter({ ...chapter, isFAQ: true, content: data });
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

    useEffect(() => {
        const openFaqIfRequested = () => {
            const tabMatch = window.location.hash.match(/[?&]tab=([^&]*)/);
            if (!tabMatch || decodeURIComponent(tabMatch[1]) !== 'faq') return;
            if (trainingChapters.length === 0) return;

            const faq = trainingChapters.find((c) => c.number === 10);
            if (!faq) return;

            window.history.replaceState(null, '', '#/training');
            handleChapterClick(faq);
        };

        openFaqIfRequested();
        window.addEventListener('hashchange', openFaqIfRequested);
        return () => window.removeEventListener('hashchange', openFaqIfRequested);
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

    const finalizeLessonCompletion = async (lessonId) => {
        if (isSupplementaryProgressLessonId(lessonId)) {
            setShowQuizModal(false);
            setPendingLessonId(null);
            return;
        }

        const current = Array.isArray(completedLessons) ? completedLessons : [];
        const updated = filterCoreCompletedLessonIds([...new Set([...current, lessonId])].filter(Boolean));
        const alreadyCompleted = completedLessons.includes(lessonId);
        const gateUnlock = user ? consumeGateUnlockPending(user.id, lessonId) : null;
        const gateReviewTarget = user && !gateUnlock ? consumeGateReviewTarget(user.id, lessonId) : false;
        const gateDrivenReview = alreadyCompleted && (gateUnlock?.kind === 'review' || gateReviewTarget);

        if (gateDrivenReview) {
            logReadingHabitReview(user.id, lessonId);
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

            if (user) {
                try {
                    const { error: rpcError } = await supabase.rpc('award_training_points', {
                        input_quiz_id: `lesson_bonus_${lessonId}`,
                        input_score: bonusPoints
                    });

                    if (rpcError) {
                        console.error('Error awarding lesson bonus:', rpcError);
                        if (!gateUnlock) {
                            if (typeof showNotification === 'function') {
                                showNotification(language === 'en' ? 'Error saving points' : 'পয়েন্ট সেভ করতে ত্রুটি', 'error');
                            }
                            return;
                        }
                    } else {
                        pointsAwarded = true;
                        invalidateLeaderboardCaches(user.id);
                        cacheHelper.clear(`profile_${user.id}`);
                        setRecentReward(bonusPoints);
                        setTimeout(() => setRecentReward(null), 5000);
                    }

                    if (pointsAwarded || gateUnlock) {
                        logReadingHabitCompletion(user.id, lessonId);
                        if (gateUnlock && !pointsAwarded && typeof showNotification === 'function') {
                            showNotification(
                                language === 'en'
                                    ? 'Lesson saved — hourly quiz unlocked.'
                                    : 'পাঠ সংরক্ষিত — ঘণ্টাভিত্তিক কুইজ খোলা হয়েছে।',
                                'success'
                            );
                        }
                    }
                } catch (err) {
                    console.error('Critical error in point awarding:', err);
                    if (!gateUnlock) return;
                    logReadingHabitCompletion(user.id, lessonId);
                    if (typeof showNotification === 'function') {
                        showNotification(
                            language === 'en'
                                ? 'Lesson saved — hourly quiz unlocked.'
                                : 'পাঠ সংরক্ষিত — ঘণ্টাভিত্তিক কুইজ খোলা হয়েছে।',
                            'success'
                        );
                    }
                }

                if (pointsAwarded) {
                    setCompletedLessons(updated);
                    storageUtils.setItem(`training_progress_${user.id}`, JSON.stringify(updated));

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
                                    ? 'Points were saved but lesson progress did not sync. Refresh the app or try again; contact support if this continues.'
                                    : 'পয়েন্ট সেভ হয়েছে কিন্তু পাঠের অগ্রগতি সার্ভারে যায়নি। অ্যাপ রিফ্রেশ করুন বা আবার চেষ্টা করুন।',
                                'error'
                            );
                        }
                    }
                }
            }
            if (pointsAwarded && onProgressUpdate) {
                onProgressUpdate(updated, true);
            }
        } else if (gateUnlock) {
            logReadingHabitReview(user.id, lessonId);
            if (typeof showNotification === 'function') {
                showNotification(
                    language === 'en'
                        ? 'Review saved — hourly quiz unlocked.'
                        : 'রিভিউ সংরক্ষিত — ঘণ্টাভিত্তিক কুইজ খোলা হয়েছে।',
                    'success'
                );
            }
        }
        setShowQuizModal(false);
        setPendingLessonId(null);
        setGateFocusTick((t) => t + 1);
    };

    const initiateLessonCompletion = async (lessonId) => {
        if (isSupplementaryProgressLessonId(lessonId)) {
            return;
        }
        // Construct quiz filename based on lesson ID (e.g., "1.1" -> "questions_1_1.json")
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
        if (pendingLessonId) {
            finalizeLessonCompletion(pendingLessonId);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 md:mb-6 animate-slide-down">


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
                <div className="animate-fade-in relative z-10">
                    {/* Only show Lottie if we're not loading subchapters within a main chapter */}
                    {!selectedChapter ? (
                        <div className="loading-container-fixed neo-brutal">
                            <div className="nb-card bg-white p-6 sm:p-8 flex flex-col items-center">
                                <div className="w-48 h-48 lg:w-64 lg:h-64 mb-4 border-[3px] border-slate-900 bg-orange-50 shadow-[4px_4px_0_#0f172a] flex items-center justify-center overflow-hidden">
                                    {prefersReducedMotion ? (
                                        <div className="flex h-full w-full items-center justify-center text-7xl" aria-hidden>📖</div>
                                    ) : (
                                        <DotLottiePlayer
                                            src={sandyLoading}
                                            autoplay
                                            loop
                                        />
                                    )}
                                </div>
                                <p className={`text-slate-800 font-black nb-mono uppercase tracking-widest animate-pulse ${language === 'bn' ? 'font-bengali text-xl normal-case tracking-normal' : 'text-lg'}`}>
                                    {language === 'en' ? 'Loading lesson…' : 'পাঠ লোড হচ্ছে…'}
                                </p>
                            </div>
                            <p className={`mx-auto mt-4 max-w-md px-4 text-center text-sm font-semibold leading-relaxed text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {LOADING_TIPS[language === 'bn' ? 'bn' : 'en'][loadingTipIndex % LOADING_TIPS.en.length]}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 neo-brutal">
                            <TrainingSkeleton />
                            <p className={`mx-auto max-w-md px-4 text-center text-xs font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {LOADING_TIPS[language === 'bn' ? 'bn' : 'en'][loadingTipIndex % LOADING_TIPS.en.length]}
                            </p>
                        </div>
                    )}
                </div>
            ) : !selectedChapter && !trainingContent ? (
                <div className="neo-brutal animate-fade-in-up text-slate-900">
                    <div className="nb-hazard mb-4" aria-hidden="true" />

                    {gateFocusPending?.lessonId && (
                        <div className={`mx-auto mb-4 max-w-2xl rounded border-2 border-orange-500 bg-orange-50 px-4 py-3 text-center ${language === 'bn' ? 'font-bengali' : ''}`}>
                            <p className="text-sm font-black text-slate-900">
                                {language === 'en'
                                    ? `Hourly quiz locked — opening lesson ${gateFocusPending.lessonId}…`
                                    : `ঘণ্টাভিত্তিক কুইজ লক — পাঠ ${gateFocusPending.lessonId} খোলা হচ্ছে…`}
                            </p>
                        </div>
                    )}

                    {/* Sticky tab row + hourly challenge entry (z-40). Hint stays below in normal flow. */}
                    <div className="sticky top-[6px] z-40 mx-auto mb-6 flex w-full max-w-sm flex-col gap-1.5">
                        <div
                            className={`flex w-full justify-center ${
                                showLifeSkillsHint && trainingTab === 'core'
                                    ? prefersReducedMotion
                                        ? 'p-[2px] ring-2 ring-indigo-600'
                                        : 'animate-lifeskills-hint-glow p-[2px] ring-2 ring-indigo-600'
                                    : ''
                            }`}
                        >
                            <div className="relative flex w-full border-2 border-slate-900 bg-white p-1 shadow-[3px_3px_0_#0f172a]">
                                {showLifeSkillsHint && trainingTab === 'core' && (
                                    <span
                                        className="pointer-events-none absolute right-2 top-0 z-20 -translate-y-1/2 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md dark:bg-indigo-500"
                                        aria-hidden
                                    >
                                        {language === 'en' ? (
                                            'New'
                                        ) : (
                                            <>
                                                <span className="font-sans tracking-wide">New</span>
                                                <span className="mx-0.5 opacity-80">·</span>
                                                <span className={language === 'bn' ? 'font-bengali tracking-normal normal-case' : ''}>
                                                    নতুন
                                                </span>
                                            </>
                                        )}
                                    </span>
                                )}
                                <div
                                    className={`absolute inset-y-1 w-[calc(50%-4px)] bg-orange-500 border-2 border-slate-900 transition-all duration-300 ease-out ${trainingTab === 'core' ? 'left-1' : 'left-[calc(50%+2px)]'}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setTrainingTab('core')}
                                    className={`relative z-10 w-1/2 py-2.5 text-xs font-black uppercase tracking-wider nb-mono transition-colors duration-300 ${trainingTab === 'core' ? 'text-white' : 'text-slate-700 hover:text-slate-900'}`}
                                >
                                    {language === 'en' ? 'Training' : 'প্রশিক্ষণ'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTrainingTab('supplementary')}
                                    aria-describedby={showLifeSkillsHint && trainingTab === 'core' ? 'lifeskills-hint-copy' : undefined}
                                    className={`relative z-10 w-1/2 py-2.5 text-xs font-black uppercase tracking-wider nb-mono transition-colors duration-300 ${trainingTab === 'supplementary' ? 'text-white' : 'text-slate-700 hover:text-slate-900'}`}
                                >
                                    {language === 'en' ? 'Life Skill ✨' : 'লাইফ স্কিল ✨'}
                                </button>
                            </div>
                        </div>
                        {trainingTab === 'core' && !trainingLoading && !radioGlobalExpanded && (
                            <div className="flex w-full justify-end pr-0.5">
                                <button
                                    type="button"
                                    onClick={handleHourlyChallengeClick}
                                    className="transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf7]"
                                    title={language === 'en' ? 'Hourly Challenge' : 'প্রতি ঘণ্টার চ্যালেঞ্জ'}
                                    aria-label={language === 'en' ? 'Hourly Challenge' : 'প্রতি ঘণ্টার চ্যালেঞ্জ'}
                                >
                                    <div className="relative">
                                        <div className="h-12 w-12 drop-shadow-lg sm:h-14 sm:w-14">
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
                    </div>
                    {showLifeSkillsHint && trainingTab === 'core' && (
                        <div className="mx-auto mb-6 w-full max-w-sm nb-card border-dashed bg-indigo-50 px-3 py-2.5">
                            <p
                                id="lifeskills-hint-copy"
                                className={`text-center text-[11px] font-semibold leading-snug text-slate-700 ${language === 'bn' ? 'font-bengali' : ''}`}
                            >
                                {language === 'en' ? (
                                    <>
                                        Short modules next to training—tap{' '}
                                        <span className="whitespace-nowrap font-bold text-indigo-700">Life Skill</span>.
                                    </>
                                ) : (
                                    <>
                                        <span className="font-bold text-indigo-700">লাইফ স্কিল</span>
                                        —প্রশিক্ষণের পাশে ছোট মডিউল; ডান দিকের ট্যাবে।
                                    </>
                                )}
                            </p>
                            <div className="mt-2 flex justify-center">
                                <button
                                    type="button"
                                    onClick={dismissLifeSkillsHint}
                                    className={`text-[11px] font-bold text-indigo-700 underline decoration-indigo-500 underline-offset-2 transition-colors hover:text-indigo-900 nb-mono ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {language === 'en' ? 'Got it' : 'বুঝেছি'}
                                </button>
                            </div>
                        </div>
                    )}

                    {trainingTab === 'core' ? (
                        <>
                    {/* Gamified Journey Map Logic */}
                    {(() => {
                        const isMobile = window.innerWidth < 768;
                        const { items: roadmapItems, height: roadmapHeight, maxPath: maxPathIndex, nodeVerticalGap, journeyChapters } = roadmapData;
                        const currentTrainingLevel = calculateLevelFromProgress(completedLessons, trainingChapters);

                        // Main Journey View
                        return (
                            <div className="relative mx-auto max-w-2xl px-4 pb-32 sm:px-2">
                                {/* Header */}
                                <div className="mb-12 px-2 pt-4 md:mb-16">
                                    <h1
                                        className={`text-center text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl ${language === 'bn' ? 'font-bengali' : ''}`}
                                    >
                                        {language === 'en' ? 'Grow your professional knowledge' : 'পেশাগত জ্ঞান বাড়ান'}
                                    </h1>

                                    {/* Index + core step count (same counts as former progress card; no bar / %) */}
                                    {(() => {
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
                                                className="mx-auto mt-6 flex max-w-lg flex-wrap items-center justify-center gap-3 animate-fade-in-up sm:gap-4"
                                                style={{ animationDelay: '120ms' }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLessonIndex(true)}
                                                    className="inline-flex items-center gap-2 nb-btn-secondary px-4 py-2.5 text-[11px] font-black uppercase tracking-widest nb-mono"
                                                >
                                                    <span aria-hidden>📑</span>
                                                    {language === 'en' ? 'Index' : 'সূচীপত্র'}
                                                </button>
                                                {totalLessons > 0 ? (
                                                    <span
                                                        className={`nb-score-pill inline-flex items-center px-4 py-2.5 text-sm font-black tabular-nums ${language === 'bn' ? 'font-bengali' : ''}`}
                                                    >
                                                        {doneStr} / {totalStr}{' '}
                                                        <span className="ml-1 text-[10px] font-black uppercase tracking-wider nb-mono">
                                                            {language === 'en' ? 'steps' : 'ধাপ'}
                                                        </span>
                                                    </span>
                                                ) : null}
                                            </div>
                                        );
                                    })()}
                                </div>

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
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            fill="none"
                                            className="text-slate-200"
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
                                            stroke="#f97316"
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            fill="none"
                                            filter="url(#glow)"
                                            className="opacity-40"
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
                                            return (
                                                <div
                                                    key={`lesson-${item.id}`}
                                                    id={`roadmap-node-${item.id}`}
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
                                                    className={`group absolute z-20 flex h-16 w-16 cursor-pointer flex-col items-center justify-center border-2 transition-all duration-500 sm:h-20 sm:w-20 ${item.isCompleted ? 'border-slate-900 bg-emerald-400 text-slate-900 shadow-[3px_3px_0_#0f172a] hover:-translate-x-0.5 hover:-translate-y-0.5' : item.isUnlocked ? `border-slate-900 ${item.badge.color} text-slate-900 shadow-[3px_3px_0_#0f172a] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5` : 'cursor-not-allowed border-slate-400 bg-slate-200 text-slate-500 opacity-80 shadow-inner grayscale'} ${isNext ? 'animate-float-y border-orange-600 shadow-[4px_4px_0_#ea580c]' : ''}`}
                                                    style={{ left: `${xPos}%`, top: yPos, transform: 'translate(-50%, -50%)' }}
                                                >
                                                    <span className={`text-base sm:text-lg font-black ${language === 'bn' ? 'font-bengali' : ''}`}>{toBengaliNumber(item.id, language)}</span>
                                                    <div className={`pointer-events-none absolute top-full z-50 mt-3 w-32 border-2 border-slate-900 bg-slate-900 px-3 py-2 text-center text-[10px] font-bold text-white opacity-0 shadow-[2px_2px_0_#0f172a] transition-opacity group-hover:opacity-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                        {item.isCompleted ? (
                                                            language === 'en' ? 'Read Again' : 'আবার পড়ুন'
                                                        ) : item.isUnlocked ? (
                                                            language === 'en' ? 'Quick Read' : 'দ্রুত পড়ুন'
                                                        ) : (
                                                            language === 'en' ? 'Not so fast! 🔒' : 'ধৈর্য ধরুন! 🔒'
                                                        )}
                                                    </div>
                                                    {item.isCompleted && (
                                                        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center border-2 border-slate-900 bg-emerald-500 text-white shadow-[2px_2px_0_#0f172a]">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
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
                            className="nb-card w-full bg-white p-4 text-left transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 sm:p-5 lg:p-6"
                        >
                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="nb-icon-badge flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center bg-teal-100 text-4xl text-teal-800 sm:h-20 sm:w-20 sm:text-5xl">
                                    🧰
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <h2 className={`text-lg font-black leading-tight tracking-tight text-slate-900 sm:text-xl lg:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Know More' : 'আরো জানুন'}
                                    </h2>
                                    <span className="nb-btn-secondary inline-flex w-fit shrink-0 items-center gap-2 self-start px-4 py-2 text-[10px] font-black uppercase tracking-wider nb-mono sm:self-center">
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
                            className="nb-btn-primary w-full p-4 text-left transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 sm:p-5 lg:p-6"
                        >
                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="nb-icon-badge flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center bg-white/25 text-4xl sm:h-20 sm:w-20 sm:text-5xl">
                                    📺
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <h2 className={`text-lg font-black leading-tight tracking-tight sm:text-xl lg:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Video Learning Library' : 'ভিডিও লার্নিং লাইব্রেরি'}
                                    </h2>
                                    <span className="nb-btn-secondary inline-flex w-fit shrink-0 items-center gap-2 self-start px-4 py-2 text-[10px] font-black uppercase tracking-wider nb-mono sm:self-center">
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
                            className="nb-btn-indigo w-full p-4 text-left transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 sm:p-5 lg:p-6"
                        >
                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="nb-icon-badge flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center bg-white/25 text-4xl sm:h-20 sm:w-20 sm:text-5xl">
                                    💡
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                    <h2 className={`text-lg font-black leading-tight tracking-tight sm:text-xl lg:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Quick Help & FAQ' : 'কি, কেন?, কিভাবে?'}
                                    </h2>
                                    <span className="nb-btn-secondary inline-flex w-fit shrink-0 items-center gap-2 self-start px-4 py-2 text-[10px] font-black uppercase tracking-wider nb-mono sm:self-center">
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
                        <div className="relative z-10 mb-32 mt-20 animate-fade-in-up text-center">
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
                    </>
                    ) : (
                        <>
                            <header className="mx-auto mb-8 max-w-2xl px-4 pt-1 text-center sm:mb-10 sm:pt-2 md:mb-12">
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
                            <div className="mx-auto mb-20 grid max-w-7xl animate-fade-in-up grid-cols-1 gap-4 px-2 py-4 min-[420px]:grid-cols-2 sm:mb-28 sm:gap-5 sm:py-6 md:grid-cols-3 lg:mb-32">
                            {supplementaryModules.map((module, moduleIndex) => {
                                const isCompleted = suppCompleted.includes(module.id);
                                const cardTitle = language === 'en' ? module.title_en : module.title_bn;
                                return (
                                    <button
                                        key={module.id}
                                        type="button"
                                        onClick={() => openLifeSkillModule(module, moduleIndex)}
                                        className={`group relative aspect-[3/4] w-full max-h-[280px] overflow-hidden border-2 border-slate-900 bg-white text-left shadow-[4px_4px_0_#0f172a] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf7] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 sm:max-h-[320px] md:aspect-[4/5] md:max-h-[360px] ${
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

                                        {isCompleted && (
                                            <div
                                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-emerald-500 text-white shadow-[2px_2px_0_#0f172a] sm:right-3 sm:top-3 sm:h-9 sm:w-9"
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
                        </>
                    )}
                </div>
            ) : selectedLesson ? (
                /* Full Screen Lesson Preview Overlay */
                <div className="neo-brutal fixed inset-0 z-[200] flex animate-slide-up-sheet flex-col overflow-hidden bg-[#fffdf7]">
                    <div className={`absolute inset-0 ${selectedLesson.badge?.color || 'bg-orange-500'} opacity-[0.06]`} />

                    <div className="relative z-10 flex h-full flex-col safe-area-inset-top safe-area-inset-bottom">
                        <header className="sticky top-0 z-20 border-b-2 border-slate-900 bg-white">
                            <div className="nb-hazard" aria-hidden="true" />
                            <div className="relative flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
                                <div className="relative z-10">
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
                                        className="nb-btn-secondary inline-flex items-center gap-2 px-3 py-2 text-sm font-bold"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        <span className="hidden sm:inline">{language === 'en' ? 'Back' : 'ফিরে যান'}</span>
                                    </button>
                                </div>

                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-16 sm:px-24">
                                    <h1 className={`truncate text-base font-black text-slate-900 sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {selectedLesson.chapter?.title || selectedLesson.level_title}
                                    </h1>
                                </div>

                                <div className="relative z-10 w-10">
                                    {/* Spacer for right side if needed, otherwise empty */}
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto">
                            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-between px-4 sm:px-6 lg:px-8 pt-8 pb-32 sm:pt-10 sm:pb-32">
                                <div className="space-y-8 sm:space-y-10">
                                    <div className="flex justify-center">
                                        <div className="relative">
                                            <div className={`flex h-22 w-22 items-center justify-center border-2 border-slate-900 text-4xl text-slate-900 shadow-[4px_4px_0_#0f172a] sm:h-28 sm:w-28 sm:text-5xl ${selectedLesson.badge?.color || 'bg-orange-400'}`}>
                                                📖
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 text-center">
                                        <div className="flex items-center justify-center gap-2 text-slate-500">
                                            <div className="h-0.5 w-10 bg-slate-900" />
                                            <span className={`text-xs font-black uppercase tracking-[0.28em] nb-mono ${language === 'bn' ? 'font-bengali tracking-normal' : ''}`}>
                                                {language === 'en' ? 'Chapter Status' : 'পদমর্যাদা'}
                                            </span>
                                            <div className="h-0.5 w-10 bg-slate-900" />
                                        </div>
                                        <h2 className={`text-2xl font-black leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                            {language === 'en' ? selectedLesson.badge?.en : selectedLesson.badge?.bn}
                                        </h2>
                                    </div>

                                    <div className="nb-card mx-auto max-w-2xl bg-white px-5 py-6 sm:px-8 sm:py-8">
                                        <p className={`text-center text-sm font-black uppercase tracking-[0.3em] text-slate-500 nb-mono sm:text-base ${language === 'bn' ? 'font-bengali tracking-normal' : ''}`}>
                                            {language === 'en' ? 'Lesson' : 'পাঠ'} {toBengaliNumber(selectedLesson.level_id || `${selectedLesson.chapterNum}.${selectedLesson.subchapterNum}`, language)}
                                        </p>
                                        <p className={`mt-3 text-center text-2xl font-black leading-tight text-slate-900 sm:text-4xl ${language === 'bn' ? 'font-bengali leading-[1.45]' : ''}`}>
                                            {selectedLesson.level_title}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-8 sm:pt-10">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            stopChapterAudio();
                                            setTrainingContent(selectedLesson);
                                            setActiveSectionIndex(0);
                                            setIsJournalMode(true);
                                            setSelectedLesson(null);
                                        }}
                                        className="nb-btn-primary mx-auto flex w-full items-center justify-center gap-3 px-6 py-4 sm:w-auto sm:min-w-[280px] sm:px-8 sm:py-5"
                                    >
                                        <span className="text-base sm:text-lg font-black">
                                            {language === 'en' ? 'Start Reading' : 'পড়া শুরু করুন'}
                                        </span>
                                        <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : selectedChapter && !trainingContent ? (
                /* Subchapter List View or FAQ View */
                <div className="neo-brutal text-slate-900">
                    <button
                        type="button"
                        onClick={() => setSelectedChapter(null)}
                        className="nb-btn-secondary mb-6 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold"
                    >
                        ← {language === 'en' ? 'Back to Chapters' : 'অধ্যায়ে ফিরে যান'}
                    </button>

                    {selectedChapter.isFAQ ? (
                        /* Redesigned FAQ View */
                        <div className="animate-fade-in space-y-6">
                            <div className="nb-card relative mb-8 overflow-hidden bg-indigo-50 p-6 sm:p-8">
                                <div className="relative z-10">
                                    <h2 className="mb-2 text-3xl font-black tracking-tight text-slate-900">
                                        {selectedChapter.content.title}
                                    </h2>
                                    <p className="mb-8 font-bold text-slate-600">
                                        {selectedChapter.content.subtitle}
                                    </p>

                                    {/* Modernized Search Input */}
                                    <div className="relative group max-w-2xl">
                                        <div className="relative flex items-center overflow-hidden border-2 border-slate-900 bg-white shadow-[3px_3px_0_#0f172a] transition-all group-focus-within:shadow-[4px_4px_0_#0f172a]">
                                            <div className="pl-5 text-indigo-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={language === 'en' ? 'Search topics, questions, or tags...' : 'বিষয়, প্রশ্ন বা ট্যাগ খুঁজুন...'}
                                                value={faqSearchQuery}
                                                onChange={(e) => setFaqSearchQuery(e.target.value)}
                                                className={`nb-input w-full border-0 bg-transparent px-4 py-4 font-bold shadow-none outline-none ${language === 'bn' ? 'font-bengali text-lg' : ''}`}
                                            />
                                            {faqSearchQuery && (
                                                <button
                                                    onClick={() => setFaqSearchQuery('')}
                                                    className="pr-4 text-slate-400 hover:text-violet-500 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Keyword Discovery Hub - Innovative Ribbon Layout */}
                                    <div className="mt-8">
                                        <div className="flex items-center justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="pl-2 text-[10px] font-black uppercase tracking-widest text-indigo-700 nb-mono">Popular Keywords</span>
                                                <div className="h-2 w-2 animate-pulse bg-indigo-500" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsFaqTagsExpanded(!isFaqTagsExpanded)}
                                                className="nb-btn-secondary flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest nb-mono"
                                            >
                                                {isFaqTagsExpanded ? (
                                                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" /></svg> Collapse</>
                                                ) : (
                                                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg> View All</>
                                                )}
                                            </button>
                                        </div>

                                        <div className={`relative ${!isFaqTagsExpanded ? 'after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-full after:w-20 after:bg-gradient-to-l after:from-indigo-50 after:to-transparent' : ''}`}>
                                            <div className={`${isFaqTagsExpanded ? 'flex flex-wrap' : 'flex overflow-x-auto scrollbar-hide pb-2 px-1'} gap-2 transition-all duration-500`}>
                                                {Array.from(new Set(selectedChapter.content.questions.flatMap(q => q.tags || []))).sort().map(tag => {
                                                    const isActive = faqSearchQuery.toLowerCase() === tag.toLowerCase();
                                                    return (
                                                        <button
                                                            key={tag}
                                                            onClick={() => setFaqSearchQuery(isActive ? '' : tag)}
                                                            className={`whitespace-nowrap border-2 px-4 py-2 text-xs font-black transition-all duration-300 nb-mono ${isActive
                                                                ? 'border-slate-900 bg-indigo-600 text-white shadow-[2px_2px_0_#0f172a]'
                                                                : 'border-slate-900 bg-white text-slate-700 shadow-[2px_2px_0_#0f172a] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5'
                                                                }`}
                                                        >
                                                            #{tag}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Question List */}
                            <div className="grid gap-4">
                                {selectedChapter.content.questions
                                    .filter(q => {
                                        if (!faqSearchQuery) return true;
                                        const query = faqSearchQuery.toLowerCase();
                                        return (
                                            q.question.toLowerCase().includes(query) ||
                                            q.answer.toLowerCase().includes(query) ||
                                            (q.tags && q.tags.some(tag => tag.toLowerCase().includes(query)))
                                        );
                                    })
                                    .map((q, idx) => {
                                        const isOpen = faqSearchQuery && q.question.toLowerCase().includes(faqSearchQuery.toLowerCase());
                                        return (
                                            <div
                                                key={q.id}
                                                className="nb-card overflow-hidden bg-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                            >
                                                <details
                                                    className="group/details"
                                                    open={isOpen}
                                                >
                                                    <summary className="flex items-center justify-between p-4 sm:p-6 cursor-pointer list-none select-none">
                                                        <div className="flex items-start sm:items-center gap-3 sm:gap-5">
                                                            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center border-2 border-slate-900 bg-indigo-500 text-xs font-black text-white shadow-[2px_2px_0_#0f172a] transition-all duration-500 group-hover/details:scale-105 sm:mt-0 sm:h-12 sm:w-12 sm:text-sm">
                                                                Q{toBengaliNumber(idx + 1, language)}
                                                            </div>
                                                            <span className={`font-black leading-snug text-slate-900 transition-colors group-hover/details:text-indigo-700 ${language === 'bn' ? 'font-bengali text-lg sm:text-xl' : 'text-base sm:text-lg'}`}>
                                                                {q.question}
                                                            </span>
                                                        </div>
                                                        <div className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-slate-600 transition-all duration-500 group-open/details:rotate-180 group-open/details:bg-indigo-600 group-open/details:text-white">
                                                            <svg fill="none" height="20" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                                                        </div>
                                                    </summary>
                                                    <div className="px-4 sm:px-8 pb-6 sm:pb-8 pt-0 sm:pt-2">
                                                        <div className="flex gap-3 sm:gap-5">
                                                            <div className="hidden sm:flex w-12 flex-col items-center shrink-0">
                                                                <div className="w-px h-full bg-gradient-to-b from-violet-200 to-transparent dark:from-violet-800/50"></div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <span className="nb-tag bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] nb-mono">Answer</span>
                                                                    <div className="h-0.5 flex-1 bg-slate-900" />
                                                                </div>

                                                                <div className={`leading-relaxed text-slate-700 ${language === 'bn' ? 'font-bengali text-lg' : 'font-medium'}`}>
                                                                    {renderTextWithImages(q.answer)}
                                                                </div>

                                                                {q.image && (
                                                                    <div className="mt-6 max-w-full overflow-hidden border-2 border-slate-900 shadow-[3px_3px_0_#0f172a] sm:max-w-lg">
                                                                        <img
                                                                            src={`/quizzes/faq_images/${q.image}`}
                                                                            alt={q.question}
                                                                            className="w-full h-auto object-cover"
                                                                            loading="lazy"
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div className="mt-8 flex flex-wrap gap-2">
                                                                    {q.tags && q.tags.map(tag => (
                                                                        <button
                                                                            key={tag}
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                setFaqSearchQuery(tag);
                                                                            }}
                                                                            className="nb-tag bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all hover:bg-indigo-600 hover:text-white sm:text-[11px] nb-mono"
                                                                        >
                                                                            #{tag}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </details>
                                            </div>
                                        );
                                    })}


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

            <HourlyPenaltyInfoModal
                open={showHourlyPenaltyModal}
                language={language}
                lifetimePoints={hourlyLifetimePoints}
                onClose={closeHourlyPenaltyModalAndGo}
                showDontShowAgain
                dontShowAgain={hourlyPenaltyDontShowAgain}
                onDontShowAgainChange={setHourlyPenaltyDontShowAgain}
            />

            <ReadingGateModal
                block={readingGateBlock}
                language={language}
                onClose={() => setReadingGateBlock(null)}
                setCurrentView={setCurrentView}
            />

            {showDailyBrief && trainingTab === 'core' && !trainingLoading && !showOnboarding && !selectedChapter && !trainingContent && createPortal(
                <div
                    className="fixed inset-0 z-[118] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-fade-in"
                    onClick={dismissDailyBrief}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="training-welcome-title"
                        className="neo-brutal relative w-full max-w-sm animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="nb-card overflow-hidden bg-[#fffdf7] p-0 shadow-[4px_4px_0_#0f172a]">
                            <div className="nb-hazard" aria-hidden="true" />
                            <div className="relative px-5 pb-5 pt-4">
                                <button
                                    type="button"
                                    onClick={dismissDailyBrief}
                                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-white text-sm font-black text-slate-700 shadow-[2px_2px_0_#0f172a] hover:bg-slate-50"
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
                                    <p className={`mt-2 inline-flex rounded border border-slate-900 bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {lessonProgressWelcome.secondary}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={dismissDailyBrief}
                                    className={`nb-btn-primary mt-4 w-full py-2.5 text-sm font-black ${language === 'bn' ? 'font-bengali' : ''}`}
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
                    <div className="neo-brutal relative w-full max-w-md animate-scale-in" role="dialog" aria-modal="true">
                        <div className="nb-card overflow-hidden bg-[#fffdf7] p-0">
                            <div className="nb-hazard" aria-hidden="true" />
                            <div className="relative p-6 sm:p-7">
                            <div className="nb-icon-badge mx-auto mb-5 flex h-16 w-16 items-center justify-center bg-orange-100 text-3xl text-orange-700">
                                🔒
                            </div>

                            <div className="space-y-3 text-center">
                                <div className="nb-tag inline-flex items-center bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] nb-mono">
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

                                <div className="nb-card mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-2 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                                    <span className="nb-tag bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700">
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
                                    className="nb-btn-primary w-full px-4 py-3.5 font-bold"
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

            {lifeSkillWaitUi &&
                createPortal(
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-live="polite"
                        aria-labelledby="lifeskill-wait-headline"
                        className="fixed inset-0 z-[215] flex animate-fade-in items-center justify-center bg-slate-900/55 p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                clearLifeSkillWaitTimers();
                                setLifeSkillWaitUi(null);
                            }
                        }}
                    >
                        <div className="neo-brutal relative w-full max-w-sm animate-scale-in">
                            <div className="nb-card overflow-hidden bg-[#fffdf7] p-0">
                                <div className="nb-hazard" aria-hidden="true" />
                                <div className="relative space-y-4 p-6 text-center sm:p-7">
                                <p
                                    id="lifeskill-wait-headline"
                                    className={`line-clamp-3 text-base font-black leading-snug text-slate-900 sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {lifeSkillWaitUi.cardTitle}
                                </p>
                                <p className="text-5xl font-black tabular-nums text-indigo-700 sm:text-6xl">
                                    {language === 'en'
                                        ? lifeSkillWaitUi.secondsLeft
                                        : toBengaliNumber(lifeSkillWaitUi.secondsLeft, 'bn')}
                                </p>
                                <div className={`space-y-3 text-left text-sm leading-relaxed text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {language === 'en' ? (
                                        <>
                                            <p>
                                                Your main training badge:{' '}
                                                <span className="font-black text-indigo-700">
                                                    {lifeSkillWaitUi.currentBadgeEn}
                                                </span>
                                                .
                                            </p>
                                            <p>
                                                To read or listen to life skills alongside, you will need to reach the{' '}
                                                <span className="font-black text-slate-900">
                                                    {TECHNICIAN_BADGE.en}
                                                </span>{' '}
                                                badge. Please wait{' '}
                                                <span className="font-black text-indigo-700">
                                                    {lifeSkillWaitUi.secondsLeft}s
                                                </span>
                                                . After you finish through lesson{' '}
                                                <span className="font-black">3.10</span> on the main path, there is no
                                                wait.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p>
                                                মূল পাঠে এখন আপনার ব্যাজ{' '}
                                                <span className="font-black text-indigo-700">
                                                    {lifeSkillWaitUi.currentBadgeBn}
                                                </span>
                                                । লাইফ স্কিল একসঙ্গে দেখতে বা শুনতে{' '}
                                                <span className="font-black text-slate-900">
                                                    {TECHNICIAN_BADGE.bn}
                                                </span>{' '}
                                                ব্যাজে যেতে হবে।
                                            </p>
                                            <p>
                                                <span className="font-black text-indigo-700">
                                                    {toBengaliNumber(lifeSkillWaitUi.secondsLeft, 'bn')}
                                                </span>{' '}
                                                সেকেন্ড অপেক্ষা করুন। মূল পাঠের{' '}
                                                <span className="font-black">৩.১০</span> পর্যন্ত শেষ করলে আর অপেক্ষা
                                                করতে হবে না।
                                            </p>
                                        </>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearLifeSkillWaitTimers();
                                        setLifeSkillWaitUi(null);
                                    }}
                                    className="nb-btn-secondary w-full px-4 py-3 text-sm font-bold"
                                >
                                    {language === 'en' ? 'Cancel' : 'বাতিল'}
                                </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {/* Safety Journal UI - Immersive Slide-based Experience */}
            {
                trainingContent && createPortal(
                    <div className="neo-brutal fixed inset-x-0 bottom-0 top-0 z-[120] flex animate-fade-in-up flex-col overflow-hidden bg-[#fffdf7] md:top-14 lg:inset-x-0 lg:bottom-6 lg:top-16 lg:mx-auto lg:w-[1000px] lg:max-w-[95vw] lg:border-2 lg:border-slate-900 lg:shadow-[8px_8px_0_#0f172a]">
                        {/* Desktop Backdrop Overlay */}
                        <div className="hidden lg:block fixed inset-0 -z-10 bg-slate-900/40" onClick={() => {
                            if (gateFocusPending?.lessonId) {
                                notifyGateFocusRequired();
                                return;
                            }
                            stop();
                            setTrainingContent(null);
                            setIsJournalMode(false);
                            setSelectedChapter(null);
                            setSelectedLesson(null);
                        }} />
                        <div className="relative flex h-full flex-col overflow-hidden">
                            {/* Simple Book-like Header */}
                            <div className="sticky top-0 z-[100] border-b-2 border-slate-900 bg-white">
                                <div className="nb-hazard" aria-hidden="true" />
                                <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-5 py-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (gateFocusPending?.lessonId) {
                                                notifyGateFocusRequired();
                                                return;
                                            }
                                            stop();
                                            setTrainingContent(null);
                                            setIsJournalMode(false);
                                            setSelectedChapter(null);
                                            setSelectedLesson(null);
                                        }}
                                        className="flex h-10 w-10 items-center justify-center border-2 border-slate-900 bg-white text-slate-700 shadow-[2px_2px_0_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>

                                    <div className="mx-4 min-w-0 flex-1 text-center">
                                        {gateFocusPending?.lessonId && (
                                            <p className={`mb-0.5 truncate text-[10px] font-black uppercase tracking-wide text-orange-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                {language === 'en'
                                                    ? 'Complete this lesson to unlock hourly quiz'
                                                    : 'ঘণ্টাভিত্তিক কুইজ খুলতে এই পাঠ শেষ করুন'}
                                            </p>
                                        )}
                                        <h2 className={`truncate text-xs font-bold uppercase tracking-[0.2em] text-slate-500 nb-mono ${language === 'bn' ? 'font-bengali tracking-normal' : ''}`}>
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
                                                    className={`relative flex h-10 w-10 items-center justify-center border-2 border-slate-900 transition-all duration-500 ${
                                                        isLoading ? 'animate-pulse bg-orange-200 text-orange-700 shadow-[2px_2px_0_#0f172a]' :
                                                        isPlaying && !isPaused ? 'bg-orange-500 text-white shadow-[2px_2px_0_#0f172a]' :
                                                        'bg-white text-slate-600 shadow-[2px_2px_0_#0f172a] hover:-translate-x-0.5 hover:-translate-y-0.5'
                                                    }`}
                                                >
                                                    <div className={`absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20 ${isPlaying && !isPaused && !isLoading ? 'block' : 'hidden'}`}></div>
                                                    <div className="relative z-10 flex items-center justify-center">
                                                        {isLoading ? (
                                                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : isPlaying && !isPaused ? (
                                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
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

                                {/* Modern Progress Bar */}
                                <div className="relative z-20 h-2 w-full border-t-2 border-slate-900 bg-slate-200">
                                    <div
                                        className="h-full bg-orange-500 transition-all duration-1000 ease-out"
                                        style={{ width: `${((activeSectionIndex + 1) / slides.length) * 100}%` }}
                                    />
                                </div>

                                {trainingContent?.isSupplementary ? (
                                    <div className="max-w-5xl mx-auto w-full px-4 pb-2 pt-1">
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
                                            className={`flex w-full items-center justify-center gap-3 border-2 border-slate-900 py-3.5 text-sm font-black uppercase tracking-wide transition shadow-[3px_3px_0_#0f172a] nb-mono ${
                                                supplementaryRadioSrc
                                                    ? 'nb-btn-indigo hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'cursor-not-allowed bg-slate-200 text-slate-500 opacity-75'
                                            } disabled:cursor-not-allowed disabled:opacity-70`}
                                        >
                                            <span className="text-xl" aria-hidden>
                                                📻
                                            </span>
                                            {language === 'bn' ? 'মনোযোগ দিয়ে শুনুন' : 'Listen (full screen)'}
                                        </button>
                                        {supplementaryRadioSrc ? (
                                            <LessonRadioOverlay
                                                isOpen={supplementaryRadioOverlayOpen}
                                                onClose={() => setSupplementaryRadioOverlayOpen(false)}
                                                src={supplementaryRadioSrc}
                                                language={language}
                                                lessonTitle={trainingContent.level_title}
                                            />
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                            {lessonNavBlockedReason && (
                                <div className="pointer-events-none fixed inset-x-0 top-20 z-[118] flex justify-center px-3 sm:top-24">
                                    <div
                                        role="alert"
                                        aria-live="assertive"
                                        className={`training-advance-block-alert pointer-events-auto flex max-w-[min(20rem,92vw)] items-start gap-2.5 rounded-lg border-2 border-amber-600 bg-amber-50 px-3 py-2 shadow-[0_8px_30px_rgba(217,119,6,0.35)] ring-2 ring-amber-500/60 dark:border-amber-500 dark:bg-amber-950 dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)] dark:ring-amber-400/40 ${language === 'bn' ? 'font-bengali' : ''}`}
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
                            <div className="relative flex min-h-0 flex-1 flex-col">
                            {(() => {
                                const activeSlide = slides[activeSectionIndex];
                                const sectionPoints =
                                    activeSlide?.type === 'section' ? activeSlide.points ?? [] : [];
                                const isSupplementaryCompletion =
                                    activeSlide?.type === 'completion' && trainingContent?.isSupplementary;
                                return (
                                    <div
                                        ref={lessonScrollRef}
                                        className={`relative flex-1 scroll-smooth transition-colors duration-700 ${
                                            isSupplementaryCompletion
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
                                            className={`max-w-4xl mx-auto animate-fade-in-up relative px-4 sm:px-10 md:px-14 ${
                                                isSupplementaryCompletion
                                                    ? 'flex h-full min-h-0 flex-col items-center overflow-hidden py-3 pb-4 sm:py-8 sm:pb-10'
                                                    : 'px-6 py-10 pb-8 sm:py-14 sm:pb-10'
                                            }`}
                                        >
                                            {activeSlide?.type === 'hero' && (
                                                <div className="flex flex-col items-center justify-center pt-6 pb-20 space-y-12">
                                                    <div className="w-full space-y-8 text-center">
                                                        <div className="space-y-4">
                                                            <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-500 nb-mono">
                                                                {language === 'en'
                                                                    ? `Lesson ${getTrainingHeaderLessonCode(trainingContent, language)}`
                                                                    : `পাঠ ${getTrainingHeaderLessonCode(trainingContent, language)}`}
                                                            </p>
                                                            <div className="mx-auto h-0.5 w-24 bg-slate-900"></div>
                                                        </div>

                                                        <h1 className={`px-4 text-3xl font-black leading-snug tracking-tight text-slate-900 md:text-5xl ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                                            {trainingContent.level_title}
                                                        </h1>
                                                    </div>

                                                    <div className="max-w-md w-full relative">
                                                        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800/30 blur-2xl -z-10 rounded-full"></div>
                                                        <p className={`px-4 text-center text-lg font-medium not-italic leading-[2] text-slate-800 ${language === 'bn' ? 'font-bengali text-[1.35rem] leading-[2.2]' : ''}`}>
                                                            {renderTextWithImages(trainingContent.mission_briefing)}
                                                        </p>
                                                    </div>

                                                    <div className="pt-10 pb-6">
                                                        <p className={`mx-auto max-w-sm text-center text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                            {language === 'en'
                                                                ? 'Use the side arrows or swipe to go to the next part.'
                                                                : 'পরের অংশে যেতে পাশের তীর চাপুন অথবা সোয়াইপ করুন।'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {activeSlide?.type === 'section' && (
                                                <article className="space-y-5 sm:space-y-7">
                                                    <header className="nb-card relative mb-2 overflow-hidden bg-orange-50 px-4 py-6 sm:mb-3 sm:px-6 sm:py-8">
                                                        <p className={`mb-1.5 text-center font-black text-orange-700 ${language === 'bn' ? 'font-bengali text-xs tracking-normal' : 'text-[10px] uppercase tracking-[0.28em] nb-mono'}`}>
                                                            {language === 'en' ? 'In this part' : 'এই অংশে'}
                                                        </p>
                                                        <h3 className={`text-center text-2xl font-black leading-snug tracking-tight text-slate-900 sm:text-3xl md:text-4xl ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                                            {activeSlide.title}
                                                        </h3>
                                                    </header>

                                                    {sectionReaderMode === 'overview' && sectionPoints.length > 0 && (
                                                        <div className="sticky top-0 z-20 -mx-2 mb-3 flex justify-center border-b-2 border-slate-900 bg-[#fffdf7] px-2 py-2 sm:-mx-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSectionTickDetailIndex(null);
                                                                    setSectionReaderMode('guided');
                                                                    requestAnimationFrame(() => {
                                                                        lessonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                                                                    });
                                                                }}
                                                                className={`nb-btn-secondary px-3 py-1.5 text-[11px] font-bold ${language === 'bn' ? 'font-bengali' : 'nb-mono'}`}
                                                            >
                                                                {language === 'en' ? '← Step-by-step' : '← ধাপে ধাপে'}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {sectionPoints.length > 0 && sectionReaderMode === 'guided' && sectionGuidedStepDone < sectionPoints.length && (
                                                        <>
                                                            <div
                                                                className="sticky top-0 z-20 -mx-2 mb-2 border-b-2 border-slate-900 bg-[#fffdf7] px-2 py-2 sm:-mx-4 sm:px-3"
                                                                aria-label={
                                                                    language === 'en'
                                                                        ? `Step ${sectionGuidedStepDone + 1} of ${sectionPoints.length}`
                                                                        : `ধাপ ${toBengaliNumber(sectionGuidedStepDone + 1, language)} / ${toBengaliNumber(sectionPoints.length, language)}`
                                                                }
                                                            >
                                                                <div className="flex items-center gap-2 px-0.5">
                                                                    <div className="flex h-1.5 min-w-0 flex-1 gap-1">
                                                                        {sectionPoints.map((_, i) => (
                                                                            <div
                                                                                key={i}
                                                                                className={`h-full min-w-0 flex-1 ${i < sectionGuidedStepDone ? 'bg-emerald-500' : i === sectionGuidedStepDone ? 'bg-orange-500' : 'bg-slate-200'}`}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-600 dark:text-slate-400 sm:text-[11px]">
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
                                                                                className="flex items-start gap-3 border-2 border-slate-900 bg-emerald-50 px-4 py-3.5 shadow-[2px_2px_0_#0f172a]"
                                                                            >
                                                                                <span className="shrink-0 text-lg text-emerald-700" aria-hidden>✓</span>
                                                                                <h4 className={`min-w-0 flex-1 text-left text-sm font-bold leading-snug text-emerald-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
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
                                                                            className="border-2 border-dashed border-slate-400 bg-slate-100 px-4 py-4"
                                                                        >
                                                                            <div className="flex items-start gap-3">
                                                                                <span className="shrink-0 text-base text-slate-400 dark:text-slate-500" aria-hidden>🔒</span>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <h4 className={`text-sm font-bold leading-snug text-slate-500 line-clamp-3 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
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
                                                                    <div className="sticky top-0 z-10 -mx-1 mb-1 border-b border-emerald-200/80 bg-[#fcfaf2]/98 px-1 py-2.5 backdrop-blur-md dark:border-emerald-900/45 dark:bg-slate-900/95 sm:-mx-2 sm:px-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSectionTickDetailIndex(null);
                                                                                requestAnimationFrame(() => {
                                                                                    lessonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                                                                                });
                                                                            }}
                                                                            className={`inline-flex items-center gap-2 rounded-xl border border-emerald-300/90 bg-white px-3 py-2 text-sm font-bold text-emerald-900 shadow-sm transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-800 dark:text-emerald-100 dark:hover:bg-slate-700 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                        >
                                                                            <span aria-hidden>←</span>
                                                                            {language === 'en' ? 'Back to list' : 'তালিকায় ফিরুন'}
                                                                        </button>
                                                                    </div>
                                                                    <div className="mx-auto max-w-[40rem] rounded-2xl border border-emerald-200/40 bg-white/90 px-3 py-4 shadow-sm dark:border-emerald-900/35 dark:bg-slate-900/75 sm:px-5 sm:py-6 md:px-7 md:py-8">
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
                                                                            className={`flex w-full items-start gap-3 border-2 border-slate-900 bg-emerald-50 px-4 py-3 text-left shadow-[2px_2px_0_#0f172a] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 sm:py-3.5 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                        >
                                                                            <span className="shrink-0 text-lg text-emerald-600 dark:text-emerald-400" aria-hidden>
                                                                                ✓
                                                                            </span>
                                                                            <span className="min-w-0 flex-1">
                                                                                <span className="block text-sm font-bold leading-snug text-emerald-900 dark:text-emerald-100">
                                                                                    {point.item_name}
                                                                                </span>
                                                                                <span className="mt-0.5 block text-[11px] font-medium text-emerald-800/75 dark:text-emerald-200/80">
                                                                                    {language === 'en' ? 'Tap to read' : 'ট্যাপ করে পড়ুন'}
                                                                                </span>
                                                                            </span>
                                                                            <span className="shrink-0 self-center text-emerald-600/70 dark:text-emerald-400/80" aria-hidden>
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
                                                                            className={`text-[11px] font-semibold text-emerald-800 underline decoration-emerald-600/60 underline-offset-2 hover:text-emerald-600 dark:text-emerald-200 dark:hover:text-emerald-100 ${language === 'bn' ? 'font-bengali' : ''}`}
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
                                                <div className="space-y-16 py-10">
                                                    <header className="text-center mb-8">
                                                        <h3 className={`text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                            {language === 'en' ? activeSlide.title : 'মনে রাখবেন'}
                                                        </h3>
                                                    </header>

                                                    <div className="grid grid-cols-1 gap-8">
                                                        {activeSlide.content?.map((tip, idx) => (
                                                            <div key={idx} className="nb-card relative overflow-hidden border-emerald-200 bg-emerald-50 p-8">
                                                                <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
                                                                <p className={`text-lg font-medium leading-[1.9] text-slate-800 sm:text-xl md:text-2xl ${language === 'bn' ? 'font-bengali text-xl leading-[2.1] sm:text-2xl md:text-[1.7rem]' : ''}`}>
                                                                    {renderTextWithImages(tip)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSlide?.type === 'myth_buster' && (
                                                <div className="space-y-16 py-10">
                                                    <header className="text-center mb-8">
                                                        <h3 className={`text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
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

                                                    <div className="space-y-12">
                                                        {activeSlide.myths?.map((item, idx) => (
                                                            <div key={idx} className="space-y-4">
                                                                <div className="nb-card border-rose-200 bg-rose-50 p-4 sm:p-6 md:p-8">
                                                                    <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-rose-600 nb-mono sm:mb-3">
                                                                        {language === 'en' ? 'Perspective' : 'ভুল ধারণা'}
                                                                    </span>
                                                                    <p className={`text-sm font-medium italic leading-[1.65] text-slate-700 sm:text-lg sm:leading-[1.9] md:text-xl ${language === 'bn' ? 'font-bengali sm:text-xl sm:leading-[2.1] md:text-2xl' : ''}`}>
                                                                        {renderTextWithImages(item.myth)}
                                                                    </p>
                                                                </div>

                                                                <div className="nb-card border-emerald-200 bg-emerald-50 p-4 sm:p-6 md:p-8">
                                                                    <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-emerald-600 nb-mono sm:mb-3">
                                                                        {language === 'en' ? 'Verdict' : 'আসল কথা'}
                                                                    </span>
                                                                    <div className={`text-sm font-bold leading-[1.65] text-slate-900 sm:text-lg sm:leading-[1.9] md:text-xl ${language === 'bn' ? 'font-bengali sm:text-xl sm:leading-[2.1] md:text-2xl' : ''}`}>
                                                                        {renderTextWithImages(item.reality || item.fact)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSlide?.type === 'advanced' && (
                                                <div className="space-y-16 py-10">
                                                    <header className="mb-8 text-center">
                                                        <h3 className={`text-2xl font-black text-slate-800 dark:text-slate-100 sm:text-3xl md:text-4xl ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                                            {activeSlide.title}
                                                        </h3>
                                                    </header>

                                                    <div className="grid grid-cols-1 gap-6 sm:gap-8">
                                                        {activeSlide.facts?.map((fact, idx) => (
                                                            <div key={idx} className="group">
                                                                <h4 className={`mb-4 flex items-center gap-3 text-lg font-black text-indigo-600 dark:text-indigo-400 sm:mb-5 sm:text-2xl md:text-3xl ${language === 'bn' ? 'font-bengali leading-[1.45]' : ''}`}>
                                                                    <div className="h-2 w-2 shrink-0 rounded-full bg-indigo-500"></div>
                                                                    {fact.title}
                                                                </h4>
                                                                <div className="nb-card border-indigo-200 bg-indigo-50 p-5 sm:p-8">
                                                                    <p className={`text-sm font-medium leading-[1.7] text-slate-800 sm:text-lg sm:leading-[1.9] md:text-xl ${language === 'bn' ? 'font-bengali leading-[1.85] sm:text-xl sm:leading-[2.1]' : ''}`}>
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
                                                    className={`mx-auto flex w-full max-w-sm flex-col items-center text-center animate-fade-in sm:max-w-md ${
                                                        trainingContent.isSupplementary
                                                            ? 'justify-center gap-0 py-1 sm:py-2'
                                                            : 'justify-center px-3 py-6 sm:px-4 sm:py-10'
                                                    }`}
                                                >
                                                    {trainingContent.isSupplementary ? (
                                                        <div className="animate-fade-in-up flex w-full max-w-[19rem] flex-col items-center gap-4 sm:max-w-md sm:gap-5">
                                                            <div className="relative mx-auto flex h-20 w-20 shrink-0 items-center justify-center sm:h-28 sm:w-28">
                                                                <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl sm:blur-3xl"></div>
                                                                <div className="relative text-4xl drop-shadow-sm sm:text-5xl" aria-hidden>
                                                                    ✨
                                                                </div>
                                                            </div>
                                                            <div className="w-full space-y-1.5 sm:space-y-2">
                                                                <h3
                                                                    className={`text-lg font-black leading-snug text-slate-800 dark:text-white sm:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}
                                                                >
                                                                    {language === 'en' ? 'Deep Insight Gained' : 'নতুন কিছু শিখলেন'}
                                                                </h3>
                                                                <p
                                                                    className={`text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm ${language === 'bn' ? 'font-bengali sm:text-base' : ''}`}
                                                                >
                                                                    {language === 'en'
                                                                        ? 'Taking care of yourself is as important as any technical skill. Well done.'
                                                                        : 'নিজের যত্ন নেওয়া যে কোনো কারিগরি দক্ষতার মতোই জরুরি। দারুণ কাজ করেছেন!'}
                                                                </p>
                                                            </div>
                                                            <div className="mx-auto h-px w-10 bg-slate-100 dark:bg-slate-800 sm:w-16"></div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    stop();
                                                                    setTrainingContent(null);
                                                                    setIsJournalMode(false);
                                                                    setTrainingTab('supplementary');
                                                                }}
                                                                className="nb-btn-secondary mx-auto flex min-h-[3rem] w-full max-w-[17.5rem] items-center justify-center gap-2 px-4 py-3 text-sm font-bold sm:max-w-xs sm:min-h-[2.75rem] sm:text-base"
                                                            >
                                                                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 19l-7-7 7-7" />
                                                                </svg>
                                                                <span className={language === 'bn' ? 'font-bengali' : ''}>
                                                                    {language === 'en' ? 'Back to training' : 'প্রশিক্ষণে ফিরুন'}
                                                                </span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="relative mx-auto mb-5 h-[min(32vh,13.5rem)] w-[min(32vh,13.5rem)] max-w-[min(85vw,13.5rem)] shrink-0 sm:mb-8 sm:h-56 sm:w-56 sm:max-w-none">
                                                                <div className="absolute inset-0 rounded-full bg-orange-500/5 blur-3xl dark:bg-orange-500/5 sm:blur-[60px]"></div>
                                                                {prefersReducedMotion ? (
                                                                    <div className="relative z-10 flex h-full w-full items-center justify-center text-6xl sm:text-8xl" aria-hidden>
                                                                        ✅
                                                                    </div>
                                                                ) : (
                                                                    <DotLottiePlayer
                                                                        src={readingLottie}
                                                                        autoplay
                                                                        loop
                                                                        className="relative z-10 h-full w-full object-contain grayscale-[0.3] transition-all duration-700 hover:grayscale-0"
                                                                    />
                                                                )}
                                                            </div>

                                                            <div className="mb-6 w-full space-y-3 sm:mb-10 sm:space-y-4">
                                                                <h3 className={`text-2xl font-black text-slate-800 dark:text-white sm:text-3xl md:text-4xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                    {language === 'en' ? `Mission Complete` : `মিশন সম্পন্ন`}
                                                                </h3>
                                                                <div className="mx-auto h-px w-16 bg-slate-200 dark:bg-slate-800"></div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {!trainingContent.isSupplementary ? (
                                                        <div className="w-full max-w-full space-y-4 sm:space-y-6">
                                                            <button
                                                                type="button"
                                                                onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                                                className="nb-btn-primary flex w-full items-center justify-center gap-3 py-4 text-lg font-black sm:py-5 sm:text-xl"
                                                            >
                                                                {language === 'en' ? 'Start Challenge' : 'চ্যালেঞ্জ শুরু করুন'}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setTrainingContent(null);
                                                                    setSelectedChapter(null);
                                                                    setIsJournalMode(false);
                                                                }}
                                                                className="group flex w-full flex-col items-center gap-2 py-3 sm:py-4"
                                                            >
                                                                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 transition-all group-hover:border-slate-400 dark:border-slate-800 dark:group-hover:border-slate-500">
                                                                    <svg className="h-5 w-5 text-slate-400 group-hover:text-slate-600 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                                                                    </svg>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    ) : null}
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
                                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white/90 text-slate-700 shadow-md backdrop-blur-sm transition-all sm:h-11 sm:w-11 ${
                                                isFirstSlide
                                                    ? 'pointer-events-none border-transparent opacity-0'
                                                    : 'border-slate-900 hover:-translate-x-0.5 active:translate-x-0.5'
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
                                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-md backdrop-blur-sm transition-all sm:h-11 sm:w-11 ${
                                                isNextDisabledByLessonRules
                                                    ? 'cursor-not-allowed border-slate-300 bg-white/70 text-slate-400'
                                                    : 'border-slate-900 bg-orange-500 text-white hover:translate-x-0.5 active:-translate-x-0.5'
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
                                <div className="shrink-0 border-t-2 border-slate-900 bg-white px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-3">
                                    <div className="mx-auto flex max-w-5xl items-center justify-center gap-4">
                                        <p className={`text-xs font-black tabular-nums text-slate-500 nb-mono ${language === 'bn' ? 'font-bengali' : ''}`}>
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
                        onClose={() => setShowQuizModal(false)}
                        onReadAgain={handleReadAgain}
                        questions={currentQuizQuestions}
                        onComplete={handleQuizComplete}
                        chapterTitle={trainingContent?.level_title}
                        lessonId={trainingContent?.level_id}
                        language={language}
                    />,
                    document.body
                )
            }


            {/* Image Preview Modal */}
            {
                activeImageModal && createPortal(
                    <div
                        className="fixed inset-0 z-[400] flex animate-fade-in items-center justify-center bg-slate-900/55 p-4 sm:p-6"
                        onClick={() => setActiveImageModal(null)}
                    >
                        <div
                            className={`neo-brutal relative flex max-h-[min(90vh,900px)] w-full flex-col overflow-hidden animate-scale-in ${
                                activeImageModal.type === 'image' ? 'max-w-5xl' : 'max-w-lg'
                            }`}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="nb-card flex max-h-[min(90vh,900px)] flex-col overflow-hidden bg-[#fffdf7] p-0">
                            <div className="nb-hazard shrink-0" aria-hidden="true" />
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setActiveImageModal(null)}
                                className="absolute right-3 top-3 z-10 border-2 border-slate-900 bg-white p-2 text-slate-900 shadow-[2px_2px_0_#0f172a] sm:right-4 sm:top-4"
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
                showOnboarding && (
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
                <div className="neo-brutal fixed inset-0 z-[120] flex animate-slide-in-right flex-col overflow-hidden bg-[#fffdf7] mobile-safe-area">
                    {/* Header */}
                    <div className="nb-hazard shrink-0" aria-hidden="true" />
                    <div className="flex shrink-0 items-center justify-between border-b-2 border-slate-900 bg-white p-6">
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
                            className="flex h-10 w-10 items-center justify-center border-2 border-slate-900 bg-white text-slate-600 shadow-[2px_2px_0_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable Compact List */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 scrollbar-hide pb-24">
                        {trainingChapters.filter(ch => ch.number !== 10).map((chapter, idx) => {
                            const isExpanded = expandedChapterIndex === idx;
                            const totalLessonsInChapter = chapter.count;
                            const completedInChapter = completedLessons.filter(id => id && id.toString().startsWith(`${chapter.number}.`)).length;
                            const isUnlocked = isLessonUnlocked(chapter.number, 1);
                            
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
                                <div key={chapter.number} className="nb-card animate-entrance-pop overflow-hidden bg-white transition-all duration-300">
                                    {/* Chapter Row */}
                                    <button 
                                        type="button"
                                        onClick={() => setExpandedChapterIndex(isExpanded ? null : idx)}
                                        className={`flex w-full items-center justify-between p-3.5 text-left transition-colors ${
                                            isExpanded ? 'bg-orange-50' : 'bg-white hover:bg-orange-50/50'
                                        }`}
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 border-slate-900 text-[10px] font-black ${
                                                isUnlocked ? 'bg-orange-500 text-white shadow-[2px_2px_0_#0f172a]' : 'bg-slate-200 text-slate-400'
                                            }`}>
                                                {getOrdinal(chapter.number)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className={`truncate text-sm font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {chapter.title}
                                                    <span className="ml-2 text-[10px] font-bold text-slate-400 normal-case tracking-normal">
                                                        ({totalLessonsInChapter} {language === 'en' ? 'Lessons' : 'টি পাঠ'})
                                                    </span>
                                                </h3>
                                                {completedInChapter > 0 && (
                                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
                                                        {completedInChapter === totalLessonsInChapter ? (language === 'en' ? 'Chapter Completed' : 'অধ্যায় সম্পন্ন') : `${completedInChapter} ${language === 'en' ? 'Done' : 'সম্পন্ন'}`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`flex h-6 w-6 items-center justify-center border-2 border-slate-900 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-orange-500 text-white' : 'bg-white text-slate-400'}`}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Lessons Grid (Accordion Content) */}
                                    {isExpanded && (
                                        <div className="grid grid-cols-5 gap-2 border-t-2 border-slate-900 bg-orange-50/40 p-4 pt-1 animate-fade-in min-[420px]:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                                            {Array.from({ length: chapter.count }, (_, i) => {
                                                const lessonNum = i + 1;
                                                const lessonId = `${chapter.number}.${lessonNum}`;
                                                const isDone = completedLessons.includes(lessonId);
                                                const isLessonUnl = isLessonUnlocked(chapter.number, lessonNum);

                                                return (
                                                    <button
                                                        key={lessonId}
                                                        disabled={!isLessonUnl}
                                                        onClick={() => {
                                                            setShowLessonIndex(false);
                                                            handleChapterClick(chapter, lessonNum);
                                                        }}
                                                        className={`flex aspect-square items-center justify-center border-2 border-slate-900 text-[10px] font-black transition-all ${
                                                            isDone 
                                                                ? 'bg-emerald-500 text-white shadow-[2px_2px_0_#0f172a]' 
                                                                : isLessonUnl 
                                                                    ? 'bg-orange-100 text-orange-700 shadow-[2px_2px_0_#0f172a] hover:-translate-x-0.5 hover:-translate-y-0.5' 
                                                                    : 'cursor-not-allowed border-slate-400 bg-slate-200 text-slate-400 opacity-50'
                                                        }`}
                                                        title={`${language === 'en' ? 'Lesson' : 'পাঠ'} ${lessonId}`}
                                                    >
                                                        {isDone ? '✓' : lessonNum}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div >
    );
}
