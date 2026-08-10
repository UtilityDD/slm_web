import React, { useEffect, useMemo, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import CryptoJS from 'crypto-js';
import { supabase } from '../supabaseClient';
import { getBadgeByLevel } from '../utils/badgeUtils';
import { requestManager } from '../utils/requestManager';
import { WEBSITE_URL } from '../config';
import { mergeCoreLessonProgressIds } from '../utils/trainingLessonIds';
import UserProfilePrizeList from './UserProfilePrizeList';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Approximate core lesson count from training chapter defaults (display only). */
const APPROX_CORE_LESSON_TOTAL = 91;

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

const MetricCard = ({ label, value, hint, accent = 'orange', compact = false }) => {
    const accents = {
        slate: 'border-slate-200/90',
        orange: 'border-orange-200/90',
        emerald: 'border-emerald-200/90',
        blue: 'border-sky-200/90',
        rose: 'border-rose-200/90',
    };
    const valueTints = {
        slate: 'text-slate-900',
        orange: 'text-orange-800',
        emerald: 'text-emerald-800',
        blue: 'text-sky-800',
        rose: 'text-rose-800',
    };

    return (
        <div className={`rounded-2xl border bg-white shadow-sm ${accents[accent] || accents.orange} ${compact ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'}`}>
            <p className={`mb-1 font-bold text-slate-500 ${compact ? 'text-[10px]' : 'text-[10px] sm:text-[11px]'}`}>{label}</p>
            <div className={`font-black tracking-tight tabular-nums ${valueTints[accent] || valueTints.orange} ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>{value}</div>
            {hint && <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-500">{hint}</p>}
        </div>
    );
};

function getBackLabel(returnView, language = 'bn') {
    const bn = language === 'bn';
    switch (returnView) {
        case 'leaderboard':
            return bn ? 'র‍্যাঙ্ক' : 'Rank';
        case 'prizes':
            return bn ? 'পুরস্কার' : 'Prizes';
        case 'training':
            return bn ? 'প্রশিক্ষণ' : 'Training';
        case 'home':
        default:
            return bn ? 'হোম' : 'Home';
    }
}

export default function MyProgress({ language = 'bn', user, targetUserId, setCurrentView, returnView = 'home' }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [reportGeneratedAt] = useState(() => new Date());
    const [isDownloading, setIsDownloading] = useState(false);
    const certRef = useRef(null);
    const bn = language === 'bn';

    const handleDownloadPNG = async () => {
        const downloadEl = document.getElementById('landscape-certificate-download');
        if (!downloadEl) return;

        setIsDownloading(true);
        try {
            downloadEl.style.display = 'block';

            const canvas = await html2canvas(downloadEl, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 1400,
                height: 1000
            });

            downloadEl.style.display = 'none';

            const link = document.createElement('a');
            const fileName = `Certificate_${profile?.full_name?.replace(/\s+/g, '_') || 'SmartLineman'}.png`;
            link.download = fileName;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (err) {
            console.error('Download failed:', err);
            alert(bn ? 'ডাউনলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Download failed. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const certId = useMemo(() => {
        if (!profile?.id) return '';
        const raw = `${profile.id}-${profile.created_at}`;
        return CryptoJS.MD5(raw).toString().substring(0, 12).toUpperCase();
    }, [profile]);

    const verificationUrl = useMemo(() => {
        const origin = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.')
            ? `${window.location.origin}/#`
            : WEBSITE_URL;
        return `${origin}/verify/${profile?.id}`;
    }, [profile?.id]);

    const resolvedUserId = targetUserId || user?.id;
    const isCurrentUser = user?.id === resolvedUserId;
    const backLabel = getBackLabel(returnView, language);

    const handleBack = () => {
        if (typeof setCurrentView === 'function') {
            setCurrentView(returnView || 'home');
        }
    };

    const renderBackButton = () => (
        <button
            type="button"
            onClick={handleBack}
            aria-label={backLabel}
            title={backLabel}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 active:scale-95"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="m15 18-6-6 6-6" />
            </svg>
        </button>
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
        const lessonIds = mergeCoreLessonProgressIds(profile?.completed_lessons, attempts);
        const lessonAttempts = attempts.filter(item => item.quiz_id?.startsWith('lesson_bonus_') && Number(item.score || 0) > 0);
        const hourlyAttempts = attempts.filter(item => item.quiz_id?.startsWith('hourly-challenge'));

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

        const paceSource = hasRewardTimestamps
            ? (bn ? 'পাঠের পুরস্কারের সময় ধরে হিসাব করা হয়েছে' : 'Derived from lesson reward timestamps')
            : (bn ? 'আনুমানিক হিসাব' : 'Estimated fallback');

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
            totalPenaltySum,
            paceSource,
            chapterBreakdown: Array.from(chapterMap.entries())
                .map(([chapter, count]) => ({ chapter, count }))
                .sort((a, b) => Number(a.chapter) - Number(b.chapter)),
            lessonIds
        };
    }, [attempts, profile, bn]);

    const badge = getBadgeByLevel(profile?.training_level || 0, profile?.reading_points || 0);
    const phone = safePhone(profile);
    const joinedDate = formatDate(profile?.created_at, language);
    const lastActive = formatDate(profile?.last_login_at, language);
    const trainingLevel = profile?.training_level || 1;
    const progressPct = Math.min(100, Math.round((stats.completedLessons / APPROX_CORE_LESSON_TOTAL) * 100));
    const hasStarted = stats.completedLessons > 0;
    const badgeLabel = badge ? (bn ? badge.bn : badge.en) : (bn ? 'ট্রেইনি' : 'Trainee');

    const labels = {
        title: bn ? 'আমার অগ্রগতি' : 'My Progress',
        joined: bn ? 'কবে যোগ দিয়েছেন' : 'Date of joining',
        contact: bn ? 'ফোন নম্বর' : 'Contact number',
        district: bn ? 'জেলা' : 'District',
        block: bn ? 'ব্লক' : 'Block',
        bloodGroup: bn ? 'রক্তের গ্রুপ' : 'Blood group',
        badge: bn ? 'বর্তমান পড়ার ধাপ' : 'Present reading stage',
        learningPace: bn ? 'শেখার গতি' : 'Learning pace',
        chapterBreakdown: bn ? 'অধ্যায়ভিত্তিক ছক' : 'Chapter breakdown',
        noData: bn ? 'এখনও কোনো তথ্য পাওয়া যায়নি।' : 'No data available yet.'
    };

    const pageShell = 'min-h-screen bg-[#fffdf7] text-slate-900';

    if (loading) {
        return (
            <main className={pageShell}>
                <div className="mx-auto max-w-lg space-y-4 px-4 py-4 sm:max-w-6xl sm:px-6 sm:py-6">
                    {renderBackButton()}
                    <div className="animate-pulse space-y-4">
                        <div className="h-40 rounded-2xl bg-orange-100/80" />
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="h-20 rounded-2xl bg-slate-200/80" />
                            ))}
                        </div>
                        <div className="h-64 rounded-2xl bg-slate-200/70" />
                    </div>
                </div>
            </main>
        );
    }

    if (error || !profile) {
        return (
            <main className={pageShell}>
                <div className="mx-auto max-w-lg space-y-4 px-4 py-6 sm:max-w-3xl sm:px-6">
                    {renderBackButton()}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
                        <h1 className={`text-xl font-black text-slate-900 sm:text-2xl ${bn ? 'font-bengali' : ''}`}>{labels.title}</h1>
                        <p className={`mt-2 text-slate-500 ${bn ? 'font-bengali' : ''}`}>{labels.noData}</p>
                        <button
                            type="button"
                            onClick={handleBack}
                            className={`mt-6 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 ${bn ? 'font-bengali' : ''}`}
                        >
                            {bn ? 'ফিরে যান' : 'Go back'}
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={`relative ${pageShell} px-4 pb-28 pt-0 sm:px-6 sm:pb-10`}>

            <div className="relative z-10 mx-auto max-w-lg space-y-4 pt-4 sm:max-w-6xl sm:space-y-6 sm:pt-6">
                <div className="flex items-center justify-between gap-3">
                    {renderBackButton()}
                    <h1 className={`min-w-0 flex-1 truncate text-center text-base font-black text-slate-900 sm:text-lg ${bn ? 'font-bengali' : ''}`}>
                        {isCurrentUser ? labels.title : (bn ? 'শেখার অগ্রগতি' : 'Learning progress')}
                    </h1>
                    <div className="h-9 w-9 shrink-0" aria-hidden />
                </div>

                {/* Story hub — primary for self; compact summary for others */}
                <section className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-amber-50/70 to-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-orange-200 bg-orange-400 text-lg font-black text-slate-900">
                            {(profile.full_name || '?').trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={`truncate text-lg font-black text-slate-900 sm:text-xl ${bn ? 'font-bengali' : ''}`}>
                                {profile.full_name || (bn ? 'শিক্ষার্থী' : 'Learner')}
                            </p>
                            <p className={`mt-0.5 text-xs font-semibold text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                                <span className={`mr-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black leading-none ${badge.color}`}>
                                    {badgeLabel}
                                </span>
                                Lv {trainingLevel}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600">
                            <span className={bn ? 'font-bengali' : ''}>
                                {bn
                                    ? `${formatNumber(stats.completedLessons)} / ~${APPROX_CORE_LESSON_TOTAL} পাঠ`
                                    : `${formatNumber(stats.completedLessons)} / ~${APPROX_CORE_LESSON_TOTAL} lessons`}
                            </span>
                            <span className="tabular-nums">{progressPct}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/90 border border-orange-100">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>

                    {isCurrentUser && (
                        <button
                            type="button"
                            onClick={() => setCurrentView('training')}
                            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-300/80 bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-3.5 text-sm font-black text-white shadow-md shadow-orange-600/20 transition-all hover:shadow-lg active:scale-[0.99] sm:py-4 ${bn ? 'font-bengali' : ''}`}
                        >
                            {hasStarted
                                ? (bn ? 'প্রশিক্ষণ চালিয়ে যান' : 'Continue Training')
                                : (bn ? 'প্রশিক্ষণ শুরু করুন' : 'Start Training')}
                        </button>
                    )}
                </section>

                {/* Compact metrics */}
                <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                    <MetricCard
                        compact
                        label={bn ? 'পাঠ' : 'Lessons'}
                        value={formatNumber(stats.completedLessons)}
                        accent="orange"
                    />
                    <MetricCard
                        compact
                        label={bn ? 'ঘণ্টার কুইজ' : 'Hourlies'}
                        value={formatNumber(stats.hourlyAttempts)}
                        accent="rose"
                    />
                    <MetricCard
                        compact
                        label={bn ? 'সক্রিয় দিন' : 'Active days'}
                        value={formatNumber(stats.readingDays)}
                        accent="emerald"
                    />
                    <MetricCard
                        compact
                        label={bn ? 'পয়েন্ট' : 'Points'}
                        value={formatNumber(profile.points)}
                        accent="blue"
                    />
                </section>

                {profile?.id && (
                    <UserProfilePrizeList userId={profile.id} language={language} />
                )}

                {/* Certificate — secondary */}
                {profile.id && (
                    <section
                        id="progress-report-content"
                        ref={certRef}
                        className={`relative overflow-hidden rounded-2xl border border-amber-200/80 bg-[#fffbf5] shadow-sm ${isCurrentUser ? 'certificate-frame certificate-frame--cream' : 'pt-8'}`}
                    >
                        {isCurrentUser && (
                            <>
                                <div className="certificate-pattern pointer-events-none" />
                                <div className="certificate-security-watermark overflow-hidden pointer-events-none" aria-hidden="true" />
                            </>
                        )}

                        <div className="relative z-20 flex flex-col items-center px-4 pb-6 pt-6 text-center sm:px-8 sm:pb-8 sm:pt-8">
                            {isCurrentUser && (
                                <>
                                    <h2 className={`mb-1 text-lg font-black uppercase tracking-[0.15em] text-amber-800 sm:text-2xl ${bn ? 'font-bengali' : ''}`}>
                                        {bn ? 'সাফল্যের স্বীকৃতিপত্র' : 'Certificate of Achievement'}
                                    </h2>
                                    <div className="mx-auto mb-5 h-1 w-40 rounded-full bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200" />
                                    <p className={`mb-6 max-w-lg text-sm italic leading-relaxed text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                                        {bn
                                            ? 'এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, স্মার্টলাইনম্যান শিক্ষা কার্যক্রমে নিম্নলিখিত শিক্ষার্থী তাঁর শিক্ষা ও কারিগরি দক্ষতায় সাফল্য অর্জন করেছেন।'
                                            : 'This certifies the academic progress and technical proficiency of the following individual in the SmartLineman education program.'}
                                    </p>
                                </>
                            )}

                            <div className="mb-8 w-full max-w-2xl px-2">
                                <h3 className={`mb-3 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl ${bn ? 'font-bengali' : ''}`}>
                                    {profile.full_name || 'Anonymous'}
                                </h3>
                                <div className="relative w-full border-b-2 border-slate-200">
                                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                                        {bn ? 'শিক্ষার্থীর নাম' : 'Learner Name'}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-8 flex flex-col items-center justify-center gap-10 sm:flex-row sm:gap-20">
                                <div className="flex flex-col items-center">
                                    <div className="gold-seal mb-3">
                                        <span className="text-4xl">🏅</span>
                                    </div>
                                    <p className={`rounded-full px-3 py-1 text-sm font-black uppercase tracking-wide ${badge.color}`}>{badgeLabel}</p>
                                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                                        {bn ? 'পড়ার ধাপ' : 'Reading Stage'}
                                    </p>
                                </div>

                                <div className="flex flex-col items-center">
                                    <div className="mb-2 text-5xl font-black tracking-tighter text-slate-800 tabular-nums sm:text-6xl">
                                        {formatNumber(profile.points)}
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                                        {bn ? 'মোট পয়েন্ট' : 'Total Points'}
                                    </p>
                                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                                        {bn ? 'শিক্ষা পয়েন্ট' : 'Learning points'}
                                    </p>
                                </div>
                            </div>

                            {isCurrentUser && (
                                <>
                                    <div className="mt-2 grid w-full max-w-4xl grid-cols-1 gap-10 px-4 sm:grid-cols-2 sm:gap-32">
                                        <div className="flex flex-col items-center">
                                            <div className="signature-line mb-3 flex h-10 items-center justify-center overflow-visible text-slate-400">
                                                <img
                                                    src="/signature.png"
                                                    alt="Official Signature"
                                                    className="h-14 w-auto object-contain opacity-90 mix-blend-multiply sm:h-16"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                {bn ? 'কর্তৃপক্ষ, স্মার্টলাইনম্যান.ইন' : 'Authority, SmartLineman.in'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="signature-line mb-3 flex h-10 items-center justify-center text-xl font-bold italic text-slate-800">
                                                {(() => {
                                                    const d = reportGeneratedAt;
                                                    const day = String(d.getDate()).padStart(2, '0');
                                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                                    const year = d.getFullYear();
                                                    return `${day}/${month}/${year}`;
                                                })()}
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                {bn ? 'ইস্যুর তারিখ' : 'Date Issued'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-10 flex w-full flex-col items-center justify-between gap-6 border-t border-slate-200 pt-6 opacity-90 sm:flex-row sm:gap-4">
                                        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
                                            <p className="mb-1 text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                                                {bn ? 'সার্টিফিকেট সিরিয়াল নম্বর' : 'Certificate Serial Number'}
                                            </p>
                                            <p className="cert-serial text-[11px] sm:text-xs">
                                                SLM-CERT-{certId.split('').map((c, i) => (i > 0 && i % 4 === 0 ? `-${c}` : c)).join('')}
                                            </p>
                                            <p className="mt-2 max-w-[180px] text-[9px] font-bold leading-tight text-slate-400">
                                                {bn
                                                    ? 'এই নথির সত্যতা যাচাই করতে QR কোড স্ক্যান করুন বা smartlineman.in/verify ভিজিট করুন।'
                                                    : 'Scan QR code or visit smartlineman.in/verify to authenticate this document.'}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-center gap-3 sm:items-end">
                                            <a
                                                href={verificationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={bn ? 'ভেরিফিকেশন পেজ খুলুন' : 'Open Verification Page'}
                                                className="block rounded-lg border border-slate-100 bg-white p-2 shadow-sm ring-4 ring-slate-50 transition-transform active:scale-95"
                                            >
                                                <QRCodeCanvas
                                                    value={verificationUrl || ''}
                                                    size={80}
                                                    level="M"
                                                    includeMargin
                                                    imageSettings={{
                                                        src: '/icons/logo.png',
                                                        height: 16,
                                                        width: 16,
                                                        excavate: true,
                                                    }}
                                                />
                                            </a>
                                            <button
                                                type="button"
                                                onClick={handleDownloadPNG}
                                                disabled={isDownloading}
                                                className={`flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-orange-700 disabled:opacity-50 ${bn ? 'font-bengali normal-case tracking-normal' : ''}`}
                                            >
                                                {isDownloading
                                                    ? (bn ? 'প্রস্তুত হচ্ছে...' : 'Preparing...')
                                                    : (bn ? 'PNG ডাউনলোড' : 'Download PNG')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(verificationUrl);
                                                    alert(bn ? 'লিঙ্ক কপি করা হয়েছে!' : 'Link copied to clipboard!');
                                                }}
                                                className={`text-[10px] font-bold text-orange-600 hover:underline active:opacity-60 ${bn ? 'font-bengali' : 'uppercase tracking-widest'}`}
                                            >
                                                {bn ? 'লিঙ্ক কপি করুন' : 'Copy Link'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="absolute right-6 top-6 w-20 opacity-10 pointer-events-none grayscale contrast-125 sm:w-28">
                            <img src="/icons/logo.png" alt="" className="h-full w-full object-contain" />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 border-t border-amber-100 bg-white/80 px-4 py-4 sm:grid-cols-3 sm:gap-3 sm:px-6 md:grid-cols-6">
                            <MetricCard compact label={bn ? 'পড়ার ধাপ' : 'Level'} value={`Lv ${trainingLevel}`} accent="orange" />
                            <MetricCard compact label={bn ? 'পড়ার পয়েন্ট' : 'Reading'} value={formatNumber(profile.reading_points)} accent="emerald" />
                            <MetricCard compact label={bn ? 'কুইজ পয়েন্ট' : 'Quiz'} value={formatNumber(profile.quiz_points)} accent="blue" />
                            <MetricCard compact label={bn ? 'কাটা পয়েন্ট' : 'Penalties'} value={formatNumber(stats.totalPenaltySum)} accent="rose" />
                            <MetricCard compact label={bn ? 'পড়া পাঠ' : 'Lessons'} value={formatNumber(stats.completedLessons)} accent="slate" />
                            <MetricCard compact label={bn ? 'পড়া অধ্যায়' : 'Chapters'} value={formatNumber(stats.chaptersRead)} accent="orange" />
                        </div>
                    </section>
                )}

                <section className="grid gap-4 sm:gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-4 sm:space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{labels.learningPace}</p>
                                    <h2 className={`mt-1 text-lg font-black text-slate-900 sm:text-xl ${bn ? 'font-bengali' : ''}`}>
                                        {bn ? 'অগ্রগতি কেমন চলছে' : 'How the learner is progressing'}
                                    </h2>
                                </div>
                                <div className={`rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 ${bn ? 'font-bengali' : ''}`}>
                                    {stats.hourlyAttempts} {bn ? 'বার' : 'hourly'}
                                </div>
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3">
                                <MetricCard compact label={bn ? 'সক্রিয় দিনে গড় পাঠ' : 'Lessons / active day'} value={stats.lessonsPerActiveDay ? stats.lessonsPerActiveDay.toFixed(1) : '—'} hint={stats.paceSource} accent="emerald" />
                                <MetricCard compact label={bn ? 'পাঠে গড় দিন' : 'Days / lesson'} value={stats.daysPerLesson ? stats.daysPerLesson.toFixed(1) : '—'} hint={stats.paceSource} accent="blue" />
                                <MetricCard compact label={bn ? 'অধ্যায়ে গড় দিন' : 'Days / chapter'} value={stats.daysPerChapter ? stats.daysPerChapter.toFixed(1) : '—'} hint={stats.paceSource} accent="orange" />
                                <MetricCard compact label={bn ? 'ঘণ্টার কুইজ' : 'Hourly challenges'} value={formatNumber(stats.hourlyAttempts)} accent="rose" />
                            </div>

                            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                                <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
                                    <p className="mb-1 text-[10px] font-bold text-slate-500">{bn ? 'পাঠে অংশ' : 'Lesson attempts'}</p>
                                    <p className="text-xl font-black tabular-nums text-slate-900">{formatNumber(stats.lessonAttempts)}</p>
                                </div>
                                <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
                                    <p className="mb-1 text-[10px] font-bold text-slate-500">{bn ? 'সক্রিয় দিন' : 'Active days'}</p>
                                    <p className="text-xl font-black tabular-nums text-slate-900">{formatNumber(stats.readingDays)}</p>
                                </div>
                                <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
                                    <p className="mb-1 text-[10px] font-bold text-slate-500">{bn ? 'গড় স্কোর' : 'Avg. score'}</p>
                                    <p className="text-xl font-black tabular-nums text-slate-900">{stats.avgScorePerAttempt.toFixed(1)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{labels.chapterBreakdown}</p>
                                    <h2 className={`mt-1 text-lg font-black text-slate-900 sm:text-xl ${bn ? 'font-bengali' : ''}`}>
                                        {bn ? 'অধ্যায়ভিত্তিক অগ্রগতি' : 'Learning distribution'}
                                    </h2>
                                </div>
                                <div className="text-xs font-bold text-slate-500">
                                    {stats.chapterBreakdown.length} {bn ? 'টি অধ্যায়' : 'chapters'}
                                </div>
                            </div>

                            {stats.chapterBreakdown.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.chapterBreakdown.map((item) => {
                                        const maxCount = Math.max(...stats.chapterBreakdown.map((row) => row.count), 1);
                                        const width = Math.max(8, (item.count / maxCount) * 100);
                                        return (
                                            <div key={item.chapter} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                                    <span>{bn ? 'অধ্যায়' : 'Chapter'} {item.chapter}</span>
                                                    <span>{formatNumber(item.count)} {bn ? 'টি পাঠ' : 'lessons'}</span>
                                                </div>
                                                <div className="h-2.5 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500" style={{ width: `${width}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className={`text-sm text-slate-500 ${bn ? 'font-bengali' : ''}`}>{labels.noData}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{bn ? 'প্রোফাইলের তথ্য' : 'Profile details'}</p>
                            <h2 className={`mt-1 mb-4 text-lg font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                                {bn ? 'পরিচয় ও যোগাযোগ' : 'Identity & contact'}
                            </h2>
                            <div className="space-y-3 text-sm">
                                {[
                                    [labels.district, profile.district || '—'],
                                    [labels.block, profile.block || '—'],
                                    [labels.bloodGroup, profile.blood_group || '—'],
                                    [labels.joined, joinedDate],
                                    [bn ? 'সর্বশেষ সক্রিয়' : 'Last active', lastActive],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                        <span className={`font-medium text-slate-500 ${bn ? 'font-bengali' : ''}`}>{label}</span>
                                        <span className="text-right font-bold text-slate-900">{value}</span>
                                    </div>
                                ))}
                                <div className="flex items-start justify-between gap-4">
                                    <span className={`font-medium text-slate-500 ${bn ? 'font-bengali' : ''}`}>{labels.contact}</span>
                                    <a href={phone ? `tel:${phone}` : undefined} className="text-right font-bold text-orange-600">{phone || '—'}</a>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{bn ? 'দেখে নিন' : 'Highlights'}</p>
                            <h2 className={`mt-1 mb-4 text-lg font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                                {bn ? 'স্কোরের ভাগ' : 'Score composition'}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                                        <span>{bn ? 'পড়ার অংশ' : 'Reading'}</span>
                                        <span>{formatNumber(profile.reading_points)} / {formatNumber(profile.points)}</span>
                                    </div>
                                    <div className="h-2.5 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${profile.points ? Math.min(100, (profile.reading_points / Math.max(profile.points, 1)) * 100) : 0}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                                        <span>{bn ? 'কুইজের অংশ' : 'Quiz'}</span>
                                        <span>{formatNumber(profile.quiz_points)} / {formatNumber(profile.points)}</span>
                                    </div>
                                    <div className="h-2.5 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500" style={{ width: `${profile.points ? Math.min(100, (profile.quiz_points / Math.max(profile.points, 1)) * 100) : 0}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                                        <span>{bn ? 'কাটা পয়েন্ট' : 'Penalty load'}</span>
                                        <span>{formatNumber(stats.totalPenaltySum)}</span>
                                    </div>
                                    <div className="h-2.5 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                        <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-600" style={{ width: `${stats.totalPenaltySum ? Math.min(100, (stats.totalPenaltySum / Math.max(profile.points + stats.totalPenaltySum, 1)) * 100) : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="flex items-center justify-between gap-3 border-t border-slate-200/70 px-1 pb-1 pt-3 text-[11px] font-medium text-slate-500 sm:text-xs">
                    <span>SmartLineman.in</span>
                    <span>{formatDateTime(reportGeneratedAt, language)}</span>
                </footer>

                {/* Hidden landscape certificate for PNG download — structure preserved */}
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
                    <div className="relative flex h-full w-full flex-col items-center border-[20px] border-double border-amber-600/30 bg-[#faf9f6] p-16">
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] grayscale contrast-125">
                            <img src="/icons/logo.png" alt="" className="w-1/2 object-contain" />
                        </div>

                        <div className="mb-10 text-center">
                            <h2 className="mb-4 text-4xl font-black uppercase tracking-[0.2em] text-amber-800">
                                {bn ? 'সাফল্যের স্বীকৃতিপত্র' : 'Certificate of Achievement'}
                            </h2>
                            <div className="mx-auto h-1.5 w-64 rounded-full bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200" />
                        </div>

                        <p className="mb-12 max-w-2xl text-center font-serif text-xl italic leading-relaxed text-slate-500">
                            {bn
                                ? 'এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, স্মার্টলাইনম্যান শিক্ষা কার্যক্রমে নিম্নলিখিত শিক্ষার্থী তাঁর শিক্ষা ও কারিগরি দক্ষতায় সাফল্য অর্জন করেছেন।'
                                : 'This certifies the academic progress and technical proficiency of the following individual in the SmartLineman education program.'}
                        </p>

                        <div className="mb-16 w-full text-center">
                            <h1 className="mb-6 font-serif text-7xl font-black tracking-tight text-slate-900">
                                {profile?.full_name || 'Valued Learner'}
                            </h1>
                            <div className="mx-auto w-3/4 border-b-4 border-slate-200" />
                            <p className="mt-4 text-sm font-bold uppercase tracking-[0.4em] text-slate-400">
                                {bn ? 'শিক্ষার্থীর নাম' : 'Learner Name'}
                            </p>
                        </div>

                        <div className="mt-auto grid w-full grid-cols-3 items-end gap-12">
                            <div className="flex flex-col items-center">
                                <div className="mb-4 flex h-24 w-24 scale-125 items-center justify-center rounded-full border-4 border-amber-200 bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                                    <span className="text-5xl">🏅</span>
                                </div>
                                <p className={`rounded-full px-3 py-1 text-lg font-black uppercase tracking-wide ${badge.color}`}>{badgeLabel}</p>
                                <p className="mt-1 text-xs font-bold uppercase text-slate-400">{bn ? 'পড়ার ধাপ' : 'Reading Stage'}</p>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="mb-4 text-5xl font-black tracking-tighter text-slate-800 tabular-nums">
                                    {profile?.points?.toLocaleString() || '0'}
                                    <span className="ml-2 text-sm font-black uppercase tracking-widest text-slate-400">
                                        {bn ? 'পয়েন্ট' : 'Points'}
                                    </span>
                                </div>
                                <div className="flex w-full items-center justify-center gap-8 border-t-2 border-slate-200 pt-4">
                                    <div className="flex flex-col items-center">
                                        <img
                                            src="/signature.png"
                                            alt="Signature"
                                            className="mb-1 h-14 w-auto object-contain opacity-90 mix-blend-multiply"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            Authority, SmartLineman.in
                                        </p>
                                    </div>
                                    <div className="h-12 w-px bg-slate-200" />
                                    <div className="flex flex-col items-center">
                                        <p className="mb-3 font-serif text-xl italic leading-none tracking-wide text-slate-800">
                                            {(() => {
                                                const d = reportGeneratedAt;
                                                const day = String(d.getDate()).padStart(2, '0');
                                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                                const year = d.getFullYear();
                                                return `${day}/${month}/${year}`;
                                            })()}
                                        </p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            {bn ? 'ইস্যুর তারিখ' : 'Date Issued'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                <div className="mb-6 rounded-xl border border-slate-100 bg-white p-2 shadow-sm ring-8 ring-slate-50">
                                    <QRCodeCanvas
                                        value={verificationUrl || ''}
                                        size={120}
                                        level="H"
                                        includeMargin
                                        imageSettings={{
                                            src: '/icons/logo.png',
                                            height: 24,
                                            width: 24,
                                            excavate: true,
                                        }}
                                    />
                                </div>
                                <div className="text-right">
                                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Certificate Serial Number</p>
                                    <p className="font-mono text-[11px] font-bold text-slate-600">
                                        SLM-CERT-{certId?.split('')?.map((c, i) => (i > 0 && i % 4 === 0 ? `-${c}` : c))?.join('')}
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
