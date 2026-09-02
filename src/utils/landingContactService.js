/**
 * Browser → Google Apps Script web app (no Vercel env needed).
 * Redeploy the Apps Script after updating scripts/google-apps-script-landing-contact.js
 */
import wbLocations from '../data/wb_locations.json';

export const LANDING_CONTACT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzaEyBRGIfjuOi1XPUZtkeHKW24nisakmjuhPjmOGTxebmrdhI8H0AG4O_XvbA2PPvO/exec';

const TOPIC_LABELS = {
  join: { en: 'Want to join SmartLineman', bn: 'স্মার্ট লাইনম্যানে যোগ দিতে চাই' },
  correction: { en: 'Content correction', bn: 'পাঠের ভুল সংশোধন' },
  training: { en: 'Expert online training', bn: 'অনলাইন প্রশিক্ষণ দেওয়া' },
  prize_sponsor: { en: 'Direct prize sponsorship', bn: 'সরাসরি পুরস্কার দেওয়া' },
  advertise: { en: 'Advertise with us', bn: 'বিজ্ঞাপন দিতে চাই' },
  other: { en: 'Other', bn: 'অন্যান্য' },
};

const WB_DISTRICTS = new Set(Object.keys(wbLocations || {}));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const NAME_MAX = 120;
const EMAIL_MAX = 120;
const MESSAGE_MIN = 8;
const MESSAGE_MAX = 4000;

function trimStr(v, max = 2000) {
  return String(v || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);
}

/** Bengali / Arabic-Indic digits → 0-9 */
export function toLatinDigits(value) {
  return String(value || '').replace(/[\u09E6-\u09EF\u0660-\u0669]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x09e6 && code <= 0x09ef) return String(code - 0x09e6);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return ch;
  });
}

/** Up to 10 Indian mobile digits. Strips +91 / 0 when pasted. */
export function extractIndianMobileDigits(raw) {
  let digits = toLatinDigits(raw).replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length >= 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function formatIndianMobileMask(raw) {
  const digits = extractIndianMobileDigits(raw);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function isValidIndianMobile(raw) {
  return MOBILE_RE.test(extractIndianMobileDigits(raw));
}

export function maskEmailInput(raw) {
  return toLatinDigits(raw).replace(/\s+/g, '').toLowerCase().slice(0, EMAIL_MAX);
}

export function isValidEmail(raw) {
  return EMAIL_RE.test(maskEmailInput(raw));
}

export function normalizeLandingName(raw) {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

function isUsableName(name) {
  if (!name || name.length < 2) return false;
  if (/^[\d\s.'’\-_,/]+$/.test(name)) return false;
  return true;
}

/**
 * Shared landing-form rules.
 * `errors.phone` / `errors.email` = format. `errors.contact` = both left empty.
 */
export function validateLandingContact({ name, phone, email, district, topic, message } = {}) {
  const errors = {};
  const cleanName = normalizeLandingName(name);
  const cleanPhone = extractIndianMobileDigits(phone);
  const cleanEmail = maskEmailInput(email);
  const cleanDistrictRaw = trimStr(district, 80);
  const cleanDistrict = WB_DISTRICTS.has(cleanDistrictRaw) ? cleanDistrictRaw : '';
  const cleanTopic = trimStr(topic, 40) || 'other';
  const cleanMessage = trimStr(message, MESSAGE_MAX);

  if (!isUsableName(cleanName)) errors.name = 'NAME';

  if (cleanPhone && !isValidIndianMobile(cleanPhone)) errors.phone = 'PHONE';
  if (cleanEmail && !isValidEmail(cleanEmail)) errors.email = 'EMAIL';

  const hasValidPhone = isValidIndianMobile(cleanPhone);
  const hasValidEmail = isValidEmail(cleanEmail);
  if (!hasValidPhone && !hasValidEmail && !cleanPhone && !cleanEmail) {
    errors.contact = 'CONTACT';
  }

  if (!cleanMessage || cleanMessage.length < MESSAGE_MIN) errors.message = 'MESSAGE';

  if (!TOPIC_LABELS[cleanTopic]) errors.topic = 'TOPIC';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    values: {
      name: cleanName,
      phone: hasValidPhone ? cleanPhone : '',
      email: hasValidEmail ? cleanEmail : '',
      district: cleanDistrict,
      topic: TOPIC_LABELS[cleanTopic] ? cleanTopic : 'other',
      message: cleanMessage,
    },
  };
}

function topicLabel(topic, language) {
  const row = TOPIC_LABELS[topic] || TOPIC_LABELS.other;
  return language === 'bn' ? row.bn : row.en;
}

function buildFormattedMessage({ name, phone, email, district, topic, message, language }) {
  const when = new Date().toISOString();
  const topicText = topicLabel(topic, language);
  return [
    '══════════════════════════════════',
    '  SmartLineman.in — Contact message',
    '══════════════════════════════════',
    `Time (UTC): ${when}`,
    `Language: ${language === 'bn' ? 'Bangla' : 'English'}`,
    `Topic: ${topicText}`,
    '',
    `Name: ${name}`,
    `Phone: ${phone || '—'}`,
    `Email: ${email || '—'}`,
    `District: ${district || '—'}`,
    '',
    'Message:',
    message,
    '──────────────────────────────────',
  ].join('\n');
}

/**
 * Validate + send contact payload to Apps Script.
 * Uses text/plain + no-cors so the browser can POST without a server proxy.
 */
export async function submitLandingContact({
  name,
  phone,
  email,
  district,
  topic,
  message,
  language,
  website,
}) {
  // Honeypot — pretend success for bots
  if (trimStr(website, 80)) {
    return { ok: true };
  }

  const lang = language === 'en' ? 'en' : 'bn';
  const { ok, errors, values } = validateLandingContact({
    name,
    phone,
    email,
    district,
    topic,
    message,
  });

  if (!ok) {
    const code = errors.name
      ? 'NAME'
      : errors.message
        ? 'MESSAGE'
        : errors.phone
          ? 'PHONE'
          : errors.email
            ? 'EMAIL'
            : errors.contact
              ? 'CONTACT'
              : errors.topic
                ? 'TOPIC'
                : 'INVALID';
    return { ok: false, code, errors };
  }

  const { name: cleanName, phone: cleanPhone, email: cleanEmail, district: cleanDistrict, topic: cleanTopic, message: cleanMessage } =
    values;

  const payload = {
    timestamp: new Date().toISOString(),
    name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
    district: cleanDistrict,
    topic: cleanTopic,
    topicLabel: topicLabel(cleanTopic, lang),
    message: cleanMessage,
    language: lang,
    formatted: buildFormattedMessage({
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      district: cleanDistrict,
      topic: cleanTopic,
      message: cleanMessage,
      language: lang,
    }),
    source: 'smartlineman-landing',
  };

  // Apps Script web apps often block readable CORS; no-cors still delivers the POST.
  await fetch(LANDING_CONTACT_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  return { ok: true };
}
