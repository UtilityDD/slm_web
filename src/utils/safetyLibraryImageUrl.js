import { toNativeRemoteUrl } from './nativeRemoteAssets';

/**
 * Safety Library sheet images are Google Drive share links.
 * PWA Chrome often loads lh3 fine; Capacitor WebView (localhost) frequently fails
 * on lh3/u/0 — use the same Drive fallback chain as visual quizzes.
 */

export function extractSafetyLibraryDriveId(url) {
    if (!url || typeof url !== 'string') return '';
    const match = url.trim().match(/\/d\/([a-zA-Z0-9_-]+)\/|[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] || match[2] || '' : '';
}

/** Ordered candidates: hosted relative path (rewritten on native), then Drive URLs that work in WebView. */
export function buildSafetyLibraryImageCandidates(rawUrl) {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return [];

    const candidates = [];
    const push = (url) => {
        if (url && !candidates.includes(url)) candidates.push(url);
    };

    if (trimmed.startsWith('/')) {
        push(toNativeRemoteUrl(trimmed));
    } else if (!/^https?:\/\//i.test(trimmed) && !trimmed.includes('drive.google.com')) {
        push(toNativeRemoteUrl(trimmed.startsWith('assets/') ? `/${trimmed}` : trimmed));
    }

    const driveId = extractSafetyLibraryDriveId(trimmed);
    if (driveId) {
        push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`);
        push(`https://drive.google.com/uc?export=view&id=${driveId}`);
        push(`https://lh3.googleusercontent.com/d/${driveId}=w1200`);
        push(`https://lh3.googleusercontent.com/u/0/d/${driveId}`);
    } else if (/^https?:\/\//i.test(trimmed)) {
        push(trimmed);
    }

    return candidates;
}

export function toSafetyLibraryDisplayUrl(url) {
    return buildSafetyLibraryImageCandidates(url)[0] || '';
}

/** Walk fallbacks on <img onError>. Returns true when all candidates exhausted. */
export function handleSafetyLibraryImageError(event, originalUrl) {
    const img = event?.currentTarget;
    if (!img) return true;

    const candidates = buildSafetyLibraryImageCandidates(originalUrl);
    if (!candidates.length) return true;

    const currentIndex = Number.parseInt(img.dataset.fallbackIndex || '0', 10);
    const nextIndex = currentIndex + 1;

    if (nextIndex < candidates.length) {
        img.dataset.fallbackIndex = String(nextIndex);
        img.src = candidates[nextIndex];
        return false;
    }
    return true;
}
