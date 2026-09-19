/**
 * Night sleep hours for Home (IST): 11 PM through 5 AM.
 * Used for a non-blocking “time to sleep” nudge — not for locking the quiz.
 */
import { storageUtils } from './storageUtils';

export const NIGHT_SLEEP_START_HOUR = 23;
export const NIGHT_SLEEP_END_HOUR = 6;
const DISMISS_KEY = 'slm_home_sleep_nudge_night';

function toIst(now = new Date()) {
    return new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
}

export function getIstHour(now = new Date()) {
    return toIst(now).getUTCHours();
}

/** True for hour-of-day values in the sleep window (11 PM–5 AM IST). */
export function isNightSleepSlotHour(hour) {
    const h = ((Number(hour) % 24) + 24) % 24;
    return h >= NIGHT_SLEEP_START_HOUR || h < NIGHT_SLEEP_END_HOUR;
}

/** True from 11:00 PM until 5:59 AM IST. */
export function isNightSleepHour(now = new Date()) {
    return isNightSleepSlotHour(getIstHour(now));
}

/**
 * Identity of the current night: IST date of the 11 PM that started it.
 * 1 AM on 8 Sep still belongs to 7 Sep’s night, so dismiss lasts until 6 AM.
 */
export function getNightSleepId(now = new Date()) {
    const ist = toIst(now);
    if (ist.getUTCHours() < NIGHT_SLEEP_END_HOUR) {
        ist.setUTCDate(ist.getUTCDate() - 1);
    }
    const year = ist.getUTCFullYear();
    const month = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const day = String(ist.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function isSleepNudgeDismissed(now = new Date()) {
    return storageUtils.getItem(DISMISS_KEY) === getNightSleepId(now);
}

export function dismissSleepNudge(now = new Date()) {
    storageUtils.setItem(DISMISS_KEY, getNightSleepId(now));
}

export function shouldShowSleepNudge(now = new Date()) {
    return isNightSleepHour(now) && !isSleepNudgeDismissed(now);
}

export function getSleepNudgeCopy(language, hourlyDone) {
    const bn = language === 'bn';
    if (hourlyDone) {
        return {
            title: bn ? 'ঘুমানোর সময়' : 'Time to sleep',
            body: bn
                ? 'পরের ঘণ্টা সকালে খেললেই চলবে। এখন বিশ্রাম নিন, ভাই।'
                : 'The next hour can wait until morning. Rest now, brother.',
            dismiss: bn ? 'এখনই খেলতে / পড়তে চাই' : 'I want to play / read now',
            waitLabel: bn ? 'সকালে' : 'morning',
        };
    }
    return {
        title: bn ? 'ঘুমানোর সময়' : 'Time to sleep',
        body: bn
            ? 'এই সেট খেলতে চাইলে খেলুন। তারপর ঘুমান — কুইজ সকাল পর্যন্ত থাকবে।'
            : 'Play this set if you want, then sleep. The quiz can wait until morning.',
            dismiss: bn ? 'এখনই খেলতে / পড়তে চাই' : 'I want to play / read now',
        waitLabel: bn ? 'সকালে' : 'morning',
    };
}
