// Cache-first service worker. VERSION is stamped by bump-version.sh, so sw.js itself changes on
// every deploy (the browser always re-fetches sw.js, bypassing the HTTP cache). Each deploy then
// installs a fresh cache and the old one is deleted on activate.
const VERSION = "2026-11-02T01:01:49Z"; // stamped by bump-version.sh

const CACHE = 'litime-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './version.js',
  './manifest.webmanifest',
  './vendor/bootstrap.min.css',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // cache:'reload' bypasses the HTTP cache (GitHub Pages sends max-age=600)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('litime-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) {
        return hit;
      }
      return fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});
