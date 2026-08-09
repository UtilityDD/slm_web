import { toNativeRemoteUrl } from './nativeRemoteAssets';

const LOCAL_QUIZ_IMAGE_DIR = '/images/quizzes/';

export const extractDriveFileId = (url) => {
    if (!url || typeof url !== 'string') return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)\/|[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? (match[1] || match[2] || '') : '';
};

export const extractDriveIdFromMediaRef = (ref) => {
    const trimmed = String(ref || '').trim();
    if (!trimmed) return '';
    const fromDrive = extractDriveFileId(trimmed);
    if (fromDrive) return fromDrive;
    const localMatch = trimmed.match(/(?:^|\/)img_([a-zA-Z0-9_-]+)\.(?:jpg|jpeg|png|webp)$/i);
    return localMatch ? localMatch[1] : '';
};

export const toLocalQuizImagePath = (ref) => {
    const trimmed = String(ref || '').trim();
    if (!trimmed) return '';
    let path = '';
    if (trimmed.startsWith(`${LOCAL_QUIZ_IMAGE_DIR}`)) path = trimmed;
    else if (trimmed.startsWith('/')) path = trimmed;
    else if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        path = `${LOCAL_QUIZ_IMAGE_DIR}${trimmed}`;
    } else {
        const driveId = extractDriveIdFromMediaRef(trimmed);
        path = driveId ? `${LOCAL_QUIZ_IMAGE_DIR}img_${driveId}.jpg` : '';
    }
    return path ? toNativeRemoteUrl(path) : '';
};

/** Local file first, then Drive fallbacks — works for both img_* and Drive sheet cells. */
export const buildImageFallbackCandidates = (rawUrl) => {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return [];

    const candidates = [];
    const localPath = toLocalQuizImagePath(trimmed);
    if (localPath) candidates.push(localPath);

    const driveId = extractDriveIdFromMediaRef(trimmed);
    if (driveId) {
        [
            `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`,
            `https://drive.google.com/uc?export=view&id=${driveId}`,
            `https://lh3.googleusercontent.com/d/${driveId}=w1200`,
        ].forEach((url) => {
            if (!candidates.includes(url)) candidates.push(url);
        });
    } else if (trimmed.includes('drive.google.com')) {
        const id = extractDriveFileId(trimmed);
        if (id) {
            [
                `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
                `https://drive.google.com/uc?export=view&id=${id}`,
                `https://lh3.googleusercontent.com/d/${id}=w1200`,
            ].forEach((url) => {
                if (!candidates.includes(url)) candidates.push(url);
            });
        }
    } else if ((trimmed.startsWith('http://') || trimmed.startsWith('https://')) && !candidates.includes(trimmed)) {
        candidates.push(trimmed);
    }

    return candidates;
};

export const toDisplayImageUrl = (url) => buildImageFallbackCandidates(url)[0] || '';

export const isImageOption = (option) => {
    const value = String(option || '').trim().toLowerCase();
    return (
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('/') ||
        value.includes('.png') ||
        value.includes('.jpg') ||
        value.includes('.jpeg') ||
        value.includes('.webp') ||
        value.includes('.gif')
    );
};

export const handleImageLoadError = (event, originalUrl) => {
    const img = event.currentTarget;
    if (!img) return true;

    const candidates = buildImageFallbackCandidates(originalUrl);
    if (!candidates.length) return true;

    const currentIndex = Number.parseInt(img.dataset.fallbackIndex || '0', 10);
    const nextIndex = currentIndex + 1;

    if (nextIndex < candidates.length) {
        img.dataset.fallbackIndex = String(nextIndex);
        img.src = candidates[nextIndex];
        return false;
    }
    return true;
};
