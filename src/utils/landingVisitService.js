/**
 * App visit counter via Vercel Redis (/api/landing-visits). No Supabase.
 * Counts once per browser session for all users (guest + logged in).
 * Native Android loads the live site API (local Capacitor origin has no /api).
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { WEBSITE_URL } from '../config';

const SESSION_KEY = 'slm_app_visit_recorded_v1';
const API_PATH = '/api/landing-visits';
const STATIC_PATH = '/landing-views.json';
const LIVE_ORIGIN = WEBSITE_URL.replace(/\/$/, '');

let visitTrackPromise = null;

function parseCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count >= 0 ? count : null;
}

function isNative() {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}

function resolveUrl(path) {
    if (isNative()) return `${LIVE_ORIGIN}${path}`;
    return path;
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
    const url = resolveUrl(API_PATH);

    if (isNative()) {
        const response = await CapacitorHttp.request({
            url,
            method: increment ? 'POST' : 'GET',
            headers: { Accept: 'application/json' },
        });
        if (response.status < 200 || response.status >= 300) return null;
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        return parseCount(data?.count);
    }

    const res = await fetch(url, {
        method: increment ? 'POST' : 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseCount(data?.count);
}

async function fetchStaticCount() {
    const url = resolveUrl(STATIC_PATH);

    if (isNative()) {
        const response = await CapacitorHttp.request({
            url,
            method: 'GET',
            headers: { Accept: 'application/json' },
        });
        if (response.status < 200 || response.status >= 300) return null;
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        return parseCount(data?.count);
    }

    const res = await fetch(url, { cache: 'no-store' });
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
