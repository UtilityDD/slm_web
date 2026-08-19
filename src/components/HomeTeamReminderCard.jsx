import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import NativeSheetHandle from './NativeSheetHandle';
import { supabase } from '../supabaseClient';
import { leaderboardService } from '../utils/leaderboardService';
import { hapticImpact, pushNativeBackHandler } from '../utils/nativeAndroidUx';
import { requestManager } from '../utils/requestManager';
import {
  buildTeamRoster,
  markRemindedToday,
  openTeamReminderComposer,
  pickTeamReminderStory,
  readRemindedDates,
  readRemindedIdsToday,
  reminderSendLimit,
} from '../utils/teamReminder';

const TEAM_SELECT = 'id, full_name, phone, phone_number, last_login_at, role, supervisor_id';

function mergeUniqueProfiles(...lists) {
  const seen = new Set();
  const rows = [];
  for (const list of lists) {
    for (const row of list || []) {
      if (!row?.id || seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }
  return rows.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'bn'));
}

/** Admin: people tagged to this admin, plus linemen tagged to those Safety Mitras. */
async function fetchReminderTeam(userId, role) {
  if (role !== 'admin') {
    const { data, error } = await supabase
      .from('profiles')
      .select(TEAM_SELECT)
      .eq('supervisor_id', userId)
      .eq('role', 'lineman')
      .order('full_name', { ascending: true })
      .limit(500);
    if (error) throw error;
    return data || [];
  }

  const { data: direct, error: directError } = await supabase
    .from('profiles')
    .select(TEAM_SELECT)
    .eq('supervisor_id', userId)
    .in('role', ['lineman', 'safety mitra'])
    .order('full_name', { ascending: true })
    .limit(500);
  if (directError) throw directError;

  const tagged = direct || [];
  const mitraIds = tagged.filter((row) => row.role === 'safety mitra').map((row) => row.id);
  if (mitraIds.length === 0) return tagged;

  const { data: underMitras, error: underError } = await supabase
    .from('profiles')
    .select(TEAM_SELECT)
    .in('supervisor_id', mitraIds)
    .eq('role', 'lineman')
    .order('full_name', { ascending: true })
    .limit(1500);
  if (underError) throw underError;

  return mergeUniqueProfiles(tagged, underMitras);
}

function statusClass(status) {
  if (status === 'active') return 'text-emerald-700';
  if (status === 'idle') return 'text-amber-700';
  if (status === 'sent') return 'text-sky-700';
  return 'text-slate-400';
}

function roleShort(role, bn) {
  if (role === 'safety mitra') return bn ? 'মিত্র' : 'Mitra';
  if (role === 'lineman') return bn ? 'লাইনম্যান' : 'LM';
  return '';
}

function GuideIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 11v5" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2a9.84 9.84 0 0 0-8.52 14.76L2 22l5.39-1.42A9.94 9.94 0 1 0 12.04 2Zm0 17.99a8.15 8.15 0 0 1-4.15-1.14l-.3-.18-3.2.84.85-3.12-.2-.32A8.15 8.15 0 1 1 12.04 20Zm4.47-6.1c-.24-.12-1.45-.72-1.68-.8-.22-.08-.38-.12-.55.12-.16.25-.63.8-.77.97-.14.16-.28.18-.53.06-.24-.12-1.03-.38-1.96-1.21a7.35 7.35 0 0 1-1.36-1.7c-.14-.24-.02-.37.1-.49.11-.11.25-.28.37-.42.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.3-.22.25-.85.83-.85 2.02s.87 2.34.99 2.5c.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.45-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

function SmsIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.4a2.8 2.8 0 0 1-2.8 2.8H9.2L4 21V6.8Z"
      />
    </svg>
  );
}

export default function HomeTeamReminderCard({ userId, role = 'safety mitra', language = 'bn' }) {
  const bn = language !== 'en';
  const isAdmin = role === 'admin';
  const sendLimit = reminderSendLimit(role);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState('roster');
  const [guideOpen, setGuideOpen] = useState(false);
  const [channel, setChannel] = useState('whatsapp');
  const [story, setStory] = useState(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [openedOnce, setOpenedOnce] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [sentTick, setSentTick] = useState(0);
  const editedRef = useRef(false);

  const loadTeam = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setFetchError(false);
    try {
      const rows = await requestManager.fetch(
        `team_reminder_connected_v1_${role}_${userId}`,
        () => fetchReminderTeam(userId, role),
        { ttl: 5, swr: true }
      );
      setTeam(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.warn('Team reminder fetch failed:', err);
      setTeam([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const sentDates = useMemo(() => readRemindedDates(userId), [userId, sheetOpen, sentTick]);
  const alreadyIds = useMemo(() => readRemindedIdsToday(userId), [userId, sheetOpen, sentTick]);

  const roster = useMemo(
    () => buildTeamRoster(team, { language, alreadyIds, sentDates }),
    [team, language, alreadyIds, sentDates]
  );

  const recipients = useMemo(() => {
    const list = [];
    for (const row of roster) {
      if (!selectedIds.has(row.id) || !row.digits) continue;
      list.push({
        id: row.id,
        role: row.role,
        fullName: row.fullName,
        firstName: row.firstName,
        digits: row.digits,
      });
      if (list.length >= sendLimit) break;
    }
    return list;
  }, [roster, selectedIds, sendLimit]);

  const current = recipients[index] || null;
  const message = draft.trim();

  useEffect(() => {
    const next = story?.message || '';
    if (!next || editedRef.current) return;
    setDraft(next);
  }, [story?.message]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetStep('roster');
    setOpenedOnce(false);
  }, []);

  const closeGuide = useCallback(() => {
    setGuideOpen(false);
  }, []);

  const overlayOpen = sheetOpen || guideOpen;

  useEffect(() => {
    if (!overlayOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const pop = pushNativeBackHandler(() => {
      if (guideOpen) {
        closeGuide();
        return true;
      }
      if (sheetStep === 'compose') {
        setSheetStep('roster');
        setOpenedOnce(false);
        return true;
      }
      closeSheet();
      return true;
    });
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (guideOpen) closeGuide();
      else if (sheetStep === 'compose') {
        setSheetStep('roster');
        setOpenedOnce(false);
      } else closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      pop();
      window.removeEventListener('keydown', onKey);
    };
  }, [overlayOpen, guideOpen, sheetStep, closeSheet, closeGuide]);

  const openSheet = (nextChannel) => {
    if (navigator.vibrate) navigator.vibrate(5);
    setChannel(nextChannel);
    setIndex(0);
    setOpenedOnce(false);
    setGuideOpen(false);
    setSheetStep('roster');
    const next = new Set();
    for (const row of roster) {
      if (row.status !== 'idle' || !row.digits) continue;
      next.add(row.id);
      if (next.size >= sendLimit) break;
    }
    setSelectedIds(next);
    setSheetOpen(true);
  };

  const loadStory = async () => {
    if (story || storyLoading) return;
    setStoryLoading(true);
    try {
      const hallOfFame = await leaderboardService.fetchHallOfFame(false).catch(() => []);
      setStory(pickTeamReminderStory({ team, hallOfFame: hallOfFame || [], language }));
    } catch (err) {
      console.warn('Team reminder story failed:', err);
      setStory(pickTeamReminderStory({ team, hallOfFame: [], language }));
    } finally {
      setStoryLoading(false);
    }
  };

  const goCompose = () => {
    if (!recipients.length) return;
    if (navigator.vibrate) navigator.vibrate(5);
    setIndex(0);
    setOpenedOnce(false);
    setSheetStep('compose');
    void loadStory();
  };

  const toggleSelected = (row) => {
    if (!row?.digits) return;
    if (navigator.vibrate) navigator.vibrate(5);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id);
      else {
        if (next.size >= sendLimit) return prev;
        next.add(row.id);
      }
      return next;
    });
  };

  const sendCurrent = async () => {
    if (!current?.digits || !message) return;
    if (navigator.vibrate) navigator.vibrate(8);
    void hapticImpact('Light');
    const ok = await openTeamReminderComposer(channel, current.digits, message);
    if (ok) {
      markRemindedToday(userId, current.id);
      setSentTick((n) => n + 1);
      setOpenedOnce(true);
    }
  };

  const goNext = () => {
    if (navigator.vibrate) navigator.vibrate(5);
    setOpenedOnce(false);
    setIndex((n) => Math.min(n + 1, Math.max(0, recipients.length - 1)));
  };

  const font = bn ? 'font-bengali' : '';
  const canCompose = recipients.length > 0;
  const canOpen = !loading && !fetchError;
  const countLabel = loading || fetchError ? '' : bn ? `${team.length} জন` : `${team.length}`;

  const openGuide = () => {
    if (navigator.vibrate) navigator.vibrate(5);
    closeSheet();
    setGuideOpen(true);
  };

  return (
    <>
      <section className="mb-4 rounded-2xl border border-orange-200/80 bg-white px-4 py-3.5 shadow-sm sm:mb-5">
        <div className="mb-2.5 flex items-center gap-2">
          <p className={`min-w-0 truncate font-black text-slate-900 ${bn ? 'font-bengali text-base' : 'text-sm'}`}>
            {bn ? 'আমার টিম' : 'My team'}
          </p>
          {countLabel ? (
            <span className={`shrink-0 tabular-nums text-slate-500 ${bn ? 'font-bengali text-sm' : 'text-xs font-semibold'}`}>
              {countLabel}
            </span>
          ) : null}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {fetchError && (
              <button
                type="button"
                onClick={() => void loadTeam()}
                className={`rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ${font}`}
              >
                {bn ? 'আবার' : 'Retry'}
              </button>
            )}
            <button
              type="button"
              onClick={openGuide}
              className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm ${font}`}
              aria-label={bn ? 'টিম গাইড' : 'Team guide'}
            >
              <GuideIcon />
              {bn ? 'গাইড' : 'Guide'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!canOpen}
            onClick={() => openSheet('whatsapp')}
            className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 font-black transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${bn ? 'font-bengali text-sm' : 'text-xs'} border-emerald-200/90 bg-emerald-50 text-emerald-800`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white">
              <WhatsAppIcon />
            </span>
            WhatsApp
          </button>
          <button
            type="button"
            disabled={!canOpen}
            onClick={() => openSheet('sms')}
            className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 font-black transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${bn ? 'font-bengali text-sm' : 'text-xs'} border-sky-200/90 bg-sky-50 text-sky-800`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white">
              <SmsIcon />
            </span>
            SMS
          </button>
        </div>
      </section>

      {sheetOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4"
            role="presentation"
            onClick={closeSheet}
          >
            <div
              className="w-full max-w-md animate-slide-up-sheet sm:animate-scale-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="team-reminder-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl native-keyboard-pad">
                <NativeSheetHandle />
                <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2
                      id="team-reminder-title"
                      className={`min-w-0 truncate font-black text-slate-900 ${bn ? 'font-bengali text-lg' : 'text-base'}`}
                    >
                      {sheetStep === 'compose' && current
                        ? `${current.firstName || current.fullName}${recipients.length > 1 ? `  ${index + 1}/${recipients.length}` : ''}`
                        : bn
                          ? 'আমার টিম'
                          : 'My team'}
                    </h2>
                    <button
                      type="button"
                      onClick={sheetStep === 'compose' ? () => { setSheetStep('roster'); setOpenedOnce(false); } : closeSheet}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                      aria-label={sheetStep === 'compose' ? (bn ? 'তালিকা' : 'List') : (bn ? 'বন্ধ' : 'Close')}
                    >
                      {sheetStep === 'compose' ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {sheetStep === 'roster' ? (
                    <>
                      <div className="max-h-[min(52vh,28rem)] overflow-y-auto overscroll-contain">
                        {roster.length === 0 ? (
                          <p className={`px-1 py-6 text-center text-slate-500 ${bn ? 'font-bengali text-sm' : 'text-sm font-semibold'}`}>
                            {bn ? 'কেউ নেই' : 'No one yet'}
                          </p>
                        ) : (
                          <ul>
                            {roster.map((row) => {
                              const checked = selectedIds.has(row.id);
                              const selectable = Boolean(row.digits);
                              return (
                                <li key={row.id} className="border-b border-slate-100 last:border-0">
                                  <button
                                    type="button"
                                    disabled={!selectable}
                                    onClick={() => toggleSelected(row)}
                                    className={`flex w-full items-center gap-3 py-2.5 text-left disabled:opacity-45 ${selectable ? 'active:opacity-80' : ''}`}
                                    aria-pressed={selectable ? checked : undefined}
                                  >
                                    <span
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                        checked
                                          ? 'border-orange-500 bg-orange-500 text-white'
                                          : 'border-slate-300 bg-white'
                                      }`}
                                      aria-hidden
                                    >
                                      {checked ? (
                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
                                        </svg>
                                      ) : null}
                                    </span>
                                    <span className={`min-w-0 flex-1 truncate font-bold text-slate-800 ${bn ? 'font-bengali text-[15px]' : 'text-sm'}`}>
                                      {row.firstName}
                                      {isAdmin && roleShort(row.role, bn) ? (
                                        <span className="ml-1.5 font-semibold text-slate-400">
                                          {roleShort(row.role, bn)}
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className="shrink-0 text-right leading-tight">
                                      <span className={`block text-xs font-bold ${statusClass(row.status)}`}>
                                        {row.idleDate}
                                      </span>
                                      {row.sentDate ? (
                                        <span className={`block text-[10px] font-bold text-sky-700 ${bn ? 'font-bengali' : ''}`}>
                                          SMS {row.sentDate}
                                        </span>
                                      ) : row.status === 'nophone' ? (
                                        <span className={`block text-[10px] font-bold text-slate-400 ${bn ? 'font-bengali' : ''}`}>
                                          {bn ? 'ফোন নেই' : 'No phone'}
                                        </span>
                                      ) : null}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      <div className="mt-4">
                        {roster.length === 0 ? (
                          <button
                            type="button"
                            onClick={closeSheet}
                            className={`min-h-[48px] w-full rounded-xl bg-slate-800 font-black text-white ${font}`}
                          >
                            {bn ? 'ঠিক আছে' : 'OK'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canCompose}
                            onClick={goCompose}
                            className={`min-h-[48px] w-full rounded-xl px-3 font-black text-white disabled:opacity-40 ${font} ${
                              channel === 'sms' ? 'bg-sky-600' : 'bg-[#25D366]'
                            }`}
                          >
                            {bn ? 'মেসেজ' : 'Message'}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <textarea
                        value={storyLoading ? '' : draft}
                        onChange={(event) => {
                          editedRef.current = true;
                          setDraft(event.target.value);
                        }}
                        readOnly={storyLoading}
                        rows={4}
                        enterKeyHint="done"
                        aria-label={bn ? 'মেসেজ' : 'Message'}
                        placeholder={storyLoading ? '…' : ''}
                        className={`w-full resize-none rounded-2xl border border-orange-100 bg-white px-3.5 py-3 text-slate-800 outline-none ring-orange-300 focus:ring-2 ${bn ? 'font-bengali text-[15px] leading-relaxed' : 'text-sm leading-relaxed'}`}
                      />

                      <div className="mt-4 flex gap-2">
                        {current && index < recipients.length - 1 && (
                          <button
                            type="button"
                            onClick={goNext}
                            className={`min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 ${font}`}
                          >
                            {bn ? 'পরের' : 'Next'}
                          </button>
                        )}
                        {current && (
                          <button
                            type="button"
                            disabled={storyLoading || !message}
                            onClick={() => void sendCurrent()}
                            className={`min-h-[48px] flex-[1.4] rounded-xl px-3 font-black text-white disabled:opacity-40 ${font} ${
                              channel === 'sms' ? 'bg-sky-600' : 'bg-[#25D366]'
                            }`}
                          >
                            {openedOnce ? (bn ? 'আবার' : 'Again') : bn ? 'খুলুন' : 'Open'}
                          </button>
                        )}
                        {!current && (
                          <button
                            type="button"
                            onClick={() => { setSheetStep('roster'); setOpenedOnce(false); }}
                            className={`min-h-[48px] flex-1 rounded-xl bg-slate-800 font-black text-white ${font}`}
                          >
                            {bn ? 'ঠিক আছে' : 'OK'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {guideOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4"
            role="presentation"
            onClick={closeGuide}
          >
            <div
              className="w-full max-w-md animate-slide-up-sheet sm:animate-scale-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="team-guide-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
                <NativeSheetHandle />
                <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2
                      id="team-guide-title"
                      className={`font-black text-slate-900 ${bn ? 'font-bengali text-lg' : 'text-base'}`}
                    >
                      {bn ? 'আমার টিম' : 'My team'}
                    </h2>
                    <button
                      type="button"
                      onClick={closeGuide}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                      aria-label={bn ? 'বন্ধ' : 'Close'}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                  <ul className={`space-y-2.5 text-slate-700 ${bn ? 'font-bengali text-[15px] leading-snug' : 'text-sm leading-snug'}`}>
                    <li>{bn ? '৭ দিন না খেলে মনে করানো যায়।' : 'Remind people idle for 7+ days.'}</li>
                    <li>
                      {isAdmin
                        ? bn
                          ? 'আপনার সেফটি মিত্র, আর তাদের লাইনম্যান।'
                          : 'Your Safety Mitras, and their linemen.'
                        : bn
                          ? 'আপনার ট্যাগ করা লাইনম্যান।'
                          : 'Linemen tagged to you.'}
                    </li>
                    <li>{bn ? 'একজন করে। গ্রুপ নয়। আপনি পাঠাবেন।' : 'One person at a time. You send it.'}</li>
                  </ul>
                  <button
                    type="button"
                    onClick={closeGuide}
                    className={`mt-5 min-h-[48px] w-full rounded-xl bg-orange-500 font-black text-white ${font}`}
                  >
                    {bn ? 'ঠিক আছে' : 'OK'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

