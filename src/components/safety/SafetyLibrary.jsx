import React, { useState, useEffect } from 'react';
import { CapacitorHttp } from '@capacitor/core';

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
    // Use the lh3 format for stable direct embedding
    // Use a daily cache-buster instead of sub-second to avoid rate limiting/security triggers
    const today = new Date().toISOString().split('T')[0];
    return id ? `https://lh3.googleusercontent.com/u/0/d/${id}?v=${today}` : url;
};

const ImageSlider = ({ images, alt, aspect = 'aspect-[4/3]' }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [validImages, setValidImages] = useState(images || []);

    useEffect(() => {
        setValidImages(images || []);
        setCurrentIndex(0);
    }, [images]);

    useEffect(() => {
        if (!validImages || validImages.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % validImages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [validImages]);

    const handleImageError = (url) => {
        console.warn(`⚠️ Failed to load image: ${url}`);
        const updated = validImages.filter(img => img !== url);
        setValidImages(updated);
        if (currentIndex >= updated.length && updated.length > 0) {
            setCurrentIndex(0);
        }
    };

    const onImageLoad = (e, url) => {
        if (e.target.naturalWidth < 40 && e.target.naturalHeight < 40) {
            console.warn(`🕵️ Detected placeholder/broken image: ${url}`);
            handleImageError(url);
        }
    };

    if (!validImages || validImages.length === 0) {
        return (
            <div className={`${aspect} bg-slate-100 dark:bg-slate-900/50 flex flex-col items-center justify-center p-8 text-slate-400 text-center`}>
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-widest opacity-40">Visual reference pending</span>
            </div>
        );
    }

    const nextSlide = (e) => {
        if (e) e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % validImages.length);
    };

    const prevSlide = (e) => {
        if (e) e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    };

    return (
        <div className={`${aspect} bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden flex items-center justify-center p-8 group/slider`}>
            <img
                key={currentIndex}
                src={getGoogleDriveDirectLink(validImages[currentIndex])}
                alt={`${alt} view ${currentIndex + 1}`}
                onLoad={(e) => onImageLoad(e, validImages[currentIndex])}
                onError={() => handleImageError(validImages[currentIndex])}
                className="max-h-full object-contain filter drop-shadow-2xl group-hover:scale-110 transition-all duration-500 animate-in fade-in zoom-in-95 duration-300"
            />
            {validImages.length > 1 && (
                <>
                    <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full text-slate-600 dark:text-slate-300 opacity-0 group-hover/slider:opacity-100 transition-opacity z-10 hover:bg-white dark:hover:bg-slate-700 shadow-lg"><ChevronLeftIcon className="w-5 h-5" /></button>
                    <button onClick={nextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-full text-slate-600 dark:text-slate-300 opacity-0 group-hover/slider:opacity-100 transition-opacity z-10 hover:bg-white dark:hover:bg-slate-700 shadow-lg"><ChevronRightIcon className="w-5 h-5" /></button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 bg-black/10 dark:bg-white/10 backdrop-blur-md rounded-full opacity-0 group-hover/slider:opacity-100 transition-opacity">
                        {validImages.map((_, i) => (<div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-orange-500 w-3' : 'bg-white/50'}`} />))}
                    </div>
                </>
            )}
        </div>
    );
};

// Robust CSV parser using regex to handle quoted fields with commas correctly
const splitCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
};

const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = splitCSVLine(lines[0]);

    const rows = lines.slice(1).map(line => {
        const values = splitCSVLine(line);
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = values[i] || '';
        });
        return obj;
    });

    const formatNameFallback = (fileName) => {
        if (!fileName) return '';
        return fileName.split('.')[0]
            .replace(/_\d+$/, '')
            .split('_')
            .join(' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    const groups = {};
    rows.forEach(row => {
        const category = row['Folder Name'];
        const fileName = row['File Name'];
        const nameBnFromSheet = row['Name_BN'];

        const baseName = nameBnFromSheet || formatNameFallback(fileName);
        const key = `${category}:${baseName}`;

        if (!groups[key]) {
            groups[key] = {
                id: key,
                category: category === 'Insulators' ? 'Insulators' : category,
                name_bn: nameBnFromSheet || baseName,
                function_bn: row['Function_BN'] || '',
                images: [],
                approx_price_inr: row['Price'] || '---',
                guide_bn: row['Guide_BN'] || 'ব্যবহারের নির্দেশাবলী...'
            };
        }
        if (row['File Link']) {
            groups[key].images.push(row['File Link']);
        }
    });

    return Object.values(groups);
};

export default function SafetyLibrary({ language, setCurrentView }) {
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [categories, setCategories] = useState([]);

    const getCategoryMetadata = (catId) => {
        const metadata = {
            'PPE': { icon: <ShieldCheckIcon className="w-4 h-4" /> },
            'Tools': { icon: <WrenchIcon className="w-4 h-4" /> },
            'Insulators': { icon: <TreeIcon className="w-4 h-4" /> },
            'Charts': { icon: <LineChartIcon className="w-4 h-4" /> },
            'Others': { icon: <InfoIcon className="w-4 h-4" /> }
        };
        return metadata[catId] || { 
            icon: <InfoIcon className="w-4 h-4" /> 
        };
    };

    const t = {
        en: {
            title: 'Safety Library',
            searchPlaceholder: 'Search equipment...',
            noResults: 'No items found',
            priceLabel: 'Price:',
            guideLabel: 'Usage Guide',
            aboutLabel: 'About',
            retry: 'Retry',
            tapToEnlarge: 'Tap to enlarge',
            closePreview: 'Close Preview'
        },
        bn: {
            title: 'সুরক্ষা লাইব্রেরি',
            searchPlaceholder: 'সরঞ্জাম খুঁজুন...',
            noResults: 'কিছু পাওয়া যায়নি',
            priceLabel: 'মূল্য:',
            guideLabel: 'ব্যবহারের নির্দেশিকা',
            aboutLabel: 'সম্পর্কে',
            retry: 'আবার চেষ্টা করুন',
            tapToEnlarge: 'বড় করে দেখতে ট্যাপ করুন',
            closePreview: 'প্রিভিউ বন্ধ করুন'
        }
    }[language];

    const fetchLibrary = async () => {
        try {
            setLoading(true);
            setError(null);
            const dynamicUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTjxPeFNRSNfOgc80sT-WLmqf0bQqN-YjjSbQoE6i432tL-sK1zg1zHfaQxv4l1YMThgwa1DyreVgCk/pub?gid=0&single=true&output=csv&v=${Date.now()}`;

            // Use CapacitorHttp to bypass CORS and redirect issues on Android
            const response = await CapacitorHttp.get({
                url: dynamicUrl,
                responseType: 'text' // Force text to prevent premature JSON parsing
            });

            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}: ${typeof response.data}`);
            }

            let csvText = response.data;

            // On some platforms, if the redirect is handled uniquely, data might be an object
            if (typeof csvText !== 'string') {
                csvText = JSON.stringify(csvText);
            }

            const data = parseCSV(csvText);
            if (!data || data.length === 0) throw new Error("Parsed data is empty");

            setItems(data);
            setFilteredItems(data);

            // Dynamically generate categories
            const uniqueCats = [...new Set(data.map(item => item.category))].filter(Boolean);
            const dynamicCategories = uniqueCats.map(cat => ({
                id: cat,
                label: cat, // Always use the raw name from the spreadsheet as the label
                ...getCategoryMetadata(cat)
            }));
            
            setCategories(dynamicCategories);

            // Set the first category as active if none is selected
            if (dynamicCategories.length > 0) {
                setActiveCategory(dynamicCategories[0].id);
            }
        } catch (error) {
            console.error('Error loading safety library:', error);
            setError({
                message: error.message,
                technical: error.stack?.split('\n')[0] || 'Unknown Error'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLibrary();
    }, []);

    useEffect(() => {
        const filtered = items.filter(item => {
            const matchesSearch = (item.name_bn || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
        setFilteredItems(filtered);
    }, [searchQuery, activeCategory, items]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setCurrentView('training')} 
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-orange-500 hover:border-orange-500/50 transition-all shadow-sm active:scale-95 group"
                            title={language === 'en' ? 'Back' : 'ফিরুন'}
                        >
                            <ChevronLeftIcon className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {t.title}
                        </h1>
                    </div>

                    <div className="relative group max-w-md w-full">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none text-slate-900 dark:text-white text-sm"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-10 pb-2 overflow-x-auto no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap shadow-sm
                                ${activeCategory === cat.id
                                    ? 'bg-orange-500 text-white scale-105 shadow-orange-500/20'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            {cat.icon}
                            {cat.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-6 text-red-500">
                            <InfoIcon className="w-10 h-10" />
                        </div>
                        <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            {language === 'en' ? 'Unable to load Library' : 'লাইব্রেরি লোড করা যাচ্ছে না'}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mb-2 max-w-xs">
                            {language === 'en' ? 'Please check your internet connection' : 'আপনার ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন'}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-600 mb-8 max-w-xs break-all opacity-50 uppercase tracking-tighter">
                            Debug: {error.message || 'No Error Msg'} | {error.technical || 'No Technical Info'}
                        </p>
                        <button
                            onClick={fetchLibrary}
                            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all active:scale-95"
                        >
                            {t.retry}
                        </button>
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredItems.map((item) => {
                            const isStructured = ['PPE', 'Tools', 'Insulators'].includes(item.category);
                            const isChart = item.category === 'Charts';
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={`group bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/15 transition-all duration-500 flex flex-col cursor-zoom-in ${isChart ? 'md:col-span-2 lg:col-span-3' : ''}`}
                                >
                                    <div className="relative">
                                        <ImageSlider
                                            images={item.images}
                                            alt={item.name_bn}
                                            aspect={isChart ? 'aspect-video' : 'aspect-[4/3]'}
                                        />
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full text-xs font-bold text-orange-600 dark:text-orange-400 shadow-lg border border-orange-100/20">
                                                {item.category}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-8 flex flex-col flex-grow">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-orange-500 transition-colors">
                                            {item.name_bn}
                                        </h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-3">
                                            {t.tapToEnlarge}
                                        </p>
                                        {item.function_bn && (
                                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                                                {item.function_bn}
                                            </p>
                                        )}

                                        {isStructured && (
                                            <div className="mt-auto space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">{t.priceLabel}</span>
                                                    <span className="text-xl font-black text-orange-500">₹{item.approx_price_inr}</span>
                                                </div>

                                                <div className="bg-orange-50/50 dark:bg-orange-500/5 p-4 rounded-2xl border border-orange-100 dark:border-orange-500/10">
                                                    <div className="flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400 font-bold text-sm">
                                                        <InfoIcon className="w-4 h-4" />
                                                        {t.guideLabel}
                                                    </div>
                                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                                        {item.guide_bn}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                        <LineChartIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-xl font-medium">{t.noResults}</p>
                    </div>
                )}

                {selectedItem && (
                    <div
                        className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-sm p-0 md:p-2 flex items-center justify-center animate-fade-in"
                        onClick={() => setSelectedItem(null)}
                    >
                        <button
                            onClick={() => setSelectedItem(null)}
                            aria-label={t.closePreview}
                            className="fixed right-4 z-[1010] w-12 h-12 rounded-full bg-black/75 text-white hover:bg-black/90 transition-colors flex items-center justify-center shadow-2xl border border-white/20"
                            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4.25rem)' }}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div
                            className="relative w-full h-full md:w-[98vw] md:h-[98vh] bg-white dark:bg-slate-900 md:rounded-[1.25rem] border-0 md:border md:border-slate-200 dark:md:border-slate-800 shadow-2xl flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedItem(null)}
                                aria-label={t.closePreview}
                                className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-black/55 text-white hover:bg-black/70 backdrop-blur-md transition-colors flex items-center justify-center shadow-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="px-5 pt-4 pb-2 pr-16">
                                <h3 className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider truncate">
                                    {selectedItem.name_bn}
                                </h3>
                            </div>

                            <div className="px-0 pb-0 flex-1 min-h-0">
                                <ImageSlider images={selectedItem.images} alt={selectedItem.name_bn} aspect="h-full" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
