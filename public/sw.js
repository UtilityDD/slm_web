const CACHE_NAME = 'suraksha-sathi-v30-1.3.83-rank-rules-header';
const LOADER_IMAGES = [
  '/images/loader/helmet.webp',
  '/images/loader/goggles.webp',
  '/images/loader/gloves.webp',
  '/images/loader/rubber-gloves.webp',
  '/images/loader/vest.webp',
  '/images/loader/harness.webp',
  '/images/loader/safety-shoes.webp',
  '/images/loader/face-shield.webp',
  '/images/loader/lanyard.webp',
  '/images/loader/ladder.webp',
  '/images/loader/rope.webp',
  '/images/loader/cones.webp',
  '/images/loader/ball-chain.webp',
  '/images/loader/link-chain.webp',
  '/images/loader/caution-tape.webp',
];
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  ...LOADER_IMAGES,
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
  '/audio/safety/clearance_request.wav',
  '/audio/safety/clearance_isolate.wav',
  '/audio/safety/clearance_ground.wav',
  '/audio/safety/clearance_brief.wav',
  '/audio/safety/clearance_work.wav',
  '/audio/safety/clearance_closeout.wav',
  '/audio/safety/clearance_reenergize.wav',
  '/audio/safety/clearance_done.wav',
  '/data/supplementary_modules.json',
  '/data/databook.json',
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

// Wait for the app to ask before activating, so users can choose "Reload".
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url))
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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

// --- Web Push (re-engagement). Additive; does not change cache/fetch behaviour. ---
self.addEventListener('push', (event) => {
  let payload = {
    title: 'SmartLineman',
    body: 'এই মাসের পুরস্কার মিস করবেন না — আজই খেলুন।',
    url: '/',
  };

  try {
    if (event.data) {
      const data = event.data.json();
      payload = { ...payload, ...data };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) payload.body = text;
    } catch {
      /* use defaults */
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'SmartLineman', {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url || '/' },
      tag: payload.tag || 'slm-reengagement',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* ignore navigate failures */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
