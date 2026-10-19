// Service Worker für den Backstage-Bereich (wird von scripts/build-sw.mjs mit Version und Dateiliste befüllt).
// Registriert nur, wenn jemand den Backstage-Bereich öffnet – danach funktionieren Backstage, Setlist,
// Packliste und Vor-Ort-Angaben auch ohne Netz (z. B. auf dem Gig im Keller).
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
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match(req, { ignoreSearch: url.pathname.startsWith('/backstage') })) ??
            (url.pathname.startsWith('/backstage') ? await cache.match('/backstage/index.html') : undefined) ??
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
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        if (hit) return hit;
        throw err;
      }
    }),
  );
});
