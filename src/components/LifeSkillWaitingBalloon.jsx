import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    LIFE_SKILL_MONTHLY_BONUS_POINTS,
    CORE_LESSON_MONTHLY_BONUS_POINTS,
} from '../utils/trainingLessonIds';
import { playBalloonBurstSound } from '../utils/quizChoiceSounds';

const ADMIN_PREVIEW_LS = 3;
const ADMIN_PREVIEW_LESSON = 7;

function bnDigits(n) {
    return String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
}

function pointsFromCount(count, per) {
    return Math.max(0, Number(count) || 0) * per;
}

function plusLabel(points, bn) {
    const n = Math.max(0, Number(points) || 0);
    return `+${bn ? bnDigits(n) : n}`;
}

/**
 * 3D balloon with total waiting points (lessons + Life Skill).
 * Tap opens a small card; each row opens its page.
 */
export default function LifeSkillWaitingBalloon({
    language = 'bn',
    lifeSkillCount = 0,
    lessonCount = 0,
    alwaysShow = false,
    giftBlocking = false,
    visible = true,
    sleepCover = false,
    onOpenLessons,
    onOpenLifeSkill,
}) {
    const bn = language === 'bn';
    const [show, setShow] = useState(false);
    const [phase, setPhase] = useState('idle'); // idle | burst | sheet
    const burstTimer = useRef(0);

    const liveLs = alwaysShow && lifeSkillCount < 1 ? ADMIN_PREVIEW_LS : lifeSkillCount;
    const liveLesson = alwaysShow && lessonCount < 1 ? ADMIN_PREVIEW_LESSON : lessonCount;
    const lsPoints = pointsFromCount(liveLs, LIFE_SKILL_MONTHLY_BONUS_POINTS);
    const lessonPoints = pointsFromCount(liveLesson, CORE_LESSON_MONTHLY_BONUS_POINTS);
    const totalPoints = lsPoints + lessonPoints;
    const scoreLabel = `+${totalPoints}`;
    const realTotal = lifeSkillCount + lessonCount;

    useEffect(() => {
        if (!visible || sleepCover || giftBlocking) {
            setShow(false);
            setPhase('idle');
            return undefined;
        }
        if (alwaysShow || realTotal > 0) {
            const timer = window.setTimeout(() => setShow(true), alwaysShow ? 700 : 900);
            return () => window.clearTimeout(timer);
        }
        setShow(false);
        setPhase('idle');
        return undefined;
    }, [visible, sleepCover, giftBlocking, alwaysShow, realTotal]);

    useEffect(() => () => window.clearTimeout(burstTimer.current), []);

    if ((!show && phase !== 'sheet') || typeof document === 'undefined') return null;

    const openSheet = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (phase !== 'idle') return;
        if (navigator.vibrate) navigator.vibrate([8, 20, 10]);
        playBalloonBurstSound();
        setPhase('burst');
        window.clearTimeout(burstTimer.current);
        burstTimer.current = window.setTimeout(() => setPhase('sheet'), 420);
    };

    const closeSheet = () => {
        setPhase('idle');
    };

    const goLessons = () => {
        setPhase('idle');
        if (typeof onOpenLessons === 'function') onOpenLessons();
        else window.location.hash = '/training';
    };

    const goLifeSkill = () => {
        setPhase('idle');
        if (typeof onOpenLifeSkill === 'function') onOpenLifeSkill();
        else window.location.hash = '/training?tab=supplementary';
    };

    return createPortal(
        <>
            {show && phase !== 'sheet' ? (
                <div className={`life-skill-balloon${phase === 'burst' ? ' life-skill-balloon--burst' : ''}`} role="presentation">
                    <button
                        type="button"
                        className="life-skill-balloon__hit"
                        onClick={openSheet}
                        disabled={phase === 'burst'}
                        aria-label={
                            bn
                                ? `${scoreLabel} পয়েন্ট এখন নিতে পারেন`
                                : `${scoreLabel} points ready to claim`
                        }
                    >
                        <span className="life-skill-balloon__bob" aria-hidden>
                            <span className="life-skill-balloon__orb">
                                <span className="life-skill-balloon__shine" />
                                <span className="life-skill-balloon__face">
                                    {scoreLabel}
                                </span>
                            </span>
                            <span className="life-skill-balloon__knot" />
                        </span>
                        <span className="life-skill-balloon__string" aria-hidden />
                        <span className="life-skill-balloon__burst" aria-hidden>
                            <span /><span /><span /><span /><span /><span />
                        </span>
                    </button>
                </div>
            ) : null}

            {phase === 'sheet' ? (
                <div className="score-wait-sheet">
                    <button
                        type="button"
                        className="score-wait-sheet__shade"
                        aria-label={bn ? 'বন্ধ' : 'Close'}
                        onClick={closeSheet}
                    />
                    <div className="score-wait-sheet__card" role="dialog" aria-modal="true">
                        <p className={`score-wait-sheet__title ${bn ? 'font-bengali' : ''}`}>
                            {bn ? 'এখন নিতে পারেন' : 'Ready to claim'}
                        </p>
                        <p className={`score-wait-sheet__total ${bn ? 'font-bengali' : ''}`}>
                            {scoreLabel}
                        </p>
                        <button
                            type="button"
                            className="score-wait-sheet__row"
                            onClick={goLessons}
                        >
                            <span className="score-wait-sheet__icon" aria-hidden>📖</span>
                            <span className="score-wait-sheet__copy">
                                <span className={`score-wait-sheet__name ${bn ? 'font-bengali' : ''}`}>
                                    {bn ? 'পাঠ' : 'Lessons'}
                                </span>
                                <span className={`score-wait-sheet__hint ${bn ? 'font-bengali' : ''}`}>
                                    {bn ? 'পড়া থেকে' : 'From reading'}
                                </span>
                            </span>
                            <span className={`score-wait-sheet__pts ${bn ? 'font-bengali' : ''}`}>
                                {plusLabel(lessonPoints, bn)}
                            </span>
                        </button>
                        <button
                            type="button"
                            className="score-wait-sheet__row score-wait-sheet__row--ls"
                            onClick={goLifeSkill}
                        >
                            <span className="score-wait-sheet__icon" aria-hidden>⭐</span>
                            <span className="score-wait-sheet__copy">
                                <span className={`score-wait-sheet__name ${bn ? 'font-bengali' : ''}`}>
                                    {bn ? 'লাইফ স্কিল' : 'Life Skill'}
                                </span>
                                <span className={`score-wait-sheet__hint ${bn ? 'font-bengali' : ''}`}>
                                    {bn ? 'লাইফ স্কিল থেকে' : 'From Life Skill'}
                                </span>
                            </span>
                            <span className={`score-wait-sheet__pts ${bn ? 'font-bengali' : ''}`}>
                                {plusLabel(lsPoints, bn)}
                            </span>
                        </button>
                    </div>
                </div>
            ) : null}
        </>,
        document.body
    );
}
