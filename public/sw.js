const CACHE_NAME = 'suraksha-sathi-v21-neural';
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
  '/audio/safety/alert_done.wav'
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
