import { PRACTICAL_FIELD_CHAPTERS } from '../data/practicalFieldChapters';
import { findNextSequentialLessonId } from './readingHabitGate';

/** Match training / reading-gate chapter sizes when manifest is unavailable. */
const DEFAULT_CORE_CHAPTER_COUNTS = {
  1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 11, 7: 10, 8: 10, 9: 10,
};

const coreTitleCache = new Map();
let lifeSkillModulesPromise = null;

function listCoreLessonIds(trainingChapters) {
  const ids = [];
  for (let ch = 1; ch <= 9; ch += 1) {
    const chap = Array.isArray(trainingChapters)
      ? trainingChapters.find((c) => c.number === ch)
      : null;
    const count =
      chap && Number(chap.count) > 0
        ? Number(chap.count)
        : DEFAULT_CORE_CHAPTER_COUNTS[ch] || 0;
    for (let n = 1; n <= count; n += 1) ids.push(`${ch}.${n}`);
  }
  return ids;
}

/** IST calendar day YYYY-MM-DD (stable across the local field day). */
export function istDateKey(now = Date.now()) {
  const d = new Date(now + 5.5 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hashString(input) {
  let h = 2166136261;
  const s = String(input || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickStableIndex(length, seed) {
  if (length <= 0) return -1;
  return hashString(seed) % length;
}

async function fetchCoreLessonTitle(lessonId) {
  const id = String(lessonId || '').trim();
  if (!id) return null;
  if (coreTitleCache.has(id)) return coreTitleCache.get(id);

  const m = id.match(/^(\d+)\.(\d+)$/);
  if (!m) return null;

  try {
    const res = await fetch(`/quizzes/B${m[1]}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const levels = Array.isArray(data?.levels) ? data.levels : [];
    for (const level of levels) {
      const lid = String(level?.level_id || '').trim();
      const title = String(level?.level_title || '').trim();
      if (lid && title) coreTitleCache.set(lid, title);
    }
  } catch {
    return null;
  }

  return coreTitleCache.get(id) || null;
}

function loadLifeSkillModules() {
  if (!lifeSkillModulesPromise) {
    lifeSkillModulesPromise = fetch('/data/supplementary_modules.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => (Array.isArray(data) ? data : []))
      .catch(() => []);
  }
  return lifeSkillModulesPromise;
}

/**
 * Home "শিখতে থাকুন" topic.
 * - Incomplete core path → next sequential lesson title
 * - All core done → one stable daily pick from core / life skill / আরো জানুন
 *
 * @returns {Promise<{
 *   mode: 'next' | 'daily' | 'fallback',
 *   title: string | null,
 *   target: 'training' | 'life-skill' | 'aro-janun',
 *   lessonId?: string | null,
 * }>}
 */
export async function resolveHomeLearningTopic({
  completedLessons,
  trainingChapters = null,
  userId = null,
  language = 'bn',
} = {}) {
  const bn = language !== 'en';
  const nextId = findNextSequentialLessonId(completedLessons, trainingChapters);

  if (nextId) {
    const title = await fetchCoreLessonTitle(nextId);
    return {
      mode: 'next',
      title: title || (bn ? 'পরের পাঠ' : 'Next lesson'),
      target: 'training',
      lessonId: nextId,
    };
  }

  const lifeModules = await loadLifeSkillModules();
  const candidates = [
    ...listCoreLessonIds(trainingChapters).map((lessonId) => ({
      kind: 'core',
      lessonId,
      target: 'training',
    })),
    ...lifeModules
      .map((mod) => ({
        kind: 'life',
        target: 'life-skill',
        title: String((bn ? mod?.title_bn : mod?.title_en) || mod?.title_bn || '').trim(),
      }))
      .filter((c) => c.title),
    ...PRACTICAL_FIELD_CHAPTERS.map((ch) => ({
      kind: 'aro',
      target: 'aro-janun',
      title: String((bn ? ch?.title_bn : ch?.title_en) || ch?.title_bn || '').trim(),
    })).filter((c) => c.title),
  ];

  if (candidates.length === 0) {
    return {
      mode: 'fallback',
      title: null,
      target: 'training',
      lessonId: null,
    };
  }

  const seed = `${istDateKey()}:${userId || 'guest'}:home-learn`;
  const pick = candidates[pickStableIndex(candidates.length, seed)];

  if (pick.kind === 'core') {
    const title = await fetchCoreLessonTitle(pick.lessonId);
    return {
      mode: 'daily',
      title: title || (bn ? 'আজকের পাঠ' : "Today's lesson"),
      target: 'training',
      lessonId: pick.lessonId,
    };
  }

  return {
    mode: 'daily',
    title: pick.title,
    target: pick.target,
    lessonId: null,
  };
}
