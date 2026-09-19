import React, { useEffect, useRef, useState } from 'react';
import {
    toSafetyLibraryDisplayUrl,
    handleSafetyLibraryImageError,
} from '../../utils/safetyLibraryImageUrl';
import {
    buildIdentifyPracticeQuestion,
    nextIdentifyPracticeMode,
    recordIdentifyPracticeAnswer,
} from '../../utils/safetyLibraryPractice';
import IdentifyGridPractice from './IdentifyGridPractice';

function practiceCopy(language) {
    return language === 'en'
        ? {
            prompt: 'Name?',
            empty: 'Nothing here to try yet',
            right: 'Right',
            wrong: 'Wrong',
            score: 'Score',
        }
        : {
            prompt: 'নাম কী?',
            empty: 'চেনার মতো ছবি নেই',
            right: 'ঠিক',
            wrong: 'ভুল',
            score: 'স্কোর',
        };
}

export default function IdentifyPractice({
    language,
    items,
    onScoreSaved,
    score,
}) {
    const t = practiceCopy(language);
    const bn = language === 'bn';
    const recentModes = useRef([]);
    const [mode, setMode] = useState(() => {
        const first = nextIdentifyPracticeMode([]);
        recentModes.current = [first];
        return first;
    });
    const [question, setQuestion] = useState(() => buildIdentifyPracticeQuestion(items));
    const [pickedId, setPickedId] = useState('');
    const [flash, setFlash] = useState('');
    const advanceTimer = useRef(0);
    const answered = Boolean(pickedId);
    const liveCorrect = score?.lifeCorrect ?? 0;
    const liveTotal = score?.lifeTotal ?? 0;
    const livePercent = score?.lifePercent ?? 0;

    useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

    const goNext = (fromItemId) => {
        const nextMode = nextIdentifyPracticeMode(recentModes.current);
        recentModes.current = [...recentModes.current, nextMode].slice(-2);
        setMode(nextMode);
        setQuestion(buildIdentifyPracticeQuestion(items, fromItemId));
        setPickedId('');
        setFlash('');
    };

    const pickChoice = (choiceId) => {
        if (answered || !question) return;
        const ok = choiceId === question.itemId;
        setPickedId(choiceId);
        setFlash(ok ? 'right' : 'wrong');
        onScoreSaved?.(recordIdentifyPracticeAnswer(ok));
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(() => goNext(question.itemId), 900);
    };

    if (!question) {
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-4 py-10 text-center">
                <p className={`text-sm font-black text-slate-600 ${bn ? 'font-bengali' : ''}`}>{t.empty}</p>
            </div>
        );
    }

    if (mode === 'grid') {
        return (
            <IdentifyGridPractice
                language={language}
                question={question}
                score={score}
                onScoreSaved={onScoreSaved}
                onAdvance={goNext}
            />
        );
    }

    return (
        <div className="identify-name-quiz relative mx-auto flex w-full max-w-lg flex-col px-3 pb-4 pt-1 sm:px-4">
            <div className="mb-2">
                <div className="mb-1 flex justify-end">
                    <p className={`identify-quiz-score rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-black tabular-nums text-white shadow-sm ${bn ? 'font-bengali' : ''}`}>
                        {livePercent}% · {liveCorrect}/{liveTotal}
                    </p>
                </div>
                <p className={`text-sm font-black leading-snug text-slate-900 sm:text-base ${bn ? 'font-bengali' : ''}`}>{t.prompt}</p>
            </div>

            <div
                key={question.itemId}
                className="identify-name-photo relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm animate-quiz-question-in"
            >
                <img
                    src={toSafetyLibraryDisplayUrl(question.image)}
                    alt=""
                    data-fallback-index="0"
                    onError={(e) => handleSafetyLibraryImageError(e, question.image)}
                    className="h-full w-full object-contain object-center p-3"
                />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
                {question.choices.map((choice) => {
                    const chosen = pickedId === choice.id;
                    const showRight = answered && chosen && choice.id === question.itemId;
                    const showWrong = answered && chosen && choice.id !== question.itemId;
                    return (
                        <button
                            key={choice.id}
                            type="button"
                            disabled={answered}
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
