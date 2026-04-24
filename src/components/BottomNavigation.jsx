import React from 'react';

const BottomNavigation = ({ currentView, setCurrentView, language, onMenuClick }) => {
  const navItems = [
    {
      id: 'training',
      label: language === 'en' ? 'Training' : 'প্রশিক্ষণ',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      id: 'safety-library',
      label: language === 'en' ? 'Safety' : 'সুরক্ষা',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: 'leaderboard',
      label: language === 'en' ? 'Rank' : 'র‍্যাঙ্ক',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'my-progress',
      label: language === 'en' ? 'Cert' : 'সনদ',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a.75.75 0 00-1.185.38L4.5 12.5m11.665-7.803a.75.75 0 011.185.38L19.5 12.5M12 18.75a6.75 6.75 0 116.75-6.75A6.75 6.75 0 0112 18.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12.75l2.25 2.25 4.5-4.5" />
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
          const isActive = currentView === item.id || 
                           (item.id === 'safety-library' && ['safety-library', 'sops', 'my_ppe', 'my_tools'].includes(currentView)) || 
                           (item.id === 'training' && currentView === 'home') ||
                           (item.id === 'leaderboard' && currentView === 'competitions');
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                if (item.id === 'menu') {
                  if (onMenuClick) onMenuClick();
                } else {
                  // Close sidebar if any other nav item is clicked
                  if (onMenuClick) {
                    // Logic to ensure it closes
                    const isSidebarOpen = document.body.classList.contains('sidebar-open'); // Hypothetical check if needed, but easier to just force close
                    // We'll handle the force-close in SmartLinemanUI
                    setCurrentView(item.id);
                    onMenuClick(false); // Passing false to indicate "close"
                  } else {
                    setCurrentView(item.id);
                  }
                }
              }}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative ${
                isActive ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {isActive && (
                <span className="absolute top-2 w-12 h-8 bg-orange-500/10 dark:bg-orange-500/20 rounded-full animate-scale-in -z-10"></span>
              )}
              
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-1' : ''}`}>
                {item.icon}
              </div>
              
              <span className={`text-[9px] font-black mt-1 uppercase tracking-tighter transition-all ${
                isActive ? 'opacity-100 translate-y-0' : 'opacity-70'
              } ${language === 'bn' ? 'font-bengali text-[10px]' : ''}`}>
                {item.label}
              </span>

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
