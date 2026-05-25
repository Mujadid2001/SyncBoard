/**
 * Service Worker - Offline Support
 * 
 * Implements caching strategy, network interception, and offline mode.
 * Uses Cache API and Fetch interception.
 */

const CACHE_NAME = 'syncboard-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/assets/main.css',
  '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
      console.error('Cache open failed:', err);
    })
  );

  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// Fetch event - network-first strategy
self.addEventListener('fetch', event => {
  const {request} = event;

  // Skip non-GET or WebSocket requests
  if (request.method !== 'GET' || request.url.startsWith('ws')) {
    return;
  }

  // Network-first strategy
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, cloned);
          });
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return offline page for navigation
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }

          // Return offline response
          return new Response(
            JSON.stringify({error: 'Offline - resource not available'}),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({'Content-Type': 'application/json'})
            }
          );
        });
      })
  );
});

// Message event - handle postMessage from clients
self.addEventListener('message', event => {
  console.log('SW message:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('Cache cleared');
    });
  }
});
