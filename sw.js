const APP_VERSION = '1.0.0';
const CACHE_NAME = `bike-manager-cache-v${APP_VERSION}`;

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        APP_SHELL_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset);
          } catch (error) {
            console.warn('[SW] Failed to cache asset:', asset, error);
          }
        })
      );
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()))
      );
      await self.clients.claim();
      // Notify clients of update
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED', version: APP_VERSION });
      });
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isNavigate = event.request.mode === 'navigate';
  const isSameOrigin = requestUrl.origin === self.location.origin;

  // Network-first for index.html (always get latest)
  if (isNavigate || requestUrl.pathname === '/index.html' || requestUrl.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && isSameOrigin) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('./index.html') || await caches.match('./');
          return cached || Response.error();
        })
    );
    return;
  }

  // Stale-while-revalidate for other assets
  if (isSameOrigin) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(event.request);
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)).catch(() => {});
          }
          return response;
        }).catch(() => null);
        
        return cachedResponse || (await fetchPromise) || Response.error();
      })()
    );
    return;
  }

  // For external resources (fonts, etc.), try network first
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(cached => cached || Response.error());
    })
  );
});

