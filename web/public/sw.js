/* EduDash Pro Service Worker - PWA Support */
const CACHE_NAME = 'edudash-pro-v1.0.0';
const OFFLINE_URL = '/offline.html';
const STATIC_CACHE = 'edudash-static-v1';
const RUNTIME_CACHE = 'edudash-runtime-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll([
          OFFLINE_URL,
          '/manifest.json',
          '/manifest.webmanifest',
          '/icon-192.png',
          '/icon-512.png',
        ]);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => !currentCaches.includes(cacheName))
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network strategies based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension and devtools requests
  if (request.url.startsWith('chrome-extension://') || request.url.includes('chrome-devtools://')) {
    return;
  }

  // Network-first for HTML navigation (app shell pattern)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline - try cache, then offline page
          return caches.match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
            .then((response) => response || Response.error());
        })
    );
    return;
  }

  const url = new URL(request.url);
  const dest = request.destination;

  // Cache-first for static assets (images, fonts)
  if (dest === 'image' || dest === 'font') {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for scripts, styles
  if (dest === 'script' || dest === 'style') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Network-first for API calls and other requests
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
        .then((response) => response || Response.error())
    );
    return;
  }
});
