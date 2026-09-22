import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    requestIdentifyRealLaunch,
    isIdentifyHomeGiftDoneToday,
    markIdentifyHomeGiftDoneToday,
} from '../utils/identifyGiftLaunch';

const GIFT_POP_SCORES = [5, 10, 15, 20, 25, 30, 50, 80, 100];

/**
 * Gift at the cross of Home’s top four tiles.
 * Shows when `eligible` (can_play + reward window) and not done today.
 * Admin (`alwaysShow`): always visible for testing — ignores window/done flags.
 * Click → zoom → lid open → score burst → Identify real.
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
    /** idle | zoom | lid | burst */
    const [phase, setPhase] = useState('idle');
    const [pops, setPops] = useState([]);
    const [bursts, setBursts] = useState([]);
    const timers = useRef([]);
    const popSeq = useRef(0);

    const clearTimers = () => {
        timers.current.forEach((id) => window.clearTimeout(id));
        timers.current = [];
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

    useEffect(() => {
        if (!show || phase !== 'idle') {
            setPops([]);
            return undefined;
        }
        let cancelled = false;
        let spawnId = 0;
        let clearId = 0;
        const spawn = () => {
            if (cancelled) return;
            popSeq.current += 1;
            const id = popSeq.current;
            const value = GIFT_POP_SCORES[Math.floor(Math.random() * GIFT_POP_SCORES.length)];
            const lanes = [-34, -14, 14, 34];
            const drift = lanes[id % lanes.length] + Math.round(Math.random() * 8 - 4);
            setPops((prev) => [...prev.slice(-2), { id, value, drift, big: value >= 50 }]);
            clearId = window.setTimeout(() => {
                setPops((prev) => prev.filter((pop) => pop.id !== id));
            }, 2100);
            spawnId = window.setTimeout(spawn, 900 + Math.random() * 500);
        };
        spawnId = window.setTimeout(spawn, 160);
        return () => {
            cancelled = true;
            window.clearTimeout(spawnId);
            window.clearTimeout(clearId);
        };
    }, [show, phase]);

    const later = (fn, ms) => {
        const id = window.setTimeout(fn, ms);
        timers.current.push(id);
    };

    const open = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (phase !== 'idle') return;
        if (!alwaysShow) markIdentifyHomeGiftDoneToday();
        if (navigator.vibrate) navigator.vibrate([10, 18, 10, 18, 12]);
        clearTimers();
        setBursts([]);
        setPhase('zoom');
        later(() => setPhase('lid'), 220);
        later(() => {
            const values = [10, 20, 5, 50, 15, 30, 80, 25, 100, 20, 10, 50];
            setBursts(values.map((value, i) => {
                const rad = ((i / values.length) * 360 + (Math.random() * 18 - 9)) * (Math.PI / 180);
                const dist = 118 + Math.round(Math.random() * 96);
                return {
                    id: i,
                    value,
                    big: value >= 50,
                    dx: Math.round(Math.cos(rad) * dist),
                    dy: Math.round(Math.sin(rad) * dist - 28),
                    delay: 40 + i * 48,
                };
            }));
            setPhase('burst');
        }, 500);
        later(() => {
            requestIdentifyRealLaunch();
            onOpen?.();
        }, 1480);
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

    const face = (side) => (
        <span className={`identify-gift-x__face identify-gift-x__face--${side}`}>
            <span className="identify-gift-x__ribbon-v" />
            <span className="identify-gift-x__ribbon-h" />
        </span>
    );

    const box = (
        <span className="identify-gift-x__box" aria-hidden>
            <span className="identify-gift-x__scene">
                <span className="identify-gift-x__spin">
                    <span className="identify-gift-x__lid">
                        <span className="identify-gift-x__lid-cap" />
                        <span className="identify-gift-x__lid-under" />
                        <span className="identify-gift-x__lid-rim identify-gift-x__lid-rim--front" />
                        <span className="identify-gift-x__lid-rim identify-gift-x__lid-rim--back" />
                        <span className="identify-gift-x__lid-rim identify-gift-x__lid-rim--left" />
                        <span className="identify-gift-x__lid-rim identify-gift-x__lid-rim--right" />
                        <span className="identify-gift-x__bow" />
                    </span>
                    <span className="identify-gift-x__mouth" />
                    <span className="identify-gift-x__body">
                        {face('front')}
                        {face('back')}
                        {face('left')}
                        {face('right')}
                    </span>
                </span>
            </span>
        </span>
    );

    const idleNode = (
        <div className="identify-gift-x identify-gift-x--idle">
            <span className="identify-gift-x__halo" aria-hidden />
            <span className="identify-gift-x__spark identify-gift-x__spark--a" aria-hidden />
            <span className="identify-gift-x__spark identify-gift-x__spark--b" aria-hidden />
            <span className="identify-gift-x__spark identify-gift-x__spark--c" aria-hidden />
            <span className="identify-gift-x__pops" aria-hidden>
                {pops.map((pop) => (
                    <span
                        key={pop.id}
                        className={`identify-gift-x__pop${pop.big ? ' identify-gift-x__pop--big' : ''}`}
                        style={{ '--pop-drift': `${pop.drift}px` }}
                    >
                        +{pop.value}
                    </span>
                ))}
            </span>
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
                </div>
                <div className="identify-gift-stage__burst" aria-hidden>
                    {bursts.map((pop) => (
                        <span
                            key={pop.id}
                            className={`identify-gift-x__pop${pop.big ? ' identify-gift-x__pop--big' : ''} identify-gift-stage__burst-pop`}
                            style={{
                                '--pop-dx': `${pop.dx}px`,
                                '--pop-dy': `${pop.dy}px`,
                                '--pop-delay': `${pop.delay}ms`,
                            }}
                        >
                            +{pop.value}
                        </span>
                    ))}
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
