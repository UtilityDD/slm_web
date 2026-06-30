/**
 * Guest preview accounts (profiles.role = 'guest') can browse the app but
 * must not save scores, lesson progress, or reading habit data.
 */

export function isGuestUser(profileOrUser) {
    return profileOrUser?.role === 'guest';
}

export const guestPreviewCopy = {
    en: {
        banner: 'Guest preview — browse like a lineman. Scores and progress are not saved.',
        blockedTitle: 'Preview only',
        blockedBody: 'This is a guest preview account. You can explore everything here, but scores and progress are not saved. Use a full lineman account to participate.',
        lessonResultGuest: 'You are signed in as a guest. This score is for practice only — it will not be saved and you cannot unlock the next lesson. Use a full lineman account to continue your journey.',
        lessonCloseGuest: 'Close preview',
        hourlyResultGuest: 'You are signed in as a guest. This hourly score is for practice only — it will not be saved and will not appear on the leaderboard.',
        hourlyCloseGuest: 'Close preview',
        ok: 'OK',
    },
    bn: {
        banner: 'গেস্ট মোড — একজন লাইনম্যান হিসেবে অ্যাপটি ঘুরে দেখুন। তবে আপনার স্কোর এবং অগ্রগতি এখানে সংরক্ষিত হবে না।',
        blockedTitle: 'শুধুমাত্র দেখার জন্য',
        blockedBody: 'এটি একটি গেস্ট অ্যাকাউন্ট। আপনি অ্যাপের সবকিছু ঘুরে দেখতে পারবেন, তবে কোনো স্কোর বা অগ্রগতি সংরক্ষণ করা হবে না। কুইজ ও কার্যক্রমে অংশ নিয়ে রেকর্ড রাখতে আপনার নিজস্ব লাইনম্যান অ্যাকাউন্ট ব্যবহার করুন।',
        lessonResultGuest: 'আপনি গেস্ট হিসেবে যুক্ত আছেন। এই স্কোরটি কেবল অনুশীলনের জন্য — এটি সংরক্ষণ করা হবে না এবং পরবর্তী পাঠটি এখন খুলবে না। আপনার শেখার যাত্রা পুরোদমে শুরু করতে অনুগ্রহ করে নিজস্ব লাইনম্যান অ্যাকাউন্ট ব্যবহার করুন।',
        lessonCloseGuest: 'বন্ধ করুন',
        hourlyResultGuest: 'আপনি গেস্ট হিসেবে যুক্ত আছেন। এই ঘণ্টার কুইজের স্কোরটি কেবল অনুশীলনের জন্য — এটি সংরক্ষণ করা হবে না এবং লিডারবোর্ডে যুক্ত হবে না।',
        hourlyCloseGuest: 'বন্ধ করুন',
        ok: 'ঠিক আছে',
    },
};

export function guestPreviewText(language, key) {
    const lang = language === 'bn' ? 'bn' : 'en';
    return guestPreviewCopy[lang][key] ?? guestPreviewCopy.en[key];
}

/** @returns {boolean} true when the action was blocked */
export function blockGuestWrite(profile, showNotification, language) {
    if (!isGuestUser(profile)) return false;
    if (typeof showNotification === 'function') {
        showNotification(guestPreviewCopy[language === 'bn' ? 'bn' : 'en'].blockedBody, 'info');
    }
    return true;
}

export function isGuestPreviewRpcError(dataOrError) {
    const code = dataOrError?.error ?? dataOrError?.code;
    return code === 'guest_preview';
}

/** Zero scores for UI — guest accounts must not appear to earn points locally. */
export function sanitizeGuestProfileForDisplay(profile) {
    if (!isGuestUser(profile)) return profile;
    return {
        ...profile,
        points: 0,
        reading_points: 0,
        quiz_points: 0,
        total_penalties: 0,
        completed_lessons: [],
        training_level: 0,
    };
}

/** Remove guest preview rows from leaderboard lists (defense in depth). */
export function filterGuestLeaderboardRows(rows, guestUserIds = null) {
    if (!Array.isArray(rows)) return [];
    if (guestUserIds instanceof Set) {
        return rows.filter((row) => !guestUserIds.has(row.user_id));
    }
    return rows.filter((row) => row?.role !== 'guest');
}
