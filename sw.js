const CACHE_NAME = 'bike-manager-cache-v2';

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// CDN assets are NOT cached at install time to avoid CORS/network issues
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/lucide@0.452.0/dist/umd/lucide.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Only cache same-origin assets, skip external CDNs
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
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isGithubAPI = requestUrl.origin === 'https://api.github.com';
  const isNavigate = event.request.mode === 'navigate';
  const isCDN = CDN_ASSETS.some(asset => event.request.url.startsWith(asset));

  // GitHub API: Always try network
  if (isGithubAPI) {
    event.respondWith(
      fetch(event.request).catch(() => 
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // CDN requests: Network first, then cache
  if (isCDN) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            }).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          // Try cache as fallback
          return (await caches.match(event.request)) || Response.error();
        })
    );
    return;
  }

  // Same-origin and navigation: Cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Cache successful same-origin responses
          if (response.ok && requestUrl.origin === self.location.origin) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            }).catch(() => {});
          }

          return response;
        })
        .catch(async () => {
          // For navigation requests, fallback to index.html
          if (isNavigate) {
            return (await caches.match('./index.html')) || Response.error();
          }
          return Response.error();
        });
    })
  );
});

