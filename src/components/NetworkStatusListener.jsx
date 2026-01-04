import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Network } from '@capacitor/network';

const NetworkStatusListener = ({ language = 'en' }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [isWeakSignal, setIsWeakSignal] = useState(false);
    const [showRestored, setShowRestored] = useState(false);
    const [isCapacitor, setIsCapacitor] = useState(false);

    useEffect(() => {
        // Detect if running in Capacitor (Android/iOS)
        const capacitorDetected = window.Capacitor !== undefined;
        setIsCapacitor(capacitorDetected);

        const initializeNetworkStatus = async () => {
            if (capacitorDetected) {
                // Use Capacitor Network API for native platforms
                try {
                    const status = await Network.getStatus();
                    setIsOnline(status.connected);

                    // Listen for network status changes
                    Network.addListener('networkStatusChange', (status) => {
                        const wasOnline = isOnline;
                        setIsOnline(status.connected);

                        if (!wasOnline && status.connected) {
                            // Connection restored
                            setShowRestored(true);
                            setTimeout(() => setShowRestored(false), 3000);
                        }
                    });
                } catch (error) {
                    console.error('Error initializing Capacitor Network:', error);
                    // Fallback to web API
                    setIsOnline(navigator.onLine);
                }
            } else {
                // Use browser API for web
                setIsOnline(navigator.onLine);
            }
        };

        initializeNetworkStatus();

        // Web fallback handlers
        const handleOnline = () => {
            setIsOnline(true);
            setShowRestored(true);
            setTimeout(() => setShowRestored(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowRestored(false);
        };

        if (!capacitorDetected) {
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
        }

        // Weak signal detection (web only)
        const checkConnectionQuality = () => {
            if (navigator.connection && !capacitorDetected) {
                const type = navigator.connection.effectiveType;
                setIsWeakSignal(type === 'slow-2g' || type === '2g');
            }
        };

        const handleConnectionChange = () => {
            checkConnectionQuality();
        };

        if (navigator.connection && !capacitorDetected) {
            navigator.connection.addEventListener('change', handleConnectionChange);
            checkConnectionQuality();
        }

        return () => {
            if (!capacitorDetected) {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
                if (navigator.connection) {
                    navigator.connection.removeEventListener('change', handleConnectionChange);
                }
            }
            // Cleanup Capacitor listener
            if (capacitorDetected) {
                Network.removeAllListeners();
            }
        };
    }, []);

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
