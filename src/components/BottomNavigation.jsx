import React, { useEffect, useState } from 'react';
import { hapticImpact } from '../utils/nativeAndroidUx';
import { isNativeCapacitorPlatform } from '../utils/webPush';

const iconClass = 'h-[26px] w-[26px]';

function isLifeSkillHash() {
  return /[?&]tab=(supplementary|life-skill|lifeskill)/.test(window.location.hash);
}

function NavIcon({ active, fillOnActive = true, children }) {
  // Stroke-drawn icons (e.g. trophy) look broken if we zero stroke + fill on select.
  const filled = Boolean(active && fillOnActive);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? '0' : '2'}
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
  const [, setHashTick] = useState(0);

  useEffect(() => {
    const onHash = () => setHashTick((n) => n + 1);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

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
      id: 'safety-library',
      label: language === 'en' ? 'Identify' : 'পরিচিতি',
      paths: (active) => (
        <NavIcon active={active}>
          {active ? (
            <>
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5z" />
              <circle cx="12" cy="12" r="3.2" fill="#fff7ed" />
            </>
          ) : (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </NavIcon>
      ),
    },
    {
      id: 'leaderboard',
      label: language === 'en' ? 'Rank' : 'র‍্যাঙ্ক',
      paths: (active) => (
        <NavIcon active={active} fillOnActive={false}>
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
      id: 'life-skill',
      label: language === 'en' ? 'Life Skill' : 'লাইফ স্কিল',
      paths: (active) => (
        <NavIcon active={active}>
          {active ? (
            <path d="M12 2.15 14.55 9.1h7.3l-5.9 4.32 2.25 6.93L12 16.55l-6.2 3.8 2.25-6.93-5.9-4.32h7.3L12 2.15z" />
          ) : (
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          )}
        </NavIcon>
      ),
    },
  ];

  const isViewingOthersProgress = currentView === 'my-progress' && selectedProgressUserId && selectedProgressUserId !== userId;

  const isItemActive = (item) =>
    (item.id !== 'life-skill' && currentView === item.id && !isViewingOthersProgress) ||
    (item.id === 'safety-library' && currentView === 'safety-library') ||
    (item.id === 'leaderboard' && (currentView === 'leaderboard' || currentView === 'prizes' || isViewingOthersProgress)) ||
    (item.id === 'life-skill' && currentView === 'training' && isLifeSkillHash());

  return (
    <nav
      className={`app-bottom-nav fixed bottom-0 left-0 right-0 z-[100] md:hidden ${native ? 'app-bottom-nav--m3' : ''}${bnFont ? ' app-bottom-nav--bn' : ''}`}
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
                if (item.id === 'life-skill') {
                  window.location.hash = '/training?tab=supplementary';
                  return;
                }
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
