import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    requestIdentifyRealLaunch,
    isIdentifyHomeGiftDoneToday,
    markIdentifyHomeGiftDoneToday,
} from '../utils/identifyGiftLaunch';

/**
 * Gift at the cross of Home’s top four tiles.
 * Shows when `eligible` (can_play + reward window) and not done today.
 * Admin (`alwaysShow`): always visible for testing — ignores window/done flags.
 * Click → zoom → lid → counter → Identify real.
 */
export default function IdentifyScoreGiftFab({
    language = 'bn',
    eligible = false,
    alwaysShow = false,
    visible = true,
    onOpen,
}) {
    const bn = language === 'bn';
    const [show, setShow] = useState(false);
    /** idle | zoom | lid | count */
    const [phase, setPhase] = useState('idle');
    const [counter, setCounter] = useState(0);
    const timers = useRef([]);
    const countRaf = useRef(0);

    const clearTimers = () => {
        timers.current.forEach((id) => window.clearTimeout(id));
        timers.current = [];
        if (countRaf.current) {
            window.cancelAnimationFrame(countRaf.current);
            countRaf.current = 0;
        }
    };

    useEffect(() => () => clearTimers(), []);

    useEffect(() => {
        if (!visible) {
            setShow(false);
            return undefined;
        }
        if (alwaysShow) {
            setShow(true);
            return undefined;
        }
        if (!eligible || isIdentifyHomeGiftDoneToday()) {
            setShow(false);
            return undefined;
        }
        const timer = window.setTimeout(() => setShow(true), 1600);
        return () => window.clearTimeout(timer);
    }, [visible, eligible, alwaysShow]);

    const later = (fn, ms) => {
        const id = window.setTimeout(fn, ms);
        timers.current.push(id);
    };

    const startCounter = () => {
        const started = performance.now();
        const duration = 2200;
        let lastPaint = 0;
        const tick = (now) => {
            const t = Math.min(1, (now - started) / duration);
            if (now - lastPaint >= 55 || t >= 1) {
                lastPaint = now;
                const chaos = Math.floor(100 + Math.random() * 899);
                setCounter(chaos);
            }
            if (t < 1) {
                countRaf.current = window.requestAnimationFrame(tick);
            } else {
                setCounter(888);
                later(() => {
                    requestIdentifyRealLaunch();
                    onOpen?.();
                }, 400);
            }
        };
        countRaf.current = window.requestAnimationFrame(tick);
    };

    const open = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (phase !== 'idle') return;
        if (!alwaysShow) markIdentifyHomeGiftDoneToday();
        if (navigator.vibrate) navigator.vibrate([12, 28, 12, 28, 18]);
        clearTimers();
        setPhase('zoom');
        later(() => setPhase('lid'), 380);
        later(() => {
            setPhase('count');
            startCounter();
        }, 720);
    };

    const dismiss = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (phase !== 'idle') return;
        if (alwaysShow) {
            // Admin preview: hide for this Home visit only; comes back next mount.
            setShow(false);
            return;
        }
        markIdentifyHomeGiftDoneToday();
        setShow(false);
    };

    if (!show) return null;

    const box = (
        <span className="identify-gift-x__box" aria-hidden>
            <span className="identify-gift-x__lid">
                <span className="identify-gift-x__lid-face" />
                <span className="identify-gift-x__bow" />
            </span>
            <span className="identify-gift-x__body">
                <span className="identify-gift-x__ribbon-v" />
                <span className="identify-gift-x__ribbon-h" />
            </span>
            {phase === 'count' ? (
                <span className="identify-gift-x__counter" aria-hidden>
                    {String(counter).padStart(3, '0')}
                </span>
            ) : null}
        </span>
    );

    const idleNode = (
        <div className="identify-gift-x identify-gift-x--idle">
            <span className="identify-gift-x__halo" aria-hidden />
            <span className="identify-gift-x__plate" aria-hidden />
            <button
                type="button"
                className="identify-gift-x__hit"
                onClick={open}
                aria-label={bn ? 'উপহার খুলুন' : 'Open gift'}
            >
                {box}
            </button>
            <button
                type="button"
                className="identify-gift-x__dismiss"
                onClick={dismiss}
                aria-label={bn ? 'পরে' : 'Later'}
            />
        </div>
    );

    const stageNode = phase !== 'idle' && typeof document !== 'undefined'
        ? createPortal(
            <div className={`identify-gift-stage identify-gift-stage--${phase}`} role="dialog" aria-modal="true">
                <div className="identify-gift-stage__shade" />
                <div className="identify-gift-stage__focus">
                    {box}
                    {phase === 'count' ? (
                        <p className={`identify-gift-stage__hint ${bn ? 'font-bengali' : ''}`}>
                            {bn ? 'স্কোর লোড হচ্ছে…' : 'Loading score…'}
                        </p>
                    ) : null}
                </div>
            </div>,
            document.body
        )
        : null;

    return (
        <>
            {phase === 'idle' ? idleNode : null}
            {stageNode}
        </>
    );
}
