import React, { useState, useEffect } from 'react';
import { videoService } from '../../utils/videoService';

const PlayIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="m7 4 12 8-12 8V4z"></path>
    </svg>
);

const SearchIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

const ChevronLeftIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m15 18-6-6 6-6"></path>
    </svg>
);

const VideoIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m22 8-6 4 6 4V8Z"></path>
        <rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect>
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
            title: 'Video Guide',
            searchPlaceholder: 'Search video...',
            noResults: 'No videos found',
            retry: 'Retry',
            back: 'Back',
            categories: 'Categories'
        },
        bn: {
            title: 'ভিডিও গাইড',
            searchPlaceholder: 'ভিডিও খুঁজুন...',
            noResults: 'কোনো ভিডিও পাওয়া যায়নি',
            retry: 'আবার চেষ্টা করুন',
            back: 'ফিরুন',
            categories: 'বিভাগ'
        }
    }[language];

    const loadData = async (force = false) => {
        try {
            setLoading(true);
            setError(null);
            const data = await videoService.fetchVideos(force);
            setVideos(data);
            setFilteredVideos(data);
            
            const uniqueCats = ['All', ...new Set(data.map(v => v.category))];
            setCategories(uniqueCats);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        const filtered = videos.filter(v => {
            const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                v.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || v.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
        setFilteredVideos(filtered);
    }, [searchQuery, activeCategory, videos]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Sticky Header */}
            <div className="sticky top-0 z-[100] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 pt-10 pb-4 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        {!isSearchExpanded ? (
                            <>
                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <button 
                                        onClick={() => setCurrentView('training')} 
                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-90 transition-transform"
                                    >
                                        <ChevronLeftIcon className="w-5 h-5" />
                                    </button>
                                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {t.title}
                                    </h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Mobile Search Trigger */}
                                    <button 
                                        onClick={() => setIsSearchExpanded(true)}
                                        className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-90 transition-transform"
                                    >
                                        <SearchIcon className="w-5 h-5" />
                                    </button>
                                    
                                    {/* Desktop Search Bar */}
                                    <div className="hidden sm:block relative group max-w-md w-full">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder={t.searchPlaceholder}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800/50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                                <div className="relative flex-1">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder={t.searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
                                    />
                                </div>
                                <button 
                                    onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}
                                    className="px-3 py-2 text-sm font-bold text-orange-500 dark:text-orange-400 active:scale-95"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Categories Horizontal Scroll */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap border
                                    ${activeCategory === cat
                                        ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 sm:p-8">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500 font-bold mb-4">{error}</p>
                        <button onClick={() => loadData(true)} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold">{t.retry}</button>
                    </div>
                ) : filteredVideos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {filteredVideos.map((video) => (
                            <div 
                                key={video.id}
                                onClick={() => setSelectedVideo(video)}
                                className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-2xl hover:shadow-orange-500/10 transition-all cursor-pointer active:scale-[0.98]"
                            >
                                <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
                                    <img 
                                        src={video.thumbnail} 
                                        alt={video.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                        <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                            <PlayIcon className="w-6 h-6 ml-1" />
                                        </div>
                                    </div>
                                    <div className="absolute top-3 left-3">
                                        <span className="px-2 py-1 bg-black/50 backdrop-blur-md text-[10px] text-white font-bold rounded-lg uppercase tracking-wider">
                                            {video.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 space-y-2">
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors">
                                        {video.title}
                                    </h3>
                                    {video.remarks && (
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                                            {video.remarks}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-400">
                        <VideoIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                        <p className="text-lg font-bold">{t.noResults}</p>
                    </div>
                )}
            </div>

            {/* Video Player Modal - Optimized for Portrait & Landscape UX */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-6 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={() => setSelectedVideo(null)} />
                    
                    <div className="relative w-full max-w-5xl max-h-screen sm:max-h-[90vh] bg-black sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-scale-in flex flex-col">
                        {/* Header/Close bar for mobile */}
                        <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">
                            <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-auto sm:hidden">
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{selectedVideo.category}</span>
                            </div>
                            <button 
                                onClick={() => setSelectedVideo(null)}
                                className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors pointer-events-auto border border-white/10 shadow-lg"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {/* Video Container */}
                        <div className="w-full aspect-video bg-black flex items-center justify-center">
                            <iframe
                                src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
                                title={selectedVideo.title}
                                className="w-full h-full border-none"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>

                        {/* Metadata Section - Optimized for Portrait reading */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-gradient-to-b from-slate-900 to-black text-white custom-scrollbar">
                            <div className="max-w-3xl mx-auto space-y-4">
                                <div className="space-y-2">
                                    <span className="hidden sm:inline-block px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-2">
                                        {selectedVideo.category}
                                    </span>
                                    <h2 className="text-lg sm:text-2xl font-black leading-tight tracking-tight text-white/95">
                                        {selectedVideo.title}
                                    </h2>
                                </div>
                                
                                {selectedVideo.remarks && (
                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed italic">
                                            "{selectedVideo.remarks}"
                                        </p>
                                    </div>
                                )}

                                <div className="pt-6 flex items-center gap-4">
                                    <button 
                                        onClick={() => setSelectedVideo(null)}
                                        className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-500 hover:text-white transition-all active:scale-95"
                                    >
                                        {t.back}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
