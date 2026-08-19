/**
 * How-to-use-the-app video series (separate from training Video Guide).
 *
 * Preferred: add entries to /public/guide/appUserGuideVideos.json
 * (order in that file is playback order). This array is the offline fallback.
 *
 * Each item: { id, url or videoId, titleBn, titleEn }
 * url may be shorts / watch / youtu.be / embed, or a raw 11-character id.
 */
export const APP_USER_GUIDE_SHORTS = [
  {
    id: 'life-skill-overview',
    url: 'https://youtube.com/shorts/z9bBzKUku4w',
    titleBn: 'পেশাগত জ্ঞান ও লাইফ স্কিল',
    titleEn: 'Professional knowledge & life skills',
  },
];

export function extractYoutubeVideoId(input) {
  const value = String(input || '').trim();
  if (!value) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  const match = value.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|v\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function normalizeAppGuideVideo(item, index = 0) {
  if (!item || typeof item !== 'object') return null;
  const videoId = extractYoutubeVideoId(item.videoId || item.url || item.youtube_id);
  if (!videoId) return null;
  const titleBn = String(item.titleBn || item.title_bn || item.title || '').trim();
  const titleEn = String(item.titleEn || item.title_en || item.title || '').trim();
  return {
    id: String(item.id || videoId || `guide-${index + 1}`),
    videoId,
    titleBn,
    titleEn,
  };
}

export function normalizeAppGuideSeries(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list
    .map((item, index) => normalizeAppGuideVideo(item, index))
    .filter((item) => {
      if (!item || seen.has(item.videoId)) return false;
      seen.add(item.videoId);
      return true;
    });
}

export function appGuideShortTitle(item, language = 'bn') {
  if (!item) return '';
  return language === 'en'
    ? (item.titleEn || item.titleBn || '')
    : (item.titleBn || item.titleEn || '');
}

export function appGuideShortThumb(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hq2.jpg`;
}

/** Original-aspect poster (best for Shorts); fall back to hq2 on error. */
export function youtubeShortsPoster(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/oardefault.jpg`;
}

export function youtubeShortsEmbedSrc(videoId) {
  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: '0',
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export async function loadAppUserGuideVideos() {
  try {
    const response = await fetch('/guide/appUserGuideVideos.json', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      const list = Array.isArray(data) ? data : data?.videos;
      const normalized = normalizeAppGuideSeries(list);
      if (normalized.length) return normalized;
    }
  } catch {
    // bundled fallback below
  }
  return normalizeAppGuideSeries(APP_USER_GUIDE_SHORTS);
}
