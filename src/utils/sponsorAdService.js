/**
 * Sponsor bottom strip (Standing-card style).
 *
 * Content rotation: every clock hour alternates between
 *   - the live paid/sponsor ad from Supabase (when available), and
 *   - the built-in invite (“স্পনসর চাই”) demo ad.
 *
 * Show frequency: every other app open (1st, 3rd, 5th…), then at most
 * once within that open (session flag after dismiss).
 */

import { supabase } from '../supabaseClient';

const HOUR_MS = 60 * 60 * 1000;
const APP_OPEN_COUNT_KEY = 'slm_sponsor_ad_app_opens';
const OPEN_ELIGIBLE_KEY = 'slm_sponsor_ad_open_eligible';
const OPEN_SHOWN_KEY = 'slm_sponsor_ad_open_shown';

/** Built-in inviting / “sponsor wanted” ad (same content as Admin SPONSOR_ASK_PRESET). */
export const INVITE_SPONSOR_AD = {
    id: 'slm-invite-sponsor-ask',
    headline: 'স্পনসর চাই',
    headlines: ['স্পনসর চাই', 'আমরা নন-প্রফিট', 'বিজ্ঞাপনে স্পনসর হোন'],
    subtext:
        'নন-প্রফিট উদ্যোগ। পুরস্কারে স্পনসরদের ধন্যবাদ। দোকান, ব্যবসা বা ফার্ম থেকে বিজ্ঞাপন দিন।',
    sponsor_name: 'স্মার্ট লাইনম্যান',
    image_url: '/images/sponsor/sponsor_ad_slot.webp',
    logo_url: null,
    contact_phone: null,
    contact_email: 'support@smartlineman.in',
    contact_url: null,
    cta_label: 'যোগাযোগ করুন',
    theme: 'dark',
    display_seconds: 10,
    allow_skip: true,
    contact_safety_mitra: true,
    is_active: true,
};

let dbAdPromise = null;
let appOpenCounted = false;

export function currentSponsorHourBucket(nowMs = Date.now()) {
    return Math.floor(nowMs / HOUR_MS);
}

/**
 * Call once per app boot. Increments open count and marks whether
 * this open is eligible for the interstitial (odd opens: 1, 3, 5…).
 */
export function beginSponsorAdAppOpen() {
    if (appOpenCounted) {
        try {
            return sessionStorage.getItem(OPEN_ELIGIBLE_KEY) === '1';
        } catch {
            return false;
        }
    }
    appOpenCounted = true;
    try {
        const n = (Number(localStorage.getItem(APP_OPEN_COUNT_KEY)) || 0) + 1;
        localStorage.setItem(APP_OPEN_COUNT_KEY, String(n));
        const eligible = n % 2 === 1;
        sessionStorage.setItem(OPEN_ELIGIBLE_KEY, eligible ? '1' : '0');
        sessionStorage.removeItem(OPEN_SHOWN_KEY);
        return eligible;
    } catch {
        return true;
    }
}

/** True if ad should not show again this open (ineligible open, or already shown). */
export function hasSeenSponsorAd(_adId) {
    try {
        if (sessionStorage.getItem(OPEN_ELIGIBLE_KEY) !== '1') return true;
        return sessionStorage.getItem(OPEN_SHOWN_KEY) === '1';
    } catch {
        return false;
    }
}

/** Mark interstitial as shown for the current app open. */
export function markSponsorAdSeen(_adId) {
    try {
        sessionStorage.setItem(OPEN_SHOWN_KEY, '1');
    } catch {
        // private mode / quota — worst case it shows again next navigation
    }
}

/**
 * Pick paid vs invite from the wall clock.
 * Even hour buckets → paid (fallback invite). Odd → invite.
 */
export function selectHourlySponsorAd(dbAd, nowMs = Date.now()) {
    const invite = INVITE_SPONSOR_AD;
    const paid = dbAd && dbAd.contact_safety_mitra !== true ? dbAd : null;
    const usePaidSlot = currentSponsorHourBucket(nowMs) % 2 === 0;
    if (usePaidSlot && paid) return paid;
    return invite;
}

/** Fetch DB ad (deduped), then apply hourly paid ↔ invite rotation. */
export function fetchActiveSponsorAd({ forceRefresh = false } = {}) {
    if (forceRefresh) dbAdPromise = null;
    if (!dbAdPromise) {
        dbAdPromise = (async () => {
            try {
                const { data, error } = await supabase.rpc('get_active_sponsor_ad');
                if (error) throw error;
                const row = Array.isArray(data) ? data[0] : data;
                return row || null;
            } catch (err) {
                console.error('Error fetching sponsor ad:', err);
                return null;
            }
        })();
    }
    return dbAdPromise.then((dbAd) => selectHourlySponsorAd(dbAd));
}
