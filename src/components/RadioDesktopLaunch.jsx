import React from 'react';
import { useLifeSkillRadio } from '../context/LifeSkillRadioContext';

/** Desktop / tablet: start SLM Radio from the top bar (mobile uses FAB + sidebar). */
export default function RadioDesktopLaunch({ language, currentView }) {
  const { startRadio, loading, visible } = useLifeSkillRadio();
  if (visible || currentView === 'sops') return null;

  const isHome = currentView === 'home';
  return (
    <button
      type="button"
      onClick={() => startRadio()}
      disabled={loading}
      className={`hidden md:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition touch-target disabled:opacity-50 ${
        isHome
          ? 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
          : 'border border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
      }`}
      title={language === 'bn' ? 'SLM রেডিও শুনুন' : 'Listen to SLM Radio'}
    >
      <span className="text-base leading-none" aria-hidden>
        📻
      </span>
      <span className={language === 'bn' ? 'font-bengali' : ''}>{language === 'bn' ? 'SLM রেডিও' : 'SLM Radio'}</span>
    </button>
  );
}
