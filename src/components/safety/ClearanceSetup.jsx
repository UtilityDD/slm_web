import React, { useState, useEffect } from 'react';
import { loadDatabook, addSubstation, addFeeder, addOperator, addWork } from './databook';
import { loadLinemanPhone, saveLinemanPhone } from './clearanceLinks';
import DatabookManager from './DatabookManager';

const TOTAL = 6;

function ProgressDots({ page }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === page ? 'w-6 bg-white' : i + 1 < page ? 'w-1.5 bg-white/80' : 'w-1.5 bg-white/30'}`} />
            ))}
        </div>
    );
}

function PageTitle({ icon, title, hint }) {
    return (
        <div className="text-center mb-5">
            <div className="text-5xl mb-2">{icon}</div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{title}</h2>
            {hint && <p className="text-xs font-bold text-slate-400 px-6 mt-1">{hint}</p>}
        </div>
    );
}

function Tile({ onClick, label, sub, active }) {
    return (
        <button
            onClick={onClick}
            className={`w-full p-5 rounded-3xl border-2 text-left active:scale-95 transition-all flex items-center justify-between gap-3 ${
                active ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-orange-400'
            }`}
        >
            <span className="min-w-0">
                <span className="block font-black text-base truncate">{label}</span>
                {sub && <span className={`block text-xs font-bold truncate ${active ? 'text-white/80' : 'text-slate-400'}`}>{sub}</span>}
            </span>
            <span className={`text-xl shrink-0 ${active ? 'text-white' : 'text-orange-500'}`}>›</span>
        </button>
    );
}

function AddButton({ onClick, label }) {
    return (
        <button onClick={onClick} className="w-full p-4 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
            ＋ {label}
        </button>
    );
}

export default function ClearanceSetup({ language = 'bn', onCancel, onComplete, onHistory }) {
    const t = (en, bn) => (language === 'bn' ? bn : en);
    const L = (o) => (o ? (o[language] || o.en || '') : '');

    const [book, setBook] = useState({ substations: [], commonWorks: [] });
    const [ready, setReady] = useState(false);
    const [page, setPage] = useState(1);
    const [sel, setSel] = useState({ ssId: '', ssName: '', feeder: null, operator: null, work: '', crew: [], comment: '' });

    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState('');
    const [draft2, setDraft2] = useState('');
    const [crewInput, setCrewInput] = useState('');
    const [myPhone, setMyPhone] = useState('');
    const [managingData, setManagingData] = useState(false);

    const refresh = async () => { const b = await loadDatabook(); setBook(b); return b; };
    useEffect(() => {
        (async () => { await refresh(); setReady(true); })();
        setMyPhone(loadLinemanPhone());
    }, []);

    const currentSS = book.substations.find(s => s.id === sel.ssId) || null;
    const resetAdd = () => { setAdding(false); setDraft(''); setDraft2(''); };
    const goto = (p) => { resetAdd(); setPage(p); };
    const back = () => { if (page > 1) goto(page - 1); else if (onCancel) onCancel(); };

    const pickSS = (ss) => { setSel(s => ({ ...s, ssId: ss.id, ssName: L(ss.name), feeder: null, operator: (ss.operators && ss.operators[0]) || null })); goto(2); };
    const pickFeeder = (f) => { setSel(s => ({ ...s, feeder: { id: f.id, name: L(f.name) } })); goto(3); };
    const pickOperator = (o) => { setSel(s => ({ ...s, operator: o })); goto(4); };
    const pickWork = (w) => { setSel(s => ({ ...s, work: L(w.label) })); goto(5); };

    const saveNewSS = () => {
        const name = draft.trim(); if (!name) return;
        const op = draft2.trim() ? { name, phone: draft2.trim() } : null;
        const id = addSubstation(name, op);
        resetAdd();
        refresh().then(b => { const ss = b.substations.find(s => s.id === id); if (ss) pickSS(ss); });
    };
    const saveNewFeeder = () => {
        const name = draft.trim(); if (!name || !sel.ssId) return;
        const f = addFeeder(sel.ssId, name);
        resetAdd();
        refresh().then(() => pickFeeder(f));
    };
    const saveNewOperator = () => {
        const phone = draft2.trim(); if (!phone || !sel.ssId) return;
        const name = draft.trim() || sel.ssName;
        addOperator(sel.ssId, { name, phone });
        resetAdd();
        refresh().then(() => pickOperator({ name, phone }));
    };
    const saveNewWork = () => {
        const label = draft.trim(); if (!label) return;
        const w = addWork(label);
        resetAdd();
        refresh().then(() => pickWork(w));
    };

    const addCrew = () => { const v = crewInput.trim(); if (v) { setSel(s => ({ ...s, crew: [...s.crew, v] })); setCrewInput(''); } };

    const finish = () => {
        if (myPhone.trim()) saveLinemanPhone(myPhone.trim());
        onComplete({
            feeder: sel.feeder ? sel.feeder.name : '',
            location: sel.ssName,
            work: sel.work,
            operator: sel.operator || { name: '', phone: '' },
            crew: sel.crew,
            comment: sel.comment.trim(),
            linemanPhone: myPhone.trim(),
        });
    };

    const inputCls = 'w-full p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 font-bold outline-none focus:border-orange-500';

    if (managingData) {
        return (
            <DatabookManager
                language={language}
                onClose={() => { setManagingData(false); refresh(); }}
            />
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <header className="pt-[env(safe-area-inset-top)] pb-5 px-5 bg-gradient-to-r from-blue-700 to-purple-600 text-white shadow-lg shrink-0">
                <div className="flex items-center gap-3 mt-2">
                    <button onClick={back} className="p-2 -ml-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-black tracking-tight">{t('Lineman', 'লাইনম্যান')}</h1>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{t('Step', 'ধাপ')} {page} / {TOTAL}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {page === 1 && (
                            <button onClick={() => setManagingData(true)} className="px-3 py-2 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20">
                                {t('Data', 'ডেটা')}
                            </button>
                        )}
                        {onHistory && page === 1 && (
                            <button onClick={onHistory} className="px-3 py-2 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20">
                                {t('History', 'হিস্ট্রি')}
                            </button>
                        )}
                    </div>
                </div>
                <div className="mt-3"><ProgressDots page={page} /></div>
            </header>

            <main className="flex-1 overflow-y-auto p-5">
                <div className="max-w-md mx-auto w-full space-y-3">
                    {!ready ? (
                        <div className="py-32 text-center text-slate-400 font-bold animate-pulse">{t('Loading data book...', 'ডেটা বুক লোড হচ্ছে...')}</div>
                    ) : (
                        <>
                            {page === 1 && (
                                <>
                                    <PageTitle icon="🏢" title={t('Which substation?', 'কোন সাবস্টেশন?')} hint={t('Tap your substation. Add a new one if missing.', 'আপনার সাবস্টেশন বেছে নিন। না থাকলে নতুন যোগ করুন।')} />
                                    {book.substations.map(ss => (
                                        <Tile key={ss.id} label={L(ss.name)} sub={ss.operators[0] ? ss.operators[0].phone : ''} active={sel.ssId === ss.id} onClick={() => pickSS(ss)} />
                                    ))}
                                    {adding ? (
                                        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 space-y-3">
                                            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={t('Substation name', 'সাবস্টেশনের নাম')} className={inputCls} autoFocus />
                                            <input type="tel" value={draft2} onChange={e => setDraft2(e.target.value)} placeholder={t('Operator phone (optional)', 'অপারেটরের ফোন (ঐচ্ছিক)')} className={inputCls} />
                                            <div className="flex gap-2">
                                                <button onClick={resetAdd} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-sm">{t('Cancel', 'বাতিল')}</button>
                                                <button onClick={saveNewSS} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-black text-sm">{t('Save', 'সেভ')}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <AddButton onClick={() => setAdding(true)} label={t('Add new substation', 'নতুন সাবস্টেশন')} />
                                    )}
                                </>
                            )}

                            {page === 2 && (
                                <>
                                    <PageTitle icon="🔌" title={t('Which feeder / line?', 'কোন ফিডার / লাইন?')} hint={sel.ssName} />
                                    {currentSS && currentSS.feeders.map(f => (
                                        <Tile key={f.id} label={L(f.name)} active={sel.feeder && sel.feeder.id === f.id} onClick={() => pickFeeder(f)} />
                                    ))}
                                    {adding ? (
                                        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 space-y-3">
                                            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={t('Feeder / line name', 'ফিডার / লাইনের নাম')} className={inputCls} autoFocus />
                                            <div className="flex gap-2">
                                                <button onClick={resetAdd} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-sm">{t('Cancel', 'বাতিল')}</button>
                                                <button onClick={saveNewFeeder} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-black text-sm">{t('Save', 'সেভ')}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <AddButton onClick={() => setAdding(true)} label={t('Add new feeder', 'নতুন ফিডার')} />
                                    )}
                                </>
                            )}

                            {page === 3 && (
                                <>
                                    <PageTitle icon="📞" title={t('Substation operator', 'সাবস্টেশন অপারেটর')} hint={t('Confirm who to contact for shutdown.', 'শাটডাউনের জন্য কাকে যোগাযোগ করবেন নিশ্চিত করুন।')} />
                                    {currentSS && currentSS.operators.map((o, i) => (
                                        <Tile key={o.phone + i} label={o.name || o.phone} sub={o.phone} active={sel.operator && sel.operator.phone === o.phone} onClick={() => pickOperator(o)} />
                                    ))}
                                    {adding ? (
                                        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 space-y-3">
                                            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={t('Operator name (optional)', 'অপারেটরের নাম (ঐচ্ছিক)')} className={inputCls} />
                                            <input type="tel" value={draft2} onChange={e => setDraft2(e.target.value)} placeholder={t('Operator phone', 'অপারেটরের ফোন')} className={inputCls} autoFocus />
                                            <div className="flex gap-2">
                                                <button onClick={resetAdd} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-sm">{t('Cancel', 'বাতিল')}</button>
                                                <button onClick={saveNewOperator} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-black text-sm">{t('Save', 'সেভ')}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <AddButton onClick={() => setAdding(true)} label={t('Add operator', 'অপারেটর যোগ করুন')} />
                                    )}
                                </>
                            )}

                            {page === 4 && (
                                <>
                                    <PageTitle icon="🛠️" title={t('What is the work?', 'কী কাজ?')} hint={t('Pick the job or add a new one.', 'কাজ বেছে নিন বা নতুন যোগ করুন।')} />
                                    {book.commonWorks.map(w => (
                                        <Tile key={w.id} label={L(w.label)} active={sel.work === L(w.label)} onClick={() => pickWork(w)} />
                                    ))}
                                    {adding ? (
                                        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 space-y-3">
                                            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={t('Work description', 'কাজের বিবরণ')} className={inputCls} autoFocus />
                                            <div className="flex gap-2">
                                                <button onClick={resetAdd} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-sm">{t('Cancel', 'বাতিল')}</button>
                                                <button onClick={saveNewWork} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-black text-sm">{t('Save', 'সেভ')}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <AddButton onClick={() => setAdding(true)} label={t('Add new work', 'নতুন কাজ')} />
                                    )}
                                </>
                            )}

                            {page === 5 && (
                                <>
                                    <PageTitle icon="👷" title={t('Any crew with you?', 'সাথে কেউ আছেন?')} hint={t('Optional. Add crew and a note for the operator.', 'ঐচ্ছিক। কর্মী ও অপারেটরের জন্য মন্তব্য যোগ করুন।')} />
                                    <div className="flex gap-2">
                                        <input value={crewInput} onChange={e => setCrewInput(e.target.value)} placeholder={t('Worker name', 'কর্মীর নাম')} className={inputCls} />
                                        <button onClick={addCrew} className="px-5 rounded-xl bg-slate-800 text-white font-black text-xl active:scale-95">＋</button>
                                    </div>
                                    {sel.crew.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {sel.crew.map((c, i) => (
                                                <span key={c + i} className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold flex items-center gap-2">{c}<button onClick={() => setSel(s => ({ ...s, crew: s.crew.filter((_, j) => j !== i) }))} className="text-slate-400 hover:text-red-500">✕</button></span>
                                            ))}
                                        </div>
                                    )}
                                    <label className="block pt-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">{t('Comment (optional)', 'মন্তব্য (ঐচ্ছিক)')}</span>
                                        <textarea
                                            value={sel.comment}
                                            onChange={e => setSel(s => ({ ...s, comment: e.target.value }))}
                                            placeholder={t('e.g. pole no. 42, near market', 'যেমন খুঁটি নং ৪২, বাজারের কাছে')}
                                            rows={3}
                                            className={`${inputCls} mt-1 resize-none`}
                                        />
                                    </label>
                                    <button onClick={() => goto(6)} className="w-full py-4 rounded-3xl bg-blue-700 text-white font-black mt-2 active:scale-95 transition-transform">{sel.crew.length ? t('Continue', 'এগিয়ে যান') : t('Skip — Continue', 'বাদ দিয়ে এগিয়ে যান')}</button>
                                </>
                            )}

                            {page === 6 && (
                                <>
                                    <PageTitle icon="✅" title={t('Ready to start', 'শুরু করতে প্রস্তুত')} hint={t('Check the details, then start.', 'বিবরণ দেখে নিন, তারপর শুরু করুন।')} />
                                    <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                                        {[
                                            [t('Substation', 'সাবস্টেশন'), sel.ssName, () => goto(1)],
                                            [t('Feeder', 'ফিডার'), sel.feeder ? sel.feeder.name : '-', () => goto(2)],
                                            [t('Operator', 'অপারেটর'), sel.operator ? `${sel.operator.name || ''} ${sel.operator.phone || ''}`.trim() : '-', () => goto(3)],
                                            [t('Work', 'কাজ'), sel.work || '-', () => goto(4)],
                                            [t('Crew', 'কর্মী'), sel.crew.length ? sel.crew.join(', ') : t('None', 'কেউ না'), () => goto(5)],
                                            ...(sel.comment.trim() ? [[t('Comment', 'মন্তব্য'), sel.comment.trim(), () => goto(5)]] : []),
                                        ].map(([k, v, edit]) => (
                                            <button key={k} onClick={edit} className="w-full flex items-center justify-between gap-3 p-4 text-left active:bg-slate-50 dark:active:bg-slate-800">
                                                <span className="min-w-0">
                                                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{k}</span>
                                                    <span className="block font-black text-slate-800 dark:text-white truncate">{v}</span>
                                                </span>
                                                <span className="text-orange-500 text-xs font-black uppercase shrink-0">{t('Edit', 'বদল')}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <label className="block px-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('Your phone (for operator app reply)', 'আপনার ফোন (অপারেটর অ্যাপ উত্তর)')}</span>
                                        <input type="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)} placeholder={t('Mobile number', 'মোবাইল নম্বর')} className="mt-1 w-full p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 font-bold outline-none focus:border-orange-500" />
                                    </label>
                                    <button
                                        onClick={finish}
                                        disabled={!sel.feeder || !sel.operator || !sel.operator.phone}
                                        className="w-full py-5 rounded-3xl bg-orange-600 text-white font-black text-lg shadow-lg shadow-orange-600/30 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 mt-2"
                                    >
                                        {t('Create Permit & Start', 'পারমিট তৈরি করে শুরু করুন')}
                                    </button>
                                    {(!sel.feeder || !sel.operator || !sel.operator.phone) && (
                                        <p className="text-center text-[11px] font-bold text-red-500">{t('Feeder and operator phone are required.', 'ফিডার ও অপারেটরের ফোন প্রয়োজন।')}</p>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
