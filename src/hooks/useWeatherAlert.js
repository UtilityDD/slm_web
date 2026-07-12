import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchWeatherAlert,
  shouldHideWeatherAlert,
  isWeatherAlertReminder,
  saveWeatherDismissState,
  msUntilWeatherReminder,
} from '../utils/weatherAlert';

/**
 * Weather alert hook for lineman safety based on profile district.
 * Dismiss hides for 90 min, then reminds if weather still bad (max 3/day).
 * Danger escalation (warning → danger) shows immediately.
 * @param {string|null} district - User's district from profile
 */
export function useWeatherAlert(district) {
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isReminder, setIsReminder] = useState(false);
  const reminderTimerRef = useRef(null);

  const syncVisibility = useCallback(
    (nextAlert) => {
      if (!nextAlert?.active || !district?.trim()) {
        setHidden(false);
        setIsReminder(false);
        return;
      }
      const hide = shouldHideWeatherAlert(district, nextAlert);
      setHidden(hide);
      setIsReminder(!hide && isWeatherAlertReminder(district, nextAlert));
    },
    [district]
  );

  const scheduleReminder = useCallback(
    (nextAlert) => {
      if (reminderTimerRef.current) {
        clearTimeout(reminderTimerRef.current);
        reminderTimerRef.current = null;
      }
      if (!nextAlert?.active || !district?.trim()) return;

      const waitMs = msUntilWeatherReminder(district);
      if (waitMs <= 0) return;

      reminderTimerRef.current = setTimeout(() => {
        syncVisibility(nextAlert);
      }, waitMs + 200);
    },
    [district, syncVisibility]
  );

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!district?.trim()) {
        setAlert(null);
        setHidden(false);
        setIsReminder(false);
        return;
      }
      setLoading(true);
      try {
        const result = await fetchWeatherAlert(district, { forceRefresh });
        setAlert(result);
        syncVisibility(result);
        scheduleReminder(result);
      } finally {
        setLoading(false);
      }
    },
    [district, syncVisibility, scheduleReminder]
  );

  useEffect(() => {
    load(false);
    return () => {
      if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
    };
  }, [load]);

  const dismiss = useCallback(() => {
    if (!district?.trim() || !alert?.active) return;
    saveWeatherDismissState(district, alert);
    setHidden(true);
    setIsReminder(false);
    scheduleReminder(alert);
  }, [district, alert, scheduleReminder]);

  const refresh = useCallback(() => load(true), [load]);

  const visible = !!(alert?.active && !hidden);

  return { alert, loading, visible, isReminder, dismiss, refresh };
}
