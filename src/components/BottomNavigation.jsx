import React from 'react';
import { hapticImpact } from '../utils/nativeAndroidUx';
import { isNativeCapacitorPlatform } from '../utils/webPush';

const iconClass = 'h-[22px] w-[22px]';

function NavIcon({ active, children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={active ? '0' : '2'}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClass}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const BottomNavigation = ({ currentView, setCurrentView, language, onMenuClick, userId, selectedProgressUserId }) => {
  const bnFont = language === 'bn';
  const native = isNativeCapacitorPlatform();

  const navItems = [
    {
      id: 'home',
      label: language === 'en' ? 'Home' : 'হোম',
      paths: (active) => (
        <NavIcon active={active}>
          {active ? (
            <path d="M12 3.172 3 10.5V21a1 1 0 0 0 1 1h6v-7h4v7h6a1 1 0 0 0 1-1v-10.5L12 3.172Z" />
          ) : (
            <>
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </>
          )}
        </NavIcon>
      ),
    },
    {
      id: 'my_ppe',
      label: language === 'en' ? 'Safety' : 'সুরক্ষা',
      paths: (active) => (
        <NavIcon active={active}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          {!active && <path d="m9 12 2 2 4-4" />}
          {active && (
            <path
              d="m9 12 2 2 4-4"
              fill="none"
              stroke="#fff7ed"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </NavIcon>
      ),
    },
    {
      id: 'leaderboard',
      label: language === 'en' ? 'Rank' : 'র‍্যাঙ্ক',
      paths: (active) => (
        <NavIcon active={active}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </NavIcon>
      ),
    },
    {
      id: 'community',
      label: language === 'en' ? 'Forum' : 'প্রশ্নোত্তর',
      paths: (active) => (
        <NavIcon active={active}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </NavIcon>
      ),
    },
    {
      id: 'menu',
      label: language === 'en' ? 'More' : 'আরও',
      paths: (active) => (
        <NavIcon active={active}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </NavIcon>
      ),
    },
  ];

  const isViewingOthersProgress = currentView === 'my-progress' && selectedProgressUserId && selectedProgressUserId !== userId;

  const moreViews = ['menu', 'sops', 'emergency', 'video-guide', 'aro-janun', 'training-faq', 'notifications', 'admin', 'guide', 'admin-services', 'competitions', 'training', 'my-progress'];

  const isItemActive = (item) =>
    (currentView === item.id && !isViewingOthersProgress) ||
    (item.id === 'my_ppe' && ['safety-library', 'my_ppe', 'my_tools'].includes(currentView)) ||
    (item.id === 'leaderboard' && (currentView === 'leaderboard' || currentView === 'prizes' || isViewingOthersProgress)) ||
    (item.id === 'menu' && moreViews.includes(currentView));

  return (
    <nav
      className={`app-bottom-nav fixed bottom-0 left-0 right-0 z-[100] md:hidden ${native ? 'app-bottom-nav--m3' : ''}`}
      aria-label={language === 'en' ? 'Main navigation' : 'প্রধান নেভিগেশন'}
    >
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
                void hapticImpact('Light');
                if (navigator.vibrate) navigator.vibrate(5);
                if (onMenuClick) onMenuClick(false);
                setCurrentView(item.id);
              }}
              className={`app-bottom-nav__item touch-manipulation ${isActive ? 'app-bottom-nav__item--active' : ''}`}
            >
              <span className="app-bottom-nav__icon" aria-hidden="true">
                {item.paths(isActive)}
              </span>
              <span className={`app-bottom-nav__label ${bnFont ? 'font-bengali' : ''}`}>
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
