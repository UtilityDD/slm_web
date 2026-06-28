import React, { useState, useEffect } from 'react';
import useSafetyVoice from './useSafetyVoice';
import {
    rememberPreset,
    createPermit, logEntry,
    loadActivePermit, saveActivePermit,
    loadHistory, saveToHistory, deleteFromHistory,
    GROUNDING_ITEMS, CLOSEOUT_ITEMS,
    buildMessage, permitToText,
} from './clearanceData';
import ClearanceSetup from './ClearanceSetup';
import PinGate from './PinGate';
import usePinGate from './usePinGate';
import {
    operatorIsolateRequestLink,
    operatorReenergizeRequestLink,
    appendAppLink,
} from './clearanceLinks';

const PENDING_ACK_KEY = 'slm_pending_lineman_ack';

function storePendingAck(ack) {
    try {
        if (ack?.role === 'lm') sessionStorage.setItem(PENDING_ACK_KEY, JSON.stringify(ack));
    } catch (e) { /* noop */ }
}

function loadPendingAck() {
    try {
        const raw = sessionStorage.getItem(PENDING_ACK_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function clearPendingAck() {
    try { sessionStorage.removeItem(PENDING_ACK_KEY); } catch (e) { /* noop */ }
}

/** Strip pre-fix codes from old permits so lineman cannot self-verify. */
function sanitizePermit(p) {
    if (!p) return p;
    const next = { ...p };
    if (!next.operatorIssuedIsolate && next.confirmCode) {
        next.confirmCode = null;
    }
    if (!next.operatorIssuedRelease && next.releaseCode) {
        next.releaseCode = null;
    }
    return next;
}

function operatorIssuedCode(permit, kind) {
    if (!permit) return null;
    if (kind === 'isolate') {
        return permit.operatorIssuedIsolate ? permit.confirmCode : (loadPendingAck()?.act === 'iso' && loadPendingAck()?.permitNo === permit.permitNo ? loadPendingAck().confirmCode : null);
    }
    return permit.operatorIssuedRelease ? permit.releaseCode : (loadPendingAck()?.act === 'ren_ok' && loadPendingAck()?.permitNo === permit.permitNo ? loadPendingAck().releaseCode : null);
}

const STEP_ORDER = ['request', 'isolate', 'ground', 'brief', 'work', 'closeout', 'reenergize', 'done'];

const STEP_META = {
    request: {
        title: { en: 'Request Shutdown', bn: 'শাটডাউন অনুরোধ' },
        bg: 'from-orange-600 to-orange-500',
        instruction: {
            en: 'Send the shutdown request to the substation operator. Then call to confirm.',
            bn: 'সাবস্টেশন অপারেটরকে শাটডাউন অনুরোধ পাঠান। তারপর ফোন করে নিশ্চিত করুন।',
        },
    },
    isolate: {
        title: { en: 'Confirm Isolated', bn: 'আইসোলেশন নিশ্চিত' },
        bg: 'from-purple-600 to-purple-500',
        instruction: {
            en: 'When the operator says the line is isolated, ask them to read back the confirm code, then enter it.',
            bn: 'অপারেটর লাইন আইসোলেট করার কথা বললে, কনফার্ম কোডটি পড়ে শোনাতে বলুন এবং এখানে লিখুন।',
        },
    },
    ground: {
        title: { en: 'Test Dead & Earth', bn: 'মৃত পরীক্ষা ও আর্থিং' },
        bg: 'from-blue-700 to-blue-600',
        instruction: {
            en: 'Never trust, always test. Confirm the line is dead, discharge it, and apply earthing on both sides.',
            bn: 'কখনো বিশ্বাস নয়, সবসময় পরীক্ষা করুন। লাইন মৃত নিশ্চিত করে ডিসচার্জ করুন এবং দুই দিকে আর্থিং লাগান।',
        },
    },
    brief: {
        title: { en: 'Brief the Crew', bn: 'কর্মীদের ব্রিফ করুন' },
        bg: 'from-teal-600 to-teal-500',
        instruction: {
            en: 'Tell every fellow worker the line is isolated and earthed. Assign an observer. Confirm all are clear.',
            bn: 'প্রত্যেক সহকর্মীকে জানান লাইন আইসোলেট ও আর্থ করা হয়েছে। একজন অবজার্ভার নিযুক্ত করুন। সবাই নিরাপদ নিশ্চিত করুন।',
        },
    },
    work: {
        title: { en: 'Work in Progress', bn: 'কাজ চলছে' },
        bg: 'from-amber-600 to-amber-500',
        instruction: {
            en: 'Stay focused. Keep earthing in place until the work is fully finished.',
            bn: 'মনোযোগ দিয়ে কাজ করুন। কাজ পুরো শেষ না হওয়া পর্যন্ত আর্থিং খুলবেন না।',
        },
    },
    closeout: {
        title: { en: 'Finish & Clear', bn: 'সমাপ্তি ও পরিষ্কার' },
        bg: 'from-emerald-700 to-emerald-600',
        instruction: {
            en: 'Work done. Count tools, clear the crew, and REMOVE all earthing before releasing the line.',
            bn: 'কাজ শেষ। সরঞ্জাম গুনুন, কর্মীদের সরান এবং লাইন ছাড়ার আগে সব আর্থিং সরান।',
        },
    },
    reenergize: {
        title: { en: 'Release & Re-energize', bn: 'রিলিজ ও চালু' },
        bg: 'from-rose-600 to-rose-500',
        instruction: {
            en: 'Cancel the permit and tell the operator it is safe to re-energize. Get the release code read back.',
            bn: 'পারমিট বাতিল করুন এবং অপারেটরকে জানান লাইন চালু করা নিরাপদ। রিলিজ কোড পড়ে শোনাতে বলুন।',
        },
    },
    done: {
        title: { en: 'Permit Closed', bn: 'পারমিট বন্ধ' },
        bg: 'from-green-600 to-green-500',
        instruction: {
            en: 'Permit closed and logged. Great job staying safe.',
            bn: 'পারমিট বন্ধ ও লগ করা হয়েছে। নিরাপদ থাকার জন্য ধন্যবাদ।',
        },
    },
};

const buzz = (pattern) => { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* noop */ } };
const openSms = (phone, body) => { window.location.href = `sms:${phone || ''}?body=${encodeURIComponent(body)}`; };
const openCall = (phone) => { if (phone) window.location.href = `tel:${phone}`; };
const shareOrSms = async (phone, body) => {
    if (navigator.share) {
        try { await navigator.share({ text: body }); return; } catch (e) { /* fall through */ }
    }
    openSms(phone, body);
};
function StepIntro({ text, onReplay }) {
    return (
        <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <div className="text-2xl shrink-0">🗣️</div>
            <p className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{text}</p>
            <button onClick={onReplay} className="shrink-0 text-orange-600 text-xl active:scale-90 transition-transform">🔊</button>
        </div>
    );
}

function CommsRow({ phone, body, t, onRead }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            <button onClick={() => openSms(phone, body)} className="py-4 rounded-2xl bg-emerald-600 text-white font-black text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">💬 {t('SMS', 'এসএমএস')}</button>
            <button onClick={() => openCall(phone)} className="py-4 rounded-2xl bg-blue-600 text-white font-black text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">📞 {t('Call', 'ফোন')}</button>
            <button onClick={onRead} className="py-4 rounded-2xl bg-slate-800 text-white font-black text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">🔊 {t('Read aloud', 'পড়ে শোনাও')}</button>
            <button onClick={() => shareOrSms(phone, body)} className="py-4 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-black text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">📤 {t('Share', 'শেয়ার')}</button>
        </div>
    );
}

function NavRow({ onBack, onNext, nextLabel, colorClass, t }) {
    return (
        <div className="flex gap-3 pt-2">
            <button onClick={onBack} className="w-28 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-tight active:scale-95 transition-transform">{t('Back', 'পিছনে')}</button>
            <button onClick={onNext} className={`flex-1 py-4 rounded-2xl text-white font-black text-sm active:scale-95 transition-transform ${colorClass}`}>{nextLabel}</button>
        </div>
    );
}

function CheckItem({ item, checked, language, onToggle, accent }) {
    return (
        <button
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-5 rounded-[1.75rem] border-2 transition-all active:scale-95 ${
                checked ? `${accent.on} text-white` : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
            }`}
        >
            <div className="flex items-center gap-4">
                <div className="text-2xl">{item.icon}</div>
                <span className="font-black uppercase tracking-tight text-xs text-left leading-tight">{item.label[language]}</span>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${checked ? 'bg-white/25 scale-110' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {checked ? '✓' : ''}
            </div>
        </button>
    );
}

export default function LineClearance({ language = 'bn', onClose, linemanAck = null }) {
    const t = (en, bn) => (language === 'bn' ? bn : en);
    const { isSpeaking, playAudio, stopAllAudio, playAlertSound } = useSafetyVoice(language);

    const [permit, setPermit] = useState(null);
    const [view, setView] = useState('flow'); // 'flow' | 'history'
    const [history, setHistory] = useState([]);

    const [codeInput, setCodeInput] = useState('');
    const [codeError, setCodeError] = useState(false);
    const [appAckNotice, setAppAckNotice] = useState('');
    const { requestPin, pinGateProps } = usePinGate();

    // Resume any in-progress permit + load history (offline-safe)
    useEffect(() => {
        setHistory(loadHistory());
        const active = sanitizePermit(loadActivePermit());
        if (active) setPermit(active);
    }, []);

    // Store operator app ack from SMS link (may arrive before lineman reaches verify step)
    useEffect(() => {
        if (linemanAck?.role === 'lm') storePendingAck(linemanAck);
    }, [linemanAck]);

    const applyAck = (ack, p) => {
        if (!ack || !p || ack.permitNo !== p.permitNo) return;
        if (ack.act === 'iso' && ack.confirmCode && (p.stepId === 'isolate' || p.stepId === 'request')) {
            setPermit(prev => (prev && prev.permitNo === ack.permitNo ? {
                ...prev,
                confirmCode: ack.confirmCode,
                operatorIssuedIsolate: true,
            } : prev));
            setCodeInput(String(ack.confirmCode));
            setAppAckNotice(language === 'bn' ? 'অপারেটর নিশ্চিত — কোড পেয়েছেন' : 'Operator confirmed — code received');
            clearPendingAck();
        }
        if (ack.act === 'ren_ok' && ack.releaseCode && p.stepId === 'reenergize') {
            setPermit(prev => (prev && prev.permitNo === ack.permitNo ? {
                ...prev,
                releaseCode: ack.releaseCode,
                operatorIssuedRelease: true,
            } : prev));
            setCodeInput(String(ack.releaseCode));
            setAppAckNotice(language === 'bn' ? 'অপারেটর নিশ্চিত — কোড পেয়েছেন' : 'Operator confirmed — code received');
            clearPendingAck();
        }
    };

    // Apply operator app confirmation link (pre-fill code; lineman still taps Verify)
    useEffect(() => {
        const ack = linemanAck?.role === 'lm' ? linemanAck : loadPendingAck();
        if (permit) applyAck(ack, permit);
    }, [linemanAck, permit, language, permit?.stepId]);

    const smsBody = (kind) => {
        const text = buildMessage(kind, permit, language);
        if (kind === 'request') {
            return appendAppLink(text, operatorIsolateRequestLink(permit, permit.linemanPhone), language);
        }
        if (kind === 'reenergize') {
            return appendAppLink(text, operatorReenergizeRequestLink(permit, permit.linemanPhone), language);
        }
        return text;
    };

    // Persist active permit continuously so a crash/refresh can resume
    useEffect(() => {
        saveActivePermit(permit && permit.status === 'open' ? permit : null);
    }, [permit]);

    const stepId = permit ? permit.stepId : 'setup';
    const meta = STEP_META[stepId] || { title: { en: 'Lineman', bn: 'লাইনম্যান' }, bg: 'from-slate-800 to-slate-700', instruction: { en: '', bn: '' } };
    const stepNum = STEP_ORDER.indexOf(stepId) + 1;

    // Voice guidance on step change
    useEffect(() => {
        if (view === 'flow' && STEP_META[stepId]) {
            playAudio(STEP_META[stepId].instruction[language], `clearance_${stepId}.wav`);
        }
    }, [stepId, view, language, playAudio]);

    const replay = () => playAudio(meta.instruction[language], `clearance_${stepId}.wav`);

    /* ------------------------------- mutations ------------------------------ */

    const appendLog = (action, detail = {}) =>
        setPermit(p => (p ? { ...p, log: [...p.log, logEntry(action, detail)] } : p));

    const goStep = (nextId, action, detail = {}) => {
        stopAllAudio();
        setCodeInput('');
        setCodeError(false);
        setPermit(p => (p ? { ...p, stepId: nextId, log: [...p.log, logEntry(action, detail)] } : p));
        buzz(40);
    };

    const createAndStart = (job) => {
        const newPermit = createPermit(job);
        newPermit.log.push(logEntry('pin_verified', { gate: 'start_permit' }));
        rememberPreset('feeders', newPermit.job.feeder);
        if (job.operator && job.operator.phone) rememberPreset('operators', job.operator);
        (job.crew || []).forEach(c => rememberPreset('crew', c));
        setPermit(newPermit);
        buzz(40);
    };

    const setGround = (id) => setPermit(p => ({ ...p, grounding: { ...p.grounding, [id]: !p.grounding[id] } }));
    const setCloseout = (id) => setPermit(p => ({ ...p, closeout: { ...p.closeout, [id]: !p.closeout[id] } }));
    const setFlag = (id) => setPermit(p => ({ ...p, flags: { ...(p.flags || {}), [id]: !(p.flags || {})[id] } }));

    const verifyCode = (expected, nextId, action) => {
        if (codeInput.trim() === String(expected)) {
            stopAllAudio();
            setCodeInput('');
            setCodeError(false);
            setPermit(p => (p ? {
                ...p,
                stepId: nextId,
                log: [...p.log, logEntry(action, { code: expected }), logEntry('pin_verified', { gate: 'confirm_isolation' })],
            } : p));
            buzz(40);
        } else { setCodeError(true); playAlertSound(); buzz([80, 50, 80]); }
    };

    const verifyCodeWithPin = () => {
        const expected = operatorIssuedCode(permit, 'isolate');
        if (!expected) {
            setCodeError(true);
            playAlertSound();
            buzz([80, 50, 80]);
            return;
        }
        requestPin('confirm_isolation', () => verifyCode(expected, 'ground', 'isolation_confirmed'));
    };

    const requestReleaseWithPin = () => {
        if (!CLOSEOUT_ITEMS.every(i => permit.closeout[i.id])) {
            playAlertSound();
            buzz([80, 50, 80]);
            return;
        }
        requestPin('request_release', () => {
            stopAllAudio();
            setCodeInput('');
            setCodeError(false);
            setPermit(p => (p ? {
                ...p,
                stepId: 'reenergize',
                log: [...p.log, logEntry('work_closed_out'), logEntry('pin_verified', { gate: 'request_release' })],
            } : p));
            buzz(40);
        });
    };

    const handleReenergize = () => {
        const expected = operatorIssuedCode(permit, 'release');
        if (!expected || codeInput.trim() !== String(expected)) {
            setCodeError(true); playAlertSound(); buzz([80, 50, 80]); return;
        }
        const closed = {
            ...permit,
            status: 'closed',
            stepId: 'done',
            closedAt: new Date().toISOString(),
            releaseCode: expected,
            log: [...permit.log, logEntry('reenergized', { code: expected }), logEntry('closed'), logEntry('pin_verified', { gate: 'close_permit' })],
        };
        setHistory(saveToHistory(closed));
        saveActivePermit(null);
        setPermit(closed);
        stopAllAudio(); setCodeInput(''); setCodeError(false); buzz([40, 30, 40]);
    };

    const handleReenergizeWithPin = () => {
        requestPin('close_permit', handleReenergize);
    };

    const stopWork = () => {
        playAlertSound();
        buzz([200, 100, 200, 100, 200]);
        appendLog('STOP_WORK');
        const body = buildMessage('stop_work', permit, language);
        openCall(permit.operator.phone);
        setTimeout(() => shareOrSms(permit.operator.phone, body), 500);
    };

    const cancelActivePermit = () => {
        const msg = language === 'bn'
            ? 'এই পারমিট বাতিল করবেন? নতুন কাজ শুরু করতে পারবেন।'
            : 'Cancel this permit? You can start a new job.';
        if (!window.confirm(msg)) return;
        stopAllAudio();
        saveActivePermit(null);
        clearPendingAck();
        setPermit(null);
        setCodeInput('');
        setCodeError(false);
        setAppAckNotice('');
        setView('flow');
        buzz(40);
    };

    const exitFlow = () => { stopAllAudio(); if (onClose) onClose(); };
    const exportPermit = (p) => shareOrSms('', permitToText(p, language));

    // No active permit -> guided data-book setup takes the whole screen
    if (view === 'flow' && !permit) {
        return (
            <ClearanceSetup
                language={language}
                onCancel={exitFlow}
                onHistory={() => setView('history')}
                onComplete={createAndStart}
            />
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <header className={`pt-[env(safe-area-inset-top)] pb-5 px-5 bg-gradient-to-r ${meta.bg} text-white shadow-lg shrink-0 transition-all duration-500`}>
                <div className="flex justify-between items-center mt-2 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={exitFlow} className="p-2 -ml-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg font-black tracking-tight truncate">{view === 'history' ? t('Permit History', 'পারমিট হিস্ট্রি') : meta.title[language]}</h1>
                            {view === 'flow' && permit && (
                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest truncate">{t('Step', 'ধাপ')} {stepNum}/{STEP_ORDER.length} • {permit.permitNo}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {view === 'flow' && permit && permit.status === 'open' && (
                            <button
                                onClick={cancelActivePermit}
                                className="px-3 py-2 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20"
                            >
                                {t('Cancel', 'বাতিল')}
                            </button>
                        )}
                        <button onClick={() => { stopAllAudio(); setView(view === 'history' ? 'flow' : 'history'); }} className="px-4 py-2 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20">
                            {view === 'history' ? t('Back', 'পিছনে') : t('History', 'হিস্ট্রি')}
                        </button>
                    </div>
                </div>
                {view === 'flow' && permit && (
                    <div className="mt-3 h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
                        <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${(stepNum / STEP_ORDER.length) * 100}%` }} />
                    </div>
                )}
            </header>

            {isSpeaking && (
                <div className="relative h-0">
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-slide-up">
                        <div className="flex gap-2 items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black shadow-2xl border border-orange-500/30 whitespace-nowrap">
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                            </span>
                            {t('Voice guidance...', 'ভয়েস গাইডেন্স...')}
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <div className="min-h-full flex flex-col">
                    {view === 'history' ? (
                        <div className="space-y-4 animate-slide-up">
                            <p className="text-[10px] text-orange-500 font-bold px-1 italic mb-1">{t('Every clearance is logged for your safety.', 'প্রতিটি ক্লিয়ারেন্স আপনার সুরক্ষার জন্য লগ করা হয়।')}</p>
                            {history.length === 0 ? (
                                <div className="py-28 text-center space-y-4">
                                    <div className="text-6xl opacity-20">📂</div>
                                    <p className="text-slate-400 font-bold">{t('No permits yet.', 'এখনো কোনো পারমিট নেই।')}</p>
                                </div>
                            ) : history.map(p => (
                                <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter truncate">{p.permitNo}</p>
                                            <p className="text-[11px] font-bold text-slate-500 truncate">{p.job.feeder || '-'} • {p.job.location || '-'}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(p.createdAt).toLocaleString()} • {p.status}</p>
                                        </div>
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <button onClick={() => exportPermit(p)} className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest active:scale-95">{t('Share', 'শেয়ার')}</button>
                                            <button onClick={() => setHistory(deleteFromHistory(p.id))} className="px-3 py-1.5 rounded-full text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest active:scale-95">{t('Delete', 'মুছুন')}</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4">
                            {stepId === 'request' && (
                                <div className="space-y-4 animate-slide-up">
                                    <StepIntro text={meta.instruction[language]} onReplay={replay} />
                                    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-200 dark:border-orange-900/40">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-2">{t('Message to operator', 'অপারেটরকে বার্তা')}</p>
                                        <p className="text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-200">{buildMessage('request', permit, language)}</p>
                                        <p className="mt-3 text-xs font-bold text-orange-700 dark:text-orange-300">{t('You will NOT see the confirm code — operator sends it after isolating.', 'কনফার্ম কোড আপনি দেখবেন না — অপারেটর আইসোলেট করার পর পাঠাবে।')}</p>
                                    </div>
                                    <CommsRow phone={permit.operator.phone} body={smsBody('request')} t={t} onRead={() => playAudio(buildMessage('request', permit, language))} />
                                    <p className="text-center text-[11px] font-bold text-slate-400">{t('Operator: tap app link in SMS or confirm on phone.', 'অপারেটর: এসএমএসের অ্যাপ লিংক বা ফোনে নিশ্চিত করুন।')}</p>
                                    <button onClick={() => goStep('isolate', 'request_sent')} className="w-full py-5 bg-orange-600 text-white rounded-3xl font-black text-base active:scale-95 transition-transform">{t('Request Sent — Continue', 'অনুরোধ পাঠানো হয়েছে — এগিয়ে যান')}</button>
                                    <button onClick={cancelActivePermit} className="w-full py-3 text-slate-400 dark:text-slate-500 font-black text-sm active:scale-95 transition-transform">{t('Cancel permit — start over', 'পারমিট বাতিল — আবার শুরু')}</button>
                                </div>
                            )}

                            {stepId === 'isolate' && (
                                <div className="space-y-4 animate-slide-up">
                                    <StepIntro text={meta.instruction[language]} onReplay={replay} />
                                    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-900/40 text-center">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-purple-600 mb-2">{t('Operator read-back check', 'অপারেটর রিড-ব্যাক চেক')}</p>
                                        {appAckNotice && (
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mb-3">{appAckNotice}</p>
                                        )}
                                        <p className="text-sm font-bold mb-4 text-slate-700 dark:text-slate-200">{t('Enter the code from operator SMS or phone. You cannot proceed without it.', 'অপারেটরের এসএমএস বা ফোনের কোড লিখুন। কোড ছাড়া এগোনো যাবে না।')}</p>
                                        <input inputMode="numeric" value={codeInput} onChange={e => { setCodeInput(e.target.value); setCodeError(false); }} placeholder="••••" className={`w-44 mx-auto block text-center text-3xl tracking-[0.5em] font-black p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 outline-none ${codeError ? 'border-red-500 text-red-500' : 'border-purple-300 dark:border-purple-800'}`} />
                                        {codeError && (
                                            <p className="text-red-500 font-black text-xs mt-2">
                                                {operatorIssuedCode(permit, 'isolate')
                                                    ? t('Code does not match! Do NOT proceed.', 'কোড মিলছে না! এগোবেন না।')
                                                    : t('Wait for operator to isolate and send code.', 'অপারেটর আইসোলেট করে কোড পাঠানো পর্যন্ত অপেক্ষা করুন।')}
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={() => openCall(permit.operator.phone)} className="w-full py-3 rounded-2xl bg-blue-600 text-white font-black text-sm active:scale-95 transition-transform">📞 {t('Call operator', 'অপারেটরকে ফোন')}</button>
                                    <NavRow onBack={() => goStep('request', 'back_to_request')} onNext={verifyCodeWithPin} nextLabel={t('Verify & Continue', 'যাচাই করে এগোন')} colorClass="bg-purple-600" t={t} />
                                </div>
                            )}

                            {stepId === 'ground' && (
                                <div className="space-y-3 animate-slide-up">
                                    <StepIntro text={meta.instruction[language]} onReplay={replay} />
                                    {GROUNDING_ITEMS.map(item => (
                                        <CheckItem key={item.id} item={item} checked={!!permit.grounding[item.id]} language={language} onToggle={() => setGround(item.id)} accent={{ on: 'bg-blue-600 border-blue-600' }} />
                                    ))}
                                    <NavRow onBack={() => goStep('isolate', 'back_to_isolate')} onNext={() => { if (!GROUNDING_ITEMS.every(i => permit.grounding[i.id])) { playAlertSound(); buzz([80, 50, 80]); return; } goStep('brief', 'grounding_done'); }} nextLabel={t('Earthed — Continue', 'আর্থিং সম্পন্ন — এগোন')} colorClass="bg-blue-700" t={t} />
                                </div>
                            )}

                            {stepId === 'brief' && (
                                <div className="space-y-4 animate-slide-up">
                                    <StepIntro text={meta.instruction[language]} onReplay={replay} />
                                    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-200 dark:border-teal-900/40">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-2">{t('Brief for crew', 'কর্মীদের জন্য ব্রিফ')}</p>
                                        <p className="text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-200">{buildMessage('crew_brief', permit, language)}</p>
                                        {permit.crew.length > 0 && <p className="mt-2 text-xs font-bold text-slate-500">{t('Crew', 'কর্মী')}: {permit.crew.join(', ')}</p>}
                                    </div>
                                    <CommsRow phone="" body={buildMessage('crew_brief', permit, language)} t={t} onRead={() => playAudio(buildMessage('crew_brief', permit, language))} />
                                    <label className="flex items-center gap-3 p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 cursor-pointer">
                                        <input type="checkbox" checked={!!(permit.flags && permit.flags.observer)} onChange={() => setFlag('observer')} className="w-6 h-6 accent-teal-600" />
                                        <span className="font-black text-sm text-slate-700 dark:text-slate-200">{t('Observer assigned & all crew clear', 'অবজার্ভার নিযুক্ত ও সব কর্মী নিরাপদ')}</span>
                                    </label>
                                    <NavRow onBack={() => goStep('ground', 'back_to_ground')} onNext={() => { if (!(permit.flags && permit.flags.observer)) { playAlertSound(); buzz([80, 50, 80]); return; } goStep('work', 'crew_briefed'); }} nextLabel={t('Begin Work', 'কাজ শুরু করুন')} colorClass="bg-teal-600" t={t} />
                                </div>
                            )}

                            {stepId === 'work' && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-6 animate-slide-up">
                                    <div className="relative w-56 h-56 flex items-center justify-center bg-white dark:bg-slate-900 rounded-full shadow-2xl border-[14px] border-amber-500/20">
                                        <div className="absolute inset-0 border-[14px] border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                        <div>
                                            <p className="text-3xl font-black text-slate-800 dark:text-white">{t('WORK ON', 'কাজ চলছে')}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{permit.permitNo}</p>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-amber-100 dark:bg-amber-900/30 rounded-3xl border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 font-bold text-sm">{t('Keep earthing in place. Do not remove until work is fully done.', 'আর্থিং খুলবেন না। কাজ পুরো শেষ না হওয়া পর্যন্ত রাখুন।')}</div>
                                    <button onClick={() => goStep('closeout', 'work_finished')} className="w-full py-5 rounded-3xl bg-amber-600 text-white font-black text-lg active:scale-95 transition-transform">{t('Work Finished', 'কাজ শেষ')}</button>
                                </div>
                            )}

                            {stepId === 'closeout' && (
                                <div className="space-y-3 animate-slide-up">
                                    <StepIntro text={meta.instruction[language]} onReplay={replay} />
                                    {CLOSEOUT_ITEMS.map(item => (
                                        <CheckItem key={item.id} item={item} checked={!!permit.closeout[item.id]} language={language} onToggle={() => setCloseout(item.id)} accent={{ on: 'bg-emerald-600 border-emerald-600' }} />
                                    ))}
                                    <NavRow onBack={() => goStep('work', 'back_to_work')} onNext={requestReleaseWithPin} nextLabel={t('All Clear — Release', 'সব পরিষ্কার — রিলিজ')} colorClass="bg-emerald-700" t={t} />
                                </div>
                            )}

                            {stepId === 'reenergize' && (
                                <div className="space-y-4 animate-slide-up">
                                    <StepIntro text={meta.instruction[language]} onReplay={replay} />
                                    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/40">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">{t('Message to operator', 'অপারেটরকে বার্তা')}</p>
                                        <p className="text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-200">{buildMessage('reenergize', permit, language)}</p>
                                        <p className="mt-3 text-xs font-bold text-rose-700 dark:text-rose-300">{t('Release code comes from operator after re-energizing.', 'রিলিজ কোড অপারেটর লাইন চালু করার পর পাঠাবে।')}</p>
                                    </div>
                                    <CommsRow phone={permit.operator.phone} body={smsBody('reenergize')} t={t} onRead={() => playAudio(buildMessage('reenergize', permit, language))} />
                                    <p className="text-center text-[11px] font-bold text-slate-400">{t('Operator: tap app link in SMS or confirm on phone.', 'অপারেটর: এসএমএসের অ্যাপ লিংক বা ফোনে নিশ্চিত করুন।')}</p>
                                    <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/40 text-center">
                                        {appAckNotice && (
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mb-3">{appAckNotice}</p>
                                        )}
                                        <p className="text-sm font-bold mb-3 text-slate-700 dark:text-slate-200">{t('Enter release code from operator SMS or phone.', 'অপারেটরের এসএমএস বা ফোনের রিলিজ কোড লিখুন।')}</p>
                                        <input inputMode="numeric" value={codeInput} onChange={e => { setCodeInput(e.target.value); setCodeError(false); }} placeholder="••••" className={`w-44 mx-auto block text-center text-3xl tracking-[0.5em] font-black p-3 rounded-2xl bg-white dark:bg-slate-800 border-2 outline-none ${codeError ? 'border-red-500 text-red-500' : 'border-rose-300 dark:border-rose-800'}`} />
                                        {codeError && (
                                            <p className="text-red-500 font-black text-xs mt-2">
                                                {operatorIssuedCode(permit, 'release')
                                                    ? t('Code does not match!', 'কোড মিলছে না!')
                                                    : t('Wait for operator to re-energize and send code.', 'অপারেটর চালু করে কোড পাঠানো পর্যন্ত অপেক্ষা করুন।')}
                                            </p>
                                        )}
                                    </div>
                                    <NavRow onBack={() => goStep('closeout', 'back_to_closeout')} onNext={handleReenergizeWithPin} nextLabel={t('Verify & Close', 'যাচাই করে বন্ধ')} colorClass="bg-rose-600" t={t} />
                                </div>
                            )}

                            {stepId === 'done' && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-8 animate-scale-in">
                                    <div className="w-44 h-44 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl flex items-center justify-center text-7xl border-4 border-green-500">✅</div>
                                    <div>
                                        <h2 className="text-3xl font-black uppercase text-slate-800 dark:text-white">{t('Permit Closed', 'পারমিট বন্ধ')}</h2>
                                        <p className="text-slate-500 font-bold mt-1">{permit.permitNo}</p>
                                    </div>
                                    <div className="w-full space-y-3">
                                        <button onClick={() => exportPermit(permit)} className="w-full py-4 rounded-2xl bg-slate-800 text-white font-black active:scale-95 transition-transform">📤 {t('Share Permit Log', 'পারমিট লগ শেয়ার')}</button>
                                        <button onClick={() => { setPermit(null); setView('flow'); saveActivePermit(null); clearPendingAck(); }} className="w-full py-4 rounded-2xl bg-orange-600 text-white font-black active:scale-95 transition-transform">{t('New Job', 'নতুন কাজ')}</button>
                                        <button onClick={exitFlow} className="w-full py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black active:scale-95 transition-transform">{t('Home', 'হোম')}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            {view === 'flow' && permit && ['ground', 'brief', 'work', 'closeout'].includes(stepId) && (
                <div className="shrink-0 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <button onClick={stopWork} className="w-full py-4 rounded-2xl bg-red-600 text-white font-black text-base tracking-widest uppercase active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-red-600/30">
                        ⛔ {t('STOP WORK / EMERGENCY', 'কাজ বন্ধ / জরুরি')}
                    </button>
                </div>
            )}
            <PinGate {...pinGateProps} language={language} />
        </div>
    );
}
