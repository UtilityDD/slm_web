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
        'w-full rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-orange-50/40 focus:ring-2 focus:ring-orange-200/60';

    return (
        <div className="min-h-screen bg-[#fffdf7] pb-24 text-slate-900">
            {/* Sticky Header */}
            <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#fffdf7]/95 backdrop-blur">
                <div className="mx-auto max-w-7xl space-y-3 px-4 py-3 sm:px-8 sm:py-4">
                    <div className="flex items-center justify-between gap-4">
                        {!isSearchExpanded ? (
                            <>
                                <div className="flex min-w-0 items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('training')}
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
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
                                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-all hover:bg-orange-50 active:scale-95 sm:hidden"
                                        aria-label={t.searchPlaceholder}
                                    >
                                        <SearchIcon className="h-5 w-5" />
                                    </button>

                                    <div className="relative hidden max-w-md flex-1 sm:block">
                                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder={t.searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={searchInputClass}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}
                                    className={`shrink-0 rounded-full px-3 py-2 text-xs font-black text-orange-600 transition-colors hover:bg-orange-50 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wide'}`}
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
                                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-black transition-all active:scale-95 sm:text-xs ${
                                    activeCategory === cat
                                        ? 'border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                                        : 'border-slate-200/80 bg-white text-slate-600 shadow-sm hover:bg-orange-50'
                                } ${language === 'bn' ? 'font-bengali' : ''}`}
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
                                <div key={i} className="aspect-video animate-pulse rounded-2xl border border-slate-200/80 bg-white shadow-sm" />
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    <div className="mx-auto max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
                        <p className="mb-4 font-bold text-red-600">{error}</p>
                        <button
                            type="button"
                            onClick={() => loadData(true)}
                            className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-95"
                        >
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
                                className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
                            >
                                <div className="relative aspect-video overflow-hidden bg-slate-100">
                                    <img
                                        src={video.thumbnail}
                                        alt=""
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 transition-colors group-hover:bg-slate-900/35">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-md shadow-orange-900/30 transition-transform group-hover:scale-110">
                                            <PlayIcon className="ml-0.5 h-6 w-6" />
                                        </div>
                                    </div>
                                    <div className="absolute left-3 top-3">
                                        <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur">
                                            {video.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1.5 p-4">
                                    <h3 className={`line-clamp-2 text-sm font-black leading-snug text-slate-900 transition-colors group-hover:text-orange-600 sm:text-base ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {video.title}
                                    </h3>
                                    {video.remarks && (
                                        <p className={`line-clamp-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${language === 'bn' ? 'font-bengali normal-case' : ''}`}>
                                            {video.remarks}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300/80 bg-white py-16 text-center shadow-sm">
                        <VideoIcon className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                        <p className={`text-base font-black text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>{t.noResults}</p>
                    </div>
                )}
            </div>

            {/* Video Player Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[150] flex animate-fade-in items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
                    <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:max-h-[88vh] sm:rounded-2xl sm:animate-scale-in animate-slide-up-sheet">
                        <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-[#fffdf7] px-4 py-3">
                            <div
                                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
                                aria-hidden="true"
                            />
                            <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-700">
                                {selectedVideo.category}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedVideo(null)}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
                                aria-label={language === 'en' ? 'Close' : 'বন্ধ করুন'}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="aspect-video w-full shrink-0 bg-black">
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
                                <p className={`mb-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-700 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {selectedVideo.remarks}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={() => setSelectedVideo(null)}
                                className={`rounded-full border border-slate-200/80 bg-white px-5 py-2.5 text-xs font-black text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-95 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}
                            >
                                {t.back}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
