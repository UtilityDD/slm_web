import districtCoords from '../data/district_coords.json';

const CACHE_PREFIX = 'slm_weather_alert_';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const FORECAST_HOURS = 12;
const LOOKAHEAD_HOURS = 6;

/** After dismiss, hide banner for this long before reminding (if weather still bad). */
export const WEATHER_DISMISS_COOLDOWN_MS = 90 * 60 * 1000; // 90 minutes
/** Max dismiss-and-remind cycles per calendar day (IST date). */
export const WEATHER_MAX_DISMISSALS_PER_DAY = 3;

const DISMISS_STORAGE_PREFIX = 'slm_weather_dismiss_';

/** WMO weather codes for thunderstorms */
const THUNDERSTORM_CODES = new Set([95, 96, 99]);

const THRESHOLDS = {
  rainMm: 5,
  rainProb: 70,
  rainProbMinMm: 2,
  windKmh: 40,
};

export function getDistrictCoords(district) {
  if (!district || typeof district !== 'string') return null;
  return districtCoords[district.trim()] || null;
}

function cacheKey(district) {
  return `${CACHE_PREFIX}${district.trim().toLowerCase()}`;
}

function readCache(district) {
  try {
    const raw = localStorage.getItem(cacheKey(district));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.alert || !parsed?.fetchedAt) return null;
    const age = Date.now() - parsed.fetchedAt;
    if (age > CACHE_TTL_MS) return { ...parsed.alert, stale: true, cacheAgeMs: age };
    return { ...parsed.alert, stale: false, cacheAgeMs: age };
  } catch {
    return null;
  }
}

function writeCache(district, alert) {
  try {
    localStorage.setItem(
      cacheKey(district),
      JSON.stringify({ alert, fetchedAt: Date.now() })
    );
  } catch {
    // ignore quota errors
  }
}

function isThunderstormCode(code) {
  return THUNDERSTORM_CODES.has(Number(code));
}

/**
 * Evaluate hourly forecast arrays for bad weather in the next LOOKAHEAD_HOURS.
 */
export function evaluateForecast(hourly, district) {
  const slice = LOOKAHEAD_HOURS;
  const precip = (hourly.precipitation || []).slice(0, slice);
  const precipProb = (hourly.precipitation_probability || []).slice(0, slice);
  const windGusts = (hourly.wind_gusts_10m || []).slice(0, slice);
  const weatherCodes = (hourly.weather_code || []).slice(0, slice);

  const totalRainMm = precip.reduce((sum, v) => sum + (Number(v) || 0), 0);
  const maxWindKmh = Math.max(0, ...windGusts.map((v) => Number(v) || 0));
  const hasThunderstorm = weatherCodes.some(isThunderstormCode);
  const heavyRainByAmount = totalRainMm >= THRESHOLDS.rainMm;
  const heavyRainByProb = precip.some(
    (mm, i) =>
      (Number(precipProb[i]) || 0) >= THRESHOLDS.rainProb &&
      (Number(mm) || 0) >= THRESHOLDS.rainProbMinMm
  );
  const highWind = maxWindKmh >= THRESHOLDS.windKmh;

  const reasons = [];
  if (heavyRainByAmount || heavyRainByProb) reasons.push('rain');
  if (highWind) reasons.push('wind');
  if (hasThunderstorm) reasons.push('thunderstorm');

  if (reasons.length === 0) {
    return {
      active: false,
      district,
      reasons: [],
      totalRainMm,
      maxWindKmh,
      hoursAhead: LOOKAHEAD_HOURS,
    };
  }

  const level = hasThunderstorm || totalRainMm >= 15 || maxWindKmh >= 55 ? 'danger' : 'warning';

  return {
    active: true,
    level,
    district,
    reasons,
    totalRainMm: Math.round(totalRainMm * 10) / 10,
    maxWindKmh: Math.round(maxWindKmh),
    hoursAhead: LOOKAHEAD_HOURS,
  };
}

async function fetchFromApi(lat, lon, district) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'precipitation,precipitation_probability,wind_gusts_10m,weather_code',
    forecast_hours: String(FORECAST_HOURS),
    timezone: 'Asia/Kolkata',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather API ${res.status}`);
  const data = await res.json();
  const alert = evaluateForecast(data.hourly || {}, district);
  alert.fetchedAt = new Date().toISOString();
  return alert;
}

/**
 * Fetch weather alert for a district. Uses localStorage cache; returns stale cache on network failure.
 */
export async function fetchWeatherAlert(district, { forceRefresh = false } = {}) {
  if (!district?.trim()) return null;

  const coords = getDistrictCoords(district);
  if (!coords) return null;

  const cached = readCache(district);
  if (cached && !forceRefresh && !cached.stale) {
    return cached;
  }

  if (!navigator.onLine) {
    if (cached) return { ...cached, offline: true };
    return null;
  }

  try {
    const alert = await fetchFromApi(coords.lat, coords.lon, district.trim());
    writeCache(district, alert);
    return alert;
  } catch (err) {
    console.warn('[weatherAlert] fetch failed:', err);
    if (cached) return { ...cached, stale: true, fetchError: true };
    return null;
  }
}

export function getAlertMessages(alert, language = 'en', { isReminder = false } = {}) {
  if (!alert?.active) return null;

  const isBn = language === 'bn';
  const district = alert.district || '';
  const hours = alert.hoursAhead || LOOKAHEAD_HOURS;

  const reasonParts = [];
  if (alert.reasons.includes('thunderstorm')) {
    reasonParts.push(isBn ? 'বজ্রবৃষ্টি' : 'thunderstorms');
  }
  if (alert.reasons.includes('rain')) {
    reasonParts.push(isBn ? 'ভারী বৃষ্টি' : 'heavy rain');
  }
  if (alert.reasons.includes('wind')) {
    reasonParts.push(isBn ? 'প্রবল বাতাস' : 'strong winds');
  }

  const reasonText = reasonParts.join(isBn ? ', ' : ', ');
  const title = isReminder
    ? isBn
      ? `🔔 স্মরণ — আবহাওয়া সতর্কতা — ${district}`
      : `🔔 Reminder — Weather alert — ${district}`
    : isBn
      ? `⚠️ আবহাওয়া সতর্কতা — ${district}`
      : `⚠️ Weather alert — ${district}`;

  const body = isBn
    ? `আগামী ${hours} ঘণ্টায় ${reasonText} এর সম্ভাবনা। খুঁটি/পোলে কাজ করবেন না — নিরাপদ স্থানে অপেক্ষা করুন।`
    : `${reasonText} expected in the next ${hours} hours. Avoid pole/line work — wait in a safe place.`;

  return { title, body };
}

function dismissStorageKey(district) {
  return `${DISMISS_STORAGE_PREFIX}${district.trim().toLowerCase()}`;
}

function todayDateKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function readWeatherDismissState(district) {
  if (!district?.trim()) return null;
  try {
    const raw = localStorage.getItem(dismissStorageKey(district));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.dismissedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWeatherDismissState(district, alert) {
  if (!district?.trim()) return;
  const dateKey = todayDateKey();
  const prev = readWeatherDismissState(district);
  const dismissCount =
    prev?.dateKey === dateKey ? (prev.dismissCount || 0) + 1 : 1;
  try {
    localStorage.setItem(
      dismissStorageKey(district),
      JSON.stringify({
        dismissedAt: Date.now(),
        levelAtDismiss: alert?.level || 'warning',
        dismissCount,
        dateKey,
      })
    );
  } catch {
    // ignore quota errors
  }
}

/**
 * Whether the banner should stay hidden after dismiss.
 * Returns false (show) when cooldown expired, danger escalated, or first view.
 */
export function shouldHideWeatherAlert(district, alert) {
  if (!alert?.active || !district?.trim()) return false;

  const state = readWeatherDismissState(district);
  if (!state) return false;

  // Warning → danger: show immediately even if recently dismissed
  if (alert.level === 'danger' && state.levelAtDismiss === 'warning') {
    return false;
  }

  const dateKey = todayDateKey();
  const dismissCount = state.dateKey === dateKey ? state.dismissCount || 0 : 0;
  if (dismissCount >= WEATHER_MAX_DISMISSALS_PER_DAY) {
    return true;
  }

  const elapsed = Date.now() - state.dismissedAt;
  return elapsed < WEATHER_DISMISS_COOLDOWN_MS;
}

export function isWeatherAlertReminder(district, alert) {
  if (!alert?.active || !district?.trim()) return false;
  if (shouldHideWeatherAlert(district, alert)) return false;
  const state = readWeatherDismissState(district);
  if (!state || (state.dismissCount || 0) === 0) return false;
  // Escalation is urgent — use danger title, not reminder wording
  if (alert.level === 'danger' && state.levelAtDismiss === 'warning') return false;
  const elapsed = Date.now() - state.dismissedAt;
  return elapsed >= WEATHER_DISMISS_COOLDOWN_MS;
}

/** Ms until cooldown ends; 0 if already elapsed or no dismiss state. */
export function msUntilWeatherReminder(district) {
  const state = readWeatherDismissState(district);
  if (!state?.dismissedAt) return 0;
  return Math.max(0, WEATHER_DISMISS_COOLDOWN_MS - (Date.now() - state.dismissedAt));
}
