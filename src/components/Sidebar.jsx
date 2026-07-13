import React from 'react';
import { UserIcon } from './icons';
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL } from '../config';
import { useLifeSkillRadio } from '../context/LifeSkillRadioContext';
import { FAQ_PAGE_TITLE } from '../utils/faqFilters';

const FACEBOOK_PAGE_URL = 'https://www.facebook.com/smartlineman';
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t';

export default function Sidebar({
  isOpen,
  onClose,
  currentView,
  setCurrentView,
  userProfile,
  language,
  t,
  onToggleSidebar,
  onToggleLanguageModal,
  onToggleNotifications,
  unreadNotificationsCount,
  onLogout
}) {
  const { startRadio, loading: radioLoading } = useLifeSkillRadio();

  const menuItems = [
    { id: 'training', label: language === 'en' ? '90 Days Training' : '৯০ দিনের প্রশিক্ষণ', icon: '📚', show: true },
    { id: 'competitions', label: language === 'en' ? 'Competitions' : 'প্রতিযোগিতা', icon: '🎯', show: true },
    { id: 'leaderboard', label: language === 'en' ? 'Leaderboard' : 'লিডারবোর্ড', icon: '🏆', show: true },
    { id: 'my-progress', label: language === 'en' ? 'My Progress' : 'আমার অগ্রগতি', icon: '📈', show: true },
    { id: 'video-guide', label: language === 'en' ? 'Video Guide' : 'ভিডিও গাইড', icon: '📺', show: true },
    { id: 'aro-janun', label: language === 'en' ? 'Know More' : 'আরো জানুন', icon: '🧰', show: true },
    { id: 'training-faq', label: language === 'en' ? FAQ_PAGE_TITLE.en : FAQ_PAGE_TITLE.bn, icon: '💡', show: true, redirectTo: 'training', tab: 'faq' },
    { id: 'safety-library', label: language === 'en' ? 'Safety Library' : 'সুরক্ষা লাইব্রেরি', icon: '🛡️', show: true },
    { id: 'notifications', label: language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি', icon: '🔔', show: true, badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null, highlight: unreadNotificationsCount > 0 },
    { id: 'sops', label: language === 'en' ? 'SOP' : 'এসওপি', icon: '📋', show: true },
    { id: 'my_ppe', label: language === 'en' ? 'My PPE' : 'আমার পিপিই', icon: '👷', show: true },
    { id: 'my_tools', label: language === 'en' ? 'My Tools' : 'আমার সরঞ্জাম', icon: '🔧', show: true },
    { id: 'emergency', label: language === 'en' ? 'Emergency' : 'জরুরি', icon: '🚨', show: true, color: 'text-red-600' },
    { id: 'language', label: language === 'en' ? 'Language' : 'ভাষা', icon: '🌐', show: true },
    { id: 'admin', label: (userProfile?.role === 'lineman' || userProfile?.role === 'guest') ? (language === 'en' ? 'My Profile' : 'আমার প্রোফাইল') : (language === 'en' ? 'Update Profile' : 'প্রোফাইল আপডেট'), icon: '⚙️', show: ['admin', 'safety mitra', 'lineman', 'guest'].includes(userProfile?.role) },
    { id: 'guide', label: language === 'en' ? 'Handbook' : 'হ্যান্ডবুক', icon: '📖', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
    { id: 'admin-services', label: language === 'en' ? 'Services' : 'সার্ভিস', icon: '🔄', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
  ];

  const visibleItems = menuItems.filter((item) => item.show);
  const displayUserId = userProfile?.slm_id || userProfile?.id ? String(userProfile?.slm_id || userProfile?.id) : null;
  const displayName = (userProfile?.full_name && !userProfile.full_name.includes('@')) ? userProfile.full_name : 'Guest';

  const handleNavClick = (item) => {
    if (item.id === 'language') {
      if (onToggleLanguageModal) onToggleLanguageModal();
      onClose();
      return;
    }
    if (item.id === 'notifications') {
      if (onToggleNotifications) onToggleNotifications();
      onClose();
      return;
    }
    if (item.url) {
      window.open(item.url, '_system');
      onClose();
      return;
    }
    if (item.redirectTo && item.tab) {
      window.location.hash = `/${item.redirectTo}?tab=${item.tab}`;
    } else if (item.id === 'my-progress' && setCurrentView) {
      setCurrentView('my-progress');
    } else {
      window.location.hash = `/${item.id}`;
    }
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] bg-slate-900/55 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`neo-brutal fixed left-0 top-0 z-[210] flex h-screen w-[17.5rem] flex-col border-r-2 border-slate-900 bg-[#fffdf7] shadow-[4px_0_0_#0f172a] transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!isOpen}
      >
        <div className="nb-hazard shrink-0" aria-hidden="true" />

        <div className="shrink-0 border-b-2 border-slate-900 bg-orange-50 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden border-2 border-slate-900 bg-orange-400 text-slate-900 shadow-[2px_2px_0_#0f172a]">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-2 text-slate-900">
                    <UserIcon className="h-full w-full" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-slate-900 bg-emerald-500" aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-black leading-tight text-slate-900">
                {displayName}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                {displayUserId && (
                  <span
                    className="nb-tag inline-flex max-w-[7.5rem] items-center truncate bg-white px-1.5 py-px text-[9px] font-semibold normal-case text-slate-600"
                    title={displayUserId}
                  >
                    <span className="mr-0.5 font-black uppercase text-slate-500 nb-mono">ID</span>
                    <span className="truncate">{displayUserId}</span>
                  </span>
                )}
                <span className="nb-tag bg-orange-100 px-1.5 py-px text-[9px] font-black uppercase text-orange-700 nb-mono">
                  {userProfile?.role || 'lineman'}
                </span>
                <span className="nb-tag bg-white px-1.5 py-px text-[9px] font-black uppercase text-slate-600 nb-mono">
                  Lvl {userProfile?.training_level || 1}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="nb-score-pill flex items-center gap-1 px-1.5 py-0.5 !text-[10px]">
                  <span className="text-[11px]" aria-hidden>🏆</span>
                  <span className="text-[10px] font-black tabular-nums text-slate-900">
                    {userProfile ? (userProfile.points || 0).toLocaleString('en-US') : '...'}
                  </span>
                </div>
                <div className="nb-score-pill flex items-center gap-1 px-1.5 py-0.5 !text-[10px]">
                  <span className="text-[11px]" aria-hidden>📖</span>
                  <span className="text-[10px] font-black tabular-nums text-slate-900">
                    {userProfile ? (userProfile.reading_points || 0).toLocaleString('en-US') : '...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="custom-scrollbar flex-1 overflow-y-auto px-2 py-2">
          <button
            type="button"
            disabled={radioLoading}
            onClick={() => {
              startRadio();
              onClose();
            }}
            className="nb-btn-indigo mb-1.5 flex w-full items-center gap-2 px-2.5 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="shrink-0 text-base leading-none" aria-hidden>📻</span>
            <span className={`text-xs font-black leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
              {language === 'en' ? 'Listen to SLM Radio' : 'SLM রেডিও শুনুন'}
            </span>
          </button>

          <div className="space-y-px">
            {visibleItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item)}
                  className={`group flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left transition-colors ${
                    isActive
                      ? 'border-l-[3px] border-l-orange-500 bg-orange-500 pl-2 text-white shadow-[2px_2px_0_#0f172a]'
                      : `border-l-[3px] border-l-transparent hover:bg-orange-50/90 ${item.color || 'text-slate-800'}`
                  }`}
                >
                  <span className={`shrink-0 text-base leading-none ${isActive ? '' : 'opacity-90'}`}>
                    {item.icon}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-xs font-bold leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="ml-auto shrink-0 border border-slate-900 bg-red-500 px-1 py-px text-[8px] font-black leading-none text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t-2 border-slate-900 bg-white px-2.5 py-2">
          <div className="flex items-center justify-center gap-2">
            <a
              href={FACEBOOK_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={language === 'en' ? 'Facebook Page' : 'ফেসবুক পেজ'}
              aria-label={language === 'en' ? 'Facebook Page' : 'ফেসবুক পেজ'}
              className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-[#1877F2] shadow-[2px_2px_0_#0f172a] transition-colors hover:bg-blue-50"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
              </svg>
            </a>
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={language === 'en' ? 'WhatsApp Group' : 'হোয়াটসঅ্যাপ গ্রুপ'}
              aria-label={language === 'en' ? 'WhatsApp Group' : 'হোয়াটসঅ্যাপ গ্রুপ'}
              className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-[#25D366] shadow-[2px_2px_0_#0f172a] transition-colors hover:bg-green-50"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>

            <button
              type="button"
              onClick={onToggleLanguageModal}
              title={language === 'en' ? 'Language' : 'ভাষা'}
              aria-label={language === 'en' ? 'Language' : 'ভাষা'}
              className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-slate-800 shadow-[2px_2px_0_#0f172a] transition-colors hover:bg-orange-50"
            >
              <span className="text-base leading-none" aria-hidden>🌐</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              title={language === 'en' ? 'Logout' : 'লগ আউট'}
              aria-label={language === 'en' ? 'Logout' : 'লগ আউট'}
              className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-slate-900 bg-red-50 text-red-700 shadow-[2px_2px_0_#0f172a] transition-colors hover:bg-red-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-[9px] font-semibold text-slate-500 nb-mono">
            <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="font-black text-slate-700 hover:text-orange-700">
              {APP_NAME}
            </a>
            <span className="text-orange-600">v{CURRENT_APP_VERSION}</span>
            <span className="text-slate-300" aria-hidden>·</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium lowercase tracking-normal text-slate-600 hover:text-slate-800">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </aside>
    </>
  );
}
