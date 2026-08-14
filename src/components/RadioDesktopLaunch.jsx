import React from 'react';
import { useLifeSkillRadio } from '../context/LifeSkillRadioContext';

/** Desktop / tablet: start SLM Radio from the top bar (mobile uses FAB + sidebar). */
export default function RadioDesktopLaunch({ language, currentView }) {
  const { startRadio, loading, visible } = useLifeSkillRadio();
  if (visible || currentView === 'sops') return null;

  return (
    <button
      type="button"
      onClick={() => startRadio()}
      disabled={loading}
      className="hidden md:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition touch-target disabled:opacity-50 border border-slate-200/80 bg-white text-slate-800 hover:bg-orange-50"
      title={language === 'bn' ? 'SLM রেডিও শুনুন' : 'Listen to SLM Radio'}
    >
      <span className="text-base leading-none" aria-hidden>
        📻
      </span>
      <span className={language === 'bn' ? 'font-bengali' : ''}>{language === 'bn' ? 'SLM রেডিও' : 'SLM Radio'}</span>
    </button>
  );
}
