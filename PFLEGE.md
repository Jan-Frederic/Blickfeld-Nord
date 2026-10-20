# Webseite pflegen – Anleitung für die Band

Alles geht im Browser, auch am Handy: Ihr braucht nur ein GitHub-Konto mit Schreibrechten auf dieses Repo.
Programmieren muss niemand. Nach jeder Änderung prüft GitHub automatisch, ob alles stimmt. Erst dann geht die
Seite neu online, nach etwa 5 Minuten.

## So läuft jede Änderung

1. Datei auf GitHub öffnen und auf den **Stift** (✏️ „Edit this file“) klicken.
2. Ändern.
3. Oben rechts **Commit changes …** klicken. Als Beschreibung am besten mit `content:` beginnen,
   z. B. `content: Auftritt Weihnachtsmarkt Rhede`. Dann landet es sauber in den Versionshinweisen.
4. Unter **Actions** ([Übersicht](https://github.com/Jan-Frederic/Blickfeld-Nord/actions)) läuft jetzt „Deploy to GitHub Pages“:
   - ✅ grüner Haken: nach ein paar Minuten ist die Änderung auf https://blickfeld-nord.de zu sehen.
     Nicht sofort? Seite neu laden. Die installierte App holt sich das Update beim nächsten Öffnen.
   - ❌ rotes Kreuz: Die Seite bleibt einfach auf dem alten Stand, kaputt geht nichts. Auf den Lauf klicken, dann
     den roten Schritt. Die Meldung sagt meist genau, was nicht stimmt (z. B. „2026-13-04 ist kein Datum“).
     Korrigieren und erneut speichern.

> **Wichtig:** Das Repo ist öffentlich. Keine Gagen, privaten Adressen, Telefonnummern oder vollen Namen von
> Privatleuten eintragen, auch nicht in Kommentaren. Privatleute abkürzen („Ronny S.“).

Fast alles steht in einer Datei: **[`src/app/data/band.service.ts`](https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/band.service.ts)**.
Bestimmte Stellen findet ihr im Editor mit **Strg+F** (am Handy: Suche im Browser-Menü).

## Neuer Auftritt

Am einfachsten über das Formular im Backstage:

1. https://blickfeld-nord.de/backstage öffnen, ganz unten **Neuen Termin eintragen**.
2. Datum, Location, Ort, Eintritt sowie „privat“ und „geklärt“ ausfüllen. Darunter erscheint die fertige Zeile.
   Ist der Tag schon belegt, warnt das Formular.
3. **Zeile kopieren**, dann **Datei auf GitHub öffnen**.
4. Nach `readonly shows: Show[] = [` suchen und die Zeile **direkt darunter** einfügen. Die Reihenfolge ist egal,
   die Seite sortiert selbst.
5. Speichern wie oben.

Was die Angaben bewirken:

| Angabe | Wirkung |
|---|---|
| **geklärt** (`confirmed: true`) | Nur geklärte Termine erscheinen öffentlich. Offene stehen im Backstage und im Verfügbarkeitskalender als „reserviert“. |
| **privat** (`private: true`) | Erscheint nie öffentlich, nur im Backstage. Nach dem Auftritt steht er im Rückblick als „Private Feier“ oder unter dem öffentlichen Namen, den ihr angebt. |
| **Eintritt** (`price`) | `0` = Eintritt frei, z. B. `8` = 8 €. Leer = keine Angabe. |
| **Kommentar** (`comment`) | Notiz, die nur im Backstage erscheint. Trotzdem öffentlich im Repo lesbar, siehe oben. |

**Termin ändern oder absagen:** Nach dem Datum suchen (z. B. `2026-12-04`), die Zeile anpassen oder ganz löschen.
Aus „offen“ wird „geklärt“, indem ihr `confirmed: false` in `confirmed: true` ändert.

## Probe ergänzen

Im Formular oben **Probe** wählen. Die Zeile kommt unter `readonly rehearsals: Rehearsal[] = [`.
Proben erscheinen nur im Backstage und im Band-Kalender-Abo.

## Foto in die Galerie

1. **Standort entfernen.** Handyfotos enthalten oft den GPS-Ort, und der wäre sonst öffentlich. Ihr könnt beim
   Teilen die Option zum Entfernen des Standorts wählen. Oder ihr zieht das Foto auf https://squoosh.app, wählt
   rechts „WebP“ und ladet es wieder herunter. Das entfernt den Standort und macht die Datei klein.
   Habt ihr es vergessen, schlägt die automatische Prüfung Alarm und die Seite geht nicht online.
2. **Dateiname:** Datum plus Stichwort, klein, ohne Leerzeichen und Umlaute, z. B. `2026-12-04-weihnachtsmarkt.webp`
   (`.jpg` geht auch).
3. Auf GitHub in den Ordner [`public/historie`](https://github.com/Jan-Frederic/Blickfeld-Nord/tree/main/public/historie)
   gehen, dann **Add file → Upload files**, das Foto hineinziehen und **Commit changes**.
4. In `band.service.ts` nach `readonly photos: Photo[] = [` suchen und darunter einfügen:

   ```ts
   { src: 'historie/2026-12-04-weihnachtsmarkt.webp', thumb: 'galerie/weihnachtsmarkt-2026-thumb.webp', alt: 'Was auf dem Foto zu sehen ist', caption: 'Weihnachtsmarkt Rhede, 04.12.2026', credit: 'Name des Fotografen' },
   ```

   - `alt` beschreibt das Bild für blinde Menschen und Google, z. B. „Blickfeld Nord auf der Bühne unter Lichterketten“.
   - `credit` nur angeben, wenn der Fotograf genannt werden möchte. Fotos nur mit Erlaubnis verwenden.
   - Hochformat-Fotos bekommen zusätzlich `tall: true`.
   - Die Vorschaubilder (`thumb`) müsst ihr **nicht** selbst erstellen. Das erledigt der Build automatisch,
     ebenso das Verkleinern zu großer Fotos.

## Rückblick schreiben (Historie)

Nach `readonly history: HistoryEntry[] = [` suchen und **direkt darunter** einen neuen Block einfügen.
Neueste Einträge kommen nach oben:

```ts
    {
      date: '2026-12-04',
      title: 'Weihnachtsmarkt in Rhede',
      text: [
        'Erster Absatz …',
        'Zweiter Absatz …',
      ],
      images: [
        { src: 'historie/2026-12-04-weihnachtsmarkt.webp', alt: 'Was auf dem Foto zu sehen ist', credit: 'Name' },
      ],
      links: [
        { type: 'instagram', label: '@blickfeldnord', url: 'https://www.instagram.com/blickfeldnord/' },
      ],
    },
```

- Jeder Absatz steht in eigenen `'…'` mit Komma dahinter. Ein Apostroph im Text wird als `’` geschrieben (z. B. „Matthias’“).
  Ein normales `'` würde den Text beenden.
- `images`, `links` und `reel` sind optional. Für ein Instagram-Reel schreibt ihr `reel: 'ABC123',`.
  Die Kennung steht in der Reel-Adresse `instagram.com/reel/ABC123/`.
- Das erste Foto und der erste Absatz erscheinen automatisch auch auf der Konzertseite des Auftritts vom selben Tag.

## Was die automatischen Prüfungen abfangen

Bevor etwas online geht, prüft GitHub unter anderem:

- **Schreibfehler im Code**, z. B. ein fehlendes Komma oder eine fehlende Klammer. Dann schlägt der Schritt „Build“ fehl.
- **Daten:** gültige Daten und Uhrzeiten, „bis“ nicht vor „von“, private Namen nie öffentlich,
  jedes Foto mit Beschreibung (Schritt „Tests“)
- **Fotos:** Eingetragenes Bild fehlt im Ordner oder enthält einen GPS-Standort (Schritt „Fotos vorbereiten“).
- **Links**, **Barrierefreiheit** und **Klicktests** der wichtigsten Seiten

Nicht weiterkommen? Einfach Fred fragen. Über **History** (Uhr-Symbol oben in der Datei) seht ihr jede frühere
Fassung und könnt den alten Text von dort zurückkopieren.
