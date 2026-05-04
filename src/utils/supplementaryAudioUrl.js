/**
 * Life Skills listen accepts:
 * - GitHub raw or release asset URLs (public hosting), or
 * - Same-origin paths under /audio/ (e.g. public/audio/ in this repo — works when GitHub audio is private).
 */
export function isValidSupplementaryListenUrl(url) {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith('/audio/') && !u.includes('..')) {
    return u.length > '/audio/'.length;
  }
  if (!u.startsWith('https://')) return false;
  try {
    const { hostname, pathname } = new URL(u);
    const host = hostname.toLowerCase();
    if (host === 'raw.githubusercontent.com') return pathname.length > 1;
    if (host === 'github.com' && pathname.toLowerCase().includes('/releases/download/')) return pathname.length > 1;
    return false;
  } catch {
    return false;
  }
}

/** Pick hosted lesson audio URL for the active UI language. */
export function pickSupplementaryListenSrc(module, language) {
  const en = typeof module?.audio_url_en === 'string' ? module.audio_url_en.trim() : '';
  const bn = typeof module?.audio_url_bn === 'string' ? module.audio_url_bn.trim() : '';
  const pick = language === 'bn' ? bn || en : en || bn;
  return isValidSupplementaryListenUrl(pick) ? pick : '';
}
