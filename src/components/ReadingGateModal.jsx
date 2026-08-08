import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { setGateNavigation, setGateReviewTarget, setGateUnlockPending } from '../utils/readingGateStorage';

export default function ReadingGateModal({
    block,
    language,
    onClose,
    setCurrentView,
    onContinue,
}) {
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        setShowDetails(false);
    }, [block?.lessonId, block?.mode]);

    if (!block) return null;

    const bn = language === 'bn';
    const isReview = block.mode === 'review';
    const lessonLabel = block.lessonId || '';

    const handleContinue = () => {
        if (block.lessonId && block.userId) {
            setGateNavigation({ userId: block.userId, lessonId: block.lessonId });
            setGateUnlockPending(block.userId, block.lessonId, isReview ? 'review' : 'next');
            if (isReview) {
                setGateReviewTarget(block.userId, block.lessonId);
            }
        }
        onClose();
        // When already on the Training page, switching the view to 'training'
        // is a no-op and won't re-trigger the pending-lesson effect, so the
        // host can pass onContinue to open the lesson directly.
        if (typeof onContinue === 'function') {
            onContinue(block);
            return;
        }
        if (typeof setCurrentView === 'function') {
            setCurrentView('training');
        }
    };

    const headline = isReview
        ? (bn ? 'একটি পাঠ রিভিউ করুন' : 'Review one lesson')
        : (bn ? 'আজকের পাঠ শেষ করুন' : 'Finish today’s reading');

    const outcome = isReview
        ? (bn
            ? 'রিভিউ শেষ হলে ঘণ্টার কুইজ খুলবে।'
            : 'Finish the review to unlock the hourly quiz.')
        : (bn
            ? 'পাঠ শেষ করলে ঘণ্টার কুইজ খুলবে।'
            : 'Finish the lesson to unlock the hourly quiz.');

    const details = isReview
        ? (bn
            ? 'প্রতি ২ দিনে একটি পাঠ রিভিউ করতে হয়। রিভিউতে অতিরিক্ত পয়েন্ট নেই।'
            : 'Complete one lesson review every 2 days. Reviews do not add extra points.')
        : (bn
            ? 'ঘণ্টার কুইজ খুলতে প্রতি ২ দিনে অন্তত একটি প্রশিক্ষণ পাঠ শেষ করুন।'
            : 'Finish at least one training lesson every 2 days to keep the hourly quiz unlocked.');

    return createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/45 p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fffdf7] p-6 text-left shadow-xl">
                <div
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
                    aria-hidden="true"
                />
                <div className="relative pt-2">
                    <p className={`mb-1 text-xs font-bold text-orange-600 ${bn ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                        {bn ? 'ঘণ্টার কুইজ লক' : 'Hourly quiz locked'}
                    </p>
                    <h2 className={`mb-2 text-xl font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                        {headline}
                    </h2>
                    <p className={`mb-4 text-sm font-semibold leading-relaxed text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                        {outcome}
                    </p>

                    <div className="mb-3 rounded-2xl border border-orange-100 bg-orange-50 px-3.5 py-3">
                        <p className={`text-sm font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                            {isReview
                                ? (bn ? `রিভিউ পাঠ: ${lessonLabel}` : `Review lesson: ${lessonLabel}`)
                                : (bn ? `পরের পাঠ: ${lessonLabel}` : `Next lesson: ${lessonLabel}`)}
                        </p>
                        {isReview && block.reviewIndex != null && block.reviewTotal != null && (
                            <p className={`mt-1 text-xs font-semibold text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                                {bn
                                    ? `এই রিভিউ চক্রে ${block.reviewIndex} / ${block.reviewTotal}`
                                    : `${block.reviewIndex} of ${block.reviewTotal} in this review cycle`}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowDetails((v) => !v)}
                        className={`mb-4 text-left text-xs font-bold text-orange-700 underline-offset-2 hover:underline ${bn ? 'font-bengali' : ''}`}
                        aria-expanded={showDetails}
                    >
                        {showDetails
                            ? (bn ? 'বিস্তারিত লুকান' : 'Hide details')
                            : (bn ? 'বিস্তারিত' : 'How it works')}
                    </button>
                    {showDetails && (
                        <p className={`-mt-2 mb-4 text-xs font-medium leading-relaxed text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                            {details}
                        </p>
                    )}

                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={handleContinue}
                            className={`min-h-[48px] w-full rounded-full bg-orange-500 py-3 text-sm font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] ${bn ? 'font-bengali' : ''}`}
                        >
                            {isReview
                                ? (bn ? 'রিভিউ পাঠ খুলুন →' : 'Open review lesson →')
                                : (bn ? 'পাঠ খুলুন →' : 'Open lesson →')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`min-h-[44px] w-full rounded-full border border-slate-200/80 bg-white py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-[0.98] ${bn ? 'font-bengali' : ''}`}
                        >
                            {bn ? 'এখন নয়' : 'Not now'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
