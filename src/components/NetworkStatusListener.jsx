import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Network } from '@capacitor/network';
import { isNativeCapacitorPlatform } from '../utils/webPush';

const NetworkStatusListener = ({ language = 'en' }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [isWeakSignal, setIsWeakSignal] = useState(false);
    const [showRestored, setShowRestored] = useState(false);
    const isNative = isNativeCapacitorPlatform();
    const wasOnlineRef = useRef(true);

    useEffect(() => {
        let cancelled = false;
        let removeNativeListener = null;

        const initializeNetworkStatus = async () => {
            if (isNative) {
                try {
                    const status = await Network.getStatus();
                    if (cancelled) return;
                    wasOnlineRef.current = status.connected;
                    setIsOnline(status.connected);

                    const handle = await Network.addListener('networkStatusChange', (status) => {
                        const wasOnline = wasOnlineRef.current;
                        wasOnlineRef.current = status.connected;
                        setIsOnline(status.connected);

                        if (!wasOnline && status.connected) {
                            setShowRestored(true);
                            setTimeout(() => setShowRestored(false), 3000);
                        }
                    });
                    removeNativeListener = () => {
                        handle?.remove?.();
                    };
                } catch (error) {
                    console.error('Error initializing Capacitor Network:', error);
                    setIsOnline(navigator.onLine);
                }
                return;
            }

            setIsOnline(navigator.onLine);
        };

        initializeNetworkStatus();

        const handleOnline = () => {
            setIsOnline(true);
            setShowRestored(true);
            setTimeout(() => setShowRestored(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowRestored(false);
        };

        if (!isNative) {
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
        }

        const checkConnectionQuality = () => {
            if (navigator.connection && !isNative) {
                const type = navigator.connection.effectiveType;
                setIsWeakSignal(type === 'slow-2g' || type === '2g');
            }
        };

        const handleConnectionChange = () => {
            checkConnectionQuality();
        };

        if (navigator.connection && !isNative) {
            navigator.connection.addEventListener('change', handleConnectionChange);
            checkConnectionQuality();
        }

        return () => {
            cancelled = true;
            if (!isNative) {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
                if (navigator.connection) {
                    navigator.connection.removeEventListener('change', handleConnectionChange);
                }
            }
            removeNativeListener?.();
        };
    }, [isNative]);

    const showWarning = !isOnline || isWeakSignal;

    if (!showWarning && !showRestored) return null;

    const offlineCopy = isNative
        ? (language === 'en'
            ? 'No internet — lessons images & audio need a connection. Scores may not save.'
            : 'ইন্টারনেট নেই — পাঠের ছবি ও অডিওর জন্য সংযোগ লাগবে। স্কোর সেভ নাও হতে পারে।')
        : (language === 'en'
            ? 'No Internet! You may lose progress/scores if you continue.'
            : 'ইন্টারনেট নেই! আপনি এখন কাজ চালিয়ে গেলে স্কোর হারাতে পারেন।');

    const weakCopy = language === 'en'
        ? 'Weak Signal! Data saving may fail.'
        : 'দুর্বল সিগন্যাল! ডেটা সেভ হতে সমস্যা হতে পারে।';

    return createPortal(
        <div className="fixed top-0 left-0 right-0 z-[10000] flex flex-col items-center pointer-events-none pt-[env(safe-area-inset-top,0px)]">
            {showWarning && (
                <div className={`${isOnline ? 'bg-orange-500' : 'bg-red-500'} w-full text-white px-4 py-2.5 shadow-lg flex items-center justify-center gap-2 animate-slide-down pointer-events-auto`}>
                    <svg className="w-5 h-5 shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                    </svg>
                    <span className={`font-bold text-sm text-center leading-snug ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {isOnline ? weakCopy : offlineCopy}
                    </span>
                    {!isOnline && (
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="ml-2 shrink-0 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors border border-white/40 touch-manipulation"
                        >
                            {language === 'en' ? 'RETRY' : 'পুনরায়'}
                        </button>
                    )}
                </div>
            )}

            {isOnline && !isWeakSignal && showRestored && (
                <div className="mt-4 px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce-in pointer-events-auto backdrop-blur-md bg-slate-900/95 text-slate-100 border border-slate-600/40 border-l-4 border-l-emerald-500">
                    <svg className="w-5 h-5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={`font-semibold text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en' ? 'You are back online!' : 'আপনি আবার অনলাইনে ফিরে এসেছেন!'}
                    </span>
                </div>
            )}
        </div>,
        document.body
    );
};

export default NetworkStatusListener;
