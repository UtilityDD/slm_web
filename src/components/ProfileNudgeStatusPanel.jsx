/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { PROFILE_NUDGE_FIELD_ORDER } from '../data/profileFieldOptions';
import {
  PROFILE_NUDGE_ADMIN_SELECT,
  summarizeNudgeCollection,
} from '../utils/profileNudge';

const PAGE_SIZE = 1000;

const FIELD_LABELS = {
  en: {
    avatar_url: 'Photo',
    district: 'District',
    block: 'Block',
    job: 'Job',
    dob: 'DOB',
    education: 'Education',
    blood_group: 'Blood',
    is_donor: 'Donor',
  },
  bn: {
    avatar_url: 'ছবি',
    district: 'জেলা',
    block: 'ব্লক',
    job: 'কাজ',
    dob: 'জন্ম',
    education: 'শিক্ষা',
    blood_group: 'রক্ত',
    is_donor: 'দাতা',
  },
};

const STATUS_FILTERS = [
  { id: 'pending_all', en: 'Pending', bn: 'বাকি' },
  { id: 'not_started', en: 'Not started', bn: 'শুরু হয়নি' },
  { id: 'pending', en: 'In progress', bn: 'চলছে' },
  { id: 'complete', en: 'Complete', bn: 'সম্পূর্ণ' },
  { id: 'all', en: 'All', bn: 'সব' },
];

function fieldLabel(field, isEn) {
  return (isEn ? FIELD_LABELS.en : FIELD_LABELS.bn)[field] || field;
}

function statusBadge(status, isEn) {
  if (status === 'complete') {
    return {
      className: 'bg-emerald-100 text-emerald-700',
      label: isEn ? 'Complete' : 'সম্পূর্ণ',
    };
  }
  if (status === 'not_started') {
    return {
      className: 'bg-slate-200 text-slate-600',
      label: isEn ? 'Not started' : 'শুরু হয়নি',
    };
  }
  return {
    className: 'bg-amber-100 text-amber-800',
    label: isEn ? 'Pending' : 'বাকি',
  };
}

async function fetchAllNudgeProfiles() {
  const rows = [];
  let from = 0;
  let selectCols = PROFILE_NUDGE_ADMIN_SELECT;
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('profiles')
      .select(selectCols)
      .neq('role', 'guest')
      .order('full_name', { ascending: true })
      .range(from, to);
    if (error) {
      const missingNudgeCol =
        /profile_nudge_state/i.test(error.message || '') ||
        error.code === '42703';
      if (missingNudgeCol && selectCols.includes('profile_nudge_state')) {
        selectCols = selectCols.replace(', profile_nudge_state', '').replace('profile_nudge_state, ', '');
        from = 0;
        rows.length = 0;
        continue;
      }
      throw error;
    }
    const batch = (data || []).map((row) =>
      row.profile_nudge_state == null ? { ...row, profile_nudge_state: {} } : row
    );
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

/**
 * Admin collapsible: essential profile (ID nudge) collection summary + pending list.
 */
export default function ProfileNudgeStatusPanel({ language = 'en', defaultOpen = false }) {
  const isEn = language !== 'bn';
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending_all');
  const [search, setSearch] = useState('');
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profiles = await fetchAllNudgeProfiles();
      setSummary(summarizeNudgeCollection(profiles));
      setLoadedOnce(true);
    } catch (err) {
      console.error('Profile nudge status load failed:', err);
      setError(err?.message || 'Failed to load');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !loadedOnce && !loading) {
      void load();
    }
  }, [open, loadedOnce, loading, load]);

  const filteredUsers = useMemo(() => {
    if (!summary?.users) return [];
    const needle = search.trim().toLowerCase();
    return summary.users.filter((u) => {
      if (statusFilter === 'pending_all' && u.status === 'complete') return false;
      if (statusFilter === 'pending' && u.status !== 'pending') return false;
      if (statusFilter === 'not_started' && u.status !== 'not_started') return false;
      if (statusFilter === 'complete' && u.status !== 'complete') return false;
      if (!needle) return true;
      const hay = `${u.full_name} ${u.slm_id} ${u.phone} ${u.role}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [summary, statusFilter, search]);

  const pendingCount = summary ? summary.pending + summary.notStarted : 0;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-orange-50/60 transition-colors"
      >
        <span className="font-semibold text-slate-800 text-sm">
          🪪 {isEn ? 'Profile update status' : 'প্রোফাইল আপডেট স্ট্যাটাস'}
          {summary && !loading ? (
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({pendingCount} {isEn ? 'pending' : 'বাকি'} · {summary.avgFilled}% {isEn ? 'avg' : 'গড়'})
            </span>
          ) : null}
        </span>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500 max-w-xl">
              {isEn
                ? 'Essential SmartLineman ID fields collected via progressive prompts (photo, location, job, DOB, education, blood, donor).'
                : 'প্রগ্রেসিভ প্রম্পট দিয়ে সংগ্রহ করা স্মার্টলাইনম্যান আইডি ফিল্ড (ছবি, এলাকা, কাজ, জন্ম, শিক্ষা, রক্ত, দাতা)।'}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50"
            >
              {loading
                ? isEn
                  ? 'Loading…'
                  : 'লোড হচ্ছে…'
                : isEn
                  ? 'Refresh'
                  : 'রিফ্রেশ'}
            </button>
          </div>

          {error ? (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">{isEn ? 'Could not load status.' : 'স্ট্যাটাস লোড হয়নি।'}</p>
              <p className="text-xs mt-1 text-amber-700/80">{error}</p>
            </div>
          ) : null}

          {loading && !summary ? (
            <p className="text-sm text-slate-500">{isEn ? 'Loading…' : 'লোড হচ্ছে…'}</p>
          ) : null}

          {summary ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    label: isEn ? 'Users' : 'ইউজার',
                    value: summary.total,
                    tone: 'bg-slate-50 text-slate-800',
                  },
                  {
                    label: isEn ? 'Complete' : 'সম্পূর্ণ',
                    value: summary.complete,
                    tone: 'bg-emerald-50 text-emerald-800',
                  },
                  {
                    label: isEn ? 'Pending' : 'বাকি',
                    value: pendingCount,
                    tone: 'bg-amber-50 text-amber-900',
                  },
                  {
                    label: isEn ? 'Avg filled' : 'গড় পূরণ',
                    value: `${summary.avgFilled}%`,
                    tone: 'bg-orange-50 text-orange-900',
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className={`rounded-xl border border-slate-200/70 px-3 py-2.5 ${card.tone}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{card.label}</p>
                    <p className="mt-0.5 text-lg font-black tabular-nums">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
                <span>
                  {isEn ? 'Not started' : 'শুরু হয়নি'}:{' '}
                  <span className="text-slate-800 tabular-nums">{summary.notStarted}</span>
                </span>
                <span>
                  {isEn ? 'In progress' : 'চলছে'}:{' '}
                  <span className="text-slate-800 tabular-nums">{summary.pending}</span>
                </span>
                <span>
                  {isEn ? 'Ever prompted' : 'প্রম্পট পেয়েছে'}:{' '}
                  <span className="text-slate-800 tabular-nums">{summary.prompted}</span>
                </span>
                <span>
                  {isEn ? 'Skip events' : 'স্কিপ'}:{' '}
                  <span className="text-slate-800 tabular-nums">{summary.skipEvents}</span>
                </span>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">
                  {isEn ? 'Per-field fill rate' : 'ফিল্ড অনুযায়ী পূরণ'}
                </p>
                <ul className="space-y-2">
                  {PROFILE_NUDGE_FIELD_ORDER.map((field) => {
                    const stats = summary.perField[field];
                    const pct =
                      summary.total > 0
                        ? Math.round((stats.collected / summary.total) * 100)
                        : 0;
                    return (
                      <li key={field}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
                          <span>{fieldLabel(field, isEn)}</span>
                          <span className="tabular-nums text-slate-500">
                            {stats.collected}/{summary.total} · {pct}%
                            {stats.skipped > 0
                              ? ` · ${stats.skipped} ${isEn ? 'skipped' : 'স্কিপ'}`
                              : ''}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                            style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FILTERS.map((f) => {
                    const active = statusFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStatusFilter(f.id)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                          active
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-orange-50'
                        }`}
                      >
                        {isEn ? f.en : f.bn}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isEn ? 'Search name, SLM ID, phone…' : 'নাম, SLM ID, ফোন…'}
                  className="w-full min-h-[40px] rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200/60"
                />
              </div>

              {filteredUsers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {isEn ? 'No users in this filter.' : 'এই ফিল্টারে কেউ নেই।'}
                </p>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto custom-scrollbar">
                  {filteredUsers.map((u) => {
                    const badge = statusBadge(u.status, isEn);
                    return (
                      <li
                        key={u.id}
                        className="rounded-xl border border-slate-200/70 bg-orange-50/40 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {u.full_name || (isEn ? 'Unnamed' : 'নামহীন')}
                              </p>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                              {u.slm_id || '—'}
                              {u.phone ? ` · ${u.phone}` : ''}
                              {u.role ? ` · ${u.role}` : ''}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-black tabular-nums text-orange-700">
                              {u.filled}/{u.total}
                            </p>
                            {u.nextField ? (
                              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                {isEn ? 'Next' : 'পরবর্তী'}: {fieldLabel(u.nextField, isEn)}
                              </p>
                            ) : null}
                            {u.lastPromptDate ? (
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {isEn ? 'Last ask' : 'শেষ জিজ্ঞাসা'} {u.lastPromptDate}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? `Showing ${filteredUsers.length} of ${summary.total} non-guest users.`
                  : `${summary.total} জন নন-গেস্টের মধ্যে ${filteredUsers.length} জন দেখানো হচ্ছে।`}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
