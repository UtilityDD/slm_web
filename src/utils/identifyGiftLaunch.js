/**
 * UI-only Home gift → Identify real launch + once-per-IST-day visibility.
 * DB daily limit is separate (`identify_scores` / can_play).
 */
const LAUNCH_KEY = 'slm_identify_launch_real';
/** Hide Home gift for the rest of IST day after dismiss or open. */
const HOME_GIFT_DONE_KEY = 'slm_identify_gift_home_done';

export function requestIdentifyRealLaunch() {
    try {
        sessionStorage.setItem(LAUNCH_KEY, '1');
    } catch {
        // ignore
    }
}

/** @returns {boolean} true once, then clears */
export function consumeIdentifyRealLaunch() {
    try {
        const v = sessionStorage.getItem(LAUNCH_KEY);
        if (v) sessionStorage.removeItem(LAUNCH_KEY);
        return v === '1';
    } catch {
        return false;
    }
}

function istToday() {
    try {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    } catch {
        return new Date().toISOString().slice(0, 10);
    }
}

/** True if Home gift was dismissed or opened already today (any user, including admin). */
export function isIdentifyHomeGiftDoneToday() {
    try {
        return localStorage.getItem(HOME_GIFT_DONE_KEY) === istToday();
    } catch {
        return false;
    }
}

/** Call when user taps × or opens the Home gift — hides it until next IST day. */
export function markIdentifyHomeGiftDoneToday() {
    try {
        localStorage.setItem(HOME_GIFT_DONE_KEY, istToday());
    } catch {
        // ignore
    }
}

/** @deprecated use isIdentifyHomeGiftDoneToday */
export function isIdentifyGiftDismissedToday() {
    return isIdentifyHomeGiftDoneToday();
}

/** @deprecated use markIdentifyHomeGiftDoneToday */
export function dismissIdentifyGiftForToday() {
    markIdentifyHomeGiftDoneToday();
}
