import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import NativeSheetHandle from './NativeSheetHandle';
import { pushNativeBackHandler } from '../utils/nativeAndroidUx';
import {
  APP_USER_GUIDE_SHORTS,
  appGuideShortThumb,
  appGuideShortTitle,
  loadAppUserGuideVideos,
  loadYoutubeIframeApi,
  normalizeAppGuideSeries,
  youtubeShortsPoster,
} from '../data/appUserGuideShorts';

const SWIPE_DISTANCE = 56;
const FLICK_DISTANCE = 22;
const FLICK_VELOCITY = 0.42;

export default function AppUserGuideShorts({ open, language = 'bn', onClose }) {
  const bn = language === 'bn';
  const [series, setSeries] = useState(() => normalizeAppGuideSeries(APP_USER_GUIDE_SHORTS));
  const [playingIndex, setPlayingIndex] = useState(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(false);
  const [activeTab, setActiveTab] = useState('illustrated'); // 'illustrated' | 'videos'
  const [activeScreen, setActiveScreen] = useState('home'); // 'home' | 'quiz' | 'training' | 'ppe' | 'leaderboard'

  const startY = useRef(null);
  const startT = useRef(0);
  const wheelLock = useRef(false);
  const playerRootRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const playingIndexRef = useRef(null);
  const totalRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setPlayingIndex(null);
      setDragY(0);
      setDragging(false);
      setHasSwiped(false);
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
  playingIndexRef.current = playingIndex;
  totalRef.current = total;

  const goTo = useCallback((index) => {
    setPlayingIndex((current) => {
      if (current == null) return current;
      const next = Math.max(0, Math.min(totalRef.current - 1, index));
      if (next === current) return current;
      if (navigator.vibrate) navigator.vibrate(5);
      setHasSwiped(true);
      return next;
    });
  }, []);

  const togglePlay = useCallback(() => {
    const player = ytPlayerRef.current;
    if (!player?.getPlayerState) return;
    try {
      const state = player.getPlayerState();
      if (state === 1) player.pauseVideo();
      else player.playVideo();
    } catch {
      /* API not ready */
    }
  }, []);

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
        e.preventDefault();
        goTo(playingIndex + 1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goTo(playingIndex - 1);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      pop();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, playingIndex, goTo]);

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

  useEffect(() => {
    if (!playing) {
      ytPlayerRef.current = null;
      return undefined;
    }
    let cancelled = false;
    let player;

    loadYoutubeIframeApi()
      .then((YT) => {
        if (cancelled) return;
        const host = document.getElementById('app-guide-yt');
        if (!host) return;
        player = new YT.Player(host, {
          videoId: playing.videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            fs: 0,
            ...(window.location.protocol === 'http:' || window.location.protocol === 'https:'
              ? { origin: window.location.origin }
              : {}),
          },
          events: {
            onReady: (event) => {
              try { event.target.playVideo(); } catch { /* autoplay blocked */ }
            },
            onStateChange: (event) => {
              if (event.data !== YT.PlayerState.ENDED) return;
              const index = playingIndexRef.current;
              const last = totalRef.current - 1;
              if (typeof index === 'number' && index < last) {
                goTo(index + 1);
                return;
              }
              try {
                event.target.seekTo(0, true);
                event.target.playVideo();
              } catch {
                /* ignore */
              }
            },
          },
        });
        ytPlayerRef.current = player;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      ytPlayerRef.current = null;
      try {
        player?.destroy?.();
      } catch {
        /* React may have already removed the node */
      }
    };
  }, [playing?.videoId, goTo]);

  useEffect(() => {
    if (!playing || total < 2) return undefined;
    const root = playerRootRef.current;
    if (!root) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      if (wheelLock.current) return;
      if (e.deltaY > 24) goTo(playingIndex + 1);
      else if (e.deltaY < -24) goTo(playingIndex - 1);
      else return;
      wheelLock.current = true;
      window.setTimeout(() => {
        wheelLock.current = false;
      }, 520);
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, [playing, playingIndex, total, goTo]);

  const onPointerDown = (e) => {
    if (!e.isPrimary) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    startT.current = Date.now();
    if (total > 1) setDragging(true);
  };

  const onPointerMove = (e) => {
    if (startY.current == null || total < 2) return;
    let dy = e.clientY - startY.current;
    if (playingIndex <= 0 && dy > 0) dy *= 0.28;
    if (playingIndex >= total - 1 && dy < 0) dy *= 0.28;
    setDragY(dy);
  };

  const endPointer = (e) => {
    if (startY.current == null) return;
    const dy = e.clientY - startY.current;
    const dt = Math.max(1, Date.now() - startT.current);
    const velocity = dy / dt;
    startY.current = null;
    setDragging(false);
    setDragY(0);

    if (total > 1) {
      const goNext = dy < -SWIPE_DISTANCE || (dy < -FLICK_DISTANCE && velocity < -FLICK_VELOCITY);
      const goPrev = dy > SWIPE_DISTANCE || (dy > FLICK_DISTANCE && velocity > FLICK_VELOCITY);
      if (goNext) {
        goTo(playingIndex + 1);
        return;
      }
      if (goPrev) {
        goTo(playingIndex - 1);
        return;
      }
    }
    if (Math.abs(dy) < 10 && dt < 450) togglePlay();
  };

  const onPointerUp = (e) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    endPointer(e);
  };

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
    setHasSwiped(false);
    setDragY(0);
    setPlayingIndex(index);
  };

  const trackClass = [
    'app-guide-player__track',
    dragging ? 'is-dragging' : '',
  ].filter(Boolean).join(' ');

  const trackStyle = {
    transform: `translate3d(0, calc(${-((playingIndex || 0) * 100)}% + ${dragY}px), 0)`,
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
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
              <NativeSheetHandle />
              <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-1">
                <div className="min-w-0">
                  <p className={`text-[11px] font-black text-orange-600 ${bn ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                    {bn ? 'কীভাবে ব্যবহার করবেন' : 'How to use the app'}
                  </p>
                  <h2
                    id="app-guide-sheet-title"
                    className={`mt-0.5 text-lg font-black text-slate-900 sm:text-xl ${bn ? 'font-bengali amader-kotha__display' : ''}`}
                  >
                    {bn ? 'অ্যাপ নির্দেশিকা' : 'App Guide'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
                  aria-label={bn ? 'বন্ধ' : 'Close'}
                >
                  ✕
                </button>
              </div>

              {/* Tab Switcher if video shorts exist */}
              {total > 0 && (
                <div className="mx-5 mb-3 flex rounded-xl border border-orange-200/80 bg-orange-50/60 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('illustrated')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-black transition-all ${
                      activeTab === 'illustrated'
                        ? 'bg-white text-orange-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    } ${bn ? 'font-bengali' : ''}`}
                  >
                    📖 {bn ? 'সচিত্র নির্দেশিকা' : 'Visual Guide'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('videos')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-black transition-all ${
                      activeTab === 'videos'
                        ? 'bg-white text-orange-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    } ${bn ? 'font-bengali' : ''}`}
                  >
                    🎬 {bn ? `ভিডিও (${total})` : `Videos (${total})`}
                  </button>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1.2rem+env(safe-area-inset-bottom,0px))]">
                {activeTab === 'videos' && total > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {series.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => playAt(index)}
                        className="overflow-hidden rounded-2xl border border-orange-100 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                      >
                        <span className="relative block aspect-[9/16] bg-slate-100">
                          <img
                            src={appGuideShortThumb(item.videoId)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white shadow-md">
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
                ) : (
                  /* Illustrated Visual Guide with Annotated Page Mockups */
                  <div className="space-y-4">
                    {/* Screen Selector Carousel Pills */}
                    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
                      {[
                        { id: 'home', label: bn ? 'হোম স্ক্রিন' : 'Home', icon: '🏠' },
                        { id: 'quiz', label: bn ? 'ঘণ্টার কুইজ' : 'Hourly Quiz', icon: '⚡' },
                        { id: 'training', label: bn ? 'প্রশিক্ষণ পাঠ' : 'Training', icon: '📚' },
                        { id: 'ppe', label: bn ? 'আমার পিপিই' : 'My PPE', icon: '🦺' },
                        { id: 'leaderboard', label: bn ? 'লিডারবোর্ড' : 'Leaderboard', icon: '🏆' },
                      ].map((scr) => (
                        <button
                          key={scr.id}
                          type="button"
                          onClick={() => setActiveScreen(scr.id)}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all active:scale-95 ${
                            activeScreen === scr.id
                              ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                              : 'border border-orange-200/90 bg-white text-slate-700 hover:bg-orange-50'
                          } ${bn ? 'font-bengali' : ''}`}
                        >
                          <span aria-hidden>{scr.icon}</span>
                          <span>{scr.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* SCREEN 1: HOME SCREEN MOCKUP */}
                    {activeScreen === 'home' && (
                      <div className="space-y-4 animate-fadeIn">
                        {/* Device Frame Preview */}
                        <div className="mx-auto max-w-sm overflow-hidden rounded-[2rem] border-4 border-slate-800 bg-[#fffdf7] shadow-xl">
                          {/* Phone Status Bar */}
                          <div className="flex items-center justify-between border-b border-slate-200/60 bg-[#fffdf7] px-5 py-1.5 text-[11px] font-bold text-slate-700">
                            <span>09:41</span>
                            <div className="h-3 w-16 rounded-full bg-slate-800" />
                            <span>5G 🔋</span>
                          </div>

                          {/* Simulated Home UI */}
                          <div className="space-y-3 p-3.5 text-slate-900">
                            {/* ITEM 1: Header */}
                            <div className="relative rounded-2xl border border-amber-200/90 bg-amber-50/60 p-2.5">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                1
                              </span>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-xs">
                                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xs">👷</div>
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-slate-900">রবিকান্ত বর্মন</p>
                                    <div className="flex items-center gap-1">
                                      <span className="rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[9px] font-black text-amber-900">র‍্যাঙ্ক #১২</span>
                                      <span className="rounded-full bg-orange-200/80 px-1.5 py-0.2 text-[9px] font-black text-orange-950">★ ৮৫০</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* ITEM 2: Hourly Quiz Button */}
                            <div className="relative rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 p-3 text-white shadow-md">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                2
                              </span>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 font-black text-xs">2PM</div>
                                  <div>
                                    <p className="text-xs font-black">ঘণ্টার কুইজ (লাইভ)</p>
                                    <p className="text-[10px] text-orange-100">+৫০ পয়েন্ট অর্জন করুন</p>
                                  </div>
                                </div>
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-orange-600">খেলুন →</span>
                              </div>
                            </div>

                            {/* ITEM 3: Daily Learning */}
                            <div className="relative rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-xs">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                3
                              </span>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] font-bold text-orange-700">আজকের বিষয় (Day 14)</p>
                                  <p className="text-xs font-black text-slate-900">লাইন গ্রাউন্ডিং ও ডিসচার্জ রড</p>
                                </div>
                                <span className="text-xs font-black text-orange-600">পড়ুন →</span>
                              </div>
                            </div>

                            {/* ITEM 4: Field Tip Board */}
                            <div className="relative rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 text-xs text-amber-950">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                4
                              </span>
                              <p className="font-bold text-[11px]">💡 মাঠের জরুরি টিপস:</p>
                              <p className="text-[10px] text-slate-700">সবসময় কাজের আগে টেস্টার ও ডিসচার্জ রড দিয়ে লাইন মৃত কিনা নিশ্চিত হোন।</p>
                            </div>

                            {/* ITEM 5: Shortcuts Grid */}
                            <div className="relative rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-2">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                5
                              </span>
                              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
                                <div className="rounded-xl border border-orange-100 bg-white p-1.5 shadow-2xs">🦺 আমার পিপিই</div>
                                <div className="rounded-xl border border-indigo-100 bg-white p-1.5 shadow-2xs">📘 লাইব্রেরি</div>
                                <div className="rounded-xl border border-rose-100 bg-white p-1.5 shadow-2xs">🚨 জরুরি এসওপি</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Itemized Breakdown List */}
                        <div className="rounded-2xl border border-orange-200/80 bg-white p-4 shadow-sm">
                          <h4 className={`text-sm font-black text-orange-950 ${bn ? 'amader-kotha__display' : ''}`}>
                            {bn ? 'হোম স্ক্রিনের মূল অংশসমূহ:' : 'Home Screen Components:'}
                          </h4>
                          <ul className="mt-3 space-y-2.5 text-xs">
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">1</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'প্রোফাইল ও পয়েন্ট' : 'Profile & Score'} — </span>
                                <span className="text-slate-600">{bn ? 'আপনার বর্তমান লেভেল ব্যাজ, লিডারবোর্ড র‍্যাঙ্ক এবং মোট অর্জিত পয়েন্ট।' : 'Your current level badge, leaderboard rank, and accumulated score.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">2</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'ঘণ্টার কুইজ বাটন' : 'Hourly Quiz Button'} — </span>
                                <span className="text-slate-600">{bn ? 'প্রতি ঘণ্টায় ৫টি নতুন প্রশ্নে ৫০ পয়েন্ট অর্জনের মূল লাইভ বাটন।' : 'Live hourly button offering 5 fresh questions for 50 safety points.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">3</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'দৈনিক পাঠক্রম' : 'Daily Learning'} — </span>
                                <span className="text-slate-600">{bn ? 'আজকের নির্ধারিত অধ্যায় পড়ে নিরাপত্তা জ্ঞান বাড়ানোর বাটন।' : 'Access today’s curated reading to sharpen field safety knowledge.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">4</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'মাঠের টিপস বোর্ড' : 'Daily Field Tip'} — </span>
                                <span className="text-slate-600">{bn ? 'কাজের মাঠে মেনে চলার মতো অত্যন্ত জরুরি বিশেষ সতর্কতা।' : 'Crucial practical safety precautions to review before starting work.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">5</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'শর্টকাট ফিচার মেনু' : 'Quick Shortcuts'} — </span>
                                <span className="text-slate-600">{bn ? 'আমার পিপিই, নিরাপত্তা লাইব্রেরি, পুরস্কার ও জরুরি নম্বরের এক-ক্লিক মেনু।' : 'One-tap access to My PPE, Safety Library, Prizes, and Emergency contacts.'}</span>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* SCREEN 2: HOURLY QUIZ SCREEN MOCKUP */}
                    {activeScreen === 'quiz' && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="mx-auto max-w-sm overflow-hidden rounded-[2rem] border-4 border-slate-800 bg-[#fffdf7] shadow-xl">
                          <div className="flex items-center justify-between border-b border-slate-200/60 bg-[#fffdf7] px-5 py-1.5 text-[11px] font-bold text-slate-700">
                            <span>09:41</span>
                            <div className="h-3 w-16 rounded-full bg-slate-800" />
                            <span>5G 🔋</span>
                          </div>

                          <div className="space-y-3 p-3.5 text-slate-900">
                            {/* ITEM 1: Timer & Progress */}
                            <div className="relative flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs font-black text-rose-900">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                1
                              </span>
                              <span>প্রশ্ন ০৩/০৫</span>
                              <span className="flex items-center gap-1 text-rose-600">⏱️ ১৮ সেকেন্ড বাকি</span>
                            </div>

                            {/* ITEM 2: Question Card */}
                            <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                2
                              </span>
                              <p className="text-xs font-black text-slate-900 leading-snug">
                                ১১ কেভি লাইনে কাজ করার আগে ব্যাক-ফিডিং (Back-feed) পরীক্ষা করা কেন বাধ্যতামূলক?
                              </p>
                            </div>

                            {/* ITEM 3: Four Options */}
                            <div className="relative space-y-1.5 rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 p-2.5">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                3
                              </span>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700">
                                A. ট্রান্সফরমার ঠান্ডা রাখার জন্য
                              </div>
                              <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-950 flex items-center justify-between">
                                <span>B. বিপরীত উৎস থেকে যাতে বিদ্যুৎ না আসে</span>
                                <span>✓</span>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700">
                                C. তারের টান কমানোর জন্য
                              </div>
                            </div>

                            {/* ITEM 4: Review & Next */}
                            <div className="relative rounded-xl border border-emerald-200 bg-emerald-50/90 p-2.5 text-[10px] text-emerald-950">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                4
                              </span>
                              <p className="font-black text-emerald-900">সঠিক উত্তর: B (+১০ পয়েন্ট)</p>
                              <p className="mt-0.5 text-slate-600">জেনারেটর বা অন্য ফিডার থেকে ব্যাক-ফিড বিদ্যুৎ আসতে পারে।</p>
                              <div className="mt-2 text-right">
                                <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">পরবর্তী প্রশ্ন →</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="rounded-2xl border border-orange-200/80 bg-white p-4 shadow-sm">
                          <h4 className={`text-sm font-black text-orange-950 ${bn ? 'amader-kotha__display' : ''}`}>
                            {bn ? 'কুইজ স্ক্রিনের মূল অংশসমূহ:' : 'Quiz Screen Components:'}
                          </h4>
                          <ul className="mt-3 space-y-2.5 text-xs">
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">1</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'কাউন্টডাউন টাইমার' : 'Timer & Tracker'} — </span>
                                <span className="text-slate-600">{bn ? 'নির্দিষ্ট সময়ের মধ্যে প্রশ্নটির সঠিক উত্তর দেওয়ার সময় নির্দেশক।' : 'Displays remaining seconds allowed for answering each question.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">2</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'বাস্তব প্রশ্নপত্র' : 'Field Safety Question'} — </span>
                                <span className="text-slate-600">{bn ? 'মাঠের কাজের আসল বিপদ ও পরিস্থিতি নিয়ে তৈরি নিরাপত্তা প্রশ্ন।' : 'Realistic scenarios based on real-world electrical distribution hazards.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">3</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? '৪টি উত্তর বিকল্প' : 'Four Options'} — </span>
                                <span className="text-slate-600">{bn ? 'সঠিক উত্তরটিতে ট্যাপ করলেই সাথে সাথে পয়েন্ট যোগ হয়।' : 'Tap the correct option to instantly earn points for your answer.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">4</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'বিশ্লেষণ ও পরবর্তী প্রশ্ন' : 'Review & Next'} — </span>
                                <span className="text-slate-600">{bn ? 'ভুল হলেও সঠিক কারণ জেনে নিয়ে পরের প্রশ্নে যাওয়ার সুযোগ।' : 'Read instant technical rationale before proceeding to the next question.'}</span>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* SCREEN 3: TRAINING SCREEN MOCKUP */}
                    {activeScreen === 'training' && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="mx-auto max-w-sm overflow-hidden rounded-[2rem] border-4 border-slate-800 bg-[#fffdf7] shadow-xl">
                          <div className="flex items-center justify-between border-b border-slate-200/60 bg-[#fffdf7] px-5 py-1.5 text-[11px] font-bold text-slate-700">
                            <span>09:41</span>
                            <div className="h-3 w-16 rounded-full bg-slate-800" />
                            <span>5G 🔋</span>
                          </div>

                          <div className="space-y-3 p-3.5 text-slate-900">
                            {/* ITEM 1: Day Roadmap */}
                            <div className="relative rounded-2xl border border-teal-200 bg-teal-50/80 p-3">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                1
                              </span>
                              <div className="flex items-center justify-between text-xs font-black text-teal-950">
                                <span>অধ্যায় ১৪ / ৯০</span>
                                <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] text-white">১৬% সম্পন্ন</span>
                              </div>
                              <div className="mt-2 h-2 w-full rounded-full bg-teal-200/60 overflow-hidden">
                                <div className="h-full w-1/6 rounded-full bg-teal-600" />
                              </div>
                            </div>

                            {/* ITEM 2: Lesson Title */}
                            <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                2
                              </span>
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-800">আজকের পাঠ</span>
                              <h5 className="mt-1 text-xs font-black text-slate-900">ডাই-ইলেকট্রিক গ্লাভস পরীক্ষা ও ব্যবহার</h5>
                              <p className="mt-0.5 text-[10px] text-slate-500">⏱️ পড়ার সময়: আনুমানিক ৩ মিনিট</p>
                            </div>

                            {/* ITEM 3: Audio & Text Mode */}
                            <div className="relative flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                3
                              </span>
                              <span>পাঠটি শুনে নিন (অডিও)</span>
                              <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black text-white">▶ শুনুন</span>
                            </div>

                            {/* ITEM 4: Complete Button */}
                            <div className="relative rounded-xl border border-emerald-200 bg-emerald-500 p-2.5 text-center font-black text-white shadow-sm">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                4
                              </span>
                              <p className="text-xs">পাঠ শেষ হয়েছে? পয়েন্ট নিন</p>
                              <span className="mt-1 inline-block rounded-full bg-white px-3 py-0.5 text-[10px] text-emerald-800">সম্পূর্ণ করুন (+২৫ পয়েন্ট) ✓</span>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="rounded-2xl border border-orange-200/80 bg-white p-4 shadow-sm">
                          <h4 className={`text-sm font-black text-orange-950 ${bn ? 'amader-kotha__display' : ''}`}>
                            {bn ? 'প্রশিক্ষণ স্ক্রিনের মূল অংশসমূহ:' : 'Training Screen Components:'}
                          </h4>
                          <ul className="mt-3 space-y-2.5 text-xs">
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">1</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'দিনভিত্তিক মাইলফলক' : 'Day Progress (Day 1-90)'} — </span>
                                <span className="text-slate-600">{bn ? '১ম দিন থেকে শুরু করে ধাপে ধাপে ৯০ দিনের পাঠের অগ্রগতি।' : 'Sequential roadmap guiding you through 90 days of core safety modules.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">2</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'পাঠের বিষয়বস্তু ও সময়' : 'Lesson Summary & Time'} — </span>
                                <span className="text-slate-600">{bn ? 'আজকের অধ্যায়ের মূল নাম ও পাঠটি পড়তে প্রয়োজনীয় সময়।' : 'Module topic title with estimated reading duration in minutes.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">3</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'অডিও ও টেক্সট মোড' : 'Audio & Text Mode'} — </span>
                                <span className="text-slate-600">{bn ? 'নিজের সুবিধা অনুযায়ী পাঠটি পড়ে বা শুনে নেওয়ার ব্যবস্থা।' : 'Listen to native voice narration or read through illustrated text.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">4</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'পাঠ সম্পন্ন বোতাম' : 'Complete (+25 Pts)'} — </span>
                                <span className="text-slate-600">{bn ? 'পাঠ শেষ করে নিশ্চিত করলেই প্রোফাইলে অতিরিক্ত ২৫ পয়েন্ট যোগ হয়।' : 'Tap to mark lesson as completed and add +25 points to your account.'}</span>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* SCREEN 4: MY PPE SCREEN MOCKUP */}
                    {activeScreen === 'ppe' && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="mx-auto max-w-sm overflow-hidden rounded-[2rem] border-4 border-slate-800 bg-[#fffdf7] shadow-xl">
                          <div className="flex items-center justify-between border-b border-slate-200/60 bg-[#fffdf7] px-5 py-1.5 text-[11px] font-bold text-slate-700">
                            <span>09:41</span>
                            <div className="h-3 w-16 rounded-full bg-slate-800" />
                            <span>5G 🔋</span>
                          </div>

                          <div className="space-y-3 p-3.5 text-slate-900">
                            {/* ITEM 1: Readiness Meter */}
                            <div className="relative flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                1
                              </span>
                              <div>
                                <p className="text-[10px] font-bold text-emerald-800">পিপিই প্রস্তুতি স্কোর</p>
                                <p className="text-sm font-black text-emerald-950">১০০% সম্পূর্ণ সুরক্ষিত</p>
                              </div>
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white font-black text-xs">✓</span>
                            </div>

                            {/* ITEM 2: Gear Cards */}
                            <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                2
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-lg">🪖</div>
                                <div>
                                  <p className="text-xs font-black text-slate-900">ইন্ডাস্ট্রিয়াল সেফটি হেলমেট</p>
                                  <p className="text-[10px] text-slate-500">IS 2925 স্ট্যান্ডার্ড সার্টিফাইড</p>
                                </div>
                              </div>
                            </div>

                            {/* ITEM 3: Verification Toggle */}
                            <div className="relative flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-950">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                3
                              </span>
                              <span>কাজে নামার পূর্বে যাচাই টিক</span>
                              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] text-white">যাচাইকৃত ✓</span>
                            </div>

                            {/* ITEM 4: Replacement Warning */}
                            <div className="relative rounded-xl border border-rose-200 bg-rose-50/80 p-2 text-[10px] text-rose-950">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                4
                              </span>
                              <p className="font-bold text-rose-800">⚠️ পরবর্তী টেস্ট তারিখ: ১৫ দিন বাকি</p>
                              <p className="text-slate-600">গ্লাভসের নিয়মিত ভোল্টেজ লিকেজ টেস্ট নিশ্চিত করুন।</p>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="rounded-2xl border border-orange-200/80 bg-white p-4 shadow-sm">
                          <h4 className={`text-sm font-black text-orange-950 ${bn ? 'amader-kotha__display' : ''}`}>
                            {bn ? 'পিপিই স্ক্রিনের মূল অংশসমূহ:' : 'PPE Screen Components:'}
                          </h4>
                          <ul className="mt-3 space-y-2.5 text-xs">
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">1</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'সামগ্রিক সুরক্ষা মিটার' : 'Safety Readiness Meter'} — </span>
                                <span className="text-slate-600">{bn ? 'আপনার পিপিই সামগ্রীর বর্তমান সুরক্ষামান ও প্রস্তুতি শতাংশ।' : 'Displays your percentage of safety readiness before entering the field.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">2</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'সরঞ্জাম কার্ড (গিয়ার লিস্ট)' : 'Gear Cards (Helmet, Gloves)'} — </span>
                                <span className="text-slate-600">{bn ? 'হেলমেট, গ্লাভস, বেল্ট ও বুটের ছবি ও বিবরণ কার্ড।' : 'Individual gear cards for dielectric gloves, harness, helmet, and boots.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">3</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'যাচাই টিকমার্ক বোতাম' : 'Verification Toggle'} — </span>
                                <span className="text-slate-600">{bn ? 'প্রতিটি সরঞ্জাম ঠিক আছে কিনা পরীক্ষা করে টিক দেওয়ার সুইচ।' : 'Quick toggle switch to confirm physical condition before each shift.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">4</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'মেয়াদ ও প্রতিস্থাপন সতর্কতা' : 'Replacement Warning'} — </span>
                                <span className="text-slate-600">{bn ? 'কোন সরঞ্জাম কবে বদলাতে হবে তার পূর্বসতর্কবার্তা।' : 'Reminds you when dielectric testing or gear replacement is required.'}</span>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* SCREEN 5: LEADERBOARD SCREEN MOCKUP */}
                    {activeScreen === 'leaderboard' && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="mx-auto max-w-sm overflow-hidden rounded-[2rem] border-4 border-slate-800 bg-[#fffdf7] shadow-xl">
                          <div className="flex items-center justify-between border-b border-slate-200/60 bg-[#fffdf7] px-5 py-1.5 text-[11px] font-bold text-slate-700">
                            <span>09:41</span>
                            <div className="h-3 w-16 rounded-full bg-slate-800" />
                            <span>5G 🔋</span>
                          </div>

                          <div className="space-y-3 p-3.5 text-slate-900">
                            {/* ITEM 1: Podium Top 3 */}
                            <div className="relative rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-100/70 to-amber-50/30 p-3 text-center">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                1
                              </span>
                              <div className="flex items-end justify-center gap-4 pt-2">
                                <div className="text-center">
                                  <span className="text-xs">🥈</span>
                                  <div className="h-10 w-10 mx-auto rounded-full bg-slate-200 flex items-center justify-center text-xs font-black">২য়</div>
                                  <p className="text-[10px] font-bold mt-1">সুমন</p>
                                </div>
                                <div className="text-center">
                                  <span className="text-sm">👑 🥇</span>
                                  <div className="h-12 w-12 mx-auto rounded-full bg-amber-400 flex items-center justify-center text-xs font-black text-amber-950 ring-2 ring-amber-500">১ম</div>
                                  <p className="text-[10px] font-black mt-1">রতন দেব</p>
                                </div>
                                <div className="text-center">
                                  <span className="text-xs">🥉</span>
                                  <div className="h-10 w-10 mx-auto rounded-full bg-amber-200 flex items-center justify-center text-xs font-black">৩য়</div>
                                  <p className="text-[10px] font-bold mt-1">বিকাশ</p>
                                </div>
                              </div>
                            </div>

                            {/* ITEM 2: Month & Annual Tabs */}
                            <div className="relative flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-black">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                2
                              </span>
                              <span className="flex-1 rounded-lg bg-white py-1 text-center text-orange-950 shadow-xs">মাসিক র‍্যাঙ্ক</span>
                              <span className="flex-1 py-1 text-center text-slate-500">বার্ষিক ট্রফি</span>
                            </div>

                            {/* ITEM 3: Annual Grand Trophy Card */}
                            <div className="relative flex items-center gap-2.5 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-2.5">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                3
                              </span>
                              <span className="text-2xl">🏆</span>
                              <div>
                                <p className="text-[11px] font-black text-amber-950">বার্ষিক গ্র্যান্ড ট্রফি কোয়ালিফায়ার</p>
                                <p className="text-[9px] text-slate-600">নিয়মিত কুইজ খেলে ট্রফি অর্জন নিশ্চিত করুন</p>
                              </div>
                            </div>

                            {/* ITEM 4: Your Position */}
                            <div className="relative flex items-center justify-between rounded-xl bg-orange-600 p-2.5 text-white shadow-sm">
                              <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white shadow-md ring-2 ring-white">
                                4
                              </span>
                              <div className="flex items-center gap-2 text-xs font-black">
                                <span className="rounded-full bg-white/20 px-2 py-0.5">র‍্যাঙ্ক #১২</span>
                                <span>আপনি (৮৫০ পয়েন্ট)</span>
                              </div>
                              <span className="text-[10px] text-orange-200">পরের র‍্যাঙ্কে +৩০ পয়েন্ট</span>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="rounded-2xl border border-orange-200/80 bg-white p-4 shadow-sm">
                          <h4 className={`text-sm font-black text-orange-950 ${bn ? 'amader-kotha__display' : ''}`}>
                            {bn ? 'লিডারবোর্ড স্ক্রিনের মূল অংশসমূহ:' : 'Leaderboard Screen Components:'}
                          </h4>
                          <ul className="mt-3 space-y-2.5 text-xs">
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">1</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'সেরা ৩ জনের পোডিয়াম' : 'Top 3 Podium'} — </span>
                                <span className="text-slate-600">{bn ? 'সবচেয়ে বেশি পয়েন্ট অর্জনকারী সেরা ৩ সহকর্মীর মঞ্চ।' : 'Honors the top 3 highest scoring line workers across the district.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">2</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'মাসিক ও বার্ষিক ফিল্টার' : 'Month & Annual Tabs'} — </span>
                                <span className="text-slate-600">{bn ? 'চলতি মাস ও সারা বছরের স্কোরবোর্ড আলাদা দেখার ব্যবস্থা।' : 'Switch between monthly ranking and cumulative annual scoreboards.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">3</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'বার্ষিক গ্র্যান্ড ট্রফি স্ট্যাটাস' : 'Annual Grand Trophy'} — </span>
                                <span className="text-slate-600">{bn ? 'বছরের শেষে সেরা লাইনম্যানদের জন্য নির্ধারিত ট্রফির মাপকাঠি।' : 'Eligibility tracker for the grand championship trophy at year end.'}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-black text-white">4</span>
                              <div>
                                <span className="font-bold text-slate-900">{bn ? 'আপনার অবস্থান' : 'Your Personal Position'} — </span>
                                <span className="text-slate-600">{bn ? 'তালিকায় আপনার বর্তমান র‍্যাঙ্ক এবং পরবর্তী অবস্থানে যাওয়ার লক্ষ্য।' : 'Your exact live standing and points needed to leap to the next rank.'}</span>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Prev / Next Screen Quick Navigation */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-xs font-black">
                      <button
                        type="button"
                        onClick={() => {
                          const order = ['home', 'quiz', 'training', 'ppe', 'leaderboard'];
                          const curIdx = order.indexOf(activeScreen);
                          const prevIdx = (curIdx - 1 + order.length) % order.length;
                          setActiveScreen(order[prevIdx]);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-orange-200/90 bg-white px-3.5 py-2 text-slate-700 shadow-2xs hover:bg-orange-50 active:scale-95"
                      >
                        ← {bn ? 'পূর্ববর্তী স্ক্রিন' : 'Previous Screen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const order = ['home', 'quiz', 'training', 'ppe', 'leaderboard'];
                          const curIdx = order.indexOf(activeScreen);
                          const nextIdx = (curIdx + 1) % order.length;
                          setActiveScreen(order[nextIdx]);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-orange-200/90 bg-white px-3.5 py-2 text-slate-700 shadow-2xs hover:bg-orange-50 active:scale-95"
                      >
                        {bn ? 'পরবর্তী স্ক্রিন' : 'Next Screen'} →
                      </button>
                    </div>

                    {/* Primary Button to start */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(5);
                          onClose();
                        }}
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-amber-600 active:scale-[0.98]"
                      >
                        <span>{bn ? 'বুঝেছি, শুরু করুন' : "Got it, Let's Start!"}</span>
                        <span aria-hidden>→</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {playing && (
        <div
          ref={playerRootRef}
          className="app-guide-player"
          role="dialog"
          aria-modal="true"
          aria-label={title || (bn ? 'অ্যাপ গাইড' : 'App guide')}
        >
          <div className={trackClass} style={trackStyle}>
            {series.map((item, index) => {
              const active = index === playingIndex;
              return (
                <div key={item.id} className="app-guide-player__slide">
                  <div className="app-guide-player__frame">
                    <img
                      className="app-guide-player__poster"
                      src={youtubeShortsPoster(item.videoId)}
                      alt=""
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.src = appGuideShortThumb(item.videoId);
                      }}
                    />
                    {active ? (
                      <div className="app-guide-player__yt-host">
                        <div id="app-guide-yt" />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="app-guide-player__swipe"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />

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

          {total > 1 && playingIndex < total - 1 && !hasSwiped && !dragging && (
            <div className={`app-guide-player__hint ${bn ? 'font-bengali' : ''}`} aria-hidden>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{bn ? 'উপরে সোয়াইপ' : 'Swipe up'}</span>
            </div>
          )}

          {total > 1 && (
            <>
              <div className="app-guide-player__nav">
                <button
                  type="button"
                  disabled={playingIndex <= 0}
                  onClick={() => goTo(playingIndex - 1)}
                  className="app-guide-player__nav-btn"
                  aria-label={bn ? 'আগের ভিডিও' : 'Previous video'}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                    <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={playingIndex >= total - 1}
                  onClick={() => goTo(playingIndex + 1)}
                  className="app-guide-player__nav-btn"
                  aria-label={bn ? 'পরের ভিডিও' : 'Next video'}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
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
