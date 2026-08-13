import React, { useEffect } from 'react';
import { UserIcon } from './icons';
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL } from '../config';
import { useLifeSkillRadio } from '../context/LifeSkillRadioContext';
import { FAQ_PAGE_TITLE } from '../utils/faqFilters';
import { openExternalUrl } from '../utils/nativeAndroidUx';
import AvatarPhoto from './AvatarPhoto';
import { AVATAR_EDGE } from '../utils/avatarImage';

const FACEBOOK_PAGE_URL = 'https://www.facebook.com/smartlineman';
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t';

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
  unreadNotificationsCount,
  onLogout
}) {
  const { startRadio, loading: radioLoading } = useLifeSkillRadio();
  const bn = language === 'bn';

  const sections = [
    {
      id: 'learn',
      title: bn ? 'শেখা' : 'Learn',
      items: [
        { id: 'home', label: bn ? 'হোম' : 'Home', icon: '🏠', tint: 'bg-orange-100 text-orange-700', show: true },
        { id: 'training', label: bn ? 'প্রশিক্ষণ' : 'Training', icon: '📚', tint: 'bg-orange-100 text-orange-700', show: true },
        { id: 'video-guide', label: bn ? 'ভিডিও গাইড' : 'Video Guide', icon: '📺', tint: 'bg-sky-100 text-sky-700', show: true },
        { id: 'aro-janun', label: bn ? 'আরো জানুন' : 'Know More', icon: '🧰', tint: 'bg-violet-100 text-violet-700', show: true },
        { id: 'training-faq', label: bn ? FAQ_PAGE_TITLE.bn : FAQ_PAGE_TITLE.en, icon: '💡', tint: 'bg-yellow-100 text-yellow-700', show: true, redirectTo: 'training', tab: 'faq' },
        { id: 'my-progress', label: bn ? 'আমার অগ্রগতি' : 'My Progress', icon: '📈', tint: 'bg-emerald-100 text-emerald-700', show: true },
      ],
    },
    {
      id: 'compete',
      title: bn ? 'প্রতিযোগিতা' : 'Compete',
      items: [
        { id: 'competitions', label: bn ? 'খেলুন' : 'Play', icon: '🎯', tint: 'bg-rose-100 text-rose-700', show: true },
        { id: 'leaderboard', label: bn ? 'র‍্যাঙ্ক' : 'Rank', icon: '🏆', tint: 'bg-amber-100 text-amber-700', show: true },
        { id: 'prizes', label: bn ? 'পুরস্কার' : 'Prizes', icon: '🎁', tint: 'bg-orange-100 text-orange-700', show: true },
      ],
    },
    {
      id: 'safety',
      title: bn ? 'সুরক্ষা' : 'Safety',
      items: [
        { id: 'safety-library', label: bn ? 'চিনুন' : 'Identify', icon: '🛡️', tint: 'bg-teal-100 text-teal-700', show: true },
        { id: 'sops', label: bn ? 'সুরক্ষা সাথী' : 'Suraksha Sathi', icon: '📋', tint: 'bg-indigo-100 text-indigo-700', show: true },
        { id: 'my_ppe', label: bn ? 'সুরক্ষা' : 'Suraksha', icon: '👷', tint: 'bg-orange-100 text-orange-700', show: true },
        { id: 'my_tools', label: bn ? 'আমার সরঞ্জাম' : 'My Tools', icon: '🔧', tint: 'bg-slate-200 text-slate-700', show: true },
        { id: 'emergency', label: bn ? 'জরুরি' : 'Emergency', icon: '🚨', tint: 'bg-red-100 text-red-700', show: true, danger: true },
      ],
    },
    {
      id: 'account',
      title: bn ? 'অ্যাকাউন্ট' : 'Account',
      items: [
        {
          id: 'notifications',
          label: bn ? 'বিজ্ঞপ্তি' : 'Notifications',
          icon: '🔔',
          tint: 'bg-rose-100 text-rose-700',
          show: true,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,
        },
        { id: 'language', label: bn ? 'ভাষা' : 'Language', icon: '🌐', tint: 'bg-sky-100 text-sky-700', show: true },
        {
          id: 'admin',
          label: (userProfile?.role === 'lineman' || userProfile?.role === 'guest')
            ? (bn ? 'আমার প্রোফাইল' : 'My Profile')
            : (bn ? 'প্রোফাইল আপডেট' : 'Update Profile'),
          icon: '⚙️',
          tint: 'bg-slate-200 text-slate-700',
          show: ['admin', 'safety mitra', 'lineman', 'guest'].includes(userProfile?.role),
        },
        { id: 'guide', label: bn ? 'হ্যান্ডবুক' : 'Handbook', icon: '📖', tint: 'bg-emerald-100 text-emerald-700', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
        { id: 'admin-services', label: bn ? 'সার্ভিস' : 'Services', icon: '🔄', tint: 'bg-violet-100 text-violet-700', show: ['admin', 'safety mitra'].includes(userProfile?.role) },
      ],
    },
  ];

  const displayUserId = userProfile?.slm_id || userProfile?.id ? String(userProfile?.slm_id || userProfile?.id) : null;
  const displayName = (userProfile?.full_name && !userProfile.full_name.includes('@')) ? userProfile.full_name : 'Guest';
  const points = userProfile ? (userProfile.points || 0).toLocaleString('en-US') : '…';
  const readingPoints = userProfile ? (userProfile.reading_points || 0).toLocaleString('en-US') : '…';

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleNavClick = (item) => {
    if (item.id === 'language') {
      if (onToggleLanguageModal) onToggleLanguageModal();
      onClose();
      return;
    }
    if (item.id === 'notifications') {
      if (onToggleNotifications) onToggleNotifications();
      onClose();
      return;
    }
    if (item.url) {
      void openExternalUrl(item.url);
      onClose();
      return;
    }
    if (item.redirectTo && item.tab) {
      window.location.hash = `/${item.redirectTo}?tab=${item.tab}`;
    } else if ((item.id === 'home' || item.id === 'my-progress') && setCurrentView) {
      setCurrentView(item.id);
    } else {
      window.location.hash = `/${item.id}`;
    }
    onClose();
  };
  return (
    <>
      {isOpen && (
        <div
          className="app-sidebar__scrim"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${isOpen ? 'app-sidebar--open' : ''}`}
        aria-hidden={!isOpen}
        aria-label={bn ? 'মেনু' : 'Menu'}
      >
        <header className="app-sidebar__header">
          <div className="app-sidebar__identity">
            <div className="relative shrink-0">
              <div className="app-sidebar__avatar">
                {userProfile?.avatar_url ? (
                  <AvatarPhoto url={userProfile.avatar_url} edge={AVATAR_EDGE.card} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-2 text-slate-900">
                    <UserIcon className="h-full w-full" />
                  </div>
                )}
              </div>
              <span className="app-sidebar__online" aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
              <p className={`app-sidebar__name ${bn ? 'font-bengali' : ''}`}>{displayName}</p>
              <p className="app-sidebar__meta">
                {displayUserId && <span title={displayUserId}>{displayUserId}</span>}
                {displayUserId && <span aria-hidden>·</span>}
                <span className={bn ? 'font-bengali' : ''}>{userProfile?.role || 'lineman'}</span>
                <span aria-hidden>·</span>
                <span>Lvl {userProfile?.training_level || 1}</span>
              </p>
              <p className="app-sidebar__scores">
                <span>{bn ? 'পয়েন্ট' : 'Pts'} {points}</span>
                <span aria-hidden>·</span>
                <span>{bn ? 'পড়া' : 'Reading'} {readingPoints}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="app-sidebar__close"
              aria-label={bn ? 'বন্ধ করুন' : 'Close'}
              title={bn ? 'বন্ধ করুন' : 'Close'}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <nav className="app-sidebar__nav custom-scrollbar">
          <button
            type="button"
            disabled={radioLoading}
            onClick={() => {
              startRadio();
              onClose();
            }}
            className="app-sidebar__radio"
          >
            <span className="app-sidebar__radio-icon" aria-hidden>📻</span>
            <span className={`app-sidebar__radio-label ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'SLM রেডিও শুনুন' : 'Listen to SLM Radio'}
            </span>
            <span className={`app-sidebar__radio-live ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'লাইভ' : 'Live'}
            </span>
          </button>

          {sections.map((section) => {
            const items = section.items.filter((item) => item.show);
            if (items.length === 0) return null;
            return (
              <section key={section.id} className="app-sidebar__section">
                <h2 className={`app-sidebar__section-title ${bn ? 'font-bengali' : ''}`}>
                  <span className="app-sidebar__section-dot" aria-hidden />
                  {section.title}
                </h2>
                <div className="app-sidebar__section-list">
                  {items.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''} ${item.danger ? 'app-sidebar__item--danger' : ''}`}
                      >
                        <span className={`app-sidebar__item-icon ${item.tint}`} aria-hidden>
                          {item.icon}
                        </span>
                        <span className={`app-sidebar__item-label ${bn ? 'font-bengali' : ''}`}>
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="app-sidebar__badge">{item.badge}</span>
                        ) : isActive ? (
                          <span className={`app-sidebar__now ${bn ? 'font-bengali' : ''}`}>
                            {bn ? 'এখন' : 'Now'}
                          </span>
                        ) : (
                          <svg className="app-sidebar__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>

        <footer className="app-sidebar__footer">
          <div className="app-sidebar__footer-actions">
            <a
              href={FACEBOOK_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={bn ? 'ফেসবুক পেজ' : 'Facebook Page'}
              aria-label={bn ? 'ফেসবুক পেজ' : 'Facebook Page'}
              className="app-sidebar__footer-btn app-sidebar__footer-btn--fb"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
              </svg>
            </a>
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={bn ? 'হোয়াটসঅ্যাপ গ্রুপ' : 'WhatsApp Group'}
              aria-label={bn ? 'হোয়াটসঅ্যাপ গ্রুপ' : 'WhatsApp Group'}
              className="app-sidebar__footer-btn app-sidebar__footer-btn--wa"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>
            <button
              type="button"
              onClick={onLogout}
              title={bn ? 'লগ আউট' : 'Logout'}
              aria-label={bn ? 'লগ আউট' : 'Logout'}
              className="app-sidebar__footer-btn app-sidebar__footer-btn--logout"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          <p className="app-sidebar__caption">
            <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">
              {APP_NAME}
            </a>
            <span>v{CURRENT_APP_VERSION}</span>
            <span aria-hidden>·</span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </footer>
      </aside>
    </>
  );
}
