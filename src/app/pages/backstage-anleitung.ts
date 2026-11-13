import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Zurueck } from '../zurueck';

// Backstage → Anleitung „Übe-, Probe- und Bühnen-Modus“ (/backstage/anleitung/modi, Link oben in der Übersicht): Übe-, Probe- und Bühnen-Modus im Vergleich, die gemeinsamen
// Begriffe (Titelanzeige, Notenansicht, PDF, Akkordblatt …) und die fünf Übe-Status mit dem Karteikasten. Reiner Text –
// bei Änderungen an den Modi hier und in PFLEGE.md nachziehen. Styles global (styles.scss, app-backstage-anleitung).
const ZEILEN: { was: string; buehne: string; probe: string; ueben: string }[] = [
  { was: 'Wofür', buehne: 'Auftritt spielen', probe: 'Gemeinsam proben', ueben: 'Allein üben' },
  { was: 'Für wen', buehne: 'Die ganze Band', probe: 'Die Band – Status und Notizen gelten je Person', ueben: 'Nur ich (braucht „Ich bin …“ unter Einstellungen)' },
  { was: 'Songs kommen aus', buehne: 'Setlist des Auftritts, mit Sets und Pausen', probe: 'Probenplan der Probe; Generalprobe: Setlist des nächsten Auftritts', ueben: 'Eigener Karteikasten: heute fällige zuerst, danach alle übrigen' },
  { was: 'Startet in', buehne: 'Titelanzeige', probe: 'Titelanzeige', ueben: 'Notenansicht' },
  { was: 'Starten über', buehne: 'Setlist des Auftritts oder „Als Nächstes“ in der Übersicht', probe: 'Probenseite „Probe-Modus starten“ oder „Als Nächstes“', ueben: 'Üben-Seite „Übe-Modus“ oder der Knopf neben „Üben“ in der Übersicht' },
  { was: 'Pro Song festhalten', buehne: 'Sterne (1–5): wie lief der Song an diesem Abend', probe: 'Probe-Leiste unter dem Song: Status-Umschalter, eigene Notiz, Status der anderen als Zeichen (↻ David), Notizen der anderen, Notizen der letzten Probe; Status auch in der Kopfleiste der Notenansicht', ueben: 'Status-Umschalter – in der Titelanzeige und in der Kopfleiste' },
  { was: 'Zum nächsten Song', buehne: 'Selbst blättern: Pedal, Pfeiltaste, Tippen, Wischen', probe: 'Selbst blättern', ueben: 'Automatisch nach jeder Status-Wahl, nachdem der Status kurz aufgeleuchtet hat; „Üben“ hängt die Karte hinten noch einmal an. Ein paar Sekunden lang holt „↶ Rückgängig“ die Karte samt altem Kasten zurück' },
  { was: 'Uhr', buehne: 'Set-Uhr gegen die geplante Spielzeit', probe: 'Uhr gegen die Probendauer, Zeit je Song, Rest je offenem Song', ueben: '–' },
  { was: 'Song-Liste', buehne: 'Ja (Titelanzeige)', probe: 'Ja – auch in der Kopfleiste der Notenansicht', ueben: 'Ja – die Karten, auch in der Kopfleiste der Notenansicht' },
  { was: 'Wunsch-Suche', buehne: 'Ja', probe: 'Ja', ueben: 'Nein' },
  { was: 'Wischen', buehne: 'Seitlich: blättern. Hoch: Notenansicht gleitet herein. Runter (Kopfleiste sichtbar, Blatt oben): zurück zur Titelanzeige', probe: 'wie im Bühnen-Modus', ueben: 'wie im Bühnen-Modus' },
  { was: 'Spotify', buehne: '–', probe: 'Unter Einstellungen wählbar (Standard: aus): eingebetteter Player („♫ Auf Spotify anhören“ in der Titelanzeige), Fernsteuerung der Spotify-App oder im Browser abspielen (beides Premium) – ▶ spielt den ganzen Song, ±10 s, Fortschritt zum Springen, Sprungmarken für die Band (▶ beginnt am Einsatz), Schleife A–B und – mit der Einstellung „Übergänge proben“ – Übergang zum nächsten Song (letzte 15 s, dann weiter ab dem Einsatz); in der Notenansicht ↺10 und ♫ ▶ in der Kopfleiste oder abgedockt als verschiebbares Feld über den Noten; beim Weiterblättern läuft der jeweils angezeigte Song. Einstellungen → Spotify zeigt eine Checkliste zum Einrichten und kann eine Anleitung an die anderen teilen', ueben: 'wie im Probe-Modus' },
  { was: 'Mitschnitt', buehne: '–', probe: 'Mikrofon in der Probe-Leiste: diesen Song aufnehmen und nachhören', ueben: 'Mitschnitt-Panel: Proben-Aufnahmen anhören, Schleife, langsamer' },
  { was: 'Klick', buehne: 'Originaltempo', probe: 'startet bei 100 %, Übungstempo bis 70 %', ueben: 'startet bei 100 %, Tempo-Training 70 → 100 %' },
  { was: 'Am Ende', buehne: 'Zurück zur Setlist bzw. Übersicht', probe: 'Zusammenfassung (Sitzt / Nochmal mit Namen / Nicht drangekommen, Zeit) – Rest mit einem Klick auf die nächste Probe', ueben: 'Ergebnis, z. B. „3× Sitzt, 1× Eingenordet 🎉“' },
  { was: 'Wirkt auf', buehne: 'Sterne-Rangliste (Zahlen), Setlist-Vorschlag', probe: 'Probenplan, eigener Status, Bühnenreife, Proben-Verlauf des Songs, Probe-Vorschlag', ueben: 'Eigener Karteikasten und Status, Bühnenreife' },
];

const BEGRIFFE: { name: string; text: string }[] = [
  { name: 'Titelanzeige', text: 'Großer Songtitel mit Tonart, Capo, Tempo, Klick, Einzählen und „Als Nächstes“ – die normale Ansicht im Bühnen-Modus.' },
  { name: 'Notenansicht', text: 'Das Notenblatt im Vollbild. Der Noten-Knopf (oben rechts, orange) oder Hochwischen in der Titelanzeige holt sie herein; Herunterwischen oder der Noten-Knopf führt zurück. Zurück in der Notenansicht geht es auf derselben Seite weiter.' },
  { name: 'Knöpfe der Titelanzeige', text: 'Von links nach rechts: Schriftgröße (A− A+), Stimmgerät, Wunsch-Suche (nicht im Übe-Modus), Song-Liste, Noten, Beenden.' },
  { name: 'PDF', text: 'Hochgeladene Noten als PDF – mehrere je Song möglich, auch nur ein Seitenbereich aus einem Songbook. Dazu: Seitenzähler, Markieren (Stift), ganze Seite oder volle Breite, Halbseiten-Blättern.' },
  { name: 'Akkordblatt', text: 'ChordPro-Datei (.pro), im Auswahlmenü „Akkorde“. In die Tonart der Band transponiert, mit Griffbild bei Capo, − / + verschiebt um einen Halbton, Mitscrollen mit einstellbarem Scroll-Tempo.' },
  { name: 'Fassung', text: 'Hat ein Song mehrere Noten, wählt man oben in der Notenansicht, welche gilt (die PDFs mit Namen oder „Akkorde“). Die Wahl wird je Song gemerkt.' },
  { name: 'Kopfleiste', text: 'Die Leiste oben in der Notenansicht: Titel, Seite, Fassung, Werkzeuge des Blatts, im Übe- und Probe-Modus Mitschnitt und Status, dann Noten-Knopf und Beenden. Nach oben wischen blendet sie aus, nach unten holt sie zurück – ist sie schon da, geht es zur Titelanzeige.' },
  { name: 'Song-Liste', text: 'Navigation rechts mit allen Songs der Setlist bzw. des Plans – antippen springt dorthin. Im Übe- und Probe-Modus auch in der Kopfleiste der Notenansicht.' },
  { name: 'Status-Umschalter', text: 'Die fünf Übe-Status nebeneinander, der aktuelle ist farbig – überall gleich: Probe-Leiste, Titelanzeige im Übe-Modus und Kopfleiste der Notenansicht (Übe- und Probe-Modus). Der gewählte Status leuchtet kurz auf und gilt sofort; der Song bleibt stehen (weiter per Wischen, Tippen oder Pedal). Ein zweiter Tipp auf derselben Karte ersetzt den ersten. Schmal nur ○ ✎ ↻ ✓ ✓✓.' },
  { name: 'Probe-Leiste', text: 'Unter jedem Song im Probe-Modus: Status-Umschalter, Mikrofon, eigene Notiz, die Status und Notizen der anderen, Notizen der letzten Probe, Zeit.' },
  { name: 'Mitschnitt-Panel', text: 'Im Übe-Modus über „Mitschnitt“ einblendbar: Proben-Aufnahmen des Songs anhören, Stelle in Schleife, langsamer abspielen.' },
  { name: 'Dein Weg', text: 'Im Song-Dialog: wie sich dein Übe-Status mit diesem Song entwickelt hat, z. B. „✎ Üben 02.11. → ↻ Wackelt noch 05.11. → ✓ Sitzt 10.11. · in 8 Tagen“.' },
  { name: 'Übe-Erinnerung', text: 'Unter Einstellungen → Ich bin: höchstens einmal am Tag ab der gewählten Uhrzeit „5 Karteikarten sind heute fällig“ (installierte App auf Android). Die Zahl der fälligen Karten am App-Symbol zeigen nur Computer (installierte App in Chrome/Edge) und iPhone/iPad (zum Home-Bildschirm hinzugefügt, Mitteilungen erlaubt); Android zeigt am Symbol höchstens einen Punkt, wenn eine Erinnerung da ist.' },
  { name: 'Zurück-Schutz', text: 'In allen drei Modi beendet „Zurück“ des Handys (Wischen vom Rand) den Modus nicht sofort: erst ein zweites „Zurück“ kurz danach. Lädt die Seite neu, öffnen sich Übe- und Probe-Modus von selbst wieder.' },
  { name: 'Anlass', text: 'Text oben links vor dem Songtitel – Name des Auftritts, „Probe 12.11.“ oder „Übe-Modus“.' },
];

const STATUS_ZEILEN: { zeichen: string; name: string; kasten: string; text: string }[] = [
  { zeichen: '○', name: 'Nicht gelernt', kasten: '–', text: 'Jeder neue Song und alle ohne Angabe. Nicht im Karteikasten.' },
  { zeichen: '✎', name: 'Üben', kasten: 'Kasten 1', text: 'Jeden Tag dran; im Übe-Modus kommt die Karte in derselben Runde noch einmal.' },
  { zeichen: '↻', name: 'Wackelt noch', kasten: 'Kasten 2–3', text: 'Wieder dran nach 1 bzw. 3 Tagen. „Wackelt noch“ bei einem Song, der schon wackelt, schiebt ihn im Übe-Modus von Kasten 2 nach 3.' },
  { zeichen: '✓', name: 'Sitzt', kasten: 'Kasten 4–5', text: 'Wieder dran nach 7 bzw. 14 Tagen. „Sitzt“ bei einem Song, der schon in Kasten 4 sitzt, schiebt ihn im Übe-Modus nach Kasten 5; in Kasten 5 bleibt er.' },
  { zeichen: '✓✓', name: 'Eingenordet', kasten: 'raus', text: 'Fällt aus dem Karteikasten – nur wenn man ausdrücklich „Eingenordet“ wählt.' },
];

@Component({
  selector: 'app-backstage-anleitung',
  imports: [RouterLink, MatIconModule, Zurueck],
  template: `
    <section class="section">
      <app-zurueck ziel="/backstage" text="Backstage" />
      <p class="kicker">Backstage · Anleitung</p>
      <h2>Übe-, Probe- und Bühnen-Modus</h2>
      <p class="alle"><a routerLink="/backstage/anleitung"><mat-icon aria-hidden="true">menu_book</mat-icon> Alle Anleitungen</a></p>
      <p class="lead">Alle drei Modi nutzen dieselbe Oberfläche – Titelanzeige und Notenansicht. Sie unterscheiden sich darin, woher die
        Songs kommen, was man pro Song festhält und was am Ende passiert.</p>

      <div class="kurz">
        <a class="modus-karte" routerLink="/backstage/termine"><mat-icon>theater_comedy</mat-icon><strong>Bühnen-Modus</strong><span>Spielen und festhalten, wie es lief.</span></a>
        <a class="modus-karte" routerLink="/backstage/termine"><mat-icon>piano</mat-icon><strong>Probe-Modus</strong><span>Gemeinsam arbeiten: jeder setzt seinen Status, schreibt seine Notiz – am Ende steht fest, was zur nächsten Probe mitgeht.</span></a>
        <a class="modus-karte" routerLink="/backstage/ueben"><mat-icon>style</mat-icon><strong>Übe-Modus</strong><span>Allein den eigenen Karteikasten abarbeiten, Karte für Karte.</span></a>
      </div>

      <h3>Im Vergleich</h3>
      <table class="vergleich">
        <thead><tr><th scope="col"><span class="sr-only">Merkmal</span></th><th scope="col">Bühnen-Modus</th><th scope="col">Probe-Modus</th><th scope="col">Übe-Modus</th></tr></thead>
        <tbody>
          @for (z of zeilen; track z.was) {
            <tr>
              <th scope="row">{{ z.was }}</th>
              <td data-modus="Bühnen-Modus">{{ z.buehne }}</td>
              <td data-modus="Probe-Modus">{{ z.probe }}</td>
              <td data-modus="Übe-Modus">{{ z.ueben }}</td>
            </tr>
          }
        </tbody>
      </table>

      <h3>Die fünf Übe-Status</h3>
      <p class="hinweis">Je Musiker und Song ein Status – gesetzt im Song-Dialog, im Probe-Modus, im Übe-Modus oder in der Nachbereitung.
        Der Status ist der Karteikasten: daraus rechnet sich auch die Bühnenreife.</p>
      <ul class="status">
        @for (s of status; track s.name) {
          <li><span class="zeichen" aria-hidden="true">{{ s.zeichen }}</span><strong>{{ s.name }}</strong><span class="kasten">{{ s.kasten }}</span><span class="text">{{ s.text }}</span></li>
        }
      </ul>

      <h3>Begriffe</h3>
      <dl class="begriffe">
        @for (b of begriffe; track b.name) {
          <div><dt>{{ b.name }}</dt><dd>{{ b.text }}</dd></div>
        }
      </dl>
    </section>
  `,
})
export class BackstageAnleitung {
  protected readonly zeilen = ZEILEN;
  protected readonly begriffe = BEGRIFFE;
  protected readonly status = STATUS_ZEILEN;
}
