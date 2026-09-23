import React, { useEffect, useRef, useState } from 'react';
import {
    toSafetyLibraryDisplayUrl,
    handleSafetyLibraryImageError,
} from '../../utils/safetyLibraryImageUrl';
import {
    buildIdentifyPracticeQuestion,
    nextIdentifyPracticeMode,
    recordIdentifyPracticeAnswer,
    formatIdentifyAvgResponse,
} from '../../utils/safetyLibraryPractice';
import {
    IDENTIFY_REAL_SECONDS_SHORT,
    IDENTIFY_REAL_MAX_MISTAKES,
    IDENTIFY_REAL_POINTS_CAP,
    identifyRealSecondsFor,
    submitIdentifyScore,
} from '../../utils/identifyRealScore';
import {
    collectIdentifyImageUrls,
    preloadIdentifyImages,
    useQuizImageGate,
} from '../../utils/quizImageGate';
import IdentifyGridPractice from './IdentifyGridPractice';
import { playQuizChoiceSound } from '../../utils/quizChoiceSounds';

function practiceCopy(language) {
    return language === 'en'
        ? {
            prompt: 'Name?',
            empty: 'Nothing here to try yet',
            right: 'Right',
            wrong: 'Wrong',
            score: 'Score',
            qOf: 'Q',
            doneTitle: 'Session done',
            doneHint: 'Saved. Points count for Monthly and Lineman Day Rank.',
            doneHintPreview: 'Admin preview — score replaced; no Home points.',
            doneHintPending: 'Saving score…',
            doneHintFail: 'Could not save. Try again tomorrow or check connection.',
            doneMissOut: 'Out of lives',
            doneStopped: 'You stopped',
            again: 'Play again',
            practice: 'Practice instead',
            stop: 'Stop',
            lives: 'Miss',
            savedAs: 'Saved score',
            pointsAdded: 'Added to your score',
            rulesTitle: `Win up to +${IDENTIFY_REAL_POINTS_CAP} points`,
            rulesAbout: 'A game to recognise different PPE, tools, and other gear.',
            rules1: 'You get 5 to 8 seconds for each answer.',
            rules2: `Right answers raise your run score. Up to +${IDENTIFY_REAL_POINTS_CAP} points go to your Home score today.`,
            rules3: 'Five mistakes and the game stops. One real try per day.',
            rulesStart: 'Start',
            rulesPractice: 'Practice',
            loadingPic: 'Loading picture',
        }
        : {
            prompt: 'নাম কী?',
            empty: 'চেনার মতো ছবি নেই',
            right: 'ঠিক',
            wrong: 'ভুল',
            score: 'স্কোর',
            qOf: 'প্রশ্ন',
            doneTitle: 'শেষ',
            doneHint: 'জমা হয়েছে। পয়েন্ট চলতি মাস ও লাইনম্যান দিবস র‍্যাঙ্কে যোগ হবে।',
            doneHintPreview: 'অ্যাডমিন প্রিভিউ — স্কোর বদলানো হয়েছে; হোম পয়েন্ট নেই।',
            doneHintPending: 'স্কোর জমা হচ্ছে…',
            doneHintFail: 'জমা হয়নি। আগামীকাল চেষ্টা করুন বা নেট দেখুন।',
            doneMissOut: '৫ ভুল — শেষ',
            doneStopped: 'আপনি থামিয়েছেন',
            again: 'আবার খেলুন',
            practice: 'প্র্যাকটিস করুন',
            stop: 'থামুন',
            lives: 'ভুল',
            savedAs: 'জমা স্কোর',
            pointsAdded: 'আপনার স্কোরে যোগ হয়েছে',
            rulesTitle: `সর্বোচ্চ +${IDENTIFY_REAL_POINTS_CAP} পয়েন্ট`,
            rulesAbout: 'এটা নানা ধরনের PPE, যন্ত্রপাতি বা অন্য সরঞ্জাম চেনার খেলা।',
            rules1: 'প্রতিটি উত্তরের জন্য ৫ থেকে ৮ সেকেন্ড সময় থাকে।',
            rules2: `ঠিক উত্তর হলে রান স্কোর বাড়ে। আজ হোম স্কোরে সর্বোচ্চ +${IDENTIFY_REAL_POINTS_CAP} পয়েন্ট যোগ হতে পারে।`,
            rules3: '৫টা ভুল হলে খেলা থেমে যাবে। দিনে একবার আসল খেলা।',
            rulesStart: 'শুরু করুন',
            rulesPractice: 'প্র্যাকটিস করুন',
            loadingPic: 'ছবি আসছে',
        };
}

function buildNextReal(items, recentModesRef, avoidItemId) {
    const nextMode = nextIdentifyPracticeMode(recentModesRef.current, items);
    recentModesRef.current = [...recentModesRef.current, nextMode].slice(-2);
    const question = buildIdentifyPracticeQuestion(items, avoidItemId, nextMode);
    return { mode: nextMode, question };
}

export default function IdentifyPractice({
    language,
    items,
    onScoreSaved,
    score,
    /** 'practice' | 'real' */
    scoringMode = 'practice',
    onRequestPracticeMode,
    /** Admin may replay real mode anytime. */
    canReplayReal = false,
    /** Logged-in user id for custom-auth RPC (required for real submit). */
    userId = null,
    /** Called after submit attempt with latest status payload. */
    onIdentifySubmitResult,
}) {
    const t = practiceCopy(language);
    const bn = language === 'bn';
    const isReal = scoringMode === 'real';

    const recentModes = useRef([]);
    const [mode, setMode] = useState(() => {
        const first = nextIdentifyPracticeMode([], items);
        recentModes.current = [first];
        return first;
    });
    const [question, setQuestion] = useState(() => {
        const first = recentModes.current[0] || 'name';
        return buildIdentifyPracticeQuestion(items, undefined, first);
    });
    const [pickedId, setPickedId] = useState('');
    const [flash, setFlash] = useState('');
    const [elapsedMs, setElapsedMs] = useState(0);
    const [clockFrozen, setClockFrozen] = useState(false);
    const advanceTimer = useRef(0);
    const clockTimer = useRef(0);
    const lockedRef = useRef(false);
    const submitOnceRef = useRef(false);

    const [realCorrect, setRealCorrect] = useState(0);
    const [realMistakes, setRealMistakes] = useState(0);
    const [realAsked, setRealAsked] = useState(0);
    const [realDone, setRealDone] = useState(false);
    const [realEndReason, setRealEndReason] = useState(''); // 'mistakes' | 'stop'
    const [secondsLeft, setSecondsLeft] = useState(IDENTIFY_REAL_SECONDS_SHORT);
    const [submitState, setSubmitState] = useState(''); // '' | 'pending' | 'ok' | 'fail'
    const [savedScore, setSavedScore] = useState(null);
    const [pointsAwarded, setPointsAwarded] = useState(null);
    const [rulesReady, setRulesReady] = useState(() => scoringMode !== 'real');
    const realCorrectRef = useRef(0);
    const realMistakesRef = useRef(0);
    const realAskedRef = useRef(0);
    const clockLimitRef = useRef(IDENTIFY_REAL_SECONDS_SHORT);
    const startedAtRef = useRef(0);

    const answered = Boolean(pickedId);
    const liveCorrect = score?.lifeCorrect ?? 0;
    const liveTotal = score?.lifeTotal ?? 0;
    const livePercent = score?.lifePercent ?? 0;

    const activeMode = mode;
    const activeQuestion = question;
    const visibleImageUrls = collectIdentifyImageUrls(activeQuestion, activeMode);
    const { ready: imagesReady } = useQuizImageGate(visibleImageUrls, toSafetyLibraryDisplayUrl);
    const clockArmed = !isReal || imagesReady;

    const startRealRound = (avoidItemId) => {
        const next = buildNextReal(items, recentModes, avoidItemId);
        if (!next.question) {
            setRealDone(true);
            setRealEndReason('stop');
            return;
        }
        setMode(next.mode);
        setQuestion(next.question);
        setPickedId('');
        setFlash('');
        lockedRef.current = false;
        const limit = identifyRealSecondsFor(next.mode);
        clockLimitRef.current = limit;
        setSecondsLeft(limit);
    };

    const resetReal = (opts = {}) => {
        const showRules = opts.showRules !== false;
        recentModes.current = [];
        realCorrectRef.current = 0;
        realMistakesRef.current = 0;
        realAskedRef.current = 0;
        submitOnceRef.current = false;
        setRealCorrect(0);
        setRealMistakes(0);
        setRealAsked(0);
        setRealDone(false);
        setRealEndReason('');
        setSubmitState('');
        setSavedScore(null);
        setPointsAwarded(null);
        lockedRef.current = false;
        if (showRules) setRulesReady(false);
        startRealRound(undefined);
    };

    useEffect(() => () => {
        window.clearTimeout(advanceTimer.current);
        window.clearInterval(clockTimer.current);
    }, []);

    useEffect(() => {
        if (!isReal) {
            setRulesReady(true);
            return;
        }
        resetReal({ showRules: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReal, items]);

    useEffect(() => {
        if (!isReal || !rulesReady || realDone || !activeQuestion) return undefined;
        lockedRef.current = false;
        setPickedId('');
        setFlash('');
        const limit = identifyRealSecondsFor(activeMode);
        clockLimitRef.current = limit;
        setSecondsLeft(limit);
        window.clearInterval(clockTimer.current);
        if (!imagesReady) return () => window.clearInterval(clockTimer.current);
        clockTimer.current = window.setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    window.clearInterval(clockTimer.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(clockTimer.current);
    }, [isReal, rulesReady, realDone, activeQuestion?.itemId, activeMode, imagesReady]);

    useEffect(() => {
        if (!isReal || !rulesReady || realDone || !imagesReady || secondsLeft > 0 || lockedRef.current) return;
        finishAnswer(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secondsLeft, isReal, rulesReady, realDone, imagesReady]);

    useEffect(() => {
        if (isReal || !activeQuestion) return;
        startedAtRef.current = Date.now();
        setElapsedMs(0);
        setClockFrozen(false);
    }, [isReal, activeQuestion?.itemId, activeMode, imagesReady]);

    useEffect(() => {
        if (isReal || !activeQuestion || answered || clockFrozen) return undefined;
        const tick = () => {
            const start = startedAtRef.current;
            setElapsedMs(start ? Math.max(0, Date.now() - start) : 0);
        };
        tick();
        const id = window.setInterval(tick, 100);
        return () => window.clearInterval(id);
    }, [isReal, activeQuestion?.itemId, activeMode, imagesReady, answered, clockFrozen]);

    const takePracticeResponseMs = () => {
        const start = startedAtRef.current;
        if (!start) return null;
        return Date.now() - start;
    };

    useEffect(() => {
        if (!activeQuestion || !imagesReady) return undefined;
        const peekMode = nextIdentifyPracticeMode([...recentModes.current], items);
        const peek = buildIdentifyPracticeQuestion(items, activeQuestion.itemId, peekMode);
        if (peek) preloadIdentifyImages(collectIdentifyImageUrls(peek, peekMode));
        return undefined;
    }, [activeQuestion?.itemId, imagesReady, items]);

    const goNextPractice = (fromItemId) => {
        const nextMode = nextIdentifyPracticeMode(recentModes.current, items);
        recentModes.current = [...recentModes.current, nextMode].slice(-2);
        setMode(nextMode);
        setQuestion(buildIdentifyPracticeQuestion(items, fromItemId, nextMode));
        setPickedId('');
        setFlash('');
        lockedRef.current = false;
    };

    const finishAnswer = (ok) => {
        if (lockedRef.current) return;
        lockedRef.current = true;
        window.clearInterval(clockTimer.current);
        setFlash(ok ? 'right' : 'wrong');
        if (!pickedId && !ok) setPickedId('__timeout__');

        if (isReal) {
            realAskedRef.current += 1;
            setRealAsked(realAskedRef.current);
            if (ok) {
                realCorrectRef.current += 1;
                setRealCorrect(realCorrectRef.current);
            } else {
                realMistakesRef.current += 1;
                setRealMistakes(realMistakesRef.current);
            }
            const missCount = realMistakesRef.current;

            window.clearTimeout(advanceTimer.current);
            advanceTimer.current = window.setTimeout(() => {
                if (missCount >= IDENTIFY_REAL_MAX_MISTAKES) {
                    setRealEndReason('mistakes');
                    setRealDone(true);
                    lockedRef.current = false;
                    return;
                }
                startRealRound(activeQuestion?.itemId);
            }, 700);
            return;
        }

        onScoreSaved?.(recordIdentifyPracticeAnswer(ok, takePracticeResponseMs()));
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(() => goNextPractice(activeQuestion?.itemId), 900);
    };

    const pickChoice = (choiceId) => {
        if (answered || lockedRef.current || !activeQuestion || realDone || !clockArmed) return;
        const ok = choiceId === activeQuestion.itemId;
        playQuizChoiceSound(ok);
        setPickedId(choiceId);
        finishAnswer(ok);
    };

    const stopReal = () => {
        if (realDone) return;
        window.clearInterval(clockTimer.current);
        window.clearTimeout(advanceTimer.current);
        lockedRef.current = false;
        setRealEndReason('stop');
        setRealDone(true);
    };

    useEffect(() => {
        if (!isReal || !realDone || !rulesReady || submitOnceRef.current) return undefined;
        submitOnceRef.current = true;
        let cancelled = false;
        setSubmitState('pending');
        (async () => {
            const result = await submitIdentifyScore({
                score: realCorrectRef.current,
                asked: realAskedRef.current,
                mistakes: realMistakesRef.current,
                userId,
            });
            if (cancelled) return;
            if (result?.ok) {
                setSubmitState('ok');
                setSavedScore(result.score);
                setPointsAwarded(
                    typeof result.points_awarded === 'number' ? result.points_awarded : 0
                );
            } else {
                setSubmitState('fail');
            }
            onIdentifySubmitResult?.(result);
        })();
        return () => {
            cancelled = true;
        };
    }, [isReal, realDone, onIdentifySubmitResult, userId]);

    if (isReal && !rulesReady) {
        const lines = [t.rules1, t.rules2, t.rules3];
        return (
            <div className="mx-auto flex min-h-[280px] w-full max-w-md flex-col justify-center px-4 py-6">
                <div className="rounded-3xl border border-orange-100 bg-[#fffdf7] px-5 py-5 shadow-sm">
                    <h2 className={`text-center text-[1.15rem] font-black leading-snug text-orange-700 ${bn ? 'font-bengali' : ''}`}>
                        {t.rulesTitle}
                    </h2>
                    <p className={`mt-3 text-center text-[13px] font-semibold leading-snug text-slate-700 ${bn ? 'font-bengali' : ''}`}>
                        {t.rulesAbout}
                    </p>
                    <ul className="mt-4 space-y-2.5">
                        {lines.map((line) => (
                            <li
                                key={line}
                                className={`flex gap-2 text-[13px] font-semibold leading-snug text-slate-700 ${bn ? 'font-bengali' : ''}`}
                            >
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" aria-hidden />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-5 flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                window.clearInterval(clockTimer.current);
                                setPickedId('');
                                setFlash('');
                                lockedRef.current = false;
                                setSecondsLeft(identifyRealSecondsFor(mode));
                                setRulesReady(true);
                            }}
                            className={`w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-sm active:scale-[0.99] ${bn ? 'font-bengali' : ''}`}
                        >
                            {t.rulesStart}
                        </button>
                        {typeof onRequestPracticeMode === 'function' ? (
                            <button
                                type="button"
                                onClick={onRequestPracticeMode}
                                className={`w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm active:scale-[0.99] ${bn ? 'font-bengali' : ''}`}
                            >
                                {t.rulesPractice}
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }

    if (isReal && realDone) {
        const hint = submitState === 'pending'
            ? t.doneHintPending
            : submitState === 'fail'
                ? t.doneHintFail
                : (canReplayReal ? t.doneHintPreview : t.doneHint);
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-4 py-10 text-center">
                <p className={`text-2xl font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}>{t.doneTitle}</p>
                <p className={`mt-1 text-xs font-bold text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                    {realEndReason === 'mistakes' ? t.doneMissOut : t.doneStopped}
                </p>
                <p className="mt-3 text-4xl font-black tabular-nums text-orange-600">
                    {realCorrect}
                </p>
                {savedScore != null && submitState === 'ok' ? (
                    <p className={`mt-1 text-xs font-bold tabular-nums text-emerald-600 ${bn ? 'font-bengali' : ''}`}>
                        {t.savedAs}: {savedScore}
                    </p>
                ) : null}
                {submitState === 'ok' && pointsAwarded != null && pointsAwarded > 0 ? (
                    <p className={`mt-1 text-sm font-black tabular-nums text-orange-600 ${bn ? 'font-bengali' : ''}`}>
                        +{pointsAwarded} · {t.pointsAdded}
                    </p>
                ) : null}
                <p className={`mt-1 text-sm font-semibold tabular-nums text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                    {realAsked} {t.qOf.toLowerCase()} · {realMistakes}/{IDENTIFY_REAL_MAX_MISTAKES} {t.lives}
                </p>
                <p className={`mt-2 text-sm font-semibold text-slate-500 ${bn ? 'font-bengali' : ''}`}>{hint}</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    {canReplayReal ? (
                        <button
                            type="button"
                            onClick={resetReal}
                            className={`rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-sm ${bn ? 'font-bengali' : ''}`}
                        >
                            {t.again}
                        </button>
                    ) : null}
                    {typeof onRequestPracticeMode === 'function' ? (
                        <button
                            type="button"
                            onClick={onRequestPracticeMode}
                            className={`rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 ${bn ? 'font-bengali' : ''}`}
                        >
                            {t.practice}
                        </button>
                    ) : null}
                </div>
            </div>
        );
    }

    if (!activeQuestion) {
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-4 py-10 text-center">
                <p className={`text-sm font-black text-slate-600 ${bn ? 'font-bengali' : ''}`}>{t.empty}</p>
            </div>
        );
    }

    const clockUrgentAt = Math.max(1, Math.ceil(clockLimitRef.current / 3));
    const clockTone = !clockArmed
        ? 'bg-slate-400'
        : secondsLeft <= clockUrgentAt
            ? 'bg-rose-500'
            : 'bg-orange-500';

    const scoreChip = isReal ? (
        <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
                <p className={`text-[11px] font-bold tabular-nums text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                    {t.qOf} {realAsked + 1}
                </p>
                <p className={`rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black tabular-nums text-rose-600 ${bn ? 'font-bengali' : ''}`}>
                    {realMistakes}/{IDENTIFY_REAL_MAX_MISTAKES} {t.lives}
                </p>
                <button
                    type="button"
                    onClick={stopReal}
                    className={`rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ${bn ? 'font-bengali' : ''}`}
                >
                    {t.stop}
                </button>
            </div>
            <p className={`identify-quiz-score shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black tabular-nums text-white shadow-sm ${clockTone}`}>
                {secondsLeft}s · {realCorrect}
            </p>
        </div>
    ) : (
        <div className="mb-1 flex items-center justify-between gap-2">
            <p className={`identify-quiz-score rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-black tabular-nums text-white shadow-sm ${bn ? 'font-bengali' : ''}`}>
                {livePercent}% · {liveCorrect}/{liveTotal}
            </p>
            <p
                className={`identify-practice-live-time ${
                    elapsedMs >= 8000
                        ? 'identify-practice-live-time--late'
                        : elapsedMs >= 4000
                            ? 'identify-practice-live-time--mid'
                            : ''
                } ${bn ? 'font-bengali' : ''}`}
                aria-live="off"
            >
                {formatIdentifyAvgResponse(elapsedMs, language)}
            </p>
        </div>
    );

    if (activeMode === 'grid' || activeMode === 'clue') {
        const clueText = activeMode === 'clue' ? (activeQuestion.clue_bn || '') : '';
        return (
            <div className="flex h-full min-h-0 w-full flex-col">
                <IdentifyGridPractice
                    language={language}
                    question={activeQuestion}
                    score={isReal ? { lifeCorrect: realCorrect, lifeTotal: realAsked + (answered ? 1 : 0), lifePercent: 0 } : score}
                    persistLocalScore={!isReal}
                    onScoreSaved={isReal ? undefined : (record) => {
                        setClockFrozen(true);
                        onScoreSaved?.(record);
                    }}
                    onAnswered={isReal ? (ok) => {
                        if (lockedRef.current) return;
                        setPickedId(ok ? activeQuestion.itemId : '__wrong__');
                        finishAnswer(ok);
                    } : undefined}
                    onAdvance={isReal ? undefined : goNextPractice}
                    clueText={clueText}
                    headerExtra={scoreChip}
                    hideDefaultScore
                    externalAnswered={isReal ? answered : undefined}
                    lockChoices={isReal && !imagesReady}
                    waitLabel={isReal && !imagesReady ? t.loadingPic : ''}
                    promptReady={imagesReady}
                />
            </div>
        );
    }

    return (
        <div className="identify-name-quiz relative mx-auto flex w-full max-w-lg flex-col px-3 pb-4 pt-1 sm:px-4">
            <div className="mb-2">
                {scoreChip}
                <p className={`text-sm font-black leading-snug text-slate-900 sm:text-base ${bn ? 'font-bengali' : ''}`}>{t.prompt}</p>
            </div>

            <div
                key={activeQuestion.itemId}
                className="identify-name-photo relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm animate-quiz-question-in"
            >
                <img
                    src={toSafetyLibraryDisplayUrl(activeQuestion.image)}
                    alt=""
                    data-fallback-index="0"
                    onError={(e) => handleSafetyLibraryImageError(e, activeQuestion.image)}
                    className="h-full w-full object-contain object-center p-3"
                />
                {isReal && !imagesReady ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                        <p className={`text-sm font-bold text-slate-500 ${bn ? 'font-bengali' : ''}`}>{t.loadingPic}</p>
                    </div>
                ) : null}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
                {activeQuestion.choices.map((choice) => {
                    const chosen = pickedId === choice.id;
                    const showRight = answered && chosen && choice.id === activeQuestion.itemId;
                    const showWrong = answered && chosen && choice.id !== activeQuestion.itemId;
                    return (
                        <button
                            key={choice.id}
                            type="button"
                            disabled={answered || lockedRef.current || !clockArmed}
                            onClick={() => pickChoice(choice.id)}
                            className={`min-h-[3.25rem] rounded-2xl border px-2.5 py-2 text-center text-[12px] font-black leading-snug shadow-sm sm:min-h-[3.5rem] sm:text-sm ${bn ? 'font-bengali' : ''} ${
                                showRight
                                    ? 'identify-grid-tile--right border-emerald-400 bg-emerald-50 text-emerald-900'
                                    : showWrong
                                        ? 'identify-grid-tile--wrong border-rose-400 bg-rose-50 text-rose-900'
                                        : 'border-slate-200/80 bg-white text-slate-800 active:scale-[0.98]'
                            }`}
                        >
                            {choice.name_bn}
                        </button>
                    );
                })}
            </div>

            {flash ? (
                <div
                    className={`identify-grid-flash pointer-events-none absolute inset-0 flex items-center justify-center ${
                        flash === 'right' ? 'identify-grid-flash--right' : 'identify-grid-flash--wrong'
                    }`}
                >
                    <span className={`rounded-full px-5 py-2 text-xl font-black text-white shadow-lg ${bn ? 'font-bengali' : ''}`}>
                        {flash === 'right' ? t.right : t.wrong}
                    </span>
                </div>
            ) : null}
        </div>
    );
}
