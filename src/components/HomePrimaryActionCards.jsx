import React from 'react';

/**
 * Home primary CTAs: hourly quiz + শিখতে থাকুন.
 * Shared by Home (live) and Admin (demo preview).
 */
export default function HomePrimaryActionCards({
  bn = true,
  hourlyDone = false,
  hourLabel = '5PM',
  pointsLabel = '+50',
  waitMinutes = 32,
  learningLabel,
  topicPrefix,
  topicTitle,
  hintFallback,
  onHourlyClick,
  onLearningClick,
  demo = false,
}) {
  const hourlyPending = !hourlyDone;
  const focusLearning = hourlyDone;
  const resolvedLearningLabel =
    learningLabel || (bn ? 'শিখতে থাকুন' : 'Continue Training');
  const resolvedTopicPrefix = topicPrefix || (bn ? 'আজকের বিষয়:' : "Today's topic:");
  const resolvedTopicTitle =
    topicTitle ||
    (bn ? 'প্রথম দিনের ইউনিফর্ম ও পিপিই (PPE)' : 'Day-one uniform & PPE');
  const resolvedHintFallback =
    hintFallback || (bn ? '৯০ দিনের নিরাপত্তা পাঠ' : '90-day safety path');

  const mins = Math.max(0, Number(waitMinutes) || 0);
  const waitLabel = bn ? `${mins}মি পরে` : `in ${mins}m`;

  const hourlyClass = `home-hourly-cta${demo ? '' : ' ripple'} mb-2.5 sm:mb-3${
    hourlyDone ? ' home-hourly-cta--done' : ''
  }`;

  const learningClass = focusLearning
    ? `home-hourly-cta home-learning-cta--primary${demo ? '' : ' ripple'} mb-4 sm:mb-5`
    : [
        'mb-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all sm:mb-5 sm:py-3.5',
        demo ? '' : 'active:scale-[0.99]',
        'border-slate-200/90 bg-white shadow-sm hover:border-orange-200 hover:bg-orange-50/40',
      ]
        .filter(Boolean)
        .join(' ');

  const HourlyTag = demo ? 'div' : 'button';
  const LearningTag = demo ? 'div' : 'button';

  const bookIcon = (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );

  const chevron = (
    <span className="home-hourly-cta__chevron" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </span>
  );

  return (
    <div className={demo ? 'pointer-events-none select-none' : undefined}>
      <HourlyTag
        type={demo ? undefined : 'button'}
        onClick={demo ? undefined : onHourlyClick}
        className={hourlyClass}
        aria-label={
          hourlyDone
            ? bn
              ? `পরের কুইজ ${waitLabel} পরে`
              : `Next quiz in ${waitLabel}`
            : undefined
        }
      >
        <span className="home-hourly-cta__icon" aria-hidden>
          <span className="home-hourly-cta__hour">{hourLabel}</span>
          {hourlyPending && (
            <span className="home-hourly-cta__live">
              <span className="home-hourly-cta__live-ping" />
              <span className="home-hourly-cta__live-dot" />
            </span>
          )}
        </span>

        <span className="home-hourly-cta__copy">
          <span className={`home-hourly-cta__title ${bn ? 'font-bengali' : ''}`}>
            {bn ? 'ঘণ্টার কুইজ' : 'Hourly quiz'}
          </span>
        </span>

        <span className="home-hourly-cta__trail">
          {hourlyPending ? (
            <>
              <span className="home-hourly-cta__points">{pointsLabel}</span>
              {chevron}
            </>
          ) : (
            <span className={`home-hourly-cta__wait ${bn ? 'font-bengali' : ''}`}>
              {waitLabel}
            </span>
          )}
        </span>
      </HourlyTag>

      <LearningTag
        type={demo ? undefined : 'button'}
        onClick={demo ? undefined : onLearningClick}
        className={learningClass}
      >
        {focusLearning ? (
          <>
            <span className="home-hourly-cta__icon" aria-hidden>
              {bookIcon}
            </span>
            <span className="home-hourly-cta__copy">
              <span className={`home-hourly-cta__title ${bn ? 'font-bengali' : ''}`}>
                {resolvedLearningLabel}
              </span>
              <span
                className={`home-learning-cta__topic line-clamp-2 ${bn ? 'font-bengali' : ''}`}
              >
                {resolvedTopicTitle ? (
                  <>
                    <span className="home-learning-cta__topic-prefix">{resolvedTopicPrefix} </span>
                    <span className="home-learning-cta__topic-name">{resolvedTopicTitle}</span>
                  </>
                ) : (
                  resolvedHintFallback
                )}
              </span>
            </span>
            <span className="home-hourly-cta__trail">{chevron}</span>
          </>
        ) : (
          <>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-orange-50 text-orange-700 sm:h-10 sm:w-10"
              aria-hidden
            >
              {bookIcon}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block font-black text-slate-900 ${bn ? 'font-bengali text-base sm:text-lg' : 'text-sm'}`}
              >
                {resolvedLearningLabel}
              </span>
              <span
                className={`mt-0.5 block font-semibold line-clamp-2 ${bn ? 'font-bengali text-sm' : 'text-[11px]'}`}
              >
                {resolvedTopicTitle ? (
                  <>
                    <span className="text-slate-500">{resolvedTopicPrefix} </span>
                    <span className="font-bold text-orange-700">{resolvedTopicTitle}</span>
                  </>
                ) : (
                  <span className="text-slate-500">{resolvedHintFallback}</span>
                )}
              </span>
            </span>
            <svg
              className="h-4 w-4 shrink-0 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </>
        )}
      </LearningTag>
    </div>
  );
}
