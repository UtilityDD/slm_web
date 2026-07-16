import React from 'react';
import { createPortal } from 'react-dom';
import { setGateNavigation, setGateReviewTarget, setGateUnlockPending } from '../utils/readingGateStorage';

export default function ReadingGateModal({
    block,
    language,
    onClose,
    setCurrentView,
}) {
    if (!block) return null;

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
        if (typeof setCurrentView === 'function') {
            setCurrentView('training');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/45 p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fffdf7] p-6 text-left shadow-xl">
                <div
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
                    aria-hidden="true"
                />
                <div className="relative pt-2">
                    <p className={`mb-1 text-xs font-bold text-orange-600 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                        {language === 'en' ? 'Hourly quiz locked' : 'ঘণ্টাভিত্তিক কুইজ লক'}
                    </p>
                    <h2 className={`mb-2 text-xl font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {isReview
                            ? (language === 'en' ? 'Refresh your knowledge' : 'জ্ঞান রিফ্রেশ করুন')
                            : (language === 'en' ? 'Reading first' : 'প্রথমে পড়ুন')}
                    </h2>
                    <p className={`mb-4 text-sm font-semibold leading-relaxed text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {isReview
                            ? (language === 'en'
                                ? 'Complete one lesson review every 2 days to unlock the hourly quiz. No extra points for reviews.'
                                : 'ঘণ্টাভিত্তিক কুইজ খুলতে প্রতি ২ দিনে একটি পাঠ রিভিউ শেষ করুন। রিভিউতে অতিরিক্ত পয়েন্ট নেই।')
                            : (language === 'en'
                                ? 'Finish at least one training lesson every 2 days to unlock the hourly quiz.'
                                : 'ঘণ্টাভিত্তিক কুইজ খুলতে প্রতি ২ দিনে অন্তত একটি প্রশিক্ষণ পাঠ শেষ করুন।')}
                    </p>

                    <div className="mb-5 rounded-2xl border border-orange-100 bg-orange-50 px-3.5 py-3">
                        <p className={`text-sm font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {isReview
                                ? (language === 'en'
                                    ? `Review lesson: ${lessonLabel}`
                                    : `রিভিউ পাঠ: ${lessonLabel}`)
                                : (language === 'en'
                                    ? `Your next lesson: ${lessonLabel}`
                                    : `আপনার পরের পাঠ: ${lessonLabel}`)}
                        </p>
                        {isReview && block.reviewIndex != null && block.reviewTotal != null && (
                            <p className={`mt-1 text-xs font-semibold text-slate-600 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {language === 'en'
                                    ? `${block.reviewIndex} of ${block.reviewTotal} in this review cycle`
                                    : `এই রিভিউ চক্রে ${block.reviewIndex} / ${block.reviewTotal}`}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={handleContinue}
                            className={`min-h-[48px] w-full rounded-full bg-orange-500 py-3 text-sm font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] ${language === 'bn' ? 'font-bengali' : ''}`}
                        >
                            {isReview
                                ? (language === 'en' ? 'Open assigned lesson →' : 'নির্ধারিত পাঠ খুলুন →')
                                : (language === 'en' ? 'Open your next lesson →' : 'পরের পাঠ খুলুন →')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`min-h-[44px] w-full rounded-full border border-slate-200/80 bg-white py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-[0.98] ${language === 'bn' ? 'font-bengali' : ''}`}
                        >
                            {language === 'en' ? 'Not now' : 'এখন নয়'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
