/**
 * ৮ মন্ত্র clips live on Supabase Storage (compressed MP3), not Vercel /public.
 * Bucket: public `avatars`, prefix `audio/mantra/`.
 */
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

export const MANTRA_AUDIO_BUCKET = 'avatars';
export const MANTRA_AUDIO_PREFIX = 'audio/mantra';

export function mantraAudioUrl(fileName) {
  const name = String(fileName || '').replace(/^\/+/, '');
  if (!name || !SUPABASE_URL) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${MANTRA_AUDIO_BUCKET}/${MANTRA_AUDIO_PREFIX}/${name}`;
}
