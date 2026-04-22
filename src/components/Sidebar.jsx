import React, { useState, useEffect } from 'react';
import { UserIcon } from './icons';
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL } from '../config';

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
  unreadNotificationsCount
}) {
  const [currentTab, setCurrentTab] = useState(null);
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);

  // Listen for hash changes to update highlighted tab
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const tabMatch = hash.match(/[?&]tab=([^&]*)/);
      if (tabMatch && tabMatch[1]) {
        setCurrentTab(decodeURIComponent(tabMatch[1]));
      }
    };

    handleHashChange(); // Check initial hash
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const menuItems = [
    { id: 'training', label: language === 'en' ? '90 Days Training' : '৯০ দিনের প্রশিক্ষণ', icon: '📚', show: true, primary: true },
    { id: 'competitions', label: language === 'en' ? 'Competitions' : 'প্রতিযোগিতা', icon: '🎯', show: true, primary: true },
    { id: 'leaderboard', label: language === 'en' ? 'Leaderboard' : 'লিডারবোর্ড', icon: '🏆', show: true, primary: true },
    { id: 'safety-library', label: language === 'en' ? 'Safety Library' : 'সুরক্ষা লাইব্রেরি', icon: '🛡️', show: true, primary: true },
    // Secondary Items (Hidden under "More")
    { id: 'notifications', label: language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি', icon: '🔔', show: true, badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null, highlight: unreadNotificationsCount > 0 },
    { id: 'video-guide', label: language === 'en' ? 'Video Guide' : 'ভিডিও গাইড', icon: '📺', show: true },
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
      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-72 bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200/50 dark:border-slate-700/50 z-[100] transform transition-all duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Sidebar Header - Enhanced */}
        <div className="px-6 pt-12 pb-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-orange-50 to-white dark:from-slate-800 dark:to-slate-900 shrink-0">
          {/* User Profile Section */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center font-bold text-xl text-white shrink-0 overflow-hidden shadow-lg ring-2 ring-orange-200 dark:ring-orange-900">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt={userProfile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full text-white/90 flex items-center justify-center p-2.5">
                    <UserIcon className="w-full h-full" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mb-0.5">
                {(userProfile?.full_name && !userProfile.full_name.includes('@')) ? userProfile.full_name : 'Guest'}
              </p>
              {displayUserId && (
                <div className="mb-1">
                  <span
                    className="inline-flex max-w-full items-center rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate"
                    title={displayUserId}
                  >
                    <span className="mr-1 uppercase tracking-wide text-[10px] text-slate-400 dark:text-slate-500">ID</span>
                    <span className="truncate">{displayUserId}</span>
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-2 transform transition-all duration-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                    {userProfile?.role || 'lineman'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                    Lvl {userProfile?.training_level || 1}
                  </span>
                </div>
                {/* User Stats Integration */}
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800">
                    <span className="text-sm drop-shadow-sm text-orange-500">🏆</span>
                    <span className="text-[12px] font-black text-slate-800 dark:text-slate-100">
                      {(userProfile?.points || 0).toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800">
                    <span className="text-sm drop-shadow-sm">📖</span>
                    <span className="text-[12px] font-black text-slate-800 dark:text-slate-100">
                      {(userProfile?.reading_points || 0).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Navigation Items - Enhanced */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 custom-scrollbar">
          {primaryItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group ${currentView === item.id
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:translate-x-1'
                }`}
            >
              <span className={`text-xl shrink-0 transition-transform duration-200 ${currentView === item.id ? '' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}

          {/* More Toggle Button */}
          <button
            onClick={() => setIsMoreExpanded(!isMoreExpanded)}
            className="w-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 group border border-dashed border-slate-200 dark:border-slate-700/50 mt-2"
            title={isMoreExpanded ? (language === 'en' ? 'Show Less' : 'কম দেখুন') : (language === 'en' ? 'More Items' : 'আরও দেখুন')}
          >
            <div className={`transform transition-all duration-500 ${isMoreExpanded ? 'rotate-180 scale-110 text-orange-500' : 'rotate-0'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Secondary Items (Animated expansion) */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isMoreExpanded ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800/50">
              {secondaryItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-left group ${isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-orange-600 dark:text-orange-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                  >
                    <span className="text-lg shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                      {item.icon}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-tight">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-900">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer - Enhanced */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <button
            onClick={onToggleLanguageModal}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all hover:translate-x-1 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-left"
            title="Language"
          >
            <span className="text-xl shrink-0">🌐</span>
            <span className="text-sm font-medium">
              {language === 'en' ? 'Language' : 'ভাষা'}
            </span>
          </button>

          {/* Version Display */}
          <div className="px-4 py-2 text-center border-t border-slate-200 dark:border-slate-700 mt-2">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase flex flex-col gap-1 items-center">
              <span className="flex items-center gap-1">
                <span>{APP_NAME.replace('.in', '')}</span>
                <span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-1 py-0.5 rounded border border-orange-500/20 lowercase tracking-normal -translate-y-0.5">.in</span>
                <span className="ml-1 text-orange-500">v{CURRENT_APP_VERSION}</span>
              </span>
              <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="text-orange-500/60 hover:text-orange-500 transition-colors lowercase tracking-normal font-medium mt-1">
                {WEBSITE_URL.replace('https://', '')}
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-slate-500/60 hover:text-slate-400 transition-colors lowercase tracking-normal font-medium">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </aside >
    </>
  );
}
