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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-sm border border-slate-200 dark:border-slate-700">
        <div className="p-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{t.title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t.message}</p>
        </div>
        <div className="px-5 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors min-w-[100px] flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{t.loggingOut}</span>
              </>
            ) : (
              t.confirm
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
