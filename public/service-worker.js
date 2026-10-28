/**
 * SADG PWA Service Worker
 * Cache Strategy: Cache-First for static assets, Network-First fallback, Offline page for navigation
 * Cache Name: sadg-v2
 */

const CACHE_NAME = 'sadg-v2';

// Pre-cache core application shell and offline assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png'
];

/**
 * Install Event:
 * Precaches the core shell and activates immediately via skipWaiting()
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      // Activate immediately without waiting for existing clients to close
      return self.skipWaiting();
    }).catch((error) => {
      console.error('[SW] Precaching failed during install:', error);
    })
  );
});

/**
 * Activate Event:
 * Deletes older cache versions (like sadg-v1) and claims active clients right away
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((existingCache) => {
          if (existingCache !== CACHE_NAME) {
            console.log('[SW] Purging old cache version:', existingCache);
            return caches.delete(existingCache);
          }
        })
      );
    }).then(() => {
      // Take control of all open client tabs immediately
      return self.clients.claim();
    })
  );
});

/**
 * Fetch Event:
 * Cache-First strategy for static assets.
 * For navigation (HTML page) requests, if network fails, fallback to cached /offline.html
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle HTML document navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // Cache-First strategy for static assets, scripts, styles, icons, fonts
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((fetchError) => {
        console.warn('[SW] Fetch failed for:', request.url, fetchError);
      });
    })
  );
});
