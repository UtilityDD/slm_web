import { SAFETY_CULTURE_ITEMS, getItemById, getOptionScore } from './items.js';
import { MAX_OPTION_SCORE, SAFETY_CULTURE_TOPICS } from './topics.js';

/**
 * @typedef {{ item_id: string, answer_uchit: string, answer_hoy: string }} CultureAnswer
 */

/**
 * Score one answer map (item_id -> { uchit, hoy }) into topic + overall metrics.
 * @param {CultureAnswer[] | Record<string, { uchit?: string, hoy?: string }>} answers
 */
export function scoreCultureResponses(answers) {
  const list = normalizeAnswers(answers);
  const byTopic = Object.fromEntries(
    SAFETY_CULTURE_TOPICS.map((t) => [
      t.id,
      { kRaw: 0, pRaw: 0, kMax: 0, pMax: 0, nItems: 0 },
    ])
  );

  for (const row of list) {
    const item = getItemById(row.item_id);
    if (!item || !byTopic[item.topic]) continue;
    const bucket = byTopic[item.topic];
    bucket.kRaw += getOptionScore(item, row.answer_uchit, 'uchit');
    bucket.pRaw += getOptionScore(item, row.answer_hoy, 'hoy');
    bucket.kMax += MAX_OPTION_SCORE;
    bucket.pMax += MAX_OPTION_SCORE;
    bucket.nItems += 1;
  }

  const topics = SAFETY_CULTURE_TOPICS.map((t) => {
    const b = byTopic[t.id];
    const kPct = b.kMax ? (b.kRaw / b.kMax) * 100 : 0;
    const pPct = b.pMax ? (b.pRaw / b.pMax) * 100 : 0;
    return {
      topicId: t.id,
      label_bn: t.label_bn,
      label_en: t.label_en,
      kPct: round1(kPct),
      pPct: round1(pPct),
      gap: round1(kPct - pPct),
      nItems: b.nItems,
      kRaw: b.kRaw,
      pRaw: b.pRaw,
      kMax: b.kMax,
      pMax: b.pMax,
    };
  });

  const withData = topics.filter((t) => t.nItems > 0);
  const knowledgeIndex = avg(withData.map((t) => t.kPct));
  const cultureIndex = avg(withData.map((t) => t.pPct));

  return {
    topics,
    topicsByGapDesc: [...topics].sort((a, b) => b.gap - a.gap),
    knowledgeIndex: round1(knowledgeIndex),
    cultureIndex: round1(cultureIndex),
    overallGap: round1(knowledgeIndex - cultureIndex),
    itemCount: SAFETY_CULTURE_ITEMS.length,
    answeredCount: list.length,
  };
}

/**
 * Aggregate many users' answer rows for an admin wave report.
 * @param {Array<{ item_id: string, answer_uchit: string, answer_hoy: string, user_id?: string }>} rows
 */
export function rollupWaveResponses(rows) {
  const byTopic = Object.fromEntries(
    SAFETY_CULTURE_TOPICS.map((t) => [
      t.id,
      { kRaw: 0, pRaw: 0, kMax: 0, pMax: 0, nAnswers: 0 },
    ])
  );
  const userIds = new Set();

  for (const row of rows || []) {
    if (row.user_id) userIds.add(row.user_id);
    const item = getItemById(row.item_id);
    if (!item || !byTopic[item.topic]) continue;
    const bucket = byTopic[item.topic];
    bucket.kRaw += getOptionScore(item, row.answer_uchit, 'uchit');
    bucket.pRaw += getOptionScore(item, row.answer_hoy, 'hoy');
    bucket.kMax += MAX_OPTION_SCORE;
    bucket.pMax += MAX_OPTION_SCORE;
    bucket.nAnswers += 1;
  }

  const topics = SAFETY_CULTURE_TOPICS.map((t) => {
    const b = byTopic[t.id];
    const kPct = b.kMax ? (b.kRaw / b.kMax) * 100 : 0;
    const pPct = b.pMax ? (b.pRaw / b.pMax) * 100 : 0;
    return {
      topicId: t.id,
      label_bn: t.label_bn,
      label_en: t.label_en,
      kPct: round1(kPct),
      pPct: round1(pPct),
      gap: round1(kPct - pPct),
      nAnswers: b.nAnswers,
    };
  });

  const withData = topics.filter((t) => t.nAnswers > 0);
  const knowledgeIndex = avg(withData.map((t) => t.kPct));
  const cultureIndex = avg(withData.map((t) => t.pPct));

  return {
    respondentCount: userIds.size,
    responseRowCount: (rows || []).length,
    topics,
    topicsByGapDesc: [...topics].sort((a, b) => b.gap - a.gap),
    knowledgeIndex: round1(knowledgeIndex),
    cultureIndex: round1(cultureIndex),
    overallGap: round1(knowledgeIndex - cultureIndex),
  };
}

/**
 * Period admin pack: overall rollup + per-user scores + raw rows for drill-down.
 * @param {Array<{ user_id: string, item_id: string, answer_uchit: string, answer_hoy: string, submitted_at?: string, wave_id?: string }>} rows
 */
export function buildPeriodAdminReport(rows) {
  const summary = rollupWaveResponses(rows);
  const byUser = new Map();

  for (const row of rows || []) {
    if (!row?.user_id) continue;
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
    byUser.get(row.user_id).push(row);
  }

  const users = [...byUser.entries()]
    .map(([userId, userRows]) => {
      const scored = scoreCultureResponses(userRows);
      let submittedAt = null;
      let submittedMs = 0;
      for (const r of userRows) {
        const t = r.submitted_at ? new Date(r.submitted_at).getTime() : 0;
        if (t > submittedMs) {
          submittedMs = t;
          submittedAt = r.submitted_at;
        }
      }
      return {
        userId,
        knowledgeIndex: scored.knowledgeIndex,
        cultureIndex: scored.cultureIndex,
        overallGap: scored.overallGap,
        topics: scored.topics,
        topicsByGapDesc: scored.topicsByGapDesc,
        answeredCount: scored.answeredCount,
        submittedAt,
        rows: userRows,
      };
    })
    .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));

  return { summary, users };
}

export function usersReportToCsv(users, profileMap = {}, { language = 'bn' } = {}) {
  const bn = language === 'bn';
  const header = bn
    ? ['নাম', 'ফোন', 'ইউজার_আইডি', 'জ্ঞান_%', 'মাঠ_%', 'গ্যাপ', 'জমার_সময়']
    : ['name', 'phone', 'user_id', 'knowledge_pct', 'practice_pct', 'gap', 'submitted_at'];
  const lines = [header.join(',')];
  for (const u of users || []) {
    const p = profileMap[u.userId] || {};
    lines.push(
      [
        csvEscape(p.full_name || ''),
        csvEscape(p.phone_number || ''),
        csvEscape(u.userId),
        u.knowledgeIndex,
        u.cultureIndex,
        u.overallGap,
        csvEscape(u.submittedAt || ''),
      ].join(',')
    );
  }
  return lines.join('\n');
}

export function waveReportToCsv(report, { language = 'bn' } = {}) {
  const bn = language === 'bn';
  const header = bn
    ? ['বিষয়', 'জ্ঞান_%', 'মাঠ_%', 'গ্যাপ', 'উত্তর_সংখ্যা']
    : ['topic', 'knowledge_pct', 'practice_pct', 'gap', 'n_answers'];
  const lines = [header.join(',')];
  for (const t of report.topicsByGapDesc || report.topics || []) {
    const label = bn ? t.label_bn : t.label_en;
    lines.push(
      [csvEscape(label), t.kPct, t.pPct, t.gap, t.nAnswers ?? t.nItems ?? 0].join(',')
    );
  }
  lines.push('');
  lines.push(
    bn
      ? `মোট_উত্তরদাতা,${report.respondentCount ?? ''}`
      : `respondents,${report.respondentCount ?? ''}`
  );
  lines.push(
    bn
      ? `জ্ঞান_সূচক,${report.knowledgeIndex}`
      : `knowledge_index,${report.knowledgeIndex}`
  );
  lines.push(
    bn
      ? `সংস্কৃতি_সূচক,${report.cultureIndex}`
      : `culture_index,${report.cultureIndex}`
  );
  lines.push(
    bn ? `মোট_গ্যাপ,${report.overallGap}` : `overall_gap,${report.overallGap}`
  );
  return lines.join('\n');
}

function normalizeAnswers(answers) {
  if (!answers) return [];
  if (Array.isArray(answers)) {
    return answers
      .filter((r) => r?.item_id && r.answer_uchit && r.answer_hoy)
      .map((r) => ({
        item_id: r.item_id,
        answer_uchit: r.answer_uchit,
        answer_hoy: r.answer_hoy,
      }));
  }
  return Object.entries(answers)
    .filter(([, v]) => v?.uchit && v?.hoy)
    .map(([item_id, v]) => ({
      item_id,
      answer_uchit: v.uchit,
      answer_hoy: v.hoy,
    }));
}

function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
