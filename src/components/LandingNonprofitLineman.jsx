import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  LINEMAN_CYCLE_MS,
  sampleLinemanScene,
  applyPoseToJoints,
  applyWorldToWalker,
  applyHelmetWorld,
  applyLadderWorld,
  applyWireWorld,
} from '../utils/linemanSkeletonAnim';

function HelmetMark({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 28 18"
      width="28"
      height="18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 10c0-5.2 3.8-9 10-9s10 3.8 10 9v2.2H4V10Z"
        fill="#f97316"
        stroke="#0f172a"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M2.5 12.2h23" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="21.5" cy="9" r="1.4" fill="#fbbf24" stroke="#0f172a" strokeWidth="0.8" />
    </svg>
  );
}

function LadderMark({ className = '' }) {
  const rungs = [10, 20, 30, 40, 50, 60, 70];
  return (
    <svg
      className={className}
      viewBox="0 0 22 84"
      width="22"
      height="84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <line x1="3.5" y1="2" x2="3.5" y2="82" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="18.5" y1="2" x2="18.5" y2="82" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
      {rungs.map((y) => (
        <line
          key={y}
          x1="3.5"
          y1={y}
          x2="18.5"
          y2={y}
          stroke="#0f172a"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** Snapped overhead conductor hanging down to be tested. */
function WireMark({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 90"
      width="24"
      height="90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {/* Broken stump at top */}
      <path d="M10 0h4v3H10z" fill="#0f172a" />
      <path
        d="M12 3c-1.2 8-4 14-2.5 22 1.2 7 4.5 12 2 20-1.8 6-4 10-1.5 16 1.5 4 3.5 8 2 14"
        stroke="#0f172a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Frayed tip */}
      <path d="M12.2 75l-2.2 6M12.2 75l2.5 5.5M12.2 75l.2 7" stroke="#0f172a" strokeWidth="1.3" strokeLinecap="round" />
      <circle className="landing-nonprofit-lineman__wire-spark" cx="12" cy="82" r="2.4" fill="#fbbf24" stroke="#0f172a" strokeWidth="0.8" opacity="0" />
    </svg>
  );
}

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
  'testerTip',
];

/**
 * Ambient stick-figure lineman on the nonprofit strip top border.
 * Same gag story — skeletal rAF acting (walk, idle, helmet, fall, recover).
 */
export default function LandingNonprofitLineman({ active = true }) {
  const rootRef = useRef(null);
  const walkerRef = useRef(null);
  const capFlyRef = useRef(null);
  const ladderRef = useRef(null);
  const wireRef = useRef(null);
  const jointsRef = useRef({});

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
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !active) return undefined;

    const joints = jointsRef.current;
    const walker = walkerRef.current;
    const cap = capFlyRef.current;
    const ladder = ladderRef.current;
    const wire = wireRef.current;
    const root = rootRef.current;
    if (!walker || !cap || !ladder || !wire) return undefined;

    let raf = 0;
    let running = true;
    let visible = true;
    const start = performance.now();
    let cycleIndex = 0;
    let lastCycle = 0;

    const boot = sampleLinemanScene(0, 0);
    applyPoseToJoints(joints, boot.pose);
    applyWorldToWalker(walker, boot.world);
    applyHelmetWorld(cap, boot.helmet);
    applyLadderWorld(ladder, boot.ladder);
    applyWireWorld(wire, boot.wire, null);

    const tipRectForWire = () => {
      const tip = joints.testerTip;
      if (!tip) return null;
      const r = tip.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      return r;
    };

    const tick = (now) => {
      if (!running) return;
      if (visible) {
        const elapsed = now - start;
        const cycle = Math.floor(elapsed / LINEMAN_CYCLE_MS);
        if (cycle !== lastCycle) {
          lastCycle = cycle;
          cycleIndex = cycle;
        }
        const scene = sampleLinemanScene(elapsed, cycleIndex);
        applyPoseToJoints(joints, scene.pose);
        applyWorldToWalker(walker, scene.world);
        applyHelmetWorld(cap, scene.helmet);
        applyLadderWorld(ladder, scene.ladder);
        // After joints update so tester tip screen position is current
        applyWireWorld(wire, scene.wire, tipRectForWire());
        const joinBtn = document.querySelector('.landing-join-cta');
        if (joinBtn) {
          joinBtn.classList.toggle('landing-join-cta--hotstick', !!scene.hotstickActive);
        }
      } else {
        applyWireWorld(wire, { opacity: 0 }, null);
        document.querySelector('.landing-join-cta')?.classList.remove('landing-join-cta--hotstick');
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    let io;
    if (typeof IntersectionObserver !== 'undefined' && root) {
      io = new IntersectionObserver(
        ([entry]) => {
          visible = Boolean(entry?.isIntersecting);
          if (visible) {
            walker.style.willChange = 'left, transform';
            cap.style.willChange = 'left, top, bottom, transform, opacity';
            ladder.style.willChange = 'left, bottom, transform, opacity';
            wire.style.willChange = 'left, top, transform, opacity';
          } else {
            walker.style.willChange = 'auto';
            cap.style.willChange = 'auto';
            ladder.style.willChange = 'auto';
            wire.style.willChange = 'auto';
          }
        },
        { root: null, threshold: 0.05 }
      );
      io.observe(root);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.querySelector('.landing-join-cta')?.classList.remove('landing-join-cta--hotstick');
    };
  }, [active]);

  return (
    <div ref={rootRef} className="landing-nonprofit-lineman" aria-hidden="true">
      <div ref={capFlyRef} className="landing-nonprofit-lineman__cap-fly">
        <HelmetMark className="landing-nonprofit-lineman__cap-fly-svg" />
      </div>

      <div ref={ladderRef} className="landing-nonprofit-lineman__ladder">
        <LadderMark className="landing-nonprofit-lineman__ladder-svg" />
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <div ref={wireRef} className="landing-nonprofit-lineman__wire" aria-hidden="true">
            <WireMark className="landing-nonprofit-lineman__wire-svg" />
          </div>,
          document.body
        )}

      <div ref={walkerRef} className="landing-nonprofit-lineman__walker">
        <svg
          className="landing-nonprofit-lineman__svg"
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
                        {/* Tiny volt tester — shown only during volt-check beat */}
                        <g ref={jointBinders.prop} opacity="0">
                          <line
                            x1="0.3"
                            y1="6.5"
                            x2="0.5"
                            y2="12.2"
                            className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__volt"
                          />
                          <circle
                            ref={jointBinders.testerTip}
                            cx="0.55"
                            cy="12.6"
                            r="1.1"
                            fill="#f97316"
                            stroke="#0f172a"
                            strokeWidth="0.9"
                          />
                        </g>
                        {/* Hotstick — helmet orange; Join CTA beat before helmet gag */}
                        <g ref={jointBinders.hotstick} opacity="0">
                          <line
                            x1="0.25"
                            y1="6.2"
                            x2="0.45"
                            y2="24.5"
                            className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__hotstick"
                          />
                          <path
                            d="M0.45 24.5 L2.6 26.4"
                            className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__hotstick"
                          />
                          <circle
                            cx="2.85"
                            cy="26.7"
                            r="1.15"
                            fill="#f97316"
                            stroke="#0f172a"
                            strokeWidth="0.85"
                          />
                        </g>
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
  );
}
