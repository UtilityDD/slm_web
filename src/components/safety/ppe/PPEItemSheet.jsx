/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PPE_ITEMS, CONDITIONS, AGE_OPTIONS } from '../../../data/ppeItems';
import PpeItemIcon from './PpeItemIcon';

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
 * Bottom sheet — image-first editor. Have it? required; nav is ← →.
 */
export default function PPEItemSheet({ itemName, answer, language = 'bn', onSave, onClose, isSaving }) {
  const item = PPE_ITEMS.find((p) => p.name === itemName);
  const bn = language === 'bn';

  const [step, setStep] = useState(0);
  const [haveChoice, setHaveChoice] = useState(answer?.available ? true : null);
  const [draft, setDraft] = useState(() => ({
    count: answer?.available ? answer.count ?? 1 : null,
    countPlus: false,
    condition: answer?.available ? answer.condition ?? null : null,
    age_months: answer?.available ? answer.age_months ?? null : null,
    usage: answer?.available ? answer.usage ?? null : null,
  }));

  if (!item) return null;

  const label = bn ? item.bn : item.name;

  const handleConfirm = async (finalDraft) => {
    await onSave({
      name: item.name,
      id: answer?.id || null,
      ...finalDraft,
    });
  };

  const canGoNext = (() => {
    if (step === 0) return haveChoice !== null;
    if (step === 1) return !!draft.condition;
    if (step === 2) return draft.count != null;
    if (step === 3) return !!draft.usage;
    if (step === 4) return draft.age_months != null;
    return false;
  })();

  const goBack = () => {
    if (step <= 0) return;
    setStep((s) => s - 1);
  };

  const goNext = async () => {
    if (!canGoNext || isSaving) return;
    if (step === 0) {
      if (haveChoice === false) {
        await handleConfirm({ available: false });
        return;
      }
      setStep(1);
      return;
    }
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    await handleConfirm({
      available: true,
      count: draft.count || 1,
      condition: draft.condition || 'Good',
      age_months: draft.age_months || 3,
      usage: draft.usage || 'Personal',
    });
  };

  const stepHint = (() => {
    if (step === 0) return bn ? 'আছে?' : 'Have it?';
    if (step === 1) return bn ? 'অবস্থা' : 'Condition';
    if (step === 2) return item.pair ? (bn ? 'জোড়া' : 'Pairs') : bn ? 'সংখ্যা' : 'Qty';
    if (step === 3) return bn ? 'মালিকানা' : 'Owner';
    return bn ? 'বয়স' : 'Age';
  })();

  const sheet = (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/50 animate-fade-in">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />

      <div
        className="relative w-full max-w-sm rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl animate-slide-up-fade max-h-[85vh] overflow-y-auto sm:mb-6 sm:rounded-2xl"
        style={{ colorScheme: 'light' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#fffdf7] px-5 pt-3 pb-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />
          <div className="relative flex flex-col items-center text-center">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
              aria-label={bn ? 'বন্ধ' : 'Close'}
            >
              ✕
            </button>
            <PpeItemIcon
              item={item}
              size="hero"
              rounded="rounded-3xl"
              bg="bg-white"
              className="border border-slate-200/80 shadow-sm"
            />
            <h2 className={`mt-3 text-lg font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}>
              {label}
            </h2>
            <p className={`mt-0.5 text-[11px] font-semibold text-slate-400 ${bn ? 'font-bengali' : ''}`}>
              {stepHint}
              {item.essential ? (bn ? ' · অত্যাবশ্যক' : ' · Essential') : ''}
            </p>
          </div>
        </div>

        <div className="space-y-4 px-5 pb-3">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setHaveChoice(true)}
                className={`${haveChoice === true ? choiceOn : `${choiceIdle} border-emerald-200 bg-emerald-50 text-emerald-800`} ${bn ? 'font-bengali' : ''}`}
              >
                {bn ? 'আছে' : 'Yes'}
              </button>
              <button
                type="button"
                onClick={() => setHaveChoice(false)}
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
                  onClick={() => setDraft((d) => ({ ...d, condition: c.value }))}
                  className={draft.condition === c.value ? choiceOn : choiceIdle}
                >
                  {bn ? c.bn : c.en}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4].map((n) => {
                const val = n === 4 ? 3 : n;
                const isSel = n === 4 ? draft.countPlus === true : draft.count === n && !draft.countPlus;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, count: val, countPlus: n === 4 }))}
                    className={`flex h-14 w-14 items-center justify-center text-lg font-black ${isSel ? choiceOn : choiceIdle}`}
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
                  onClick={() => setDraft((d) => ({ ...d, usage: u }))}
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
                  onClick={() => setDraft((d) => ({ ...d, age_months: a.value }))}
                  className={`${draft.age_months === a.value ? choiceOn : choiceIdle} ${bn ? 'font-bengali' : ''}`}
                >
                  {bn ? a.bn : a.en}
                </button>
              ))}
            </div>
          )}

          {isSaving ? (
            <p className={`text-center text-sm font-bold text-orange-600 ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'সেভ হচ্ছে…' : 'Saving…'}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-5 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            disabled={isSaving || step === 0}
            onClick={goBack}
            className={step === 0 || isSaving ? arrowBtnIdle : arrowBtnActive}
            aria-label={bn ? 'পিছনে' : 'Back'}
          >
            ←
          </button>
          <span className="text-[11px] font-bold tabular-nums text-slate-400">{step + 1}/5</span>
          <button
            type="button"
            disabled={isSaving || !canGoNext}
            onClick={() => void goNext()}
            className={!canGoNext || isSaving ? arrowBtnIdle : arrowBtnActive}
            aria-label={bn ? 'এগিয়ে' : 'Next'}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
