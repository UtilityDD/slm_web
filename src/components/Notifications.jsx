import React, { useEffect } from 'react';

export default function Notifications({ language, notifications = [], setCurrentView }) {
    // Scroll to top when component mounts
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // If no notifications, show empty state
    if (!notifications || notifications.length === 0) {
        return (
            <div className="min-h-screen bg-[#fffdf7] flex flex-col text-slate-900">
                {/* Header */}
                <div className="pt-4 px-4 pb-3 flex items-center gap-3 bg-[#fffdf7]/95 backdrop-blur border-b border-slate-200/80 sticky top-0 z-10">
                    <button
                        onClick={() => setCurrentView('home')}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
                    >
                        ←
                    </button>
                    <h1 className={`text-xl font-black tracking-tight text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি'}
                    </h1>
                </div>

                {/* Empty Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <span className="text-6xl">🔕</span>
                    </div>
                    <h2 className={`text-xl font-black text-slate-900 mb-2 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en' ? 'No Notifications Yet' : 'কোনো বিজ্ঞপ্তি নেই'}
                    </h2>
                    <p className={`text-slate-500 max-w-xs leading-relaxed font-semibold ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en'
                            ? "We'll let you know when there are important safety updates or events."
                            : "গুরুত্বপূর্ণ সুরক্ষা আপডেট বা ইভেন্ট থাকলে আমরা আপনাকে জানাব।"}
                    </p>
                    <button
                        onClick={() => setCurrentView('home')}
                        className={`mt-8 rounded-full bg-orange-500 px-6 py-3 text-white font-black shadow-md shadow-orange-500/30 transition-all active:scale-95 ${language === 'bn' ? 'font-bengali' : ''}`}
                    >
                        {language === 'en' ? 'Go to Home' : 'হোমে ফিরে যান'}
                    </button>
                </div>
            </div>
        );
    }

    // Render list
    return (
        <div className="min-h-screen bg-[#fffdf7] flex flex-col pb-6 text-slate-900">
            {/* Header */}
            <div className="pt-4 px-4 pb-3 flex items-center gap-3 bg-[#fffdf7]/95 backdrop-blur border-b border-slate-200/80 sticky top-0 z-10">
                <button
                    onClick={() => setCurrentView('home')}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
                >
                    ←
                </button>
                <h1 className={`text-xl font-black tracking-tight text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {language === 'en' ? 'Notifications' : 'বিজ্ঞপ্তি'}
                </h1>
                <span className="ml-auto bg-orange-100 text-orange-600 text-xs font-black px-2.5 py-1 rounded-full">
                    {notifications.length}
                </span>
            </div>

            {/* List */}
            <div className="p-4 space-y-4">
                {notifications.map((notif, index) => (
                    <div
                        key={notif.id || index}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 animate-slide-up-fade"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="flex gap-4">
                            <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-2xl ${notif.type === 'alert' ? 'bg-red-100 text-red-600' :
                                notif.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                    notif.type === 'success' ? 'bg-green-100 text-green-600' :
                                        'bg-blue-100 text-blue-600'
                                }`}>
                                {notif.type === 'alert' ? '🚨' :
                                    notif.type === 'warning' ? '⚠️' :
                                        notif.type === 'success' ? '✅' : '📢'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h3 className={`font-black text-slate-900 leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {notif.title}
                                    </h3>
                                    <span className="text-[10px] text-slate-400 shrink-0 mt-0.5 font-semibold">
                                        {new Date(notif.created_at || Date.now()).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className={`text-sm text-slate-600 leading-relaxed font-medium ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {notif.message}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="text-center pt-8 pb-4">
                    <p className={`text-xs text-slate-400 uppercase tracking-widest font-black ${language === 'bn' ? 'font-bengali normal-case tracking-normal' : ''}`}>
                        {language === 'en' ? 'End of List' : 'তালিকার শেষ'}
                    </p>
                </div>
            </div>
        </div>
    );
}
