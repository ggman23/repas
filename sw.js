/* Service worker : met le site en cache pour un usage hors-ligne
   (pratique pour la liste de courses en magasin). Les appels a
   l'API GitHub passent toujours par le reseau. */
const VERSION = 'v1';
const CACHE = 'mes-repas-' + VERSION;
const SHELL = [
  './', './index.html', './manifest.webmanifest', './assets/css/style.css',
  './assets/js/config.js', './assets/js/store.js', './assets/js/recipes-plan.js',
  './assets/js/ui.js', './assets/js/app.js', './data/recipes.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // laisse passer les PUT vers GitHub
  const url = new URL(req.url);
  if (url.hostname === 'api.github.com') return;     // donnees synchro : toujours reseau
  if (url.origin !== location.origin) return;        // ressources externes : non gerees

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
