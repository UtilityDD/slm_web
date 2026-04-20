const CACHE_NAME = 'suraksha-sathi-v9';
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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use individual add to prevent one missing file from breaking the whole cache
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      ).then(results => {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          console.warn('Some assets failed to cache:', failed);
        }
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
