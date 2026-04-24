import React from 'react';

const BottomNavigation = ({ currentView, setCurrentView, language, onMenuClick }) => {
  const navItems = [
    {
      id: 'training',
      label: language === 'en' ? 'Home' : 'হোম',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      )
    },
    {
      id: 'safety-library',
      label: language === 'en' ? 'Safety' : 'সুরক্ষা',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      )
    },
    {
      id: 'leaderboard',
      label: language === 'en' ? 'Rank' : 'র‍্যাঙ্ক',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      )
    },
    {
      id: 'menu',
      label: language === 'en' ? 'More' : 'আরও',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      )
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-t border-slate-200/50 dark:border-slate-800/50 z-[100] md:hidden pb-safe-area shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive = currentView === item.id || 
                           (item.id === 'safety-library' && ['safety-library', 'sops', 'my_ppe', 'my_tools'].includes(currentView)) || 
                           (item.id === 'training' && currentView === 'home') ||
                           (item.id === 'leaderboard' && currentView === 'competitions');
          
          return (
            <button
              key={item.id}
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
              className={`flex items-center justify-center w-12 h-12 rounded-[18px] transition-all duration-400 relative outline-none ${
                isActive 
                ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-110 -translate-y-1' 
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 hover:scale-105 active:scale-95'
              }`}
            >
              {item.icon}
              {isActive && (
                <span className="absolute -bottom-2.5 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
