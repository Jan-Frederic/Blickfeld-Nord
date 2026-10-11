# Blickfeld Nord – Bandpage

Offizielle Website der Band **Blickfeld Nord**, gebaut mit Angular & Angular Material.

**Live:** https://blickfeld-nord.de

## Inhalte

- **Hero** mit aktuellem Release und Call-to-Action
- **Die Band** – Mitglieder mit Rolle und Kurzbio
- **Musik** – Diskografie mit Tracklisten
- **Tour** – Tourdaten mit Filter „Tickets verfügbar“
- **Galerie** – Fotos mit Vollbildansicht (Bilder in `public/galerie/`)

Alle Inhalte (Mitglieder, Releases, Tourdaten, Fotos) stehen zentral in
`src/app/data/band.service.ts` und sind aktuell Platzhalter – einfach dort anpassen.

## Entwicklung

```bash
npm ci
npx ng serve        # http://localhost:4200
```

## Deployment

Jeder Push auf `main` baut die Seite und deployt sie über GitHub Actions
(`.github/workflows/deploy-pages.yml`) nach GitHub Pages.
Einmalig nötig: *Settings → Pages → Source: GitHub Actions*.

### Eigene Domain

Die Seite läuft unter `blickfeld-nord.de` (Base-Href `/`).
In *Settings → Pages → Custom domain* ist `blickfeld-nord.de` eingetragen;
bei GoDaddy zeigen vier A-Records (`@` → `185.199.108–111.153`) und ein
CNAME (`www` → `jan-frederic.github.io`) auf GitHub Pages.
