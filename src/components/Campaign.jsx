import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';

export default function Campaign({ language = 'en', setCurrentView }) {
    const [selectedTemplate, setSelectedTemplate] = useState('professional');
    const posterRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Placeholder URL - User can update this later
    const APP_URL = "https://smartlineman.app";

    const templates = {
        professional: {
            name: "Professional",
            bg: "bg-gradient-to-br from-slate-900 to-slate-800",
            text: "text-white",
            accent: "text-blue-400",
            border: "border-blue-500/30",
            description: "Clean and corporate look suitable for official communications."
        },
        safety: {
            name: "Safety First",
            bg: "bg-gradient-to-br from-orange-600 to-red-700",
            text: "text-white",
            accent: "text-yellow-300",
            border: "border-yellow-500/30",
            description: "High visibility design emphasizing safety protocols."
        },
        community: {
            name: "Community",
            bg: "bg-gradient-to-br from-emerald-600 to-teal-700",
            text: "text-white",
            accent: "text-emerald-200",
            border: "border-emerald-400/30",
            description: "Friendly and inviting design for team sharing."
        },
        light: {
            name: "Clean Light",
            bg: "bg-gradient-to-br from-slate-50 to-white",
            text: "text-slate-900",
            accent: "text-blue-600",
            border: "border-slate-200",
            description: "Minimalist light theme design."
        }
    };

    const handleDownload = async () => {
        if (!posterRef.current) return;
        setIsDownloading(true);

        try {
            const canvas = await html2canvas(posterRef.current, {
                scale: 2, // Higher resolution
                useCORS: true,
                backgroundColor: null
            });

            const link = document.createElement('a');
            link.download = `smartlineman-campaign-${selectedTemplate}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to generate image. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const t = {
        en: {
            title: "Campaign Center",
            subtitle: "Generate professional posters to share SmartLineman with your team.",
            selectTemplate: "Select Template",
            download: "Download Poster",
            downloading: "Generating...",
            scanMe: "SCAN TO DOWNLOAD",
            tagline: "Empowering Linemen with Safety & Knowledge",
            features: ["Safety Protocols", "Competitions", "Emergency Network"]
        },
        bn: {
            title: "ক্যাম্পেইন সেন্টার",
            subtitle: "আপনার দলের সাথে স্মার্টলাইনম্যান শেয়ার করতে পেশাদার পোস্টার তৈরি করুন।",
            selectTemplate: "টেমপ্লেট নির্বাচন করুন",
            download: "পোস্টার ডাউনলোড করুন",
            downloading: "তৈরি হচ্ছে...",
            scanMe: "ডাউনলোড করতে স্ক্যান করুন",
            tagline: "নিরাপত্তা এবং জ্ঞানের সাথে লাইনম্যানদের ক্ষমতায়ন",
            features: ["নিরাপত্তা প্রোটোকল", "প্রতিযোগিতা", "জরুরী নেটওয়ার্ক"]
        }
    }[language];

    const currentTheme = templates[selectedTemplate];

    return (
        <div className="compact-container py-6 sm:py-10 mb-20 animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-block p-3 rounded-2xl bg-indigo-100 text-indigo-600 text-2xl mb-3 shadow-sm">
                    📢
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {t.title}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                    {t.subtitle}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Controls */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="material-card p-6">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                            {t.selectTemplate}
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(templates).map(([key, template]) => (
                                <div
                                    key={key}
                                    onClick={() => setSelectedTemplate(key)}
                                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedTemplate === key
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg ${template.bg} shadow-sm`}></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{template.name}</h4>
                                        <p className="text-[10px] text-slate-500 leading-tight">{template.description}</p>
                                    </div>
                                    {selectedTemplate === key && (
                                        <div className="text-blue-500">✓</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-full material-button-primary py-4 text-lg shadow-xl shadow-blue-500/20"
                    >
                        {isDownloading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t.downloading}
                            </>
                        ) : (
                            <>
                                <span>⬇️</span> {t.download}
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => setCurrentView('home')}
                        className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        Back to Home
                    </button>
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-8 flex items-start justify-center bg-slate-100 dark:bg-slate-900/50 rounded-3xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800 min-h-[600px]">
                    {/* The Poster */}
                    <div
                        ref={posterRef}
                        className={`w-full max-w-[400px] aspect-[3/4] ${currentTheme.bg} relative overflow-hidden shadow-2xl flex flex-col items-center text-center p-8 rounded-none`}
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        {/* Decorative Elements */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-white/10 blur-3xl transform -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/10 blur-3xl transform translate-y-1/2 translate-x-1/2"></div>

                        {/* Content */}
                        <div className="relative z-10 flex flex-col h-full w-full">
                            {/* Logo Area */}
                            <div className="mb-8">
                                <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center text-4xl shadow-lg mb-4">
                                    ⚡
                                </div>
                                <h2 className={`text-3xl font-black tracking-tighter ${currentTheme.text}`}>
                                    Smart<span className={currentTheme.accent}>Lineman</span>
                                </h2>
                            </div>

                            {/* Tagline */}
                            <div className="mb-10">
                                <p className={`text-lg font-medium leading-relaxed opacity-90 ${currentTheme.text}`}>
                                    {t.tagline}
                                </p>
                            </div>

                            {/* QR Code Container */}
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <div className="bg-white p-4 rounded-3xl shadow-2xl transform rotate-3 transition-transform hover:rotate-0 duration-500">
                                    <QRCodeCanvas
                                        value={APP_URL}
                                        size={180}
                                        level={"H"}
                                        includeMargin={true}
                                        imageSettings={{
                                            src: "/vite.svg", // Using vite logo as placeholder if app logo not avail
                                            x: undefined,
                                            y: undefined,
                                            height: 24,
                                            width: 24,
                                            excavate: true,
                                        }}
                                    />
                                </div>
                                <div className={`mt-6 font-bold tracking-widest text-sm uppercase ${currentTheme.accent}`}>
                                    {t.scanMe}
                                </div>
                            </div>

                            {/* Features Footer */}
                            <div className={`mt-auto pt-8 border-t ${currentTheme.border}`}>
                                <div className="flex justify-center gap-4 text-[10px] font-bold uppercase tracking-wider opacity-80">
                                    {t.features.map((feature, i) => (
                                        <span key={i} className={currentTheme.text}>{feature}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
