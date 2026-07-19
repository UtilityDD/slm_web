import { WEBSITE_URL } from '../config';

/** Professional WhatsApp invite — learn while playing, prizes, become smart. */
export function buildLinemanInviteMessage(language = 'bn') {
  const link = (WEBSITE_URL || 'https://smartlineman.in').replace(/\/$/, '');

  if (language === 'en') {
    return [
      '⚡ *SMARTLINEMAN.IN*',
      '_A special invitation for linemen_',
      '',
      '🎯 Learn through play',
      '🏆 Earn prizes while learning',
      '💡 Build skills. Become smarter. Stay safer.',
      '',
      'Short safety lessons, quizzes and recognition—made for West Bengal linemen. Joining is free.',
      '',
      `👉 *Start here:* ${link}`,
    ].join('\n');
  }

  return [
    '⚡ *SMARTLINEMAN.IN*',
    '_লাইনম্যানদের জন্য বিশেষ আমন্ত্রণ_',
    '',
    '🎯 খেলতে খেলতে শিখুন',
    '🏆 শিখতে শিখতে পুরস্কার পান',
    '💡 দক্ষতা বাড়ান, নিজেকে স্মার্ট বানান',
    '',
    'ছোট নিরাপত্তা পাঠ, কুইজ ও স্বীকৃতি—পশ্চিমবঙ্গের লাইনম্যানদের জন্য। যোগদান সম্পূর্ণ বিনামূল্যে।',
    '',
    `👉 *শুরু করুন:* ${link}`,
  ].join('\n');
}

/** Opens WhatsApp share sheet with the invite prefilled. */
export function openLinemanInviteWhatsApp(language = 'bn') {
  const text = buildLinemanInviteMessage(language);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
