import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';

// SVG Icons
function ChevronLeftIcon({ className = "w-5 h-5" }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>;
}
function ChevronRightIcon({ className = "w-5 h-5" }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>;
}
function CheckCircleIcon({ className = "w-5 h-5 text-emerald-500" }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function ZoomIcon({ className = "w-4 h-4" }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" /></svg>;
}

// Media renderer helper matching Training.jsx
function renderInteractiveText(text, onOpenModal, language = 'bn') {
  if (!text) return null;

  // Split by inline figures [[filename|inline|label]] or [[filename]]
  // and inline chips ((chip_text|modal_title))
  const parts = [];
  let remaining = text;
  let keyIdx = 0;

  // Pattern: ((chip|title)) or [[file|inline|label]]
  const tokenRegex = /(\(\((.*?)\)\)|\[\[(.*?)\]\])/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('((')) {
      const inner = match[2];
      const [chipText, modalTitle] = inner.split('|');
      parts.push(
        <button
          key={`chip-${keyIdx++}`}
          type="button"
          onClick={() => onOpenModal?.({ title: modalTitle || 'টিপস ও তথ্য', content: chipText })}
          className="inline-flex items-center gap-1 mx-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors shadow-xs align-middle"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
          <span>{modalTitle || 'ব্যাখ্যা'}</span>
        </button>
      );
    } else if (token.startsWith('[[')) {
      const inner = match[3];
      const [fileUrl, mode, label] = inner.split('|');
      parts.push(
        <div key={`figure-${keyIdx++}`} className="my-3 rounded-lg overflow-hidden border border-slate-200 bg-white p-2 text-center shadow-xs">
          <img src={fileUrl} alt={label || 'Equipment'} className="mx-auto max-h-56 object-contain rounded" />
          {label && <p className="text-[11px] font-bold text-slate-600 mt-1">{label}</p>}
        </div>
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts;
}

export default function LessonPreviewHarness() {
  const [chapterNum, setChapterNum] = useState(2);
  const [lessonNum, setLessonNum] = useState(1);
  const [viewportWidth, setViewportWidth] = useState('390px');
  const [language, setLanguage] = useState('bn');
  const [lessonData, setLessonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const [modalData, setModalData] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [activeTab, setActiveTab] = useState('reader'); // reader | images | raw

  // Load chapter JSON
  useEffect(() => {
    setLoading(true);
    setError(null);
    setActiveSlideIndex(0);
    setGuidedStepIndex(0);

    const url = `/quizzes/chapter_${chapterNum}_${lessonNum}.json`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setLessonData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [chapterNum, lessonNum]);

  // Derived slides structure
  const slides = useMemo(() => {
    if (!lessonData) return [];
    const arr = [];
    // 1. Mission Briefing (Hero)
    arr.push({ type: 'hero', title: 'মিশন পরিচিতি (Mission Briefing)' });
    // 2. Sections
    (lessonData.sections || []).forEach((sec, idx) => {
      arr.push({ type: 'section', section: sec, sectionIndex: idx, title: sec.title || `সেকশন ${idx + 1}` });
    });
    // 3. Pro Tips
    if (lessonData.pro_tip) {
      arr.push({ type: 'pro_tip', title: lessonData.pro_tip.title || 'উস্তাদের প্রো টিপস' });
    }
    // 4. Myth Buster
    if (lessonData.myth_buster) {
      arr.push({ type: 'myth_buster', title: lessonData.myth_buster.title || 'মিথ বাস্টার' });
    }
    // 5. Advanced Section
    if (lessonData.advanced_section) {
      arr.push({ type: 'advanced', title: lessonData.advanced_section.title || 'ইঞ্জিনিয়ারিং ফ্যাক্টস' });
    }
    // 6. Completion
    arr.push({ type: 'completion', title: 'পাঠ সমাপ্তি (Lesson Complete)' });
    return arr;
  }, [lessonData]);

  // Collect all images in lesson
  const allImages = useMemo(() => {
    if (!lessonData) return [];
    const imgs = [];
    (lessonData.sections || []).forEach((sec, sIdx) => {
      (sec.points || []).forEach((pt, pIdx) => {
        if (pt.image_name) {
          imgs.push({
            point: `${sIdx + 1}.${pIdx + 1} ${pt.item_name}`,
            src: pt.image_name,
            caption: pt.image_caption
          });
        }
      });
    });
    if (lessonData.myth_buster?.image_name) {
      imgs.push({
        point: 'Myth Buster',
        src: lessonData.myth_buster.image_name,
        caption: lessonData.myth_buster.image_caption
      });
    }
    return imgs;
  }, [lessonData]);

  const currentSlide = slides[activeSlideIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Controller Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand & Selector */}
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 font-black px-2.5 py-1 rounded text-sm tracking-wider uppercase">
              SLM Preview
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400">পাঠ (Lesson):</label>
              <select
                value={`${chapterNum}.${lessonNum}`}
                onChange={(e) => {
                  const [c, l] = e.target.value.split('.').map(Number);
                  setChapterNum(c);
                  setLessonNum(l);
                }}
                className="bg-slate-800 text-amber-300 font-bold text-sm px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <optgroup label="অধ্যায় ২ — হাতিয়ারের ওস্তাদ (Toolbox & Practical Tools)">
                  <option value="2.1">২.১ লাইনম্যানের টুলবক্স ও ভোল্টেজ টেস্টার</option>
                  <option value="2.2">২.২ ডিজিটাল ক্ল্যাম্প মিটার ও মাল্টিমিটার</option>
                  <option value="2.3">২.৩ ল্যাগস ক্রিম্পিং ও বাই-মেটালিক প্রযুক্তি</option>
                  <option value="2.4">২.৪ কাম-অ্যালং ও তার টানার কৌশল</option>
                  <option value="2.5">২.৫ অপারেটিং রড (হট স্টিক) ও লাইভ লাইন টুল</option>
                  <option value="2.6">২.৬ কেবল স্কিনিং ও নির্ভুল স্ট্রিপিং</option>
                  <option value="2.7">২.৭ ডিজিটাল মেগার ও আর্থ টেস্টার</option>
                  <option value="2.8">২.৮ ফেজ সিকোয়েন্স ও ঘূর্ণন নির্দেশক</option>
                  <option value="2.9">২.৯ কর্ডলেস ব্যাটারি ও হাইড্রোলিক ক্রিম্পার</option>
                  <option value="2.10">২.১০ হাতিয়ারের যত্ন ও টেথারিং সুরক্ষা</option>
                </optgroup>
                <optgroup label="অধ্যায় ১ (সুরক্ষা কবচ - PPE)">
                  <option value="1.1">১.১ সুরক্ষা কবচ (PPE Uniform)</option>
                  <option value="1.2">১.২ নিরাপদ দূরত্ব</option>
                </optgroup>
                <optgroup label="অধ্যায় ৬ (যন্ত্র গুরু - DTR)">
                  <option value="6.1">৬.১ ডিস্ট্রিবিউশন ট্রান্সফরমার (Field DTR)</option>
                </optgroup>
              </select>
            </div>

            {/* Quick Prev / Next Lesson */}
            <div className="flex items-center gap-1">
              <button
                disabled={lessonNum <= 1}
                onClick={() => setLessonNum((prev) => Math.max(1, prev - 1))}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300"
                title="Previous lesson"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                disabled={lessonNum >= 10}
                onClick={() => setLessonNum((prev) => Math.min(10, prev + 1))}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300"
                title="Next lesson"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center: Device Frame Switcher */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 px-2 font-semibold hidden sm:inline">ফ্রেম (Frame):</span>
            <button
              onClick={() => setViewportWidth('375px')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${viewportWidth === '375px' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              iPhone SE (375)
            </button>
            <button
              onClick={() => setViewportWidth('390px')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${viewportWidth === '390px' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              Std Mobile (390)
            </button>
            <button
              onClick={() => setViewportWidth('412px')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${viewportWidth === '412px' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              Android (412)
            </button>
            <button
              onClick={() => setViewportWidth('768px')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${viewportWidth === '768px' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              Tablet (768)
            </button>
            <button
              onClick={() => setViewportWidth('100%')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${viewportWidth === '100%' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              Fluid (100%)
            </button>
          </div>

          {/* Right: Tab Mode & Language */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('reader')}
                className={`px-3 py-1 rounded-md font-semibold ${activeTab === 'reader' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                রিডার (Reader)
              </button>
              <button
                onClick={() => setActiveTab('images')}
                className={`px-3 py-1 rounded-md font-semibold ${activeTab === 'images' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                ছবি অডিট ({allImages.length})
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 rounded-md font-semibold ${activeTab === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                JSON
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto">
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-amber-400">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-semibold text-sm">পাঠলোড হচ্ছে... (Loading lesson...)</p>
          </div>
        )}

        {error && (
          <div className="my-10 max-w-lg w-full bg-rose-950/80 border border-rose-700 p-5 rounded-xl text-rose-200 text-center">
            <p className="font-bold text-lg mb-1">পাঠ লোড করা যায়নি</p>
            <p className="text-sm font-mono text-rose-300">{error}</p>
          </div>
        )}

        {!loading && !error && lessonData && (
          <>
            {/* View 1: Mobile Reader Simulator */}
            {activeTab === 'reader' && (
              <div className="flex flex-col items-center w-full">
                {/* Simulator Frame Wrapper */}
                <div
                  style={{ width: viewportWidth }}
                  className="transition-all duration-200 bg-slate-900 border-4 border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                >
                  {/* Phone Header Strip */}
                  <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700 text-xs text-slate-400">
                    <span className="font-mono">Lesson {chapterNum}.{lessonNum}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="font-semibold text-slate-300">Live Preview</span>
                    </div>
                  </div>

                  {/* Slide Stepper Header */}
                  <div className="bg-slate-850 px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
                    <button
                      disabled={activeSlideIndex <= 0}
                      onClick={() => setActiveSlideIndex((p) => Math.max(0, p - 1))}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300 font-semibold"
                    >
                      ← পূর্বের
                    </button>
                    <span className="font-bold text-amber-300 truncate max-w-[200px]">
                      {activeSlideIndex + 1}/{slides.length}: {currentSlide?.title}
                    </span>
                    <button
                      disabled={activeSlideIndex >= slides.length - 1}
                      onClick={() => setActiveSlideIndex((p) => Math.min(slides.length - 1, p + 1))}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded"
                    >
                      পরবর্তী →
                    </button>
                  </div>

                  {/* Reading Canvas */}
                  <div className="p-4 sm:p-5 bg-slate-950 min-h-[640px] max-h-[80vh] overflow-y-auto text-slate-200">
                    {/* SLIDE: Hero / Mission Briefing */}
                    {currentSlide?.type === 'hero' && (
                      <div className="space-y-4">
                        <div className="text-center pb-3 border-b border-slate-800">
                          <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 font-bold text-xs rounded-full border border-amber-500/40 mb-2">
                            {lessonData.badge_name || 'হাতিয়ারের ওস্তাদ'}
                          </span>
                          <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                            {lessonData.level_title || lessonData.title}
                          </h1>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
                          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            মিশন ব্রিফিং (Mission Briefing)
                          </h3>
                          <div className="text-sm sm:text-base leading-relaxed text-slate-300 font-normal">
                            {renderInteractiveText(lessonData.mission_briefing, setModalData, language)}
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => setActiveSlideIndex(1)}
                            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg transition-all text-sm tracking-wide uppercase"
                          >
                            হাতিয়ারের পাঠ শুরু করুন →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SLIDE: Section Points */}
                    {currentSlide?.type === 'section' && (
                      <div className="space-y-4">
                        <div className="border-b border-slate-800 pb-2">
                          <h2 className="text-base sm:text-lg font-bold text-amber-300">
                            {currentSlide.section.title}
                          </h2>
                        </div>

                        {/* Step-by-Step Points */}
                        <div className="space-y-4">
                          {(currentSlide.section.points || []).map((pt, pIdx) => {
                            const isCurrent = pIdx === guidedStepIndex;
                            return (
                              <div
                                key={pIdx}
                                className={`rounded-2xl border transition-all ${
                                  isCurrent
                                    ? 'bg-slate-900 border-amber-500/60 shadow-lg p-4'
                                    : 'bg-slate-900/40 border-slate-800 p-3 opacity-90'
                                }`}
                              >
                                <div
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => setGuidedStepIndex(pIdx)}
                                >
                                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                                      {pIdx + 1}
                                    </span>
                                    <span>{pt.item_name}</span>
                                  </h3>
                                  <span className="text-xs text-slate-400">
                                    {isCurrent ? '▼' : '▶'}
                                  </span>
                                </div>

                                {isCurrent && (
                                  <div className="mt-4 space-y-4 pt-3 border-t border-slate-800/80">
                                    {/* Image Poster */}
                                    {pt.image_name && (
                                      <div className="relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                                        <img
                                          src={pt.image_name}
                                          alt={pt.item_name}
                                          className="w-full h-auto object-contain max-h-72 mx-auto"
                                        />
                                        <button
                                          onClick={() => setZoomImage({ src: pt.image_name, caption: pt.image_caption })}
                                          className="absolute top-2 right-2 p-2 rounded-lg bg-slate-900/80 text-white hover:bg-amber-500 hover:text-slate-950 transition-colors shadow"
                                          title="বড় করে দেখুন (Enlarge)"
                                        >
                                          <ZoomIcon className="w-4 h-4" />
                                        </button>
                                        {pt.image_caption && (
                                          <p className="p-2 text-center text-[11px] font-bold text-slate-400 bg-slate-900/90 border-t border-slate-800">
                                            {pt.image_caption}
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* Importance */}
                                    {pt.importance && (
                                      <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800">
                                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                          <span>⚡</span> কেন এত গুরুত্বপূর্ণ (Importance)
                                        </h4>
                                        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                          {renderInteractiveText(pt.importance, setModalData, language)}
                                        </div>
                                      </div>
                                    )}

                                    {/* Daily Check */}
                                    {pt.daily_check && (
                                      <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800">
                                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                          <span>🔍</span> প্রতিদিনের দ্রুত পরীক্ষা (Daily Check)
                                        </h4>
                                        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                          {renderInteractiveText(pt.daily_check, setModalData, language)}
                                        </div>
                                      </div>
                                    )}

                                    {/* Specifications */}
                                    {pt.specifications && (
                                      <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800">
                                        <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                          <span>📐</span> টেকনিক্যাল স্পেসিফিকেশন ও নিয়ম
                                        </h4>
                                        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                          {renderInteractiveText(pt.specifications, setModalData, language)}
                                        </div>
                                      </div>
                                    )}

                                    {/* Step Completion Button */}
                                    <div className="pt-2 flex justify-between gap-2">
                                      <button
                                        disabled={pIdx === 0}
                                        onClick={() => setGuidedStepIndex(pIdx - 1)}
                                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded font-semibold text-slate-300"
                                      >
                                        ← পূর্বের পয়েন্ট
                                      </button>
                                      {pIdx < currentSlide.section.points.length - 1 ? (
                                        <button
                                          onClick={() => setGuidedStepIndex(pIdx + 1)}
                                          className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded"
                                        >
                                          পরবর্তী পয়েন্ট →
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => setActiveSlideIndex(activeSlideIndex + 1)}
                                          className="px-4 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded"
                                        >
                                          পরবর্তী সেকশনে যান ✓
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SLIDE: Pro Tips */}
                    {currentSlide?.type === 'pro_tip' && lessonData.pro_tip && (
                      <div className="space-y-4">
                        <div className="bg-amber-950/40 border border-amber-600/60 p-4 rounded-2xl">
                          <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2 mb-3">
                            <span>⭐</span> {lessonData.pro_tip.title || 'উস্তাদের প্রো টিপস (Pro Tips)'}
                          </h2>
                          <div className="space-y-2.5">
                            {(lessonData.pro_tip.content || lessonData.pro_tip.tips || []).map((tip, idx) => (
                              <div key={idx} className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed flex items-start gap-2.5">
                                <span className="font-black text-amber-400 shrink-0">{idx + 1}.</span>
                                <div>{renderInteractiveText(typeof tip === 'string' ? tip : `${tip.title}: ${tip.desc}`, setModalData, language)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveSlideIndex(activeSlideIndex + 1)}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm"
                        >
                          পরবর্তী স্লাইড →
                        </button>
                      </div>
                    )}

                    {/* SLIDE: Myth Buster */}
                    {currentSlide?.type === 'myth_buster' && lessonData.myth_buster && (
                      <div className="space-y-4">
                        <div className="border-b border-slate-800 pb-2">
                          <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                            <span>🛡️</span> {lessonData.myth_buster.title || 'মিথ বাস্টার (Myth Buster)'}
                          </h2>
                        </div>

                        {lessonData.myth_buster.image_name && (
                          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                            <img
                              src={lessonData.myth_buster.image_name}
                              alt="Myth Buster"
                              className="w-full h-auto object-contain max-h-72 mx-auto"
                            />
                            {lessonData.myth_buster.image_caption && (
                              <p className="p-2 text-center text-[11px] font-bold text-slate-400 bg-slate-900/90 border-t border-slate-800">
                                {lessonData.myth_buster.image_caption}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="space-y-3">
                          {(lessonData.myth_buster.myths || []).map((m, idx) => (
                            <div key={idx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                              <div className="bg-rose-950/60 p-3 border-b border-rose-900/40 text-xs sm:text-sm text-rose-200 font-semibold flex items-start gap-2">
                                <span className="text-rose-400 font-bold shrink-0">❌ মিথ:</span>
                                <span>{m.myth}</span>
                              </div>
                              <div className="bg-emerald-950/40 p-3 text-xs sm:text-sm text-emerald-200 leading-relaxed flex items-start gap-2">
                                <span className="text-emerald-400 font-bold shrink-0">✓ আসল সত্য:</span>
                                <div>{renderInteractiveText(m.reality, setModalData, language)}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => setActiveSlideIndex(activeSlideIndex + 1)}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm"
                        >
                          পরবর্তী স্লাইড →
                        </button>
                      </div>
                    )}

                    {/* SLIDE: Advanced Section */}
                    {currentSlide?.type === 'advanced' && lessonData.advanced_section && (
                      <div className="space-y-4">
                        <div className="bg-indigo-950/40 border border-indigo-700/50 p-4 rounded-2xl">
                          <h2 className="text-lg font-bold text-indigo-300 flex items-center gap-2 mb-3">
                            <span>🔬</span> {lessonData.advanced_section.title || 'ইঞ্জিনিয়ারিং বিজ্ঞান ও খুঁটিনাটি'}
                          </h2>
                          <div className="space-y-3">
                            {(lessonData.advanced_section.facts || []).map((fact, idx) => (
                              <div key={idx} className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed">
                                <h4 className="font-bold text-indigo-300 mb-1">{fact.title}</h4>
                                <p>{renderInteractiveText(fact.content, setModalData, language)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveSlideIndex(activeSlideIndex + 1)}
                          className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm"
                        >
                          পাঠ সমাপ্তি স্লাইড →
                        </button>
                      </div>
                    )}

                    {/* SLIDE: Completion */}
                    {currentSlide?.type === 'completion' && (
                      <div className="py-10 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                          <CheckCircleIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-black text-white">পাঠ সফলভাবে সম্পন্ন!</h2>
                        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                          আপনি লেভেল {chapterNum}.{lessonNum} এর সমস্ত হাতিয়ার ও নিয়ম মনোযোগ দিয়ে পড়েছেন।
                        </p>
                        <div className="pt-4 flex flex-col gap-2 max-w-xs mx-auto">
                          {lessonNum < 10 ? (
                            <button
                              onClick={() => setLessonNum(lessonNum + 1)}
                              className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm"
                            >
                              পরবর্তী পাঠে যান ({chapterNum}.{lessonNum + 1}) →
                            </button>
                          ) : (
                            <div className="text-xs text-amber-300 font-bold bg-amber-950/60 p-3 rounded-lg">
                              অধ্যায় ২ এর সমস্ত পাঠ সম্পন্ন হয়েছে!
                            </div>
                          )}
                          <button
                            onClick={() => setActiveSlideIndex(0)}
                            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
                          >
                            পুনরায় পড়ুন (Read again)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* View 2: Image Audit Grid */}
            {activeTab === 'images' && (
              <div className="w-full max-w-6xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-amber-400">
                    পাঠের সমস্ত ছবি অডিট (Images in Lesson {chapterNum}.{lessonNum})
                  </h2>
                  <span className="text-xs text-slate-400">মোট ছবি: {allImages.length}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allImages.map((img, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-300 truncate">{img.point}</span>
                        <button
                          onClick={() => setZoomImage({ src: img.src, caption: img.caption })}
                          className="text-slate-400 hover:text-white"
                        >
                          <ZoomIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800/80 p-1">
                        <img
                          src={img.src}
                          alt={img.point}
                          className="w-full h-44 object-contain mx-auto"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/icons/icon-192x192.png';
                          }}
                        />
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate" title={img.src}>
                        {img.src}
                      </div>
                      <p className="text-xs text-slate-300 font-medium line-clamp-2">
                        {img.caption || 'ক্যাপশন নেই'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View 3: Raw JSON Inspector */}
            {activeTab === 'raw' && (
              <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400 font-mono">public/quizzes/chapter_{chapterNum}_{lessonNum}.json</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(lessonData, null, 2))}
                    className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-lg overflow-x-auto max-h-[70vh]">
                  {JSON.stringify(lessonData, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </main>

      {/* Interactive Explanation Modal (for chips) */}
      {modalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
                <span>💡</span> {modalData.title}
              </h3>
              <button
                onClick={() => setModalData(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{modalData.content}</p>
            <div className="pt-2 text-right">
              <button
                onClick={() => setModalData(null)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
              >
                বুঝেছি (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Tap-to-Zoom Image Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-3xl w-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex justify-end">
              <button
                onClick={() => setZoomImage(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs shadow"
              >
                বন্ধ করুন (Close ✕)
              </button>
            </div>
            <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-2xl max-h-[80vh] overflow-hidden flex items-center justify-center">
              <img
                src={zoomImage.src}
                alt="Enlarged Poster"
                className="max-h-[74vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            {zoomImage.caption && (
              <p className="text-xs sm:text-sm font-bold text-amber-300 text-center bg-slate-900/90 px-4 py-2 rounded-full border border-slate-800">
                {zoomImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LessonPreviewHarness />
  </React.StrictMode>
);
