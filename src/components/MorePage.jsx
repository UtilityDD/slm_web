import React from 'react';
import { UserIcon } from './icons';
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL } from '../config';
import { useLifeSkillRadio } from '../context/LifeSkillRadioContext';
import { FAQ_PAGE_TITLE } from '../utils/faqFilters';
import { openLinemanInviteWhatsApp } from '../utils/linemanInviteShare';
import { hapticImpact, openExternalUrl, shareContent } from '../utils/nativeAndroidUx';
import { isNativeCapacitorPlatform } from '../utils/webPush';
import AndroidAppDownloadCta from './AndroidAppDownloadCta';

const FACEBOOK_PAGE_URL = 'https://www.facebook.com/smartlineman';
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t';

export default function MorePage({
  currentView,
  setCurrentView,
  userProfile,
  language,
  onToggleLanguageModal,
  onToggleNotifications,
  onLogout,
}) {
  const { startRadio, loading: radioLoading } = useLifeSkillRadio();
  const bn = language === 'bn';

  const sections = [
    {
      id: 'learn',
      title: bn ? 'শেখা' : 'Learn',
      items: [
        { id: 'home', label: bn ? 'হোম' : 'Home', icon: '🏠', tint: 'bg-orange-100 text-orange-700', show: true },
        { id: 'training', label: bn ? 'প্রশিক্ষণ' : 'Training', icon: '📚', tint: 'bg-orange-100 text-orange-700', show: true },
        { id: 'video-guide', label: bn ? 'ভিডিও গাইড' : 'Video Guide', icon: '📺', tint: 'bg-sky-100 text-sky-700', show: true },
        { id: 'aro-janun', label: bn ? 'আরো জানুন' : 'Know More', icon: '🧰', tint: 'bg-violet-100 text-violet-700', show: true },
        { id: 'training-faq', label: bn ? FAQ_PAGE_TITLE.bn : FAQ_PAGE_TITLE.en, icon: '💡', tint: 'bg-yellow-100 text-yellow-700', show: true, redirectTo: 'training', tab: 'faq' },
        { id: 'my-progress', label: bn ? 'আমার অগ্রগতি' : 'My Progress', icon: '📈', tint: 'bg-emerald-100 text-emerald-700', show: true },
      ],
    },
    {
      id: 'compete',
      title: bn ? 'প্রতিযোগিতা' : 'Compete',
      items: [
        { id: 'competitions', label: bn ? 'খেলুন' : 'Play', icon: '🎯', tint: 'bg-rose-100 text-rose-700', show: true },
        { id: 'leaderboard', label: bn ? 'র‍্যাঙ্ক' : 'Rank', icon: '🏆', tint: 'bg-amber-100 text-amber-700', show: true },
        { id: 'prizes', label: bn ? 'পুরস্কার' : 'Prizes', icon: '🎁', tint: 'bg-orange-100 text-orange-700', show: true },
      ],
    },
    {
      id: 'safety',
      title: bn ? 'সুরক্ষা' : 'Safety',
      items: [
        { id: 'safety-library', label: bn ? 'চিনুন' : 'Identify', icon: '🛡️', tint: 'bg-teal-100 text-teal-700', show: true },
        { id: 'sops', label: bn ? 'সুরক্ষা সাথী' : 'Suraksha Sathi', icon: '📋', tint: 'bg-indigo-100 text-indigo-700', show: true },
        { id: 'my_ppe', label: bn ? 'সুরক্ষা' : 'Suraksha', icon: '👷', tint: 'bg-orange-100 text-orange-700', show: true },
        { id: 'my_tools', label: bn ? 'আমার সরঞ্জাম' : 'My Tools', icon: '🔧', tint: 'bg-slate-200 text-slate-700', show: true },
        { id: 'emergency', label: bn ? 'জরুরি' : 'Emergency', icon: '🚨', tint: 'bg-red-100 text-red-700', show: true, danger: true },
      ],
    },
    {
      id: 'account',
      title: bn ? 'অ্যাকাউন্ট' : 'Account',
      items: [
        { id: 'notifications', label: bn ? 'বিজ্ঞপ্তি' : 'Notifications', icon: '🔔', tint: 'bg-rose-100 text-rose-700', show: true },
        { id: 'language', label: bn ? 'ভাষা' : 'Language', icon: '🌐', tint: 'bg-sky-100 text-sky-700', show: true },
        {
          id: 'admin',
          label: (userProfile?.role === 'lineman' || userProfile?.role === 'guest')
            ? (bn ? 'আমার প্রোফাইল' : 'My Profile')
            : (bn ? 'প্রোফাইল আপডেট' : 'Update Profile'),
          icon: '⚙️',
          tint: 'bg-slate-200 text-slate-700',
          show: ['admin', 'safety mitra', 'lineman', 'guest'].includes(userProfile?.role),
        },
        { id: 'guide', label: bn ? 'হ্যান্ডবুক' : 'Handbook', icon: '📖', tint: 'bg-emerald-100 text-emerald-700', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
        { id: 'admin-services', label: bn ? 'সার্ভিস' : 'Services', icon: '🔄', tint: 'bg-violet-100 text-violet-700', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
      ],
    },
  ];

  const displayUserId = userProfile?.slm_id || userProfile?.id ? String(userProfile?.slm_id || userProfile?.id) : null;
  const displayName = (userProfile?.full_name && !userProfile.full_name.includes('@')) ? userProfile.full_name : 'Guest';

  const handleNavClick = (item) => {
    if (navigator.vibrate) navigator.vibrate(5);
    if (item.id === 'language') {
      if (onToggleLanguageModal) onToggleLanguageModal();
      return;
    }
    if (item.id === 'notifications') {
      if (onToggleNotifications) onToggleNotifications();
      return;
    }
    if (item.redirectTo && item.tab) {
      window.location.hash = `/${item.redirectTo}?tab=${item.tab}`;
      return;
    }
    if ((item.id === 'home' || item.id === 'my-progress') && setCurrentView) {
      setCurrentView(item.id);
      return;
    }
    window.location.hash = `/${item.id}`;
  };

  return (
    <div className="min-h-full bg-[#fffdf7] pb-24 text-slate-900">

      {/* Profile header */}
      <header className="border-b border-slate-200/80 bg-[#fffdf7]/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-orange-200/80 bg-orange-400 text-slate-900 shadow-sm">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-2 text-slate-900">
                  <UserIcon className="h-full w-full" />
                </div>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#fffdf7] bg-emerald-500" aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <p className={`truncate font-black leading-tight text-slate-900 ${bn ? 'font-bengali text-base' : 'text-sm'}`}>
              {displayName}
            </p>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <span className={`shrink-0 text-orange-600 ${bn ? 'font-bengali' : 'uppercase'}`}>
                {userProfile?.role || 'lineman'}
              </span>
              {displayUserId && (
                <>
                  <span className="text-slate-300" aria-hidden>·</span>
                  <span className="truncate" title={displayUserId}>ID {displayUserId}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                if (onToggleLanguageModal) onToggleLanguageModal();
              }}
              aria-label={bn ? 'ভাষা' : 'Language'}
              title={bn ? 'ভাষা' : 'Language'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-800 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
            >
              <span className="flex items-baseline gap-px font-black" aria-hidden>
                <span className="text-[13px] text-orange-600">A</span>
                <span className="font-bengali text-[13px] text-slate-800">অ</span>
              </span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label={bn ? 'লগ আউট' : 'Logout'}
              title={bn ? 'লগ আউট' : 'Logout'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200/80 bg-red-50 text-red-700 shadow-sm transition-all hover:bg-red-100 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Suraksha Sathi — highlighted (moved from floating FAB) */}
        <button
          type="button"
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(5);
            if (setCurrentView) setCurrentView('sops');
            else window.location.hash = '/sops';
          }}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-left text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-400/40 transition-all hover:shadow-lg active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/20 shadow-inner" aria-hidden>
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block font-black leading-tight ${bn ? 'font-bengali text-base' : 'text-sm'}`}>
              {bn ? 'সুরক্ষা সাথী' : 'Suraksha Sathi'}
            </span>
            <span className={`mt-0.5 block font-semibold leading-snug text-emerald-50/95 ${bn ? 'font-bengali text-sm' : 'text-[11px]'}`}>
              {bn ? 'পিটিডব্লিউ ও লাইন ক্লিয়ারেন্স গাইড' : 'PTW & line clearance guide'}
            </span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* SLM Radio CTA */}
        <button
          type="button"
          disabled={radioLoading}
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(5);
            startRadio();
          }}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3.5 text-left text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white text-lg leading-none text-indigo-600 shadow-sm" aria-hidden>
            📻
          </span>
          <span className={`flex-1 font-black leading-tight ${bn ? 'font-bengali text-base' : 'text-sm'}`}>
            {bn ? 'SLM রেডিও শুনুন' : 'Listen to SLM Radio'}
          </span>
          <span className={`shrink-0 rounded-full border border-white/50 bg-white/95 px-2 py-0.5 font-black text-indigo-700 ${bn ? 'font-bengali text-[11px]' : 'text-[9px] uppercase'}`}>
            {bn ? 'লাইভ' : 'Live'}
          </span>
        </button>

        {/* Share with acquaintance linemen — system share on native, WhatsApp invite on web */}
        <button
          type="button"
          onClick={() => {
            void hapticImpact('Light');
            if (navigator.vibrate) navigator.vibrate(5);
            if (isNativeCapacitorPlatform()) {
              void shareContent({
                title: APP_NAME,
                text: bn
                  ? 'স্মার্টলাইনম্যান — খেলতে খেলতে শিখুন, পুরস্কার জিতুন।'
                  : 'SmartLineman — learn while you play, win prizes.',
                url: WEBSITE_URL,
                dialogTitle: bn ? 'শেয়ার করুন' : 'Share SmartLineman',
              });
            } else {
              openLinemanInviteWhatsApp(language);
            }
          }}
          className="mb-5 flex w-full items-start gap-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-green-50/80 to-white px-4 py-3.5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm" aria-hidden>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2a9.84 9.84 0 0 0-8.52 14.76L2 22l5.39-1.42A9.94 9.94 0 1 0 12.04 2Zm0 17.99a8.15 8.15 0 0 1-4.15-1.14l-.3-.18-3.2.84.85-3.12-.2-.32A8.15 8.15 0 1 1 12.04 20Zm4.47-6.1c-.24-.12-1.45-.72-1.68-.8-.22-.08-.38-.12-.55.12-.16.25-.63.8-.77.97-.14.16-.28.18-.53.06-.24-.12-1.03-.38-1.96-1.21a7.35 7.35 0 0 1-1.36-1.7c-.14-.24-.02-.37.1-.49.11-.11.25-.28.37-.42.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.3-.22.25-.85.83-.85 2.02s.87 2.34.99 2.5c.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.45-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28Z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className={`text-sm font-black leading-tight text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                {bn ? 'আরও লাইনম্যানকে জানান' : 'Reach more linemen'}
              </span>
              <span className={`shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 ${bn ? 'font-bengali' : 'uppercase'}`}>
                {bn ? 'শেয়ার' : 'Share'}
              </span>
            </span>
            <span className={`mt-1 block text-xs font-medium leading-relaxed text-slate-600 ${bn ? 'font-bengali' : ''}`}>
              {bn
                ? 'আপনার পরিচিত লাইনম্যানদের শেয়ার করুন—খেলতে খেলতে শেখা, শিখতে শিখতে পুরস্কার, নিজেকে স্মার্ট বানানো।'
                : 'Share with linemen you know — learn through play, earn prizes, become smarter.'}
            </span>
          </span>
        </button>

        {sections.map((section) => {
          const items = section.items.filter((item) => item.show);
          if (items.length === 0) return null;
          return (
            <section key={section.id} className="mb-5">
              <h2 className={`mb-2 flex items-center gap-2 px-0.5 font-bold text-slate-500 ${bn ? 'font-bengali text-sm' : 'text-[11px] uppercase tracking-wider'}`}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" aria-hidden />
                {section.title}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                {items.map((item, idx) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                        idx !== 0 ? 'border-t border-slate-100' : ''
                      } ${isActive ? 'bg-orange-50' : 'hover:bg-orange-50/60 active:bg-orange-50'}`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/60 text-lg leading-none shadow-sm transition-transform group-active:scale-95 ${item.tint}`}
                        aria-hidden
                      >
                        {item.icon}
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate font-bold leading-tight ${item.danger ? 'text-red-700' : 'text-slate-800'} ${bn ? 'font-bengali text-base' : 'text-sm'}`}
                      >
                        {item.label}
                      </span>
                      {isActive ? (
                        <span className={`shrink-0 rounded-full bg-orange-500 px-2 py-0.5 font-black text-white shadow-sm ${bn ? 'font-bengali text-[11px]' : 'text-[9px] uppercase'}`}>
                          {bn ? 'এখন' : 'Now'}
                        </span>
                      ) : (
                        <svg className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section className="mb-5">
          <AndroidAppDownloadCta language={language} />
        </section>

        {/* Footer */}
        <div className="mt-6 border-t border-slate-200/80 pt-4">
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => void openExternalUrl(FACEBOOK_PAGE_URL)}
              aria-label={bn ? 'ফেসবুক পেজ' : 'Facebook Page'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-[#1877F2] shadow-sm transition-all hover:bg-blue-50 active:scale-95"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => void openExternalUrl(WHATSAPP_GROUP_URL)}
              aria-label={bn ? 'হোয়াটসঅ্যাপ গ্রুপ' : 'WhatsApp Group'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-[#25D366] shadow-sm transition-all hover:bg-green-50 active:scale-95"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </button>
          </div>

          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-[10px] font-semibold text-slate-500">
            <button type="button" onClick={() => void openExternalUrl(WEBSITE_URL)} className="font-black text-slate-700 hover:text-orange-700">
              {APP_NAME}
            </button>
            <span className="text-orange-600">v{CURRENT_APP_VERSION}</span>
            <span className="text-slate-300" aria-hidden>·</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium lowercase tracking-normal text-slate-600 hover:text-slate-800">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
