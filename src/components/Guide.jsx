import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import TabLoader from './guide/TabLoader';

// Lazy load tab components
const IntroTab = lazy(() => import('./guide/IntroTab'));
const Day1Tab = lazy(() => import('./guide/Day1Tab'));
const Day2Tab = lazy(() => import('./guide/Day2Tab'));
const DataCollectionTab = lazy(() => import('./guide/DataCollectionTab'));
const PrinciplesTab = lazy(() => import('./guide/PrinciplesTab'));

const Guide = ({ hideHeader = false, userRole = 'lineman' }) => {
    // Determine available tabs based on role
    const allTabs = [
        { id: 'intro', label: 'সূচনা', icon: '📘' },
        { id: 'day1', label: 'Day 1: প্রথম সাক্ষাৎ', icon: '🤝' },
        { id: 'day2', label: 'Day 2: এনগেজমেন্ট', icon: '💡' },
        { id: 'data-collection', label: 'তথ্য সংগ্রহ', icon: '📊' },
        { id: 'principles', label: 'মূলমন্ত্র', icon: '🌟' }
    ];

    const tabs = userRole === 'lineman'
        ? allTabs.filter(tab => tab.id === 'principles')
        : allTabs;

    const [activeTab, setActiveTab] = useState(userRole === 'lineman' ? 'principles' : 'intro');
    const [guideContent, setGuideContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const contentRef = useRef(null);

    // Update active tab if role changes
    useEffect(() => {
        if (userRole === 'lineman' && activeTab !== 'principles') {
            setActiveTab('principles');
        }
    }, [userRole]);
    useEffect(() => {
        fetch('/guide/guideContent.json')
            .then(res => res.json())
            .then(data => {
                setGuideContent(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Error loading guide content:', err);
                setIsLoading(false);
            });
    }, []);



    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-4 sm:py-8 px-4 sm:px-6 lg:px-8 font-bengali">
            <div className="max-w-4xl mx-auto">
                {/* Navigation Tabs */}
                {!hideHeader && (
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-slate-200 dark:border-slate-700'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Handbook Container */}
                <div ref={contentRef} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 transition-all duration-500">

                    {/* Dynamic Header based on Tab */}
                    {!hideHeader && guideContent && (
                        <div className={`p-8 sm:p-10 text-center text-white relative overflow-hidden ${activeTab === 'intro' ? 'bg-gradient-to-br from-orange-600 to-orange-800' :
                            activeTab === 'day1' ? 'bg-gradient-to-br from-green-600 to-teal-700' :
                                activeTab === 'day2' ? 'bg-gradient-to-br from-orange-500 to-red-600' :
                                    activeTab === 'data-collection' ? 'bg-gradient-to-br from-cyan-600 to-orange-700' :
                                        'bg-gradient-to-br from-purple-600 to-pink-600'
                            }`}>
                            <div className="absolute inset-0 opacity-10 pdf-hide">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32 blur-3xl"></div>
                            </div>
                            <div className="relative z-10 animate-fade-in">
                                <h1 className="text-2xl sm:text-4xl font-bold mb-3">
                                    {tabs.find(t => t.id === activeTab).label}
                                </h1>
                                <p className="text-lg font-medium opacity-90 text-white/90">
                                    {activeTab === 'intro' && 'SmartLineman.in ভলান্টিয়ার হ্যান্ডবুক'}
                                    {activeTab === 'day1' && 'Building Trust & Confidence'}
                                    {activeTab === 'day2' && 'Community Engagement & Learning'}
                                    {activeTab === 'data-collection' && 'Effective Data Collection'}
                                    {activeTab === 'principles' && 'Knowledge is Power!'}
                                </p>
                            </div>

                        </div>
                    )}

                    {/* Content Area */}
                    <div className="p-6 sm:p-10 space-y-8 min-h-[400px]">
                        {isLoading ? (
                            <TabLoader />
                        ) : guideContent ? (
                            <Suspense fallback={<TabLoader />}>
                                {activeTab === 'intro' && <IntroTab content={guideContent.intro} />}
                                {activeTab === 'day1' && <Day1Tab content={guideContent.day1} />}
                                {activeTab === 'day2' && <Day2Tab content={guideContent.day2} />}
                                {activeTab === 'data-collection' && <DataCollectionTab content={guideContent.dataCollection} />}
                                {activeTab === 'principles' && <PrinciplesTab content={guideContent.principles} />}
                            </Suspense>
                        ) : (
                            <div className="text-center py-20 text-slate-500">
                                <p>Failed to load guide content.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer for all tabs */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 text-center border-t border-slate-100 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            SmartLineman.in Volunteer Handbook
                        </p>
                    </div>
                </div >
            </div >
        </div >
    );
};

export default Guide;
