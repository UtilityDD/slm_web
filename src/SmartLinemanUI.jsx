import React, { useState, useEffect, lazy, Suspense } from "react";
import { SplashScreen } from '@capacitor/splash-screen';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { supabase } from "./supabaseClient";
import { getBadgeByLevel, calculateLevelFromProgress } from './utils/badgeUtils';
import { cacheHelper } from './utils/cacheHelper';
import { storageUtils } from './utils/storageUtils';
import { requestManager } from './utils/requestManager';
import LogoutConfirmationModal from "./components/LogoutConfirmationModal";
import Sidebar from "./components/Sidebar";
import NetworkStatusListener from "./components/NetworkStatusListener";
import { APP_NAME, CURRENT_APP_VERSION } from "./config";

// Lazy load heavy components for code splitting
const Competitions = lazy(() => import("./components/Competitions"));
const Community = lazy(() => import("./components/Community"));
const Emergency = lazy(() => import("./components/Emergency"));
const SOPs = lazy(() => import("./components/safety/SOPs"));
const MyPPE = lazy(() => import("./components/safety/MyPPE"));
const MyTools = lazy(() => import("./components/safety/MyTools"));
const Training = lazy(() => import("./components/safety/Training"));
const Login = lazy(() => import("./components/Login"));
const Admin = lazy(() => import("./components/Admin"));
const AdminServices = lazy(() => import("./components/AdminServices"));
const Home = lazy(() => import("./components/Home"));
const Guide = lazy(() => import("./components/Guide"));
const VerificationView = lazy(() => import("./components/VerificationView"));
const Notifications = lazy(() => import("./components/Notifications"));
const AwarenessStories = lazy(() => import("./components/safety/AwarenessStories"));
const VideoGuide = lazy(() => import("./components/safety/VideoGuide"));

export default function SmartLinemanUI() {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash.includes('access_token=') || hash.includes('type=recovery')) return 'login';
    if (hash.startsWith('verify/')) return 'verify';
    return hash || 'home';
  });
  const [language, setLanguage] = useState('bn');
  const [theme, setTheme] = useState(() => {
    // Check if user has explicit preference, otherwise default to dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return 'dark'; // CHANGED: Default theme is now dark
  });
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pushNotification, setPushNotification] = useState(null);
  const [notificationsHistory, setNotificationsHistory] = useState([]);
  const [notifFetchError, setNotifFetchError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastSeenNotificationId, setLastSeenNotificationId] = useState(() => storageUtils.getItem('lastSeenNotificationId'));
  const [showHandbookModal, setShowHandbookModal] = useState(false);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isForceUpdate, setIsForceUpdate] = useState(false);

  // Version Comparison Helper
  const isVersionOlder = (current, min) => {
    if (!current || !min) return false;
    const v1 = current.split('.').map(Number);
    const v2 = min.split('.').map(Number);
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      if (num1 < num2) return true;
      if (num1 > num2) return false;
    }
    return false;
  };

  // Check for App Updates (Native & PWA)
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // 1. Native Force Update Check (Capacitor)
        if (window.Capacitor) {
          const { data, error } = await supabase
            .from('app_versions')
            .select('version_name, update_url, force_update')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (data) {
            const { version_name: latest_version, update_url, force_update } = data;
            if (isVersionOlder(CURRENT_APP_VERSION, latest_version)) {
              console.log(`Force update required: ${CURRENT_APP_VERSION} < ${latest_version}`);
              setUpdateInfo({ version_name: latest_version, update_url });
              setIsForceUpdate(force_update);
              setShowUpdateModal(true);
              return; // Priority: Force update blocks PWA check
            }
          }
        }

        // 2. Service Worker Update Listener (PWA)
        if ('serviceWorker' in navigator && !window.Capacitor) {
          const registration = await navigator.serviceWorker.ready;

          // Check for updates periodically
          const interval = setInterval(() => registration.update(), 60 * 60 * 1000);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateInfo({ version_name: 'Latest', update_url: '#' });
                setIsForceUpdate(false);
                setShowUpdateModal(true);
              }
            });
          });

          return () => clearInterval(interval);
        }
      } catch (err) {
        console.error('Update check error:', err);
      }
    };

    checkForUpdates();
  }, []);

  useEffect(() => {
    // Hide native splash screen when app is ready
    if (window.Capacitor) {
      setTimeout(() => {
        SplashScreen.hide({
          fadeOutDuration: 500
        });
      }, 500); // Give React 500ms to settle
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
    if (!targetUser) return;

    try {
      const profileData = await requestManager.fetch(
        `profile_${targetUser.id}`,
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('role, avatar_url, current_session_id, training_level, full_name, points, reading_points, quiz_points, completed_lessons, total_penalties, slm_id')
            .eq('id', targetUser.id)
            .single();

          if (error) throw error;
          return data;
        },
        { ttl: 10, swr: true, forceRefresh: false }
      );

      if (profileData) {
        // Check for session mismatch
        const localSessionId = storageUtils.getItem('slm_session_id');
        if (profileData.current_session_id && localSessionId && profileData.current_session_id !== localSessionId) {
          console.warn('Session mismatch detected. Logging out.');
          confirmLogout(true);
          return;
        }
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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
      // Also refresh notifications using the optimized fetcher
      await fetchNotifications(true);

      showNotification(language === 'en' ? 'Updated' : 'আপডেট করা হয়েছে', 'success');
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleTouchStart = (e) => {
    // Check if any scrollable parent is already scrolled down
    let isAtTop = true;
    let element = e.target;
    while (element && element !== document.body) {
      if (element.scrollTop > 0) {
        isAtTop = false;
        break;
      }
      element = element.parentElement;
    }

    if (isAtTop) {
      setStartY(e.touches[0].pageY);
    } else {
      setStartY(0);
    }
  };

  const handleTouchMove = (e) => {
    if (startY > 0) {
      const currentY = e.touches[0].pageY;
      const diff = currentY - startY;

      // Only handle pull-down if we're moving downwards
      if (diff > 0) {
        // Double check we are still at the top (targets can change during move)
        let isAtTop = true;
        let element = e.target;
        while (element && element !== document.body) {
          if (element.scrollTop > 0) {
            isAtTop = false;
            break;
          }
          element = element.parentElement;
        }

        if (isAtTop) {
          setPullDistance(Math.min(diff * 0.4, 80));
        } else {
          setPullDistance(0);
          setStartY(0);
        }
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
    // Check active session with fail-safe timeout
    const initSession = async () => {
      // Force app loading to false after 3s max (fail-safe)
      const timeoutId = setTimeout(() => {
        console.warn('Session check timed out, forcing app load');
        setAppLoading(false);
      }, 3000);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setUser(session?.user ?? null);

        if (session?.user) {
          // Verify profile but don't block indefinitely
          await fetchProfile(session.user).catch(console.error);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        clearTimeout(timeoutId);
        setAppLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('update-password');
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

  // Optimized Notifications Fetcher
  const fetchNotifications = async (forceRefresh = false) => {
    setNotifFetchError(false);
    try {
      const data = await requestManager.fetch(
        'notifications_list',
        async () => {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(20);

          if (error) throw error;
          return data || [];
        },
        { ttl: 2, forceRefresh, swr: true }
      );

      if (data) setNotificationsHistory(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifFetchError(true);
    }
  };

  // Fetch Notifications History on mount
  useEffect(() => {
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

    // Listen for session changes (Single Device Login)
    const sessionChannel = supabase
      .channel('public:profiles')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: user ? `id=eq.${user.id}` : undefined
      }, (payload) => {
        const remoteSessionId = payload.new.current_session_id;
        const localSessionId = storageUtils.getItem('slm_session_id');

        if (remoteSessionId && localSessionId && remoteSessionId !== localSessionId) {
          console.warn('Real-time session mismatch detected. Logging out.');
          confirmLogout(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sessionChannel);
    };
  }, [user]);

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
      const hash = window.location.hash.replace('#/', '').split('?')[0];
      setCurrentView(prevView => {
        if (hash.includes('access_token=') || hash.includes('type=recovery')) {
          return 'login';
        }
        if (hash.startsWith('verify/')) {
          return 'verify';
        }
        if (hash && hash !== prevView) {
          return hash;
        }
        if (!hash && prevView !== 'home') {
          return 'home';
        }
        return prevView;
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Add a listener to re-check auth when the app becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('App became visible, re-checking session...');

        try {
          const { data: { session }, error } = await supabase.auth.getSession();

          // Only update user state if we have a definitive answer
          if (session?.user) {
            // Session is valid - update user and profile
            setUser(session.user);
            await fetchProfile(session.user);
          }
          // IMPORTANT: Don't clear user state if session is null!
          // The session might be temporarily unavailable during rehydration.
          // Let the auth state listener handle actual logouts.
        } catch (err) {
          console.error('Error checking session on visibility change:', err);
          // Don't logout on errors - session might just be temporarily unavailable
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Check LocalStorage for Language on mount
  useEffect(() => {
    const savedLang = storageUtils.getItem('appLanguage');
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  // Dynamic StatusBar Management for Android
  useEffect(() => {
    const updateStatusBar = async () => {
      if (!window.Capacitor) return;

      try {
        if (theme === 'dark') {
          // Dark background needs light icons
          await StatusBar.setStyle({ style: Style.Dark });
        } else {
          // In Light Mode:
          // Home screen (orange) needs light icons
          // Other screens (white) need dark icons
          if (currentView === 'home') {
            await StatusBar.setStyle({ style: Style.Dark });
          } else {
            await StatusBar.setStyle({ style: Style.Light });
          }
        }
      } catch (err) {
        console.warn('StatusBar update failed:', err);
      }
    };

    updateStatusBar();
  }, [currentView, theme]);

  // Check LocalStorage or Time for Theme on mount
  useEffect(() => {
    const savedTheme = storageUtils.getItem('appTheme');
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
    storageUtils.setItem('appLanguage', lang);
    setShowLanguageModal(false);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    storageUtils.setItem('appTheme', newTheme);
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
      storageUtils.removeItem('slm_session_id');
      cacheHelper.clearAll();
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
        safety: "Safety",
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
        safety: "সেফটি",
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative z-0 pb-16 animate-slide-up-fade">
      <div className="text-center">
        <div className="flex gap-2 justify-center mb-6">
          <div className="w-4 h-4 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-4 h-4 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-4 h-4 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 animate-pulse">
          {language === 'en' ? 'Loading...' : 'লোড হচ্ছে...'}
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    // Define which views are accessible without login
    const publicViews = ['login', 'update-password', 'verify', 'accident-stories'];
    const isPublic = publicViews.includes(currentView);

    // If not logged in and trying to access a private view, force login
    if (!user && !isPublic) {
      return (
        <Suspense fallback={<PageLoader />}>
          <div className="flex-1 flex flex-col min-h-0 w-full animate-slide-up-fade">
            <Login
              onLogin={(u) => {
                setUser(u);
                fetchProfile(u);
                showNotification(language === 'en' ? 'Welcome!' : 'আপনাকে স্বাগতম!');
              }}
              showNotification={showNotification}
              setCurrentView={setCurrentView}
            />
          </div>
        </Suspense>
      );
    }

    const content = (() => {
      if (currentView === 'login' || (currentView === 'update-password' && !user)) {
        return <Login
          initialView={currentView === 'update-password' ? 'update' : 'login'}
          onLogin={(u) => {
            setUser(u);
            fetchProfile(u);
            showNotification(language === 'en' ? 'Welcome back!' : 'আপনাকে স্বাগতম!');
            setCurrentView('home');
          }}
          showNotification={showNotification}
          setCurrentView={setCurrentView}
        />;
      }

      switch (currentView) {
        case 'competitions':
          return <Competitions
            language={language}
            user={user}
            setCurrentView={setCurrentView}
            userProfile={userProfile}
            refreshProfile={fetchProfile}
          />;
        case 'leaderboard':
          return <Competitions
            language={language}
            user={user}
            userProfile={userProfile}
            setCurrentView={setCurrentView}
            isFullLeaderboard={true}
            refreshProfile={fetchProfile}
          />;
        case 'community':
          return <Community language={language} user={user} setCurrentView={setCurrentView} />;
        case 'emergency':
          return <Emergency language={language} user={user} setCurrentView={setCurrentView} />;
        case 'sops':
          return <SOPs
            language={language}
            user={user}
            setCurrentView={setCurrentView}
          />;
        case 'my_ppe':
          return <MyPPE
            language={language}
            user={user}
            userProfile={userProfile}
          />;
        case 'my_tools':
          return <MyTools
            language={language}
            user={user}
            userProfile={userProfile}
          />;
        case 'training':
          return <Training
            language={language}
            user={user}
            onProgressUpdate={(newProgress) => {
              setCompletedLessons(newProgress);
              // Optimistic update for immediate feedback
              setUserProfile(prev => prev ? {
                ...prev,
                completed_lessons: newProgress,
                training_level: calculateLevelFromProgress(newProgress)
              } : null);
              fetchProfile(user);
            }}
            setCurrentView={setCurrentView}
          />;
        case 'admin':
          return <Admin language={language} user={user} userProfile={userProfile} setCurrentView={setCurrentView} />;
        case 'admin-services':
          return <AdminServices language={language} userProfile={userProfile} />;
        case 'guide':
          return <Guide userRole={userProfile?.role} />;
        case 'verify': {
          const certId = window.location.hash.split('/').pop();
          return <VerificationView language={language} certificateId={certId} />;
        }
        case 'notifications':
          return <Notifications
            language={language}
            notifications={notificationsHistory}
            setCurrentView={setCurrentView}
          />;
        case 'accident-stories':
          return <AwarenessStories
            setCurrentView={setCurrentView}
            language={language}
          />;
        case 'video-guide':
          return <VideoGuide
            language={language}
            setCurrentView={setCurrentView}
          />;
        case 'home':
        default:
          return <Home
            setCurrentView={setCurrentView}
            language={language}
            t={t}
            user={user}
            userProfile={userProfile}
            refreshProfile={fetchProfile}
          />;
      }
    })();

    // Wrap in Suspense for code splitting with smooth transition
    return (
      <Suspense fallback={<PageLoader />}>
        <div key={currentView} className="h-full w-full view-transition">
          {content}
        </div>
      </Suspense>
    );
  };

  if (appLoading) return <PageLoader />;

  return (
    <div
      className={`h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans flex flex-col md:flex-row ${language === 'bn' ? 'font-bengali' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sidebar Navigation */}
      {user && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentView={currentView}
          setCurrentView={setCurrentView}
          userProfile={userProfile}
          language={language}
          t={translations[language]}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onToggleLanguageModal={() => setShowLanguageModal(true)}
          onToggleNotifications={() => setCurrentView('notifications')}
        />
      )}

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200 dark:border-slate-700 relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 blur-[100px] rounded-full"></div>

              <div className="relative">
                <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl animate-bounce-slow">🚀</span>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {language === 'en' ? 'Update Available' : 'নতুন সংস্করণ উপলব্ধ'}
                </h2>

                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  {isForceUpdate
                    ? (language === 'en'
                      ? `A critical update (v${updateInfo.version_name}) is required to continue using the app.`
                      : `পরবর্তী ধাপের জন্য একটি গুরুত্বপূর্ণ আপডেট (v${updateInfo.version_name}) প্রয়োজন।`)
                    : (language === 'en'
                      ? `A new version is available. Please refresh to apply the latest updates.`
                      : `একটি নতুন সংস্করণ এসেছে। সর্বশেষ আপডেটগুলি পেতে দয়া করে রিফ্রেশ করুন।`)
                  }
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (isForceUpdate && updateInfo.update_url && updateInfo.update_url !== '#') {
                        Browser.open({ url: updateInfo.update_url });
                      } else {
                        // SW Refresh logic
                        if ('serviceWorker' in navigator) {
                          navigator.serviceWorker.getRegistrations().then((registrations) => {
                            for (let registration of registrations) {
                              registration.unregister();
                            }
                            window.location.reload(true);
                          });
                        } else {
                          window.location.reload(true);
                        }
                      }
                    }}
                    className="block w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-orange-600/20"
                  >
                    {isForceUpdate
                      ? (language === 'en' ? 'Update Now' : 'এখনই আপডেট করুন')
                      : (language === 'en' ? 'Refresh Now' : 'এখনই রিফ্রেশ করুন')
                    }
                  </button>

                  {!isForceUpdate && (
                    <button
                      onClick={() => setShowUpdateModal(false)}
                      className="block w-full py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      {language === 'en' ? 'Later' : 'পরে'}
                    </button>
                  )}
                </div>
              </div>
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
              <div className="text-orange-600">
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
              <div className="w-16 h-16 border-4 border-orange-100 dark:border-slate-700 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 font-bold text-slate-600 dark:text-slate-300 animate-pulse">
              {language === 'en' ? 'Please wait...' : 'দয়া করে অপেক্ষা করুন...'}
            </p>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-4 animate-toast-in pointer-events-none">
            <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl border pointer-events-auto ${notification.type === 'success'
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
                  'bg-orange-50 border-orange-500 dark:bg-orange-900/20'
              }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${pushNotification.type === 'alert' ? 'bg-red-100 text-red-600' :
                pushNotification.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                  pushNotification.type === 'update' ? 'bg-green-100 text-green-600' :
                    'bg-orange-100 text-orange-600'
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
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-orange-100/40 dark:bg-orange-900/20 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
          <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-cyan-100/40 dark:bg-cyan-900/20 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4"></div>
        </div>

        {/* Header - Material Design - Hidden on Login & Stories or when forced login */}
        {((user && !['login', 'accident-stories'].includes(currentView)) || currentView === 'verify') && (
          <header className={`${currentView === 'home' ? 'bg-[#ea580c] dark:bg-[#c2410c] border-transparent shadow-none' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 elevation-2'} sticky top-0 z-[80] border-b safe-area-inset-top transition-all duration-300`}>
            <div className="max-w-7xl mx-auto mobile-container">
              <div className="flex justify-between items-center h-14 md:h-16">
                {/* Mobile Menu & Logo */}
                <div className="flex items-center gap-2 relative z-[110]">
                  {user && (
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className={`md:hidden p-2 ${currentView === 'home' ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'} rounded-lg transition-colors`}
                      title="Menu"
                      aria-label="Toggle menu"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  )}
                  <div
                    className="flex items-center gap-2 group cursor-pointer px-2 py-1 -ml-1 transition-all active:scale-95"
                    onClick={() => setCurrentView('home')}
                  >
                    <div className={`text-xl sm:text-2xl logo-text ${currentView === 'home' ? 'logo-text-home' : 'logo-text-default'}`}>
                      SmartLineMan
                    </div>
                  </div>
                </div>

                <div className="flex-grow"></div>

                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Theme Toggle */}
                  <button
                    onClick={handleThemeToggle}
                    className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 ${currentView === 'home' ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'} rounded-lg transition-all touch-target`}
                    title="Toggle Theme"
                  >
                    <span className="text-lg sm:text-xl">{theme === 'light' ? '🌙' : '☀️'}</span>
                  </button>

                  {/* Profile / Login */}
                  {user ? (
                    <div className="flex items-center gap-2 pl-1 sm:pl-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center font-bold gap-2 pl-1 pr-3 sm:pr-4 py-1 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all touch-target border border-slate-200 dark:border-slate-600 shadow-sm"
                        title="Logout"
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 overflow-hidden shadow-sm">
                          {userProfile?.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <span className={`text-xs md:text-sm font-bold truncate max-w-[90px] md:max-w-xs ${currentView === 'home' ? 'text-white md:text-slate-800 md:dark:text-slate-200' : 'text-slate-800 dark:text-slate-200'}`}>
                          {(userProfile?.full_name && !userProfile.full_name.includes('@')) ? userProfile.full_name.split(' ')[0] : 'Guest'}
                        </span>
                        <svg className="w-4 h-4 ml-1 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCurrentView('login')}
                      className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all shadow-md shadow-orange-500/20 touch-target"
                      title={t.nav.login}
                      aria-label="Login"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="h-full relative z-10 w-full view-transition" key={currentView}>
            {renderContent()}
          </div>
        </div>


        {/* Network Status Listener */}
        <NetworkStatusListener language={language} />

        {/* Language Selection Modal */}
        {
          showLanguageModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in">
                <div className="p-6 text-center border-b border-slate-100 dark:border-slate-700">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
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
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${language === 'en' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-orange-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🇺🇸</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">English</span>
                    </div>
                    {language === 'en' && <span className="text-orange-600">✓</span>}
                  </button>
                  <button
                    onClick={() => handleLanguageSelect('bn')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${language === 'bn' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-orange-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🇮🇳</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">বাংলা (Bengali)</span>
                    </div>
                    {language === 'bn' && <span className="text-orange-600">✓</span>}
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
          )
        }
      </div >
    </div >
  );
}
