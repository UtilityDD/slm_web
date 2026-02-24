import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ChapterQuizModal = ({ isOpen, onClose, onComplete, onReadAgain, questions = [], language = 'en', isPractice = false }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);

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
            reviewTitle: 'Review Your Answers',
            correct: 'Correct Answer',
            yourAns: 'Your Answer'
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
            reviewTitle: 'আপনার উত্তরগুলো দেখুন',
            correct: 'সঠিক উত্তর',
            yourAns: 'আপনার উত্তর'
        }
    }[language] || { en: {} };

    const [shuffledQuestions, setShuffledQuestions] = useState([]);

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

    if (!isOpen) return null;

    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    const totalQuestions = shuffledQuestions.length;
    const passThreshold = Math.ceil(totalQuestions * 0.9);
    const isPassed = score >= passThreshold;

    const handleOptionSelect = (optionIndex) => {
        setUserAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: optionIndex
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
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
            onComplete(score);
        }
    };

    const handleTryAgain = () => {
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] animate-scale-in">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 space-y-4">
                        <svg className="w-12 h-12 text-orange-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">{t.loadingText}</p>
                    </div>
                ) : totalQuestions === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-slate-600 dark:text-slate-400 mb-6">{t.noQuestions}</p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all hover:bg-slate-300 dark:hover:bg-slate-600"
                        >
                            {t.close}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                                {isReviewMode ? t.reviewTitle : showResult ? t.result : `${t.question} ${currentQuestionIndex + 1}/${totalQuestions}`}
                            </h3>
                            {(!showResult || isReviewMode) && (
                                <button
                                    onClick={onClose}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {isReviewMode ? (
                                /* Review Mode View */
                                <div className="space-y-8">
                                    {shuffledQuestions.map((q, idx) => {
                                        const userAnswer = userAnswers[idx];
                                        const isCorrect = userAnswer === q.correctAnswerIndex;
                                        return (
                                            <div key={idx} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-100 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10' : 'border-red-100 bg-red-50/50 dark:border-red-900 dark:bg-red-900/10'}`}>
                                                <div className="flex gap-3 mb-3">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    <p className="font-medium text-slate-800 dark:text-slate-200">{q.questionText}</p>
                                                </div>
                                                {q.image && (
                                                    <div className="mb-4 ml-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-[200px]">
                                                        <img src={q.image} alt="Question" className="w-full h-auto" />
                                                    </div>
                                                )}
                                                <div className="space-y-2 pl-9">
                                                    {q.options.map((opt, optIdx) => {
                                                        const isSelected = userAnswer === optIdx;
                                                        const isTheCorrectAnswer = q.correctAnswerIndex === optIdx;
                                                        let optionClass = "text-slate-500 dark:text-slate-400";
                                                        if (isTheCorrectAnswer) optionClass = "text-green-600 dark:text-green-400 font-bold";
                                                        else if (isSelected && !isCorrect) optionClass = "text-red-500 dark:text-red-400 line-through";

                                                        const isOptionImage = typeof opt === 'string' && (opt.startsWith('/') || opt.includes('.jpg') || opt.includes('.png') || opt.includes('.webp'));

                                                        return (
                                                            <div key={optIdx} className="flex items-start gap-2 text-sm">
                                                                <span className="mt-1">
                                                                    {isTheCorrectAnswer ? '✅' : isSelected ? '❌' : '⚪'}
                                                                </span>
                                                                {isOptionImage ? (
                                                                    <img src={opt} alt="Option" className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
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
                                    <button
                                        onClick={onClose}
                                        className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl transition-all hover:bg-slate-700"
                                    >
                                        {t.close}
                                    </button>
                                </div>
                            ) : showResult ? (
                                <div className="text-center py-6 animate-fade-in-up">
                                    {/* Premium Radial Progress Indicator */}
                                    <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
                                        {/* Background Track */}
                                        <svg className="absolute w-full h-full -rotate-90">
                                            <circle
                                                cx="96"
                                                cy="96"
                                                r="80"
                                                fill="transparent"
                                                stroke="currentColor"
                                                strokeWidth="12"
                                                className="text-slate-100 dark:text-slate-700/50"
                                            />
                                            <circle
                                                cx="96"
                                                cy="96"
                                                r="80"
                                                fill="transparent"
                                                stroke="currentColor"
                                                strokeWidth="14"
                                                strokeDasharray={2 * Math.PI * 80}
                                                strokeDashoffset={2 * Math.PI * 80 * (1 - score / totalQuestions)}
                                                strokeLinecap="round"
                                                className={`transition-all duration-[1500ms] ease-out-expo ${isPassed ? 'text-emerald-500' : 'text-orange-500'
                                                    }`}
                                                style={{ filter: `drop-shadow(0 0 8px ${isPassed ? 'rgba(16,185,129,0.3)' : 'rgba(249,115,22,0.3)'})` }}
                                            />
                                        </svg>

                                        {/* Central Content */}
                                        <div className="z-10 flex flex-col items-center">
                                            <div className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                                                {Math.round((score / totalQuestions) * 100)}%
                                            </div>
                                            <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isPassed ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                {isPassed ? (language === 'en' ? 'PASSED' : 'উত্তীর্ণ') : (language === 'en' ? 'RETRY' : 'আবার চেষ্টা')}
                                            </div>
                                        </div>

                                        {/* Status Icon Badge */}
                                        <div className={`absolute -bottom-2 -right-2 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-2xl border-4 border-white dark:border-slate-800 animate-entrance-pop ${isPassed ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'
                                            }`} style={{ animationDelay: '500ms' }}>
                                            {isPassed ? '🏆' : '🔥'}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-10 px-4">
                                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                            {isPassed ? t.completed : t.failed}
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 font-bold">
                                            {t.score} <span className="text-slate-900 dark:text-white">{score}</span> / {totalQuestions}
                                        </p>
                                        {!isPassed && (
                                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-orange-100 dark:border-orange-500/20">
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                {t.required}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 px-2">
                                        {isPractice ? (
                                            /* Practice Mode Options */
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setIsReviewMode(true)}
                                                    className="col-span-2 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-black rounded-2xl transition-all uppercase tracking-wider text-xs"
                                                >
                                                    {t.review}
                                                </button>
                                                <button
                                                    onClick={handleTryAgain}
                                                    className="py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 uppercase tracking-widest text-xs"
                                                >
                                                    {t.tryAgain}
                                                </button>
                                                <button
                                                    onClick={onClose}
                                                    className="py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl transition-all shadow-xl uppercase tracking-widest text-xs"
                                                >
                                                    {t.close}
                                                </button>
                                            </div>
                                        ) : isPassed ? (
                                            /* Normal Completion */
                                            <button
                                                onClick={handleFinish}
                                                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-[2rem] transition-all shadow-2xl shadow-emerald-500/30 active:scale-95 flex items-center justify-center gap-3 text-lg"
                                            >
                                                {t.continue}
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </button>
                                        ) : (
                                            /* Normal Failure */
                                            <div className="grid grid-cols-1 gap-3">
                                                <button
                                                    onClick={handleTryAgain}
                                                    className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-[2rem] transition-all shadow-2xl shadow-orange-500/30 active:scale-95 flex items-center justify-center gap-3 text-lg"
                                                >
                                                    {t.tryAgain}
                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6 0 3.31-2.69 6-6 6-3.31 0-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={onReadAgain || onClose}
                                                    className="w-full py-4 text-slate-500 dark:text-slate-400 font-bold hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                                                >
                                                    {t.readAgain}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
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
                                                        : 'border-slate-100 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
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
                            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <button
                                    onClick={handleNext}
                                    disabled={userAnswers[currentQuestionIndex] === undefined}
                                    className={`w-full py-3 rounded-xl font-bold transition-all ${userAnswers[currentQuestionIndex] !== undefined
                                        ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
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
