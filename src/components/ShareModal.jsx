import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share } from '@capacitor/share';

/**
 * ShareModal Component
 * Displays a QR code and provides native sharing options for the app.
 */
export default function ShareModal({ isOpen, onClose, shareUrl, language }) {
    if (!isOpen) return null;

    const handleNativeShare = async () => {
        try {
            await Share.share({
                title: 'SmartLineMan App',
                text: language === 'en'
                    ? '🛡️ Join SmartLineMan - The ultimate safety platform for linemen!'
                    : '🛡️ স্মার্ট লাইনম্যান অ্যাপে যোগ দিন - লাইনম্যানদের জন্য সেরা সুরক্ষা প্ল্যাটফর্ম!',
                url: shareUrl,
                dialogTitle: language === 'en' ? 'Share SmartLineMan' : 'স্মার্ট লাইনম্যান শেয়ার করুন',
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        alert(language === 'en' ? 'Link copied to clipboard!' : 'লিঙ্ক ক্লিপবোর্ডে কপি করা হয়েছে!');
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700">
                {/* Header */}
                <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-6 text-white text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/10 hover:bg-black/20 rounded-full transition-colors"
                    >
                        ✕
                    </button>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-3 backdrop-blur-md">📱</div>
                    <h3 className="text-xl font-bold uppercase tracking-wider">
                        {language === 'en' ? 'Share App' : 'অ্যাপ শেয়ার করুন'}
                    </h3>
                    <p className="text-amber-50 text-xs mt-1 font-medium opacity-90">
                        {language === 'en' ? 'Invite your team members' : 'আপনার দলের সদস্যদের আমন্ত্রণ জানান'}
                    </p>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center">
                    {/* QR Code Container */}
                    <div className="bg-white p-4 rounded-2xl shadow-inner mb-6 border-2 border-slate-50">
                        <QRCodeSVG
                            value={shareUrl}
                            size={180}
                            level="H"
                            includeMargin={false}
                            imageSettings={{
                                src: "/icon-192.png",
                                x: undefined,
                                y: undefined,
                                height: 40,
                                width: 40,
                                excavate: true,
                            }}
                        />
                    </div>

                    <p className="text-slate-500 dark:text-slate-400 text-xs text-center mb-8 px-4 leading-relaxed">
                        {language === 'en'
                            ? 'Scan this QR code or use the buttons below to share the installation link.'
                            : 'এই কিউআর কোডটি স্ক্যান করুন অথবা নিচের বাটনগুলি ব্যবহার করে ইন্সটলেশন লিঙ্কটি শেয়ার করুন।'}
                    </p>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all active:scale-95"
                        >
                            📋 {language === 'en' ? 'Copy' : 'কপি'}
                        </button>
                        <button
                            onClick={handleNativeShare}
                            className="flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                        >
                            📤 {language === 'en' ? 'Share' : 'শেয়ার'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
