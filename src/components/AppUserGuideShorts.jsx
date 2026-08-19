import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import NativeSheetHandle from './NativeSheetHandle';
import { pushNativeBackHandler } from '../utils/nativeAndroidUx';
import {
  APP_USER_GUIDE_SHORTS,
  appGuideShortThumb,
  appGuideShortTitle,
  loadAppUserGuideVideos,
  normalizeAppGuideSeries,
} from '../data/appUserGuideShorts';

function youtubeEmbedSrc(videoId) {
  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: '0',
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export default function AppUserGuideShorts({ open, language = 'bn', onClose }) {
  const bn = language === 'bn';
  const [series, setSeries] = useState(() => normalizeAppGuideSeries(APP_USER_GUIDE_SHORTS));
  const [playingIndex, setPlayingIndex] = useState(null);

  useEffect(() => {
    if (!open) {
      setPlayingIndex(null);
      return undefined;
    }
    let cancelled = false;
    loadAppUserGuideVideos()
      .then((list) => {
        if (!cancelled) setSeries(list);
      })
      .catch(() => {
        if (!cancelled) setSeries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const playing = open && playingIndex != null && series[playingIndex];
  const showPicker = open && !playing;
  const total = series.length;

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const pop = pushNativeBackHandler(() => {
      if (playingIndex != null) {
        setPlayingIndex(null);
        return true;
      }
      onClose?.();
      return true;
    });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (playingIndex != null) {
          setPlayingIndex(null);
          return;
        }
        onClose?.();
        return;
      }
      if (playingIndex == null) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setPlayingIndex((i) => Math.min(total - 1, i + 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setPlayingIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      pop();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, playingIndex, total]);

  useEffect(() => {
    if (!playing) return undefined;
    let meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute('content') || null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#050505');
    return () => {
      if (previous) meta.setAttribute('content', previous);
    };
  }, [playing]);

  if (!open || typeof document === 'undefined') return null;

  const title = playing ? appGuideShortTitle(playing, language) : '';
  const countLabel = playing
    ? `${playingIndex + 1} / ${total}`
    : (bn ? 'অ্যাপ গাইড' : 'App guide');
  const seriesCountLabel = bn
    ? (total === 1 ? '১টি ভিডিও' : `${total}টি ভিডিও`)
    : (total === 1 ? '1 video' : `${total} videos`);

  const playAt = (index) => {
    if (navigator.vibrate) navigator.vibrate(5);
    setPlayingIndex(index);
  };

  return createPortal(
    <>
      {showPicker && (
        <div
          className="fixed inset-0 z-[1280] flex items-end justify-center bg-slate-900/45 p-0 animate-fade-in sm:items-center sm:p-4"
          onClick={onClose}
        >
          <div
            className="w-full max-w-lg animate-slide-up-sheet sm:animate-scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-guide-sheet-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-[86vh] flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
              <NativeSheetHandle />
              <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-1">
                <div className="min-w-0">
                  <p className={`text-[10px] font-black text-fuchsia-600 ${bn ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                    {bn ? 'কীভাবে ব্যবহার করবেন' : 'How to use the app'}
                  </p>
                  <h2
                    id="app-guide-sheet-title"
                    className={`mt-0.5 text-lg font-black text-slate-900 ${bn ? 'font-bengali' : ''}`}
                  >
                    {bn ? 'অ্যাপ গাইড' : 'App guide'}
                  </h2>
                  {total > 0 && (
                    <p className={`mt-0.5 text-xs font-semibold text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                      {seriesCountLabel}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-all hover:bg-fuchsia-50 active:scale-95"
                  aria-label={bn ? 'বন্ধ' : 'Close'}
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1.1rem+env(safe-area-inset-bottom,0px))]">
                {total === 0 ? (
                  <p className={`pb-4 text-sm font-semibold text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                    {bn ? 'গাইড ভিডিও শীঘ্রই আসছে।' : 'Guide videos coming soon.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {series.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => playAt(index)}
                        className="overflow-hidden rounded-2xl border border-fuchsia-100 bg-white text-left shadow-sm transition-all active:scale-[0.98]"
                      >
                        <span className="relative block aspect-[9/16] bg-slate-100">
                          <img
                            src={appGuideShortThumb(item.videoId)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-500 text-white shadow-md">
                              <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="m7 4 12 8-12 8V4z" />
                              </svg>
                            </span>
                          </span>
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-white">
                            {index + 1}
                          </span>
                        </span>
                        <span className={`line-clamp-2 block px-2 py-1.5 text-[11px] font-bold leading-snug text-slate-800 ${bn ? 'font-bengali' : ''}`}>
                          {appGuideShortTitle(item, language)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {playing && (
        <div
          className="app-guide-player"
          role="dialog"
          aria-modal="true"
          aria-label={title || (bn ? 'অ্যাপ গাইড' : 'App guide')}
        >
          <div className="app-guide-player__stage">
            <div className="app-guide-player__frame">
              <iframe
                key={playing.videoId}
                src={youtubeEmbedSrc(playing.videoId)}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen={false}
              />
            </div>
          </div>

          <div className="app-guide-player__chrome">
            <p className={`app-guide-player__kicker ${bn ? 'font-bengali' : ''}`}>
              {countLabel}
            </p>
            <button
              type="button"
              onClick={() => setPlayingIndex(null)}
              className="app-guide-player__close"
              aria-label={bn ? 'বন্ধ' : 'Close'}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {title ? (
            <p className={`app-guide-player__title ${bn ? 'font-bengali' : ''}`}>{title}</p>
          ) : null}

          {total > 1 && (
            <>
              <div className="app-guide-player__nav">
                <button
                  type="button"
                  disabled={playingIndex <= 0}
                  onClick={() => setPlayingIndex((i) => Math.max(0, i - 1))}
                  className="app-guide-player__nav-btn"
                  aria-label={bn ? 'আগের ভিডিও' : 'Previous video'}
                >
                  ‹
                </button>
                <button
                  type="button"
                  disabled={playingIndex >= total - 1}
                  onClick={() => setPlayingIndex((i) => Math.min(total - 1, i + 1))}
                  className="app-guide-player__nav-btn"
                  aria-label={bn ? 'পরের ভিডিও' : 'Next video'}
                >
                  ›
                </button>
              </div>
              <div className="app-guide-player__dots" aria-hidden>
                {series.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`app-guide-player__dot${index === playingIndex ? ' is-active' : ''}`}
                    onClick={() => playAt(index)}
                    tabIndex={-1}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>,
    document.body
  );
}
