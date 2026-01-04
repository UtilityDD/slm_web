import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const SaveSuccessModal = ({ isOpen, onClose, title, message, language = 'en' }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Auto close after 2 seconds if no interaction
            const timer = setTimeout(() => {
                onClose();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full transform transition-all animate-scale-in border border-slate-100 dark:border-slate-700 mx-auto relative">
                <div className="flex flex-col items-center text-center">
                    {/* Animated Success Icon */}
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                        <svg className="w-8 h-8 animate-success-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {title || (language === 'en' ? 'Saved Successfully!' : 'সফলভাবে সংরক্ষিত হয়েছে!')}
                    </h3>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {message || (language === 'en' ? 'Your changes have been updated.' : 'আপনার পরিবর্তনগুলি আপডেট করা হয়েছে।')}
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SaveSuccessModal;
