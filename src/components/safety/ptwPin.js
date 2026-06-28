/**
 * Offline PTW work PIN for Suraksha Sathi (PWA).
 * 4-digit PIN, stored as SHA-256 hash on device only — works without network.
 */
import SHA256 from 'crypto-js/sha256';

const STORAGE_KEY = 'slm_ptw_pin_hash';
const PIN_LEN = 4;
const SALT = 'slm_ptw_v1';

function hashPin(pin) {
    return SHA256(`${SALT}:${pin}`).toString();
}

function isValidPin(pin) {
    return typeof pin === 'string' && new RegExp(`^\\d{${PIN_LEN}}$`).test(pin);
}

export function hasPtwPin() {
    try {
        return !!localStorage.getItem(STORAGE_KEY);
    } catch (e) {
        return false;
    }
}

export function setPtwPin(pin) {
    if (!isValidPin(pin)) return { ok: false, reason: 'invalid' };
    try {
        localStorage.setItem(STORAGE_KEY, hashPin(pin));
        return { ok: true };
    } catch (e) {
        return { ok: false, reason: 'storage' };
    }
}

export function verifyPtwPin(pin) {
    if (!isValidPin(pin)) return false;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return false;
        return stored === hashPin(pin);
    } catch (e) {
        return false;
    }
}

export function clearPtwPin() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* noop */ }
}

export const PTW_PIN_LEN = PIN_LEN;

/** Labels for each gated action (en/bn). */
export const PIN_GATES = {
    start_permit: {
        en: 'Enter PIN to create permit',
        bn: 'পারমিট তৈরি করতে PIN দিন',
    },
    confirm_isolation: {
        en: 'Enter PIN to confirm isolation',
        bn: 'আইসোলেশন নিশ্চিত করতে PIN দিন',
    },
    request_release: {
        en: 'Enter PIN to request re-energize',
        bn: 'লাইন চালু অনুরোধ করতে PIN দিন',
    },
    close_permit: {
        en: 'Enter PIN to close permit',
        bn: 'পারমিট বন্ধ করতে PIN দিন',
    },
    operator_confirm: {
        en: 'Enter PIN to confirm as operator',
        bn: 'অপারেটর হিসেবে নিশ্চিত করতে PIN দিন',
    },
};
