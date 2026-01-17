/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { CapacitorHttp } from '@capacitor/core';

const AwarenessStories = ({ setCurrentView }) => {
    const [htmlContent, setHtmlContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                setLoading(true);
                // Use CapacitorHttp to bypass CORS issues on Android
                const response = await CapacitorHttp.get({
                    url: 'https://smartlinemanapp.github.io/accident_story/',
                });

                if (response.status !== 200) throw new Error(`Status: ${response.status}`);

                let text = response.data;

                // Inject <base> tag to fix relative links to CSS/JS/Images
                const baseUrl = 'https://smartlinemanapp.github.io/accident_story/';
                const baseTag = `<base href="${baseUrl}" target="_blank" />`;

                if (text.includes('<head>')) {
                    text = text.replace('<head>', `<head>${baseTag}`);
                } else {
                    text = `<!DOCTYPE html><html><head>${baseTag}</head><body>${text}</body></html>`;
                }

                setHtmlContent(text);
            } catch (err) {
                console.error("Accident Story Fetch Error:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchPage();
    }, []);

    return (
        <div className="relative w-full h-[calc(100vh-80px)] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
            {/* Header for back navigation */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-30 flex items-center px-4">
                <button
                    onClick={() => setCurrentView('home')}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-colors font-bold text-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back
                </button>
            </div>

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
            )}

            {error ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <p className="mb-4 text-slate-600 dark:text-slate-300">
                        Unable to load stories directly.<br />
                        <span className="text-xs opacity-75 text-red-500">(Network Restriction / CORS)</span>
                    </p>
                    <button
                        onClick={() => window.open('https://smartlinemanapp.github.io/accident_story/', '_system')}
                        className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
                    >
                        Open External Site
                    </button>
                    <button
                        onClick={() => setCurrentView('home')}
                        className="mt-4 text-slate-500 font-bold hover:text-slate-700 underline"
                    >
                        Go Back
                    </button>
                </div>
            ) : (
                <iframe
                    srcDoc={htmlContent}
                    className="w-full h-full border-0 bg-white pt-12"
                    title="Accident Awareness Stories"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
                />
            )}
        </div>
    );
};

export default AwarenessStories;
