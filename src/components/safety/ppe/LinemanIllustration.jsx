/* eslint-disable react/prop-types */
import React, { useId } from 'react';
import GearLayer from './GearLayer';
import { PPE_ANIM_ORIGINS } from './ppeAnim';

/**
 * Professional vector lineman scene — PPE layers toggle based on saved gear.
 * Figure is centred around x=110 on a 240x400 canvas. Artwork only;
 * tap hotspots are rendered separately in LinemanFigure.jsx.
 */
export default function LinemanIllustration({ answerMap = {}, equipAnim = null }) {
    const uid = useId().replace(/:/g, '');
    const p = (name) => `${name}-${uid}`;
    const has = (name) => !!answerMap[name]?.available;
    const pivot = (name) => PPE_ANIM_ORIGINS[name] || { x: 114, y: 150 };

    return (
        <g aria-hidden="true">
            <defs>
                <linearGradient id={p('sky')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#bae6fd" />
                    <stop offset="50%" stopColor="#e0f2fe" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
                <linearGradient id={p('ground')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a7f3d0" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                </linearGradient>
                <radialGradient id={p('sun')} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#fef9c3" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={p('skin')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fadcc0" />
                    <stop offset="100%" stopColor="#d9a673" />
                </linearGradient>
                <linearGradient id={p('skinArm')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5d2b3" />
                    <stop offset="100%" stopColor="#cf9a64" />
                </linearGradient>
                <linearGradient id={p('uniform')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="55%" stopColor="#1d4ed8" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
                <linearGradient id={p('uniformDark')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a8a" />
                    <stop offset="100%" stopColor="#172554" />
                </linearGradient>
                <linearGradient id={p('pants')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                <linearGradient id={p('pole')} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a16207" />
                    <stop offset="40%" stopColor="#854d0e" />
                    <stop offset="100%" stopColor="#451a03" />
                </linearGradient>
                <linearGradient id={p('helmet')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fde047" />
                    <stop offset="60%" stopColor="#facc15" />
                    <stop offset="100%" stopColor="#a16207" />
                </linearGradient>
                <linearGradient id={p('hivis')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fdba74" />
                    <stop offset="45%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
                <linearGradient id={p('glove')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <linearGradient id={p('boot')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#44403c" />
                    <stop offset="100%" stopColor="#1c1917" />
                </linearGradient>
                <filter id={p('shadow')} x="-25%" y="-25%" width="150%" height="150%">
                    <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.18" />
                </filter>
                <filter id={p('soft')} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.5" />
                </filter>
            </defs>

            {/* ---------- SCENE ---------- */}
            <rect x="1" y="1" width="238" height="398" rx="18" fill={`url(#${p('sky')})`} stroke="#e2e8f0" strokeWidth="1.5" filter={`url(#${p('shadow')})`} />
            {/* Clip everything to the rounded scene */}
            <clipPath id={p('clip')}>
                <rect x="1" y="1" width="238" height="398" rx="18" />
            </clipPath>
            <g clipPath={`url(#${p('clip')})`}>
            <circle cx="48" cy="60" r="46" fill={`url(#${p('sun')})`} />

            {/* Clouds */}
            <g fill="#ffffff" opacity="0.7">
                <ellipse cx="70" cy="54" rx="20" ry="8" />
                <ellipse cx="88" cy="50" rx="14" ry="7" />
                <ellipse cx="150" cy="40" rx="16" ry="6" />
            </g>

            {/* Distant hills */}
            <path d="M0 260 Q60 230 130 250 T240 258 V400 H0 Z" fill="#a5b4fc" opacity="0.35" />
            <path d="M0 280 Q80 258 170 274 T240 286 V400 H0 Z" fill="#93c5fd" opacity="0.30" />

            {/* Ground */}
            <rect x="0" y="322" width="240" height="78" fill={`url(#${p('ground')})`} />
            <path d="M0 322 Q120 308 240 322 V340 Q120 328 0 340 Z" fill="#34d399" opacity="0.5" />
            {/* Work pad */}
            <ellipse cx="118" cy="350" rx="92" ry="16" fill="#334155" opacity="0.12" />

            {/* Grass tufts */}
            <g stroke="#16a34a" strokeWidth="2" strokeLinecap="round" opacity="0.55">
                <path d="M24 348 V338 M28 348 V340 M32 348 V336" fill="none" />
                <path d="M210 352 V342 M214 352 V344 M218 352 V340" fill="none" />
            </g>

            {/* ---------- UTILITY POLE ---------- */}
            <g filter={`url(#${p('shadow')})`}>
                <rect x="188" y="30" width="16" height="320" rx="4" fill={`url(#${p('pole')})`} />
                <rect x="190" y="30" width="3" height="320" fill="#fde68a" opacity="0.25" />
                <rect x="166" y="70" width="58" height="9" rx="2.5" fill="#57534e" />
                <rect x="166" y="112" width="58" height="8" rx="2.5" fill="#57534e" />
                {[74, 116].map((y) => (
                    <g key={y}>
                        <rect x="162" y={y} width="9" height="13" rx="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" opacity="0.9" />
                        <rect x="219" y={y} width="9" height="13" rx="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" opacity="0.9" />
                    </g>
                ))}
                <path d="M0 80 Q120 70 240 78" fill="none" stroke="#1e293b" strokeWidth="2" opacity="0.5" />
                <path d="M0 122 Q120 112 240 120" fill="none" stroke="#1e293b" strokeWidth="2" opacity="0.42" />
            </g>

            {/* ---------- LINEMAN ---------- */}
            {/* Ground shadow under figure */}
            <ellipse cx="108" cy="352" rx="44" ry="9" fill="#0f172a" opacity="0.16" filter={`url(#${p('soft')})`} />

            <g filter={`url(#${p('shadow')})`}>
                {/* ===== LEGS ===== */}
                <path d="M96 224 Q90 280 92 322 L90 340 Q90 348 100 348 L108 348 Q114 348 114 340 L112 300 Q113 260 113 224 Z" fill={`url(#${p('pants')})`} />
                <path d="M114 224 Q115 260 116 300 L118 340 Q118 348 124 348 L132 348 Q142 348 142 340 L140 322 Q142 280 132 224 Z" fill={`url(#${p('pants')})`} />
                <path d="M113 224 L114 322" stroke="#0f172a" strokeWidth="1.2" opacity="0.4" />
                {/* knee hints */}
                <path d="M96 280 Q103 284 110 280" fill="none" stroke="#0f172a" strokeWidth="1" opacity="0.25" />
                <path d="M118 280 Q126 284 134 280" fill="none" stroke="#0f172a" strokeWidth="1" opacity="0.25" />

                {/* ===== BOOTS ===== */}
                <GearLayer
                    name="Safety Shoes/Boots"
                    show={has('Safety Shoes/Boots')}
                    anim={equipAnim}
                    ox={pivot('Safety Shoes/Boots').x}
                    oy={pivot('Safety Shoes/Boots').y}
                    ghost={
                        <g strokeDasharray="4 3" fill="none" stroke="#64748b" strokeWidth="1.5">
                            <path d="M88 332 L112 332 L113 344 Q113 354 102 356 L84 356 Q76 356 76 348 Q76 338 88 334 Z" />
                            <path d="M118 332 L142 332 Q154 338 154 348 Q154 356 146 356 L128 356 Q117 354 117 344 Z" />
                        </g>
                    }
                >
                    <path d="M88 332 L112 332 L113 344 Q113 354 102 356 L84 356 Q76 356 76 348 Q76 338 88 334 Z" fill={`url(#${p('boot')})`} />
                    <path d="M118 332 L142 332 L142 334 Q154 338 154 348 Q154 356 146 356 L128 356 Q117 354 117 344 Z" fill={`url(#${p('boot')})`} />
                    <path d="M89 338 H110" stroke="#facc15" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                    <path d="M120 338 H141" stroke="#facc15" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                    <ellipse cx="92" cy="357" rx="18" ry="4" fill="#0c0a09" />
                    <ellipse cx="138" cy="357" rx="18" ry="4" fill="#0c0a09" />
                </GearLayer>

                {/* ===== HIPS / BELT BASE ===== */}
                <path d="M86 196 Q84 214 96 226 L132 226 Q144 214 142 196 Z" fill={`url(#${p('uniformDark')})`} />

                {/* ===== TORSO (shirt) ===== */}
                <path d="M80 104 Q72 116 74 150 L82 200 Q84 212 100 212 L128 212 Q144 212 146 200 L154 150 Q156 116 148 104 Q130 92 114 92 Q98 92 80 104 Z" fill={`url(#${p('uniform')})`} />
                {/* chest shading */}
                <path d="M114 96 Q132 100 144 112 L138 150 Q126 140 114 140 Z" fill="#1e3a8a" opacity="0.25" />
                <path d="M114 96 V212" stroke="#172554" strokeWidth="1.2" opacity="0.35" />
                {/* collar */}
                <path d="M100 96 L114 110 L128 96 Q121 90 114 90 Q107 90 100 96 Z" fill={`url(#${p('uniformDark')})`} />
                {/* pocket */}
                <rect x="92" y="150" width="20" height="16" rx="2" fill="#172554" opacity="0.3" />

                {/* ===== ARMS ===== */}
                {/* Left arm (screen-left), bent down holding tool */}
                <path d="M82 108 Q60 122 54 158 Q50 184 58 208 L74 204 Q68 182 72 160 Q78 132 90 120 Z" fill={`url(#${p('uniform')})`} />
                <path d="M58 196 Q56 206 62 212 L76 208 L74 198 Z" fill={`url(#${p('skinArm')})`} />
                {/* Right arm (screen-right), raised to pole */}
                <path d="M146 108 Q170 116 184 138 Q192 150 190 160 L176 162 Q170 150 160 142 Q146 128 138 120 Z" fill={`url(#${p('uniform')})`} />
                <path d="M178 150 Q190 150 196 156 L192 168 Q182 166 176 160 Z" fill={`url(#${p('skinArm')})`} />

                {/* ===== REFLECTIVE JACKET ===== */}
                <GearLayer
                    name="Reflective Jacket"
                    show={has('Reflective Jacket')}
                    anim={equipAnim}
                    ox={pivot('Reflective Jacket').x}
                    oy={pivot('Reflective Jacket').y}
                    ghost={
                        <path d="M78 102 Q70 116 72 152 L80 204 Q82 216 100 216 L128 216 Q146 216 148 204 L156 152 Q158 116 150 102" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 4" />
                    }
                >
                    <path d="M78 102 Q70 116 72 152 L80 204 Q82 216 100 216 L128 216 Q146 216 148 204 L156 152 Q158 116 150 102 Q130 90 114 90 Q98 90 78 102 Z" fill={`url(#${p('hivis')})`} opacity="0.95" />
                    <rect x="84" y="120" width="11" height="86" rx="2" fill="#fef9c3" opacity="0.95" />
                    <rect x="133" y="120" width="11" height="86" rx="2" fill="#fef9c3" opacity="0.95" />
                    <rect x="84" y="120" width="11" height="86" rx="2" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.7" />
                    <rect x="133" y="120" width="11" height="86" rx="2" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.7" />
                    <rect x="80" y="168" width="68" height="8" rx="2" fill="#fef9c3" opacity="0.9" />
                    <rect x="80" y="168" width="68" height="8" rx="2" fill="none" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.6" />
                    <path d="M114 92 V214" stroke="#b45309" strokeWidth="1.5" opacity="0.7" />
                    <path d="M100 96 L114 108 L128 96 Q121 90 114 90 Q107 90 100 96 Z" fill="#c2410c" />
                </GearLayer>

                {/* ===== FULL BODY HARNESS ===== */}
                <GearLayer
                    name="Full Body Harness"
                    show={has('Full Body Harness')}
                    anim={equipAnim}
                    ox={pivot('Full Body Harness').x}
                    oy={pivot('Full Body Harness').y}
                >
                    <g stroke="#a16207" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M96 100 L114 176 L132 100" stroke="#ca8a04" />
                        <path d="M100 100 L100 196" stroke="#ca8a04" />
                        <path d="M128 100 L128 196" stroke="#ca8a04" />
                        <path d="M84 168 Q114 178 144 168" stroke="#ca8a04" />
                        <circle cx="114" cy="172" r="6.5" fill="#eab308" stroke="#854d0e" strokeWidth="1.5" />
                        <circle cx="114" cy="172" r="2.5" fill="#854d0e" stroke="none" />
                    </g>
                </GearLayer>

                {/* ===== SAFETY BELT ===== */}
                <GearLayer
                    name="Safety Belt"
                    show={has('Safety Belt')}
                    anim={equipAnim}
                    ox={pivot('Safety Belt').x}
                    oy={pivot('Safety Belt').y}
                >
                    <path d="M82 192 Q114 200 146 192 L146 206 Q114 214 82 206 Z" fill="#475569" stroke="#1e293b" strokeWidth="1.2" />
                    <rect x="107" y="194" width="14" height="12" rx="2" fill="#facc15" stroke="#a16207" strokeWidth="1" />
                    <rect x="111" y="197" width="6" height="6" rx="1" fill="#1e293b" />
                    <circle cx="92" cy="200" r="3" fill="#1e293b" opacity="0.6" />
                    <circle cx="136" cy="200" r="3" fill="#1e293b" opacity="0.6" />
                </GearLayer>

                {/* ===== GLOVES ===== */}
                <GearLayer
                    name="Insulated Gloves"
                    show={has('Insulated Gloves')}
                    anim={equipAnim}
                    ox={pivot('Insulated Gloves').x}
                    oy={pivot('Insulated Gloves').y}
                    ghost={
                        <path d="M54 200 Q46 214 50 226 Q56 234 68 228 L76 210 Z" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
                    }
                >
                    <path d="M54 200 Q46 214 50 226 Q56 234 68 228 L76 210 Q66 204 60 200 Z" fill={`url(#${p('glove')})`} stroke="#7f1d1d" strokeWidth="1.2" />
                    <path d="M56 216 H70" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                    <path d="M50 224 Q58 222 68 226" fill="none" stroke="#7f1d1d" strokeWidth="1" opacity="0.5" />
                </GearLayer>
                {/* Right hand gripping pole */}
                <path d="M188 152 Q200 150 204 158 Q206 166 198 170 L186 166 Z" fill={`url(#${p('skin')})`} />

                {/* ===== NECK ===== */}
                <path d="M104 80 L104 96 Q114 102 124 96 L124 80 Z" fill={`url(#${p('skin')})`} />
                <path d="M104 88 Q114 94 124 88" fill="none" stroke="#b45309" strokeWidth="1" opacity="0.3" />

                {/* ===== HEAD ===== */}
                <ellipse cx="114" cy="63" rx="21" ry="23" fill={`url(#${p('skin')})`} />
                {/* ears */}
                <ellipse cx="93" cy="64" rx="4" ry="6" fill="#e0a878" />
                <ellipse cx="135" cy="64" rx="4" ry="6" fill="#e0a878" />
                {/* hair (when no helmet) */}
                {!has('Safety Helmet') && (
                    <path d="M93 50 Q95 33 114 33 Q133 33 135 50 Q128 40 114 40 Q100 40 93 50 Z" fill="#3f2a1a" />
                )}
                {/* face features */}
                <path d="M103 59 Q107 56 111 59" fill="none" stroke="#7c5a3a" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
                <path d="M117 59 Q121 56 125 59" fill="none" stroke="#7c5a3a" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
                <ellipse cx="106" cy="66" rx="2.6" ry="3.2" fill="#1e293b" />
                <ellipse cx="122" cy="66" rx="2.6" ry="3.2" fill="#1e293b" />
                <circle cx="107" cy="64.6" r="0.9" fill="#fff" opacity="0.85" />
                <circle cx="123" cy="64.6" r="0.9" fill="#fff" opacity="0.85" />
                <path d="M112 71 Q114 74 116 71" fill="none" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
                <path d="M106 79 Q114 84 122 79" fill="none" stroke="#8b5a2b" strokeWidth="1.6" strokeLinecap="round" />

                {/* ===== HELMET ===== */}
                <GearLayer
                    name="Safety Helmet"
                    show={has('Safety Helmet')}
                    anim={equipAnim}
                    ox={pivot('Safety Helmet').x}
                    oy={pivot('Safety Helmet').y}
                    ghost={
                        <ellipse cx="114" cy="36" rx="26" ry="9" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 4" />
                    }
                >
                    <path d="M89 51 Q87 22 114 18 Q141 22 139 51 Q139 53 135 53 L93 53 Q89 53 89 51 Z" fill={`url(#${p('helmet')})`} stroke="#854d0e" strokeWidth="1.5" />
                    <path d="M85 51 Q114 57 143 51 Q145 54 139 55 Q114 60 89 55 Q83 54 85 51 Z" fill={`url(#${p('helmet')})`} stroke="#854d0e" strokeWidth="1.2" />
                    <path d="M114 20 Q116 36 116 51" stroke="#a16207" strokeWidth="2" fill="none" opacity="0.7" />
                    <path d="M100 23 Q102 38 102 52" stroke="#a16207" strokeWidth="1.3" fill="none" opacity="0.45" />
                    <path d="M128 23 Q126 38 126 52" stroke="#a16207" strokeWidth="1.3" fill="none" opacity="0.45" />
                    <ellipse cx="103" cy="32" rx="9" ry="5" fill="#fef9c3" opacity="0.6" transform="rotate(-25 103 32)" />
                </GearLayer>

                {/* ===== SAFETY GOGGLES ===== */}
                <GearLayer
                    name="Safety Goggles"
                    show={has('Safety Goggles')}
                    anim={equipAnim}
                    ox={pivot('Safety Goggles').x}
                    oy={pivot('Safety Goggles').y}
                >
                    <path d="M98 66 Q98 59 108 59 L120 59 Q130 59 130 66 Q130 74 120 74 L108 74 Q98 74 98 66 Z" fill="#7dd3fc" opacity="0.7" stroke="#0369a1" strokeWidth="1.5" />
                    <line x1="114" y1="59" x2="114" y2="74" stroke="#0369a1" strokeWidth="1.2" />
                    <path d="M98 63 Q90 61 86 65" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                    <path d="M130 63 Q138 61 142 65" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                    <ellipse cx="104" cy="64" rx="4" ry="2.5" fill="#fff" opacity="0.5" />
                </GearLayer>

                {/* ===== RAINCOAT ===== */}
                <GearLayer
                    name="Raincoat"
                    show={has('Raincoat')}
                    anim={equipAnim}
                    ox={pivot('Raincoat').x}
                    oy={pivot('Raincoat').y}
                >
                    <path d="M70 100 Q56 130 58 200 Q60 240 74 250 L80 204 Q72 150 82 110 Z" fill="#0284c7" opacity="0.5" stroke="#0369a1" strokeWidth="1" />
                </GearLayer>
            </g>

            {/* ---------- HELD TOOLS ---------- */}
            <GearLayer
                name="Discharge Rod"
                show={has('Discharge Rod')}
                anim={equipAnim}
                ox={pivot('Discharge Rod').x}
                oy={pivot('Discharge Rod').y}
            >
                <g transform="translate(18, 70) rotate(-10)" filter={`url(#${p('shadow')})`}>
                    <rect x="0" y="0" width="11" height="200" rx="5" fill="#a8a29e" />
                    <rect x="2" y="26" width="7" height="150" rx="3" fill="#ef4444" opacity="0.8" />
                    <rect x="1" y="0" width="3" height="200" fill="#e7e5e4" opacity="0.6" />
                    <circle cx="5.5" cy="9" r="9" fill="#57534e" stroke="#44403c" strokeWidth="1.5" />
                    <circle cx="5.5" cy="9" r="4" fill="#a8a29e" />
                    <path d="M2 192 L9 200 L5 206 Z" fill="#44403c" />
                </g>
            </GearLayer>

            <GearLayer
                name="Voltage Detector"
                show={has('Voltage Detector')}
                anim={equipAnim}
                ox={pivot('Voltage Detector').x}
                oy={pivot('Voltage Detector').y}
            >
                <g transform="translate(196, 160)" filter={`url(#${p('shadow')})`}>
                    <rect x="0" y="0" width="24" height="42" rx="6" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
                    <rect x="4" y="6" width="16" height="11" rx="2" fill="#fef08a" />
                    <path d="M11 8 L9 12 L13 12 L11 16" fill="none" stroke="#b45309" strokeWidth="1" />
                    <circle cx="12" cy="28" r="4" fill="#1e293b" />
                    <rect x="9" y="-12" width="6" height="14" rx="3" fill="#94a3b8" />
                    <circle cx="12" cy="-12" r="3.5" fill="#fca5a5" />
                </g>
            </GearLayer>

            <GearLayer
                name="Torch/Emergency Light"
                show={has('Torch/Emergency Light')}
                anim={equipAnim}
                ox={pivot('Torch/Emergency Light').x}
                oy={pivot('Torch/Emergency Light').y}
            >
                <g transform="translate(26, 268) rotate(-8)" filter={`url(#${p('shadow')})`}>
                    <rect x="0" y="10" width="17" height="40" rx="5" fill="#334155" />
                    <path d="M1 10 H16 Q19 0 8.5 0 Q-2 0 1 10 Z" fill="#fde047" />
                    <ellipse cx="8.5" cy="-2" rx="11" ry="7" fill="#fef9c3" opacity="0.4" />
                    <rect x="4" y="22" width="9" height="4" rx="1" fill="#64748b" />
                    <rect x="4" y="30" width="9" height="3" rx="1" fill="#64748b" opacity="0.7" />
                </g>
            </GearLayer>

            {/* ---------- BRAND ---------- */}
            <text x="120" y="390" textAnchor="middle" fontSize="8.5" fill="#475569" fontWeight="800" opacity="0.5" letterSpacing="0.12em">
                SMART LINEMAN · STAY SAFE
            </text>
            </g>
        </g>
    );
}
