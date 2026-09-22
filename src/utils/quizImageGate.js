import { useEffect, useState } from 'react';
import { isImageOption, toDisplayImageUrl } from './visualQuizImageUtils';
import { toSafetyLibraryDisplayUrl } from './safetyLibraryImageUrl';

/** Max wait before the scored clock starts even if a picture never arrives. */
export const QUIZ_IMAGE_GATE_MS = 6000;

export function uniqueImageUrls(urls) {
    return [...new Set((Array.isArray(urls) ? urls : []).map((url) => String(url || '').trim()).filter(Boolean))];
}

export function collectIdentifyImageUrls(question, mode) {
    if (!question) return [];
    if (mode === 'grid' || mode === 'clue') {
        return uniqueImageUrls((question.choices || []).map((choice) => choice?.image));
    }
    return uniqueImageUrls([question.image]);
}

export function collectHourlyImageUrls(question) {
    if (!question) return [];
    const urls = [];
    const stem = String(question.question_image_url || '').trim();
    if (stem) urls.push(stem);
    if (Array.isArray(question.options)) {
        question.options.forEach((opt) => {
            if (isImageOption(opt)) urls.push(opt);
        });
    }
    return uniqueImageUrls(urls);
}

function loadOne(src) {
    return new Promise((resolve) => {
        if (!src || typeof Image === 'undefined') {
            resolve({ ok: false });
            return;
        }
        const img = new Image();
        img.onload = () => resolve({ ok: true });
        img.onerror = () => resolve({ ok: false });
        img.src = src;
    });
}

export function preloadQuizImages(urls, resolveUrl = (url) => url) {
    const list = uniqueImageUrls(urls)
        .map((url) => resolveUrl(url))
        .filter(Boolean);
    if (!list.length) return Promise.resolve({ ready: true, failed: false });
    return Promise.all(list.map(loadOne)).then((results) => ({
        ready: true,
        failed: results.some((row) => !row.ok),
    }));
}

export function preloadIdentifyImages(urls) {
    return preloadQuizImages(urls, toSafetyLibraryDisplayUrl);
}

export function preloadHourlyImages(urls) {
    return preloadQuizImages(urls, toDisplayImageUrl);
}

function gateKey(urls) {
    return uniqueImageUrls(urls).join('\n');
}

/**
 * ready is false as soon as the URL set changes (no one-frame leak of the previous question).
 * ready becomes true when every image loads, fails, or the wait cap hits.
 */
export function useQuizImageGate(urls, resolveUrl = (url) => url, capMs = QUIZ_IMAGE_GATE_MS) {
    const key = gateKey(urls);
    const empty = !key;
    const [doneKey, setDoneKey] = useState(empty ? key : '');
    const [failed, setFailed] = useState(false);
    const ready = empty || doneKey === key;

    useEffect(() => {
        if (!key) {
            setDoneKey('');
            setFailed(false);
            return undefined;
        }
        let cancelled = false;
        setFailed(false);
        const cap = window.setTimeout(() => {
            if (cancelled) return;
            setFailed(true);
            setDoneKey(key);
        }, capMs);
        preloadQuizImages(urls, resolveUrl).then((result) => {
            if (cancelled) return;
            window.clearTimeout(cap);
            setFailed(Boolean(result.failed));
            setDoneKey(key);
        });
        return () => {
            cancelled = true;
            window.clearTimeout(cap);
        };
    }, [key, capMs]);

    return { ready, failed };
}

export function quizImageWaitCopy(language) {
    return language === 'bn' ? 'ছবি আসছে' : 'Loading picture';
}
