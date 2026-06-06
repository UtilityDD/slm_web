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
        className="neo-brutal w-full sm:max-w-sm animate-slide-up-sheet sm:animate-bounce-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="nb-card overflow-hidden p-0 rounded-none sm:rounded-lg border-t-[2.5px] sm:border-[2.5px] border-slate-900 shadow-[0_-4px_0_#0f172a] sm:shadow-[4px_4px_0_#0f172a]">
          <div className="nb-hazard" aria-hidden="true" />

          <div className="p-6 sm:p-7 text-center sm:text-left bg-[#fffdf7]">
            <div className="nb-icon-badge w-14 h-14 flex items-center justify-center mx-auto sm:mx-0 mb-5 bg-red-100 text-red-700">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h2
              id="logout-modal-title"
              className={`text-xl sm:text-2xl font-black text-slate-900 mb-2 ${language === 'bn' ? 'font-bengali' : ''}`}
            >
              {t.title}
            </h2>
            <p className={`text-slate-600 font-semibold text-sm sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
              {t.message}
            </p>
          </div>

          <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 border-t-2 border-slate-900 bg-white pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="order-1 sm:order-2 w-full sm:flex-1 min-h-[48px] py-3 nb-btn-danger font-black text-base flex items-center justify-center gap-2"
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
              className="order-2 sm:order-1 w-full sm:flex-1 min-h-[48px] py-3 nb-btn-secondary font-black text-base disabled:opacity-50"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
