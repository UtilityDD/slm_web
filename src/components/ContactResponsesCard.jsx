/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { fetchSheetContacts, topicShortLabel } from '../utils/landingContactAdmin';

const FILTERS = [
  { id: 'pending', en: 'Pending', bn: 'বাকি' },
  { id: 'all', en: 'All', bn: 'সব' },
];

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toEnglishChars(value) {
  return String(value || '').replace(/[০-৯٠-٩]/g, (ch) => {
    const bn = BN_DIGITS.indexOf(ch);
    if (bn >= 0) return String(bn);
    const ar = AR_DIGITS.indexOf(ch);
    return ar >= 0 ? String(ar) : ch;
  });
}

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return toEnglishChars(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn',
  });
}

function PendingBadge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-2 inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-white shadow-sm shadow-rose-600/40 ring-2 ring-rose-200">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function SheetRowsSkeleton() {
  return (
    <ul className="space-y-2" aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="flex animate-pulse items-start gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-200" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="flex gap-2">
              <span className="block h-2.5 w-10 rounded-full bg-rose-100" />
              <span className="block h-2.5 w-14 rounded-full bg-slate-100" />
            </span>
            <span className="block h-3.5 w-[70%] rounded-full bg-slate-200" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ isEn, pending }) {
  return (
    <div className="flex min-h-[10rem] flex-col items-center justify-center px-4 py-8 text-center animate-fade-in">
      <p className={`text-sm font-semibold text-slate-600 ${isEn ? '' : 'font-bengali'}`}>
        {pending
          ? isEn
            ? 'Nothing pending.'
            : 'বাকি কিছু নেই।'
          : isEn
            ? 'No responses yet.'
            : 'এখনও কোনো প্রতিক্রিয়া নেই।'}
      </p>
    </div>
  );
}

export default function ContactResponsesCard({
  language = 'bn',
  defaultOpen = false,
  standalone = false,
}) {
  const isEn = language === 'en';
  const startOpen = Boolean(defaultOpen || standalone);
  const [open, setOpen] = useState(startOpen);
  const [loading, setLoading] = useState(startOpen);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchSheetContacts());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const pendingCount = rows.filter((row) => row.pending !== false).length;
  const visible = rows.filter((row) => (filter === 'pending' ? row.pending !== false : true));

  return (
    <div className={`${standalone ? 'mb-0' : 'mb-5'} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}>
      {!standalone && (
        <button
          type="button"
          onClick={() => {
            setOpen((v) => {
              if (!v) setLoading(true);
              return !v;
            });
          }}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-orange-50/60"
        >
          <span className="flex items-center text-sm font-semibold text-slate-800">
            Contact Us
            <PendingBadge count={pendingCount} />
          </span>
          <span className="text-xs text-slate-400">{open ? '▲' : '▼'}</span>
        </button>
      )}

      {open && (
        <div className={`space-y-3 px-4 pb-4 pt-3 ${standalone ? '' : 'border-t border-slate-100'}`}>
          <div className="flex gap-1.5">
            {FILTERS.map((item) => {
              const active = filter === item.id;
              const pendingTab = item.id === 'pending';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${
                    active && pendingTab
                      ? 'bg-rose-600 text-white'
                      : active
                        ? 'bg-slate-800 text-white'
                        : pendingTab
                          ? 'border border-rose-200 bg-rose-50 text-rose-700'
                          : 'border border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {isEn ? item.en : item.bn}
                  {pendingTab && loading && rows.length === 0 ? (
                    <span
                      className={`ml-1.5 h-4 w-4 animate-pulse rounded-full ${
                        active ? 'bg-white/55' : 'bg-rose-300'
                      }`}
                    />
                  ) : pendingTab && pendingCount > 0 ? (
                    <span
                      className={`ml-1.5 min-w-[1.15rem] rounded-full px-1 text-center text-[10px] font-black tabular-nums ${
                        active ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {loading && rows.length === 0 ? (
            <SheetRowsSkeleton />
          ) : visible.length === 0 ? (
            <EmptyState isEn={isEn} pending={filter === 'pending'} />
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto custom-scrollbar animate-fade-in">
              {visible.map((row) => {
                const id = row.id || `${row.timestamp}-${row.phone}`;
                const isOpen = expandedId === id;
                const pending = row.pending !== false;
                return (
                  <li
                    key={id}
                    className={
                      pending
                        ? 'rounded-xl border border-rose-200 bg-rose-50'
                        : 'rounded-xl border border-slate-200/80 bg-white'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : id)}
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          pending ? 'bg-rose-600' : 'bg-slate-300'
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide ${
                              pending ? 'text-rose-700' : 'text-slate-500'
                            }`}
                          >
                            {topicShortLabel(row.topic || row.topicLabel, isEn)}
                          </span>
                          <span className="font-sans text-[10px] tabular-nums text-slate-400" lang="en">
                            {formatWhen(row.timestamp)}
                          </span>
                        </span>
                        <span className="block truncate text-sm font-bold text-slate-900">
                          {row.name}
                          {row.district ? ` · ${row.district}` : ''}
                        </span>
                      </span>
                      <span className="text-slate-400">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div className="space-y-1 border-t border-slate-100/80 px-3 pb-3 pt-2">
                        <p className="whitespace-pre-wrap text-sm text-slate-800">{row.message}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          {row.phone ? (
                            <span className="font-sans tabular-nums" lang="en">
                              {toEnglishChars(row.phone)}
                            </span>
                          ) : null}
                          {row.email ? <span className="font-sans" lang="en">{row.email}</span> : null}
                        </div>
                        {!pending && (row.contactedOn || row.contactedBy || row.remarks) ? (
                          <p className="text-[11px] text-slate-500">
                            {row.contactedOn ? (
                              <span className="font-sans tabular-nums" lang="en">
                                {toEnglishChars(row.contactedOn)}
                              </span>
                            ) : null}
                            {row.contactedOn && (row.contactedBy || row.remarks) ? ' · ' : null}
                            {row.contactedBy || null}
                            {row.contactedBy && row.remarks ? ' · ' : null}
                            {row.remarks || null}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
