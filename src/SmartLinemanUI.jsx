import React, { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./supabaseClient";
import LogoutConfirmationModal from "./components/LogoutConfirmationModal";

// Lazy load heavy components for code splitting
const Competitions = lazy(() => import("./components/Competitions"));
const Community = lazy(() => import("./components/Community"));
const Emergency = lazy(() => import("./components/Emergency"));
const SafetyHub = lazy(() => import("./components/SafetyHub"));
const Login = lazy(() => import("./components/Login"));
const Admin = lazy(() => import("./components/Admin"));
const AdminServices = lazy(() => import("./components/AdminServices"));
const Home = lazy(() => import("./components/Home"));
const Guide = lazy(() => import("./components/Guide"));

export default function SmartLinemanUI() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash.includes('access_token=') || hash.includes('type=recovery')) return 'login';
    return hash || 'home';
  });
  const [language, setLanguage] = useState('bn');
  const [theme, setTheme] = useState('light');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [pushNotification, setPushNotification] = useState(null);
  const [notificationsHistory, setNotificationsHistory] = useState([]);
  const [notifFetchError, setNotifFetchError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastSeenNotificationId, setLastSeenNotificationId] = useState(() => localStorage.getItem('lastSeenNotificationId'));
  const [showHandbookModal, setShowHandbookModal] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const fetchProfile = async (user) => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, avatar_url, current_session_id')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          // Check for session mismatch
          const localSessionId = localStorage.getItem('slm_session_id');
          if (data.current_session_id && localSessionId && data.current_session_id !== localSessionId) {
            console.warn('Session mismatch detected. Logging out.');
            confirmLogout(true); // Pass true to indicate automatic logout
            return;
          }
          setUserProfile(data);
        }
      }
    };

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user).finally(() => setAppLoading(false));
      } else {
        setAppLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('login');
      }
      if (session) {
        fetchProfile(session.user);
        // Show handbook modal on login if not seen in this session
        if (event === 'SIGNED_IN' && !sessionStorage.getItem('hasSeenHandbook')) {
          setShowHandbookModal(true);
          sessionStorage.setItem('hasSeenHandbook', 'true');
        }
      } else {
        setUserProfile(null);
        sessionStorage.removeItem('hasSeenHandbook');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Notifications History
  useEffect(() => {
    const fetchNotifications = async () => {
      setNotifFetchError(false);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setNotificationsHistory(data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setNotifFetchError(true);
      }
    };

    fetchNotifications();
  }, []);

  const handleDeleteNotification = async (id) => {
    try {
      const { error, count } = await supabase
        .from('notifications')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) throw error;
      console.log('Delete result:', { id, count });

      if (count === 0) {
        console.warn('No rows were deleted. This might be an RLS issue.');
      }

      setNotificationsHistory(prev => prev.filter(n => n.id !== id));
      showNotification('Notification deleted', 'success');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showNotification('Failed to delete notification', 'error');
    }
  };

  // Real-time Notification Listener
  useEffect(() => {
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        console.log('New notification received:', payload);
        setPushNotification(payload.new);
        setNotificationsHistory(prev => [payload.new, ...prev].slice(0, 20));
        // Automatically clear after 10 seconds
        setTimeout(() => setPushNotification(null), 10000);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        console.log('Notification deleted:', payload);
        setNotificationsHistory(prev => prev.filter(n => n.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Scroll to top when view changes and sync with URL hash
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (currentView === 'home') {
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      window.location.hash = `/${currentView}`;
    }
  }, [currentView]);

  // Listen for hash changes (back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash.includes('access_token=') || hash.includes('type=recovery')) {
        setCurrentView('login');
      } else if (hash && hash !== currentView) {
        setCurrentView(hash);
      } else if (!hash && currentView !== 'home') {
        setCurrentView('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  // Check LocalStorage for Language on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage');
    if (savedLang) {
      setLanguage(savedLang);
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

  const confirmLogout = async (isAutomatic = false) => {
    setIsLoggingOut(true);
    setGlobalLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      localStorage.removeItem('slm_session_id');
      setShowLogoutModal(false);

      if (isAutomatic === true) {
        showNotification(language === 'en' ? 'Logged in from another device' : 'অন্য ডিভাইস থেকে লগ ইন করা হয়েছে', 'error');
      } else {
        showNotification(language === 'en' ? 'Logged out successfully' : 'সফলভাবে লগ আউট হয়েছে');
      }

      setTimeout(() => {
        setCurrentView('home');
        setGlobalLoading(false);
      }, 800);
    } catch (error) {
      showNotification(error.message, 'error');
      setGlobalLoading(false);
    } finally {
      setIsLoggingOut(false);
    }
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

  // Loading component for Suspense fallback
  const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative z-0 pb-16">
      <div className="text-center">
        <div className="relative mx-auto mb-6">
          <div className="w-16 h-16 border-4 border-blue-100 dark:border-slate-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 animate-pulse">
          {language === 'en' ? 'Loading...' : 'লোড হচ্ছে...'}
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    const content = (() => {
      if (currentView === 'login') {
        return <Login
          onLogin={(u) => {
            setGlobalLoading(true);
            setUser(u);
            showNotification(language === 'en' ? 'Welcome back!' : 'আপনাকে স্বাগতম!');
            setTimeout(() => {
              setCurrentView('home');
              setGlobalLoading(false);
            }, 800);
          }}
          showNotification={showNotification}
        />;
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
          return <Admin language={language} user={user} userProfile={userProfile} setCurrentView={setCurrentView} />;
        case 'admin-services':
          return <AdminServices language={language} />;
        case 'guide':
          return <Guide />;
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
    })();

    // Wrap in Suspense for code splitting
    return (
      <Suspense fallback={<PageLoader />}>
        {content}
      </Suspense>
    );
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans ${language === 'bn' ? 'font-bengali' : ''}`}>
      {showLogoutModal && (
        <LogoutConfirmationModal
          onConfirm={() => confirmLogout(false)}
          onCancel={cancelLogout}
          language={language}
          loading={isLoggingOut}
        />
      )}

      {/* Global Loading Overlay */}
      {globalLoading && (
        <div className="fixed inset-0 z-[110] bg-white/60 dark:bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 dark:border-slate-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 font-bold text-slate-600 dark:text-slate-300 animate-pulse">
            {language === 'en' ? 'Please wait...' : 'দয়া করে অপেক্ষা করুন...'}
          </p>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-4 animate-toast-in">
          <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl border ${notification.type === 'success'
            ? 'bg-green-600 border-green-500 text-white'
            : 'bg-red-600 border-red-500 text-white'
            }`}>
            <span className="text-xl">
              {notification.type === 'success' ? '✅' : '⚠️'}
            </span>
            <p className="text-sm font-bold">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Real-time Push Notification Alert */}
      {pushNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-2rem)] max-w-md animate-bounce-in">
          <div className={`relative p-4 sm:p-5 rounded-2xl shadow-2xl border-2 flex gap-3 sm:gap-4 items-start ${pushNotification.type === 'alert' ? 'bg-red-50 border-red-500 dark:bg-red-900/20' :
            pushNotification.type === 'warning' ? 'bg-orange-50 border-orange-500 dark:bg-orange-900/20' :
              pushNotification.type === 'update' ? 'bg-green-50 border-green-500 dark:bg-green-900/20' :
                'bg-blue-50 border-blue-500 dark:bg-blue-900/20'
            }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${pushNotification.type === 'alert' ? 'bg-red-100 text-red-600' :
              pushNotification.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                pushNotification.type === 'update' ? 'bg-green-100 text-green-600' :
                  'bg-blue-100 text-blue-600'
              }`}>
              {pushNotification.type === 'alert' ? '🚨' :
                pushNotification.type === 'warning' ? '⚠️' :
                  pushNotification.type === 'update' ? '✅' : '📢'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{pushNotification.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{pushNotification.message}</p>
            </div>
            <button
              onClick={() => setPushNotification(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
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
                className={`hover:text-blue-700 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'safety' ? 'text-blue-700 dark:text-blue-400 font-semibold' : ''}`}
                onClick={() => setCurrentView('safety')}
              >
                {t.nav.safety}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'safety' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              <a
                className={`hover:text-blue-700 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'community' ? 'text-blue-700 dark:text-blue-400 font-semibold' : ''}`}
                onClick={() => setCurrentView('community')}
              >
                {t.nav.community}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'community' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              <a
                className={`hover:text-blue-700 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'competitions' ? 'text-blue-700 dark:text-blue-400 font-semibold' : ''}`}
                onClick={() => setCurrentView('competitions')}
              >
                {t.nav.competitions}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'competitions' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              <a
                className={`hover:text-blue-700 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'emergency' ? 'text-blue-700 dark:text-blue-400 font-semibold' : ''}`}
                onClick={() => setCurrentView('emergency')}
              >
                <span className="text-red-600 hover:text-red-700 dark:hover:text-red-400 font-bold">{t.nav.emergency}</span>
                <span className={`absolute bottom-0 left-0 h-0.5 bg-red-600 transition-all duration-300 ${currentView === 'emergency' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              {['admin', 'safety mitra'].includes(userProfile?.role) && (
                <a
                  className={`hover:text-blue-700 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'admin' ? 'text-blue-700 dark:text-blue-400 font-semibold' : ''}`}
                  onClick={() => setCurrentView('admin')}
                >
                  {userProfile?.role === 'safety mitra' ? t.nav.safetyMitra : t.nav.admin}
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'admin' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </a>
              )}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {['admin', 'safety mitra'].includes(userProfile?.role) && (
                <button
                  onClick={() => setCurrentView('guide')}
                  className={`flex items-center justify-center p-2 rounded-lg transition-all touch-target ${currentView === 'guide' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'}`}
                  title="Volunteer Handbook"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </button>
              )}
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowHistory(!showHistory);
                    if (notificationsHistory.length > 0) {
                      const latestId = notificationsHistory[0].id;
                      setLastSeenNotificationId(latestId);
                      localStorage.setItem('lastSeenNotificationId', latestId);
                    }
                  }}
                  className="flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all touch-target relative"
                  title="Notifications"
                >
                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationsHistory.length > 0 && notificationsHistory[0].id !== lastSeenNotificationId && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showHistory && (
                  <>
                    <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-none" onClick={() => setShowHistory(false)}></div>
                    <div className="fixed inset-x-4 top-20 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 w-auto sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-scale-in sm:origin-top-right">
                      <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
                        <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                          {notificationsHistory.length}
                        </span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {notificationsHistory.length > 0 ? (
                          notificationsHistory.map((notif) => (
                            <div key={notif.id} className="p-4 border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-default">
                              <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${notif.type === 'alert' ? 'bg-red-100 text-red-600' :
                                  notif.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                    notif.type === 'update' ? 'bg-green-100 text-green-600' :
                                      'bg-blue-100 text-blue-600'
                                  }`}>
                                  {notif.type === 'alert' ? '🚨' :
                                    notif.type === 'warning' ? '⚠️' :
                                      notif.type === 'update' ? '✅' : '📢'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{notif.title}</h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                                  <span className="text-[10px] text-slate-400 mt-1 block">
                                    {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {userProfile?.role === 'admin' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm('Delete this notification?')) {
                                        handleDeleteNotification(notif.id);
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                    title="Delete notification"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : notifFetchError ? (
                          <div className="p-8 text-center">
                            <div className="text-2xl mb-2">📡</div>
                            <p className="text-sm text-slate-500 mb-4">
                              {language === 'en' ? 'Failed to load notifications.' : 'নোটিফিকেশন লোড করা সম্ভব হয়নি।'}
                            </p>
                            <button
                              onClick={() => {
                                const retryFetch = async () => {
                                  setNotifFetchError(false);
                                  try {
                                    const { data, error } = await supabase
                                      .from('notifications')
                                      .select('*')
                                      .eq('is_active', true)
                                      .order('created_at', { ascending: false })
                                      .limit(20);
                                    if (error) throw error;
                                    setNotificationsHistory(data || []);
                                  } catch (error) {
                                    setNotifFetchError(true);
                                  }
                                };
                                retryFetch();
                              }}
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              {language === 'en' ? 'Try Again' : 'আবার চেষ্টা করুন'}
                            </button>
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="text-4xl mb-2 opacity-20">🔔</div>
                            <p className="text-sm text-slate-500">No notifications yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

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
                  className="hidden md:inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
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
      {/* Minimal Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-md shadow-blue-600/20">
                SL
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200 text-lg tracking-tight">
                {language === 'en' ? 'SmartLineman' : 'স্মার্ট লাইনম্যান'}
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
              <button onClick={() => setCurrentView('safety')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t.nav.safety}</button>
              <button onClick={() => setCurrentView('community')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t.nav.community}</button>
              <button onClick={() => setCurrentView('competitions')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t.nav.competitions}</button>
              <button onClick={() => setCurrentView('emergency')} className="text-red-500 hover:text-red-600 transition-colors">{t.nav.emergency}</button>
            </div>

            <div className="text-sm text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} SmartLineman.
            </div>
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
      {/* Handbook Modal */}
      {showHandbookModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button
              onClick={() => setShowHandbookModal(false)}
              className="absolute top-4 right-4 z-50 p-2 bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-600 rounded-full shadow-lg transition-all text-slate-600 dark:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <Suspense fallback={
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-500">Loading Handbook...</p>
                </div>
              }>
                <Guide hideHeader={true} />
              </Suspense>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-center">
              <button
                onClick={() => setShowHandbookModal(false)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
              >
                বুঝেছি
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}
