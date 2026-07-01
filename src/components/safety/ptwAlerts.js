/**
 * Alert sounds for online PTW (operator beep, lineman success chime).
 */

let audioCtx = null;

function getCtx() {
    if (!audioCtx && typeof window !== 'undefined') {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { /* noop */ }
    }
    return audioCtx;
}

function tone(freq, durationMs, type = 'sine', gain = 0.35) {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000);
    osc.start(t);
    osc.stop(t + durationMs / 1000 + 0.05);
}

/** Loud repeating beep for operator new request */
export function playOperatorAlertBeeps(repeats = 4) {
    for (let i = 0; i < repeats; i++) {
        window.setTimeout(() => {
            tone(880, 180, 'square', 0.45);
            window.setTimeout(() => tone(660, 180, 'square', 0.45), 220);
        }, i * 700);
    }
    try {
        if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    } catch (e) { /* noop */ }
}

/** Pleasant success chime for lineman shutdown confirmed */
export function playShutdownConfirmedChime() {
    tone(523, 120, 'sine', 0.3);
    window.setTimeout(() => tone(659, 120, 'sine', 0.3), 130);
    window.setTimeout(() => tone(784, 200, 'sine', 0.35), 260);
    try {
        if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    } catch (e) { /* noop */ }
}
