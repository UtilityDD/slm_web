import React, { useEffect, useRef, useState } from 'react';
import { playQuizCorrectSound, playQuizWrongSound } from '../../utils/quizChoiceSounds';

/**
 * Full-pane picker: which topic was on the card just claimed as read.
 * Covers the lesson body (including done/locked names) so the answer cannot be peeked.
 * Right/wrong stays on this sheet until the user taps proceed.
 */
export default function TopicRecallSheet({ language = 'bn', choices = [], correctKey, onProceed }) {
    const bn = language === 'bn';
    const headingRef = useRef(null);
    const resultRef = useRef(null);
    const [pickedKey, setPickedKey] = useState(null);
    const isCorrect = pickedKey != null && pickedKey === correctKey;
    const hasResult = pickedKey != null;

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!hasResult) return;
        resultRef.current?.focus();
    }, [hasResult]);

    const handlePick = (key) => {
        if (pickedKey != null) return;
        setPickedKey(key);
        if (key !== correctKey) {
            playQuizWrongSound();
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 40, 50]);
            return;
        }
        playQuizCorrectSound();
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
    };

    const handleProceed = () => {
        if (!hasResult) return;
        onProceed?.({ correct: isCorrect });
    };

    return (
        <div
            className="absolute inset-x-0 bottom-0 top-14 z-[110] flex flex-col bg-[#fffdf7] sm:top-16"
            role="dialog"
            aria-modal="true"
            aria-labelledby="topic-recall-title"
        >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-7">
                <p
                    className={`text-center text-[11px] font-bold text-orange-600 sm:text-xs ${bn ? 'font-bengali' : 'uppercase tracking-wider'}`}
                >
                    {bn ? 'এক নজর' : 'Quick check'}
                </p>
                <h3
                    id="topic-recall-title"
                    ref={headingRef}
                    tabIndex={-1}
                    className={`mx-auto mt-2 max-w-md text-center text-[1.2rem] font-black leading-snug text-stone-900 outline-none sm:text-xl ${bn ? 'font-bengali leading-[1.5]' : ''}`}
                >
                    {bn
                        ? 'এই কার্ডে এইমাত্র কোন বিষয় পড়েছেন?'
                        : 'Which topic did you just read on this card?'}
                </h3>

                <div className="mx-auto mt-5 flex w-full max-w-md flex-col gap-2.5">
                    {choices.map((choice) => {
                        const selected = pickedKey === choice.key;
                        const showCorrect = hasResult && selected && isCorrect;
                        const showWrong = hasResult && selected && !isCorrect;
                        return (
                            <button
                                key={choice.key}
                                type="button"
                                disabled={hasResult}
                                onClick={() => handlePick(choice.key)}
                                className={`min-h-[48px] w-full rounded-2xl border px-4 py-3.5 text-left text-[0.95rem] font-bold leading-snug shadow-sm transition-all active:scale-[0.99] sm:text-base ${
                                    bn ? 'font-bengali' : ''
                                } ${
                                    showCorrect
                                        ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
                                        : showWrong
                                            ? 'border-red-400 bg-red-50 text-red-950'
                                            : selected
                                                ? 'border-orange-400 bg-orange-50 text-orange-950'
                                                : hasResult
                                                    ? 'border-stone-200/70 bg-white/70 text-stone-400'
                                                    : 'border-stone-200/90 bg-white text-stone-800 hover:border-orange-200 hover:bg-orange-50/60'
                                } disabled:cursor-default`}
                            >
                                {choice.label}
                            </button>
                        );
                    })}
                </div>

                {hasResult && (
                    <div className="mx-auto mt-5 flex w-full max-w-md flex-col gap-3 pb-6">
                        <div
                            ref={resultRef}
                            tabIndex={-1}
                            role="alert"
                            className={`rounded-2xl border px-4 py-3.5 text-center outline-none ${
                                isCorrect
                                    ? 'topic-recall-correct-alert border-emerald-200 bg-emerald-50'
                                    : 'topic-recall-wrong-alert border-red-400 bg-red-50'
                            }`}
                        >
                            <p
                                className={`text-[1.15rem] font-black ${
                                    bn ? 'font-bengali' : ''
                                } ${isCorrect ? 'text-emerald-900' : 'text-red-700'}`}
                            >
                                {isCorrect
                                    ? bn
                                        ? 'ঠিক'
                                        : 'Correct'
                                    : bn
                                        ? 'ঠিক নয়'
                                        : 'Not this one'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleProceed}
                            className={`min-h-[48px] w-full rounded-full px-4 py-3.5 text-center text-[15px] font-black text-white shadow-md transition-all active:scale-[0.98] ${
                                isCorrect
                                    ? 'bg-emerald-600 shadow-emerald-600/25'
                                    : 'bg-red-600 shadow-red-600/25'
                            } ${bn ? 'font-bengali' : ''}`}
                        >
                            {isCorrect
                                ? bn
                                    ? 'এগিয়ে যান'
                                    : 'Continue'
                                : bn
                                    ? 'আবার কার্ডটা দেখুন / পড়ুন'
                                    : 'Look at the card again — read it'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
