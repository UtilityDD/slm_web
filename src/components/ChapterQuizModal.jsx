import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const ChapterQuizModal = ({ isOpen, onClose, onComplete, onReadAgain, questions = [], language = 'en', isPractice = false, lessonId = '' }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(() => {
        try {
            return localStorage.getItem('chapterQuizSoundEnabled') !== 'false';
        } catch (e) {
            return true;
        }
    });

    const playUiSfx = useCallback((type) => {
        if (!soundEnabled) return;

        try {
            const AudioContextRef = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextRef) return;

            const ctx = new AudioContextRef();
            const now = ctx.currentTime;

            const playTone = (frequency, startOffset, duration, gainValue = 0.045, waveType = 'sine') => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = waveType;
                osc.frequency.setValueAtTime(frequency, now + startOffset);

                gain.gain.setValueAtTime(0, now + startOffset);
                gain.gain.linearRampToValueAtTime(gainValue, now + startOffset + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + startOffset);
                osc.stop(now + startOffset + duration);
            };

            if (type === 'select') {
                playTone(880, 0, 0.07, 0.03, 'triangle');
            } else if (type === 'next') {
                playTone(660, 0, 0.07, 0.035, 'triangle');
                playTone(784, 0.05, 0.08, 0.03, 'triangle');
            } else if (type === 'submit') {
                playTone(740, 0, 0.08, 0.035, 'triangle');
                playTone(880, 0.06, 0.1, 0.03, 'sine');
            } else if (type === 'pass') {
                playTone(523.25, 0, 0.14, 0.05, 'triangle');
                playTone(659.25, 0.1, 0.14, 0.045, 'triangle');
                playTone(783.99, 0.2, 0.24, 0.04, 'sine');
            } else if (type === 'fail') {
                playTone(392, 0, 0.12, 0.04, 'sawtooth');
                playTone(329.63, 0.09, 0.2, 0.03, 'sine');
            } else if (type === 'retry') {
                playTone(523.25, 0, 0.08, 0.03, 'triangle');
            } else if (type === 'continue') {
                playTone(784, 0, 0.08, 0.035, 'triangle');
                playTone(988, 0.06, 0.12, 0.03, 'sine');
            }

            window.setTimeout(() => {
                ctx.close().catch(() => { });
            }, 450);
        } catch (e) {
            // Non-critical enhancement; ignore audio failures silently.
        }
    }, [soundEnabled]);

    const t = {
        en: {
            title: 'Chapter Quiz',
            question: 'Question',
            result: 'Quiz Result',
            completed: 'Quiz Completed!',
            failed: 'Pass Mark Not Reached',
            score: 'You scored',
            outOf: 'out of',
            required: '90% correct answers required to pass.',
            continue: 'Continue to Next Lesson',
            tryAgain: 'Try Again',
            readAgain: 'Read Again',
            submit: 'Submit Quiz',
            next: 'Next Question',
            loadingText: 'Preparing Quiz...',
            noQuestions: 'No quiz questions available.',
            close: 'Close',
            review: 'Review Answers',
            backToResult: 'Back to Result',
            reviewTitle: 'Review Your Answers',
            yourAns: 'Your Answer',
            right: 'Correct',
            wrong: 'Wrong',
            notAnswered: 'Not answered'
        },
        bn: {
            title: 'অধ্যায় কুইজ',
            question: 'প্রশ্ন',
            result: 'কুইজ ফলাফল',
            completed: 'কুইজ সম্পন্ন!',
            failed: 'পাস মার্ক অর্জিত হয়নি',
            score: 'আপনার স্কোর',
            outOf: 'এর মধ্যে',
            required: 'পাস করার জন্য ৯০% সঠিক উত্তর প্রয়োজন।',
            continue: 'পরবর্তী পাঠে যান',
            tryAgain: 'আবার চেষ্টা করুন',
            readAgain: 'আবার পড়ুন',
            submit: 'কুইজ জমা দিন',
            next: 'পরবর্তী প্রশ্ন',
            loadingText: 'কুইজ প্রস্তুত করা হচ্ছে...',
            noQuestions: 'কোন কুইজ প্রশ্ন পাওয়া যায়নি।',
            close: 'বন্ধ করুন',
            review: 'উত্তরগুলো দেখুন',
            backToResult: 'ফলাফলে ফিরে যান',
            reviewTitle: 'আপনার উত্তরগুলো দেখুন',
            yourAns: 'আপনার উত্তর',
            right: 'সঠিক',
            wrong: 'ভুল',
            notAnswered: 'উত্তর দেওয়া হয়নি'
        }
    }[language] || { en: {} };

    const [shuffledQuestions, setShuffledQuestions] = useState([]);

    useEffect(() => {
        try {
            localStorage.setItem('chapterQuizSoundEnabled', String(soundEnabled));
        } catch (e) {
            // Ignore storage failures.
        }
    }, [soundEnabled]);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            // Reset states
            setShowResult(false);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setScore(0);
            setIsReviewMode(false);

            // Using a timeout to ensure the loading animation is visible and to mimic processing time.
            const timer = setTimeout(() => {
                if (questions.length > 0) {
                    const shuffled = questions.map(q => {
                        const optionsWithMetadata = q.options.map((text, index) => ({
                            text,
                            isCorrect: index === q.correctAnswerIndex
                        }));

                        const shuffledOptions = [...optionsWithMetadata].sort(() => 0.5 - Math.random());
                        const newCorrectAnswerIndex = shuffledOptions.findIndex(opt => opt.isCorrect);

                        return {
                            ...q,
                            options: shuffledOptions.map(opt => opt.text),
                            correctAnswerIndex: newCorrectAnswerIndex
                        };
                    });
                    setShuffledQuestions(shuffled);
                } else {
                    setShuffledQuestions([]);
                }
                setLoading(false);
            }, 500); // Artifical delay

            return () => clearTimeout(timer);
        }
    }, [isOpen, questions]);

    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    const totalQuestions = shuffledQuestions.length;
    const passThreshold = Math.ceil(totalQuestions * 0.9);
    const isPassed = score >= passThreshold;

    useEffect(() => {
        if (showResult && totalQuestions > 0) {
            playUiSfx(isPassed ? 'pass' : 'fail');
        }
    }, [showResult, isPassed, totalQuestions, playUiSfx]);

    if (!isOpen) return null;

    const handleOptionSelect = (optionIndex) => {
        playUiSfx('select');
        setUserAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: optionIndex
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            playUiSfx('next');
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            playUiSfx('submit');
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        let calculatedScore = 0;
        shuffledQuestions.forEach((q, index) => {
            if (userAnswers[index] === q.correctAnswerIndex) {
                calculatedScore++;
            }
        });
        setScore(calculatedScore);
        setShowResult(true);
    };

    const handleFinish = () => {
        if (isPassed) {
            playUiSfx('continue');
            onComplete(score);
        }
    };

    const handleTryAgain = () => {
        playUiSfx('retry');
        setLoading(true);
        setTimeout(() => {
            const reshuffled = shuffledQuestions.map(q => {
                const optionsWithMetadata = q.options.map((text, index) => ({
                    text,
                    isCorrect: index === q.correctAnswerIndex
                }));
                const shuffledOptions = [...optionsWithMetadata].sort(() => 0.5 - Math.random());
                const newCorrectAnswerIndex = shuffledOptions.findIndex(opt => opt.isCorrect);
                return {
                    ...q,
                    options: shuffledOptions.map(opt => opt.text),
                    correctAnswerIndex: newCorrectAnswerIndex
                };
            });
            setShuffledQuestions(reshuffled);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setShowResult(false);
            setScore(0);
            setLoading(false);
            setIsReviewMode(false);
        }, 500);
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-token-bg-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-token-border flex flex-col max-h-[90vh] animate-scale-in">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 space-y-4">
                        <svg className="w-12 h-12 text-orange-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="text-token-text-muted font-medium">{t.loadingText}</p>
                    </div>
                ) : totalQuestions === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-token-text-secondary mb-6">{t.noQuestions}</p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-token-border text-token-text-secondary font-bold rounded-xl transition-all hover:bg-token-border-strong"
                        >
                            {t.close}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-token-border flex justify-between items-center gap-3 bg-token-bg-page/80">
                            <div className="flex items-center gap-2 min-w-0">
                                {lessonId && (
                                    <span className="text-xs font-black text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-100 dark:border-orange-500/20 shrink-0">
                                        {lessonId}
                                    </span>
                                )}
                                <h3 className="font-bold text-lg text-token-text-primary truncate">
                                    {isReviewMode ? t.reviewTitle : showResult ? t.result : `${t.question} ${currentQuestionIndex + 1}/${totalQuestions}`}
                                </h3>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => setSoundEnabled(prev => !prev)}
                                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${soundEnabled ? 'text-token-text-secondary hover:bg-black/5 dark:hover:bg-white/10' : 'text-token-text-muted hover:bg-black/5 dark:hover:bg-white/10'}`}
                                    aria-label={soundEnabled ? (language === 'en' ? 'Disable sound' : 'সাউন্ড বন্ধ করুন') : (language === 'en' ? 'Enable sound' : 'সাউন্ড চালু করুন')}
                                    title={soundEnabled ? (language === 'en' ? 'Disable sound' : 'সাউন্ড বন্ধ করুন') : (language === 'en' ? 'Enable sound' : 'সাউন্ড চালু করুন')}
                                >
                                    {soundEnabled ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5L6 9H3v6h3l5 4V5z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9a4 4 0 010 6" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.5 6.5a8 8 0 010 11" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5L6 9H3v6h3l5 4V5z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 5l-14 14" />
                                        </svg>
                                    )}
                                </button>
                                {(!showResult || isReviewMode) && (
                                    <button
                                        onClick={onClose}
                                        className="text-token-text-muted hover:text-token-text-secondary transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className={`p-6 overflow-y-auto flex-1 ${showResult || isReviewMode ? 'pb-24' : ''}`}>
                            {isReviewMode ? (
                                /* Review Mode View */
                                <div className="space-y-8">
                                    {shuffledQuestions.map((q, idx) => {
                                        const userAnswer = userAnswers[idx];
                                        const isAnswered = userAnswer !== undefined;
                                        const isCorrect = isAnswered && userAnswer === q.correctAnswerIndex;
                                        return (
                                            <div key={idx} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-100 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10' : 'border-red-100 bg-red-50/50 dark:border-red-900 dark:bg-red-900/10'}`}>
                                                <div className="flex gap-3 mb-3">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-token-text-primary">{q.questionText}</p>
                                                        <div className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                            {isCorrect ? t.right : t.wrong}
                                                        </div>
                                                    </div>
                                                </div>
                                                {q.image && (
                                                    <div className="mb-4 ml-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-[200px]">
                                                        <img src={q.image} alt="Question" className="w-full h-auto" />
                                                    </div>
                                                )}
                                                {!isAnswered && (
                                                    <div className="ml-9 mb-3 text-xs font-semibold text-red-600 dark:text-red-400">
                                                        {t.notAnswered}
                                                    </div>
                                                )}
                                                <div className="space-y-2 pl-9">
                                                    {q.options.map((opt, optIdx) => {
                                                        const isSelected = userAnswer === optIdx;
                                                        const optionClass = isSelected
                                                            ? isCorrect
                                                                ? 'text-green-700 dark:text-green-300 font-semibold'
                                                                : 'text-red-600 dark:text-red-400 font-semibold'
                                                            : 'text-token-text-muted';

                                                        const isOptionImage = typeof opt === 'string' && (opt.startsWith('/') || opt.includes('.jpg') || opt.includes('.png') || opt.includes('.webp'));

                                                        return (
                                                            <div key={optIdx} className="flex items-start gap-2 text-sm">
                                                                <span className="mt-1">
                                                                    {isSelected ? (isCorrect ? '✓' : '✗') : '○'}
                                                                </span>
                                                                {isOptionImage ? (
                                                                    <img src={opt} alt="Option" className={`w-16 h-16 object-cover rounded-lg border ${isSelected ? (isCorrect ? 'border-green-400' : 'border-red-400') : 'border-slate-200 dark:border-slate-700'}`} />
                                                                ) : (
                                                                    <span className={optionClass}>{opt}</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="sticky bottom-0 -mx-6 mt-6 border-t border-token-border bg-token-bg-surface/95 backdrop-blur px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setIsReviewMode(false)}
                                                className="w-full py-3 bg-token-bg-surface text-token-text-secondary font-bold rounded-xl border border-token-border transition-all hover:bg-token-bg-page"
                                            >
                                                {t.backToResult}
                                            </button>
                                            <button
                                                onClick={onClose}
                                                className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl transition-all hover:bg-slate-700"
                                            >
                                                {t.close}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : showResult ? (
                                <div className="py-4 animate-fade-in-up">
                                    <div className="mx-auto max-w-md rounded-3xl border border-token-border bg-token-bg-page/70 p-6 sm:p-7 shadow-sm">
                                        <div className="text-center space-y-4">
                                            <div className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${isPassed
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                : 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'
                                                }`}>
                                                {isPassed ? (language === 'en' ? 'Passed' : 'উত্তীর্ণ') : (language === 'en' ? 'Retry' : 'আবার চেষ্টা')}
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl font-black text-token-text-primary tracking-tight leading-tight">
                                                {isPassed ? t.completed : t.failed}
                                            </h2>
                                            <div className="space-y-2">
                                                <p className="text-4xl sm:text-5xl font-black text-token-text-primary tracking-tight">
                                                    {Math.round((score / totalQuestions) * 100)}%
                                                </p>
                                                <p className="text-sm text-token-text-muted font-semibold">
                                                    {t.score} <span className="text-token-text-primary">{score}</span> / {totalQuestions}
                                                </p>
                                            </div>
                                            <div className="pt-1">
                                                <div className="h-2.5 w-full rounded-full bg-token-border overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${isPassed ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                                        style={{ width: `${Math.max(0, Math.min(100, (score / totalQuestions) * 100))}%` }}
                                                    />
                                                </div>
                                            </div>
                                            {!isPassed && (
                                                <p className="text-xs text-token-text-muted font-semibold">
                                                    {t.required}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="sticky bottom-0 -mx-6 mt-6 border-t border-token-border bg-token-bg-surface/95 backdrop-blur px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => setIsReviewMode(true)}
                                                className="w-full py-3.5 bg-token-bg-page hover:bg-token-border text-token-text-secondary font-bold rounded-xl transition-colors"
                                            >
                                                {t.review}
                                            </button>
                                            {isPractice ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={handleTryAgain}
                                                        className="py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                                                    >
                                                        {t.tryAgain}
                                                    </button>
                                                    <button
                                                        onClick={onClose}
                                                        className="py-3.5 bg-token-text-primary text-token-bg-surface font-bold rounded-xl transition-colors"
                                                    >
                                                        {t.close}
                                                    </button>
                                                </div>
                                            ) : isPassed ? (
                                                <button
                                                    onClick={handleFinish}
                                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                                                >
                                                    <span>{t.continue}</span>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-2">
                                                    <button
                                                        onClick={handleTryAgain}
                                                        className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl transition-all active:scale-[0.99]"
                                                    >
                                                        {t.tryAgain}
                                                    </button>
                                                    <button
                                                        onClick={onReadAgain || onClose}
                                                        className="w-full py-3 text-token-text-muted font-semibold hover:text-token-action-primary transition-colors"
                                                    >
                                                        {t.readAgain}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="text-lg font-medium text-token-text-primary leading-relaxed">
                                        {currentQuestion?.questionText}
                                    </div>

                                    {currentQuestion?.image && (
                                        <div className="rounded-2xl overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl max-h-[220px] flex justify-center bg-slate-100 dark:bg-slate-900">
                                            <img
                                                src={currentQuestion.image}
                                                alt="Visual aid"
                                                className="max-w-full max-h-full object-contain animate-fade-in"
                                            />
                                        </div>
                                    )}

                                    <div className={`space-y-3 ${currentQuestion?.options.some(opt => typeof opt === 'string' && (opt.startsWith('/') || opt.includes('.'))) ? 'grid grid-cols-2 gap-4 space-y-0' : ''}`}>
                                        {currentQuestion?.options.map((option, idx) => {
                                            const isImage = typeof option === 'string' && (option.startsWith('/') || option.includes('.jpg') || option.includes('.png') || option.includes('.webp'));

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleOptionSelect(idx)}
                                                    className={`relative rounded-2xl transition-all border-2 flex group ${userAnswers[currentQuestionIndex] === idx
                                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                                                        : 'border-token-border hover:border-orange-200 dark:hover:border-orange-800 hover:bg-token-bg-page text-token-text-secondary'
                                                        } ${isImage
                                                            ? 'aspect-square flex-col items-center justify-center p-3'
                                                            : 'w-full py-4 px-5 items-center justify-start text-left'
                                                        }`}
                                                >
                                                    {isImage ? (
                                                        <img src={option} alt={`Option ${idx + 1}`} className="max-w-full max-h-[80%] object-contain rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
                                                    ) : (
                                                        <span className="font-medium text-left w-full leading-snug">{option}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {(!showResult && !isReviewMode) && (
                            <div className="sticky bottom-0 z-10 border-t border-token-border bg-token-bg-page/95 backdrop-blur p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                                <button
                                    onClick={handleNext}
                                    disabled={userAnswers[currentQuestionIndex] === undefined}
                                    className={`w-full py-3 rounded-xl font-bold transition-all ${userAnswers[currentQuestionIndex] !== undefined
                                        ? 'bg-token-action-primary hover:bg-orange-700 text-token-action-primary-fg shadow-lg shadow-orange-600/20'
                                        : 'bg-token-border text-token-text-muted cursor-not-allowed'
                                        }`}
                                >
                                    {currentQuestionIndex === totalQuestions - 1 ? t.submit : t.next}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ChapterQuizModal;
