/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import {
  AGE_OPTIONS,
  CONDITIONS,
  getPpeItem,
} from '../data/ppeItems';
import {
  PPE_NUDGE_GAP_DAYS,
  PPE_NUDGE_SHOW_AFTER_MS,
  buildSavePpeNudgePatch,
  countFilledPpeNudgeItems,
  getNextPpeNudgeItem,
  isFieldPpeJob,
  isPpeNudgeDue,
  setLocalPpeLastPromptDate,
} from '../utils/ppeNudge';
import { todayDateString } from '../utils/profileNudge';
import { fetchUserPPE, saveSinglePPEItem } from './safety/ppe/ppeSave';
import { isGuestUser } from '../utils/guestPreview';
import { claimSoftInterrupt, SOFT_INTERRUPT_IDS } from '../utils/sessionInterruptBudget';
import NativeSheetHandle from './NativeSheetHandle';
import { hapticImpact, hapticNotification } from '../utils/nativeAndroidUx';
import PpeItemIcon from './safety/ppe/PpeItemIcon';

const arrowBtnBase =
  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-black leading-none transition active:scale-95 disabled:pointer-events-none';
const arrowBtnActive =
  `${arrowBtnBase} border-2 border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/35`;
const arrowBtnIdle =
  `${arrowBtnBase} border-2 border-slate-200 bg-slate-100 text-slate-300 shadow-none`;
const choiceIdle =
  'min-h-[48px] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 transition active:scale-[0.98]';
const choiceOn =
  'min-h-[48px] rounded-2xl border border-orange-500 bg-orange-500 px-3 py-3 text-sm font-bold text-white transition active:scale-[0.98]';

/**
 * Progressive field-PPE prompt: one item every few days for eligible jobs.
 * Have it? is required; step nav is ← → only.
 * preview: { itemName, allowSkip } — admin review; allowSkip shows close control.
 */
export default function PpeFieldNudge({
  user,
  userProfile,
  language = 'en',
  blocked = false,
  onSaved,
  onOpenChange,
  preview = null,
  onPreviewClose,
}) {
  const bn = language === 'bn';
  const isPreview = !!(preview && preview.itemName);

  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [itemName, setItemName] = useState(null);
  const [ppeRows, setPpeRows] = useState([]);
  const [step, setStep] = useState(0);
  const [haveChoice, setHaveChoice] = useState(null); // null | true | false — must pick
  const [draft, setDraft] = useState({
    count: null,
    condition: null,
    age_months: null,
    usage: null,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const shownForSessionRef = useRef(false);
  const timerRef = useRef(null);
  const profileRef = useRef(userProfile);
  const ppeRowsRef = useRef([]);

  useEffect(() => {
    profileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    ppeRowsRef.current = ppeRows;
  }, [ppeRows]);

  const nudgeState = userProfile?.ppe_nudge_state;
  const item = itemName ? getPpeItem(itemName) : null;
  const isPair = !!item?.pair;
  const canPreviewClose = isPreview && preview?.allowSkip !== false;

  const progress = useMemo(
    () => countFilledPpeNudgeItems(ppeRowsRef.current, nudgeState),
    [ppeRows, nudgeState, itemName, open]
  );

  const resetDraft = useCallback(() => {
    setItemName(null);
    setStep(0);
    setHaveChoice(null);
    setDraft({ count: null, condition: null, age_months: null, usage: null });
    setError('');
    setSavedFlash(false);
  }, []);

  const closeUi = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      resetDraft();
      onOpenChange?.(false);
      if (isPreview) onPreviewClose?.();
    }, 220);
  }, [onOpenChange, onPreviewClose, isPreview, resetDraft]);

  const openForItem = useCallback(
    (name) => {
      if (!isPreview && !claimSoftInterrupt(SOFT_INTERRUPT_IDS.ppeNudge)) {
        shownForSessionRef.current = true;
        return;
      }
      shownForSessionRef.current = true;
      setItemName(name);
      setStep(0);
      setHaveChoice(null);
      setDraft({ count: null, condition: null, age_months: null, usage: null });
      setError('');
      setSavedFlash(false);
      setOpen(true);
      onOpenChange?.(true);
      requestAnimationFrame(() => setVisible(true));
      void hapticImpact('Light');
    },
    [onOpenChange, isPreview]
  );

  useEffect(() => {
    if (!isPreview) return undefined;
    openForItem(preview.itemName);
    setBusy(false);
    return undefined;
  }, [isPreview, preview?.itemName, preview?.allowSkip, openForItem]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isPreview) return undefined;

    if (
      !user?.id ||
      !userProfile ||
      isGuestUser(userProfile) ||
      !isFieldPpeJob(userProfile.job) ||
      blocked ||
      shownForSessionRef.current ||
      open
    ) {
      return undefined;
    }

    if (!isPpeNudgeDue(nudgeState, user.id, PPE_NUDGE_GAP_DAYS)) {
      return undefined;
    }

    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      if (document.visibilityState !== 'visible') return;
      if (blocked || shownForSessionRef.current) return;

      let profileForCheck = profileRef.current;
      let rows = ppeRowsRef.current;
      try {
        const [{ data: fresh }, fetchedRows] = await Promise.all([
          supabase
            .from('profiles')
            .select('job, ppe_nudge_state')
            .eq('id', user.id)
            .single(),
          fetchUserPPE(user.id),
        ]);
        if (fresh) {
          profileForCheck = { ...(profileRef.current || {}), ...fresh };
          profileRef.current = profileForCheck;
        }
        rows = fetchedRows || [];
        setPpeRows(rows);
        ppeRowsRef.current = rows;
      } catch (err) {
        console.warn('PPE nudge fresh check failed:', err);
      }

      if (!isFieldPpeJob(profileForCheck?.job)) {
        shownForSessionRef.current = true;
        return;
      }
      if (!isPpeNudgeDue(profileForCheck?.ppe_nudge_state, user.id, PPE_NUDGE_GAP_DAYS)) {
        return;
      }

      const next = getNextPpeNudgeItem(rows, profileForCheck?.ppe_nudge_state);
      if (!next) {
        shownForSessionRef.current = true;
        return;
      }
      openForItem(next);
    }, PPE_NUDGE_SHOW_AFTER_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user?.id, userProfile, nudgeState, blocked, open, isPreview, openForItem]);

  useEffect(() => {
    if (!isPreview && blocked && open) closeUi();
  }, [blocked, open, closeUi, isPreview]);

  const applyNudgeState = async (patch) => {
    const { data, error: rpcError } = await supabase.rpc('apply_ppe_nudge', {
      p_user_id: user.id,
      p_nudge_state: patch,
    });
    if (rpcError) throw rpcError;
    if (data && data.success === false) {
      throw new Error(data.error || 'Update failed');
    }
    setLocalPpeLastPromptDate(user.id, todayDateString());
  };

  const finishAnswered = async (answer) => {
    if (isPreview) {
      closeUi();
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (answer.available) {
        const existing = ppeRowsRef.current.find((r) => r.name === itemName);
        await saveSinglePPEItem(user.id, {
          ...answer,
          name: itemName,
          id: existing?.id || null,
        });
      } else {
        const existing = ppeRowsRef.current.find((r) => r.name === itemName);
        if (existing?.id) {
          await saveSinglePPEItem(user.id, {
            name: itemName,
            id: existing.id,
            available: false,
          });
        }
      }
      const patch = buildSavePpeNudgePatch(
        profileRef.current?.ppe_nudge_state || nudgeState,
        itemName
      );
      await applyNudgeState(patch);
      setSavedFlash(true);
      void hapticNotification('Success');
      await onSaved?.();
      window.setTimeout(() => closeUi(), 420);
    } catch (err) {
      console.error('PPE nudge save failed:', err);
      setError(err.message || 'Failed');
      void hapticNotification('Error');
    } finally {
      setBusy(false);
    }
  };

  const canGoNext = (() => {
    if (step === 0) return haveChoice !== null;
    if (step === 1) return !!draft.condition;
    if (step === 2) return !!draft.count;
    if (step === 3) return !!draft.usage;
    if (step === 4) return draft.age_months != null;
    return false;
  })();

  const goBack = () => {
    if (busy || step <= 0) return;
    setStep((s) => s - 1);
    void hapticImpact('Light');
  };

  const goNext = () => {
    if (busy || !canGoNext) return;
    void hapticImpact('Light');

    if (step === 0) {
      if (haveChoice === false) {
        void finishAnswered({ available: false });
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    void finishAnswered({
      available: true,
      count: draft.count || 1,
      condition: draft.condition || 'Good',
      age_months: draft.age_months || 3,
      usage: draft.usage || 'Personal',
    });
  };

  if (!open || !item) return null;

  const label = bn ? item.bn : item.name;
  const pct = progress.total ? Math.round((progress.filled / progress.total) * 100) : 0;

  const stepHint = (() => {
    if (step === 0) return bn ? 'আছে?' : 'Have it?';
    if (step === 1) return bn ? 'অবস্থা' : 'Condition';
    if (step === 2) return isPair ? (bn ? 'জোড়া' : 'Pairs') : bn ? 'সংখ্যা' : 'Qty';
    if (step === 3) return bn ? 'মালিকানা' : 'Owner';
    return bn ? 'বয়স' : 'Age';
  })();

  return createPortal(
    <div
      className={`native-sheet-scrim fixed inset-0 z-[135] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4 transition-opacity duration-200 ${
        visible ? 'opacity-100 animate-fade-in' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ppe-field-nudge-title"
    >
      <div className="absolute inset-0" aria-hidden />
      <div
        className={`native-sheet-panel relative z-[1] w-full sm:max-w-sm ${
          visible ? 'animate-slide-up-sheet sm:animate-scale-in' : ''
        }`}
        style={{ colorScheme: 'light' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="native-sheet-card relative overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
          <NativeSheetHandle />

          {savedFlash ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <PpeItemIcon item={item} size="lg" rounded="rounded-2xl" bg="bg-emerald-50" />
              <p className={`text-base font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                {bn ? 'সেভ হয়েছে' : 'Saved'}
              </p>
            </div>
          ) : (
            <>
              <div className="relative space-y-4 px-5 pb-3 pt-1 sm:px-6">
                {canPreviewClose ? (
                  <button
                    type="button"
                    onClick={closeUi}
                    className="absolute right-4 top-1 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
                    aria-label={bn ? 'বন্ধ' : 'Close'}
                  >
                    ✕
                  </button>
                ) : null}

                <div className="flex flex-col items-center text-center">
                  <PpeItemIcon
                    item={item}
                    size="hero"
                    rounded="rounded-3xl"
                    bg="bg-white"
                    className="border border-slate-200/80 shadow-sm"
                  />
                  <h2
                    id="ppe-field-nudge-title"
                    className={`mt-3 text-lg font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}
                  >
                    {label}
                  </h2>
                  <p className={`mt-0.5 text-[11px] font-semibold text-slate-400 ${bn ? 'font-bengali' : ''}`}>
                    {stepHint}
                    {item.essential ? (bn ? ' · অত্যাবশ্যক' : ' · Essential') : ''}
                    {isPreview ? (bn ? ' · প্রিভিউ' : ' · Preview') : ''}
                  </p>
                  <div className="mt-3 h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-[width] duration-500"
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    />
                  </div>
                </div>

                {step === 0 && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setHaveChoice(true);
                        void hapticImpact('Light');
                      }}
                      className={`${haveChoice === true ? choiceOn : `${choiceIdle} border-emerald-200 bg-emerald-50 text-emerald-800`} ${bn ? 'font-bengali' : ''}`}
                    >
                      {bn ? 'আছে' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHaveChoice(false);
                        void hapticImpact('Light');
                      }}
                      className={`${haveChoice === false ? choiceOn : `${choiceIdle} border-rose-200 bg-rose-50 text-rose-800`} ${bn ? 'font-bengali' : ''}`}
                    >
                      {bn ? 'নেই' : 'No'}
                    </button>
                  </div>
                )}

                {step === 1 && (
                  <div className="grid grid-cols-2 gap-2">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setDraft((d) => ({ ...d, condition: c.value }));
                          void hapticImpact('Light');
                        }}
                        className={draft.condition === c.value ? choiceOn : choiceIdle}
                      >
                        {bn ? c.bn : c.en}
                      </button>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {[1, 2, 3, 4].map((n) => {
                      const val = n === 4 ? 3 : n;
                      const isSel = n === 4 ? draft.countPlus === true : draft.count === n && !draft.countPlus;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setDraft((d) => ({
                              ...d,
                              count: val,
                              countPlus: n === 4,
                            }));
                            void hapticImpact('Light');
                          }}
                          className={`flex h-14 w-14 items-center justify-center text-lg font-black ${
                            isSel ? choiceOn : choiceIdle
                          }`}
                        >
                          {n === 4 ? '3+' : n}
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === 3 && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {['Personal', 'Shared'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setDraft((d) => ({ ...d, usage: u }));
                          void hapticImpact('Light');
                        }}
                        className={`${draft.usage === u ? choiceOn : choiceIdle} ${bn ? 'font-bengali' : ''}`}
                      >
                        {bn ? (u === 'Personal' ? 'ব্যক্তিগত' : 'যৌথ') : u}
                      </button>
                    ))}
                  </div>
                )}

                {step === 4 && (
                  <div className="grid grid-cols-2 gap-2">
                    {AGE_OPTIONS.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => {
                          setDraft((d) => ({ ...d, age_months: a.value }));
                          void hapticImpact('Light');
                        }}
                        className={`${draft.age_months === a.value ? choiceOn : choiceIdle} ${bn ? 'font-bengali' : ''}`}
                      >
                        {bn ? a.bn : a.en}
                      </button>
                    ))}
                  </div>
                )}

                {error ? (
                  <p className={`text-sm font-bold text-rose-600 ${bn ? 'font-bengali' : ''}`}>{error}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-white/70 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-5">
                <button
                  type="button"
                  disabled={busy || step === 0}
                  onClick={goBack}
                  className={step === 0 || busy ? arrowBtnIdle : arrowBtnActive}
                  aria-label={bn ? 'পিছনে' : 'Back'}
                >
                  ←
                </button>
                <span className="text-[11px] font-bold tabular-nums text-slate-400">
                  {step + 1}/5
                </span>
                <button
                  type="button"
                  disabled={busy || !canGoNext}
                  onClick={goNext}
                  className={!canGoNext || busy ? arrowBtnIdle : arrowBtnActive}
                  aria-label={bn ? 'এগিয়ে' : 'Next'}
                >
                  →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
