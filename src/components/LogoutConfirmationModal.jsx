import React from "react";

export default function LogoutConfirmationModal({ onConfirm, onCancel, language, loading }) {
  const translations = {
    en: {
      title: "Confirm Logout",
      message: "Are you sure you want to log out?",
      confirm: "Logout",
      cancel: "Cancel",
      loggingOut: "Logging out..."
    },
    bn: {
      title: "লগ আউট নিশ্চিত করুন",
      message: "আপনি কি নিশ্চিত যে আপনি লগ আউট করতে চান?",
      confirm: "লগ আউট",
      cancel: "বাতিল",
      loggingOut: "লগ আউট হচ্ছে..."
    },
  };

  const t = translations[language];

  return (
    <div
      className="fixed inset-0 bg-slate-900/55 flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4 animate-fade-in"
      role="presentation"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="w-full sm:max-w-sm animate-slide-up-sheet sm:animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
            aria-hidden="true"
          />

          <div className="flex items-start gap-3.5 p-6 pt-7 sm:p-7 text-left">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-sm"
              aria-hidden="true"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="logout-modal-title"
                className={`text-lg sm:text-xl font-black leading-tight text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}
              >
                {t.title}
              </h2>
              <p className={`mt-1 text-sm font-semibold leading-snug text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                {t.message}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-white/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:flex-row sm:p-5 sm:pb-5">
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`order-1 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-red-500 py-3 text-base font-black text-white shadow-md shadow-red-500/30 transition-all active:scale-[0.98] disabled:opacity-60 sm:order-2 sm:flex-1 ${language === 'bn' ? 'font-bengali' : ''}`}
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>{t.loggingOut}</span>
                </>
              ) : (
                t.confirm
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className={`order-2 min-h-[48px] w-full rounded-full border border-slate-200/80 bg-white py-3 text-base font-bold text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-[0.98] disabled:opacity-50 sm:order-1 sm:flex-1 ${language === 'bn' ? 'font-bengali' : ''}`}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
