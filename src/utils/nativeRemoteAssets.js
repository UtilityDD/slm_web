import { Capacitor } from '@capacitor/core';
import { WEBSITE_ORIGIN_WWW } from '../config';
import { LOADER_IMAGES } from '../components/loaders/loaderImages';

/** Use www — apex smartlineman.in 308-redirects and breaks some native image loads. */
const LIVE_ORIGIN = WEBSITE_ORIGIN_WWW.replace(/\/$/, '');

/** Packed in APK — never rewrite these to the live site. */
const LOCAL_PACKED = new Set([
  ...LOADER_IMAGES,
  '/assets/emotional/lineman.webp',
  '/assets/emotional/child.webp',
  '/assets/emotional/wife.webp',
  '/assets/emotional/mother.webp',
  '/assets/emotional/eyes.webp',
  '/images/celebrations/har-ghar-tiranga.webp',
  '/images/celebrations/har-ghar-tiranga-desktop.webp',
  '/images/celebrations/independence-day-80.webp',
  '/images/celebrations/independence-day-80-desktop.webp',
  '/images/home-tip-lineman-blank-board.webp',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/favicon.ico',
]);

const LOCAL_PACKED_PREFIXES = ['/assets/emotional/', '/images/ppe-thumbs/'];

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

/** Rewrite each URL in an HTML srcset value (descriptors preserved). */
export function toNativeRemoteSrcSet(srcset) {
  if (!isNative() || srcset == null || typeof srcset !== 'string') return srcset;
  return srcset
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const match = trimmed.match(/^(\S+)(\s+.+)?$/);
      if (!match) return trimmed;
      const [, url, descriptor = ''] = match;
      return `${toNativeRemoteUrl(url)}${descriptor}`;
    })
    .join(', ');
}

function patchProperty(proto, prop, transform = toNativeRemoteUrl) {
  const desc = Object.getOwnPropertyDescriptor(proto, prop);
  if (!desc || !desc.set || !desc.get || desc.configurable === false) return;
  Object.defineProperty(proto, prop, {
    configurable: true,
    enumerable: desc.enumerable,
    get() {
      return desc.get.call(this);
    },
    set(value) {
      desc.set.call(this, transform(value));
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
 * Warm packed first-paint assets immediately (celebration + tip board included).
 */
export function prefetchNativeEssentials() {
  if (typeof window === 'undefined' || !isNative()) return;

  [...LOCAL_PACKED].forEach((src) => {
    warmImage(src);
  });
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
  patchProperty(HTMLImageElement.prototype, 'srcset', toNativeRemoteSrcSet);
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
      const next = name === 'srcset' ? toNativeRemoteSrcSet(value) : toNativeRemoteUrl(value);
      return origSetAttribute.call(this, name, next);
    }
    return origSetAttribute.call(this, name, value);
  };
}
