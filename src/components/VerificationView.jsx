import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const VerificationView = ({ language, certificateId }) => {
    const [status, setStatus] = useState('loading'); // loading, verified, invalid, error
    const [certData, setCertData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const verifyCertificate = async () => {
            console.log('Verifying Certificate ID:', certificateId);

            if (!certificateId || certificateId === 'verify' || certificateId === '#' || certificateId === '') {
                console.warn('Invalid or missing Certificate ID');
                setStatus('invalid');
                return;
            }

            try {
                setStatus('loading');
                setError(null);
                
                // Fetch profile data - look up by either id (UUID) or slm_id (Short ID)
                let query = supabase.from('profiles').select('full_name, training_level, created_at, slm_id, points, reading_points, quiz_points');
                
                // Improved matching logic
                if (certificateId.includes('-') && certificateId.length > 30) {
                    query = query.eq('id', certificateId);
                } else {
                    query = query.eq('slm_id', certificateId);
                }

                const { data, error: supabaseError } = await query.single();

                if (supabaseError) {
                    console.error('Supabase verification error:', supabaseError);
                    setError(supabaseError.message);
                    setStatus('invalid');
                } else if (data) {
                    console.log('Certificate verified successfully:', data);
                    setCertData(data);
                    setStatus('verified');
                } else {
                    console.warn('No data found for this Certificate ID');
                    setStatus('invalid');
                }
            } catch (err) {
                console.error('System error during verification:', err);
                setStatus('error');
                setError(err.message);
            }
        };

        verifyCertificate();
    }, [certificateId]);

    const t = {
        en: {
            title: "Certificate Verification",
            loading: "Verifying certificate authenticity...",
            verified: "Authenticity Verified",
            invalid: "Invalid Certificate",
            error: "Verification Error",
            name: "Name",
            level: "Training Level",
            issued: "Issued On",
            joined: "Joined On",
            points: "Total Credits",
            reading: "Reading",
            quiz: "Quiz",
            status: "Status",
            official: "This is an official SmartLineman.in certificate. The data shown below is from our live secure database.",
            liveData: "This learner has continued to progress. Above is their current live achievement status.",
            warning: "The certificate ID provided does not match our records.",
            tryAgain: "Please check the ID and try again.",
            back: "Back to Home"
        },
        bn: {
            title: "সার্টিফিকেট যাচাইকরণ",
            loading: "সার্টিফিকেটের সত্যতা যাচাই করা হচ্ছে...",
            verified: "সত্যতা যাচাই করা হয়েছে",
            invalid: "অবৈধ সার্টিফিকেট",
            error: "যাচাইকরণ ত্রুটি",
            name: "নাম",
            level: "প্রশিক্ষণ স্তর",
            issued: "ইস্যু করা হয়েছে",
            joined: "যোগ দিয়েছেন",
            points: "মোট ক্রেডিট",
            reading: "পড়া",
            quiz: "কুইজ",
            status: "অবস্থা",
            official: "এটি একটি অফিসিয়াল স্মার্ট লাইনম্যান সার্টিফিকেট। নিচে প্রদর্শিত তথ্য আমাদের লাইভ ডাটাবেস থেকে নেওয়া হয়েছে।",
            liveData: "এই শিক্ষার্থীর অগ্রগতি অব্যাহত রয়েছে। উপরে তার বর্তমান অর্জিত অবস্থা দেখানো হয়েছে।",
            warning: "প্রদত্ত সার্টিফিকেট আইডি আমাদের রেকর্ডের সাথে মিলছে না।",
            tryAgain: "অনুগ্রহ করে আইডি চেক করুন এবং আবার চেষ্টা করুন।",
            back: "হোমে ফিরে যান"
        }
    };

    const content = t[language] || t.en;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-900">
            {/* Brand Logo for Official Feel */}
            <div className="mb-6 sm:mb-8 flex flex-col items-center animate-fade-in">
                <img src="/icons/logo.png" alt="SmartLineman Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md" />
                <div className="mt-2 text-center">
                    <span className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">SmartLineMan</span>
                    <span className="text-[9px] sm:text-[10px] font-black bg-orange-500 text-white px-1 ml-0.5 rounded">.in</span>
                </div>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-scale-in">
                {/* Header */}
                <div className={`p-6 sm:p-8 text-center ${status === 'verified' ? 'bg-emerald-600' :
                    status === 'invalid' ? 'bg-red-600' :
                        status === 'error' ? 'bg-amber-600' : 'bg-orange-600'
                    }`}>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        {status === 'loading' && <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {status === 'verified' && <span className="text-3xl sm:text-4xl text-white">✅</span>}
                        {status === 'invalid' && <span className="text-3xl sm:text-4xl text-white">❌</span>}
                        {status === 'error' && <span className="text-3xl sm:text-4xl text-white">⚠️</span>}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{content.title}</h1>
                    <p className="text-white/80 text-xs sm:text-sm">{status === 'loading' ? content.loading : status === 'verified' ? content.verified : content.invalid}</p>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8">
                    {status === 'verified' && certData && (
                        <div className="space-y-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{content.name}</label>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">{certData.full_name || 'Valued Learner'}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{content.level}</label>
                                <p className="text-lg font-black text-orange-600 dark:text-orange-400">Level {certData.training_level || 0}</p>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{content.joined}</label>
                                <p className="text-slate-600 dark:text-slate-400 font-medium">{new Date(certData.created_at).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>

                            {/* Compact Score View */}
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 py-4 border-y border-slate-100 dark:border-slate-800">
                                <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase mb-1">{content.points}</p>
                                    <p className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">{(certData.points || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-center p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10">
                                    <p className="text-[8px] sm:text-[9px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase mb-1">{content.reading}</p>
                                    <p className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400">{(certData.reading_points || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-center p-2 rounded-xl bg-blue-50/50 dark:bg-blue-900/10">
                                    <p className="text-[8px] sm:text-[9px] font-bold text-blue-600/60 dark:text-blue-400/60 uppercase mb-1">{content.quiz}</p>
                                    <p className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-400">{(certData.quiz_points || 0).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3 p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                                        <span className="text-xl sm:text-2xl">🛡️</span>
                                        <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 font-medium leading-tight">
                                            {content.official}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                            {content.liveData}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'invalid' && (
                        <div className="text-center space-y-4">
                            <p className="text-slate-600 dark:text-slate-400 font-medium">
                                {content.warning}
                            </p>
                            <p className="text-xs text-slate-400 italic">
                                {language === 'en' 
                                    ? "Note: Verification requires public database access. If this certificate is new, it may take a few moments to sync." 
                                    : "দ্রষ্টব্য: যাচাইকরণের জন্য পাবলিক ডাটাবেস অ্যাক্সেস প্রয়োজন। সার্টিফিকেটটি নতুন হলে সিঙ্ক হতে কিছুটা সময় লাগতে পারে।"}
                            </p>
                            
                            {/* Debug Section */}
                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 text-left">
                                <details className="group">
                                    <summary className="text-xs font-bold text-slate-400 dark:text-slate-500 cursor-pointer hover:text-orange-500 transition-colors uppercase tracking-widest list-none flex items-center gap-2">
                                        <span className="text-lg">⚙️</span> 
                                        {language === 'en' ? 'Technical Details' : 'কারিগরি তথ্য'}
                                    </summary>
                                    <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/80 rounded-2xl font-mono text-[10px] text-slate-500 dark:text-slate-400 break-all space-y-2 border border-slate-100 dark:border-slate-800 shadow-inner">
                                        <p><span className="text-orange-500 font-bold">ID:</span> {certificateId || 'null/empty'}</p>
                                        <p><span className="text-blue-500 font-bold">URL:</span> {window.location.href}</p>
                                        {error && <p><span className="text-red-500 font-bold">Error:</span> {error}</p>}
                                        <p className="text-[9px] text-slate-400 mt-2 border-t border-slate-200 dark:border-slate-800 pt-2 italic">
                                            {language === 'en' 
                                                ? 'Share this ID, URL and Error with the developer.' 
                                                : 'এই আইডি, ইউআরএল এবং ত্রুটিটি ডেভেলপারকে পাঠান।'}
                                        </p>
                                    </div>
                                </details>
                            </div>

                            <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-4">
                                {content.tryAgain}
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center space-y-4">
                            <p className="text-red-600 dark:text-red-400 font-medium">
                                {error || "An unexpected error occurred."}
                            </p>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
                            Official Verification Service
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Footer Credit */}
            <p className="mt-8 text-[11px] text-slate-400 font-medium">
                © {new Date().getFullYear()} SmartLineman Education. All rights reserved.
            </p>
        </div>
    );
};

export default VerificationView;
