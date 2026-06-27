/**
 * Data book for the guided Line Clearance setup.
 *
 * A curated, version-controlled JSON list of substations -> feeders + operators
 * and common works lives in /public/data/databook.json. On top of it we layer
 * any entries the lineman adds in the field, persisted offline in localStorage
 * (`slm_databook_custom`). The merged result drives the big-tile picker so the
 * lineman normally taps instead of typing.
 */

const CUSTOM_KEY = 'slm_databook_custom';
const emptyCustom = () => ({
    substations: [],
    commonWorks: [],
    hiddenSubstationIds: [],
    hiddenFeederIds: [],
    hiddenWorkIds: [],
    hiddenOperatorPhones: [],
});

function loadCustom() {
    try {
        const raw = localStorage.getItem(CUSTOM_KEY);
        if (!raw) return emptyCustom();
        const parsed = JSON.parse(raw);
        return {
            substations: Array.isArray(parsed.substations) ? parsed.substations : [],
            commonWorks: Array.isArray(parsed.commonWorks) ? parsed.commonWorks : [],
            hiddenSubstationIds: Array.isArray(parsed.hiddenSubstationIds) ? parsed.hiddenSubstationIds : [],
            hiddenFeederIds: Array.isArray(parsed.hiddenFeederIds) ? parsed.hiddenFeederIds : [],
            hiddenWorkIds: Array.isArray(parsed.hiddenWorkIds) ? parsed.hiddenWorkIds : [],
            hiddenOperatorPhones: Array.isArray(parsed.hiddenOperatorPhones) ? parsed.hiddenOperatorPhones : [],
        };
    } catch (e) {
        return emptyCustom();
    }
}

function saveCustom(custom) {
    try {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
    } catch (e) { /* storage full / unavailable */ }
}

/** Merge bundled + custom, combining feeders/operators of substations sharing an id. */
function merge(bundled, custom) {
    const hiddenSs = new Set(custom.hiddenSubstationIds || []);
    const hiddenFdr = new Set(custom.hiddenFeederIds || []);
    const hiddenWork = new Set(custom.hiddenWorkIds || []);
    const hiddenOp = new Set(custom.hiddenOperatorPhones || []);

    const byId = new Map();
    const order = [];
    const put = (ss) => {
        if (!ss || !ss.id || hiddenSs.has(ss.id)) return;
        const feeders = (ss.feeders || []).filter(f => !hiddenFdr.has(f.id));
        const operators = (ss.operators || []).filter(o => !hiddenOp.has(o.phone));
        if (!byId.has(ss.id)) {
            byId.set(ss.id, {
                id: ss.id,
                name: ss.name || { en: ss.id, bn: ss.id },
                operators: [...operators],
                feeders: [...feeders],
            });
            order.push(ss.id);
        } else {
            const tgt = byId.get(ss.id);
            if (ss.name) tgt.name = ss.name;
            operators.forEach(o => {
                if (!tgt.operators.some(x => x.phone === o.phone)) tgt.operators.push(o);
            });
            feeders.forEach(f => {
                if (!tgt.feeders.some(x => x.id === f.id)) tgt.feeders.push(f);
            });
        }
    };
    (bundled.substations || []).forEach(put);
    (custom.substations || []).forEach(put);

    const works = [...(bundled.commonWorks || [])].filter(w => !hiddenWork.has(w.id));
    (custom.commonWorks || []).forEach(w => {
        if (!hiddenWork.has(w.id) && !works.some(x => x.id === w.id)) works.push(w);
    });

    return { version: bundled.version || 1, substations: order.map(id => byId.get(id)), commonWorks: works };
}

function ensureCustomSubstation(custom, ssId, bundledName) {
    let ss = custom.substations.find(s => s.id === ssId);
    if (!ss) {
        ss = {
            id: ssId,
            name: bundledName || { en: ssId, bn: ssId },
            operators: [],
            feeders: [],
        };
        custom.substations.push(ss);
    }
    return ss;
}

/** Fetch bundled book (cached by the service worker) and merge offline additions. */
export async function loadDatabook() {
    let bundled = { version: 1, substations: [], commonWorks: [] };
    try {
        const res = await fetch('/data/databook.json');
        if (res.ok) bundled = await res.json();
    } catch (e) {
        // Offline and not yet cached: fall back to custom-only.
    }
    return merge(bundled, loadCustom());
}

/** Raw merged book + bundled source (for editor). */
export async function loadDatabookForEdit() {
    let bundled = { version: 1, substations: [], commonWorks: [] };
    try {
        const res = await fetch('/data/databook.json');
        if (res.ok) bundled = await res.json();
    } catch (e) { /* noop */ }
    return { bundled, custom: loadCustom(), merged: merge(bundled, loadCustom()) };
}

/* ------------------------------- mutations -------------------------------- */

function slug(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

/** Add a new substation (with an optional first operator). Returns the new id. */
export function addSubstation(nameText, operator) {
    const custom = loadCustom();
    const id = slug('ss');
    custom.substations.push({
        id,
        name: { en: nameText, bn: nameText },
        operators: operator && operator.phone ? [operator] : [],
        feeders: [],
    });
    saveCustom(custom);
    return id;
}

/** Add a feeder under a substation (bundled or custom). Returns the new feeder. */
export function addFeeder(ssId, nameText) {
    const custom = loadCustom();
    let ss = custom.substations.find(s => s.id === ssId);
    if (!ss) {
        // Shadow a bundled substation so the new feeder attaches to it on merge.
        ss = { id: ssId, name: { en: ssId, bn: ssId }, operators: [], feeders: [] };
        custom.substations.push(ss);
    }
    const feeder = { id: slug('fdr'), name: { en: nameText, bn: nameText } };
    ss.feeders.push(feeder);
    saveCustom(custom);
    return feeder;
}

/** Add an operator (name + phone) under a substation. */
export function addOperator(ssId, operator) {
    if (!operator || !operator.phone) return;
    const custom = loadCustom();
    let ss = custom.substations.find(s => s.id === ssId);
    if (!ss) {
        ss = { id: ssId, name: { en: ssId, bn: ssId }, operators: [], feeders: [] };
        custom.substations.push(ss);
    }
    if (!ss.operators.some(o => o.phone === operator.phone)) ss.operators.push(operator);
    saveCustom(custom);
}

/** Add a common work label. Returns the new work entry, or null if label is empty. */
export function addWork(labelText) {
    const label = (labelText || '').trim();
    if (!label) return null;
    const custom = loadCustom();
    const work = { id: slug('work'), label: { en: label, bn: label } };
    custom.commonWorks.push(work);
    saveCustom(custom);
    return work;
}

export function renameSubstation(ssId, nameText) {
    if (!nameText?.trim()) return;
    const custom = loadCustom();
    const ss = ensureCustomSubstation(custom, ssId);
    ss.name = { en: nameText.trim(), bn: nameText.trim() };
    saveCustom(custom);
}

export function renameFeeder(ssId, feederId, nameText) {
    if (!nameText?.trim()) return;
    const custom = loadCustom();
    const ss = ensureCustomSubstation(custom, ssId);
    const f = ss.feeders.find(x => x.id === feederId);
    if (f) f.name = { en: nameText.trim(), bn: nameText.trim() };
    else ss.feeders.push({ id: feederId, name: { en: nameText.trim(), bn: nameText.trim() } });
    saveCustom(custom);
}

export function updateOperator(ssId, phone, name, newPhone) {
    const custom = loadCustom();
    const ss = ensureCustomSubstation(custom, ssId);
    const idx = ss.operators.findIndex(o => o.phone === phone);
    const op = { name: (name || '').trim(), phone: (newPhone || phone).trim() };
    if (!op.phone) return;
    if (idx >= 0) ss.operators[idx] = op;
    else ss.operators.push(op);
    if (newPhone && newPhone !== phone && !custom.hiddenOperatorPhones.includes(phone)) {
        custom.hiddenOperatorPhones.push(phone);
    }
    saveCustom(custom);
}

export function renameWork(workId, labelText) {
    if (!labelText?.trim()) return;
    const custom = loadCustom();
    const w = custom.commonWorks.find(x => x.id === workId);
    if (w) w.label = { en: labelText.trim(), bn: labelText.trim() };
    else custom.commonWorks.push({ id: workId, label: { en: labelText.trim(), bn: labelText.trim() } });
    saveCustom(custom);
}

export function removeSubstation(ssId) {
    const custom = loadCustom();
    custom.substations = custom.substations.filter(s => s.id !== ssId);
    if (!custom.hiddenSubstationIds.includes(ssId)) custom.hiddenSubstationIds.push(ssId);
    saveCustom(custom);
}

export function removeFeeder(ssId, feederId) {
    const custom = loadCustom();
    const ss = custom.substations.find(s => s.id === ssId);
    if (ss) ss.feeders = ss.feeders.filter(f => f.id !== feederId);
    if (!custom.hiddenFeederIds.includes(feederId)) custom.hiddenFeederIds.push(feederId);
    saveCustom(custom);
}

export function removeOperator(ssId, phone) {
    const custom = loadCustom();
    const ss = custom.substations.find(s => s.id === ssId);
    if (ss) ss.operators = ss.operators.filter(o => o.phone !== phone);
    if (!custom.hiddenOperatorPhones.includes(phone)) custom.hiddenOperatorPhones.push(phone);
    saveCustom(custom);
}

export function removeWork(workId) {
    const custom = loadCustom();
    custom.commonWorks = custom.commonWorks.filter(w => w.id !== workId);
    if (!custom.hiddenWorkIds.includes(workId)) custom.hiddenWorkIds.push(workId);
    saveCustom(custom);
}
