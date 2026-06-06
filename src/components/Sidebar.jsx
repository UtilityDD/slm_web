import React, { useState, useEffect, useRef } from 'react';
import { UserIcon } from './icons';
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL } from '../config';
import { useLifeSkillRadio } from '../context/LifeSkillRadioContext';

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
  const [currentTab, setCurrentTab] = useState(null);
  const [isMoreExpanded, setIsMoreExpanded] = useState(true);
  const navRef = useRef(null);

  useEffect(() => {
    if (isOpen && navRef.current) {
      const timeoutId = setTimeout(() => {
        if (navRef.current) {
          navRef.current.scrollTo({
            top: navRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 350);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const tabMatch = hash.match(/[?&]tab=([^&]*)/);
      if (tabMatch && tabMatch[1]) {
        setCurrentTab(decodeURIComponent(tabMatch[1]));
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const menuItems = [
    { id: 'training', label: language === 'en' ? '90 Days Training' : '৯০ দিনের প্রশিক্ষণ', icon: '📚', show: true, primary: true },
    { id: 'competitions', label: language === 'en' ? 'Competitions' : 'প্রতিযোগিতা', icon: '🎯', show: true, primary: true },
    { id: 'leaderboard', label: language === 'en' ? 'Leaderboard' : 'লিডারবোর্ড', icon: '🏆', show: true, primary: true },
    { id: 'video-guide', label: language === 'en' ? 'Video Guide' : 'ভিডিও গাইড', icon: '📺', show: true, primary: true },
    { id: 'safety-library', label: language === 'en' ? 'Safety Library' : 'সুরক্ষা লাইব্রেরি', icon: '🛡️', show: true, primary: true },
    { id: 'notifications', label: language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি', icon: '🔔', show: true, badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null, highlight: unreadNotificationsCount > 0 },
    { id: 'community', label: language === 'en' ? 'Community' : 'কমিউনিটি', icon: '👥', show: true },
    { id: 'sops', label: language === 'en' ? 'SOP' : 'এসওপি', icon: '📋', show: true },
    { id: 'my_ppe', label: language === 'en' ? 'My PPE' : 'আমার পিপিই', icon: '👷', show: true },
    { id: 'my_tools', label: language === 'en' ? 'My Tools' : 'আমার সরঞ্জাম', icon: '🔧', show: true },
    { id: 'emergency', label: language === 'en' ? 'Emergency' : 'জরুরি', icon: '🚨', show: true, color: 'text-red-600 font-bold' },
    { id: 'admin', label: userProfile?.role === 'lineman' ? (language === 'en' ? 'My Profile' : 'আমার প্রোফাইল') : (language === 'en' ? 'Admin' : 'অ্যাডমিন'), icon: '⚙️', show: ['admin', 'safety mitra', 'lineman'].includes(userProfile?.role) },
    { id: 'guide', label: language === 'en' ? 'Handbook' : 'হ্যান্ডবুক', icon: '📖', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
    { id: 'admin-services', label: language === 'en' ? 'Services' : 'সার্ভিস', icon: '🔄', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
  ];

  const primaryItems = menuItems.filter(item => item.primary && item.show);
  const secondaryItems = menuItems.filter(item => !item.primary && item.show);
  const displayUserId = userProfile?.slm_id || userProfile?.id ? String(userProfile?.slm_id || userProfile?.id) : null;

  const handleNavClick = (item) => {
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
        className={`neo-brutal fixed left-0 top-0 z-[210] flex h-screen w-72 flex-col border-r-2 border-slate-900 bg-[#fffdf7] shadow-[4px_0_0_#0f172a] transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!isOpen}
      >
        <div className="nb-hazard shrink-0" aria-hidden="true" />

        <div className="shrink-0 border-b-2 border-slate-900 bg-orange-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border-2 border-slate-900 bg-orange-400 text-xl font-bold text-slate-900 shadow-[3px_3px_0_#0f172a]">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt={userProfile.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-2.5 text-slate-900">
                    <UserIcon className="h-full w-full" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 border-2 border-slate-900 bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 truncate text-sm font-black text-slate-900">
                {(userProfile?.full_name && !userProfile.full_name.includes('@')) ? userProfile.full_name : 'Guest'}
              </p>
              {displayUserId && (
                <div className="mb-1">
                  <span
                    className="nb-tag inline-flex max-w-full items-center truncate bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                    title={displayUserId}
                  >
                    <span className="mr-1 text-[10px] font-black uppercase tracking-wide text-slate-500 nb-mono">ID</span>
                    <span className="truncate">{displayUserId}</span>
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="nb-tag bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-700 nb-mono">
                    {userProfile?.role || 'lineman'}
                  </span>
                  <span className="nb-tag bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 nb-mono">
                    Lvl {userProfile?.training_level || 1}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <div className="nb-score-pill flex items-center gap-1.5 px-2 py-1">
                    <span className="text-sm" aria-hidden>🏆</span>
                    <span className="text-[12px] font-black tabular-nums text-slate-900">
                      {userProfile ? (userProfile.points || 0).toLocaleString('en-US') : '...'}
                    </span>
                  </div>
                  <div className="nb-score-pill flex items-center gap-1.5 px-2 py-1">
                    <span className="text-sm" aria-hidden>📖</span>
                    <span className="text-[12px] font-black tabular-nums text-slate-900">
                      {userProfile ? (userProfile.reading_points || 0).toLocaleString('en-US') : '...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav ref={navRef} className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <button
            type="button"
            disabled={radioLoading}
            onClick={() => {
              startRadio();
              onClose();
            }}
            className="nb-btn-indigo mb-2 flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="shrink-0 text-xl" aria-hidden>
              📻
            </span>
            <span className={`text-sm font-black leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
              {language === 'en' ? 'Listen to SLM Radio' : 'SLM রেডিও শুনুন'}
            </span>
          </button>

          {primaryItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item)}
              className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${
                currentView === item.id
                  ? 'nb-btn-primary font-semibold'
                  : 'nb-btn-secondary hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5'
              }`}
            >
              <span className={`shrink-0 text-xl transition-transform duration-200 ${currentView === item.id ? '' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="text-sm font-bold">{item.label}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsMoreExpanded(!isMoreExpanded)}
            className="nb-card mt-2 flex w-full items-center justify-center border-dashed bg-white p-3 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            title={isMoreExpanded ? (language === 'en' ? 'Show Less' : 'কম দেখুন') : (language === 'en' ? 'More Items' : 'আরও দেখুন')}
          >
            <div className={`transform transition-all duration-500 ${isMoreExpanded ? 'rotate-180 text-orange-600' : 'rotate-0 text-slate-500'}`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isMoreExpanded ? 'mt-2 max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-1 border-t-2 border-slate-900 pt-2">
              {secondaryItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item)}
                    className={`group flex w-full items-center gap-3 border-2 px-3 py-2.5 text-left transition-all duration-200 ${
                      isActive
                        ? 'border-slate-900 bg-orange-100 font-bold text-orange-800 shadow-[2px_2px_0_#0f172a]'
                        : 'border-slate-900 bg-white text-slate-700 shadow-[2px_2px_0_#0f172a] hover:-translate-x-0.5 hover:-translate-y-0.5'
                    } ${item.color || ''}`}
                  >
                    <span className="shrink-0 text-lg opacity-80 transition-opacity group-hover:opacity-100">
                      {item.icon}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-tight nb-mono">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="ml-auto border-2 border-slate-900 bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="shrink-0 space-y-2 border-t-2 border-slate-900 bg-white p-3">
          <button
            type="button"
            onClick={onToggleLanguageModal}
            className="nb-btn-secondary flex w-full items-center gap-3 px-4 py-2.5 text-left"
            title="Language"
          >
            <span className="shrink-0 text-xl">🌐</span>
            <span className="text-sm font-bold">
              {language === 'en' ? 'Language' : 'ভাষা'}
            </span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 border-2 border-slate-900 bg-red-50 px-4 py-2.5 text-left text-red-700 shadow-[2px_2px_0_#0f172a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
            title="Logout"
          >
            <span className="shrink-0 text-xl">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </span>
            <span className="text-sm font-black">
              {language === 'en' ? 'Logout' : 'লগ আউট'}
            </span>
          </button>

          <div className="mt-2 border-t-2 border-slate-900 px-4 py-2 text-center">
            <p className="flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 nb-mono">
              <span className="flex items-center gap-1">
                <span>{APP_NAME.replace('.in', '')}</span>
                <span className="-translate-y-0.5 border border-slate-900 bg-orange-100 px-1 py-0.5 text-[9px] font-black lowercase tracking-normal text-orange-700">.in</span>
                <span className="ml-1 text-orange-600">v{CURRENT_APP_VERSION}</span>
              </span>
              <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="mt-1 font-medium lowercase tracking-normal text-orange-600 hover:text-orange-700">
                {WEBSITE_URL.replace('https://', '')}
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium lowercase tracking-normal text-slate-600 hover:text-slate-800">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
