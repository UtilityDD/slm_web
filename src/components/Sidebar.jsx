import React, { useState, useEffect } from 'react';
import { UserIcon } from './icons';
import { APP_NAME, CURRENT_APP_VERSION } from '../config';

export default function Sidebar({
  isOpen,
  onClose,
  currentView,
  setCurrentView,
  userProfile,
  language,
  t,
  onToggleSidebar,
  onToggleLanguageModal
}) {
  const [currentTab, setCurrentTab] = useState(null);

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
    { id: 'training', label: language === 'en' ? '90 Days Training' : '৯০ দিনের প্রশিক্ষণ', icon: '📚', show: true },
    { id: 'community', label: language === 'en' ? 'Community' : 'কমিউনিটি', icon: '👥', show: true },
    { id: 'leaderboard', label: language === 'en' ? 'Leaderboard' : 'লিডারবোর্ড', icon: '🏆', show: true },
    { id: 'competitions', label: language === 'en' ? 'Competitions' : 'প্রতিযোগিতা', icon: '🎯', show: true },
    { id: 'sops', label: language === 'en' ? 'SOP' : 'এসওপি', icon: '📋', show: true },
    { id: 'my_ppe', label: language === 'en' ? 'My PPE' : 'আমার পিপিই', icon: '👷', show: true },
    { id: 'my_tools', label: language === 'en' ? 'My Tools' : 'আমার সরঞ্জাম', icon: '🔧', show: true },
    { id: 'emergency', label: language === 'en' ? 'Emergency' : 'জরুরি', icon: '🚨', show: true, color: 'text-red-600' },
    { id: 'admin', label: language === 'en' ? 'Admin' : 'অ্যাডমিন', icon: '⚙️', show: true },
    { id: 'guide', label: language === 'en' ? 'Handbook' : 'হ্যান্ডবুক', icon: '📖', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
    { id: 'admin-services', label: language === 'en' ? 'Services Update' : 'সার্ভিস আপডেট', icon: '🔄', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
  ];

  const handleNavClick = (item) => {
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
        className={`fixed md:static left-0 top-0 h-screen w-72 md:w-64 bg-white dark:bg-slate-900 shadow-2xl md:shadow-none border-r border-slate-200/50 dark:border-slate-700/50 z-[100] transform transition-all duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Sidebar Header - Enhanced */}
        <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-orange-50 to-white dark:from-slate-800 dark:to-slate-900">
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
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                  {userProfile?.role || 'lineman'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats - Desktop Only */}
          <div className="hidden md:grid grid-cols-2 gap-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
              <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Points</div>
              <div className="text-lg font-black text-orange-600 dark:text-orange-400">{userProfile?.points || 0}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
              <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Level</div>
              <div className="text-lg font-black text-orange-600 dark:text-orange-400">{userProfile?.training_level || 1}</div>
            </div>
          </div>
        </div>

        {/* Navigation Items - Enhanced */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {menuItems.map((item) => {
            if (!item.show) return null;

            let isActive = currentView === item.id;

            // For items that redirect, check if we're on safety view and the tab matches
            if (item.redirectTo && item.tab) {
              isActive = currentView === item.redirectTo && currentTab === item.tab;
            }

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group ${isActive
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:translate-x-1'
                  }`}
                title={item.label}
              >
                <span className={`text-xl shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">
                  {item.label}
                </span>
                {isActive && (
                  <span className="ml-auto">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer - Enhanced */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50 dark:bg-slate-900/50">
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
            <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
              {APP_NAME} <span className="text-orange-500">v{CURRENT_APP_VERSION}</span>
            </p>
          </div>
        </div>
      </aside >
    </>
  );
}
