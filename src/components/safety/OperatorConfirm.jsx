import React, { useState } from 'react';
import {
    linemanIsolateAckLink,
    linemanReenergizeAckLink,
    saveOperatorConfirmation,
} from './clearanceLinks';

const openSms = (phone, body) => {
    window.location.href = `sms:${phone || ''}?body=${encodeURIComponent(body)}`;
};
const openCall = (phone) => { if (phone) window.location.href = `tel:${phone}`; };

const ACT_META = {
    req: {
        icon: '🔌',
        title: { en: 'Isolation Request', bn: 'আইসোলেশন অনুরোধ' },
        confirm: { en: 'Confirm Isolated', bn: 'আইসোলেট নিশ্চিত' },
        bg: 'from-purple-600 to-purple-500',
    },
    ren: {
        icon: '⚡',
        title: { en: 'Re-energize Request', bn: 'লাইন চালু অনুরোধ' },
        confirm: { en: 'Confirm Re-energized', bn: 'চালু নিশ্চিত' },
        bg: 'from-rose-600 to-rose-500',
    },
};

export default function OperatorConfirm({ payload, language = 'bn', onClose }) {
    const t = (en, bn) => (language === 'bn' ? bn : en);
    const [done, setDone] = useState(false);

    const act = payload?.act;
    const meta = ACT_META[act];
    const isReq = act === 'req';
    const isRen = act === 'ren';

    if (!meta || (!isReq && !isRen)) {
        return (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900 p-6 items-center justify-center text-center">
                <div className="text-6xl mb-4 opacity-30">🔗</div>
                <p className="font-black text-slate-600 dark:text-slate-300">{t('Invalid or expired link.', 'লিংক সঠিক নয়।')}</p>
                <button onClick={onClose} className="mt-6 px-8 py-4 rounded-2xl bg-slate-800 text-white font-black">{t('Close', 'বন্ধ')}</button>
            </div>
        );
    }

    const permitStub = {
        permitNo: payload.permitNo,
        confirmCode: payload.confirmCode,
        releaseCode: payload.releaseCode,
        job: { feeder: payload.feeder, location: payload.location, work: payload.work },
    };

    const handleConfirm = () => {
        saveOperatorConfirmation({
            permitNo: payload.permitNo,
            act,
            feeder: payload.feeder,
            via: 'app',
        });

        const ackLink = isReq
            ? linemanIsolateAckLink(permitStub)
            : linemanReenergizeAckLink(permitStub);

        const code = isReq ? payload.confirmCode : payload.releaseCode;
        const smsBody = isReq
            ? (language === 'bn'
                ? `আইসোলেট নিশ্চিত। পারমিট ${payload.permitNo}। কোড ${code}।`
                : `ISOLATED confirmed. Permit ${payload.permitNo}. Code ${code}.`)
            : (language === 'bn'
                ? `লাইন চালু নিশ্চিত। পারমিট ${payload.permitNo}। কোড ${code}।`
                : `RE-ENERGIZED confirmed. Permit ${payload.permitNo}. Code ${code}.`);

        const fullBody = `${smsBody}\n${ackLink}`;
        setDone(true);

        if (payload.linemanPhone) {
            openSms(payload.linemanPhone, fullBody);
        } else if (navigator.share) {
            navigator.share({ text: fullBody }).catch(() => {});
        }
    };

    if (done) {
        return (
            <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900">
                <header className={`pt-[env(safe-area-inset-top)] pb-8 px-6 bg-gradient-to-r ${meta.bg} text-white shadow-lg shrink-0`}>
                    <h1 className="text-xl font-black mt-4">{t('Confirmed', 'নিশ্চিত হয়েছে')}</h1>
                </header>
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-6">
                    <div className="text-8xl">✅</div>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-200">{payload.permitNo}</p>
                    <p className="text-sm font-bold text-slate-500">{t('Reply sent to lineman (SMS). They can also read the code on phone.', 'লাইনম্যানকে উত্তর পাঠানো হয়েছে। ফোনে কোড পড়েও নিশ্চিত করতে পারেন।')}</p>
                    <button onClick={onClose} className="w-full max-w-xs py-5 rounded-3xl bg-slate-800 text-white font-black">{t('Done', 'শেষ')}</button>
                </main>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <header className={`pt-[env(safe-area-inset-top)] pb-6 px-5 bg-gradient-to-r ${meta.bg} text-white shadow-lg shrink-0`}>
                <div className="flex items-center gap-3 mt-2">
                    <button onClick={onClose} className="p-2 -ml-2 bg-white/20 rounded-full active:scale-95">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-black">{meta.title[language]}</h1>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{t('Operator', 'অপারেটর')}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-5 flex flex-col justify-center max-w-md mx-auto w-full gap-5">
                <div className="text-center">
                    <div className="text-7xl mb-3">{meta.icon}</div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{payload.permitNo}</p>
                </div>

                <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                        [t('Feeder', 'ফিডার'), payload.feeder],
                        [t('Location', 'স্থান'), payload.location],
                        isReq ? [t('Work', 'কাজ'), payload.work] : null,
                        isReq ? [t('Confirm code', 'কনফার্ম কোড'), payload.confirmCode] : [t('Release code', 'রিলিজ কোড'), payload.releaseCode],
                    ].filter(Boolean).map(([k, v]) => (
                        <div key={k} className="p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{k}</p>
                            <p className="font-black text-slate-800 dark:text-white">{v || '—'}</p>
                        </div>
                    ))}
                </div>

                <p className="text-center text-xs font-bold text-slate-500 px-4">
                    {t('Confirm in app, or read the code on phone to the lineman.', 'অ্যাপে নিশ্চিত করুন, অথবা ফোনে কোড পড়ে শোনান।')}
                </p>

                <button
                    onClick={handleConfirm}
                    className={`w-full py-5 rounded-3xl text-white font-black text-lg shadow-lg active:scale-95 transition-transform bg-gradient-to-r ${meta.bg}`}
                >
                    {meta.confirm[language]}
                </button>

                {payload.linemanPhone && (
                    <button
                        onClick={() => openCall(payload.linemanPhone)}
                        className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm active:scale-95"
                    >
                        📞 {t('Call lineman', 'লাইনম্যানকে ফোন')}
                    </button>
                )}
            </main>
        </div>
    );
}
