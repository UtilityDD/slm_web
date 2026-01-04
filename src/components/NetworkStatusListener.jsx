import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const NetworkStatusListener = ({ language = 'en' }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isWeakSignal, setIsWeakSignal] = useState(false);
    const [showRestored, setShowRestored] = useState(false);

    useEffect(() => {
        const checkConnectionQuality = () => {
            if (navigator.connection) {
                const type = navigator.connection.effectiveType;
                // Consider 'slow-2g' or '2g' as weak signal
                setIsWeakSignal(type === 'slow-2g' || type === '2g');
            }
        };

        const handleOnline = () => {
            setIsOnline(true);
            setShowRestored(true);
            setTimeout(() => setShowRestored(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowRestored(false);
        };

        const handleConnectionChange = () => {
            checkConnectionQuality();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Network Information API listener
        if (navigator.connection) {
            navigator.connection.addEventListener('change', handleConnectionChange);
            checkConnectionQuality(); // Initial check
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (navigator.connection) {
                navigator.connection.removeEventListener('change', handleConnectionChange);
            }
        };
    }, []);

    // Show banner if Offline OR Weak Signal
    const showWarning = !isOnline || isWeakSignal;

    if (!showWarning && !showRestored) return null;

    return createPortal(
        <div className="fixed top-0 left-0 right-0 z-[10000] flex flex-col items-center pointer-events-none">
            {/* Offline/Weak Signal Warning Banner */}
            {showWarning && (
                <div className={`${isOnline ? 'bg-orange-500' : 'bg-red-500'} w-full text-white px-4 py-2 shadow-lg flex items-center justify-center gap-2 animate-slide-down pointer-events-auto`}>
                    <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                    </svg>
                    <span className="font-bold text-sm text-center">
                        {language === 'en'
                            ? (isOnline ? 'Weak Signal! Data saving may fail.' : 'No Internet! You may lose progress/scores if you continue.')
                            : (isOnline ? 'দুর্বল সিগন্যাল! ডেটা সেভ হতে সমস্যা হতে পারে।' : 'ইন্টারনেট নেই! আপনি এখন কাজ চালিয়ে গেলে স্কোর হারাতে পারেন।')}
                    </span>
                    {!isOnline && (
                        <button
                            onClick={() => window.location.reload()}
                            className="ml-4 px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors border border-white/40"
                        >
                            {language === 'en' ? 'RETRY' : 'পুনরায় চেষ্টা করুন'}
                        </button>
                    )}
                </div>
            )}

            {/* Connection Restored Toast */}
            {isOnline && !isWeakSignal && showRestored && (
                <div className="mt-4 bg-green-500 text-white px-6 py-2 rounded-full shadow-xl flex items-center gap-2 animate-bounce-in pointer-events-auto backdrop-blur-md bg-opacity-90">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-bold text-sm">
                        {language === 'en' ? 'You are back online!' : 'আপনি আবার অনলাইনে ফিরে এসেছেন!'}
                    </span>
                </div>
            )}
        </div>,
        document.body
    );
};

export default NetworkStatusListener;
