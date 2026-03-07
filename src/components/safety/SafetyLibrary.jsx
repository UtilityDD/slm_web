import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

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
    return id ? `https://lh3.googleusercontent.com/u/0/d/${id}` : url;
};

const ImageSlider = ({ images, alt }) => {
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

    if (!validImages || validImages.length === 0) {
        return (
            <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-900/50 flex flex-col items-center justify-center p-8 text-slate-400 text-center">
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
        <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden flex items-center justify-center p-8 group/slider">
            <img
                key={currentIndex}
                src={getGoogleDriveDirectLink(validImages[currentIndex])}
                alt={`${alt} view ${currentIndex + 1}`}
                onError={() => handleImageError(validImages[currentIndex])}
                className="max-h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-all duration-500 animate-in fade-in zoom-in-95 duration-300"
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

export default function SafetyLibrary({ language, setCurrentView }) {
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = [
        { id: 'All', label: language === 'en' ? 'All' : 'সবগুলো', icon: null },
        { id: 'PPE', label: language === 'en' ? 'PPE' : 'পিপিই', icon: <ShieldCheckIcon className="w-4 h-4" /> },
        { id: 'Tools', label: language === 'en' ? 'Tools' : 'সরঞ্জাম', icon: <WrenchIcon className="w-4 h-4" /> },
        { id: 'Insulators', label: language === 'en' ? 'Insulators' : 'ইনসুলেটর', icon: <TreeIcon className="w-4 h-4" /> },
        { id: 'Charts', label: language === 'en' ? 'Charts' : 'চার্ট', icon: <LineChartIcon className="w-4 h-4" /> },
        { id: 'Others', label: language === 'en' ? 'Others' : 'অন্যান্য', icon: <InfoIcon className="w-4 h-4" /> }
    ];

    const t = {
        en: {
            title: 'Safety Library',
            subtitle: 'Visual equipment guide for power professionals',
            searchPlaceholder: 'Search equipment...',
            noResults: 'No items found',
            priceLabel: 'Approx. Price:',
            guideLabel: 'User Guide',
            aboutLabel: 'About'
        },
        bn: {
            title: 'সুরক্ষা লাইব্রেরি',
            subtitle: 'বিদ্যুৎ কর্মীদের জন্য ভিজ্যুয়াল সরঞ্জাম গাইড',
            searchPlaceholder: 'সরঞ্জাম খুঁজুন...',
            noResults: 'কিছু পাওয়া যায়নি',
            priceLabel: 'আনুমানিক মূল্য:',
            guideLabel: 'ইউজার গাইড',
            aboutLabel: 'সম্পর্কে'
        }
    }[language];

    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const { data, error } = await supabase.from('safety_library').select('*').order('created_at', { ascending: true });
                if (error) throw error;
                setItems(data || []);
                setFilteredItems(data || []);
            } catch (error) {
                console.error('Error loading safety library:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLibrary();
    }, []);

    useEffect(() => {
        const filtered = items.filter(item => {
            const matchesSearch = (item.name_en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.name_bn || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
        setFilteredItems(filtered);
    }, [searchQuery, activeCategory, items]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <button onClick={() => setCurrentView('training')} className="text-orange-500 hover:text-orange-600 font-medium mb-4 flex items-center gap-2 group transition-all">
                            <span className="group-hover:-translate-x-1 transition-transform">←</span> {language === 'en' ? 'Back' : 'ফিরুন'}
                        </button>
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{t.title}</h1>
                        <p className="text-slate-500 dark:text-slate-400">{t.subtitle}</p>
                    </div>

                    <div className="relative group max-w-md w-full">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                {/* Categories */}
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

                {/* Grid */}
                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredItems.map((item) => {
                            const isStructured = ['PPE', 'Tools'].includes(item.category);
                            return (
                                <div key={item.id} className="group bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/15 transition-all duration-500 flex flex-col">
                                    <div className="relative">
                                        <ImageSlider images={item.images || [item.image_url]} alt={language === 'en' ? item.name_en : item.name_bn} />
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full text-xs font-bold text-orange-600 dark:text-orange-400 shadow-lg border border-orange-100/20">
                                                {item.category}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-8 flex flex-col flex-grow">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-orange-500 transition-colors">
                                            {language === 'en' ? item.name_en : item.name_bn}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                                            {language === 'en' ? item.function_en : item.function_bn}
                                        </p>

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
                                                        {language === 'en' ? item.guide_en : item.guide_bn}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {!isStructured && (
                                            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-500 font-bold text-sm">
                                                    <InfoIcon className="w-4 h-4" />
                                                    {t.aboutLabel}
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed italic">
                                                    {item.category === 'Charts'
                                                        ? (language === 'en' ? 'Technical Reference Resource' : 'কারিগরি রেফারেন্স রিসোর্স')
                                                        : (language === 'en' ? 'General Information & Support' : 'সাধারণ তথ্য এবং সহায়তা')}
                                                </p>
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
            </div>
        </div>
    );
}
