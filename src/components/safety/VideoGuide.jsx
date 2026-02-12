import React, { useState, useEffect, useMemo } from 'react';
import { requestManager } from '../../utils/requestManager';
import VideoResourceCard from './VideoResourceCard';

const VideoGuide = ({ language, setCurrentView }) => {
    const [videoResources, setVideoResources] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchVideoResources = async () => {
            try {
                setIsLoading(true);
                const SHEET_ID = '163Cba6vhgxrNoStkWkDEHrGTIwiLMD2cDa2XhI7-N1w';
                const GID = '0';
                const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

                const data = await requestManager.fetch('training_videos', async () => {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Failed to fetch video resources');
                    const csvText = await response.text();

                    const lines = csvText.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());

                    return lines.slice(1).filter(line => line.trim()).map(line => {
                        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/"/g, ''));
                        const obj = {};
                        headers.forEach((header, i) => {
                            if (values[i] !== undefined) obj[header] = values[i];
                        });

                        return {
                            url: obj.link || obj.url || '',
                            title: obj.topic || obj.title || '',
                            description: obj.description || '',
                            category: obj.remarks || obj.category || 'General'
                        };
                    }).filter(v => v.url);
                }, { ttl: 60, swr: true });

                if (data) setVideoResources(data);
            } catch (err) {
                console.error('Error fetching videos:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVideoResources();
    }, []);

    const categories = useMemo(() => {
        const unique = new Set(videoResources.map(v => v.category));
        return ['All', ...Array.from(unique)];
    }, [videoResources]);

    const filteredVideos = useMemo(() => {
        return videoResources.filter(video => {
            const matchesCategory = selectedCategory === 'All' || video.category === selectedCategory;
            const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                video.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [videoResources, selectedCategory, searchQuery]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 overflow-x-hidden">
            {/* YouTube Style Header/Search */}
            <div className="sticky top-0 z-40 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3 safe-area-inset-top">
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={() => setCurrentView('training')}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="flex-1 max-w-2xl relative group">
                            <input
                                type="text"
                                placeholder={language === 'en' ? 'Search videos...' : 'ভিডিও খুঁজুন...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-100 dark:bg-slate-700/50 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-slate-800 rounded-full outline-none transition-all dark:text-white"
                            />
                            <svg className="w-5 h-5 absolute left-4 top-3 text-slate-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold shrink-0">
                            V
                        </div>
                    </div>

                    {/* Categories Chips */}
                    <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar scroll-smooth">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${selectedCategory === category
                                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-md'
                                        : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 pt-8">
                {/* Status Header */}
                <div className="mb-8">
                    <h1 className={`text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en' ? 'Video Library' : 'ভিডিও লাইব্রেরি'}
                    </h1>
                    <p className={`text-slate-500 dark:text-slate-400 mt-1 font-medium ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en' ? `Showcase of ${videoResources.length} safety resources` : `${videoResources.length}টি সুরক্ষা নির্দেশিকা ভিডিও`}
                    </p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="animate-pulse">
                                <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-2xl mb-3"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredVideos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
                        {filteredVideos.map((video, idx) => (
                            <VideoResourceCard
                                key={idx}
                                video={video}
                                language={language}
                                onClick={(url) => window.open(url, '_system')}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="text-6xl mb-4 opacity-20">🎞️</div>
                        <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500">
                            {language === 'en' ? 'No videos found' : 'কোন ভিডিও পাওয়া যায়নি'}
                        </h3>
                        <button
                            onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                            className="mt-4 text-orange-600 font-bold hover:underline"
                        >
                            {language === 'en' ? 'Clear all filters' : 'সব ফিল্টার মুছে ফেলুন'}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default React.memo(VideoGuide);
