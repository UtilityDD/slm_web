/**
 * Sponsor full-screen ad.
 *
 * Rotation: every clock hour alternates between
 *   - the live paid/sponsor ad from Supabase (when available), and
 *   - the built-in invite (“স্পনসর চাই”) demo ad.
 *
 * Gate: at most one interstitial per clock hour per browser session
 * (sessionStorage hour bucket), not once-forever per ad id.
 */

import { supabase } from '../supabaseClient';

const HOUR_MS = 60 * 60 * 1000;
const HOUR_SEEN_PREFIX = 'slm_sponsor_ad_hour_';

/** Built-in inviting / “sponsor wanted” ad (same content as Admin SPONSOR_ASK_PRESET). */
export const INVITE_SPONSOR_AD = {
    id: 'slm-invite-sponsor-ask',
    headline: 'স্পনসর চাই',
    headlines: ['স্পনসর চাই', 'আমরা নন-প্রফিট', 'বিজ্ঞাপনে স্পনসর হোন'],
    subtext:
        'স্মার্ট লাইনম্যান একটি নন-প্রফিট উদ্যোগ। পুরস্কারের জন্য স্পনসরদের ধন্যবাদ। বিজ্ঞাপনের মাধ্যমে আমাদের স্পনসর হতে পারেন—দোকান, ব্যবসা, ফার্ম, ঠিকাদার।',
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

export function currentSponsorHourBucket(nowMs = Date.now()) {
    return Math.floor(nowMs / HOUR_MS);
}

function hourSeenKey(nowMs = Date.now()) {
    return `${HOUR_SEEN_PREFIX}${currentSponsorHourBucket(nowMs)}`;
}

/** True if an ad was already shown during this clock hour (this browser session). */
export function hasSeenSponsorAd(_adId, nowMs = Date.now()) {
    try {
        return sessionStorage.getItem(hourSeenKey(nowMs)) === '1';
    } catch {
        return false;
    }
}

/** Mark this clock hour as shown for the current browser session. */
export function markSponsorAdSeen(_adId, nowMs = Date.now()) {
    try {
        sessionStorage.setItem(hourSeenKey(nowMs), '1');
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
