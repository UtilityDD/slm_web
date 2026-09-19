import React, { useEffect, useRef, useState } from 'react';
import {
    toSafetyLibraryDisplayUrl,
    handleSafetyLibraryImageError,
} from '../../utils/safetyLibraryImageUrl';
import { recordIdentifyPracticeAnswer } from '../../utils/safetyLibraryPractice';

function gridCopy(language) {
    return language === 'en'
        ? {
            ask: 'Which one is',
            right: 'Right',
            wrong: 'Wrong',
            score: 'Score',
        }
        : {
            ask: 'কোনটা?',
            right: 'ঠিক',
            wrong: 'ভুল',
            score: 'স্কোর',
        };
}

export default function IdentifyGridPractice({
    language,
    question,
    score,
    onScoreSaved,
    onAdvance,
}) {
    const t = gridCopy(language);
    const bn = language === 'bn';
    const [pickedId, setPickedId] = useState('');
    const [flash, setFlash] = useState('');
    const advanceTimer = useRef(0);
    const answered = Boolean(pickedId);
    const liveCorrect = score?.lifeCorrect ?? 0;
    const liveTotal = score?.lifeTotal ?? 0;
    const livePercent = score?.lifePercent ?? 0;

    useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

    useEffect(() => {
        window.clearTimeout(advanceTimer.current);
        setPickedId('');
        setFlash('');
    }, [question?.itemId]);

    const pickTile = (choiceId) => {
        if (answered || !question) return;
        const ok = choiceId === question.itemId;
        setPickedId(choiceId);
        setFlash(ok ? 'right' : 'wrong');
        onScoreSaved?.(recordIdentifyPracticeAnswer(ok));
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(() => onAdvance?.(question.itemId), 900);
    };

    if (!question) return null;

    return (
        <div className="identify-grid-quiz mx-auto flex w-full max-w-lg flex-col px-3 pb-4 pt-1 sm:px-4">
            <div className="mb-2">
                <div className="mb-1 flex justify-end">
                    <p className={`identify-quiz-score rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-black tabular-nums text-white shadow-sm ${bn ? 'font-bengali' : ''}`}>
                        {livePercent}% · {liveCorrect}/{liveTotal}
                    </p>
                </div>
                <p className={`text-sm font-black leading-snug text-slate-900 sm:text-base ${bn ? 'font-bengali' : ''}`}>
                    {t.ask} <span className="text-orange-600">{question.name_bn}</span>?
                </p>
            </div>

            <div className="identify-grid-board relative mx-auto w-full">
                <div
                    key={question.itemId}
                    className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 sm:gap-3"
                >
                    {question.choices.map((choice, i) => {
                        const chosen = pickedId === choice.id;
                        const showRight = answered && chosen && choice.id === question.itemId;
                        const showWrong = answered && chosen && choice.id !== question.itemId;
                        return (
                            <button
                                key={`${question.itemId}-${choice.id}`}
                                type="button"
                                disabled={answered}
                                onClick={() => pickTile(choice.id)}
                                style={{ animationDelay: `${i * 70}ms` }}
                                className={`identify-grid-tile overflow-hidden rounded-2xl border bg-white shadow-sm ${
                                    showRight ? 'identify-grid-tile--right border-emerald-400' : ''
                                } ${showWrong ? 'identify-grid-tile--wrong border-rose-400' : ''} ${
                                    !answered ? 'border-slate-200/80 active:scale-[0.98]' : 'border-slate-200/80'
                                }`}
                            >
                                <img
                                    src={toSafetyLibraryDisplayUrl(choice.image)}
                                    alt=""
                                    data-fallback-index="0"
                                    onError={(e) => handleSafetyLibraryImageError(e, choice.image)}
                                    className="h-full w-full object-contain object-center p-2 sm:p-3"
                                    draggable={false}
                                />
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
        </div>
    );
}
