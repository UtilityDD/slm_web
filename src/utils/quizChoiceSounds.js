/** Short Web Audio ticks for quiz option taps. Tap is already a user gesture. */

let sharedCtx = null;

function getAudioContext() {
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedCtx || sharedCtx.state === 'closed') {
        sharedCtx = new Ctx();
    }
    if (sharedCtx.state === 'suspended') {
        void sharedCtx.resume();
    }
    return sharedCtx;
}

function prefersSofter() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scheduleTone(ctx, master, delaySec, freqHz, durSec, type, peak = 1) {
    const t0 = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqHz, t0);
    osc.connect(g);
    g.connect(master);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + durSec);
    osc.start(t0);
    osc.stop(t0 + durSec + 0.02);
}

function scheduleNoise(ctx, master, delaySec, durSec, volume = 0.1) {
    const t0 = ctx.currentTime + delaySec;
    const len = Math.max(1, Math.floor(ctx.sampleRate * durSec));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(volume, t0 + 0.018);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + durSec);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + durSec + 0.02);
}

/** Soft rising two-note tick on a correct pick. */
export function playQuizCorrectSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const master = ctx.createGain();
        master.gain.value = prefersSofter() ? 0.07 : 0.16;
        master.connect(ctx.destination);
        scheduleTone(ctx, master, 0, 880, 0.07, 'triangle');
        scheduleTone(ctx, master, 0.07, 1320, 0.16, 'sine');
    } catch {
        /* ignore */
    }
}

/** Descending buzz on a wrong pick. */
export function playQuizWrongSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const master = ctx.createGain();
        master.gain.value = prefersSofter() ? 0.08 : 0.18;
        master.connect(ctx.destination);
        scheduleTone(ctx, master, 0, 280, 0.12, 'square');
        scheduleTone(ctx, master, 0.1, 196, 0.22, 'sawtooth');
    } catch {
        /* ignore */
    }
}

export function playQuizChoiceSound(correct) {
    if (correct) playQuizCorrectSound();
    else playQuizWrongSound();
}

/**
 * Winning fanfare for the Home gift open.
 * Call on the tap so AudioContext unlocks; notes are timed to lid (~220ms) then score burst (~500ms).
 */
export function playGiftWinSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const master = ctx.createGain();
        master.gain.value = prefersSofter() ? 0.08 : 0.2;
        master.connect(ctx.destination);

        // Lid lifts
        scheduleTone(ctx, master, 0.2, 784, 0.16, 'sine', 0.45);
        scheduleTone(ctx, master, 0.28, 988, 0.18, 'triangle', 0.55);

        // Scores fly — box thump + sparkle whoosh
        scheduleTone(ctx, master, 0.48, 130.81, 0.24, 'sine', 0.7);
        scheduleTone(ctx, master, 0.48, 196, 0.2, 'triangle', 0.4);
        scheduleNoise(ctx, master, 0.5, 0.2, prefersSofter() ? 0.04 : 0.09);

        const sparkle = [
            [0.5, 523.25, 0.22, 'triangle', 0.85],
            [0.55, 659.25, 0.22, 'triangle', 0.8],
            [0.6, 783.99, 0.24, 'sine', 0.75],
            [0.66, 1046.5, 0.28, 'sine', 0.7],
            [0.73, 1318.51, 0.26, 'triangle', 0.55],
            [0.82, 1568, 0.3, 'sine', 0.4],
            [0.94, 1975.53, 0.22, 'sine', 0.28],
        ];
        sparkle.forEach(([delay, freq, dur, type, peak]) => {
            scheduleTone(ctx, master, delay, freq, dur, type, peak);
        });

        // Warm resolve as chips keep flying
        scheduleTone(ctx, master, 0.72, 523.25, 0.42, 'sine', 0.35);
        scheduleTone(ctx, master, 0.74, 659.25, 0.42, 'sine', 0.32);
        scheduleTone(ctx, master, 0.76, 783.99, 0.46, 'sine', 0.3);
        scheduleTone(ctx, master, 0.78, 1046.5, 0.4, 'triangle', 0.22);
    } catch {
        /* ignore */
    }
}

/** Sweet balloon pop — call on the tap so AudioContext unlocks. */
export function playBalloonBurstSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const master = ctx.createGain();
        master.gain.value = prefersSofter() ? 0.07 : 0.17;
        master.connect(ctx.destination);
        scheduleNoise(ctx, master, 0, 0.12, prefersSofter() ? 0.035 : 0.08);
        scheduleTone(ctx, master, 0, 392, 0.08, 'sine', 0.35);
        scheduleTone(ctx, master, 0.04, 784, 0.1, 'triangle', 0.7);
        scheduleTone(ctx, master, 0.1, 1174.66, 0.16, 'sine', 0.55);
        scheduleTone(ctx, master, 0.16, 1568, 0.22, 'sine', 0.35);
        scheduleTone(ctx, master, 0.22, 2093, 0.18, 'triangle', 0.2);
    } catch {
        /* ignore */
    }
}
