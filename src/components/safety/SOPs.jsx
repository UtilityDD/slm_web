/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { CapacitorHttp } from '@capacitor/core';

const SOPs = () => {
    const [htmlContent, setHtmlContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                setLoading(true);
                // Use CapacitorHttp to bypass CORS issues on Android
                const response = await CapacitorHttp.get({
                    url: 'https://smartlineman.github.io/sop/sop.html',
                });

                if (response.status !== 200) throw new Error(`Status: ${response.status}`);

                let text = response.data;

                // Inject <base> tag to fix relative links to CSS/JS/Images
                const baseUrl = 'https://smartlineman.github.io/sop/';
                const baseTag = `<base href="${baseUrl}" target="_blank" />`;

                if (text.includes('<head>')) {
                    text = text.replace('<head>', `<head>${baseTag}`);
                } else {
                    text = `<!DOCTYPE html><html><head>${baseTag}</head><body>${text}</body></html>`;
                }

                setHtmlContent(text);
            } catch (err) {
                console.error("SOP Fetch Error:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchPage();
    }, []);

    return (
        <div className="relative w-full h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
            )}

            {error ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <p className="mb-4 text-slate-600 dark:text-slate-300">
                        Unable to load content directly.<br />
                        <span className="text-xs opacity-75 text-red-500">(Network Restriction / CORS)</span>
                    </p>
                    <button
                        onClick={() => window.open('https://smartlineman.github.io/sop/sop.html', '_system')}
                        className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
                    >
                        Open External Site
                    </button>
                </div>
            ) : (
                <iframe
                    srcDoc={htmlContent}
                    className="w-full h-full border-0 bg-white"
                    title="Standard Operating Procedures"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
                />
            )}

            {/* Watermark Overlay - Central Big Text */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 overflow-hidden">
                <div className="transform -rotate-12 opacity-15 text-red-600 dark:text-red-500 text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-widest text-center px-4 select-none">
                    Demo Only.<br />Not to use.<br />Under development.
                </div>
            </div>

            {/* Persistent Bottom Warning */}
            <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-center py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest z-20 opacity-90">
                Demo Only • Not to use • Under Development
            </div>
        </div>
    );
};

export default SOPs;
