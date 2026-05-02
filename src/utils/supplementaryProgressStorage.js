/**
 * Life-skills / supplementary module completion (local only for now).
 *
 * Intended Supabase mapping (migrate later):
 *   table: supplementary_module_progress
 *   columns: user_id (uuid), module_id (text), completed_at (timestamptz)
 *   unique (user_id, module_id)
 *
 * Local document keeps the same facts under `completions` so rows can be
 * INSERT … ON CONFLICT or bulk-upsert from JSON without reshaping logic.
 */

export const SUPPLEMENTARY_PROGRESS_SCHEMA_VERSION = 1;

/** @typedef {{ module_id: string, completed_at: string }} SupplementaryCompletion */

/**
 * @typedef {object} SupplementaryProgressDocument
 * @property {number} schema_version
 * @property {string} user_id
 * @property {SupplementaryCompletion[]} completions
 * @property {string} client_updated_at
 */

const storageKey = (userId) => `slm_supplementary_read_${userId}`;

/**
 * @param {unknown} raw
 * @returns {{ completions: SupplementaryCompletion[], legacyArray: boolean }}
 */
function parseRawToCompletions(raw) {
    if (raw == null || raw === '') {
        return { completions: [], legacyArray: false };
    }
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        return { completions: [], legacyArray: false };
    }
    if (Array.isArray(data)) {
        const completions = data
            .filter((id) => typeof id === 'string' && id.length > 0)
            .map((module_id) => ({
                module_id,
                completed_at: new Date().toISOString(),
            }));
        return { completions, legacyArray: true };
    }
    if (
        data &&
        typeof data === 'object' &&
        data.schema_version === SUPPLEMENTARY_PROGRESS_SCHEMA_VERSION &&
        Array.isArray(data.completions)
    ) {
        const completions = data.completions
            .filter((c) => c && typeof c.module_id === 'string' && c.module_id.length > 0)
            .map((c) => ({
                module_id: c.module_id,
                completed_at:
                    typeof c.completed_at === 'string' && c.completed_at.length > 0
                        ? c.completed_at
                        : new Date().toISOString(),
            }));
        return { completions, legacyArray: false };
    }
    return { completions: [], legacyArray: false };
}

/**
 * @param {string} userId
 * @param {SupplementaryCompletion[]} completions
 */
function writeDocument(userId, completions) {
    if (typeof localStorage === 'undefined' || !userId) return;
    /** @type {SupplementaryProgressDocument} */
    const doc = {
        schema_version: SUPPLEMENTARY_PROGRESS_SCHEMA_VERSION,
        user_id: userId,
        completions,
        client_updated_at: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(userId), JSON.stringify(doc));
}

/**
 * Load completed module ids for UI. Migrates legacy plain JSON array to v1 document on first read.
 * @param {string} userId
 * @returns {string[]}
 */
export function loadSupplementaryCompletedModuleIds(userId) {
    if (!userId || typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(storageKey(userId));
    const { completions, legacyArray } = parseRawToCompletions(raw);
    if (legacyArray) {
        writeDocument(userId, completions);
    }
    const seen = new Set();
    const ids = [];
    for (const c of completions) {
        if (!seen.has(c.module_id)) {
            seen.add(c.module_id);
            ids.push(c.module_id);
        }
    }
    return ids;
}

/**
 * Full local snapshot for a future Supabase sync (e.g. upsert rows from `completions`).
 * @param {string} userId
 * @returns {SupplementaryProgressDocument | null}
 */
export function readSupplementaryProgressDocument(userId) {
    if (!userId || typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(storageKey(userId));
    const { completions, legacyArray } = parseRawToCompletions(raw);
    if (legacyArray) {
        writeDocument(userId, completions);
    }
    const finalRaw = localStorage.getItem(storageKey(userId));
    if (!finalRaw) {
        return {
            schema_version: SUPPLEMENTARY_PROGRESS_SCHEMA_VERSION,
            user_id: userId,
            completions: [],
            client_updated_at: new Date().toISOString(),
        };
    }
    try {
        const data = JSON.parse(finalRaw);
        if (
            data &&
            typeof data === 'object' &&
            data.schema_version === SUPPLEMENTARY_PROGRESS_SCHEMA_VERSION &&
            Array.isArray(data.completions)
        ) {
            return data;
        }
    } catch {
        /* fall through */
    }
    return {
        schema_version: SUPPLEMENTARY_PROGRESS_SCHEMA_VERSION,
        user_id: userId,
        completions: [],
        client_updated_at: new Date().toISOString(),
    };
}

/**
 * Idempotent mark complete; preserves existing completed_at for known modules.
 * @param {string} userId
 * @param {string} moduleId
 * @returns {string[]} updated list of completed module ids
 */
export function appendSupplementaryCompletion(userId, moduleId) {
    if (!userId || !moduleId || typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(storageKey(userId));
    let { completions, legacyArray } = parseRawToCompletions(raw);
    if (legacyArray) {
        writeDocument(userId, completions);
        const reread = localStorage.getItem(storageKey(userId));
        const parsed = parseRawToCompletions(reread);
        completions = parsed.completions;
    }
    const byId = new Map(completions.map((c) => [c.module_id, c]));
    if (!byId.has(moduleId)) {
        byId.set(moduleId, { module_id: moduleId, completed_at: new Date().toISOString() });
    }
    const next = Array.from(byId.values());
    writeDocument(userId, next);
    return next.map((c) => c.module_id);
}
