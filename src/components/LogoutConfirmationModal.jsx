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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm m-4 animate-scale-in">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">{t.title}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{t.message}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onCancel}
            disabled={loading}
            className="material-button-outlined disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="material-button-primary min-w-[100px] flex items-center justify-center gap-2 disabled:opacity-70"
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
