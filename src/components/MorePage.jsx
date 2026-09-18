import React from 'react';
import { UserIcon } from './icons';
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL } from '../config';
import { useLifeSkillRadio } from '../context/LifeSkillRadioContext';
import { openLinemanInviteWhatsApp } from '../utils/linemanInviteShare';
import { hapticImpact, openExternalUrl, shareContent } from '../utils/nativeAndroidUx';
import { isNativeCapacitorPlatform } from '../utils/webPush';
import AndroidAppDownloadCta from './AndroidAppDownloadCta';
import AvatarPhoto from './AvatarPhoto';
import LanguageSwitch from './LanguageSwitch';
import { AVATAR_EDGE } from '../utils/avatarImage';

const FACEBOOK_PAGE_URL = 'https://www.facebook.com/smartlineman';
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t';

function Glyph({ d, cut, children }) {
  return (
    <svg className="home-3d-tile__glyph" viewBox="0 0 24 24" aria-hidden>
      {d ? <path fill="currentColor" d={d} /> : null}
      {cut ? <path fill="#fff" d={cut} /> : null}
      {children}
    </svg>
  );
}

export default function MorePage({
  currentView,
  setCurrentView,
  userProfile,
  language,
  onLanguageChange,
  onToggleNotifications,
  onLogout,
  onOpenUserGuide,
}) {
  const { startRadio, loading: radioLoading } = useLifeSkillRadio();
  const bn = language === 'bn';
  const isStaff = ['admin', 'safety mitra'].includes(userProfile?.role);

  const items = [
    {
      id: 'amader-kotha',
      label: bn ? 'আমাদের কথা' : 'Our Story',
      tone: 'story',
      show: true,
      icon: <Glyph d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />,
    },
    {
      id: 'prizes',
      label: bn ? 'পুরস্কার' : 'Prizes',
      tone: 'prize',
      show: true,
      icon: (
        <Glyph>
          <path
            fill="currentColor"
            d="M9.2 3.1c1.5.1 2.45 1.4 2.8 2.65.35-1.25 1.3-2.55 2.8-2.65 1.7-.1 3 1.2 3 2.7 0 1.75-1.8 2.7-3.5 3.3L12 9.85 9.7 9.1C8 8.5 6.2 7.55 6.2 5.8c0-1.5 1.3-2.8 3-2.7z"
          />
          <path
            fill="currentColor"
            d="M4.35 9.15h15.3c.7 0 1.25.55 1.25 1.25v1.5H3.1v-1.5c0-.7.55-1.25 1.25-1.25z"
          />
          <path
            fill="currentColor"
            d="M5.15 12.65h13.7v7.15c0 .8-.65 1.45-1.45 1.45H6.6c-.8 0-1.45-.65-1.45-1.45v-7.15z"
          />
          <path fill="#fff" d="M11.2 9.15h1.6v12.1h-1.6z" />
          <path fill="#fff" d="M3.1 10.5h17.8v1.5H3.1z" />
        </Glyph>
      ),
    },
    {
      id: 'my_ppe',
      label: bn ? 'আমার পিপিই' : 'My PPE',
      tone: 'safe',
      show: true,
      gapAfter: true,
      icon: (
        <Glyph
          d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
          cut="m10.2 14.7-2.6-2.6 1.4-1.4 1.2 1.2 3.7-3.7 1.4 1.4-5.1 5.1z"
        />
      ),
    },
    {
      id: 'app-guide',
      label: bn ? 'অ্যাপ গাইড' : 'App guide',
      tone: 'phone',
      show: typeof onOpenUserGuide === 'function',
      icon: (
        <Glyph
          d="M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99z"
          cut="M7 5h10v12H7z"
        />
      ),
    },
    {
      id: 'my-progress',
      label: bn ? 'আমার অগ্রগতি' : 'My Progress',
      tone: 'learn',
      show: true,
      icon: (
        <Glyph d="M21 8c-1.45 0-2.26 1.44-1.93 2.51l-3.55 3.56c-.3-.09-.74-.09-1.04 0l-2.55-2.55C12.27 10.45 11.46 9 10 9c-1.45 0-2.27 1.45-1.93 2.52l-4.56 4.55C2.44 15.74 1 16.55 1 18c0 1.1.9 2 2 2 1.45 0 2.26-1.44 1.93-2.51l4.55-4.56c.3.09.74.09 1.04 0l2.55 2.55C12.73 16.55 13.54 18 15 18c1.45 0 2.27-1.45 1.93-2.52l3.56-3.55c1.07.33 2.51-.48 2.51-1.93 0-1.1-.9-2-2-2z" />
      ),
    },
    {
      id: 'training-faq',
      label: bn ? 'জিজ্ঞাসা' : 'FAQ',
      tone: 'manage',
      show: true,
      redirectTo: 'training',
      tab: 'faq',
      icon: (
        <Glyph
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
          cut="M13 17h-2v-2h2v2zm1.07-7.75-.9.92C12.45 10.9 12 11.5 12 13h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"
        />
      ),
    },
    {
      id: 'aro-janun',
      label: bn ? 'আরো জানুন' : 'Know More',
      tone: 'idea',
      show: true,
      icon: <Glyph d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />,
    },
    {
      id: 'video-guide',
      label: bn ? 'ভিডিও গাইড' : 'Video Guide',
      tone: 'video',
      show: true,
      icon: (
        <Glyph
          d="M21 3H3c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.11-.9-2-2-2z"
          cut="M16 11.5 9 15.5v-8z"
        />
      ),
    },
    {
      id: 'my_tools',
      label: bn ? 'আমার সরঞ্জাম' : 'My Tools',
      tone: 'tools',
      show: true,
      icon: <Glyph d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />,
    },
    {
      id: 'emergency',
      label: bn ? 'জরুরি' : 'Emergency',
      tone: 'sos',
      show: true,
      gapBefore: true,
      icon: (
        <Glyph
          d="M1 21h22L12 2 1 21z"
          cut="M11 9h2v6h-2zm0 8h2v2h-2z"
        />
      ),
    },
    {
      id: 'accident-stories',
      label: bn ? 'করুণ কাহিনী' : 'Tragic Stories',
      tone: 'heart',
      show: true,
      icon: <Glyph d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />,
    },
    {
      id: 'radio',
      label: bn ? 'SLM রেডিও' : 'SLM Radio',
      tone: 'indigo',
      show: true,
      live: true,
      disabled: radioLoading,
      action: 'radio',
      icon: <Glyph d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V8c0-1.1-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z" />,
    },
    {
      id: 'notifications',
      label: bn ? 'বিজ্ঞপ্তি' : 'Notifications',
      tone: 'bell',
      show: true,
      icon: <Glyph d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />,
    },
    {
      id: 'community',
      label: bn ? 'প্রশ্নোত্তর' : 'Forum',
      tone: 'forum',
      show: true,
      icon: <Glyph d="M21 6c0-1.1-.9-2-2-2H5C3.9 4 3 4.9 3 6v9c0 1.1.9 2 2 2h3v3.5L12.5 17H19c1.1 0 2-.9 2-2V6z" />,
    },
    {
      id: 'share',
      label: bn ? 'শেয়ার করুন' : 'Share',
      tone: 'share',
      show: true,
      action: 'share',
      icon: <Glyph d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />,
    },
  ].filter((item) => item.show);

  const staffTools = [
    {
      id: 'guide',
      tone: 'survey',
      label: bn ? 'হ্যান্ডবুক' : 'Handbook',
      icon: (
        <Glyph d="M12 11.55C9.64 9.35 6.48 8 3 8v11c3.48 0 6.64 1.35 9 3.55 2.36-2.19 5.52-3.55 9-3.55V8c-3.48 0-6.64 1.35-9 3.55zM12 8c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" />
      ),
    },
    {
      id: 'admin-services',
      tone: 'more',
      label: bn ? 'সার্ভিস' : 'Services',
      icon: (
        <Glyph d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z" />
      ),
    },
  ];

  const shareInvite = () => {
    void hapticImpact('Light');
    if (navigator.vibrate) navigator.vibrate(5);
    if (isNativeCapacitorPlatform()) {
      void shareContent({
        title: APP_NAME,
        text: bn
          ? 'স্মার্টলাইনম্যান — খেলতে খেলতে শিখুন, পুরস্কার জিতুন।'
          : 'SmartLineman — learn while you play, win prizes.',
        url: WEBSITE_URL,
        dialogTitle: bn ? 'শেয়ার করুন' : 'Share SmartLineman',
      });
    } else {
      openLinemanInviteWhatsApp(language);
    }
  };

  const handleNavClick = (item) => {
    if (navigator.vibrate) navigator.vibrate(5);
    if (item.action === 'radio') {
      if (!radioLoading) startRadio();
      return;
    }
    if (item.action === 'share') {
      shareInvite();
      return;
    }
    if (item.id === 'notifications') {
      if (onToggleNotifications) onToggleNotifications();
      return;
    }
    if (item.id === 'app-guide') {
      if (onOpenUserGuide) onOpenUserGuide();
      return;
    }
    if (item.redirectTo && item.tab) {
      window.location.hash = `/${item.redirectTo}?tab=${item.tab}`;
      return;
    }
    if ((item.id === 'home' || item.id === 'my-progress') && setCurrentView) {
      setCurrentView(item.id);
      return;
    }
    window.location.hash = `/${item.id}`;
  };

  return (
    <div className={`home-screen min-h-full pb-28 text-slate-900 ${bn ? 'home-screen--bn' : ''}`}>
      <div className="mx-auto max-w-lg px-4 pt-4 sm:pt-5">
        <header className="more-head">
          <h1 className={`more-head__title ${bn ? 'font-bengali' : ''}`}>
            {bn ? 'আরও' : 'More'}
          </h1>
          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(5);
              if (setCurrentView) setCurrentView('admin');
              else window.location.hash = '/admin';
            }}
            className="home-greet__avatar"
            aria-label={bn ? 'প্রোফাইল' : 'Profile'}
          >
            <span className="home-greet__photo">
              {userProfile?.avatar_url ? (
                <AvatarPhoto url={userProfile.avatar_url} edge={AVATAR_EDGE.card} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="home-greet__photo-fallback">
                  <UserIcon className="h-full w-full" />
                </span>
              )}
            </span>
          </button>
        </header>

        <div className="more-3d-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => handleNavClick(item)}
              aria-label={item.label}
              aria-current={currentView === item.id ? 'page' : undefined}
              className={`home-3d-tile more-3d-tile home-3d-tile--${item.tone || 'more'}${item.disabled ? ' is-done' : ''}${item.gapAfter ? ' is-gap-after' : ''}${item.gapBefore ? ' is-gap-before' : ''}`}
            >
              <span className="home-3d-tile__icon" aria-hidden>
                {item.icon}
                {item.live ? <span className="home-3d-tile__badge is-live" /> : null}
              </span>
              <span className={`home-3d-tile__label ${bn ? 'font-bengali' : ''}`}>
                {item.label}
              </span>
              <svg className="more-3d-tile__go" viewBox="0 0 24 24" aria-hidden>
                <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>

        {isStaff ? (
          <section className="more-staff" aria-label={bn ? 'অ্যাডমিন / সেফটি মিত্র' : 'Admin / Safety Mitra'}>
            <h2 className={`more-staff__title ${bn ? 'font-bengali' : ''}`}>
              {bn ? 'অ্যাডমিন / সেফটি মিত্র' : 'Admin / Safety Mitra'}
            </h2>
            <div className="more-3d-list more-staff__list">
              {staffTools.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item)}
                  aria-label={item.label}
                  aria-current={currentView === item.id ? 'page' : undefined}
                  className={`home-3d-tile more-3d-tile home-3d-tile--${item.tone}`}
                >
                  <span className="home-3d-tile__icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span className={`home-3d-tile__label ${bn ? 'font-bengali' : ''}`}>
                    {item.label}
                  </span>
                  <svg className="more-3d-tile__go" viewBox="0 0 24 24" aria-hidden>
                    <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="more-android-wrap">
          <AndroidAppDownloadCta language={language} />
        </section>

        <div className="home-connect">
          <div className="home-connect__row">
            <button
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                void openExternalUrl(FACEBOOK_PAGE_URL);
              }}
              aria-label={bn ? 'ফেসবুক পেজ' : 'Facebook Page'}
              className="home-connect__btn home-connect__btn--fb"
            >
              <span className="home-connect__icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
                </svg>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                void openExternalUrl(WHATSAPP_GROUP_URL);
              }}
              aria-label={bn ? 'হোয়াটসঅ্যাপ গ্রুপ' : 'WhatsApp Group'}
              className="home-connect__btn home-connect__btn--wa"
            >
              <span className="home-connect__icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </span>
            </button>
            <LanguageSwitch language={language} onChange={onLanguageChange} />
            <button
              type="button"
              onClick={onLogout}
              aria-label={bn ? 'লগ আউট' : 'Logout'}
              className="home-connect__btn home-connect__btn--out"
            >
              <span className="home-connect__icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
            </button>
          </div>

          <div className="more-meta">
            <button
              type="button"
              onClick={() => void openExternalUrl(WEBSITE_URL)}
              className="more-meta__name"
            >
              {APP_NAME}
            </button>
            <p className="more-meta__ver">v{CURRENT_APP_VERSION}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="more-meta__mail">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
