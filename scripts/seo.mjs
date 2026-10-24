#!/usr/bin/env node
// Ergänzt den fertigen Build um Suchmaschinen-Infos:
//  - strukturierte Daten (schema.org JSON-LD) für die Band und alle öffentlichen, geklärten Konzerte
//  - je öffentlichem Konzert eine Seite /konzerte/<id> mit eigenem MusicEvent
//  - Kalender-Abos: konzerte.ics (öffentliche Konzerte) und backstage/kalender.ics (alle Auftritte + Proben)
//  - häufige Fragen (FAQPage) auf den FAQ-Seiten in allen drei Sprachen
//  - sitemap.xml (alle Seiten auf Deutsch, Englisch und Niederländisch, gegenseitig verknüpft) und robots.txt
//  - vorgerenderte Seiten ohne <link rel="modulepreload"> (das JavaScript bremst sonst Startbild und ersten Inhalt)
// Öffentliche Seiten gibt es in drei Sprachen: / (de), /en/… und /nl/…; Inhalte übersetzt src/app/data/uebersetzungen.ts.
// Aufruf nach `ng build`, vor dem Kopieren der index.html in die Unterseiten-Ordner:  node scripts/seo.mjs
import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
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
const { members, publicShows, allShows, rehearsals, history, FAQ, buildIcs, showId, UEBERSETZUNGEN } = await import(pathToFileURL(bundle).href);
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

const LANGS = ['de', 'en', 'nl'];
const IN_LANGUAGE = { de: 'de-DE', en: 'en-GB', nl: 'nl-NL' };
// Pfad einer Seite in einer Sprache: ('/booking', 'en') → '/en/booking', ('/', 'nl') → '/nl'
const localPath = (path, lang) => (lang === 'de' ? path : path === '/' ? `/${lang}` : `/${lang}${path}`);
const localUrl = (path, lang) => `${SITE}${localPath(path, lang)}`;
// Ausgabedatei einer Seite im Build
const fileOf = (path, lang) => join(DIST, ...localPath(path, lang).split('/').filter(Boolean), 'index.html');
// übersetzte Inhalte (wie src/app/content.ts) – ohne Übersetzung das deutsche Original
const byGerman = new Map(UEBERSETZUNGEN.map((u) => [u.de, u]));
const tx = (de, lang) => (lang === 'de' || !de ? de : (byGerman.get(de)?.[lang] ?? de));

const TEXT = {
  band: {
    de: 'Partyband mit drei Stimmen und jeder Menge Stimmung – Pop, Rock, Schlager, Dance und Disco für Feste, private Feiern und Kneipen.',
    en: 'Party band with three voices and plenty of atmosphere – pop, rock, German Schlager, dance and disco for festivals, private parties and pubs.',
    nl: 'Partyband met drie stemmen en een hoop sfeer – pop, rock, schlagers, dance en disco voor feesten, privéfeesten en cafés.',
  },
  event: {
    de: (city) => `Blickfeld Nord live${city ? ' in ' + city : ''}: Partymusik zum Mitsingen und Tanzen.`,
    en: (city) => `Blickfeld Nord live${city ? ' in ' + city : ''}: party music to sing along and dance to.`,
    nl: (city) => `Blickfeld Nord live${city ? ' in ' + city : ''}: partymuziek om mee te zingen en op te dansen.`,
  },
};

// Bandmitglieder als eigene Personen – mit Vor-/Nachname getrennt und Spitzname, damit Suchmaschinen
// (und KI-Antworten) die Namen exakt so übernehmen, wie sie hier stehen
const personId = (m) => `${SITE}/band/${m.slug}#person`;
function person(m, lang = 'de') {
  const split = m.name.lastIndexOf(' ');
  return {
    '@type': 'Person',
    '@id': personId(m),
    name: m.name,
    givenName: m.name.slice(0, split),
    familyName: m.name.slice(split + 1),
    ...(m.nickname ? { alternateName: m.nickname } : {}),
    jobTitle: tx(m.role, lang),
    description: tx(m.bio, lang),
    url: localUrl(`/band/${m.slug}`, lang),
    ...(m.photo ? { image: `${SITE}/${m.photo.src}` } : {}),
    memberOf: { '@id': BAND_ID },
  };
}
// Vorschaubilder in drei Formaten (1:1, 4:3, 16:9) – Google wählt je nach Platz das passende
// (quadratische Varianten erzeugt scripts/share-images.py)
const images = [`${SITE}/share-1x1.jpg`, `${SITE}/share-4x3.jpg`, `${SITE}/og-image.jpg`];

const bandLd = (lang) => ({
  '@type': 'MusicGroup',
  '@id': BAND_ID,
  name: 'Blickfeld Nord',
  url: `${SITE}/`,
  logo: `${SITE}/presse/blickfeld-nord-kompass.png`,
  image: images,
  description: TEXT.band[lang],
  genre: ['Pop', 'Rock', 'Schlager', 'Dance', 'Disco'],
  foundingDate: '2019',
  member: members.map((m) => ({
    '@type': 'OrganizationRole',
    roleName: tx(m.role, lang),
    member: { '@id': personId(m) },
  })),
  sameAs: ['https://www.instagram.com/blickfeldnord/', 'https://www.facebook.com/share/1BBobZWfjG/'],
});

const concertUrl = (s, lang = 'de') => localUrl(`/konzerte/${showId(s)}`, lang);
const musicEvent = (s, lang = 'de') => ({
    '@type': 'MusicEvent',
    name: `Blickfeld Nord – ${s.venue}`,
    description: TEXT.event[lang](s.city),
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
    // vergangene Konzerte mit Rückblick: echte Fotos vom Abend, sonst die Vorschaubilder
    image: (() => {
      const photos = history.find((h) => h.date === s.date)?.images?.map((i) => `${SITE}/${i.src}`);
      return photos?.length ? photos : images;
    })(),
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
            // Eintritt ist ab Veröffentlichung „erhältlich“ – als Stichtag dient der Build-Tag (liegt nie in der Zukunft)
            validFrom: berlinDateTime(today, '00:00'),
            url: concertUrl(s, lang),
          },
          isAccessibleForFree: s.price === 0,
        }
      : {}),
    url: concertUrl(s, lang),
    inLanguage: IN_LANGUAGE[lang],
  });
const upcoming = publicShows.filter((s) => (s.endDate ?? s.date) >= today);

// JSON-LD in eine vorgerenderte Seite einfügen (ersetzt einen evtl. vorhandenen Block, damit mehrfaches Ausführen nichts verdoppelt)
const marker = /<script type="application\/ld\+json" id="bn-jsonld">[\s\S]*?<\/script>\n?/;
function inject(file, ld) {
  const tag = `<script type="application/ld+json" id="bn-jsonld">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`;
  writeFileSync(file, readFileSync(file, 'utf8').replace(marker, '').replace('</head>', `${tag}</head>`));
}

for (const lang of LANGS) {
  // Startseite: Website, Band, Mitglieder und kommende Konzerte
  inject(fileOf('/', lang), {
    '@context': 'https://schema.org',
    '@graph': [
      ...members.map((m) => person(m, lang)),
      { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'Blickfeld Nord', alternateName: 'Blickfeld Nord Band', url: `${SITE}/`, inLanguage: ['de-DE', 'en-GB', 'nl-NL'], publisher: { '@id': BAND_ID } },
      bandLd(lang),
      ...upcoming.map((s) => musicEvent(s, lang)),
    ],
  });

  // Unterseiten der Bandmitglieder: Profilseite mit der jeweiligen Person
  for (const m of members) {
    const url = localUrl(`/band/${m.slug}`, lang);
    inject(fileOf(`/band/${m.slug}`, lang), {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'ProfilePage', '@id': url, url, name: `${m.name} – Blickfeld Nord`, inLanguage: IN_LANGUAGE[lang], mainEntity: { '@id': personId(m) } },
        person(m, lang),
        { '@type': 'MusicGroup', '@id': BAND_ID, name: 'Blickfeld Nord', url: `${SITE}/` },
      ],
    });
  }

  // Konzertseiten: das jeweilige Konzert als MusicEvent (vergangene ohne Angebot – Eintritt ist dann nicht mehr erhältlich)
  for (const s of publicShows) {
    const past = (s.endDate ?? s.date) < today;
    const { offers, ...event } = musicEvent(s, lang);
    inject(fileOf(`/konzerte/${showId(s)}`, lang), {
      '@context': 'https://schema.org',
      '@graph': [
        { ...(past ? event : { ...event, ...(offers ? { offers } : {}) }), '@id': `${concertUrl(s)}#event` },
        { ...bandLd(lang), member: undefined },
      ],
    });
  }

  // FAQ-Seite: häufige Fragen als FAQPage in der jeweiligen Sprache
  const booking = localUrl('/faq', lang);
  inject(fileOf('/faq', lang), {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${booking}#faq`,
    url: booking,
    inLanguage: IN_LANGUAGE[lang],
    about: { '@type': 'MusicGroup', '@id': BAND_ID, name: 'Blickfeld Nord', url: `${SITE}/` },
    mainEntity: FAQ[lang].items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.link ? `${f.a} ${localUrl(f.link.to, lang)}` : f.a },
    })),
  });
}

// Kalender-Abos: kommen regelmäßig neu – Kalender-Apps fragen alle 12 Stunden nach
const subscription = (desc) => [`X-WR-CALDESC:${desc}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H'];
// öffentlich: alle öffentlichen, geklärten Konzerte – je Sprache eine Datei (konzerte.ics, en/konzerte.ics, nl/konzerte.ics)
const ICS = {
  de: ['Blickfeld Nord – Konzerte', 'Alle öffentlichen Konzerte von Blickfeld Nord'],
  en: ['Blickfeld Nord – Shows', 'All public shows of Blickfeld Nord'],
  nl: ['Blickfeld Nord – Optredens', 'Alle openbare optredens van Blickfeld Nord'],
};
for (const lang of ['de', 'en', 'nl']) {
  const [name, desc] = ICS[lang];
  const ics = buildIcs(publicShows, name, false, false, { header: subscription(desc), lang });
  writeFileSync(join(DIST, ...(lang === 'de' ? [] : [lang]), 'konzerte.ics'), ics);
}
// Backstage: alle Auftritte (auch private, mit Status und Kommentar) und Probetermine – dieselben Angaben,
// die ohnehin im Backstage-Bereich stehen; Suchmaschinen sind per robots.txt ausgesperrt
mkdirSync(join(DIST, 'backstage'), { recursive: true });
writeFileSync(
  join(DIST, 'backstage', 'kalender.ics'),
  buildIcs(allShows, 'Blickfeld Nord – Backstage', true, false, { rehearsals, header: subscription('Auftritte und Proben – nur für die Band') }),
);

// Sitemap (Backstage und Wunschbox bewusst nicht enthalten): jede Seite in allen drei Sprachen,
// gegenseitig verknüpft wie die hreflang-Links im Seitenkopf
const pages = ['/', ...publicShows.map((s) => `/konzerte/${showId(s)}`), '/booking', '/repertoire', '/galerie', '/historie', '/presse', '/technik', '/freunde', '/faq', ...members.map((m) => `/band/${m.slug}`), '/impressum', '/datenschutz'];
const alternates = (p) =>
  [...LANGS.map((l) => [l, localUrl(p, l)]), ['x-default', localUrl(p, 'de')]]
    .map(([l, href]) => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${href}"/>`)
    .join('') + '\n  ';
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.flatMap((l) => pages.map((p) => `  <url><loc>${localUrl(p, l)}</loc><lastmod>${today}</lastmod>${alternates(p)}</url>`)).join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /backstage/\n\nSitemap: ${SITE}/sitemap.xml\n`);

// Vorgerenderte Seiten sind ohne JavaScript schon vollständig. Die modulepreload-Links holen trotzdem alle
// Chunks (~120 KB komprimiert) mit hoher Priorität und nehmen dem Startbild auf dem Handy die Bandbreite –
// ohne sie lädt der Browser die Chunks direkt nach main.js. Die Backstage-Shell (index.csr.html) rendert
// erst im Browser und behält ihre Preloads.
let preloadPages = 0;
for (const file of readdirSync(DIST, { recursive: true })) {
  if (!file.endsWith('index.html')) continue;
  const path = join(DIST, file);
  const html = readFileSync(path, 'utf8');
  const stripped = html.replace(/<link rel="modulepreload" href="[^"]*">/g, '');
  if (stripped !== html) {
    writeFileSync(path, stripped);
    preloadPages++;
  }
}

console.log(`SEO: ${upcoming.length} kommende(s) Konzert(e) als strukturierte Daten, ${publicShows.length} im Kalender-Abo, ${pages.length * LANGS.length} Seiten in der Sitemap (${pages.length} je Sprache), ${preloadPages} Seiten ohne modulepreload.`);
