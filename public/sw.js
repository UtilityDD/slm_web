const CACHE_NAME = 'smartlineman-v3';
const RUNTIME_CACHE = 'smartlineman-runtime';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/icon-192.png',
    '/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - network first for API/auth, cache for static
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // ALWAYS bypass cache for:
    // 1. Non-GET requests (POST, PUT, DELETE)
    // 2. Supabase auth/API calls
    // 3. Chrome extensions
    // 4. Quiz JSON files (need fresh data)
    if (
        request.method !== 'GET' ||
        url.hostname.includes('supabase') ||
        url.protocol === 'chrome-extension:' ||
        url.pathname.includes('auth') ||
        url.pathname.includes('signOut')
    ) {
        // IMPORTANT: Don't cache, don't interfere - let browser handle
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(JSON.stringify({ error: 'Network error' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // For static assets (fonts, images, CSS, JS) - Cache first
    if (
        request.destination === 'image' ||
        request.destination === 'font' ||
        request.destination === 'style' ||
        request.destination === 'script' ||
        url.pathname.match(/\.(png|jpg|jpeg|svg|gif|woff|woff2|ttf|css|js)$/)
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                return cached || fetch(request).then((response) => {
                    // Only cache successful responses
                    if (response && response.status === 200) {
                        return caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, response.clone());
                            return response;
                        });
                    }
                    return response;
                });
            }).catch(() => {
                return new Response('Offline', { status: 503 });
            })
        );
        return;
    }

    // For everything else (HTML, other resources) - Network first with cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Only cache successful responses
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache if network fails
                return caches.match(request).then((cached) => {
                    return cached || new Response('Offline', { status: 503 });
                });
            })
    );
});
