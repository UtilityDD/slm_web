import React, { useEffect, useState, useRef, useCallback } from 'react';
import envelope from '../../data/sops/envelope.json';
import { mantraAudioUrl } from '../../utils/mantraAudio';

const MUTE_KEY = 'slm_mantra_audio_muted';

/**
 * Durations from PCM samples (these wavs have a 2× fmt byteRate, so
 * header length is wrong). Cue times are speech-onset peaks.
 * SAFE HOME: letter → English → Bangla → body
 * সবাই ফিরো: letter → Bangla word → body
 */
const SAFE_PLAYLIST = [
  { phase: 'word', step: 0, file: 'safe_word.mp3', ms: 4440 },
  { phase: 'meaning', step: 0, file: 'safe_01.mp3', ms: 8280, enAt: 1360, bnAt: 2420, bodyAt: 3360 },
  { phase: 'meaning', step: 1, file: 'safe_02.mp3', ms: 9560, enAt: 1540, bnAt: 2860, bodyAt: 4260 },
  { phase: 'meaning', step: 2, file: 'safe_03.mp3', ms: 8120, enAt: 1700, bnAt: 3060, bodyAt: 4320 },
  { phase: 'meaning', step: 3, file: 'safe_04.mp3', ms: 9640, enAt: 1600, bnAt: 3180, bodyAt: 4380 },
  { phase: 'meaning', step: 4, file: 'safe_05.mp3', ms: 7720, enAt: 1620, bnAt: 3360, bodyAt: 4560 },
  { phase: 'meaning', step: 5, file: 'safe_06.mp3', ms: 7400, enAt: 1600, bnAt: 3200, bodyAt: 4400 },
  { phase: 'meaning', step: 6, file: 'safe_07.mp3', ms: 6840, enAt: 1300, bnAt: 2740, bodyAt: 3920 },
  { phase: 'meaning', step: 7, file: 'safe_08.mp3', ms: 10280, enAt: 1460, bnAt: 2720, bodyAt: 3900 },
];

const SOBAI_PLAYLIST = [
  { phase: 'word', step: 0, file: 'sobai_word.mp3', ms: 4880 },
  { phase: 'meaning', step: 0, file: 'sobai_01.mp3', ms: 7560, wordAt: 1340, bodyAt: 2620 },
  { phase: 'meaning', step: 1, file: 'sobai_02.mp3', ms: 7600, wordAt: 1040, bodyAt: 2380 },
  { phase: 'meaning', step: 2, file: 'sobai_03.mp3', ms: 4960, wordAt: 1200, bodyAt: 2480 },
  { phase: 'meaning', step: 3, file: 'sobai_04.mp3', ms: 4880, wordAt: 1120, bodyAt: 2280 },
  { phase: 'meaning', step: 4, file: 'sobai_05.mp3', ms: 5280, wordAt: 1280, bodyAt: 2800 },
  { phase: 'meaning', step: 5, file: 'sobai_06.mp3', ms: 5080, wordAt: 940, bodyAt: 1920 },
  { phase: 'meaning', step: 6, file: 'sobai_07.mp3', ms: 5680, wordAt: 1320, bodyAt: 2460 },
  { phase: 'meaning', step: 7, file: 'sobai_08.mp3', ms: 7800, wordAt: 1220, bodyAt: 2460 },
];

const PLAYLISTS = { safe: SAFE_PLAYLIST, sobai: SOBAI_PLAYLIST };
const NEXT_TRACK = { safe: 'sobai', sobai: 'safe' };

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function clipCueTimes(clip) {
  if (clip.phase !== 'meaning') return [];
  if (clip.enAt != null) return [clip.enAt, clip.bnAt, clip.bodyAt];
  return [clip.wordAt, clip.bodyAt].filter((n) => n != null);
}

function applyClipCues(clip, tMs, setTitleMode, setShowBody) {
  if (clip.phase !== 'meaning') return;
  if (clip.enAt != null) {
    if (tMs >= clip.bodyAt) {
      setTitleMode('bn');
      setShowBody(true);
    } else if (tMs >= clip.bnAt) {
      setTitleMode('bn');
      setShowBody(false);
    } else if (tMs >= clip.enAt) {
      setTitleMode('en');
      setShowBody(false);
    } else {
      setTitleMode('letter');
      setShowBody(false);
    }
    return;
  }
  if (tMs >= clip.bodyAt) {
    setTitleMode('bn');
    setShowBody(true);
  } else if (tMs >= clip.wordAt) {
    setTitleMode('bn');
    setShowBody(false);
  } else {
    setTitleMode('letter');
    setShowBody(false);
  }
}

const SAFE_ITEMS = envelope.beats.map((beat) => ({
  id: beat.id,
  letter: beat.letter,
  front: beat.word_en,
  back: beat.name_bn,
  body_bn: beat.do_bn,
  body_en: beat.do_en,
}));

const SOBAI_ITEMS = envelope.bangla_letters.map((row, i) => ({
  id: `sobai-${i}`,
  letter: row.letter,
  word: row.word,
  body_bn: row.desc_bn,
  body_en: row.desc_bn,
}));

const TRACKS = {
  safe: {
    id: 'safe',
    parts: ['SAFE', 'HOME'],
    items: SAFE_ITEMS,
    flipEnBn: true,
    ctaBn: 'পুরো SAFE HOME →',
    ctaEn: 'Full SAFE HOME →',
  },
  sobai: {
    id: 'sobai',
    parts: ['সবাই', 'ফিরো'],
    partsBn: true,
    items: SOBAI_ITEMS,
    flipEnBn: false,
    ctaBn: 'পুরো সবাই ফিরো →',
    ctaEn: 'Full সবাই ফিরো →',
  },
};

/**
 * Alternating loop: SAFE HOME → সবাই ফিরো → SAFE HOME …
 * Both tracks follow wav `ended` + speech cues.
 */
export default function SafeHomeLiveCard({
  language = 'bn',
  onOpenSafeHome = null,
  onOpenSobai = null,
}) {
  const bn = language === 'bn';
  const [trackId, setTrackId] = useState('safe');
  const [phase, setPhase] = useState('word');
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const [titleMode, setTitleMode] = useState('en');
  const [showBody, setShowBody] = useState(false);
  const [muted, setMuted] = useState(readMuted);
  const audioRef = useRef(null);
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const track = TRACKS[trackId];
  const items = track.items;

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    try {
      audio.load();
    } catch {
      /* noop */
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {
        /* noop */
      }
      if (next) stopAudio();
      return next;
    });
  }, [stopAudio]);

  const pickTrack = useCallback((id) => {
    if (id === trackId) {
      setRun((r) => r + 1);
      return;
    }
    setTrackId(id);
    setRun((r) => r + 1);
  }, [trackId]);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  }, []);

  useEffect(() => {
    if (reduced) {
      setPhase('meaning');
      setStep(items.length - 1);
      setTitleMode('bn');
      setShowBody(true);
      return undefined;
    }

    let cancelled = false;
    const timers = [];
    const later = (ms, fn) => {
      const id = window.setTimeout(fn, ms);
      timers.push(id);
      return id;
    };

    const audio = ensureAudio();
    let onTime = null;
    let onEnded = null;
    let onPlaying = null;

    const detach = () => {
      if (onTime) audio.removeEventListener('timeupdate', onTime);
      if (onEnded) audio.removeEventListener('ended', onEnded);
      if (onPlaying) audio.removeEventListener('playing', onPlaying);
      onTime = null;
      onEnded = null;
      onPlaying = null;
    };

    const playlist = PLAYLISTS[trackId];

    const startClip = (index) => {
      if (cancelled) return;
      detach();
      timers.splice(0).forEach((id) => window.clearTimeout(id));

      const clip = playlist[index];
      if (!clip) {
        setTrackId(NEXT_TRACK[trackId]);
        setRun((r) => r + 1);
        return;
      }

      setPhase(clip.phase === 'word' ? 'word' : 'meaning');
      setStep(clip.step);
      setTitleMode(clip.phase === 'meaning' ? 'letter' : 'en');
      setShowBody(false);

      let advanced = false;
      const goNext = () => {
        if (cancelled || advanced) return;
        advanced = true;
        startClip(index + 1);
      };

      const armCues = () => {
        clipCueTimes(clip).forEach((t) => {
          later(t, () => applyClipCues(clip, t, setTitleMode, setShowBody));
        });
      };

      if (muted) {
        armCues();
        later(clip.ms, goNext);
        return;
      }

      audio.pause();
      audio.src = mantraAudioUrl(clip.file);
      audio.currentTime = 0;

      onTime = () => applyClipCues(clip, audio.currentTime * 1000, setTitleMode, setShowBody);
      onEnded = () => {
        detach();
        goNext();
      };
      onPlaying = () => {
        later(clip.ms + 1200, () => {
          if (!cancelled) goNext();
        });
      };
      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('playing', onPlaying);

      const play = audio.play();
      if (play && typeof play.catch === 'function') {
        play.catch(() => {
          if (cancelled) return;
          armCues();
          later(clip.ms, goNext);
        });
      }
    };

    startClip(0);

    return () => {
      cancelled = true;
      detach();
      timers.forEach((id) => window.clearTimeout(id));
      audio.pause();
    };
  }, [trackId, run, muted, reduced, ensureAudio, items.length]);

  useEffect(
    () => () => {
      stopAudio();
      audioRef.current = null;
    },
    [stopAudio]
  );

  const active = phase === 'meaning' ? items[step] : null;
  const meaningBody = active ? (bn ? active.body_bn : active.body_en) : '';
  const showEn = titleMode === 'en' || titleMode === 'bn';
  const showBn = titleMode === 'bn';
  const showSobaiWord = !track.flipEnBn && titleMode !== 'letter';

  const onOpen =
    trackId === 'safe'
      ? onOpenSafeHome
      : typeof onOpenSobai === 'function'
        ? onOpenSobai
        : onOpenSafeHome;

  return (
    <section
      className={`sop-safe-live ${phase === 'word' ? 'sop-safe-live--word' : ''} ${
        phase === 'meaning' ? 'sop-safe-live--meaning' : ''
      } ${trackId === 'sobai' ? 'sop-safe-live--sobai' : ''}`}
      aria-live="polite"
    >
      <div className="sop-safe-live__head">
        <div className="sop-safe-live__tracks" role="tablist" aria-label={bn ? 'মন্ত্র' : 'Mantra'}>
          <button
            type="button"
            role="tab"
            className={`sop-safe-live__track ${trackId === 'safe' ? 'sop-safe-live__track--on' : ''}`}
            aria-selected={trackId === 'safe'}
            onClick={() => pickTrack('safe')}
          >
            SAFE HOME
          </button>
          <button
            type="button"
            role="tab"
            className={`sop-safe-live__track ${trackId === 'sobai' ? 'sop-safe-live__track--on' : ''} font-bengali`}
            aria-selected={trackId === 'sobai'}
            onClick={() => pickTrack('sobai')}
          >
            সবাই ফিরো
          </button>
        </div>
        <button
          type="button"
          className={`sop-safe-live__mute ${muted ? 'sop-safe-live__mute--on' : ''}`}
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? (bn ? 'আওয়াজ চালু' : 'Unmute') : bn ? 'নিঃশব্দ' : 'Mute'}
          title={muted ? (bn ? 'আওয়াজ চালু' : 'Unmute') : bn ? 'নিঃশব্দ' : 'Mute'}
        >
        {muted ? (
          <svg viewBox="0 0 24 24" className="sop-safe-live__mute-icon" aria-hidden>
            <path
              fill="currentColor"
              d="M16.5 12a4.5 4.5 0 0 0-2.25-3.89v2.16l2.2 2.2c.03-.15.05-.31.05-.47zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="sop-safe-live__mute-icon" aria-hidden>
            <path
              fill="currentColor"
              d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14.25 8.1v7.8A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
            />
          </svg>
        )}
        <span className={`sop-safe-live__mute-label ${bn ? 'font-bengali' : ''}`}>
          {muted ? (bn ? 'বন্ধ' : 'Off') : bn ? 'চালু' : 'On'}
        </span>
      </button>
      </div>

      <div className="sop-safe-live__stage">
        <div className="sop-safe-live__word" aria-hidden={phase !== 'word'}>
          <span className={`sop-safe-live__word-part ${track.partsBn ? 'font-bengali' : ''}`}>
            {track.parts[0]}
          </span>
          <span className="sop-safe-live__word-gap" />
          <span className={`sop-safe-live__word-part ${track.partsBn ? 'font-bengali' : ''}`}>
            {track.parts[1]}
          </span>
        </div>

        <div className="sop-safe-live__letters" aria-hidden={phase !== 'meaning'}>
          {items.map((item, i) => (
            <span
              key={item.id}
              className={`sop-safe-live__letter ${track.partsBn ? 'font-bengali' : ''} ${
                phase === 'meaning' && i === step ? 'sop-safe-live__letter--on' : ''
              } ${phase === 'meaning' && i < step ? 'sop-safe-live__letter--done' : ''}`}
              style={{ '--i': i }}
            >
              {item.letter}
            </span>
          ))}
        </div>
      </div>

      <div className="sop-safe-live__meaning" aria-hidden={phase !== 'meaning'}>
        {active ? (
          <div key={`${trackId}-${active.id}`} className="sop-safe-live__pair">
            <div className="sop-safe-live__pair-row">
              <span className={`sop-safe-live__meaning-letter ${track.partsBn ? 'font-bengali' : ''}`}>
                {active.letter}
              </span>

              {track.flipEnBn ? (
                showEn ? (
                  <div
                    className={`sop-safe-pairwords ${showBn ? 'sop-safe-pairwords--bn' : ''}`}
                    aria-label={`${active.letter}: ${active.front} → ${active.back}`}
                  >
                    <span className="sop-safe-pairwords__en">{active.front}</span>
                    {showBn ? (
                      <>
                        <span className="sop-safe-pairwords__sep" aria-hidden>
                          →
                        </span>
                        <span className="sop-safe-pairwords__bn font-bengali">{active.back}</span>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="sop-safe-pairwords" aria-hidden />
                )
              ) : showSobaiWord ? (
                <div className="sop-safe-wordcard" aria-label={`${active.letter}: ${active.word}`}>
                  <span className="sop-safe-wordcard__word font-bengali">{active.word}</span>
                </div>
              ) : (
                <div className="sop-safe-wordcard" aria-hidden />
              )}
            </div>
            {showBody ? (
              <p className={`sop-safe-live__meaning-body ${bn ? 'font-bengali' : ''}`}>
                {meaningBody}
              </p>
            ) : (
              <p className="sop-safe-live__meaning-body" aria-hidden>
                {'\u00a0'}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {typeof onOpen === 'function' ? (
        <button
          type="button"
          className={`sop-safe-live__cta ${bn ? 'font-bengali' : ''}`}
          onClick={onOpen}
        >
          {bn ? track.ctaBn : track.ctaEn}
        </button>
      ) : null}
    </section>
  );
}
