import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const RegisterSW = () => {
  const swProps = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
      r && setInterval(() => {
        r.update();
      }, 600 * 1000);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  // Defensive check to prevent destructuring error if hook returns undefined
  if (!swProps) return null;

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needUpdate: [needUpdate, setNeedUpdate],
    updateServiceWorker,
  } = swProps;

  const close = () => {
    setOfflineReady(false);
    setNeedUpdate(false);
  };

  useEffect(() => {
    if (offlineReady) {
      // Auto close offline ready message after 5 seconds
      const timer = setTimeout(() => setOfflineReady(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [offlineReady]);

  if (!offlineReady && !needUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-slide-up">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 max-w-sm w-full mx-auto ring-1 ring-black/5 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            {needUpdate ? (
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {needUpdate ? 'Update Available!' : 'Ready for Offline!'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {needUpdate 
                ? 'A new version of SmartLineman is ready. Reload to apply updates.' 
                : 'SmartLineman has been saved for offline use. You can now use it without internet!'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          {needUpdate ? (
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-sm"
            >
              Reload & Update
            </button>
          ) : (
            <button
              onClick={() => setOfflineReady(false)}
              className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
              Awesome!
            </button>
          )}
          <button
            onClick={close}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterSW;
