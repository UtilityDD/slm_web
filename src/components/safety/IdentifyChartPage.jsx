import React from 'react';
import {
    TopicIcon,
    UiIcons,
    getChartTopic,
    iconForCardTitle,
    iconForLabel,
    ACCENT_STYLES,
} from './identifyChartIcons';

function bnClass(bn, extra = '') {
    return `${bn ? 'font-bengali' : ''} ${extra}`.trim();
}

function SectionLabel({ icon, children, bn, tone = 'orange' }) {
    const tones = {
        orange: 'text-orange-700 bg-orange-50 border-orange-200/80',
        emerald: 'text-emerald-800 bg-emerald-50 border-emerald-200/80',
        rose: 'text-rose-800 bg-rose-50 border-rose-200/80',
        slate: 'text-slate-700 bg-slate-50 border-slate-200/80',
    };
    return (
        <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${tones[tone]}`}>
            {icon ? <TopicIcon name={icon} className="h-3.5 w-3.5" /> : null}
            <span className={bnClass(bn, 'text-[10px] font-black tracking-wide')}>{children}</span>
        </div>
    );
}

function IconTile({ name, tone = 'orange', size = 'md' }) {
    const sizes = {
        sm: 'h-9 w-9 rounded-xl',
        md: 'h-11 w-11 rounded-2xl',
        lg: 'h-14 w-14 rounded-[1.15rem]',
    };
    const iconSizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
    const tones = {
        orange: 'from-orange-500 to-amber-500 shadow-orange-500/30',
        emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/30',
        rose: 'from-rose-500 to-orange-500 shadow-rose-500/30',
        sky: 'from-sky-500 to-blue-500 shadow-sky-500/30',
        slate: 'from-slate-600 to-slate-800 shadow-slate-500/25',
        amber: 'from-amber-500 to-orange-500 shadow-amber-500/30',
    };
    return (
        <span
            className={`flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-md ${sizes[size]} ${tones[tone] || tones.orange}`}
        >
            <TopicIcon name={name} className={iconSizes[size]} />
        </span>
    );
}

function PointRow({ text, bn, tone = 'neutral', icon }) {
    const styles = {
        ok: 'bg-emerald-50 text-emerald-900',
        bad: 'bg-rose-50 text-rose-900',
        neutral: 'bg-slate-50 text-slate-700',
    };
    const ico = icon || (tone === 'ok' ? 'check' : tone === 'bad' ? 'x' : 'spark');
    return (
        <li className={`flex items-start gap-2.5 rounded-xl px-3 py-2 ${styles[tone] || styles.neutral}`}>
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm ring-1 ring-black/5">
                <TopicIcon name={ico} className="h-3.5 w-3.5" />
            </span>
            <span className={bnClass(bn, 'pt-0.5 text-[13px] font-semibold leading-snug')}>{text}</span>
        </li>
    );
}

function StepList({ steps, bn }) {
    if (!steps?.length) return null;
    return (
        <section>
            <SectionLabel icon="list" bn={bn}>ধাপ</SectionLabel>
            <ol className="space-y-3">
                {steps.map((step, i) => {
                    const ico = step.icon || iconForLabel(step.title);
                    return (
                        <li
                            key={`${step.title}-${i}`}
                            className="identify-chart-card group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)] sm:p-5"
                        >
                            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-orange-100/60 blur-2xl" />
                            <div className="relative flex items-start gap-3.5">
                                <div className="relative shrink-0">
                                    <IconTile name={ico} size="md" />
                                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-orange-700 shadow ring-1 ring-orange-100 tabular-nums">
                                        {i + 1}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <p className={bnClass(bn, 'text-[15px] font-black leading-snug text-slate-900')}>
                                        {step.title}
                                    </p>
                                    {step.ok ? <PointRow text={step.ok} bn={bn} tone="ok" icon="check" /> : null}
                                    {step.bad ? <PointRow text={step.bad} bn={bn} tone="bad" icon="x" /> : null}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

function CompareBlock({ compare, bn }) {
    if (!compare) return null;
    return (
        <section>
            <SectionLabel icon="compare" bn={bn}>তুলনা</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="identify-chart-card relative overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex flex-col items-center gap-2 text-center">
                        <IconTile name={iconForLabel(compare.wrong.title) === 'spark' ? 'warn' : iconForLabel(compare.wrong.title)} tone="rose" size="lg" />
                        <p className={bnClass(bn, 'text-sm font-black text-rose-900')}>{compare.wrong.title}</p>
                    </div>
                    <ul className="space-y-2">
                        {compare.wrong.points.map((p) => (
                            <PointRow key={p} text={p} bn={bn} tone="bad" icon="x" />
                        ))}
                    </ul>
                </div>
                <div className="identify-chart-card relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex flex-col items-center gap-2 text-center">
                        <IconTile name={iconForLabel(compare.right.title) === 'spark' ? 'check' : iconForLabel(compare.right.title)} tone="emerald" size="lg" />
                        <p className={bnClass(bn, 'text-sm font-black text-emerald-900')}>{compare.right.title}</p>
                    </div>
                    <ul className="space-y-2">
                        {compare.right.points.map((p) => (
                            <PointRow key={p} text={p} bn={bn} tone="ok" icon="check" />
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

function TableBlock({ tables, bn }) {
    if (!tables?.length) return null;
    return (
        <section className="space-y-4">
            <SectionLabel icon="table" bn={bn}>ছক</SectionLabel>
            {tables.map((table) => (
                <div
                    key={table.title || table.headers.join('-')}
                    className="identify-chart-card overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.4)]"
                >
                    {table.title ? (
                        <div className="flex items-center gap-3 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3">
                            <IconTile name="table" size="sm" />
                            <p className={bnClass(bn, 'text-xs font-black text-orange-950')}>{table.title}</p>
                        </div>
                    ) : null}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[17rem] border-collapse text-left">
                            <thead>
                                <tr className="bg-slate-50/90">
                                    {table.headers.map((h) => (
                                        <th
                                            key={h}
                                            className={bnClass(bn, 'whitespace-nowrap px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-500 sm:px-4 sm:text-[11px]')}
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                <TopicIcon name={iconForLabel(h)} className="h-3 w-3 opacity-60" />
                                                {h}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {table.rows.map((row, ri) => (
                                    <tr
                                        key={row.join('|')}
                                        className={`border-t border-slate-100 transition-colors hover:bg-orange-50/50 ${
                                            ri % 2 ? 'bg-slate-50/40' : 'bg-white'
                                        }`}
                                    >
                                        {row.map((cell, ci) => (
                                            <td
                                                key={`${ri}-${ci}`}
                                                className={bnClass(
                                                    bn,
                                                    `px-3.5 py-3 text-[13px] leading-snug sm:px-4 ${
                                                        ci === 0
                                                            ? 'font-black text-slate-900'
                                                            : 'font-bold tabular-nums text-slate-700'
                                                    }`
                                                )}
                                            >
                                                {ci === 0 ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                                                            <TopicIcon name={iconForLabel(cell)} className="h-3.5 w-3.5" />
                                                        </span>
                                                        {cell}
                                                    </span>
                                                ) : (
                                                    cell
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {table.note ? (
                        <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-slate-600">
                            <UiIcons.tip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                            <p className={bnClass(bn, 'text-[11px] font-bold leading-snug')}>{table.note}</p>
                        </div>
                    ) : null}
                </div>
            ))}
        </section>
    );
}

function CardsBlock({ cards, bn }) {
    if (!cards?.length) return null;
    return (
        <section>
            <SectionLabel icon="cards" bn={bn}>বাছাই</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cards.map((card) => {
                    const ico = card.icon || iconForCardTitle(card.title);
                    return (
                        <div
                            key={card.title}
                            className="identify-chart-card group flex flex-col items-center rounded-2xl border border-slate-200/70 bg-white p-3.5 text-center shadow-sm transition-transform hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md sm:p-4"
                        >
                            <IconTile name={ico} size="lg" tone="amber" />
                            <p className={bnClass(bn, 'mt-3 text-[13px] font-black leading-snug text-slate-900')}>
                                {card.title}
                            </p>
                            <ul className="mt-2.5 w-full space-y-1.5">
                                {card.points.map((p) => (
                                    <li
                                        key={p}
                                        className="flex items-center justify-center gap-1.5 rounded-lg bg-orange-50/80 px-2 py-1.5 text-orange-950"
                                    >
                                        <TopicIcon name={iconForLabel(p)} className="h-3 w-3 shrink-0 text-orange-500" />
                                        <span className={bnClass(bn, 'text-[11px] font-bold leading-snug')}>{p}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function SectionsBlock({ sections, bn }) {
    if (!sections?.length) return null;
    const toneMap = {
        ok: { tile: 'emerald', label: 'emerald', point: 'ok' },
        bad: { tile: 'rose', label: 'rose', point: 'bad' },
        neutral: { tile: 'orange', label: 'slate', point: 'neutral' },
    };
    return (
        <section className="space-y-3">
            <SectionLabel icon="book" bn={bn}>বিভাগ</SectionLabel>
            {sections.map((section) => {
                const t = toneMap[section.tone] || toneMap.neutral;
                const ico = section.icon || iconForLabel(section.title);
                return (
                    <div
                        key={section.title}
                        className="identify-chart-card rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-orange-50/40 p-4 shadow-sm sm:p-5"
                    >
                        <div className="mb-3 flex items-center gap-3">
                            <IconTile name={ico} tone={t.tile} size="md" />
                            <p className={bnClass(bn, 'text-sm font-black text-slate-900')}>{section.title}</p>
                        </div>
                        <ul className="space-y-2">
                            {section.points.map((p) => (
                                <PointRow
                                    key={p}
                                    text={p}
                                    bn={bn}
                                    tone={t.point}
                                    icon={iconForLabel(p)}
                                />
                            ))}
                        </ul>
                    </div>
                );
            })}
        </section>
    );
}

function FlowStrip({ flow, bn }) {
    if (!flow?.length) return null;
    return (
        <section>
            <SectionLabel icon="flow" bn={bn}>ক্রম</SectionLabel>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-orange-200/70 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 px-3 py-3 sm:gap-2.5 sm:px-4">
                {flow.map((label, i) => (
                    <React.Fragment key={`${label}-${i}`}>
                        {i > 0 ? <UiIcons.flow className="h-3.5 w-3.5 shrink-0 text-orange-400" /> : null}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-orange-100">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                                <TopicIcon name={iconForLabel(label)} className="h-3 w-3" />
                            </span>
                            <span className={bnClass(bn, 'text-[11px] font-black text-orange-950')}>{label}</span>
                        </span>
                    </React.Fragment>
                ))}
            </div>
        </section>
    );
}

/**
 * Premium Identify chart page — icon-led, Bangla-first, responsive.
 */
export default function IdentifyChartPage({ page, language = 'bn', title, chartId }) {
    if (!page) return null;
    const bn = language === 'bn';
    const topic = getChartTopic(chartId);
    const accent = ACCENT_STYLES[topic.accent] || ACCENT_STYLES.orange;
    const kindIcon =
        page.kind === 'table' ? 'table' :
        page.kind === 'compare' ? 'compare' :
        page.kind === 'cards' ? 'cards' :
        page.kind === 'sections' ? 'book' :
        'list';

    return (
        <article className="identify-chart-page mx-auto w-full max-w-3xl space-y-5 px-4 pb-12 pt-4 sm:space-y-6 sm:px-8 sm:pb-14 sm:pt-6">
            <header className={`identify-chart-hero relative overflow-hidden rounded-[1.35rem] border border-orange-200/60 bg-gradient-to-br ${accent.soft} px-4 py-5 shadow-[0_12px_40px_-24px_rgba(249,115,22,0.55)] sm:px-6 sm:py-6`}>
                <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-orange-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-amber-200/30 blur-3xl" />
                <div className="relative flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
                    <div className="relative shrink-0">
                        <span className={`flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br ${accent.blob} text-white shadow-lg shadow-orange-500/30 sm:h-[4.5rem] sm:w-[4.5rem]`}>
                            <TopicIcon name={topic.icon} className="h-8 w-8 sm:h-9 sm:w-9" />
                        </span>
                        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl bg-white text-slate-600 shadow ring-1 ring-black/5">
                            <TopicIcon name={kindIcon} className="h-3.5 w-3.5" />
                        </span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                        {page.kicker ? (
                            <p className={bnClass(bn, `inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[11px] font-black shadow-sm ${accent.chip}`)}>
                                <UiIcons.spark className="h-3.5 w-3.5" />
                                {page.kicker}
                            </p>
                        ) : null}
                        {title ? (
                            <h3 className={bnClass(bn, 'text-[1.35rem] font-black leading-snug tracking-tight text-slate-900 sm:text-2xl')}>
                                {title}
                            </h3>
                        ) : null}
                        {page.intro ? (
                            <p className={bnClass(bn, 'max-w-2xl text-[14px] font-semibold leading-relaxed text-slate-700 sm:text-[15px]')}>
                                {page.intro}
                            </p>
                        ) : null}
                    </div>
                </div>
            </header>

            <FlowStrip flow={page.flow} bn={bn} />
            <StepList steps={page.steps} bn={bn} />
            <CompareBlock compare={page.compare} bn={bn} />
            <TableBlock tables={page.tables} bn={bn} />
            <CardsBlock cards={page.cards} bn={bn} />
            <SectionsBlock sections={page.sections} bn={bn} />

            {page.tip ? (
                <aside className="identify-chart-card flex gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/80 p-4 shadow-sm sm:p-5">
                    <IconTile name="tip" tone="amber" size="md" />
                    <div>
                        <p className={bnClass(bn, 'text-[10px] font-black uppercase tracking-wide text-orange-700')}>খেয়াল রাখুন</p>
                        <p className={bnClass(bn, 'mt-1 text-sm font-bold leading-relaxed text-slate-800')}>{page.tip}</p>
                    </div>
                </aside>
            ) : null}

            {page.warning ? (
                <aside className="identify-chart-card flex gap-3 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm sm:p-5">
                    <IconTile name="warn" tone="rose" size="md" />
                    <div>
                        <p className={bnClass(bn, 'text-[10px] font-black uppercase tracking-wide text-rose-700')}>সতর্কতা</p>
                        <p className={bnClass(bn, 'mt-1 text-sm font-black leading-snug text-rose-900')}>{page.warning}</p>
                    </div>
                </aside>
            ) : null}

            <footer className="flex items-center justify-center gap-2 pb-2 pt-1 text-slate-400">
                <UiIcons.shield className="h-3.5 w-3.5" />
                <span className={bnClass(bn, 'text-[10px] font-bold')}>স্মার্ট লাইনম্যান · পরিচিতি</span>
            </footer>
        </article>
    );
}
