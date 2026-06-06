import React from 'react';

const BottomNavigation = ({ currentView, setCurrentView, language, onMenuClick, userId, selectedProgressUserId }) => {
  const navItems = [
    {
      id: 'training',
      label: language === 'en' ? 'Home' : 'হোম',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      )
    },
    {
      id: 'safety-library',
      label: language === 'en' ? 'Safety' : 'সুরক্ষা',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      )
    },
    {
      id: 'leaderboard',
      label: language === 'en' ? 'Rank' : 'র‍্যাঙ্ক',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
      )
    },
    {
      id: 'my-progress',
      label: language === 'en' ? 'Progress' : 'অগ্রগতি',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      )
    },
    {
      id: 'menu',
      label: language === 'en' ? 'More' : 'আরও',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      )
    }
  ];

  const isViewingOthersProgress = currentView === 'my-progress' && selectedProgressUserId && selectedProgressUserId !== userId;

  return (
    <nav className="neo-brutal fixed bottom-0 left-0 right-0 z-[100] border-t-2 border-slate-900 bg-[#fffdf7] pb-safe-area shadow-[0_-4px_0_#0f172a] md:hidden">
      <div className="nb-hazard" aria-hidden="true" />
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-3">
        {navItems.map((item) => {
          const isActive = (currentView === item.id && !isViewingOthersProgress) ||
                           (item.id === 'safety-library' && ['safety-library', 'my_ppe', 'my_tools'].includes(currentView)) ||
                           (item.id === 'training' && (currentView === 'home' || currentView === 'competitions')) ||
                           (item.id === 'leaderboard' && (currentView === 'leaderboard' || isViewingOthersProgress));

          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                if (item.id === 'menu') {
                  if (onMenuClick) onMenuClick();
                } else {
                  if (onMenuClick) {
                    setCurrentView(item.id);
                    onMenuClick(false);
                  } else {
                    setCurrentView(item.id);
                  }
                }
              }}
              className={`relative flex h-12 w-12 items-center justify-center border-2 border-slate-900 transition-all duration-300 outline-none ${
                isActive
                  ? '-translate-y-1 bg-orange-500 text-white shadow-[3px_3px_0_#0f172a]'
                  : 'bg-white text-slate-600 shadow-[2px_2px_0_#0f172a] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5'
              }`}
            >
              {item.icon}
              {isActive && (
                <span className="absolute -bottom-2 h-1.5 w-1.5 border border-slate-900 bg-orange-500" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
