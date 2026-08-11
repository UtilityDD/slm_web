/**
 * Instant local avatar cache for repeat logins on the same device.
 * Stores a small JPEG data-URL in localStorage keyed by user id.
 */

const KEY_PREFIX = 'slm_avatar_v1_';
const MAX_EDGE = 192;
const JPEG_QUALITY = 0.72;

function storageKey(userId) {
  return `${KEY_PREFIX}${userId}`;
}

/** Sync read — use for first paint before network profile arrives. */
export function readCachedAvatar(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.dataUrl || typeof parsed.dataUrl !== 'string') return null;
    return {
      src: typeof parsed.src === 'string' ? parsed.src : '',
      dataUrl: parsed.dataUrl,
      ts: Number(parsed.ts) || 0,
    };
  } catch {
    return null;
  }
}

export function clearCachedAvatar(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('avatar image load failed'));
    // Remote avatars (Supabase) — anonymous CORS usually allowed for public buckets.
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = src;
  });
}

async function compressToDataUrl(remoteUrl) {
  const img = await loadImage(remoteUrl);
  const w = img.naturalWidth || img.width || MAX_EDGE;
  const h = img.naturalHeight || img.height || MAX_EDGE;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(img, 0, 0, cw, ch);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/**
 * Ensure local cache matches remote URL. Returns displayable src (data URL or remote).
 */
export async function ensureAvatarCached(userId, remoteUrl) {
  if (!userId) return null;
  if (!remoteUrl) {
    clearCachedAvatar(userId);
    return null;
  }

  const existing = readCachedAvatar(userId);
  if (existing?.src === remoteUrl && existing.dataUrl) {
    return existing.dataUrl;
  }

  try {
    const dataUrl = await compressToDataUrl(remoteUrl);
    try {
      localStorage.setItem(
        storageKey(userId),
        JSON.stringify({ src: remoteUrl, dataUrl, ts: Date.now() })
      );
    } catch {
      // Quota — still return the compressed data URL for this session.
    }
    return dataUrl;
  } catch (err) {
    console.warn('Avatar cache failed, using remote URL:', err);
    return remoteUrl;
  }
}
