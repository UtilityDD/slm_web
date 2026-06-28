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

/** 4-digit code issued by operator on confirm (not known to lineman beforehand). */
export function generateOperatorCode() {
    return code4();
}

function permitNumber() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `PTW-${mm}${dd}-${code4()}`;
}

/**
 * Create a fresh permit object from the setup form.
 * confirmCode / releaseCode are null until the operator confirms in the app
 * (lineman cannot self-verify without operator action).
 */
export function createPermit({ feeder, location, work, operator, crew, comment, linemanPhone }) {
    return {
        id: Date.now(),
        permitNo: permitNumber(),
        confirmCode: null,
        releaseCode: null,
        operatorIssuedIsolate: false,
        operatorIssuedRelease: false,
        createdAt: new Date().toISOString(),
        job: { feeder: feeder || '', location: location || '', work: work || '' },
        operator: operator || { name: '', phone: '' },
        linemanPhone: linemanPhone || '',
        crew: Array.isArray(crew) ? crew : [],
        comment: (comment || '').trim(),
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
    { id: 'test_dead', label: { en: 'Line dead (tested)', bn: 'লাইন মৃত' }, icon: '📟' },
    { id: 'discharge', label: { en: 'Discharged', bn: 'ডিসচার্জ' }, icon: '⚡' },
    { id: 'earth', label: { en: 'Earthed', bn: 'আর্থিং' }, icon: '🦯' },
    { id: 'short', label: { en: 'Both sides shorted', bn: 'দুই দিক শর্ট' }, icon: '🔗' },
];

export const CLOSEOUT_ITEMS = [
    { id: 'crew_clear', label: { en: 'Crew clear', bn: 'কর্মী নিরাপদ' }, icon: '👷' },
    { id: 'tools_counted', label: { en: 'Tools counted', bn: 'সরঞ্জাম গোনা' }, icon: '🧰' },
    { id: 'earth_removed', label: { en: 'Earthing removed', bn: 'আর্থিং সরানো' }, icon: '⚡' },
    { id: 'barricade_removed', label: { en: 'Barricades off', bn: 'ব্যারিকেড সরানো' }, icon: '🚧' },
];

/* --------------------------- message templates ---------------------------- */

function fill(str, p, language = 'bn') {
    const commentLine = (p.comment || '').trim()
        ? (language === 'bn' ? ` মন্তব্য: ${p.comment.trim()}।` : ` Note: ${p.comment.trim()}.`)
        : '';
    return str
        .replace(/{permitNo}/g, p.permitNo || '')
        .replace(/{feeder}/g, p.job.feeder || '____')
        .replace(/{location}/g, p.job.location || '____')
        .replace(/{work}/g, p.job.work || '____')
        .replace(/{commentLine}/g, commentLine)
        .replace(/{confirmCode}/g, p.confirmCode || '')
        .replace(/{releaseCode}/g, p.releaseCode || '')
        .replace(/{operator}/g, (p.operator && p.operator.name) || '____');
}

const TEMPLATES = {
    request: {
        en: 'PTW REQUEST. Permit {permitNo}. Please ISOLATE feeder {feeder} at {location} for: {work}.{commentLine} Open app link, isolate, then send confirm code to lineman.',
        bn: 'পারমিট অনুরোধ (PTW)। পারমিট {permitNo}। অনুগ্রহ করে {location}-এ {feeder} ফিডারটি আইসোলেট করুন, কাজ: {work}।{commentLine} অ্যাপ লিংক খুলে আইসোলেট করুন, তারপর লাইনম্যানকে কনফার্ম কোড পাঠান।',
    },
    crew_brief: {
        en: 'SAFETY BRIEF. Line {feeder} isolated & earthed under permit {permitNo}. Stay clear, do NOT touch line. Observer assigned. Work starting now.',
        bn: 'সেফটি ব্রিফ। পারমিট {permitNo}-এর অধীনে {feeder} লাইন আইসোলেট ও আর্থ করা হয়েছে। দূরে থাকুন, লাইন স্পর্শ করবেন না। অবজার্ভার নিযুক্ত। কাজ শুরু হচ্ছে।',
    },
    reenergize: {
        en: 'PERMIT {permitNo}. Work complete, all clear on {feeder}. Safe to RE-ENERGIZE. Open app link, re-energize, then send release code to lineman.',
        bn: 'পারমিট {permitNo}। কাজ সম্পন্ন, {feeder} পরিষ্কার। লাইন চালু (RE-ENERGIZE) করা নিরাপদ। অ্যাপ লিংক খুলে চালু করুন, তারপর লাইনম্যানকে রিলিজ কোড পাঠান।',
    },
    stop_work: {
        en: 'STOP WORK / EMERGENCY on {feeder} at {location}. Permit {permitNo}. Keep line DE-ENERGIZED. Do NOT re-energize. Call me immediately.',
        bn: 'কাজ বন্ধ / জরুরি অবস্থা — {location}-এ {feeder}। পারমিট {permitNo}। লাইন বন্ধ (DE-ENERGIZED) রাখুন। চালু করবেন না। এখনই আমাকে ফোন করুন।',
    },
};

export function buildMessage(kind, permit, language = 'bn') {
    const tpl = TEMPLATES[kind];
    if (!tpl) return '';
    return fill(tpl[language] || tpl.en, permit, language);
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
    if (permit.comment) lines.push(`${L('Comment', 'মন্তব্য')}: ${permit.comment}`);
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
