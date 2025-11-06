/*
 * Service Worker for Bike Manager v8 (Refactored)
 * Caches app shell and CDNs for offline use.
 * FIXED: Added Chart.js to cache for offline analytics
 */
const CACHE_NAME = 'bike-manager-v8-cache';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './scripts/app.js',
  './scripts/sw.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2',
  'https://cdn.jsdelivr.net/npm/dexie@4.0.1/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  console.log('SW: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting()) // Activate immediately
      .catch(err => console.error('Cache install failed:', err))
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        // Clean up old caches
        cacheNames.filter(cacheName => cacheName.startsWith('bike-manager-') && cacheName !== CACHE_NAME)
        .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim()) // Take control of open pages
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  
  if (url.origin === 'https://cdn.jsdelivr.net' || 
      url.origin === 'https://fonts.googleapis.com' ||
      url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) return response;
          // Fallback to network and cache
          return fetch(event.request).then(fetchResponse => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            });
          });
        })
    );
  } 
  else if (event.request.url.endsWith(self.location.pathname) || event.request.url.endsWith('/')) {
     event.respondWith(
        // Network first for HTML to get updates
        fetch(event.request)
          .catch(() => caches.match(event.request))
     );
  }
  else if (url.hostname === 'api.github.com') {
    // Network only for API calls
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response(JSON.stringify({error: 'Offline'}), {
          status: 503,
          headers: {'Content-Type': 'application/json'}
        }))
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

