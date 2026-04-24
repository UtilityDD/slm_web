import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Share } from '@capacitor/share';

const ChapterQuizModal = ({ isOpen, onClose, onComplete, onReadAgain, questions = [], language = 'en', isPractice = false, lessonId = '' }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [searchCount, setSearchCount] = useState(0);
    const MAX_SEARCH_QUOTA = 5;

    // Reporting State
    const [showReportModal, setShowReportModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [reportingIndex, setReportingIndex] = useState(null);
    const [reportComment, setReportComment] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const reportRef = useRef(null);

    const playUiSfx = useCallback((type) => {
        const sounds = {
            select: '/audio/safety/alert_check.wav',
            next: '/audio/safety/alert_done.wav',
            submit: '/audio/safety/check_items.wav',
            pass: '/audio/safety/oath_1.wav',
            fail: '/audio/safety/isolation_ready.wav',
            retry: '/audio/safety/start.wav',
            continue: '/audio/safety/home_safe.wav'
        };
        
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
    }, []);

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
            reportError: 'Failed to capture screenshot. You can still report manually.',
            searchLimitTitle: 'Search Quota',
            searchConfirm: 'Do you want to search Google? You have 5 searches per quiz (Used: %s/5).',
            searchExhausted: 'Quota exhausted! You have used all 5 searches.',
            searchProceed: 'Proceed'
        },
        bn: {
            title: 'à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦•à§à¦‡à¦œ',
            question: 'à¦ªà§à¦°à¦¶à§à¦¨',
            result: 'à¦•à§à¦‡à¦œ à¦«à¦²à¦¾à¦«à¦²',
            completed: 'à¦•à§à¦‡à¦œ à¦¸à¦®à§à¦ªà¦¨à§à¦¨!',
            failed: 'à¦ªà¦¾à¦¸ à¦®à¦¾à¦°à§à¦• à¦…à¦°à§à¦œà¦¿à¦¤ à¦¹à¦¯à¦¼à¦¨à¦¿',
            score: 'à¦†à¦ªà¦¨à¦¾à¦° à¦¸à§à¦•à§‹à¦°',
            outOf: 'à¦à¦° à¦®à¦§à§à¦¯à§‡',
            required: 'à¦ªà¦¾à¦¸ à¦•à¦°à¦¾à¦° à¦œà¦¨à§à¦¯ à§¯à§¦% à¦¸à¦ à¦¿à¦• à¦‰à¦¤à§à¦¤à¦° à¦ªà§à¦°à¦¯à¦¼à§‹à¦œà¦¨à¥¤',
            continue: 'à¦ªà¦°à¦¬à¦°à§à¦¤à§€ à¦ªà¦¾à¦ à§‡ à¦¯à¦¾à¦¨',
            tryAgain: 'à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨',
            readAgain: 'à¦†à¦¬à¦¾à¦° à¦ªà§œà§à¦¨',
            submit: 'à¦•à§à¦‡à¦œ à¦œà¦®à¦¾ à¦¦à¦¿à¦¨',
            next: 'à¦ªà¦°à¦¬à¦°à§à¦¤à§€ à¦ªà§à¦°à¦¶à§à¦¨',
            loadingText: 'à¦•à§à¦‡à¦œ à¦ªà§à¦°à¦¸à§à¦¤à§à¦¤ à¦•à¦°à¦¾ à¦¹à¦šà§à¦›à§‡...',
            noQuestions: 'à¦•à§‹à¦¨ à¦•à§à¦‡à¦œ à¦ªà§à¦°à¦¶à§à¦¨ à¦ªà¦¾à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤',
            close: 'à¦¬à¦¨à§à¦§ à¦•à¦°à§à¦¨',
            review: 'à¦‰à¦¤à§à¦¤à¦°à¦—à§à¦²à§‹ à¦¦à§‡à¦–à§à¦¨',
            backToResult: 'à¦«à¦²à¦¾à¦«à¦²à§‡ à¦«à¦¿à¦°à§‡ à¦¯à¦¾à¦¨',
            reviewTitle: 'à¦†à¦ªà¦¨à¦¾à¦° à¦‰à¦¤à§à¦¤à¦°à¦—à§à¦²à§‹ à¦¦à§‡à¦–à§à¦¨',
            yourAns: 'à¦†à¦ªà¦¨à¦¾à¦° à¦‰à¦¤à§à¦¤à¦°',
            right: 'à¦¸à¦ à¦¿à¦•',
            wrong: 'à¦­à§à¦²',
            notAnswered: 'à¦‰à¦¤à§à¦¤à¦° à¦¦à§‡à¦“à§Ÿà¦¾ à¦¹à§Ÿà¦¨à¦¿',
            reportTitle: 'à¦ªà§à¦°à¦¶à§à¦¨à§‡ à¦•à§‹à¦¨à§‹ à¦­à§à¦² à¦†à¦›à§‡ à¦•à¦¿?',
            reportSubtitle: 'à¦à¦‡ à¦ªà§à¦°à¦¶à§à¦¨ à¦¸à¦®à§à¦ªà¦°à§à¦•à§‡ à¦•à¦¿à¦›à§ à¦¬à¦²à§à¦¨...',
            reportPlaceholder: 'à¦à¦–à¦¾à¦¨à§‡ à¦­à§à¦² à¦¬à¦¾ à¦¤à§à¦°à§à¦Ÿà¦¿ à¦²à¦¿à¦–à§à¦¨...',
            reportAction: 'à¦†à¦®à¦¾à¦¦à§‡à¦° à¦œà¦¾à¦¨à¦¾à¦¨',
            reportContext: 'à¦—à§à¦°à§à¦ªà§‡ à¦°à¦¿à¦ªà§‹à¦°à§à¦Ÿ à¦•à¦°à¦¾à¦° à¦¸à¦®à§Ÿ à¦²à§‡à¦¸à¦¨ à¦†à¦‡à¦¡à¦¿ à¦œà¦¾à¦¨à¦¾à¦¨:',
            reportSuccess: 'à¦¶à§‡à¦¯à¦¼à¦¾à¦° à¦®à§‡à¦¨à§ à¦“à¦ªà§‡à¦¨ à¦¹à¦šà§à¦›à§‡...',
            reportError: 'à¦¸à§à¦•à§à¦°à¦¿à¦¨à¦¶à¦Ÿ à¦¨à§‡à¦“à§Ÿà¦¾ à¦¸à¦®à§à¦­à¦¬ à¦¹à§Ÿà¦¨à¦¿à¥¤ à¦†à¦ªà¦¨à¦¿ à¦šà¦¾à¦‡à¦²à§‡ à¦®à§à¦¯à¦¾à¦¨à§à§Ÿà¦¾à¦²à¦¿ à¦—à§à¦°à§à¦ªà§‡ à¦œà¦¾à¦¨à¦¾à¦¤à§‡ à¦ªà¦¾à¦°à§‡à¦¨à¥¤',
            searchLimitTitle: 'à¦¸à¦¾à¦°à§à¦š à¦²à¦¿à¦®à¦¿à¦Ÿ',
            searchConfirm: 'à¦†à¦ªà¦¨à¦¿ à¦•à¦¿ à¦à¦Ÿà¦¿ à¦—à§à¦—à¦²à§‡ à¦–à§à¦à¦œà¦¤à§‡ à¦šà¦¾à¦¨? à¦ªà§à¦°à§‹ à¦•à§à¦‡à¦œà§‡ à¦†à¦ªà¦¨à¦¿ à¦®à¦¾à¦¤à§à¦° à§« à¦¬à¦¾à¦° à¦¸à¦¾à¦°à§à¦š à¦•à¦°à¦¤à§‡ à¦ªà¦¾à¦°à¦¬à§‡à¦¨ (à¦¬à§à¦¯à¦¬à¦¹à§ƒà¦¤: %s/à§«)à¥¤',
            searchExhausted: 'à¦¦à§à¦ƒà¦–à¦¿à¦¤! à¦†à¦ªà¦¨à¦¾à¦° à§«à¦Ÿà¦¿ à¦¸à¦¾à¦°à§à¦šà§‡à¦° à¦•à§‹à¦Ÿà¦¾ à¦¶à§‡à¦· à¦¹à§Ÿà§‡ à¦—à§‡à¦›à§‡à¥¤ à¦à¦–à¦¨ à¦¥à§‡à¦•à§‡ à¦¨à¦¿à¦œà§‡à¦° à¦¬à§à¦¦à§à¦§à¦¿à¦¤à§‡ à¦‰à¦¤à§à¦¤à¦° à¦¦à¦¿à¦¨!',
            searchProceed: 'à¦¸à¦¾à¦°à§à¦š à¦•à¦°à§à¦¨'
        }
    }[language] || { en: {} };

    const [shuffledQuestions, setShuffledQuestions] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setShowResult(false);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setScore(0);
            setIsReviewMode(false);
            setSearchCount(0);

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
            }, 500);

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
            setSearchCount(0);
        }, 500);
    };

    const handleStartReport = (idx) => {
        setReportingIndex(idx);
        const prefilledText = language === 'en' 
            ? `Write your comment here: ` 
            : `à¦†à¦ªà¦¨à¦¾à¦° à¦®à¦¨à§à¦¤à¦¬à§à¦¯ à¦²à¦¿à¦–à§à¦¨: `;
        setReportComment(prefilledText);
        setShowReportModal(true);
        
        setTimeout(() => {
            if (reportRef.current) {
                reportRef.current.focus();
                const length = reportRef.current.value.length;
                reportRef.current.setSelectionRange(length, length);
            }
        }, 100);
    };

    const handleSendReport = async () => {
        setIsSharing(true);
        try {
            const q = shuffledQuestions[reportingIndex];
            const optionsText = q ? q.options.map((opt, i) => {
                const isCorrect = i === q.correctAnswerIndex;
                const mark = isCorrect ? 'âœ…' : 'âŒ';
                return `${String.fromCharCode(65 + i)}) ${opt} ${mark}`;
            }).join('\n') : '';
            
            const reportContent = `ðŸš¨ [QUIZ REPORT]\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\nðŸ“– Lesson: #${lessonId}\nâ“ Question: ${q?.questionText || 'General Report'}\n\nðŸ“ Options:\n${optionsText}\nâ”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\nðŸ’¬ Comment: ${reportComment}`;
            
            const waGroupLink = "https://chat.whatsapp.com/Drmeya7EyRlErKGy3VL8DF?mode=gi_t";

            try {
                await Share.share({
                    title: 'Quiz Report',
                    text: reportContent,
                    dialogTitle: t.reportAction
                });
            } catch (shareError) {
                await navigator.clipboard.writeText(reportContent);
                alert(language === 'en' 
                    ? 'Report copied to clipboard! Please paste it in the WhatsApp group.' 
                    : 'à¦°à¦¿à¦ªà§‹à¦°à§à¦Ÿ à¦•à¦ªà¦¿ à¦•à¦°à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡! à¦…à¦¨à§à¦—à§à¦°à¦¹ à¦•à¦°à§‡ à¦¹à§‹à¦¯à¦¼à¦¾à¦Ÿà¦¸à¦…à§à¦¯à¦¾à¦ª à¦—à§à¦°à§à¦ªà§‡ à¦ªà§‡à¦¸à§à¦Ÿ à¦•à¦°à§à¦¨à¥¤');
                window.open(waGroupLink, '_blank');
            }
            
            setShowReportModal(false);
        } catch (error) {
            console.error('Reporting failed:', error);
        } finally {
            setIsSharing(false);
        }
    };

    const handleGoogleSearch = (text) => {
        if (!text) return;
        setSearchText(text);
        setShowSearchModal(true);
    };

    const confirmGoogleSearch = () => {
        if (searchCount < MAX_SEARCH_QUOTA) {
            setSearchCount(prev => prev + 1);
            const query = encodeURIComponent(searchText);
            window.open(`https://www.google.com/search?q=${query}`, '_blank');
            setShowSearchModal(false);
        }
    };

    return createPortal(
        <>
            <div className={`fixed inset-0 z-[200] animate-fade-in ${isFullscreenScreen ? 'bg-slate-950/95 backdrop-blur-xl' : 'flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm'}`}>
            <div className={`overflow-hidden border-t sm:border border-token-border shadow-2xl animate-slide-up-sheet sm:animate-scale-in ${isFullscreenScreen ? 'w-full h-full rounded-none border-0 bg-transparent flex flex-col' : 'bg-token-bg-surface rounded-t-[2.5rem] sm:rounded-2xl w-full max-w-lg flex flex-col max-h-[95vh]'}`}>
                {!isFullscreenScreen && (
                    <div className="flex justify-center pt-3 pb-1 sm:hidden bg-token-bg-surface">
                        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full opacity-50"></div>
                    </div>
                )}
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
                        <div className={`p-4 flex justify-between items-center gap-3 ${isFullscreenScreen ? 'border-b border-white/10 bg-slate-950/70 text-white backdrop-blur-xl' : 'border-b border-token-border bg-token-bg-surface'}`}>
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
                                    onClick={() => handleGoogleSearch(currentQuestion?.questionText)}
                                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-all group ${isFullscreenScreen ? 'text-white/80 hover:bg-white/10' : 'text-token-text-secondary hover:bg-black/5 dark:hover:bg-white/10'} active:scale-90`}
                                    title={language === 'en' ? 'Search on Google' : 'à¦—à§à¦—à¦² à¦¸à¦¾à¦°à§à¦š à¦•à¦°à§à¦¨'}
                                >
                                    <svg className="w-5 h-5 transition-colors group-hover:text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                </button>
                                {isReviewMode ? (
                                    <button
                                        onClick={() => setIsReviewMode(false)}
                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition-colors ${isFullscreenScreen ? 'text-white/85 hover:bg-white/10' : 'text-token-text-secondary hover:bg-black/5 dark:hover:bg-white/10'}`}
                                        aria-label={language === 'en' ? 'Back to result' : 'à¦«à¦²à¦¾à¦«à¦²à§‡ à¦«à¦¿à¦°à§‡ à¦¯à¦¾à¦¨'}
                                        title={language === 'en' ? 'Back to result' : 'à¦«à¦²à¦¾à¦«à¦²à§‡ à¦«à¦¿à¦°à§‡ à¦¯à¦¾à¦¨'}
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

                        <div className={`overflow-y-auto flex-1 ${isFullscreenScreen ? 'px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-white' : `p-6 ${showResult || isReviewMode ? 'pb-24' : ''}`}`}>
                            {isReviewMode ? (
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
                                                                        <div className="flex gap-1.5 shrink-0">
                                                                            <button
                                                                                onClick={() => handleGoogleSearch(q.questionText)}
                                                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-blue-400 transition-all active:scale-90"
                                                                                title={language === 'en' ? 'Search Google' : 'à¦—à§à¦—à¦² à¦¸à¦¾à¦°à§à¦š'}
                                                                            >
                                                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                                                                </svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleStartReport(idx)}
                                                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-orange-300 transition-all active:scale-90"
                                                                                title={t.reportTitle}
                                                                            >
                                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
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
                                                                    {isSelected ? (isCorrect ? 'âœ“' : 'âœ—') : 'â—‹'}
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

                                        <div className="sticky bottom-0 border-t border-white/10 bg-slate-950/70 backdrop-blur-xl px-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
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
                                                        {isPassed ? (language === 'en' ? 'Passed' : 'à¦‰à¦¤à§à¦¤à§€à¦°à§à¦£') : (language === 'en' ? 'Retry' : 'à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾')}
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

                                        <div className="sticky bottom-0 border-t border-white/10 bg-slate-950/70 backdrop-blur-xl px-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
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
                            <div className="sticky bottom-0 z-10 border-t border-token-border bg-token-bg-page/95 backdrop-blur p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
        </div>

        {/* Report Feedback Modal */}
        {showReportModal && (
            <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                <div className="bg-slate-900 border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-slide-up-sheet sm:animate-scale-in flex flex-col">
                    <div className="flex justify-center pt-4 sm:hidden">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full"></div>
                    </div>
                    <div className="p-6 pb-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white tracking-tight">{t.reportTitle}</h3>
                            <button 
                                onClick={() => setShowReportModal(false)}
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
                            >
                                âœ•
                            </button>
                        </div>
                        <p className="text-sm text-white/70 mb-6">{t.reportSubtitle}</p>
                        
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                            <p className="text-xs font-black text-orange-400 uppercase tracking-widest mb-2">QUESTION PREVIEW</p>
                            <p className="text-sm text-white/90 line-clamp-3 leading-relaxed italic">
                                "{shuffledQuestions[reportingIndex]?.questionText}"
                            </p>
                        </div>

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

        {/* Google Search Confirmation Modal */}
        {showSearchModal && (
            <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                <div className="bg-slate-900 border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-slide-up-sheet sm:animate-scale-in flex flex-col p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-8 text-center items-center">
                    <div className="flex justify-center mb-6 sm:hidden">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full"></div>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-xl">
                        <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">{searchCount >= MAX_SEARCH_QUOTA ? t.searchExhausted : t.searchLimitTitle}</h3>
                    <p className="text-white/60 text-sm mb-8">{searchCount >= MAX_SEARCH_QUOTA ? (language === 'en' ? 'Limit reached!' : 'à¦¨à¦¿à¦œà§‡à¦° à¦¬à§à¦¦à§à¦§à¦¿ à¦–à¦¾à¦Ÿà¦¾à¦¨!') : t.searchConfirm.replace('%s', searchCount)}</p>
                    <div className="flex flex-col w-full gap-3">
                        {searchCount < MAX_SEARCH_QUOTA && (
                            <button onClick={confirmGoogleSearch} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black">
                                {t.searchProceed}
                            </button>
                        )}
                        <button onClick={() => setShowSearchModal(false)} className="w-full py-4 rounded-2xl bg-white/10 text-white/70 font-bold">
                            {t.close}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>,
    document.body
);
};

export default ChapterQuizModal;
