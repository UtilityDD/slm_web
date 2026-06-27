/**
 * Data model, message templates and storage helpers for the offline
 * Line Clearance (PTW) mode of Suraksha Sathi.
 *
 * Everything here is fully client-side. No network is ever required:
 *  - Presets (saved feeders / operators / crew) live in localStorage so the
 *    lineman never has to type in the field.
 *  - The active permit + immutable log are continuously persisted so a refresh
 *    or crash mid-job can be resumed.
 *  - Permit numbers and read-back confirmation codes are generated locally.
 */

export const STORAGE_KEYS = {
    presets: 'slm_clearance_presets',
    active: 'slm_clearance_active',
    history: 'slm_clearance_permits',
};

const MAX_HISTORY = 50;

/* --------------------------------- presets -------------------------------- */

const emptyPresets = { feeders: [], operators: [], crew: [] };

export function loadPresets() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.presets);
        if (!raw) return { ...emptyPresets };
        const parsed = JSON.parse(raw);
        return {
            feeders: Array.isArray(parsed.feeders) ? parsed.feeders : [],
            operators: Array.isArray(parsed.operators) ? parsed.operators : [],
            crew: Array.isArray(parsed.crew) ? parsed.crew : [],
        };
    } catch (e) {
        return { ...emptyPresets };
    }
}

export function savePresets(presets) {
    try {
        localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(presets));
    } catch (e) { /* storage full / unavailable */ }
}

/** Add a value to a preset list (deduped, capped) and persist. */
export function rememberPreset(kind, value) {
    if (!value) return loadPresets();
    const presets = loadPresets();
    const list = presets[kind] || [];
    const exists = kind === 'operators'
        ? list.some(o => o.phone === value.phone && o.name === value.name)
        : list.some(v => String(v).toLowerCase() === String(value).toLowerCase());
    if (!exists) {
        presets[kind] = [value, ...list].slice(0, 25);
        savePresets(presets);
    }
    return presets;
}

/* --------------------------------- permit --------------------------------- */

function code4() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

function permitNumber() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `PTW-${mm}${dd}-${code4()}`;
}

/**
 * Create a fresh permit object from the setup form.
 * confirmCode  -> read back by operator to prove the correct line was isolated.
 * releaseCode  -> read back by operator to prove the line was actually re-energized.
 */
export function createPermit({ feeder, location, work, operator, crew, linemanPhone }) {
    return {
        id: Date.now(),
        permitNo: permitNumber(),
        confirmCode: code4(),
        releaseCode: code4(),
        createdAt: new Date().toISOString(),
        job: { feeder: feeder || '', location: location || '', work: work || '' },
        operator: operator || { name: '', phone: '' },
        linemanPhone: linemanPhone || '',
        crew: Array.isArray(crew) ? crew : [],
        stepId: 'request',
        status: 'open',
        grounding: {},
        closeout: {},
        closedAt: null,
        log: [logEntry('setup', { permitNo: 'created' })],
    };
}

export function logEntry(action, detail = {}) {
    return { ts: new Date().toISOString(), action, ...detail };
}

/* ------------------------------ active permit ----------------------------- */

export function loadActivePermit() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.active);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

export function saveActivePermit(permit) {
    try {
        if (permit) localStorage.setItem(STORAGE_KEYS.active, JSON.stringify(permit));
        else localStorage.removeItem(STORAGE_KEYS.active);
    } catch (e) { /* noop */ }
}

/* --------------------------------- history -------------------------------- */

export function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.history);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

export function saveToHistory(permit) {
    const history = loadHistory();
    const updated = [permit, ...history].slice(0, MAX_HISTORY);
    try {
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(updated));
    } catch (e) { /* noop */ }
    return updated;
}

export function deleteFromHistory(id) {
    const updated = loadHistory().filter(p => p.id !== id);
    try {
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(updated));
    } catch (e) { /* noop */ }
    return updated;
}

/* --------------------------- grounding checklist -------------------------- */

export const GROUNDING_ITEMS = [
    { id: 'test_dead', label: { en: 'Tested line is DEAD', bn: 'লাইন মৃত (DEAD) পরীক্ষা করা হয়েছে' }, icon: '📟' },
    { id: 'discharge', label: { en: 'Line discharged', bn: 'লাইন ডিসচার্জ করা হয়েছে' }, icon: '⚡' },
    { id: 'earth', label: { en: 'Earth / grounding applied', bn: 'আর্থিং / গ্রাউন্ডিং লাগানো হয়েছে' }, icon: '🦯' },
    { id: 'short', label: { en: 'Both sides shorted', bn: 'দুই দিকে শর্ট করা হয়েছে' }, icon: '🔗' },
];

export const CLOSEOUT_ITEMS = [
    { id: 'crew_clear', label: { en: 'All crew clear of line', bn: 'সব কর্মী লাইন থেকে দূরে' }, icon: '👷' },
    { id: 'tools_counted', label: { en: 'All tools counted', bn: 'সব সরঞ্জাম গুনে নেওয়া হয়েছে' }, icon: '🧰' },
    { id: 'earth_removed', label: { en: 'Earth / grounding REMOVED', bn: 'আর্থিং / গ্রাউন্ডিং সরানো হয়েছে' }, icon: '⚡' },
    { id: 'barricade_removed', label: { en: 'Barricades removed', bn: 'ব্যারিকেড সরানো হয়েছে' }, icon: '🚧' },
];

/* --------------------------- message templates ---------------------------- */

function fill(str, p) {
    return str
        .replace(/{permitNo}/g, p.permitNo || '')
        .replace(/{feeder}/g, p.job.feeder || '____')
        .replace(/{location}/g, p.job.location || '____')
        .replace(/{work}/g, p.job.work || '____')
        .replace(/{confirmCode}/g, p.confirmCode || '')
        .replace(/{releaseCode}/g, p.releaseCode || '')
        .replace(/{operator}/g, (p.operator && p.operator.name) || '____');
}

const TEMPLATES = {
    request: {
        en: 'PTW REQUEST. Permit {permitNo}. Please ISOLATE feeder {feeder} at {location} for: {work}. When isolated, read back confirm code {confirmCode}.',
        bn: 'পারমিট অনুরোধ (PTW)। পারমিট {permitNo}। অনুগ্রহ করে {location}-এ {feeder} ফিডারটি আইসোলেট করুন, কাজ: {work}। আইসোলেট হলে কনফার্ম কোড {confirmCode} পড়ে শোনান।',
    },
    crew_brief: {
        en: 'SAFETY BRIEF. Line {feeder} isolated & earthed under permit {permitNo}. Stay clear, do NOT touch line. Observer assigned. Work starting now.',
        bn: 'সেফটি ব্রিফ। পারমিট {permitNo}-এর অধীনে {feeder} লাইন আইসোলেট ও আর্থ করা হয়েছে। দূরে থাকুন, লাইন স্পর্শ করবেন না। অবজার্ভার নিযুক্ত। কাজ শুরু হচ্ছে।',
    },
    reenergize: {
        en: 'PERMIT {permitNo} CANCELLED. Work complete, all earths REMOVED, all crew & tools clear of {feeder}. Safe to RE-ENERGIZE. Read back release code {releaseCode}.',
        bn: 'পারমিট {permitNo} বাতিল। কাজ সম্পন্ন, সব আর্থ সরানো হয়েছে, {feeder} থেকে সব কর্মী ও সরঞ্জাম দূরে। লাইন চালু (RE-ENERGIZE) করা নিরাপদ। রিলিজ কোড {releaseCode} পড়ে শোনান।',
    },
    stop_work: {
        en: 'STOP WORK / EMERGENCY on {feeder} at {location}. Permit {permitNo}. Keep line DE-ENERGIZED. Do NOT re-energize. Call me immediately.',
        bn: 'কাজ বন্ধ / জরুরি অবস্থা — {location}-এ {feeder}। পারমিট {permitNo}। লাইন বন্ধ (DE-ENERGIZED) রাখুন। চালু করবেন না। এখনই আমাকে ফোন করুন।',
    },
};

export function buildMessage(kind, permit, language = 'bn') {
    const tpl = TEMPLATES[kind];
    if (!tpl) return '';
    return fill(tpl[language] || tpl.en, permit);
}

/* ------------------------------ export as text ---------------------------- */

export function permitToText(permit, language = 'bn') {
    const L = (en, bn) => (language === 'bn' ? bn : en);
    const lines = [];
    lines.push(`${L('LINEMAN PERMIT', 'লাইনম্যান পারমিট')}: ${permit.permitNo}`);
    lines.push(`${L('Feeder', 'ফিডার')}: ${permit.job.feeder || '-'}`);
    lines.push(`${L('Location', 'স্থান')}: ${permit.job.location || '-'}`);
    lines.push(`${L('Work', 'কাজ')}: ${permit.job.work || '-'}`);
    lines.push(`${L('Operator', 'অপারেটর')}: ${permit.operator.name || '-'} ${permit.operator.phone || ''}`.trim());
    if (permit.crew && permit.crew.length) lines.push(`${L('Crew', 'কর্মী')}: ${permit.crew.join(', ')}`);
    lines.push(`${L('Status', 'স্ট্যাটাস')}: ${permit.status}`);
    lines.push('');
    lines.push(`--- ${L('LOG', 'লগ')} ---`);
    (permit.log || []).forEach((e) => {
        const t = new Date(e.ts).toLocaleString();
        let extra = '';
        if (e.note) extra = ` (${e.note})`;
        if (e.code) extra += ` [code ${e.code}]`;
        lines.push(`${t}  ${e.action}${extra}`);
    });
    return lines.join('\n');
}
