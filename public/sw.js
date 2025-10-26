/**
 * Service Worker for EduDash Pro PWA
 * 
 * SECURITY CRITICAL: This SW explicitly excludes protected routes from caching.
 * - Protected routes (dashboards, student data, etc.) are NEVER cached
 * - Only public marketing pages and static assets are cached
 * - Supabase endpoints are NEVER cached (always network-first)
 * 
 * Cache Strategy:
 * - Static assets (manifest, icons): cache-first
 * - Marketing pages: stale-while-revalidate
 * - Protected routes: network-only (no caching)
 * - Cross-origin (Supabase, APIs): network-only (no caching)
 */

const CACHE_NAME = 'edudash-static-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
];

// Install: Pre-cache minimal shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate: Take control and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Handle requests with security-first caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // SECURITY: Skip cross-origin requests (Supabase, external APIs)
  // These must always go to network for real-time data and auth
  if (url.origin !== self.location.origin) {
    return; // Network-only for all external requests
  }

  // SECURITY: Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    return; // Network-only for mutations
  }

  // SECURITY CRITICAL: NEVER cache protected routes
  // These contain user data and must always be fresh from server
  const protectedPatterns = [
    '/(parent)',
    '/(teacher)',
    '/(principal)',
    '/dashboard',
    '/screens/',
    '/students',
    '/teachers',
    '/classes',
    '/assignments',
    '/messages',
    '/reports',
    '/settings',
    '/profile',
    '/account',
  ];

  const isProtected = protectedPatterns.some(pattern => 
    url.pathname.startsWith(pattern)
  );

  if (isProtected) {
    console.log('[SW] Protected route - network only:', url.pathname);
    return; // Network-only for protected routes
  }

  // Auth routes should not be cached
  if (url.pathname.startsWith('/(auth)') || url.pathname.includes('/sign-')) {
    return; // Network-only for auth flows
  }

  // Strategy 1: Cache-first for static assets (icons, manifest)
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) {
            console.log('[SW] Cache hit (static):', url.pathname);
            return cached;
          }
          
          // Not in cache, fetch and cache
          return fetch(event.request)
            .then((response) => {
              // Only cache successful responses
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, responseClone));
              }
              return response;
            })
            .catch((error) => {
              console.error('[SW] Fetch failed for static asset:', url.pathname, error);
              throw error;
            });
        })
    );
    return;
  }

  // Strategy 2: Stale-while-revalidate for marketing pages
  // Returns cached version immediately while fetching fresh copy in background
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            // Only cache successful responses
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseClone))
                .catch((error) => console.warn('[SW] Cache put failed:', error));
            }
            return response;
          })
          .catch((error) => {
            console.warn('[SW] Network fetch failed, using cache:', url.pathname);
            // If network fails and we have cache, return it
            if (cached) return cached;
            throw error;
          });

        // Return cached immediately, but update in background
        return cached || fetchPromise;
      })
  );
});

// Message handler for cache management (optional, for future use)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[SW] Service worker loaded');
