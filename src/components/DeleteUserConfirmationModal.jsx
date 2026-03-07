import React from "react";
import { createPortal } from "react-dom";

export default function DeleteUserConfirmationModal({ isOpen, onConfirm, onCancel, targetUser, language, loading }) {
    if (!isOpen) return null;

    const translations = {
        en: {
            title: "Confirm Permanant Deletion",
            warning1: "This action is IRREVERSIBLE.",
            warning2: "Deleting this user will permanently wipe all their profiles, posts, PPE records, and quiz history from the application database.",
            authNote: "Note: This will not remove their Supabase Auth account. You must still manually delete them from the Supabase Authentication Dashboard to fully revoke their access.",
            confirm: "Yes, Delete Everything",
            cancel: "No, Keep User",
            deleting: "Deleting Data..."
        },
        bn: {
            title: "স্থায়ীভাবে মুছে ফেলা নিশ্চিত করুন",
            warning1: "এই পদক্ষেপটি অপরিবর্তনীয়।",
            warning2: "এই ব্যবহারকারীকে মুছে ফেললে অ্যাপ্লিকেশন ডেটাবেস থেকে তাদের প্রোফাইল, পোস্ট, পিপিই রেকর্ড এবং কুইজ হিস্ট্রি স্থায়ীভাবে মুছে যাবে।",
            authNote: "দ্রষ্টব্য: এটি তাদের সুপারবেস অথ (Auth) অ্যাকাউন্ট রিমুভ করবে না। তাদের অ্যাক্সেস সম্পূর্ণরূপে বাতিল করতে আপনাকে অবশ্যই সুপারবেস অথ ড্যাশবোর্ড থেকে তাদের ম্যানুয়ালি মুছে ফেলতে হবে।",
            confirm: "হ্যাঁ, সবকিছু মুছে ফেলুন",
            cancel: "না, ইউজার রাখুন",
            deleting: "মুছে ফেলা হচ্ছে..."
        },
    };

    const t = translations[language] || translations.en;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce-slow">
                        ⚠️
                    </div>

                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-4">{t.title}</h2>

                    <div className="space-y-3 mb-8">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{t.warning1}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t.warning2}
                        </p>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium italic">
                                {t.authNote}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:grayscale"
                        >
                            {loading ? (
                                <>
                                    <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>{t.deleting}</span>
                                </>
                            ) : (
                                <>
                                    <span>🗑️</span>
                                    <span>{t.confirm}</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="w-full py-4 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors disabled:opacity-50"
                        >
                            {t.cancel}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
