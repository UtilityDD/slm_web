// Force re-compile to clear stale Vite cache
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { calculateLevelFromProgress } from '../utils/badgeUtils';
import { cacheHelper } from '../utils/cacheHelper';
import ChapterQuizModal from './ChapterQuizModal';
import { getBadgeByLevel } from '../utils/badgeUtils';

const PPESkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
                <div className="space-y-2 mb-4">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
            </div>
        ))}
    </div>
);

const SOPCard = React.memo(({ level, index, onClick }) => (
    <div
        onClick={() => onClick(level)}
        className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-900/50 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 cursor-pointer group"
    >
        <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-500 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                {index + 1}
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:bg-orange-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
        <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 mb-1 group-hover:text-orange-600 transition-colors leading-tight">{level.level_name}</h3>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-tight uppercase tracking-wider">{level.focus}</p>
    </div>
));

const GroupedSOPCard = React.memo(({ levels, onClick, language }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    return (
        <div
            className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-500"
        >
            <div
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-600 to-orange-700 text-white flex items-center justify-center text-3xl shadow-xl shadow-orange-500/30 group-hover:scale-105 transition-transform">
                        📋
                    </div>
                    <div>
                        <h3 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
                            {language === 'bn' ? 'সব কাজের সাধারণ নিয়ম' : 'General Rules for All Work'}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-black uppercase tracking-wider">Essential</span>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                {language === 'bn' ? 'ধাপ ১ থেকে ৫' : 'Steps 1 to 5'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 text-slate-400 group-hover:bg-orange-600 group-hover:text-white transition-all transform duration-500 ${isCollapsed ? '' : 'rotate-180 shadow-lg'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 animate-slide-up">
                    {levels.map((level, index) => (
                        <div
                            key={index}
                            onClick={() => onClick(level)}
                            className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-900 hover:bg-white dark:hover:bg-slate-800 cursor-pointer group transition-all duration-300 shadow-sm"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 flex items-center justify-center text-sm font-black shadow-sm group-hover:bg-orange-600 group-hover:text-white transition-all">
                                {index + 1}
                            </div>
                            <span className="text-sm font-black text-slate-700 dark:text-slate-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2 leading-tight">
                                {level.level_name}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

const IncidentReportForm = ({ user, language, t }) => {
    const [formData, setFormData] = useState({
        location: '',
        hazardType: '',
        description: '',
        photo: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-10 text-center border border-slate-100 dark:border-slate-700 shadow-xl animate-scale-in">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg">
                    ✓
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">
                    {language === 'en' ? 'Report Submitted' : 'রিপোর্ট জমা হয়েছে'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    {language === 'en' ? 'Thank you for helping keep our workplace safe.' : 'আমাদের কর্মক্ষেত্র নিরাপদ রাখতে সাহায্য করার জন্য আপনাকে ধন্যবাদ।'}
                </p>
                <button
                    onClick={() => setSubmitted(false)}
                    className="px-8 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black hover:opacity-90 transition-all active:scale-95"
                >
                    {language === 'en' ? 'Submit Another' : 'আরেকটি জমা দিন'}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 p-8 sm:p-10 shadow-sm animate-slide-up">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl shadow-inner">
                    ⚠️
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        {t.report.title}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {language === 'en' ? 'Help us identify hazards' : 'বিপদ চিহ্নিত করতে সাহায্য করুন'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                            {t.report.form.location}
                        </label>
                        <input
                            required
                            type="text"
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            placeholder={language === 'en' ? 'e.g. Substation A' : 'যেমন: সাবস্টেশন এ'}
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                            {t.report.form.type}
                        </label>
                        <select
                            required
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-black appearance-none"
                            value={formData.hazardType}
                            onChange={(e) => setFormData({ ...formData, hazardType: e.target.value })}
                        >
                            <option value="">{language === 'en' ? 'Select Type' : 'ধরন নির্বাচন করুন'}</option>
                            <option value="Electrical">{language === 'en' ? 'Electrical' : 'বৈদ্যুতিক'}</option>
                            <option value="Mechanical">{language === 'en' ? 'Mechanical' : 'যান্ত্রিক'}</option>
                            <option value="Fire">{language === 'en' ? 'Fire' : 'আগুন'}</option>
                            <option value="Others">{language === 'en' ? 'Others' : 'অন্যান্য'}</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        {t.report.form.desc}
                    </label>
                    <textarea
                        required
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium min-h-[120px]"
                        placeholder={language === 'en' ? 'Describe the issue...' : 'সমস্যাটি বর্ণনা করুন...'}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        {t.report.form.photo}
                    </label>
                    <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-100 dark:border-slate-800 border-dashed rounded-[2rem] cursor-pointer bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📸</span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {language === 'en' ? 'Click to upload (Optional)' : 'আপলোড করতে ক্লিক করুন (ঐচ্ছিক)'}
                                </p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" />
                        </label>
                    </div>
                </div>

                <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-600/20 hover:bg-red-700 hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {language === 'en' ? 'Submitting...' : 'জমা হচ্ছে...'}
                        </>
                    ) : (
                        <>
                            <span>🚀</span>
                            {t.report.form.submit}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

const TrainingChapterCard = React.memo(({ chapter, completedLessons, language, onClick }) => {
    const isFAQ = chapter.number === 10;
    const completedCount = completedLessons.filter(id => id && id.toString().startsWith(`${chapter.number}.`)).length;
    const progress = chapter.count > 0 ? Math.min(100, Math.round((completedCount / chapter.count) * 100)) : 0;

    return (
        <div
            onClick={() => onClick(chapter)}
            className={`p-6 rounded-[2.5rem] border transition-all duration-500 cursor-pointer group relative overflow-hidden active:scale-[0.98] ${isFAQ
                ? 'bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 dark:from-violet-900/20 dark:to-fuchsia-900/30 border-violet-200 dark:border-violet-700 hover:border-violet-400 dark:hover:border-violet-500 shadow-sm hover:shadow-2xl'
                : 'bg-token-bg-surface border-token-border hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-2xl'
                } animate-slide-up shadow-sm`}
        >
            {/* Background floating glass elements */}
            <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none ${isFAQ ? 'bg-violet-400/20' : 'bg-orange-400/20'}`}></div>

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-2xl font-black border-2 shadow-xl transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 ${isFAQ
                            ? 'bg-violet-600 text-white border-violet-400 dark:border-violet-800 shadow-violet-500/30'
                            : 'bg-gradient-to-br from-orange-600 to-orange-500 text-white border-orange-400 dark:border-orange-900/50 shadow-orange-500/30'
                            }`}>
                            {isFAQ ? '?' : chapter.number}
                        </div>
                        <div>
                            <h3 className={`font-black text-xl leading-tight transition-colors ${isFAQ
                                ? 'text-violet-900 dark:text-violet-100 group-hover:text-violet-600 dark:group-hover:text-violet-400'
                                : 'text-token-text-primary group-hover:text-orange-600 dark:group-hover:text-orange-400'
                                }`}>
                                {chapter.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`w-2 h-2 rounded-full ${isFAQ ? 'bg-violet-400' : 'bg-orange-400'}`}></span>
                                <p className="text-[10px] font-black text-token-text-muted uppercase tracking-[0.2em]">
                                    {isFAQ ? (
                                        language === 'en' ? 'Reference' : 'রেফারেন্স'
                                    ) : (
                                        language === 'en' ? `${chapter.count} Lessons` : `${chapter.count}টি পাঠ`
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {!isFAQ ? (
                    <div className="mt-8">
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-[10px] font-black text-token-text-muted uppercase tracking-widest">Mastery</span>
                            <span className={`text-sm font-black ${progress === 100 ? 'text-emerald-500' : 'text-orange-600'}`}>
                                {progress}%
                            </span>
                        </div>
                        <div className="w-full h-3 bg-token-bg-page shadow-inner rounded-full overflow-hidden border border-token-border">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out relative ${progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-400 to-orange-600'}`}
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 shimmer opacity-30"></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-8 flex items-center justify-between group/btn">
                        <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Common Questions</span>
                        <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-all transform group-hover:translate-x-1 border border-violet-200 dark:border-violet-800">
                            →
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

const SafetyDashboard = ({ user, userProfile, language, setActiveTab, completedLessons, t, setCurrentView }) => {
    // Calculate overall training progress
    const totalChapters = 9; // Excluding FAQ
    const completedLessonsCount = completedLessons.length;
    const progressPercentage = Math.round((completedLessonsCount / 91) * 100);

    // Get daily tip based on day of year
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const tips = {
        en: [
            "Always inspect your PPE before use.",
            "Treat every wire as live until proven otherwise.",
            "Communication is key during maintenance work.",
            "Stay hydrated and take breaks in hot weather.",
            "Never compromise on safety for speed."
        ],
        bn: [
            "ব্যবহারের আগে সর্বদা আপনার পিপিই পরীক্ষা করুন।",
            "প্রমাণিত না হওয়া পর্যন্ত প্রতিটি তারকে জীবন্ত মনে করুন।",
            "রক্ষণাবেক্ষণ কাজের সময় যোগাযোগ অত্যন্ত গুরুত্বপূর্ণ।",
            "গরম আবহাওয়ায় জল পান করুন এবং বিরতি নিন।",
            "গতির জন্য সুরক্ষার সাথে আপস করবেন না।"
        ]
    };
    const dailyTip = tips[language][dayOfYear % tips[language].length];

    const quickActions = [
        { id: 'training', label: { en: 'Training Zone', bn: 'প্রশিক্ষণ জোন' }, icon: '🎓', color: 'bg-orange-600', action: () => !user ? setCurrentView('login') : (mode === 'training' ? null : setActiveTab('training')) },
        { id: 'sops', label: { en: 'Safety Protocols', bn: 'সুরক্ষা নিয়মাবলী' }, icon: '📋', color: 'bg-orange-700', action: () => setActiveTab('sops') },
        { id: 'my_ppe', label: { en: 'My Gear (PPE)', bn: 'সুরক্ষা সরঞ্জাম' }, icon: '🦺', color: 'bg-emerald-600', action: () => !user ? setCurrentView('login') : setActiveTab('my_ppe') },
        { id: 'my_tools', label: { en: 'My Toolbox', bn: 'আমার টুলবক্স' }, icon: '🛠️', color: 'bg-orange-500', action: () => !user ? setCurrentView('login') : setActiveTab('my_tools') },
        { id: 'report', label: { en: 'Report Incident', bn: 'রিপোর্ট করুন' }, icon: '⚠️', color: 'bg-red-600', action: () => !user ? setCurrentView('login') : setActiveTab('report') }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Section */}
            <div className="relative overflow-hidden bg-[#ea580c] rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl shadow-orange-900/20">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-md shadow-inner">💡</div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{language === 'en' ? 'Smart Safety Insight' : 'স্মার্ট সুরক্ষা ইনসাইট'}</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black mb-3 leading-tight tracking-tight">
                            {language === 'en' ? `Stay Alert, ${userProfile?.full_name?.split(' ')[0] || 'Hero'}!` : `সতর্ক থাকুন, ${userProfile?.full_name?.split(' ')[0] || 'হিরো'}!`}
                        </h2>
                        <p className="text-orange-50 text-base sm:text-lg font-medium max-w-lg leading-relaxed italic opacity-95">
                            "{dailyTip}"
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-6 border border-white/20 shadow-xl flex flex-col items-center justify-center min-w-[160px] animate-subtle-float">
                        <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">{language === 'en' ? 'Overall Progress' : 'মোট অগ্রগতি'}</div>
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={226.2} strokeDashoffset={226.2 * (1 - progressPercentage / 100)} className="text-white transition-all duration-1000 ease-out" strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-xl font-black">{progressPercentage}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Grid Actions */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-1">
                {quickActions.map((action, idx) => (
                    <button
                        key={action.id}
                        onClick={action.action}
                        style={{ animationDelay: `${idx * 0.1}s` }}
                        className="group bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-2xl hover:-translate-y-2 active:scale-95 transition-all duration-300 text-left flex flex-col animate-slide-up"
                    >
                        <div className={`w-14 h-14 rounded-2xl ${action.color} text-white flex items-center justify-center text-2xl mb-4 group-hover:scale-110 shadow-lg transition-all duration-500`}>
                            {action.icon}
                        </div>
                        <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-tight group-hover:text-orange-600 transition-colors">
                            {action.label[language]}
                        </h3>
                        <div className="mt-4 flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                            {language === 'en' ? 'Access Now' : 'প্রবেশ করুন'} <span>→</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Detailed Progress Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 p-8 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-600/10 transition-colors"></div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            {language === 'en' ? 'Journey Progress' : 'আপনার শেখার যাত্রা'}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {completedLessonsCount} / 91 Lessons Completed
                        </p>
                    </div>
                    <button
                        onClick={() => setCurrentView('training')}
                        className="px-6 py-2 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-sm active:scale-95 border border-slate-200 dark:border-slate-600"
                    >
                        {language === 'en' ? 'Open Training' : 'পুরো লিস্ট দেখুন'}
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="w-full h-4 bg-slate-50 dark:bg-slate-900 shadow-inner rounded-full overflow-hidden border border-slate-100 dark:border-slate-700">
                        <div
                            className="h-full bg-gradient-to-r from-orange-400 via-orange-600 to-orange-700 rounded-full transition-all duration-1000 ease-out relative"
                            style={{ width: `${progressPercentage}%` }}
                        >
                            <div className="absolute inset-0 shimmer opacity-30"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function SafetyHub({ language = 'en', user, userProfile: initialUserProfile, setCurrentView, onProgressUpdate, mode = 'safety' }) {
    // Check for tab query parameter in URL
    const getTabFromUrl = () => {
        const hash = window.location.hash;
        const tabMatch = hash.match(/[?&]tab=([^&]*)/);
        if (tabMatch && tabMatch[1]) {
            return decodeURIComponent(tabMatch[1]);
        }
        return null;
    };

    const initialTab = getTabFromUrl() || (mode === 'training' ? 'training' : 'dashboard');
    const [activeTab, setActiveTab] = useState(initialTab);
    const [ppeList, setPpeList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [userProfile, setUserProfile] = useState(initialUserProfile);
    const [isEditMode, setIsEditMode] = useState(false);

    // Sync userProfile state if prop changes
    useEffect(() => {
        if (initialUserProfile) {
            setUserProfile(initialUserProfile);
        }
    }, [initialUserProfile]);

    // Update active tab if mode changes
    useEffect(() => {
        if (mode === 'training') {
            setActiveTab('training');
        } else if (mode === 'safety' && activeTab === 'training') {
            setActiveTab('sops');
        }
    }, [mode]);

    // Check for tab parameter in URL hash on mount and when hash changes
    useEffect(() => {
        const handleHashChange = () => {
            const tabFromUrl = getTabFromUrl();
            if (tabFromUrl) {
                setActiveTab(tabFromUrl);
            }
        };

        // Check on initial mount
        handleHashChange();

        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Filter tabs based on mode
    const getVisibleTabs = () => {
        if (mode === 'training') {
            return ['training'];
        }
        return ['sops', 'my_ppe', 'my_tools', 'report'];
    };

    // Fallback fetch if userProfile is missing but user exists
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!user || userProfile?.full_name) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                if (data) setUserProfile(prev => ({ ...prev, ...data }));
            } catch (error) {
                console.error('Error fetching user profile in SafetyHub:', error);
            }
        };
        fetchUserProfile();
    }, [user, userProfile]);

    const [newItem, setNewItem] = useState({
        name: '',
        age_months: '',
        condition: 'Good',
        details: '',
        count: 1
    });
    const [ppeChecklist, setPpeChecklist] = useState([]);
    const [toolsChecklist, setToolsChecklist] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
    const [sopData, setSopData] = useState(null);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [carouselData, setCarouselData] = useState(null);
    const [fetchError, setFetchError] = useState(false);

    // Quiz Modal State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [currentQuizQuestions, setCurrentQuizQuestions] = useState([]);
    const [pendingLessonId, setPendingLessonId] = useState(null);
    const [previousQuizQuestions, setPreviousQuizQuestions] = useState({});

    // Training Zone States
    const [trainingChapters, setTrainingChapters] = useState([]);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [selectedSubchapter, setSelectedSubchapter] = useState(null);
    const [trainingContent, setTrainingContent] = useState(null);
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [completedLessons, setCompletedLessons] = useState([]);
    const [faqSearchQuery, setFaqSearchQuery] = useState('');



    // Body scroll locking when full-page training is open
    useEffect(() => {
        if (trainingContent) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [trainingContent]);

    // Load completed lessons from localStorage
    // Load completed lessons from localStorage AND Supabase (Cloud Sync)
    useEffect(() => {
        const loadProgress = async () => {
            if (!user) return;

            // 1. Load Local
            let localProgress = [];
            const saved = localStorage.getItem(`training_progress_${user.id}`);
            if (saved) {
                localProgress = JSON.parse(saved);
            }

            // 2. Load Remote
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('completed_lessons')
                    .eq('id', user.id)
                    .single();

                if (data && data.completed_lessons) {
                    // 3. Merge (Union)
                    const remoteProgress = Array.isArray(data.completed_lessons) ? data.completed_lessons : [];
                    const merged = [...new Set([...localProgress, ...remoteProgress])];

                    setCompletedLessons(merged);

                    // Update local storage if different
                    if (merged.length !== localProgress.length) {
                        localStorage.setItem(`training_progress_${user.id}`, JSON.stringify(merged));
                    }
                } else {
                    // If no remote data, just set local
                    setCompletedLessons(localProgress);
                }
            } catch (err) {
                console.error("Error syncing progress:", err);
                setCompletedLessons(localProgress);
            }
        };

        loadProgress();
    }, [user]);
    // Helper function to check if a lesson is unlocked
    const isLessonUnlocked = (chapterNum, subchapterNum) => {
        // First lesson of each chapter is always unlocked
        if (subchapterNum === 1) return true;

        // Check if previous lesson is completed
        const previousLessonId = `${chapterNum}.${subchapterNum - 1}`;
        return completedLessons.includes(previousLessonId);
    };

    // Finalize lesson completion after quiz (or if no quiz exists)
    const [recentReward, setRecentReward] = useState(null);

    const finalizeLessonCompletion = async (lessonId) => {
        const alreadyCompleted = completedLessons.includes(lessonId);

        if (!alreadyCompleted) {
            // First time completion bonus
            const bonusPoints = 20;

            if (user) {
                try {
                    await supabase.rpc('submit_quiz_result', {
                        p_quiz_id: `lesson_bonus_${lessonId}`,
                        p_score: bonusPoints
                    });

                    // Force leaderboard and rank to refresh immediately 
                    // when the user next visits the Competitions tab
                    cacheHelper.clear('leaderboard_top_10_v3');
                    cacheHelper.clear('leaderboard_full_v3');
                    cacheHelper.clear(`user_rank_${user.id}`);

                    setRecentReward(bonusPoints);
                    // Clear reward message after 5 seconds
                    setTimeout(() => setRecentReward(null), 5000);
                } catch (err) {
                    console.error('Error awarding lesson bonus:', err);
                }
            }

            const updated = [...completedLessons, lessonId];
            setCompletedLessons(updated);

            if (user) {
                localStorage.setItem(`training_progress_${user.id}`, JSON.stringify(updated));

                // Sync to Supabase
                const newLevel = calculateLevelFromProgress(updated);
                await supabase.from('profiles')
                    .update({
                        training_level: newLevel,
                        completed_lessons: updated
                    })
                    .eq('id', user.id);
            }
            if (onProgressUpdate) {
                onProgressUpdate(updated);
            }
        }
        setShowQuizModal(false);
        setPendingLessonId(null);
    };

    // Initiate lesson completion - check for quiz first
    const initiateLessonCompletion = async (lessonId) => {
        // Check if we have a quiz for this lesson
        // Note: We allow re-taking the quiz for practice even if lesson is completed

        // Construct quiz filename based on lesson ID (e.g., "1.1" -> "questions_1_1.json")
        const filename = `questions_${lessonId.replace('.', '_')}.json`;

        try {
            const response = await fetch(`/quizzes/${filename}`);
            if (!response.ok) {
                // If no quiz file exists, just complete the lesson
                finalizeLessonCompletion(lessonId);
                return;
            }

            const allQuestions = await response.json();

            if (allQuestions && allQuestions.length > 0) {
                // Randomize all questions and pick up to 10
                let selected = [...allQuestions].sort(() => 0.5 - Math.random());
                selected = selected.slice(0, 10);

                // Update previous questions for next attempt
                setPreviousQuizQuestions(prev => ({
                    ...prev,
                    [lessonId]: selected.map(q => q.questionText)
                }));

                setCurrentQuizQuestions(selected);
                setPendingLessonId(lessonId);
                setShowQuizModal(true);
            } else {
                // Empty quiz file
                finalizeLessonCompletion(lessonId);
            }
        } catch (error) {
            console.error("Error loading quiz:", error);
            // On error (e.g., 404), just complete the lesson
            finalizeLessonCompletion(lessonId);
        }
    };

    const handleReadAgain = () => {
        setActiveSectionIndex(0);
        setShowQuizModal(false);
    };

    const handleQuizComplete = (score) => {
        // Here you could add logic to require a minimum score
        // For now, we just accept completion
        if (pendingLessonId) {
            finalizeLessonCompletion(pendingLessonId);
        }
    };

    const SAFETY_RULES = [
        {
            rule: language === 'en' ? "Min. Ground Clearance for LT line is 15 ft./ 4.6 meter." : "এলটি লাইনের জন্য ন্যূনতম গ্রাউন্ড ক্লিয়ারেন্স হল ১৫ ফুট/ ৪.৬ মিটার।",
            icon: "📏",
            color: "from-orange-600 to-orange-800"
        },
        {
            rule: language === 'en' ? "Wear PPE -> Shut down -> Earthing -> Discharge -> Work." : "পিপিই পরুন -> শাট ডাউন -> আর্থিং -> ডিসচার্জ -> কাজ করুন।",
            icon: "⚡",
            color: "from-orange-600 to-red-600"
        },
        {
            rule: language === 'en' ? "Always use a safety belt and helmet while working at height." : "উচ্চতায় কাজ করার সময় সর্বদা সুরক্ষা বেল্ট এবং হেলমেট ব্যবহার করুন।",
            icon: "🧗",
            color: "from-emerald-600 to-teal-600"
        },
        {
            rule: language === 'en' ? "Check tools for damage before starting any maintenance work." : "যেকোনো রক্ষণাবেক্ষণের কাজ শুরু করার আগে সরঞ্জামগুলি ক্ষতির জন্য পরীক্ষা করুন।",
            icon: "🔧",
            color: "from-slate-700 to-slate-900"
        }
    ];

    const activeRules = carouselData?.rules || SAFETY_RULES.map(r => r.rule);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentRuleIndex((prev) => (prev + 1) % activeRules.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [activeRules.length]);

    useEffect(() => {
        const fetchSOP = async () => {
            setFetchError(false);
            try {
                const fileName = language === 'en' ? 'protocol_en.json' : 'protocol.json';
                const response = await fetch(`/quizzes/${fileName}`);
                if (!response.ok) throw new Error('Failed to fetch SOP');
                const data = await response.json();
                setSopData(data);
            } catch (error) {
                console.error('Error fetching SOP:', error);
                setFetchError(true);
            }
        };

        const fetchCarousel = async () => {
            try {
                const fileName = language === 'en' ? 'carousol_en.json' : 'carousol.json';
                const response = await fetch(`/quizzes/${fileName}`);
                if (!response.ok) throw new Error('Failed to fetch carousel');
                const data = await response.json();
                setCarouselData(data);
            } catch (error) {
                console.error('Error fetching carousel data:', error);
            }
        };

        const fetchTrainingChapters = async () => {
            try {
                setTrainingLoading(true);
                const response = await fetch('/quizzes/training_manifest.json');
                if (response.ok) {
                    const data = await response.json();
                    setTrainingChapters(data);
                } else {
                    throw new Error('Manifest not found');
                }
            } catch (error) {
                console.error('Error fetching training chapters:', error);
                setFetchError(true);
            } finally {
                setTrainingLoading(false);
            }
        };

        fetchSOP();
        fetchCarousel();
        fetchTrainingChapters();
    }, [language]);

    const handleChapterClick = async (chapter) => {
        setTrainingLoading(true);

        // Special handling for FAQ Chapter 10
        if (chapter.number === 10) {
            try {
                const response = await fetch('/quizzes/chapter_10_qa.json');
                if (response.ok) {
                    const data = await response.json();
                    setSelectedChapter({ ...chapter, isFAQ: true, content: data });
                }
            } catch (err) {
                console.error("Error loading FAQ chapter:", err);
            } finally {
                setTrainingLoading(false);
            }
            return;
        }

        // Lazy load subchapters
        try {
            const promises = [];
            for (let s = 1; s <= chapter.count; s++) {
                promises.push(
                    fetch(`/quizzes/chapter_${chapter.number}_${s}.json`)
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null)
                );
            }
            const results = await Promise.all(promises);
            const subchapters = results
                .map((data, idx) => data ? { ...data, chapterNum: chapter.number, subchapterNum: idx + 1 } : null)
                .filter(Boolean);

            setSelectedChapter({ ...chapter, subchapters });
        } catch (err) {
            console.error("Error loading chapter:", err);
        } finally {
            setTrainingLoading(false);
        }
    };

    const nextRule = () => {
        setCurrentRuleIndex((prev) => (prev + 1) % activeRules.length);
    };

    const prevRule = () => {
        setCurrentRuleIndex((prev) => (prev - 1 + activeRules.length) % activeRules.length);
    };

    const PPE_ITEMS = [
        { name: "Safety Helmet", icon: "🪖" },
        { name: "Safety Shoes/Boots", icon: "🥾" },
        { name: "Insulated Gloves", icon: "🧤" },
        { name: "Reflective Jacket", icon: "🦺" },
        { name: "Safety Belt", icon: "🧗" },
        { name: "Full Body Harness", icon: "🧗‍♂️" },
        { name: "Voltage Detector", icon: "🔌" },
        { name: "Discharge Rod", icon: "🦯" },
        { name: "Safety Goggles", icon: "🥽" },
        { name: "Raincoat", icon: "🧥" },
        { name: "Torch/Emergency Light", icon: "🔦" }
    ];

    const TOOLS_ITEMS = [
        { name: "Pliers", icon: "🔧" },
        { name: "Screwdriver Set", icon: "🪛" },
        { name: "Wrench", icon: "🔧" },
        { name: "Hammer", icon: "🔨" },
        { name: "Tester", icon: "⚡" },
        { name: "Multimeter", icon: "📟" },
        { name: "Wire Stripper", icon: "✂️" },
        { name: "Drill Machine", icon: "🔫" },
        { name: "Ladder", icon: "🪜" },
        { name: "Rope", icon: "🪢" }
    ];

    useEffect(() => {
        if (activeTab === 'my_ppe' && user) {
            fetchPPE();
        }
    }, [activeTab, user]);

    useEffect(() => {
        if (activeTab === 'my_tools' && user) {
            fetchTools();
        }
    }, [activeTab, user]);

    const fetchPPE = async () => {
        if (!user) return;
        const cacheKey = `user_ppe_${user.id}`;
        const cachedPPE = cacheHelper.get(cacheKey);

        let data = cachedPPE;
        if (!data) {
            setLoading(true);
            try {
                const { data: fetchedData, error } = await supabase
                    .from('user_ppe')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                data = fetchedData || [];
                cacheHelper.set(cacheKey, data, 10);
            } catch (error) {
                console.error('Error fetching PPE:', error);
                data = [];
            } finally {
                setLoading(false);
            }
        }

        setPpeList(data);

        // Initialize checklist based on fetched data
        const checklist = PPE_ITEMS.map(item => {
            const existing = data.find(p => p.name === item.name);
            return {
                ...item,
                available: !!existing,
                id: existing?.id || null,
                count: existing?.count || 1,
                condition: existing?.condition || 'Good',
                age: existing?.age_months ?
                    (existing.age_months <= 6 ? '<6m' :
                        existing.age_months <= 12 ? '6-12m' :
                            existing.age_months <= 24 ? '1-2y' : '>2y') : '<6m',
                usage: existing?.details?.includes('Usage:') ?
                    existing.details.split('Usage:')[1].trim() : 'Personal'
            };
        });
        setPpeChecklist(checklist);
    };

    const fetchTools = async () => {
        if (!user) return;
        const cacheKey = `user_tools_${user.id}`;
        const cachedTools = cacheHelper.get(cacheKey);

        let data = cachedTools;
        if (!data) {
            setLoading(true);
            try {
                const { data: fetchedData, error } = await supabase
                    .from('user_tools')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                data = fetchedData || [];
                cacheHelper.set(cacheKey, data, 10);
            } catch (error) {
                console.error('Error fetching Tools:', error);
                data = [];
            } finally {
                setLoading(false);
            }
        }

        // Initialize checklist based on fetched data
        const checklist = TOOLS_ITEMS.map(item => {
            const existing = data.find(p => p.name === item.name);
            return {
                ...item,
                available: !!existing,
                id: existing?.id || null,
                count: existing?.count || 1,
                condition: existing?.condition || 'Good',
                age: existing?.age_months ?
                    (existing.age_months <= 6 ? '<6m' :
                        existing.age_months <= 12 ? '6-12m' :
                            existing.age_months <= 24 ? '1-2y' : '>2y') : '<6m',
                usage: existing?.details?.includes('Usage:') ?
                    existing.details.split('Usage:')[1].trim() : 'Personal'
            };
        });
        setToolsChecklist(checklist);
    };

    const handleSavePPE = async () => {
        if (!user) {
            setCurrentView('login');
            return;
        }
        setIsSaving(true);

        try {
            // Prepare data for batch operations
            const upsertItems = [];
            const deleteIds = [];

            for (const item of ppeChecklist) {
                const ageMonths = item.age === '<6m' ? 3 :
                    item.age === '6-12m' ? 9 :
                        item.age === '1-2y' ? 18 : 36;

                const details = `Usage: ${item.usage}`;

                if (item.available) {
                    // Prepare for upsert (handles both insert and update)
                    upsertItems.push({
                        id: item.id || undefined, // Include ID for updates, undefined for inserts
                        user_id: user.id,
                        name: item.name,
                        count: parseInt(item.count),
                        condition: item.condition,
                        age_months: ageMonths,
                        details: details
                    });
                } else if (item.id) {
                    // Collect IDs for deletion
                    deleteIds.push(item.id);
                }
            }

            // Execute batch operations
            const operations = [];

            // Batch upsert (insert/update)
            if (upsertItems.length > 0) {
                operations.push(
                    supabase
                        .from('user_ppe')
                        .upsert(upsertItems, {
                            onConflict: 'id',
                            ignoreDuplicates: false
                        })
                );
            }

            // Batch delete
            if (deleteIds.length > 0) {
                operations.push(
                    supabase
                        .from('user_ppe')
                        .delete()
                        .in('id', deleteIds)
                );
            }

            // Execute all operations concurrently
            await Promise.all(operations);

            cacheHelper.clear(`user_ppe_${user.id}`);
            await fetchPPE();
            setIsEditMode(false);
            alert('PPE Status updated successfully!');
        } catch (error) {
            console.error('Error saving PPE:', error);
            alert('Failed to save PPE status');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTools = async () => {
        if (!user) {
            setCurrentView('login');
            return;
        }
        setIsSaving(true);

        try {
            // Prepare data for batch operations
            const upsertItems = [];
            const deleteIds = [];

            for (const item of toolsChecklist) {
                const ageMonths = item.age === '<6m' ? 3 :
                    item.age === '6-12m' ? 9 :
                        item.age === '1-2y' ? 18 : 36;

                const details = `Usage: ${item.usage}`;

                if (item.available) {
                    // Prepare for upsert (handles both insert and update)
                    upsertItems.push({
                        id: item.id || undefined, // Include ID for updates, undefined for inserts
                        user_id: user.id,
                        name: item.name,
                        count: parseInt(item.count),
                        condition: item.condition,
                        age_months: ageMonths,
                        details: details
                    });
                } else if (item.id) {
                    // Collect IDs for deletion
                    deleteIds.push(item.id);
                }
            }

            // Execute batch operations
            const operations = [];

            // Batch upsert (insert/update)
            if (upsertItems.length > 0) {
                operations.push(
                    supabase
                        .from('user_tools')
                        .upsert(upsertItems, {
                            onConflict: 'id',
                            ignoreDuplicates: false
                        })
                );
            }

            // Batch delete
            if (deleteIds.length > 0) {
                operations.push(
                    supabase
                        .from('user_tools')
                        .delete()
                        .in('id', deleteIds)
                );
            }

            // Execute all operations concurrently
            await Promise.all(operations);

            cacheHelper.clear(`user_tools_${user.id}`);
            await fetchTools();
            setIsEditMode(false);
            alert('Tools Status updated successfully!');
        } catch (error) {
            console.error('Error saving Tools:', error);
            alert('Failed to save Tools status');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChecklistChange = (index, field, value) => {
        const updated = [...ppeChecklist];
        updated[index] = { ...updated[index], [field]: value };
        setPpeChecklist(updated);
    };

    const handleToolsChecklistChange = (index, field, value) => {
        const updated = [...toolsChecklist];
        updated[index] = { ...updated[index], [field]: value };
        setToolsChecklist(updated);
    };

    const handleEditPPE = (item) => {
        setNewItem({
            name: item.name,
            age_months: item.age_months,
            condition: item.condition,
            details: item.details,
            count: item.count
        });
        setEditingId(item.id);
        setShowAddModal(true);
    };

    const handleDeletePPE = async (id) => {
        if (!confirm('Are you sure you want to remove this item?')) return;
        try {
            const { error } = await supabase
                .from('user_ppe')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Clear PPE cache
            cacheHelper.clear(`user_ppe_${user.id}`);

            fetchPPE();
        } catch (error) {
            console.error('Error deleting PPE:', error);
        }
    };

    const t = {
        en: {
            title: "Safety",
            tabs: {
                sops: "SOP",
                training: "90 Days Training",
                my_ppe: "My PPE",
                my_tools: "My Tools",
                report: "Report Incident"
            },
            sops: {
                title: "Standard Operating Procedures",
                categories: ["High Voltage", "Maintenance", "Storm Safety", "First Aid"]
            },
            training: {
                title: "90 Days Training Program",
                watch: "Watch Now"
            },
            my_ppe: {
                title: "My Personal Protective Equipment",
                addBtn: "Add New PPE",
                editBtn: "Edit PPE",
                empty: "No PPE items added yet.",
                fields: {
                    name: "Item Name",
                    count: "Quantity",
                    age: "Age (Months)",
                    condition: "Condition",
                    details: "Details / Specs"
                },
                conditions: {
                    Good: "Good",
                    Fair: "Fair",
                    Damaged: "Damaged",
                    Expired: "Expired"
                },
                items: {
                    "Safety Helmet": "Safety Helmet",
                    "Safety Shoes/Boots": "Safety Shoes/Boots",
                    "Insulated Gloves": "Insulated Gloves",
                    "Reflective Jacket": "Reflective Jacket",
                    "Safety Belt": "Safety Belt",
                    "Full Body Harness": "Full Body Harness",
                    "Voltage Detector": "Voltage Detector",
                    "Discharge Rod": "Discharge Rod",
                    "Safety Goggles": "Safety Goggles",
                    "Raincoat": "Raincoat",
                    "Torch/Emergency Light": "Torch/Emergency Light"
                }
            },
            my_tools: {
                title: "My Tools Checklist",
                addBtn: "Add New Tool",
                editBtn: "Edit Tool",
                empty: "No tools added yet.",
                fields: {
                    name: "Tool Name",
                    count: "Quantity",
                    age: "Age (Months)",
                    condition: "Condition",
                    details: "Details / Specs"
                },
                items: {
                    "Pliers": "Pliers",
                    "Screwdriver Set": "Screwdriver Set",
                    "Wrench": "Wrench",
                    "Hammer": "Hammer",
                    "Tester": "Tester",
                    "Multimeter": "Multimeter",
                    "Wire Stripper": "Wire Stripper",
                    "Drill Machine": "Drill Machine",
                    "Ladder": "Ladder",
                    "Rope": "Rope"
                }
            },
            report: {
                title: "Report a Hazard",
                form: {
                    location: "Location",
                    type: "Hazard Type",
                    desc: "Description",
                    photo: "Upload Photo",
                    submit: "Submit Report"
                }
            }
        },
        bn: {
            title: "সেফটি",
            tabs: {
                sops: "SOP",
                training: "৯০ দিনের প্রশিক্ষণ",
                my_ppe: "আমার পিপিই",
                my_tools: "আমার টুলস",
                report: "রিপোর্ট করুন"
            },
            sops: {
                title: "স্ট্যান্ডার্ড অপারেটিং প্রসিডিউর (SOP)",
                categories: ["উচ্চ ভোল্টেজ", "রক্ষণাবেক্ষণ", "ঝড় নিরাপত্তা", "প্রাথমিক চিকিৎসা"]
            },
            training: {
                title: "৯০ দিনের প্রশিক্ষণ কর্মসূচি",
                watch: "এখন দেখুন"
            },
            my_ppe: {
                title: "আমার ব্যক্তিগত সুরক্ষা সরঞ্জাম",
                addBtn: "নতুন পিপিই যোগ করুন",
                editBtn: "পিপিই সম্পাদনা করুন",
                empty: "এখনও কোন পিপিই যোগ করা হয়নি।",
                fields: {
                    name: "আইটেমের নাম",
                    count: "পরিমাণ",
                    age: "বয়স (মাস)",
                    condition: "অবস্থা",
                    details: "বিবরণ"
                },
                conditions: {
                    Good: "ভালো",
                    Fair: "মোটামুটি",
                    Damaged: "ক্ষতিগ্রস্ত",
                    Expired: "মেয়াদোত্তীর্ণ"
                },
                items: {
                    "Safety Helmet": "সেফটি হেলমেট",
                    "Safety Shoes/Boots": "সেফটি জুতো/বুট",
                    "Insulated Gloves": "ইনসুলেটেড গ্লাভস",
                    "Reflective Jacket": "রিফ্লেক্টিভ জ্যাকেট",
                    "Safety Belt": "সেফটি বেল্ট",
                    "Full Body Harness": "ফুল বডি হারনেস",
                    "Voltage Detector": "ভোল্টেজ ডিটেক্টর",
                    "Discharge Rod": "ডিসচার্জ রড",
                    "Safety Goggles": "সেফটি গগলস",
                    "Raincoat": "রেইনকোট",
                    "Torch/Emergency Light": "টর্চ/জরুরী আলো"
                }
            },
            my_tools: {
                title: "আমার টুলস চেকলিস্ট",
                addBtn: "নতুন টুল যোগ করুন",
                editBtn: "টুল সম্পাদনা করুন",
                empty: "এখনও কোন টুল যোগ করা হয়নি।",
                fields: {
                    name: "টুলের নাম",
                    count: "পরিমাণ",
                    age: "বয়স (মাস)",
                    condition: "অবস্থা",
                    details: "বিবরণ"
                },
                items: {
                    "Pliers": "প্লায়ার্স",
                    "Screwdriver Set": "স্ক্রু ড্রাইভার সেট",
                    "Wrench": "রেঞ্চ",
                    "Hammer": "হাতুড়ি",
                    "Tester": "টেস্টার",
                    "Multimeter": "মাল্টিমিটার",
                    "Wire Stripper": "ওয়্যার স্ট্রিপার",
                    "Drill Machine": "ড্রিল মেশিন",
                    "Ladder": "মই",
                    "Rope": "দড়ি"
                }
            },
            report: {
                title: "বিপদ রিপোর্ট করুন",
                form: {
                    location: "অবস্থান",
                    type: "বিপদের ধরন",
                    desc: "বিবরণ",
                    photo: "ছবি আপলোড করুন",
                    submit: "রিপোর্ট জমা দিন"
                }
            }
        }
    }[language];

    return (
        <>
            <div className={`${activeTab === 'dashboard' ? 'compact-container' : 'max-w-7xl mx-auto px-4 sm:px-6'} py-6 sm:py-10 md:mb-6 transition-all duration-500`}>
                {/* Header Section */}
                {/* Header Section */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                            {activeTab === 'dashboard' ? (
                                language === 'en' ? (
                                    mode === 'training' ? '90 Days Training' : 'Safety'
                                ) : (
                                    mode === 'training' ? '৯০ দিনের প্রশিক্ষণ' : t.title
                                )
                            ) : (
                                t[activeTab]?.title || (activeTab === 'training' ? (language === 'en' ? 'Training Program' : 'প্রশিক্ষণ কর্মসূচি') : '')
                            )}
                        </h1>
                    </div>
                </div>

                {/* Network Error UI */}
                {fetchError && (
                    <div className="max-w-md mx-auto mb-8 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-2xl text-center animate-fade-in">
                        <div className="text-3xl mb-3">📡</div>
                        <h3 className="text-red-800 dark:text-red-400 font-bold mb-2">
                            {language === 'en' ? 'Connection Error' : 'কানেকশন এরর'}
                        </h3>
                        <p className="text-sm text-red-600 dark:text-red-500 mb-4">
                            {language === 'en'
                                ? 'Unable to load safety data. Please check your internet connection.'
                                : 'সেফটি ডাটা লোড করা সম্ভব হয়নি। আপনার ইন্টারনেট কানেকশন চেক করুন।'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                        >
                            {language === 'en' ? 'Retry' : 'আবার চেষ্টা করুন'}
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className="animate-slide-down">
                    {mode !== 'training' && activeTab === 'dashboard' && (
                        <SafetyDashboard
                            user={user}
                            userProfile={userProfile}
                            language={language}
                            setActiveTab={setActiveTab}
                            completedLessons={completedLessons}
                            t={t}
                            setCurrentView={setCurrentView}
                        />
                    )}


                    {activeTab === 'sops' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {/* Highlighted Safety Rule Carousel - Refined */}
                            {/* Highlighted Safety Rule Carousel - Refined */}
                            <div
                                className="md:col-span-2 bg-gradient-to-br from-orange-500/10 via-orange-600/5 to-transparent dark:from-orange-500/20 dark:via-orange-600/10 dark:to-transparent rounded-[2.5rem] p-8 border border-orange-100 dark:border-orange-800/30 shadow-sm min-h-[240px] flex flex-col justify-center relative overflow-hidden group touch-pan-y"
                                onTouchStart={(e) => {
                                    const touch = e.touches[0];
                                    e.currentTarget.dataset.touchStartX = touch.clientX;
                                }}
                                onTouchEnd={(e) => {
                                    const touch = e.changedTouches[0];
                                    const startX = parseFloat(e.currentTarget.dataset.touchStartX);
                                    const endX = touch.clientX;
                                    if (startX - endX > 50) nextRule(); // Swipe Left
                                    if (endX - startX > 50) prevRule(); // Swipe Right
                                }}
                            >
                                {/* Glassmorphism Background Elements */}
                                <div className="absolute top-0 right-0 w-48 h-48 bg-orange-400/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-orange-400/30 transition-colors duration-1000"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-600/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                                {/* Navigation Arrows */}
                                <button
                                    onClick={prevRule}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/40 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center border border-white/50 dark:border-slate-600 shadow-xl backdrop-blur-xl transition-all active:scale-90 z-20 opacity-0 group-hover:opacity-100 hidden sm:flex"
                                    aria-label="Previous rule"
                                >
                                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                <button
                                    onClick={nextRule}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/40 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center border border-white/50 dark:border-slate-600 shadow-xl backdrop-blur-xl transition-all active:scale-90 z-20 opacity-0 group-hover:opacity-100 hidden sm:flex"
                                    aria-label="Next rule"
                                >
                                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>

                                <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 sm:px-16 text-center">
                                    <div key={currentRuleIndex} className="animate-fade-in-up">
                                        <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/60 dark:bg-slate-800/60 text-3xl shadow-lg backdrop-blur-md border border-white/50 dark:border-slate-700">
                                            💡
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 dark:text-orange-400 mb-3 opacity-80">Safety Directive</h3>
                                        <p className="text-slate-800 dark:text-slate-100 text-lg sm:text-2xl font-black leading-tight tracking-tight max-w-2xl mx-auto">
                                            "{activeRules[currentRuleIndex]}"
                                        </p>
                                    </div>
                                </div>

                                {/* Modern Dot Indicators */}
                                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
                                    {activeRules.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentRuleIndex(idx)}
                                            className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentRuleIndex
                                                ? 'w-8 bg-orange-600 shadow-lg shadow-orange-600/20'
                                                : 'w-1.5 bg-orange-200 dark:bg-orange-800 hover:bg-orange-300'
                                                }`}
                                            aria-label={`Go to rule ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* SOP Categories - Dynamic from JSON */}
                            {sopData?.levels && (
                                <>
                                    {sopData.levels.length >= 5 ? (
                                        <>
                                            <GroupedSOPCard
                                                levels={sopData.levels.slice(0, 5)}
                                                onClick={setSelectedLevel}
                                                language={language}
                                            />
                                            {sopData.levels.slice(5).map((level, index) => (
                                                <SOPCard
                                                    key={index + 5}
                                                    level={level}
                                                    index={index + 5}
                                                    onClick={setSelectedLevel}
                                                />
                                            ))}
                                        </>
                                    ) : (
                                        sopData.levels.map((level, index) => (
                                            <SOPCard
                                                key={index}
                                                level={level}
                                                index={index}
                                                onClick={setSelectedLevel}
                                            />
                                        ))
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'training' && (
                        <div>
                            {trainingLoading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="mt-4 text-slate-500">Loading training content...</p>
                                </div>
                            ) : !selectedChapter && !trainingContent ? (
                                /* Chapter List View */
                                <>
                                    {/* Progress Summary Banner */}
                                    <div className="mb-10 bg-gradient-to-br from-orange-500/5 to-orange-600/5 dark:from-orange-500/10 dark:to-orange-900/5 rounded-[2.5rem] p-8 border border-orange-100 dark:border-orange-800/30 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-orange-400/20 transition-colors duration-1000"></div>
                                        <div className="relative z-10">
                                            <h2 className="text-2xl font-black text-token-text-primary tracking-tight mb-2">
                                                {language === 'en' ? 'Training Progress' : 'প্রশিক্ষণ অগ্রগতি'}
                                            </h2>
                                            <p className="text-sm font-medium text-token-text-secondary">
                                                {language === 'en'
                                                    ? `You have mastered ${completedLessons.length} out of 91 daily safety lessons.`
                                                    : `আপনি ৯১টি দৈনিক সেফটি পাঠের মধ্যে ${completedLessons.length}টি সম্পন্ন করেছেন।`}
                                            </p>
                                        </div>
                                        <div className="relative z-10 w-full sm:w-64">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Completion</span>
                                                <span className="text-sm font-black text-orange-600">{Math.round((completedLessons.length / 91) * 100)}%</span>
                                            </div>
                                            <div className="w-full h-4 bg-token-bg-surface shadow-inner rounded-full overflow-hidden border border-token-border">
                                                <div
                                                    className="h-full bg-gradient-to-r from-orange-400 via-orange-600 to-orange-700 rounded-full transition-all duration-1000 ease-out relative"
                                                    style={{ width: `${Math.round((completedLessons.length / 91) * 100)}%` }}
                                                >
                                                    <div className="absolute inset-0 shimmer opacity-30"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
                                        {trainingChapters.map((chapter) => (
                                            <TrainingChapterCard
                                                key={chapter.number}
                                                chapter={chapter}
                                                completedLessons={completedLessons}
                                                language={language}
                                                onClick={handleChapterClick}
                                            />
                                        ))}
                                    </div>

                                </>
                            ) : selectedChapter && !trainingContent ? (
                                /* Subchapter List View or FAQ View */
                                <div>
                                    <button
                                        onClick={() => setSelectedChapter(null)}
                                        className="mb-6 flex items-center gap-2 text-orange-600 hover:text-orange-700 font-bold"
                                    >
                                        ← {language === 'en' ? 'Back to Chapters' : 'অধ্যায়ে ফিরে যান'}
                                    </button>

                                    {selectedChapter.isFAQ ? (
                                        /* FAQ View */
                                        <div className="space-y-6 max-w-4xl mx-auto">
                                            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl shadow-violet-900/20 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-white/20 transition-colors duration-1000"></div>
                                                <div className="relative z-10">
                                                    <h2 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">{selectedChapter.content.title}</h2>
                                                    <p className="text-violet-100 text-base font-medium mb-8 max-w-xl opacity-90">{selectedChapter.content.subtitle}</p>

                                                    {/* Search Input - Premium Design */}
                                                    <div className="relative group/search">
                                                        <div className="absolute inset-0 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-inner transition-all group-focus-within/search:bg-white/30"></div>
                                                        <input
                                                            type="text"
                                                            placeholder={language === 'en' ? 'Search questions or tags...' : 'প্রশ্ন বা ট্যাগ খুঁজুন...'}
                                                            value={faqSearchQuery}
                                                            onChange={(e) => setFaqSearchQuery(e.target.value)}
                                                            className="relative w-full pl-12 pr-6 py-4 rounded-2xl bg-transparent text-white placeholder:text-white/60 outline-none font-medium"
                                                        />
                                                        <div className="absolute left-4 top-4 text-white/70 group-focus-within/search:text-white transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedChapter.content.questions
                                                .filter(q => {
                                                    if (!faqSearchQuery) return true;
                                                    const query = faqSearchQuery.toLowerCase();
                                                    return (
                                                        q.question.toLowerCase().includes(query) ||
                                                        q.answer.toLowerCase().includes(query) ||
                                                        q.tags.some(tag => tag.toLowerCase().includes(query))
                                                    );
                                                })
                                                .map((q, idx) => (
                                                    <div key={q.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-900 transition-all duration-300 group">
                                                        <details className="group/details">
                                                            <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center font-black text-sm shrink-0 border border-violet-100 dark:border-violet-800 group-hover/details:bg-violet-600 group-hover/details:text-white transition-all">
                                                                        {q.id.replace('q', '')}
                                                                    </div>
                                                                    <span className="font-black text-slate-800 dark:text-slate-100 group-hover/details:text-violet-600 dark:group-hover/details:text-violet-400 transition-colors leading-tight">
                                                                        {q.question}
                                                                    </span>
                                                                </div>
                                                                <span className="transition-transform duration-500 group-open/details:rotate-180 text-violet-500">
                                                                    <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                                                </span>
                                                            </summary>
                                                            <div className="px-4 pb-4 pl-[3.25rem] text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-4 bg-slate-50/50 dark:bg-slate-900/30">
                                                                <p>{q.answer}</p>
                                                                {q.image && (
                                                                    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm max-w-md">
                                                                        <img
                                                                            src={`/quizzes/faq_images/${q.image}`}
                                                                            alt={q.question}
                                                                            className="w-full h-auto object-cover"
                                                                            loading="lazy"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div className="mt-3 flex flex-wrap gap-2">
                                                                    {q.tags.map(tag => (
                                                                        <span key={tag} className="px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                                            #{tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </details>
                                                    </div>
                                                ))}

                                            {selectedChapter.content.questions.filter(q => {
                                                if (!faqSearchQuery) return true;
                                                const query = faqSearchQuery.toLowerCase();
                                                return (
                                                    q.question.toLowerCase().includes(query) ||
                                                    q.answer.toLowerCase().includes(query) ||
                                                    q.tags.some(tag => tag.toLowerCase().includes(query))
                                                );
                                            }).length === 0 && (
                                                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                                        <div className="text-4xl mb-3">🔍</div>
                                                        <p>{language === 'en' ? 'No results found' : 'কোন ফলাফল পাওয়া যায়নি'}</p>
                                                    </div>
                                                )}
                                        </div>
                                    ) : (
                                        /* Regular Subchapter List */
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {selectedChapter.subchapters.map((subchapter, index) => {
                                                const isUnlocked = isLessonUnlocked(subchapter.chapterNum, subchapter.subchapterNum);
                                                const isCompleted = completedLessons.includes(subchapter.level_id);

                                                return (
                                                    <div
                                                        key={subchapter.level_id}
                                                        onClick={() => {
                                                            if (!user) {
                                                                setCurrentView('login');
                                                                return;
                                                            }
                                                            if (isUnlocked) {
                                                                setTrainingContent(subchapter);
                                                            }
                                                        }}
                                                        style={{ animationDelay: `${index * 0.05}s` }}
                                                        className={`p-5 rounded-[2rem] border transition-all duration-500 flex flex-col gap-4 relative overflow-hidden animate-slide-up active:scale-[0.98] ${isUnlocked
                                                            ? 'bg-token-bg-surface border-token-border hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-2xl cursor-pointer hover:-translate-y-1'
                                                            : 'bg-token-bg-page/60 border-token-border opacity-60 cursor-not-allowed'
                                                            } ${isCompleted ? 'ring-2 ring-emerald-500/20' : ''} group`}
                                                    >
                                                        {/* Status Badge */}
                                                        <div className="flex justify-between items-start">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border-2 transition-transform group-hover:scale-110 ${isCompleted
                                                                ? 'bg-emerald-500 text-white border-emerald-400 dark:border-emerald-600 shadow-lg shadow-emerald-500/20'
                                                                : isUnlocked
                                                                    ? 'bg-gradient-to-br from-orange-600 to-orange-500 text-white border-orange-400 dark:border-orange-800/50 shadow-lg shadow-orange-500/20'
                                                                    : 'bg-token-bg-page text-token-text-muted border-token-border'
                                                                }`}>
                                                                {isCompleted ? '✓' : subchapter.level_id}
                                                            </div>
                                                            {isCompleted ? (
                                                                <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-800">
                                                                    {language === 'en' ? 'Mastered' : 'সম্পন্ন'}
                                                                </span>
                                                            ) : !isUnlocked ? (
                                                                <span className="text-token-text-muted bg-token-bg-page px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-token-border flex items-center gap-1">
                                                                    <span>🔒</span> {language === 'en' ? 'Locked' : 'অপ্রাপ্য'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-orange-100 dark:border-orange-800">
                                                                    {language === 'en' ? 'Next Up' : 'পরবর্তী'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex-1">
                                                            <span className="text-[10px] uppercase font-black text-token-text-muted tracking-[0.2em] mb-1 block">
                                                                {subchapter.badge_name}
                                                            </span>
                                                            <h4 className={`font-black text-base leading-tight line-clamp-2 transition-colors ${isUnlocked ? 'text-token-text-primary group-hover:text-orange-600 dark:group-hover:text-orange-400' : 'text-token-text-muted'
                                                                }`}>
                                                                {subchapter.level_title}
                                                            </h4>
                                                        </div>

                                                        {/* Action Label */}
                                                        {isUnlocked && (
                                                            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-all">
                                                                {language === 'en' ? 'Start Lesson' : 'শুরু করুন'}
                                                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div >
                            ) : null}
                        </div>
                    )}

                    {
                        activeTab === 'my_ppe' && (
                            <div className="w-full animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight">{t.my_ppe.title}</h2>
                                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Keep your gear status updated</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (isEditMode) {
                                                    handleSavePPE();
                                                } else {
                                                    setIsEditMode(true);
                                                }
                                            }}
                                            className={`px-6 py-2.5 rounded-2xl text-sm font-black transition-all shadow-sm active:scale-95 flex items-center gap-2 ${isEditMode
                                                ? 'bg-orange-600 text-white shadow-orange-900/20'
                                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-orange-300'
                                                }`}
                                        >
                                            {isEditMode ? (
                                                <><span>✓</span> {language === 'en' ? 'Finish Editing' : 'সম্পন্ন করুন'}</>
                                            ) : (
                                                <><span>⚙️</span> {language === 'en' ? 'Manage Gear' : 'ম্যানেজ করুন'}</>
                                            )}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 divide-y divide-slate-50 dark:divide-slate-700/50">
                                        {loading ? (
                                            <div className="p-20 text-center animate-pulse">
                                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl mx-auto mb-4"></div>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Gear...</p>
                                            </div>
                                        ) : (
                                            ppeChecklist.map((item, idx) => (
                                                <div key={item.name} className={`p-5 sm:p-6 transition-all duration-300 ${item.available ? 'bg-orange-50/10 dark:bg-orange-900/5' : 'opacity-40'}`}>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                                                        {/* Availability Switch */}
                                                        {isEditMode ? (
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() => handleChecklistChange(idx, 'available', !item.available)}
                                                                    className={`w-12 h-6 rounded-full transition-all relative ${item.available ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.available ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                                <span className="text-[10px] font-black uppercase text-slate-400">Available</span>
                                                            </div>
                                                        ) : (
                                                            <div className={`w-3 h-3 rounded-full ${item.available ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                                        )}

                                                        {/* Icon & Name */}
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border ${item.available ? 'bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600' : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}>
                                                                {item.icon}
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className={`font-black text-base sm:text-lg leading-tight ${item.available ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                                                                    {language === 'bn' ? t.my_ppe.items[item.name] : item.name}
                                                                </h3>
                                                                {!item.available && !isEditMode && <span className="text-[10px] font-bold text-slate-400 uppercase">Not in inventory</span>}
                                                            </div>
                                                        </div>

                                                        {/* Stats Container */}
                                                        {item.available && (
                                                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 sm:mt-0">
                                                                {isEditMode ? (
                                                                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full sm:w-auto">
                                                                        {/* Qty */}
                                                                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-2 flex items-center gap-2">
                                                                            <span className="text-[9px] font-black uppercase text-slate-400">Qty</span>
                                                                            <input
                                                                                type="number"
                                                                                min="1"
                                                                                value={item.count}
                                                                                onChange={(e) => handleChecklistChange(idx, 'count', e.target.value)}
                                                                                className="w-10 bg-transparent text-sm font-black focus:outline-none"
                                                                            />
                                                                        </div>

                                                                        {/* Condition */}
                                                                        <select
                                                                            value={item.condition}
                                                                            onChange={(e) => handleChecklistChange(idx, 'condition', e.target.value)}
                                                                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-2 text-xs font-black focus:outline-none"
                                                                        >
                                                                            <option value="Good">Good</option>
                                                                            <option value="Fair">Fair</option>
                                                                            <option value="Damaged">Damaged</option>
                                                                        </select>

                                                                        {/* Age */}
                                                                        <select
                                                                            value={item.age}
                                                                            onChange={(e) => handleChecklistChange(idx, 'age', e.target.value)}
                                                                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-2 text-xs font-black focus:outline-none"
                                                                        >
                                                                            <option value="<6m">&lt;6m</option>
                                                                            <option value="6-12m">6-12m</option>
                                                                            <option value="1-2y">1-2y</option>
                                                                            <option value=">2y">&gt;2y</option>
                                                                        </select>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Inventory</span>
                                                                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{item.count} Units</span>
                                                                        </div>
                                                                        <div className="h-8 w-px bg-slate-100 dark:bg-slate-700"></div>
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Condition</span>
                                                                            <span className={`text-sm font-black ${item.condition === 'Good' ? 'text-emerald-500' : item.condition === 'Fair' ? 'text-amber-500' : 'text-red-500'}`}>
                                                                                {item.condition}
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-8 w-px bg-slate-100 dark:bg-slate-700"></div>
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Age</span>
                                                                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{item.age}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'my_tools' && (
                            <div className="w-full animate-fade-in py-12 flex flex-col items-center justify-center text-center">
                                <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-xl shadow-indigo-500/10 animate-pulse">
                                    🏗️
                                </div>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">
                                    {language === 'en' ? 'Coming Soon!' : 'শীঘ্রই আসছে!'}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                                    {language === 'en'
                                        ? 'We are polishing a brand new interactive experience for your toolbox. Stay tuned!'
                                        : 'আমরা আপনার টুলবক্সের জন্য একটি নতুন ইন্টারেক্টিভ অভিজ্ঞতা তৈরি করছি। সাথেই থাকুন!'}
                                </p>
                                <div className="mt-8 flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )
                    }


                </div > {/* animate-slide-down */}

                {/* Incident Report Section */}
                {activeTab === 'report' && (
                    <div className="animate-slide-up max-w-3xl mx-auto py-4">
                        <IncidentReportForm
                            user={user}
                            language={language}
                            t={t}
                        />
                    </div>
                )}
            </div > {/* Root Container */}

            {/* Full Page Content View - Using Portal to bypass parent layout constraints */}
            {trainingContent && createPortal(
                <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 overflow-y-auto animate-slide-up w-full">
                    {/* Sticky Header */}
                    <div className="sticky top-0 z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm gap-3 safe-area-inset-top">
                        <button
                            onClick={() => {
                                setTrainingContent(null);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 flex-shrink-0"
                            title={language === 'en' ? 'Back to Lessons' : 'পাঠে ফিরে যান'}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex-1 text-center min-w-0">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {trainingContent.level_id && `${trainingContent.level_id}. `}{trainingContent.level_title}
                            </h2>
                        </div>
                        <div className="w-9 flex-shrink-0"></div> {/* Spacer for centering */}
                    </div>

                    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-16">
                        {/* Hero Header */}
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 sm:p-10 text-white mb-10 shadow-xl shadow-orange-500/20">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-white/25 backdrop-blur-sm text-[11px] uppercase tracking-wider font-bold mb-5 border border-white/30">
                                {trainingContent.badge_name}
                            </div>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 reading-content leading-snug">
                                {trainingContent.level_title}
                            </h2>
                            <p className="text-orange-100 text-sm sm:text-base font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-200"></span>
                                Level {trainingContent.level_id}
                            </p>
                        </div>

                        {/* Mission Briefing */}
                        <div className="bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/30 dark:to-orange-900/20 border-l-4 border-orange-500 p-6 sm:p-8 rounded-r-2xl mb-10 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-800 flex items-center justify-center text-2xl flex-shrink-0">
                                    🎯
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-orange-900 dark:text-orange-100 mb-3 uppercase tracking-wider text-xs">
                                        {language === 'en' ? 'Mission Briefing' : 'মূল কথা'}
                                    </h3>
                                    <p className="text-slate-700 dark:text-slate-300 reading-content leading-relaxed text-base whitespace-pre-line">
                                        {trainingContent.mission_briefing}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Sections */}
                        <div className="space-y-10">
                            {trainingContent.sections?.map((section, sIdx) => (
                                <div key={sIdx} className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 reading-content flex items-center gap-4">
                                        <span className="w-2 h-8 bg-gradient-to-b from-orange-500 to-orange-400 rounded-full flex-shrink-0"></span>
                                        {section.title}
                                    </h3>
                                    <div className="space-y-10">
                                        {section.points?.map((point, pIdx) => (
                                            <div key={pIdx} className="relative pl-7 border-l-2 border-orange-200 dark:border-orange-900/30">
                                                <div className="absolute left-[-7px] top-1 w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white dark:border-slate-800 shadow-sm"></div>
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 reading-content text-lg sm:text-xl">
                                                    {point.item_name}
                                                </h4>
                                                {point.image_name && (
                                                    <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                                        <img
                                                            src={`/quizzes/${point.image_name}`}
                                                            alt={point.item_name}
                                                            className="w-full h-auto object-cover max-h-80"
                                                            loading="lazy"
                                                        />
                                                        {point.image_caption && (
                                                            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-700">
                                                                <p className="text-sm text-slate-600 dark:text-slate-400 italic text-center font-medium">
                                                                    {point.image_caption}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="space-y-5">
                                                    {point.specifications && (
                                                        <div className="bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/20 dark:to-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/30 hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <span className="text-orange-500 text-lg">📋</span>
                                                                <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                                                                    {language === 'en' ? 'Details' : 'বিস্তারিত'}
                                                                </p>
                                                            </div>
                                                            <p className="text-base text-slate-700 dark:text-slate-300 reading-content leading-relaxed whitespace-pre-line">
                                                                {point.specifications}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {point.importance && (
                                                        <div className="bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/20 dark:to-amber-900/10 p-5 rounded-2xl border-2 border-amber-200 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <span className="text-amber-500 text-lg">💡</span>
                                                                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                                                    {language === 'en' ? 'Key Point' : 'মূল বিষয়'}
                                                                </p>
                                                            </div>
                                                            <p className="text-base text-slate-800 dark:text-slate-200 reading-content leading-relaxed font-semibold whitespace-pre-line">
                                                                {point.importance}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {point.daily_check && (
                                                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/50 dark:from-emerald-950/20 dark:to-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <span className="text-emerald-500 text-lg">✓</span>
                                                                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                                    {language === 'en' ? 'Quick Tip' : 'পরামর্শ'}
                                                                </p>
                                                            </div>
                                                            <p className="text-base text-slate-700 dark:text-slate-300 reading-content leading-relaxed whitespace-pre-line">
                                                                {point.daily_check}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pro Tips */}
                        {trainingContent.pro_tip && (
                            <div className="mt-12 bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-600 rounded-3xl p-8 sm:p-10 text-white shadow-lg shadow-emerald-500/25">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-2xl">
                                        💡
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-bold reading-content">
                                        {trainingContent.pro_tip.title}
                                    </h3>
                                </div>
                                <ul className="space-y-5">
                                    {trainingContent.pro_tip.content?.map((tip, idx) => (
                                        <li key={idx} className="flex items-start gap-4 text-emerald-50 reading-content leading-relaxed text-base">
                                            <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Myth Buster */}
                        {trainingContent.myth_buster && (
                            <div className="mt-12 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 border-2 border-red-100 dark:border-red-900/30 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl">
                                        ⚠️
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-red-700 dark:text-red-400 reading-content">
                                        {trainingContent.myth_buster.title}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                    {trainingContent.myth_buster.myths?.map((item, idx) => (
                                        <div key={idx} className="bg-gradient-to-br from-slate-50 to-slate-50/50 dark:from-slate-900/50 dark:to-slate-900/30 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 transition-colors">
                                            <div className="mb-5">
                                                <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                                                    {language === 'en' ? 'Myth' : 'মিথ'}
                                                </p>
                                                <p className="text-base text-slate-700 dark:text-slate-300 italic reading-content leading-relaxed font-medium whitespace-pre-line">
                                                    "{item.myth}"
                                                </p>
                                            </div>
                                            <div className="pt-5 border-t border-slate-200 dark:border-slate-700">
                                                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                                                    {language === 'en' ? 'Reality' : 'বাস্তবতা'}
                                                </p>
                                                <p className="text-base text-slate-700 dark:text-slate-300 reading-content leading-relaxed whitespace-pre-line">
                                                    {item.reality || item.fact}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Advanced Section */}
                        {trainingContent.advanced_section && (
                            <div className="mt-12 bg-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl hover:shadow-2xl transition-shadow">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-2xl">
                                        🔬
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-bold reading-content">
                                        {trainingContent.advanced_section.title}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    {trainingContent.advanced_section.facts?.map((fact, idx) => (
                                        <div key={idx} className="bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/10 hover:border-white/20 hover:bg-white/8 transition-all">
                                            <h4 className="font-bold text-orange-300 mb-4 reading-content text-lg sm:text-xl">
                                                {fact.title}
                                            </h4>
                                            <p className="text-slate-200 reading-content leading-relaxed text-base whitespace-pre-line">
                                                {fact.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mark as Complete Button */}
                        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                            {!completedLessons.includes(trainingContent.level_id) ? (
                                <>
                                    <button
                                        onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                        className="w-full px-8 py-4 rounded-2xl font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 text-lg active:scale-95"
                                    >
                                        <span className="text-xl">✓</span>
                                        {language === 'en' ? 'Mark as Complete' : 'সম্পন্ন হিসাবে চিহ্নিত করুন'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTrainingContent(null);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="w-full mt-4 px-8 py-4 rounded-2xl font-bold transition-all bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-3 text-lg active:scale-95"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        {language === 'en' ? 'Back to Lessons' : 'পাঠে ফিরে যান'}
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-full px-8 py-4 rounded-2xl font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-3 text-lg border border-emerald-200 dark:border-emerald-800">
                                        <span className="text-xl">✓</span>
                                        {language === 'en' ? 'Lesson Completed!' : 'পাঠ সম্পন্ন!'}
                                    </div>

                                    {/* Reward Feedback */}
                                    {recentReward && (
                                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl flex items-center justify-center gap-3 animate-bounce shadow-lg shadow-yellow-500/10">
                                            <span className="text-2xl">🏆</span>
                                            <div className="text-left">
                                                <p className="text-sm font-black text-yellow-800 dark:text-yellow-400 leading-tight">
                                                    {language === 'en' ? `+${recentReward} Competition Points Earned!` : `+${recentReward} কম্পিটিশন পয়েন্ট অর্জিত হয়েছে!`}
                                                </p>
                                                <p className="text-[10px] font-bold text-yellow-600/70 dark:text-yellow-500/50 uppercase tracking-wider">
                                                    {language === 'en' ? 'First Completion Bonus' : 'প্রথম সমাপ্তি বোনাস'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => initiateLessonCompletion(trainingContent.level_id)}
                                        className="w-full px-8 py-4 rounded-2xl font-bold transition-all bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3 text-lg active:scale-95"
                                    >
                                        <span className="text-xl">📝</span>
                                        {language === 'en' ? 'Practice Quiz' : 'প্র্যাকটিস কুইজ'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTrainingContent(null);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="w-full px-8 py-4 rounded-2xl font-bold transition-all bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 flex items-center justify-center gap-3 text-lg active:scale-95"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        {language === 'en' ? 'Back to Lessons' : 'পাঠে ফিরে যান'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {createPortal(
                <>
                    <SOPDetailModal
                        level={selectedLevel}
                        onClose={() => setSelectedLevel(null)}
                        language={language}
                    />

                    <ChapterQuizModal
                        isOpen={showQuizModal}
                        onClose={() => setShowQuizModal(false)}
                        onReadAgain={handleReadAgain}
                        onComplete={handleQuizComplete}
                        questions={currentQuizQuestions}
                        language={language}
                        isPractice={pendingLessonId && completedLessons.includes(pendingLessonId)}
                    />
                </>,
                document.body
            )}
        </>
    );
}



const SOPDetailModal = ({ level, onClose, language }) => {
    if (!level) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-700 animate-scale-in">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-800 p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xl font-bold">
                            {level.level_number}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">{level.level_name}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{level.focus}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-4 sm:p-6 space-y-6">
                    {/* Summary */}
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                        <p className={`reading-content font-medium ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {level.content.summary}
                        </p>
                    </div>

                    {/* Practical Tips */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                            <span>💡</span> {language === 'en' ? 'Practical Tips' : 'ব্যবহারিক টিপস'}
                        </h3>
                        <div className="space-y-3">
                            {level.content.practical_tips.map((tip, i) => (
                                <div key={i} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <span className="text-orange-500 font-bold">•</span>
                                    <p className={`reading-content text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>{tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Myths vs Facts */}
                    {level.content.myths_vs_facts && level.content.myths_vs_facts.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                <span>⚖️</span> {language === 'en' ? 'Myths vs Facts' : 'ভুল ধারণা বনাম বাস্তবতা'}
                            </h3>
                            <div className="space-y-4">
                                {level.content.myths_vs_facts.map((item, i) => (
                                    <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block mb-1">Myth</span>
                                            <p className={`reading-content text-xs ${language === 'bn' ? 'font-bengali' : ''}`}>{item.myth}</p>
                                        </div>
                                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
                                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider block mb-1">Fact</span>
                                            <p className={`reading-content text-xs font-medium ${language === 'bn' ? 'font-bengali' : ''}`}>{item.fact}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors"
                    >
                        {language === 'en' ? 'Got it' : 'বুঝেছি'}
                    </button>
                </div>
            </div>



        </div>
    );
};
