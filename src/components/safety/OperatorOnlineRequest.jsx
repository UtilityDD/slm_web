import React, { useState } from 'react';
import PinGate from './PinGate';
import usePinGate from './usePinGate';
import ElapsedTimer from './ElapsedTimer';
import {
    operatorAccept,
    operatorShutdownConfirm,
    statusLabel,
    PTW_ONLINE_STATUSES,
} from './ptwOnline';
import { saveOperatorConfirmation } from './clearanceLinks';

const STATUS_BADGE = {
    submitted: 'bg-orange-100 text-orange-700',
    accepted: 'bg-blue-100 text-blue-700',
    shutdown_confirmed: 'bg-emerald-100 text-emerald-700',
    work_started: 'bg-amber-100 text-amber-800',
};

export default function OperatorOnlineRequest({
    row,
    operatorPhone,
    language = 'bn',
    onBack,
    onUpdated,
}) {
    const t = (en, bn) => (language === 'bn' ? bn : en);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [feederConfirm, setFeederConfirm] = useState(row?.feeder || '');
    const { requestPin, pinGateProps } = usePinGate();

    if (!row) return null;

    const status = row.status;
    const badge = STATUS_BADGE[status] || 'bg-slate-100 text-slate-600';

    const handleAccept = async () => {
        setBusy(true);
        setError('');
        try {
            const updated = await operatorAccept(row.permit_no, operatorPhone);
            saveOperatorConfirmation({
                permitNo: row.permit_no,
                act: 'req',
                feeder: row.feeder,
                via: 'online_accept',
            });
            onUpdated?.(updated);
        } catch (e) {
            setError(t('Could not accept.', 'গ্রহণ করা যায়নি।'));
        } finally {
            setBusy(false);
        }
    };

    const doShutdown = async () => {
        setBusy(true);
        setError('');
        try {
            const updated = await operatorShutdownConfirm(row.permit_no, operatorPhone, feederConfirm);
            saveOperatorConfirmation({
                permitNo: row.permit_no,
                act: 'req',
                feeder: row.feeder,
                via: 'online_shutdown',
                code: updated.confirm_code,
            });
            onUpdated?.(updated);
        } catch (e) {
            const msg = String(e?.message || '');
            if (msg.includes('feeder mismatch')) {
                setError(t('Feeder name does not match.', 'ফিডারের নাম মিলছে না।'));
            } else {
                setError(t('Could not confirm shutdown.', 'শাটডাউন নিশ্চিত করা যায়নি।'));
            }
        } finally {
            setBusy(false);
        }
    };

    const handleShutdown = () => {
        requestPin('operator_confirm', doShutdown);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <header className="pt-[env(safe-area-inset-top)] pb-6 px-5 bg-gradient-to-r from-teal-700 to-teal-600 text-white shadow-lg shrink-0">
                <div className="flex items-center gap-3 mt-2">
                    <button type="button" onClick={onBack} className="p-2 -ml-2 bg-white/20 rounded-full active:scale-95">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-black truncate">{row.permit_no}</h1>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${badge}`}>
                            {statusLabel(status, language)}
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-5 max-w-md mx-auto w-full space-y-4">
                <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                        [t('Feeder', 'ফিডার'), row.feeder],
                        [t('Location', 'স্থান'), row.location],
                        [t('Work', 'কাজ'), row.work],
                        [t('Lineman phone', 'লাইনম্যান ফোন'), row.lineman_phone || '—'],
                    ].map(([k, v]) => (
                        <div key={k} className="p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{k}</p>
                            <p className="font-black text-slate-800 dark:text-white">{v || '—'}</p>
                        </div>
                    ))}
                </div>

                {status === PTW_ONLINE_STATUSES.work_started && (
                    <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 text-center">
                        <p className="text-sm font-black text-amber-800 dark:text-amber-200 mb-2">
                            {t('Lineman is working', 'লাইনম্যান কাজ করছেন')}
                        </p>
                        <ElapsedTimer
                            since={row.work_started_at}
                            label={t('Work time', 'কাজের সময়')}
                            className="text-amber-900 dark:text-amber-100"
                        />
                    </div>
                )}

                {status === PTW_ONLINE_STATUSES.submitted && (
                    <>
                        <p className="text-center text-sm font-bold text-slate-500">
                            {t('New shutdown request. Accept to begin processing.', 'নতুন শাটডাউন অনুরোধ। প্রক্রিয়া শুরু করতে গ্রহণ করুন।')}
                        </p>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={handleAccept}
                            className="w-full py-5 rounded-3xl bg-teal-600 text-white font-black text-lg active:scale-95 disabled:opacity-50"
                        >
                            {t('Accept request', 'অনুরোধ গ্রহণ করুন')}
                        </button>
                    </>
                )}

                {status === PTW_ONLINE_STATUSES.accepted && (
                    <>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                                {t('Re-confirm feeder name', 'ফিডারের নাম আবার নিশ্চিত করুন')}
                            </label>
                            <input
                                value={feederConfirm}
                                onChange={(e) => { setFeederConfirm(e.target.value); setError(''); }}
                                className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-purple-300 font-black text-lg outline-none focus:border-purple-500"
                            />
                        </div>
                        <p className="text-xs font-bold text-slate-500 text-center px-2">
                            {t('After isolating the line and LOTO, confirm shutdown here.', 'লাইন আইসোলেট ও LOTO করার পর এখানে শাটডাউন নিশ্চিত করুন।')}
                        </p>
                        <button
                            type="button"
                            disabled={busy || !feederConfirm.trim()}
                            onClick={handleShutdown}
                            className="w-full py-5 rounded-3xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-black text-lg active:scale-95 disabled:opacity-50"
                        >
                            {t('Confirm shutdown', 'শাটডাউন নিশ্চিত করুন')}
                        </button>
                    </>
                )}

                {status === PTW_ONLINE_STATUSES.shutdown_confirmed && (
                    <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 text-center space-y-3">
                        <div className="text-5xl">✅</div>
                        <p className="font-black text-emerald-800 dark:text-emerald-200">
                            {t('Shutdown confirmed', 'শাটডাউন নিশ্চিত হয়েছে')}
                        </p>
                        {row.shutdown_at && (
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                {new Date(row.shutdown_at).toLocaleString()}
                            </p>
                        )}
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            {t('Lineman notified in app. Waiting for work to start.', 'লাইনম্যানকে অ্যাপে জানানো হয়েছে। কাজ শুরুর জন্য অপেক্ষা।')}
                        </p>
                    </div>
                )}

                {error && <p className="text-center text-red-500 font-black text-sm">{error}</p>}
            </main>
            <PinGate {...pinGateProps} language={language} />
        </div>
    );
}
