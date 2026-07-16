import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    VISUAL_QUIZ_BATCH_02_URL,
    VISUAL_QUIZ_BATCH_03_URL,
    VISUAL_QUIZ_BATCH_04_URL,
    VISUAL_QUIZ_BATCH_05_URL,
    VISUAL_QUIZ_BATCH_06_URL,
    VISUAL_QUIZ_BATCH_07_URL,
    VISUAL_QUIZ_BATCH_08_URL,
    VISUAL_QUIZ_MISTAKE_PREVIEW_URL,
    VISUAL_QUIZ_MATERIAL_PREVIEW_URL,
    VISUAL_QUIZ_PROCEDURE_PREVIEW_URL,
    VISUAL_QUIZ_LIVE_CSV_URL,
    parseVisualQuizCSV,
    rowsToVisualQuestions,
} from '../utils/visualQuizCsv';
import {
    detectAnswerLeakWarnings,
    sanitizeVisualQuestionRow,
} from '../utils/visualQuizSanitize';
import {
    handleImageLoadError,
    isImageOption,
    toDisplayImageUrl,
} from '../utils/visualQuizImageUtils';

const SOURCES = {
    live: { id: 'live', labelBn: 'লাইভ Google Sheet', labelEn: 'Live Google Sheet', url: VISUAL_QUIZ_LIVE_CSV_URL },
    mistakePreview: {
        id: 'mistakePreview',
        labelBn: 'Draft: Spot-the-mistake preview',
        labelEn: 'Draft: Spot-the-mistake preview',
        url: VISUAL_QUIZ_MISTAKE_PREVIEW_URL,
    },
    materialPreview: {
        id: 'materialPreview',
        labelBn: 'Draft: Material identification',
        labelEn: 'Draft: Material identification',
        url: VISUAL_QUIZ_MATERIAL_PREVIEW_URL,
    },
    procedurePreview: {
        id: 'procedurePreview',
        labelBn: 'Draft: Procedure / workflow',
        labelEn: 'Draft: Procedure / workflow',
        url: VISUAL_QUIZ_PROCEDURE_PREVIEW_URL,
    },
    batch02: { id: 'batch02', labelBn: 'Draft: Batch 02 (vq-120+)', labelEn: 'Draft: Batch 02 (vq-120+)', url: VISUAL_QUIZ_BATCH_02_URL },
    batch03: { id: 'batch03', labelBn: 'Draft: Batch 03 — TCEE Unit 3 Symbols (vq-138+)', labelEn: 'Draft: Batch 03 — TCEE Unit 3 Symbols (vq-138+)', url: VISUAL_QUIZ_BATCH_03_URL },
    batch04: { id: 'batch04', labelBn: 'Draft: Batch 04 — Lineman Hand Tools (vq-162+)', labelEn: 'Draft: Batch 04 — Lineman Hand Tools (vq-162+)', url: VISUAL_QUIZ_BATCH_04_URL },
    batch05: { id: 'batch05', labelBn: 'Draft: Batch 05 — ACSR Conductors (vq-185+)', labelEn: 'Draft: Batch 05 — ACSR Conductors (vq-185+)', url: VISUAL_QUIZ_BATCH_05_URL },
    batch06: { id: 'batch06', labelBn: 'Draft: Batch 06 — DTR Parts (vq-225+)', labelEn: 'Draft: Batch 06 — DTR Parts (vq-225+)', url: VISUAL_QUIZ_BATCH_06_URL },
    batch07: { id: 'batch07', labelBn: 'Draft: Batch 07 — Substation & Safety (vq-345+)', labelEn: 'Draft: Batch 07 — Substation & Safety (vq-345+)', url: VISUAL_QUIZ_BATCH_07_URL },
    batch08: { id: 'batch08', labelBn: 'Draft: Batch 08 — Wire Gauge Measurement (vq-395+)', labelEn: 'Draft: Batch 08 — Wire Gauge Measurement (vq-395+)', url: VISUAL_QUIZ_BATCH_08_URL },
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function VisualQuizPreview({ language = 'bn', setCurrentView }) {
    const isBn = language === 'bn';
    const [sourceId, setSourceId] = useState('batch08');
    const [includeDisabled, setIncludeDisabled] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showHint, setShowHint] = useState(true);
    const [brokenImages, setBrokenImages] = useState({});
    const [leakWarningsById, setLeakWarningsById] = useState({});

    const loadFromText = useCallback((csvText, { fromUpload = false } = {}) => {
        const rows = parseVisualQuizCSV(csvText);
        const warnings = {};
        for (const row of rows) {
            const id = String(row.id || '').trim();
            if (!id) continue;
            const sanitized = sanitizeVisualQuestionRow(row);
            const rowWarnings = detectAnswerLeakWarnings(sanitized);
            if (rowWarnings.length) warnings[id] = rowWarnings;
        }
        const parsed = rowsToVisualQuestions(rows, { language: 'bn', includeDisabled });
        setQuestions(parsed);
        setLeakWarningsById(warnings);
        setCurrentIndex(0);
        setShowHint(true);
        setBrokenImages({});
        setError('');
        if (fromUpload) setSourceId('upload');
    }, [includeDisabled]);

    const loadSource = useCallback(async (id) => {
        if (id === 'upload') return;
        const source = SOURCES[id];
        if (!source) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${source.url}${source.url.includes('?') ? '&' : '?'}v=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();
            loadFromText(csvText);
        } catch (err) {
            setQuestions([]);
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    }, [loadFromText]);

    useEffect(() => {
        if (sourceId !== 'upload') loadSource(sourceId);
    }, [sourceId, includeDisabled, loadSource]);

    const filteredQuestions = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return questions;
        return questions.filter((item) =>
            [item.id, item.question_text, item.category, ...(item.tags || [])]
                .join(' ')
                .toLowerCase()
                .includes(q)
        );
    }, [questions, filter]);

    useEffect(() => {
        if (currentIndex >= filteredQuestions.length) setCurrentIndex(0);
    }, [filteredQuestions.length, currentIndex]);

    const current = filteredQuestions[currentIndex] || null;
    const currentLeakWarnings = current ? leakWarningsById[current.id] || [] : [];
    const leakCount = Object.keys(leakWarningsById).length;

    const markImageBroken = (key) => {
        setBrokenImages((prev) => ({ ...prev, [key]: true }));
    };

    const onUploadCsv = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            loadFromText(text, { fromUpload: true });
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            event.target.value = '';
            setLoading(false);
        }
    };

    const renderImage = (rawUrl, imageKey, className = 'max-h-48 w-full object-contain') => {
        if (!rawUrl) return null;
        const src = toDisplayImageUrl(rawUrl);
        if (!src) return null;
        return (
            <div className="relative">
                <img
                    src={src}
                    alt=""
                    className={className}
                    data-fallback-index="0"
                    onError={(e) => {
                        const exhausted = handleImageLoadError(e, rawUrl);
                        if (exhausted) markImageBroken(imageKey);
                    }}
                />
                {brokenImages[imageKey] && (
                    <p className="mt-1 text-xs text-red-600 font-mono break-all">{rawUrl}</p>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white">
                            {isBn ? 'ভিজুয়াল কুইজ প্রিভিউ' : 'Visual Quiz Preview'}
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {isBn ? 'লাইভ বা ড্রাফট CSV দেখুন — স্কোরিং/DB-তে প্রভাব নেই' : 'Review live or draft CSV — no scoring/DB impact'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCurrentView('admin')}
                        className="px-3 py-2 text-sm border-2 border-slate-900 bg-white shadow-[2px_2px_0_#0f172a]"
                    >
                        {isBn ? '← অ্যাডমিন' : '← Admin'}
                    </button>
                </div>

                <div className="flex flex-wrap gap-3 items-end bg-white dark:bg-slate-800 border-2 border-slate-900 p-4 shadow-[3px_3px_0_#0f172a]">
                    <label className="text-sm font-semibold">
                        {isBn ? 'সোর্স' : 'Source'}
                        <select
                            value={sourceId === 'upload' ? 'batch02' : sourceId}
                            onChange={(e) => setSourceId(e.target.value)}
                            className="mt-1 block w-56 border-2 border-slate-300 px-2 py-1.5 text-sm"
                        >
                            {Object.values(SOURCES).map((s) => (
                                <option key={s.id} value={s.id}>{isBn ? s.labelBn : s.labelEn}</option>
                            ))}
                        </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={includeDisabled}
                            onChange={(e) => setIncludeDisabled(e.target.checked)}
                        />
                        {isBn ? 'enabled=FALSE সহ দেখান' : 'Include enabled=FALSE'}
                    </label>
                    <label className="text-sm font-semibold">
                        {isBn ? 'CSV আপলোড' : 'Upload CSV'}
                        <input type="file" accept=".csv,text/csv" onChange={onUploadCsv} className="mt-1 block text-xs" />
                    </label>
                    <label className="text-sm font-semibold flex-1 min-w-[200px]">
                        {isBn ? 'ফিল্টার' : 'Filter'}
                        <input
                            type="search"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder={isBn ? 'id, category, tag…' : 'id, category, tag…'}
                            className="mt-1 block w-full border-2 border-slate-300 px-2 py-1.5 text-sm"
                        />
                    </label>
                </div>

                {loading && <p className="text-sm text-slate-600">{isBn ? 'লোড হচ্ছে…' : 'Loading…'}</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                {!loading && !error && (
                    <p className="text-sm text-slate-600">
                        {filteredQuestions.length} {isBn ? 'টি প্রশ্ন' : 'questions'}
                        {sourceId === 'upload' ? ` (${isBn ? 'আপলোড করা ফাইল' : 'uploaded file'})` : ''}
                        {leakCount > 0 && (
                            <span className="ml-2 text-amber-700">
                                · {leakCount} {isBn ? 'টিতে সম্ভাব্য উত্তর ফাঁস' : 'with possible answer leaks'}
                            </span>
                        )}
                    </p>
                )}

                {current && (
                    <div className="grid lg:grid-cols-[220px_1fr] gap-4">
                        <div className="max-h-[70vh] overflow-y-auto border-2 border-slate-900 bg-white dark:bg-slate-800">
                            {filteredQuestions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => { setCurrentIndex(idx); setShowHint(true); }}
                                    className={`w-full text-left px-3 py-2 text-xs border-b border-slate-200 ${idx === currentIndex ? 'bg-orange-100 font-bold' : 'hover:bg-slate-50'}`}
                                >
                                    {q.id}{!q.enabled ? ' ⏸' : ''}
                                    {leakWarningsById[q.id]?.length ? ' ⚠' : ''}
                                    <div className="truncate opacity-70">{q.category}</div>
                                </button>
                            ))}
                        </div>

                        <div className="border-2 border-slate-900 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-[4px_4px_0_#0f172a] space-y-4">
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 font-mono">{current.id}</span>
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-300">{current.question_type}</span>
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-300">{current.category}</span>
                                {!current.enabled && (
                                    <span className="px-2 py-0.5 bg-amber-100 border border-amber-400 text-amber-800">enabled=FALSE</span>
                                )}
                                {currentLeakWarnings.map((w) => (
                                    <span
                                        key={w}
                                        className="px-2 py-0.5 bg-red-100 border border-red-400 text-red-800"
                                        title={w}
                                    >
                                        ⚠ {w.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>

                            {current.question_image_url && (
                                <div className="border-2 border-slate-200 bg-slate-50 p-2">
                                    {renderImage(current.question_image_url, `q_${current.id}`, 'max-h-64 w-full object-contain')}
                                </div>
                            )}

                            <h2 className={`text-lg font-black leading-snug ${isBn ? 'font-bengali' : ''}`}>
                                {current.question_text}
                            </h2>

                            <div className="space-y-2">
                                {current.options.map((option, idx) => {
                                    const isCorrect = idx === current.correct_option_index;
                                    const isImage = isImageOption(option);
                                    return (
                                        <div
                                            key={idx}
                                            className={`p-3 border-2 ${
                                                isCorrect
                                                    ? 'border-green-600 bg-green-50 dark:bg-green-950/30 ring-2 ring-green-500/40'
                                                    : 'border-slate-300 bg-white dark:bg-slate-800'
                                            }`}
                                        >
                                            <div className="flex flex-wrap items-start gap-2">
                                                <span className="font-mono font-bold">{OPTION_LABELS[idx]}.</span>
                                                {isCorrect && (
                                                    <span className="text-xs font-bold uppercase tracking-wide text-green-800 bg-green-200 border border-green-600 px-1.5 py-0.5">
                                                        {isBn ? '✓ সঠিক' : '✓ Correct'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 pl-6">
                                                {isImage ? (
                                                    renderImage(option, `o_${current.id}_${idx}`, 'inline-block max-h-28 object-contain')
                                                ) : (
                                                    <span className={isBn ? 'font-bengali' : ''}>{option}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {showHint && current.hint && (
                                <p className={`text-sm italic text-amber-900 bg-amber-50 p-3 border border-amber-200 ${isBn ? 'font-bengali' : ''}`}>
                                    💡 {current.hint}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={currentIndex <= 0}
                                    onClick={() => { setCurrentIndex((i) => i - 1); setShowHint(true); }}
                                    className="px-3 py-2 text-sm border-2 border-slate-900 disabled:opacity-40"
                                >
                                    {isBn ? '← আগে' : '← Prev'}
                                </button>
                                <button
                                    type="button"
                                    disabled={currentIndex >= filteredQuestions.length - 1}
                                    onClick={() => { setCurrentIndex((i) => i + 1); setShowHint(true); }}
                                    className="px-3 py-2 text-sm border-2 border-slate-900 disabled:opacity-40"
                                >
                                    {isBn ? 'পরে →' : 'Next →'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowHint((v) => !v)}
                                    className="px-3 py-2 text-sm border-2 border-orange-600 bg-orange-50 text-orange-800 ml-auto"
                                >
                                    {showHint
                                        ? (isBn ? 'ইঙ্গিত লুকান' : 'Hide hint')
                                        : (isBn ? 'ইঙ্গিত দেখুন' : 'Show hint')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
