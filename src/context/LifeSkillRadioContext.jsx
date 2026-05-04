import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { pickSupplementaryListenSrc } from '../utils/supplementaryAudioUrl';

const LifeSkillRadioContext = createContext(null);

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
      for (const m of Array.isArray(modules) ? modules : []) {
        const src = pickSupplementaryListenSrc(m, language);
        if (!src) continue;
        list.push({
          id: m.id,
          src,
          title: language === 'bn' ? (m.title_bn || m.title_en) : (m.title_en || m.title_bn),
        });
      }
      if (list.length === 0) {
        setError(language === 'bn' ? 'কোনো অডিও নেই' : 'No audio available');
        return;
      }
      setTracks(list);
      setIndex(0);
      setVisible(true);
      setExpanded(false);
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

  const currentTrack = tracks[index] || null;

  const value = useMemo(
    () => ({
      audioRef,
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

  return <LifeSkillRadioContext.Provider value={value}>{children}</LifeSkillRadioContext.Provider>;
}
