import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { pickSupplementaryListenSrc } from '../utils/supplementaryAudioUrl';

const LifeSkillRadioContext = createContext(null);

// Audio Assets
const BG_MUSIC_URL = '/audio/radio_bg.mp3';
const TRANSITION_URL = '/audio/radio_transition.mp3';
const FALLBACK_BG = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

const WELCOME_CLIPS = ['/audio/welcome_1.wav', '/audio/welcome_2.wav'];
const SAFETY_CLIPS = ['/audio/safety_1.wav', '/audio/safety_2.wav'];
const ENCOURAGEMENT_CLIPS = ['/audio/encouragement_1.wav', '/audio/encouragement_2.wav'];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function useLifeSkillRadio() {
  const ctx = useContext(LifeSkillRadioContext);
  if (!ctx) {
    throw new Error('useLifeSkillRadio must be used within LifeSkillRadioProvider');
  }
  return ctx;
}

/**
 * Syncs extra bottom padding on #main-scroll-container when the mini player is visible (mobile).
 */
export function RadioScrollPaddingBridge({ currentView }) {
  const { visible } = useLifeSkillRadio();

  useLayoutEffect(() => {
    const el = document.getElementById('main-scroll-container');
    if (!el) return undefined;

    const apply = () => {
      const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
      const isLeader = currentView === 'leaderboard';
      if (visible && isMobile && !isLeader) {
        el.style.setProperty(
          'padding-bottom',
          'calc(5rem + 3.25rem + env(safe-area-inset-bottom, 0px))'
        );
      } else {
        el.style.removeProperty('padding-bottom');
      }
    };

    apply();
    const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null;
    if (mq?.addEventListener) {
      mq.addEventListener('change', apply);
      return () => {
        mq.removeEventListener('change', apply);
        el.style.removeProperty('padding-bottom');
      };
    }
    return () => {
      el.style.removeProperty('padding-bottom');
    };
  }, [visible, currentView]);

  return null;
}

export function LifeSkillRadioProvider({ children, language, enabled }) {
  const audioRef = useRef(null);
  const bgAudioRef = useRef(null);
  const tracksRef = useRef([]);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  tracksRef.current = tracks;

  const clearError = useCallback(() => setError(null), []);

  const dismiss = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute('src');
    }
    const b = bgAudioRef.current;
    if (b) {
      b.pause();
    }
    setVisible(false);
    setExpanded(false);
    setTracks([]);
    setIndex(0);
    setPlaying(false);
    setError(null);
  }, []);

  useLayoutEffect(() => {
    if (!enabled) dismiss();
  }, [enabled, dismiss]);

  const startRadio = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/data/supplementary_modules.json');
      if (!res.ok) throw new Error('fetch failed');
      const modules = await res.json();
      const list = [];
      const rawList = Array.isArray(modules) ? modules : [];
      
      // 1. Add Random Welcome Clip
      list.push({
        id: 'radio_welcome',
        src: getRandom(WELCOME_CLIPS),
        title: language === 'bn' ? 'স্বাগতম বার্তা' : 'Radio Welcome',
        type: 'welcome'
      });

      for (let i = 0; i < rawList.length; i++) {
        const m = rawList[i];
        const src = pickSupplementaryListenSrc(m, language);
        if (!src) continue;

        // 2. Add the main lesson track
        list.push({
          id: m.id,
          src,
          title: language === 'bn' ? (m.title_bn || m.title_en) : (m.title_en || m.title_bn),
          type: 'lesson'
        });

        // 3. Insert random interstitials between lessons
        if (i < rawList.length - 1) {
          const rand = Math.random();
          if (rand < 0.4) {
            // Safety Tip
            list.push({
              id: `safety_${i}`,
              src: getRandom(SAFETY_CLIPS),
              title: language === 'bn' ? 'সুরক্ষা টিপস' : 'Safety Tip',
              type: 'safety'
            });
          } else if (rand < 0.7) {
            // Encouragement
            list.push({
              id: `encouragement_${i}`,
              src: getRandom(ENCOURAGEMENT_CLIPS),
              title: language === 'bn' ? 'অনুপ্রেরণা' : 'Inspiration',
              type: 'encouragement'
            });
          } else {
            // Radio Transition
            list.push({
              id: `trans_${i}`,
              src: TRANSITION_URL,
              title: language === 'bn' ? 'রেডিও বিরতি' : 'Radio Intermission',
              type: 'transition'
            });
          }
        }
      }

      if (list.length === 0) {
        setError(language === 'bn' ? 'কোনো অডিও নেই' : 'No audio available');
        return;
      }
      setTracks(list);
      setIndex(0);
      setVisible(true);
      setExpanded(false);

      // Start background music
      if (bgAudioRef.current) {
        bgAudioRef.current.volume = 0.15;
        bgAudioRef.current.play().catch(() => {});
      }
    } catch {
      setError(language === 'bn' ? 'লোড হয়নি' : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [enabled, language]);

  const nextTrack = useCallback(() => {
    setIndex((i) => {
      const len = tracksRef.current.length;
      if (!len) return 0;
      return (i + 1) % len;
    });
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!(a.currentSrc || a.src)) return;
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, []);

  // Duck background music when main track is playing
  useLayoutEffect(() => {
    const b = bgAudioRef.current;
    if (!b) return;
    if (playing) {
      b.volume = 0.05; // Duck
    } else {
      b.volume = 0.15; // Unduck
    }
  }, [playing]);

  const currentTrack = tracks[index] || null;

  const value = useMemo(
    () => ({
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
      startRadio,
      dismiss,
      togglePlay,
      nextTrack,
      clearError,
    }),
    [
      visible,
      expanded,
      playing,
      loading,
      error,
      tracks,
      index,
      currentTrack,
      startRadio,
      dismiss,
      togglePlay,
      nextTrack,
      clearError,
    ]
  );

  return (
    <LifeSkillRadioContext.Provider value={value}>
      {children}
      <audio 
        ref={bgAudioRef} 
        src={BG_MUSIC_URL} 
        loop 
        preload="auto" 
        style={{ display: 'none' }}
        onError={(e) => {
          if (e.target.src.includes(BG_MUSIC_URL)) {
            e.target.src = FALLBACK_BG;
            e.target.play().catch(() => {});
          }
        }}
      />
    </LifeSkillRadioContext.Provider>
  );
}
