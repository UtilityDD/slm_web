/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildPeriodAdminReport,
  waveReportToCsv,
  usersReportToCsv,
  SAFETY_CULTURE_ITEMS,
  SAFETY_CULTURE_PROMPTS,
  TOPIC_BY_ID,
  getOptionLabel,
} from '../../data/safetyCultureSurvey';
import {
  fetchCultureResponsesInRange,
  getCultureReportPeriodRange,
  fetchProfilesByIds,
  CULTURE_SURVEY_INTERVAL_DAYS,
  CULTURE_SURVEY_FIRST_ACTIVE_DAYS,
} from '../../utils/safetyCultureSurvey';

/** Fake multi-user answers so admin can preview report layout without live data. */
function buildDemoWaveRows() {
  const users = ['demo-u1', 'demo-u2', 'demo-u3', 'demo-u4', 'demo-u5'];
  const hoyBias = {
    ppe: ['A', 'A', 'C', 'B', 'A'],
    height: ['C', 'B', 'A', 'B', 'C'],
    clearance: ['A', 'A', 'B', 'C', 'A'],
    earthing: ['A', 'A', 'A', 'C', 'B'],
    approach: ['A', 'C', 'B', 'A', 'A'],
    stop_work: ['C', 'A', 'B', 'C', 'B'],
    reporting: ['C', 'B', 'A', 'C', 'B'],
    tools: ['A', 'A', 'C', 'A', 'B'],
  };
  const rows = [];
  const now = new Date().toISOString();
  users.forEach((userId, ui) => {
    SAFETY_CULTURE_ITEMS.forEach((item) => {
      const hoyPick = hoyBias[item.topic]?.[ui] || 'A';
      rows.push({
        user_id: userId,
        item_id: item.id,
        answer_uchit: 'B',
        answer_hoy: hoyPick,
        submitted_at: now,
      });
    });
  });
  return rows;
}

const PERIODS = [
  { id: '90d', bn: 'শেষ ৯০ দিন', en: 'Last 90 days' },
  { id: 'quarter', bn: 'এই কোয়ার্টার', en: 'This quarter' },
  { id: 'all', bn: 'সব সময়', en: 'All time' },
];

export default function SafetyCultureAdminPanel({
  language = 'bn',
  callerId,
  onPreviewFlow,
  defaultOpen = false,
  standalone = false,
}) {
  const bn = language === 'bn' || language === 'বাংলা';
  const [open, setOpen] = useState(Boolean(defaultOpen || standalone));
  const [period, setPeriod] = useState('90d');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showQuestions, setShowQuestions] = useState(false);
  const [showConcept, setShowConcept] = useState(false);
  const [showDemoReport, setShowDemoReport] = useState(false);
  const [periodPack, setPeriodPack] = useState(null); // { summary, users }
  const [profiles, setProfiles] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);

  const demoPack = useMemo(() => buildPeriodAdminReport(buildDemoWaveRows()), []);

  const loadPeriod = useCallback(async () => {
    if (!callerId) {
      setMessage(bn ? 'অ্যাডমিন লগইন নেই।' : 'Admin login missing.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const range = getCultureReportPeriodRange(period);
      const rows = await fetchCultureResponsesInRange({
        since: range.since,
        until: range.until,
        callerId,
      });
      const pack = buildPeriodAdminReport(rows);
      const map = await fetchProfilesByIds(pack.users.map((u) => u.userId));
      setPeriodPack(pack);
      setProfiles(map);
      setShowDemoReport(false);
      if (!pack.users.some((u) => u.userId === selectedUserId)) {
        setSelectedUserId(null);
      }
    } catch (e) {
      console.error(e);
      setMessage(bn ? 'রিপোর্ট লোড হয়নি (SQL চালু আছে?)' : 'Could not load report (SQL applied?)');
      setPeriodPack(null);
    } finally {
      setLoading(false);
    }
  }, [period, bn, selectedUserId, callerId]);

  useEffect(() => {
    if (open && !showDemoReport && !showQuestions && !showConcept) loadPeriod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, period]);

  const activePack = showDemoReport ? demoPack : periodPack;
  const summary = activePack?.summary || null;
  const users = activePack?.users || [];
  const selectedUser = users.find((u) => u.userId === selectedUserId) || null;
  const profileMap = showDemoReport
    ? Object.fromEntries(
        users.map((u, i) => [
          u.userId,
          { full_name: bn ? `ডেমো ইউজার ${i + 1}` : `Demo user ${i + 1}`, phone_number: '' },
        ])
      )
    : profiles;

  const exportSummaryCsv = () => {
    if (!summary) return;
    downloadCsv(
      waveReportToCsv(summary, { language: bn ? 'bn' : 'en' }),
      `safety-culture-summary-${showDemoReport ? 'demo' : period}.csv`
    );
  };

  const exportUsersCsv = () => {
    if (!users.length) return;
    downloadCsv(
      usersReportToCsv(users, profileMap, { language: bn ? 'bn' : 'en' }),
      `safety-culture-users-${showDemoReport ? 'demo' : period}.csv`
    );
  };

  return (
    <div
      className={`${standalone ? 'mb-0' : 'mb-5'} rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden`}
    >
      {!standalone && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-orange-50/60 transition-colors"
        >
          <span className="font-semibold text-slate-800 text-sm">
            {bn ? 'নিরাপত্তা সংস্কৃতি জরিপ' : 'Safety culture survey'}
          </span>
          <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
        </button>
      )}

      {open && (
        <div
          className={`px-4 pb-4 space-y-3 ${standalone ? 'pt-3' : 'border-t border-slate-100 pt-3'}`}
        >
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {bn
              ? 'পিরিয়ড সামারি + ইউজার অনুযায়ী উত্তর। নতুন ইউজার ৩ সক্রিয় দিন পর প্রথম জরিপ; তারপর ৯০ দিন অন্তর।'
              : 'Period summary + per-user answers. New users: first survey after 3 active days; then every 90 days.'}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowConcept((v) => !v);
                if (!showConcept) {
                  setShowQuestions(false);
                  setShowDemoReport(false);
                  setSelectedUserId(null);
                }
              }}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900"
            >
              {showConcept
                ? bn
                  ? 'ধারণা পেজ বন্ধ'
                  : 'Hide concept'
                : bn
                  ? 'ধারণা / কনসেপ্ট'
                  : 'Concept'}
            </button>
            <button
              type="button"
              onClick={() => onPreviewFlow?.()}
              className="rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800"
            >
              {bn ? 'ইউজার ফ্লো প্রিভিউ' : 'Preview user flow'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDemoReport(true);
                setShowQuestions(false);
                setShowConcept(false);
                setSelectedUserId(null);
              }}
              className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900"
            >
              {bn ? 'ডেমো রিপোর্ট' : 'Demo report'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuestions((v) => !v);
                if (!showQuestions) {
                  setShowDemoReport(false);
                  setShowConcept(false);
                  setSelectedUserId(null);
                }
              }}
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900"
            >
              {showQuestions
                ? bn
                  ? 'প্রশ্ন তালিকা বন্ধ'
                  : 'Hide questions'
                : bn
                  ? 'সব প্রশ্ন দেখুন'
                  : 'View all questions'}
            </button>
            <button
              type="button"
              disabled={!summary}
              onClick={exportSummaryCsv}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-40"
            >
              {bn ? 'সামারি CSV' : 'Summary CSV'}
            </button>
            <button
              type="button"
              disabled={!users.length}
              onClick={exportUsersCsv}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-40"
            >
              {bn ? 'ইউজার CSV' : 'Users CSV'}
            </button>
            {!showDemoReport && (
              <button
                type="button"
                disabled={loading}
                onClick={loadPeriod}
                className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-900 disabled:opacity-50"
              >
                {bn ? 'রিফ্রেশ' : 'Refresh'}
              </button>
            )}
          </div>

          {message ? <p className="text-xs text-slate-600">{message}</p> : null}

          {showConcept && <ConceptPage bn={bn} onClose={() => setShowConcept(false)} />}

          {showQuestions && (
            <QuestionBankPreview bn={bn} onClose={() => setShowQuestions(false)} />
          )}

          {!showQuestions && !showConcept && (
            <>
              {!showDemoReport && (
                <div className="flex flex-wrap gap-2">
                  {PERIODS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPeriod(p.id);
                        setSelectedUserId(null);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold border ${
                        period === p.id
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {bn ? p.bn : p.en}
                    </button>
                  ))}
                </div>
              )}

              {showDemoReport && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDemoReport(false);
                    setSelectedUserId(null);
                    loadPeriod();
                  }}
                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-900"
                >
                  {bn ? 'লাইভ রিপোর্টে ফিরুন' : 'Back to live report'}
                </button>
              )}

              {loading && !showDemoReport && (
                <p className="text-xs text-slate-400">
                  {bn ? 'রিপোর্ট লোড হচ্ছে…' : 'Loading report…'}
                </p>
              )}

              {summary && (showDemoReport || !loading) && (
                <ReportBlock bn={bn} report={summary} isDemo={showDemoReport} />
              )}

              {users.length > 0 && (showDemoReport || !loading) && !selectedUser && (
                <UserList
                  bn={bn}
                  users={users}
                  profiles={profileMap}
                  onSelect={(id) => setSelectedUserId(id)}
                />
              )}

              {selectedUser && (
                <UserDetail
                  bn={bn}
                  user={selectedUser}
                  profile={profileMap[selectedUser.userId]}
                  onBack={() => setSelectedUserId(null)}
                />
              )}

              {!loading && !showDemoReport && !summary && (
                <p className="text-xs text-slate-500">
                  {bn
                    ? 'এই পিরিয়ডে কোনো উত্তর নেই — ডেমো রিপোর্ট দিয়ে লেআউট দেখুন।'
                    : 'No responses in this period — use Demo report to preview layout.'}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportBlock({ bn, report, isDemo }) {
  return (
    <div className="space-y-3">
      {isDemo && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-semibold text-violet-900">
          {bn
            ? 'ডেমো রিপোর্ট — নমুনা ডেটা। লাইভ মেট্রিক নয়।'
            : 'Demo report — sample data. Not live metrics.'}
        </div>
      )}
      <p className="text-xs font-bold text-slate-700">
        {bn ? 'সারাংশ' : 'Summary'}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label={bn ? 'জ্ঞান' : 'Knowledge'} value={`${report.knowledgeIndex}%`} />
        <Metric label={bn ? 'মাঠ' : 'Practice'} value={`${report.cultureIndex}%`} />
        <Metric label={bn ? 'গ্যাপ' : 'Gap'} value={`${report.overallGap}`} />
      </div>
      <p className="text-[11px] text-slate-500">
        {bn ? 'উত্তরদাতা' : 'Respondents'}: {report.respondentCount}
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2">{bn ? 'বিষয়' : 'Topic'}</th>
              <th className="px-2 py-2">K%</th>
              <th className="px-2 py-2">P%</th>
              <th className="px-2 py-2">{bn ? 'গ্যাপ' : 'Gap'}</th>
            </tr>
          </thead>
          <tbody>
            {(report.topicsByGapDesc || []).map((t) => (
              <tr key={t.topicId} className="border-t border-slate-100">
                <td className="px-2 py-2 font-medium text-slate-800">
                  {bn ? t.label_bn : t.label_en}
                </td>
                <td className="px-2 py-2">{t.kPct}</td>
                <td className="px-2 py-2">{t.pPct}</td>
                <td className="px-2 py-2 font-semibold text-amber-800">{t.gap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserList({ bn, users, profiles, onSelect }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-700">
        {bn ? `ইউজার অনুযায়ী (${users.length})` : `By user (${users.length})`}
      </p>
      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {users.map((u) => {
          const p = profiles[u.userId] || {};
          const name = p.full_name || (bn ? 'নাম নেই' : 'No name');
          return (
            <button
              key={u.userId}
              type="button"
              onClick={() => onSelect(u.userId)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-teal-300 hover:bg-teal-50"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">{name}</p>
                <p className="truncate text-[10px] text-slate-500">
                  {p.phone_number || u.userId.slice(0, 8)}
                  {u.submittedAt
                    ? ` · ${new Date(u.submittedAt).toLocaleString(bn ? 'bn-BD' : 'en-IN')}`
                    : ''}
                </p>
              </div>
              <div className="shrink-0 text-right text-[10px] font-semibold text-slate-700">
                <div>K {u.knowledgeIndex}%</div>
                <div>P {u.cultureIndex}%</div>
                <div className="text-amber-800">G {u.overallGap}</div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">
        {bn ? 'ট্যাপ করলে পুরো উত্তর দেখা যাবে।' : 'Tap a user to see full answers.'}
      </p>
    </div>
  );
}

function UserDetail({ bn, user, profile, onBack }) {
  const name = profile?.full_name || (bn ? 'নাম নেই' : 'No name');
  const byItem = Object.fromEntries((user.rows || []).map((r) => [r.item_id, r]));

  return (
    <div className="space-y-3 rounded-xl border border-teal-100 bg-teal-50/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-900">{name}</p>
          <p className="text-[10px] text-slate-500">
            {profile?.phone_number || user.userId}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-700">
            K {user.knowledgeIndex}% · P {user.cultureIndex}% · Gap {user.overallGap}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700"
        >
          {bn ? 'ফিরুন' : 'Back'}
        </button>
      </div>

      <div className="max-h-[28rem] space-y-2 overflow-y-auto">
        {SAFETY_CULTURE_ITEMS.map((item, i) => {
          const row = byItem[item.id];
          const topic = TOPIC_BY_ID[item.topic];
          const uchitOpt = item.options.find((o) => o.key === row?.answer_uchit);
          const hoyOpt = item.options.find((o) => o.key === row?.answer_hoy);
          return (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                <span className="font-bold text-slate-700">#{i + 1}</span>
                <span>{bn ? topic?.label_bn : topic?.label_en}</span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-800">
                {bn ? item.scenario_bn : item.scenario_en}
              </p>
              {!row ? (
                <p className="mt-2 text-[11px] text-slate-400">
                  {bn ? 'উত্তর নেই' : 'No answer'}
                </p>
              ) : (
                <div className="mt-2 space-y-1 text-[11px]">
                  <p>
                    <span className="font-bold text-teal-800">
                      {bn ? 'উচিত' : 'Should'}:
                    </span>{' '}
                    {row.answer_uchit}.{' '}
                    {uchitOpt ? getOptionLabel(uchitOpt, { bn, step: 'uchit' }) : '—'}
                  </p>
                  <p>
                    <span className="font-bold text-amber-800">
                      {bn ? 'হয়' : 'Happens'}:
                    </span>{' '}
                    {row.answer_hoy}.{' '}
                    {hoyOpt ? getOptionLabel(hoyOpt, { bn, step: 'hoy' }) : '—'}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ConceptPage({ bn, onClose }) {
  const topics = Object.values(TOPIC_BY_ID);
  return (
    <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-emerald-950">
          {bn ? 'জরিপের ধারণা (কনসেপ্ট)' : 'Survey concept'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-emerald-200 bg-white px-2 py-1 text-[10px] font-bold text-emerald-900"
        >
          {bn ? 'বন্ধ' : 'Close'}
        </button>
      </div>

      <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1 text-[12px] leading-relaxed text-slate-800">
        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="text-xs font-bold text-slate-900">
            {bn ? 'কেন এই জরিপ?' : 'Why this survey?'}
          </h3>
          <p className="mt-1.5">
            {bn
              ? 'লাইনম্যান প্রায়ই নিরাপত্তা নিয়ম জানেন, কিন্তু মাঠে চাপে সবসময় মানেন না। সাধারণ কুইজ শুধু জ্ঞান মাপে। এই জরিপ মাঠের আসল অভ্যাস ও সংস্কৃতি বোঝে।'
              : 'Linemen often know the rules but do not always follow them under field pressure. Normal quizzes only measure knowledge. This survey measures lived field culture.'}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="text-xs font-bold text-slate-900">
            {bn ? 'পদ্ধতি: উচিত vs হয়' : 'Method: Should vs Happens'}
          </h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              <span className="font-semibold text-teal-800">
                {bn ? 'কী করা উচিত?' : 'What should be done?'}
              </span>{' '}
              {bn ? '→ নিয়ম / জ্ঞান (Knowledge)' : '→ rule / knowledge'}
            </li>
            <li>
              <span className="font-semibold text-amber-800">
                {bn ? 'এলাকায় সাধারণত কী হয়?' : 'What usually happens in your area?'}
              </span>{' '}
              {bn ? '→ মাঠের বাস্তবতা (Practice / culture)' : '→ field practice / culture'}
            </li>
          </ul>
          <p className="mt-2">
            {bn
              ? 'একই পরিস্থিতি, দুই প্রশ্ন। উচিত ও হয়-এর ভাষা আলাদা—যাতে ইউজার শুধু “সঠিক উত্তর” কপি না করে।'
              : 'Same situation, two questions. Wording differs so users do not just copy the “correct” answer.'}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="text-xs font-bold text-slate-900">
            {bn ? 'স্কোর কী বলে?' : 'What do scores mean?'}
          </h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              <span className="font-semibold">K% (জ্ঞান)</span> —{' '}
              {bn ? 'নিয়ম জানা কতটা ভালো' : 'how well rules are known'}
            </li>
            <li>
              <span className="font-semibold">P% (মাঠ)</span> —{' '}
              {bn ? 'এলাকায় নিরাপদ অভ্যাস কতটা চলে' : 'how safe the reported field habit is'}
            </li>
            <li>
              <span className="font-semibold">Gap = K − P</span> —{' '}
              {bn
                ? 'গ্যাপ বেশি = জানে কিন্তু মাঠে কম মানা হয় (প্রধান সঙ্কেত)'
                : 'high gap = knows the rule but field practice is weaker (main signal)'}
            </li>
          </ul>
          <p className="mt-2 text-[11px] text-slate-600">
            {bn
              ? 'রিপোর্টে বিষয়গুলো গ্যাপ অনুযায়ী সাজানো—কোথায় সংস্কৃতি দুর্বল, সেটা আগে দেখা যায়।'
              : 'Topics are ranked by gap so weak culture areas surface first.'}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="text-xs font-bold text-slate-900">
            {bn ? '৮টি বিষয়' : '8 topics'}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
              >
                {bn ? t.label_bn : t.label_en}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            {bn
              ? `${SAFETY_CULTURE_ITEMS.length}টি পরিস্থিতি × ২ প্রশ্ন = প্রতি রাউন্ডে ${SAFETY_CULTURE_ITEMS.length * 2}টি উত্তর।`
              : `${SAFETY_CULTURE_ITEMS.length} situations × 2 questions = ${SAFETY_CULTURE_ITEMS.length * 2} answers per round.`}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="text-xs font-bold text-slate-900">
            {bn ? 'কখন জরিপ আসে?' : 'When does it appear?'}
          </h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              {bn
                ? `প্রথমবার: অ্যাপে ${CULTURE_SURVEY_FIRST_ACTIVE_DAYS}টি সক্রিয় দিন ব্যবহারের পর`
                : `First time: after ${CULTURE_SURVEY_FIRST_ACTIVE_DAYS} active-use days in the app`}
            </li>
            <li>
              {bn
                ? `পরে: শেষ জমার ${CULTURE_SURVEY_INTERVAL_DAYS} দিন পর আবার`
                : `Later: again ${CULTURE_SURVEY_INTERVAL_DAYS} days after last submission`}
            </li>
            <li>
              {bn
                ? 'ডিউ হলে হোম/নেভ থেকে জরিপে নিয়ে যায়; শেষ হলে অ্যাপ স্বাভাবিক'
                : 'When due, Home/nav routes into the survey; after submit, app is normal'}
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="text-xs font-bold text-slate-900">
            {bn ? 'গোপনীয়তা' : 'Privacy'}
          </h3>
          <p className="mt-1.5">
            {bn
              ? 'ইউজারকে বলা হয় পরিচয় গোপন। পাবলিক লিডারবোর্ডে এই স্কোর যায় না। সারাংশ ও ইউজার উত্তর শুধু অ্যাডমিন প্যানেলে।'
              : 'Users are told identity stays private. Scores do not go to the public leaderboard. Summaries and per-user answers are admin-only.'}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="text-xs font-bold text-slate-900">
            {bn ? 'অ্যাডমিন কী করবেন?' : 'What should admin do?'}
          </h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>{bn ? 'পিরিয়ড সামারি দেখে কোন বিষয়ে গ্যাপ বেশি' : 'Use period summary to spot high-gap topics'}</li>
            <li>{bn ? 'প্রয়োজনে ইউজার ট্যাপ করে পুরো উত্তর দেখা' : 'Open a user to review full answers if needed'}</li>
            <li>{bn ? 'পাবলিক শেমিং নয়—প্রশিক্ষণ ও মাঠ নির্দেশনার জন্য ব্যবহার' : 'Use for coaching and field guidance—not public shaming'}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function QuestionBankPreview({ bn, onClose }) {
  return (
    <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-sky-950">
            {bn
              ? `সব প্রশ্ন (v1) — ${SAFETY_CULTURE_ITEMS.length}টি পরিস্থিতি`
              : `All questions (v1) — ${SAFETY_CULTURE_ITEMS.length} situations`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-sky-200 bg-white px-2 py-1 text-[10px] font-bold text-sky-900"
        >
          {bn ? 'বন্ধ' : 'Close'}
        </button>
      </div>
      <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {SAFETY_CULTURE_ITEMS.map((item, i) => {
          const topic = TOPIC_BY_ID[item.topic];
          return (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                <span className="font-bold text-slate-700">#{i + 1}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                  {bn ? topic?.label_bn : topic?.label_en}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-800">
                {bn ? item.scenario_bn : item.scenario_en}
              </p>
              <p className="mt-2 text-[10px] font-semibold text-teal-800">
                1. {bn ? SAFETY_CULTURE_PROMPTS.uchit_bn : SAFETY_CULTURE_PROMPTS.uchit_en}
              </p>
              <p className="text-[10px] font-semibold text-amber-800">
                2. {bn ? SAFETY_CULTURE_PROMPTS.hoy_bn : SAFETY_CULTURE_PROMPTS.hoy_en}
              </p>
              <ul className="mt-2 space-y-1">
                {item.options.map((opt) => {
                  const best = opt.k_score === 3;
                  return (
                    <li
                      key={opt.key}
                      className={`rounded-lg px-2 py-1.5 text-[11px] leading-snug ${
                        best
                          ? 'border border-teal-200 bg-teal-50 text-teal-950'
                          : 'border border-slate-100 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="font-bold">{opt.key}.</span>{' '}
                      <span className="text-teal-800">
                        {bn ? 'উচিত:' : 'Should:'}{' '}
                        {getOptionLabel(opt, { bn, step: 'uchit' })}
                      </span>
                      <br />
                      <span className="text-amber-800">
                        {bn ? 'হয়:' : 'Happens:'}{' '}
                        {getOptionLabel(opt, { bn, step: 'hoy' })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}
