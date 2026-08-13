/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { PPE_NUDGE_ITEM_ORDER, getPpeItem } from '../data/ppeItems';
import { summarizePpeNudgeCollection } from '../utils/ppeNudge';
import PpeItemIcon from './safety/ppe/PpeItemIcon';

const PAGE_SIZE = 1000;

const STATUS_FILTERS = [
  { id: 'pending_all', en: 'Pending', bn: 'বাকি' },
  { id: 'missing_essential', en: 'Missing essential', bn: 'অত্যাবশ্যক নেই' },
  { id: 'not_started', en: 'Not started', bn: 'শুরু হয়নি' },
  { id: 'complete', en: 'Complete', bn: 'সম্পূর্ণ' },
  { id: 'excluded', en: 'Excluded jobs', bn: 'বাদ' },
  { id: 'all', en: 'All', bn: 'সব' },
];

function itemLabel(name, isEn) {
  const item = getPpeItem(name);
  if (!item) return name;
  return isEn ? item.name : item.bn;
}

function statusBadge(status, isEn) {
  if (status === 'complete') {
    return { className: 'bg-emerald-100 text-emerald-700', label: isEn ? 'Complete' : 'সম্পূর্ণ' };
  }
  if (status === 'excluded') {
    return { className: 'bg-slate-200 text-slate-600', label: isEn ? 'Excluded' : 'বাদ' };
  }
  if (status === 'not_started') {
    return { className: 'bg-slate-200 text-slate-600', label: isEn ? 'Not started' : 'শুরু হয়নি' };
  }
  return { className: 'bg-amber-100 text-amber-800', label: isEn ? 'Pending' : 'বাকি' };
}

async function fetchProfilesPage() {
  const rows = [];
  let from = 0;
  let selectCols =
    'id, slm_id, full_name, role, phone, phone_number, job, ppe_nudge_state, last_login_at';
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('profiles')
      .select(selectCols)
      .neq('role', 'guest')
      .order('full_name', { ascending: true })
      .range(from, to);
    if (error) {
      const missing =
        /ppe_nudge_state/i.test(error.message || '') || error.code === '42703';
      if (missing && selectCols.includes('ppe_nudge_state')) {
        selectCols = selectCols.replace(', ppe_nudge_state', '');
        from = 0;
        rows.length = 0;
        continue;
      }
      throw error;
    }
    const batch = (data || []).map((row) =>
      row.ppe_nudge_state == null ? { ...row, ppe_nudge_state: {} } : row
    );
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchPpeRowsForUsers(userIds) {
  const byUser = {};
  for (const id of userIds) byUser[id] = [];
  if (!userIds.length) return byUser;

  const chunk = 200;
  for (let i = 0; i < userIds.length; i += chunk) {
    const slice = userIds.slice(i, i + chunk);
    const { data, error } = await supabase
      .from('user_ppe')
      .select('id, user_id, name, condition, count, updated_at, created_at')
      .in('user_id', slice);
    if (error) throw error;
    for (const row of data || []) {
      if (!byUser[row.user_id]) byUser[row.user_id] = [];
      byUser[row.user_id].push(row);
    }
  }
  return byUser;
}

export default function PpeNudgeStatusPanel({ language = 'en', defaultOpen = false }) {
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
      const profiles = await fetchProfilesPage();
      const byUser = await fetchPpeRowsForUsers(profiles.map((p) => p.id));
      setSummary(summarizePpeNudgeCollection(profiles, byUser));
      setLoadedOnce(true);
    } catch (err) {
      console.error('PPE nudge status load failed:', err);
      setError(err?.message || 'Failed to load');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !loadedOnce && !loading) void load();
  }, [open, loadedOnce, loading, load]);

  const filteredUsers = useMemo(() => {
    if (!summary?.users) return [];
    const needle = search.trim().toLowerCase();
    return summary.users.filter((u) => {
      if (statusFilter === 'pending_all' && (u.status === 'complete' || u.status === 'excluded')) {
        return false;
      }
      if (statusFilter === 'missing_essential' && !(u.eligible && u.missingEssentials?.length)) {
        return false;
      }
      if (statusFilter === 'not_started' && u.status !== 'not_started') return false;
      if (statusFilter === 'complete' && u.status !== 'complete') return false;
      if (statusFilter === 'excluded' && u.status !== 'excluded') return false;
      if (!needle) return true;
      const hay = `${u.full_name} ${u.slm_id} ${u.phone} ${u.job} ${u.role}`.toLowerCase();
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
          🦺 {isEn ? 'Field PPE status' : 'ফিল্ড PPE স্ট্যাটাস'}
          {summary && !loading ? (
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({pendingCount} {isEn ? 'pending' : 'বাকি'} · {summary.avgEssential}%{' '}
              {isEn ? 'essentials' : 'অত্যাবশ্যক'})
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
                ? 'Targets field jobs only (excludes Non-Technical, Engineer, Others). Essentials: gloves, helmet, harness, shoes, discharge rod, gum boot, voltage detector.'
                : 'শুধু ফিল্ড কাজ (Non-Technical, Engineer, Others বাদ)। অত্যাবশ্যক: গ্লাভস, হেলমেট, হারনেস, জুতো, ডিসচার্জ রড, গামবুট, ভোল্টেজ ডিটেক্টর।'}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50"
            >
              {loading ? (isEn ? 'Loading…' : 'লোড…') : isEn ? 'Refresh' : 'রিফ্রেশ'}
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
                  { label: isEn ? 'Eligible' : 'যোগ্য', value: summary.eligible, tone: 'bg-slate-50 text-slate-800' },
                  { label: isEn ? 'Complete' : 'সম্পূর্ণ', value: summary.complete, tone: 'bg-emerald-50 text-emerald-800' },
                  { label: isEn ? 'Pending' : 'বাকি', value: pendingCount, tone: 'bg-amber-50 text-amber-900' },
                  {
                    label: isEn ? 'Essentials avg' : 'অত্যাবশ্যক গড়',
                    value: `${summary.avgEssential}%`,
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
                  {isEn ? 'Missing essentials' : 'অত্যাবশ্যক নেই'}:{' '}
                  <span className="text-slate-800 tabular-nums">{summary.missingEssentialUsers}</span>
                </span>
                <span>
                  {isEn ? 'Excluded jobs' : 'বাদ কাজ'}:{' '}
                  <span className="text-slate-800 tabular-nums">{summary.excluded}</span>
                </span>
                <span>
                  {isEn ? 'Ever prompted' : 'প্রম্পট'}:{' '}
                  <span className="text-slate-800 tabular-nums">{summary.prompted}</span>
                </span>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">
                  {isEn ? 'Per-item ownership (eligible)' : 'আইটেম অনুযায়ী (যোগ্য)'}
                </p>
                <ul className="space-y-2">
                  {PPE_NUDGE_ITEM_ORDER.map((name) => {
                    const stats = summary.perItem[name];
                    const item = getPpeItem(name);
                    const denom = summary.eligible || 1;
                    const pct = Math.round((stats.owned / denom) * 100);
                    return (
                      <li key={name}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <PpeItemIcon item={item} size="xs" rounded="rounded-md" />
                            {itemLabel(name, isEn)}
                            {item?.essential ? (
                              <span className="ml-1 text-[9px] font-bold text-orange-600">
                                {isEn ? 'ESS' : 'অত্যাবশ্যক'}
                              </span>
                            ) : null}
                            {item?.pair ? (
                              <span className="ml-1 text-[9px] text-slate-400">
                                {isEn ? 'pair' : 'জোড়া'}
                              </span>
                            ) : null}
                          </span>
                          <span className="tabular-nums text-slate-500">
                            {stats.owned}/{summary.eligible} · {pct}%
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
                  placeholder={isEn ? 'Search name, SLM ID, job…' : 'নাম, SLM ID, কাজ…'}
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
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                              {u.slm_id || '—'}
                              {u.job ? ` · ${u.job}` : ''}
                              {u.phone ? ` · ${u.phone}` : ''}
                            </p>
                            {u.missingEssentials?.length ? (
                              <p className="mt-1 text-[10px] font-semibold text-rose-600">
                                {isEn ? 'Missing' : 'নেই'}:{' '}
                                {u.missingEssentials
                                  .slice(0, 3)
                                  .map((n) => itemLabel(n, isEn))
                                  .join(', ')}
                                {u.missingEssentials.length > 3 ? '…' : ''}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-black tabular-nums text-orange-700">
                              {u.essentialOwned}/{u.essentialTotal}
                            </p>
                            {u.nextItem ? (
                              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                {isEn ? 'Next' : 'পরবর্তী'}: {itemLabel(u.nextItem, isEn)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
