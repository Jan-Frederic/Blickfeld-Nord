# Blickfeld Nord – Bandpage

Offizielle Website der Band **Blickfeld Nord**, gebaut mit Angular & Angular Material.

**Live:** https://blickfeld-nord.de

## Inhalte

- **Hero** mit Logo-Motiv und dem nächsten Konzerttermin
- **Die Band** – Mitglieder mit Rolle und Kurzbio, jeweils mit eigener Unterseite (`/band/<name>`)
- **Tour und Konzerte** – Termine mit Anfahrts-Link zu Google Maps und Kalender-Export (.ics, einzeln oder alle)
- **Booking** – Infos für Veranstalter (Anlässe, Spielzeit, Technik), Repertoire-Playlist auf Spotify, Anfrage per E-Mail-Vorlage, Instagram- oder Facebook-Nachricht
- **Galerie** – Fotos mit Vollbildansicht
- **Historie** (`/historie`) – Chronik/Blog mit Datum, Text, Bildern sowie Links (Instagram, Webseiten, Orte);
  Instagram-Reels per `reel: '<id>'` als Zwei-Klick-Einbettung (lädt erst nach Klick, siehe Datenschutzerklärung)
- **Pressekit** (`/presse`) – Pressetext, Logos, Fotos, PDF und ZIP zum Download
- **Freunde & Partner** (`/freunde`) – Links zu befreundeten Seiten
- **Backstage** (`/backstage`, versteckt) – alle Auftritte inkl. privater Termine mit Status und Kommentar, exportierbar als Bandkalender.
  Easter Egg: fünfmal schnell auf das Logo oben links klicken.
  Für jeden kommenden öffentlichen Termin erzeugt der Button **Plakat** ein Instagram-Bild (1080 × 1350) im Logo-Design
  (`src/app/data/poster.ts`) – am Handy direkt zum Teilen, am Rechner als Download.
- **Impressum** (`/impressum`) und **Datenschutzerklärung** (`/datenschutz`)

Alle Inhalte (Mitglieder, Konzerttermine, Fotos, Historie, befreundete Seiten) stehen zentral in
`src/app/data/band.service.ts`.
Die Rechtstexte liegen in `src/app/pages/`.

Auftritte (`shows`): Öffentlich gelistet wird ein Termin nur, wenn er nicht privat **und**
geklärt (`confirmed: true`) ist; `private: true` blendet ihn aus, `comment` ist eine Notiz für die Backstage-Seite; `city`, `mapsUrl`, `time` (Beginn `'HH:MM'`, im Kalender mit 3 h Dauer) und `endDate` (mehrtägige Termine) sind optional.
**Achtung:** Auch private Termine und Kommentare stehen im öffentlichen Repo und im
ausgelieferten JavaScript – nichts Vertrauliches eintragen.

Alle öffentlichen Seiten werden beim Build **vorgerendert** (fertiges HTML je Route, `outputMode: static`,
Routen in `src/app/app.routes.server.ts`); Seiten für neue Bandmitglieder entstehen automatisch.
Backstage bleibt rein clientseitig. Eine neue Unterseite zusätzlich in die Sitemap-Liste in `scripts/seo.mjs` aufnehmen.

### Fotos hinzufügen

Bilder liegen in `public/galerie/` – jeweils als großes Bild (max. 2000 px) und als
verkleinerte Vorschau (`…-thumb.webp`, ca. 900 px). Danach in `band.service.ts` unter
`photos` eintragen. Vor dem Hochladen Metadaten (z. B. GPS-Ort) entfernen.

### Pressekit neu bauen

Die Dateien in `public/presse/` (PDF, ZIP, Logos, Fotos, Pressetext) erzeugt
`scripts/build-pressekit.py` aus `public/hero.webp` und `scripts/presse-quellen/`.
Texte stehen oben im Skript. Neu bauen (nach `npm ci`):

```bash
pip install pillow reportlab fonttools
python3 scripts/build-pressekit.py
```

Pressetext und Bildliste der Webseite stehen in `src/app/pages/presse.ts`.

Die QR-Code-Karte (`blickfeld-nord-qr-karte.pdf`: A4-Schild für Bühne/Theke plus vier A6-Karten zum
Ausschneiden) erzeugt `python3 scripts/build-qr-karte.py` (zusätzlich `pip install segno`).

Das freigestellte Kompass-Logo (SVG, hell/dunkel) erzeugt `scripts/kompass-logo.py`; die transparenten PNGs
(2048 px) wurden daraus gerendert und liegen in `scripts/presse-quellen/`.

### Suchmaschinen (Google)

Beim Deploy ergänzt `scripts/seo.mjs` den Build um strukturierte Daten (schema.org) für die Band und alle
öffentlichen, geklärten Konzerte sowie um `sitemap.xml` und `robots.txt`. Die Termine kommen automatisch aus
`band.service.ts` – private oder offene Termine erscheinen dort nie. Neue Unterseiten bei Bedarf in der
Sitemap-Liste im Skript ergänzen. Auswertung: Google Search Console (Domain `blickfeld-nord.de`).

### Performance (Core Web Vitals)

- Vorgerenderte Seiten, Startbild mit `fetchpriority="high"`, festen Maßen und Varianten (800/1200/2000 px)
- Unterseiten werden erst beim Aufruf geladen; Abschnitte der Startseite werden erst beim Hinscrollen aktiviert
  (`@defer` mit inkrementeller Hydration)
- Icon-Schrift auf die genutzten Symbole reduziert: `scripts/subset-icons.py` (läuft beim Deploy; neue
  `<mat-icon>`-Namen werden automatisch gefunden) → `public/fonts/material-icons-subset.woff2`

## Entwicklung

```bash
npm ci
npx ng serve        # http://localhost:4200
```

Schriften (Inter, Michroma, Montserrat) und Icons sind lokal über npm eingebunden –
bitte keine externen Dienste wie Google Fonts einbinden, sonst muss die
Datenschutzerklärung angepasst werden.

## Deployment

Jeder Push auf `main` baut die Seite und deployt sie über GitHub Actions
(`.github/workflows/deploy-pages.yml`) nach GitHub Pages.

Vor dem Deploy läuft eine automatische Prüfung – schlägt sie fehl, bleibt die alte Version online und GitHub
meldet den Fehler per E-Mail:

- **Tests** (`npx ng test --watch=false`, `src/app/data/band.service.spec.ts`): Datumsangaben, Uhrzeiten,
  Links, Bild- und Alternativtexte in `band.service.ts`
- **Linkcheck** (`npm run check:links` nach dem Build): alle internen Links, Bilder und Downloads müssen
  existieren; externe Links werden geprüft und nur als Warnung gemeldet
Einmalig nötig: *Settings → Pages → Source: GitHub Actions*.

### Eigene Domain

Die Seite läuft unter `blickfeld-nord.de` (Base-Href `/`).
In *Settings → Pages → Custom domain* ist `blickfeld-nord.de` eingetragen;
bei GoDaddy zeigen vier A-Records (`@` → `185.199.108–111.153`) und ein
CNAME (`www` → `jan-frederic.github.io`) auf GitHub Pages.

## Hinweis: öffentliches Repository

Dieses Repository ist öffentlich einsehbar – inklusive der kompletten Git-Historie.
Hier gehören deshalb **keine** Passwörter, Zugangsdaten, Verträge, Kalkulationen,
unveröffentlichten Songs oder andere vertrauliche Dateien hinein. Auch später
gelöschte Dateien bleiben in der Historie auffindbar.

## Rechte

© Blickfeld Nord. Alle Rechte vorbehalten.

Bandname, Logo, Fotos, Texte und sonstige Inhalte dieser Website sind urheberrechtlich
geschützt und dürfen ohne vorherige schriftliche Zustimmung der Band nicht verwendet,
vervielfältigt oder veröffentlicht werden. Die öffentliche Sichtbarkeit dieses
Repositorys stellt keine Lizenz zur Nutzung dar.

Kontakt: siehe [Impressum](https://blickfeld-nord.de/impressum).
