import React, { useState } from 'react';
import envelope from '../../data/sops/envelope.json';

/**
 * SAFE HOME / সবাই ফিরো intro — the shared SOP envelope.
 * Arranged intuitively with an Intro page first, then separate views for each method.
 * Includes job-specific applications of the 8-point formula.
 */
export default function SopEnvelopeIntro({ language = 'bn', onClose }) {
  const bn = language === 'bn';
  const [activeOption, setActiveOption] = useState(null); // null | 'opt1' | 'opt2' | 'opt3' | 'jobs' | 'job_sop'
  const [selectedJob, setSelectedJob] = useState(null); // null | job object

  const poem = bn ? envelope.poem.bn : envelope.poem.en;
  const rules = bn ? envelope.rules.bn : envelope.rules.en;
  const intro = bn ? envelope.intro.bn : envelope.intro.en;
  const t = (en, beng) => (bn ? beng : en);

  const handleBack = () => {
    if (selectedJob !== null) {
      setSelectedJob(null);
      setActiveOption('jobs');
    } else if (activeOption !== null) {
      setActiveOption(null);
    } else {
      onClose();
    }
  };

  // Determine header title and subtitle based on current view
  const getHeaderTitle = () => {
    if (selectedJob) return bn ? selectedJob.title_bn : selectedJob.title_en;
    if (activeOption === 'jobs') return bn ? 'কাজে ৮-ধাপের প্রয়োগ' : 'Apply the 8 Steps';
    if (activeOption === 'opt1') return t(envelope.options[0].title_en, envelope.options[0].title_bn);
    if (activeOption === 'opt2') return t(envelope.options[1].title_en, envelope.options[1].title_bn);
    if (activeOption === 'opt3') return t(envelope.options[2].title_en, envelope.options[2].title_bn);
    return bn ? '৮-ধাপের সুরক্ষা মন্ত্র' : '8-Step Safety Mantra';
  };

  const getHeaderSubtitle = () => {
    if (selectedJob) {
      return bn ? '৮-ধাপের কাজের গাইড' : '8-Step Job Guide';
    }
    if (activeOption === 'jobs') {
      return bn ? 'কাজ বেছে নিন' : 'Choose a job';
    }
    if (activeOption !== null) {
      return bn ? '৮-ধাপের সুরক্ষা মন্ত্র · কাজের আগে ৮ কথা' : '8-Step Safety Mantra · 8 beats before work';
    }
    return bn ? 'কাজের আগে এই আট কথা' : 'Eight beats before every job';
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fffdf7] text-slate-900">
      <header className="shrink-0 border-b border-orange-100 bg-gradient-to-br from-orange-600 to-amber-600 px-4 pb-5 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="-ml-1 rounded-full bg-white/20 p-2 hover:bg-white/30 active:scale-95 transition-transform"
            aria-label={t('Back', 'ফিরে যান')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className={`text-lg font-black tracking-tight leading-snug ${bn ? 'font-bengali' : ''}`}>
              {getHeaderTitle()}
            </h1>
            <p className={`text-[11px] font-bold text-white/80 ${bn ? 'font-bengali' : 'uppercase tracking-[0.18em]'}`}>
              {getHeaderSubtitle()}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 pb-8">
          
          {/* INTRO VIEW (No option selected) */}
          {activeOption === null && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Natural Lineman-Friendly Intro Card */}
              <section className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
                <p className={`text-[10px] font-black uppercase tracking-[0.18em] text-orange-600 ${bn ? 'font-bengali normal-case tracking-wide' : ''}`}>
                  {t(envelope.intro_title_en, envelope.intro_title_bn)}
                </p>
                <div className="mt-3 space-y-3">
                  {intro.map((para) => (
                    <p key={para} className={`leading-relaxed text-slate-700 ${bn ? 'font-bengali text-[15px]' : 'text-sm'}`}>
                      {para}
                    </p>
                  ))}
                </div>
              </section>

              {/* Three Rules Card */}
              <section className="rounded-[1.75rem] border border-red-100 bg-red-50/80 p-5 shadow-sm">
                <p className={`mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-red-700 ${bn ? 'font-bengali normal-case tracking-wide' : ''}`}>
                  {t('Three rules', 'তিন নিয়ম')}
                </p>
                <ul className="space-y-2">
                  {rules.map((rule) => (
                    <li key={rule} className="flex items-start gap-2.5">
                      <span className="text-red-500 font-bold mt-0.5">•</span>
                      <p className={`font-black text-red-900 ${bn ? 'font-bengali text-base' : 'text-sm'}`}>
                        {rule}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Memorisation methods — clean numbered rows */}
              <section className="flex flex-col gap-2.5">
                <h2 className={`text-xs font-black uppercase tracking-wider text-slate-400 px-1 ${bn ? 'font-bengali' : ''}`}>
                  {t('Memorise the 8 steps', '৮টি ধাপ মনে রাখার উপায়')}
                </h2>

                {[
                  { key: 'opt1', num: bn ? '১' : '1', title: t(envelope.options[0].title_en, envelope.options[0].title_bn) },
                  { key: 'opt2', num: bn ? '২' : '2', title: t(envelope.options[1].title_en, envelope.options[1].title_bn) },
                  { key: 'opt3', num: bn ? '৩' : '3', title: t(envelope.options[2].title_en, envelope.options[2].title_bn) },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setActiveOption(opt.key)}
                    className="group flex w-full items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-orange-200 hover:shadow-[0_4px_14px_rgba(234,88,12,0.1)] active:scale-[0.99]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-[15px] font-black text-white shadow-sm shadow-orange-600/25">
                      {opt.num}
                    </span>
                    <h3 className={`min-w-0 flex-1 text-[15px] font-black leading-snug text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                      {opt.title}
                    </h3>
                    <svg className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </section>

              {/* Link to job-specific applications page */}
              <button
                type="button"
                onClick={() => setActiveOption('jobs')}
                className="group flex w-full items-center gap-3.5 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-600 to-amber-500 px-4 py-4 text-left text-white shadow-lg shadow-orange-600/20 transition-all hover:shadow-xl active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg font-black backdrop-blur-sm" aria-hidden>
                  ⚡
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-base font-black leading-snug ${bn ? 'font-bengali' : ''}`}>
                    {t('Apply the 8 steps on the job', 'কাজে ৮-ধাপের প্রয়োগ')}
                  </span>
                  <span className={`mt-0.5 block text-xs font-semibold text-white/85 ${bn ? 'font-bengali' : ''}`}>
                    {t('HT horn-gap, LT fuse, insulator & more', 'হর্নগ্যাপ, এলটি ফিউজ, ইনসুলেটর ও আরও')}
                  </span>
                </span>
                <svg className="h-5 w-5 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}

          {/* JOB LIST PAGE */}
          {activeOption === 'jobs' && !selectedJob && (
            <div className="flex flex-col gap-2.5 animate-fade-in">
              <p className={`px-1 text-sm leading-relaxed text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                {bn
                  ? 'যে কাজ করবেন, সেটি বেছে নিন। প্রতিটি কাজে একই ৮টি ধাপ — শুধু কাজের অংশ আলাদা।'
                  : 'Pick the job you are doing. Same 8 steps every time — only the work part changes.'}
              </p>
              <div className="flex flex-col gap-2">
                {envelope.job_sops.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => {
                      setSelectedJob(job);
                      setActiveOption('job_sop');
                    }}
                    className="group flex w-full items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-[0_4px_14px_rgba(234,88,12,0.1)] active:scale-[0.99]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg transition-colors group-hover:bg-orange-100" aria-hidden>
                      {job.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-[15px] font-black leading-snug text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                        {bn ? job.title_bn : job.title_en}
                      </h3>
                      <p className={`mt-0.5 text-[11px] font-bold text-slate-400 ${bn ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                        {bn ? '৮-ধাপের গাইড' : '8-step guide'}
                      </p>
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OPTION 1 VIEW: THE CHANT (ছড়া) */}
          {activeOption === 'opt1' && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <section className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
                <p className={`text-sm leading-relaxed text-slate-600 mb-4 ${bn ? 'font-bengali' : ''}`}>
                  {t(envelope.options[0].desc_en, envelope.options[0].desc_bn)}
                </p>
                
                <ol className="space-y-2.5">
                  {poem.map((line, i) => {
                    const chorus = i === poem.length - 1;
                    return (
                      <li
                        key={line}
                        className={`rounded-2xl px-4 py-3.5 ${
                          chorus ? 'bg-orange-600 text-white shadow-md shadow-orange-600/15' : 'bg-orange-50 text-slate-900 border border-orange-100/50'
                        }`}
                      >
                        <p className={`font-black leading-snug ${bn ? 'font-bengali text-lg' : 'text-base'}`}>
                          {line}
                        </p>
                      </li>
                    );
                  })}
                </ol>

                {/* Step-by-step descriptions for Option 1 */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className={`text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3.5 ${bn ? 'font-bengali' : ''}`}>
                    {t('Chant Steps Explained', 'ছড়ার ৮টি শব্দের অর্থ:')}
                  </p>
                  <ol className="space-y-2.5">
                    {envelope.chant_steps.map((step, idx) => (
                      <li key={idx} className="flex gap-3 rounded-xl bg-slate-50/50 px-3.5 py-3 border border-slate-100/50">
                        <span className="text-orange-600 font-black text-sm shrink-0 w-14">
                          {bn ? step.word_bn : step.word_en}
                        </span>
                        <p className={`text-sm leading-snug text-slate-700 ${bn ? 'font-bengali' : ''}`}>
                          {bn ? step.desc_bn : step.desc_en}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              <button
                type="button"
                onClick={() => setActiveOption(null)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3.5 font-black text-slate-700 shadow-xs active:scale-95 transition-all text-center"
              >
                <span className={bn ? 'font-bengali' : ''}>
                  {t('← View Other Methods', '← অন্য উপায়গুলো দেখুন')}
                </span>
              </button>
            </div>
          )}

          {/* OPTION 2 VIEW: SAFE HOME (English Word) */}
          {activeOption === 'opt2' && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className={`text-sm leading-relaxed text-slate-600 mb-4 ${bn ? 'font-bengali' : ''}`}>
                  {t(envelope.options[1].desc_en, envelope.options[1].desc_bn)}
                </p>

                <ol className="space-y-3">
                  {envelope.beats.map((beat) => (
                    <li
                      key={beat.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 shadow-2xs"
                    >
                      <div className="flex items-baseline gap-2.5">
                        <span className="w-5 shrink-0 text-xl font-black leading-none text-orange-600">{beat.letter}</span>
                        <p className="min-w-0 font-black leading-snug text-slate-900 text-base">
                          <span>{beat.word_en}</span>
                          <span className={`font-bold text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                            {' '}({beat.name_bn})
                          </span>
                        </p>
                      </div>
                      <p className={`mt-1.5 pl-7 text-sm leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                        {bn ? beat.do_bn : beat.do_en}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              <button
                type="button"
                onClick={() => setActiveOption(null)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3.5 font-black text-slate-700 shadow-xs active:scale-95 transition-all text-center"
              >
                <span className={bn ? 'font-bengali' : ''}>
                  {t('← View Other Methods', '← অন্য উপায়গুলো দেখুন')}
                </span>
              </button>
            </div>
          )}

          {/* OPTION 3 VIEW: সবাই ফিরো (Bangla Sentence) */}
          {activeOption === 'opt3' && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className={`text-sm leading-relaxed text-slate-600 mb-4 ${bn ? 'font-bengali' : ''}`}>
                  {t(envelope.options[2].desc_en, envelope.options[2].desc_bn)}
                </p>

                <ol className="space-y-3">
                  {envelope.bangla_letters.map((item, idx) => (
                    <li
                      key={idx}
                      className="rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 shadow-2xs"
                    >
                      <div className="flex items-baseline gap-2.5">
                        <span className="w-5 shrink-0 text-xl font-black leading-none text-orange-600">{item.letter}</span>
                        <p className={`min-w-0 font-black leading-snug text-slate-900 text-base ${bn ? 'font-bengali' : ''}`}>
                          <span>{item.word}</span>
                        </p>
                      </div>
                      <p className={`mt-1.5 pl-7 text-sm leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                        {item.desc_bn}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              <button
                type="button"
                onClick={() => setActiveOption(null)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3.5 font-black text-slate-700 shadow-xs active:scale-95 transition-all text-center"
              >
                <span className={bn ? 'font-bengali' : ''}>
                  {t('← View Other Methods', '← অন্য উপায়গুলো দেখুন')}
                </span>
              </button>
            </div>
          )}

          {/* JOB-SPECIFIC SOP VIEW */}
          {activeOption === 'job_sop' && selectedJob && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <section className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="text-2xl" aria-hidden>{selectedJob.icon}</span>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-700">
                    {t('8-Step Job Guide', '৮-ধাপের কাজের গাইড')}
                  </span>
                </div>

                <p className={`text-sm leading-relaxed text-slate-600 mb-5 ${bn ? 'font-bengali' : ''}`}>
                  {bn 
                    ? `এই ৮টি ধাপ কঠোরভাবে মেনে ${selectedJob.title_bn} কাজ সম্পন্ন করুন।` 
                    : `Follow these 8 steps strictly to perform ${selectedJob.title_en}.`
                  }
                </p>

                <ol className="space-y-3.5">
                  {selectedJob.steps.map((step, idx) => (
                    <li
                      key={idx}
                      className="rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 shadow-2xs"
                    >
                      <div className="flex items-baseline gap-2.5">
                        <span className="w-5 shrink-0 text-xl font-black leading-none text-orange-600">
                          {bn ? step.letter_bn : step.letter}
                        </span>
                        <p className={`min-w-0 font-black leading-snug text-slate-900 text-base ${bn ? 'font-bengali' : ''}`}>
                          <span>{bn ? step.name_bn : step.name_en}</span>
                        </p>
                      </div>
                      <p className={`mt-1.5 pl-7 text-sm leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                        {bn ? step.do_bn : step.do_en}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              <button
                type="button"
                onClick={() => {
                  setSelectedJob(null);
                  setActiveOption('jobs');
                }}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3.5 font-black text-slate-700 shadow-xs active:scale-95 transition-all text-center"
              >
                <span className={bn ? 'font-bengali' : ''}>
                  {t('← View Other Jobs', '← অন্য কাজগুলো দেখুন')}
                </span>
              </button>
            </div>
          )}

          {/* Disclaimer (Always at the very bottom) */}
          <p className={`text-center text-xs leading-relaxed text-slate-500 mt-2 ${bn ? 'font-bengali' : ''}`}>
            {t(envelope.disclaimer_en, envelope.disclaimer_bn)}
          </p>
        </div>
      </main>
    </div>
  );
}
