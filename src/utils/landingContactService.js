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
  other: { en: 'Other', bn: 'অন্যান্য' },
};

const WB_DISTRICTS = new Set(Object.keys(wbLocations || {}));

function trimStr(v, max = 2000) {
  return String(v || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);
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

  const cleanName = trimStr(name, 120);
  const cleanPhone = trimStr(phone, 40);
  const cleanEmail = trimStr(email, 120);
  const cleanDistrictRaw = trimStr(district, 80);
  const cleanDistrict = WB_DISTRICTS.has(cleanDistrictRaw) ? cleanDistrictRaw : '';
  const cleanTopic = trimStr(topic, 40) || 'other';
  const cleanMessage = trimStr(message, 4000);
  const lang = language === 'en' ? 'en' : 'bn';

  if (!cleanName || cleanName.length < 2) {
    return { ok: false, code: 'NAME', error: 'Name is required.' };
  }
  if (!cleanMessage || cleanMessage.length < 8) {
    return { ok: false, code: 'MESSAGE', error: 'Message is too short.' };
  }
  if (!cleanPhone && !cleanEmail) {
    return { ok: false, code: 'CONTACT', error: 'Phone or email is required.' };
  }
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, code: 'EMAIL', error: 'Invalid email.' };
  }
  if (!TOPIC_LABELS[cleanTopic]) {
    return { ok: false, code: 'TOPIC', error: 'Invalid topic.' };
  }

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
