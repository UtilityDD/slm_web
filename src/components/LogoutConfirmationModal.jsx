import React from "react";

export default function LogoutConfirmationModal({ onConfirm, onCancel, language }) {
  const translations = {
    en: {
      title: "Confirm Logout",
      message: "Are you sure you want to log out?",
      confirm: "Logout",
      cancel: "Cancel",
    },
    bn: {
      title: "লগ আউট নিশ্চিত করুন",
      message: "আপনি কি নিশ্চিত যে আপনি লগ আউট করতে চান?",
      confirm: "লগ আউট",
      cancel: "বাতিল",
    },
  };

  const t = translations[language];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm m-4 animate-fade-in-up">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-3">{t.title}</h2>
          <p className="text-slate-600 mb-6">{t.message}</p>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="material-button-outlined"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="material-button-primary"
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
