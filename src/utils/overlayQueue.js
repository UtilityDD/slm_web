/**
 * Single-interrupt overlay queue for the app shell.
 * Auto-triggered surfaces (update, broadcast, nudge, ads…) share one screen;
 * the highest priority open flag wins until dismissed, then the next shows.
 * User-critical flows (session ended, logout) sit at the top.
 * Does not touch scoring, leaderboards, or quiz logic.
 */

export const OVERLAY_PRIORITY = {
  sessionEnded: 100,
  logout: 95,
  language: 90,
  update: 80,
  broadcast: 70,
  pushBanner: 60,
  adContact: 55,
  profileNudge: 50,
  pushOptIn: 40,
  monthWinners: 30,
  sponsor: 20,
  install: 10,
};

/**
 * @param {Record<string, boolean>} flags overlayId → currently wanting to show
 * @returns {string | null} winning overlay id
 */
export function pickActiveOverlay(flags) {
  let bestId = null;
  let bestPri = -Infinity;
  if (!flags || typeof flags !== 'object') return null;

  for (const [id, isOn] of Object.entries(flags)) {
    if (!isOn) continue;
    const pri = OVERLAY_PRIORITY[id];
    if (pri == null) continue;
    if (pri > bestPri) {
      bestPri = pri;
      bestId = id;
    }
  }
  return bestId;
}

/**
 * @param {string} selfId
 * @param {string | null} activeId
 * @returns {boolean} true when another higher-priority overlay owns the screen
 */
export function shouldSuppressOverlay(selfId, activeId) {
  if (!activeId || activeId === selfId) return false;
  return (OVERLAY_PRIORITY[activeId] ?? 0) > (OVERLAY_PRIORITY[selfId] ?? 0);
}

/** Any shell interrupt that should pause Training tips / brief. */
export function isShellInterruptBusy(activeId) {
  return Boolean(activeId);
}
