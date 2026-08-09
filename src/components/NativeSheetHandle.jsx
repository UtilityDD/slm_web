import React from 'react';
import { isNativeCapacitorPlatform } from '../utils/webPush';

/** Material-style drag handle — shown on native (and mobile web sheets). */
export default function NativeSheetHandle({ className = '' }) {
  return (
    <div
      className={`flex justify-center pb-1 pt-2.5 ${className}`}
      aria-hidden="true"
    >
      <span
        className={`block h-1 rounded-full bg-slate-300/90 ${
          isNativeCapacitorPlatform() ? 'w-10' : 'w-9 sm:hidden'
        }`}
      />
    </div>
  );
}
