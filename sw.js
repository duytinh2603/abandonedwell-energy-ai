/* Offline support: cache the app shell; data never leaves the browser (projects live in IndexedDB). */
const CACHE = 'abandonedwell-v12';
const SHELL = [
  './', 'index.html', 'css/style.css',
  'js/vendor/chart.umd.min.js', 'js/i18n.js', 'js/model.js', 'js/las.js', 'js/utilization.js', 'js/tech.js', 'js/ml.js', 'js/guide.js', 'js/sync.js', 'js/app.js', 'data/volve.json',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// network first (always fresh when online), cache as fallback (offline)
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return;
  e.respondWith(
    // revalidate with the server every time (no stale HTTP cache), fall back to the offline copy
    fetch(e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(e.request, { cache: 'no-cache' })).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match('index.html')))
  );
});
