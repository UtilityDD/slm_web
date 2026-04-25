import React, { useState, useEffect } from 'react';
import { libraryService } from '../../utils/libraryService';

const SearchIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

const ShieldCheckIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="m9 12 2 2 4-4"></path>
    </svg>
);

const WrenchIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
);

const TreeIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 19 7-7 3 3-7 7-3-3z"></path>
        <path d="m18 13-1.5-7.5L12 2l-4.5 3.5L6 13"></path>
        <path d="M12 19V5"></path>
    </svg>
);

const LineChartIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 3v18h18"></path>
        <path d="m19 9-5 5-4-4-3 3"></path>
    </svg>
);

const InfoIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

const ChevronLeftIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m15 18-6-6 6-6"></path>
    </svg>
);

const ChevronRightIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6"></path>
    </svg>
);

const getGoogleDriveDirectLink = (url) => {
    if (!url) return '';
    if (!url.includes('drive.google.com')) return url;
    const match = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/);
    const id = match ? (match[1] || match[2]) : '';
    const today = new Date().toISOString().split('T')[0];
    return id ? `https://lh3.googleusercontent.com/u/0/d/${id}?v=${today}` : url;
};

const ImageSlider = ({ images, alt, aspect = 'aspect-[4/3]', showControls = true }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [validImages, setValidImages] = useState(images || []);

    useEffect(() => {
        setValidImages(images || []);
        setCurrentIndex(0);
    }, [images]);

    useEffect(() => {
        if (!validImages || validImages.length <= 1 || !showControls) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % validImages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [validImages, showControls]);

    const handleImageError = (url) => {
        const updated = validImages.filter(img => img !== url);
        setValidImages(updated);
        if (currentIndex >= updated.length && updated.length > 0) {
            setCurrentIndex(0);
        }
    };

    if (!validImages || validImages.length === 0) {
        return (
            <div className={`${aspect} bg-slate-100 dark:bg-slate-900/50 flex flex-col items-center justify-center p-4 text-slate-400 text-center`}>
                <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>
            </div>
        );
    }

    return (
        <div className={`${aspect} bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden flex items-center justify-center group/slider`}>
            {showControls && validImages.length > 1 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-0 group-hover/slider:opacity-100"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
            )}

            <img
                key={currentIndex}
                src={getGoogleDriveDirectLink(validImages[currentIndex])}
                alt={`${alt} ${currentIndex + 1}`}
                onError={() => handleImageError(validImages[currentIndex])}
                className="max-h-full w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-all duration-700 animate-in fade-in zoom-in-95 duration-500"
            />

            {showControls && validImages.length > 1 && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % validImages.length); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-0 group-hover/slider:opacity-100"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 px-1.5 py-0.5 bg-black/20 dark:bg-white/20 backdrop-blur-md rounded-full">
                        {validImages.map((_, i) => (<div key={i} className={`w-1 h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-orange-500 w-2' : 'bg-white/50'}`} />))}
                    </div>
                </>
            )}
        </div>
    );
};

const GridImage = ({ images, alt, aspect = 'aspect-square' }) => {
    const [randomImage] = useState(() => {
        if (!images || images.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * images.length);
        return images[randomIndex];
    });

    if (!randomImage) {
        return (
            <div className={`${aspect} bg-slate-100 dark:bg-slate-900/50 flex flex-col items-center justify-center p-4 text-slate-400`}>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>
            </div>
        );
    }

    return (
        <div className={`${aspect} bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}>
            <img
                src={getGoogleDriveDirectLink(randomImage)}
                alt={alt}
                className="max-h-full w-full object-contain filter drop-shadow-sm p-2"
            />
        </div>
    );
};

export default function SafetyLibrary({ language, setCurrentView }) {
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('PPE');
    const [selectedItem, setSelectedItem] = useState(null);
    const [categories, setCategories] = useState([]);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    const getCategoryMetadata = (catId) => {
        const metadata = {
            'PPE': { icon: <ShieldCheckIcon className="w-4 h-4" /> },
            'Tools': { icon: <WrenchIcon className="w-4 h-4" /> },
            'Insulators': { icon: <TreeIcon className="w-4 h-4" /> },
            'Charts': { icon: <LineChartIcon className="w-4 h-4" /> },
            'Others': { icon: <InfoIcon className="w-4 h-4" /> }
        };
        return metadata[catId] || { icon: <InfoIcon className="w-4 h-4" /> };
    };

    const t = {
        en: {
            title: 'Safety Library',
            searchPlaceholder: 'Search...',
            noResults: 'No items found',
            priceLabel: 'Price:',
            guideLabel: 'Usage Guide',
            aboutLabel: 'About',
            retry: 'Retry',
            details: 'Details'
        },
        bn: {
            title: 'সুরক্ষা লাইব্রেরি',
            searchPlaceholder: 'খুঁজুন...',
            noResults: 'কিছু পাওয়া যায়নি',
            priceLabel: 'মূল্য:',
            guideLabel: 'দরকারি টিপ',
            aboutLabel: 'সম্পর্কে',
            retry: 'আবার চেষ্টা করুন',
            details: 'বিস্তারিত'
        }
    }[language];

    const fetchLibrary = async (force = false) => {
        try {
            setLoading(true);
            setError(null);
            const data = await libraryService.fetchLibrary(force);
            if (!data || data.length === 0) throw new Error("No data found");
            setItems(data);
            setFilteredItems(data);
            const uniqueCats = [...new Set(data.map(item => item.category))].filter(Boolean);
            const dynamicCategories = uniqueCats.map(cat => ({
                id: cat,
                label: cat,
                ...getCategoryMetadata(cat)
            }));
            setCategories(dynamicCategories);
            if (dynamicCategories.length > 0 && !activeCategory) {
                setActiveCategory(dynamicCategories[0].id);
            }
        } catch (error) {
            setError({ message: error.message, technical: error.stack?.split('\n')[0] || 'Check Internet' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLibrary(); }, []);

    useEffect(() => {
        const filtered = items.filter(item => {
            const matchesSearch = (item.name_bn || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
        setFilteredItems(filtered);
    }, [searchQuery, activeCategory, items]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Sticky Header */}
            <div className="sticky top-0 z-[100] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-8">
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

                    {/* Compact Categories */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap border
                                    ${activeCategory === cat.id
                                        ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20'
                                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`}
                            >
                                {cat.icon && React.cloneElement(cat.icon, { className: 'w-3 h-3' })}
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-3 sm:p-8">
                {/* Elegant Video Guide Banner */}
                <div 
                    onClick={() => setCurrentView('video-guide')}
                    className="mb-4 sm:mb-6 rounded-[1.25rem] bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white flex items-center justify-between cursor-pointer hover:shadow-lg hover:shadow-orange-500/20 transition-all active:scale-[0.98]"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base leading-tight">
                                {language === 'en' ? 'Watch Video Guides' : 'ভিডিও গাইড দেখুন'}
                            </h3>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center min-h-[300px]">
                        <div className="w-10 h-10 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all active:scale-[0.97] flex flex-col cursor-pointer"
                            >
                                <div className="relative aspect-square">
                                    <GridImage images={item.images} alt={item.name_bn} aspect="h-full" />
                                    <div className="absolute top-2 left-2">
                                        <span className="px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded-md text-[8px] font-bold text-white uppercase tracking-tighter">
                                            {item.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-2.5 sm:p-4 flex-grow flex flex-col justify-center">
                                    <h3 className="text-[11px] sm:text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 text-center group-hover:text-orange-500 transition-colors">
                                        {item.name_bn}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400">
                        <LineChartIcon className="w-12 h-12 mb-2 opacity-10" />
                        <p className="text-sm font-medium">{t.noResults}</p>
                    </div>
                )}

                {/* Premium Detail Modal - Optimized for High-End UX */}
                {selectedItem && (
                    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
                        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setSelectedItem(null)} />
                        
                        <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white dark:bg-slate-900 rounded-none sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-scale-in border-none sm:border border-white/10 pt-[env(safe-area-inset-top)] sm:pt-0">
                            {/* Drag Indicator for Mobile (Hidden on full screen, keeping for consistency if needed, but adjusted padding) */}
                            <div className="sm:hidden w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-3 mb-2 shrink-0 shadow-inner" onClick={() => setSelectedItem(null)} />
                            
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md active:scale-90 transition-all border border-white/20 mt-[env(safe-area-inset-top)] sm:mt-0"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="flex-1 overflow-y-auto no-scrollbar">
                                {/* Clean Image Section with minimal Badge */}
                                <div className={`relative w-full ${selectedItem.category === 'Charts' ? 'aspect-auto min-h-[50vh]' : 'aspect-square sm:aspect-video'} bg-slate-50 dark:bg-slate-800/20 group/modal-img`}>
                                    <ImageSlider images={selectedItem.images} alt={selectedItem.name_bn} aspect="h-full" showControls={true} />
                                    
                                    {/* Minimalist Top Corner Badge */}
                                    <div className="absolute top-4 left-4 z-10 animate-in fade-in slide-in-from-left-4 duration-500">
                                        <span className="px-2 py-0.5 bg-black/40 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-md border border-white/10">
                                            {selectedItem.category}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 sm:p-10 pb-32 sm:pb-16 space-y-6">
                                    {/* Clean Dedicated Header Section */}
                                    <div className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800">
                                        <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                            {selectedItem.name_bn}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase tracking-widest rounded-md">
                                                {selectedItem.category}
                                            </span>
                                            {selectedItem.approx_price_inr !== '---' && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/10 font-black">
                                                    <span className="text-[10px]">₹</span>
                                                    <span className="text-xs tabular-nums">{selectedItem.approx_price_inr}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* About Section - Compact & Minimalist */}
                                    {selectedItem.category !== 'Charts' && selectedItem.function_bn && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                                                <InfoIcon className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{t.aboutLabel}</span>
                                            </div>
                                            <p className="text-[14px] sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                                                {selectedItem.function_bn}
                                            </p>
                                        </div>
                                    )}

                                    {/* Guide Section - Elegant Minimal Box */}
                                    {selectedItem.category !== 'Charts' && selectedItem.guide_bn && (
                                        <div className="p-4 bg-orange-50/50 dark:bg-orange-950/10 rounded-2xl border border-orange-100/50 dark:border-orange-500/5 space-y-2">
                                            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-wider">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                {t.guideLabel}
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-bold italic">
                                                "{selectedItem.guide_bn}"
                                            </p>
                                        </div>
                                    )}


                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
