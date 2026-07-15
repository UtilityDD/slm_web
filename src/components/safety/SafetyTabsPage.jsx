/* eslint-disable react/prop-types */
import React, { useEffect } from 'react';
import SafetyTopTabs from './SafetyTopTabs';
import { storageUtils } from '../../utils/storageUtils';
import MyPPE from './MyPPE';
import SafetyLibrary from './SafetyLibrary';

/**
 * Shared shell for My PPE ↔ Safety Library — soft Material chrome,
 * stable tabs-only header (no PPE List/Figure control), both panels stay mounted.
 */
export default function SafetyTabsPage({ activeTab, setCurrentView, language, user }) {
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

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fffdf7] text-slate-900">
            <div
                className="h-1 w-full shrink-0 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
                aria-hidden="true"
            />

            <div className="z-[100] shrink-0 border-b border-slate-200/80 bg-[#fffdf7]/90 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 py-3 sm:px-8">
                    <SafetyTopTabs
                        current={activeTab}
                        onNavigate={setCurrentView}
                        language={language}
                        className="w-full max-w-md"
                    />
                </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
                <div
                    className={`h-full min-h-0 ${isPpe ? '' : 'hidden'}`}
                    aria-hidden={!isPpe}
                >
                    <MyPPE
                        language={language}
                        user={user}
                        setCurrentView={setCurrentView}
                        embedded
                    />
                </div>
                <div
                    className={`h-full min-h-0 ${isPpe ? 'hidden' : ''}`}
                    aria-hidden={isPpe}
                >
                    <SafetyLibrary
                        language={language}
                        setCurrentView={setCurrentView}
                        embedded
                    />
                </div>
            </div>
        </div>
    );
}
