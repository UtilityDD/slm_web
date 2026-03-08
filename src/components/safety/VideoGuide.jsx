import React from 'react';

const VideoGuide = ({ language = 'bn', setCurrentView }) => {
    return (
        <div className="w-full min-h-[80vh] animate-fade-in py-12 flex flex-col items-center justify-center text-center px-6 bg-slate-50 dark:bg-slate-900">
            <div className="relative mb-10">
                {/* Decorative Glow */}
                <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full scale-150 animate-pulse-slow"></div>

                {/* Premium Icon Container */}
                <div className="relative w-32 h-32 bg-gradient-to-br from-orange-500 to-orange-700 dark:from-orange-600 dark:to-orange-800 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-2xl shadow-orange-500/30 transform hover:scale-110 transition-transform duration-500 group">
                    <span className="animate-bounce-subtle">🎞️</span>
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl shadow-lg border-2 border-orange-100 dark:border-orange-900">
                        ✨
                    </div>
                </div>
            </div>

            <h3 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
                {language === 'en' ? 'Coming Soon!' : 'শীঘ্রই আসছে!'}
            </h3>

            <p className="text-slate-600 dark:text-slate-400 font-bold max-w-sm text-lg leading-relaxed mb-8">
                {language === 'en'
                    ? 'We are curating a premium library of safety video guides for you. Stay tuned for the launch!'
                    : 'আমরা আপনার জন্য সুরক্ষা ভিডিও গাইডের একটি প্রিমিয়াম লাইব্রেরি তৈরি করছি। লঞ্চের জন্য সাথেই থাকুন!'}
            </p>

            <button
                onClick={() => setCurrentView('training')}
                className="mb-12 px-8 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 rounded-xl font-black text-sm transition-all active:scale-95 shadow-sm"
            >
                {language === 'en' ? '← Back to Training' : '← প্রশিক্ষণে ফিরে যান'}
            </button>

            {/* Premium Loader / Indicator */}
            <div className="flex gap-3 items-center">
                <div className="w-3 h-3 rounded-full bg-orange-600 animate-bounce shadow-lg shadow-orange-600/40" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 rounded-full bg-orange-500 animate-bounce shadow-lg shadow-orange-500/40" style={{ animationDelay: '200ms' }}></div>
                <div className="w-3 h-3 rounded-full bg-orange-400 animate-bounce shadow-lg shadow-orange-400/40" style={{ animationDelay: '400ms' }}></div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 w-full max-w-xs">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {language === 'en' ? 'SmartLineman.in Video Library' : 'স্মার্টলাইনম্যান ডট ইন ভিডিও লাইব্রেরি'}
                </p>
            </div>
        </div>
    );
};

export default React.memo(VideoGuide);

