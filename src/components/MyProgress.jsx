import React, { useEffect, useMemo, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import CryptoJS from 'crypto-js';
import { supabase } from '../supabaseClient';
import { getBadgeByLevel } from '../utils/badgeUtils';
import { requestManager } from '../utils/requestManager';
import { WEBSITE_URL } from '../config';
import { lessonIdFromCoreLessonBonusQuizId } from '../utils/trainingLessonIds';
import UserProfilePrizeList from './UserProfilePrizeList';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatDate = (value, language = 'bn') => {
    if (!value) return language === 'en' ? 'Not available' : 'পাওয়া যায়নি';
    return new Date(value).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatDateTime = (value, language = 'bn') => {
    if (!value) return language === 'en' ? 'Not available' : 'পাওয়া যায়নি';
    return new Date(value).toLocaleString(language === 'en' ? 'en-US' : 'bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

const formatNumber = (value) => Number(value || 0).toLocaleString();

const dateKey = (value) => new Date(value).toDateString();

const getDaysBetween = (startValue, endValue) => {
    if (!startValue || !endValue) return 0;
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return Math.max(1, Math.ceil((end - start) / MS_PER_DAY) + 1);
};

const safePhone = (profile) => profile?.phone_number || profile?.phone || '';

const parseLessonId = (quizId = '') => lessonIdFromCoreLessonBonusQuizId(quizId);

const getActivityLabel = (quizId = '', language = 'bn') => {
    if (quizId.startsWith('lesson_bonus_')) return language === 'en' ? 'Lesson' : 'পাঠ';
    if (quizId.startsWith('hourly-challenge')) return language === 'en' ? 'Hourly Challenge' : 'ঘণ্টাভিত্তিক চ্যালেঞ্জ';
    return language === 'en' ? 'Quiz' : 'কুইজ';
};

const MetricCard = ({ label, value, hint, accent = 'slate' }) => {
    const accents = {
        slate: 'from-slate-500/10 to-slate-500/5 border-slate-200 dark:border-slate-700',
        orange: 'from-orange-500/10 to-orange-500/5 border-orange-200 dark:border-orange-800/50',
        emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-800/50',
        blue: 'from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-800/50',
        rose: 'from-rose-500/10 to-rose-500/5 border-rose-200 dark:border-rose-800/50'
    };

    return (
        <div className={`rounded-2xl border bg-gradient-to-br ${accents[accent] || accents.slate} p-4 sm:p-5 shadow-sm`}>
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">{label}</p>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">{value}</div>
            {hint && <p className="mt-2 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug">{hint}</p>}
        </div>
    );
};

export default function MyProgress({ language = 'bn', user, targetUserId, setCurrentView, returnView = 'leaderboard' }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [reportGeneratedAt] = useState(() => new Date());
    const [isDownloading, setIsDownloading] = useState(false);
    const certRef = useRef(null);

    const handleDownloadPNG = async () => {
        const downloadEl = document.getElementById('landscape-certificate-download');
        if (!downloadEl) return;
        
        setIsDownloading(true);
        try {
            // Force it to be visible during capture but keep it off-screen
            downloadEl.style.display = 'block';
            
            const canvas = await html2canvas(downloadEl, {
                scale: 2, // High resolution enough for 1400px content
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 1400,
                height: 1000
            });

            // Hide it again
            downloadEl.style.display = 'none';

            const link = document.createElement('a');
            const fileName = `Certificate_${profile?.full_name?.replace(/\s+/g, '_') || 'SmartLineman'}.png`;
            link.download = fileName;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (err) {
            console.error('Download failed:', err);
            alert(language === 'en' ? 'Download failed. Please try again.' : 'ডাউনলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
        } finally {
            setIsDownloading(false);
        }
    };

    const certId = useMemo(() => {
        if (!profile?.id) return '';
        // Use static identity factors (ID and created_at) to make the serial number permanent.
        const raw = `${profile.id}-${profile.created_at}`;
        return CryptoJS.MD5(raw).toString().substring(0, 12).toUpperCase();
    }, [profile]);

    const verificationUrl = useMemo(() => {
        // In local development, we stick to the hash for safety.
        // In production (Vercel), we use the clean clean 'verify/[ID]' route.
        const origin = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.') 
            ? `${window.location.origin}/#` 
            : WEBSITE_URL;
        return `${origin}/verify/${profile?.id}`;
    }, [profile?.id]);

    const resolvedUserId = targetUserId || user?.id;
    const isCurrentUser = user?.id === resolvedUserId;

    const backLabel = language === 'en' ? 'Back to leaderboard' : 'লিডারবোর্ডে ফিরুন';

    const handleBack = () => {
        if (typeof setCurrentView === 'function') {
            setCurrentView(returnView);
        }
    };

    const renderBackButton = () => (
        !isCurrentUser ? (
            <button
                type="button"
                onClick={handleBack}
                className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${language === 'bn' ? 'font-bengali' : ''}`}
            >
                <span aria-hidden>←</span>
                {backLabel}
            </button>
        ) : null
    );

    useEffect(() => {
        let active = true;

        const fetchData = async () => {
            if (!resolvedUserId) return;

            setLoading(true);
            setError(null);

            try {
                const profilePromise = requestManager.fetch(
                    `my_progress_profile_${resolvedUserId}`,
                    async () => {
                        const { data, error: profileError } = await supabase
                            .from('profiles')
                            .select('id, slm_id, full_name, email, role, district, block, blood_group, avatar_url, phone, phone_number, created_at, last_login_at, training_level, points, reading_points, quiz_points, completed_lessons')
                            .eq('id', resolvedUserId)
                            .single();

                        if (profileError) throw profileError;
                        return data;
                    },
                    { ttl: 5, swr: true, forceRefresh: true }
                );

                const attemptsPromise = requestManager.fetch(
                    `my_progress_attempts_${resolvedUserId}`,
                    async () => {
                        const { data, error: attemptsError } = await supabase
                            .from('quiz_attempts')
                            .select('quiz_id, score, penalty, created_at')
                            .eq('user_id', resolvedUserId)
                            .order('created_at', { ascending: true });

                        if (attemptsError) throw attemptsError;
                        return data || [];
                    },
                    { ttl: 5, swr: true, forceRefresh: true }
                );

                const [profileData, attemptsData] = await Promise.all([profilePromise, attemptsPromise]);

                if (!active) return;
                setProfile(profileData || null);
                setAttempts(attemptsData || []);
            } catch (fetchError) {
                console.error('MyProgress fetch error:', fetchError);
                if (active) setError(fetchError);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchData();

        return () => {
            active = false;
        };
    }, [resolvedUserId]);

    const stats = useMemo(() => {
        const completedLessons = Array.isArray(profile?.completed_lessons) ? profile.completed_lessons.filter(Boolean) : [];
        const lessonAttempts = attempts.filter(item => item.quiz_id?.startsWith('lesson_bonus_') && Number(item.score || 0) > 0);
        const hourlyAttempts = attempts.filter(item => item.quiz_id?.startsWith('hourly-challenge'));
        const lessonAttemptIds = [...new Set(lessonAttempts.map(item => parseLessonId(item.quiz_id)).filter(Boolean))];
        const lessonIds = [...new Set([...completedLessons, ...lessonAttemptIds])];

        const hasRewardTimestamps = lessonAttempts.length > 0;
        const now = new Date();
        const accountAgeDays = getDaysBetween(profile?.created_at, now);
        const studyWindowDays = hasRewardTimestamps
            ? getDaysBetween(lessonAttempts[0]?.created_at, lessonAttempts[lessonAttempts.length - 1]?.created_at)
            : Math.max(1, accountAgeDays || 1);

        const chapterMap = new Map();
        lessonIds.forEach((lessonId) => {
            const chapterNumber = String(lessonId).split('.')[0];
            if (!chapterNumber) return;
            chapterMap.set(chapterNumber, (chapterMap.get(chapterNumber) || 0) + 1);
        });

        const lessonsRead = lessonIds.length;
        const chaptersRead = chapterMap.size;
        const readingDays = hasRewardTimestamps
            ? Math.max(1, [...new Set(lessonAttempts.map(item => dateKey(item.created_at)))].length)
            : Math.max(1, accountAgeDays || 1);

        const lessonsPerActiveDay = lessonsRead > 0 ? (lessonsRead / readingDays) : 0;
        const daysPerLesson = lessonsRead > 0 ? (studyWindowDays / lessonsRead) : 0;
        const daysPerChapter = chaptersRead > 0 ? (studyWindowDays / chaptersRead) : 0;
        const avgScorePerAttempt = attempts.length > 0 ? attempts.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / attempts.length : 0;

        const totalAttempts = attempts.length;
        const totalPenaltySum = attempts.reduce((sum, item) => sum + (Number(item.penalty) || 0), 0);
        const averagePenalty = totalAttempts > 0 ? totalPenaltySum / totalAttempts : 0;

        const paceSource = hasRewardTimestamps
            ? (language === 'en' ? 'Derived from lesson reward timestamps' : 'পাঠের পুরস্কারের সময় ধরে হিসাব করা হয়েছে')
            : (language === 'en' ? 'Estimated fallback' : 'আনুমানিক হিসাব');

        return {
            completedLessons: lessonIds.length,
            chaptersRead,
            lessonAttempts: lessonAttempts.length,
            hourlyAttempts: hourlyAttempts.length,
            readingDays,
            lessonsPerActiveDay,
            daysPerLesson,
            daysPerChapter,
            avgScorePerAttempt,
            averagePenalty,
            totalPenaltySum,
            paceSource,
            chapterBreakdown: Array.from(chapterMap.entries())
                .map(([chapter, count]) => ({ chapter, count }))
                .sort((a, b) => Number(a.chapter) - Number(b.chapter)),
            lessonIds
        };
    }, [attempts, profile]);

    const badge = getBadgeByLevel(profile?.training_level || 0, profile?.reading_points || 0);
    const phone = safePhone(profile);
    const joinedDate = formatDate(profile?.created_at, language);
    const lastActive = formatDate(profile?.last_login_at, language);


    const labels = {
        title: language === 'en' ? 'My Progress' : 'আমার শেখার অগ্রগতি',
        subtitle: language === 'en' ? 'Learning summary and history' : 'শেখার সারাংশ ও ইতিহাস',
        back: backLabel,
        joined: language === 'en' ? 'Date of joining' : 'কবে যোগ দিয়েছেন',
        contact: language === 'en' ? 'Contact number' : 'ফোন নম্বর',
        district: language === 'en' ? 'District' : 'জেলা',
        block: language === 'en' ? 'Block' : 'ব্লক',
        bloodGroup: language === 'en' ? 'Blood group' : 'রক্তের গ্রুপ',
        badge: language === 'en' ? 'Present reading stage' : 'বর্তমান পড়ার ধাপ',
        learningPace: language === 'en' ? 'Learning pace' : 'শেখার গতি',
        chapterBreakdown: language === 'en' ? 'Chapter breakdown' : 'অধ্যায়ভিত্তিক ছক',
        noData: language === 'en' ? 'No data available yet.' : 'এখনও কোনো তথ্য পাওয়া যায়নি।'
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 sm:px-6 py-6 sm:py-8">
                <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                    {renderBackButton()}
                    <div className="animate-pulse space-y-4 sm:space-y-6">
                    <div className="h-44 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, idx) => <div key={idx} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
                    </div>
                    <div className="h-80 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
                    </div>
                </div>
            </main>
        );
    }

    if (error || !profile) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 sm:px-6 py-8">
                <div className="max-w-3xl mx-auto space-y-4">
                    {renderBackButton()}
                <div className="rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 text-center">
                    <div className="text-5xl mb-4">📊</div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">{labels.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400">{labels.noData}</p>
                    <button
                        onClick={isCurrentUser ? () => setCurrentView('home') : handleBack}
                        className="mt-6 px-5 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors"
                    >
                        {isCurrentUser
                            ? (language === 'en' ? 'Back to Home' : 'হোমে ফিরুন')
                            : backLabel}
                    </button>
                </div>
                </div>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 sm:px-6 py-4 sm:py-8">
            <div className="pointer-events-none fixed bottom-4 right-4 z-0" aria-hidden="true">
                <img
                    src="/icons/logo.png"
                    alt=""
                    className="w-40 sm:w-48 object-contain opacity-[0.25] select-none drop-shadow-lg"
                />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto space-y-5 sm:space-y-6">
                <div className="flex items-center justify-between gap-4">
                    {renderBackButton() || <div className="flex-1" />}

                    {isCurrentUser && (
                        <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold uppercase tracking-widest">
                            {language === 'en' ? 'Your account' : 'আপনার অ্যাকাউন্ট'}
                        </div>
                    )}
                </div>

                {/* Certificate Section - Only renders when profile data (specifically ID) is ready */}
                {profile && profile.id && (
                    <section 
                        id="progress-report-content" 
                        ref={certRef}
                        className={`relative rounded-[2.5rem] overflow-hidden ${isCurrentUser ? 'certificate-frame' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pt-10'}`}
                    >
                    {isCurrentUser && (
                        <>
                            <div className="certificate-pattern pointer-events-none" />
                            <div className="certificate-security-watermark overflow-hidden pointer-events-none" aria-hidden="true" />
                        </>
                    )}
                    
                    <div className="relative z-20 flex flex-col items-center text-center">
                        {/* Certificate Header Text */}
                        {isCurrentUser && (
                            <>
                                <div className="mb-6">
                                    <h2 className="font-bengali text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-500 uppercase tracking-[0.2em] mb-1">
                                        {language === 'en' ? 'Certificate of Achievement' : 'সাফল্যের স্বীকৃতিপত্র'}
                                    </h2>
                                    <div className="w-48 h-1 bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 mx-auto mt-2 rounded-full" />
                                </div>

                                <p className="font-bengali text-slate-500 dark:text-slate-400 italic mb-8 max-w-lg leading-relaxed">
                                    {language === 'en' 
                                        ? 'This certifies the academic progress and technical proficiency of the following individual in the SmartLineman education program.'
                                        : 'এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, স্মার্টলাইনম্যান শিক্ষা কার্যক্রমে নিম্নলিখিত শিক্ষার্থী তাঁর শিক্ষা ও কারিগরি দক্ষতায় সাফল্য অর্জন করেছেন।'}
                                </p>
                            </>
                        )}

                        {/* Name Section */}
                        <div className="mb-10 w-full max-w-2xl px-4">
                            <h1 className="font-bengali text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-slate-50 mb-4 drop-shadow-sm">
                                {profile.full_name || 'Anonymous'}
                            </h1>
                            <div className="w-full border-b-2 border-slate-200 dark:border-slate-800 relative">
                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 bg-white dark:bg-slate-950 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">
                                    {language === 'en' ? 'Learner Name' : 'শিক্ষার্থীর নাম'}
                                </span>
                            </div>
                        </div>

                        {/* Seal & Badge */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-12 sm:gap-24 mb-12">
                            <div className="flex flex-col items-center">
                                <div className="gold-seal mb-4">
                                    <span className="text-4xl">🏅</span>
                                </div>
                                <p className="font-black text-amber-700 dark:text-amber-500 text-sm uppercase tracking-widest">
                                    {badge ? (language === 'en' ? badge.en : badge.bn) : (language === 'en' ? 'Trainee' : 'ট্রেইনি')}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                    {language === 'en' ? 'Reading Stage' : 'পড়ার ধাপ'}
                                </p>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="text-5xl sm:text-7xl font-black text-slate-800 dark:text-slate-100 tabular-nums mb-2 tracking-tighter">
                                    {formatNumber(profile.points)}
                                </div>
                                <p className="font-black text-slate-500 dark:text-slate-400 text-sm uppercase tracking-widest">
                                    {language === 'en' ? 'Total Credits' : 'মোট ক্রেডিট'}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                    {language === 'en' ? 'Learning Points' : 'শিক্ষা পয়েন্ট'}
                                </p>
                            </div>
                        </div>

                        {/* Signatures */}
                        {isCurrentUser && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-40 w-full max-w-4xl px-8 mt-4">
                                <div className="flex flex-col items-center">
                                    <div className="signature-line mb-3 font-bengali text-slate-400 dark:text-slate-600 h-10 flex items-center justify-center overflow-visible">
                                        <img 
                                            src="/signature.png" 
                                            alt="Official Signature" 
                                            className="h-14 sm:h-16 w-auto object-contain mix-blend-multiply dark:invert dark:brightness-200 opacity-90 transition-all"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        {language === 'en' ? 'Authority, SmartLineman.in' : 'কর্তৃপক্ষ, স্মার্টলাইনম্যান.ইন'}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="signature-line mb-3 font-bengali text-slate-400 dark:text-slate-600 h-10 flex items-center justify-center text-xl italic font-bold text-slate-800 dark:text-slate-200">
                                        {(() => {
                                            const d = reportGeneratedAt;
                                            const day = String(d.getDate()).padStart(2, '0');
                                            const month = String(d.getMonth() + 1).padStart(2, '0');
                                            const year = d.getFullYear();
                                            return `${day}/${month}/${year}`;
                                        })()}
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        {language === 'en' ? 'Date Issued' : 'ইস্যুর তারিখ'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Security Footer */}
                        {isCurrentUser && (
                            <div className="mt-12 w-full flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-800/60 pt-6 gap-6 sm:gap-4 opacity-80">
                                <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">
                                        {language === 'en' ? 'Certificate Serial Number' : 'সার্টিফিকেট সিরিয়াল নম্বর'}
                                    </p>
                                    <p className="cert-serial text-[11px] sm:text-xs">
                                        SLM-CERT-{certId.split('').map((c, i) => i > 0 && i % 4 === 0 ? `-${c}` : c).join('')}
                                    </p>
                                    <p className="mt-2 text-[9px] font-bold text-slate-400 max-w-[180px] leading-tight">
                                        {language === 'en' 
                                            ? 'Scan QR code or visit smartlineman.in/verify to authenticate this document.' 
                                            : 'এই নথির সত্যতা যাচাই করতে QR কোড স্ক্যান করুন বা smartlineman.in/verify ভিজিট করুন।'}
                                    </p>
                                </div>
                                
                                <div className="flex flex-col items-center sm:items-end gap-3">
                                    <div className="relative group">
                                        <div className="absolute -inset-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <a 
                                            href={verificationUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            title={language === 'en' ? 'Open Verification Page' : 'ভেরিফিকেশন পেজ খুলুন'}
                                            className="relative block p-2 bg-white rounded-lg shadow-sm border border-slate-100 ring-4 ring-slate-50 dark:ring-slate-900/50 cursor-pointer active:scale-95 transition-transform"
                                        >
                                            <QRCodeCanvas 
                                                value={verificationUrl || ""} 
                                                size={80} 
                                                level="M"
                                                includeMargin={true}
                                                imageSettings={{
                                                    src: "/icons/logo.png",
                                                    height: 16,
                                                    width: 16,
                                                    excavate: true,
                                                }}
                                            />
                                        </a>
                                    </div>
                                    <div className="flex flex-col gap-3 items-center sm:items-end">
                                        <button 
                                            onClick={handleDownloadPNG}
                                            disabled={isDownloading}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                                        >
                                            {isDownloading ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    {language === 'en' ? 'Preparing...' : 'প্রস্তুত হচ্ছে...'}
                                                </>
                                            ) : (
                                                <>
                                                    <span>📸</span> {language === 'en' ? 'Download PNG' : 'PNG ডাউনলোড করুন'}
                                                </>
                                            )}
                                        </button>

                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(verificationUrl);
                                                alert(language === 'en' ? 'Link copied to clipboard!' : 'লিঙ্ক কপি করা হয়েছে!');
                                            }}
                                            className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest hover:underline flex items-center gap-1 active:opacity-60"
                                        >
                                            <span>🔗</span> {language === 'en' ? 'Copy Link' : 'লিঙ্ক কপি করুন'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="absolute top-8 right-8 w-24 sm:w-32 opacity-10 dark:opacity-20 pointer-events-none grayscale contrast-125">
                        <img src="/icons/logo.png" alt="" className="w-full h-full object-contain" />
                    </div>

                    {/* Secondary Metrics (Integrated into certificate bottom) */}
                    <div className="px-5 sm:px-8 py-5 sm:py-6 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
                        <MetricCard label={language === 'en' ? 'Rank Stage' : 'পড়ার ধাপ'} value={`Lv ${profile.training_level || 1}`} hint={labels.badge} accent="orange" />
                        <MetricCard label={language === 'en' ? 'Reading Points' : 'পড়ার পয়েন্ট'} value={formatNumber(profile.reading_points)} hint={language === 'en' ? 'Lesson rewards' : 'পাঠ থেকে পাওয়া পয়েন্ট'} accent="emerald" />
                        <MetricCard label={language === 'en' ? 'Quiz Points' : 'কুইজ পয়েন্ট'} value={formatNumber(profile.quiz_points)} hint={language === 'en' ? 'Challenge rewards' : 'চ্যালেঞ্জ থেকে পাওয়া পয়েন্ট'} accent="blue" />
                        <MetricCard label={language === 'en' ? 'Penalties' : 'কাটা পয়েন্ট'} value={formatNumber(stats.totalPenaltySum)} hint={language === 'en' ? 'Sum from all quiz attempts' : 'সব চেষ্টা থেকে মোট'} accent="rose" />
                        <MetricCard label={language === 'en' ? 'Lessons Read' : 'পড়া পাঠ'} value={formatNumber(stats.completedLessons)} hint={language === 'en' ? 'Unique lessons completed' : 'যতগুলো পাঠ শেষ করেছেন'} accent="slate" />
                        <MetricCard label={language === 'en' ? 'Chapters Read' : 'পড়া অধ্যায়'} value={formatNumber(stats.chaptersRead)} hint={language === 'en' ? 'Distinct chapters reached' : 'যেসব অধ্যায় পর্যন্ত এগিয়েছেন'} accent="orange" />
                    </div>
                </section>
                )}

                {profile?.id && (
                    <UserProfilePrizeList userId={profile.id} language={language} />
                )}

                <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5 sm:gap-6">
                    <div className="space-y-5 sm:space-y-6">
                        <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 sm:p-6">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">{labels.learningPace}</p>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{language === 'en' ? 'How the learner is progressing' : 'অগ্রগতি কেমন চলছে'}</h2>
                                </div>
                                <div className="px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-800 text-xs font-bold">
                                    {stats.hourlyAttempts} {language === 'en' ? 'hourly' : 'বার'}
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                                <MetricCard label={language === 'en' ? 'Lessons / Active Day' : 'সক্রিয় দিনে গড় পাঠ'} value={stats.lessonsPerActiveDay ? stats.lessonsPerActiveDay.toFixed(1) : '—'} hint={stats.paceSource} accent="emerald" />
                                <MetricCard label={language === 'en' ? 'Days / Lesson' : 'একটি পাঠ শেষ করতে গড় দিন'} value={stats.daysPerLesson ? stats.daysPerLesson.toFixed(1) : '—'} hint={stats.paceSource} accent="blue" />
                                <MetricCard label={language === 'en' ? 'Days / Chapter' : 'একটি অধ্যায় শেষ করতে গড় দিন'} value={stats.daysPerChapter ? stats.daysPerChapter.toFixed(1) : '—'} hint={stats.paceSource} accent="orange" />
                                <MetricCard label={language === 'en' ? 'Hourly Challenges' : 'ঘণ্টাভিত্তিক চ্যালেঞ্জ'} value={formatNumber(stats.hourlyAttempts)} hint={language === 'en' ? 'Attempts attended' : 'যতবার অংশ নিয়েছেন'} accent="rose" />
                            </div>

                            <div className="mt-5 grid sm:grid-cols-3 gap-3">
                                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{language === 'en' ? 'Lesson attempts' : 'পাঠে অংশ নেওয়া বার'}</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">{formatNumber(stats.lessonAttempts)}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{language === 'en' ? 'Active reading days' : 'পড়ায় সক্রিয় দিন'}</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">{formatNumber(stats.readingDays)}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{language === 'en' ? 'Avg. score / attempt' : 'প্রতি চেষ্টার গড় স্কোর'}</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">{stats.avgScorePerAttempt.toFixed(1)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 sm:p-6">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">{labels.chapterBreakdown}</p>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{language === 'en' ? 'Learning distribution' : 'অধ্যায়ভিত্তিক অগ্রগতি'}</h2>
                                </div>
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {stats.chapterBreakdown.length} {language === 'en' ? 'chapters' : 'টি অধ্যায়'}
                                </div>
                            </div>

                            {stats.chapterBreakdown.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.chapterBreakdown.map((item) => {
                                        const maxCount = Math.max(...stats.chapterBreakdown.map(row => row.count), 1);
                                        const width = Math.max(8, (item.count / maxCount) * 100);
                                        return (
                                            <div key={item.chapter} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    <span>{language === 'en' ? 'Chapter' : 'অধ্যায়'} {item.chapter}</span>
                                                    <span>{formatNumber(item.count)} {language === 'en' ? 'lessons' : 'টি পাঠ'}</span>
                                                </div>
                                                <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500" style={{ width: `${width}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">{labels.noData}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-5 sm:space-y-6">
                        <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 sm:p-6">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">{language === 'en' ? 'Profile details' : 'প্রোফাইলের তথ্য'}</p>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{language === 'en' ? 'Identity & contact' : 'পরিচয় ও যোগাযোগের তথ্য'}</h2>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{labels.district}</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{profile.district || '—'}</span>
                                </div>
                                <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{labels.block}</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{profile.block || '—'}</span>
                                </div>
                                <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{labels.bloodGroup}</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{profile.blood_group || '—'}</span>
                                </div>
                                <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{labels.contact}</span>
                                    <a href={phone ? `tel:${phone}` : undefined} className="font-bold text-orange-600 dark:text-orange-400 text-right">{phone || '—'}</a>
                                </div>
                                <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{labels.joined}</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{joinedDate}</span>
                                </div>
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{language === 'en' ? 'Last active' : 'সর্বশেষ সক্রিয়'}</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{lastActive}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 sm:p-6">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">{language === 'en' ? 'Highlights' : 'দেখে নিন'}</p>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{language === 'en' ? 'Score composition' : 'স্কোরের ভাগ'}</h2>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                                        <span>{language === 'en' ? 'Reading' : 'পড়ার অংশ'}</span>
                                        <span>{formatNumber(profile.reading_points)} / {formatNumber(profile.points)}</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${profile.points ? Math.min(100, (profile.reading_points / Math.max(profile.points, 1)) * 100) : 0}%` }} />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                                        <span>{language === 'en' ? 'Quiz' : 'কুইজের অংশ'}</span>
                                        <span>{formatNumber(profile.quiz_points)} / {formatNumber(profile.points)}</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                                        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500" style={{ width: `${profile.points ? Math.min(100, (profile.quiz_points / Math.max(profile.points, 1)) * 100) : 0}%` }} />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                                        <span>{language === 'en' ? 'Penalty load' : 'কাটা পয়েন্ট'}</span>
                                        <span>{formatNumber(stats.totalPenaltySum)}</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                                        <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-600" style={{ width: `${stats.totalPenaltySum ? Math.min(100, (stats.totalPenaltySum / Math.max(profile.points + stats.totalPenaltySum, 1)) * 100) : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="flex items-center justify-between gap-3 border-t border-slate-200/70 dark:border-slate-800/70 pt-4 px-1 sm:px-2 pb-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>SmartLineman.in</span>
                    <span>Generated on {formatDateTime(reportGeneratedAt, language)}</span>
                </footer>

                {/* HIDDEN LANDSCAPE CERTIFICATE FOR DOWNLOADS */}
                <div 
                    id="landscape-certificate-download" 
                    style={{ 
                        display: 'none', 
                        width: '1400px', 
                        height: '1000px', 
                        padding: '60px', 
                        background: '#ffffff',
                        position: 'fixed',
                        top: 0,
                        left: '-2000px'
                    }}
                >
                    <div className="w-full h-full border-[20px] border-double border-amber-600/30 p-16 relative flex flex-col items-center bg-[#faf9f6]">
                        {/* Background Watermarks */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none grayscale contrast-125 flex items-center justify-center">
                            <img src="/icons/logo.png" alt="" className="w-1/2 object-contain" />
                        </div>

                        {/* Header */}
                        <div className="mb-10 text-center">
                            <h2 className="text-4xl font-black text-amber-800 uppercase tracking-[0.2em] mb-4">
                                {language === 'en' ? 'Certificate of Achievement' : 'সাফল্যের স্বীকৃতিপত্র'}
                            </h2>
                            <div className="w-64 h-1.5 bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 mx-auto rounded-full" />
                        </div>

                        <p className="text-xl text-slate-500 italic mb-12 max-w-2xl text-center leading-relaxed font-serif">
                            {language === 'en' 
                                ? 'This certifies the academic progress and technical proficiency of the following individual in the SmartLineman education program.'
                                : 'এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, স্মার্টলাইনম্যান শিক্ষা কার্যক্রমে নিম্নলিখিত শিক্ষার্থী তাঁর শিক্ষা ও কারিগরি দক্ষতায় সাফল্য অর্জন করেছেন।'}
                        </p>

                        {/* Recipient Name */}
                        <div className="mb-16 w-full text-center">
                            <h1 className="text-7xl font-black tracking-tight text-slate-900 mb-6 font-serif">
                                {profile?.full_name || 'Valued Learner'}
                            </h1>
                            <div className="w-3/4 mx-auto border-b-4 border-slate-200" />
                            <p className="mt-4 text-sm font-bold uppercase tracking-[0.4em] text-slate-400">
                                {language === 'en' ? 'Learner Name' : 'শিক্ষার্থীর নাম'}
                            </p>
                        </div>

                        {/* Footer Section: Seal, Signature, and QR */}
                        <div className="mt-auto w-full grid grid-cols-3 items-end gap-12">
                            {/* Left: Gold Seal */}
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg border-4 border-amber-200 mb-4 scale-125">
                                    <span className="text-5xl">🏅</span>
                                </div>
                                <p className="font-black text-amber-800 text-lg uppercase tracking-widest">{badge ? (language === 'en' ? badge.en : badge.bn) : 'Trainee'}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Reading Stage</p>
                            </div>

                            {/* Center: Live Signature & Points */}
                            <div className="flex flex-col items-center">
                                <div className="text-5xl font-black text-slate-800 tabular-nums mb-4 tracking-tighter">
                                    {profile?.points?.toLocaleString() || '0'}
                                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest ml-2">Credits</span>
                                </div>
                                <div className="flex items-center justify-center gap-8 w-full border-t-2 border-slate-200 pt-4">
                                    {/* Signature */}
                                    <div className="flex flex-col items-center">
                                        <img 
                                            src="/signature.png" 
                                            alt="Signature" 
                                            className="h-14 w-auto object-contain mix-blend-multiply opacity-90 mb-1"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            Authority, SmartLineman.in
                                        </p>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px h-12 bg-slate-200" />

                                    {/* Date */}
                                    <div className="flex flex-col items-center">
                                        <p className="text-xl font-serif italic text-slate-800 tracking-wide leading-none mb-3">
                                            {(() => {
                                                const d = reportGeneratedAt;
                                                const day = String(d.getDate()).padStart(2, '0');
                                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                                const year = d.getFullYear();
                                                return `${day}/${month}/${year}`;
                                            })()}
                                        </p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            {language === 'en' ? 'Date Issued' : 'ইস্যুর তারিখ'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right: QR Code & Serial */}
                            <div className="flex flex-col items-end">
                                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 ring-8 ring-slate-50 mb-6">
                                    <QRCodeCanvas 
                                        value={verificationUrl || ""} 
                                        size={120} 
                                        level="H"
                                        includeMargin={true}
                                        imageSettings={{
                                            src: "/icons/logo.png",
                                            height: 24,
                                            width: 24,
                                            excavate: true,
                                        }}
                                    />
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Certificate Serial Number</p>
                                    <p className="text-[11px] font-bold text-slate-600 font-mono">
                                        SLM-CERT-{certId?.split('')?.map((c, i) => i > 0 && i % 4 === 0 ? `-${c}` : c)?.join('')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}