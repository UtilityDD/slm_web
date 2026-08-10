import React from 'react';

/**
 * Previously: Capacitor Android large-title app bar.
 * Disabled — pages already identify themselves via in-page headers, tabs, or bottom nav.
 * Kept as a no-op export so older imports do not break.
 */
export default function NativeAppTopBar() {
  return null;
}

/** Always null — native top bar is not used. */
export function getNativeTopBarTitle() {
  return null;
}
