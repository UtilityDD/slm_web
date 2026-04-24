import React from 'react';

const BottomNavigation = ({ currentView, setCurrentView, language, onMenuClick }) => {
  const navItems = [
    {
      id: 'home',
      label: language === 'en' ? 'Home' : 'হোম',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'training',
      label: language === 'en' ? 'Training' : 'ট্রেনিং',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      id: 'safety',
      label: language === 'en' ? 'Safety' : 'সুরক্ষা',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: 'competitions',
      label: language === 'en' ? 'Play' : 'খেলা',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'progress',
      label: language === 'en' ? 'Profile' : 'প্রোফাইল',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'menu',
      label: language === 'en' ? 'More' : 'আরও',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-[100] md:hidden pb-safe-area">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id || (item.id === 'safety' && ['safety', 'sops', 'my-ppe', 'my-tools'].includes(currentView));
          
          return (
            <button
              key={item.id}
              onClick={() => {
                // Add subtle haptic feedback if supported
                if (navigator.vibrate) navigator.vibrate(5);
                if (item.id === 'menu') {
                  if (onMenuClick) onMenuClick();
                } else {
                  setCurrentView(item.id);
                }
              }}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative ${
                isActive ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {/* Active Indicator Background */}
              {isActive && (
                <span className="absolute top-2 w-12 h-8 bg-orange-500/10 dark:bg-orange-500/20 rounded-full animate-scale-in -z-10"></span>
              )}
              
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-1' : ''}`}>
                {item.icon}
              </div>
              
              <span className={`text-[10px] font-black mt-1 uppercase tracking-tighter transition-all ${
                isActive ? 'opacity-100 translate-y-0' : 'opacity-70'
              } ${language === 'bn' ? 'font-bengali text-[11px]' : ''}`}>
                {item.label}
              </span>

              {/* Dot indicator for active state */}
              {isActive && (
                <span className="absolute bottom-1.5 w-1 h-1 bg-orange-500 rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
