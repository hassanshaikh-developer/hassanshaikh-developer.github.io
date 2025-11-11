const VERSION = '1.0.0';
const CACHE_NAME = `bike-manager-v${VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (error) {
            console.warn('[SW] Failed to cache:', url, error);
          }
        })
      );
    })
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// Fetch - network first for HTML, cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  const isNavigate = request.mode === 'navigate';
  const isAsset = url.pathname.includes('/icons/') || url.pathname.endsWith('.png');
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    // External resources - network only
    event.respondWith(fetch(request));
    return;
  }

  if (isNavigate) {
    // HTML pages - network first, fallback to cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed, try cache
          const cached = await caches.match(request);
          if (cached) return cached;

          // Fallback to index.html
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;

          // Last resort - return error
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        })
    );
  } else if (isAsset) {
    // Static assets - cache first, fallback to network
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
  } else {
    // Other same-origin requests - stale-while-revalidate
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });

        return cached || fetchPromise;
      })
    );
  }
});

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync (optional for future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Placeholder for background sync logic
      Promise.resolve()
    );
  }
});
