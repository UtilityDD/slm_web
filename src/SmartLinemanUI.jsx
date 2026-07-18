import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { SplashScreen } from '@capacitor/splash-screen';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { supabase } from "./supabaseClient";
import { getBadgeByLevel, calculateLevelFromProgress } from './utils/badgeUtils';
import { filterCoreCompletedLessonIds } from './utils/trainingLessonIds';
import { cacheHelper } from './utils/cacheHelper';
import { storageUtils } from './utils/storageUtils';
import { requestManager } from './utils/requestManager';
import LogoutConfirmationModal from "./components/LogoutConfirmationModal";
import Sidebar from "./components/Sidebar";
import NetworkStatusListener from "./components/NetworkStatusListener";
import WeatherAlertBanner from "./components/WeatherAlertBanner";
import { useWeatherAlert } from "./hooks/useWeatherAlert";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import { UserIcon } from "./components/icons";
import { APP_NAME, CURRENT_APP_VERSION, WEBSITE_URL, SUPPORT_EMAIL } from "./config";
import { preloadSafetyLibraryAssets } from "./utils/assetPreloader";
import { leaderboardService } from "./utils/leaderboardService";
import { invalidateLeaderboardCaches } from "./utils/leaderboardCacheKeys";
import BottomNavigation from "./components/BottomNavigation";
import RadioMiniPlayer from "./components/RadioMiniPlayer";
import RadioDesktopLaunch from "./components/RadioDesktopLaunch";
import { LifeSkillRadioProvider, RadioScrollPaddingBridge, RadioSafetyGuard } from "./context/LifeSkillRadioContext";
import IdleStoryReminder from "./components/IdleStoryReminder";
import SponsorAdOverlay from "./components/SponsorAdOverlay";
import ProfileFieldNudge from "./components/ProfileFieldNudge";
import { libraryService } from "./utils/libraryService";
import { trackAppVisit } from "./utils/landingVisitService";
import PageLoader from "./components/loaders/PageLoader";
import GuestPreviewBanner from "./components/GuestPreviewBanner";
import { isGuestUser, sanitizeGuestProfileForDisplay } from "./utils/guestPreview";

// Lazy load heavy components for code splitting
const Competitions = lazy(() => import("./components/Competitions"));
const Community = lazy(() => import("./components/Community"));
const Emergency = lazy(() => import("./components/Emergency"));
const SOPs = lazy(() => import("./components/safety/SOPs"));
const MyTools = lazy(() => import("./components/safety/MyTools"));
const Training = lazy(() => import("./components/safety/Training"));
const Login = lazy(() => import("./components/Login"));
const Landing = lazy(() => import("./components/Landing"));
const Admin = lazy(() => import("./components/Admin"));
const VisualQuizPreview = lazy(() => import("./components/VisualQuizPreview"));
const AdminServices = lazy(() => import("./components/AdminServices"));
const Home = lazy(() => import("./components/Home"));
const Guide = lazy(() => import("./components/Guide"));
const VerificationView = lazy(() => import("./components/VerificationView"));
const Notifications = lazy(() => import("./components/Notifications"));
const MyProgress = lazy(() => import("./components/MyProgress"));
const AwarenessStories = lazy(() => import("./components/safety/AwarenessStories"));
const VideoGuide = lazy(() => import("./components/safety/VideoGuide"));
const AroJanun = lazy(() => import("./components/safety/AroJanun"));
const SafetyTabsPage = lazy(() => import("./components/safety/SafetyTabsPage"));
const WeatherAlertDemo = lazy(() => import("./components/WeatherAlertDemo"));
const MorePage = lazy(() => import("./components/MorePage"));
// const SafetyHero = lazy(() => import("./components/safety/SafetyHero"));

// Smooth transition pre-loader
const preloadComponent = (factory) => {
  const component = factory();
  return component;
};

export default function SmartLinemanUI() {
  // Background Data Pre-fetching
  useEffect(() => {
    // Fetch safety library in background to warm up cache
    libraryService.fetchLibrary().catch(err => console.warn('Background library pre-fetch failed:', err));
  }, []);

  // Count every app open once per browser session (guest + logged in)
  useEffect(() => {
    trackAppVisit().catch(() => {});
  }, []);

  const [globalLoading, setGlobalLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isSathiExpanded, setIsSathiExpanded] = useState(true);

  // Handle initial routing - convert clean URLs to hash URLs for consistency
  const getInitialView = () => {
    const hash = window.location.hash.replace('#/', '').split('?')[0];
    const pathname = window.location.pathname.replace(/^\/+/, '').split('?')[0];

    // Handle auth redirects
    if (hash.includes('access_token=') || hash.includes('type=recovery') ||
        pathname.includes('access_token=') || pathname.includes('type=recovery')) {
      return 'login';
    }

    // Handle verify routes from both hash and pathname
    if (hash.startsWith('verify/') || pathname.startsWith('verify/')) {
      // If it's a clean URL, convert it to hash URL for consistency
      if (pathname.startsWith('verify/') && !window.location.hash) {
        const certId = pathname.split('verify/')[1];
        window.location.hash = `/verify/${certId}`;
      }
      return 'verify';
    }

    // Return hash-based route or default to public landing
    return hash || 'landing';
  };

  const [currentView, setCurrentView] = useState(getInitialView);

  const [language, setLanguage] = useState(() => storageUtils.getItem('appLanguage') || 'bn');
  const [theme, setTheme] = useState(() => {
    // Default to dark unless user has an explicit preference
    return storageUtils.getItem('appTheme') || 'dark';
  });
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSessionEndedModal, setShowSessionEndedModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pushNotification, setPushNotification] = useState(null);
  const [notificationsHistory, setNotificationsHistory] = useState([]);
  const [notifFetchError, setNotifFetchError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showActiveBroadcastModal, setShowActiveBroadcastModal] = useState(false);
  const [activeBroadcastNotice, setActiveBroadcastNotice] = useState(null);
  const activeBroadcastShownOnceRef = useRef(false);
  const notificationHideTimerRef = useRef(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [selectedProgressUserId, setSelectedProgressUserId] = useState(null);
  const [awarenessOpenStoryId, setAwarenessOpenStoryId] = useState(null);
  const [forumActivityToast, setForumActivityToast] = useState(null);
  const [forumPendingQuestionId, setForumPendingQuestionId] = useState(null);
  const [profileNudgeOpen, setProfileNudgeOpen] = useState(false);
  const [profileNudgePreview, setProfileNudgePreview] = useState(null);
  const [idleStoryPreview, setIdleStoryPreview] = useState(null);
  const [sponsorAdPreview, setSponsorAdPreview] = useState(null);
  const [sponsorAdOpen, setSponsorAdOpen] = useState(false);
  const forumActivityTimerRef = useRef(null);

  const weatherDistrict = userProfile?.district || null;
  const { alert: weatherAlert, visible: weatherVisible, isReminder: weatherIsReminder, dismiss: dismissWeather, refresh: refreshWeather, loading: weatherLoading } =
    useWeatherAlert(user ? weatherDistrict : null);
  const showWeatherBanner =
    user &&
    weatherDistrict &&
    !['login', 'verify', 'landing', 'update-password'].includes(currentView);

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

  const [isRetiring, setIsRetiring] = useState(false); // To force PWA transition

  const BUILD_VERSION_KEY = 'slm_build_version';

  const applyAppRefresh = () => {
    try {
      localStorage.setItem(BUILD_VERSION_KEY, CURRENT_APP_VERSION);
    } catch {
      /* storage unavailable */
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  // Check for App Updates (Native & PWA)
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // 1. Force PWA Transition for APK users
        // Only retire if we are DEFINITELY inside a native shell (android/ios)
        const isNative = window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web';
        
        if (isNative) {
          setIsRetiring(true);
          return;
        }

        // 2. Web build version — when CURRENT_APP_VERSION bumps, stale clients must refresh
        try {
          const seenBuild = localStorage.getItem(BUILD_VERSION_KEY);
          if (seenBuild && seenBuild !== CURRENT_APP_VERSION) {
            setUpdateInfo({ version_name: CURRENT_APP_VERSION, update_url: '#' });
            setIsForceUpdate(true);
            setShowUpdateModal(true);
          } else if (!seenBuild) {
            localStorage.setItem(BUILD_VERSION_KEY, CURRENT_APP_VERSION);
          }
        } catch {
          /* storage unavailable */
        }

        // 3. Service Worker Update Listener (PWA)
        if ('serviceWorker' in navigator && !window.Capacitor) {
          const registration = await navigator.serviceWorker.ready;
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
        console.error('Update check failed:', err);
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

  // Background Preloading for Safety Library
  useEffect(() => {
    // Wait 2 seconds before starting background download to prioritize initial app load
    const timer = setTimeout(() => {
      preloadSafetyLibraryAssets();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Suraksha Sathi: expanded on each view, then auto-collapse after a longer pause
  useEffect(() => {
    setIsSathiExpanded(true);
    const timer = setTimeout(() => {
      setIsSathiExpanded(false);
    }, 14000);
    return () => clearTimeout(timer);
  }, [currentView]);

  // Background Pre-fetching for Leaderboard & Monthly Stars
  useEffect(() => {
    if (user) {
      // Update last active status
      updateLastActive();

      // Delay pre-fetching to prioritize initial UI rendering
      const timer = setTimeout(() => {
        leaderboardService.fetchAllTime();
        leaderboardService.fetchMonthly();
        leaderboardService.fetchHallOfFame();
      }, 2000); // 2 second delay
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Scroll to Top on View Change
  useEffect(() => {
    const mainContent = document.getElementById('main-scroll-container');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView]);

  // Pull to refresh state — lastRefreshTime is persisted in sessionStorage
  // so the cooldown survives page reloads (e.g. native pull-to-refresh) and
  // prevents hammering the DB on every swipe-down.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(() => {
    const stored = sessionStorage.getItem('slm_last_refresh_ts');
    return stored ? parseInt(stored, 10) : 0;
  });

  const getChapterBadge = () => {
    const level = calculateLevelFromProgress(completedLessons);
    return getBadgeByLevel(level);
  };

  const showNotification = (message, type = 'success') => {
    if (notificationHideTimerRef.current) {
      clearTimeout(notificationHideTimerRef.current);
      notificationHideTimerRef.current = null;
    }
    setNotification({ message, type });
    notificationHideTimerRef.current = setTimeout(() => {
      setNotification(null);
      notificationHideTimerRef.current = null;
    }, 3600);
  };

  useEffect(() => {
    return () => {
      if (notificationHideTimerRef.current) {
        clearTimeout(notificationHideTimerRef.current);
      }
    };
  }, []);

  const updateLastActive = async () => {
    if (!user) return;
    try {
      await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  };

  const fetchProfile = async (userToFetch, forceRefresh = false) => {
    const targetUser = userToFetch || user;
    if (!targetUser) return;

    try {
      const profileData = await requestManager.fetch(
        `profile_${targetUser.id}`,
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('role, avatar_url, current_session_id, training_level, full_name, points, reading_points, quiz_points, completed_lessons, total_penalties, slm_id, updated_at, district, block, job, dob, age, education, blood_group, is_donor, accident_voltage, profile_nudge_state')
            .eq('id', targetUser.id)
            .single();

          if (error) {
            // Migration not applied yet: retry without nudge column so login still works.
            const missingNudgeCol =
              /profile_nudge_state/i.test(error.message || '') ||
              error.code === '42703';
            if (missingNudgeCol) {
              const retry = await supabase
                .from('profiles')
                .select('role, avatar_url, current_session_id, training_level, full_name, points, reading_points, quiz_points, completed_lessons, total_penalties, slm_id, updated_at, district, block, job, dob, age, education, blood_group, is_donor, accident_voltage')
                .eq('id', targetUser.id)
                .single();
              if (retry.error) throw retry.error;
              return { ...retry.data, profile_nudge_state: {} };
            }
            throw error;
          }
          return data;
        },
        { ttl: 10, swr: true, forceRefresh: forceRefresh }
      );

      if (profileData) {
        const remoteLessons = Array.isArray(profileData.completed_lessons)
          ? profileData.completed_lessons
          : [];
        const coreRemoteLessons = filterCoreCompletedLessonIds(remoteLessons);
        const serverHadSupplementaryIds = remoteLessons.some(
          (id) => typeof id === 'string' && id.trim().toLowerCase().startsWith('supp_')
        );
        const computedLevel = Math.max(1, calculateLevelFromProgress(coreRemoteLessons));

        if (!isGuestUser(profileData)) {
          if (serverHadSupplementaryIds && targetUser?.id) {
            const { error: stripError } = await supabase
              .from('profiles')
              .update({ completed_lessons: coreRemoteLessons })
              .eq('id', targetUser.id);
            if (stripError) {
              console.warn('Could not strip supplementary lesson ids from profile:', stripError);
            } else {
              profileData.completed_lessons = coreRemoteLessons;
            }
          }

          if (profileData.training_level !== computedLevel) {
            const { error: levelUpdateError } = await supabase
              .from('profiles')
              .update({ training_level: computedLevel })
              .eq('id', targetUser.id);

            if (levelUpdateError) {
              console.error('Error reconciling training level:', levelUpdateError);
            } else {
              profileData.training_level = computedLevel;
            }
          }
        }

        // Check for session mismatch
        const localSessionId = storageUtils.getItem('slm_session_id');
        if (profileData.current_session_id && localSessionId && profileData.current_session_id !== localSessionId) {
          console.warn('Session mismatch detected. Logging out.');
          confirmLogout(true);
          return;
        }

        // Server progress is authoritative to prevent stale localStorage from re-promoting users.
        setCompletedLessons(coreRemoteLessons);
        if (targetUser?.id && !isGuestUser(profileData)) {
          localStorage.setItem(`training_progress_${targetUser.id}`, JSON.stringify(coreRemoteLessons));
        }

        setUserProfile(sanitizeGuestProfileForDisplay(profileData));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshData = async () => {
    if (!user || isRefreshing) return;

    // Cooldown check: prevent refresh if called within last 10 seconds
    const now = Date.now();
    if (now - lastRefreshTime < 10000) {
      console.log('Refresh cooldown active (10s), skipping database hit...');
      return;
    }

    setIsRefreshing(true);
    const newTimestamp = now;
    setLastRefreshTime(newTimestamp);
    sessionStorage.setItem('slm_last_refresh_ts', String(newTimestamp));

    try {
      await fetchProfile(user);
      // Also refresh notifications using the optimized fetcher
      await fetchNotifications(true);

      invalidateLeaderboardCaches(user.id);
      leaderboardService.fetchAllTime(true).catch(() => {});
      leaderboardService.fetchMonthly(true).catch(() => {});

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
    // Check active session with fail-safe timeout
    const initSession = async () => {
      // Pre-load essential views immediately
      preloadComponent(() => import("./components/Home"));
      preloadComponent(() => import("./components/Login"));

      // Force app loading to false after 5s max (expanded for reliability)
      const timeoutId = setTimeout(() => {
        console.warn('Session check timed out, forcing app load');
        setAppLoading(false);
      }, 5000);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          setUser(session.user);
          // Verify profile but don't block indefinitely
          await fetchProfile(session.user).catch(console.error);
        } else {
          // --- CUSTOM AUTH FALLBACK ---
          // Our login uses a custom RPC (not supabase.auth.signIn), so Supabase
          // has no native session. On page reload we restore from localStorage.
          const storedUserId = storageUtils.getItem('user_id');
          const storedToken = storageUtils.getItem('session_token');

          if (storedUserId && storedToken) {
            try {
              // Use cache-first: if profile was recently fetched, no DB hit.
              const profileData = await requestManager.fetch(
                `profile_${storedUserId}`,
                async () => {
                  const { data, error: profileErr } = await supabase
                    .from('profiles')
                    .select('id, full_name, role, slm_id')
                    .eq('id', storedUserId)
                    .single();
                  if (profileErr) throw profileErr;
                  return data;
                },
                { ttl: 10, swr: false, forceRefresh: false } // Cache-first, no forced DB hit
              );

              if (profileData) {
                const restoredUser = {
                  id: storedUserId,
                  full_name: profileData.full_name,
                  role: profileData.role,
                  slm_id: profileData.slm_id,
                };
                setUser(restoredUser);
                // Full profile fetch is also cache-first (ttl 10 min)
                await fetchProfile(restoredUser).catch(console.error);
              } else {
                // Profile not found — stale token, clear it
                console.warn('Stored userId not found in DB, clearing tokens.');
                storageUtils.removeItem('user_id');
                storageUtils.removeItem('session_token');
                setUser(null);
              }
            } catch (restoreErr) {
              console.error('Session restore from localStorage failed:', restoreErr);
            }
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        clearTimeout(timeoutId);
        setTimeout(() => setAppLoading(false), 300);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('update-password');
      }

      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user);
        return;
      }

      // This app uses custom auth, so onAuthStateChange fires INITIAL_SESSION
      // with a null session on load. Do NOT wipe a valid custom session that
      // was restored from localStorage, otherwise auto-login is undone and the
      // user is bounced to the landing screen. Only clear state on a real
      // sign-out, i.e. when no custom session token remains.
      const hasCustomSession =
        storageUtils.getItem('user_id') && storageUtils.getItem('session_token');
      if (!hasCustomSession) {
        setUser(null);
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Authenticated users should not stay on the public landing screen
  useEffect(() => {
    if (!appLoading && user && currentView === 'landing') {
      setCurrentView('training');
    }
  }, [appLoading, user, currentView]);

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

  // Optimized Notifications Fetcher
  const fetchNotifications = async (forceRefresh = false) => {
    setNotifFetchError(false);
    try {
      const data = await requestManager.fetch(
        'notifications_list',
        async () => {
          const { data, error } = await supabase.rpc('get_active_notifications_public');

          if (error) throw error;
          return (data || []).slice(0, 20);
        },
        { ttl: 2, forceRefresh, swr: true }
      );

      if (data) setNotificationsHistory(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifFetchError(true);
    }
  };

  useEffect(() => {
    if (user?.id) {
      activeBroadcastShownOnceRef.current = false;
      fetchNotifications(true);
    } else {
      setNotificationsHistory([]);
      setShowActiveBroadcastModal(false);
      setActiveBroadcastNotice(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || ['login', 'verify', 'update-password'].includes(currentView) || activeBroadcastShownOnceRef.current) return;
    const latest = notificationsHistory[0];
    if (!latest?.id || latest.type !== 'alert') return;

    const t = window.setTimeout(() => {
      if (activeBroadcastShownOnceRef.current) return;
      activeBroadcastShownOnceRef.current = true;
      setActiveBroadcastNotice(latest);
      setShowActiveBroadcastModal(true);
    }, 1400);

    return () => window.clearTimeout(t);
  }, [user?.id, notificationsHistory, currentView]);

  const handleDeleteNotification = async (id) => {
    try {
      const { error, count } = await supabase
        .from('notifications')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) throw error;
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
        const row = payload.new;
        if (!row?.id) return;
        if (row.is_active !== true) return;
        setPushNotification(row);
        setNotificationsHistory(prev => [row, ...prev.filter((n) => n.id !== row.id)].slice(0, 20));
        setTimeout(() => setPushNotification(null), 10000);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const row = payload.new;
        if (!row?.id) return;
        setNotificationsHistory((prev) => {
          if (row.is_active !== true) return prev.filter((n) => n.id !== row.id);
          const without = prev.filter((n) => n.id !== row.id);
          return [row, ...without]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 20);
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        setNotificationsHistory(prev => prev.filter(n => n.id !== payload.old.id));
      })
      .subscribe();

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
          confirmLogout(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sessionChannel);
    };
  }, [user]);

  // Subtle forum reply alert when user is elsewhere in the app
  useEffect(() => {
    if (!user?.id || currentView === 'community') return undefined;

    const channel = supabase
      .channel('forum_activity_app')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, (payload) => {
        const row = payload.new;
        if (!row?.parent_id || row.author_id === user.id) return;

        if (forumActivityTimerRef.current) {
          clearTimeout(forumActivityTimerRef.current);
        }
        setForumActivityToast({ questionId: row.parent_id });
        forumActivityTimerRef.current = window.setTimeout(() => {
          setForumActivityToast(null);
          forumActivityTimerRef.current = null;
        }, 4500);
      })
      .subscribe();

    return () => {
      if (forumActivityTimerRef.current) {
        clearTimeout(forumActivityTimerRef.current);
        forumActivityTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentView]);

  useEffect(() => {
    return () => {
      if (forumActivityTimerRef.current) {
        clearTimeout(forumActivityTimerRef.current);
      }
    };
  }, []);

  // Scroll to top when view changes and sync with URL hash
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Clear selected user ID when navigating away from progress view
    // This ensures clicking 'My Progress' from navigation always shows logged-in user
    if (currentView !== 'my-progress') {
      setSelectedProgressUserId(null);
    }

    if (currentView !== 'accident-stories') {
      setAwarenessOpenStoryId(null);
    }

    if (currentView === 'home' || currentView === 'landing') {
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      const hash = window.location.hash.replace('#/', '').split('?')[0];
      if (hash !== currentView && !hash.startsWith(currentView + '/')) {
        window.location.hash = `/${currentView}`;
      }
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
        if (!hash) {
          return user ? 'home' : 'landing';
        }
        return prevView;
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  // Add a listener to re-check auth when the app becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user);
          }
        } catch (err) {
          console.error('Error checking session on visibility change:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Single-device enforcement fallback: the realtime listener delivers an
  // instant kick, but it can be missed (websocket reconnect, backgrounded tab,
  // sleeping device). This does a fresh, uncached read of current_session_id on
  // focus and on a timer so a superseded device is reliably signed out.
  // It never signs out on errors/uncertainty to avoid false logouts.
  useEffect(() => {
    const validateDeviceSession = async () => {
      const localSessionId = storageUtils.getItem('slm_session_id');
      const storedUserId = user?.id || storageUtils.getItem('user_id');
      if (!localSessionId || !storedUserId) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('current_session_id')
          .eq('id', storedUserId)
          .single();
        if (error) return;
        const remoteSessionId = data?.current_session_id;
        if (remoteSessionId && remoteSessionId !== localSessionId) {
          confirmLogout(true);
        }
      } catch {
        // best-effort; never sign out on a failed check
      }
    };

    const handleSessionVisibility = () => {
      if (document.visibilityState === 'visible') validateDeviceSession();
    };

    document.addEventListener('visibilitychange', handleSessionVisibility);
    const intervalId = setInterval(validateDeviceSession, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleSessionVisibility);
      clearInterval(intervalId);
    };
  }, [user]);

  // Check LocalStorage for Language on mount
  useEffect(() => {
    const savedLang = storageUtils.getItem('appLanguage');
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  // Dynamic StatusBar Management for Android & PWA
  useEffect(() => {
    const updateStatusBar = async () => {
      const isDark = theme === 'dark';
      const bgColor = isDark ? '#0F172A' : (currentView === 'home' ? '#0F172A' : '#F8FAFC');
      
      // 1. Handle Web/PWA Theme Color
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', bgColor);
      // console.log(`[Status Bar] Theme: ${theme}, View: ${currentView}, Color: ${bgColor}`);

      // 2. Handle Native Capacitor StatusBar
      if (window.Capacitor) {
        try {
          if (isDark) {
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: bgColor });
          } else {
            if (currentView === 'home') {
              await StatusBar.setStyle({ style: Style.Dark });
              await StatusBar.setBackgroundColor({ color: bgColor });
            } else {
              await StatusBar.setStyle({ style: Style.Light });
              await StatusBar.setBackgroundColor({ color: bgColor });
            }
          }
        } catch (err) {
          console.warn('Native StatusBar update failed:', err);
        }
      }
    };

    updateStatusBar();
  }, [currentView, theme]);

  // Redundancy check for Theme
  useEffect(() => {
    const currentTheme = storageUtils.getItem('appTheme') || 'dark';
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
      storageUtils.removeItem('session_token');
      storageUtils.removeItem('user_id');
      cacheHelper.clearAll();
      setShowLogoutModal(false);
      setCurrentView('landing');
      if (isAutomatic === true) {
        setShowSessionEndedModal(true);
      } else {
        requestAnimationFrame(() => {
          showNotification(language === 'en' ? 'Logged out successfully' : 'সফলভাবে লগ আউট হয়েছে');
        });
      }
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
        admin: "Update Profile",
        safetyMitra: "Safety Mitra"
      },
      hero: {
        title: "SmartLineman.in",
        subtitle: "Empowering West Bengal's electrical linemen through safety, community & recognition",
        stats: { linemen: "Active Linemen", supervisors: "Supervisors", safety: "Safety Record" }
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
        admin: "প্রোফাইল আপডেট",
        safetyMitra: "সেফটি মিত্র"
      },
      hero: {
        title: "স্মার্ট লাইনম্যান",
        subtitle: "সুরক্ষা, কমিউনিটি এবং স্বীকৃতির মাধ্যমে পশ্চিমবঙ্গের লাইনম্যানদের ক্ষমতায়ন",
        stats: { linemen: "সক্রিয় লাইনম্যান", supervisors: "সুপারভাইজার", safety: "সুরক্ষা রেকর্ড" }
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
    const publicViews = ['landing', 'login', 'update-password', 'verify', 'accident-stories', 'video-guide', 'aro-janun', 'sops', 'weather-alert-demo'];
    const isPublic = publicViews.includes(currentView);

    if (!user && !isPublic && !appLoading) {
      return (
        <Suspense fallback={<PageLoader />}>
          <div className="flex-1 flex flex-col min-h-0 w-full animate-slide-up-fade">
            <Landing
              language={language}
              onLanguageChange={handleLanguageSelect}
              setCurrentView={setCurrentView}
              user={user}
            />
          </div>
        </Suspense>
      );
    }

    const content = (() => {
      if (currentView === 'landing' && !user) {
        return (
          <Landing
            language={language}
            onLanguageChange={handleLanguageSelect}
            setCurrentView={setCurrentView}
            user={user}
          />
        );
      }

      if (currentView === 'login' || (currentView === 'update-password' && !user)) {
        return <Login
          initialView={currentView === 'update-password' ? 'update' : 'login'}
          onLogin={(u) => {
            setUser(u);
            // Force a fresh read so the just-claimed session id is authoritative
            // and a stale cached profile can't trigger a false self-logout.
            fetchProfile(u, true);
            setCurrentView('training');
          }}
          showNotification={showNotification}
          setCurrentView={setCurrentView}
        />;
      }

      switch (currentView) {
        case 'competitions':
          return <Competitions language={language} user={user} setCurrentView={setCurrentView} userProfile={userProfile} refreshProfile={fetchProfile} showNotification={showNotification} />;
        case 'leaderboard':
          return <Competitions language={language} user={user} userProfile={userProfile} setCurrentView={setCurrentView} isFullLeaderboard={true} onOpenUserProgress={(userId) => { setSelectedProgressUserId(userId || user?.id || null); setCurrentView('my-progress'); }} refreshProfile={fetchProfile} showNotification={showNotification} />;
        case 'my-progress':
          return <MyProgress language={language} user={user} targetUserId={selectedProgressUserId || user?.id} setCurrentView={setCurrentView} returnView="leaderboard" />;
        case 'community':
          return (
            <Community
              language={language}
              user={user}
              userProfile={userProfile}
              pendingQuestionId={forumPendingQuestionId}
              onPendingQuestionConsumed={() => setForumPendingQuestionId(null)}
            />
          );
        case 'emergency':
          return <Emergency language={language} user={user} setCurrentView={setCurrentView} />;
        case 'sops':
          return <SOPs language={language} user={user} setCurrentView={setCurrentView} />;
        case 'my_ppe':
        case 'safety-library':
          return (
            <SafetyTabsPage
              activeTab={currentView}
              setCurrentView={setCurrentView}
              language={language}
              user={user}
            />
          );
        case 'my_tools':
          return <MyTools language={language} user={user} userProfile={userProfile} />;
        case 'training':
          return <Training 
            language={language} 
            user={user} 
            userProfile={userProfile}
            showNotification={showNotification}
            onProgressUpdate={(newProgress, forceRefresh = false) => { 
              if (isGuestUser(userProfile)) return;
              const coreProgress = filterCoreCompletedLessonIds(Array.isArray(newProgress) ? newProgress : []);
              setCompletedLessons(coreProgress); 
              setUserProfile(prev => prev ? { ...prev, completed_lessons: coreProgress, training_level: Math.max(1, calculateLevelFromProgress(coreProgress)) } : null); 
              setTimeout(() => fetchProfile(user, forceRefresh), 1000); 
            }} 
            onOpenUserProgress={() => { setSelectedProgressUserId(user?.id || null); setCurrentView('my-progress'); }} 
            setCurrentView={setCurrentView}
          />;
        case 'admin':
          if (!['admin', 'safety mitra', 'lineman', 'guest'].includes(userProfile?.role)) { setCurrentView('home'); return null; }
          return (
            <Admin
              language={language}
              user={user}
              userProfile={userProfile}
              setCurrentView={setCurrentView}
              onPreviewProfileNudge={setProfileNudgePreview}
              onPreviewIdleStory={(opts = {}) =>
                setIdleStoryPreview({
                  storyId: opts.storyId || undefined,
                  key: Date.now(),
                })
              }
              onPreviewSponsorAd={(adRow) =>
                setSponsorAdPreview({ ad: adRow, key: Date.now() })
              }
            />
          );
        case 'visual-quiz-preview':
          if (userProfile?.role !== 'admin') { setCurrentView('home'); return null; }
          return <VisualQuizPreview language={language} setCurrentView={setCurrentView} />;
        case 'admin-services':
          if (!['admin', 'safety mitra'].includes(userProfile?.role)) { setCurrentView('home'); return null; }
          return <AdminServices language={language} userProfile={userProfile} />;
        case 'guide':
          if (!['admin', 'safety mitra'].includes(userProfile?.role)) { setCurrentView('home'); return null; }
          return <Guide userRole={userProfile?.role} />;
        case 'verify': {
          const fullUrl = window.location.href;
          const segments = fullUrl.split('verify/');
          const rawId = segments.length > 1 ? segments[segments.length - 1] : "";
          const certId = rawId.split(/[#\?\/]/)[0];
          return <VerificationView language={language} certificateId={certId} />;
        }
        case 'menu':
          return (
            <MorePage
              currentView={currentView}
              setCurrentView={(view) => {
                if (view === 'my-progress') setSelectedProgressUserId(user?.id || null);
                setCurrentView(view);
              }}
              userProfile={userProfile}
              language={language}
              onToggleLanguageModal={() => setShowLanguageModal(true)}
              onToggleNotifications={() => setCurrentView('notifications')}
              onLogout={() => setShowLogoutModal(true)}
            />
          );
        case 'notifications':
          return <Notifications language={language} notifications={notificationsHistory} setCurrentView={setCurrentView} />;
        case 'accident-stories':
          return (
            <AwarenessStories
              setCurrentView={setCurrentView}
              language={language}
              initialStoryId={awarenessOpenStoryId}
              onInitialStoryConsumed={() => setAwarenessOpenStoryId(null)}
            />
          );
        case 'video-guide':
          return <VideoGuide language={language} setCurrentView={setCurrentView} />;
        case 'aro-janun':
          return <AroJanun language={language} setCurrentView={setCurrentView} />;
        case 'weather-alert-demo':
          return <WeatherAlertDemo language={language} setCurrentView={setCurrentView} />;
        /* case 'safety-hero':
          return <SafetyHero language={language} user={user} onBack={() => setCurrentView('home')} />; */
        case 'home':
        default:
          return <Home setCurrentView={setCurrentView} language={language} t={t} user={user} userProfile={userProfile} refreshProfile={fetchProfile} />;
      }
    })();

    const safetyTabViews = ['my_ppe', 'safety-library'];
    const isSafetyTabView = safetyTabViews.includes(currentView);

    return (
      <Suspense fallback={<PageLoader />}>
        <div key={isSafetyTabView ? 'safety-tabs' : currentView} className={`h-full w-full ${isSafetyTabView ? '' : 'view-transition'}`}>
          {content}
        </div>
      </Suspense>
    );
  };

  if (isRetiring) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full space-y-8 animate-fadeIn">
          <div className="w-24 h-24 bg-orange-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">📲</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black leading-tight">{language === 'bn' ? 'এই অ্যাপটি বন্ধ করা হয়েছে' : 'App Retired'}</h1>
            <p className="text-slate-400 text-lg leading-relaxed text-center">
              {language === 'bn' ? 'আরও উন্নত ফিচারের জন্য আমরা এখন শুধুমাত্র ওয়েব অ্যাপ (PWA) ব্যবহার করছি। দয়া করে নিচের বাটনে ক্লিক করে নতুন অ্যাপটি ব্যবহার করুন।' : 'For a better experience, we have moved to our official Web App. Please use the button below to switch.'}
            </p>
          </div>
          <div className="pt-8">
            <button onClick={() => window.open('https://slm-web.vercel.app', '_blank')} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-5 rounded-2xl shadow-2xl shadow-orange-900/40 transition-all active:scale-95 text-xl tracking-wide uppercase">
              {language === 'bn' ? 'ওয়েব অ্যাপ ওপেন করুন' : 'Open Web App'}
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-8 border-t border-slate-800 pt-6">
            {language === 'bn' ? 'Chrome ব্রাউজারে গিয়ে "Add to Home Screen" অপশনটি সিলেক্ট করুন।' : 'Tip: Select "Add to Home Screen" from Chrome menu for easy access.'}
          </p>
        </div>
      </div>
    );
  }

  const overlayBlocked =
    appLoading ||
    globalLoading ||
    showLogoutModal ||
    showLanguageModal ||
    !!pushNotification ||
    showActiveBroadcastModal ||
    showUpdateModal ||
    isRetiring ||
    showSessionEndedModal ||
    currentView === 'accident-stories' ||
    currentView === 'landing' ||
    currentView === 'verify' ||
    (currentView === 'update-password' && !user);

  const idleReminderBlocked = overlayBlocked || profileNudgeOpen;

  // Logged-out: allow on landing/login (with dwell delay in overlay).
  // Do not reuse overlayBlocked wholesale — that always blocks `landing`.
  const sponsorAdBlocked =
    appLoading ||
    globalLoading ||
    showLogoutModal ||
    showLanguageModal ||
    !!pushNotification ||
    showActiveBroadcastModal ||
    showUpdateModal ||
    isRetiring ||
    showSessionEndedModal ||
    profileNudgeOpen ||
    sidebarOpen ||
    currentView === 'accident-stories' ||
    currentView === 'verify' ||
    (currentView === 'update-password' && !user) ||
    (user
      ? ['login', 'verify', 'landing', 'update-password'].includes(currentView)
      : !['landing', 'login'].includes(currentView));

  const sponsorAdMinDwellMs = user ? 0 : 12000;

  const profileNudgeBlocked =
    overlayBlocked ||
    sidebarOpen ||
    ['login', 'verify', 'landing', 'update-password', 'accident-stories'].includes(currentView);

  return (
    <Suspense fallback={<PageLoader />}>
      <>
      <PwaInstallPrompt
        language={language}
        offsetForBottomNav={!appLoading && !!user && !['login', 'verify', 'landing'].includes(currentView)}
      />
      {appLoading ? (
        <PageLoader />
      ) : (
        <LifeSkillRadioProvider language={language} enabled={!!user}>
        <div
          className={`h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans flex flex-col ${language === 'bn' ? 'font-bengali' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {user && (
            <Sidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              currentView={currentView}
              setCurrentView={(view) => {
                if (view === 'my-progress') setSelectedProgressUserId(user?.id || null);
                setCurrentView(view);
              }}
              userProfile={userProfile}
              language={language}
              t={translations[language]}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              onToggleLanguageModal={() => setShowLanguageModal(true)}
              onToggleNotifications={() => setCurrentView('notifications')}
              onLogout={() => setShowLogoutModal(true)}
            />
          )}

          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {isGuestUser(userProfile) && (
              <GuestPreviewBanner language={language} />
            )}
            {showLogoutModal && (
              <LogoutConfirmationModal onConfirm={() => confirmLogout(false)} onCancel={cancelLogout} language={language} loading={isLoggingOut} />
            )}

            {showSessionEndedModal && (
              <div className="fixed inset-0 z-[400] bg-slate-900/45 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="session-ended-title">
                <div className="w-full sm:max-w-sm animate-slide-up-sheet sm:animate-scale-in">
                  <div className="relative overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80" aria-hidden="true" />

                    <div className="flex items-start gap-3.5 p-6 pt-7 sm:p-7 text-left">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-sm" aria-hidden="true">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 id="session-ended-title" className={`text-lg sm:text-xl font-black leading-tight text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                          {language === 'en' ? 'Signed out' : 'সাইন আউট হয়েছে'}
                        </h2>
                        <p className={`mt-1 text-sm font-semibold leading-snug text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                          {language === 'en'
                            ? 'Your account was just signed in on another device. For your security, only one device can stay signed in at a time.'
                            : 'আপনার অ্যাকাউন্টটি এইমাত্র অন্য একটি ডিভাইসে সাইন ইন করা হয়েছে। নিরাপত্তার জন্য একসাথে কেবল একটি ডিভাইসে সাইন ইন থাকা যায়।'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/80 bg-white/60 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
                      <button
                        type="button"
                        onClick={() => setShowSessionEndedModal(false)}
                        className={`w-full min-h-[48px] rounded-full bg-orange-500 py-3 text-base font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] ${language === 'bn' ? 'font-bengali' : ''}`}
                      >
                        {language === 'en' ? 'OK' : 'ঠিক আছে'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showActiveBroadcastModal && activeBroadcastNotice && (
              <div className="fixed inset-0 z-[210] bg-slate-900/45 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                <div className="w-full sm:max-w-md max-h-[85vh] flex flex-col animate-slide-up-sheet sm:animate-scale-in">
                  <div className="relative flex max-h-[85vh] min-h-0 flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80" aria-hidden="true" />

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 pt-7 text-left sm:p-7">
                      <div className="flex shrink-0 items-start gap-3.5">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-xl leading-none shadow-sm" aria-hidden="true">
                          {activeBroadcastNotice.type === 'alert' ? '🚨' : activeBroadcastNotice.type === 'warning' ? '⚠️' : activeBroadcastNotice.type === 'update' ? '✅' : '📢'}
                        </span>
                        <h2 className="min-w-0 flex-1 text-lg sm:text-xl font-black leading-tight text-slate-900">
                          {activeBroadcastNotice.title}
                        </h2>
                      </div>
                      <p className="mt-3 min-h-0 flex-1 overflow-y-auto custom-scrollbar whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-600">
                        {activeBroadcastNotice.message}
                      </p>
                    </div>

                    <div className="shrink-0 border-t border-slate-200/80 bg-white/60 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
                      <button
                        type="button"
                        onClick={() => setShowActiveBroadcastModal(false)}
                        className={`w-full min-h-[48px] rounded-full bg-orange-500 py-3 text-base font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] ${language === 'bn' ? 'font-bengali' : ''}`}
                      >
                        {language === 'en' ? 'OK' : 'ঠিক আছে'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showUpdateModal && updateInfo && (
              <div className="fixed inset-0 z-[200] bg-slate-900/45 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                <div className="w-full sm:max-w-md animate-slide-up-sheet sm:animate-scale-in">
                  <div className="relative overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80" aria-hidden="true" />
                    <div className="flex items-start gap-3.5 p-6 pt-7 text-left sm:p-7">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-2xl leading-none shadow-sm" aria-hidden="true">🚀</span>
                      <div className="min-w-0 flex-1">
                    <h2 className={`text-lg sm:text-xl font-black leading-tight text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>{language === 'en' ? 'Update Available' : 'নতুন সংস্করণ উপলব্ধ'}</h2>
                    <p className={`mt-1 text-sm font-semibold leading-snug text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                      {isForceUpdate ? (language === 'en' ? `A critical update (v${updateInfo.version_name}) is required to continue using the app.` : `পরবর্তী ধাপের জন্য একটি গুরুত্বপূর্ণ আপডেট (v${updateInfo.version_name}) প্রয়োজন।`) : (language === 'en' ? `A new version is available. Please refresh to apply the latest updates.` : `একটি নতুন সংস্করণ এসেছে। সর্বশেষ আপডেটগুলি পেতে দয়া করে রিফ্রেশ করুন।`)}
                    </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-white/60 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
                      <button onClick={() => { if (isForceUpdate && updateInfo.update_url && updateInfo.update_url !== '#') { Browser.open({ url: updateInfo.update_url }); } else { applyAppRefresh(); } }} className={`w-full min-h-[48px] rounded-full bg-orange-500 py-3 text-base font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {isForceUpdate ? (language === 'en' ? 'Update Now' : 'এখনই আপডেট করুন') : (language === 'en' ? 'Refresh Now' : 'এখনই রিফ্রেশ করুন')}
                      </button>
                      {!isForceUpdate && (
                        <button onClick={() => setShowUpdateModal(false)} className={`w-full min-h-[48px] rounded-full border border-slate-200/80 bg-white py-3 text-base font-bold text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-[0.98] ${language === 'bn' ? 'font-bengali' : ''}`}>
                          {language === 'en' ? 'Later' : 'পরে'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={`refresh-indicator ${isRefreshing || pullDistance > 20 ? 'visible' : ''}`} style={{ transform: isRefreshing ? 'translateY(0)' : `translateY(${Math.min(pullDistance - 60, 0)}px)`, opacity: Math.min(pullDistance / 60, 1) }}>
              <div className="refresh-indicator-content">
                {isRefreshing ? <div className="refresh-spinner"></div> : <div className="text-slate-900"><svg className={`w-5 h-5 transition-transform duration-200 ${pullDistance > 60 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></div>}
                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter font-mono">{isRefreshing ? (language === 'en' ? 'Updating…' : 'আপডেট হচ্ছে…') : (language === 'en' ? 'Pull to Refresh' : 'রিফ্রেশ করতে টানুন')}</span>
              </div>
            </div>

            {globalLoading && (
              <PageLoader
                overlay
                message={language === 'en' ? 'Please wait…' : 'দয়া করে অপেক্ষা করুন…'}
              />
            )}

            {notification &&
              createPortal(
                <div
                  className="fixed inset-x-0 bottom-0 z-[350] flex justify-center px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-10 pointer-events-none"
                  role="status"
                  aria-live="polite"
                >
                  <div
                    className={`pointer-events-auto w-full max-w-sm flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-xl border backdrop-blur-md animate-toast-in border-l-4 ${
                      notification.type === 'error'
                        ? 'border-l-rose-500 bg-slate-900/95 text-slate-100 border-slate-600/40 dark:border-slate-500/35'
                        : notification.type === 'info'
                          ? 'border-l-sky-500 bg-slate-900/95 text-slate-100 border-slate-600/40 dark:border-slate-500/35'
                          : 'border-l-emerald-500 bg-slate-900/95 text-slate-100 border-slate-600/40 dark:border-slate-500/35'
                    }`}
                  >
                    {notification.type === 'error' ? (
                      <svg className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : notification.type === 'info' ? (
                      <svg className="w-5 h-5 shrink-0 mt-0.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <p className="text-sm font-semibold leading-snug text-slate-50">{notification.message}</p>
                  </div>
                </div>,
                document.body
              )}

            {forumActivityToast &&
              createPortal(
                <button
                  type="button"
                  onClick={() => {
                    if (forumActivityTimerRef.current) {
                      clearTimeout(forumActivityTimerRef.current);
                      forumActivityTimerRef.current = null;
                    }
                    setForumPendingQuestionId(forumActivityToast.questionId);
                    setForumActivityToast(null);
                    setCurrentView('community');
                  }}
                  className="fixed left-1/2 z-[115] max-w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 animate-toast-in rounded-full border border-emerald-500/35 bg-slate-900/92 px-4 py-2.5 text-center text-[12px] font-medium text-slate-100 shadow-lg backdrop-blur-sm active:scale-[0.98]"
                  style={{ top: 'calc(4.5rem + env(safe-area-inset-top, 0px))' }}
                  aria-live="polite"
                >
                  <span className="mr-1.5 inline-block text-emerald-400" aria-hidden>
                    💬
                  </span>
                  {language === 'en' ? 'New forum reply — tap to open' : 'ফোরামে নতুন উত্তর — খুলতে ট্যাপ করুন'}
                </button>,
                document.body
              )}

            {pushNotification && (
              <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-2rem)] max-w-md animate-bounce-in">
                <div className={`relative p-4 sm:p-5 rounded-2xl shadow-2xl border-2 flex gap-3 sm:gap-4 items-start ${pushNotification.type === 'alert' ? 'bg-red-50 border-red-500 dark:bg-red-900/20' : pushNotification.type === 'warning' ? 'bg-orange-50 border-orange-500 dark:bg-orange-900/20' : pushNotification.type === 'update' ? 'bg-green-50 border-green-500 dark:bg-green-900/20' : 'bg-orange-50 border-orange-500 dark:bg-orange-900/20'}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${pushNotification.type === 'alert' ? 'bg-red-100 text-red-600' : pushNotification.type === 'warning' ? 'bg-orange-100 text-orange-600' : pushNotification.type === 'update' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    {pushNotification.type === 'alert' ? '🚨' : pushNotification.type === 'warning' ? '⚠️' : pushNotification.type === 'update' ? '✅' : '📢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{pushNotification.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{pushNotification.message}</p>
                  </div>
                  <button onClick={() => setPushNotification(null)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              </div>
            )}
            <div className={`fixed inset-0 overflow-hidden pointer-events-none ${currentView === 'sops' ? 'hidden' : ''}`}>
              <div className="hidden sm:block absolute top-0 right-0 w-[42vw] h-[42vw] bg-orange-100/20 dark:bg-orange-900/10 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
              <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-cyan-100/40 dark:bg-cyan-900/20 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4"></div>
            </div>

            {((user && !['login', 'accident-stories', 'verify'].includes(currentView))) && (
              <header className={`${currentView === 'home' ? 'bg-[#ea580c] dark:bg-[#c2410c] border-transparent shadow-none' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 elevation-2'} sticky top-0 z-[80] border-b safe-area-inset-top transition-all duration-300 hidden md:block`}>
                <div className="max-w-7xl mx-auto mobile-container">
                  <div className="flex justify-between items-center h-14 md:h-16">
                    <div className="flex items-center gap-2 relative z-[110]">
                      {user && (
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 ${currentView === 'home' ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'} rounded-lg transition-colors`} title="Menu" aria-label="Toggle menu"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                      )}
                      <div className="flex items-center gap-2 group cursor-pointer px-2 py-1 -ml-1 transition-all active:scale-95" onClick={() => setCurrentView('home')}><div className="flex items-baseline gap-0.5 select-none"><span className={`text-xl sm:text-2xl logo-text ${currentView === 'home' ? 'logo-text-home' : 'logo-text-default'}`}>SmartLineMan</span><span className="text-[10px] sm:text-xs font-black bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-md border border-orange-500/20 shadow-sm ml-0.5 transform -translate-y-1">.in</span></div></div>
                    </div>
                    <div className="flex-grow"></div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {user && <RadioDesktopLaunch language={language} currentView={currentView} />}
                      {user ? (
                        <div className="flex items-center gap-2 pl-1 sm:pl-2"><button onClick={handleLogout} className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all touch-target border border-slate-200 dark:border-slate-600 shadow-sm" title="Logout"><div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 overflow-hidden shadow-sm">{userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-white" />}</div></button></div>
                      ) : (
                        <button onClick={() => setCurrentView('login')} className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all shadow-md shadow-orange-500/20 touch-target" title={t.nav.login} aria-label="Login"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
                      )}
                    </div>
                  </div>
                </div>
              </header>
            )}

            <div
              id="main-scroll-container"
              className={`flex-1 overflow-y-auto overflow-x-hidden relative ${
                ['my_ppe', 'safety-library'].includes(currentView) ? 'overflow-hidden' : ''
              } ${
                currentView === 'leaderboard'
                  ? 'pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-8'
                  : user
                    ? 'pb-20 md:pb-0'
                    : 'pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:pb-0'
              } ${['accident-stories', 'leaderboard', 'training', 'competitions', 'video-guide', 'aro-janun', 'admin', 'my_ppe', 'safety-library', 'menu', 'community'].includes(currentView) ? 'bg-[#fffdf7]' : ''}`}
            >
              <div
                className={`h-full relative z-10 w-full view-transition ${
                  ['my_ppe', 'safety-library'].includes(currentView) ? 'overflow-hidden flex flex-col min-h-0' : 'min-h-full'
                } ${['accident-stories', 'leaderboard', 'training', 'competitions', 'video-guide', 'aro-janun', 'admin', 'my_ppe', 'safety-library', 'menu', 'community'].includes(currentView) ? 'bg-[#fffdf7]' : ''}`}
                key={['my_ppe', 'safety-library'].includes(currentView) ? 'safety-tabs' : currentView}
              >
                {renderContent()}
              </div>
            </div>

            <IdleStoryReminder
              language={language}
              currentView={currentView}
              setCurrentView={setCurrentView}
              onRequestOpenStory={(id) => setAwarenessOpenStoryId(id)}
              blocked={idleReminderBlocked && !idleStoryPreview}
              preview={idleStoryPreview}
              onPreviewClose={() => setIdleStoryPreview(null)}
            />

            <SponsorAdOverlay
              language={language}
              blocked={sponsorAdBlocked && !sponsorAdPreview}
              minDwellMs={sponsorAdMinDwellMs}
              preview={sponsorAdPreview}
              onPreviewClose={() => setSponsorAdPreview(null)}
              onOpenChange={setSponsorAdOpen}
            />

            {user && !isGuestUser(userProfile) && (
              <ProfileFieldNudge
                user={user}
                userProfile={userProfile}
                language={language}
                blocked={profileNudgeBlocked && !profileNudgePreview}
                preview={profileNudgePreview}
                onPreviewClose={() => setProfileNudgePreview(null)}
                onOpenChange={setProfileNudgeOpen}
                onSaved={() => fetchProfile(user, true)}
              />
            )}
            {user &&
              !sidebarOpen &&
              !sponsorAdOpen &&
              !['login', 'verify', 'update-password'].includes(currentView) &&
              currentView !== 'sops' &&
              currentView !== 'training' &&
              currentView !== 'community' && (
              <div className="fixed left-0 z-[250] animate-slide-up bottom-[calc(8rem+env(safe-area-inset-bottom))]">
                 <button
                    type="button"
                    onClick={() => setCurrentView('sops')}
                    onMouseEnter={() => setIsSathiExpanded(true)}
                    onMouseLeave={() => setIsSathiExpanded(false)}
                    className={`flex items-center bg-emerald-600/90 backdrop-blur-md text-white p-2 rounded-r-full shadow-2xl transition-all duration-500 group border-y border-r border-white/20 active:scale-95 ${isSathiExpanded ? 'pl-2 pr-4' : 'pl-2 pr-2'}`}
                 >
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                       <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                       </svg>
                    </div>
                    <span className={`text-[12px] font-black uppercase tracking-tighter transition-all duration-500 overflow-hidden whitespace-nowrap ${isSathiExpanded ? 'max-w-[100px] ml-2 opacity-100' : 'max-w-0 ml-0 opacity-0'}`}>
                      সুরক্ষা সাথী
                    </span>
                 </button>
              </div>
            )}

            <NetworkStatusListener language={language} />
            {showWeatherBanner && (
              <WeatherAlertBanner
                alert={weatherAlert}
                visible={weatherVisible}
                language={language}
                isReminder={weatherIsReminder}
                onDismiss={dismissWeather}
                onRefresh={refreshWeather}
                loading={weatherLoading}
              />
            )}

            {user && <RadioScrollPaddingBridge currentView={currentView} />}
            {user && <RadioSafetyGuard currentView={currentView} />}

            {user && !['login', 'verify', 'sops'].includes(currentView) && (
              <RadioMiniPlayer language={language} currentView={currentView} />
            )}

            {user && !['login', 'verify', 'sops'].includes(currentView) && (
              <BottomNavigation
                currentView={currentView} 
                setCurrentView={setCurrentView} 
                language={language} 
                userId={user?.id}
                selectedProgressUserId={selectedProgressUserId}
                onMenuClick={(forceState) => {
                  if (forceState === false) setSidebarOpen(false);
                  else setSidebarOpen(prev => !prev);
                }}
              />
            )}

            {showLanguageModal && (
              <div
                className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/55 animate-fade-in"
                role="presentation"
                onClick={() => setShowLanguageModal(false)}
              >
                <div
                  className="w-full sm:max-w-sm animate-slide-up-sheet sm:animate-scale-in"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="language-modal-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
                    <div
                      className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
                      aria-hidden="true"
                    />

                    <div className="flex items-start gap-3.5 p-6 pt-7 sm:p-7 text-left">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-xl leading-none shadow-sm" aria-hidden="true">🌐</span>
                      <div className="min-w-0 flex-1">
                        <h3 id="language-modal-title" className="text-lg sm:text-xl font-black leading-tight text-slate-900">Choose Language</h3>
                        <p className="mt-1 text-sm font-semibold leading-snug text-slate-600 font-bengali">ভাষা নির্বাচন করুন</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 sm:px-7">
                      <button
                        type="button"
                        onClick={() => handleLanguageSelect('en')}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 shadow-sm transition-all active:scale-[0.98] ${language === 'en' ? 'border-orange-500 bg-orange-500 text-white shadow-orange-500/30' : 'border-slate-200/80 bg-white text-slate-900 hover:bg-orange-50'}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-xl" aria-hidden>🇺🇸</span>
                          <span className="text-sm font-black">English</span>
                        </span>
                        {language === 'en' && <span className="text-base font-black" aria-hidden>✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLanguageSelect('bn')}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 shadow-sm transition-all active:scale-[0.98] ${language === 'bn' ? 'border-orange-500 bg-orange-500 text-white shadow-orange-500/30' : 'border-slate-200/80 bg-white text-slate-900 hover:bg-orange-50'}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-xl" aria-hidden>🇮🇳</span>
                          <span className="text-sm font-black font-bengali">বাংলা (Bengali)</span>
                        </span>
                        {language === 'bn' && <span className="text-base font-black" aria-hidden>✓</span>}
                      </button>
                    </div>

                    <div className="border-t border-slate-200/80 bg-white/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-5 sm:pb-5">
                      <button
                        type="button"
                        onClick={() => setShowLanguageModal(false)}
                        className="w-full min-h-[48px] rounded-full border border-slate-200/80 bg-white py-3 text-base font-bold text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-[0.98]"
                      >
                        Cancel / বাতিল করুন
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </LifeSkillRadioProvider>
      )}
      </>
    </Suspense>
  );
}
