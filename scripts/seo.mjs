#!/usr/bin/env node
// Ergänzt den fertigen Build um Suchmaschinen-Infos:
//  - strukturierte Daten (schema.org JSON-LD) für die Band und alle öffentlichen, geklärten Konzerte
//  - sitemap.xml und robots.txt
// Aufruf nach `ng build`, vor dem Kopieren der index.html in die Unterseiten-Ordner:  node scripts/seo.mjs
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist', 'blickfeld-nord', 'browser');
const SITE = 'https://blickfeld-nord.de';
const BAND_ID = `${SITE}/#band`;

// Band-Daten aus band.service.ts laden (TypeScript → temporäres ESM-Bundle)
const tmp = mkdtempSync(join(tmpdir(), 'bn-seo-'));
const bundle = join(tmp, 'data.mjs');
await build({
  entryPoints: [join(ROOT, 'scripts', 'seo', 'data.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundle,
  alias: { '@angular/core': join(ROOT, 'scripts', 'seo', 'angular-core-stub.ts') },
  tsconfig: join(ROOT, 'tsconfig.json'),
  logLevel: 'warning',
});
const { members, publicShows } = await import(pathToFileURL(bundle).href);
rmSync(tmp, { recursive: true, force: true });

// Ortszeit Europe/Berlin → ISO 8601 mit korrektem Offset (Winter +01:00, Sommer +02:00)
function berlinDateTime(date, time) {
  const probe = new Date(`${date}T${time}:00Z`);
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', timeZoneName: 'shortOffset' })
    .formatToParts(probe)
    .find((p) => p.type === 'timeZoneName').value; // z. B. "GMT+1"
  const hours = Number(offset.replace('GMT', '') || 0);
  const sign = hours < 0 ? '-' : '+';
  return `${date}T${time}:00${sign}${String(Math.abs(hours)).padStart(2, '0')}:00`;
}

// Auftritte haben kein festes Ende – wie beim Kalender-Export wird diese Dauer angenommen
const DURATION_HOURS = 3;

function endDateTime(date, time) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMinutes(h * 60 + m + DURATION_HOURS * 60);
  const day = d.toISOString().slice(0, 10);
  const hhmm = d.toISOString().slice(11, 16);
  return berlinDateTime(day, hhmm);
}

const today = new Date().toISOString().slice(0, 10);
const image = `${SITE}/og-image.jpg`;

const band = {
  '@type': 'MusicGroup',
  '@id': BAND_ID,
  name: 'Blickfeld Nord',
  url: `${SITE}/`,
  logo: `${SITE}/presse/blickfeld-nord-kompass.png`,
  image,
  description: 'Partyband mit drei Stimmen und jeder Menge Stimmung – Pop, Rock, Schlager, Dance und Disco für Feste, private Feiern und Kneipen.',
  genre: ['Pop', 'Rock', 'Schlager', 'Dance', 'Disco'],
  foundingDate: '2019',
  member: members.map((m) => ({
    '@type': 'OrganizationRole',
    roleName: m.role,
    member: { '@type': 'Person', name: m.name, url: `${SITE}/band/${m.slug}` },
  })),
  sameAs: ['https://www.instagram.com/blickfeldnord/', 'https://www.facebook.com/share/1BBobZWfjG/'],
};

const events = publicShows
  .filter((s) => (s.endDate ?? s.date) >= today)
  .map((s) => ({
    '@type': 'MusicEvent',
    name: `Blickfeld Nord – ${s.venue}`,
    description: `Blickfeld Nord live${s.city ? ' in ' + s.city : ''}: Partymusik zum Mitsingen und Tanzen.`,
    startDate: s.time ? berlinDateTime(s.date, s.time) : s.date,
    endDate: s.time && !s.endDate ? endDateTime(s.date, s.time) : (s.endDate ?? s.date),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      // „Café Lotti – Tanz in den Mai“ → Ort „Café Lotti“
      name: s.venue.split(' – ')[0],
      address: {
        '@type': 'PostalAddress',
        ...(s.city ? { addressLocality: s.city } : {}),
        addressRegion: 'NRW',
        addressCountry: 'DE',
      },
    },
    image: [image],
    performer: { '@id': BAND_ID },
    // Veranstalter: falls nicht eingetragen, die Band als Ansprechpartner
    organizer: s.organizer ? { '@type': 'Organization', name: s.organizer } : { '@id': BAND_ID },
    // Eintritt nur angeben, wenn er bekannt ist (0 = Eintritt frei)
    ...(s.price !== undefined
      ? {
          offers: {
            '@type': 'Offer',
            price: s.price,
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            url: `${SITE}/#tour`,
          },
          isAccessibleForFree: s.price === 0,
        }
      : {}),
    url: `${SITE}/#tour`,
  }));

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [{ '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'Blickfeld Nord', alternateName: ['Blickfeld Nord Band', 'blickfeld-nord.de'], url: `${SITE}/`, inLanguage: 'de-DE', publisher: { '@id': BAND_ID } }, band, ...events],
};

// In index.html einfügen (ersetzt einen evtl. vorhandenen Block, damit mehrfaches Ausführen nichts verdoppelt)
const indexPath = join(DIST, 'index.html');
const marker = /<script type="application\/ld\+json" id="bn-jsonld">[\s\S]*?<\/script>\n?/;
const script = `<script type="application/ld+json" id="bn-jsonld">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n`;
let html = readFileSync(indexPath, 'utf8').replace(marker, '');
html = html.replace('</head>', `${script}</head>`);
writeFileSync(indexPath, html);

// Sitemap (Backstage bewusst nicht enthalten)
const pages = ['/', '/historie', '/presse', '/freunde', ...members.map((m) => `/band/${m.slug}`), '/impressum', '/datenschutz'];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`SEO: ${events.length} Konzert(e) als strukturierte Daten, ${pages.length} Seiten in der Sitemap.`);
