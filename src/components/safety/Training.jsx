import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import secureStorage from '../../utils/secureStorage';
import { supabase } from '../../supabaseClient';
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL } from '../../config';
import HomeSkeleton from '../loaders/HomeSkeleton';
import { badgeLevels, calculateLevelFromProgress, getBadgeByLevel } from '../../utils/badgeUtils';
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
const MAX_LIFE_SKILLS_HINT_VISITS = 12;

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
            <div key={i} className="p-6 rounded-3xl bg-token-bg-surface border border-token-border shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full mb-2"></div>
                <div className="flex justify-between">
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/4"></div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/4"></div>
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
        ? 'relative overflow-hidden rounded-xl sm:rounded-2xl border border-orange-200/50 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/30 via-white to-white dark:from-slate-900/80 dark:via-slate-900/65 dark:to-slate-900/55 p-6 sm:p-9 md:p-10 shadow-none ring-0'
        : 'relative overflow-hidden rounded-2xl sm:rounded-[2rem] border border-orange-100/80 dark:border-orange-900/35 bg-gradient-to-br from-orange-50/40 via-white/90 to-white/95 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-900/50 p-5 sm:p-8 shadow-sm ring-1 ring-orange-500/[0.06] dark:ring-orange-400/10 transition-shadow duration-300 hover:shadow-md';
    const stackGap = readingComfort ? 'space-y-7 sm:space-y-10' : 'space-y-6 sm:space-y-8';
    const titleCls = readingComfort
        ? `text-2xl sm:text-3xl md:text-[1.95rem] font-black text-slate-800 dark:text-slate-100 leading-snug ${language === 'bn' ? 'font-bengali leading-[1.45]' : ''}`
        : `text-xl sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 leading-snug ${language === 'bn' ? 'font-bengali leading-[1.5]' : ''}`;
    const specCls = readingComfort
        ? `text-lg sm:text-xl md:text-[1.35rem] text-slate-700 dark:text-slate-200 leading-[2.05] font-medium ${language === 'bn' ? 'font-bengali text-[1.2rem] sm:text-[1.35rem] leading-[2.15]' : ''}`
        : `text-lg sm:text-xl text-slate-700 dark:text-slate-300 leading-[1.9] font-medium ${language === 'bn' ? 'font-bengali text-xl sm:text-2xl leading-[2.1]' : ''}`;
    const boxPad = readingComfort ? 'p-7 sm:p-9 rounded-2xl sm:rounded-[1.75rem]' : 'p-6 sm:p-8 rounded-2xl sm:rounded-[2rem]';
    const boxBody = readingComfort
        ? `text-base sm:text-lg md:text-[1.2rem] text-slate-800 dark:text-slate-100 font-bold leading-[1.95] ${language === 'bn' ? 'font-bengali leading-[2.1]' : ''}`
        : `text-base sm:text-lg md:text-xl text-slate-800 dark:text-slate-200 font-bold leading-[1.8] ${language === 'bn' ? 'font-bengali leading-[2.0]' : ''}`;

    return (
        <div className={shell}>
            <div
                className={`absolute left-0 top-0 bottom-0 w-[3px] sm:w-1 ${pIdx % 2 === 0 ? 'bg-gradient-to-b from-orange-400 to-amber-500' : 'bg-gradient-to-b from-amber-500 to-orange-400'} opacity-90 dark:opacity-75`}
                aria-hidden
            />
            <div className={`flex flex-col ${stackGap} pl-3 sm:pl-4`}>
                <h4 className={titleCls}>
                    {point.item_name}
                </h4>

                <div className="relative transition-all duration-500">
                    {point.image_name && (
                        <div
                            className={`${readingComfort ? 'mb-7 sm:mb-9 rounded-xl sm:rounded-2xl' : 'mb-8 sm:mb-10 rounded-2xl sm:rounded-[2.5rem]'} overflow-hidden cursor-zoom-in shadow-lg shadow-black/5`}
                            onClick={() => setActiveImageModal({ type: 'image', value: resolveTrainingMediaSrc(point.image_name) })}
                        >
                            <img
                                src={resolveTrainingMediaSrc(point.image_name)}
                                alt={point.item_name}
                                className="w-full h-auto object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
                                loading="lazy"
                            />
                        </div>
                    )}

                    <div className={readingComfort ? 'space-y-7 sm:space-y-10' : 'space-y-6 sm:space-y-8'}>
                        {point.specifications && (
                            <p className={specCls}>
                                {renderTextWithImages(point.specifications)}
                            </p>
                        )}

                        <div className={`grid grid-cols-1 ${readingComfort ? 'gap-7 sm:gap-8' : 'gap-6'}`}>
                            {point.importance && (
                                <div className={`bg-blue-500/5 dark:bg-blue-400/5 ${boxPad} border border-blue-500/10 backdrop-blur-sm`}>
                                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-500/60">{language === 'en' ? 'Strategy' : 'কৌশল'}</span>
                                    </div>
                                    <p className={boxBody}>
                                        {renderTextWithImages(point.importance)}
                                    </p>
                                </div>
                            )}
                            {point.daily_check && (
                                <div className={`bg-emerald-500/5 dark:bg-emerald-400/5 ${boxPad} border border-emerald-500/10 backdrop-blur-sm`}>
                                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-500/60">{language === 'en' ? 'Action Plan' : 'কর্মপরিকল্পনা'}</span>
                                    </div>
                                    <p className={boxBody}>
                                        {renderTextWithImages(point.daily_check)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {showDoneButton && (
                    <div className="mt-2 border-t border-orange-200/60 pt-6 dark:border-orange-800/40">
                        <button
                            type="button"
                            onClick={onStepDone}
                            className="w-full rounded-2xl bg-orange-600 px-4 py-3.5 text-center text-sm font-black text-white shadow-lg shadow-orange-600/25 transition-transform hover:bg-orange-500 active:scale-[0.99] dark:bg-orange-500 dark:hover:bg-orange-400"
                        >
                            {language === 'en' ? 'I have read this — continue' : 'পড়ে ফেলেছি — এগিয়ে যান'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Life Skills listen accepts:
 * - GitHub raw or release asset URLs (public hosting), or
 * - Same-origin paths under /audio/ (e.g. public/audio/ in this repo — works when GitHub audio is private).
 */
function isValidSupplementaryListenUrl(url) {
    if (typeof url !== 'string') return false;
    const u = url.trim();
    if (!u) return false;
    if (u.startsWith('/audio/') && !u.includes('..')) {
        return u.length > '/audio/'.length;
    }
    if (!u.startsWith('https://')) return false;
    try {
        const { hostname, pathname } = new URL(u);
        const host = hostname.toLowerCase();
        if (host === 'raw.githubusercontent.com') return pathname.length > 1;
        if (host === 'github.com' && pathname.toLowerCase().includes('/releases/download/')) return pathname.length > 1;
        return false;
    } catch {
        return false;
    }
}

export default function Training({
    language = 'en',
    user,
    userProfile: profile,
    onProgressUpdate,
    onOpenUserProgress,
    setCurrentView,
}) {
    const [showOnboarding, setShowOnboarding] = useState(() => {
        const today = new Date().toDateString();
        const lastSeenDate = localStorage.getItem('lastOnboardingDate');
        return lastSeenDate !== today;
    });
    const [showWelcome, setShowWelcome] = useState(() => {
        // Defer welcome if onboarding is active
        const today = new Date().toDateString();
        const lastSeenDate = localStorage.getItem('lastOnboardingDate');
        if (lastSeenDate !== today) return false;

        // Only show once per session. Use sessionStorage so it resets when browser closes or tab reloads fully.
        const hasSeenWelcome = sessionStorage.getItem('hasSeenTrainingWelcome');
        return !hasSeenWelcome;
    });
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
    }, [completedLessons, trainingChapters]);

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

        const badgeLevels = [
            { level: 1, en: "Trainee", bn: "ট্রেইনি", color: "bg-slate-500", count: 0 },
            { level: 2, en: "Junior", bn: "জুনিয়র", color: "bg-blue-600", count: 2 },
            { level: 3, en: "Technician", bn: "টেকনিশিয়ান", color: "bg-cyan-600", count: 5 },
            { level: 4, en: "Skilled", bn: "স্কিলড", color: "bg-emerald-600", count: 10 },
            { level: 5, en: "Advanced", bn: "অ্যাডভান্সড", color: "bg-indigo-600", count: 20 },
            { level: 6, en: "Senior", bn: "সিনিয়র", color: "bg-violet-600", count: 35 },
            { level: 7, en: "Supervisor", bn: "সুপারভাইজার", color: "bg-purple-600", count: 50 },
            { level: 8, en: "Specialist", bn: "স্পেশালিস্ট", color: "bg-rose-600", count: 70 },
            { level: 9, en: "Expert", bn: "এক্সপার্ট", color: "bg-orange-600", count: 100 }
        ];

        const getBadgeByLevel = (lvl) => badgeLevels.find(b => b.level === lvl) || badgeLevels[0];

        journeyChapters.forEach((chapter) => {
            const badge = getBadgeByLevel(chapter.number);
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

        const nodeVerticalGap = 120;
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
            const delayMs = getLifeSkillOpenDelayMs(moduleIndex, completedLessons, trainingChapters);
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
        [language, completedLessons, trainingChapters, readingPoints, clearLifeSkillWaitTimers]
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
        const en = typeof trainingContent.audio_url_en === 'string' ? trainingContent.audio_url_en.trim() : '';
        const bn = typeof trainingContent.audio_url_bn === 'string' ? trainingContent.audio_url_bn.trim() : '';
        const pick = language === 'bn' ? bn || en : en || bn;
        return isValidSupplementaryListenUrl(pick) ? pick : '';
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
                    <button
                        key={index}
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isImage) {
                                setActiveImageModal({ type: 'image', value: resolvedMedia });
                            } else {
                                setActiveImageModal({ type: 'text', value: raw });
                            }
                        }}
                        title={`${labelText} — ${tapHint}`}
                        className={`mx-0.5 inline-flex max-w-[10rem] cursor-pointer items-center gap-1 rounded-md border border-orange-200/80 bg-orange-50/90 py-0.5 pl-0.5 pr-1.5 align-middle text-[10px] font-semibold leading-tight text-orange-900 shadow-none transition-colors hover:border-orange-300 hover:bg-orange-100 dark:border-orange-800/50 dark:bg-orange-950/45 dark:text-orange-100 dark:hover:border-orange-600 dark:hover:bg-orange-900/55 ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white/90 ring-1 ring-orange-200/60 dark:bg-slate-900/80 dark:ring-orange-800/50">
                            {isImage ? (
                                <img
                                    src={resolvedMedia}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <svg className="h-3 w-3 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </span>
                        <span className="min-w-0 truncate">{labelText}</span>
                    </button>
                );
            } else if (part.startsWith('[[') && part.endsWith(']]')) {
                const inner = part.slice(2, -2).trim();
                const pipeIdx = inner.indexOf('|');
                const imgPathRaw = pipeIdx >= 0 ? inner.slice(0, pipeIdx).trim() : inner;
                const layoutFlag = pipeIdx >= 0 ? inner.slice(pipeIdx + 1).trim().toLowerCase() : '';
                const isInlineFigure = layoutFlag === 'inline';
                const resolvedSrc = resolveTrainingMediaSrc(imgPathRaw);
                const openModal = () => setActiveImageModal({ type: 'image', value: resolvedSrc });

                if (isInlineFigure) {
                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openModal();
                            }}
                            title={language === 'en' ? 'Tap to enlarge' : 'বড় করে দেখতে ট্যাপ করুন'}
                            className="group my-4 mx-auto block w-full max-w-[13.5rem] overflow-hidden rounded-2xl border-2 border-orange-200/90 bg-white/95 text-left shadow-md ring-1 ring-orange-500/10 transition-transform hover:border-orange-300 hover:shadow-lg active:scale-[0.99] dark:border-orange-900/50 dark:bg-slate-900/80 dark:ring-orange-400/10 dark:hover:border-orange-700 sm:float-right sm:ml-5 sm:mr-0 sm:max-w-[14rem] sm:shrink-0"
                        >
                            <span className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800/80">
                                <img
                                    src={resolvedSrc}
                                    alt=""
                                    className={`h-full w-full object-cover ${prefersReducedMotion ? '' : 'transition-transform duration-500 group-hover:scale-105'}`}
                                    loading="lazy"
                                />
                                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-white/95">
                                    {language === 'en' ? 'View' : 'দেখুন'}
                                </span>
                            </span>
                        </button>
                    );
                }

                return (
                    <div key={index} className="clear-both my-10 group relative cursor-pointer" onClick={openModal}>
                        <div className={`absolute inset-0 bg-orange-500/20 blur-3xl rounded-[3rem] scale-90 opacity-0 transition-all duration-700 group-hover:opacity-30 group-hover:scale-100 ${prefersReducedMotion ? 'hidden' : ''}`}></div>
                        <div className={`relative overflow-hidden rounded-[2.5rem] border-4 border-white shadow-2xl dark:border-slate-800 ${prefersReducedMotion ? '' : 'transition-all duration-500 group-hover:scale-[1.02]'}`}>
                            <img
                                src={resolvedSrc}
                                alt="Inline lesson helper"
                                className={`w-full h-auto object-cover max-h-[500px] ${prefersReducedMotion ? '' : 'transition-transform duration-700 group-hover:scale-110'}`}
                            />
                            <div className={`absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent pb-8 ${prefersReducedMotion ? 'opacity-100' : 'opacity-0 transition-opacity duration-500 group-hover:opacity-100'}`}>
                                <div className={`rounded-full bg-white/20 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white backdrop-blur-md flex items-center gap-2 ${prefersReducedMotion ? '' : 'transform translate-y-4 transition-transform duration-500 group-hover:translate-y-0'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    {language === 'en' ? 'Enlarge' : 'বড় করে দেখুন'}
                                </div>
                            </div>
                        </div>
                    </div>
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
    }, [language, prefersReducedMotion, setActiveImageModal]);

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


    const handleChapterClick = async (chapter, targetLessonNum = null) => {
        // Local access to badge levels for enrichment
        const badgeLevels = [
            { level: 1, en: "Trainee", bn: "ট্রেইনি", color: "bg-slate-500", count: 0 },
            { level: 2, en: "Junior", bn: "জুনিয়র", color: "bg-blue-600", count: 2 },
            { level: 3, en: "Technician", bn: "টেকনিশিয়ান", color: "bg-cyan-600", count: 5 },
            { level: 4, en: "Skilled", bn: "স্কিলড", color: "bg-emerald-600", count: 10 },
            { level: 5, en: "Advanced", bn: "অ্যাডভান্সড", color: "bg-indigo-600", count: 20 },
            { level: 6, en: "Senior", bn: "সিনিয়র", color: "bg-violet-600", count: 35 },
            { level: 7, en: "Supervisor", bn: "সুপারভাইজার", color: "bg-purple-600", count: 50 },
            { level: 8, en: "Specialist", bn: "স্পেশালিস্ট", color: "bg-rose-600", count: 70 },
            { level: 9, en: "Expert", bn: "এক্সপার্ট", color: "bg-orange-600", count: 100 }
        ];
        const currentBadge = badgeLevels.find(b => b.level === chapter.number) || badgeLevels[0];

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
                    const lesson = sorted.find(s => s.subchapterNum === targetLessonNum);
                    if (lesson) {
                        setSelectedLesson({ ...lesson, badge: currentBadge, chapter: chapter });
                    }
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
                    const lesson = sorted.find(s => s.subchapterNum === targetLessonNum);
                    if (lesson) {
                        setSelectedLesson({ ...lesson, badge: currentBadge, chapter: chapter });
                    }
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
                    const lesson = processed.find(s => s.subchapterNum === targetLessonNum);
                    if (lesson) {
                        setSelectedLesson({ ...lesson, badge: currentBadge, chapter: chapter });
                    }
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
                    const lesson = processed.find(s => s.subchapterNum === targetLessonNum);
                    if (lesson) {
                        setSelectedLesson({ ...lesson, badge: currentBadge, chapter: chapter });
                    }
                }
            } catch (fallbackErr) {
                console.error("Critical failure loading subchapters:", fallbackErr);
            }
        } finally {
            setTrainingLoading(false);
        }
    };

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

        if (!alreadyCompleted) {
            // First time completion bonus
            const bonusPoints = 20;

            if (user) {
                try {
                    const { error: rpcError } = await supabase.rpc('award_training_points', {
                        input_quiz_id: `lesson_bonus_${lessonId}`,
                        input_score: bonusPoints
                    });

                    if (rpcError) {
                        console.error('Error awarding lesson bonus:', rpcError);
                        if (typeof showNotification === 'function') {
                            showNotification(language === 'en' ? 'Error saving points' : 'পয়েন্ট সেভ করতে ত্রুটি', 'error');
                        }
                        return; // Prevent marking as complete if points failed
                    }

                    invalidateLeaderboardCaches(user.id);
                    cacheHelper.clear(`profile_${user.id}`);

                    setRecentReward(bonusPoints);
                    // Clear reward message after 5 seconds
                    setTimeout(() => setRecentReward(null), 5000);
                } catch (err) {
                    console.error('Critical error in point awarding:', err);
                    return;
                }

                setCompletedLessons(updated);
                
                storageUtils.setItem(`training_progress_${user.id}`, JSON.stringify(updated));

                // Sync to Supabase (Level + Detailed Progress)
                const newLevel = calculateLevelFromProgress(updated, trainingChapters);
                
                // Fail-proof: Only update level if it's higher than what we currently have
                const currentStoredLevel = profile?.training_level || 0;
                const updatePayload = {
                    completed_lessons: updated
                };
                
                if (newLevel > currentStoredLevel) {
                    updatePayload.training_level = newLevel;
                }

                console.log('📝 Syncing progress to Supabase...', updatePayload);
                // Transient network/RLS failures here used to leave reading_points awarded
                // (RPC) while completed_lessons never persisted — retries reduce that drift.
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
            if (onProgressUpdate) {
                onProgressUpdate(updated, true); // Added true for forceRefresh
            }
        }
        setShowQuizModal(false);
        setPendingLessonId(null);
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
                        <div className="loading-container-fixed">
                            <div className="w-48 h-48 lg:w-64 lg:h-64 mb-4">
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
                            <p className={`text-slate-500 font-black animate-pulse ${language === 'bn' ? 'font-bengali text-xl' : 'text-lg tracking-widest uppercase opacity-70'}`}>
                                {language === 'en' ? 'Loading lesson…' : 'পাঠ লোড হচ্ছে…'}
                            </p>
                            <p className={`mx-auto mt-4 max-w-md px-4 text-center text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {LOADING_TIPS[language === 'bn' ? 'bn' : 'en'][loadingTipIndex % LOADING_TIPS.en.length]}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <TrainingSkeleton />
                            <p className={`mx-auto max-w-md px-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {LOADING_TIPS[language === 'bn' ? 'bn' : 'en'][loadingTipIndex % LOADING_TIPS.en.length]}
                            </p>
                        </div>
                    )}
                </div>
            ) : !selectedChapter && !trainingContent ? (
                <div className="animate-fade-in-up">
                    {/* Sticky tab row (same scrollport as before: full-width column + z-40). Hint stays below in normal flow. */}
                    <div
                        className={`sticky top-4 z-40 mx-auto mb-6 flex w-full max-w-sm justify-center ${
                            showLifeSkillsHint && trainingTab === 'core'
                                ? prefersReducedMotion
                                    ? 'rounded-full p-[2px] ring-2 ring-indigo-500/55 dark:ring-indigo-400/45'
                                    : 'animate-lifeskills-hint-glow rounded-full p-[2px] ring-2 ring-indigo-500/55 dark:ring-indigo-400/45'
                                : ''
                        }`}
                    >
                        <div className="relative flex w-full rounded-full border border-slate-200/50 bg-white/80 p-1.5 shadow-lg backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80">
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
                                className={`absolute inset-y-1.5 w-[calc(50%-6px)] rounded-full bg-orange-600 shadow-sm transition-all duration-300 ease-out ${trainingTab === 'core' ? 'left-1.5' : 'left-[calc(50%+1.5px)]'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setTrainingTab('core')}
                                className={`relative z-10 w-1/2 rounded-full py-2.5 text-xs font-black uppercase tracking-wider transition-colors duration-300 ${trainingTab === 'core' ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {language === 'en' ? 'Training' : 'প্রশিক্ষণ'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTrainingTab('supplementary')}
                                aria-describedby={showLifeSkillsHint && trainingTab === 'core' ? 'lifeskills-hint-copy' : undefined}
                                className={`relative z-10 w-1/2 rounded-full py-2.5 text-xs font-black uppercase tracking-wider transition-colors duration-300 ${trainingTab === 'supplementary' ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {language === 'en' ? 'Life Skill ✨' : 'লাইফ স্কিল ✨'}
                            </button>
                        </div>
                    </div>
                    {showLifeSkillsHint && trainingTab === 'core' && (
                        <div className="mx-auto mb-6 w-full max-w-sm rounded-xl border border-slate-200/90 bg-slate-50/95 px-3 py-2.5 shadow-sm dark:border-slate-700/90 dark:bg-slate-900/85">
                            <p
                                id="lifeskills-hint-copy"
                                className={`text-center text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}
                            >
                                {language === 'en' ? (
                                    <>
                                        Short modules next to training—tap{' '}
                                        <span className="whitespace-nowrap font-bold text-indigo-700 dark:text-indigo-300">Life Skill</span>.
                                    </>
                                ) : (
                                    <>
                                        <span className="font-bold text-indigo-700 dark:text-indigo-300">লাইফ স্কিল</span>
                                        —প্রশিক্ষণের পাশে ছোট মডিউল; ডান দিকের ট্যাবে।
                                    </>
                                )}
                            </p>
                            <div className="mt-2 flex justify-center">
                                <button
                                    type="button"
                                    onClick={dismissLifeSkillsHint}
                                    className={`text-[11px] font-bold text-indigo-600 underline decoration-indigo-400/50 underline-offset-2 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ${language === 'bn' ? 'font-bengali' : ''}`}
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

                        // Main Journey View
                        return (
                            <div className="relative max-w-2xl mx-auto pb-32">
                                {/* Header */}
                                <div className="text-center mb-16 pt-4 space-y-3">
                                    <h1 className={`text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Learn' : 'শিখুন'}
                                    </h1>
                                    <p className={`text-xl text-slate-500 dark:text-slate-400 font-bold max-w-lg mx-auto ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Master your safety skills' : 'আপনার পেশাগত জ্ঞান বাড়ান'}
                                    </p>



                                    {/* Safety Hero Challenge Trigger - Temporarily Hidden 
                                    <button
                                        onClick={() => setCurrentView('safety-hero')}
                                        style={{ display: 'none' }}
                                        className="mx-auto mt-6 group relative max-w-sm w-full p-1 rounded-[2rem] bg-gradient-to-r from-orange-500 via-rose-500 to-orange-500 bg-[length:200%_auto] animate-gradient-x shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all animate-fade-in-up"
                                        style={{ animationDelay: '100ms' }}
                                    >
                                        <div className="bg-white dark:bg-slate-900 rounded-[1.8rem] p-4 flex items-center gap-4">
                                            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 group-hover:rotate-12 transition-transform">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h3 className={`text-base font-black text-slate-900 dark:text-white leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {language === 'en' ? 'Safety Hero Challenge' : 'সুরক্ষা হিরো চ্যালেঞ্জ'}
                                                </h3>
                                                <p className={`text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                    {language === 'en' ? 'Share your PPE selfie & join the Hero Wall!' : 'পিপিই সেলফি শেয়ার করুন এবং হিরো ওয়াল-এ যোগ দিন!'}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-center bg-orange-500 text-white w-10 h-10 rounded-2xl shadow-lg shadow-orange-500/20">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Action Buttons Group */}
                                    <div className="flex items-center justify-center gap-3 mt-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>


                                        {/* Graceful Lessons Index Button */}
                                        <button
                                            onClick={() => setShowLessonIndex(true)}
                                            className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold text-[11px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 active:scale-95"
                                        >
                                            <span>📑</span>
                                            {language === 'en' ? 'Index' : 'সূচীপত্র'}
                                        </button>
                                    </div>

                                    {/* Global Progress Dashboard */}
                                    {(() => {
                                        const totalLessons = journeyChapters.reduce((acc, c) => acc + (c.count || 0), 0);
                                        const totalCompleted = completedLessons.filter(id => {
                                            if (!id) return false;
                                            const chapterNum = parseInt(id.toString().split('.')[0]);
                                            return chapterNum >= 1 && chapterNum < 10;
                                        }).length;
                                        const overallProgressPercentage = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

                                        if (totalLessons === 0) return null;

                                        return (
                                            <div className="max-w-md mx-auto mt-8 p-5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-slate-700/50 shadow-2xl animate-entrance-pop">
                                                <div className="flex items-center justify-center md:justify-between mb-4 px-1">
                                                    <div className="hidden md:flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-lg">🏆</div>
                                                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                                            {language === 'en' ? 'Your Progress' : 'আপনার অগ্রগতি'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-3 py-1.5 rounded-xl border border-orange-100 dark:border-orange-900 text-[10px] shadow-sm">
                                                        {totalCompleted} / {totalLessons} {language === 'en' ? 'STEPS' : 'ধাপ'}
                                                    </span>
                                                </div>

                                                <div className="relative h-5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800 mb-4 shadow-inner">
                                                    <div
                                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all duration-1000 ease-out z-0"
                                                        style={{ width: `${overallProgressPercentage}%` }}
                                                    >
                                                        <div className="absolute inset-0 shimmer-fast opacity-30"></div>
                                                    </div>
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 drop-shadow-sm">
                                                            {overallProgressPercentage}%
                                                        </span>
                                                    </div>
                                                </div>
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
                                            className="text-slate-100 dark:text-slate-800/50"
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
                                                return (
                                                    <div key={`milestone-${item.chapter.number}`} className="absolute transition-all duration-700 z-10" style={{ left: `${xPos}%`, top: yPos, transform: 'translate(-50%, -50%)' }}>
                                                        <div className={`p-2 px-5 rounded-2xl border-2 backdrop-blur-xl flex flex-col items-center shadow-xl transition-all ${milestoneUnlocked ? `${item.badge.color} scale-105 border-white/80 dark:border-slate-700 animate-node-glow` : 'bg-slate-200/50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 grayscale opacity-80'}`}>
                                                            <div className="text-center">
                                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-0">{language === 'en' ? 'Rank' : 'পদমর্যাদা'}</p>
                                                                <h3 className={`font-black whitespace-nowrap ${language === 'bn' ? 'font-bengali text-base' : 'text-xs'}`}>{language === 'en' ? item.badge.en : item.badge.bn}</h3>
                                                            </div>
                                                        </div>
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
                                                    className={`absolute w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-500 z-20 group ${item.isCompleted ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-4 border-emerald-100 dark:border-emerald-500/30 text-white shadow-xl hover:scale-110' : item.isUnlocked ? `${item.badge.color} border-4 border-white dark:border-slate-700 text-slate-900 dark:text-white shadow-xl hover:scale-110 active:scale-95` : 'bg-slate-200/50 dark:bg-slate-800/80 border-4 border-slate-300/50 dark:border-slate-700/50 text-slate-400 dark:text-slate-500 shadow-inner grayscale cursor-not-allowed opacity-80'} ${isNext ? 'animate-float-y ring-4 ring-orange-500/30' : ''}`}
                                                    style={{ left: `${xPos}%`, top: yPos, transform: isNext ? undefined : 'translate(-50%, -50%)' }}
                                                >
                                                    <span className={`text-base sm:text-lg font-black ${language === 'bn' ? 'font-bengali' : ''}`}>{toBengaliNumber(item.id, language)}</span>
                                                    <div className={`absolute top-full mt-3 w-32 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-xl text-[10px] text-white font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                        {item.isCompleted ? (
                                                            language === 'en' ? 'Read Again' : 'আবার পড়ুন'
                                                        ) : item.isUnlocked ? (
                                                            language === 'en' ? 'Quick Read' : 'দ্রুত পড়ুন'
                                                        ) : (
                                                            language === 'en' ? 'Not so fast! 🔒' : 'ধৈর্য ধরুন! 🔒'
                                                        )}
                                                    </div>
                                                    {item.isCompleted && (
                                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg text-white">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Floating Profile & Score Bubble for Active Lesson */}
                                                    {isNext && (
                                                        <div 
                                                            className={`absolute top-1/2 -translate-y-1/2 ${xPos > 50 ? 'right-[120%] mr-2' : 'left-[120%] ml-2'} w-max flex items-center gap-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-xl shadow-orange-500/15 border border-orange-500/30 animate-in fade-in zoom-in-95 duration-500 pointer-events-none z-50`}
                                                        >
                                                            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 shrink-0 overflow-hidden shadow-inner border-2 border-white dark:border-slate-600">
                                                                {profile?.avatar_url ? (
                                                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-start pr-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-sm drop-shadow-sm leading-none">🏆</span>
                                                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 leading-none tracking-tight">
                                                                        {(userRank?.score || profile?.points || 0).toLocaleString('en-US')}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Arrow Pointer */}
                                                            <div className={`absolute top-1/2 -translate-y-1/2 ${xPos > 50 ? '-right-[5.5px] border-y-[6px] border-y-transparent border-l-[6px] border-l-orange-500/30' : '-left-[5.5px] border-y-[6px] border-y-transparent border-r-[6px] border-r-orange-500/30'}`}></div>
                                                            <div className={`absolute top-1/2 -translate-y-1/2 ${xPos > 50 ? '-right-[4px] border-y-[5px] border-y-transparent border-l-[5px] border-l-white dark:border-l-slate-800' : '-left-[4px] border-y-[5px] border-y-transparent border-r-[5px] border-r-white dark:border-r-slate-800'}`}></div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Video Library CTA */}
                    <div className="mt-12 group">
                        <button
                            onClick={() => setCurrentView('video-guide')}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01]"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-6 text-center md:text-left">
                                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl lg:text-5xl shadow-inner">
                                        📺
                                    </div>
                                    <div>
                                        <h2 className={`text-2xl lg:text-3xl font-black mb-1 lg:mb-2 tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Video Learning Library' : 'ভিডিও লার্নিং লাইব্রেরি'}
                                        </h2>
                                        <p className={`text-orange-50 text-sm lg:text-base font-medium opacity-90 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Explore topic-wise safety guides and training videos' : 'বিষয়ভিত্তিক নিরাপত্তা গাইড এবং প্রশিক্ষণ ভিডিও দেখুন'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-black uppercase tracking-wider text-sm transition-all border border-white/30 shadow-lg">
                                    <span>{language === 'en' ? 'Watch Now' : 'এখনই দেখুন'}</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* FAQ CTA Card */}
                    <div className="mt-8 group">
                        <button
                            onClick={() => {
                                const faq = trainingChapters.find(c => c.number === 10);
                                if (faq) handleChapterClick(faq);
                            }}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.01]"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-6 text-center md:text-left">
                                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl lg:text-5xl shadow-inner">
                                        💡
                                    </div>
                                    <div>
                                        <h2 className={`text-2xl lg:text-3xl font-black mb-1 lg:mb-2 tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Quick Help & FAQ' : 'কি, কেন?, কিভাবে?'}
                                        </h2>
                                        <p className={`text-violet-50 text-sm lg:text-base font-medium opacity-90 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                            {language === 'en' ? 'Get answers to common safety questions and procedures' : 'আপনার মনে আসা সব প্রশ্নের সহজ সমাধান ও গাইড'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-black uppercase tracking-wider text-sm transition-all border border-white/30 shadow-lg">
                                    <span>{language === 'en' ? 'Search Answers' : 'উত্তর খুঁজুন'}</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    </div>


                        {/* Professional Branding Footer */}
                        <div className="mt-20 mb-32 text-center relative z-10 animate-fade-in-up">
                            <div className="flex flex-col items-center gap-4">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10">
                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Official Platform</span>
                                </div>
                                <a
                                    href={WEBSITE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-2xl font-black text-slate-900 dark:text-white tracking-tight hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                >
                                    {WEBSITE_URL.replace('https://', '')}
                                </a>
                                <div className="flex flex-col gap-1 items-center">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">For support and inquiries:</p>
                                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 transition-colors">
                                        {SUPPORT_EMAIL}
                                    </a>
                                </div>
                                <div className="mt-4 w-40 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent"></div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {APP_NAME} v{CURRENT_APP_VERSION}
                                </p>
                            </div>
                        </div>
                    </>
                    ) : (
                        <>
                            <header className="mx-auto mb-8 max-w-2xl px-4 pt-1 text-center sm:mb-10 sm:pt-2 md:mb-12">
                                <h1
                                    className={`text-[2.25rem] font-black leading-[1.06] tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {language === 'en' ? 'Life Skill' : 'লাইফ স্কিল'}
                                </h1>
                                <p
                                    className={`mx-auto mt-3 max-w-md text-base font-bold leading-snug text-slate-500 dark:text-slate-400 sm:mt-4 sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}
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
                                        className={`group relative aspect-[3/4] w-full max-h-[280px] overflow-hidden rounded-2xl text-left shadow-md ring-1 ring-black/5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:ring-white/10 dark:focus-visible:ring-offset-slate-950 sm:max-h-[320px] sm:rounded-3xl md:aspect-[4/5] md:max-h-[360px] ${
                                            isCompleted
                                                ? 'ring-emerald-500/40'
                                                : 'hover:shadow-xl hover:ring-indigo-400/30 dark:hover:ring-indigo-500/25'
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
                                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-black/25 ring-2 ring-white/90 sm:right-3 sm:top-3 sm:h-9 sm:w-9"
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
                <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 animate-slide-up-sheet">
                    <div className={`absolute inset-0 ${selectedLesson.badge?.color || 'bg-orange-500'} opacity-[0.08] dark:opacity-[0.16]`} />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/70 to-white/90 dark:from-slate-950/90 dark:via-slate-950/80 dark:to-slate-950/95 backdrop-blur-2xl" />

                    <div className="relative z-10 flex h-full flex-col safe-area-inset-top safe-area-inset-bottom">
                        <header className="sticky top-0 z-20 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
                            <div className="relative flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
                                <div className="relative z-10">
                                    <button
                                        onClick={() => {
                                            stopChapterAudio();
                                            setSelectedLesson(null);
                                            setSelectedChapter(null);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        <span className="hidden sm:inline">{language === 'en' ? 'Back' : 'ফিরে যান'}</span>
                                    </button>
                                </div>

                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-16 sm:px-24">
                                    <h1 className={`truncate text-base sm:text-lg font-black text-slate-900 dark:text-white ${language === 'bn' ? 'font-bengali' : ''}`}>
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
                                            <div className={`w-22 h-22 sm:w-28 sm:h-28 rounded-[2rem] ${selectedLesson.badge?.color || 'bg-orange-500'} flex items-center justify-center text-4xl sm:text-5xl text-white shadow-2xl`}>
                                                📖
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 text-center">
                                        <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                                            <div className="h-px w-10 bg-slate-200 dark:bg-slate-800" />
                                            <span className={`text-xs font-black uppercase tracking-[0.28em] ${language === 'bn' ? 'font-bengali tracking-normal' : ''}`}>
                                                {language === 'en' ? 'Chapter Status' : 'পদমর্যাদা'}
                                            </span>
                                            <div className="h-px w-10 bg-slate-200 dark:bg-slate-800" />
                                        </div>
                                        <h2 className={`text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                            {language === 'en' ? selectedLesson.badge?.en : selectedLesson.badge?.bn}
                                        </h2>
                                    </div>

                                    <div className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl px-5 sm:px-8 py-6 sm:py-8 shadow-xl">
                                        <p className={`text-sm sm:text-base font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 text-center ${language === 'bn' ? 'font-bengali tracking-normal' : ''}`}>
                                            {language === 'en' ? 'Lesson' : 'পাঠ'} {toBengaliNumber(selectedLesson.level_id || `${selectedLesson.chapterNum}.${selectedLesson.subchapterNum}`, language)}
                                        </p>
                                        <p className={`mt-3 text-2xl sm:text-4xl font-black text-center text-slate-900 dark:text-white leading-tight ${language === 'bn' ? 'font-bengali leading-[1.45]' : ''}`}>
                                            {selectedLesson.level_title}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-8 sm:pt-10">
                                    <button
                                        onClick={() => {
                                            stopChapterAudio();
                                            setTrainingContent(selectedLesson);
                                            setActiveSectionIndex(0);
                                            setIsJournalMode(true);
                                            setSelectedLesson(null);
                                        }}
                                        className="w-full sm:w-auto sm:min-w-[280px] mx-auto flex items-center justify-center gap-3 rounded-[1.75rem] bg-slate-900 dark:bg-white px-6 sm:px-8 py-4 sm:py-5 text-white dark:text-slate-900 shadow-2xl hover:scale-[1.01] active:scale-95 transition-all duration-300"
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
                <div>
                    <button
                        onClick={() => setSelectedChapter(null)}
                        className="mb-6 flex items-center gap-2 text-orange-600 hover:text-orange-700 font-bold"
                    >
                        ← {language === 'en' ? 'Back to Chapters' : 'অধ্যায়ে ফিরে যান'}
                    </button>

                    {selectedChapter.isFAQ ? (
                        /* Redesigned FAQ View */
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-gradient-to-br from-violet-100/40 via-violet-50/20 to-fuchsia-100/30 dark:from-violet-900/40 dark:via-slate-800/40 dark:to-fuchsia-900/30 p-6 sm:p-8 rounded-[2.5rem] mb-8 border border-violet-200/50 dark:border-violet-700/50 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                                <div className="relative z-10">
                                    <h2 className="text-3xl font-black text-slate-800 dark:text-violet-100 mb-2 tracking-tight">
                                        {selectedChapter.content.title}
                                    </h2>
                                    <p className="text-slate-500 dark:text-violet-300/70 mb-8 font-bold">
                                        {selectedChapter.content.subtitle}
                                    </p>

                                    {/* Modernized Search Input */}
                                    <div className="relative group max-w-2xl">
                                        <div className="absolute inset-0 bg-violet-500/10 blur-xl group-focus-within:bg-violet-500/20 transition-all rounded-2xl"></div>
                                        <div className="relative flex items-center bg-white dark:bg-slate-900/80 backdrop-blur-xl border-2 border-slate-100 dark:border-violet-900/30 rounded-2xl overflow-hidden transition-all group-focus-within:border-violet-500 group-focus-within:ring-4 ring-violet-500/10">
                                            <div className="pl-5 text-violet-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={language === 'en' ? 'Search topics, questions, or tags...' : 'বিষয়, প্রশ্ন বা ট্যাগ খুঁজুন...'}
                                                value={faqSearchQuery}
                                                onChange={(e) => setFaqSearchQuery(e.target.value)}
                                                className={`w-full px-4 py-4 bg-transparent text-slate-900 dark:text-slate-100 font-bold outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 ${language === 'bn' ? 'font-bengali text-lg' : ''}`}
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
                                                <span className="text-[10px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest pl-2">Popular Keywords</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></div>
                                            </div>
                                            <button
                                                onClick={() => setIsFaqTagsExpanded(!isFaqTagsExpanded)}
                                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest hover:bg-violet-600 hover:text-white transition-all border border-violet-100 dark:border-violet-800"
                                            >
                                                {isFaqTagsExpanded ? (
                                                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" /></svg> Collapse</>
                                                ) : (
                                                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg> View All</>
                                                )}
                                            </button>
                                        </div>

                                        <div className={`relative ${!isFaqTagsExpanded ? 'after:absolute after:top-0 after:right-0 after:h-full after:w-20 after:bg-gradient-to-l after:from-violet-50/50 dark:after:from-slate-800/50 after:to-transparent after:pointer-events-none' : ''}`}>
                                            <div className={`${isFaqTagsExpanded ? 'flex flex-wrap' : 'flex overflow-x-auto scrollbar-hide pb-2 px-1'} gap-2 transition-all duration-500`}>
                                                {Array.from(new Set(selectedChapter.content.questions.flatMap(q => q.tags || []))).sort().map(tag => {
                                                    const isActive = faqSearchQuery.toLowerCase() === tag.toLowerCase();
                                                    return (
                                                        <button
                                                            key={tag}
                                                            onClick={() => setFaqSearchQuery(isActive ? '' : tag)}
                                                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 border ${isActive
                                                                ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-600/30 scale-105'
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 active:scale-95'
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
                                                className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden hover:shadow-2xl hover:border-violet-300 dark:hover:border-violet-500/50 transition-all duration-500 group shadow-lg shadow-slate-200/20 dark:shadow-none"
                                            >
                                                <details
                                                    className="group/details"
                                                    open={isOpen}
                                                >
                                                    <summary className="flex items-center justify-between p-4 sm:p-6 cursor-pointer list-none select-none">
                                                        <div className="flex items-start sm:items-center gap-3 sm:gap-5">
                                                            <div className="mt-1 sm:mt-0 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-lg shadow-violet-500/20 transition-all duration-500 group-hover/details:rotate-6 group-hover/details:scale-110 shrink-0">
                                                                Q{toBengaliNumber(idx + 1, language)}
                                                            </div>
                                                            <span className={`font-black text-slate-800 dark:text-slate-100 leading-snug transition-colors group-hover/details:text-violet-600 dark:group-hover/details:text-violet-400 ${language === 'bn' ? 'font-bengali text-lg sm:text-xl' : 'text-base sm:text-lg'}`}>
                                                                {q.question}
                                                            </span>
                                                        </div>
                                                        <div className="ml-4 w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 shrink-0 transition-all duration-500 group-open/details:rotate-180 group-open/details:bg-violet-600 group-open/details:text-white">
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
                                                                    <span className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em] bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-md">Answer</span>
                                                                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/50"></div>
                                                                </div>

                                                                <div className={`text-slate-600 dark:text-slate-300 leading-relaxed ${language === 'bn' ? 'font-bengali text-lg' : 'font-medium'}`}>
                                                                    {renderTextWithImages(q.answer)}
                                                                </div>

                                                                {q.image && (
                                                                    <div className="mt-6 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden border-2 sm:border-8 border-white dark:border-slate-800 shadow-2xl max-w-full sm:max-w-lg transform hover:scale-[1.01] transition-transform duration-500">
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
                                                                            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all border border-slate-100 dark:border-slate-700"
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

            {lockedLessonModal && createPortal(
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white dark:bg-slate-900 shadow-2xl animate-scale-in">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-violet-500/10" />
                        <div className="relative p-6 sm:p-7">
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-3xl text-orange-600 shadow-inner dark:bg-orange-500/10 dark:text-orange-300">
                                🔒
                            </div>

                            <div className="text-center space-y-3">
                                <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
                                    {language === 'en' ? 'Locked Level' : 'লক করা পাঠ'}
                                </div>

                                <h3 className={`text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {language === 'en' ? 'Complete previous lessons first' : 'আগের পাঠগুলো আগে শেষ করুন'}
                                </h3>

                                <p className={`text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {language === 'en'
                                        ? `Lesson ${lockedLessonModal.lessonId} is locked until you finish the lessons before it.`
                                        : `${toBengaliNumber(lockedLessonModal.lessonId, language)} নম্বর পাঠটি এর আগের পাঠগুলো শেষ না করা পর্যন্ত লক থাকবে।`}
                                </p>

                                <div className="mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                                    <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-black text-orange-600 shadow-sm dark:bg-slate-900 dark:text-orange-300">
                                        {lockedLessonModal.chapterLabel}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {lockedLessonModal.chapterTitle || (language === 'en' ? 'Please continue your journey from earlier lessons.' : 'দয়া করে আগের পাঠগুলো শেষ করুন।')}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={() => setLockedLessonModal(null)}
                                    className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.99] dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                                >
                                    {language === 'en' ? 'Got it' : 'বুঝেছি'}
                                </button>
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
                        className="fixed inset-0 z-[215] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-fade-in"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                clearLifeSkillWaitTimers();
                                setLifeSkillWaitUi(null);
                            }
                        }}
                    >
                        <div className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-white/10 bg-white shadow-2xl dark:bg-slate-900 animate-scale-in">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10" />
                            <div className="relative space-y-4 p-6 text-center sm:p-7">
                                <p
                                    id="lifeskill-wait-headline"
                                    className={`line-clamp-3 text-base font-black leading-snug text-slate-900 dark:text-white sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {lifeSkillWaitUi.cardTitle}
                                </p>
                                <p className="text-5xl font-black tabular-nums text-indigo-600 dark:text-indigo-300 sm:text-6xl">
                                    {language === 'en'
                                        ? lifeSkillWaitUi.secondsLeft
                                        : toBengaliNumber(lifeSkillWaitUi.secondsLeft, 'bn')}
                                </p>
                                <div className={`space-y-3 text-left text-sm leading-relaxed text-slate-600 dark:text-slate-300 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {language === 'en' ? (
                                        <>
                                            <p>
                                                Your main training badge:{' '}
                                                <span className="font-black text-indigo-700 dark:text-indigo-300">
                                                    {lifeSkillWaitUi.currentBadgeEn}
                                                </span>
                                                .
                                            </p>
                                            <p>
                                                To read or listen to life skills alongside, you will need to reach the{' '}
                                                <span className="font-black text-slate-800 dark:text-slate-100">
                                                    {TECHNICIAN_BADGE.en}
                                                </span>{' '}
                                                badge. Please wait{' '}
                                                <span className="font-black text-indigo-700 dark:text-indigo-300">
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
                                                <span className="font-black text-indigo-700 dark:text-indigo-300">
                                                    {lifeSkillWaitUi.currentBadgeBn}
                                                </span>
                                                । লাইফ স্কিল একসঙ্গে দেখতে বা শুনতে{' '}
                                                <span className="font-black text-slate-800 dark:text-slate-100">
                                                    {TECHNICIAN_BADGE.bn}
                                                </span>{' '}
                                                ব্যাজে যেতে হবে।
                                            </p>
                                            <p>
                                                <span className="font-black text-indigo-700 dark:text-indigo-300">
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
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 transition-all hover:bg-slate-100 active:scale-[0.99] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                >
                                    {language === 'en' ? 'Cancel' : 'বাতিল'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {/* Safety Journal UI - Immersive Slide-based Experience */}
            {
                trainingContent && createPortal(
                    <div className="fixed top-0 md:top-14 inset-x-0 bottom-0 lg:top-16 lg:bottom-6 lg:inset-x-0 lg:mx-auto lg:w-[1000px] lg:max-w-[95vw] lg:rounded-[3rem] lg:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] lg:border lg:border-slate-200 dark:lg:border-white/10 z-[75] bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col animate-fade-in-up">
                        {/* Desktop Backdrop Overlay */}
                        <div className="hidden lg:block fixed inset-0 -z-10 bg-slate-950/40 backdrop-blur-sm" onClick={() => {
                            stop();
                            setTrainingContent(null);
                            setIsJournalMode(false);
                            setSelectedChapter(null);
                            setSelectedLesson(null);
                        }} />
                        <div className="relative flex flex-col h-full overflow-hidden book-page-texture">
                            {/* Simple Book-like Header */}
                            <div className="sticky top-0 z-[100] bg-white/40 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5">
                                <div className="max-w-5xl mx-auto w-full px-5 py-3 flex items-center h-16">
                                    <button
                                        onClick={() => {
                                            stop();
                                            setTrainingContent(null);
                                            setIsJournalMode(false);
                                            setSelectedChapter(null);
                                            setSelectedLesson(null);
                                        }}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-slate-500 transition-all active:scale-90"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>

                                    <div className="text-center flex-1 mx-4 min-w-0">
                                        <h2 className={`text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] truncate ${language === 'bn' ? 'font-bengali tracking-normal' : ''}`}>
                                            <span className="text-orange-500/80 font-black">{getTrainingHeaderLessonCode(trainingContent, language)}</span>
                                            <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                                            {trainingContent.level_title}
                                        </h2>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                stop();
                                                setTrainingContent(null);
                                                setIsJournalMode(false);
                                                setSelectedChapter(null);
                                                setSelectedLesson(null);
                                                setCurrentView('safety-library');
                                            }}
                                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30 hover:bg-orange-100 transition-all shadow-sm"
                                        >
                                            <span className="text-sm animate-rotate-y inline-block">🛡️</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest">{language === 'en' ? 'Library' : 'লাইব্রেরি'}</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                stop();
                                                setTrainingContent(null);
                                                setIsJournalMode(false);
                                                setSelectedChapter(null);
                                                setSelectedLesson(null);
                                                setCurrentView('safety-library');
                                            }}
                                            className="sm:hidden w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 transition-all"
                                        >
                                            <span className="text-xl animate-rotate-y inline-block">🛡️</span>
                                        </button>

                                        {!hideReadAloudForSupplementaryRadio && (
                                            <>
                                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block opacity-50"></div>

                                                <button
                                                    type="button"
                                                    onClick={handleReadLesson}
                                                    disabled={isLoading}
                                                    title={isLoading
                                                        ? (language === 'en' ? 'Preparing audio...' : 'অডিও তৈরি হচ্ছে...')
                                                        : isPlaying && !isPaused
                                                            ? (language === 'en' ? 'Pause reading' : 'পড়া থামান')
                                                            : (language === 'en' ? 'Read aloud' : 'উচ্চস্বরে পড়ুন')}
                                                    className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-500 ${
                                                        isLoading ? 'bg-orange-500/20 text-orange-500 animate-pulse' :
                                                        isPlaying && !isPaused ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40 scale-105' :
                                                        'text-slate-400 hover:text-orange-500'
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
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Modern Progress Bar */}
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 relative z-20">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                                        style={{ width: `${((activeSectionIndex + 1) / slides.length) * 100}%` }}
                                    >
                                        <div className="absolute top-0 right-0 w-4 h-full bg-white/40 skew-x-12 opacity-50"></div>
                                    </div>
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
                                            className={`flex w-full items-center justify-center gap-3 rounded-2xl border py-3.5 text-sm font-black uppercase tracking-wide transition ${
                                                supplementaryRadioSrc
                                                    ? 'border-indigo-300/80 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:brightness-110 active:scale-[0.99] dark:border-indigo-500/50 dark:from-indigo-500 dark:to-violet-600'
                                                    : 'cursor-not-allowed border-slate-300/70 bg-slate-200/90 text-slate-500 opacity-75 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-500'
                                            } disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100 disabled:active:scale-100`}
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
                            {/* Side prev/next arrows — omitted on final slide (completion uses in-content actions). */}
                            {!isLastSlide && (
                                <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-between px-2 sm:px-8">
                                    <div className="pointer-events-auto">
                                        {!isFirstSlide && (
                                            <button
                                                onClick={prevSlide}
                                                className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-orange-500 hover:scale-110 active:scale-75 transition-all shadow-xl"
                                                title="Previous"
                                            >
                                                <svg className="w-6 h-6 sm:w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                            </button>
                                        )}
                                    </div>
                                    <div className="pointer-events-auto">
                                        <button
                                            type="button"
                                            disabled={isNextDisabledByLessonRules}
                                            onClick={nextSlide}
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
                                                        ? 'Next'
                                                        : 'পরের পাতা'
                                            }
                                            className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-all shadow-xl hover:text-orange-500 hover:scale-110 active:scale-75 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 disabled:hover:text-slate-500 dark:disabled:hover:text-slate-300"
                                        >
                                            <svg className="w-6 h-6 sm:w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}

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
                            {(() => {
                                const activeSlide = slides[activeSectionIndex];
                                const sectionPoints =
                                    activeSlide?.type === 'section' ? activeSlide.points ?? [] : [];
                                const isSupplementaryCompletion =
                                    activeSlide?.type === 'completion' && trainingContent?.isSupplementary;
                                return (
                                    <div
                                        ref={lessonScrollRef}
                                        className={`flex-1 relative book-page-texture book-gutter scroll-smooth transition-colors duration-700 ${
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
                                                    : 'px-6 py-10 pb-20 sm:py-14 sm:pb-24'
                                            }`}
                                        >
                                            {activeSlide?.type === 'hero' && (
                                                <div className="flex flex-col items-center justify-center pt-6 pb-20 space-y-12">
                                                    <div className="w-full space-y-8 text-center">
                                                        <div className="space-y-4">
                                                            <p className="text-sm font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-600">
                                                                {language === 'en'
                                                                    ? `Lesson ${getTrainingHeaderLessonCode(trainingContent, language)}`
                                                                    : `পাঠ ${getTrainingHeaderLessonCode(trainingContent, language)}`}
                                                            </p>
                                                            <div className="h-px w-24 bg-slate-200 dark:bg-slate-800 mx-auto"></div>
                                                        </div>

                                                        <h1 className={`text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-100 leading-snug tracking-tight px-4 ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                                            {trainingContent.level_title}
                                                        </h1>
                                                    </div>

                                                    <div className="max-w-md w-full relative">
                                                        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800/30 blur-2xl -z-10 rounded-full"></div>
                                                        <p className={`text-lg text-slate-800 dark:text-slate-300 leading-[2] text-center font-medium not-italic px-4 ${language === 'bn' ? 'font-bengali text-[1.35rem] leading-[2.2]' : ''}`}>
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
                                                    <header className="relative mb-2 overflow-hidden rounded-2xl border border-orange-100/80 bg-gradient-to-b from-orange-50/70 via-white/60 to-transparent px-4 py-6 dark:border-orange-900/35 dark:from-orange-950/30 dark:via-slate-900/50 dark:to-transparent sm:mb-3 sm:px-6 sm:py-8">
                                                        <p className={`mb-1.5 text-center font-black text-orange-600 dark:text-orange-400/95 ${language === 'bn' ? 'font-bengali text-xs tracking-normal' : 'text-[10px] uppercase tracking-[0.28em]'}`}>
                                                            {language === 'en' ? 'In this part' : 'এই অংশে'}
                                                        </p>
                                                        <h3 className={`text-center text-2xl font-black leading-snug tracking-tight text-slate-800 dark:text-slate-100 sm:text-3xl md:text-4xl ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                                            {activeSlide.title}
                                                        </h3>
                                                    </header>

                                                    {sectionReaderMode === 'overview' && sectionPoints.length > 0 && (
                                                        <div className="sticky top-0 z-20 -mx-2 mb-3 flex justify-center border-b border-orange-200/50 bg-[#fcfaf2]/95 px-2 py-2 backdrop-blur-md dark:border-orange-900/40 dark:bg-slate-900/95 sm:-mx-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSectionTickDetailIndex(null);
                                                                    setSectionReaderMode('guided');
                                                                    requestAnimationFrame(() => {
                                                                        lessonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                                                                    });
                                                                }}
                                                                className={`rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-[11px] font-bold text-orange-900 shadow-sm transition-colors hover:bg-orange-50 dark:border-orange-700 dark:bg-slate-800 dark:text-orange-100 dark:hover:bg-slate-700 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                            >
                                                                {language === 'en' ? '← Step-by-step' : '← ধাপে ধাপে'}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {sectionPoints.length > 0 && sectionReaderMode === 'guided' && sectionGuidedStepDone < sectionPoints.length && (
                                                        <>
                                                            <div
                                                                className="sticky top-0 z-20 -mx-2 mb-2 border-b border-orange-200/40 bg-[#fcfaf2]/95 px-2 py-2 backdrop-blur-md dark:border-orange-900/40 dark:bg-slate-900/95 sm:-mx-4 sm:px-3"
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
                                                                                className={`h-full min-w-0 flex-1 rounded-full ${i < sectionGuidedStepDone ? 'bg-emerald-500' : i === sectionGuidedStepDone ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}
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
                                                                                className="flex items-start gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/60 px-4 py-3.5 dark:border-emerald-800/50 dark:bg-emerald-950/25"
                                                                            >
                                                                                <span className="shrink-0 text-lg text-emerald-600 dark:text-emerald-400" aria-hidden>✓</span>
                                                                                <h4 className={`min-w-0 flex-1 text-left text-sm font-bold leading-snug text-emerald-900 dark:text-emerald-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
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
                                                                            className="rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/70 px-4 py-4 dark:border-slate-600 dark:bg-slate-900/40"
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
                                                                            className={`flex w-full items-start gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/60 px-4 py-3 text-left transition-colors hover:border-emerald-400/90 hover:bg-emerald-100/70 active:scale-[0.99] dark:border-emerald-800/50 dark:bg-emerald-950/25 dark:hover:border-emerald-600/50 dark:hover:bg-emerald-950/45 sm:py-3.5 ${language === 'bn' ? 'font-bengali' : ''}`}
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
                                                            <div key={idx} className="relative p-8 rounded-[2.5rem] bg-emerald-100/5 dark:bg-emerald-900/5 border border-emerald-500/10 backdrop-blur-md shadow-sm overflow-hidden">
                                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/30"></div>
                                                                <p className={`text-lg sm:text-xl md:text-2xl text-slate-700 dark:text-slate-300 leading-[1.9] font-medium ${language === 'bn' ? 'font-bengali text-xl sm:text-2xl md:text-[1.7rem] leading-[2.1]' : ''}`}>
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

                                                    <div className="space-y-12">
                                                        {activeSlide.myths?.map((item, idx) => (
                                                            <div key={idx} className="space-y-4">
                                                                <div className="p-8 rounded-[2rem] bg-red-500/[0.03] dark:bg-red-900/[0.03] border border-red-500/10">
                                                                    <span className="text-[10px] uppercase font-black tracking-widest text-red-500/50 mb-3 block">
                                                                        {language === 'en' ? 'Perspective' : 'ভুল ধারণা'}
                                                                    </span>
                                                                    <p className={`text-lg sm:text-xl text-slate-600 dark:text-slate-400 italic font-medium leading-[1.9] ${language === 'bn' ? 'font-bengali text-xl sm:text-2xl leading-[2.1]' : ''}`}>
                                                                        {renderTextWithImages(item.myth)}
                                                                    </p>
                                                                </div>

                                                                <div className="p-8 rounded-[2rem] bg-emerald-500/[0.03] dark:bg-emerald-900/[0.03] border border-emerald-500/10 shadow-sm">
                                                                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500/50 mb-3 block">
                                                                        {language === 'en' ? 'Verdict' : 'আসল কথা'}
                                                                    </span>
                                                                    <p className={`text-lg sm:text-xl text-slate-800 dark:text-slate-200 font-bold leading-[1.9] ${language === 'bn' ? 'font-bengali text-xl sm:text-2xl leading-[2.1]' : ''}`}>
                                                                        {renderTextWithImages(item.reality || item.fact)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeSlide?.type === 'advanced' && (
                                                <div className="space-y-16 py-10">
                                                    <header className="text-center mb-8">
                                                        <h3 className={`text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                            {activeSlide.title}
                                                        </h3>
                                                    </header>

                                                    <div className="grid grid-cols-1 gap-10">
                                                        {activeSlide.facts?.map((fact, idx) => (
                                                            <div key={idx} className="group">
                                                                <h4 className={`text-2xl font-black text-indigo-600 dark:text-indigo-400 mb-6 flex items-center gap-3 ${language === 'bn' ? 'font-bengali text-3xl' : ''}`}>
                                                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                                    {fact.title}
                                                                </h4>
                                                                <div className="p-8 rounded-[2.5rem] bg-indigo-500/[0.02] dark:bg-indigo-400/[0.02] border border-indigo-500/10 shadow-sm backdrop-blur-sm">
                                                                    <p className={`text-lg sm:text-xl text-slate-700 dark:text-slate-300 leading-[1.9] font-medium ${language === 'bn' ? 'font-bengali text-xl sm:text-2xl leading-[2.1]' : ''}`}>
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
                                                                className={`mx-auto flex min-h-[3rem] w-full max-w-[17.5rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition active:scale-[0.99] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-800 sm:max-w-xs sm:min-h-[2.75rem] sm:text-base`}
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
                                                                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-lg font-black text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 dark:bg-slate-100 dark:text-slate-900 sm:rounded-[2rem] sm:py-5 sm:text-xl"
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
                        className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 bg-slate-900/90 backdrop-blur-md animate-fade-in"
                        onClick={() => setActiveImageModal(null)}
                    >
                        <div
                            className={`relative flex max-h-[min(90vh,900px)] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-800 shadow-2xl animate-scale-in sm:rounded-3xl ${
                                activeImageModal.type === 'image' ? 'max-w-5xl' : 'max-w-lg'
                            }`}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setActiveImageModal(null)}
                                className="absolute top-3 right-3 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70 sm:top-4 sm:right-4"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {activeImageModal.type === 'image' ? (
                                <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-900 p-4 pt-14 sm:p-8 sm:pt-16">
                                    <img
                                        src={activeImageModal.value}
                                        alt="Preview"
                                        className="max-h-[min(78vh,800px)] max-w-full object-contain rounded-xl shadow-2xl"
                                    />
                                </div>
                            ) : (
                                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-900 p-5 pt-14 sm:p-8 sm:pt-16">
                                    <div className="mb-3 flex items-center gap-2 text-orange-400">
                                        <svg className="h-7 w-7 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className={`text-xs font-bold uppercase tracking-wider text-slate-400 ${language === 'bn' ? 'font-bengali tracking-normal' : ''}`}>
                                            {language === 'en' ? 'Details' : 'বিস্তারিত'}
                                        </span>
                                    </div>
                                    <p className={`text-left text-base leading-relaxed text-slate-200 sm:text-lg ${language === 'bn' ? 'font-bengali' : 'font-medium'} whitespace-pre-line`}>
                                        {activeImageModal.value}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )
            }
            {/* Welcome Modal Overlay */}
            {
                showWelcome && createPortal(
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-50 dark:bg-slate-900 animate-fade-in">
                        {/* Background Decorative Elements */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                        </div>

                        <div className="relative w-full max-w-lg px-6 flex flex-col items-center text-center space-y-4 md:space-y-6">
                            <div className="w-full flex flex-col items-center space-y-4 md:space-y-6">
                                {/* Lottie Animation */}
                                <div className="w-full aspect-square max-w-[160px] md:max-w-[240px] mx-auto filter drop-shadow-2xl">
                                    <DotLottiePlayer
                                        src={readingLottie}
                                        autoplay
                                        loop
                                        className="w-full h-full"
                                    />
                                </div>

                                {/* Welcome Text */}
                                <div className="space-y-1.5 md:space-y-3 animate-entrance-pop" style={{ animationDelay: '100ms' }}>
                                    <h1 className={`text-2xl md:text-4xl font-black text-slate-900 dark:text-slate-100 leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en' ? 'Welcome!' : 'স্বাগতম!'}
                                    </h1>
                                    <p className={`text-base md:text-xl font-bold text-slate-600 dark:text-slate-400 ${language === 'bn' ? 'font-bengali opacity-90' : ''}`}>
                                        {language === 'en' ? "Here's your reading progress." : 'আপনার পড়ার অগ্রগতি এখানে।'}
                                    </p>
                                </div>

                                {lessonProgressWelcome && (
                                    <div className="grid grid-cols-1 gap-3 animate-entrance-pop text-left w-full max-w-sm" style={{ animationDelay: '200ms' }}>
                                        <p className={`text-center text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${language === 'bn' ? 'font-bengali tracking-normal' : ''}`}>
                                            {language === 'en' ? 'Your reading progress' : 'পড়ার অগ্রগতি'}
                                        </p>
                                        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-4 rounded-3xl border border-white/20 dark:border-slate-700/50 flex gap-4 items-center">
                                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                                                📖
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-slate-800 dark:text-white font-black leading-snug ${lessonProgressWelcome.secondary ? 'mb-1' : ''} ${language === 'bn' ? 'font-bengali text-base md:text-lg' : 'text-xs md:text-sm'}`}>
                                                    {lessonProgressWelcome.primary}
                                                </p>
                                                {lessonProgressWelcome.secondary && (
                                                    <p className={`text-[10px] md:text-[11px] font-semibold text-slate-500 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                        {lessonProgressWelcome.secondary}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Proceed Button */}
                            <div className="w-full max-w-sm pt-0 md:pt-2 animate-entrance-pop" style={{ animationDelay: '300ms' }}>
                                <button
                                    onClick={() => {
                                        sessionStorage.setItem('hasSeenTrainingWelcome', 'true');
                                        setShowWelcome(false);
                                    }}
                                    className="w-full material-button-primary py-4 md:py-5 text-xl md:text-2xl font-black shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-95 transition-all group"
                                >
                                    <span className="flex items-center justify-center gap-3">
                                        {language === 'en' ? 'Proceed' : 'এগিয়ে যান'}
                                        <svg className="w-7 h-7 group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Floating Challenge Button (hidden on Life Skills tab / surface) */}
            {
                !selectedChapter &&
                !trainingContent &&
                !showWelcome &&
                !trainingLoading &&
                trainingTab === 'core' &&
                createPortal(
                    <button
                        onClick={() => setCurrentView('competitions')}
                        className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-[90] hover:scale-110 active:scale-95 transition-transform duration-300 drop-shadow-2xl animate-entrance-pop focus:outline-none"
                        title={language === 'en' ? 'Hourly Challenge' : 'প্রতি ঘণ্টার চ্যালেঞ্জ'}
                    >
                        <div className="relative">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-xl">
                                <DotLottiePlayer
                                    src={clockLottie}
                                    autoplay
                                    loop
                                    className="w-full h-full filter saturate-150 contrast-125"
                                />
                            </div>
                            {isHourlyPending && (
                                <span className="absolute top-2 right-2 flex h-3 w-3 sm:h-3.5 sm:w-3.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500 border border-white dark:border-slate-800 shadow-sm"></span>
                                </span>
                            )}
                        </div>
                    </button>,
                    document.body
                )
            }
            {
                showOnboarding && (
                    <OnboardingSequence
                        language={language}
                        onComplete={() => {
                            const today = new Date().toDateString();
                            localStorage.setItem('lastOnboardingDate', today);
                            localStorage.setItem('hasSeenOnboarding', 'true');
                            setShowOnboarding(false);
                            // After onboarding, show the welcome modal if not seen in session
                            const hasSeenWelcome = sessionStorage.getItem('hasSeenTrainingWelcome');
                            if (!hasSeenWelcome) {
                                setShowWelcome(true);
                            }
                        }}
                    />
                )
            }
            {/* Lessons Index Modal */}
            {showLessonIndex && createPortal(
                <div className="fixed inset-0 z-[120] flex flex-col bg-white dark:bg-slate-900 animate-slide-in-right overflow-hidden mobile-safe-area">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div>
                            <h2 className={`text-xl font-black text-slate-900 dark:text-white ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {language === 'en' ? 'Learning Index' : 'পাঠের সূচীপত্র'}
                            </h2>
                            <p className="text-[10px] uppercase tracking-widest text-orange-500 font-bold mt-0.5">
                                {language === 'en' ? 'Complete lessons one by one' : 'একের পর এক পাঠ সম্পন্ন করুন'}
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowLessonIndex(false)}
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
                                <div key={chapter.number} className="animate-entrance-pop border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden transition-all duration-300">
                                    {/* Chapter Row */}
                                    <button 
                                        onClick={() => setExpandedChapterIndex(isExpanded ? null : idx)}
                                        className={`w-full flex items-center justify-between p-3.5 text-left transition-colors ${
                                            isExpanded ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                                                isUnlocked ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                            }`}>
                                                {getOrdinal(chapter.number)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className={`text-sm font-black text-slate-900 dark:text-white truncate ${language === 'bn' ? 'font-bengali' : ''}`}>
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
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-orange-100 text-orange-600' : 'text-slate-300'}`}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Lessons Grid (Accordion Content) */}
                                    {isExpanded && (
                                        <div className="p-4 pt-1 bg-slate-50/50 dark:bg-slate-900/30 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 border-t border-slate-100 dark:border-slate-800/50 animate-fade-in">
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
                                                        className={`aspect-square rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${
                                                            isDone 
                                                                ? 'bg-emerald-500 text-white shadow-md' 
                                                                : isLessonUnl 
                                                                    ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 border border-orange-200 dark:border-orange-800 hover:scale-110' 
                                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
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
