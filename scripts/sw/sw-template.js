// Service Worker der Progressive Web App (wird von scripts/build-sw.mjs mit Version und Dateiliste befüllt).
// Startseite, Skripte und Schriften werden beim ersten Besuch gespeichert, weitere Seiten beim Aufruf; Seiten kommen
// immer zuerst aus dem Netz und nur ohne Netz aus dem Speicher – so funktionieren Website und Backstage auch offline (z. B. auf dem Gig).
const VERSION = '__VERSION__';
const CACHE = `bn-${VERSION}`;
const PRECACHE = __FILES__;
// PDF-Anzeige (pdf.js) für Notenblätter im Backstage: eigener Speicher je pdf.js-Version, der Deploys übersteht –
// sonst wären die Noten nach jedem Update erst wieder mit Netz lesbar. Geladen wird pdf.js nur, wenn jemand Noten nutzt.
const PDFJS_CACHE = 'noten-pdfjs-__PDFJS__';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => (k.startsWith('bn-') && k !== CACHE) || (k.startsWith('noten-pdfjs-') && k !== PDFJS_CACHE)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Antwortseite der Microsoft-Anmeldung nie aus dem Speicher (die Antwort steht in der Adresse)
  if (url.pathname.startsWith('/auth/')) return;

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

  // pdf.js: aus dem eigenen Speicher, sonst laden und merken (die Dateien ändern sich nur mit der pdf.js-Version)
  if (url.pathname.startsWith('/pdfjs/')) {
    event.respondWith(
      caches.open(PDFJS_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && !res.redirected) cache.put(req, res.clone());
        return res;
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

// Übe-Erinnerung (src/app/data/erinnerung.ts): periodische Hintergrund-Prüfung (installierte App auf Android). Die
// Seite legt Einstellung und Fälligkeiten im Speicher „ueben-erinnerung“ ab; höchstens eine Meldung am Tag, ab der
// gewählten Stunde, nur wenn Karten fällig sind.
const ERINNERUNG_CACHE = 'ueben-erinnerung';
const ERINNERUNG_URL = '/__ueben-erinnerung.json';
self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'bn-ueben') return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ERINNERUNG_CACHE);
      const d = await (await cache.match(ERINNERUNG_URL))?.json().catch(() => null);
      if (!d?.an) return;
      const jetzt = new Date();
      const heute = jetzt.toLocaleDateString('sv-SE');
      if (d.gemeldet === heute || jetzt.getHours() < d.stunde) return;
      const n = (d.faellig ?? []).filter((t) => t <= heute).length;
      if (self.navigator.setAppBadge) await (n ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge()).catch(() => undefined);
      if (!n) return;
      await self.registration.showNotification('Blickfeld Nord – Üben', {
        body: n === 1 ? '1 Karteikarte ist heute fällig.' : `${n} Karteikarten sind heute fällig.`,
        tag: 'bn-ueben',
        icon: '/icon-192.png',
        // Statusleiste (Android): nur die Deckkraft zählt – weiße Silhouette auf transparent (scripts/favicons.py)
        badge: '/badge-96.png',
        data: { url: '/backstage/ueben?modus=1' },
      });
      await cache.put(ERINNERUNG_URL, new Response(JSON.stringify({ ...d, gemeldet: heute }), { headers: { 'Content-Type': 'application/json' } }));
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const ziel = event.notification.data?.url ?? '/backstage/ueben';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((liste) => {
      const offen = liste.find((c) => new URL(c.url).pathname.startsWith('/backstage'));
      return offen ? offen.navigate(ziel).then((c) => (c ?? offen).focus()) : self.clients.openWindow(ziel);
    }),
  );
});

// App-Stand (src/app/data/app-stand.ts): Die Seite fragt den Service Worker, mit welcher Version er sie ausliefert –
// eindeutig, auch wenn während eines Updates zwei Speicher „bn-…“ existieren.
self.addEventListener('message', (event) => {
  if (event.data === 'app-stand' && event.ports[0]) event.ports[0].postMessage(VERSION);
});
