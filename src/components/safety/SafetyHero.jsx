import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

// Minimalist Icons
const CameraIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
        <circle cx="12" cy="13" r="3"></circle>
    </svg>
);

const HeartIcon = ({ className, filled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
    </svg>
);

const ShieldIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="m9 12 2 2 4-4"></path>
    </svg>
);

export default function SafetyHero({ language, user, onBack }) {
    const [entries, setEntries] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    // Cloudinary Config (Placeholder - User should ideally use their own)
    const CLOUDINARY_CLOUD_NAME = 'demo'; 
    const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; 

    useEffect(() => {
        fetchHeroWall();
    }, []);

    const fetchHeroWall = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('safety_hero_entries')
                .select('*, profiles(full_name, avatar_url, district)')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                setEntries(data);
            } else {
                // Fallback Mock Data for testing
                setEntries([
                    { id: 1, image_url: 'https://images.unsplash.com/photo-1590103511505-df4d9894e4ae?w=400', profiles: { full_name: 'আরিফ হোসেন', district: 'ঢাকা' }, votes: 12, created_at: new Date().toISOString() },
                    { id: 2, image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400', profiles: { full_name: 'মিলন শেখ', district: 'খুলনা' }, votes: 8, created_at: new Date().toISOString() }
                ]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            
            // 1. Upload to Cloudinary (Unsigned)
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.secure_url) {
                // 2. Save to Supabase (Only for the gallery wall)
                const { error } = await supabase
                    .from('safety_hero_entries')
                    .insert([{
                        user_id: user?.id,
                        image_url: data.secure_url,
                        votes: 0
                    }]);

                if (!error) {
                    fetchHeroWall();
                } else {
                    // Local state fallback for testing
                    setEntries(prev => [{
                        id: Date.now(),
                        image_url: data.secure_url,
                        profiles: { full_name: user?.full_name || 'My Selfie', district: user?.district || 'Field' },
                        votes: 0,
                        created_at: new Date().toISOString()
                    }, ...prev]);
                }
            }
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const t = {
        en: {
            title: 'Safety Hero Wall',
            subtitle: 'Get cheered by your colleagues for working safe!',
            uploadBtn: 'Share Your Safety Look',
            likes: 'Cheers',
            noEntries: 'Be the first hero of today!',
            success: 'Awesome! Your photo is now on the Hero Wall.'
        },
        bn: {
            title: 'সুরক্ষা হিরো ওয়াল',
            subtitle: 'সুরক্ষিতভাবে কাজ করুন এবং সহকর্মীদের থেকে উৎসাহ পান!',
            uploadBtn: 'আপনার ছবি শেয়ার করুন',
            likes: 'উৎসাহ',
            noEntries: 'আজকের প্রথম হিরো হয়ে উঠুন!',
            success: 'চমৎকার! আপনার ছবি এখন হিরো ওয়াল-এ আছে।'
        }
    }[language];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 py-3 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-90 transition-transform">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none">{t.title}</h1>
                        <p className="text-[10px] font-bold text-orange-500 mt-1 uppercase tracking-wider">{t.subtitle}</p>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <ShieldIcon className="w-6 h-6" />
                </div>
            </div>

            {/* Upload Action */}
            <div className="px-6 py-6 max-w-lg mx-auto">
                <label className={`group relative flex flex-col items-center justify-center gap-2 w-full py-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-orange-500/50 transition-all cursor-pointer ${uploading ? 'pointer-events-none' : ''}`}>
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all ${uploading ? 'bg-slate-100 dark:bg-slate-800' : 'bg-orange-500 text-white shadow-xl shadow-orange-500/20 group-hover:scale-110'}`}>
                        {uploading ? (
                            <div className="w-6 h-6 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                        ) : (
                            <CameraIcon className="w-7 h-7" />
                        )}
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-2">{uploading ? 'Processing...' : t.uploadBtn}</span>
                    <p className="text-[10px] font-bold text-orange-500/60 uppercase tracking-widest">{language === 'en' ? 'Get Cheers!' : 'উৎসাহ পান!'}</p>
                    <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
            </div>

            {/* Hero Grid */}
            <div className="px-4 max-w-4xl mx-auto">
                {loading ? (
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-[3/4] bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : entries.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-10">
                        {entries.map((entry) => (
                            <div key={entry.id} className="group relative aspect-[3/4] bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm animate-in zoom-in-95 duration-500">
                                <img 
                                    src={entry.image_url} 
                                    alt="Safety Hero" 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                
                                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Active Hero</span>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                                    <div className="flex items-end justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-white leading-tight truncate">
                                                {entry.profiles?.full_name || 'Anonymous Lineman'}
                                            </p>
                                            <p className="text-[8px] font-bold text-white/70 uppercase tracking-tighter">
                                                {entry.profiles?.district || 'Field Work'}
                                            </p>
                                        </div>
                                        <button className="flex flex-col items-center gap-0.5 group/btn active:scale-90 transition-transform">
                                            <div className="w-8 h-8 rounded-full bg-white/20 hover:bg-orange-500/40 backdrop-blur-md flex items-center justify-center text-white transition-colors">
                                                <HeartIcon className="w-4 h-4" filled={entry.user_has_liked} />
                                            </div>
                                            <span className="text-[9px] font-black text-white">{entry.votes || 0}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                        <ShieldIcon className="w-16 h-16 opacity-10" />
                        <p className="font-bold text-sm">{t.noEntries}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
