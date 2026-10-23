# Blickfeld Nord – Bandpage

Offizielle Website der Band **Blickfeld Nord**, gebaut mit Angular & Angular Material.

**Live:** https://blickfeld-nord.de

Architektur mit Diagrammen: [ARCHITECTURE.md](ARCHITECTURE.md) · Inhalte pflegen: [PFLEGE.md](PFLEGE.md)

## Inhalte

- **Hero** mit Logo-Motiv und dem nächsten Konzerttermin
- **Die Band** – Mitglieder mit Rolle und Kurzbio, jeweils mit eigener Unterseite (`/band/<name>`); optional mit
  Foto (`photo`: großes Bild plus quadratischer Ausschnitt fürs runde Profilbild, Dateien in `public/band/`)
- **Tour und Konzerte** – Termine mit Anfahrts-Link zu Google Maps und Kalender-Export (.ics, einzeln oder alle)
- **Booking** (`/booking`, auf der Startseite nur ein Teaser) – Infos für Veranstalter (Anlässe, Spielzeit, Technik),
  Verfügbarkeitskalender (belegte Tage aus `shows`: geklärt = belegt, offen = reserviert – ohne Details; Klick auf
  einen freien Tag öffnet die E-Mail-Vorlage mit Datum), häufige Fragen (FAQ), Technik-Rider als PDF, Repertoire-Playlist auf Spotify, Anfrage per E-Mail-Vorlage, Instagram- oder Facebook-Nachricht
- **Technik** (`/technik`, in der Hauptnavigation) – was wir mitbringen (PA, Licht, Instrumente),
  was wir brauchen (Platz, Strom), Zeitplan, Technik-Rider und Bühnenplan einzeln als PDF
  Darunter der **technische Aufbau** aus `src/app/data/technik.json`: Bühnenplan (Draufsicht, Positionen in Metern),
  Kanalliste, Signalfluss, Monitore und Strom – dieselbe Datei erzeugt Seite 2 des Technik-Riders
  (`python3 scripts/build-rider.py`, läuft auch bei jedem Deploy). `null` bedeutet „noch offen“. Jedes Gerät mit `hw` ist im Bühnenplan und in der
  Geräteliste anklickbar und öffnet einen Dialog mit Beschreibung und technischen Daten (Abschnitt `hardware`).
  Ein Klick auf einen Musiker (oder sein Mikro) zeigt sein Setup: Die Beschreibung steht unter `setup-<name>`, Kanäle,
  Geräte und Monitor kommen automatisch dazu – alles, was in `technik.json` mit `"musiker": "<name>"` markiert ist.
- **Drei Sprachen** – alle öffentlichen Seiten auf Deutsch (`/`), Englisch (`/en/…`) und Niederländisch (`/nl/…`),
  Umschalter in Kopf- und Fußzeile. Oberflächentexte als Wörterbücher in den Komponenten (`tr()` aus `src/app/i18n.ts`),
  Inhalte (Bios, Historie, Bildtexte, Freunde, Technik) in `src/app/data/uebersetzungen.ts` mit Markierung `geprueft`.
  Backstage bleibt deutsch. Details: [ARCHITECTURE.md](ARCHITECTURE.md#mehrsprachigkeit)
- **Repertoire** (`/repertoire`) – wie wir live spielen (Fill-Ins, Jam-Sessions, spontane Aktionen) und die
  durchsuchbare Songliste aus der Spotify-Playlist
- **Neu auf Instagram** (Startseite) – ausgewählte Beiträge als Zwei-Klick-Lösung; Links in `instagramPosts`
  (`band.service.ts`) eintragen, ohne Einträge nur ein „Folgt uns“-Hinweis
- **Galerie** (`/galerie`) – Fotos mit Vollbildansicht
- **Historie** (`/historie`) – Chronik/Blog mit Datum, Text, Bildern sowie Links (Instagram, Webseiten, Orte);
  Instagram-Reels per `reel: '<id>'` als Zwei-Klick-Einbettung (lädt erst nach Klick, siehe Datenschutzerklärung)
- **Pressekit** (`/presse`) – Pressetext, Logos, Fotos, PDF und ZIP zum Download
- **Freunde & Partner** (`/freunde`) – Links zu befreundeten Seiten. Steckt der Name eines Freundes im Location-Namen
  eines Auftritts, verlinkt die Konzertliste automatisch auf dessen Karte (`/freunde#cafe-lotti`), die dort kurz aufleuchtet
- **Backstage** (`/backstage`, versteckt) – in Bereiche gegliedert, gemeinsame Navigation `backstage-nav.ts`:
  **Übersicht** (Kennzahlen, nächste Termine, Kacheln), **Termine** (`/backstage/termine`: alle Auftritte inkl. privater
  mit Status und Kommentar sowie Proben, Filter, Sortierung, Bandkalender-Abo, neuen Termin eintragen), **Zahlen**
  (Besucher, Setlist-Statistik), **Übersetzungen** (Stand und Gegenlesen), **Material** (Wunschbox-Schild, QR-Karte,
  Rider, Pressekit in DE/EN/NL) und **Abgleich** (Export/Import der Gerätedaten).
  Easter Egg: fünfmal schnell auf das Logo oben links klicken. Jede Zeile der Termin-Tabelle öffnet die **Unterseite des Auftritts**
  (`/backstage/<datum>`, bei zwei Terminen am selben Tag `<datum>-2`; `src/app/pages/backstage-show.ts`) mit allen Daten,
  Kalendereintrag und Vor/Zurück zum nächsten Termin.
  Unter der Tabelle erzeugt **Neuen Termin eintragen** (`src/app/pages/termin-formular.ts`) aus Datum, Ort, privat/öffentlich
  und Eintritt die fertige Zeile für `shows` bzw. `rehearsals` und öffnet `band.service.ts` im GitHub-Editor (Anleitung: `PFLEGE.md`).
  Für kommende öffentliche und geklärte Termine erzeugt dort der Button **Plakat** ein Instagram-Bild (1080 × 1350) im Logo-Design
  (`src/app/data/poster.ts`) – am Handy direkt zum Teilen, am Rechner als Download.
  Daneben kopiert **Text kopieren** einen fertigen Instagram-Post (Datum, Uhrzeit, Ort, Eintritt, Hashtags).
  Darunter eine **Packliste pro Auftritt** zum Abhaken (eigene Punkte möglich; gespeichert nur im Browser des
  jeweiligen Geräts, `src/app/pages/packliste.ts`). Direktaufrufe von Unterseiten leitet die Fehlerseite
  (`404.html`, Deploy-Schritt „SPA fallback“) zur Backstage-Shell weiter.
- **Impressum** (`/impressum`) und **Datenschutzerklärung** (`/datenschutz`)

Alle Inhalte (Mitglieder, Konzerttermine, Fotos, Historie, befreundete Seiten) stehen zentral in
`src/app/data/band.service.ts`.
Die Rechtstexte liegen in `src/app/pages/`.

Auftritte (`shows`): Öffentlich gelistet wird ein Termin nur, wenn er nicht privat **und**
geklärt (`confirmed: true`) ist; `private: true` blendet ihn aus, `comment` ist eine Notiz für die Backstage-Seite; `city`, `mapsUrl`, `time` (Beginn `'HH:MM'`, im Kalender mit 3 h Dauer) und `endDate` (mehrtägige Termine) sind optional; `price` (Eintritt in €, `0` = frei) und `organizer` (Veranstalter) erscheinen nur in den strukturierten Daten für Google.
Gespielte Termine erscheinen automatisch unter „Vergangene Auftritte“ – alle geklärten, auch private (mit Hinweis „privat“).
**Achtung:** Auch private Termine und Kommentare stehen im öffentlichen Repo und im
ausgelieferten JavaScript – nichts Vertrauliches eintragen.

Alle öffentlichen Seiten werden beim Build **vorgerendert** (fertiges HTML je Route, `outputMode: static`,
Routen in `src/app/app.routes.server.ts`); Seiten für neue Bandmitglieder entstehen automatisch.
Backstage bleibt rein clientseitig. Eine neue Unterseite zusätzlich in die Sitemap-Liste in `scripts/seo.mjs` aufnehmen.

### Fotos hinzufügen

Schritt für Schritt für die Band: **[PFLEGE.md](PFLEGE.md)** (Auftritte, Proben, Fotos, Rückblicke im GitHub-Editor).

Große Bilder liegen in `public/historie/` bzw. `public/galerie/`, eingetragen in `band.service.ts` unter `photos`.
Fehlende Vorschaubilder (`…-thumb.webp` max. 900 px plus `-thumb-480`/`-thumb-720`) erzeugt beim Deploy
`scripts/bilder.py`. Das Skript verkleinert außerdem zu große Fotos auf 2000 px, entfernt Metadaten und bricht ab,
wenn ein Bild im Repo einen GPS-Standort enthält. Vor dem Hochladen den Standort trotzdem entfernen:
Das Repo ist öffentlich.

### Pressekit neu bauen

Die Dateien in `public/presse/` (PDF, ZIP, Logos, Fotos, Pressetext) erzeugt
`scripts/build-pressekit.py` aus `public/hero.webp` und `scripts/presse-quellen/`.
Pressekit, Technik-Rider, QR-Code-Karte und Wunschbox-Schild entstehen auf Deutsch (ohne Zusatz), Englisch (`-en`) und
Niederländisch (`-nl`). Die Texte stehen in `scripts/pdf_texte.py`, die Technik-Angaben werden mit
`src/app/data/uebersetzungen.ts` übersetzt. Die Website verlinkt automatisch die Fassung der jeweiligen Sprache.
Der Deploy baut alle PDFs bei jedem Lauf neu. Lokal geht es so (nach `npm ci`):

```bash
pip install pillow reportlab fonttools
python3 scripts/build-pressekit.py
```

Pressetext und Bildliste der Webseite stehen in `src/app/pages/presse.ts`.

Den Technik-Rider (`blickfeld-nord-technik-rider.pdf`: Platz, Strom, Zeitplan, Anfahrt, Vorlauf) und den
Bühnenplan einzeln (`blickfeld-nord-buehnenplan.pdf`) erzeugt `python3 scripts/build-rider.py`. Wie Pressekit,
QR-Karte und Wunschbox-Schild entsteht er bei jedem Deploy automatisch neu – Änderungen an Texten oder `technik.json`
stehen so sofort in den PDFs. Dieselben Angaben stehen als FAQ im Booking-Bereich
(`src/app/sections/booking.ts`) – bei Änderungen beides anpassen.

Die QR-Code-Karte (`blickfeld-nord-qr-karte.pdf`: A4-Schild für Bühne/Theke plus vier A6-Karten zum
Ausschneiden) erzeugt `python3 scripts/build-qr-karte.py` (zusätzlich `pip install segno`).

Das freigestellte Kompass-Logo (SVG, hell/dunkel) erzeugt `scripts/kompass-logo.py`; die transparenten PNGs
(2048 px) wurden daraus gerendert und liegen in `scripts/presse-quellen/`.

### Screenshot-Vergleich

Vor jedem Deploy vergleicht `npx playwright test` (`tests/visual/seiten.spec.mjs`, `playwright.config.mjs`) wichtige
Seitenbereiche in allen drei Sprachen auf Desktop und Handy mit Referenzbildern in `tests/visual/referenz/`. Weicht ein
Bereich um mehr als 2 % ab, stoppt der Deploy. Die Unterschiede liegen dann als Artefakt `screenshot-vergleich` am Lauf.
Laufend wechselnde Inhalte (nächster Auftritt, Konzertliste, Verfügbarkeit, Versionsnummer) sind ausgenommen.
Nach gewollten Änderungen am Aussehen: Actions → „Screenshots aktualisieren“ (nimmt die Referenzbilder auf dem
GitHub-Runner neu auf, speichert sie und startet den Deploy neu).

### Suchmaschinen (Google)

Beim Deploy ergänzt `scripts/seo.mjs` den Build um strukturierte Daten (schema.org) für die Band und alle
öffentlichen, geklärten Konzerte sowie um `sitemap.xml` und `robots.txt`. Die Termine kommen automatisch aus
`band.service.ts` – private oder offene Termine erscheinen dort nie. Neue Unterseiten bei Bedarf in der
Sitemap-Liste im Skript ergänzen. Als Vorschaubilder nennt es `share-1x1.jpg`, `share-4x3.jpg` (erzeugt von
`python3 scripts/share-images.py` aus `public/hero.webp`) und `og-image.jpg`. Auswertung: Google Search Console (Domain `blickfeld-nord.de`).

### Besucherstatistik

Reichweitenmessung mit GoatCounter (ohne Cookies, keine IP-Speicherung): Auswertung unter
https://blickfeld-nord.goatcounter.com. Das Skript steht in `src/index.html`; da die Seite Unterseiten ohne Neuladen
wechselt, zählt `src/app/analytics.ts` jeden Seitenwechsel selbst (Backstage wird nicht gezählt).
In der Datenschutzerklärung beschrieben (Abschnitt 8).
Im Backstage zeigt `src/app/pages/backstage-besucher.ts` die Aufrufe (7 Tage, 30 Tage, 12 Monate, gesamt) und die
beliebtesten Seiten. Dafür muss in GoatCounter unter Settings „Allow adding visitor counts on your website“
aktiviert sein (öffentlicher Zähler, nur Summen); sonst erscheint dort ein Hinweis.

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

### Repertoire aus Spotify

Die durchsuchbare Songliste auf `/repertoire` kommt aus `src/app/data/repertoire.json`. Der Workflow
**Repertoire aktualisieren** (`.github/workflows/repertoire.yml`, montags und per „Run workflow“) holt die Playlist
über die Spotify-Web-API (`scripts/sync-repertoire.mjs`), speichert Änderungen und stößt einen Deploy an.
Einmalig nötig: eine App auf developer.spotify.com und die Repository-Secrets `SPOTIFY_CLIENT_ID`,
`SPOTIFY_CLIENT_SECRET` und `SPOTIFY_REFRESH_TOKEN`. Seit der API-Umstellung 2026 gibt Spotify Playlist-Inhalte
nur mit Benutzer-Login heraus. Das Refresh-Token entsteht so:

1. In der Spotify-App unter *Settings → Redirect URIs* `http://127.0.0.1:8888/callback` eintragen und speichern.
2. Lokal `SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… node scripts/spotify-login.mjs` ausführen, den angezeigten
   Link öffnen und mit dem Spotify-Konto anmelden, dem die Playlist gehört.
3. Das im Terminal ausgegebene Token als Secret `SPOTIFY_REFRESH_TOKEN` speichern.

Solange die Liste leer ist, blendet die Seite den Bereich aus.

### Versionen und Commit-Nachrichten

Commits folgen **Conventional Commits** (`typ(bereich): Beschreibung`, Beschreibung gern auf Deutsch).
Bei jedem Deploy wertet **semantic-release** (`.releaserc.json`, Job `release` in `deploy-pages.yml`) die Commits
seit dem letzten Tag aus, legt Tag und GitHub-Release mit Release Notes an – die Version steht klein im Footer
(`scripts/write-version.mjs` → `src/app/data/version.json`, verlinkt auf die Release Notes).

| Typ | Wofür | Version |
|---|---|---|
| `feat` | neue Funktion, neue Seite | 1.**x**.0 |
| `fix` | Fehlerbehebung | 1.0.**x** |
| `perf` | schneller | 1.0.**x** |
| `content` | neue Inhalte: Auftritte, Historie, Fotos, Repertoire | 1.0.**x** |
| `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore` | alles andere | keine neue Version |

Ein `!` nach dem Typ (`feat!: …`) oder `BREAKING CHANGE:` im Text erhöht die Hauptversion.
Beispiele: `feat(backstage): Unterseite pro Auftritt`, `content(historie): Auftritt im Gasthof Küpper`.
PR-Titel prüft die CI mit commitlint (`commitlint.config.mjs`), Dependabot schreibt `chore(deps)` bzw. `ci(deps)`.

### Ladezeit-Wächter und Updates

- **Lighthouse:** Nach jedem Deploy prüft der Job `lighthouse` die Live-Seite (Start, Booking, Historie; Handy-Profil).
  Grenzwerte in `lighthouserc.json`: Leistung ≥ 85 (Startseite wegen des großen Startbilds vorerst ≥ 75),
  Barrierefreiheit und SEO ≥ 95. Die Werte stehen als Tabelle in der Zusammenfassung des Laufs. Ein Fehlschlag
  stoppt nichts, meldet sich aber per E-Mail; die Berichte liegen im jeweiligen Actions-Lauf unter „Artifacts“.
- **Dependabot** (`.github/dependabot.yml`) schlägt monatlich Updates als Pull Request vor (Angular-Pakete gebündelt,
  keine großen Versionssprünge). Jeder Pull Request wird von `.github/workflows/ci.yml` geprüft (Tests, Build,
  Linkcheck) – grün = gefahrlos mergen.

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
