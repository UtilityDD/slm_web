import React, { useEffect } from 'react';
import { isNativeCapacitorPlatform } from '../../utils/webPush';

export const BrutalSpinner = ({ className = 'h-10 w-10' }) => (
  <div className={`relative ${className}`} role="status" aria-label="Loading">
    <div className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-orange-500 animate-spin" />
  </div>
);

/** Calm in-app loader — soft spinner only (no PPE, no logo swap). */
export const BrutalLoaderContent = ({ message, compact = false }) => (
  <div className={`flex flex-col items-center text-center ${compact ? 'gap-3' : 'gap-4'}`}>
    <BrutalSpinner className={compact ? 'h-9 w-9' : 'h-11 w-11'} />
    {message ? (
      <p className={`font-medium text-slate-500 ${compact ? 'text-xs' : 'text-sm'}`}>{message}</p>
    ) : null}
  </div>
);

/** Full-screen hold used during Suspense / cold start — navy on native, cream on web. */
const PageLoader = ({ overlay = false, message }) => {
  const native = isNativeCapacitorPlatform();

  useEffect(() => {
    if (typeof window.__hideStaticShell === 'function') {
      window.__hideStaticShell();
    }
  }, []);

  if (native && !overlay) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-[#fffdf7]"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={message || 'Loading'}
      />
    );
  }

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#fffdf7]/90 backdrop-blur-sm animate-fade-in">
        <div role="status" aria-live="polite" aria-busy="true">
          <BrutalLoaderContent message={message} compact />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#fffdf7]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <BrutalLoaderContent message={message} />
    </div>
  );
};

export default PageLoader;
