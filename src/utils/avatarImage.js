/**
 * Profile photos: store a small WebP and display that public file as-is.
 * Do not use /storage/v1/render/image — Image Transformations are not on the Free plan.
 */

export const AVATAR_MAX_EDGE = 512;
export const AVATAR_WEBP_QUALITY = 0.8;
export const AVATAR_JPEG_QUALITY = 0.82;
export const AVATAR_PICK_MAX_BYTES = 12 * 1024 * 1024;
/** Longest side for fullscreen sponsor product photos (phone 3x). */
export const SPONSOR_IMAGE_MAX_EDGE = 1280;
export const SPONSOR_LOGO_MAX_EDGE = 512;

export const AVATAR_EDGE = {
    list: 96,
    card: 128,
    podium: 256,
    full: 512,
};

const OBJECT_RE = /\/storage\/v1\/object\/public\/avatars\/([^?]+)/i;
const RENDER_RE = /\/storage\/v1\/render\/image\/public\/avatars\/([^?]+)/i;

export function avatarStoragePath(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    const match = trimmed.match(OBJECT_RE) || trimmed.match(RENDER_RE);
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Public avatar object URL (no image transform). Non-storage URLs (data, Drive) pass through.
 * `edge` is kept for call-site compatibility; stored files are already ~512px.
 */
export function avatarDisplayUrl(url, _edge = AVATAR_EDGE.card) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

    const encodedPath = (trimmed.match(OBJECT_RE) || trimmed.match(RENDER_RE))?.[1];
    if (!encodedPath) return trimmed;

    const originIdx = trimmed.indexOf('/storage/v1/');
    if (originIdx < 0) return trimmed;
    const origin = trimmed.slice(0, originIdx);
    return `${origin}/storage/v1/object/public/avatars/${encodedPath}`;
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) reject(new Error('encode failed'));
            else resolve(blob);
        }, type, quality);
    });
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('photo_unreadable'));
        img.src = src;
    });
}

async function bitmapFromFile(file) {
    if (typeof createImageBitmap === 'function') {
        try {
            return await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
            try {
                return await createImageBitmap(file);
            } catch {
                /* fall through */
            }
        }
    }
    const objectUrl = URL.createObjectURL(file);
    try {
        return await loadImageElement(objectUrl);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function codedError(code, message) {
    const err = new Error(message || code);
    err.code = code;
    return err;
}

/**
 * Downscale a picked photo to WebP (JPEG fallback). Never upscales.
 * @returns {Promise<File>}
 */
export async function compressImageFile(file, {
    maxEdge = AVATAR_MAX_EDGE,
    webpQuality = AVATAR_WEBP_QUALITY,
    jpegQuality = AVATAR_JPEG_QUALITY,
    fillWhite = true,
    fileName = 'image',
} = {}) {
    if (!file) throw codedError('photo_unreadable', 'No file');
    if (file.size > AVATAR_PICK_MAX_BYTES) {
        throw codedError('photo_too_big', 'Photo is too large');
    }

    let source;
    try {
        source = await bitmapFromFile(file);
    } catch {
        throw codedError('photo_unreadable', 'Could not read this photo');
    }

    const cap = Math.max(32, Number(maxEdge) || AVATAR_MAX_EDGE);
    const srcW = source.naturalWidth || source.width || cap;
    const srcH = source.naturalHeight || source.height || cap;
    const scale = Math.min(1, cap / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: !fillWhite });
    if (!ctx) {
        source.close?.();
        throw codedError('photo_unreadable', 'Could not process this photo');
    }
    if (fillWhite) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    } else {
        ctx.clearRect(0, 0, width, height);
    }
    ctx.drawImage(source, 0, 0, width, height);
    source.close?.();

    let blob;
    let ext = 'webp';
    try {
        blob = await canvasToBlob(canvas, 'image/webp', webpQuality);
        if (!blob || blob.type !== 'image/webp' || blob.size < 32) throw new Error('webp unavailable');
    } catch {
        blob = await canvasToBlob(canvas, 'image/jpeg', jpegQuality);
        ext = 'jpg';
    }

    const base = String(fileName || 'image').replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
}

/** Downscale a profile photo to a square-friendly WebP (JPEG fallback). */
export async function compressAvatarFile(file) {
    return compressImageFile(file, {
        maxEdge: AVATAR_MAX_EDGE,
        fillWhite: true,
        fileName: 'avatar',
    });
}

export async function uploadCompressedAvatar(client, userId, file, oldUrl) {
    const compressed = await compressAvatarFile(file);
    const ext = compressed.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const { error } = await client.storage.from('avatars').upload(fileName, compressed, {
        cacheControl: '31536000',
        upsert: true,
        contentType: compressed.type,
    });
    if (error) throw error;

    const { data } = client.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('Missing public URL after avatar upload');

    const oldPath = avatarStoragePath(oldUrl);
    if (oldPath && oldPath !== fileName) {
        try {
            await client.storage.from('avatars').remove([oldPath]);
        } catch (err) {
            console.warn('Could not remove previous avatar:', err);
        }
    }

    return publicUrl;
}

export async function removeStoredAvatar(client, oldUrl) {
    const oldPath = avatarStoragePath(oldUrl);
    if (!oldPath) return;
    const { error } = await client.storage.from('avatars').remove([oldPath]);
    if (error) {
        console.warn('Could not remove avatar file:', error);
    }
}
