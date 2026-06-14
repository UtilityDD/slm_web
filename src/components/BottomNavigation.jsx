import React from 'react';

const iconClass = 'h-[21px] w-[21px]';

const BottomNavigation = ({ currentView, setCurrentView, language, onMenuClick, userId, selectedProgressUserId }) => {
  const bnFont = language === 'bn';

  const navItems = [
    {
      id: 'training',
      label: language === 'en' ? 'Home' : 'হোম',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 'safety-library',
      label: language === 'en' ? 'Safety' : 'সুরক্ষা',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'leaderboard',
      label: language === 'en' ? 'Rank' : 'র‍্যাঙ্ক',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      ),
    },
    {
      id: 'my-progress',
      label: language === 'en' ? 'Progress' : 'অগ্রগতি',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    },
    {
      id: 'menu',
      label: language === 'en' ? 'More' : 'আরও',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
  ];

  const isViewingOthersProgress = currentView === 'my-progress' && selectedProgressUserId && selectedProgressUserId !== userId;

  const isItemActive = (item) =>
    (currentView === item.id && !isViewingOthersProgress) ||
    (item.id === 'safety-library' && ['safety-library', 'my_ppe', 'my_tools'].includes(currentView)) ||
    (item.id === 'training' && (currentView === 'home' || currentView === 'competitions')) ||
    (item.id === 'leaderboard' && (currentView === 'leaderboard' || isViewingOthersProgress));

  return (
    <nav
      className="neo-brutal app-bottom-nav fixed bottom-0 left-0 right-0 z-[100] md:hidden"
      aria-label={language === 'en' ? 'Main navigation' : 'প্রধান নেভিগেশন'}
    >
      <div className="nb-hazard" aria-hidden="true" />
      <div className="app-bottom-nav__inner mx-auto flex max-w-lg items-stretch justify-around px-1">
        {navItems.map((item) => {
          const isActive = isItemActive(item);

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                if (item.id === 'menu') {
                  if (onMenuClick) onMenuClick();
                } else if (onMenuClick) {
                  setCurrentView(item.id);
                  onMenuClick(false);
                } else {
                  setCurrentView(item.id);
                }
              }}
              className={`app-bottom-nav__item touch-manipulation ${isActive ? 'app-bottom-nav__item--active' : ''}`}
            >
              <span className="app-bottom-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className={`app-bottom-nav__label ${bnFont ? 'font-bengali' : 'nb-mono'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
