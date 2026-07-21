import React, { useEffect, useMemo, useState } from 'react';
import { LOADER_IMAGES } from './loaderImages';

const CYCLE_MS = 280;

const shuffle = (items) => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

export const BrutalSpinner = ({ className = 'h-16 w-16' }) => (
  <div className={`relative ${className}`} role="status" aria-label="Loading">
    <div className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-orange-500 animate-spin" />
  </div>
);

const LoaderDots = () => (
  <div className="flex items-center gap-2" aria-hidden>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"
        style={{ animationDelay: `${i * 0.12}s`, animationDuration: '0.7s' }}
      />
    ))}
  </div>
);

const SafetyItemCarousel = ({ compact = false }) => {
  const sequence = useMemo(() => shuffle(LOADER_IMAGES), []);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * sequence.length));

  // Prefetch only current + next frame — avoid competing with login/Training network.
  useEffect(() => {
    const next = sequence[(index + 1) % sequence.length];
    [sequence[index], next].filter(Boolean).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [sequence, index]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % sequence.length);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [sequence.length]);

  const frameClass = compact ? 'h-28 w-28' : 'h-44 w-44 sm:h-52 sm:w-52';
  const prevIndex = (index - 1 + sequence.length) % sequence.length;
  const nextIndex = (index + 1) % sequence.length;

  return (
    <div
      className={`relative ${frameClass}`}
      role="img"
      aria-label="Loading safety equipment"
    >
      {sequence.map((src, i) => {
        // Keep nearby frames mounted for smooth crossfade; others stay out of DOM.
        if (i !== index && i !== prevIndex && i !== nextIndex) return null;
        return (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden
            decoding="async"
            fetchPriority={i === index ? 'high' : 'low'}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-150 ease-out ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        );
      })}
    </div>
  );
};

export const BrutalLoaderContent = ({ message, compact = false }) => (
  <div className={`flex flex-col items-center text-center ${compact ? 'gap-4' : 'gap-6'}`}>
    <SafetyItemCarousel compact={compact} />
    <LoaderDots />
    {message && (
      <p className={`font-medium text-slate-500 ${compact ? 'text-xs' : 'text-sm'}`}>{message}</p>
    )}
  </div>
);

const PageLoader = ({ overlay = false, message }) => {
  useEffect(() => {
    if (typeof window.__hideStaticShell === 'function') {
      window.__hideStaticShell();
    }
  }, []);

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[110] bg-white/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
        <div role="status" aria-live="polite" aria-busy="true">
          <BrutalLoaderContent message={message} compact />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <BrutalLoaderContent message={message} />
    </div>
  );
};

export default PageLoader;
