import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLifeSkillRadio } from '../context/LifeSkillRadioContext';
import { OnAirIndicator, RadioEqualizer, SignalStrength } from './radio/RadioAtmosphere';

/** Same resource whether playlist has `/audio/x` and element reports absolute URL. */
function supplementaryAudioResourceKey(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    if (typeof window === 'undefined') return trimmed.split('?')[0];
    const u = new URL(trimmed, window.location.href);
    return `${u.origin}${u.pathname}`.split('?')[0];
  } catch {
    return trimmed.split('?')[0];
  }
}

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function RadioExpandedSheet({ language, title, track, audioRef, onMinimize, togglePlay, playing }) {
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onMinimize();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onMinimize]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return undefined;
    const onTime = () => {
      setCurrent(a.currentTime || 0);
      const d = a.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    };
    const onMeta = () => {
      const d = a.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    onTime();
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
    };
  }, [audioRef]);

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const rem = Math.max(0, duration - current);

  const t = {
    brand: language === 'bn' ? 'SLM রেডিও' : 'SLM Radio',
    play: language === 'bn' ? 'চালু' : 'Play',
    pause: language === 'bn' ? 'থামান' : 'Pause',
    minimize: language === 'bn' ? 'ছোট করুন' : 'Minimize',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex flex-col bg-zinc-950/98 backdrop-blur-xl animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="radio-expanded-title"
    >
      <header className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">{t.brand}</p>
        <button
          type="button"
          onClick={onMinimize}
          className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label={t.minimize}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-zinc-900/90 p-6 shadow-2xl sm:max-w-md sm:p-8">
          <h2
            id="radio-expanded-title"
            className={`text-center text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl ${language === 'bn' ? 'font-bengali' : ''}`}
          >
            {track?.type === 'startup_bed' ? (
              <span className="text-sky-400 animate-pulse">{language === 'bn' ? 'সংযোগ…' : 'Tuning in…'}</span>
            ) : track?.type === 'intro_music' ? (
              <span className="text-violet-400">{language === 'bn' ? 'পরিচিতি…' : 'Program intro…'}</span>
            ) : track?.type === 'transition' || track?.type === 'welcome' || track?.type === 'safety' || track?.type === 'encouragement' ? (
              <span
                className={
                  track.type === 'safety'
                    ? 'text-amber-500'
                    : track.type === 'encouragement'
                      ? 'text-emerald-500'
                      : 'text-orange-500 animate-pulse'
                }
              >
                {track.type === 'welcome'
                  ? language === 'bn'
                    ? 'স্বাগতম…'
                    : 'Welcome…'
                  : track.type === 'safety'
                    ? language === 'bn'
                      ? 'সুরক্ষা বার্তা…'
                      : 'Safety Alert…'
                    : track.type === 'encouragement'
                      ? language === 'bn'
                        ? 'অনুপ্রেরণা…'
                        : 'Inspiration…'
                      : language === 'bn'
                        ? 'সংকেত…'
                        : 'Station signal…'}
              </span>
            ) : (
              title
            )}
          </h2>

          <div className="mt-4 flex items-center justify-center gap-6">
            <OnAirIndicator active={playing || track?.type === 'startup_bed'} language={language} />
            <RadioEqualizer
              active={playing || track?.type === 'startup_bed'}
              colorClass={
                track?.type === 'startup_bed'
                  ? 'bg-sky-500'
                  : track?.type === 'intro_music'
                    ? 'bg-violet-500'
                    : track?.type === 'safety'
                      ? 'bg-amber-500'
                      : track?.type === 'encouragement'
                        ? 'bg-emerald-500'
                        : 'bg-orange-500'
              }
            />
            <SignalStrength strength={track?.type === 'startup_bed' ? 2 : 4} />
          </div>

          <div className="mt-8 flex justify-center sm:mt-10">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? t.pause : t.play}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-500 active:scale-[0.98] sm:h-[4.5rem] sm:w-[4.5rem]"
            >
              {playing ? (
                <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="ml-0.5 h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-8 border-t border-white/[0.06] pt-6" aria-live="polite">
            <div className="relative h-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-[width] duration-150 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-4 flex items-baseline justify-between gap-4 font-mono tabular-nums">
              <span className="text-sm text-zinc-500 sm:text-base">{formatTime(current)}</span>
              <span className="text-lg font-medium text-zinc-200 sm:text-xl">{formatTime(rem)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onMinimize}
            className="mt-8 flex h-12 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-800/80 text-zinc-200 transition hover:bg-zinc-800 hover:text-white sm:mt-10"
          >
            <span className={`text-sm font-bold ${language === 'bn' ? 'font-bengali' : ''}`}>{t.minimize}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function RadioMiniPlayer({ language, currentView }) {
  const hideChrome = currentView === 'community' || currentView === 'sops';
  const {
    audioRef,
    bgAudioRef,
    visible,
    expanded,
    setExpanded,
    playing,
    setPlaying,
    loading,
    error,
    tracks,
    index,
    currentTrack,
    dismiss,
    togglePlay,
    nextTrack,
    clearError,
    startRadio,
  } = useLifeSkillRadio();

  const lastAutoplaySigRef = useRef('');
  const tracksRef = useRef(tracks);
  const indexRef = useRef(index);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  /** Phase A: bed only — ramp carrier, then advance playlist. */
  useEffect(() => {
    if (!visible || !tracks.length) return undefined;
    const tr = tracks[index];
    const bg = bgAudioRef?.current;
    if (!bg || tr?.type !== 'startup_bed') return undefined;

    const dur = typeof tr.durationMs === 'number' && tr.durationMs > 0 ? tr.durationMs : 2800;
    if (bg.paused) bg.play().catch(() => {});

    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const from = 0.035;
    const to = 0.22;
    const iv = window.setInterval(() => {
      const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
      const p = Math.min(1, elapsed / dur);
      bg.volume = from + (to - from) * p;
      if (p >= 1) window.clearInterval(iv);
    }, 48);

    const timer = window.setTimeout(() => {
      window.clearInterval(iv);
      nextTrack();
    }, dur);

    return () => {
      window.clearInterval(iv);
      window.clearTimeout(timer);
    };
  }, [visible, tracks, index, nextTrack, bgAudioRef]);

  useEffect(() => {
    if (!visible) {
      lastAutoplaySigRef.current = '';
      return undefined;
    }
    if (!tracks.length) return undefined;
    const t = tracks[index];
    const a = audioRef.current;
    if (!a) return undefined;
    if (t?.type === 'startup_bed') {
      a.pause();
      a.removeAttribute('src');
      return undefined;
    }
    if (!t?.src) return undefined;

    const want = t.src;
    const keyWant = supplementaryAudioResourceKey(want);
    const cur = a.currentSrc || a.src || '';
    const keyCur = supplementaryAudioResourceKey(cur);

    let srcChanged = false;
    try {
      if (keyCur !== keyWant) {
        a.src = want;
        srcChanged = true;
      }
    } catch {
      a.src = want;
      srcChanged = true;
    }

    const sig = `${index}|${keyWant}`;
    const prevSig = lastAutoplaySigRef.current;
    const shouldAutoplay = srcChanged || prevSig !== sig;
    lastAutoplaySigRef.current = sig;

    if (shouldAutoplay) {
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => setPlaying(false));
      }
    }
    return undefined;
  }, [visible, tracks, index, audioRef, setPlaying]);

  const onEnded = useCallback(() => {
    nextTrack();
  }, [nextTrack]);

  const onMainAudioError = useCallback(() => {
    const tr = tracksRef.current[indexRef.current];
    if (tr?.type === 'intro_music') nextTrack();
  }, [nextTrack]);

  const t = {
    brand: language === 'bn' ? 'SLM রেডিও' : 'SLM Radio',
    next: language === 'bn' ? 'পরের ট্র্যাক' : 'Next',
    close: language === 'bn' ? 'বন্ধ' : 'Close',
    ok: language === 'bn' ? 'ঠিক আছে' : 'OK',
    launch: language === 'bn' ? 'SLM রেডিও চালু করুন' : 'Start SLM Radio',
  };

  const dock = (
    <>
      <audio
        ref={audioRef}
        className="hidden"
        playsInline
        preload="metadata"
        onEnded={onEnded}
        onError={onMainAudioError}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {error && !visible && !hideChrome ? (
        <div className="fixed bottom-24 left-0 right-0 z-[140] flex justify-center px-4 md:bottom-10">
          <div className="flex max-w-sm items-center gap-3 rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 shadow-lg dark:border-rose-900/50 dark:bg-rose-950/90 dark:text-rose-100">
            <span className={`min-w-0 flex-1 ${language === 'bn' ? 'font-bengali' : ''}`}>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
            >
              {t.ok}
            </button>
          </div>
        </div>
      ) : null}

      {!hideChrome && !visible && !loading ? (
        <button
          type="button"
          onClick={() => startRadio()}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-[max(0.75rem,env(safe-area-inset-right))] z-[104] flex h-16 w-16 items-center justify-center bg-transparent p-0 active:scale-95 transition-transform md:hidden"
          aria-label={t.launch}
          title={t.launch}
        >
          <span className="radio-fab-3d relative inline-flex items-center justify-center">
            <span className="radio-fab-ground-shadow" aria-hidden />
            <svg
              className="relative h-12 w-12"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="slmRadioFabBody" x1="8" y1="14" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fdba74" />
                  <stop offset="0.45" stopColor="#f97316" />
                  <stop offset="1" stopColor="#c2410c" />
                </linearGradient>
                <linearGradient id="slmRadioFabFace" x1="12" y1="20" x2="28" y2="34" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fff7ed" />
                  <stop offset="1" stopColor="#ffedd5" />
                </linearGradient>
                <filter id="slmRadioFabDepth" x="-30%" y="-30%" width="160%" height="170%">
                  <feDropShadow dx="0" dy="5" stdDeviation="3" floodColor="#9a3412" floodOpacity="0.4" />
                  <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodColor="#fed7aa" floodOpacity="0.55" />
                </filter>
              </defs>
              {/* antenna */}
              <path d="M30 18.5 38 8.5" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="38.5" cy="7.5" r="2.4" fill="#f97316" stroke="#0f172a" strokeWidth="1.2" />
              {/* body */}
              <g filter="url(#slmRadioFabDepth)">
                <rect x="6" y="16" width="32" height="22" rx="5" fill="url(#slmRadioFabBody)" stroke="#9a3412" strokeWidth="1.2" />
                <rect x="9.5" y="19.5" width="14" height="15" rx="2.5" fill="url(#slmRadioFabFace)" stroke="#fdba74" strokeWidth="0.8" />
                <circle cx="31" cy="27" r="6.2" fill="#fff7ed" stroke="#9a3412" strokeWidth="1.1" />
                <circle cx="31" cy="27" r="3.4" fill="#fb923c" stroke="#c2410c" strokeWidth="0.9" />
                <circle cx="31" cy="27" r="1.2" fill="#9a3412" />
                <path d="M11.5 23.5h9M11.5 27h6.5M11.5 30.5h8" stroke="#ea580c" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
              </g>
            </svg>
          </span>
        </button>
      ) : null}

      {visible && currentTrack && !hideChrome ? (
        <>
          {expanded ? (
            <RadioExpandedSheet
              language={language}
              title={currentTrack.title}
              track={currentTrack}
              audioRef={audioRef}
              onMinimize={() => setExpanded(false)}
              togglePlay={togglePlay}
              playing={playing}
            />
          ) : null}

          <div
            className={`fixed z-[130] border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-slate-700/90 dark:bg-slate-950/95
              bottom-16 left-0 right-0 rounded-t-2xl md:bottom-6 md:left-auto md:right-6 md:w-full md:max-w-md md:rounded-2xl md:border md:border-slate-200/80 md:shadow-2xl dark:md:border-slate-700/80
              ${expanded ? 'pointer-events-none invisible' : ''}`}
            aria-hidden={expanded}
          >
            <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-2 px-[max(0.75rem,env(safe-area-inset-left))] py-2.5 pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4 md:max-w-none md:px-4 md:py-2.5">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="min-w-0 flex-1 text-left active:opacity-80 pr-2"
                aria-label={t.brand}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    {t.brand}
                  </p>
                  <div className="h-1 w-1 rounded-full bg-zinc-400" />
                  <RadioEqualizer
                    active={playing || currentTrack.type === 'startup_bed'}
                    colorClass={
                      currentTrack.type === 'startup_bed'
                        ? 'bg-sky-500'
                        : currentTrack.type === 'intro_music'
                          ? 'bg-violet-500'
                          : currentTrack.type === 'safety'
                            ? 'bg-amber-500'
                            : currentTrack.type === 'encouragement'
                              ? 'bg-emerald-500'
                              : 'bg-orange-500'
                    }
                  />
                </div>
                <p
                  className={`truncate text-sm font-semibold text-slate-900 dark:text-slate-100 ${language === 'bn' ? 'font-bengali' : ''}`}
                >
                  {currentTrack.type === 'startup_bed'
                    ? language === 'bn'
                      ? 'সংযোগ…'
                      : 'Tuning in…'
                    : currentTrack.type === 'intro_music'
                      ? language === 'bn'
                        ? 'পরিচিতি…'
                        : 'Intro…'
                      : currentTrack.type === 'transition' ||
                          currentTrack.type === 'welcome' ||
                          currentTrack.type === 'safety' ||
                          currentTrack.type === 'encouragement'
                        ? currentTrack.type === 'welcome'
                          ? language === 'bn'
                            ? 'স্বাগতম…'
                            : 'Welcome…'
                          : currentTrack.type === 'safety'
                            ? language === 'bn'
                              ? 'সুরক্ষা…'
                              : 'Safety…'
                            : currentTrack.type === 'encouragement'
                              ? language === 'bn'
                                ? 'অনুপ্রেরণা…'
                                : 'Inspiration…'
                              : language === 'bn'
                                ? 'সংকেত…'
                                : 'Signal…'
                        : currentTrack.title}
                </p>
              </button>

              <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-900/20 transition active:scale-95 hover:bg-indigo-500"
                  aria-label={playing ? (language === 'bn' ? 'থামান' : 'Pause') : language === 'bn' ? 'চালু' : 'Play'}
                >
                  {playing ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {tracks.length > 1 ? (
                  <button
                    type="button"
                    onClick={nextTrack}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    aria-label={t.next}
                    title={t.next}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M6 18l8.5-6L6 6v12zm10 0V6h2v12h-2z" />
                    </svg>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={dismiss}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label={t.close}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {!hideChrome && loading ? (
        <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[135] flex justify-center px-4 md:bottom-24 md:justify-end md:pr-8">
          <p className="rounded-full bg-slate-900/90 px-4 py-2 text-xs font-bold text-white shadow-lg">
            {language === 'bn' ? 'লোড হচ্ছে…' : 'Loading…'}
          </p>
        </div>
      ) : null}
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(dock, document.body);
}
