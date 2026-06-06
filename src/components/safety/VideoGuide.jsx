import React, { useState, useEffect } from 'react';
import { videoService } from '../../utils/videoService';
import { storageUtils } from '../../utils/storageUtils';
import { BrutalLoaderContent } from '../loaders/PageLoader';

const PlayIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="m7 4 12 8-12 8V4z" />
    </svg>
);

const SearchIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const ChevronLeftIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m15 18-6-6 6-6" />
    </svg>
);

const VideoIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m22 8-6 4 6 4V8Z" />
        <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </svg>
);

export default function VideoGuide({ language, setCurrentView }) {
    const [videos, setVideos] = useState([]);
    const [filteredVideos, setFilteredVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [categories, setCategories] = useState(['All']);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    const t = {
        en: {
            title: 'Video Learning Library',
            searchPlaceholder: 'Search video...',
            noResults: 'No videos found',
            retry: 'Retry',
            back: 'Back',
            cancel: 'Cancel',
            categories: 'Categories',
            loading: 'Loading videos…',
        },
        bn: {
            title: 'ভিডিও লার্নিং লাইব্রেরি',
            searchPlaceholder: 'ভিডিও খুঁজুন...',
            noResults: 'কোনো ভিডিও পাওয়া যায়নি',
            retry: 'আবার চেষ্টা করুন',
            back: 'ফিরুন',
            cancel: 'বাতিল',
            categories: 'বিভাগ',
            loading: 'ভিডিও লোড হচ্ছে…',
        },
    }[language];

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

    const loadData = async (force = false) => {
        try {
            setLoading(true);
            setError(null);
            const data = await videoService.fetchVideos(force);
            setVideos(data);
            setFilteredVideos(data);

            const uniqueCats = ['All', ...new Set(data.map((v) => v.category))];
            setCategories(uniqueCats);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        const filtered = videos.filter((v) => {
            const matchesSearch =
                v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || v.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
        setFilteredVideos(filtered);
    }, [searchQuery, activeCategory, videos]);

    const searchInputClass =
        'w-full border-2 border-slate-900 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 shadow-[2px_2px_0_#0f172a] outline-none placeholder:text-slate-400 focus:shadow-[3px_3px_0_#0f172a]';

    return (
        <div className="neo-brutal min-h-screen bg-[#fffdf7] pb-24 text-slate-900">
            <div className="nb-hazard sticky top-0 z-[41]" aria-hidden="true" />

            {/* Sticky Header */}
            <div className="sticky top-[6px] z-40 border-b-[2.5px] border-slate-900 bg-white">
                <div className="mx-auto max-w-7xl space-y-3 px-4 py-3 sm:px-8 sm:py-4">
                    <div className="flex items-center justify-between gap-4">
                        {!isSearchExpanded ? (
                            <>
                                <div className="flex min-w-0 items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('training')}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0_#0f172a] transition-transform hover:bg-orange-50 active:translate-x-0.5 active:translate-y-0.5"
                                        aria-label={t.back}
                                    >
                                        <ChevronLeftIcon className="h-5 w-5" />
                                    </button>
                                    <h1 className={`truncate text-lg font-black tracking-tight text-slate-900 sm:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {t.title}
                                    </h1>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsSearchExpanded(true)}
                                        className="flex h-9 w-9 items-center justify-center border-2 border-slate-900 bg-white text-slate-700 shadow-[2px_2px_0_#0f172a] transition-transform hover:bg-orange-50 active:translate-x-0.5 active:translate-y-0.5 sm:hidden"
                                        aria-label={t.searchPlaceholder}
                                    >
                                        <SearchIcon className="h-5 w-5" />
                                    </button>

                                    <div className="relative hidden max-w-md flex-1 sm:block">
                                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder={t.searchPlaceholder}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className={searchInputClass}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center gap-2">
                                <div className="relative min-w-0 flex-1">
                                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder={t.searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={`${searchInputClass} py-2.5`}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}
                                    className="shrink-0 px-2 py-2 text-xs font-black text-orange-700 nb-mono uppercase tracking-wide"
                                >
                                    {t.cancel}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setActiveCategory(cat)}
                                className={`whitespace-nowrap border-2 border-slate-900 px-3 py-1.5 text-[10px] font-black shadow-[2px_2px_0_#0f172a] transition-transform active:translate-x-0.5 active:translate-y-0.5 sm:text-xs ${
                                    activeCategory === cat
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white text-slate-700 hover:bg-orange-50'
                                }`}
                            >
                                {cat === 'All' ? (language === 'en' ? 'All' : 'সব') : cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl p-4 sm:p-8">
                {loading ? (
                    <div className="flex flex-col items-center gap-8 py-12">
                        <BrutalLoaderContent message={t.loading} compact />
                        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="nb-card aspect-video animate-pulse bg-white" />
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    <div className="nb-card mx-auto max-w-md bg-white p-8 text-center">
                        <p className="mb-4 font-bold text-red-700">{error}</p>
                        <button type="button" onClick={() => loadData(true)} className="nb-btn-primary px-6 py-2.5 font-bold">
                            {t.retry}
                        </button>
                    </div>
                ) : filteredVideos.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                        {filteredVideos.map((video) => (
                            <button
                                key={video.id}
                                type="button"
                                onClick={() => setSelectedVideo(video)}
                                className="group nb-card overflow-hidden bg-white p-0 text-left transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
                            >
                                <div className="relative aspect-video overflow-hidden border-b-2 border-slate-900 bg-slate-100">
                                    <img
                                        src={video.thumbnail}
                                        alt=""
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/25 transition-colors group-hover:bg-slate-900/40">
                                        <div className="flex h-12 w-12 items-center justify-center border-2 border-slate-900 bg-orange-500 text-white shadow-[3px_3px_0_#0f172a] transition-transform group-hover:scale-105">
                                            <PlayIcon className="ml-0.5 h-6 w-6" />
                                        </div>
                                    </div>
                                    <div className="absolute left-3 top-3">
                                        <span className="nb-tag border-slate-900 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-800">
                                            {video.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1.5 p-4">
                                    <h3 className={`line-clamp-2 text-sm font-black leading-snug text-slate-900 transition-colors group-hover:text-orange-700 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {video.title}
                                    </h3>
                                    {video.remarks && (
                                        <p className={`line-clamp-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ${language === 'bn' ? 'font-bengali normal-case' : ''}`}>
                                            {video.remarks}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="nb-card mx-auto max-w-md border-dashed bg-amber-50 py-16 text-center">
                        <VideoIcon className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                        <p className={`text-base font-black text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>{t.noResults}</p>
                    </div>
                )}
            </div>

            {/* Video Player Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[150] flex animate-fade-in items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4">
                    <div className="neo-brutal flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden sm:max-h-[88vh] sm:animate-scale-in animate-slide-up-sheet">
                        <div className="nb-card flex max-h-[92vh] flex-col overflow-hidden bg-[#fffdf7] p-0 sm:max-h-[88vh]">
                            <div className="nb-hazard shrink-0" aria-hidden="true" />

                            <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-slate-900 bg-white px-4 py-3">
                                <span className="nb-tag bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-900">
                                    {selectedVideo.category}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedVideo(null)}
                                    className="flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-white text-slate-600 shadow-[2px_2px_0_#0f172a] hover:bg-orange-50"
                                    aria-label={language === 'en' ? 'Close' : 'বন্ধ করুন'}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="aspect-video w-full shrink-0 border-b-2 border-slate-900 bg-black">
                                <iframe
                                    src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1&rel=0&modestbranding=1`}
                                    title={selectedVideo.title}
                                    className="h-full w-full border-none"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                                <h2 className={`mb-3 text-lg font-black leading-tight text-slate-900 sm:text-xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {selectedVideo.title}
                                </h2>

                                {selectedVideo.remarks && (
                                    <p className={`mb-4 border-l-4 border-orange-500 bg-amber-50 px-3 py-2 text-sm font-semibold leading-relaxed text-slate-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {selectedVideo.remarks}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setSelectedVideo(null)}
                                    className="nb-btn-secondary px-5 py-2.5 text-xs font-black uppercase tracking-wider nb-mono"
                                >
                                    {t.back}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
