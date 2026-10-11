# Blickfeld Nord – Bandpage

Offizielle Website der Band **Blickfeld Nord**, gebaut mit Angular & Angular Material.

**Live:** https://jan-frederic.github.io/Blickfeld-Nord/

## Inhalte

- **Hero** mit aktuellem Release und Call-to-Action
- **Die Band** – Mitglieder mit Rolle und Kurzbio
- **Musik** – Diskografie mit Tracklisten
- **Tour** – Tourdaten mit Filter „Tickets verfügbar“
- **Kontakt & Booking** – Kontaktformular

Alle Inhalte (Mitglieder, Releases, Tourdaten) stehen zentral in
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
