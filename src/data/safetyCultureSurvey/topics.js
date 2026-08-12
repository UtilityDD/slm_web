/** Fixed topic set for quarterly safety-culture waves (v1). */
export const ITEM_SET_VERSION = 'v1';

export const SAFETY_CULTURE_TOPICS = [
  { id: 'ppe', label_bn: 'পিপিই', label_en: 'PPE' },
  { id: 'height', label_bn: 'উচ্চতায় কাজ', label_en: 'Work at height' },
  { id: 'clearance', label_bn: 'ক্লিয়ারেন্স / পিটিডব্লিউ', label_en: 'Clearance / PTW' },
  { id: 'earthing', label_bn: 'ডিসচার্জ ও আর্থিং', label_en: 'Discharge & earthing' },
  { id: 'approach', label_bn: 'লাইনে কাছে যাওয়া', label_en: 'Safe approach' },
  { id: 'stop_work', label_bn: 'কাজ থামানোর অধিকার', label_en: 'Stop-work' },
  { id: 'reporting', label_bn: 'ভুল ও নিয়ার-মিস জানানো', label_en: 'Reporting' },
  { id: 'tools', label_bn: 'টুল ও ডিসচার্জ রড', label_en: 'Tools & discharge rod' },
];

export const TOPIC_BY_ID = Object.fromEntries(
  SAFETY_CULTURE_TOPICS.map((t) => [t.id, t])
);

export const MAX_OPTION_SCORE = 3;
