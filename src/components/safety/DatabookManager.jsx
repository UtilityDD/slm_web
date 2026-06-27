import React, { useState, useEffect, useCallback } from 'react';
import {
    loadDatabook,
    addSubstation, addFeeder, addOperator, addWork,
    renameSubstation, renameFeeder, updateOperator, renameWork,
    removeSubstation, removeFeeder, removeOperator, removeWork,
} from './databook';

const inputCls = 'w-full p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 font-bold outline-none focus:border-orange-500';

function Row({ label, sub, onEdit, onDelete, t }) {
    return (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{label}</p>
                {sub && <p className="text-[11px] font-bold text-slate-400 truncate">{sub}</p>}
            </div>
            <button onClick={onEdit} className="px-3 py-2 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-[10px] font-black uppercase active:scale-95">{t('Edit', 'বদল')}</button>
            <button onClick={onDelete} className="p-2 text-red-400 active:scale-95 text-lg">✕</button>
        </div>
    );
}

function EditBox({ fields, onSave, onCancel, t }) {
    const [vals, setVals] = useState(fields.map(f => f.value));
    return (
        <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-300 dark:border-orange-800 space-y-3">
            {fields.map((f, i) => (
                <input
                    key={f.key}
                    type={f.type || 'text'}
                    value={vals[i]}
                    onChange={e => { const n = [...vals]; n[i] = e.target.value; setVals(n); }}
                    placeholder={f.placeholder}
                    className={inputCls}
                />
            ))}
            <div className="flex gap-2">
                <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-sm">{t('Cancel', 'বাতিল')}</button>
                <button onClick={() => onSave(vals)} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-black text-sm">{t('Save', 'সেভ')}</button>
            </div>
        </div>
    );
}

export default function DatabookManager({ language = 'bn', onClose }) {
    const t = (en, bn) => (language === 'bn' ? bn : en);
    const L = (o) => (o ? (o[language] || o.en || '') : '');

    const [book, setBook] = useState({ substations: [], commonWorks: [] });
    const [ssId, setSsId] = useState(null);
    const [edit, setEdit] = useState(null);

    const refresh = useCallback(async () => {
        setBook(await loadDatabook());
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const ss = ssId ? book.substations.find(s => s.id === ssId) : null;
    const confirmDel = (msg, fn) => { if (window.confirm(msg)) { fn(); refresh(); } };

    const addRow = (kind) => {
        if (kind === 'ss') setEdit({ kind: 'new_ss', fields: [{ key: 'n', placeholder: t('Substation name', 'সাবস্টেশন'), value: '' }, { key: 'p', placeholder: t('Operator phone', 'ফোন'), value: '', type: 'tel' }] });
        if (kind === 'fdr' && ss) setEdit({ kind: 'new_fdr', ssId: ss.id, fields: [{ key: 'n', placeholder: t('Feeder name', 'ফিডার'), value: '' }] });
        if (kind === 'op' && ss) setEdit({ kind: 'new_op', ssId: ss.id, fields: [{ key: 'n', placeholder: t('Name', 'নাম'), value: '' }, { key: 'p', placeholder: t('Phone', 'ফোন'), value: '', type: 'tel' }] });
        if (kind === 'work') setEdit({ kind: 'new_work', fields: [{ key: 'n', placeholder: t('Work name', 'কাজের নাম'), value: '' }] });
    };

    const saveEdit = (vals) => {
        const e = edit;
        setEdit(null);
        if (!e) return;
        if (e.kind === 'new_ss') {
            const id = addSubstation(vals[0], vals[1] ? { name: vals[0], phone: vals[1] } : null);
            refresh().then(() => setSsId(id));
            return;
        }
        if (e.kind === 'new_fdr') { addFeeder(e.ssId, vals[0]); refresh(); return; }
        if (e.kind === 'new_op') { addOperator(e.ssId, { name: vals[0], phone: vals[1] }); refresh(); return; }
        if (e.kind === 'new_work') {
            if ((vals[0] || '').trim()) addWork(vals[0]);
            refresh();
            return;
        }
        if (e.kind === 'ss') { renameSubstation(e.ssId, vals[0]); refresh(); return; }
        if (e.kind === 'fdr') { renameFeeder(e.ssId, e.fdrId, vals[0]); refresh(); return; }
        if (e.kind === 'op') { updateOperator(e.ssId, e.phone, vals[0], vals[1]); refresh(); return; }
        if (e.kind === 'work') { renameWork(e.workId, vals[0]); refresh(); }
    };

    const worksSection = (
        <>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('Common works', 'সাধারণ কাজ')}</p>
            {book.commonWorks.map(w => (
                <Row
                    key={w.id}
                    label={L(w.label)}
                    onEdit={() => setEdit({ kind: 'work', workId: w.id, fields: [{ key: 'n', placeholder: t('Work', 'কাজ'), value: L(w.label) }] })}
                    onDelete={() => confirmDel(t('Delete this work?', 'এই কাজ মুছবেন?'), () => removeWork(w.id))}
                    t={t}
                />
            ))}
            <button
                onClick={() => addRow('work')}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-orange-400 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20 font-black text-sm text-orange-700 dark:text-orange-300 active:scale-95"
            >
                ＋ {t('Add new work', 'নতুন কাজ যোগ')}
            </button>
        </>
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <header className="pt-[env(safe-area-inset-top)] pb-5 px-5 bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg shrink-0">
                <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => (ssId ? setSsId(null) : onClose())} className="p-2 -ml-2 bg-white/20 rounded-full active:scale-95">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-black">{ss ? L(ss.name) : t('Data Book', 'ডেটা বুক')}</h1>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                            {ss ? t('Feeders & operators', 'ফিডার ও অপারেটর') : t('Tap to edit', 'বদলতে ট্যাপ করুন')}
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-3 max-w-md mx-auto w-full pb-24">
                {edit && edit.kind !== 'new_work' && edit.kind !== 'work' && (
                    <EditBox fields={edit.fields} onSave={saveEdit} onCancel={() => setEdit(null)} t={t} />
                )}

                {(edit?.kind === 'new_work' || edit?.kind === 'work') && (
                    <EditBox fields={edit.fields} onSave={saveEdit} onCancel={() => setEdit(null)} t={t} />
                )}

                {!ss && !(edit?.kind === 'new_work' || edit?.kind === 'work') && worksSection}

                {!ss && !edit && (
                    <>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pt-2">{t('Substations', 'সাবস্টেশন')}</p>
                        {book.substations.map(s => (
                            <button key={s.id} onClick={() => setSsId(s.id)} className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] flex justify-between items-center">
                                <span className="font-black">{L(s.name)}</span>
                                <span className="text-orange-500 text-xl">›</span>
                            </button>
                        ))}
                        <button onClick={() => addRow('ss')} className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 font-black text-sm text-slate-500">＋ {t('Add substation', 'সাবস্টেশন যোগ')}</button>
                    </>
                )}

                {ss && !edit && (
                    <>
                        <Row
                            label={L(ss.name)}
                            sub={t('Substation name', 'সাবস্টেশনের নাম')}
                            onEdit={() => setEdit({ kind: 'ss', ssId: ss.id, fields: [{ key: 'n', placeholder: t('Name', 'নাম'), value: L(ss.name) }] })}
                            onDelete={() => confirmDel(t('Delete substation?', 'সাবস্টেশন মুছবেন?'), () => { removeSubstation(ss.id); setSsId(null); })}
                            t={t}
                        />

                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pt-2">{t('Feeders', 'ফিডার')}</p>
                        {ss.feeders.map(f => (
                            <Row
                                key={f.id}
                                label={L(f.name)}
                                onEdit={() => setEdit({ kind: 'fdr', ssId: ss.id, fdrId: f.id, fields: [{ key: 'n', placeholder: t('Feeder', 'ফিডার'), value: L(f.name) }] })}
                                onDelete={() => confirmDel(t('Delete feeder?', 'ফিডার মুছবেন?'), () => removeFeeder(ss.id, f.id))}
                                t={t}
                            />
                        ))}
                        <button onClick={() => addRow('fdr')} className="w-full p-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 font-black text-xs text-slate-500">＋ {t('Add feeder', 'ফিডার যোগ')}</button>

                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pt-2">{t('Operators', 'অপারেটর')}</p>
                        {ss.operators.map((o, i) => (
                            <Row
                                key={o.phone + i}
                                label={o.name || o.phone}
                                sub={o.phone}
                                onEdit={() => setEdit({ kind: 'op', ssId: ss.id, phone: o.phone, fields: [{ key: 'n', placeholder: t('Name', 'নাম'), value: o.name || '' }, { key: 'p', placeholder: t('Phone', 'ফোন'), value: o.phone, type: 'tel' }] })}
                                onDelete={() => confirmDel(t('Delete operator?', 'অপারেটর মুছবেন?'), () => removeOperator(ss.id, o.phone))}
                                t={t}
                            />
                        ))}
                        <button onClick={() => addRow('op')} className="w-full p-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 font-black text-xs text-slate-500">＋ {t('Add operator', 'অপারেটর যোগ')}</button>
                    </>
                )}
            </main>

            {!edit && (
                <footer className="shrink-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => addRow('work')}
                        className="w-full max-w-md mx-auto block py-4 rounded-2xl bg-orange-600 text-white font-black text-sm active:scale-95 shadow-lg shadow-orange-600/20"
                    >
                        ＋ {t('Add new work', 'নতুন কাজ যোগ')}
                    </button>
                </footer>
            )}
        </div>
    );
}
