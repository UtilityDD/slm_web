/**
 * Lightweight skeletal animation for the landing nonprofit stickman.
 * Full strip cross + funny beats (sit, volt check) + helmet gag — no physics engine.
 */

export const LINEMAN_CYCLE_MS = 43900;

/** Helmet gag start (after hotstick → Join CTA beat). */
export const HELMET_GAG_T0 = 27.5;

const TAU = Math.PI * 2;

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

export function easeInCubic(t) {
  return t * t * t;
}

export function easeOutBack(t, s = 1.15) {
  const c = s + 1;
  return 1 + c * (t - 1) ** 3 + s * (t - 1) ** 2;
}

export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpAngle(a, b, t) {
  let d = ((b - a + 180) % 360) - 180;
  if (d < -180) d += 360;
  return a + d * t;
}

export function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const REST_POSE = Object.freeze({
  pelvisY: 0,
  pelvisRot: 0,
  chestRot: 0,
  headRot: 0,
  headTilt: 0,
  helmetY: 0,
  helmetRot: 0,
  helmetOpacity: 1,
  armLU: -12,
  armLL: 8,
  armRU: 10,
  armRL: -6,
  legLU: 4,
  legLL: 2,
  footL: -4,
  legRU: -4,
  legRL: 2,
  footR: 4,
  pouchRot: 0,
  pouchX: 0,
  /** Volt tester / hotstick on right forearm — 0 hidden, 1 shown */
  propOpacity: 0,
  /** 'volt' | 'hotstick' | 'none' */
  propKind: 'none',
});

/** Match SVG thigh / shin lengths in LandingNonprofitLineman. */
const THIGH_LEN = 8.5;
const SHIN_LEN = 8;
const LEG_FULL = THIGH_LEN + SHIN_LEN;

/** Foot depth below hip after FK (SVG +Y down). */
function legFootY(hipDeg, kneeDeg) {
  const h = (hipDeg * Math.PI) / 180;
  const k = (kneeDeg * Math.PI) / 180;
  return THIGH_LEN * Math.cos(h) + SHIN_LEN * Math.cos(h + k);
}

/**
 * Drop the pelvis so the stance foot (lowest) stays on the walk line.
 * Positive pelvisY = down. Optional compress for weight transfer.
 */
function plantPelvisY(hipL, kneeL, hipR, kneeR, compress = 0) {
  const gap = LEG_FULL - Math.max(legFootY(hipL, kneeL), legFootY(hipR, kneeR));
  return Math.max(0, gap) + compress;
}

function withPlantedFeet(pose, compress = 0) {
  return {
    ...pose,
    pelvisY: plantPelvisY(pose.legLU, pose.legLL, pose.legRU, pose.legRL, compress),
  };
}

function clonePose(p = REST_POSE) {
  return { ...p };
}

function lerpPose(a, b, t, ease = easeInOutCubic) {
  const k = ease(clamp01(t));
  const out = {};
  for (const key of Object.keys(REST_POSE)) {
    if (key === 'propKind') {
      out[key] = k < 0.5 ? (a[key] ?? 'none') : (b[key] ?? 'none');
      continue;
    }
    if (
      key.includes('Rot') ||
      key.startsWith('arm') ||
      key.startsWith('leg') ||
      key.startsWith('foot') ||
      key === 'headTilt' ||
      key === 'pouchRot'
    ) {
      out[key] = lerpAngle(a[key] ?? REST_POSE[key], b[key] ?? REST_POSE[key], k);
    } else {
      out[key] = lerp(a[key] ?? REST_POSE[key], b[key] ?? REST_POSE[key], k);
    }
  }
  return out;
}

export function walkPose(phase, opts = {}) {
  const {
    lean = 5,
    bounce = 0.45,
    armAmp = 18,
    legAmp = 18,
    tired = 0,
  } = opts;

  const p = phase * TAU;
  const opp = p + Math.PI;
  const limp = 1 + tired * 0.08;
  // Opposite hips — one forward, one back (never both mid-air).
  const hipL = Math.sin(p) * legAmp * limp;
  const hipR = Math.sin(opp) * legAmp;
  // Swing knee bends when that thigh is rearward → forward; stance stays nearly locked.
  const swingL = Math.max(0, Math.cos(p)); // peak mid-swing for left
  const swingR = Math.max(0, Math.cos(opp));
  const kneeL = swingL * (32 + tired * 4) + Math.max(0, Math.sin(p)) * 3;
  const kneeR = swingR * 32 + Math.max(0, Math.sin(opp)) * 3;
  // Stance foot flat-ish; swing toe lifts a little for clearance.
  const footL = -hipL * 0.35 - swingL * 10;
  const footR = -hipR * 0.35 - swingR * 10;
  // Soft weight-transfer squat (down), never lift the whole body off the strip.
  const compress = Math.abs(Math.cos(p)) * bounce;
  const hipSway = Math.sin(p) * 2.4;
  const shoulder = -Math.sin(p) * (armAmp * 0.35);

  return withPlantedFeet(
    {
      ...REST_POSE,
      pelvisRot: hipSway * 0.3 + lean * 0.12,
      chestRot: lean + shoulder * 0.35,
      headRot: -lean * 0.22 - shoulder * 0.12,
      headTilt: Math.sin(p * 0.5) * 1.2,
      helmetY: Math.sin(p * 2) * 0.2,
      helmetRot: Math.sin(p) * 2,
      armLU: Math.sin(opp) * armAmp - 6,
      armLL: Math.max(4, -Math.sin(opp) * 12 + 8),
      armRU: Math.sin(p) * armAmp * 0.9 + 5,
      armRL: Math.max(4, -Math.sin(p) * 10 + 7),
      legLU: hipL,
      legLL: kneeL,
      footL,
      legRU: hipR,
      legRL: kneeR,
      footR,
      pouchRot: Math.sin(p - 0.55) * 12,
      pouchX: Math.sin(p - 0.55) * 0.45,
      propOpacity: 0,
    },
    compress
  );
}

export function idlePose(tSec, variant = 0, breathPhase = 0) {
  const breath = Math.sin(breathPhase) * 0.9;
  const base = {
    ...REST_POSE,
    chestRot: 2 + breath * 0.8,
    headRot: Math.sin(breathPhase * 0.37) * 2,
    headTilt: Math.sin(breathPhase * 0.21) * 2.5,
    helmetY: breath * 0.08,
    pouchRot: Math.sin(breathPhase * 0.5 - 0.4) * 3,
    // Soft stance — slight weight on one leg, both feet still on the line.
    legLU: 5,
    legLL: 3,
    footL: -2,
    legRU: -4,
    legRL: 3,
    footR: 3,
    armLU: -14,
    armLL: 10,
    armRU: 12,
    armRL: -4,
    propOpacity: 0,
  };

  const u = clamp01((tSec % 4.2) / 4.2);
  if (variant === 0) {
    const k = Math.sin(u * Math.PI);
    base.pelvisRot = k * 3;
    base.legLU = 5 + k * 4;
    base.legRU = -4 - k * 3;
  } else if (variant === 1) {
    const k = easeInOutQuad(u < 0.5 ? u * 2 : (1 - u) * 2);
    base.headRot = -8 * k;
    base.headTilt = -6 * k;
    base.chestRot = 4 + 3 * k;
  } else if (variant === 2) {
    const k = easeInOutQuad(u < 0.55 ? u / 0.55 : (1 - u) / 0.45);
    base.headRot = 10 * k;
    base.headTilt = 4 * k;
    base.helmetRot = -3 * k;
  } else if (variant === 3) {
    const k = easeInOutCubic(u);
    base.armRU = 12 + Math.sin(k * Math.PI) * 28;
    base.armRL = -4 + Math.sin(k * Math.PI) * 20;
    base.chestRot = 3 + k * 4;
    base.headRot = 5 * Math.sin(k * Math.PI);
  } else {
    const k = easeInOutCubic(u);
    base.armLU = -14 - Math.sin(k * Math.PI) * 40;
    base.armLL = 10 + Math.sin(k * Math.PI) * 25;
    base.helmetRot = Math.sin(k * Math.PI * 2) * 6;
    base.headTilt = Math.sin(k * Math.PI) * 5;
  }

  // Tiny breath compress — feet stay planted (no upward float).
  return withPlantedFeet(base, Math.max(0, breath) * 0.12);
}

/** Seated on the walk line — butt and feet at normal ground level (not hovering). */
export function sitPose(localSec) {
  const sway = Math.sin(localSec * 1.4);
  const glance = Math.sin(localSec * 0.9);
  // Knees-up sit: fold the legs, then plantPelvisY drops the hips until soles hit the strip.
  return withPlantedFeet(
    {
      ...REST_POSE,
      chestRot: 10 + sway * 2,
      headRot: glance * 10,
      headTilt: sway * 4,
      helmetY: sway * 0.2,
      armLU: -18 + sway * 8,
      armLL: 32,
      armRU: 16 + glance * 10,
      armRL: 28,
      legLU: 58 + sway * 2,
      legLL: 82,
      footL: -6,
      legRU: 54 - sway * 2,
      legRL: 86,
      footR: -4,
      pouchRot: -10 + sway * 6,
      propOpacity: 0,
    },
    0.55
  );
}

/**
 * Volt-check gag: draw tester, reach out, tiny zap jolt, inspect reading.
 * localSec from 0 at start of volt beat.
 */
export function voltPose(localSec) {
  const base = withPlantedFeet({
    ...REST_POSE,
    chestRot: 4,
    // Stable planted stance while he works the tester.
    legLU: 6,
    legLL: 3,
    footL: -2,
    legRU: -5,
    legRL: 3,
    footR: 3,
    propOpacity: 1,
    propKind: 'volt',
  });

  // 0–0.7: dig in pouch / draw tester
  if (localSec < 0.7) {
    const u = localSec / 0.7;
    return {
      ...base,
      armRU: lerp(12, 55, easeOutCubic(u)),
      armRL: lerp(-4, 40, u),
      headRot: lerp(0, 8, u),
      headTilt: 6,
      pouchRot: lerp(0, -25, u),
      propOpacity: easeInCubic(u),
    };
  }

  // 0.7–1.8: extend toward “line”, lean in, focused
  if (localSec < 1.8) {
    const u = (localSec - 0.7) / 1.1;
    return {
      ...base,
      chestRot: 8 + u * 4,
      headRot: 6,
      headTilt: -4,
      armRU: lerp(55, 88, easeInOutCubic(u)),
      armRL: lerp(40, 10, u),
      armLU: -18,
      armLL: 12,
      pouchRot: -10,
      propOpacity: 1,
    };
  }

  // 1.8–2.35: ZAP — body jolt (funny “live volt” reaction)
  if (localSec < 2.35) {
    const u = (localSec - 1.8) / 0.55;
    const shake = Math.sin(u * Math.PI * 10) * (1 - u) * 14;
    return {
      ...base,
      pelvisY: Math.abs(shake) * 0.08,
      chestRot: 12 + shake,
      headRot: 10 + shake * 0.5,
      headTilt: shake * 0.4,
      helmetRot: shake * 0.6,
      armRU: 88 + shake,
      armRL: 8 + shake * 0.5,
      armLU: -30 - shake,
      legLU: 8 + shake * 0.3,
      legRU: -6 - shake * 0.3,
      pouchRot: -15 + shake,
      propOpacity: 1,
    };
  }

  // 2.35–3.4: shake hand, stare at tester reading
  if (localSec < 3.4) {
    const u = (localSec - 2.35) / 1.05;
    const wiggle = Math.sin(u * Math.PI * 3) * (1 - u) * 10;
    return {
      ...base,
      chestRot: 6,
      headRot: 14,
      headTilt: -8,
      armRU: 70 + wiggle,
      armRL: 25,
      armLU: -22,
      armLL: 18,
      propOpacity: 1,
      pouchRot: -6,
    };
  }

  // 3.4–4.2: shrug / “huh” then pack tester
  const u = clamp01((localSec - 3.4) / 0.8);
  return {
    ...base,
    chestRot: 4 + (1 - u) * 4,
    headRot: lerp(10, 2, u),
    headTilt: lerp(-6, 0, u),
    armRU: lerp(70, 20, easeInOutCubic(u)),
    armRL: lerp(25, 8, u),
    armLU: lerp(-22, -12, u),
    pouchRot: lerp(-6, 0, u),
    propOpacity: 1 - easeInCubic(u),
    propKind: 'volt',
  };
}

/**
 * Look up at Join CTA, draw orange hotstick, sweep it over the button — then snap to helmet gag.
 * localSec from 0 at start of beat (~3.65s).
 */
export function hotstickPose(localSec) {
  const planted = withPlantedFeet({
    ...REST_POSE,
    chestRot: 4,
    legLU: 6,
    legLL: 3,
    footL: -2,
    legRU: -5,
    legRL: 3,
    footR: 3,
    propKind: 'hotstick',
    propOpacity: 1,
  });

  // 0–0.5: snap head high, dig pouch, draw hotstick
  if (localSec < 0.5) {
    const u = localSec / 0.5;
    return {
      ...planted,
      headRot: lerp(0, 28, easeOutCubic(u)),
      headTilt: lerp(0, -10, u),
      chestRot: lerp(2, 8, u),
      armRU: lerp(12, 48, easeOutCubic(u)),
      armRL: lerp(-4, 35, u),
      pouchRot: lerp(0, -28, u),
      propOpacity: easeInCubic(u),
      propKind: 'hotstick',
    };
  }

  // 0.5–1.15: raise hotstick toward Join CTA (above the strip)
  if (localSec < 1.15) {
    const u = (localSec - 0.5) / 0.65;
    return {
      ...planted,
      headRot: 30,
      headTilt: -12,
      chestRot: 10,
      armRU: lerp(48, -132, easeInOutCubic(u)),
      armRL: lerp(35, 12, u),
      armLU: lerp(-14, -28, u),
      armLL: 14,
      pouchRot: -8,
      propOpacity: 1,
      propKind: 'hotstick',
    };
  }

  // 1.15–3.2: point + sweep hotstick over the Join button
  if (localSec < 3.2) {
    const local = localSec - 1.15;
    const sweep = Math.sin(local * Math.PI * 1.55) * 22;
    const bob = Math.sin(local * Math.PI * 3.1) * 6;
    return {
      ...planted,
      headRot: 32 + bob * 0.15,
      headTilt: -14,
      chestRot: 12 + sweep * 0.08,
      armRU: -132 + sweep,
      armRL: 12 + bob * 0.4,
      armLU: -30,
      armLL: 16,
      pouchRot: -6 + sweep * 0.15,
      propOpacity: 1,
      propKind: 'hotstick',
    };
  }

  // 3.2–3.65: freeze high — beat ends abruptly into helmet gag
  const u = clamp01((localSec - 3.2) / 0.45);
  return {
    ...planted,
    headRot: 34,
    headTilt: -14,
    chestRot: 12,
    armRU: -118,
    armRL: 16,
    armLU: -28,
    propOpacity: 1 - easeInCubic(u * 0.35),
    propKind: 'hotstick',
  };
}

function keyframesAt(keys, t) {
  if (!keys.length) return REST_POSE;
  if (t <= keys[0].t) return clonePose(keys[0].pose);
  if (t >= keys[keys.length - 1].t) return clonePose(keys[keys.length - 1].pose);
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = (t - a.t) / Math.max(0.0001, b.t - a.t);
      return lerpPose(a.pose, b.pose, u, a.ease || easeInOutCubic);
    }
  }
  return clonePose(keys[keys.length - 1].pose);
}

/** Helmet flight — timed to gag start after hotstick Join-CTA beat. */
export function sampleHelmetFlight(t, cycleSeed = 1) {
  const T0 = HELMET_GAG_T0;

  if (t < T0) {
    return { leftPct: 50, yRem: -2.4, rot: 0, opacity: 0, scale: 1 };
  }

  // Cause lift — stay invisible until the worn head-helmet is gone (no double helmet).
  if (t < T0 + 0.6) {
    const u = easeOutCubic((t - T0) / 0.6);
    // Handoff after worn fade (~0.22s); tiny ease so it doesn’t pop harshly.
    const flyIn = clamp01((t - T0 - 0.22) / 0.08);
    return {
      leftPct: lerp(50, 46, u),
      yRem: lerp(-2.4, -3.2, u),
      rot: lerp(0, -25, u),
      opacity: flyIn,
      scale: 1,
    };
  }

  // Arc
  if (t < T0 + 2.8) {
    const u = (t - (T0 + 0.6)) / 2.2;
    const arc = Math.sin(clamp01(u) * Math.PI);
    const riseU = clamp01(u / 0.48);
    const fallU = u > 0.52 ? clamp01((u - 0.52) / 0.48) : 0;
    const drift = hash01(cycleSeed + 3) * 5;
    return {
      leftPct: lerp(38, 32 + drift, easeInOutQuad(u)),
      yRem: lerp(-3.2, -12.5, easeOutCubic(riseU)) + (fallU > 0 ? lerp(0, 10.2, easeInCubic(fallU)) : 0),
      rot: lerp(-25, 340 + drift * 18, easeInOutQuad(u)),
      opacity: 1,
      scale: 1 + arc * 0.1,
    };
  }

  // Descend to head
  if (t < T0 + 3.95) {
    const u = easeInCubic((t - (T0 + 2.8)) / 1.15);
    return {
      leftPct: lerp(32, 40, u),
      yRem: lerp(-2.3, 0.15, u),
      rot: lerp(300, 18, u),
      opacity: 1,
      scale: 1.05,
    };
  }

  // Bounce / hover while falling
  if (t < T0 + 8.0) {
    const u = clamp01((t - (T0 + 3.95)) / 4.05);
    const bounce = Math.sin(Math.min(1, u * 3) * Math.PI) * 2.2;
    return {
      leftPct: lerp(40, 24, easeInOutQuad(u)),
      yRem: -3.8 - bounce + (u > 0.55 ? easeInCubic((u - 0.55) / 0.45) * 14 : 0),
      rot: lerp(18, -12, u) + Math.sin(u * 8) * 10,
      opacity: u > 0.92 ? lerp(1, 0, (u - 0.92) / 0.08) : 1,
      scale: 1.02,
    };
  }

  return { leftPct: 22, yRem: 11.2, rot: 0, opacity: 0, scale: 0.95 };
}

function walkAlong(fromX, toX, u, cadence, seed, lean = 6) {
  const eased = easeInOutCubic(clamp01(u));
  const xPct = lerp(fromX, toX, eased);
  // Step length tied to travel so feet cadence matches ground speed (less skate/float).
  const dist = Math.abs(xPct - fromX);
  const phase = (dist / 7.2) * cadence + hash01(seed);
  let pose = walkPose(phase, { lean, tired: lean > 7 ? 0.4 : 0 });
  if (u < 0.06) {
    pose = withPlantedFeet(lerpPose(REST_POSE, pose, u / 0.06, easeOutCubic));
  }
  if (u > 0.9) {
    // Settle into idle without hopping off the strip.
    pose = withPlantedFeet(lerpPose(pose, idlePose(0, 0, 0), (u - 0.9) / 0.1, easeInOutCubic));
  }
  return { xPct, pose };
}

/**
 * Scene clock (seconds):
 * 0–7.5   walk L→R across nonprofit strip
 * 7.5–11.2 sit (funny break)
 * 11.2–12.2 stand
 * 12.2–16.5 volt check gag
 * 16.5–17.3 turn around
 * 17.3–23.2 walk R→L toward Vision
 * 23.2–23.85 idle near Vision
 * 23.85–27.5 look up + hotstick sweep over Join CTA
 * 27.5…   helmet gag → fall → recover → climb → loop join
 */
export function sampleLinemanScene(timeMs, cycleIndex = 0) {
  const duration = LINEMAN_CYCLE_MS;
  const t = (((timeMs % duration) + duration) % duration) / 1000;
  const seed = cycleIndex * 17.13 + 1;
  const cadence = 0.9 + hash01(seed) * 0.18;
  const idleVariantA = Math.floor(hash01(seed + 1) * 5);
  const idleVariantB = Math.floor(hash01(seed + 2) * 5);
  const personality = Math.floor(hash01(seed + 4) * 5);

  let pose = clonePose(REST_POSE);
  let xPct = 2;
  let yRem = 0;
  let bodyRot = 0;
  let facing = 1;
  let wornHelmetOpacity = 1;

  // --- Walk across to far end ---
  if (t < 7.5) {
    const w = walkAlong(2, 94, t / 7.5, cadence, seed + 5, 6);
    xPct = w.xPct;
    pose = w.pose;
  }

  // --- Sit down (funny) — sink onto the walk line, feet never leave the ground ---
  else if (t < 11.2) {
    xPct = 94;
    facing = 1;
    const local = t - 7.5;
    if (local < 0.55) {
      const u = local / 0.55;
      pose = withPlantedFeet(
        lerpPose(idlePose(0, 0, 0), sitPose(0), u, easeInOutCubic),
        u * 0.55
      );
    } else {
      pose = sitPose(local - 0.55);
      // quick “wave at audience” mid-sit
      if (local > 1.6 && local < 2.6) {
        const wave = Math.sin(((local - 1.6) / 1.0) * Math.PI);
        pose.armRU = 16 + wave * 55;
        pose.armRL = 28 + wave * 10;
        pose.headTilt = wave * 6;
      }
    }
  }

  // --- Stand from sit ---
  else if (t < 12.2) {
    xPct = 94;
    const u = (t - 11.2) / 1.0;
    // Rise while keeping soles glued to the strip.
    pose = withPlantedFeet(
      lerpPose(sitPose(3), idlePose(0, 3, t * 2), u, easeOutCubic),
      (1 - u) * 0.45
    );
  }

  // --- Volt check ---
  else if (t < 16.5) {
    xPct = 94;
    facing = 1;
    pose = voltPose(t - 12.2);
  }

  // --- Turn to face back ---
  else if (t < 17.3) {
    xPct = 94;
    const u = (t - 16.5) / 0.8;
    pose = idlePose(t, 0, t * 2);
    // rotate body world facing mid-turn
    if (u < 0.5) {
      facing = 1;
      bodyRot = easeInCubic(u * 2) * 8;
    } else {
      facing = -1;
      bodyRot = (1 - easeOutCubic((u - 0.5) * 2)) * -8;
    }
    pose.headRot = lerp(0, facing * 6, u);
  }

  // --- Walk back toward Vision (~28%) ---
  else if (t < 23.2) {
    facing = -1;
    bodyRot = 0;
    const u = (t - 17.3) / 5.9;
    const w = walkAlong(94, 28, u, cadence * 0.95, seed + 9, 5.5);
    xPct = w.xPct;
    pose = w.pose;
    // funny skip hop mid-return (one push-off, then land — not both feet floating)
    if (u > 0.42 && u < 0.52) {
      const hop = Math.sin(((u - 0.42) / 0.1) * Math.PI);
      yRem = -hop * 0.35;
      pose = {
        ...pose,
        legLU: lerp(pose.legLU, 28, hop),
        legLL: lerp(pose.legLL, 55, hop),
        legRU: lerp(pose.legRU, -8, hop),
        legRL: lerp(pose.legRL, 4, hop),
      };
      pose = withPlantedFeet(pose, hop * 0.15);
      // brief lift only while both knees are tucked for the skip
      pose.pelvisY -= hop * 0.55;
    }
  }

  // --- Brief idle near Vision ---
  else if (t < 23.85) {
    xPct = 28;
    facing = -1;
    const local = t - 23.2;
    const v = local < 0.35 ? idleVariantA : idleVariantB;
    pose = idlePose(local, v, t * 2.1);
    if (local < 0.35) {
      pose = withPlantedFeet(pose, (1 - local / 0.35) * 0.35);
    }
  }

  // --- Look up + hotstick sweep over Join CTA ---
  else if (t < HELMET_GAG_T0) {
    const local = t - 23.85;
    facing = 1; // face audience / Join button above
    // Stand under the centered Join button so the hotstick can tap it
    xPct = lerp(28, 50, easeOutCubic(clamp01(local / 0.55)));
    pose = hotstickPose(local);
  }

  // --- Helmet adjust → slips (sudden after hotstick) ---
  else if (t < HELMET_GAG_T0 + 0.8) {
    xPct = 50;
    facing = 1;
    const u = (t - HELMET_GAG_T0) / 0.8;
    // Hide worn helmet before the flying prop appears (~0.22s) so only one is visible.
    const wornFade = clamp01(u / 0.28);
    pose = {
      ...idlePose(t, 3, t * 2),
      armRU: lerp(-100, 35 + Math.sin(u * Math.PI) * 20, easeOutCubic(Math.min(1, u * 1.6))),
      armRL: lerp(16, 25, u),
      headRot: lerp(30, 8, easeInCubic(u)),
      headTilt: lerp(-12, 6, u),
      helmetRot: lerp(0, -18, easeOutCubic(Math.min(1, u * 1.4))),
      helmetY: lerp(0, -2.5, easeOutCubic(Math.min(1, u * 1.2))),
      helmetOpacity: 1 - easeInCubic(wornFade),
      chestRot: 5,
      propOpacity: 0,
      propKind: 'none',
    };
    wornHelmetOpacity = pose.helmetOpacity;
  }

  // --- Track flying helmet ---
  else if (t < HELMET_GAG_T0 + 3.0) {
    xPct = 50;
    facing = 1;
    const u = (t - (HELMET_GAG_T0 + 0.8)) / 2.2;
    pose = {
      ...idlePose(t, 2, t * 2),
      headRot: lerp(8, 22, easeOutCubic(Math.min(1, u * 1.2))),
      headTilt: lerp(4, -4, u),
      chestRot: lerp(4, 8, u),
      armLU: lerp(-10, -20, u),
      armRU: lerp(20, 15, u),
      helmetOpacity: 0,
      propOpacity: 0,
      propKind: 'none',
    };
    wornHelmetOpacity = 0;
  }

  // --- Uh-oh ---
  else if (t < HELMET_GAG_T0 + 3.95) {
    facing = 1;
    xPct = lerp(50, 48, (t - (HELMET_GAG_T0 + 3.0)) / 0.95);
    const u = (t - (HELMET_GAG_T0 + 3.0)) / 0.95;
    pose = {
      ...REST_POSE,
      pelvisY: -0.3,
      chestRot: lerp(8, -6, easeInOutCubic(u)),
      headRot: lerp(22, 18, u),
      headTilt: -2,
      armLU: lerp(-20, -55, easeOutBack(u)),
      armLL: lerp(10, 30, u),
      armRU: lerp(15, -50, easeOutBack(clamp01(u * 1.1))),
      armRL: lerp(8, 28, u),
      legLU: lerp(6, -8, u),
      legRU: lerp(-4, 10, u),
      helmetOpacity: 0,
    };
    wornHelmetOpacity = 0;
  }

  // --- Impact ---
  else if (t < HELMET_GAG_T0 + 4.35) {
    facing = 1;
    xPct = 39;
    const u = (t - (HELMET_GAG_T0 + 3.95)) / 0.4;
    pose = {
      ...REST_POSE,
      pelvisY: lerp(0, 1.2, easeOutCubic(u)),
      chestRot: lerp(-6, 18, easeOutCubic(u)),
      headRot: lerp(18, 8, u),
      headTilt: lerp(0, 8, u),
      helmetOpacity: 0,
      armLU: lerp(-55, -30, u),
      armRU: lerp(-50, -25, u),
      armLL: 20,
      armRL: 18,
      legLU: -12,
      legRU: 14,
      pouchRot: -20,
    };
    bodyRot = lerp(0, 12, easeOutCubic(u));
    wornHelmetOpacity = 0;
  }

  // --- Almost recover ---
  else if (t < HELMET_GAG_T0 + 6.4) {
    const local = t - (HELMET_GAG_T0 + 4.35);
    const u = local / 2.05;
    wornHelmetOpacity = 0;
    facing = 1;
    xPct = lerp(39, 36, easeInOutQuad(u));
    const stepPhase = local * 1.35;
    const windmill = Math.sin(local * 9) * 48;
    const tryLean = Math.sin(local * 4.2) * 10;
    pose = {
      ...REST_POSE,
      pelvisY: Math.sin(stepPhase * TAU) * 0.5,
      pelvisRot: tryLean * 0.3,
      chestRot: 10 + tryLean,
      headRot: -6 + Math.sin(local * 5) * 8,
      headTilt: Math.sin(local * 6) * 6,
      helmetOpacity: 0,
      armLU: -20 + windmill,
      armLL: 25 + Math.sin(local * 9 + 1) * 15,
      armRU: -15 - windmill * 0.85,
      armRL: 22 + Math.sin(local * 9 + 2) * 12,
      legLU: Math.sin(stepPhase * TAU) * 28,
      legLL: Math.max(4, -Math.sin(stepPhase * TAU) * 30 + 10),
      footL: -Math.sin(stepPhase * TAU) * 10,
      legRU: Math.sin(stepPhase * TAU + Math.PI) * 26,
      legRL: Math.max(4, -Math.sin(stepPhase * TAU + Math.PI) * 28 + 8),
      footR: -Math.sin(stepPhase * TAU + Math.PI) * 10,
      pouchRot: Math.sin(local * 7) * 22,
    };
    bodyRot = lerp(12, 22, easeInCubic(Math.min(1, u * 1.2))) + Math.sin(local * 5) * 6;
    if (u > 0.78) {
      const fail = (u - 0.78) / 0.22;
      bodyRot = lerp(bodyRot, 32, easeInCubic(fail));
      pose.chestRot = lerp(pose.chestRot, 28, fail);
      pose.legLU = lerp(pose.legLU, -30, fail);
      pose.legRU = lerp(pose.legRU, 35, fail);
      xPct = lerp(xPct, 24, fail);
      facing = 1;
    }
  }

  // --- Fall + land ---
  else if (t < HELMET_GAG_T0 + 8.2) {
    const u = (t - (HELMET_GAG_T0 + 6.4)) / 1.8;
    wornHelmetOpacity = 0;
    facing = 1;
    xPct = lerp(24, 22, easeInOutQuad(u));
    if (u < 0.55) {
      const f = easeInCubic(u / 0.55);
      yRem = lerp(0, 11.2, f);
      bodyRot = lerp(32, 18, f);
      pose = {
        ...REST_POSE,
        chestRot: lerp(28, -20, f),
        headRot: lerp(0, -15, f),
        armLU: lerp(-40, -70, f),
        armRU: lerp(-30, 50, f),
        armLL: 30,
        armRL: 20,
        legLU: lerp(-30, 40, f),
        legRU: lerp(35, -15, f),
        legLL: 25,
        legRL: 20,
        pouchRot: lerp(20, -40, f),
        helmetOpacity: 0,
      };
    } else {
      const s = (u - 0.55) / 0.45;
      const bounce = Math.sin(Math.min(1, s * 2.2) * Math.PI) * 0.55;
      yRem = 11.35 - bounce * (1 - s);
      bodyRot = lerp(18, -4, easeOutCubic(s));
      pose = {
        ...REST_POSE,
        chestRot: lerp(-20, -28, easeOutCubic(s)),
        headRot: lerp(-15, -8, s),
        headTilt: 6,
        armLU: -60,
        armRU: 40,
        armLL: 35,
        armRL: 15,
        legLU: 55,
        legLL: 40,
        legRU: -10,
        legRL: 30,
        pouchRot: lerp(-40, -12, s),
        helmetOpacity: 0,
        pelvisY: bounce * 2,
      };
    }
  }

  // --- Hold ---
  else if (t < HELMET_GAG_T0 + 9.3) {
    xPct = 22;
    yRem = 11.5;
    bodyRot = 0;
    wornHelmetOpacity = 0;
    pose = {
      ...REST_POSE,
      chestRot: -28,
      headRot: -6,
      headTilt: 4,
      armLU: -58,
      armRU: 38,
      armLL: 32,
      armRL: 12,
      legLU: 52,
      legLL: 38,
      legRU: -8,
      legRL: 28,
      pouchRot: -8,
      helmetOpacity: 0,
    };
  }

  // --- Get up ---
  else if (t < HELMET_GAG_T0 + 12.4) {
    const local = t - (HELMET_GAG_T0 + 9.3);
    const u = local / 3.1;
    xPct = 22;
    wornHelmetOpacity = u > 0.42 ? lerp(0, 1, clamp01((u - 0.42) / 0.12)) : 0;
    const keys = [
      {
        t: 0,
        pose: {
          ...REST_POSE,
          chestRot: -28,
          headRot: -6,
          armLU: -58,
          armRU: 38,
          legLU: 52,
          legLL: 38,
          helmetOpacity: 0,
        },
      },
      {
        t: 0.18,
        pose: {
          ...REST_POSE,
          chestRot: -18,
          armRU: 70,
          armRL: 40,
          armLU: -40,
          legLU: 45,
          legLL: 50,
          helmetOpacity: 0,
        },
        ease: easeOutCubic,
      },
      {
        t: 0.38,
        pose: {
          ...REST_POSE,
          pelvisY: 2,
          chestRot: 8,
          headRot: 4,
          armLU: -20,
          armRU: 25,
          legLU: 70,
          legLL: 90,
          legRU: 40,
          legRL: 70,
          helmetOpacity: 0,
        },
      },
      {
        t: 0.5,
        pose: {
          ...REST_POSE,
          pelvisY: 1.5,
          chestRot: 6,
          headRot: 8,
          armRU: 45,
          armRL: 30,
          legLU: 65,
          legLL: 85,
          helmetOpacity: 1,
          helmetY: -1,
        },
      },
      {
        t: 0.72,
        pose: {
          ...REST_POSE,
          chestRot: 4,
          headRot: 2,
          armLU: -16,
          armRU: 14,
          legLU: 10,
          legLL: 8,
          legRU: -6,
          legRL: 6,
          helmetOpacity: 1,
        },
        ease: easeOutBack,
      },
      {
        t: 1,
        pose: {
          ...idlePose(0, 0, 0),
          armRU: 28,
          armRL: 18,
          headTilt: -3,
          helmetOpacity: 1,
        },
      },
    ];
    pose = keyframesAt(keys, u);
    yRem = lerp(11.5, 7.75, easeInOutCubic(clamp01(u / 0.55)));
    if (u > 0.55) yRem = 7.75;
    bodyRot = 0;
  }

  // --- Personality (helmet on, on Vision card top) ---
  else if (t < HELMET_GAG_T0 + 13.1) {
    xPct = 22;
    yRem = 7.75;
    wornHelmetOpacity = 1;
    const u = (t - (HELMET_GAG_T0 + 12.4)) / 0.7;
    const k = easeInOutCubic(u < 0.5 ? u * 2 : (1 - u) * 2);
    pose = idlePose(t, 0, t * 2);
    pose.helmetOpacity = 1;
    if (personality === 0) {
      pose.helmetRot = k * 12;
      pose.armRU = 12 + k * 30;
    } else if (personality === 1) {
      pose.headRot = k * -12;
      pose.headTilt = k * 6;
    } else if (personality === 2) {
      pose.armLU = -14 - k * 8;
      pose.armRU = 12 + k * 8;
      pose.chestRot = 2 + k * 6;
    } else if (personality === 3) {
      pose.armRU = 12 + k * 50;
      pose.armRL = -4 + k * 20;
      pose.headTilt = k * 4;
    } else {
      pose.headRot = k * 8;
      pose.chestRot = 2 + k * 3;
    }
  }

  // --- Call ladder (sudden) — whistle/point, then climb ---
  else if (t < HELMET_GAG_T0 + 13.65) {
    xPct = 22;
    yRem = 7.75;
    wornHelmetOpacity = 1;
    const u = (t - (HELMET_GAG_T0 + 13.1)) / 0.55;
    pose = {
      ...idlePose(t, 0, t * 2),
      helmetOpacity: 1,
      armRU: lerp(14, 75, easeOutBack(u)),
      armRL: lerp(0, 20, u),
      headRot: lerp(2, 12, u),
      headTilt: lerp(0, -4, u),
      chestRot: 4 + u * 4,
    };
  }

  // --- Climb the ladder back to strip ---
  else if (t < HELMET_GAG_T0 + 15.45) {
    const u = (t - (HELMET_GAG_T0 + 13.65)) / 1.8;
    xPct = lerp(20.5, 12, easeInOutQuad(clamp01((u - 0.75) / 0.25)));
    if (u < 0.75) xPct = 20.5;
    yRem = lerp(7.75, 0, easeInOutCubic(u));
    wornHelmetOpacity = 1;
    const climbPhase = u * 4.2;
    pose = {
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
    bodyRot = 0;
    if (u > 0.88) {
      pose = lerpPose(pose, walkPose(0.12, { lean: 5 }), (u - 0.88) / 0.12, easeInOutCubic);
    }
  }

  // --- Ladder vanishes; settle walk toward loop start ---
  else {
    const u = (t - (HELMET_GAG_T0 + 15.45)) / 0.95;
    xPct = lerp(12, 2, easeInOutCubic(u));
    yRem = 0;
    facing = 1;
    wornHelmetOpacity = 1;
    const phase = (1 - u) * 1.15 * cadence + 0.12;
    pose = walkPose(phase, { lean: 5, speed: cadence });
    pose.helmetOpacity = 1;
  }

  const helmet = sampleHelmetFlight(t, seed);
  const ladder = sampleLadder(t, 7.75);
  const wire = sampleWire(t);
  const hotstickActive = t >= 23.85 && t < HELMET_GAG_T0;
  if (t >= HELMET_GAG_T0 + 0.1 && t < HELMET_GAG_T0 + 8.9) {
    wornHelmetOpacity = Math.min(wornHelmetOpacity, pose.helmetOpacity ?? 0);
  }

  return {
    t,
    pose: {
      ...pose,
      helmetOpacity: wornHelmetOpacity,
    },
    world: {
      xPct,
      yRem,
      rot: bodyRot,
      facing,
    },
    helmet,
    ladder,
    wire,
    hotstickActive,
  };
}

/** Ladder: bottom at climber foot level, top flush with strip walk line. */
export function sampleLadder(t, footYRem = 7.75) {
  const span = Math.max(3.5, footYRem); // rem from feet up to walk line
  const L0 = HELMET_GAG_T0 + 13.25; // pop in just before climb call ends
  const base = {
    leftPct: 20.5,
    footYRem: span,
    heightRem: span,
    rot: 0,
    opacity: 0,
    scaleY: 0.2,
  };

  if (t < L0) return base;

  if (t < HELMET_GAG_T0 + 13.65) {
    const u = easeOutBack((t - L0) / 0.4);
    return {
      ...base,
      rot: lerp(10, 1.5, u),
      opacity: clamp01(u * 1.4),
      scaleY: lerp(0.12, 1, u),
    };
  }

  if (t < HELMET_GAG_T0 + 15.45) {
    return { ...base, rot: 1, opacity: 1, scaleY: 1 };
  }

  if (t < HELMET_GAG_T0 + 15.85) {
    const u = easeInCubic((t - (HELMET_GAG_T0 + 15.45)) / 0.4);
    return {
      ...base,
      rot: lerp(1, -6, u),
      opacity: 1 - u,
      scaleY: lerp(1, 0.2, u),
    };
  }

  return base;
}

/**
 * Snapped live wire hanging from above during volt-check (far end of strip).
 * Tip hangs near the tester so it reads as “testing that wire.”
 */
export function sampleWire(t) {
  const hidden = {
    leftPct: 96.5,
    topRem: -5.2,
    heightRem: 5.6,
    sway: 0,
    opacity: 0,
    spark: 0,
    tipDrop: 0,
  };

  // Volt window window: 12.2 – 16.5
  if (t < 12.35 || t >= 16.45) return hidden;

  // Snap in — falls from above
  if (t < 12.75) {
    const u = easeOutBack((t - 12.35) / 0.4);
    return {
      leftPct: 96.5,
      topRem: -5.2,
      heightRem: 5.6,
      sway: (1 - u) * 18,
      opacity: clamp01(u * 1.5),
      spark: 0,
      tipDrop: lerp(-2.5, 0, u),
    };
  }

  // Hang + sway while he tests; spark during zap (voltPose zap ~1.8–2.35 → t 14.0–14.55)
  if (t < 16.15) {
    const local = t - 12.75;
    const sway = Math.sin(local * 3.2) * 7 + Math.sin(local * 5.1) * 3;
    const zap = t >= 14.0 && t < 14.55;
    const zapU = zap ? (t - 14.0) / 0.55 : 0;
    return {
      leftPct: 96.5,
      topRem: -5.2,
      heightRem: 5.6,
      sway: sway + (zap ? Math.sin(zapU * Math.PI * 12) * 10 : 0),
      opacity: 1,
      spark: zap ? 0.7 + Math.sin(zapU * Math.PI * 14) * 0.3 : Math.max(0, Math.sin(local * 2) * 0.15),
      tipDrop: 0,
    };
  }

  // Yank away / vanish as he packs tester
  const u = easeInCubic((t - 16.15) / 0.3);
  return {
    leftPct: 96.5,
    topRem: -5.2,
    heightRem: 5.6,
    sway: lerp(0, -25, u),
    opacity: 1 - u,
    spark: 0,
    tipDrop: lerp(0, -1.5, u),
  };
}

export function applyPoseToJoints(joints, pose) {
  if (!joints || !pose) return;
  const set = (el, transform) => {
    if (el) el.setAttribute('transform', transform);
  };

  set(joints.pelvis, `translate(0 ${pose.pelvisY || 0}) rotate(${pose.pelvisRot || 0})`);
  set(joints.chest, `rotate(${pose.chestRot || 0})`);
  set(joints.head, `rotate(${(pose.headRot || 0) + (pose.headTilt || 0) * 0.35})`);
  set(joints.helmet, `translate(0 ${pose.helmetY || 0}) rotate(${pose.helmetRot || 0})`);
  if (joints.helmet) joints.helmet.style.opacity = String(pose.helmetOpacity ?? 1);

  set(joints.armLU, `rotate(${pose.armLU || 0})`);
  set(joints.armLL, `rotate(${pose.armLL || 0})`);
  set(joints.armRU, `rotate(${pose.armRU || 0})`);
  set(joints.armRL, `rotate(${pose.armRL || 0})`);

  set(joints.legLU, `rotate(${pose.legLU || 0})`);
  set(joints.legLL, `rotate(${pose.legLL || 0})`);
  set(joints.footL, `rotate(${pose.footL || 0})`);
  set(joints.legRU, `rotate(${pose.legRU || 0})`);
  set(joints.legRL, `rotate(${pose.legRL || 0})`);
  set(joints.footR, `rotate(${pose.footR || 0})`);

  set(joints.pouch, `translate(${3.2 + (pose.pouchX || 0)} 1) rotate(${pose.pouchRot || 0})`);

  const op = pose.propOpacity ?? 0;
  const kind = pose.propKind || (op > 0.01 ? 'volt' : 'none');
  if (joints.prop) {
    joints.prop.style.opacity = kind === 'volt' ? String(op) : '0';
  }
  if (joints.hotstick) {
    joints.hotstick.style.opacity = kind === 'hotstick' ? String(op) : '0';
  }
}

export function applyWorldToWalker(walkerEl, world) {
  if (!walkerEl || !world) return;
  const facing = world.facing >= 0 ? 1 : -1;
  walkerEl.style.left = `${world.xPct}%`;
  walkerEl.style.transform = `translateX(-50%) scaleX(${facing}) translateY(${world.yRem}rem) rotate(${world.rot || 0}deg)`;
}

export function applyHelmetWorld(el, helmet) {
  if (!el || !helmet) return;
  el.style.left = `${helmet.leftPct}%`;
  el.style.opacity = String(helmet.opacity);
  el.style.transform = `translateX(-50%) rotate(${helmet.rot}deg) scale(${helmet.scale})`;
  if (helmet.yRem < 0) {
    el.style.bottom = `${-helmet.yRem}rem`;
    el.style.top = 'auto';
  } else {
    el.style.top = `${helmet.yRem}rem`;
    el.style.bottom = 'auto';
  }
}

/** Ladder planted from feet (bottom) up to walk line (top). */
export function applyLadderWorld(el, ladder) {
  if (!el || !ladder) return;
  const h = ladder.heightRem || 7.75;
  el.style.left = `${ladder.leftPct}%`;
  el.style.top = 'auto';
  el.style.bottom = `-${h}rem`;
  el.style.height = `${h}rem`;
  el.style.opacity = String(ladder.opacity);
  el.style.transform = `translateX(-50%) rotate(${ladder.rot}deg) scaleY(${ladder.scaleY})`;
}

/** Viewport-fixed wire from above the screen down to the volt-tester tip. */
export function applyWireWorld(el, wire, tipRect) {
  if (!el || !wire) return;

  if (!wire.opacity || wire.opacity < 0.02 || !tipRect || tipRect.width === 0) {
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
    return;
  }

  const tipX = tipRect.left + tipRect.width / 2;
  // Meet the tester tip (slight inset so tip touches the probe face)
  let tipY = tipRect.top + tipRect.height * 0.35;
  // tipDrop: negative during snap-in → wire still falling toward the probe
  tipY += (wire.tipDrop || 0) * 18;

  // Origin just above the visible viewport — reads as coming from outside the device
  const topY = -12;
  const swayPx = (wire.sway || 0) * 1.35;
  const topX = tipX + swayPx;
  const dx = tipX - topX;
  const dy = Math.max(24, tipY - topY);
  const len = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dx, dy) * 180) / Math.PI;

  el.style.visibility = 'visible';
  el.style.position = 'fixed';
  el.style.zIndex = '45';
  el.style.left = `${topX}px`;
  el.style.top = `${topY}px`;
  el.style.width = '26px';
  el.style.height = `${len}px`;
  el.style.opacity = String(wire.opacity);
  el.style.transform = `translateX(-50%) rotate(${angleDeg}deg)`;
  el.style.transformOrigin = 'top center';
  el.style.margin = '0';
  el.style.pointerEvents = 'none';

  const spark = el.querySelector('.landing-nonprofit-lineman__wire-spark');
  if (spark) spark.style.opacity = String(wire.spark ?? 0);
}
