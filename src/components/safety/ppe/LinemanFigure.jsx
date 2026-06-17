/* eslint-disable react/prop-types */
import React from 'react';
import { CORE_PPE_ITEMS, getPPEStatusColor } from '../../../data/ppeItems';
import LinemanIllustration from './LinemanIllustration';

// Figure occupies a 240-wide scene; side gutters hold callout badges.
const FIG_W = 240;
const FIG_H = 400;
const GUTTER = 48;
const VB_W = FIG_W + GUTTER * 2; // 336
const VB_H = FIG_H;
const VIEW_PAD = 18; // keep badges + pulse rings inside the viewport

// Which rail each item's badge sits in (keeps leader lines from crossing the body).
const RAIL_LAYOUT = {
    left: ['Safety Helmet', 'Discharge Rod', 'Insulated Gloves', 'Safety Shoes/Boots'],
    right: ['Safety Goggles', 'Reflective Jacket', 'Voltage Detector', 'Full Body Harness']
};

const RAIL_X = { left: 28, right: VB_W - 28 };
const RAIL_TOP = 68;
const RAIL_BOTTOM = 340;

function buildSlots(names) {
    const n = names.length;
    const span = RAIL_BOTTOM - RAIL_TOP;
    return names.map((name, i) => ({
        name,
        y: n === 1 ? (RAIL_TOP + RAIL_BOTTOM) / 2 : RAIL_TOP + (span * i) / (n - 1)
    }));
}

const BADGE_POSITIONS = (() => {
    const map = {};
    buildSlots(RAIL_LAYOUT.left).forEach((s) => {
        map[s.name] = { x: RAIL_X.left, y: s.y, side: 'left' };
    });
    buildSlots(RAIL_LAYOUT.right).forEach((s) => {
        map[s.name] = { x: RAIL_X.right, y: s.y, side: 'right' };
    });
    return map;
})();

/**
 * Interactive lineman — detailed SVG artwork with callout-style tap badges.
 */
export default function LinemanFigure({ answers, selectedName, onSelectItem, language = 'bn', equipAnim = null }) {
    const answerMap = Object.fromEntries((answers || []).map((a) => [a.name, a]));
    const equippedCount = CORE_PPE_ITEMS.filter((p) => answerMap[p.name]?.available).length;
    const essentialMissing = CORE_PPE_ITEMS.filter((p) => p.essential && !answerMap[p.name]?.available).length;

    return (
        <div className="relative h-full w-full min-h-0 select-none overflow-visible">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 pointer-events-none">
                <div className="px-2 py-0.5 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-orange-200 dark:border-orange-800 shadow-sm">
                    <span className="text-[9px] sm:text-[10px] font-black text-orange-600 dark:text-orange-400">
                        {equippedCount}/{CORE_PPE_ITEMS.length}{' '}
                        {language === 'en' ? 'equipped' : 'সজ্জিত'}
                    </span>
                </div>
                {essentialMissing > 0 && (
                    <div className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] sm:text-[10px] font-black shadow-sm animate-pulse">
                        {essentialMissing} {language === 'en' ? 'missing' : 'নেই'}
                    </div>
                )}
            </div>

            <svg
                viewBox={`${-VIEW_PAD} ${-VIEW_PAD} ${VB_W + VIEW_PAD * 2} ${VB_H + VIEW_PAD * 2}`}
                className="w-full h-full block overflow-visible"
                preserveAspectRatio="xMidYMid meet"
                overflow="visible"
                role="img"
                aria-label={language === 'en' ? 'Lineman safety gear' : 'লাইনম্যান সুরক্ষা সরঞ্জাম'}
            >
                    {/* Scene (offset into the gutters) */}
                    <g transform={`translate(${GUTTER}, 0)`}>
                        <LinemanIllustration answerMap={answerMap} equipAnim={equipAnim} />
                    </g>

                    {/* Equip burst at body anchor */}
                    {equipAnim?.action === 'equip' && (() => {
                        const item = CORE_PPE_ITEMS.find((p) => p.name === equipAnim.name);
                        if (!item) return null;
                        const ax = (item.zone.x / 100) * FIG_W + GUTTER;
                        const ay = (item.zone.y / 100) * FIG_H;
                        return (
                            <g key="equip-burst" style={{ pointerEvents: 'none' }}>
                                <circle cx={ax} cy={ay} r="4" fill="#22c55e" opacity="0.9">
                                    <animate attributeName="r" values="4;22" dur="0.55s" fill="freeze" />
                                    <animate attributeName="opacity" values="0.85;0" dur="0.55s" fill="freeze" />
                                </circle>
                            </g>
                        );
                    })()}

                    {/* Leader lines — drawn under the badges */}
                    {CORE_PPE_ITEMS.map((item) => {
                        const answer = answerMap[item.name];
                        const isSelected = selectedName === item.name;
                        const badge = BADGE_POSITIONS[item.name];
                        if (!badge) return null;
                        const anchorX = (item.zone.x / 100) * FIG_W + GUTTER;
                        const anchorY = (item.zone.y / 100) * FIG_H;
                        const color = getPPEStatusColor(answer);
                        const elbowX = badge.side === 'left' ? badge.x + 16 : badge.x - 16;

                        return (
                            <g key={`lead-${item.name}`} style={{ pointerEvents: 'none' }}>
                                <path
                                    d={`M ${badge.x} ${badge.y} L ${elbowX} ${badge.y} L ${anchorX} ${anchorY}`}
                                    fill="none"
                                    stroke={isSelected ? '#ea580c' : answer?.available ? color : '#cbd5e1'}
                                    strokeWidth={isSelected ? 2.4 : 1.4}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    opacity={isSelected ? 0.95 : 0.6}
                                    strokeDasharray={answer?.available ? '0' : '3 3'}
                                />
                                <circle
                                    cx={anchorX}
                                    cy={anchorY}
                                    r={isSelected ? 3.5 : 2.5}
                                    fill={isSelected ? '#ea580c' : answer?.available ? color : '#94a3b8'}
                                />
                            </g>
                        );
                    })}

                    {/* Badge layer */}
                    {CORE_PPE_ITEMS.map((item) => {
                        const answer = answerMap[item.name];
                        const isSelected = selectedName === item.name;
                        const badge = BADGE_POSITIONS[item.name];
                        if (!badge) return null;
                        const color = getPPEStatusColor(answer);
                        const r = isSelected ? 15 : 13;
                        const isAnimTarget = equipAnim?.name === item.name;
                        const badgeEquip = isAnimTarget && equipAnim?.action === 'equip';
                        const badgeUnequip = isAnimTarget && equipAnim?.action === 'unequip';

                        return (
                            <g
                                key={`badge-${item.name}`}
                                role="button"
                                tabIndex={0}
                                className="cursor-pointer outline-none"
                                onClick={() => onSelectItem(item.name)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelectItem(item.name);
                                    }
                                }}
                            >
                                {(isSelected || badgeEquip) && (
                                    <circle cx={badge.x} cy={badge.y} r={r + 6} fill="none" stroke={badgeEquip ? '#22c55e' : '#f97316'} strokeWidth="2" opacity="0.6">
                                        <animate attributeName="r" from={r + 2} to={r + (badgeEquip ? 14 : 10)} dur={badgeEquip ? '0.55s' : '1.4s'} repeatCount={badgeEquip ? '1' : 'indefinite'} />
                                        <animate attributeName="opacity" from="0.7" to="0" dur={badgeEquip ? '0.55s' : '1.4s'} repeatCount={badgeEquip ? '1' : 'indefinite'} />
                                    </circle>
                                )}

                                {/* White halo for contrast */}
                                <circle cx={badge.x} cy={badge.y} r={r + 2} fill="white" stroke="#e2e8f0" strokeWidth="1" />

                                <circle
                                    cx={badge.x}
                                    cy={badge.y}
                                    r={r}
                                    fill={answer?.available ? color : '#f1f5f9'}
                                    fillOpacity={answer?.available ? 0.18 : 1}
                                    stroke={isSelected ? '#ea580c' : badgeEquip ? '#22c55e' : badgeUnequip ? '#ef4444' : answer?.available ? color : '#94a3b8'}
                                    strokeWidth={isSelected || isAnimTarget ? 2.5 : 1.8}
                                />

                                <text
                                    x={badge.x}
                                    y={badge.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="13"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {item.icon}
                                </text>

                                {/* Status corner dot */}
                                {answer?.available ? (
                                    <circle cx={badge.x + r - 2} cy={badge.y - r + 2} r="4.5" fill={color} stroke="white" strokeWidth="1.5" />
                                ) : item.essential ? (
                                    <g>
                                        <circle cx={badge.x + r - 2} cy={badge.y - r + 2} r="5" fill="#ef4444" stroke="white" strokeWidth="1.5" />
                                        <text x={badge.x + r - 2} y={badge.y - r + 3.5} textAnchor="middle" fontSize="7" fill="white" fontWeight="bold" style={{ pointerEvents: 'none' }}>!</text>
                                    </g>
                                ) : null}
                            </g>
                        );
                    })}
            </svg>
        </div>
    );
}
