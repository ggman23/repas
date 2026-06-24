/* Service worker.
   - Coquille de l'app (HTML/JS/CSS/JSON) : RESEAU d'abord, repli cache hors-ligne
     => on a toujours la derniere version quand on est en ligne.
   - Images : cache d'abord (pour rester visibles hors-ligne).
   - API GitHub : jamais touchee (toujours reseau direct). */
const VERSION = 'v9';
const CACHE = 'mes-repas-' + VERSION;
const IMG = 'mes-repas-img';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './assets/css/style.css',
  './assets/js/config.js', './assets/js/store.js', './assets/js/recipes-plan.js',
  './assets/js/photos.js', './assets/js/cooking.js', './assets/js/addrecipe.js',
  './assets/js/ui.js', './assets/js/app.js', './data/recipes.json',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMG).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // laisse passer les PUT vers GitHub
  const url = new URL(req.url);

  // Images (toutes origines) : cache d'abord, pour rester visibles hors-ligne.
  if (req.destination === 'image' || /\.(jpe?g|png|webp|gif)$/i.test(url.pathname)) {
    e.respondWith(caches.open(IMG).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch (err) { return hit || Response.error(); }
    }));
    return;
  }

  if (url.hostname === 'api.github.com') return;     // donnees synchro : toujours reseau
  if (url.origin !== location.origin) return;        // autres ressources externes : non gerees

  // Coquille de l'app : RESEAU d'abord, repli cache si hors-ligne.
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(
      r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())
    ))
  );
});
