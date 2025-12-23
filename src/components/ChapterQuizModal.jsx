import React, { useState, useEffect } from 'react';

const ChapterQuizModal = ({ isOpen, onClose, onComplete, questions = [] }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setShowResult(false);
            setScore(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;

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
        questions.forEach((q, index) => {
            if (userAnswers[index] === q.correctAnswerIndex) {
                calculatedScore++;
            }
        });
        setScore(calculatedScore);
        setShowResult(true);
    };

    const handleFinish = () => {
        onComplete(score);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                        {showResult ? 'Quiz Result' : `Question ${currentQuestionIndex + 1}/${totalQuestions}`}
                    </h3>
                    {!showResult && (
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
                    {showResult ? (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                                🏆
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                                Quiz Completed!
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                You scored <span className="font-bold text-blue-600 dark:text-blue-400 text-xl">{score}</span> out of {totalQuestions}
                            </p>
                            <button
                                onClick={handleFinish}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                            >
                                Continue to Next Lesson
                            </button>
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
                {!showResult && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <button
                            onClick={handleNext}
                            disabled={userAnswers[currentQuestionIndex] === undefined}
                            className={`w-full py-3 rounded-xl font-bold transition-all ${userAnswers[currentQuestionIndex] !== undefined
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {currentQuestionIndex === totalQuestions - 1 ? 'Submit Quiz' : 'Next Question'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChapterQuizModal;
