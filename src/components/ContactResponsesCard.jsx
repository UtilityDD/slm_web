/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { cacheContactPendingCount, fetchSheetContacts, saveContactFollowUp, topicShortLabel } from '../utils/landingContactAdmin';
import { extractIndianMobileDigits } from '../utils/landingContactService';
import SaveSuccessModal from './SaveSuccessModal';

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

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDatetimeLocal(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return toDatetimeLocal(new Date().toISOString());
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fromDatetimeLocal(value) {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function telHref(phone) {
  const digits = extractIndianMobileDigits(phone);
  if (digits.length === 10) return `tel:+91${digits}`;
  const raw = String(phone || '').replace(/[^\d+]/g, '');
  return raw ? `tel:${raw}` : '';
}

function displayPhone(phone) {
  const digits = extractIndianMobileDigits(phone);
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return toEnglishChars(phone);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
            <span className="block h-3.5 w-[70%] rounded-full bg-slate-200" />
            <span className="block h-2.5 w-14 rounded-full bg-slate-100" />
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

function CallPhoneButton({ phone, isEn, variant = 'icon' }) {
  const href = telHref(phone);
  if (!href) return null;
  const label = isEn ? 'Call' : 'কল করুন';
  if (variant === 'row') {
    return (
      <a
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 active:scale-95"
        aria-label={`${label} ${displayPhone(phone)}`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </a>
    );
  }
  return (
    <a
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-600/25 active:scale-[0.98]"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      <span className={isEn ? '' : 'font-bengali'}>{label}</span>
      <span className="font-sans tabular-nums" lang="en">
        {displayPhone(phone)}
      </span>
    </a>
  );
}

function FollowUpForm({ row, isEn, responderName, saving, error, onSave }) {
  const [contactedOn, setContactedOn] = useState(() => toDatetimeLocal(row.contactedOn || Date.now()));
  const [contactedBy, setContactedBy] = useState(() => row.contactedBy || responderName || '');
  const [remarks, setRemarks] = useState(() => row.remarks || '');

  useEffect(() => {
    setContactedOn(toDatetimeLocal(row.contactedOn || Date.now()));
    setContactedBy(row.contactedBy || responderName || '');
    setRemarks(row.remarks || '');
  }, [row.id, row.contactedOn, row.contactedBy, row.remarks, responderName]);

  const fieldClass =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

  return (
    <form
      className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          contactedOn: fromDatetimeLocal(contactedOn),
          contactedBy: contactedBy.trim(),
          remarks: remarks.trim(),
        });
      }}
    >
      <p className={`text-[11px] font-bold uppercase tracking-wide text-slate-500 ${isEn ? '' : 'font-bengali'}`}>
        {isEn ? 'Fill after you reply' : 'যোগাযোগের পর পূরণ করুন'}
      </p>
      <label className="block">
        <span className={`mb-1 block text-[11px] font-semibold text-slate-600 ${isEn ? '' : 'font-bengali'}`}>
          {isEn ? 'Contacted On' : 'যোগাযোগের তারিখ'}
        </span>
        <input
          type="datetime-local"
          lang="en"
          value={contactedOn}
          onChange={(e) => setContactedOn(e.target.value)}
          className={`${fieldClass} font-sans tabular-nums`}
        />
      </label>
      <label className="block">
        <span className={`mb-1 block text-[11px] font-semibold text-slate-600 ${isEn ? '' : 'font-bengali'}`}>
          {isEn ? 'Contacted By' : 'যোগাযোগ করেছেন'}
        </span>
        <input
          type="text"
          maxLength={120}
          value={contactedBy}
          onChange={(e) => setContactedBy(e.target.value)}
          className={fieldClass}
          placeholder={isEn ? 'Your name' : 'আপনার নাম'}
        />
      </label>
      <label className="block">
        <span className={`mb-1 block text-[11px] font-semibold text-slate-600 ${isEn ? '' : 'font-bengali'}`}>
          {isEn ? 'Remarks' : 'মন্তব্য'}
        </span>
        <textarea
          maxLength={500}
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className={`${fieldClass} resize-y`}
          placeholder={isEn ? 'What you said or agreed' : 'কী বলা হয়েছে'}
        />
      </label>
      {error ? (
        <p className={`text-[11px] font-semibold text-rose-600 ${isEn ? '' : 'font-bengali'}`}>{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-sky-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60 active:scale-[0.98]"
      >
        {saving
          ? isEn
            ? 'Updating…'
            : 'আপডেট হচ্ছে…'
          : isEn
            ? 'Update'
            : 'আপডেট'}
      </button>
    </form>
  );
}

export default function ContactResponsesCard({
  language = 'bn',
  defaultOpen = false,
  standalone = false,
  userProfile = null,
}) {
  const isEn = language === 'en';
  const responderName = String(userProfile?.full_name || '').trim();
  const startOpen = Boolean(defaultOpen || standalone);
  const [open, setOpen] = useState(startOpen);
  const [loading, setLoading] = useState(startOpen);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleSave = async (row, values) => {
    const id = row.id;
    if (!id || savingId) return;
    setSavingId(id);
    setSaveError('');
    setSaveSuccess(false);
    const next = {
      contactedOn: values.contactedOn,
      contactedBy: values.contactedBy,
      remarks: values.remarks,
    };
    try {
      await saveContactFollowUp({ id, ...next });
      setRows((prev) => {
        const updated = prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...next,
                pending: !(next.contactedOn || next.contactedBy || next.remarks),
              }
            : item
        );
        cacheContactPendingCount(updated.filter((item) => item.pending !== false).length);
        return updated;
      });
      await wait(1200);
      const fresh = await fetchSheetContacts();
      setRows(fresh);
      const updated = fresh.find((item) => item.id === id);
      if (updated?.pending) {
        setSaveError(
          isEn
            ? 'Sheet did not update yet. Paste the new Apps Script and deploy a new version, then try Update again.'
            : 'শিট এখনও আপডেট হয়নি। নতুন Apps Script পেস্ট করে নতুন ভার্সন ডিপ্লয় করুন, তারপর আবার আপডেট করুন।'
        );
      } else {
        setSaveSuccess(true);
      }
    } catch {
      setSaveError(isEn ? 'Could not update. Try again.' : 'আপডেট হয়নি। আবার চেষ্টা করুন।');
    } finally {
      setSavingId(null);
    }
  };

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
            <ul className="max-h-[36rem] space-y-2 overflow-y-auto custom-scrollbar animate-fade-in">
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
                    <div className="flex items-start gap-1 pr-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedId(isOpen ? null : id);
                          setSaveError('');
                        }}
                        className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-left"
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            pending ? 'bg-rose-600' : 'bg-slate-300'
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-900">
                            {row.name}
                          </span>
                          {row.district ? (
                            <span className="block truncate text-[11px] font-medium text-slate-500">
                              {row.district}
                            </span>
                          ) : null}
                          <span className="mt-0.5 block font-sans text-[10px] tabular-nums text-slate-400" lang="en">
                            {formatWhen(row.timestamp)}
                          </span>
                          <span
                            className={`mt-0.5 block text-[10px] font-bold uppercase tracking-wide ${
                              pending ? 'text-rose-700' : 'text-slate-500'
                            }`}
                          >
                            {topicShortLabel(row.topic || row.topicLabel, isEn)}
                          </span>
                        </span>
                        <span className="text-slate-400">{isOpen ? '−' : '+'}</span>
                      </button>
                      <CallPhoneButton phone={row.phone} isEn={isEn} variant="row" />
                    </div>
                    {isOpen && (
                      <div className="space-y-2 border-t border-slate-100/80 px-3 pb-3 pt-2">
                        <p className="whitespace-pre-wrap text-sm text-slate-800">{row.message}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          {row.phone ? (
                            <a
                              href={telHref(row.phone)}
                              className="font-sans font-semibold tabular-nums text-emerald-700"
                              lang="en"
                            >
                              {displayPhone(row.phone)}
                            </a>
                          ) : null}
                          {row.email ? <span className="font-sans" lang="en">{row.email}</span> : null}
                        </div>
                        <CallPhoneButton phone={row.phone} isEn={isEn} />
                        <FollowUpForm
                          row={row}
                          isEn={isEn}
                          responderName={responderName}
                          saving={savingId === id}
                          error={savingId === id || expandedId === id ? saveError : ''}
                          onSave={(values) => handleSave(row, values)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <SaveSuccessModal
        isOpen={saveSuccess}
        onClose={() => setSaveSuccess(false)}
        language={language}
        title={isEn ? 'Successfully updated' : 'সফলভাবে আপডেট হয়েছে'}
        message={isEn ? 'The sheet has been updated.' : 'শিট আপডেট হয়েছে।'}
      />
    </div>
  );
}
