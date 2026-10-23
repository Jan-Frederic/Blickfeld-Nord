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

1. https://blickfeld-nord.de/backstage/termine öffnen (im Backstage der Bereich **Termine**), ganz unten **Neuen Termin eintragen**.
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

**Probe planen:** Im Backstage unter **Termine** auf eine Probe klicken. Dort stehen die Songs zum Üben (mit Tonart
und Tempo, falls eingetragen), Notizen und offene Punkte. Alles bleibt auf dem Gerät gespeichert; mit „Diesen Termin
an die Band“ geht der Stand per WhatsApp & Co. an die anderen.

## Bühnenplan ändern

Im Backstage unter **Bühnenplan** (`/backstage/buehnenplan`) Geräte und Musiker an ihren Platz ziehen –
feiner geht es mit den Pfeiltasten (5 cm, mit Umschalt 25 cm). Danach **Datei für GitHub erzeugen**,
„technik.json auf GitHub öffnen“, mit Strg+A alles markieren, einfügen und „Commit changes“. Der neue Plan erscheint
dann auf der Technik-Seite, im Technik-Rider und im Bühnenplan-PDF – die PDFs entstehen bei jedem Deploy neu.

## Abwesenheit eintragen

Wenn jemand an bestimmten Tagen nicht spielen kann (Urlaub, Schicht, Familienfeier), nach
`readonly abwesenheiten: Abwesenheit[] = [` suchen und darunter einfügen:

```ts
    { wer: 'David', von: '2027-07-12', bis: '2027-07-19', grund: 'Urlaub' },
```

- `wer`: David, Matthias, Fred oder `'Band'`. `bis` weglassen, wenn es nur ein Tag ist.
- Im Verfügbarkeitskalender beim Booking erscheinen die Tage als **belegt** – ohne Namen und Grund.
- Das Termin-Formular im Backstage warnt, wenn ein neuer Termin auf so einen Tag fällt, und die Aufgaben-Seite
  meldet Auftritte und Proben, die in eine Abwesenheit fallen.
- Das Repo ist öffentlich: als Grund nur ein Stichwort, keine Details.

## Tonart und Tempo der Songs

Für Setlist, Bühnen-Modus und Laufzettel im Backstage. In
[`src/app/data/songinfo.ts`](https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/songinfo.ts)
unter `export const SONGINFO: SongInfo[] = [` eine Zeile je Song einfügen:

```ts
  { title: '80 Millionen', artist: 'Max Giesinger', tonart: 'G', bpm: 120, notiz: 'Capo 2' },
```

- Titel und Interpret genau wie im Repertoire schreiben (am besten von `/repertoire` kopieren).
- Tonart: Dur als Großbuchstabe (`C`, `F#`, `Bb`), Moll mit kleinem `m` (`Am`, `C#m`). Alles ist optional.
- Im Bühnen-Modus blinkt **Klick** im Tempo und piept leise – praktisch zum Einzählen.

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

## Englisch und Niederländisch

Die Website gibt es auch auf Englisch (`/en/…`) und Niederländisch (`/nl/…`). Für euch ändert sich beim Eintragen
**nichts**: Ihr schreibt alles wie bisher auf Deutsch.

- **Auftritte und Proben** erscheinen automatisch in allen Sprachen. Location- und Ortsnamen werden nicht übersetzt.
- **Sprachhinweis:** Besucher, deren Browser auf Englisch oder Niederländisch eingestellt ist, sehen einmalig einen
  Hinweis auf die passende Sprachfassung. Es gibt keine automatische Umleitung.
- **Neue oder geänderte Texte** (Rückblick, Bio, Bildbeschreibung …) stehen auf den englischen und niederländischen
  Seiten zunächst auf Deutsch, mit dem Hinweis „only available in German“. Die Übersetzungen liegen in
  [`src/app/data/uebersetzungen.ts`](https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/uebersetzungen.ts).
  Jeder Eintrag steht dort neben seinem deutschen Original:

  ```ts
  {
    de: 'Weihnachtsmarkt in Rhede',
    en: 'Christmas market in Rhede',
    nl: 'Kerstmarkt in Rhede',
  },
  ```

  Das Deutsche muss **zeichengenau** mit dem Text in `band.service.ts` übereinstimmen. Am einfachsten kopiert ihr es
  von dort. Übersetzen kann auch Fred oder Claude.
- **Gegenlesen:** Übersetzte Texte zeigen den Hinweis „Translated from German – not yet proofread by the band“.
  Am einfachsten geht das Gegenlesen im Backstage im Bereich **Übersetzungen** (`/backstage/uebersetzungen`):
  1. Sprache wählen. Links steht das Original, rechts die Übersetzung.
  2. Bei Bedarf korrigieren und **„Passt“** anklicken. Alles bleibt im Browser gespeichert, ihr könnt also in mehreren
     Etappen arbeiten.
  3. **Datei für GitHub erzeugen**: Die geänderte Datei ist dann kopiert. „Datei auf GitHub öffnen“, mit Strg+A alles
     markieren, einfügen und „Commit changes“. Danach „Liste leeren“.

  Wer kein GitHub-Konto hat (z. B. Freunde aus den Niederlanden), nimmt **Als Nachricht schicken** und schickt das
  Ergebnis an Fred. Von Hand geht es auch: in der Datei `geprueft: { en: true }` (bzw. `{ nl: true }` oder
  `{ en: true, nl: true }`) beim Eintrag ergänzen.
- Wie viel schon gegengelesen ist und welche Texte noch fehlen, zeigt derselbe Bereich oben unter
  „Übersetzungen der Inhalte“.
- **Impressum und Datenschutz:** Nach einer Änderung am deutschen Text bitte Bescheid geben, damit die Übersetzungen
  nachgezogen werden. Verbindlich ist immer die deutsche Fassung.

## Aufgaben-Checkliste

Was an der Website noch zu tun ist, steht im Backstage im Bereich **Aufgaben** (`/backstage/aufgaben`).

- **Aus den Daten erkannt:** offene Auftritte, Auftritte während einer Abwesenheit, Werbung für öffentliche Auftritte
  in den nächsten vier Wochen, fehlende Rückblicke, Fotos ohne Fotografen-Angabe, Proben ohne Endzeit oder Ort,
  fehlende Bios, offene Technik-Angaben und ungeprüfte Übersetzungen. Diese Punkte verschwinden von selbst, sobald die Angaben eingetragen sind.
- **Von Hand gepflegt:** alles andere, in
  [`src/app/data/aufgaben.ts`](https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/aufgaben.ts).
  Jede Aufgabe hat einen Bereich und ist entweder „Muss“ oder „Kann“. Zum Ergänzen eine Zeile kopieren und anpassen.
  Erledigt: Auf der Seite abhaken – das gilt zunächst nur auf dem eigenen Gerät. Für alle übernehmen: unten
  **Datei für GitHub erzeugen**, „Datei auf GitHub öffnen“, mit Strg+A alles markieren, einfügen und „Commit changes“.
  Danach die Häkchen zurücksetzen. Von Hand geht es auch: `erledigt: true` dazuschreiben oder die Aufgabe löschen.

## Was die automatischen Prüfungen abfangen

Bevor etwas online geht, prüft GitHub unter anderem:

- **Schreibfehler im Code**, z. B. ein fehlendes Komma oder eine fehlende Klammer. Dann schlägt der Schritt „Build“ fehl.
- **Daten:** gültige Daten und Uhrzeiten, „bis“ nicht vor „von“, private Namen nie öffentlich,
  jedes Foto mit Beschreibung (Schritt „Tests“)
- **Fotos:** Eingetragenes Bild fehlt im Ordner oder enthält einen GPS-Standort (Schritt „Fotos vorbereiten“).
- **Links**, **Barrierefreiheit** und **Klicktests** der wichtigsten Seiten
- **Aussehen:** Die wichtigsten Seiten werden fotografiert und mit Referenzbildern verglichen (Schritt
  „Screenshot-Vergleich“). Neue Auftritte, Fotos oder Rückblicke stören dabei nicht. Schlägt der Schritt fehl, sieht
  eine Seite anders aus als vorher. Die Unterschiede stehen rot markiert im Lauf unter **Artifacts →
  screenshot-vergleich**. War die Änderung gewollt, z. B. ein neuer Text auf der Technik-Seite: unter Actions
  **„Screenshots aktualisieren“** starten (*Run workflow*). Danach geht die Seite automatisch neu online.

Nicht weiterkommen? Einfach Fred fragen. Über **History** (Uhr-Symbol oben in der Datei) seht ihr jede frühere
Fassung und könnt den alten Text von dort zurückkopieren.
