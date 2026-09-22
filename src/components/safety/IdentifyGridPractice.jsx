import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    toSafetyLibraryDisplayUrl,
    handleSafetyLibraryImageError,
} from '../../utils/safetyLibraryImageUrl';
import { recordIdentifyPracticeAnswer, practiceClueAsk } from '../../utils/safetyLibraryPractice';

function gridCopy(language) {
    return language === 'en'
        ? {
            ask: 'Which one is',
            right: 'Right',
            wrong: 'Wrong',
            score: 'Score',
        }
        : {
            ask: 'কোনটা',
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
    /** When set, show description clue instead of the item name. */
    clueText = '',
    persistLocalScore = true,
    /** Real-mode: parent owns advance; called once with correct boolean. */
    onAnswered,
    headerExtra = null,
    hideDefaultScore = false,
    /** When controlled by parent (timeout), lock tiles. */
    externalAnswered,
    /** Timed run: wait for all four photos before taps count. */
    lockChoices = false,
    waitLabel = '',
}) {
    const t = gridCopy(language);
    const bn = language === 'bn';
    const [pickedId, setPickedId] = useState('');
    const [flash, setFlash] = useState('');
    const [boardPx, setBoardPx] = useState(0);
    const fitRef = useRef(null);
    const advanceTimer = useRef(0);
    const answered = Boolean(pickedId) || Boolean(externalAnswered);
    const liveCorrect = score?.lifeCorrect ?? 0;
    const liveTotal = score?.lifeTotal ?? 0;
    const livePercent = score?.lifePercent ?? 0;
    const isClue = Boolean(clueText);
    const clueAsk = isClue ? practiceClueAsk(question?.category, language) : '';

    useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

    useEffect(() => {
        window.clearTimeout(advanceTimer.current);
        setPickedId('');
        setFlash('');
    }, [question?.itemId, clueText]);

    useLayoutEffect(() => {
        const el = fitRef.current;
        if (!el) return undefined;

        const measure = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            if (w <= 0 || h <= 0) return;
            setBoardPx(Math.floor(Math.min(w, h)));
        };

        measure();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        ro?.observe(el);
        window.addEventListener('resize', measure);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [isClue]);

    const pickTile = (choiceId) => {
        if (answered || lockChoices || !question) return;
        const ok = choiceId === question.itemId;
        setPickedId(choiceId);
        setFlash(ok ? 'right' : 'wrong');
        if (persistLocalScore) {
            onScoreSaved?.(recordIdentifyPracticeAnswer(ok));
        }
        if (typeof onAnswered === 'function') {
            onAnswered(ok);
            return;
        }
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(() => onAdvance?.(question.itemId), 900);
    };

    if (!question) return null;

    return (
        <div className="identify-grid-quiz mx-auto flex h-full min-h-0 w-full max-w-lg min-w-0 flex-col overflow-hidden px-2 pt-1 sm:px-3">
            <div className="mb-1.5 shrink-0">
                {headerExtra}
                {!hideDefaultScore ? (
                    <div className="mb-1 flex justify-end">
                        <p className={`identify-quiz-score rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-black tabular-nums text-white shadow-sm ${bn ? 'font-bengali' : ''}`}>
                            {livePercent}% · {liveCorrect}/{liveTotal}
                        </p>
                    </div>
                ) : null}
                {isClue ? (
                    <div className="space-y-1.5">
                        <p className={`text-xs font-bold leading-snug text-slate-800 sm:text-sm ${bn ? 'font-bengali' : ''}`}>{clueAsk}</p>
                        <p className={`line-clamp-4 rounded-xl border border-amber-100 bg-amber-50/90 px-2.5 py-2 text-[12px] font-medium leading-snug text-slate-700 sm:text-[13px] ${bn ? 'font-bengali' : ''}`}>
                            {clueText}
                        </p>
                    </div>
                ) : (
                    <p className={`text-sm font-black leading-snug text-slate-900 sm:text-base ${bn ? 'font-bengali' : ''}`}>
                        {t.ask} <span className="text-orange-600">{question.name_bn}</span>?
                    </p>
                )}
            </div>

            <div ref={fitRef} className="identify-grid-fit min-h-0 min-w-0 w-full flex-1 overflow-hidden">
                <div
                    className="identify-grid-board relative mx-auto overflow-hidden"
                    style={boardPx > 0 ? { width: boardPx, height: boardPx } : { width: '100%', maxWidth: '100%', aspectRatio: '1' }}
                >
                    <div
                        key={question.itemId}
                        className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1.5 sm:gap-2"
                    >
                        {question.choices.map((choice, i) => {
                            const chosen = pickedId === choice.id;
                            const showRight = answered && chosen && choice.id === question.itemId;
                            const showWrong = answered && chosen && choice.id !== question.itemId;
                            return (
                                <button
                                    key={`${question.itemId}-${choice.id}`}
                                    type="button"
                                    disabled={answered || lockChoices}
                                    onClick={() => pickTile(choice.id)}
                                    style={{ animationDelay: `${i * 70}ms` }}
                                    className={`identify-grid-tile min-h-0 min-w-0 overflow-hidden rounded-xl border bg-white shadow-sm sm:rounded-2xl ${
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
                                        className="h-full w-full object-contain object-center p-1.5 sm:p-2.5"
                                        draggable={false}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    {waitLabel ? (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                            <p className={`rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-500 shadow-sm ${bn ? 'font-bengali' : ''}`}>
                                {waitLabel}
                            </p>
                        </div>
                    ) : null}

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
        </div>
    );
}
