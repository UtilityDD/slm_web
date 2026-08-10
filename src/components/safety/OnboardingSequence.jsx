import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import NativeSheetHandle from '../NativeSheetHandle';
import { hapticImpact, hapticNotification } from '../../utils/nativeAndroidUx';

/**
 * First-visit welcome after login — cream “day pass” sheet (4 short beats).
 * preview: admin review only — does not write hasSeenOnboarding (caller closes).
 */
const OnboardingSequence = ({ language, onComplete, preview = false }) => {
  const bn = language === 'bn';
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setStep(0);
    setContentKey(0);
    setIsExiting(false);
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    void hapticImpact('Light');
    return () => cancelAnimationFrame(id);
  }, [preview]);

  const steps = [
    {
      icon: '🏠',
      badge: bn ? 'স্বাগতম' : 'Welcome',
      title: bn ? 'নিরাপদে বাড়ি ফেরাই লক্ষ্য' : 'Home safe — that’s the mission',
      body: bn
        ? 'স্মার্টলাইনম্যান আপনার সুরক্ষা সাথী। প্রতিদিন একটু শিখে, লাইনে নিরাপদ থাকুন।'
        : 'SmartLineman is your safety partner. Learn a little each day so every shift ends at home.',
      tip: bn ? 'পরিবার অপেক্ষায়' : 'Family is waiting',
    },
    {
      icon: '📖',
      badge: bn ? 'শেখা' : 'Learn',
      title: bn ? '১০টি মূল অধ্যায়' : '10 core safety chapters',
      body: bn
        ? 'PPE থেকে SOP — একের পর এক পাঠ। শেষ করলে পথ পরিষ্কার।'
        : 'From PPE to SOPs — one lesson after another. Finish the path, stay ready.',
      tip: bn ? 'ট্রেনিং ট্যাবে শুরু' : 'Start in Training',
    },
    {
      icon: '⚡',
      badge: bn ? 'চ্যালেঞ্জ' : 'Challenge',
      title: bn ? 'প্রতি ঘণ্টায় ১ মিনিট' : 'One minute, every hour',
      body: bn
        ? 'ছোট কুইজে ⚡ জিতুন, র‍্যাঙ্কে এগোন। অভ্যাসই শক্তি।'
        : 'Quick quizzes earn ⚡ and climb Rank. Small habits beat long lectures.',
      tip: bn ? 'হোম থেকে খেলুন' : 'Play from Home',
    },
    {
      icon: '☀️',
      badge: bn ? 'প্রস্তুত' : 'Ready',
      title: bn ? 'জ্ঞানই সুরক্ষা' : 'Knowledge is your PPE',
      body: bn
        ? 'নিয়ম জানা যথেষ্ট নয় — মানাই দরকার। চলুন শুরু করি।'
        : 'Knowing the rule isn’t enough — living it is. Let’s begin.',
      tip: bn ? 'আজকের প্রথম পাঠ' : 'Your first lesson awaits',
    },
  ];

  const total = steps.length;
  const current = steps[step];
  const isLast = step === total - 1;

  const finish = () => {
    setIsExiting(true);
    setVisible(false);
    void hapticNotification('Success');
    window.setTimeout(() => onComplete?.(), 280);
  };

  const handleNext = () => {
    if (!isLast) {
      setStep((s) => s + 1);
      setContentKey((k) => k + 1);
      void hapticImpact('Light');
      return;
    }
    finish();
  };

  const handleSkip = () => {
    void hapticImpact('Light');
    finish();
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
    setContentKey((k) => k + 1);
    void hapticImpact('Light');
  };

  return createPortal(
    <div
      className={`native-sheet-scrim fixed inset-0 z-[300] flex items-end justify-center p-0 sm:items-center sm:p-4 transition-opacity duration-300 ${
        visible && !isExiting ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="absolute inset-0 bg-slate-900/45" aria-hidden />

      <div
        className={`native-sheet-panel relative z-[1] w-full sm:max-w-sm transform transition-all duration-300 ease-out ${
          visible && !isExiting
            ? 'translate-y-0 opacity-100 sm:scale-100'
            : 'translate-y-8 opacity-0 sm:translate-y-3 sm:scale-[0.98]'
        }`}
      >
        <div className="native-sheet-card relative overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
          <NativeSheetHandle />

          {/* Ticket header */}
          <div className="flex items-center justify-between gap-3 px-5 pt-1 sm:px-6">
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-wider text-orange-600 ${
                  bn ? 'font-bengali normal-case tracking-normal' : ''
                }`}
              >
                {bn ? 'স্মার্টলাইনম্যান পাস' : 'SmartLineman Pass'}
                {preview ? (bn ? ' · প্রিভিউ' : ' · Preview') : ''}
              </p>
              <p className={`mt-0.5 text-xs font-bold tabular-nums text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                {bn ? `${step + 1} / ${total}` : `${step + 1} of ${total}`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className={`min-h-[40px] rounded-full px-3 text-xs font-bold text-slate-500 transition hover:bg-orange-50 hover:text-orange-700 active:scale-[0.98] ${
                bn ? 'font-bengali' : ''
              }`}
            >
              {bn ? 'এড়িয়ে যান' : 'Skip'}
            </button>
          </div>

          {/* Segment progress */}
          <div className="mt-3 flex gap-1.5 px-5 sm:px-6" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  i < step
                    ? 'bg-emerald-500'
                    : i === step
                      ? 'bg-orange-500'
                      : 'bg-orange-100'
                }`}
              />
            ))}
          </div>

          {/* Step body */}
          <div
            key={contentKey}
            className="onboarding-step-in space-y-5 px-5 pb-2 pt-6 sm:px-6"
          >
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
              <span
                className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 shadow-inner ring-1 ring-orange-200/60"
                aria-hidden
              />
              <span
                className="absolute -inset-1 animate-pulse rounded-[2rem] bg-orange-400/10"
                style={{ animationDuration: '2.4s' }}
                aria-hidden
              />
              <span className="relative text-5xl" role="img" aria-label={current.badge}>
                {current.icon}
              </span>
            </div>

            <div className="text-center">
              <span
                className={`inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-700 ${
                  bn ? 'font-bengali normal-case tracking-normal' : ''
                }`}
              >
                {current.badge}
              </span>
              <h2
                id="onboarding-title"
                className={`mt-2 text-xl font-black leading-snug text-slate-900 sm:text-2xl ${
                  bn ? 'font-bengali' : ''
                }`}
              >
                {current.title}
              </h2>
              <p
                className={`mx-auto mt-2 max-w-[18rem] text-sm font-semibold leading-relaxed text-slate-600 ${
                  bn ? 'font-bengali' : ''
                }`}
              >
                {current.body}
              </p>
              <p
                className={`mt-3 text-xs font-bold text-orange-600/90 ${bn ? 'font-bengali' : ''}`}
              >
                {current.tip}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 border-t border-slate-200/80 bg-white/70 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-5">
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className={`min-h-[48px] flex-1 rounded-full border border-slate-200/80 bg-white text-sm font-bold text-slate-600 shadow-sm transition active:scale-[0.98] ${
                  bn ? 'font-bengali' : ''
                }`}
              >
                {bn ? 'পেছনে' : 'Back'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleNext}
              className={`min-h-[48px] ${
                step > 0 ? 'flex-[1.5]' : 'w-full'
              } rounded-full bg-orange-500 text-sm font-black text-white shadow-md shadow-orange-500/30 transition active:scale-[0.98] ${
                bn ? 'font-bengali' : ''
              }`}
            >
              {isLast ? (bn ? 'শুরু করুন' : 'Let’s go') : bn ? 'এগোন' : 'Continue'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes onboarding-step-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .onboarding-step-in {
          animation: onboarding-step-in 0.32s ease-out both;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default OnboardingSequence;
