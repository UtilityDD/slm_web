// App Configuration
export const APP_NAME = "SmartLineman.in";
export const API_URL = import.meta.env.VITE_SUPABASE_URL;
/** Bump on each release — web clients compare this to prompt refresh when stale. */
export const CURRENT_APP_VERSION = "1.3.87";
/** Shown in the update modal when CURRENT_APP_VERSION changes. */
export const CURRENT_APP_RELEASE_NOTES = {
  en: "v1.3.87 — Rank trophy icon stays clear when selected; full-screen lessons clear the Android status bar. Refresh once on web / install the new APK on phone.",
  bn: "v1.3.87 — Rank আইকন সিলেক্টে ঠিক থাকে; ফুল-স্ক্রিন পাঠ অ্যান্ড্রয়েড স্ট্যাটাস বারের নিচে। ওয়েবে একবার রিফ্রেশ / ফোনে নতুন APK ইনস্টল করুন।",
};
export const WEBSITE_URL = "https://smartlineman.in";
export const SUPPORT_EMAIL = "support@smartlineman.in";

/**
 * Native Android sideload channel (Capacitor APK).
 * Keep ANDROID_VERSION_CODE / CURRENT_APP_VERSION in sync with android/app/build.gradle
 * and public/android-latest.json on every APK release. PWA uses CURRENT_APP_VERSION only.
 */
export const ANDROID_VERSION_CODE = 87;
/** Absolute URL so the APK checks the live site, not bundled localhost assets. */
export const ANDROID_LATEST_MANIFEST_URL = `${WEBSITE_URL}/android-latest.json`;
export const ANDROID_DOWNLOAD_PAGE_URL = `${WEBSITE_URL}/download`;

/**
 * Core training: +20 reading points again every 30 days (frontend-only; no RPC/DB changes).
 * Rollback: set to false — first-time lesson_bonus_<id> awards keep working; no new day-stamped claims.
 */
export const CORE_LESSON_MONTHLY_BONUS_ENABLED = true;

/**
 * Soft-start for legacy lesson_bonus_<id> rows whose created_at is often join-date backfill.
 * Pre-launch awards are treated as claimed at this instant so users cannot mass-claim on day one.
 * Day-stamped claims and post-launch first completions use their real created_at.
 * Use start-of-day UTC so local afternoon (IST) does not push the wait to "31 days".
 */
export const CORE_LESSON_MONTHLY_BONUS_LAUNCH_ISO = '2026-07-25T00:00:00.000Z';
