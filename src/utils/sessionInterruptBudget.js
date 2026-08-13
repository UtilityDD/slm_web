/**
 * Soft interrupt session budget: at most one soft prompt per app session.
 * Critical overlays (update, language, logout, etc.) are never budgeted.
 *
 * Priority when several are due is enforced by staggered delays + first claim wins
 * (profile 12s → PPE 14s → sponsor ~18s → push 22s).
 *
 * Soft budget complements OVERLAY_PRIORITY in overlayQueue.js
 * (priority = who wins if two flags are true; budget = who may even try).
 */

export const SOFT_INTERRUPT_IDS = Object.freeze({
  profileNudge: 'profileNudge',
  ppeNudge: 'ppeNudge',
  sponsor: 'sponsor',
  pushOptIn: 'pushOptIn',
  cultureSurvey: 'cultureSurvey',
  adContact: 'adContact',
});

/** Higher number = preferred when racing (informational; claim is first-wins). */
export const SOFT_INTERRUPT_PRIORITY = Object.freeze({
  profileNudge: 50,
  ppeNudge: 45,
  sponsor: 30,
  pushOptIn: 20,
  cultureSurvey: 10,
  adContact: 5,
});

const STORAGE_KEY = 'slm_soft_interrupt_claimed';

let memoryClaimed = null;

function readStorage() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function writeStorage(id) {
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function getClaimedSoftInterrupt() {
  if (memoryClaimed) return memoryClaimed;
  const fromStore = readStorage();
  if (fromStore) memoryClaimed = fromStore;
  return memoryClaimed;
}

export function hasSoftInterruptClaimed() {
  return Boolean(getClaimedSoftInterrupt());
}

/**
 * Claim the single soft-interrupt slot for this session.
 * @param {string} id soft interrupt id
 * @returns {boolean} true if this id owns the slot (newly or already)
 */
export function claimSoftInterrupt(id) {
  if (!id || typeof id !== 'string') return false;
  const current = getClaimedSoftInterrupt();
  if (current === id) return true;
  if (current) return false;
  memoryClaimed = id;
  writeStorage(id);
  return true;
}

/** Test / admin helper — not used in production UI. */
export function resetSoftInterruptBudgetForTests() {
  memoryClaimed = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
