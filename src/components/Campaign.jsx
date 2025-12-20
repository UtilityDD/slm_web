import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';

export default function Campaign({ language = 'en', setCurrentView }) {
    const posterRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Placeholder URL - User can update this later
    const APP_URL = "https://smartlineman.app";

    const handleDownload = async () => {
        if (!posterRef.current) return;
        setIsDownloading(true);

        try {
            const canvas = await html2canvas(posterRef.current, {
                scale: 3, // High resolution for print
                useCORS: true,
                backgroundColor: null
            });

            const link = document.createElement('a');
            link.download = `smartlineman-campaign.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to generate image. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleWhatsAppShare = () => {
        const text = language === 'en'
            ? "⚡ Check out SmartLineman - The ultimate safety and community app for West Bengal Linemen! Download here: " + APP_URL
            : "⚡ স্মার্ট লাইনম্যান অ্যাপটি দেখুন - পশ্চিমবঙ্গের লাইনম্যানদের জন্য সেরা নিরাপত্তা এবং কমিউনিটি অ্যাপ! ডাউনলোড করুন: " + APP_URL;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const t = {
        en: {
            title: "Share App",
            download: "Save",
            whatsapp: "WhatsApp",
            downloading: "Saving...",
            tagline: "Safety • Community • Knowledge"
        },
        bn: {
            title: "অ্যাপ শেয়ার করুন",
            download: "সেভ করুন",
            whatsapp: "হোয়াটসঅ্যাপ",
            downloading: "সেভ হচ্ছে...",
            tagline: "নিরাপত্তা • কমিউনিটি • জ্ঞান"
        }
    }[language];

    return (
        <div className="compact-container py-6 mb-20 animate-fade-in min-h-[80vh] flex flex-col items-center justify-center">
            {/* Header - Minimal */}
            <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {t.title}
                </h1>
            </div>

            {/* Poster Preview - Clean & Compact */}
            <div className="relative mb-6 shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div
                    ref={posterRef}
                    className="w-[260px] bg-white relative flex flex-col items-center text-center p-6"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                >
                    {/* Minimal Content */}
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl text-white shadow-md mb-3">
                        ⚡
                    </div>

                    <h2 className="text-lg font-black tracking-tighter text-slate-900 mb-0.5">
                        Smart<span className="text-blue-600">Lineman</span>
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-5">
                        West Bengal
                    </p>

                    {/* QR Code */}
                    <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm mb-5">
                        <QRCodeCanvas
                            value={APP_URL}
                            size={110}
                            level={"H"}
                            includeMargin={true}
                            imageSettings={{
                                src: "/vite.svg",
                                height: 18,
                                width: 18,
                                excavate: true,
                            }}
                        />
                    </div>

                    {/* Tagline */}
                    <p className="text-[10px] font-medium text-slate-500">
                        {t.tagline}
                    </p>

                    {/* Bottom Accent */}
                    <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                </div>
            </div>

            {/* Actions - Compact Grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-[260px]">
                <button
                    onClick={handleWhatsAppShare}
                    className="py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    {t.whatsapp}
                </button>

                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="py-2.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                >
                    {isDownloading ? (
                        <span className="animate-pulse">{t.downloading}</span>
                    ) : (
                        <>
                            <span>⬇️</span> {t.download}
                        </>
                    )}
                </button>

                <button
                    onClick={() => setCurrentView('home')}
                    className="col-span-2 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
}
