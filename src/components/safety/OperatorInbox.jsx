import React, { useState, useEffect, useRef } from 'react';
import OperatorOnlineRequest from './OperatorOnlineRequest';
import usePtwWatch from './usePtwWatch';
import { playOperatorAlertBeeps } from './ptwAlerts';
import { statusLabel, isOnline, normalizePhone } from './ptwOnline';
import {
    OPERATOR_PHONE_KEY,
} from './clearanceLinks';

function loadOperatorPhone() {
    try {
        return localStorage.getItem(OPERATOR_PHONE_KEY) || '';
    } catch (e) {
        return '';
    }
}

function saveOperatorPhone(phone) {
    try {
        if (phone) localStorage.setItem(OPERATOR_PHONE_KEY, phone);
    } catch (e) { /* noop */ }
}

const PENDING_STATUSES = new Set(['submitted', 'accepted', 'shutdown_confirmed', 'work_started']);

export default function OperatorInbox({ language = 'bn', onClose }) {
    const t = (en, bn) => (language === 'bn' ? bn : en);
    const [phone, setPhone] = useState(() => loadOperatorPhone());
    const [phoneInput, setPhoneInput] = useState(() => loadOperatorPhone());
    const [permits, setPermits] = useState([]);
    const [selected, setSelected] = useState(null);
    const lastSubmittedCountRef = useRef(0);

    const online = isOnline();
    const phoneReady = normalizePhone(phone).length >= 10;

    usePtwWatch({
        role: 'operator',
        operatorPhone: phone,
        enabled: online && phoneReady,
        onUpdate: (rows) => {
            const list = Array.isArray(rows) ? rows : [];
            const submitted = list.filter((r) => r.status === 'submitted').length;
            if (submitted > lastSubmittedCountRef.current) {
                playOperatorAlertBeeps();
            }
            lastSubmittedCountRef.current = submitted;
            setPermits(list);
            if (selected) {
                const fresh = list.find((r) => r.id === selected.id || r.permit_no === selected.permit_no);
                if (fresh) setSelected(fresh);
            }
        },
    });

    useEffect(() => {
        if (!selected) return;
        const fresh = permits.find((r) => r.id === selected.id);
        if (fresh) setSelected(fresh);
    }, [permits, selected]);

    const savePhone = () => {
        const n = normalizePhone(phoneInput);
        if (n.length < 10) return;
        saveOperatorPhone(phoneInput.trim());
        setPhone(phoneInput.trim());
    };

    if (selected) {
        return (
            <OperatorOnlineRequest
                row={selected}
                operatorPhone={phone}
                language={language}
                onBack={() => setSelected(null)}
                onUpdated={(row) => {
                    setSelected(row);
                    setPermits((prev) => prev.map((p) => (p.id === row.id ? row : p)));
                }}
            />
        );
    }

    const pending = permits.filter((p) => PENDING_STATUSES.has(p.status));

    return (
        <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <header className="pt-[env(safe-area-inset-top)] pb-6 px-5 bg-gradient-to-br from-teal-700 to-teal-600 text-white shadow-lg shrink-0">
                <div className="flex items-center gap-3 mt-2">
                    <button type="button" onClick={onClose} className="p-2 -ml-2 bg-white/20 rounded-full active:scale-95">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-black">{t('Pending requests', 'অপেক্ষমাণ অনুরোধ')}</h1>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                            {online ? t('Online', 'অনলাইন') : t('Offline — use SMS link', 'অফলাইন — এসএমএস লিংক ব্যবহার করুন')}
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-5 max-w-md mx-auto w-full space-y-4">
                {!phoneReady && (
                    <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-200 space-y-3">
                        <p className="text-sm font-black">{t('Your control room phone', 'আপনার কন্ট্রোল রুমের ফোন')}</p>
                        <input
                            type="tel"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            placeholder={t('10-digit mobile', '১০ অঙ্কের মোবাইল')}
                            className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold outline-none focus:border-teal-500"
                        />
                        <button
                            type="button"
                            onClick={savePhone}
                            className="w-full py-3 rounded-xl bg-teal-600 text-white font-black"
                        >
                            {t('Save & load requests', 'সেভ করুন ও অনুরোধ দেখুন')}
                        </button>
                    </div>
                )}

                {phoneReady && (
                    <p className="text-xs font-bold text-slate-500 text-center">
                        {t('Phone', 'ফোন')}: {phone}
                        {' · '}
                        <button type="button" className="text-teal-600 underline" onClick={() => setPhone('')}>
                            {t('Change', 'বদলান')}
                        </button>
                    </p>
                )}

                {phoneReady && pending.length === 0 && (
                    <div className="text-center py-12 space-y-3">
                        <div className="text-6xl opacity-40">📭</div>
                        <p className="font-black text-slate-500">{t('No pending requests', 'কোনো অপেক্ষমাণ অনুরোধ নেই')}</p>
                        <p className="text-sm font-bold text-slate-400 px-4">
                            {t('Lineman requests appear here when submitted online. SMS links still work.', 'লাইনম্যান অনলাইনে জমা দিলে এখানে দেখা যাবে। এসএমএস লিংকও কাজ করবে।')}
                        </p>
                    </div>
                )}

                {pending.map((row) => (
                    <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelected(row)}
                        className={`w-full text-left p-4 rounded-2xl border-2 active:scale-[0.99] transition-transform ${
                            row.status === 'submitted'
                                ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/20 animate-pulse'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                    >
                        <div className="flex justify-between items-start gap-2">
                            <p className="font-black text-sm">{row.permit_no}</p>
                            <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
                                {statusLabel(row.status, language)}
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-1 truncate">{row.feeder} · {row.location}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">
                            {new Date(row.submitted_at).toLocaleString()}
                        </p>
                    </button>
                ))}
            </main>
        </div>
    );
}

export { loadOperatorPhone, saveOperatorPhone };
