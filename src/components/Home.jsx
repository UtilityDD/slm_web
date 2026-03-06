import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import HomeSkeleton from './loaders/HomeSkeleton';
import ShareModal from './ShareModal';
import { DotLottiePlayer } from '@dotlottie/react-player';
import mailLottie from '../assets/mail.lottie';

export default function Home({ setCurrentView, language, user, userProfile, t, refreshProfile }) {
    const [loading, setLoading] = useState(!userProfile && !!user);
    const [showTipModal, setShowTipModal] = useState(false);
    const [dailyTip, setDailyTip] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState("https://github.com/UtilityDD/slm_web/releases/latest");

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });

        if (userProfile) {
            setLoading(false);
        } else if (user) {
            // Profile will be loaded by parent
            setLoading(false);
        } else {
            setLoading(false);
        }

        const fetchDailyTip = async () => {
            try {
                const response = await fetch('/quizzes/carousol.json');
                const data = await response.json();
                const rules = data.rules || [];
                if (rules.length > 0) {
                    const now = new Date();
                    const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
                    let hash = 0;
                    for (let i = 0; i < dateStr.length; i++) {
                        hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
                        hash |= 0;
                    }
                    setDailyTip(rules[Math.abs(hash) % rules.length]);
                    setShowTipModal(true);
                }
            } catch (err) {
                console.error('Error fetching daily tip:', err);
                setDailyTip(language === 'en' ? "Always test for voltage before touching any conductor." : "যেকোনো কন্ডাক্টর স্পর্শ করার আগে সর্বদা ভোল্টেজ পরীক্ষা করুন।");
                setShowTipModal(true);
            }
        };

        const fetchLatestShareUrl = async () => {
            try {
                const { data } = await supabase
                    .from('app_versions')
                    .select('update_url')
                    .order('version_code', { ascending: false })
                    .limit(1)
                    .single();
                if (data?.update_url) {
                    setShareUrl(data.update_url);
                }
            } catch (err) {
                console.error('Error fetching share URL:', err);
            }
        };

        fetchDailyTip();
        fetchLatestShareUrl();
    }, [userProfile, user, language]);

    // Immediately redirect to Training view — the home IS the training path
    useEffect(() => {
        if (!loading) {
            setCurrentView('training');
        }
    }, [loading]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            {loading ? (
                <div className="p-4 w-full"><HomeSkeleton /></div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 p-8 animate-fadeIn">
                    <div className="w-16 h-16 border-4 border-orange-100 dark:border-slate-700 rounded-full relative">
                        <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className={`text-sm font-bold text-slate-500 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en' ? 'Loading Training...' : 'প্রশিক্ষণ লোড হচ্ছে...'}
                    </p>
                </div>
            )}

            {/* Daily Tip Modal */}
            {showTipModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700">
                        <div className="bg-[#ea580c] p-6 text-white text-center relative">
                            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md overflow-hidden border border-white/30">
                                <DotLottiePlayer
                                    src={mailLottie}
                                    autoplay
                                    loop
                                    className="w-24 h-24"
                                />
                            </div>
                            <h3 className="text-xl font-bold uppercase tracking-wider">{language === 'en' ? 'Survival Tip' : 'বেঁচে থাকার টিপ'}</h3>
                            <p className="text-orange-50 text-xs mt-1 font-medium">{new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="p-8 text-center">
                            <p className="text-slate-700 dark:text-slate-300 text-lg font-medium leading-relaxed mb-8 italic">"{dailyTip}"</p>
                            <button onClick={() => setShowTipModal(false)} className="w-full py-3 bg-[#ea580c] text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                                {language === 'en' ? 'Stay Safe' : 'নিরাপদ থাকুন'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                shareUrl={shareUrl}
                language={language}
            />
        </div>
    );
}
