import React from 'react';
import { chartEnglishDigits } from '../../data/identifyCharts';
import {
    toSafetyLibraryDisplayUrl,
    handleSafetyLibraryImageError,
} from '../../utils/safetyLibraryImageUrl';
import { getChartTopic } from './identifyChartIcons';

function bnClass(bn, extra = '') {
    return `${bn ? 'font-bengali' : ''} ${extra}`.trim();
}

function SectionLabel({ children, bn, tone = 'orange' }) {
    return (
        <div className={`identify-chart-print-label identify-chart-print-label--${tone}`}>
            <span className={bnClass(bn, 'identify-chart-kicker-type')}>{children}</span>
        </div>
    );
}

function PointRow({ text, bn, tone = 'neutral' }) {
    const mark = tone === 'ok' ? '✓' : tone === 'bad' ? '×' : '·';
    return (
        <li className={`identify-chart-point identify-chart-point--${tone}`}>
            <span className="identify-chart-point-mark" aria-hidden>{mark}</span>
            <span className={bnClass(bn, 'identify-chart-body-type')}>{text}</span>
        </li>
    );
}

function StepList({ steps, bn }) {
    if (!steps?.length) return null;
    return (
        <section>
            <SectionLabel bn={bn}>ধাপ</SectionLabel>
            <ol className="space-y-3">
                {steps.map((step, i) => (
                        <li
                            key={`${step.title}-${i}`}
                            className="identify-chart-card group relative"
                        >
                            <div className="relative flex items-start gap-3">
                                <span className="identify-chart-step-no tabular-nums">
                                    {i + 1}
                                </span>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <p className={bnClass(bn, 'identify-chart-heading-type')}>
                                        {step.title}
                                    </p>
                                    {step.ok ? <PointRow text={step.ok} bn={bn} tone="ok" /> : null}
                                    {step.bad ? <PointRow text={step.bad} bn={bn} tone="bad" /> : null}
                                </div>
                            </div>
                        </li>
                ))}
            </ol>
        </section>
    );
}

function CompareBlock({ compare, bn }) {
    if (!compare) return null;
    return (
        <section>
            <SectionLabel bn={bn}>তুলনা</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="identify-chart-card identify-chart-card--bad">
                    <p className={bnClass(bn, 'identify-chart-heading-type mb-3 text-[#7a2430]')}>{compare.wrong.title}</p>
                    <ul className="space-y-2">
                        {compare.wrong.points.map((p) => (
                            <PointRow key={p} text={p} bn={bn} tone="bad" />
                        ))}
                    </ul>
                </div>
                <div className="identify-chart-card identify-chart-card--ok">
                    <p className={bnClass(bn, 'identify-chart-heading-type mb-3 text-[#1d4a38]')}>{compare.right.title}</p>
                    <ul className="space-y-2">
                        {compare.right.points.map((p) => (
                            <PointRow key={p} text={p} bn={bn} tone="ok" />
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
            <SectionLabel bn={bn}>ছক</SectionLabel>
            {tables.map((table) => (
                <div
                    key={table.title || table.headers.join('-')}
                    className="identify-chart-card identify-chart-card--table"
                >
                    {table.title ? (
                        <div className="identify-chart-table-head">
                            <p className={bnClass(bn, 'identify-chart-heading-type text-[#f3e6c8]')}>{table.title}</p>
                        </div>
                    ) : null}
                    <div className="identify-chart-table-wrap">
                        <table
                            className="identify-chart-ledger"
                            data-cols={table.headers.length}
                        >
                            <thead>
                                <tr>
                                    {table.headers.map((h) => (
                                        <th
                                            key={h}
                                            className={bnClass(bn, 'identify-chart-ledger-h')}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {table.rows.map((row, ri) => (
                                    <tr key={row.join('|')}>
                                        {row.map((cell, ci) => (
                                            <td
                                                key={`${ri}-${ci}`}
                                                className={bnClass(
                                                    bn,
                                                    `identify-chart-ledger-c ${ci === 0 ? 'identify-chart-ledger-c--key' : ''}`
                                                )}
                                            >
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {(table.notes?.length ? table.notes : table.note ? [table.note] : []).map((line) => (
                        <div key={line} className="identify-chart-table-note">
                            <p className={bnClass(bn, 'identify-chart-body-type')}>{line}</p>
                        </div>
                    ))}
                </div>
            ))}
        </section>
    );
}

function CardsBlock({ cards, bn }) {
    if (!cards?.length) return null;
    return (
        <section>
            <SectionLabel bn={bn}>বাছাই</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cards.map((card) => (
                        <div
                            key={card.title}
                            className="identify-chart-card identify-chart-card--pick"
                        >
                            <p className={bnClass(bn, 'identify-chart-heading-type')}>
                                {card.title}
                            </p>
                            <ul className="mt-2 space-y-1.5">
                                {card.points.map((p) => (
                                    <li key={p} className={bnClass(bn, 'identify-chart-body-type')}>
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                ))}
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
            <SectionLabel bn={bn}>বিভাগ</SectionLabel>
            {sections.map((section) => {
                const t = toneMap[section.tone] || toneMap.neutral;
                return (
                    <div
                        key={section.title}
                        className={`identify-chart-card identify-chart-card--${t.point}`}
                    >
                        <p className={bnClass(bn, 'identify-chart-heading-type mb-3')}>{section.title}</p>
                        <ul className="space-y-2">
                            {section.points.map((p) => (
                                <PointRow
                                    key={p}
                                    text={p}
                                    bn={bn}
                                    tone={t.point}
                                />
                            ))}
                        </ul>
                    </div>
                );
            })}
        </section>
    );
}

function FigureBlock({ figure, bn }) {
    if (!figure?.image) return null;
    return (
        <section>
            <SectionLabel bn={bn}>যন্ত্র</SectionLabel>
            <div className="identify-chart-card identify-chart-card--figure">
                <img
                    src={toSafetyLibraryDisplayUrl(figure.image)}
                    alt={figure.title || ''}
                    className="identify-chart-figure-img"
                    onError={(e) => handleSafetyLibraryImageError(e, figure.image)}
                />
                <div className="min-w-0">
                    {figure.title ? (
                        <p className={bnClass(bn, 'identify-chart-heading-type')}>{figure.title}</p>
                    ) : null}
                    {figure.info ? (
                        <p className={bnClass(bn, 'identify-chart-body-type mt-1')}>{figure.info}</p>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

function FlowStrip({ flow, bn }) {
    if (!flow?.length) return null;
    return (
        <section>
            <SectionLabel bn={bn}>ক্রম</SectionLabel>
            <div className="identify-chart-flow">
                {flow.map((label, i) => (
                    <React.Fragment key={`${label}-${i}`}>
                        {i > 0 ? <span className="identify-chart-flow-arrow" aria-hidden>→</span> : null}
                        <span className={bnClass(bn, 'identify-chart-flow-chip identify-chart-body-type')}>{label}</span>
                    </React.Fragment>
                ))}
            </div>
        </section>
    );
}

/**
 * Printed wall-chart page — paper sheet, ink frame, Bangla-first.
 */
export default function IdentifyChartPage({ page, language = 'bn', title, chartId }) {
    if (!page) return null;
    const bn = language === 'bn';
    const topic = getChartTopic(chartId);

    return (
        <article className="identify-chart-page px-3 pt-3 sm:px-6 sm:pt-5">
            <div className="identify-chart-print mx-auto w-full max-w-3xl" data-accent={topic.accent || 'orange'}>
                <div className="identify-chart-print-marks" aria-hidden>
                    <span className="identify-chart-print-mark identify-chart-print-mark--tl" />
                    <span className="identify-chart-print-mark identify-chart-print-mark--tr" />
                    <span className="identify-chart-print-mark identify-chart-print-mark--bl" />
                    <span className="identify-chart-print-mark identify-chart-print-mark--br" />
                </div>

                <header className="identify-chart-print-head">
                    <p className={bnClass(bn, 'identify-chart-print-kicker')}>
                        {page.kicker || (bn ? 'পরিচিতি চার্ট' : 'Parichiti chart')}
                    </p>
                    {title ? (
                        <h3 className={bnClass(bn, 'identify-chart-print-title')}>
                            {chartEnglishDigits(title)}
                        </h3>
                    ) : null}
                    {page.intro ? (
                        <p className={bnClass(bn, 'identify-chart-print-intro')}>
                            {page.intro}
                        </p>
                    ) : null}
                </header>

                <div className="identify-chart-print-body">
                    <FlowStrip flow={page.flow} bn={bn} />
                    <StepList steps={page.steps} bn={bn} />
                    <CompareBlock compare={page.compare} bn={bn} />
                    <TableBlock tables={page.tables} bn={bn} />
                    <FigureBlock figure={page.figure} bn={bn} />
                    <CardsBlock cards={page.cards} bn={bn} />
                    <SectionsBlock sections={page.sections} bn={bn} />

                    {page.tip ? (
                        <aside className="identify-chart-card identify-chart-card--tip">
                            <p className={bnClass(bn, 'identify-chart-kicker-type text-[#8a5a12]')}>খেয়াল রাখুন</p>
                            <p className={bnClass(bn, 'identify-chart-body-type mt-1')}>{page.tip}</p>
                        </aside>
                    ) : null}

                    {page.warning ? (
                        <aside className="identify-chart-card identify-chart-card--warn">
                            <p className={bnClass(bn, 'identify-chart-kicker-type text-[#7a2430]')}>সতর্কতা</p>
                            <p className={bnClass(bn, 'identify-chart-body-type mt-1 text-[#7a2430]')}>{page.warning}</p>
                        </aside>
                    ) : null}
                </div>

                <footer className="identify-chart-print-foot">
                    <span className={bnClass(bn, 'identify-chart-kicker-type')}>
                        {bn ? 'স্মার্ট লাইনম্যান · পরিচিতি' : 'Smart Lineman · Parichiti'}
                    </span>
                </footer>
            </div>
            <div className="identify-chart-page-end" aria-hidden />
        </article>
    );
}
