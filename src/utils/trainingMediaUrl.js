/**
 * Training lesson media: JSON may reference /quizzes/ files or full URLs (e.g. Google Sheet → Drive links).
 * Mirrors SafetyLibrary / assetPreloader behaviour for Drive share links.
 */
export function getGoogleDriveDirectLink(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed.includes('drive.google.com')) return trimmed;
    const match = trimmed.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/);
    const id = match ? (match[1] || match[2]) : '';
    const today = new Date().toISOString().split('T')[0];
    return id ? `https://lh3.googleusercontent.com/u/0/d/${id}?v=${today}` : trimmed;
}

/**
 * @param {string} mediaRef – filename under public quizzes, or https://... (Drive / CDN)
 * @returns {string} URL safe for <img src>
 */
export function resolveTrainingMediaSrc(mediaRef) {
    if (!mediaRef || typeof mediaRef !== 'string') return '';
    const s = mediaRef.trim();
    if (/^https?:\/\//i.test(s)) return getGoogleDriveDirectLink(s);
    return `/quizzes/${s.replace(/^\//, '')}`;
}

/** True if reference should render as an image (file ext or Drive / Google image host). */
export function trainingMediaRefLooksLikeImage(mediaRef) {
    if (!mediaRef || typeof mediaRef !== 'string') return false;
    const raw = mediaRef.trim();
    const pathOnly = raw.split(/[?#]/)[0];
    if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(pathOnly)) return true;
    if (/drive\.google\.com/i.test(raw)) return true;
    if (/googleusercontent\.com|ggpht\.com/i.test(raw)) return true;
    return false;
}
