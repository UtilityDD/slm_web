import React, { useState, useEffect } from "react";
import Competitions from "./components/Competitions";
import Community from "./components/Community";
import Emergency from "./components/Emergency";
import SafetyHub from "./components/SafetyHub";
import Login from "./components/Login";
import { supabase } from "./supabaseClient";
import LogoutConfirmationModal from "./components/LogoutConfirmationModal";
import Admin from "./components/Admin";
import Home from "./components/Home";

export default function SmartLinemanUI() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('light');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchProfile = async (user) => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, avatar_url')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setUserProfile(data);
        }
      }
    };

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      fetchProfile(session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        fetchProfile(session.user);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // Check LocalStorage for Language on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage');
    if (savedLang) {
      setLanguage(savedLang);
    } else {
      setShowLanguageModal(true);
    }
  }, []);

  // Check LocalStorage for Theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Default to light mode if no saved preference
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleLanguageSelect = (lang) => {
    setLanguage(lang);
    localStorage.setItem('appLanguage', lang);
    setShowLanguageModal(false);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('appTheme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setShowLogoutModal(false);
    setCurrentView('home');
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const translations = {
    en: {
      nav: {
        safety: "Safety Hub",
        community: "Community",
        competitions: "Competitions",
        leaderboard: "Leaderboard",
        emergency: "Emergency",
        login: "Login",
        logout: "Logout",
        admin: "Admin",
        safetyMitra: "Safety Mitra"
      },
      hero: {
        title: "SmartLineman",
        subtitle: "Empowering West Bengal's electrical linemen through safety, community & recognition",
        stats: {
          linemen: "Active Linemen",
          supervisors: "Supervisors",
          safety: "Safety Record"
        }
      },
      footer: {
        desc: "Empowering electrical linemen across West Bengal through safety, community and continuous learning.",
        quickLinks: "Quick Links",
        resources: "Resources",
        emergency: "Emergency"
      }
    },
    bn: {
      nav: {
        safety: "সেফটি হাব",
        community: "কমিউনিটি",
        competitions: "প্রতিযোগিতা",
        leaderboard: "লিডারবোর্ড",
        emergency: "জরুরি",
        login: "লগ ইন",
        logout: "লগ আউট",
        admin: "অ্যাডমিন",
        safetyMitra: "সেফটি মিত্র"
      },
      hero: {
        title: "স্মার্ট লাইনম্যান",
        subtitle: "সুরক্ষা, কমিউনিটি এবং স্বীকৃতির মাধ্যমে পশ্চিমবঙ্গের লাইনম্যানদের ক্ষমতায়ন",
        stats: {
          linemen: "সক্রিয় লাইনম্যান",
          supervisors: "সুপারভাইজার",
          safety: "সুরক্ষা রেকর্ড"
        }
      },
      footer: {
        desc: "সুরক্ষা, কমিউনিটি এবং ক্রমাগত শিক্ষার মাধ্যমে পশ্চিমবঙ্গের লাইনম্যানদের ক্ষমতায়ন।",
        quickLinks: "দ্রুত লিঙ্ক",
        resources: "রিসোর্স",
        emergency: "জরুরি পরিষেবা"
      }
    }
  };

  const t = translations[language];

  const renderContent = () => {
    if (currentView === 'login' && !user) {
      return <Login onLogin={(u) => { setUser(u); setCurrentView('home'); }} />;
    }

    switch (currentView) {
      case 'competitions':
        return <Competitions language={language} user={user} setCurrentView={setCurrentView} />;
      case 'community':
        return <Community language={language} user={user} />;
      case 'emergency':
        return <Emergency language={language} user={user} setCurrentView={setCurrentView} />;
      case 'safety':
        return <SafetyHub language={language} user={user} setCurrentView={setCurrentView} />;
      case 'admin':
        return <Admin language={language} user={user} userProfile={userProfile} />;
      case 'home':
      default:
        return <Home
          setCurrentView={setCurrentView}
          language={language}
          t={t}
          user={user}
          userProfile={userProfile}
        />;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 ${language === 'bn' ? 'font-bengali' : 'font-sans'}`}>
      {showLogoutModal && (
        <LogoutConfirmationModal
          onConfirm={confirmLogout}
          onCancel={cancelLogout}
          language={language}
        />
      )}
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-blue-100/40 dark:bg-blue-900/20 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-cyan-100/40 dark:bg-cyan-900/20 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4"></div>
      </div>

      {/* Header - Material Design */}
      <header className="bg-white dark:bg-slate-800 elevation-2 sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto mobile-container">
          <div className="flex justify-between items-center h-14 md:h-16">
            <div
              className="flex items-center gap-2 sm:gap-3 group cursor-pointer ripple-dark rounded-lg px-2 py-1 -ml-2"
              onClick={() => setCurrentView('home')}
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-700 to-blue-600 dark:from-blue-600 dark:to-blue-500 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm text-white elevation-2 transition-all duration-300 group-hover:scale-105">
                  SL
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {language === 'en' ? 'SmartLineman' : 'স্মার্ট লাইনম্যান'}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'en' ? 'West Bengal' : 'পশ্চিমবঙ্গ'}
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
              <a
                className={`hover:text-blue-700 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'safety' ? 'text-blue-700 font-semibold' : ''}`}
                onClick={() => setCurrentView('safety')}
              >
                {t.nav.safety}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'safety' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              <a
                className={`hover:text-blue-700 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'community' ? 'text-blue-700 font-semibold' : ''}`}
                onClick={() => setCurrentView('community')}
              >
                {t.nav.community}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'community' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              <a
                className={`hover:text-blue-700 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'competitions' ? 'text-blue-700 font-semibold' : ''}`}
                onClick={() => setCurrentView('competitions')}
              >
                {t.nav.competitions}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'competitions' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              <a
                className={`hover:text-blue-700 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'emergency' ? 'text-blue-700 font-semibold' : ''}`}
                onClick={() => setCurrentView('emergency')}
              >
                <span className="text-red-600 hover:text-red-700 font-bold">{t.nav.emergency}</span>
                <span className={`absolute bottom-0 left-0 h-0.5 bg-red-600 transition-all duration-300 ${currentView === 'emergency' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              {['admin', 'safety mitra'].includes(userProfile?.role) && (
                <a
                  className={`hover:text-blue-700 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'admin' ? 'text-blue-700 font-semibold' : ''}`}
                  onClick={() => setCurrentView('admin')}
                >
                  {userProfile?.role === 'safety mitra' ? t.nav.safetyMitra : t.nav.admin}
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'admin' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </a>
              )}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle Button */}
              <button
                onClick={handleThemeToggle}
                className="flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all touch-target"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? (
                  <svg className="w-4 h-4 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>

              {/* Language Toggle Button */}
              <button
                onClick={() => handleLanguageSelect(language === 'en' ? 'bn' : 'en')}
                className="px-2 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all touch-target"
                title={language === 'en' ? 'Switch to Bengali' : 'Switch to English'}
              >
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {language === 'en' ? 'বাং' : 'EN'}
                </span>
              </button>

              {/* User menu - Desktop only */}
              {user ? (
                <div className="hidden md:flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs elevation-1 overflow-hidden">
                    {userProfile?.avatar_url && !imageError ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      user.email ? user.email[0].toUpperCase() : 'U'
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-slate-500 hover:text-slate-700 text-xs sm:text-sm font-medium ripple-dark px-2 py-1 rounded"
                  >
                    {t.nav.logout}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCurrentView('login')}
                  className="hidden md:inline-block material-button-primary text-xs sm:text-sm"
                >
                  {t.nav.login}
                </button>
              )}

              {/* Mobile User Icon */}
              <div className="md:hidden">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm elevation-1 ripple-dark touch-target overflow-hidden"
                    title={t.nav.logout}
                  >
                    {userProfile?.avatar_url && !imageError ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      user.email ? user.email[0].toUpperCase() : 'U'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentView('login')}
                    className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center elevation-1 ripple-dark touch-target hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    title={t.nav.login}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation - Material Design */}
      <nav className="md:hidden bottom-nav">
        <div className="flex items-center justify-around h-full">
          <button
            onClick={() => setCurrentView('home')}
            className={`bottom-nav-item ripple-dark ${currentView === 'home' ? 'active' : ''}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'home' ? 2.5 : 1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[9px] font-medium">{language === 'en' ? 'Home' : 'হোম'}</span>
          </button>

          <button
            onClick={() => setCurrentView('safety')}
            className={`bottom-nav-item ripple-dark ${currentView === 'safety' ? 'active' : ''}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'safety' ? 2.5 : 1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[9px] font-medium">{language === 'en' ? 'Safety' : 'নিরাপত্তা'}</span>
          </button>

          <button
            onClick={() => setCurrentView('community')}
            className={`bottom-nav-item ripple-dark ${currentView === 'community' ? 'active' : ''}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'community' ? 2.5 : 1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[9px] font-medium">{language === 'en' ? 'Community' : 'কমিউনিটি'}</span>
          </button>

          <button
            onClick={() => setCurrentView('competitions')}
            className={`bottom-nav-item ripple-dark ${currentView === 'competitions' ? 'active' : ''}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'competitions' ? 2.5 : 1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="text-[9px] font-medium">{language === 'en' ? 'Compete' : 'প্রতিযোগিতা'}</span>
          </button>

          {['admin', 'safety mitra'].includes(userProfile?.role) && (
            <button
              onClick={() => setCurrentView('admin')}
              className={`bottom-nav-item ripple-dark ${currentView === 'admin' ? 'active' : ''}`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'admin' ? 2.5 : 1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[9px] font-medium">{userProfile?.role === 'safety mitra' ? t.nav.safetyMitra : t.nav.admin}</span>
            </button>
          )}

          <button
            onClick={() => setCurrentView('emergency')}
            className={`bottom-nav-item ripple-dark ${currentView === 'emergency' ? 'active' : ''}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'emergency' ? 2.5 : 1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-[9px] font-medium text-red-600">{language === 'en' ? 'SOS' : 'জরুরি'}</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      {renderContent()}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm text-white">
                  SL
                </div>
                <span className="font-bold text-white text-lg">
                  {language === 'en' ? 'SmartLineman' : 'স্মার্ট লাইনম্যান'}
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t.footer.desc}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">{t.footer.quickLinks}</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">{t.nav.safety}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{t.nav.community}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{t.nav.competitions}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Events</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">{t.footer.resources}</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Safety Protocols</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Training Materials</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Guidelines</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">FAQs</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">{t.footer.emergency}</h3>
              <div className="space-y-3">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <div className="text-xs text-slate-400">Emergency Hotline (WB)</div>
                  <div className="text-lg font-bold text-red-500">1912 / 1800-345-5220</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <div className="text-xs text-slate-400">Safety Support</div>
                  <div className="text-lg font-bold text-yellow-500">24/7 Available</div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
            <p>&copy; 2024 SmartLineman West Bengal.</p>
          </div>
        </div>
      </footer>

      {/* Language Selection Modal */}
      {
        showLanguageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center animate-scale-in relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

              <div className="text-5xl mb-6 relative z-10">🌍</div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2 relative z-10">Select Language</h2>
              <h2 className="text-xl font-bold text-slate-500 mb-8 font-bengali relative z-10">ভাষা নির্বাচন করুন</h2>

              <div className="space-y-4 relative z-10">
                <button
                  onClick={() => handleLanguageSelect('en')}
                  className="w-full py-4 rounded-xl border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-lg transition-all flex items-center justify-between px-6 group"
                >
                  <span>English</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
                <button
                  onClick={() => handleLanguageSelect('bn')}
                  className="w-full py-4 rounded-xl border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-lg transition-all flex items-center justify-between px-6 font-bengali group"
                >
                  <span>বাংলা</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

