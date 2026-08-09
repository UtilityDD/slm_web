import React, { useState, useEffect, useCallback } from 'react';
import {
    hasPtwPin, setPtwPin, verifyPtwPin, PTW_PIN_LEN, PIN_GATES,
} from './ptwPin';

function DotRow({ len, filled, error }) {
    return (
        <div className={`flex justify-center gap-3 ${error ? 'animate-shake' : ''}`}>
            {Array.from({ length: len }).map((_, i) => (
                <span
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                        i < filled
                            ? error
                                ? 'bg-red-500 border-red-500'
                                : 'bg-orange-500 border-orange-500 scale-110'
                            : 'bg-transparent border-slate-300 dark:border-slate-600'
                    }`}
                />
            ))}
        </div>
    );
}

function Numpad({ onDigit, onBack, disabled }) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    return (
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto w-full">
            {keys.map((k, i) => {
                if (k === '') return <span key={i} />;
                const isBack = k === '⌫';
                return (
                    <button
                        key={k + i}
                        type="button"
                        disabled={disabled}
                        onClick={() => (isBack ? onBack() : onDigit(k))}
                        className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 font-black text-xl active:scale-95 transition-transform disabled:opacity-40"
                    >
                        {k}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Full-screen PIN gate: setup (first use) or verify before a critical PTW action.
 */
export default function PinGate({ open, gate, language = 'bn', onSuccess, onCancel }) {
    const t = (en, bn) => (language === 'bn' ? bn : en);
    const setupMode = open && !hasPtwPin();

    const [phase, setPhase] = useState('enter'); // enter | confirm (setup only)
    const [digits, setDigits] = useState('');
    const [firstPin, setFirstPin] = useState('');
    const [error, setError] = useState('');

    const reset = useCallback(() => {
        setPhase('enter');
        setDigits('');
        setFirstPin('');
        setError('');
    }, []);

    useEffect(() => {
        if (open) reset();
    }, [open, gate, reset]);

    const gateLabel = gate && PIN_GATES[gate]
        ? PIN_GATES[gate][language] || PIN_GATES[gate].en
        : t('Enter your work PIN', 'আপনার কাজের PIN দিন');

    const finishSetup = (pin) => {
        const res = setPtwPin(pin);
        if (!res.ok) {
            setError(t('Could not save PIN.', 'PIN সেভ হয়নি।'));
            setDigits('');
            return;
        }
        onSuccess?.();
    };

    const finishVerify = (pin) => {
        if (verifyPtwPin(pin)) {
            onSuccess?.();
            return;
        }
        setError(t('Wrong PIN. Try again.', 'ভুল PIN। আবার চেষ্টা করুন।'));
        setDigits('');
    };

    const onFull = (pin) => {
        if (setupMode) {
            if (phase === 'enter') {
                setFirstPin(pin);
                setDigits('');
                setPhase('confirm');
                setError('');
                return;
            }
            if (pin !== firstPin) {
                setError(t('PINs do not match.', 'PIN মিলছে না।'));
                setDigits('');
                setPhase('enter');
                setFirstPin('');
                return;
            }
            finishSetup(pin);
            return;
        }
        finishVerify(pin);
    };

    const pushDigit = (d) => {
        if (digits.length >= PTW_PIN_LEN) return;
        const next = digits + d;
        setDigits(next);
        setError('');
        if (next.length === PTW_PIN_LEN) {
            setTimeout(() => onFull(next), 120);
        }
    };

    const popDigit = () => {
        setDigits(d => d.slice(0, -1));
        setError('');
    };

    if (!open) return null;

    const title = setupMode
        ? (phase === 'enter'
            ? t('Set your work PIN', 'কাজের PIN সেট করুন')
            : t('Confirm work PIN', 'কাজের PIN আবার দিন'))
        : gateLabel;

    const hint = setupMode
        ? t(`Choose ${PTW_PIN_LEN} digits. You will enter this at each safety step.`, `${PTW_PIN_LEN} সংখ্যার PIN বেছে নিন। প্রতিটি গুরুত্বপূর্ণ ধাপে লাগবে।`)
        : t('This confirms you are authorising this action.', 'এটি নিশ্চিত করে আপনি এই কাজ অনুমোদন করছেন।');

    return (
        <div className="fixed inset-0 z-[500] flex flex-col bg-slate-900/95 backdrop-blur-sm text-white native-keyboard-pad">
            <div className="flex-1 flex flex-col items-center justify-center p-6 pt-[env(safe-area-inset-top)] max-w-md mx-auto w-full">
                <div className="text-5xl mb-4">🔐</div>
                <h2 className="text-xl font-black text-center leading-tight">{title}</h2>
                <p className="text-xs font-bold text-white/60 text-center mt-2 px-4">{hint}</p>

                <div className="my-8">
                    <DotRow len={PTW_PIN_LEN} filled={digits.length} error={!!error} />
                    {error && <p className="text-red-400 font-black text-xs text-center mt-4">{error}</p>}
                </div>

                <Numpad onDigit={pushDigit} onBack={popDigit} disabled={false} />
            </div>

            {onCancel && (
                <div className="shrink-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full py-4 rounded-2xl bg-white/10 font-black text-sm active:scale-95"
                    >
                        {t('Cancel', 'বাতিল')}
                    </button>
                </div>
            )}
        </div>
    );
}
