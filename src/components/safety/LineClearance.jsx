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
import {
    submitPtwRequest,
    linemanStartWork,
    cloudRowToLocalPatch,
    statusLabel,
    isOnline,
    PTW_ONLINE_STATUSES,
} from './ptwOnline';
import usePtwWatch from './usePtwWatch';
import { playShutdownConfirmedChime } from './ptwAlerts';
import ElapsedTimer from './ElapsedTimer';

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
            en: 'Send shutdown request to operator by SMS or call.',
            bn: 'এসএমএস বা ফোনে অপারেটরকে শাটডাউন অনুরোধ পাঠান।',
        },
    },
    isolate: {
        title: { en: 'Confirm Isolated', bn: 'আইসোলেশন নিশ্চিত' },
        bg: 'from-purple-600 to-purple-500',
        instruction: {
            en: 'Enter the code from operator.',
            bn: 'অপারেটরের কোড লিখুন।',
        },
    },
    ground: {
        title: { en: 'Test Dead & Earth', bn: 'মৃত পরীক্ষা ও আর্থিং' },
        bg: 'from-blue-700 to-blue-600',
        instruction: {
            en: 'Test dead, discharge, and earth both sides.',
            bn: 'মৃত পরীক্ষা, ডিসচার্জ ও দুই দিকে আর্থিং।',
        },
    },
    brief: {
        title: { en: 'Brief the Crew', bn: 'কর্মীদের ব্রিফ' },
        bg: 'from-teal-600 to-teal-500',
        instruction: {
            en: 'Confirm observer and crew are clear.',
            bn: 'অবজার্ভার ও কর্মী নিরাপদ নিশ্চিত করুন।',
        },
    },
    work: {
        title: { en: 'Work in Progress', bn: 'কাজ চলছে' },
        bg: 'from-amber-600 to-amber-500',
        instruction: {
            en: 'Work in progress. Keep earthing on.',
            bn: 'কাজ চলছে। আর্থিং রাখুন।',
        },
    },
    closeout: {
        title: { en: 'Finish & Clear', bn: 'সমাপ্তি ও পরিষ্কার' },
        bg: 'from-emerald-700 to-emerald-600',
        instruction: {
            en: 'Check all items before releasing the line.',
            bn: 'লাইন ছাড়ার আগে সব চেক করুন।',
        },
    },
    reenergize: {
        title: { en: 'Release & Re-energize', bn: 'রিলিজ ও চালু' },
        bg: 'from-rose-600 to-rose-500',
        instruction: {
            en: 'Tell operator to re-energize, then enter release code.',
            bn: 'অপারেটরকে চালু করতে বলুন, তারপর রিলিজ কোড লিখুন।',
        },
    },
    done: {
        title: { en: 'Permit Closed', bn: 'পারমিট বন্ধ' },
        bg: 'from-green-600 to-green-500',
        instruction: {
            en: 'Permit closed.',
            bn: 'পারমিট বন্ধ।',
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
function CommsRow({ phone, body, t }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            <button onClick={() => openSms(phone, body)} className="py-5 rounded-2xl bg-emerald-600 text-white font-black text-base active:scale-95 transition-transform">💬 {t('SMS', 'এসএমএস পাঠান')}</button>
            <button onClick={() => openCall(phone)} className="py-5 rounded-2xl bg-blue-600 text-white font-black text-base active:scale-95 transition-transform">📞 {t('Call', 'কল করুন')}</button>
        </div>
    );
}

function SmsPreview({ text, t, accent = 'orange', appLinkIncluded = false }) {
    const border = accent === 'rose'
        ? 'border-rose-200 dark:border-rose-900/40'
        : 'border-orange-200 dark:border-orange-900/40';
    const label = accent === 'rose'
        ? 'text-rose-600'
        : 'text-orange-600';
    return (
        <div className={`p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 ${border}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${label} mb-2`}>{t('SMS preview', 'এসএমএস প্রিভিউ')}</p>
            <p className="text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{text}</p>
            {appLinkIncluded && (
                <p className="mt-3 text-xs font-bold text-slate-400 dark:text-slate-500">
                    🔗 {t('App link attached (hidden)', 'অ্যাপ লিংক যুক্ত করা হয়েছে (লুকানো)')}
                </p>
            )}
        </div>
    );
}

function NavRow({ onBack, onNext, nextLabel, colorClass, t }) {
    return (
        <div className="flex gap-3 pt-2">
            <button onClick={onBack} className="w-28 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-tight active:scale-95 transition-transform">{t('Back', 'ফিরে যান')}</button>
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
    const [onlineBusy, setOnlineBusy] = useState(false);
    const [onlineError, setOnlineError] = useState('');
    const shutdownChimePlayedRef = React.useRef(false);
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

    const applyCloudRow = React.useCallback((row) => {
        if (!row || !permit || row.permit_no !== permit.permitNo) return;
        const patch = cloudRowToLocalPatch(row);
        setPermit((p) => (p && p.permitNo === row.permit_no ? {
            ...p,
            onlineMode: true,
            onlineStatus: row.status,
            onlineTimestamps: patch.onlineTimestamps,
            confirmCode: patch.confirmCode ?? p.confirmCode,
            operatorIssuedIsolate: patch.operatorIssuedIsolate || p.operatorIssuedIsolate,
        } : p));

        if (row.status === PTW_ONLINE_STATUSES.shutdown_confirmed && row.confirm_code) {
            setCodeInput(String(row.confirm_code));
            setAppAckNotice(language === 'bn' ? 'অপারেটর শাটডাউন নিশ্চিত করেছেন' : 'Operator confirmed shutdown');
            if (!shutdownChimePlayedRef.current) {
                shutdownChimePlayedRef.current = true;
                playShutdownConfirmedChime();
            }
        }
        if (row.status === PTW_ONLINE_STATUSES.work_started && row.work_started_at) {
            setPermit((p) => (p && p.permitNo === row.permit_no ? {
                ...p,
                onlineTimestamps: {
                    ...(p.onlineTimestamps || {}),
                    workStarted: row.work_started_at,
                },
            } : p));
        }
    }, [permit, language]);

    usePtwWatch({
        role: 'lineman',
        permitNo: permit?.onlineMode ? permit.permitNo : null,
        enabled: !!(permit?.onlineMode && isOnline()),
        onUpdate: applyCloudRow,
    });

    const submitOnlineRequest = async () => {
        setOnlineBusy(true);
        setOnlineError('');
        try {
            await submitPtwRequest(permit);
            shutdownChimePlayedRef.current = false;
            setPermit((p) => (p ? { ...p, onlineMode: true, onlineStatus: PTW_ONLINE_STATUSES.submitted } : p));
            goStep('isolate', 'request_submitted_online');
        } catch (e) {
            setOnlineError(language === 'bn'
                ? 'অনলাইনে পাঠানো যায়নি। এসএমএস ব্যবহার করুন।'
                : 'Could not submit online. Use SMS instead.');
        } finally {
            setOnlineBusy(false);
        }
    };

    const continueAfterOnlineShutdown = () => {
        requestPin('confirm_isolation', () => {
            stopAllAudio();
            setCodeInput('');
            setCodeError(false);
            setPermit((p) => (p ? {
                ...p,
                stepId: 'ground',
                log: [...p.log, logEntry('isolation_confirmed', { via: 'online' }), logEntry('pin_verified', { gate: 'confirm_isolation' })],
            } : p));
            buzz(40);
        });
    };

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
                            <h1 className="text-lg font-black tracking-tight truncate">{view === 'history' ? t('Permit History', 'পারমিটের ইতিহাস') : meta.title[language]}</h1>
                            {view === 'flow' && permit && (
                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest truncate">{t('Step', 'ধাপ')} {stepNum}/{STEP_ORDER.length} • {permit.permitNo}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {view === 'flow' && permit && (
                            <button onClick={replay} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg active:scale-95" aria-label={t('Voice', 'ভয়েস গাইড')}>🔊</button>
                        )}
                        {view === 'flow' && permit && permit.status === 'open' && (
                            <button
                                onClick={cancelActivePermit}
                                className="px-3 py-2 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20"
                            >
                                {t('Cancel', 'বাতিল করুন')}
                            </button>
                        )}
                        <button onClick={() => { stopAllAudio(); setView(view === 'history' ? 'flow' : 'history'); }} className="px-4 py-2 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20">
                            {view === 'history' ? t('Back', 'ফিরে যান') : t('History', 'ইতিহাস')}
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
                            {t('Voice guidance...', 'ভয়েস গাইডেন্স চালু আছে...')}
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <div className="min-h-full flex flex-col">
                    {view === 'history' ? (
                        <div className="space-y-4 animate-slide-up">
                            {history.length === 0 ? (
                                <div className="py-28 text-center space-y-4">
                                    <div className="text-6xl opacity-20">📂</div>
                                    <p className="text-slate-400 font-bold">{t('No permits yet.', 'কোনো পারমিটের রেকর্ড নেই')}</p>
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
                                            <button onClick={() => exportPermit(p)} className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest active:scale-95">{t('Share', 'শেয়ার করুন')}</button>
                                            <button onClick={() => setHistory(deleteFromHistory(p.id))} className="px-3 py-1.5 rounded-full text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest active:scale-95">{t('Delete', 'মুছে ফেলুন')}</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4">
                            {stepId === 'request' && (
                                <div className="space-y-4 animate-slide-up">
                                    <SmsPreview text={buildMessage('request', permit, language)} t={t} accent="orange" appLinkIncluded />
                                    {isOnline() && (
                                        <>
                                            <button
                                                type="button"
                                                disabled={onlineBusy}
                                                onClick={submitOnlineRequest}
                                                className="w-full py-5 bg-teal-600 text-white rounded-3xl font-black text-lg active:scale-95 transition-transform disabled:opacity-50"
                                            >
                                                {onlineBusy
                                                    ? t('Submitting…', 'পাঠানো হচ্ছে…')
                                                    : t('Submit to operator (online)', 'অপারেটরকে পাঠান (অনলাইন)')}
                                            </button>
                                            {onlineError && <p className="text-center text-red-500 font-bold text-sm">{onlineError}</p>}
                                            <p className="text-center text-xs font-bold text-slate-400">
                                                {t('Or use SMS if offline', 'অফলাইনে থাকলে এসএমএস ব্যবহার করুন')}
                                            </p>
                                        </>
                                    )}
                                    <CommsRow phone={permit.operator.phone} body={smsBody('request')} t={t} />
                                    <button onClick={() => goStep('isolate', 'request_sent')} className="w-full py-5 bg-orange-600 text-white rounded-3xl font-black text-lg active:scale-95 transition-transform">{t('Sent — Next', 'পাঠানো হয়েছে — পরের ধাপ')}</button>
                                    <button onClick={cancelActivePermit} className="w-full py-2 text-slate-400 font-bold text-sm active:scale-95">{t('Cancel', 'বাতিল করুন')}</button>
                                </div>
                            )}

                            {stepId === 'isolate' && permit.onlineMode && permit.onlineStatus !== PTW_ONLINE_STATUSES.shutdown_confirmed && (
                                <div className="space-y-4 animate-slide-up">
                                    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-200 text-center">
                                        <div className="text-5xl mb-3 animate-pulse">⏳</div>
                                        <p className="text-lg font-black text-slate-700 dark:text-white">
                                            {statusLabel(permit.onlineStatus || PTW_ONLINE_STATUSES.submitted, language)}
                                        </p>
                                        <p className="text-sm font-bold text-slate-500 mt-2">
                                            {permit.onlineStatus === PTW_ONLINE_STATUSES.accepted
                                                ? t('Operator is isolating the line…', 'অপারেটর লাইন আইসোলেট করছেন…')
                                                : t('Waiting for operator to accept…', 'অপারেটর গ্রহণের জন্য অপেক্ষা…')}
                                        </p>
                                        <ElapsedTimer
                                            since={permit.onlineTimestamps?.submitted || permit.createdAt}
                                            label={t('Waiting time', 'অপেক্ষার সময়')}
                                            className="mt-4 text-slate-600"
                                        />
                                    </div>
                                    <p className="text-center text-xs font-bold text-slate-400">
                                        {t('Or enter code from phone/SMS', 'অথবা ফোন/এসএমএস থেকে কোড দিন')}
                                    </p>
                                    <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-900/40 text-center">
                                        <input inputMode="numeric" value={codeInput} onChange={e => { setCodeInput(e.target.value); setCodeError(false); }} placeholder="••••" className={`w-44 mx-auto block text-center text-4xl tracking-[0.5em] font-black p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 outline-none ${codeError ? 'border-red-500 text-red-500' : 'border-purple-300 dark:border-purple-800'}`} />
                                        {codeError && <p className="text-red-500 font-black text-xs mt-3">{t('Wrong code', 'কোডটি ভুল')}</p>}
                                    </div>
                                    <NavRow onBack={() => goStep('request', 'back_to_request')} onNext={verifyCodeWithPin} nextLabel={t('Verify code', 'কোড যাচাই')} colorClass="bg-purple-600" t={t} />
                                </div>
                            )}

                            {stepId === 'isolate' && permit.onlineMode && permit.onlineStatus === PTW_ONLINE_STATUSES.shutdown_confirmed && (
                                <div className="space-y-4 animate-slide-up">
                                    <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 text-center space-y-3">
                                        <div className="text-6xl">✅</div>
                                        <p className="text-xl font-black text-emerald-800 dark:text-emerald-200">
                                            {t('Shutdown confirmed', 'শাটডাউন নিশ্চিত')}
                                        </p>
                                        {permit.onlineTimestamps?.shutdown && (
                                            <p className="text-sm font-bold text-emerald-700">
                                                {new Date(permit.onlineTimestamps.shutdown).toLocaleString()}
                                            </p>
                                        )}
                                        <ElapsedTimer
                                            since={permit.onlineTimestamps?.shutdown}
                                            label={t('Since shutdown', 'শাটডাউন থেকে')}
                                            className="text-emerald-900 dark:text-emerald-100"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={continueAfterOnlineShutdown}
                                        className="w-full py-5 rounded-3xl bg-emerald-600 text-white font-black text-lg active:scale-95"
                                    >
                                        {t('Continue to grounding', 'আর্থিং-এ এগিয়ে যান')}
                                    </button>
                                </div>
                            )}

                            {stepId === 'isolate' && !permit.onlineMode && (
                                <div className="space-y-4 animate-slide-up">
                                    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-900/40 text-center">
                                        {appAckNotice && (
                                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mb-4">✓ {appAckNotice}</p>
                                        )}
                                        <p className="text-sm font-black text-slate-500 mb-3">{t('Operator code', 'অপারেটর কোড')}</p>
                                        <input inputMode="numeric" value={codeInput} onChange={e => { setCodeInput(e.target.value); setCodeError(false); }} placeholder="••••" className={`w-44 mx-auto block text-center text-4xl tracking-[0.5em] font-black p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 outline-none ${codeError ? 'border-red-500 text-red-500' : 'border-purple-300 dark:border-purple-800'}`} />
                                        {codeError && (
                                            <p className="text-red-500 font-black text-xs mt-3">
                                                {operatorIssuedCode(permit, 'isolate')
                                                    ? t('Wrong code', 'কোডটি ভুল, আবার চেষ্টা করুন')
                                                    : t('Wait for operator', 'অপারেটরের কোডের জন্য অপেক্ষা করুন')}
                                            </p>
                                        )}
                                    </div>
                                    <NavRow onBack={() => goStep('request', 'back_to_request')} onNext={verifyCodeWithPin} nextLabel={t('Verify', 'যাচাই করুন')} colorClass="bg-purple-600" t={t} />
                                </div>
                            )}

                            {stepId === 'isolate' && permit.onlineMode && permit.onlineStatus !== PTW_ONLINE_STATUSES.shutdown_confirmed && (
                                <div className="space-y-4 animate-slide-up">
                                    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-900/40 text-center">
                                        <p className="text-sm font-black text-slate-500 mb-3">{t('Operator code (backup)', 'অপারেটর কোড (ব্যাকআপ)')}</p>
                                        <input inputMode="numeric" value={codeInput} onChange={e => { setCodeInput(e.target.value); setCodeError(false); }} placeholder="••••" className={`w-44 mx-auto block text-center text-4xl tracking-[0.5em] font-black p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 outline-none ${codeError ? 'border-red-500 text-red-500' : 'border-purple-300 dark:border-purple-800'}`} />
                                    </div>
                                    <NavRow onBack={() => goStep('request', 'back_to_request')} onNext={verifyCodeWithPin} nextLabel={t('Verify', 'যাচাই করুন')} colorClass="bg-purple-600" t={t} />
                                </div>
                            )}

                            {stepId === 'ground' && (
                                <div className="space-y-3 animate-slide-up">
                                    {GROUNDING_ITEMS.map(item => (
                                        <CheckItem key={item.id} item={item} checked={!!permit.grounding[item.id]} language={language} onToggle={() => setGround(item.id)} accent={{ on: 'bg-blue-600 border-blue-600' }} />
                                    ))}
                                    <NavRow onBack={() => goStep('isolate', 'back_to_isolate')} onNext={() => { if (!GROUNDING_ITEMS.every(i => permit.grounding[i.id])) { playAlertSound(); buzz([80, 50, 80]); return; } goStep('brief', 'grounding_done'); }} nextLabel={t('Next', 'পরের ধাপ')} colorClass="bg-blue-700" t={t} />
                                </div>
                            )}

                            {stepId === 'brief' && (
                                <div className="space-y-4 animate-slide-up">
                                    <label className="flex items-center gap-4 p-5 rounded-3xl bg-teal-50 dark:bg-teal-950/20 border-2 border-teal-200 dark:border-teal-900/40 cursor-pointer active:scale-[0.99]">
                                        <input type="checkbox" checked={!!(permit.flags && permit.flags.observer)} onChange={() => setFlag('observer')} className="w-7 h-7 accent-teal-600 shrink-0" />
                                        <span className="font-black text-base text-slate-800 dark:text-white">{t('Crew briefed & clear', 'কর্মীদের ব্রিফ করা হয়েছে এবং সবাই নিরাপদ')}</span>
                                    </label>
                                    <NavRow onBack={() => goStep('ground', 'back_to_ground')} onNext={() => {
                                        if (!(permit.flags && permit.flags.observer)) { playAlertSound(); buzz([80, 50, 80]); return; }
                                        if (permit.onlineMode) {
                                            linemanStartWork(permit.permitNo, permit.linemanPhone)
                                                .then((row) => {
                                                    if (row?.work_started_at) {
                                                        setPermit((p) => (p ? {
                                                            ...p,
                                                            onlineStatus: PTW_ONLINE_STATUSES.work_started,
                                                            onlineTimestamps: {
                                                                ...(p.onlineTimestamps || {}),
                                                                workStarted: row.work_started_at,
                                                            },
                                                        } : p));
                                                    }
                                                })
                                                .catch(() => {});
                                        }
                                        goStep('work', 'crew_briefed');
                                    }} nextLabel={t('Start work', 'কাজ শুরু করুন')} colorClass="bg-teal-600" t={t} />
                                </div>
                            )}

                            {stepId === 'work' && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-8 animate-slide-up">
                                    <div className="relative w-52 h-52 flex items-center justify-center bg-white dark:bg-slate-900 rounded-full shadow-2xl border-[12px] border-amber-500/25">
                                        <div className="absolute inset-0 border-[12px] border-amber-500 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-3xl font-black text-slate-800 dark:text-white relative z-10">{t('WORK', 'কাজ চলছে')}</p>
                                    </div>
                                    {permit.onlineMode && (permit.onlineTimestamps?.workStarted || permit.onlineStatus === PTW_ONLINE_STATUSES.work_started) && (
                                        <ElapsedTimer
                                            since={permit.onlineTimestamps?.workStarted}
                                            label={t('Work time', 'কাজের সময়')}
                                            className="text-amber-800 dark:text-amber-200"
                                        />
                                    )}
                                    <button onClick={() => goStep('closeout', 'work_finished')} className="w-full py-5 rounded-3xl bg-amber-600 text-white font-black text-lg active:scale-95 transition-transform">{t('Work done', 'কাজ শেষ হয়েছে')}</button>
                                </div>
                            )}

                            {stepId === 'closeout' && (
                                <div className="space-y-3 animate-slide-up">
                                    {CLOSEOUT_ITEMS.map(item => (
                                        <CheckItem key={item.id} item={item} checked={!!permit.closeout[item.id]} language={language} onToggle={() => setCloseout(item.id)} accent={{ on: 'bg-emerald-600 border-emerald-600' }} />
                                    ))}
                                    <NavRow onBack={() => goStep('work', 'back_to_work')} onNext={requestReleaseWithPin} nextLabel={t('Release line', 'লাইন ছেড়ে দিন')} colorClass="bg-emerald-700" t={t} />
                                </div>
                            )}

                            {stepId === 'reenergize' && (
                                <div className="space-y-4 animate-slide-up">
                                    <SmsPreview text={buildMessage('reenergize', permit, language)} t={t} accent="rose" appLinkIncluded />
                                    <CommsRow phone={permit.operator.phone} body={smsBody('reenergize')} t={t} />
                                    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/40 text-center">
                                        {appAckNotice && (
                                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mb-4">✓ {appAckNotice}</p>
                                        )}
                                        <p className="text-sm font-black text-slate-500 mb-3">{t('Release code', 'রিলিজ কোড লিখুন')}</p>
                                        <input inputMode="numeric" value={codeInput} onChange={e => { setCodeInput(e.target.value); setCodeError(false); }} placeholder="••••" className={`w-44 mx-auto block text-center text-4xl tracking-[0.5em] font-black p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 outline-none ${codeError ? 'border-red-500 text-red-500' : 'border-rose-300 dark:border-rose-800'}`} />
                                        {codeError && (
                                            <p className="text-red-500 font-black text-xs mt-3">
                                                {operatorIssuedCode(permit, 'release')
                                                    ? t('Wrong code', 'কোডটি ভুল, আবার চেষ্টা করুন')
                                                    : t('Wait for operator', 'অপারেটরের কোডের জন্য অপেক্ষা করুন')}
                                            </p>
                                        )}
                                    </div>
                                    <NavRow onBack={() => goStep('closeout', 'back_to_closeout')} onNext={handleReenergizeWithPin} nextLabel={t('Close permit', 'পারমিট বন্ধ করুন')} colorClass="bg-rose-600" t={t} />
                                </div>
                            )}

                            {stepId === 'done' && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-8 animate-scale-in">
                                    <div className="w-44 h-44 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl flex items-center justify-center text-7xl border-4 border-green-500">✅</div>
                                    <div>
                                        <h2 className="text-3xl font-black uppercase text-slate-800 dark:text-white">{t('Permit Closed', 'পারমিট বন্ধ করা হয়েছে')}</h2>
                                        <p className="text-slate-500 font-bold mt-1">{permit.permitNo}</p>
                                    </div>
                                    <div className="w-full space-y-3">
                                        <button onClick={() => exportPermit(permit)} className="w-full py-4 rounded-2xl bg-slate-800 text-white font-black active:scale-95 transition-transform">📤 {t('Share log', 'লগ শেয়ার করুন')}</button>
                                        <button onClick={() => { setPermit(null); setView('flow'); saveActivePermit(null); clearPendingAck(); }} className="w-full py-4 rounded-2xl bg-orange-600 text-white font-black active:scale-95 transition-transform">{t('New job', 'নতুন কাজ শুরু করুন')}</button>
                                        <button onClick={exitFlow} className="w-full py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black active:scale-95 transition-transform">{t('Home', 'হোমে ফিরে যান')}</button>
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
                        ⛔ {t('STOP WORK', 'জরুরি কাজ বন্ধ করুন')}
                    </button>
                </div>
            )}
            <PinGate {...pinGateProps} language={language} />
        </div>
    );
}
