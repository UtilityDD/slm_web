import React, { useEffect, useMemo, useRef } from 'react';
import {
  applyPoseToJoints,
  applyWorldToWalker,
  clamp01,
  easeInCubic,
  easeInOutCubic,
  easeInOutQuad,
  easeOutBack,
  easeOutCubic,
  lerp,
  REST_POSE,
  walkPose,
} from '../utils/linemanSkeletonAnim';

/** Sentinel path: overlay renders this story instead of a photo. */
export const SOLAR_STORY_MORPH_IMAGE = '/images/sponsor/morph:solar-story';

const CYCLE_MS = 18000;
const TAU = Math.PI * 2;
/** Climb height (rem) — feet stay on ground line via translateY, same as landing. */
const CLIMB_REM = 4.15;
const LADDER_LEFT_PCT = 84;
/** Cap draw rate — enough for stick motion, ~half the main-thread work of 60fps. */
const FRAME_MS = 33;

const JOINT_NAMES = [
  'pelvis',
  'chest',
  'head',
  'helmet',
  'armLU',
  'armLL',
  'armRU',
  'armRL',
  'legLU',
  'legLL',
  'footL',
  'legRU',
  'legRL',
  'footR',
  'pouch',
  'prop',
  'hotstick',
  'handTip',
];

/** Scene landmarks (viewBox 320×150). House + panel far left; sun right. */
const SUN = { x: 286, y: 22, r: 13 };
const PANEL = { x: 58, y: 102 };
const GROUND_Y = 128;
const LADDER_TOP_Y = GROUND_Y - CLIMB_REM * 16;

/**
 * Same alternating limb climb as landing nonprofit stickman
 * (`sampleLinemanScene` climb beat).
 */
function landingClimbPose(u, cycles = 4.2) {
  const climbPhase = clamp01(u) * cycles;
  return {
    ...REST_POSE,
    pelvisY: -Math.abs(Math.sin(climbPhase * Math.PI)) * 0.8,
    chestRot: 4 + Math.sin(climbPhase * Math.PI) * 3,
    headRot: 2,
    armLU: -15 + Math.sin(climbPhase * TAU) * 42,
    armRU: 15 + Math.sin(climbPhase * TAU + Math.PI) * 42,
    armLL: 18 + Math.max(0, Math.sin(climbPhase * TAU)) * 12,
    armRL: 18 + Math.max(0, Math.sin(climbPhase * TAU + Math.PI)) * 12,
    legLU: Math.sin(climbPhase * TAU) * 36,
    legLL: Math.max(12, -Math.sin(climbPhase * TAU) * 55 + 22),
    legRU: Math.sin(climbPhase * TAU + Math.PI) * 36,
    legRL: Math.max(12, -Math.sin(climbPhase * TAU + Math.PI) * 55 + 22),
    pouchRot: Math.sin(climbPhase * TAU - 0.5) * 12,
    helmetOpacity: 1,
    helmetY: Math.sin(climbPhase * TAU * 2) * 0.35,
  };
}

function sampleSolarStory(elapsedMs) {
  const t = (elapsedMs % CYCLE_MS) / 1000;

  let xPct = 112;
  let yRem = 0;
  let facing = -1;
  let pose = { ...REST_POSE };
  let ladder = {
    leftPct: LADDER_LEFT_PCT,
    opacity: 0,
    scaleY: 0.15,
    rot: 8,
    heightRem: CLIMB_REM,
  };
  let sunHooked = 0;
  let panelHooked = 0;
  let homeLit = 0;
  let energyFlow = 0;
  let billShow = 0;
  let smile = 0;
  /** none | carry | hang (to hand) | panel (installed on solar plate) */
  let wireMode = 'none';
  let wireSag = 0.35;
  let handLift = 0;
  let holdingWire = false;

  // 0–2.0: enter from RIGHT, walk to ladder
  if (t < 2.0) {
    const u = easeInOutCubic(clamp01(t / 2.0));
    xPct = lerp(112, LADDER_LEFT_PCT, u);
    facing = -1;
    yRem = 0;
    pose = walkPose(t * 1.5, { lean: 5, armAmp: 12, legAmp: 15 });
    pose.armRU = -35;
    pose.armRL = -12;
    if (u > 0.5) {
      const lu = easeOutBack(clamp01((u - 0.5) / 0.5));
      ladder = {
        ...ladder,
        opacity: clamp01(lu * 1.35),
        scaleY: lerp(0.12, 1, lu),
        rot: lerp(10, 1.5, lu),
      };
    }
  }
  // 2.0–3.7: FAST climb UP (no wire) → at top, pull wire from the sun
  else if (t < 3.7) {
    const u = clamp01((t - 2.0) / 1.7);
    xPct = LADDER_LEFT_PCT;
    facing = 1;
    yRem = lerp(0, -CLIMB_REM, easeInOutCubic(u));
    pose = landingClimbPose(u, 3.6);
    ladder = { ...ladder, opacity: 1, scaleY: 1, rot: 1 };
    handLift = clamp01((u - 0.7) / 0.3);
    // No wire while climbing — only appear when hooked from the sun
    if (u < 0.72) {
      wireMode = 'none';
      holdingWire = false;
    } else {
      sunHooked = clamp01((u - 0.72) / 0.28);
      wireMode = 'hang';
      holdingWire = true;
      wireSag = 0.45;
      pose.armRU = lerp(pose.armRU, -40, sunHooked);
      pose.armRL = lerp(pose.armRL, -20, sunHooked);
      pose.headRot = lerp(2, -10, sunHooked);
    }
  }
  // 3.7–5.3: FAST climb DOWN with wire (~1.6s)
  else if (t < 5.3) {
    const u = clamp01((t - 3.7) / 1.6);
    xPct = LADDER_LEFT_PCT;
    facing = -1;
    yRem = lerp(-CLIMB_REM, 0, easeInOutCubic(u));
    pose = landingClimbPose(1 - u, 3.6);
    pose.armRU = lerp(pose.armRU, -55, 0.55);
    pose.armRL = lerp(pose.armRL, -22, 0.55);
    ladder = { ...ladder, opacity: 1, scaleY: 1, rot: 1 };
    sunHooked = 1;
    wireMode = 'hang';
    holdingWire = true;
    wireSag = lerp(0.5, 0.85, u);
    handLift = 0.4;
  }
  // 5.3–6.0: ladder falls
  else if (t < 6.0) {
    const u = easeInCubic(clamp01((t - 5.3) / 0.7));
    xPct = lerp(LADDER_LEFT_PCT, 76, easeInOutQuad(u));
    yRem = 0;
    facing = -1;
    pose = walkPose(t * 1.2, { lean: 4, armAmp: 10, legAmp: 13 });
    pose.armRU = -50;
    pose.armRL = -18;
    ladder = {
      ...ladder,
      rot: lerp(1, 78, u),
      opacity: 1 - u,
      scaleY: lerp(1, 0.35, u),
    };
    sunHooked = 1;
    wireMode = 'hang';
    holdingWire = true;
    wireSag = 0.8;
  }
  // 6.0–8.6: walk to panel, connect wire to solar plate
  else if (t < 8.6) {
    const u = clamp01((t - 6.0) / 2.6);
    xPct = lerp(76, 20, easeInOutCubic(u));
    yRem = 0;
    facing = -1;
    pose = walkPose(t * 1.25, { lean: 4, armAmp: 10, legAmp: 14 });
    pose.armRU = lerp(-50, -95, u);
    pose.armRL = lerp(-18, -30, u);
    ladder = { ...ladder, opacity: 0, scaleY: 0.2, rot: 78 };
    sunHooked = 1;
    holdingWire = true;
    wireMode = 'hang';
    wireSag = lerp(0.8, 0.45, u);
    panelHooked = clamp01((u - 0.7) / 0.3);
    if (u > 0.82) {
      // Snap onto plate — release next beat
      wireMode = 'panel';
      holdingWire = false;
      pose.armRU = -100;
      pose.armRL = -28;
      handLift = 0.3;
    }
  }
  // 8.6–11.5: free hands, walk to center, strong glow
  else if (t < 11.5) {
    const u = clamp01((t - 8.6) / 2.9);
    xPct = lerp(20, 50, easeInOutCubic(u));
    yRem = 0;
    facing = 1;
    pose = walkPose(t * 1.1, { lean: 4, armAmp: 14, legAmp: 14 });
    // Free hands — natural swing
    ladder = { ...ladder, opacity: 0 };
    sunHooked = 1;
    panelHooked = 1;
    wireMode = 'panel';
    holdingWire = false;
    wireSag = 0.4;
    energyFlow = easeOutCubic(u);
    homeLit = easeInOutCubic(Math.min(1, u * 1.25));
    smile = clamp01((u - 0.3) / 0.4);
  }
  // 11.5–18: center, Electric Bill ₹0
  else {
    const u = clamp01((t - 11.5) / 6.5);
    xPct = 50;
    yRem = 0;
    facing = 1;
    pose = { ...REST_POSE };
    pose.legLU = 5;
    pose.legRU = -4;
    pose.chestRot = -3;
    pose.headRot = lerp(8, -8, easeOutCubic(clamp01(u * 1.4)));
    pose.armRU = 12;
    pose.armRL = -6;
    pose.armLU = lerp(22, -105, easeOutBack(clamp01(u * 1.5)));
    pose.armLL = lerp(8, -15, u);
    smile = 1;
    billShow = easeOutBack(clamp01((u - 0.08) / 0.4));
    ladder = { ...ladder, opacity: 0 };
    sunHooked = 1;
    panelHooked = 1;
    wireMode = 'panel';
    holdingWire = false;
    wireSag = 0.38;
    energyFlow = 1;
    homeLit = 1;
  }

  return {
    t,
    world: { xPct, yRem, rot: 0, facing },
    pose,
    ladder,
    sunHooked,
    panelHooked,
    homeLit,
    energyFlow,
    billShow,
    smile,
    wireMode,
    wireSag,
    handLift,
    holdingWire,
  };
}

function flexibleWirePath({ tipX, tipY, sag, sway = 0, plugged }) {
  const x0 = SUN.x - 2;
  const y0 = SUN.y + SUN.r * 0.85;
  const x3 = tipX;
  const y3 = tipY;
  const midX = (x0 + x3) * 0.5;
  const midY = Math.max(y0, y3) + sag * 42 + sway * 6;
  const c1x = lerp(x0, midX, 0.45) + sway * 5;
  const c1y = lerp(y0, midY, 0.55);
  const c2x = lerp(midX, x3, 0.4) - sway * 4;
  const c2y = lerp(midY, y3, 0.4) + (plugged ? 0 : sway * 3);
  // 1 decimal is enough; cheaper than toFixed strings repeatedly via template
  const r = (n) => (Math.round(n * 10) / 10);
  return `M ${r(x0)} ${r(y0)} C ${r(c1x)} ${r(c1y)}, ${r(c2x)} ${r(c2y)}, ${r(x3)} ${r(y3)}`;
}

/** Approximate hand tip in scene coords — avoids layout thrash from getBoundingClientRect. */
function approxHand(xPct, yRem, handLift) {
  const climbU = clamp01(-yRem / CLIMB_REM);
  return {
    x: lerp(28, 295, clamp01(xPct / 100)),
    y: lerp(GROUND_Y - 18, LADDER_TOP_Y + 6, climbU) - handLift * 8,
  };
}

function LadderMark() {
  const rungs = [8, 18, 28, 38, 48, 58, 68, 78, 88];
  return (
    <svg viewBox="0 0 22 96" width="22" height="96" fill="none" aria-hidden preserveAspectRatio="none">
      <line x1="3.5" y1="2" x2="3.5" y2="94" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="18.5" y1="2" x2="18.5" y2="94" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
      {rungs.map((y) => (
        <line key={y} x1="3.5" y1={y} x2="18.5" y2={y} stroke="#0f172a" strokeWidth="1.7" strokeLinecap="round" />
      ))}
    </svg>
  );
}

/**
 * Stickman solar story — animation only (no captions/dots).
 */
export default function SponsorSolarStoryMorph({ reduceMotion = false }) {
  const rootRef = useRef(null);
  const walkerRef = useRef(null);
  const ladderRef = useRef(null);
  const jointsRef = useRef({});
  const wireRef = useRef(null);
  const energyRef = useRef(null);
  const houseGlowRef = useRef(null);
  const yardGlowRef = useRef(null);
  const winARef = useRef(null);
  const winBRef = useRef(null);
  const sunSparkRef = useRef(null);
  const panelSparkRef = useRef(null);
  const skyRef = useRef(null);
  const billFloatRef = useRef(null);
  const smileRef = useRef(null);

  const jointBinders = useMemo(() => {
    const map = {};
    for (const name of JOINT_NAMES) {
      map[name] = (el) => {
        jointsRef.current[name] = el;
      };
    }
    return map;
  }, []);

  useEffect(() => {
    const joints = jointsRef.current;
    const wireEl = () => wireRef.current;
    const energyEl = () => energyRef.current;

    let lastLit = -1;
    let lastWireOp = -1;
    let lastEnergyOp = -1;
    let lastSun = -1;
    let lastPanel = -1;
    let lastBill = -1;
    let lastSmile = -1;
    let lastHold = -1;
    let lastWireD = '';
    let lastLadderKey = '';
    let lastWorldKey = '';
    let panelPathCache = '';

    const applyLit = (lit) => {
      const q = Math.round(lit * 40) / 40;
      if (q === lastLit) return;
      lastLit = q;
      if (houseGlowRef.current) houseGlowRef.current.style.opacity = String(q * 1.15);
      if (yardGlowRef.current) yardGlowRef.current.style.opacity = String(q * 0.5);
      const winOn = q > 0.08;
      if (winARef.current) {
        winARef.current.style.fill = winOn ? `rgba(254, 243, 199, ${0.55 + q * 0.45})` : '#1e293b';
      }
      if (winBRef.current) {
        winBRef.current.style.fill = winOn ? `rgba(253, 224, 71, ${0.6 + q * 0.4})` : '#1e293b';
      }
      if (skyRef.current) skyRef.current.style.opacity = String(0.1 + q * 0.85);
    };

    const applyLadder = (ladder) => {
      const el = ladderRef.current;
      if (!el || !ladder) return;
      const key = `${ladder.leftPct}|${ladder.opacity.toFixed(2)}|${ladder.rot.toFixed(1)}|${ladder.scaleY.toFixed(2)}`;
      if (key === lastLadderKey) return;
      lastLadderKey = key;
      el.style.left = `${ladder.leftPct}%`;
      el.style.height = `${ladder.heightRem}rem`;
      el.style.opacity = String(ladder.opacity);
      el.style.transform = `translateX(-50%) rotate(${ladder.rot}deg) scaleY(${ladder.scaleY})`;
    };

    const applyWorld = (world) => {
      const el = walkerRef.current;
      if (!el || !world) return;
      const key = `${world.xPct.toFixed(1)}|${world.yRem.toFixed(2)}|${world.facing}|${world.rot || 0}`;
      if (key === lastWorldKey) return;
      lastWorldKey = key;
      applyWorldToWalker(el, world);
    };

    if (reduceMotion) {
      const scene = sampleSolarStory(15000);
      applyPoseToJoints(joints, scene.pose);
      applyWorld({ xPct: 50, yRem: 0, facing: 1, rot: 0 });
      applyLadder({ ...scene.ladder, opacity: 0 });
      applyLit(1);
      if (billFloatRef.current) billFloatRef.current.style.opacity = '1';
      const w = wireEl();
      if (w) {
        w.setAttribute(
          'd',
          flexibleWirePath({ tipX: PANEL.x, tipY: PANEL.y, sag: 0.4, sway: 0, plugged: true })
        );
        w.style.opacity = '1';
      }
      if (joints.handTip) joints.handTip.style.opacity = '0';
      return undefined;
    }

    let raf = 0;
    let running = true;
    let visible = !document.hidden;
    const start = performance.now();
    let lastFrame = 0;

    const onVis = () => {
      visible = !document.hidden;
      if (visible && running && !raf) {
        lastFrame = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    const tick = (now) => {
      if (!running) return;
      if (!visible) {
        raf = 0;
        return;
      }
      if (now - lastFrame < FRAME_MS) {
        raf = requestAnimationFrame(tick);
        return;
      }
      lastFrame = now;

      const scene = sampleSolarStory(now - start);
      applyPoseToJoints(joints, scene.pose);
      applyWorld(scene.world);
      applyLadder(scene.ladder);

      if (joints.handTip && scene.holdingWire !== lastHold) {
        lastHold = scene.holdingWire;
        joints.handTip.style.opacity = scene.holdingWire ? '1' : '0';
      }

      const hand = approxHand(scene.world.xPct, scene.world.yRem, scene.handLift);
      const sway = Math.sin(now * 0.004) * 0.85;

      let pathD;
      if (scene.wireMode === 'none') {
        pathD = '';
      } else if (scene.wireMode === 'carry') {
        const sagY = hand.y + 14 + sway * 3;
        pathD = `M ${hand.x | 0} ${hand.y | 0} Q ${(hand.x + 12) | 0} ${sagY | 0}, ${(hand.x + 3) | 0} ${(hand.y + 20) | 0}`;
      } else if (scene.wireMode === 'panel') {
        if (!panelPathCache) {
          panelPathCache = flexibleWirePath({
            tipX: PANEL.x,
            tipY: PANEL.y,
            sag: 0.4,
            sway: 0,
            plugged: true,
          });
        }
        pathD = panelPathCache;
      } else {
        pathD = flexibleWirePath({
          tipX: hand.x,
          tipY: hand.y,
          sag: scene.wireSag,
          sway,
          plugged: false,
        });
      }

      const w = wireEl();
      if (w) {
        const op = scene.wireMode === 'none' ? 0 : 1;
        if (op !== lastWireOp) {
          lastWireOp = op;
          w.style.opacity = String(op);
        }
        if (pathD && pathD !== lastWireD) {
          lastWireD = pathD;
          w.setAttribute('d', pathD);
        }
      }

      const e = energyEl();
      if (e) {
        const eOpQ = Math.round(scene.energyFlow * 20) / 20;
        if (eOpQ !== lastEnergyOp) {
          lastEnergyOp = eOpQ;
          e.style.opacity = String(eOpQ);
        }
        if (eOpQ > 0.05) {
          if (!panelPathCache) {
            panelPathCache = flexibleWirePath({
              tipX: PANEL.x,
              tipY: PANEL.y,
              sag: 0.4,
              sway: 0,
              plugged: true,
            });
          }
          if (e.getAttribute('d') !== panelPathCache) {
            e.setAttribute('d', panelPathCache);
          }
          e.style.strokeDashoffset = String(((now / 40) | 0) % 36);
        }
      }

      if (sunSparkRef.current && scene.sunHooked !== lastSun) {
        lastSun = scene.sunHooked;
        sunSparkRef.current.style.opacity = String(scene.sunHooked);
      }
      if (panelSparkRef.current) {
        const pQ = Math.round(scene.panelHooked * 20) / 20;
        if (pQ !== lastPanel) {
          lastPanel = pQ;
          panelSparkRef.current.style.opacity = String(pQ);
        }
      }
      applyLit(scene.homeLit);

      if (billFloatRef.current) {
        const bQ = Math.round(scene.billShow * 40) / 40;
        if (bQ !== lastBill) {
          lastBill = bQ;
          const s = 0.55 + bQ * 0.55;
          billFloatRef.current.style.opacity = String(bQ);
          billFloatRef.current.style.transform = `translateX(-50%) scale(${s}) rotate(${(1 - bQ) * -8}deg)`;
        }
      }
      if (smileRef.current && scene.smile !== lastSmile) {
        lastSmile = scene.smile;
        smileRef.current.setAttribute('opacity', String(scene.smile));
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduceMotion]);

  return (
    <div ref={rootRef} className="sponsor-solar-morph sponsor-solar-story" aria-hidden>
      <div className="sponsor-solar-morph__frame sponsor-solar-story__frame">
        <svg
          className="sponsor-solar-story__bg"
          viewBox="0 0 320 150"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="sss-sun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="55%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
            <linearGradient id="sss-panel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient id="sss-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.75" />
              <stop offset="55%" stopColor="#fdba74" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="sss-yard" cx="20%" cy="70%" r="45%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="sss-haze" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#94a3b8" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect width="320" height="150" fill="#0f172a" opacity="0.05" />
          <rect ref={skyRef} width="320" height="150" fill="url(#sss-sky)" opacity="0.12" />
          <rect ref={yardGlowRef} width="320" height="150" fill="url(#sss-yard)" opacity="0" />

          <path d="M0 118c50-10 110-14 170-6s90 8 150 2v36H0z" fill="#cbd5e1" opacity="0.28" />
          <path d="M0 128h320" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M0 130c40-4 100-2 160 3s100 2 160-5v22H0z" fill="#e2e8f0" opacity="0.4" />

          <g transform="translate(14 76) scale(0.7)" opacity="0.95">
            <circle ref={houseGlowRef} cx="18" cy="34" r="42" fill="#fbbf24" opacity="0" />
            <path d="M0 24L18 6l18 18v30H0z" fill="#334155" stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M18 6l18 18H0z" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round" />
            <rect ref={winARef} x="6" y="28" width="8" height="8" rx="1" fill="#1e293b" stroke="#0f172a" strokeWidth="0.9" />
            <rect ref={winBRef} x="22" y="28" width="8" height="8" rx="1" fill="#1e293b" stroke="#0f172a" strokeWidth="0.9" />
          </g>

          <g transform="translate(42 98)">
            <path d="M2 24h34" stroke="#94a3b8" strokeWidth="2.6" strokeLinecap="round" />
            <rect x="4" y="2" width="30" height="18" rx="2" fill="url(#sss-panel)" stroke="#0f172a" strokeWidth="1.4" />
            <path d="M4 8h30M4 14h30M14 2v18M24 2v18" stroke="#93c5fd" strokeWidth="0.85" opacity="0.75" />
            <circle ref={panelSparkRef} cx="19" cy="0" r="3.4" fill="#fbbf24" stroke="#0f172a" strokeWidth="0.8" opacity="0" />
          </g>
          <rect x="0" y="70" width="90" height="50" fill="url(#sss-haze)" pointerEvents="none" />

          <g transform={`translate(${SUN.x} ${SUN.y})`}>
            <circle r="22" fill="none" stroke="#fcd34d" strokeWidth="1" opacity="0.35" />
            <g stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.85">
              <path d="M0 -19v5M0 14v5M-19 0h5M14 0h5M-13 -13l3.5 3.5M9.5 9.5l3.5 3.5M13 -13l-3.5 3.5M-13 13l-3.5-3.5" />
            </g>
            <circle r={SUN.r} fill="url(#sss-sun)" />
            <circle ref={sunSparkRef} cx="0" cy="12" r="3.2" fill="#fde68a" stroke="#0f172a" strokeWidth="0.8" opacity="0" />
          </g>

          <path
            ref={wireRef}
            className="sponsor-solar-story__wire"
            d={`M ${SUN.x} ${SUN.y} L ${PANEL.x} ${PANEL.y}`}
            fill="none"
            stroke="#dc2626"
            strokeWidth="2.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0"
          />
          <path
            ref={energyRef}
            className="sponsor-solar-story__energy"
            d={`M ${SUN.x} ${SUN.y} L ${PANEL.x} ${PANEL.y}`}
            fill="none"
            stroke="#fde68a"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray="7 9"
            opacity="0"
          />
        </svg>

        <div className="sponsor-solar-story__rail">
          <div
            ref={ladderRef}
            className="sponsor-solar-story__ladder"
            style={{ opacity: 0, transform: 'translateX(-50%) rotate(8deg) scaleY(0.15)' }}
          >
            <LadderMark />
          </div>

          <div ref={walkerRef} className="sponsor-solar-story__walker">
            <svg
              className="sponsor-solar-story__man"
              viewBox="0 0 48 64"
              width="48"
              height="64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g transform="translate(24 43)">
                <g ref={jointBinders.pelvis}>
                  <g ref={jointBinders.pouch}>
                    <path
                      d="M0 0h3.2v4.2c0 .7-.6 1.2-1.2 1.2h-.8c-.7 0-1.2-.5-1.2-1.2V0Z"
                      className="landing-nonprofit-lineman__pouch"
                    />
                  </g>

                  <g ref={jointBinders.chest}>
                    <path d="M0 -14v14" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />

                    <g transform="translate(0 -14)">
                      <g ref={jointBinders.head}>
                        <g ref={jointBinders.helmet}>
                          <path
                            d="M-8 -11c0-5.2 3.8-9 8-9s8 3.8 8 9v2.2h-16V-11Z"
                            fill="#f97316"
                            stroke="#0f172a"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                          />
                          <path d="M-9.5 -8.8h19" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                          <circle cx="7.5" cy="-12" r="1.4" fill="#fbbf24" stroke="#0f172a" strokeWidth="0.8" />
                        </g>
                        <circle cx="0" cy="-5.5" r="5.2" fill="#fde68a" stroke="#0f172a" strokeWidth="1.6" />
                        <path
                          ref={smileRef}
                          d="M-2.2 -4.2c1.2 2.2 3.2 2.2 4.4 0"
                          fill="none"
                          stroke="#0f172a"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          opacity="0"
                        />
                      </g>
                    </g>

                    <g transform="translate(0 -10)">
                      <g ref={jointBinders.armLU}>
                        <line x1="0" y1="0" x2="-0.2" y2="7.2" className="landing-nonprofit-lineman__limb" strokeWidth="1.8" />
                        <g transform="translate(0 7.2)">
                          <g ref={jointBinders.armLL}>
                            <line x1="0" y1="0" x2="-0.3" y2="6.5" className="landing-nonprofit-lineman__limb" strokeWidth="1.8" />
                          </g>
                        </g>
                      </g>
                      <g ref={jointBinders.armRU}>
                        <line x1="0" y1="0" x2="0.2" y2="7.2" className="landing-nonprofit-lineman__limb" strokeWidth="1.8" />
                        <g transform="translate(0 7.2)">
                          <g ref={jointBinders.armRL}>
                            <line x1="0" y1="0" x2="0.3" y2="6.5" className="landing-nonprofit-lineman__limb" strokeWidth="1.8" />
                            <circle
                              ref={jointBinders.handTip}
                              cx="0.35"
                              cy="6.8"
                              r="1.35"
                              fill="#dc2626"
                              stroke="#0f172a"
                              strokeWidth="0.7"
                              opacity="0"
                            />
                            <g ref={jointBinders.prop} opacity="0" />
                            <g ref={jointBinders.hotstick} opacity="0" />
                          </g>
                        </g>
                      </g>
                    </g>
                  </g>

                  <g ref={jointBinders.legLU}>
                    <line x1="0" y1="0" x2="0" y2="8.5" className="landing-nonprofit-lineman__limb" />
                    <g transform="translate(0 8.5)">
                      <g ref={jointBinders.legLL}>
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="8"
                          className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__shin"
                        />
                        <g transform="translate(0 8)">
                          <g ref={jointBinders.footL}>
                            <path d="M0 0h2.8" className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__foot" />
                          </g>
                        </g>
                      </g>
                    </g>
                  </g>

                  <g ref={jointBinders.legRU}>
                    <line x1="0" y1="0" x2="0" y2="8.5" className="landing-nonprofit-lineman__limb" />
                    <g transform="translate(0 8.5)">
                      <g ref={jointBinders.legRL}>
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="8"
                          className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__shin"
                        />
                        <g transform="translate(0 8)">
                          <g ref={jointBinders.footR}>
                            <path d="M0 0h2.8" className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__foot" />
                          </g>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </svg>
          </div>
        </div>

        <div ref={billFloatRef} className="sponsor-solar-story__bill" style={{ opacity: 0 }}>
          <svg viewBox="0 0 88 108" width="88" height="108" aria-hidden>
            <rect x="4" y="4" width="80" height="100" rx="6" fill="#fff7ed" stroke="#0f172a" strokeWidth="2.4" />
            <text
              x="44"
              y="28"
              textAnchor="middle"
              fill="#0f172a"
              fontSize="11"
              fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif"
            >
              Electric Bill
            </text>
            <path d="M16 40h56" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
            <path d="M16 52h52M16 62h44" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
            <circle cx="44" cy="84" r="15" fill="#16a34a" stroke="#0f172a" strokeWidth="1.6" />
            <text
              x="44"
              y="89"
              textAnchor="middle"
              fill="#fff"
              fontSize="15"
              fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif"
            >
              ₹0
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
