import React, { useState } from 'react';
import {
    linemanIsolateAckLink,
    linemanReenergizeAckLink,
    saveOperatorConfirmation,
} from './clearanceLinks';
import { generateOperatorCode } from './clearanceData';
import PinGate from './PinGate';
import usePinGate from './usePinGate';

const openSms = (phone, body) => {
    window.location.href = `sms:${phone || ''}?body=${encodeURIComponent(body)}`;
};
const openCall = (phone) => { if (phone) window.location.href = `tel:${phone}`; };

const ACT_META = {
    req: {
        icon: '🔌',
        title: { en: 'Isolation Request', bn: 'আইসোলেশনের অনুরোধ' },
        confirm: { en: 'Confirm Isolated', bn: 'আইসোলেশন নিশ্চিত করুন' },
        bg: 'from-purple-600 to-purple-500',
    },
    ren: {
        icon: '⚡',
        title: { en: 'Re-energize Request', bn: 'লাইন চালু করার অনুরোধ' },
        confirm: { en: 'Confirm Re-energized', bn: 'লাইন চালু করা নিশ্চিত করুন' },
        bg: 'from-rose-600 to-rose-500',
    },
};

export default function OperatorConfirm({ payload, language = 'bn', onClose }) {
    const t = (en, bn) => (language === 'bn' ? bn : en);
    const [done, setDone] = useState(false);
    const [issuedCode, setIssuedCode] = useState('');
    const { requestPin, pinGateProps } = usePinGate();

    const act = payload?.act;
    const meta = ACT_META[act];
    const isReq = act === 'req';
    const isRen = act === 'ren';

    if (!meta || (!isReq && !isRen)) {
        return (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900 p-6 items-center justify-center text-center">
                <div className="text-6xl mb-4 opacity-30">🔗</div>
                <p className="font-black text-slate-600 dark:text-slate-300">{t('Invalid or expired link.', 'লিংকটি সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে।')}</p>
                <button onClick={onClose} className="mt-6 px-8 py-4 rounded-2xl bg-slate-800 text-white font-black">{t('Close', 'বন্ধ করুন')}</button>
            </div>
        );
    }

    const permitStub = {
        permitNo: payload.permitNo,
        confirmCode: payload.confirmCode || '',
        releaseCode: payload.releaseCode || '',
        job: { feeder: payload.feeder, location: payload.location, work: payload.work },
    };

    const handleConfirm = () => {
        const code = generateOperatorCode();
        setIssuedCode(code);

        const stub = {
            ...permitStub,
            confirmCode: isReq ? code : permitStub.confirmCode,
            releaseCode: isRen ? code : permitStub.releaseCode,
        };

        saveOperatorConfirmation({
            permitNo: payload.permitNo,
            act,
            feeder: payload.feeder,
            via: 'app',
            pinVerified: true,
            code,
        });

        const ackLink = isReq
            ? linemanIsolateAckLink(stub)
            : linemanReenergizeAckLink(stub);

        const smsBody = isReq
            ? (language === 'bn'
                ? `আইসোলেশন নিশ্চিত করা হয়েছে। পারমিট নম্বর: ${payload.permitNo}। কনফার্ম কোড: ${code}।`
                : `ISOLATED confirmed. Permit ${payload.permitNo}. Code ${code}.`)
            : (language === 'bn'
                ? `লাইন চালু করা নিশ্চিত করা হয়েছে। পারমিট নম্বর: ${payload.permitNo}। রিলিজ কোড: ${code}।`
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
                    <h1 className="text-xl font-black mt-4">{t('Confirmed', 'নিশ্চিত করা হয়েছে')}</h1>
                </header>
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-6">
                    <div className="text-8xl">✅</div>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-200">{payload.permitNo}</p>
                    {issuedCode && (
                        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-300 dark:border-teal-800 w-full max-w-xs">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                {isReq ? t('Confirm code for lineman', 'লাইনম্যানের জন্য কনফার্ম কোড') : t('Release code for lineman', 'লাইনম্যানের জন্য রিলিজ কোড')}
                            </p>
                            <p className="text-4xl font-black tracking-[0.4em] text-teal-700 dark:text-teal-300">{issuedCode}</p>
                            <p className="text-xs font-bold text-slate-500 mt-3">{t('Read on phone if lineman has no data.', 'লাইনম্যানের ইন্টারনেট না থাকলে ফোনে কল করে কোডটি জানিয়ে দিন।')}</p>
                        </div>
                    )}
                    <p className="text-sm font-bold text-slate-500">{t('Reply sent to lineman (SMS). Lineman must enter this code to proceed.', 'লাইনম্যানকে এসএমএস (SMS) পাঠানো হয়েছে। কাজ শুরু করতে তাকে এই কোডটি লিখতে হবে।')}</p>
                    <button onClick={onClose} className="w-full max-w-xs py-5 rounded-3xl bg-slate-800 text-white font-black">{t('Done', 'সম্পন্ন')}</button>
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
                        isReq ? [t('Work', 'কাজের বিবরণ'), payload.work] : null,
                    ].filter(Boolean).map(([k, v]) => (
                        <div key={k} className="p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{k}</p>
                            <p className="font-black text-slate-800 dark:text-white">{v || '—'}</p>
                        </div>
                    ))}
                </div>

                <p className="text-center text-xs font-bold text-slate-500 px-4">
                    {isReq
                        ? t('After isolating the line, confirm here. A new code will be sent to the lineman.', 'লাইন আইসোলেট করার পর এখানে নিশ্চিত করুন। একটি নতুন কোড লাইনম্যানের কাছে পাঠানো হবে।')
                        : t('After re-energizing, confirm here. A release code will be sent to the lineman.', 'লাইন চালু করার পর এখানে নিশ্চিত করুন। একটি রিলিজ কোড লাইনম্যানের কাছে পাঠানো হবে।')}
                </p>

                <button
                    onClick={() => requestPin('operator_confirm', handleConfirm)}
                    className={`w-full py-5 rounded-3xl text-white font-black text-lg shadow-lg active:scale-95 transition-transform bg-gradient-to-r ${meta.bg}`}
                >
                    {meta.confirm[language]}
                </button>

                {payload.linemanPhone && (
                    <button
                        onClick={() => openCall(payload.linemanPhone)}
                        className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm active:scale-95"
                    >
                        📞 {t('Call lineman', 'লাইনম্যানকে কল করুন')}
                    </button>
                )}
            </main>
            <PinGate {...pinGateProps} language={language} />
        </div>
    );
}
