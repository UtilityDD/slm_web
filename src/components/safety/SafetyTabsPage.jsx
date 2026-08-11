/* eslint-disable react/prop-types */
import React, { useEffect } from 'react';
import { storageUtils } from '../../utils/storageUtils';
import MyPPE from './MyPPE';
import SafetyLibrary from './SafetyLibrary';

/**
 * Full-height shell for My PPE and Identify (Chinun).
 * Home opens each as its own view — no shared top tabs.
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
            <div className="relative min-h-0 flex-1 overflow-hidden">
                {isPpe ? (
                    <MyPPE
                        language={language}
                        user={user}
                        setCurrentView={setCurrentView}
                        embedded
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
    );
}
