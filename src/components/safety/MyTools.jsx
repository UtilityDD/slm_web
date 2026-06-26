/* eslint-disable react/prop-types */
import React from 'react';

const MyTools = ({ user, language = 'bn', onClose }) => {
    return (
        <div className="w-full min-h-[80vh] animate-fade-in py-12 flex flex-col items-center justify-center text-center px-6">
            <div className="relative mb-10">
                {/* Decorative Glow */}
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse-slow"></div>

                {/* Premium Icon Container */}
                <div className="relative w-32 h-32 bg-gradient-to-br from-indigo-500 to-indigo-700 dark:from-indigo-600 dark:to-indigo-900 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-2xl shadow-indigo-500/30 transform hover:scale-110 transition-transform duration-500 group">
                    <span className="animate-bounce-subtle">🛠️</span>
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl shadow-lg border-2 border-indigo-100 dark:border-indigo-900">
                        ✨
                    </div>
                </div>
            </div>

            <h3 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
                {language === 'en' ? 'Coming Soon!' : 'শীঘ্রই আসছে!'}
            </h3>

            <p className="text-slate-600 dark:text-slate-400 font-bold max-w-sm text-lg leading-relaxed mb-6">
                {language === 'en'
                    ? 'We are building a premium interactive toolbox for you. Stay tuned for the new experience!'
                    : 'আমরা আপনার জন্য একটি প্রিমিয়াম ইন্টারেক্টিভ টুলবক্স তৈরি করছি। নতুন অভিজ্ঞতার জন্য সাথেই থাকুন!'}
            </p>

            {onClose && (
                <button
                    onClick={onClose}
                    className="mb-10 px-8 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl font-black text-sm transition-all active:scale-95"
                >
                    {language === 'en' ? '← Back to admin panel' : '← অ্যাডমিন প্যানেলে ফিরুন'}
                </button>
            )}

            {/* Premium Loader / Indicator */}
            <div className="flex gap-3 items-center">
                <div className="w-3 h-3 rounded-full bg-indigo-600 animate-bounce shadow-lg shadow-indigo-600/40" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce shadow-lg shadow-indigo-500/40" style={{ animationDelay: '200ms' }}></div>
                <div className="w-3 h-3 rounded-full bg-indigo-400 animate-bounce shadow-lg shadow-indigo-400/40" style={{ animationDelay: '400ms' }}></div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 w-full max-w-xs">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {language === 'en' ? 'SmartLineman.in Toolbox' : 'স্মার্টলাইনম্যান ডট ইন টুলবক্স'}
                </p>
            </div>
        </div>
    );
};

export default MyTools;
