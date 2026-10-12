# Blickfeld Nord – Bandpage

Offizielle Website der Band **Blickfeld Nord**, gebaut mit Angular & Angular Material.

**Live:** https://blickfeld-nord.de

## Inhalte

- **Hero** mit Logo-Motiv und dem nächsten Konzerttermin
- **Die Band** – Mitglieder mit Rolle und Kurzbio, jeweils mit eigener Unterseite (`/band/<name>`)
- **Tour und Konzerte** – Termine mit Anfahrts-Link zu Google Maps
- **Galerie** – Fotos mit Vollbildansicht
- **Freunde & Partner** (`/freunde`) – Links zu befreundeten Seiten
- **Impressum** (`/impressum`) und **Datenschutzerklärung** (`/datenschutz`)

Alle Inhalte (Mitglieder, Konzerttermine, Fotos, befreundete Seiten) stehen zentral in
`src/app/data/band.service.ts`.
Die Rechtstexte liegen in `src/app/pages/`.

Kommt ein neues Bandmitglied (oder eine neue Unterseite) dazu, den Pfad auch in
`.github/workflows/deploy-pages.yml` ergänzen, damit Direktaufrufe funktionieren.

### Fotos hinzufügen

Bilder liegen in `public/galerie/` – jeweils als großes Bild (max. 2000 px) und als
verkleinerte Vorschau (`…-thumb.webp`, ca. 900 px). Danach in `band.service.ts` unter
`photos` eintragen. Vor dem Hochladen Metadaten (z. B. GPS-Ort) entfernen.

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
