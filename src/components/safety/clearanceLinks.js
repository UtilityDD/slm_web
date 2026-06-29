/**
 * Deep-link helpers for two-party Line Clearance (lineman ↔ operator).
 * Links use hash routing: #/sops?role=op&act=req&pn=...
 * Works offline over SMS — no server required.
 */

import { WEBSITE_URL } from '../../config';

function isLocalDevHost(hostname) {
    if (!hostname) return false;
    return hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname.endsWith('.local');
}

/** Public base for SMS/app links — operators cannot open localhost on their phone. */
function appLinkBase() {
    const configured = (import.meta.env.VITE_PUBLIC_APP_URL || WEBSITE_URL || '').replace(/\/$/, '');
    if (typeof window === 'undefined') return configured || 'https://smartlineman.in';
    if (isLocalDevHost(window.location.hostname)) return configured || 'https://smartlineman.in';
    return `${window.location.origin}${window.location.pathname || '/'}`.replace(/\/$/, '');
}

export function parseClearanceFromHash() {
    try {
        const hash = window.location.hash || '';
        const qIdx = hash.indexOf('?');
        if (qIdx < 0) return null;
        const params = new URLSearchParams(hash.slice(qIdx + 1));
        const role = params.get('role');
        if (!role) return null;
        return {
            role,
            act: params.get('act') || '',
            permitNo: params.get('pn') || '',
            confirmCode: params.get('cc') || '',
            releaseCode: params.get('rc') || '',
            feeder: params.get('f') || '',
            location: params.get('loc') || '',
            work: params.get('w') || '',
            linemanPhone: params.get('lp') || '',
        };
    } catch (e) {
        return null;
    }
}

export function buildClearanceUrl(query) {
    const base = appLinkBase();
    const p = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => { if (v != null && v !== '') p.set(k, String(v)); });
    return `${base}/#/sops?${p.toString()}`;
}

/** Lineman → operator: please isolate (no code in link — operator issues code on confirm). */
export function operatorIsolateRequestLink(permit, linemanPhone) {
    return buildClearanceUrl({
        role: 'op',
        act: 'req',
        pn: permit.permitNo,
        f: permit.job.feeder,
        loc: permit.job.location,
        w: permit.job.work,
        lp: linemanPhone || permit.linemanPhone || '',
    });
}

/** Operator → lineman: isolated confirmed */
export function linemanIsolateAckLink(permit) {
    return buildClearanceUrl({
        role: 'lm',
        act: 'iso',
        pn: permit.permitNo,
        cc: permit.confirmCode,
    });
}

/** Lineman → operator: safe to re-energize (no code in link). */
export function operatorReenergizeRequestLink(permit, linemanPhone) {
    return buildClearanceUrl({
        role: 'op',
        act: 'ren',
        pn: permit.permitNo,
        f: permit.job.feeder,
        loc: permit.job.location,
        lp: linemanPhone || permit.linemanPhone || '',
    });
}

/** Operator → lineman: re-energized confirmed */
export function linemanReenergizeAckLink(permit) {
    return buildClearanceUrl({
        role: 'lm',
        act: 'ren_ok',
        pn: permit.permitNo,
        rc: permit.releaseCode,
    });
}

export function appendAppLink(message, link, language = 'bn') {
    const label = language === 'bn' ? 'অ্যাপ লিংক' : 'App link';
    return `${message}\n\n${label}: ${link}`;
}

const OP_LOG_KEY = 'slm_operator_confirmations';

export function saveOperatorConfirmation(entry) {
    try {
        const list = JSON.parse(localStorage.getItem(OP_LOG_KEY) || '[]');
        list.unshift({ ...entry, ts: new Date().toISOString() });
        localStorage.setItem(OP_LOG_KEY, JSON.stringify(list.slice(0, 50)));
    } catch (e) { /* noop */ }
}

export function loadOperatorConfirmations() {
    try {
        return JSON.parse(localStorage.getItem(OP_LOG_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

export const LINEMAN_PHONE_KEY = 'slm_lineman_phone';

export function loadLinemanPhone() {
    try {
        return localStorage.getItem(LINEMAN_PHONE_KEY) || '';
    } catch (e) {
        return '';
    }
}

export function saveLinemanPhone(phone) {
    try {
        if (phone) localStorage.setItem(LINEMAN_PHONE_KEY, phone);
    } catch (e) { /* noop */ }
}
