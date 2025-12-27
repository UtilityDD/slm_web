import React, { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./supabaseClient";
import { getBadgeByLevel, calculateLevelFromProgress } from './utils/badgeUtils';
import { cacheHelper } from './utils/cacheHelper';
import LogoutConfirmationModal from "./components/LogoutConfirmationModal";
import { APP_NAME } from "./config";

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
const VerificationView = lazy(() => import("./components/VerificationView"));

export default function SmartLinemanUI() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash.includes('access_token=') || hash.includes('type=recovery')) return 'login';
    if (hash.startsWith('verify/')) return 'verify';
    return hash || 'home';
  });
  const [language, setLanguage] = useState('bn');
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) return savedTheme;
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  });
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
  const [completedLessons, setCompletedLessons] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  // Service Worker Update Listener
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Check for updates periodically
        const checkForUpdate = () => {
          registration.update();
        };
        const interval = setInterval(checkForUpdate, 60 * 60 * 1000); // Check every hour

        // Listen for new worker installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            // Has a new worker been installed and is waiting?
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateInfo({
                version_name: 'Latest', // Generic since we don't have DB version
                update_url: '#'
              });
              setShowUpdateModal(true);
            }
          });
        });

        return () => clearInterval(interval);
      });

      // Also listen for controller change (if skipWaiting happened automatically)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          setUpdateInfo({
            version_name: 'Latest',
            update_url: '#'
          });
          setShowUpdateModal(true);
        }
      });
    }
  }, []);

  // Pull to refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const getChapterBadge = () => {
    const level = calculateLevelFromProgress(completedLessons);
    return getBadgeByLevel(level);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchProfile = async (userToFetch) => {
    const targetUser = userToFetch || user;
    if (targetUser) {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, avatar_url, current_session_id, training_level, full_name, points')
        .eq('id', targetUser.id)
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

  const refreshData = async () => {
    if (!user || isRefreshing) return;

    // Cooldown check: prevent refresh if called within last 3 seconds
    const now = Date.now();
    if (now - lastRefreshTime < 3000) {
      console.log('Refresh cooldown active, skipping...');
      return;
    }

    setIsRefreshing(true);
    setLastRefreshTime(now);

    try {
      await fetchProfile(user);
      // Also refresh notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (notifs) setNotificationsHistory(notifs);

      showNotification(language === 'en' ? 'Updated' : 'আপডেট করা হয়েছে', 'success');
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].pageY);
    }
  };

  const handleTouchMove = (e) => {
    if (window.scrollY === 0 && startY > 0) {
      const currentY = e.touches[0].pageY;
      const diff = currentY - startY;
      if (diff > 0) {
        setPullDistance(Math.min(diff * 0.4, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      refreshData();
    }
    setStartY(0);
    setPullDistance(0);
  };

  useEffect(() => {
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

  // Load completed lessons from localStorage
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`training_progress_${user.id}`);
      if (saved) {
        setCompletedLessons(JSON.parse(saved));
      } else {
        setCompletedLessons([]);
      }
    } else {
      setCompletedLessons([]);
    }
  }, [user]);

  // Listen for storage changes to sync progress across tabs or components
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (user && e.key === `training_progress_${user.id}`) {
        setCompletedLessons(JSON.parse(e.newValue || '[]'));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  // Sync local progress to Supabase if needed
  useEffect(() => {
    if (user && userProfile && completedLessons.length > 0) {
      const localLevel = calculateLevelFromProgress(completedLessons);
      const remoteLevel = userProfile.training_level || 0;

      if (localLevel > remoteLevel) {
        console.log(`Syncing training level: Local (${localLevel}) > Remote (${remoteLevel})`);
        supabase.from('profiles')
          .update({ training_level: localLevel })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error('Error syncing training level:', error);
            else {
              // Update local profile state to reflect change
              setUserProfile(prev => ({ ...prev, training_level: localLevel }));
            }
          });
      }
    }
  }, [user, userProfile, completedLessons]);

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
      } else if (hash.startsWith('verify/')) {
        setCurrentView('verify');
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

  // Check LocalStorage or Time for Theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme');
    let currentTheme = theme;

    if (savedTheme) {
      currentTheme = savedTheme;
    } else {
      const hour = new Date().getHours();
      currentTheme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
    }

    setTheme(currentTheme);
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
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

      setCurrentView('home');
    } catch (error) {
      showNotification(error.message, 'error');
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
        training: "90 Days Training",
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
        training: "৯০ দিনের প্রশিক্ষণ",
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

  // Loading component for Suspense fallback with smooth transitions
  const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative z-0 pb-16 animate-fade-in">
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
            setUser(u);
            showNotification(language === 'en' ? 'Welcome back!' : 'আপনাকে স্বাগতম!');
            setCurrentView('home');
          }}
          showNotification={showNotification}
        />;
      }

      switch (currentView) {
        case 'competitions':
          return <Competitions language={language} user={user} setCurrentView={setCurrentView} />;
        case 'community':
          return <Community language={language} user={user} setCurrentView={setCurrentView} />;
        case 'emergency':
          return <Emergency language={language} user={user} setCurrentView={setCurrentView} />;
        case 'safety':
          return <SafetyHub
            language={language}
            user={user}
            userProfile={userProfile}
            setCurrentView={setCurrentView}
            onProgressUpdate={(updated) => setCompletedLessons(updated)}
          />;
        case 'training':
          return <SafetyHub
            language={language}
            user={user}
            userProfile={userProfile}
            setCurrentView={setCurrentView}
            onProgressUpdate={(updated) => setCompletedLessons(updated)}
            mode="training"
          />;
        case 'admin':
          return <Admin language={language} user={user} userProfile={userProfile} setCurrentView={setCurrentView} />;
        case 'admin-services':
          return <AdminServices language={language} />;
        case 'guide':
          return <Guide />;
        case 'verify': {
          const certId = window.location.hash.split('/').pop();
          return <VerificationView language={language} certificateId={certId} />;
        }
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

  if (appLoading) return <PageLoader />;

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans ${language === 'bn' ? 'font-bengali' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showLogoutModal && (
        <LogoutConfirmationModal
          onConfirm={() => confirmLogout(false)}
          onCancel={cancelLogout}
          language={language}
          loading={isLoggingOut}
        />
      )}

      {/* Forced Update Modal */}
      {showUpdateModal && updateInfo && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200 dark:border-slate-700">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🚀</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {language === 'en' ? 'Update Available' : 'নতুন সংস্করণ উপলব্ধ'}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {language === 'en'
                ? `A new version is available. Please refresh to apply the latest updates.`
                : `একটি নতুন সংস্করণ এসেছে। সর্বশেষ আপডেটগুলি পেতে দয়া করে রিফ্রেশ করুন।`
              }
            </p>
            <button
              onClick={() => {
                // Clear service worker cache to ensure new version is fetched
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (let registration of registrations) {
                      registration.unregister();
                    }
                    window.localStorage.clear(); // Optional: Clear local storage if needed, but might be too aggressive if user data is there. Kept it safe by ONLY unregistering SW.
                    window.location.reload(true);
                  });
                } else {
                  window.location.reload(true);
                }
              }}
              className="block w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-blue-600/20"
            >
              {language === 'en' ? 'Refresh Now' : 'এখনই রিফ্রেশ করুন'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Refresh Indicator */}
      <div
        className={`refresh-indicator ${isRefreshing || pullDistance > 20 ? 'visible' : ''}`}
        style={{
          transform: isRefreshing ? 'translateY(0)' : `translateY(${Math.min(pullDistance - 60, 0)}px)`,
          opacity: Math.min(pullDistance / 60, 1)
        }}
      >
        <div className="refresh-indicator-content">
          {isRefreshing ? (
            <div className="refresh-spinner"></div>
          ) : (
            <div className="text-blue-600">
              <svg className={`w-5 h-5 transition-transform duration-200 ${pullDistance > 60 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          )}
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">
            {isRefreshing ? (language === 'en' ? 'Updating...' : 'আপডেট হচ্ছে...') : (language === 'en' ? 'Pull to Refresh' : 'রিফ্রেশ করতে টানুন')}
          </span>
        </div>
      </div>

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
                className={`hover:text-blue-700 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'training' ? 'text-blue-700 dark:text-blue-400 font-semibold' : ''}`}
                onClick={() => setCurrentView('training')}
              >
                {t.nav.training}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'training' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentView('guide')}
                    className={`flex items-center justify-center p-2 rounded-lg transition-all touch-target ${currentView === 'guide' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'}`}
                    title="Volunteer Handbook"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentView('admin')}
                    className={`flex items-center justify-center p-2 rounded-lg transition-all touch-target ${currentView === 'admin' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'}`}
                    title={userProfile?.role === 'safety mitra' ? t.nav.safetyMitra : t.nav.admin}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </button>
                </div>
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
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowHistory(false)}
                    ></div>
                    <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 w-auto sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-slide-down">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">
                          {language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি'}
                        </h3>
                        {notificationsHistory.length > 0 && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                            {notificationsHistory.length}
                          </span>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifFetchError ? (
                          <div className="p-8 text-center">
                            <span className="text-2xl mb-2 block">📡</span>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {language === 'en' ? 'Failed to load notifications' : 'বিজ্ঞপ্তি লোড করতে ব্যর্থ হয়েছে'}
                            </p>
                          </div>
                        ) : notificationsHistory.length > 0 ? (
                          <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {notificationsHistory.map((notif) => (
                              <div key={notif.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group relative">
                                <div className="flex gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${notif.type === 'alert' ? 'bg-red-100 text-red-600' :
                                    notif.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                      notif.type === 'update' ? 'bg-green-100 text-green-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                    {notif.type === 'alert' ? '🚨' :
                                      notif.type === 'warning' ? '⚠️' :
                                        notif.type === 'update' ? '✅' : '📢'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">{notif.title}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{notif.message}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {new Date(notif.created_at).toLocaleDateString(language === 'bn' ? 'bn-IN' : 'en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                {userProfile?.role === 'admin' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notif.id);
                                    }}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                                    title="Delete notification"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                              </svg>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                              {language === 'en' ? 'No notifications yet' : 'এখনও কোনো বিজ্ঞপ্তি নেই'}
                            </p>
                          </div>
                        )}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
                          <button
                            onClick={() => setShowHistory(false)}
                            className="w-full py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                          >
                            {language === 'en' ? 'Close' : 'বন্ধ করুন'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Language Toggle */}
              <button
                onClick={() => setShowLanguageModal(true)}
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all touch-target"
                title="Change Language"
              >
                <span className="text-lg sm:text-xl">🌐</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={handleThemeToggle}
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all touch-target"
                title="Toggle Theme"
              >
                <span className="text-lg sm:text-xl">{theme === 'light' ? '🌙' : '☀️'}</span>
              </button>

              {/* User Profile / Login */}
              {user ? (
                <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {userProfile?.full_name || user.email.split('@')[0]}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {userProfile?.role || 'Lineman'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-all touch-target"
                    title="Logout"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCurrentView('login')}
                  className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-lg transition-all shadow-md shadow-blue-500/20 touch-target"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{t.nav.login}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10">
        {renderContent()}
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden bottom-nav flex items-center justify-around px-2">
        <div
          className={`bottom-nav-item ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => setCurrentView('home')}
        >
          <span className="text-xl mb-0.5">🏠</span>
          <span className="text-[10px] uppercase tracking-tighter font-bold">
            {language === 'en' ? 'Home' : 'হোম'}
          </span>
        </div>
        <div
          className={`bottom-nav-item ${currentView === 'safety' ? 'active' : ''}`}
          onClick={() => setCurrentView('safety')}
        >
          <span className="text-xl mb-0.5">🦺</span>
          <span className="text-[10px] uppercase tracking-tighter font-bold">
            {language === 'en' ? 'Safety' : 'সুরক্ষা'}
          </span>
        </div>
        <div
          className={`bottom-nav-item ${currentView === 'community' ? 'active' : ''}`}
          onClick={() => setCurrentView('community')}
        >
          <span className="text-xl mb-0.5">💬</span>
          <span className="text-[10px] uppercase tracking-tighter font-bold">
            {language === 'en' ? 'Chat' : 'চ্যাট'}
          </span>
        </div>
        <div
          className={`bottom-nav-item ${currentView === 'competitions' ? 'active' : ''}`}
          onClick={() => setCurrentView('competitions')}
        >
          <span className="text-xl mb-0.5">🏆</span>
          <span className="text-[10px] uppercase tracking-tighter font-bold">
            {language === 'en' ? 'Win' : 'জিতুন'}
          </span>
        </div>
        <div
          className={`bottom-nav-item ${currentView === 'emergency' ? 'active' : ''}`}
          onClick={() => setCurrentView('emergency')}
        >
          <span className="text-xl mb-0.5">🚨</span>
          <span className="text-[10px] uppercase tracking-tighter font-bold text-red-600">
            {language === 'en' ? 'SOS' : 'জরুরি'}
          </span>
        </div>
      </nav>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in">
            <div className="p-6 text-center border-b border-slate-100 dark:border-slate-700">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🌐
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Choose Language
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                ভাষা নির্বাচন করুন
              </p>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              <button
                onClick={() => handleLanguageSelect('en')}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${language === 'en' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-blue-200'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇺🇸</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">English</span>
                </div>
                {language === 'en' && <span className="text-blue-600">✓</span>}
              </button>
              <button
                onClick={() => handleLanguageSelect('bn')}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${language === 'bn' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-blue-200'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇮🇳</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">বাংলা (Bengali)</span>
                </div>
                {language === 'bn' && <span className="text-blue-600">✓</span>}
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setShowLanguageModal(false)}
                className="w-full py-3 font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Cancel / বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
