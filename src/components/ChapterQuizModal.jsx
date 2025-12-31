import React, { useState, useEffect } from 'react';

const ChapterQuizModal = ({ isOpen, onClose, onComplete, questions = [], language = 'en', isPractice = false }) => {
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

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 space-y-4">
                        <svg className="w-12 h-12 text-blue-500 animate-pulse" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
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
                                                <div className="space-y-2 pl-9">
                                                    {q.options.map((opt, optIdx) => {
                                                        const isSelected = userAnswer === optIdx;
                                                        const isTheCorrectAnswer = q.correctAnswerIndex === optIdx;
                                                        let optionClass = "text-slate-500 dark:text-slate-400";
                                                        if (isTheCorrectAnswer) optionClass = "text-green-600 dark:text-green-400 font-bold";
                                                        else if (isSelected && !isCorrect) optionClass = "text-red-500 dark:text-red-400 line-through";

                                                        return (
                                                            <div key={optIdx} className="flex items-start gap-2 text-sm">
                                                                <span className="mt-1">
                                                                    {isTheCorrectAnswer ? '✅' : isSelected ? '❌' : '⚪'}
                                                                </span>
                                                                <span className={optionClass}>{opt}</span>
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
                                <div className="text-center py-8">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl ${isPassed ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'}`}>
                                        {isPassed ? '🏆' : '⚠️'}
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                                        {isPassed ? t.completed : t.failed}
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                                        {t.score} <span className={`font-bold text-xl ${isPassed ? 'text-green-600' : 'text-amber-600'}`}>{score}</span> {t.outOf} {totalQuestions}
                                    </p>
                                    {!isPassed && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                            {t.required}
                                        </p>
                                    )}

                                    <div className="space-y-3 mt-6">
                                        {isPractice ? (
                                            /* Practice Mode Options */
                                            <>
                                                <button
                                                    onClick={() => setIsReviewMode(true)}
                                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                                                >
                                                    {t.review}
                                                </button>
                                                <button
                                                    onClick={handleTryAgain}
                                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                                                >
                                                    {t.tryAgain}
                                                </button>
                                                <button
                                                    onClick={onClose}
                                                    className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-600"
                                                >
                                                    {t.close}
                                                </button>
                                            </>
                                        ) : isPassed ? (
                                            /* Normal Completion */
                                            <button
                                                onClick={handleFinish}
                                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/20"
                                            >
                                                {t.continue}
                                            </button>
                                        ) : (
                                            /* Normal Failure */
                                            <>
                                                <button
                                                    onClick={handleTryAgain}
                                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                                                >
                                                    {t.tryAgain}
                                                </button>
                                                <button
                                                    onClick={onClose}
                                                    className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-600"
                                                >
                                                    {t.readAgain}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                                        {currentQuestion?.questionText}
                                    </div>

                                    <div className="space-y-3">
                                        {currentQuestion?.options.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleOptionSelect(idx)}
                                                className={`w-full p-4 rounded-xl text-left transition-all border-2 ${userAnswers[currentQuestionIndex] === idx
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                    : 'border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${userAnswers[currentQuestionIndex] === idx
                                                        ? 'border-blue-500 bg-blue-500 text-white'
                                                        : 'border-slate-300 dark:border-slate-600'
                                                        }`}>
                                                        {userAnswers[currentQuestionIndex] === idx && (
                                                            <div className="w-2 h-2 bg-white rounded-full" />
                                                        )}
                                                    </div>
                                                    <span>{option}</span>
                                                </div>
                                            </button>
                                        ))}
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
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
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
        </div>
    );
};

export default ChapterQuizModal;
