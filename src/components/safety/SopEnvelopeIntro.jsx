import React, { useState } from 'react';
import envelope from '../../data/sops/envelope.json';
import SafeHomeLiveCard from './SafeHomeLiveCard';

/**
 * ৮ মন্ত্র / 8-Step Safety Mantra — field-first envelope:
 * short intro → memorise paths → job apply.
 */
export default function SopEnvelopeIntro({ language = 'bn', onClose }) {
  const bn = language === 'bn';
  const [activeOption, setActiveOption] = useState(null); // null | 'opt1' | 'opt2' | 'opt3' | 'jobs' | 'job_sop'
  const [selectedJob, setSelectedJob] = useState(null);

  const poem = bn ? envelope.poem.bn : envelope.poem.en;
  const rules = bn ? envelope.rules.bn : envelope.rules.en;
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

  const getHeaderTitle = () => {
    if (selectedJob) return bn ? selectedJob.title_bn : selectedJob.title_en;
    if (activeOption === 'jobs') return bn ? 'কাজে ৮-ধাপ' : '8 steps on the job';
    if (activeOption === 'opt1') return t(envelope.options[0].title_en, envelope.options[0].title_bn);
    if (activeOption === 'opt2') return t(envelope.options[1].title_en, envelope.options[1].title_bn);
    if (activeOption === 'opt3') return t(envelope.options[2].title_en, envelope.options[2].title_bn);
    return bn ? '৮ মন্ত্র' : '8 Mantra';
  };

  const getHeaderSubtitle = () => {
    if (selectedJob) return bn ? 'একই ৮ ধাপ · এই কাজের জন্য' : 'Same 8 steps · for this job';
    if (activeOption === 'jobs') return bn ? 'যে কাজ করবেন, সেটি বেছে নিন' : 'Pick the job you are doing';
    if (activeOption !== null) return bn ? 'কাজের আগে আওড়ে নিন' : 'Say it before you start';
    return bn ? 'কাজের আগে এই আট কথা' : 'Eight beats before every job';
  };

  const methods = [
    {
      key: 'opt1',
      num: bn ? '১' : '1',
      title: t(envelope.options[0].title_en, envelope.options[0].title_bn),
      hint: bn ? 'ছন্দে মনে রাখা সবচেয়ে সহজ' : 'Easiest — chant it',
      primary: true,
    },
    {
      key: 'opt2',
      num: bn ? '২' : '2',
      title: t(envelope.options[1].title_en, envelope.options[1].title_bn),
      hint: bn ? 'SAFE HOME — ৮ অক্ষর' : 'SAFE HOME — 8 letters',
      primary: false,
    },
    {
      key: 'opt3',
      num: bn ? '৩' : '3',
      title: t(envelope.options[2].title_en, envelope.options[2].title_bn),
      hint: bn ? 'স-ব-আ-ই-ফ-ই-র-ও' : 'সবাই ফিরো letters',
      primary: false,
    },
  ];

  return (
    <div className="sop-mantra flex min-h-0 flex-1 flex-col bg-[#fffaf3] text-slate-900">
      <header className="sop-mantra__header shrink-0 border-b border-orange-200/70 bg-[#ea580c] px-4 pb-4 pt-[max(0.65rem,env(safe-area-inset-top))] text-white">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 active:scale-95"
            aria-label={t('Back', 'ফিরে যান')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className={`text-[1.15rem] font-black leading-snug tracking-tight ${bn ? 'font-bengali' : ''}`}>
              {getHeaderTitle()}
            </h1>
            <p className={`mt-0.5 text-[12px] font-semibold text-white/85 ${bn ? 'font-bengali' : ''}`}>
              {getHeaderSubtitle()}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex w-full max-w-md flex-col gap-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* INTRO */}
          {activeOption === null && (
            <div className="sop-mantra__enter flex flex-col gap-5">
              <section className="sop-mantra__hero">
                <p className={`sop-mantra__chorus ${bn ? 'font-bengali' : ''}`}>
                  {bn ? envelope.chorus_bn : envelope.chorus_en}
                </p>
                <p className={`mt-2 text-[14px] font-semibold leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                  {bn
                    ? 'কাজের আগে এই ৮ ধাপ মাথায় গেঁথে নিন — নিচে যেকোনো এক উপায় বেছে নিন।'
                    : 'Lock these 8 steps in before every job — pick any one way below.'}
                </p>
              </section>

              <SafeHomeLiveCard
                language={language}
                onOpenSafeHome={() => setActiveOption('opt2')}
                onOpenSobai={() => setActiveOption('opt3')}
              />

              <section>
                <p className={`mb-2 px-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 ${bn ? 'font-bengali normal-case tracking-wide' : ''}`}>
                  {t('Memorise one way', 'এক উপায় মুখস্থ করুন')}
                </p>
                <div className="flex flex-col gap-2">
                  {methods.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setActiveOption(opt.key)}
                      className={`sop-mantra__method ${opt.primary ? 'sop-mantra__method--hot' : ''}`}
                    >
                      <span className="sop-mantra__method-n">{opt.num}</span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className={`block text-[15px] font-black leading-snug ${bn ? 'font-bengali' : ''}`}>
                          {opt.title}
                        </span>
                        <span className={`mt-0.5 block text-[12px] font-semibold opacity-80 ${bn ? 'font-bengali' : ''}`}>
                          {opt.hint}
                        </span>
                      </span>
                      <Chevron />
                    </button>
                  ))}
                </div>
              </section>

              <button
                type="button"
                onClick={() => setActiveOption('jobs')}
                className="sop-mantra__job-cta"
              >
                <span className="sop-mantra__job-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className={`block text-base font-black leading-snug ${bn ? 'font-bengali' : ''}`}>
                    {t('Use on today’s job', 'আজকের কাজে লাগান')}
                  </span>
                  <span className={`mt-0.5 block text-[12px] font-semibold text-white/85 ${bn ? 'font-bengali' : ''}`}>
                    {t('HT fuse, LT work, insulator & more', 'হর্নগ্যাপ, এলটি, ইনসুলেটর ও আরও')}
                  </span>
                </span>
                <Chevron light />
              </button>

              <p className={`px-1 text-center text-[12px] font-semibold leading-snug text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                {bn ? envelope.ask_bn : envelope.ask_en}
              </p>

              {/* Soft reminder — after mantra paths so it doesn’t steal focus */}
              <section className="sop-mantra__rules-soft" aria-label={t('Three rules', 'তিন নিয়ম')}>
                <p className={`mb-1.5 text-[11px] font-bold text-slate-400 ${bn ? 'font-bengali' : ''}`}>
                  {t('Also remember', 'মনে রাখবেন')}
                </p>
                <ul className="sop-mantra__rules-soft-list">
                  {rules.map((rule) => (
                    <li key={rule} className={`text-[12px] font-semibold leading-snug text-slate-500 ${bn ? 'font-bengali' : ''}`}>
                      {rule}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {/* JOB LIST */}
          {activeOption === 'jobs' && !selectedJob && (
            <div className="sop-mantra__enter flex flex-col gap-3">
              <p className={`text-[14px] font-semibold leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                {bn
                  ? 'একই ৮ ধাপ — শুধু কাজের অংশ বদলায়।'
                  : 'Same 8 steps — only the job part changes.'}
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
                    className="sop-mantra__method"
                  >
                    <span className="sop-mantra__job-emoji" aria-hidden>
                      {job.icon}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className={`block text-[15px] font-black leading-snug text-slate-900 ${bn ? 'font-bengali' : ''}`}>
                        {bn ? job.title_bn : job.title_en}
                      </span>
                      <span className={`mt-0.5 block text-[11px] font-bold text-slate-400 ${bn ? 'font-bengali' : ''}`}>
                        {bn ? '৮ ধাপের গাইড' : '8-step guide'}
                      </span>
                    </span>
                    <Chevron />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OPTION 1 — CHANT */}
          {activeOption === 'opt1' && (
            <div className="sop-mantra__enter flex flex-col gap-4">
              <p className={`text-[14px] font-semibold leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                {t(envelope.options[0].desc_en, envelope.options[0].desc_bn)}
              </p>
              <ol className="sop-mantra__poem">
                {poem.map((line, i) => {
                  const chorus = i === poem.length - 1;
                  return (
                    <li
                      key={line}
                      className={`sop-mantra__poem-line ${chorus ? 'sop-mantra__poem-line--chorus' : ''}`}
                      style={{ animationDelay: `${i * 55}ms` }}
                    >
                      <p className={`font-black leading-snug ${bn ? 'font-bengali text-[1.15rem]' : 'text-base'}`}>
                        {line}
                      </p>
                    </li>
                  );
                })}
              </ol>

              <div>
                <p className={`mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 ${bn ? 'font-bengali normal-case tracking-wide' : ''}`}>
                  {t('What each beat means', 'প্রতিটি কথার মানে')}
                </p>
                <ol className="flex flex-col gap-2">
                  {envelope.chant_steps.map((step, idx) => (
                    <StepRow
                      key={idx}
                      letter={bn ? step.word_bn : step.word_en}
                      title={null}
                      body={bn ? step.desc_bn : step.desc_en}
                      bn={bn}
                      letterWide
                    />
                  ))}
                </ol>
              </div>
              <BackMethods bn={bn} t={t} onClick={() => setActiveOption(null)} />
            </div>
          )}

          {/* OPTION 2 — SAFE HOME */}
          {activeOption === 'opt2' && (
            <div className="sop-mantra__enter flex flex-col gap-4">
              <SafeHomeLiveCard language={language} />
              <p className={`text-[14px] font-semibold leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                {t(envelope.options[1].desc_en, envelope.options[1].desc_bn)}
              </p>
              <ol className="flex flex-col gap-2">
                {envelope.beats.map((beat) => (
                  <StepRow
                    key={beat.id}
                    letter={beat.letter}
                    title={
                      <>
                        <span>{beat.word_en}</span>
                        <span className="font-bold text-orange-600"> → </span>
                        <span className="font-bengali">{beat.name_bn}</span>
                      </>
                    }
                    body={bn ? beat.do_bn : beat.do_en}
                    bn={bn}
                  />
                ))}
              </ol>
              <BackMethods bn={bn} t={t} onClick={() => setActiveOption(null)} />
            </div>
          )}

          {/* OPTION 3 — সবাই ফিরো */}
          {activeOption === 'opt3' && (
            <div className="sop-mantra__enter flex flex-col gap-4">
              <p className={`text-[14px] font-semibold leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                {t(envelope.options[2].desc_en, envelope.options[2].desc_bn)}
              </p>
              <ol className="flex flex-col gap-2">
                {envelope.bangla_letters.map((item, idx) => (
                  <StepRow
                    key={idx}
                    letter={item.letter}
                    title={<span className={bn ? 'font-bengali' : ''}>{item.word}</span>}
                    body={item.desc_bn}
                    bn={bn}
                  />
                ))}
              </ol>
              <BackMethods bn={bn} t={t} onClick={() => setActiveOption(null)} />
            </div>
          )}

          {/* JOB SOP */}
          {activeOption === 'job_sop' && selectedJob && (
            <div className="sop-mantra__enter flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {selectedJob.icon}
                </span>
                <p className={`text-[14px] font-semibold leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
                  {bn
                    ? `এই ৮ ধাপ মেনে ${selectedJob.title_bn} করুন।`
                    : `Follow these 8 steps for ${selectedJob.title_en}.`}
                </p>
              </div>
              <ol className="flex flex-col gap-2">
                {selectedJob.steps.map((step, idx) => (
                  <StepRow
                    key={idx}
                    letter={bn ? step.letter_bn : step.letter}
                    title={bn ? step.name_bn : step.name_en}
                    body={bn ? step.do_bn : step.do_en}
                    bn={bn}
                  />
                ))}
              </ol>
              <button
                type="button"
                onClick={() => {
                  setSelectedJob(null);
                  setActiveOption('jobs');
                }}
                className="sop-mantra__back-btn"
              >
                <span className={bn ? 'font-bengali' : ''}>{t('← Other jobs', '← অন্য কাজ')}</span>
              </button>
            </div>
          )}

          <p className={`text-center text-[11px] leading-relaxed text-slate-400 ${bn ? 'font-bengali' : ''}`}>
            {t(envelope.disclaimer_en, envelope.disclaimer_bn)}
          </p>
        </div>
      </main>
    </div>
  );
}

function Chevron({ light = false }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${light ? 'text-white/85' : 'text-slate-300'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackMethods({ bn, t, onClick }) {
  return (
    <button type="button" onClick={onClick} className="sop-mantra__back-btn">
      <span className={bn ? 'font-bengali' : ''}>{t('← Other ways', '← অন্য উপায়')}</span>
    </button>
  );
}

function StepRow({ letter, title, body, bn, letterWide = false }) {
  return (
    <li className="sop-mantra__step">
      <span className={`sop-mantra__step-letter ${letterWide ? 'sop-mantra__step-letter--wide' : ''}`}>
        {letter}
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <p className={`text-[15px] font-black leading-snug text-slate-900 ${bn ? 'font-bengali' : ''}`}>
            {title}
          </p>
        ) : null}
        <p
          className={`text-[13px] font-semibold leading-snug text-slate-600 ${title ? 'mt-1' : ''} ${
            bn ? 'font-bengali' : ''
          }`}
        >
          {body}
        </p>
      </div>
    </li>
  );
}
