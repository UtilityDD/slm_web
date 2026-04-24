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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4 animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 animate-slide-up-sheet sm:animate-bounce-in overflow-hidden"
      >
        {/* Android Sheet Handle */}
        <div className="flex justify-center pt-4 pb-2 sm:hidden">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full opacity-50"></div>
        </div>

        <div className="p-8 sm:p-6 text-center sm:text-left">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto sm:mx-0 mb-6 text-2xl">
            👋
          </div>
          <h2 className={`text-2xl font-black text-slate-900 dark:text-white mb-2 ${language === 'bn' ? 'font-bengali' : ''}`}>{t.title}</h2>
          <p className={`text-slate-500 dark:text-slate-400 font-medium ${language === 'bn' ? 'font-bengali text-lg' : ''}`}>{t.message}</p>
        </div>

        <div className="p-6 sm:p-5 flex flex-col sm:flex-row gap-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="order-1 sm:order-2 w-full sm:flex-1 py-4 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{t.loggingOut}</span>
              </>
            ) : (
              t.confirm
            )}
          </button>
          
          <button
            onClick={onCancel}
            disabled={loading}
            className="order-2 sm:order-1 w-full sm:flex-1 py-4 sm:py-2.5 text-slate-500 dark:text-slate-400 font-black hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all disabled:opacity-50 active:scale-95"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
