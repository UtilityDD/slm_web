import React, { useState, useEffect } from 'react';

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
    { id: 'competitions', label: language === 'en' ? 'Competitions' : 'প্রতিযোগিতা', icon: '🏆', show: true },
    { id: 'sop', label: language === 'en' ? 'SOP' : 'এসওপি', icon: '📋', show: true, redirectTo: 'safety', tab: 'sops' },
    { id: 'ppe', label: language === 'en' ? 'My PPE' : 'আমার পিপিই', icon: '👷', show: true, redirectTo: 'safety', tab: 'my_ppe' },
    { id: 'tools', label: language === 'en' ? 'My Tools' : 'আমার সরঞ্জাম', icon: '🔧', show: true, redirectTo: 'safety', tab: 'my_tools' },
    { id: 'emergency', label: language === 'en' ? 'Emergency' : 'জরুরি', icon: '🚨', show: true, color: 'text-red-600' },
    { id: 'admin', label: userProfile?.role === 'safety mitra' ? (language === 'en' ? 'Safety Mitra' : 'সেফটি মিত্র') : (language === 'en' ? 'Admin' : 'অ্যাডমিন'), icon: '⚙️', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
    { id: 'guide', label: language === 'en' ? 'Handbook' : 'হ্যান্ডবুক', icon: '📖', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
    { id: 'admin-services', label: language === 'en' ? 'Services Update' : 'সার্ভিস আপডেট', icon: '🔄', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
  ];

  const handleNavClick = (item) => {
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
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static left-0 top-0 h-screen md:h-auto w-64 md:w-20 lg:w-64 bg-white dark:bg-slate-800 shadow-xl md:shadow-none z-[100] transform transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } hover:w-64 group`}
      >
        {/* Sidebar Header */}
        <div className="h-auto px-4 py-3 border-b border-slate-100 dark:border-slate-700 md:border-none">
          {/* User Profile Section */}
          <div className="flex items-center gap-2 md:gap-1.5 lg:gap-2">
            <div className="w-9 h-9 md:w-8 md:h-8 lg:w-9 lg:h-9 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-100 shrink-0 overflow-hidden">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt={userProfile.full_name} className="w-full h-full object-cover" />
              ) : (
                userProfile?.full_name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0 md:hidden lg:block">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {userProfile?.full_name || 'User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium capitalize leading-tight">
                {userProfile?.role || 'lineman'}
              </p>
            </div>
          </div>

          {/* Desktop Toggle Button */}
          <div className="hidden md:flex md:justify-center md:mt-2">
            <button
              onClick={onToggleSidebar}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <svg className="w-4 h-4 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19l7-7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 md:px-1 space-y-1">
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
                className={`w-full flex items-center gap-2 px-3 md:px-1.5 py-2 rounded-lg transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={item.label}
              >
                <span className="text-lg shrink-0 md:text-base">{item.icon}</span>
                <span className="text-xs font-medium lg:group-hover:inline md:hidden lg:inline">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-100 dark:border-slate-700 p-1.5 md:p-1 space-y-1">
          <button
            onClick={onToggleLanguageModal}
            className="w-full flex items-center gap-2 px-3 md:px-1.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
            title="Language"
          >
            <span className="text-lg shrink-0 md:text-base">🌐</span>
            <span className="text-xs font-medium lg:group-hover:inline md:hidden lg:inline">
              {language === 'en' ? 'Language' : 'ভাষা'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
