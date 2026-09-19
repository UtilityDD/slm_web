import { storageUtils } from './storageUtils';

const RECENTS_KEY = 'slm_identify_recents_v1';
export const IDENTIFY_RECENTS_MAX = 8;

export function readIdentifyRecents() {
    try {
        const raw = storageUtils.getItem(RECENTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((id) => typeof id === 'string' && id.trim()).slice(0, IDENTIFY_RECENTS_MAX);
    } catch {
        return [];
    }
}

export function pushIdentifyRecent(itemId) {
    const id = typeof itemId === 'string' ? itemId.trim() : '';
    if (!id) return readIdentifyRecents();
    const next = [id, ...readIdentifyRecents().filter((row) => row !== id)].slice(0, IDENTIFY_RECENTS_MAX);
    storageUtils.setItem(RECENTS_KEY, JSON.stringify(next));
    return next;
}
