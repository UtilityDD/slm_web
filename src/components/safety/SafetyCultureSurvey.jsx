/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SAFETY_CULTURE_COPY,
  SAFETY_CULTURE_ITEMS,
  SAFETY_CULTURE_PROMPTS,
  TOPIC_BY_ID,
  getOptionLabel,
} from '../../data/safetyCultureSurvey';
import {
  clearCultureDraft,
  loadCultureDraft,
  saveCultureDraft,
  submitCultureSurvey,
} from '../../utils/safetyCultureSurvey';

const DRAFT_SLOT = 'auto-due';

/**
 * Full culture survey: intro honesty modal → dual questions → thank you.
 * preview=true: no DB writes.
 * Live mode uses auto 90-day user cycles (no admin wave push required).
 */
export default function SafetyCultureSurvey({
  language = 'bn',
  user,
  wave: waveProp,
  preview = false,
  setCurrentView,
  onCompleted,
}) {
  const bn = language === 'bn' || language === 'বাংলা';
  const copy = SAFETY_CULTURE_COPY;
  const t = (key) => (bn ? copy[`${key}_bn`] : copy[`${key}_en`]) || copy[`${key}_bn`];

  const userId = user?.id;
  const draftSlot = preview ? 'preview' : waveProp?.id || DRAFT_SLOT;

  const [phase, setPhase] = useState('intro'); // intro | survey | thank
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState('uchit'); // uchit | hoy
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    if (preview || !userId) return;
    const draft = loadCultureDraft(userId, draftSlot);
    if (!draft?.answers) return;
    setAnswers(draft.answers);
    if (typeof draft.index === 'number') setIndex(draft.index);
    if (draft.step === 'hoy' || draft.step === 'uchit') setStep(draft.step);
    if (draft.phase === 'survey') setPhase('survey');
  }, [preview, userId, draftSlot]);

  useEffect(() => {
    if (preview || !userId || phase !== 'survey') return;
    // Never overwrite a richer draft with an empty in-memory answers object.
    const existing = loadCultureDraft(userId, draftSlot);
    const existingCount = existing?.answers ? Object.keys(existing.answers).length : 0;
    const nextCount = Object.keys(answers || {}).length;
    if (nextCount === 0 && existingCount > 0) return;
    saveCultureDraft(userId, draftSlot, { answers, index, step, phase: 'survey' });
  }, [answers, index, step, phase, preview, userId, draftSlot]);

  const item = SAFETY_CULTURE_ITEMS[index];
  const total = SAFETY_CULTURE_ITEMS.length;
  const topic = item ? TOPIC_BY_ID[item.topic] : null;
  const prompt =
    step === 'uchit'
      ? bn
        ? SAFETY_CULTURE_PROMPTS.uchit_bn
        : SAFETY_CULTURE_PROMPTS.uchit_en
      : bn
        ? SAFETY_CULTURE_PROMPTS.hoy_bn
        : SAFETY_CULTURE_PROMPTS.hoy_en;

  const currentKey = useMemo(() => {
    if (!item) return null;
    const a = answers[item.id];
    return step === 'uchit' ? a?.uchit : a?.hoy;
  }, [answers, item, step]);

  const selectOption = (key) => {
    if (!item) return;
    setAnswers((prev) => {
      const prevItem = prev[item.id] || {};
      const next = {
        ...prev,
        [item.id]:
          step === 'uchit'
            ? { ...prevItem, uchit: key }
            : { ...prevItem, hoy: key },
      };
      return next;
    });
    setError('');
  };

  const goNext = async () => {
    if (!item || !currentKey) return;

    if (step === 'uchit') {
      setStep('hoy');
      return;
    }

    // finished hoy for this item
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setStep('uchit');
      return;
    }

    // submit — merge current selection so last hoy is never lost to stale state
    if (preview) {
      clearCultureDraft(userId, draftSlot);
      setPhase('thank');
      return;
    }

    // Merge draft + in-memory answers so a wiped/stale React state cannot drop completed quizzes.
    const fromDraft = (!preview && userId && loadCultureDraft(userId, draftSlot)?.answers) || {};
    const payload = { ...fromDraft, ...answersRef.current };
    if (item && currentKey) {
      const prevItem = payload[item.id] || {};
      payload[item.id] =
        step === 'uchit'
          ? { ...prevItem, uchit: currentKey }
          : { ...prevItem, hoy: currentKey };
    }
    // Keep React state in sync with what we are about to submit.
    setAnswers(payload);
    answersRef.current = payload;

    setSaving(true);
    setError('');
    try {
      // Keep auth fresh — long surveys can hit a stale session on submit.
      const { supabase } = await import('../../supabaseClient');
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const authUserId = userData?.user?.id;
      if (!authUserId) {
        throw new Error('not authenticated — please log in again');
      }
      await supabase.auth.refreshSession();

      await submitCultureSurvey({
        userId: authUserId,
        waveId: waveProp?.id || undefined,
        answers: payload,
      });
      clearCultureDraft(userId, draftSlot);
      setPhase('thank');
      onCompleted?.();
    } catch (e) {
      console.error('culture survey submit', e);
      const raw = [e?.message, e?.code, e?.details, e?.hint]
        .filter(Boolean)
        .join(' | ');
      const rawLower = String(raw).toLowerCase();
      let friendly = t('error');
      if (String(e?.message || '').startsWith('incomplete:')) {
        friendly = t('errorIncomplete');
      } else if (
        /get_or_create_safety_culture_wave|could not find the function|schema cache|not authenticated/i.test(
          raw
        )
      ) {
        friendly = t('errorSetup');
      } else if (/row-level security|42501|permission denied/i.test(rawLower)) {
        friendly = t('errorSetup');
      }
      // Show real DB/API reason so Test User / admin can report the exact failure.
      setError(raw ? `${friendly}\n${raw}` : friendly);
    } finally {
      setSaving(false);
    }
  };

  const goHome = () => {
    setCurrentView?.('home');
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-full bg-[#fffdf7] text-slate-900">
        <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center p-4 pb-10">
          {preview && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-900">
              {t('previewBadge')}
            </div>
          )}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-black text-slate-900">{t('introTitle')}</h1>
            <p className="mt-3 text-base leading-snug text-slate-700">{t('introPurpose')}</p>
            <p className="mt-2 text-base font-semibold leading-snug text-slate-800">
              {t('introHonesty')}
            </p>
            <div className="mt-5 space-y-2 rounded-xl border border-teal-100 bg-teal-50/80 px-4 py-3">
              <p className="text-sm font-semibold leading-snug text-teal-950">
                {t('introPrivacy1')}
              </p>
              <p className="text-sm font-semibold leading-snug text-teal-950">
                {t('introPrivacy2')}
              </p>
            </div>
            <button
              type="button"
              disabled={!preview && !userId}
              onClick={() => setPhase('survey')}
              className="mt-6 w-full rounded-xl bg-teal-700 px-4 py-3.5 text-base font-bold text-white shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              {t('proceed')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'thank') {
    return (
      <div className="min-h-full bg-[#fffdf7] text-slate-900">
        <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center p-4 pb-10">
          <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-bold text-teal-900">{t('thankTitle')}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{t('thankBody')}</p>
            <button
              type="button"
              onClick={goHome}
              className="mt-6 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white"
            >
              {t('thankCta')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const isLast = index === total - 1 && step === 'hoy';
  const progressLabel = bn
    ? copy.progress_bn(index + 1, total)
    : copy.progress_en(index + 1, total);

  return (
    <div className="min-h-full bg-[#fffdf7] text-slate-900">
      <div className="mx-auto max-w-lg p-4 pb-28">
        {preview && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-900">
            {t('previewBadge')}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="font-semibold text-teal-800">
            {bn ? topic?.label_bn : topic?.label_en}
          </span>
          <span>{progressLabel}</span>
        </div>

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-teal-600 transition-all"
            style={{ width: `${((index + (step === 'hoy' ? 0.5 : 0)) / total) * 100}%` }}
          />
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-sm leading-relaxed text-slate-800">
            {bn ? item.scenario_bn : item.scenario_en}
          </p>

          {/* Focused step banner — hard to miss for low-literacy users */}
          <div
            className={`mt-4 rounded-2xl border-2 px-3 py-3 ${
              step === 'uchit'
                ? 'border-teal-600 bg-teal-50'
                : 'border-amber-500 bg-amber-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-black text-white ${
                  step === 'uchit' ? 'bg-teal-700' : 'bg-amber-600'
                }`}
              >
                {step === 'uchit' ? '১' : '২'}
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-wide ${
                  step === 'uchit' ? 'text-teal-800' : 'text-amber-800'
                }`}
              >
                {step === 'uchit' ? t('stepUchitLabel') : t('stepHoyLabel')}
              </span>
            </div>
            <p
              className={`mt-2 text-lg font-black leading-snug ${
                step === 'uchit' ? 'text-teal-950' : 'text-amber-950'
              }`}
            >
              {prompt}
            </p>
            <p
              className={`mt-1 text-sm font-semibold leading-snug ${
                step === 'uchit' ? 'text-teal-800' : 'text-amber-800'
              }`}
            >
              {step === 'uchit' ? t('stepHintUchit') : t('stepHintHoy')}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {item.options.map((opt) => {
              const selected = currentKey === opt.key;
              const selectedClass =
                step === 'uchit'
                  ? 'border-teal-600 bg-teal-50 text-teal-950'
                  : 'border-amber-500 bg-amber-50 text-amber-950';
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => selectOption(opt.key)}
                  className={`w-full rounded-xl border-2 px-3 py-3.5 text-left text-sm leading-snug transition-colors ${
                    selected
                      ? selectedClass
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="mr-2 font-black text-slate-500">{opt.key}.</span>
                  {getOptionLabel(opt, { bn, step })}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="mt-3 whitespace-pre-wrap text-center text-sm text-red-600">{error}</p>
        ) : null}

        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-[#fffdf7]/80 p-4 backdrop-blur">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              disabled={!currentKey || saving}
              onClick={goNext}
              className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? t('saving')
                : isLast
                  ? t('submit')
                  : t('next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
