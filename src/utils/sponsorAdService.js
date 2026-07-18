/**
 * Sponsor full-screen ad: fetch the currently-live ad and gate it to once per
 * browser session (per ad id). Uses Supabase RPC `get_active_sponsor_ad`, which
 * only returns an ad that is enabled AND inside its date range.
 */

import { supabase } from '../supabaseClient';

const SEEN_KEY_PREFIX = 'slm_sponsor_ad_seen_';

let activeAdPromise = null;

function seenKey(adId) {
    return `${SEEN_KEY_PREFIX}${adId}`;
}

/** True if this ad has already been shown in the current browser session. */
export function hasSeenSponsorAd(adId) {
    if (!adId) return true;
    try {
        return sessionStorage.getItem(seenKey(adId)) === '1';
    } catch {
        return false;
    }
}

/** Mark this ad as shown for the current browser session. */
export function markSponsorAdSeen(adId) {
    if (!adId) return;
    try {
        sessionStorage.setItem(seenKey(adId), '1');
    } catch {
        // private mode / quota — worst case it shows again next navigation
    }
}

/** Fetch the active sponsor ad (deduped per app load). Returns row or null. */
export function fetchActiveSponsorAd({ forceRefresh = false } = {}) {
    if (forceRefresh) activeAdPromise = null;
    if (!activeAdPromise) {
        activeAdPromise = (async () => {
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
    return activeAdPromise;
}
