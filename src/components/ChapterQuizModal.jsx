import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Share } from '@capacitor/share';
import { DotLottiePlayer } from '@dotlottie/react-player';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { buildChapterQuizSpeechScript } from '../utils/chapterQuizReadAloud';
import clockLottie from '../assets/clock.lottie';
import { guestPreviewText } from '../utils/guestPreview';
import { pushNativeBackHandler, hapticImpact, hapticNotification, openExternalUrl } from '../utils/nativeAndroidUx';

/** Fisher–Yates shuffle (unbiased). Returns a new array. */
function shuffleArray(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * @param {Array} sourceQuestions raw quiz from props
 * @param {'fixed' | 'random'} questionOrder fixed = keep chapter order; random = shuffle question order (first open and Try again)
 */
function buildShuffledQuiz(sourceQuestions, questionOrder = 'fixed') {
    if (!sourceQuestions || sourceQuestions.length === 0) return [];

    const withShuffledOptions = sourceQuestions.map((q) => {
        const optionsWithMetadata = q.options.map((text, index) => ({
            text,
            isCorrect: index === q.correctAnswerIndex
        }));
        const shuffledOptions = shuffleArray(optionsWithMetadata);
        const newCorrectAnswerIndex = shuffledOptions.findIndex((opt) => opt.isCorrect);
        return {
            ...q,
            options: shuffledOptions.map((opt) => opt.text),
            correctAnswerIndex: newCorrectAnswerIndex
        };
    });

    return questionOrder === 'random' ? shuffleArray(withShuffledOptions) : withShuffledOptions;
}

/** Review list: avoids mojibake from legacy UTF-8 mis-decoded characters in source. */
function ReviewOptionMarker({ isSelected, isCorrect }) {
    if (!isSelected) {
        return (
            <span className="mt-0.5 inline-flex shrink-0 text-white/35" aria-hidden>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                </svg>
            </span>
        );
    }
    if (isCorrect) {
        return (
            <span className="mt-0.5 inline-flex shrink-0 text-emerald-300" aria-hidden>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M5 13l4 4L19 7" />
                </svg>
            </span>
        );
    }
    return (
        <span className="mt-0.5 inline-flex shrink-0 text-rose-300" aria-hidden>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </span>
    );
}

const LESSON_QUIZ_PASS_RATE = 0.7;

const ChapterQuizModal = ({
    isOpen,
    onClose,
    onComplete,
    onGuestComplete,
    onReadAgain,
    onHourlyQuiz,
    questions = [],
    language = 'en',
    isPractice = false,
    lessonId = '',
    guestPreview = false,
    isLifeSkill = false,
    lifeSkillNeedsListen = false,
    lifeSkillCooldownDays = 0,
    lessonBadge = '',
}) => {
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
    const quizScrollRef = useRef(null);
    const resultPrimaryRef = useRef(null);

    const READ_ALOUD_MUTE_KEY = 'chapterQuizReadAloudMuted';
    const [readAloudMuted, setReadAloudMuted] = useState(() => {
        try {
            return typeof localStorage !== 'undefined' && localStorage.getItem(READ_ALOUD_MUTE_KEY) === '1';
        } catch {
            return false;
        }
    });

    const ttsLang = language === 'bn' ? 'bn' : 'en';
    const { speak, stop, isPlaying, isLoading, isSupported } = useTextToSpeech(ttsLang);

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
            } else if (type === 'passSoft') {
                playTone(880, 0, 0.06, 0.018, 'sine');
                playTone(1046.5, 0.05, 0.08, 0.015, 'sine');
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

    const tBase = {
        en: {
            title: 'Chapter Quiz',
            question: 'Question',
            result: 'Quiz Result',
            completed: 'Quiz Completed!',
            failed: 'Pass Mark Not Reached',
            score: 'You scored',
            outOf: 'out of',
            required: '70% correct answers required to pass.',
            continue: 'Continue to Next Lesson',
            tryAgain: 'Try Again',
            readAgain: 'Read Again',
            resultBadgePass: 'Passed',
            resultBadgeRetry: 'Keep going',
            resultPassHint: 'Nice work—you cleared this quiz.',
            resultReviewHint: 'See what you missed below.',
            submit: 'Submit Quiz',
            next: 'Next Question',
            loadingText: 'Preparing Quiz...',
            loadingRetry: 'Shuffling a fresh attempt…',
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
            searchProceed: 'Proceed',
            readAloudMute: 'Mute read aloud',
            readAloudUnmute: 'Turn on read aloud',
            readAloudPlaying: 'Reading…',
            reportCommentPrefill: 'Write your comment here: ',
            reportCopiedAlert: 'Report copied to clipboard. Paste it in the WhatsApp group.',
            searchGoogleTitle: 'Search on Google'
        },
        bn: {
            title: 'অধ্যায় কুইজ',
            question: 'প্রশ্ন',
            result: 'কুইজ ফলাফল',
            completed: 'কুইজ সম্পন্ন!',
            failed: 'পাস মার্ক অর্জিত হয়নি',
            score: 'আপনার স্কোর',
            outOf: 'এর মধ্যে',
            required: 'পাস করার জন্য ৭০% সঠিক উত্তর প্রয়োজন।',
            continue: 'পরবর্তী পাঠে যান',
            tryAgain: 'আবার চেষ্টা করুন',
            readAgain: 'আবার পড়ুন',
            resultBadgePass: 'পাস',
            resultBadgeRetry: 'আরেকটু চেষ্টা',
            resultPassHint: 'ভালো হয়েছে—কুইজটি সম্পন্ন।',
            resultReviewHint: 'নিচে উত্তরগুলো দেখে নিন।',
            submit: 'কুইজ জমা দিন',
            next: 'পরবর্তী প্রশ্ন',
            loadingText: 'কুইজ প্রস্তুত করা হচ্ছে...',
            loadingRetry: 'নতুন করে সাজানো হচ্ছে…',
            noQuestions: 'কোন কুইজ প্রশ্ন পাওয়া যায়নি।',
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
            reportSuccess: 'শেয়ার মেনু ওপেন হচ্ছে...',
            reportError: 'স্ক্রিনশট নেওয়া সম্ভব হয়নি। আপনি চাইলে ম্যানুয়ালি গ্রুপে জানাতে পারেন।',
            searchLimitTitle: 'সার্চ লিমিট',
            searchConfirm: 'আপনি কি এটি গুগলে খুঁজতে চান? পুরো কুইজে আপনি মাত্র ৫ বার সার্চ করতে পারবেন (ব্যবহৃত: %s/৫)।',
            searchExhausted: 'দুঃখিত! আপনার ৫টি সার্চের কোটা শেষ হয়ে গেছে। এখন থেকে নিজের বুদ্ধিতে উত্তর দিন!',
            searchProceed: 'সার্চ করুন',
            readAloudMute: 'শোনা বন্ধ করুন',
            readAloudUnmute: 'শোনা চালু করুন',
            readAloudPlaying: 'পড়া হচ্ছে…',
            reportCommentPrefill: 'আপনার মন্তব্য এখানে লিখুন: ',
            reportCopiedAlert: 'রিপোর্ট ক্লিপবোর্ডে কপি হয়েছে। হোয়াটসঅ্যাপ গ্রুপে পেস্ট করুন।',
            searchGoogleTitle: 'গুগলে খুঁজুন'
        }
    }[language] || {};

    const t = isLifeSkill
        ? {
              ...tBase,
              ...(language === 'bn'
                  ? {
                        title: 'লাইফ স্কিল কুইজ',
                        continue: lifeSkillNeedsListen ? 'এগিয়ে যান' : 'শেষ করুন',
                        resultPassHint:
                            lifeSkillNeedsListen && lifeSkillCooldownDays > 0
                                ? `সাবাশ—এবার অডিও শুনুন। পয়েন্ট ${String(lifeSkillCooldownDays).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d])} দিন পর।`
                                : lifeSkillNeedsListen
                                  ? 'সাবাশ—এবার অডিও শুনলে পয়েন্ট পাবেন।'
                                  : lifeSkillCooldownDays > 0
                                    ? `অনুশীলন ঠিক আছে — ${String(lifeSkillCooldownDays).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d])} দিন পর আবার পয়েন্ট পাবেন।`
                                    : 'সাবাশ—কুইজ পাস হয়েছে।',
                        readAgain: 'আবার পড়ুন',
                    }
                  : {
                        title: 'Life Skill Quiz',
                        continue: lifeSkillNeedsListen ? 'Continue' : 'Done',
                        resultPassHint:
                            lifeSkillNeedsListen && lifeSkillCooldownDays > 0
                                ? `Nice work—please listen next. Points again in ${lifeSkillCooldownDays} day${lifeSkillCooldownDays === 1 ? '' : 's'}.`
                                : lifeSkillNeedsListen
                                  ? 'Nice work—listen next to unlock your points.'
                                  : lifeSkillCooldownDays > 0
                                    ? `Practice is fine — points again in ${lifeSkillCooldownDays} day${lifeSkillCooldownDays === 1 ? '' : 's'}.`
                                    : 'Nice work—you passed this quiz.',
                        readAgain: 'Read again',
                    }),
          }
        : tBase;

    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const [isRetryShuffle, setIsRetryShuffle] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setIsRetryShuffle(false);
            setShowResult(false);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setScore(0);
            setIsReviewMode(false);
            setSearchCount(0);

            const timer = setTimeout(() => {
                if (questions.length > 0) {
                    setShuffledQuestions(buildShuffledQuiz(questions, 'random'));
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
    const passThreshold = Math.ceil(totalQuestions * LESSON_QUIZ_PASS_RATE);
    const isPassed = score >= passThreshold;
    const isFullscreenScreen = showResult || isReviewMode;

    useEffect(() => {
        if (showResult && totalQuestions > 0) {
            playUiSfx(isPassed ? 'pass' : 'fail');
        }
    }, [showResult, isPassed, totalQuestions, playUiSfx]);

    useEffect(() => {
        if (!showResult || !isPassed || totalQuestions < 1) return;
        let cancelled = false;
        const id = window.setTimeout(() => {
            if (!cancelled) playUiSfx('passSoft');
        }, 340);
        return () => {
            cancelled = true;
            window.clearTimeout(id);
        };
    }, [showResult, isPassed, totalQuestions, playUiSfx]);

    useEffect(() => {
        if (!showResult || isReviewMode) return;
        const id = requestAnimationFrame(() => {
            resultPrimaryRef.current?.focus();
        });
        return () => window.cancelAnimationFrame(id);
    }, [showResult, isReviewMode, isPassed, isPractice]);

    // Mobile-first: snap scroll to new question so header + prompt stay visible after Next.
    useEffect(() => {
        if (!isOpen || loading || showResult || isReviewMode) return;
        const el = quizScrollRef.current;
        if (!el) return;
        el.scrollTop = 0;
        el.scrollLeft = 0;
    }, [currentQuestionIndex, isOpen, loading, showResult, isReviewMode]);

    useEffect(() => {
        if (!isOpen) void stop();
    }, [isOpen, stop]);

    useEffect(() => {
        if (!isOpen || loading || showResult || isReviewMode || readAloudMuted || !isSupported) {
            void stop();
            return;
        }
        if (!currentQuestion) return;
        const script = buildChapterQuizSpeechScript({
            language: ttsLang === 'bn' ? 'bn' : 'en',
            questionIndex: currentQuestionIndex,
            totalQuestions,
            question: currentQuestion
        });
        if (!script.trim()) return;
        void speak(script, `quiz-${lessonId || 'lesson'}-${currentQuestionIndex}`);
        return () => {
            void stop();
        };
    }, [
        isOpen,
        loading,
        showResult,
        isReviewMode,
        readAloudMuted,
        isSupported,
        currentQuestionIndex,
        currentQuestion,
        totalQuestions,
        lessonId,
        ttsLang,
        speak,
        stop
    ]);

    if (!isOpen) return null;

    const toggleReadAloudMute = () => {
        setReadAloudMuted((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(READ_ALOUD_MUTE_KEY, next ? '1' : '0');
            } catch {
                /* ignore */
            }
            if (next) void stop();
            return next;
        });
    };

    useEffect(() => {
        if (!isOpen) return undefined;
        return pushNativeBackHandler(() => {
            onClose();
            void hapticImpact('Light');
            return true;
        });
    }, [isOpen, onClose]);

    const handleOptionSelect = (optionIndex) => {
        playUiSfx('select');
        void hapticImpact('Light');
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
        const passed = calculatedScore >= Math.ceil(shuffledQuestions.length * LESSON_QUIZ_PASS_RATE);
        void hapticNotification(passed ? 'Success' : 'Warning');
    };

    const handleFinish = () => {
        if (isPassed) {
            playUiSfx('continue');
            onComplete(score);
        }
    };

    const handleGuestFinish = () => {
        playUiSfx('continue');
        if (typeof onGuestComplete === 'function') {
            onGuestComplete(score);
        } else {
            onClose();
        }
    };

    const handleHourlyQuizNav = () => {
        if (typeof onHourlyQuiz === 'function') {
            onHourlyQuiz({ passed: isPassed, score });
        }
    };

    const handleTryAgain = () => {
        playUiSfx('retry');
        setIsRetryShuffle(true);
        setLoading(true);
        setTimeout(() => {
            setShuffledQuestions(buildShuffledQuiz(questions, 'random'));
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setShowResult(false);
            setScore(0);
            setLoading(false);
            setIsRetryShuffle(false);
            setIsReviewMode(false);
            setSearchCount(0);
        }, 500);
    };

    const handleStartReport = (idx) => {
        setReportingIndex(idx);
        setReportComment(t.reportCommentPrefill ?? 'Write your comment here: ');
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
            const optionsText = q
                ? q.options
                    .map((opt, i) => {
                        const isCorrect = i === q.correctAnswerIndex;
                        const mark = isCorrect ? '(correct)' : '(wrong)';
                        return `${String.fromCharCode(65 + i)}) ${opt} ${mark}`;
                    })
                    .join('\n')
                : '';

            const divider = '-'.repeat(40);
            const reportContent = [
                '[QUIZ REPORT]',
                divider,
                `Lesson: #${lessonId}`,
                '',
                'Question:',
                q?.questionText || 'General report',
                '',
                'Options:',
                optionsText,
                divider,
                'Comment:',
                reportComment
            ].join('\n');
            
            const waGroupLink = "https://chat.whatsapp.com/Drmeya7EyRlErKGy3VL8DF?mode=gi_t";

            try {
                await Share.share({
                    title: 'Quiz Report',
                    text: reportContent,
                    dialogTitle: t.reportAction
                });
            } catch (shareError) {
                await navigator.clipboard.writeText(reportContent);
                alert(t.reportCopiedAlert ?? 'Report copied to clipboard.');
                void openExternalUrl(waGroupLink);
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
            void openExternalUrl(`https://www.google.com/search?q=${query}`);
            setShowSearchModal(false);
        }
    };

    return createPortal(
        <>
            <div className={`fixed inset-0 z-[200] animate-fade-in ${isFullscreenScreen ? 'bg-[#fffdf7] safe-area-inset-top safe-area-inset-bottom' : 'flex items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4'}`}>
            <div className={`overflow-hidden animate-slide-up-sheet sm:animate-scale-in ${isFullscreenScreen ? 'flex h-full w-full flex-col border-0 bg-[#fffdf7]' : 'flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl'}`}>
                {!isFullscreenScreen && (
                    <div className="hidden justify-center pt-3 pb-1 sm:flex">
                        <div className="h-1 w-12 rounded-full bg-slate-300"></div>
                    </div>
                )}
                {loading ? (
                    <div className={`flex flex-col items-center justify-center space-y-4 ${isFullscreenScreen ? 'flex-1 px-6 py-16 text-slate-900' : 'p-20'}`}>
                        <svg className={`h-12 w-12 animate-pulse ${isFullscreenScreen ? 'text-orange-600' : 'text-orange-500'}`} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className={`font-medium ${isFullscreenScreen ? 'text-slate-600' : 'text-slate-600'}`}>
                            {isRetryShuffle ? (t.loadingRetry ?? t.loadingText) : t.loadingText}
                        </p>
                    </div>
                ) : totalQuestions === 0 ? (
                    <div className={`text-center ${isFullscreenScreen ? 'flex h-full flex-col items-center justify-center px-6 py-12 text-slate-900' : 'p-8'}`}>
                        <p className={`mb-6 ${isFullscreenScreen ? 'text-slate-600' : 'text-slate-600'}`}>{t.noQuestions}</p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-200/80 bg-white px-6 py-2 font-bold text-slate-700 shadow-sm"
                        >
                            {t.close}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={`flex items-center justify-between gap-3 p-4 ${isFullscreenScreen ? 'border-b border-slate-200/80 bg-white text-slate-900' : 'border-b border-slate-200/80 bg-white'}`}>
                            <div className="flex min-w-0 items-center gap-2">
                                {(lessonBadge || lessonId) && (
                                    <span className={`shrink-0 rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-xs font-black ${isFullscreenScreen ? 'text-orange-700' : 'text-orange-700'}`}>
                                        {lessonBadge || lessonId}
                                    </span>
                                )}
                                <h3 className={`truncate text-lg font-bold ${isFullscreenScreen ? 'text-slate-900' : 'text-slate-900'}`}>
                                    {isReviewMode
                                        ? t.reviewTitle
                                        : showResult
                                          ? isLifeSkill
                                            ? t.title
                                            : t.result
                                          : `${t.question} ${currentQuestionIndex + 1}/${totalQuestions}`}
                                </h3>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {!showResult && !isReviewMode && !loading && isSupported && totalQuestions > 0 && (
                                    <button
                                        type="button"
                                        onClick={toggleReadAloudMute}
                                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-sm transition-all active:scale-95 ${isLoading ? 'opacity-70' : ''} ${isFullscreenScreen ? 'text-slate-700' : 'text-slate-600'}`}
                                        title={readAloudMuted ? t.readAloudUnmute : isPlaying || isLoading ? t.readAloudPlaying : t.readAloudMute}
                                        aria-pressed={!readAloudMuted}
                                        aria-label={readAloudMuted ? t.readAloudUnmute : t.readAloudMute}
                                    >
                                        {readAloudMuted ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            </svg>
                                        )}
                                        {(isPlaying || isLoading) && !readAloudMuted && (
                                            <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" aria-hidden="true" />
                                        )}
                                    </button>
                                )}
                                {/* Google: only while answering live questions (not score result; review uses per-question buttons). */}
                                {!showResult && !isReviewMode && (
                                    <button
                                        type="button"
                                        onClick={() => handleGoogleSearch(currentQuestion?.questionText)}
                                        className={`group inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-sm transition-all active:scale-95 ${isFullscreenScreen ? 'text-slate-700' : 'text-slate-600'}`}
                                        title={t.searchGoogleTitle}
                                    >
                                        <svg className="w-5 h-5 transition-colors group-hover:text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
                                    </button>
                                )}
                                {isReviewMode ? (
                                    <button
                                        onClick={() => setIsReviewMode(false)}
                                        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-bold transition-colors rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm ${isFullscreenScreen ? '' : ''}`}
                                        aria-label={language === 'en' ? 'Back to result' : 'ফলাফলে ফিরে যান'}
                                        title={language === 'en' ? 'Back to result' : 'ফলাফলে ফিরে যান'}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        <span className="hidden sm:inline">{t.backToResult}</span>
                                    </button>
                                ) : (
                                    <>
                                        {showResult && !isLifeSkill && typeof onHourlyQuiz === 'function' && (
                                            <button
                                                type="button"
                                                onClick={handleHourlyQuizNav}
                                                className="transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                                title={language === 'en' ? 'Hourly quiz' : 'ঘণ্টাভিত্তিক কুইজ'}
                                                aria-label={language === 'en' ? 'Hourly quiz' : 'ঘণ্টাভিত্তিক কুইজ'}
                                            >
                                                <div className="h-9 w-9 drop-shadow-md sm:h-10 sm:w-10">
                                                    <DotLottiePlayer
                                                        src={clockLottie}
                                                        autoplay
                                                        loop
                                                        className="h-full w-full filter saturate-150 contrast-125"
                                                    />
                                                </div>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className={`border border-slate-200/80 bg-white p-1 text-slate-600 transition-colors ${isFullscreenScreen ? '' : ''}`}
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div
                            ref={quizScrollRef}
                            className={`flex-1 overflow-y-auto overscroll-y-contain touch-pan-y ${isFullscreenScreen ? 'px-4 py-6 text-slate-900 sm:px-6 lg:px-8 sm:py-10' : `p-6 ${isReviewMode ? 'pb-20' : showResult ? 'pb-24' : ''}`}`}
                        >
                            {isReviewMode ? (
                                <div className="relative min-h-full">
                                    <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col justify-between gap-8">
                                        <div className="flex flex-1 items-center justify-center">
                                            <div className="w-full max-w-3xl space-y-4 pb-2">
                                                {shuffledQuestions.map((q, idx) => {
                                                    const userAnswer = userAnswers[idx];
                                                    const isAnswered = userAnswer !== undefined;
                                                    const isCorrect = isAnswered && userAnswer === q.correctAnswerIndex;
                                                    return (
                                                        <div key={idx} id={`question-card-${idx}`} className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm p-4 ${isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-rose-400 bg-rose-50'}`}>
                                                            <div className="flex gap-3 mb-3">
                                                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center border border-slate-200/80 text-xs font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                                    {idx + 1}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <p className="min-w-0 flex-1 break-words text-sm font-medium leading-relaxed text-slate-900 sm:text-base lg:text-lg">
                                                                            {q.questionText}
                                                                        </p>
                                                                        <div className="flex gap-1.5 shrink-0">
                                                                            <button
                                                                                onClick={() => handleGoogleSearch(q.questionText)}
                                                                                className="border border-slate-200/80 bg-white p-2 text-slate-600 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                                                title={t.searchGoogleTitle}
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
                                                                                className="border border-slate-200/80 bg-white p-2 text-slate-600 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                                                title={t.reportTitle}
                                                                            >
                                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`mt-1 inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isCorrect ? 'rounded-full border border-slate-200/80 bg-emerald-100 text-emerald-800' : 'rounded-full border border-slate-200/80 bg-rose-100 text-rose-800'}`}>
                                                                        {isCorrect ? t.right : t.wrong}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                {q.image && (
                                                    <div className="mb-4 ml-9 max-w-[200px] overflow-hidden border border-slate-200/80 shadow-sm">
                                                        <img src={q.image} alt="Question" className="w-full h-auto" />
                                                    </div>
                                                )}
                                                {!isAnswered && (
                                                    <div className="mb-3 ml-9 text-xs font-semibold text-rose-700">
                                                        {t.notAnswered}
                                                    </div>
                                                )}
                                                <div className="space-y-2 pl-9">
                                                    {q.options.map((opt, optIdx) => {
                                                        const isSelected = userAnswer === optIdx;
                                                        const optionClass = isSelected
                                                            ? isCorrect
                                                                ? 'font-semibold text-emerald-800'
                                                                : 'font-semibold text-rose-800'
                                                            : 'text-slate-600';

                                                        const isOptionImage = typeof opt === 'string' && (opt.startsWith('/') || opt.includes('.jpg') || opt.includes('.png') || opt.includes('.webp'));

                                                        return (
                                                            <div key={optIdx} className="flex items-start gap-2 text-sm">
                                                                <ReviewOptionMarker isSelected={isSelected} isCorrect={isCorrect} />
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

                                        <div className="sticky bottom-0 border-t border-slate-200/80 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                                            <div className="mx-auto flex max-w-lg gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsReviewMode(false)}
                                                    className="rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm min-w-0 flex-1 px-2 py-3 text-sm font-semibold"
                                                >
                                                    {t.backToResult}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={onClose}
                                                    className="rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 min-w-0 flex-1 px-2 py-3 text-sm font-semibold"
                                                >
                                                    {t.close}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : showResult ? (
                                <div className="relative flex min-h-full flex-col bg-[#fffdf7]">
                                    <div className="relative z-[1] flex flex-1 flex-col px-4 pb-2 pt-5 sm:pt-8">
                                        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
                                            <div
                                                role="status"
                                                aria-live="polite"
                                                aria-atomic="true"
                                                className="animate-quiz-result-in w-full max-w-md"
                                            >
                                                <div
                                                    className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm px-6 py-8 sm:px-8 sm:py-9 ${isPassed ? 'border-emerald-500 bg-emerald-50' : 'bg-white'}`}
                                                >
                                                    <div className="text-center">
                                                        <div className="mb-3 select-none text-[2.5rem] leading-none sm:text-[2.75rem]" aria-hidden>
                                                            {isPassed ? '✨' : '💪'}
                                                        </div>
                                                        <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs ${isPassed ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                            {isPassed ? t.resultBadgePass : t.resultBadgeRetry}
                                                        </p>
                                                        <h2 className="mt-2 text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
                                                            {isPassed ? t.completed : t.failed}
                                                        </h2>
                                                        <p className="mt-2 text-sm font-medium text-slate-600">
                                                            {language === 'bn'
                                                                ? `মোট ${totalQuestions}টির মধ্যে ${score}টি সঠিক`
                                                                : `${score} of ${totalQuestions} correct`}
                                                        </p>
                                                        <p className="mt-6 text-5xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-[3.25rem]">
                                                            {Math.round((score / totalQuestions) * 100)}%
                                                        </p>
                                                        <p className={`mx-auto mt-3 max-w-xs text-xs leading-relaxed sm:text-sm ${isPassed ? 'text-emerald-800' : 'text-slate-600'}`}>
                                                            {isPassed ? t.resultPassHint : t.resultReviewHint}
                                                        </p>
                                                        {guestPreview && isPassed && (
                                                            <div className="mx-auto mt-4 max-w-sm rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3 text-left text-xs leading-relaxed text-sky-900 sm:text-sm">
                                                                {guestPreviewText(language, 'lessonResultGuest')}
                                                            </div>
                                                        )}
                                                        <div className="relative mt-8 h-2 w-full overflow-visible border border-slate-200/80 bg-slate-200">
                                                            <div
                                                                className={`h-full transition-[width] duration-[900ms] ease-out ${isPassed ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                                                style={{ width: `${Math.max(0, Math.min(100, (score / totalQuestions) * 100))}%` }}
                                                            />
                                                            {!isPassed && (
                                                                <div
                                                                    className="absolute top-1/2 z-[1] h-4 w-0.5 -translate-y-1/2 bg-slate-900"
                                                                    style={{ left: `${LESSON_QUIZ_PASS_RATE * 100}%` }}
                                                                    title={language === 'en' ? 'Pass threshold (70%)' : 'পাসের সীমা (৭০%)'}
                                                                    aria-hidden
                                                                />
                                                            )}
                                                        </div>
                                                        {!isPassed && (
                                                            <p className="mt-4 px-1 text-xs leading-snug text-slate-600">{t.required}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mx-auto mt-4 w-full max-w-md shrink-0 space-y-2.5 border-t border-slate-200/80 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                            <button
                                                type="button"
                                                onClick={() => setIsReviewMode(true)}
                                                className="rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm flex w-full items-center justify-center gap-2 py-3.5 text-sm font-semibold"
                                            >
                                                <svg className="h-4 w-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                {t.review}
                                            </button>

                                            {isPractice && isPassed ? (
                                                <>
                                                    <button
                                                        ref={resultPrimaryRef}
                                                        type="button"
                                                        onClick={onClose}
                                                        className="rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 w-full py-3.5 text-sm font-semibold"
                                                    >
                                                        {t.close}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleTryAgain}
                                                        className="rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm w-full py-3.5 text-sm font-semibold"
                                                    >
                                                        {t.tryAgain}
                                                    </button>
                                                </>
                                            ) : isPractice && !isPassed ? (
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    <button
                                                        ref={resultPrimaryRef}
                                                        type="button"
                                                        onClick={handleTryAgain}
                                                        className="rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 py-3.5 text-sm font-semibold"
                                                    >
                                                        {t.tryAgain}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={onClose}
                                                        className="rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm py-3.5 text-sm font-semibold"
                                                    >
                                                        {t.close}
                                                    </button>
                                                </div>
                                            ) : isPassed ? (
                                                guestPreview ? (
                                                    <button
                                                        ref={resultPrimaryRef}
                                                        type="button"
                                                        onClick={handleGuestFinish}
                                                        className="rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 flex w-full items-center justify-center gap-2 py-3.5 text-sm font-semibold"
                                                    >
                                                        {guestPreviewText(language, 'lessonCloseGuest')}
                                                    </button>
                                                ) : (
                                                <button
                                                    ref={resultPrimaryRef}
                                                    type="button"
                                                    onClick={handleFinish}
                                                    className="rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 flex w-full items-center justify-center gap-2 py-3.5 text-sm font-semibold"
                                                >
                                                    <span>{t.continue}</span>
                                                    {!isLifeSkill && (
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                        </svg>
                                                    )}
                                                </button>
                                                )
                                            ) : (
                                                <>
                                                    <button
                                                        ref={resultPrimaryRef}
                                                        type="button"
                                                        onClick={handleTryAgain}
                                                        className="w-full rounded-2xl bg-amber-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-amber-900/20 transition-colors hover:bg-amber-400 active:scale-[0.99]"
                                                    >
                                                        {t.tryAgain}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={onReadAgain || onClose}
                                                        className="w-full py-2.5 text-sm font-medium text-slate-600 underline underline-offset-2 transition-colors hover:text-slate-900"
                                                    >
                                                        {t.readAgain}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    key={currentQuestionIndex}
                                    className="space-y-6 animate-quiz-question-in"
                                >
                                    <div className="text-sm font-medium leading-relaxed text-slate-900 sm:text-base lg:text-lg break-words">
                                        {currentQuestion?.questionText}
                                    </div>

                                    {currentQuestion?.image && (
                                        <div className="flex max-h-[220px] justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
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
                                                    className={`group relative flex rounded-2xl border border-slate-200/80 shadow-sm transition-all ${userAnswers[currentQuestionIndex] === idx
                                                        ? 'border-orange-300 bg-orange-50 text-orange-950 shadow-sm'
                                                        : 'bg-white text-slate-700 hover:bg-orange-50/60 active:scale-[0.99]'
                                                        } ${isImage
                                                            ? 'aspect-square flex-col items-center justify-center p-3'
                                                            : 'w-full items-center justify-start px-5 py-4 text-left'
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
                            <div className="sticky bottom-0 z-10 border-t border-slate-200/80 bg-white p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))]">
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={userAnswers[currentQuestionIndex] === undefined}
                                    className={`w-full py-3 font-bold transition-all ${userAnswers[currentQuestionIndex] !== undefined
                                        ? 'rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                                        : 'cursor-not-allowed border-2 border-slate-300 bg-slate-200 text-slate-500'
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
            <div className="fixed inset-0 z-[300] flex animate-fade-in items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4">
                <div className="flex w-full max-w-md animate-slide-up-sheet flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:animate-scale-in sm:rounded-2xl">
                    <div className="p-6 pb-2">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold tracking-tight text-slate-900">{t.reportTitle}</h3>
                            <button
                                type="button"
                                onClick={() => setShowReportModal(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm"
                                aria-label={t.close}
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="mb-6 text-sm text-slate-600">{t.reportSubtitle}</p>
                        
                        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm mb-6 bg-white p-4">
                            <p className="mb-2 text-xs font-black uppercase tracking-widest text-orange-600">QUESTION PREVIEW</p>
                            <p className="line-clamp-3 text-sm italic leading-relaxed text-slate-800">
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
                                    className="w-full min-h-[140px] resize-none rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/60"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 border-t border-slate-200/80 p-6 pt-4">
                        <button
                            type="button"
                            onClick={handleSendReport}
                            disabled={isSharing}
                            className={`flex w-full items-center justify-center gap-3 rounded-full py-4 font-black text-white transition-all active:scale-[0.98] ${isSharing ? 'bg-slate-500' : 'bg-[#25D366] shadow-sm hover:brightness-105'}`}
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
            <div className="fixed inset-0 z-[300] flex animate-fade-in items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4">
                <div className="flex w-full max-w-sm animate-slide-up-sheet flex-col items-center overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center shadow-xl sm:animate-scale-in sm:rounded-2xl sm:pb-8">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                        <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    </div>
                    <h3 className="mb-2 text-xl font-black text-slate-900">{searchCount >= MAX_SEARCH_QUOTA ? t.searchExhausted : t.searchLimitTitle}</h3>
                    <p className="mb-8 text-sm text-slate-600">{searchCount >= MAX_SEARCH_QUOTA ? (language === 'en' ? 'Limit reached!' : 'নিজের বুদ্ধি খাটান!') : t.searchConfirm.replace('%s', searchCount)}</p>
                    <div className="flex w-full flex-col gap-3">
                        {searchCount < MAX_SEARCH_QUOTA && (
                            <button type="button" onClick={confirmGoogleSearch} className="rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30 w-full py-4 font-black">
                                {t.searchProceed}
                            </button>
                        )}
                        <button type="button" onClick={() => setShowSearchModal(false)} className="rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm w-full py-4 font-bold">
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
