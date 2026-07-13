/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import SafetyTopTabs from './SafetyTopTabs';
import { storageUtils } from '../../utils/storageUtils';
import MyPPE from './MyPPE';
import SafetyLibrary from './SafetyLibrary';

/**
 * Shared shell for My PPE ↔ Safety Library — one hazard stripe, one tab bar,
 * consistent neo-brutal light theme, and a light crossfade instead of full page remount.
 */
export default function SafetyTabsPage({ activeTab, setCurrentView, language, user }) {
    const [ppeView, setPpeView] = useState('figure');
    const isPpe = activeTab === 'my_ppe';

    useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('dark');

        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const previousThemeColor = metaThemeColor?.getAttribute('content') || null;
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', '#fffdf7');

        return () => {
            const savedTheme = storageUtils.getItem('appTheme') || 'dark';
            if (savedTheme === 'dark') {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
            if (previousThemeColor) {
                metaThemeColor.setAttribute('content', previousThemeColor);
            }
        };
    }, []);

    useEffect(() => {
        if (!isPpe) setPpeView('figure');
    }, [isPpe]);

    return (
        <div className="neo-brutal flex flex-col h-full min-h-0 overflow-hidden text-slate-900">
            <div className="nb-hazard shrink-0" aria-hidden="true" />

            <div className="shrink-0 bg-[#fffdf7] border-b-2 border-slate-900 z-[100]">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <SafetyTopTabs
                            current={activeTab}
                            onNavigate={setCurrentView}
                            language={language}
                            className="flex-1 min-w-0 max-w-md"
                        />
                        {isPpe && (
                            <button
                                type="button"
                                onClick={() => setPpeView((v) => (v === 'list' ? 'figure' : 'list'))}
                                className="shrink-0 px-3 py-2 border-2 border-slate-900 bg-white text-slate-900 text-xs font-black shadow-[3px_3px_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#0f172a] transition-transform"
                            >
                                {ppeView === 'list'
                                    ? (language === 'en' ? 'Figure' : 'ছবি')
                                    : (language === 'en' ? 'List' : 'তালিকা')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                <div key={activeTab} className="safety-tab-panel h-full min-h-0">
                    {isPpe ? (
                        <MyPPE
                            language={language}
                            user={user}
                            setCurrentView={setCurrentView}
                            embedded
                            ppeView={ppeView}
                            onPpeViewChange={setPpeView}
                        />
                    ) : (
                        <SafetyLibrary
                            language={language}
                            setCurrentView={setCurrentView}
                            embedded
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
