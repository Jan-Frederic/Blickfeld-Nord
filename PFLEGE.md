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
| **Anfahrt & Parken** (`anfahrt`) | Optionaler Hinweis auf der Konzertseite, z. B. „Parkplätze hinter dem Saal“. Nur öffentliche Angaben, keine Privatadressen; Übersetzung über „Englisch und Niederländisch“. |
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

Wenn jemand an bestimmten Tagen nicht spielen kann (Urlaub, Schicht, Familienfeier): am einfachsten im Backstage unter
**Termine → Neuen Termin eintragen → Abwesenheit**. Das Formular warnt, wenn im Zeitraum schon ein Auftritt oder eine
Probe steht, und liefert die fertige Zeile. Von Hand: nach `readonly abwesenheiten: Abwesenheit[] = [` suchen und
darunter einfügen:

```ts
    { wer: 'David', von: '2027-07-12', bis: '2027-07-19', grund: 'Urlaub' },
```

- `wer`: David, Matthias, Fred oder `'Band'`. `bis` weglassen, wenn es nur ein Tag ist.
- Im Verfügbarkeitskalender beim Booking erscheinen die Tage als **belegt** – ohne Namen und Grund.
- Das Termin-Formular im Backstage warnt, wenn ein neuer Termin auf so einen Tag fällt, und die Aufgaben-Seite
  meldet Auftritte und Proben, die in eine Abwesenheit fallen.
- Das Repo ist öffentlich: als Grund nur ein Stichwort, keine Details.

## Tonart und Tempo der Songs

Für Setlist, Bühnen-Modus und Laufzettel im Backstage. Für 33 Songs sind die Werte der **Originalaufnahme** schon
recherchiert – die Quelle steht im Song-Dialog. Am einfachsten im Backstage unter **Songs** eintragen: Die Tabelle zeigt
je Song Tonart, Tempo und ob Noten (PDF/Akkorde) da sind; eine Zeile antippen öffnet den Dialog zum Bearbeiten, mit
**Voriger/Nächster** geht es durch die Liste (bleibt als Entwurf auf dem Gerät), dann **Datei für GitHub erzeugen**, „songinfo.ts auf GitHub öffnen“, mit Strg+A alles
markieren, einfügen und „Commit changes“.

- **Original** ist die Tonart der Aufnahme. Spielt ihr den Song anders, unter **Wir spielen** eure Tonart und ggf.
  **Capo** wählen – Setlist und Bühnen-Modus zeigen dann eure Version (z. B. „C · Capo 2“).
- **Tempo per Tippen:** In der Probe im Song-Dialog auf <kbd>👆</kbd> mindestens viermal im Takt tippen – das Tempo wird
  übernommen. Mehr als zwei Sekunden Pause fängt neu an.

Von Hand: in [`src/app/data/songinfo.ts`](https://github.com/Jan-Frederic/Blickfeld-Nord/edit/main/src/app/data/songinfo.ts)
unter `export const SONGINFO: SongInfo[] = [` eine Zeile je Song einfügen:

```ts
  { title: '80 Millionen', artist: 'Max Giesinger', tonart: 'C', spielTonart: 'D', capo: 2, bpm: 120, notiz: 'Intro Gitarre' },
```

- Titel und Interpret genau wie im Repertoire schreiben (am besten von `/repertoire` kopieren).
- Tonart: Dur als Großbuchstabe (`C`, `F#`, `Bb`), Moll mit kleinem `m` (`Am`, `C#m`). Alles ist optional.
- Im Bühnen-Modus blinkt **Klick** im Tempo – praktisch zum Einzählen. Daneben schaltet 🔈 einen leisen Ton dazu,
  und **100 %** stellt das Übungstempo auf 90, 80 oder 70 % (zum langsamen Einüben in der Probe).
- **Tonartsprünge:** Liegen zwei Songs in einem Set im Quintenzirkel weit auseinander (z. B. Ab → E), markiert die
  Setlist das mit ⚡ und nennt eine **Überleitung** (den Dominantseptakkord der neuen Tonart, z. B. H7 vor E) – auch
  auf Laufzettel und Bühnen-Ausdruck. **Übergänge glätten** ordnet die Songs innerhalb der Sets so, dass es möglichst
  wenige Sprünge gibt – erster und letzter Song je Set bleiben.
- **Letztes Set auffüllen** (unter der Setlist, Länge links wählen): ergänzt das letzte Set bis zur gewählten Länge –
  die besten Songs zuerst, in der Tonart passend zum vorigen; die bisherigen Songs bleiben.
- **Vorlage „Weihnachtslieder“** (unter der Setlist, fest auf jedem Gerät): die drei Zuckowski-Lieder als Grundstock
  für den Weihnachtsmarkt – übernehmen und mit weiteren Songs ergänzen. Auf der öffentlichen Repertoire- und
  Songwunsch-Seite stehen die Weihnachtslieder vom 1. bis 24. Dezember automatisch oben.
- Im Bühnen-Modus unter jedem Song 1–5 **Sterne** antippen (oder Taste 1–5), wie er an dem Abend lief. Die
  **Top 100** stehen im Backstage unter **Zahlen**. Sterne anderer Handys kommen über „Datei importieren“ dazu.
- **Setlist vorschlagen** (unter der Setlist): Anzahl Sets und Minuten wählen – die Songs mit den meisten Sternen
  kommen zuerst, der beste ans Set-Ende.
- Nach dem Auftritt übernimmt **Rückblick schreiben** die Setlist und den „Song des Abends“ (meiste Sterne) – sie
  erscheinen dann auf der Konzertseite.

## Notenblätter und Akkordblätter im Bühnen-Modus

Der Bereich **Songs** im Backstage hat drei Unterseiten: **Liste** (Tonart, Tempo, Noten je Song), **Setlists** (die
Setlists aller Auftritte auf diesem Gerät – kommende zuerst, mit Tonart/Tempo, Link zur Setlist und Bühnen-Modus) und
**Noten** (alle PDFs auf dem Gerät, Einlesen und Weitergabe).

Unter **Songs → Liste** die Zeile des Songs antippen – im Dialog unten:

- **PDF hochladen** (auch mehrere) oder ein schon gespeichertes wählen. Ein Song kann **beliebig viele PDFs** haben, z. B.
  Bass- und Gitarrennoten oder verschiedene Versionen – jedes bekommt einen Namen unter **Fassung** (wird aus dem
  Dateinamen vorgeschlagen). Bei einem Songbook mit vielen Songs unter **Seite von/bis** die Seiten dieses Songs angeben
  – dieselbe PDF kann für viele Songs dienen.
- **Akkordblatt (ChordPro):** Text mit Akkorden in eckigen Klammern, z. B. `[G]Einer von [D]80 Millionen`. Mit
  `{key: G}` steht da, in welcher Tonart es geschrieben ist (sonst gilt die Originaltonart), `{soc}`/`{eoc}` umschließen den
  Refrain, `{c: Intro 2x}` ist ein Hinweis. Im Bühnen-Modus erscheinen die Akkorde automatisch in **eurer** Tonart –
  mit Capo als Griffbild (z. B. „Wir spielen E, Capo 2“ → Griffe in D). Mit − und + lässt es sich von Hand verschieben.
- **.pro-Dateien** (ChordPro, auch `.cho`, `.chopro`, `.chordpro`, `.crd`) direkt einlesen: beim Song **.pro-Datei
  laden** im Dialog, oder viele auf einmal unter **Songs → Noten** (siehe unten). Jede Datei landet automatisch beim passenden Song – über `{title:}`/`{artist:}` in der Datei, sonst
  über den Dateinamen (auch „Interpret - Titel.pro“). Was sich nicht zuordnen lässt, wird genannt. Ältere Dateien mit
  Umlauten aus Windows-Programmen werden richtig gelesen; `{capo: 2}` in der Datei wird beim Transponieren berücksichtigt.

Im **Bühnen-Modus** oben auf das Noten-Symbol tippen. Weiter blättern wie gewohnt – Tippen rechts, Wischen, Pfeiltaste
oder **Bluetooth-Fußpedal** (die senden Pfeiltasten): erst durch die Seiten, am Ende zum nächsten Song, dessen Noten
dann gleich erscheinen. Zurück landet auf der letzten Seite des vorigen Songs. Lange Seiten oder **volle Breite**
(Symbol oben) werden erst gescrollt, dann umgeblättert. **Mitscrollen** lässt ein Akkordblatt in der Länge des Songs
durchlaufen. Hat ein Song mehrere Fassungen (mehrere PDFs und/oder Akkorde), steht oben ein **Auswahlfeld**. Die Wahl
wird je Song gemerkt und gilt auch als Vorliebe für die anderen Songs: wer „Bass“ wählt, bekommt bei jedem Song mit
einem PDF namens „Bass“ dieses, wer „Akkorde“ wählt, die Akkordblätter – auch beim Zurückblättern.

**Viele Dateien oder ganze Ordner einlesen:** unter **Songs → Noten** auf **Dateien einlesen (PDF, .pro)** oder
**Ganzen Ordner einlesen** (am Computer; auf iPhone/iPad Dateien wählen). Jede Datei landet beim passenden Song – über
Titel und Interpret im **Dateinamen**, in beliebiger Reihenfolge und Schreibweise, z. B. `Iris - Goo Goo Dolls - Bass.pdf`
oder `GooGooDolls_Iris_(Gitarre v2).pdf`. Was sonst im Namen steht („Bass“, „Gitarre v2“), wird die Fassung. PDFs
kommen als weitere Fassung dazu (dieselbe Datei nicht doppelt), Akkordblätter ersetzen ein vorhandenes. Was sich nicht
zuordnen lässt, wird genannt – dann die Datei umbenennen oder im Song-Dialog einzeln laden.

**Zur Kontrolle** ohne Setlist: unter **Songs** auf ▶ in einer Zeile tippen – der Bühnen-Modus startet bei diesem Song
mit offenen Noten und blättert ab da durch die Liste (wie gerade gefiltert), Tippen, Wischen, Pedal und Klick wie auf
der Bühne. Im Song-Dialog geht das mit **Im Bühnen-Modus ansehen**; beim Schließen geht es zurück in den Dialog.

**Wichtig:** Noten bleiben nur auf dem jeweiligen Gerät und gehen nie an GitHub – Notenblätter und Liedtexte sind
urheberrechtlich geschützt, das Repository ist öffentlich. Weitergeben unter **Songs → Noten** mit **Notenblätter an die
Band** (eine Datei für Messenger/AirDrop), auf dem anderen Gerät **Notenblätter importieren**. Auf iPhone und iPad die
Backstage-Seite zum **Home-Bildschirm** hinzufügen – sonst darf Safari gespeicherte Daten nach 7 Tagen ohne Besuch
löschen. Offline klappt die Anzeige, sobald einmal mit Netz Noten geöffnet oder hochgeladen wurden.

## Gerät aufräumen (Abgleich)

Backstage-Daten liegen nur im Browser des jeweiligen Geräts. Unter **Abgleich → Daten auf diesem Gerät** steht jeder
einzelne Eintrag, nach Bereichen gruppiert und verständlich benannt (z. B. „Setlist · 04.12.2026 · Weihnachtsmarkt“),
mit Inhalt („12 Songs, 1 Pause“) und Größe – dazu alle Noten (Songs mit Noten, PDFs und wo sie genutzt werden):

- Titel antippen öffnet die passende Seite (Setlist, Packliste, Probe …).
- `{ }` zeigt den gespeicherten Inhalt und lässt ihn von Hand ändern (nur gültiges JSON wird gespeichert) – für
  Notfälle, normal ändert man auf der Seite des Bereichs.
- Suchen (z. B. „2026“, „Rhede“, „Setlist“), auswählen und die Auswahl **teilen** (Datei zum Importieren auf anderen
  Geräten) oder **löschen**.

Darunter **Aufräumen**:

- **Übersicht:** je Bereich (Setlists, Sterne, Packlisten, Vor Ort, Werbeplan, Proben, Songs-Entwurf, Aufgaben,
  Einstellungen, Noten, Seiten für unterwegs) Anzahl und Größe – mit 🗑 einzeln löschen.
- **Vergangene Auftritte und Proben:** Alter wählen (gleich danach, 30 Tage, 6 Monate, 1 Jahr) und welche Bereiche.
  Vorgewählt sind Packlisten, Vor Ort, Werbeplan und Proben; Setlists und Sterne bleiben, weil Rückblick, Top 100
  und Setlist-Vorschlag sie brauchen.
- **Verwaiste Einträge:** Daten zu abgesagten oder verschobenen Auftritten, Noten von Songs, die nicht mehr im
  Repertoire sind, und PDFs, die kein Song nutzt.
- **Stand der Band übernehmen:** eine Backstage-Datei importieren und dabei alles Bisherige ersetzen – danach hat das
  Gerät genau den Stand der Datei (Einstellungen und Noten bleiben).
- **Alles löschen:** setzt die Website auf dem Gerät komplett zurück (Bestätigung durch Eintippen von „LÖSCHEN“).

Vorher sichern: **Alles an die Band schicken** (oben) und für Noten **Songs → Noten → Notenblätter an die Band**.

## OneDrive einrichten (Abgleich)

Im Backstage unter **Abgleich → OneDrive** lassen sich alle Daten aus einem OneDrive-Ordner einlesen – Backstage-Dateien
(Setlists, Packlisten …), Notenpakete, PDFs und Akkordblätter (.pro), auch aus Unterordnern; Noten werden über Titel
und Interpret im Dateinamen zugeordnet – und der Stand des Geräts dort sichern (Ordner `Backstage`, wahlweise mit
Notenblättern). Gedacht für ein **privates Microsoft-Konto** (Outlook.com, Hotmail, Live – privates OneDrive). Ist der
Browser schon bei Microsoft angemeldet (z. B. onedrive.live.com oder Outlook im Browser offen, Edge mit Microsoft-Konto),
verbindet es sich ohne Passwort (Single Sign-On); sonst einmal im Popup anmelden. Danach bleibt das Gerät verbunden.
Blockiert der Browser Drittanbieter-Cookies (Safari, Firefox), klappt das stille Anmelden nicht – dann eben das Popup.

Einmalig nötig ist eine **App-Registrierung** bei Microsoft (kostenlos):

1. [entra.microsoft.com](https://entra.microsoft.com) → **App-Registrierungen** → **Neue Registrierung**
   (mit privatem Microsoft-Konto braucht es dafür ein kostenloses Azure-Konto).
2. Name: „Blickfeld Nord Backstage“. Unterstützte Kontotypen: **Nur persönliche Microsoft-Konten**.
3. Umleitungs-URI: Plattform **Single-Page-Anwendung (SPA)**, Adresse `https://blickfeld-nord.de/auth/`.
4. Unter **API-Berechtigungen** → Microsoft Graph → Delegiert: `Files.ReadWrite` hinzufügen (`User.Read` ist schon da).
   Beim ersten Verbinden fragt Microsoft einmal, ob die App auf OneDrive zugreifen darf.
5. Die **Anwendungs-ID (Client-ID)** in `src/app/data/onedrive-config.ts` bei `clientId` eintragen (oder an Claude
   schicken). Sie ist kein Geheimnis. (`tenant: 'consumers'` = private Konten; für Firmenkonten wäre es `common`.)

Die Daten gehen direkt vom Browser zu OneDrive, nicht über GitHub. Noten bleiben damit weiterhin aus dem öffentlichen
Repository heraus.

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

Am einfachsten im Backstage auf der Seite des Auftritts (nach dem Auftritt): **Rückblick schreiben** aufklappen,
Überschrift, Text und Fotos eintragen, **Block kopieren** und wie unten beschrieben einfügen. Die Fotos vorher wie
oben unter „Foto in die Galerie“ (Schritt 1–3) in `public/historie` hochladen. Von Hand geht es so:

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

## Jahresrückblick

Unter `/jahr/<Jahr>` (z. B. `/jahr/2026`) steht ein öffentlicher Rückblick: Zahlen, alle gespielten Auftritte und die
Momente aus der Historie. Er entsteht automatisch aus den Auftritten und Rückblicken in `band.service.ts` – private
Feiern erscheinen nur mit ihrem öffentlichen Namen (sonst „Private Feier“) und ohne Ort. Den Rückblick aufs laufende
Jahr gibt es ab dem **15.12.**; GitHub baut die Seite jeden Morgen von selbst neu. Der Link steht oben auf der Historie.

## Stimmen von Veranstaltern

Freigegebene Zitate in `src/app/data/stimmen.ts` eintragen (Wortlaut, wer, optional Anlass). Sobald dort ein Eintrag
steht, erscheint im Booking und im Pressekit der Bereich „Das sagen Veranstalter“ – vorher ist er unsichtbar. Nur echte
Zitate mit Freigabe; bei privaten Feiern ohne Namen der Gastgeber.

## Woher Besucher kommen (QR-Codes)

Die QR-Codes auf Plakat, Story und QR-Karte hängen einen Herkunftsvermerk an die Adresse, z. B.
`https://blickfeld-nord.de/konzerte/2026-12-04/?ref=plakat`. GoatCounter zeigt den Wert im Dashboard unter
„Referrers“; im Backstage unter **Besucher** steht „Gekommen über“ (Plakat, Story, QR-Karte, Banner). Der Vermerk
verschwindet nach dem Aufruf aus der Adresse, damit weitergeteilte Links nicht mitzählen.

> **Selbst testen:** GoatCounter wertet `ref` und `utm_campaign` selbst aus, zählt sie aber nur beim **ersten Aufruf
> einer Seite je Besuch** (Gerät + Netz, einige Stunden). Wer die Seite vorher schon offen hatte, taucht unter
> „Referrers“/„Campaigns“ nicht auf. Zum Testen ein anderes Gerät bzw. Mobilfunk statt WLAN nehmen, privates
> Fenster reicht meist nicht. Unter Settings → „Ignore IPs“ eingetragene Adressen zählen gar nicht. Die Zahlen
> erscheinen mit einigen Minuten Verzögerung.

- **Erlaubte Vermerke:** `plakat`, `story`, `qr-karte`, `banner`, `geteilt`, `text` – Liste in `src/app/analytics.ts`
  (`HERKUNFT`). Andere Werte werden nicht gezählt.
- **Kampagne je Konzert:** Plakat, Story, der kopierte Beitragstext („Text kopieren“) und der Teilen-Button der
  Konzertseite hängen zusätzlich
  `utm_campaign=konzert-<ID>` an (z. B. `konzert-2026-12-04`). GoatCounter listet sie unter „Campaigns“; im Backstage
  zeigt die Seite des Auftritts unter „Kampagne“, wie oft die Konzertseite aufgerufen wurde und wie viele über Plakat,
  Story, den Beitragstext oder einen geteilten Link kamen (12 Monate). Plakat und Story deshalb immer frisch im Backstage erzeugen.
- **Banner mit QR-Code** (Pressekit): führt auf `https://blickfeld-nord.de/?ref=banner`. Für weitere eigene
  Druckstücke einen der erlaubten Vermerke verwenden oder die Liste ergänzen.

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

**Auf dem eigenen Rechner prüfen** (für Entwickler): `npm run pruefen` baut die Seite genau wie GitHub (inklusive
Fehlerseite und Backstage-Weiterleitung) und führt Klicktests, Barrierefreiheit, Linkcheck und Tests aus.

**Tote Links:** Einmal pro Woche (montags) prüft GitHub alle externen Links, etwa zu Freunden, Instagram oder Spotify.
Ist einer nicht mehr erreichbar, erscheint unter **Issues** „Tote Links auf der Website“ mit der Liste. Das Issue
schließt sich von selbst, sobald alle Links wieder gehen.

Nicht weiterkommen? Einfach Fred fragen. Über **History** (Uhr-Symbol oben in der Datei) seht ihr jede frühere
Fassung und könnt den alten Text von dort zurückkopieren.
