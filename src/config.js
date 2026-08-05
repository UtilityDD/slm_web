// App Configuration
export const APP_NAME = "SmartLineman.in";
export const API_URL = import.meta.env.VITE_SUPABASE_URL;
/** Bump on each release — web clients compare this to prompt refresh when stale. */
export const CURRENT_APP_VERSION = "1.3.79";
/** Shown in the update modal when CURRENT_APP_VERSION changes. */
export const CURRENT_APP_RELEASE_NOTES = {
  en: "July 2026 prizes are live — see winners, prizes, and sponsors. Open the monthly leaderboard for a short winners celebration (once per month).",
  bn: "জুলাই ২০২৬-এর পুরস্কার যোগ হয়েছে — বিজয়ী, পুরস্কার ও স্পনসর দেখুন। মাসিক লিডারবোর্ডে সংক্ষিপ্ত বিজয়ী উদযাপন (মাসে একবার)।",
};
export const WEBSITE_URL = "https://smartlineman.in";
export const SUPPORT_EMAIL = "support@smartlineman.in";

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
