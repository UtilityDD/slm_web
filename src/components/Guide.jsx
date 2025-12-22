import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { QRCodeCanvas } from 'qrcode.react';

const Guide = ({ hideHeader = false }) => {
    const contentRef = useRef(null);

    const downloadPDF = () => {
        const element = contentRef.current;

        // Save original styles
        const originalWidth = element.style.width;
        const originalMargin = element.style.margin;
        const originalPadding = element.style.padding;

        // Force mobile width and remove extra spacing to capture mobile layout
        element.style.width = '375px';
        element.style.margin = '0';
        element.style.padding = '0';

        const opt = {
            margin: 0, // No margin for full screen effect
            filename: 'SmartLineman_Volunteer_Handbook.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: 375,
                scrollY: 0
            },
            jsPDF: {
                unit: 'px',
                format: [375, 812], // Standard mobile viewport (e.g., iPhone X)
                orientation: 'portrait'
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // Add a temporary class for PDF styling if needed
        element.classList.add('pdf-mode');

        html2pdf().set(opt).from(element).save().then(() => {
            // Restore original styles
            element.classList.remove('pdf-mode');
            element.style.width = originalWidth;
            element.style.margin = originalMargin;
            element.style.padding = originalPadding;
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8 font-bengali">
            <div className="max-w-4xl mx-auto">
                {/* Print Button - Hidden during print and if hideHeader is true */}
                {!hideHeader && (
                    <div className="mb-6 text-center print:hidden">
                        <button
                            onClick={downloadPDF}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95"
                        >
                            <span>📥</span>
                            <span>PDF ডাউনলোড করুন</span>
                        </button>
                    </div>
                )}

                {/* Handbook Container */}
                <div ref={contentRef} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                    {/* Header */}
                    {!hideHeader && (
                        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 p-8 sm:p-12 text-center text-white relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32 blur-3xl"></div>
                            </div>
                            <div className="relative z-10">
                                <h1 className="text-3xl sm:text-4xl font-bold mb-4">📘 ভলান্টিয়ারদের হ্যান্ডবুক</h1>
                                <p className="text-xl font-medium opacity-90 mb-2 text-blue-100">SMARTLINEMAN কমিউনিটি</p>
                                <p className="text-sm italic opacity-75">(লাইনম্যানদের জন্য, লাইনম্যানদের দ্বারা)</p>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6 sm:p-10 space-y-10">
                        {/* Section 1: Purpose */}
                        <section className="html2pdf__page-break">
                            <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3 text-slate-900 dark:text-slate-100">
                                <span className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-xl flex items-center justify-center">🎯</span>
                                মূল উদ্দেশ্য
                            </h2>
                            <div className="grid gap-4">
                                {[
                                    { icon: '🦺', text: 'কর্মক্ষেত্রে নিরাপত্তা চর্চা বৃদ্ধি' },
                                    { icon: '👨‍👩‍👧‍👦', text: 'শক্তিশালী সহযোগিতামূলক কমিউনিটি গঠন' },
                                    { icon: '🤝', text: 'তথ্যভিত্তিকভাবে সমস্যার মূল কারণ চিহ্নিত করা' },
                                    { icon: '📊', text: 'লাইনম্যান পরিবারের সামাজিক ও আর্থিক সুরক্ষার উপায় খোঁজা' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-l-4 border-blue-500">
                                        <span className="text-xl">{item.icon}</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Section 2: Why */}
                        <section className="html2pdf__page-break">
                            <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3 text-slate-900 dark:text-slate-100">
                                <span className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">💡</span>
                                কেন এই উদ্যোগ
                            </h2>
                            <div className="grid gap-4">
                                {[
                                    { icon: '⚠️', text: 'লাইনম্যানদের কাজ অত্যন্ত ঝুঁকিপূর্ণ' },
                                    { icon: '💰', text: 'বেতন ও সুরক্ষা কাজের ঝুঁকির তুলনায় কম' },
                                    { icon: '🧾', text: 'দুর্ঘটনার পর ক্ষতিপূরণ ও চিকিৎসা অনিশ্চিত' },
                                    { icon: '🧍‍♂️', text: 'অধিকাংশই আউটসোর্স — নিরাপত্তাহীনতা বেশি' },
                                    { icon: '📉', text: 'দুর্ঘটনা হলে পরিবারের উপর দীর্ঘমেয়াদী প্রভাব পড়ে' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border-l-4 border-red-500">
                                        <span className="text-xl">{item.icon}</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl text-center">
                                <p className="text-amber-800 dark:text-amber-200 font-bold">
                                    👉 সমাধান উপর থেকে চাপিয়ে দিলে কাজ হয় না।<br />
                                    সমাধান আসবে নিজেদের ভিতর থেকেই।
                                </p>
                            </div>
                        </section>

                        {/* Section 3: Philosophy */}
                        <section className="html2pdf__page-break">
                            <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3 text-slate-900 dark:text-slate-100">
                                <span className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl flex items-center justify-center">🏗️</span>
                                আমাদের দর্শন
                            </h2>
                            <div className="space-y-3 italic text-blue-600 dark:text-blue-400 font-medium text-lg px-4">
                                <p>🔹 "নির্দেশ নয়, সহযোগিতা"</p>
                                <p>🔹 "অফিস নয়, কমিউনিটি"</p>
                                <p>🔹 "কথা কম, কাজ বেশি"</p>
                            </div>
                            <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl text-center">
                                <p className="text-blue-800 dark:text-blue-200 font-bold">
                                    👉 লাইনম্যানদের জন্য ও লাইনম্যানদের দ্বারা পরিচালিত উদ্যোগ
                                </p>
                            </div>
                        </section>

                        {/* Section 4: Roles */}
                        <section className="html2pdf__page-break">
                            <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3 text-slate-900 dark:text-slate-100">
                                <span className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center">👥</span>
                                ভলান্টিয়ার (সেফটি মিত্র) কারা?
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <p className="font-bold text-red-600 mb-2">ভলান্টিয়ার মানে—</p>
                                    {['বস না', 'অফিসার না', 'নির্দেশদাতা না'].map((text, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border-l-4 border-red-500">
                                            <span className="text-red-600">❌</span>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-3">
                                    <p className="font-bold text-green-600 mb-2 invisible sm:visible">.</p>
                                    {['তিনি মাধ্যম', 'তিনি বন্ধু', 'তিনি সহযোগী'].map((text, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border-l-4 border-green-500">
                                            <span className="text-green-600">✔️</span>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Section 5: Responsibilities */}
                        <section className="html2pdf__page-break">
                            <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3 text-slate-900 dark:text-slate-100">
                                <span className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 rounded-xl flex items-center justify-center">🛠️</span>
                                ভলান্টিয়ারের প্রধান ভূমিকা
                            </h2>
                            <div className="grid gap-4">
                                {[
                                    { icon: '👨‍🔧', text: '১০–১২ জন লাইনম্যানের সাথে যোগাযোগ রাখা' },
                                    { icon: '📝', text: 'ডেটা সংগ্রহে সাহায্য করা' },
                                    { icon: '🗣️', text: ' সমস্যা শুনে তালিকা করা' },
                                    { icon: '📢', text: 'অনলাইন লার্নিংয়ে উৎসাহ দেওয়া' },
                                    { icon: '🤝', text: 'এডমিনদের সাথে নিয়মিত আলোচনা' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-cyan-50/30 dark:bg-cyan-900/5 rounded-2xl border-l-4 border-cyan-500">
                                        <span className="text-xl">{item.icon}</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-xl text-center italic text-slate-600 dark:text-slate-400">
                                👉 কথা বলাবে, নিজে কথা চাপাবে না।
                            </div>
                        </section>

                        {/* Section 6: Pledge */}
                        <section className="print:break-inside-avoid html2pdf__page-break">
                            <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-3xl text-center">
                                <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-4">🔐 গোপনীয়তার শপথ</h3>
                                <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                                    "কমিউনিটির কোনো তথ্য<br />
                                    অফিস, ঠিকাদার বা বাইরের কারো কাছে যাবে না।<br />
                                    এই তথ্য শুধুই একে অপরকে বাঁচানোর জন্য।"
                                </p>
                            </div>
                        </section>

                        {/* Share / QR Code Section */}
                        <section className="html2pdf__page-break flex flex-col items-center justify-center text-center py-8">
                            <h3 className="text-lg font-bold mb-4 text-slate-700 dark:text-slate-300">আমাদের সাথে যুক্ত হোন</h3>
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 mb-3">
                                <QRCodeCanvas value="https://slm-web-eight.vercel.app/" size={120} />
                            </div>
                            <p className="text-sm text-slate-500 mb-1">ভিজিট করুন:</p>
                            <a href="https://slm-web-eight.vercel.app/" className="text-blue-600 font-bold text-sm hover:underline">
                                https://slm-web-eight.vercel.app/
                            </a>
                            <p className="text-xs text-slate-400 mt-2">v1.1</p>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-10 text-center text-white">
                        <p className="text-xl font-bold mb-6 leading-relaxed">
                            🌱 শেষ কথা<br />
                            🤝 "আজ আমরা কমিউনিটি বানাচ্ছি।<br />
                            কাল এটা কারো জীবন বাঁচাবে।"
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {['❤️ আশা জাগানো মানুষ', '🦺 নিরাপত্তার বন্ধু', '🤝 বিপদের দিনের সাথী'].map((badge, i) => (
                                <span key={i} className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm">
                                    {badge}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Guide;
