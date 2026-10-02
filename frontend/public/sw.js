const CACHE_NAME = 'rental-management-platform-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];
const isApiRequest = (request) => {
  const url = new URL(request.url);
  return (
    url.origin !== self.location.origin ||
    url.pathname === '/api' ||
    url.pathname.startsWith('/api/')
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.keys().then((requests) =>
        Promise.all(
          requests
            .filter(isApiRequest)
            .map((request) => cache.delete(request)),
        ),
      ),
    ).then(() =>
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (isApiRequest(event.request)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      });
    }),
  );
});
