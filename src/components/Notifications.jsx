import React, { useEffect } from 'react';

export default function Notifications({ language, notifications = [], setCurrentView }) {
    // Scroll to top when component mounts
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // If no notifications, show empty state
    if (!notifications || notifications.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
                {/* Header */}
                <div className="pt-4 px-4 pb-2 flex items-center gap-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm sticky top-0 z-10">
                    <button
                        onClick={() => setCurrentView('home')}
                        className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                    >
                        ←
                    </button>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি'}
                    </h1>
                </div>

                {/* Empty Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <div className="w-32 h-32 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-6">
                        <span className="text-6xl">🔕</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {language === 'en' ? 'No Notifications Yet' : 'কোনো বিজ্ঞপ্তি নেই'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                        {language === 'en'
                            ? "We'll let you know when there are important safety updates or events."
                            : "গুরুত্বপূর্ণ সুরক্ষা আপডেট বা ইভেন্ট থাকলে আমরা আপনাকে জানাব।"}
                    </p>
                    <button
                        onClick={() => setCurrentView('home')}
                        className="mt-8 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                    >
                        {language === 'en' ? 'Go to Home' : 'হোমে ফিরে যান'}
                    </button>
                </div>
            </div>
        );
    }

    // Render list
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-6">
            {/* Header */}
            <div className="pt-4 px-4 pb-2 flex items-center gap-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm sticky top-0 z-10">
                <button
                    onClick={() => setCurrentView('home')}
                    className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                >
                    ←
                </button>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি'}
                </h1>
                <span className="ml-auto bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold px-2.5 py-1 rounded-full">
                    {notifications.length}
                </span>
            </div>

            {/* List */}
            <div className="p-4 space-y-4">
                {notifications.map((notif, index) => (
                    <div
                        key={notif.id || index}
                        className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-slide-up-fade"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="flex gap-4">
                            <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-2xl ${notif.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/20' :
                                notif.type === 'warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20' :
                                    notif.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' :
                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/20'
                                }`}>
                                {notif.type === 'alert' ? '🚨' :
                                    notif.type === 'warning' ? '⚠️' :
                                        notif.type === 'success' ? '✅' : '📢'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                        {notif.title}
                                    </h3>
                                    <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                                        {new Date(notif.created_at || Date.now()).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {notif.message}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="text-center pt-8 pb-4">
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                        {language === 'en' ? 'End of List' : 'তালিকার শেষ'}
                    </p>
                </div>
            </div>
        </div>
    );
}
