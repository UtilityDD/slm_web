import { Capacitor } from '@capacitor/core';
import { WEBSITE_URL } from '../config';
import { LOADER_IMAGES } from '../components/loaders/loaderImages';

const LIVE_ORIGIN = WEBSITE_URL.replace(/\/$/, '');

/** Packed in APK — never rewrite these to the live site. */
const LOCAL_PACKED = new Set([
  ...LOADER_IMAGES,
  '/assets/emotional/lineman.webp',
  '/assets/emotional/child.webp',
  '/assets/emotional/wife.webp',
  '/assets/emotional/mother.webp',
  '/assets/emotional/eyes.webp',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/favicon.ico',
]);

const LOCAL_PACKED_PREFIXES = ['/assets/emotional/'];

/** Paths removed from the APK and served from the live site. */
const REMOTE_PREFIXES = [
  '/images/',
  '/audio/',
  '/prizes/',
  '/icons/',
  '/assets/3d_icons/',
  '/assets/covers/',
  '/assets/safety/',
  '/assets/share_linked_image/',
  '/assets/sponsor/',
  '/assets/supplementary/',
  '/quizzes/faq_images/',
  '/quizzes/images/',
];

const REMOTE_MEDIA_IN_QUIZZES = /\.(png|jpe?g|webp|gif|svg|mp3|wav|ogg|m4a|mp4|webm|lottie)$/i;

function isNative() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function pathFromUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  if (/^(https?:|data:|blob:|capacitor:|content:|file:)/i.test(raw)) {
    try {
      if (/^https?:\/\//i.test(raw)) {
        const u = new URL(raw);
        if (u.origin === window.location.origin) return `${u.pathname}${u.search}`;
      }
    } catch {
      /* ignore */
    }
    return '';
  }
  if (raw.startsWith('/')) return raw;
  try {
    const u = new URL(raw, window.location.origin);
    return `${u.pathname}${u.search}`;
  } catch {
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
}

function isLocalPacked(pathOnly) {
  if (LOCAL_PACKED.has(pathOnly)) return true;
  return LOCAL_PACKED_PREFIXES.some((prefix) => pathOnly.startsWith(prefix));
}

function shouldRemote(pathWithQuery) {
  if (!pathWithQuery) return false;
  const pathOnly = pathWithQuery.split(/[?#]/)[0];
  if (isLocalPacked(pathOnly)) return false;
  if (REMOTE_PREFIXES.some((prefix) => pathOnly.startsWith(prefix))) return true;
  if (pathOnly.startsWith('/quizzes/') && REMOTE_MEDIA_IN_QUIZZES.test(pathOnly)) return true;
  return false;
}

/**
 * On Capacitor, rewrite heavy local media paths to the live website.
 * Web/PWA paths are unchanged.
 */
export function toNativeRemoteUrl(url) {
  if (!isNative() || url == null || typeof url !== 'string') return url;
  if (/^(https?:|data:|blob:|capacitor:|content:|file:)/i.test(url)) {
    try {
      const u = new URL(url);
      if (u.origin === window.location.origin && shouldRemote(`${u.pathname}${u.search}`)) {
        return `${LIVE_ORIGIN}${u.pathname}${u.search}${u.hash}`;
      }
    } catch {
      /* ignore */
    }
    return url;
  }
  const path = pathFromUrl(url);
  if (!shouldRemote(path)) return url;
  return `${LIVE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

function patchProperty(proto, prop) {
  const desc = Object.getOwnPropertyDescriptor(proto, prop);
  if (!desc || !desc.set || !desc.get || desc.configurable === false) return;
  Object.defineProperty(proto, prop, {
    configurable: true,
    enumerable: desc.enumerable,
    get() {
      return desc.get.call(this);
    },
    set(value) {
      desc.set.call(this, toNativeRemoteUrl(value));
    },
  });
}

function warmImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Warm packed first-paint assets immediately, then quietly prefetch a few
 * common remote screens so the first session feels lag-less.
 */
export function prefetchNativeEssentials() {
  if (typeof window === 'undefined' || !isNative()) return;

  const packed = [...LOCAL_PACKED];
  const remoteWarm = [
    `${LIVE_ORIGIN}/images/loader/helmet.webp`, // no-op if local already
  ].filter((url) => !packed.some((p) => url.endsWith(p)));

  // Local pack first (sync kickoff)
  packed.forEach((src) => {
    warmImage(src);
  });

  // After first paint, warm a tiny remote set (landing brand already local)
  const runRemote = () => {
    remoteWarm.forEach((src) => warmImage(src));
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(runRemote, { timeout: 2500 });
  } else {
    setTimeout(runRemote, 1200);
  }
}

/**
 * Install once at startup (before React). Rewrites img/audio/video/fetch for native.
 */
export function installNativeRemoteAssets() {
  if (typeof window === 'undefined' || !isNative()) return;
  if (window.__slmNativeRemoteAssets) return;
  window.__slmNativeRemoteAssets = true;

  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string') {
      return origFetch(toNativeRemoteUrl(input), init);
    }
    if (typeof Request !== 'undefined' && input instanceof Request) {
      const next = toNativeRemoteUrl(input.url);
      if (next !== input.url) {
        return origFetch(new Request(next, input), init);
      }
    }
    return origFetch(input, init);
  };

  patchProperty(HTMLImageElement.prototype, 'src');
  patchProperty(HTMLImageElement.prototype, 'srcset');
  if (typeof HTMLAudioElement !== 'undefined') patchProperty(HTMLAudioElement.prototype, 'src');
  if (typeof HTMLVideoElement !== 'undefined') {
    patchProperty(HTMLVideoElement.prototype, 'src');
    patchProperty(HTMLVideoElement.prototype, 'poster');
  }
  if (typeof HTMLSourceElement !== 'undefined') patchProperty(HTMLSourceElement.prototype, 'src');

  const origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function setAttribute(name, value) {
    if (
      typeof name === 'string' &&
      typeof value === 'string' &&
      (name === 'src' || name === 'srcset' || name === 'poster') &&
      (this instanceof HTMLImageElement ||
        this instanceof HTMLAudioElement ||
        this instanceof HTMLVideoElement ||
        this instanceof HTMLSourceElement)
    ) {
      return origSetAttribute.call(this, name, toNativeRemoteUrl(value));
    }
    return origSetAttribute.call(this, name, value);
  };
}
