import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

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

    // Reporting State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportingIndex, setReportingIndex] = useState(null);
    const [reportComment, setReportComment] = useState('');
    const [reportImage, setReportImage] = useState(null);
    const [isSharing, setIsSharing] = useState(false);
    const reportRef = useRef(null);

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
            notAnswered: 'Not answered',
            reportTitle: 'Spotted a mistake?',
            reportSubtitle: 'Say something about this question...',
            reportPlaceholder: 'Describe the issue or error you found...',
            reportAction: 'Send on WhatsApp',
            reportContext: 'Please mention Lesson ID in the group:',
            reportSuccess: 'Opening sharing menu...',
            reportError: 'Failed to capture screenshot. You can still report manually.'
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
            notAnswered: 'উত্তর দেওয়া হয়নি',
            reportTitle: 'প্রশ্নে কোনো ভুল আছে কি?',
            reportSubtitle: 'এই প্রশ্ন সম্পর্কে কিছু বলুন...',
            reportPlaceholder: 'এখানে ভুল বা ত্রুটি লিখুন...',
            reportAction: 'আমাদের জানান',
            reportContext: 'গ্রুপে রিপোর্ট করার সময় লেসন আইডি জানান:',
            reportSuccess: 'শেয়ার মেনু ওপেন হচ্ছে...',
            reportError: 'স্ক্রিনশট নেওয়া সম্ভব হয়নি। আপনি চাইলে ম্যানুয়ালি গ্রুপে জানাতে পারেন।'
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
    const isFullscreenScreen = showResult || isReviewMode;

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

    const handleStartReport = async (idx) => {
        setReportingIndex(idx);
        const prefilledText = language === 'en' 
            ? `Lesson ID: #${lessonId}\nWrite your comment here: ` 
            : `লেসন আইডি: #${lessonId}\nআপনার মন্তব্য লিখুন: `;
        setReportComment(prefilledText);
        setReportImage(null);
        
        try {
            const element = document.getElementById(`question-card-${idx}`);
            if (!element) throw new Error('Element not found');

            // Use html2canvas to capture the card
            // We use a slight delay to ensure UI handles any transitions
            const canvas = await html2canvas(element, {
                useCORS: true,
                scale: 2, // Higher quality
                backgroundColor: '#0f172a', // Match slate-900 for dark mode context
            });
            
            const imageData = canvas.toDataURL('image/png');
            setReportImage(imageData);
            setShowReportModal(true);
            
            // Focus and move cursor to end
            setTimeout(() => {
                if (reportRef.current) {
                    reportRef.current.focus();
                    const length = reportRef.current.value.length;
                    reportRef.current.setSelectionRange(length, length);
                }
            }, 100);
        } catch (error) {
            console.error('Capture failed:', error);
            // Fallback: Show modal even without image
            setReportImage(null);
            setShowReportModal(true);
        }
    };

    const handleSendReport = async () => {
        setIsSharing(true);
        try {
            const message = `${reportComment}\n\n[Context]\nLesson ID: ${lessonId}\nQuestion: ${shuffledQuestions[reportingIndex]?.questionText}`;
            
            // On Mobile/Native using Capacitor
            if (reportImage) {
                try {
                    const fileName = `report_lesson_${lessonId || 'unknown'}_${Date.now()}.png`;
                    
                    // 1. Write file to temp storage
                    // Capacitor Share requires a real file URI
                    await Filesystem.writeFile({
                        path: fileName,
                        data: reportImage.split(',')[1], // Remove Prefix
                        directory: Directory.Cache
                    });

                    const fileUri = await Filesystem.getUri({
                        path: fileName,
                        directory: Directory.Cache
                    });

                    // 2. Trigger Share
                    await Share.share({
                        title: 'Report Issue',
                        text: message,
                        files: [fileUri.uri],
                        dialogTitle: t.reportAction
                    });
                } catch (nativeError) {
                    console.error('Native share failed, falling back to URL:', nativeError);
                    window.open(`https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t`, '_blank');
                }
            } else {
                // Fallback for web or if capture failed
                window.open(`https://chat.whatsapp.com/Ljs2zuKTCX2K0oS16ga8wG?mode=gi_t`, '_blank');
            }
            
            setShowReportModal(false);
        } catch (error) {
            console.error('Reporting failed:', error);
        } finally {
            setIsSharing(false);
        }
    };

    return createPortal(
        <div className={`fixed inset-0 z-[200] animate-fade-in ${isFullscreenScreen ? 'bg-slate-950/95 backdrop-blur-xl' : 'flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'}`}>
            <div className={`overflow-hidden border border-token-border shadow-2xl animate-scale-in ${isFullscreenScreen ? 'w-full h-full rounded-none border-0 bg-transparent flex flex-col' : 'bg-token-bg-surface rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]'}`}>
                {loading ? (
                    <div className={`flex flex-col items-center justify-center space-y-4 ${isFullscreenScreen ? 'flex-1 px-6 py-16 text-white' : 'p-20'}`}>
                        <svg className={`w-12 h-12 animate-pulse ${isFullscreenScreen ? 'text-orange-300' : 'text-orange-500'}`} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className={`font-medium ${isFullscreenScreen ? 'text-white/80' : 'text-token-text-muted'}`}>{t.loadingText}</p>
                    </div>
                ) : totalQuestions === 0 ? (
                    <div className={`text-center ${isFullscreenScreen ? 'flex h-full flex-col items-center justify-center px-6 py-12 text-white' : 'p-8'}`}>
                        <p className={`${isFullscreenScreen ? 'text-white/80' : 'text-token-text-secondary'} mb-6`}>{t.noQuestions}</p>
                        <button
                            onClick={onClose}
                            className={`px-6 py-2 font-bold rounded-xl transition-all ${isFullscreenScreen ? 'bg-white text-slate-950 hover:bg-white/90' : 'bg-token-border text-token-text-secondary hover:bg-token-border-strong'}`}
                        >
                            {t.close}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className={`p-4 flex justify-between items-center gap-3 ${isFullscreenScreen ? 'border-b border-white/10 bg-slate-950/70 text-white backdrop-blur-xl' : 'border-b border-token-border bg-token-bg-page/80'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                                {lessonId && (
                                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg border shrink-0 ${isFullscreenScreen ? 'text-orange-200 bg-white/10 border-white/10' : 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20'}`}>
                                        {lessonId}
                                    </span>
                                )}
                                <h3 className={`font-bold text-lg truncate ${isFullscreenScreen ? 'text-white' : 'text-token-text-primary'}`}>
                                    {isReviewMode ? t.reviewTitle : showResult ? t.result : `${t.question} ${currentQuestionIndex + 1}/${totalQuestions}`}
                                </h3>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => setSoundEnabled(prev => !prev)}
                                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${isFullscreenScreen ? 'text-white/80 hover:bg-white/10' : soundEnabled ? 'text-token-text-secondary hover:bg-black/5 dark:hover:bg-white/10' : 'text-token-text-muted hover:bg-black/5 dark:hover:bg-white/10'}`}
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
                                {isReviewMode ? (
                                    <button
                                        onClick={() => setIsReviewMode(false)}
                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition-colors ${isFullscreenScreen ? 'text-white/85 hover:bg-white/10' : 'text-token-text-secondary hover:bg-black/5 dark:hover:bg-white/10'}`}
                                        aria-label={language === 'en' ? 'Back to result' : 'ফলাফলে ফিরে যান'}
                                        title={language === 'en' ? 'Back to result' : 'ফলাফলে ফিরে যান'}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        <span className="hidden sm:inline">{t.backToResult}</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={onClose}
                                        className={`transition-colors ${isFullscreenScreen ? 'text-white/80 hover:text-white' : 'text-token-text-muted hover:text-token-text-secondary'}`}
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className={`overflow-y-auto flex-1 ${isFullscreenScreen ? 'px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-white' : `p-6 ${showResult || isReviewMode ? 'pb-24' : ''}`}`}>
                            {isReviewMode ? (
                                /* Review Mode View */
                                <div className="relative min-h-full">
                                    <div className="absolute inset-0 bg-white/5" />
                                    <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col justify-between gap-8">
                                        <div className="flex flex-1 items-center justify-center">
                                            <div className="w-full max-w-3xl space-y-5">
                                                {shuffledQuestions.map((q, idx) => {
                                        const userAnswer = userAnswers[idx];
                                        const isAnswered = userAnswer !== undefined;
                                        const isCorrect = isAnswered && userAnswer === q.correctAnswerIndex;
                                        return (
                                            <div key={idx} id={`question-card-${idx}`} className={`p-4 rounded-2xl border backdrop-blur-xl ${isCorrect ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-rose-400/20 bg-rose-400/10'}`}>
                                                <div className="flex gap-3 mb-3">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCorrect ? 'bg-emerald-400 text-slate-950' : 'bg-rose-400 text-slate-950'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="text-sm sm:text-base lg:text-lg font-medium leading-relaxed text-white break-words">
                                                                {q.questionText}
                                                            </p>
                                                            <button
                                                                onClick={() => handleStartReport(idx)}
                                                                className="shrink-0 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-orange-300 transition-all active:scale-90"
                                                                title={t.reportTitle}
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        <div className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isCorrect ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>
                                                            {isCorrect ? t.right : t.wrong}
                                                        </div>
                                                    </div>
                                                </div>
                                                {q.image && (
                                                    <div className="mb-4 ml-9 rounded-xl overflow-hidden border border-white/10 max-w-[200px]">
                                                        <img src={q.image} alt="Question" className="w-full h-auto" />
                                                    </div>
                                                )}
                                                {!isAnswered && (
                                                    <div className="ml-9 mb-3 text-xs font-semibold text-rose-200">
                                                        {t.notAnswered}
                                                    </div>
                                                )}
                                                <div className="space-y-2 pl-9">
                                                    {q.options.map((opt, optIdx) => {
                                                        const isSelected = userAnswer === optIdx;
                                                        const optionClass = isSelected
                                                            ? isCorrect
                                                                ? 'text-emerald-200 font-semibold'
                                                                : 'text-rose-200 font-semibold'
                                                            : 'text-white/70';

                                                        const isOptionImage = typeof opt === 'string' && (opt.startsWith('/') || opt.includes('.jpg') || opt.includes('.png') || opt.includes('.webp'));

                                                        return (
                                                            <div key={optIdx} className="flex items-start gap-2 text-sm">
                                                                <span className="mt-1 text-white/70">
                                                                    {isSelected ? (isCorrect ? '✓' : '✗') : '○'}
                                                                </span>
                                                                {isOptionImage ? (
                                                                    <img src={opt} alt="Option" className={`w-16 h-16 object-cover rounded-lg border ${isSelected ? (isCorrect ? 'border-emerald-400' : 'border-rose-400') : 'border-white/10'}`} />
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
                                            </div>
                                        </div>

                                        <div className="sticky bottom-0 border-t border-white/10 bg-slate-950/70 backdrop-blur-xl px-0 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
                                            <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 sm:px-0">
                                                <button
                                                    onClick={() => setIsReviewMode(false)}
                                                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 font-bold text-white transition-colors hover:bg-white/15"
                                                >
                                                    {t.backToResult}
                                                </button>
                                                <button
                                                    onClick={onClose}
                                                    className="w-full rounded-2xl bg-white px-4 py-3.5 font-bold text-slate-950 transition-colors hover:bg-white/90"
                                                >
                                                    {t.close}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : showResult ? (
                                <div className="relative min-h-full">
                                    <div className={`absolute inset-0 ${isPassed ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`} />
                                    <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col justify-between gap-8">
                                        <div className="flex flex-1 items-center justify-center">
                                            <div className="w-full max-w-2xl space-y-8 text-center">
                                                <div className="space-y-4">
                                                    <div className={`mx-auto inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.3em] ${isPassed ? 'bg-emerald-400/15 text-emerald-200' : 'bg-orange-400/15 text-orange-200'}`}>
                                                        {isPassed ? (language === 'en' ? 'Passed' : 'উত্তীর্ণ') : (language === 'en' ? 'Retry' : 'আবার চেষ্টা')}
                                                    </div>
                                                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                                                        {isPassed ? t.completed : t.failed}
                                                    </h2>
                                                    <p className="text-sm sm:text-base text-white/70 font-medium leading-relaxed max-w-xl mx-auto">
                                                        {t.score} <span className="text-white font-bold">{score}</span> / {totalQuestions}
                                                    </p>
                                                </div>

                                                <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-[2rem] border border-white/10 bg-white/5 px-6 py-6 backdrop-blur-xl shadow-2xl">
                                                    <div className="text-6xl sm:text-7xl font-black tracking-tight text-white">
                                                        {Math.round((score / totalQuestions) * 100)}%
                                                    </div>
                                                    <div className="w-full">
                                                        <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ${isPassed ? 'bg-emerald-400' : 'bg-orange-400'}`}
                                                                style={{ width: `${Math.max(0, Math.min(100, (score / totalQuestions) * 100))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    {!isPassed && (
                                                        <p className="text-xs font-semibold text-white/65">
                                                            {t.required}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="sticky bottom-0 border-t border-white/10 bg-slate-950/70 backdrop-blur-xl px-0 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
                                            <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 sm:px-0">
                                                <button
                                                    onClick={() => setIsReviewMode(true)}
                                                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 font-bold text-white transition-colors hover:bg-white/15"
                                                >
                                                    {t.review}
                                                </button>
                                                {isPractice ? (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            onClick={handleTryAgain}
                                                            className="rounded-2xl bg-blue-600 px-4 py-3.5 font-bold text-white transition-colors hover:bg-blue-500"
                                                        >
                                                            {t.tryAgain}
                                                        </button>
                                                        <button
                                                            onClick={onClose}
                                                            className="rounded-2xl bg-white px-4 py-3.5 font-bold text-slate-950 transition-colors hover:bg-white/90"
                                                        >
                                                            {t.close}
                                                        </button>
                                                    </div>
                                                ) : isPassed ? (
                                                    <button
                                                        onClick={handleFinish}
                                                        className="w-full rounded-2xl bg-emerald-500 px-4 py-4 font-black text-white transition-all hover:bg-emerald-400 active:scale-[0.99] flex items-center justify-center gap-2"
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
                                                            className="w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-white transition-all hover:bg-orange-400 active:scale-[0.99]"
                                                        >
                                                            {t.tryAgain}
                                                        </button>
                                                        <button
                                                            onClick={onReadAgain || onClose}
                                                            className="w-full rounded-2xl px-4 py-3 font-semibold text-white/70 transition-colors hover:text-white"
                                                        >
                                                            {t.readAgain}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="text-sm sm:text-base lg:text-lg font-medium text-token-text-primary leading-relaxed break-words">
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

            {/* Report Feedback Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-scale-in flex flex-col">
                        <div className="p-6 pb-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white tracking-tight">{t.reportTitle}</h3>
                                <button 
                                    onClick={() => setShowReportModal(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="text-sm text-white/70 mb-4">{t.reportSubtitle}</p>
                            
                            {/* Screenshot Preview */}
                            {reportImage ? (
                                <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-slate-950 mb-6 mx-auto max-w-[280px]">
                                    <img src={reportImage} alt="Capture" className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <div className="aspect-video rounded-2xl border border-dashed border-white/10 bg-white/5 mb-6 flex flex-col items-center justify-center text-white/30 gap-2">
                                    <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{t.reportError}</span>
                                </div>
                            )}

                            {/* Comment Input */}
                            <div className="space-y-3">
                                <div className="relative group">
                                    <textarea
                                        ref={reportRef}
                                        value={reportComment}
                                        onChange={(e) => setReportComment(e.target.value)}
                                        placeholder={t.reportPlaceholder}
                                        className="w-full min-h-[140px] px-5 py-4 rounded-3xl bg-white/5 border-2 border-transparent focus:border-orange-500/30 focus:bg-white/10 text-white placeholder-white/30 text-sm transition-all outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 pt-4 border-t border-white/10 mt-2">
                            <button
                                onClick={handleSendReport}
                                disabled={isSharing}
                                className={`w-full py-4 rounded-[1.5rem] font-black text-white transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl ${isSharing ? 'bg-slate-700' : 'bg-[#25D366] hover:bg-[#22c35e] shadow-green-500/20'}`}
                            >
                                {isSharing ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                )}
                                <span>{isSharing ? t.reportSuccess : t.reportAction}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default ChapterQuizModal;
