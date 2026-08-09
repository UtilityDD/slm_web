import React from 'react';
import { isNativeCapacitorPlatform } from '../utils/webPush';

/**
 * Large-title app bar for Capacitor Android.
 * Hidden on web/PWA so existing page headers stay unchanged there.
 */
export default function NativeAppTopBar({
  title,
  subtitle,
  language = 'en',
  trailing = null,
}) {
  if (!isNativeCapacitorPlatform() || !title) return null;

  const bn = language === 'bn';

  return (
    <header className="native-app-top-bar sticky top-0 z-[70] shrink-0 border-b border-slate-200/80 bg-[#fffdf7] md:hidden">
      <div className="mx-auto flex max-w-lg items-end gap-3 px-4 pb-2.5 pt-2">
        <div className="min-w-0 flex-1">
          <h1
            className={`truncate text-[1.65rem] font-black leading-none tracking-tight text-slate-900 ${bn ? 'font-bengali' : ''}`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className={`mt-1 truncate text-xs font-semibold text-slate-500 ${bn ? 'font-bengali' : ''}`}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {trailing ? <div className="flex shrink-0 items-center gap-1.5 pb-0.5">{trailing}</div> : null}
      </div>
    </header>
  );
}

/** Titles for primary bottom-nav destinations (+ common More children). */
export function getNativeTopBarTitle(currentView, language = 'en') {
  const bn = language === 'bn';
  switch (currentView) {
    case 'home':
      return bn ? 'হোম' : 'Home';
    case 'my_ppe':
    case 'safety-library':
    case 'my_tools':
      return bn ? 'সুরক্ষা' : 'Safety';
    case 'leaderboard':
      return bn ? 'র‍্যাঙ্ক' : 'Rank';
    case 'prizes':
      return bn ? 'পুরস্কার' : 'Prizes';
    case 'community':
      return bn ? 'প্রশ্নোত্তর' : 'Forum';
    case 'menu':
      return bn ? 'আরও' : 'More';
    case 'training':
      return bn ? 'প্রশিক্ষণ' : 'Training';
    case 'my-progress':
      return bn ? 'অগ্রগতি' : 'Progress';
    case 'sops':
      return bn ? 'সুরক্ষা সাথী' : 'Suraksha Sathi';
    case 'competitions':
      return bn ? 'খেলুন' : 'Play';
    case 'notifications':
      return bn ? 'নোটিফিকেশন' : 'Notifications';
    case 'emergency':
      return bn ? 'জরুরি' : 'Emergency';
    case 'video-guide':
      return bn ? 'ভিডিও' : 'Videos';
    case 'aro-janun':
      return bn ? 'আরও জানুন' : 'Learn more';
    case 'admin':
      return bn ? 'প্রোফাইল' : 'Profile';
    default:
      return null;
  }
}
