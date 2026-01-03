import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const VerificationView = ({ language, certificateId }) => {
    const [status, setStatus] = useState('loading'); // loading, verified, invalid, error
    const [certData, setCertData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const verifyCertificate = async () => {
            console.log('Verifying Certificate ID:', certificateId);

            if (!certificateId || certificateId === 'verify' || certificateId === '#') {
                console.warn('Invalid or missing Certificate ID');
                setStatus('invalid');
                return;
            }

            // Basic UUID format check (8-4-4-4-12 hex chars)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(certificateId)) {
                console.warn('Certificate ID is not a valid UUID format');
                setStatus('invalid');
                return;
            }

            try {
                setStatus('loading');
                // Fetch profile data for the given ID
                const { data, error: supabaseError } = await supabase
                    .from('profiles')
                    .select('full_name, training_level, created_at')
                    .eq('id', certificateId)
                    .single();

                if (supabaseError) {
                    console.error('Supabase verification error:', supabaseError);
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
            status: "Status",
            official: "This is an official SmartLineman certificate.",
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
            status: "অবস্থা",
            official: "এটি একটি অফিসিয়াল স্মার্ট লাইনম্যান সার্টিফিকেট।",
            warning: "প্রদত্ত সার্টিফিকেট আইডি আমাদের রেকর্ডের সাথে মিলছে না।",
            tryAgain: "অনুগ্রহ করে আইডি চেক করুন এবং আবার চেষ্টা করুন।",
            back: "হোমে ফিরে যান"
        }
    };

    const content = t[language] || t.en;

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-fade-in">
                {/* Header */}
                <div className={`p-8 text-center ${status === 'verified' ? 'bg-emerald-600' :
                    status === 'invalid' ? 'bg-red-600' :
                        status === 'error' ? 'bg-amber-600' : 'bg-orange-600'
                    }`}>
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        {status === 'loading' && <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {status === 'verified' && <span className="text-4xl text-white">✅</span>}
                        {status === 'invalid' && <span className="text-4xl text-white">❌</span>}
                        {status === 'error' && <span className="text-4xl text-white">⚠️</span>}
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">{content.title}</h1>
                    <p className="text-white/80 text-sm">{status === 'loading' ? content.loading : status === 'verified' ? content.verified : content.invalid}</p>
                </div>

                {/* Body */}
                <div className="p-8">
                    {status === 'verified' && certData && (
                        <div className="space-y-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{content.name}</label>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">{certData.full_name || 'Valued Learner'}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{content.level}</label>
                                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">Level {certData.training_level || 0}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{content.issued}</label>
                                <p className="text-slate-600 dark:text-slate-300">{new Date(certData.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                                    <span className="text-2xl">🛡️</span>
                                    <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium leading-tight">
                                        {content.official}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'invalid' && (
                        <div className="text-center space-y-4">
                            <p className="text-slate-600 dark:text-slate-400">
                                {content.warning}
                            </p>
                            <p className="text-sm font-medium text-slate-500">
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

                    <div className="mt-8">
                        <button
                            onClick={() => window.location.hash = '#/home'}
                            className="w-full py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all"
                        >
                            {content.back}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationView;
