// Service Worker der Progressive Web App (wird von scripts/build-sw.mjs mit Version und Dateiliste befüllt).
// Startseite, Skripte und Schriften werden beim ersten Besuch gespeichert, weitere Seiten beim Aufruf; Seiten kommen
// immer zuerst aus dem Netz und nur ohne Netz aus dem Speicher – so funktionieren Website und Backstage auch offline (z. B. auf dem Gig).
const VERSION = '__VERSION__';
const CACHE = `bn-${VERSION}`;
const PRECACHE = __FILES__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bn-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Seitenaufrufe: immer erst das Netz (aktuelle Inhalte), offline die gespeicherte Fassung –
  // Backstage-Unterseiten bekommen die Backstage-Shell, die dann selbst zur Unterseite navigiert
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // umgeleitete Antworten (z. B. /galerie → /galerie/) dürfen später nicht für Seitenaufrufe verwendet werden
          if (res.ok && !res.redirected) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          const backstage = url.pathname.startsWith('/backstage');
          const slash = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
          return (
            (await cache.match(req, { ignoreSearch: backstage })) ??
            (await cache.match(slash)) ??
            (backstage ? await cache.match('/backstage/index.html') : undefined) ??
            (await cache.match('/'))
          );
        }),
    );
    return;
  }

  // Dateien mit Hash im Namen ändern sich nie: aus dem Speicher, sonst laden und merken.
  // Alles andere (Bilder, Kalender, Daten): erst Netz, offline aus dem Speicher.
  const hashed = /-[A-Z0-9]{8}\.(js|css)$/.test(url.pathname) || url.searchParams.has('v');
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit && hashed) return hit;
      try {
        const res = await fetch(req);
        if (res.ok && !res.redirected) cache.put(req, res.clone());
        return res;
      } catch (err) {
        if (hit) return hit;
        throw err;
      }
    }),
  );
});
