/**
 * App visit counter via Vercel Redis (/api/landing-visits). No Supabase.
 * Counts once per browser session for all users (guest + logged in).
 */

const SESSION_KEY = 'slm_app_visit_recorded_v1';
const API_PATH = '/api/landing-visits';

let visitTrackPromise = null;

function parseCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count >= 0 ? count : null;
}

function getSessionFlag() {
    try {
        return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
        return false;
    }
}

function setSessionFlag() {
    try {
        sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
        // private mode / quota
    }
}

async function fetchFromApi(increment) {
    const res = await fetch(API_PATH, {
        method: increment ? 'POST' : 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseCount(data?.count);
}

async function fetchStaticCount() {
    const res = await fetch('/landing-views.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return parseCount(data?.count);
}

function estimateFromUsers(registeredUsers) {
    const users = Number(registeredUsers);
    if (!Number.isFinite(users) || users <= 0) return null;
    return Math.round(users * 3.5 + 1800);
}

async function resolveFallbackCount(registeredUsers) {
    try {
        const fromFile = await fetchStaticCount();
        if (fromFile != null) return fromFile;
    } catch {
        // static file missing
    }

    const baseline = parseCount(import.meta.env.VITE_LANDING_VISIT_BASELINE);
    if (baseline != null) return baseline;

    return estimateFromUsers(registeredUsers);
}

/** Increment once per session; safe to call from multiple components (deduped). */
export function trackAppVisit({ registeredUsers = 0 } = {}) {
    if (!visitTrackPromise) {
        visitTrackPromise = (async () => {
            const shouldIncrement = !getSessionFlag();

            try {
                const fromApi = await fetchFromApi(shouldIncrement);
                if (fromApi != null) {
                    if (shouldIncrement) setSessionFlag();
                    return fromApi;
                }
            } catch {
                // API unavailable (local dev without vercel dev)
            }

            return resolveFallbackCount(registeredUsers);
        })();
    }
    return visitTrackPromise;
}

/** Read current count for display (reuses in-flight / completed track promise). */
export function fetchVisitCount(options) {
    return trackAppVisit(options);
}
