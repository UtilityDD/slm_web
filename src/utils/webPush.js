import { supabase } from '../supabaseClient';

const DISMISS_KEY = 'slm_push_optin_dismissed_at';
const DISMISS_DAYS = 14;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function getVapidPublicKey() {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();
}

/**
 * True only inside the native Android/iOS shell. `window.Capacitor` also exists
 * on the web once @capacitor/core is imported, so platform must be checked.
 */
export function isNativeCapacitorPlatform() {
  if (typeof window === 'undefined') return false;
  const cap = window.Capacitor;
  return !!(cap && typeof cap.getPlatform === 'function' && cap.getPlatform() !== 'web');
}

export function isWebPushSupported() {
  if (typeof window === 'undefined') return false;
  if (isNativeCapacitorPlatform()) return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

const SW_READY_TIMEOUT_MS = 15000;

/**
 * Push needs an active service worker. RegisterSW skips registration in some
 * environments, so register on demand rather than waiting on `ready` forever.
 */
async function ensureServiceWorkerRegistration() {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (!existing) {
    await navigator.serviceWorker.register('/sw.js');
  }

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Service worker did not activate in time')),
        SW_READY_TIMEOUT_MS
      );
    }),
  ]);
}

/**
 * Which specific capability is missing. Used by the admin panel so an
 * unsupported browser reports an actionable cause instead of "not available".
 */
export function getWebPushBlockReason() {
  if (typeof window === 'undefined') return 'no-window';
  if (isNativeCapacitorPlatform()) return 'capacitor';
  if (window.isSecureContext === false) return 'insecure-origin';
  if (!('serviceWorker' in navigator)) return 'no-service-worker';
  if (!('PushManager' in window)) return 'no-push-manager';
  if (!('Notification' in window)) return 'no-notification-api';
  return null;
}

export function describeWebPushBlockReason(reason, isEn = true) {
  switch (reason) {
    case 'capacitor':
      return isEn
        ? 'Running inside the Capacitor app shell. Web Push works in the browser / installed PWA only.'
        : 'ক্যাপাসিটর অ্যাপ শেলে চলছে। Web Push শুধু ব্রাউজার / ইনস্টল করা PWA-তে কাজ করে।';
    case 'insecure-origin':
      return isEn
        ? `Insecure origin (${window.location.origin}). Use http://localhost:5173 or an https URL — a LAN IP like 192.168.x.x will not work.`
        : `অসুরক্ষিত অরিজিন (${window.location.origin})। http://localhost:5173 বা https ব্যবহার করুন — 192.168.x.x কাজ করবে না।`;
    case 'no-service-worker':
      return isEn
        ? 'Service workers are unavailable. Common in private/incognito windows or when the origin is not secure.'
        : 'সার্ভিস ওয়ার্কার নেই। প্রাইভেট/ইনকগনিটো উইন্ডো বা অসুরক্ষিত অরিজিনে এটি হয়।';
    case 'no-push-manager':
      return isEn
        ? 'This browser has no Push API. On iPhone/iPad you must add the app to the Home Screen first; on desktop use Chrome, Edge or Firefox.'
        : 'এই ব্রাউজারে Push API নেই। আইফোন/আইপ্যাডে আগে হোম স্ক্রিনে যোগ করুন; ডেস্কটপে Chrome, Edge বা Firefox ব্যবহার করুন।';
    case 'no-notification-api':
      return isEn
        ? 'Notification API is blocked in this browser or profile.'
        : 'এই ব্রাউজার/প্রোফাইলে Notification API ব্লকড।';
    default:
      return isEn ? 'Web Push is unavailable here.' : 'এখানে Web Push পাওয়া যাচ্ছে না।';
  }
}

export function getNotificationPermission() {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
}

export function wasPushOptInDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissPushOptIn() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function subscriptionToPayload(subscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh || '',
    auth: json.keys?.auth || '',
  };
}

async function saveSubscription(userId, subscription) {
  const payload = subscriptionToPayload(subscription);
  if (!payload.endpoint || !payload.p256dh || !payload.auth) {
    return { success: false, error: 'incomplete subscription' };
  }

  const { data, error } = await supabase.rpc('upsert_push_subscription', {
    p_user_id: userId,
    p_endpoint: payload.endpoint,
    p_p256dh: payload.p256dh,
    p_auth: payload.auth,
    p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });

  if (error) return { success: false, error: error.message };
  if (data && data.success === false) return { success: false, error: data.error };
  return { success: true };
}

/**
 * Ensure an active push subscription is stored for this user.
 * Safe to call silently when permission is already granted.
 */
export async function syncWebPushSubscription(userId) {
  if (!userId || !isWebPushSupported()) {
    return { success: false, skipped: true };
  }

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    return { success: false, skipped: true, error: 'missing VAPID public key' };
  }

  if (Notification.permission !== 'granted') {
    return { success: false, skipped: true, error: 'permission not granted' };
  }

  try {
    const registration = await ensureServiceWorkerRegistration();
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    return saveSubscription(userId, subscription);
  } catch (err) {
    console.warn('Web push sync failed:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Request permission (must be from a user gesture), subscribe, and save.
 */
export async function enableWebPush(userId) {
  if (!userId || !isWebPushSupported()) {
    return { success: false, error: 'unsupported' };
  }

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    return { success: false, error: 'missing VAPID public key' };
  }

  // Once blocked, requestPermission() resolves 'denied' without prompting,
  // so the site permission has to be reset by hand.
  if (Notification.permission === 'denied') {
    return {
      success: false,
      denied: true,
      blockedInBrowser: true,
      error:
        'Notifications are blocked for this site. Click the icon left of the address bar → Site settings → Notifications → Allow, then reload.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, denied: true, error: 'permission denied' };
    }
    return syncWebPushSubscription(userId);
  } catch (err) {
    console.warn('Web push enable failed:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Show a local notification via the service worker (no server round-trip).
 * Useful to verify SW + OS permission before testing real Web Push delivery.
 */
export async function previewLocalPushNotification({
  title = 'SmartLineman (local test)',
  body = 'Local preview OK — service worker can show notifications.',
  url = '/',
} = {}) {
  if (!isWebPushSupported()) {
    return { success: false, error: 'unsupported' };
  }
  if (Notification.permission !== 'granted') {
    return { success: false, error: 'permission not granted' };
  }
  try {
    const registration = await ensureServiceWorkerRegistration();
    await registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
      tag: 'slm-admin-local-test',
      renotify: true,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Ask the Edge Function to send a real Web Push to a user (admin only).
 * Verifies admin on the server via profiles.role — no cron secret in the client.
 */
export async function sendAdminTestPush({
  callerId,
  targetUserId,
  title,
  body,
} = {}) {
  if (!callerId) {
    return { success: false, error: 'callerId required' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-reengagement-push', {
      body: {
        mode: 'admin_test',
        callerId,
        targetUserId: targetUserId || callerId,
        title,
        body,
      },
    });

    if (error) {
      const raw = error.message || String(error);
      const notDeployed = /failed to send a request|not found|404|fetch/i.test(raw);
      return {
        success: false,
        notDeployed,
        error: notDeployed
          ? 'Edge Function send-reengagement-push is not reachable. Deploy it (with VAPID secrets) before this step.'
          : raw,
        data,
      };
    }
    if (data?.ok === false || data?.error) {
      return {
        success: false,
        error: data.message || data.error || 'push failed',
        data,
      };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

/** Short human label for a stored user agent, e.g. "Chrome on Windows". */
export function describeUserAgent(ua) {
  const raw = String(ua || '');
  if (!raw) return 'Unknown device';

  let browser = 'Unknown browser';
  if (/edg\//i.test(raw)) browser = 'Edge';
  else if (/opr\/|opera/i.test(raw)) browser = 'Opera';
  else if (/samsungbrowser/i.test(raw)) browser = 'Samsung Internet';
  else if (/firefox\//i.test(raw)) browser = 'Firefox';
  else if (/chrome\//i.test(raw)) browser = 'Chrome';
  else if (/safari\//i.test(raw)) browser = 'Safari';

  let os = 'unknown OS';
  if (/windows/i.test(raw)) os = 'Windows';
  else if (/android/i.test(raw)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(raw)) os = 'iOS';
  else if (/mac os x/i.test(raw)) os = 'macOS';
  else if (/linux/i.test(raw)) os = 'Linux';

  return `${browser} on ${os}`;
}

export async function fetchAdminPushDevices(callerId, targetUserId = null) {
  if (!callerId) return { success: false, error: 'callerId required' };
  try {
    const { data, error } = await supabase.rpc('admin_list_push_devices', {
      p_caller_id: callerId,
      p_target_user_id: targetUserId,
    });
    if (error) return { success: false, error: error.message };
    if (data && data.success === false) {
      return { success: false, error: data.error || 'failed' };
    }
    return { success: true, devices: data?.devices || [] };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function fetchAdminPushStats(callerId) {
  if (!callerId) return { success: false, error: 'callerId required' };
  try {
    const { data, error } = await supabase.rpc('admin_push_subscription_stats', {
      p_caller_id: callerId,
    });
    if (error) return { success: false, error: error.message };
    if (data && data.success === false) {
      return { success: false, error: data.error || 'failed' };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}
