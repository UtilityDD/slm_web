const CACHE_NAME = 'suraksha-sathi-v24-1.3.72';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/audio/safety/start.wav',
  '/audio/safety/oath_1.wav',
  '/audio/safety/check_items.wav',
  '/audio/safety/isolation_ready.wav',
  '/audio/safety/work_focus.wav',
  '/audio/safety/post_work_ready.wav',
  '/audio/safety/home_safe.wav',
  '/audio/safety/helmet.wav',
  '/audio/safety/gloves.wav',
  '/audio/safety/shoes.wav',
  '/audio/safety/rod.wav',
  '/audio/safety/ptw.wav',
  '/audio/safety/discharge.wav',
  '/audio/safety/ground_removed.wav',
  '/audio/safety/tools_counted.wav',
  '/audio/safety/site_clean.wav',
  '/audio/safety/permit_return.wav',
  '/audio/safety/barricade_removed.wav',
  '/audio/safety/alert_check.wav',
  '/audio/safety/alert_done.wav',
  '/data/supplementary_modules.json',
  '/quizzes/training_manifest.json',
  '/quizzes/lesson_10_1.json',
  '/quizzes/lesson_10_2.json',
  '/quizzes/lesson_10_3.json',
  '/quizzes/lesson_10_4.json',
  '/quizzes/lesson_10_5.json',
  '/quizzes/lesson_10_6.json',
  '/quizzes/lesson_10_7.json',
  '/quizzes/lesson_10_8.json',
  '/quizzes/lesson_10_9.json',
  '/quizzes/lesson_10_10.json',
  '/quizzes/lesson_10_11.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
