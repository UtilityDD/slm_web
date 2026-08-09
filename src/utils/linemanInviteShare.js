import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { WEBSITE_URL } from '../config';
import shareInviteImages from '../data/shareInviteImages.json';

const APP_LINK = (WEBSITE_URL || 'https://smartlineman.in').replace(/\/$/, '');

/** Clean invite copy — learn while playing, win prizes + link. */
export function buildLinemanInviteMessage(language = 'bn') {
  if (language === 'en') {
    return [
      'Learn while you play, win prizes.',
      '',
      'SmartLineman.in — free for linemen.',
      '',
      `👉 ${APP_LINK}`,
    ].join('\n');
  }

  return [
    'খেলতে খেলতে শিখুন, পুরস্কার জিতুন।',
    '',
    'স্মার্ট লাইনম্যান — লাইনম্যানদের জন্য বিনামূল্যে।',
    '',
    `👉 ${APP_LINK}`,
  ].join('\n');
}

export function getShareInviteImageUrls() {
  const list = Array.isArray(shareInviteImages?.images) ? shareInviteImages.images : [];
  return list.filter(Boolean);
}

export function pickRandomShareInviteImage() {
  const images = getShareInviteImageUrls();
  if (!images.length) return null;
  return images[Math.floor(Math.random() * images.length)];
}

function mimeFromPath(filePath = '') {
  const lower = String(filePath).toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

function fileNameFromPath(filePath = '') {
  const parts = String(filePath).split('/');
  return parts[parts.length - 1] || `smartlineman-invite.${mimeFromPath(filePath).split('/')[1] || 'jpg'}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchShareImageBlob(imagePath) {
  const response = await fetch(imagePath, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Could not load share image (${response.status})`);
  }
  return response.blob();
}

async function shareViaWebFiles({ file, text, title }) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  const payload = { files: [file], text, title };
  if (typeof navigator.canShare === 'function' && !navigator.canShare(payload)) {
    return false;
  }
  await navigator.share(payload);
  return true;
}

async function shareViaCapacitorFiles({ blob, fileName, text, title }) {
  if (!Capacitor.isNativePlatform()) return false;

  const base64 = await blobToBase64(blob);
  const cachePath = `share-invite/${fileName}`;
  const saved = await Filesystem.writeFile({
    path: cachePath,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  await Share.share({
    title,
    text,
    files: [saved.uri],
    dialogTitle: title,
  });
  return true;
}

async function shareTextFallback(language, text, title) {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({
        title,
        text,
        url: APP_LINK,
        dialogTitle: title,
      });
      return;
    }
  } catch {
    // Fall through to WhatsApp / clipboard.
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url: APP_LINK });
      return;
    } catch {
      // User cancel or unsupported — try WhatsApp next.
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  try {
    const { openExternalUrl } = await import('./nativeAndroidUx');
    await openExternalUrl(waUrl);
  } catch {
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  }
}

/**
 * Share invite with a random image from public/assets/share_linked_image
 * (landing + More page). Falls back to text-only if no image / share unsupported.
 */
export async function shareLinemanInvite(language = 'bn') {
  const text = buildLinemanInviteMessage(language);
  const title = language === 'en' ? 'SmartLineman.in' : 'স্মার্ট লাইনম্যান';
  const imagePath = pickRandomShareInviteImage();

  if (imagePath) {
    try {
      const blob = await fetchShareImageBlob(imagePath);
      const fileName = fileNameFromPath(imagePath);
      const file = new File([blob], fileName, { type: blob.type || mimeFromPath(imagePath) });

      if (await shareViaWebFiles({ file, text, title })) return;
      if (await shareViaCapacitorFiles({ blob, fileName, text, title })) return;
    } catch (err) {
      console.error('Invite image share failed, falling back to text:', err);
    }
  }

  await shareTextFallback(language, text, title);
}

/** Opens share sheet (image + invite when possible). Same entry used by landing & More. */
export function openLinemanInviteWhatsApp(language = 'bn') {
  void shareLinemanInvite(language);
}
