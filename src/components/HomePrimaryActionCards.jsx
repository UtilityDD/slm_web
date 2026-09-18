import React from 'react';
import { getSleepNudgeCopy } from '../utils/hourlyNightWindow';

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
  onHourlyClick,
  onLearningClick,
  demo = false,
  showSleepNudge = false,
  onDismissSleepNudge,
}) {
  const hourlyPending = !hourlyDone;

  const sleepCopy = showSleepNudge
    ? getSleepNudgeCopy(bn ? 'bn' : 'en', hourlyDone)
    : null;
  const mins = Math.max(0, Number(waitMinutes) || 0);
  const waitChip = bn ? `${mins}মি` : `${mins}m`;

  const HourlyTag = demo ? 'div' : 'button';
  const LearningTag = demo ? 'div' : 'button';

  const playIcon = (
    <svg className="home-3d-tile__glyph" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
      />
      <path
        fill="#fff"
        d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"
      />
    </svg>
  );

  const bookIcon = (
    <svg className="home-3d-tile__glyph" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"
      />
    </svg>
  );

  return (
    <div className={demo ? 'pointer-events-none select-none' : 'contents'}>
      <div className={`home-3d-row home-cta-stack${sleepCopy ? ' home-cta-stack--sleep' : ''}`}>
        <HourlyTag
          type={demo ? undefined : 'button'}
          onClick={demo ? undefined : onHourlyClick}
          className={`home-3d-tile home-3d-tile--quiz${hourlyPending ? ' is-live' : ''}${hourlyDone ? ' is-done' : ''}`}
          aria-label={
            hourlyDone
              ? sleepCopy
                ? bn
                  ? 'ঘুমানোর সময়। পরের কুইজ সকালে।'
                  : 'Time to sleep. Next quiz in the morning.'
                : bn
                  ? `পরের কুইজ ${waitChip} পরে`
                  : `Next quiz in ${waitChip}`
              : bn
                ? `ঘণ্টার কুইজ ${hourLabel} ${pointsLabel}`
                : `Hourly quiz ${hourLabel} ${pointsLabel}`
          }
        >
          <span className="home-3d-tile__icon" aria-hidden>
            {playIcon}
            {hourlyPending && (
              <span className="home-hourly-cta__live">
                <span className="home-hourly-cta__live-ping" />
                <span className="home-hourly-cta__live-dot" />
              </span>
            )}
            <span className={`home-3d-tile__chip ${bn ? 'font-bengali' : ''}`}>
              {hourlyPending ? pointsLabel : waitChip}
            </span>
          </span>
          <span className={`home-3d-tile__label ${bn ? 'font-bengali' : ''}`}>
            {bn ? 'কুইজ' : 'Quiz'}
          </span>
        </HourlyTag>

        <LearningTag
          type={demo ? undefined : 'button'}
          onClick={demo ? undefined : onLearningClick}
          className="home-3d-tile home-3d-tile--learn"
          aria-label={bn ? 'পাঠ' : 'Learn'}
        >
          <span className="home-3d-tile__icon" aria-hidden>
            {bookIcon}
          </span>
          <span className={`home-3d-tile__label ${bn ? 'font-bengali' : ''}`}>
            {bn ? 'পাঠ' : 'Learn'}
          </span>
        </LearningTag>

        {sleepCopy ? (
          <div className="home-sleep-cover" role="status" aria-live="polite">
            <div className="home-sleep-nudge">
              <span className="home-sleep-nudge__moon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 14.5A8.5 8.5 0 0110.5 4 7 7 0 1019 15.4 8.4 8.4 0 0121 14.5z" />
                </svg>
              </span>
              <span className="home-sleep-nudge__copy">
                <span className={`home-sleep-nudge__title ${bn ? 'font-bengali' : ''}`}>
                  {sleepCopy.title}
                </span>
                <span className={`home-sleep-nudge__body ${bn ? 'font-bengali' : ''}`}>
                  {sleepCopy.body}
                </span>
              </span>
              {demo ? (
                <span className={`home-sleep-nudge__ok ${bn ? 'font-bengali' : ''}`}>
                  {sleepCopy.dismiss}
                </span>
              ) : (
                <button
                  type="button"
                  className={`home-sleep-nudge__ok ${bn ? 'font-bengali' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof onDismissSleepNudge === 'function') onDismissSleepNudge();
                  }}
                >
                  {sleepCopy.dismiss}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
