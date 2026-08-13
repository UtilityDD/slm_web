import { useEffect, useState } from 'react';
import { clearCachedAvatar, ensureAvatarCached, readCachedAvatar } from '../utils/avatarCache';
import { AVATAR_EDGE, avatarDisplayUrl } from '../utils/avatarImage';

/**
 * Instant avatar from local cache, then quietly sync when remote URL arrives.
 * @param {string|undefined} userId
 * @param {string|null|undefined} remoteUrl — from profile when loaded
 * @param {boolean} profileReady — true once profile fetch has resolved for this session
 */
export function useCachedAvatar(userId, remoteUrl, profileReady = false) {
  const [src, setSrc] = useState(() => {
    if (!userId) return null;
    return readCachedAvatar(userId)?.dataUrl || null;
  });

  useEffect(() => {
    if (!userId) {
      setSrc(null);
      return undefined;
    }

    // Profile still loading — keep any local cache for instant paint.
    if (!profileReady) {
      const cached = readCachedAvatar(userId);
      if (cached?.dataUrl) setSrc(cached.dataUrl);
      return undefined;
    }

    if (!remoteUrl) {
      clearCachedAvatar(userId);
      setSrc(null);
      return undefined;
    }

    let cancelled = false;
    const cached = readCachedAvatar(userId);
    if (cached?.dataUrl) {
      setSrc(cached.dataUrl);
    } else {
      setSrc(avatarDisplayUrl(remoteUrl, AVATAR_EDGE.full) || remoteUrl);
    }

    ensureAvatarCached(userId, remoteUrl).then((next) => {
      if (!cancelled && next) setSrc(next);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, remoteUrl, profileReady]);

  return src;
}
