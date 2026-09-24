import { SAFETY_LIBRARY_ITEMS } from '../data/safetyLibraryItems';
import { firstPracticeImage, isIdentifyPracticeItem } from './safetyLibraryPractice';
import { toSafetyLibraryDisplayUrl } from './safetyLibraryImageUrl';
import { toDisplayImageUrl } from './visualQuizImageUtils';
import {
    collectHourlyImageUrls,
    uniqueImageUrls,
} from './quizImageGate';

const CONCURRENCY = 3;
const GAP_MS = 60;

const warmed = new Set();
const pending = [];
let running = 0;
let pumpTimer = 0;

function shouldSkipPrefetch() {
    if (typeof navigator === 'undefined') return true;
    if (navigator.onLine === false) return true;
    try {
        if (navigator.connection?.saveData) return true;
    } catch {
        /* ignore */
    }
    return false;
}

function loadOne(src) {
    return new Promise((resolve) => {
        if (!src || typeof Image === 'undefined') {
            resolve();
            return;
        }
        const img = new Image();
        img.onload = () => {
            warmed.add(src);
            resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
    });
}

function pump() {
    while (running < CONCURRENCY && pending.length) {
        const src = pending.shift();
        if (!src || warmed.has(src)) continue;
        running += 1;
        loadOne(src).finally(() => {
            running -= 1;
            if (!pending.length) return;
            window.clearTimeout(pumpTimer);
            pumpTimer = window.setTimeout(pump, GAP_MS);
        });
    }
}

function enqueueDisplayUrls(urls) {
    if (shouldSkipPrefetch()) return;
    uniqueImageUrls(urls).forEach((url) => {
        if (warmed.has(url) || pending.includes(url)) return;
        pending.push(url);
    });
    if (typeof window === 'undefined') return;
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(pump, { timeout: 2500 });
    } else {
        pump();
    }
}

/** First photo of each Identify-playable item — the set the live quiz actually shows. */
export function collectIdentifyCatalogUrls(items = SAFETY_LIBRARY_ITEMS) {
    return uniqueImageUrls(
        (items || [])
            .filter(isIdentifyPracticeItem)
            .map((item) => firstPracticeImage(item))
    );
}

export function collectHourlyBankUrls(questions) {
    return uniqueImageUrls(
        (Array.isArray(questions) ? questions : []).flatMap((question) => collectHourlyImageUrls(question))
    );
}

/** Warm HTTP cache only. No database, no second photo store. */
export function prefetchIdentifyCatalog(items) {
    enqueueDisplayUrls(
        collectIdentifyCatalogUrls(items).map((url) => toSafetyLibraryDisplayUrl(url))
    );
}

export function prefetchHourlyBank(questions) {
    enqueueDisplayUrls(
        collectHourlyBankUrls(questions).map((url) => toDisplayImageUrl(url))
    );
}
