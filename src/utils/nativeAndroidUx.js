/**
 * Native Android UX helpers (Capacitor APK only).
 * PWA/web must remain unchanged — every entry point no-ops off native.
 */
import { isNativeCapacitorPlatform } from './webPush';

/** LIFO handlers: return true if the event was consumed. */
const backHandlers = [];

let uxInitialized = false;
let lastExitHintAt = 0;

export function pushNativeBackHandler(handler) {
  if (typeof handler !== 'function' || !isNativeCapacitorPlatform()) {
    return () => {};
  }
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.lastIndexOf(handler);
    if (idx >= 0) backHandlers.splice(idx, 1);
  };
}

export async function hapticImpact(style = 'Light') {
  if (!isNativeCapacitorPlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = {
      Light: ImpactStyle.Light,
      Medium: ImpactStyle.Medium,
      Heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: map[style] || ImpactStyle.Light });
  } catch {
    /* plugin unavailable */
  }
}

export async function hapticNotification(type = 'Success') {
  if (!isNativeCapacitorPlatform()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const map = {
      Success: NotificationType.Success,
      Warning: NotificationType.Warning,
      Error: NotificationType.Error,
    };
    await Haptics.notification({ type: map[type] || NotificationType.Success });
  } catch {
    /* plugin unavailable */
  }
}

/**
 * Double-back-to-exit. Returns true if the press was consumed (hint shown).
 * Second press within window returns false so the caller can exit/minimize.
 */
export function consumeDoubleBackExit(windowMs = 2000) {
  const now = Date.now();
  if (now - lastExitHintAt < windowMs) {
    lastExitHintAt = 0;
    return false;
  }
  lastExitHintAt = now;
  return true;
}

export function resetDoubleBackExit() {
  lastExitHintAt = 0;
}

/**
 * Sync status bar colors with the active screen.
 * Navigation bar color is set in android styles (static Material chrome).
 */
export async function syncNativeSystemBars({ backgroundColor, darkContent }) {
  if (!isNativeCapacitorPlatform()) return;
  const color = backgroundColor || '#fffdf7';
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: darkContent ? Style.Light : Style.Dark });
    await StatusBar.setBackgroundColor({ color });
  } catch {
    /* ignore */
  }
}

export async function hideNativeSplash(fadeOutDuration = 400) {
  if (!isNativeCapacitorPlatform()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration });
  } catch {
    /* ignore */
  }
}

/** Open http(s) links in Android Custom Tabs / in-app browser on native. */
export async function openExternalUrl(url) {
  if (!url || typeof url !== 'string') return;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return;

  if (isNativeCapacitorPlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: trimmed });
      return;
    } catch (err) {
      console.warn('Browser.open failed', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.open(trimmed, '_blank', 'noopener,noreferrer');
  }
}

/** System share sheet (native) / Web Share API / clipboard fallback. */
export async function shareContent({ title, text, url, dialogTitle } = {}) {
  const payload = {
    title: title || 'SmartLineman',
    text: text || '',
    url: url || undefined,
    dialogTitle: dialogTitle || title || 'Share',
  };

  if (isNativeCapacitorPlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share(payload);
      return true;
    } catch (err) {
      if (err?.message && /cancel|abort/i.test(String(err.message))) return false;
      console.warn('Share.share failed', err);
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return true;
    } catch {
      return false;
    }
  }

  try {
    const clip = [payload.text, payload.url].filter(Boolean).join('\n');
    if (clip && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(clip);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Keyboard height → CSS var; Android back dispatches LIFO handlers.
 * Call once from main.jsx on native.
 */
export async function initNativeAndroidUx() {
  if (!isNativeCapacitorPlatform() || uxInitialized) return;
  uxInitialized = true;

  document.documentElement.classList.add('native-android');
  document.documentElement.style.setProperty('--keyboard-height', '0px');
  // Soften accidental double-tap zoom / overscroll chrome on Android WebView
  document.documentElement.style.touchAction = 'manipulation';

  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    if (KeyboardResize?.Body != null) {
      await Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});
    }
    const setHeight = (px) => {
      document.documentElement.style.setProperty('--keyboard-height', `${Math.max(0, px || 0)}px`);
    };
    Keyboard.addListener('keyboardWillShow', (info) => setHeight(info?.keyboardHeight));
    Keyboard.addListener('keyboardDidShow', (info) => setHeight(info?.keyboardHeight));
    Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    Keyboard.addListener('keyboardDidHide', () => setHeight(0));
  } catch {
    /* ignore */
  }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      for (let i = backHandlers.length - 1; i >= 0; i -= 1) {
        try {
          if (backHandlers[i]()) return;
        } catch (err) {
          console.warn('Native back handler failed', err);
        }
      }
      // No shell handler registered yet — send to background.
      if (typeof App.minimizeApp === 'function') {
        App.minimizeApp().catch(() => App.exitApp());
      } else {
        App.exitApp();
      }
    });
  } catch {
    /* ignore */
  }
}
