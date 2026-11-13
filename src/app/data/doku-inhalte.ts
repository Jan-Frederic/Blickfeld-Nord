// Ausführliche Anleitungen je Backstage-Unterseite (/backstage/anleitung/<thema>, pages/backstage-doku.ts). Die Seiten
// selbst halten ihre Texte kurz und verlinken oben hierher (pages/doku-link.ts). Nur beschreiben, was die App wirklich
// kann – bei Änderungen an einer Seite hier mitziehen (Technik und Dateinamen stehen in PFLEGE.md, nicht hier).
// „Übe-, Probe- und Bühnen-Modus“ (modi) hat eine eigene Seite mit Vergleichstabelle (pages/backstage-anleitung.ts).
import type { DokuId } from './doku-themen';

export interface DokuAbschnitt {
  titel: string;
  text?: string;
  punkte?: string[];
}
export interface Doku {
  /** ein, zwei Sätze: wofür die Seite da ist */
  kurz: string;
  abschnitte: DokuAbschnitt[];
  /** verwandte Anleitungen */
  siehe?: DokuId[];
}

export const DOKU: Record<Exclude<DokuId, 'modi'>, Doku> = {
  uebersicht: {
    kurz: 'Die Startseite des Backstage: Suche, was heute fällig ist, dein Üben und die nächsten Termine – mit direktem Start in Bühnen-, Probe- und Übe-Modus.',
    abschnitte: [
      {
        titel: 'Suche über alles',
        text: 'Ganz oben: findet Auftritte, Proben, Songs aller Spotify-Listen, Kontakte, Sammlungen und Bereiche. Ein Song-Treffer öffnet Songs → Liste mit der Suche, eine Sammlung ihre Seite.',
      },
      {
        titel: 'Heute fällig',
        text: 'Was jetzt dran ist, mit Link dorthin, wo es sich erledigen lässt. Zum Beispiel:',
        punkte: [
          'fällige Karteikarten – startet direkt den Übe-Modus',
          'Probe in 7 Tagen: Plan an die Band schicken',
          'Nachfragen bei Veranstaltern, die seit 14 Tagen nicht geantwortet haben',
          'Saison-Update an die Band (erste Woche im Monat)',
          'Rückblick nach einem Auftritt, Backup, wenn es lange her ist',
          'ein gescheitertes Website-Update (live ist dann noch der alte Stand)',
        ],
      },
      {
        titel: 'Üben',
        text: 'Die Karte „Üben“ führt zu deinem Karteikasten, der Knopf daneben startet sofort den Übe-Modus mit den fälligen Songs.',
      },
      {
        titel: 'Als Nächstes',
        text: 'Die kommenden Auftritte und Proben. Rechts neben jedem Termin startet der Bühnen-Modus (Auftritt, mit seiner Setlist) bzw. der Probe-Modus (Probe) direkt; beim Beenden geht es zurück in die Übersicht.',
      },
      {
        titel: 'Menü und Zurück',
        text: 'Die Bereiche – Songs, Termine, Aufgaben, Technik, Material, Sprachen, Zahlen, Abgleich, Einstellungen – stehen im Menü oben. Der Pfeil oben auf Unterseiten führt zur Seite zurück, von der du kamst.',
      },
      {
        titel: 'Anleitungen',
        text: 'Jede Unterseite hat oben einen Link „Anleitung: …“ zu ihrer ausführlichen Beschreibung. Alle Anleitungen stehen gesammelt unter „Alle Anleitungen“.',
      },
    ],
    siehe: ['modi', 'ueben', 'termine'],
  },

  einrichtung: {
    kurz: 'Der Einrichtungsassistent führt nach der ersten Anmeldung auf einem Gerät in fünf Schritten durch das Wichtigste. Jeder Schritt lässt sich überspringen, alles bleibt unter Einstellungen änderbar.',
    abschnitte: [
      { titel: '1. Ich bin', text: 'Wer das Gerät benutzt – vorbelegt aus deinem Microsoft-Konto. Damit zählen Zusagen, Übe-Status und Notizen für dich.' },
      { titel: '2. Dieses Gerät', text: 'Ein Name wie „Freds iPhone“ – so steht das Gerät in der Geräteliste unter Abgleich.' },
      {
        titel: '3. Synchronisation',
        text: 'Den OneDrive-Ordner wählst du selbst. Der Ordner der Band endet auf „BlickfeldNord (geteilt)/Sync“ (bei dem, der ihn geteilt hat, ohne „(geteilt)“) – der Hinweis wird grün, sobald du dort bist. Auf dem Gerät liegt die Kopie im Speicher der App; abgeglichen wird in beide Richtungen, automatisch beim Öffnen und alle 15 Minuten.',
      },
      { titel: '4. Spotify', text: 'Vorgewählt ist „Im Browser abspielen“. Auf iPhone und iPad klappt das oft nicht – dann „Spotify-App fernsteuern“ wählen. „Mit Spotify verbinden“ meldet dich an und kommt in diesen Schritt zurück.' },
      { titel: '5. Fertig', text: 'Die geklärten Standards im Überblick und – wo möglich – „Als App installieren“.' },
      { titel: 'Noch einmal', text: 'Unter Einstellungen → „Einrichtung durchgehen“ lässt sich der Assistent jederzeit wieder öffnen.' },
    ],
    siehe: ['einstellungen', 'abgleich'],
  },

  termine: {
    kurz: 'Alle Auftritte – öffentlich und privat – mit Status und Notizen, dazu die Proben. Von hier aus geht es zu jedem Termin, zur Saison und zu den Kontakten.',
    abschnitte: [
      { titel: 'Liste und Filter', text: 'Je Termin Datum, Art (Auftritt oder Probe), Status und Kommentar. Über die Filter blendest du Arten ein und aus. Antippen öffnet die Seite des Auftritts bzw. der Probe.' },
      { titel: 'Saisonplanung', text: 'Die nächsten 12 Monate als Zeitleiste: freie Monate gestrichelt, offene Anfragen orange, private kursiv, komplett gesperrte Monate rot. Dazu „Wieder anfragen“ – siehe Anleitung „Saison“.' },
      {
        titel: 'Neuen Termin eintragen',
        text: 'Formular für Auftritt, Probe oder Abwesenheit. Es warnt, wenn der Tag schon belegt ist, jemand abwesend ist oder der Tag in der Schonzeit eines geklärten Auftritts liegt. Heraus kommt eine fertige Zeile: kopieren, Datei auf GitHub öffnen, einfügen, speichern – danach geht der Termin von selbst online.',
        punkte: [
          'geklärt: nur geklärte Auftritte erscheinen öffentlich',
          'privat: erscheint nie öffentlich, nur im Backstage',
          'Abwesenheit: Tage, an denen jemand nicht kann – öffentlich nur als „belegt“, ohne Namen und Grund',
        ],
      },
      { titel: 'Terminabfrage', text: 'Mögliche Tage wählen → fertiger Text für die WhatsApp-Gruppe. Die Antworten hier ankreuzen – daraus wird der Eintrag der Abwesenheiten.' },
      { titel: 'Kalender abonnieren', text: 'Alle Termine als Kalender-Abo (Google, Apple, Outlook). Microsoft 365 übernimmt aus Abos nur etwa ein Jahr im Voraus.' },
    ],
    siehe: ['auftritt', 'probe', 'saison', 'kontakte'],
  },

  saison: {
    kurz: 'Die nächsten 12 Monate auf einen Blick – Auftritte, Proben, Abwesenheiten und freie Monate – zum Ausdrucken oder Teilen in der Bandbesprechung.',
    abschnitte: [
      { titel: 'Monate', text: 'Je Monat die Auftritte, Proben und wer wann nicht kann. Freie Monate sind markiert; Monate ohne freien Tag (Schonzeit, Band verhindert, Auftritte) stehen rot als „komplett gesperrt“.' },
      { titel: 'Schonzeit', text: 'Ist ein Auftritt geklärt, sind seine Woche und je drei volle Wochen davor und danach automatisch reserviert. Eintragen muss man dafür nichts; Proben sind nicht betroffen.' },
      { titel: 'Wieder anfragen', text: 'Orte, an denen vor einem Jahr gespielt wurde und noch nichts Neues geplant ist – mit Jahrestag, „am besten bis …“ (drei Monate vorher) und der Kurzfassung eurer Bewertung des Veranstalters. „Anfrage schreiben“ macht eine fertige Nachricht mit den noch freien Monaten.' },
      { titel: 'Drucken / als PDF', text: 'Alles auf einer A4-Seite (quer) für die Bandbesprechung.' },
      { titel: 'Als Bild teilen', text: 'Ein Bild mit allen 12 Monaten für die WhatsApp-Gruppe. Damit ist auch das monatliche „Saison-Update an die Band“ unter Heute fällig erledigt – für die ganze Band.' },
    ],
    siehe: ['termine', 'kontakte'],
  },

  kontakte: {
    kurz: 'Die Ansprechpartner der Veranstalter – nur auf euren Geräten und im OneDrive, nie auf der Website.',
    abschnitte: [
      { titel: 'Je Veranstalter', text: 'Name, WhatsApp bzw. Telefon, E-Mail, letzter und nächster Auftritt dort. Ein Kontakt gilt für alle Auftritte am selben Ort. Neue Veranstalter ohne Auftritt lassen sich hier anlegen; in Chrome auf Android auch „Aus dem Adressbuch“.' },
      { titel: 'Anfragen', text: '„Anfrage schreiben“ öffnet eine fertige Nachricht (WhatsApp, sonst E-Mail). Jede Anfrage wird mit Datum gemerkt; „beantwortet“ setzt das zurück. Kommt nach 14 Tagen kein Termin zustande, steht „Nachfragen“ unter Heute fällig.' },
      { titel: 'Zusage → Auftritt eintragen', text: 'Setzt die Anfrage auf beantwortet und öffnet das Termin-Formular mit Location und Ort vorbelegt – Datum und Uhrzeit ergänzen.' },
      { titel: 'Bewerten', text: 'Technik, Publikum, Bezahlung pünktlich oder spät und eine Notiz. Die Kurzfassung steht bei „Wieder anfragen“ – gelb, wenn zwei Punkte schlecht waren. „Wo lohnt es sich wieder?“ sortiert die Veranstalter nach Bewertung und Zahl der Auftritte.' },
      { titel: 'Mappe', text: 'Ein PDF mit Ansprechpartner, Bewertung und allen Auftritten dort samt Setlist und Vor-Ort-Angaben – entsteht auf dem Gerät, nur für die Band.' },
    ],
    siehe: ['saison', 'auftritt'],
  },

  auftritt: {
    kurz: 'Alles zu einem Auftritt: Vorbereitung, Werbung, der Abend selbst und die Nachbereitung. Die Seite zeigt je nach Zeitpunkt, was gerade dran ist.',
    abschnitte: [
      { titel: 'Bereit?', text: 'Für kommende Auftritte: was noch fehlt – Setlist, Vor-Ort-Angaben, Werbeplan, Packliste, Noten, wackelnde Songs. Jeder Punkt führt dorthin, wo er sich erledigen lässt.' },
      { titel: 'Setlist, Vor Ort, Packliste', text: 'Die drei Werkzeuge des Abends, je eine eigene Seite. Die Setlist hat eine eigene Anleitung.', punkte: ['Vor Ort: Ansprechpartner, Ankunft, Parkplatz, Strom und Co. – bleibt auf den Geräten', 'Packliste: Standardpunkte zum Abhaken, eigene Punkte kommen dazu', 'Laufzettel: Zeitplan, Vor Ort, Setlist mit Spieldauer und Packliste auf einem Ausdruck bzw. PDF'] },
      { titel: 'Ansprechpartner', text: 'Kontakt beim Veranstalter (gilt für alle Auftritte dort), mit „Pressekit an Veranstalter“: schickt den Link zum Pressekit mit kurzem Gruß.' },
      { titel: 'Werbeplan (öffentliche Auftritte)', text: 'Feste Termine von vier Wochen vorher bis eine Woche danach – je Schritt ein fertiger Text und ein Haken; der fällige Schritt steht auch unter Aufgaben, bis er abgehakt ist.', punkte: ['📱 teilt die passende Story (großer Countdown, Danke-Story) und legt den Link für den Link-Sticker in die Zwischenablage', '🖼 teilt den Beitrag (Plakat) mit Bildunterschrift', 'die Bilder werden vorab vorbereitet – ist eins noch nicht fertig, ein zweites Mal tippen („Jetzt teilen“); danach ist der Schritt abgehakt', 'Reel und Highlight-Cover stehen in der Kachel „Instagram“'] },
      { titel: 'Instagram und Kampagne', text: 'Die Instagram-Formate auseinandergehalten: Beitrag, Story, Reel und Highlight-Cover, je mit Maßen und Tipp. Die Kampagne zählt, wie viele über Plakat, Stories, Reel, kopierten Beitragstext oder „Teilen“ gekommen sind (die tragen die Kampagne im Link), dazu die Aufrufe von Konzertseite und Pressekit – letzte 12 Monate, aktualisiert alle paar Stunden. Gezählt wird der erste Aufruf mit dem Link; Besucher mit Werbeblocker fehlen.' },
      { titel: 'Wetter', text: 'Vorhersage für Ort, Tag und Uhrzeit – etwa 16 Tage im Voraus.' },
      { titel: 'Nach dem Auftritt', text: 'Nachbereitung in einem Rutsch: Sterne je Song, unsichere Songs auf „Wackelt noch“, was gut lief und was schiefging, Merkpunkte (stehen bis zum Abhaken unter Aufgaben). „Rückblick schreiben“ macht den Eintrag für die Historie – vorgefüllt mit Ort, Text-Entwurf, Setlist und Song des Abends.' },
    ],
    siehe: ['setlist', 'modi', 'aufgaben'],
  },

  setlist: {
    kurz: 'Die Setlist eines Auftritts: Songs in Sets mit Pausen, Spielzeit, Tonartsprüngen und Bühnenreife – Grundlage für Bühnen-Modus und Laufzettel.',
    abschnitte: [
      { titel: 'Songs hinzufügen', text: 'Einzelne Songs erscheinen nach einer Suche oder einem Listen-Chip (Alle, Setlist, Probe …). Mit Chip „Setlist“ oder „Probe“: „Ganze Liste in dieser Reihenfolge übernehmen“ (ersetzt nach Rückfrage). Pfeile sortieren, ✕ entfernt, Pausen trennen die Sets.' },
      { titel: 'Sammlungen', text: 'Oben: „Ersetzen“ setzt eine Sammlung als ganze Setlist, „Anhängen“ hängt sie an (ohne Doppelte), „Als Sammlung speichern“ merkt sich die aktuelle Setlist.' },
      { titel: 'Spielzeit', text: 'Geplante Minuten Musik ohne Pausen eintragen – angezeigt wird „noch … frei“ bzw. „… zu lang“, dazu Songs, die in die Lücke passen. „Pausen neu setzen“ verteilt die Songs auf gleich lange Sets der gewünschten Länge.' },
      {
        titel: 'Ordnen und vorschlagen',
        punkte: [
          'Tonartsprünge (⚡) mit Überleitung; „Übergänge glätten“ ordnet innerhalb der Sets um',
          '„Sets nach Tempo ordnen“: Start mit Schwung, nach zwei Dritteln ruhiger, der schnellste zum Schluss',
          '„Letztes Set auffüllen“ bis zur gewählten Länge, „Setlist vorschlagen“ aus den meisten Sternen',
        ],
      },
      { titel: 'Bühnenreife', text: 'Je Song ● mit Prozent und Ampelfarbe; „Bereit?“ meldet Songs, die noch Baustelle sind, und prüft, ob die Setlist rund ist (zu viele langsame hintereinander, Tonartsprünge).' },
      { titel: 'Bühnen-Modus', text: 'Startet die Setlist im Vollbild – Bedienung siehe „Übe-, Probe- und Bühnen-Modus“.' },
    ],
    siehe: ['auftritt', 'modi', 'sammlungen'],
  },

  probe: {
    kurz: 'Die Seite einer Probe: wer kommt, welche Songs dran sind, Notizen und offene Punkte – und der Start in den Probe-Modus.',
    abschnitte: [
      { titel: 'Wer kommt?', text: '„Ich komme“ / „Ich kann nicht“, optional mit Notiz („komme 30 min später“). Die Seite zeigt alle Antworten. Braucht „Ich bin …“ unter Einstellungen.' },
      { titel: 'Songs zum Üben', text: 'Über der Liste eine Suche für einzelne Songs und ganze Setlists, Sammlungen und Spotify-Listen. Je Song steht, bei wem er noch wackelt („unsicher: Fred“), und die letzte Notiz. „Liste leeren“ entfernt alle Songs (Notizen bleiben).' },
      {
        titel: 'Vorschläge',
        punkte: [
          'Probe füllen: nach der Dauer der Probe – erst Baustellen der nächsten Setlist, dann Songs, die bei zwei Leuten auf „Üben“ hängen, dann was wackelt, zuletzt fast bühnenreife zum Festigen',
          'Für den nächsten Auftritt: holt Baustellen und nie geprobte Setlist-Songs dazu',
          'Generalprobe: setzt die Setlist des nächsten Auftritts an den Anfang; was noch wackelt, kommt vorher einzeln dran',
        ],
      },
      { titel: 'Plan an die Band', text: 'Schickt den Probenplan als Nachricht – Songs mit Tonart, Tempo und Spotify-Link, offene Punkte und Notizen. Eine Woche vorher erinnert Heute fällig daran. „Für Spotify kopieren“ kopiert die Links für eine Übungs-Playlist.' },
      { titel: 'Probe-Modus', text: '„Probe-Modus starten“ ganz oben: die Songs im Vollbild, je Song Status, eigene Notiz, Mitschnitt und Zeit. Am Ende eine Zusammenfassung; „Nochmal“ und „Nicht drangekommen“ gehen mit einem Klick auf die nächste Probe, „Ergebnis an die Band“ verschickt sie.' },
    ],
    siehe: ['modi', 'reife', 'termine'],
  },

  songs: {
    kurz: 'Alle Songs aller Spotify-Listen mit Tonart, Tempo, Takt, Notiz und Noten – die Grundlage für Setlists, Bühnen-Modus und Laufzettel.',
    abschnitte: [
      { titel: 'Liste und Filter', text: 'Grüne Symbole zeigen, in welchen Spotify-Listen ein Song steht (🌐 Website, Setlist, Probe, Repertoire, ♥ Wunschliste, Archiv) – antippen öffnet die Liste in Spotify. Chips filtern nach Liste oder „Ohne Liste“; „Zeigen“ und „Reihenfolge“ wirken zusätzlich.' },
      { titel: 'Song-Dialog', text: 'Zeile antippen: Tonart (Original und „Wir spielen“ mit Capo, wenn ihr anders spielt), Tempo (im Proberaum per 👆 mindestens viermal im Takt tippen), Takt, Notiz, Noten, Bühnenreife, Proben-Verlauf, „Dein Weg“ und dein Übe-Status. Voriger/Nächster blättert durch die Liste. ▶ in der Zeile startet den Bühnen-Modus ab dem Song – zur Kontrolle der Noten.' },
      { titel: 'Änderungen übernehmen', text: 'Auf diesem Gerät gelten Änderungen sofort, auf die Geräte der anderen kommen sie über den Abgleich. Für alle dauerhaft – auch in Setlist und Laufzettel der Website-Daten –: unten „Datei für GitHub erzeugen“, Datei auf GitHub öffnen, einfügen, speichern.' },
      { titel: 'Schnell eintragen', text: '„Tonart und Tempo schnell eintragen“ zeigt beides direkt in der Tabelle, mit Tap-Tempo je Zeile. „Tonart hören“ im Dialog schlägt die Tonart über das Mikrofon vor.' },
      { titel: 'Verlässlichkeit', text: 'Punkt grün = von der Band geprüft, blau = recherchiert, blauer Kreis = automatisch, gelb = unsicher. „✓ Stimmt so“ im Dialog bestätigt die Werte.' },
      { titel: 'Je Liste', text: 'Anzahl und Länge, Notenmappe der Liste (alle Noten als ein PDF), „Listen jetzt aktualisieren“. Unter „Hinweise zu den Listen“: Abweichungen, live gespielt aber nicht auf der Website, fürs Archiv, vermutlich doppelt (mit „aufgehen“).' },
      { titel: 'Wunschliste', text: 'Je Song der Stand (Noten, Tonart/Tempo, wie oft geprobt) und „Was passt als Nächstes?“ – Wunschsongs, die am besten in die Setlist passen.' },
    ],
    siehe: ['noten', 'setlists', 'reife'],
  },

  setlists: {
    kurz: 'Die Setlists aller Auftritte auf diesem Gerät – kommende zuerst.',
    abschnitte: [
      { titel: 'Übersicht', text: 'Je Auftritt eine zugeklappte Zeile; ⌄ zeigt die Songs mit Tonart und Tempo, dazu der Link zur Setlist und der Start in den Bühnen-Modus.' },
      { titel: 'Woher die Setlists kommen', text: 'Aus den Auftritten auf diesem Gerät – mit der Synchronisation auch die der anderen.' },
    ],
    siehe: ['setlist', 'sammlungen'],
  },

  sammlungen: {
    kurz: 'Benannte Songfolgen – eine bewährte Setlist, ein Kneipen-Set, die Weihnachtslieder – zum Wiederverwenden in Setlists und beim Üben.',
    abschnitte: [
      { titel: 'Anlegen und bearbeiten', text: 'Alle Sammlungen als Karten, „Neue Sammlung“ legt eine an. Jede hat eine eigene Seite wie eine Setlist: Songs suchen oder per Listen-Chip hinzufügen, Pfeile sortieren, ✕ entfernt, Pause einfügen, umbenennen, löschen.' },
      { titel: 'Feste Sammlungen', text: 'Die „Weihnachtslieder“ gibt es auf jedem Gerät. Bearbeitet wird eine eigene Kopie; „Zurücksetzen“ holt die feste wieder.' },
      { titel: 'Verwenden', text: 'In der Setlist eines Auftritts ersetzen oder anhängen, auf der Probenseite und unter Üben über die Suche dazunehmen. Sammlungen werden mit der Band abgeglichen.' },
    ],
    siehe: ['setlist', 'ueben'],
  },

  noten: {
    kurz: 'Alle Noten auf diesem Gerät – PDFs und Akkordblätter –, das Einlesen neuer Dateien und die Weitergabe an die Band.',
    abschnitte: [
      { titel: 'Noten am Song', text: 'Im Song-Dialog: PDF hochladen (auch mehrere je Song, jedes mit Namen als Fassung) oder ein gespeichertes wählen; bei Songbooks „Seite von/bis“. Akkordblätter im ChordPro-Format werden in eure Tonart transponiert.' },
      { titel: 'Einlesen', text: 'Viele PDF- und .pro-Dateien oder ganze Ordner auf einmal – jede wird über den Dateinamen ihrem Song zugeordnet, gesucht wird in allen Spotify-Listen. Gibt es einen Titel bei zwei Interpreten, stehen beide zur Auswahl. Dateien heißen am besten „Band - Titel.pdf“ (alles nach einem weiteren „ - “ ist die Fassung).' },
      { titel: 'Mit der Band', text: 'Noten kommen über die Synchronisation auf alle Geräte; ohne Synchronisation gehen sie als Datei von Gerät zu Gerät (Teilen-Menü, z. B. AirDrop oder Messenger). Die Seite zeigt alle PDFs mit Größe und sucht in den Dateinamen.' },
      { titel: 'Löschen', text: 'Löscht zunächst nur auf diesem Gerät. Wer den OneDrive-Ordner besitzt (Berechtigung „Daten löschen“), wird gefragt, ob auch aus OneDrive – das betrifft dann die ganze Band.' },
      { titel: 'Noten-Check', text: 'Unter Abgleich → Daten auf diesem Gerät: Noten-Dateien ohne Song und doppelte Dateien.' },
    ],
    siehe: ['songs', 'modi', 'abgleich'],
  },

  reife: {
    kurz: 'Wie sicher sitzen die Songs bei der Band? Je Musiker und Song ein Übe-Status – daraus die Bühnenreife.',
    abschnitte: [
      { titel: 'Übe-Status', text: '○ Nicht gelernt (0 %), ✎ Üben (15 %), ↻ Wackelt noch (40 %), ✓ Sitzt (75 %), ✓✓ Eingenordet (100 %). Gesetzt im Song-Dialog, im Probe- und Übe-Modus oder in der Nachbereitung.' },
      { titel: 'Bühnenreife', text: 'Der Schnitt über alle Musiker: bühnenreif = bei allen eingenordet, fast bühnenreif = bei allen mindestens „Sitzt“, Baustelle = bei jemandem noch nicht so weit, ohne Angabe = niemand hat einen Status.' },
      { titel: 'Je Musiker', text: 'Die Songs je Status, was in den letzten 30 Tagen gefestigt wurde oder neu wackelt, der Karteikasten und die Übe-Woche (Tage am Stück, Karten in 7 Tagen, diese Woche eingenordet).' },
      { titel: 'Alle Songs', text: 'Mit Status je Musiker und Reife-Balken; Filter: Baustellen, fast bühnenreif, bühnenreif, ohne Angabe.' },
    ],
    siehe: ['ueben', 'probe', 'modi'],
  },

  ueben: {
    kurz: 'Dein persönlicher Karteikasten: welche Songs du übst, wann sie wieder dran sind – und der Übe-Modus. Braucht „Ich bin …“ unter Einstellungen.',
    abschnitte: [
      { titel: 'Karteikasten', text: 'Fünf Kästen: Kasten 1 = Üben (jeden Tag), 2–3 = Wackelt noch (nach 1 bzw. 3 Tagen), 4–5 = Sitzt (nach 7 bzw. 14 Tagen). Eingenordete Songs fallen heraus, nicht gelernte sind nicht drin.' },
      { titel: 'Songs dazunehmen', text: 'Die Suche über der Liste nimmt einzelne Songs oder ganze Setlists, Sammlungen und Spotify-Listen dazu. Songs ohne Status kommen auf „Üben“, die übrigen behalten ihren Status. Dieselbe Suche filtert ab zwei Zeichen auch deine Liste.' },
      { titel: 'Deine Songs', text: 'Die Liste behält je Besuch ihre Reihenfolge: ein Status per Auswahlfeld verschiebt den Song nicht, neu sortiert wird erst beim nächsten Besuch. Einen Song antippen öffnet den Übe-Modus direkt bei ihm.' },
      { titel: 'Übe-Modus', text: 'Die fälligen Karten in der Notenansicht, oben der Status-Umschalter. Ein Tipp setzt den Status, die Karte bleibt stehen; weiter per Wischen, Tippen, Pfeiltaste oder Pedal. 6 Sekunden lang holt „↶ Rückgängig“ die Karte zurück. Tempo-Training: mit Klick startet es bei 70 %, „Sitzt“ und „Eingenordet“ gibt es erst bei vollem Tempo.' },
      { titel: 'Die Band übt', text: 'Unten je Musiker die Übe-Woche und „Gerade gemeinsam dran“: Songs, die bei mindestens zwei auf Üben oder Wackelt noch stehen. „Ich auch“ nimmt einen in den eigenen Karteikasten.' },
      { titel: 'Tagesziel und Erinnerung', text: 'Unter Einstellungen → Ich bin: Karten am Tag (eine Empfehlung) und die Übe-Erinnerung – höchstens einmal am Tag ab der gewählten Uhrzeit, mit ein paar fälligen Songs beim Namen (installierte App auf Android).' },
    ],
    siehe: ['modi', 'reife', 'einstellungen'],
  },

  aufgaben: {
    kurz: 'Was an der Website und für die Auftritte noch zu tun ist – teils aus den Daten erkannt, teils von Hand gepflegt.',
    abschnitte: [
      { titel: 'Anstehende Auftritte', text: 'Die Bereit-Checks der kommenden Auftritte: was für jeden noch fehlt.' },
      { titel: 'Aus den Daten erkannt', text: 'Offene Auftritte, Auftritte während einer Abwesenheit, fällige Werbung, fehlende Rückblicke, Fotos ohne Fotografen, Proben ohne Endzeit oder Ort, fehlende Bios, offene Technik-Angaben, ungeprüfte Übersetzungen und Merkpunkte aus Nachbereitungen. Diese Punkte verschwinden von selbst, sobald die Angaben da sind.' },
      { titel: 'Von Hand gepflegt', text: 'Je Bereich, als „Muss“ oder „Kann“. Abhaken gilt erst auf diesem Gerät; für alle übernehmen: „Datei für GitHub erzeugen“, Datei auf GitHub öffnen, einfügen, speichern – danach „Häkchen auf diesem Gerät zurücksetzen“.' },
    ],
    siehe: ['auftritt', 'sprachen'],
  },

  technik: {
    kurz: 'Der Bühnenplan: wo Musiker und Geräte stehen – Grundlage für die Technik-Seite, den Technik-Rider und das Bühnenplan-PDF.',
    abschnitte: [
      { titel: 'Verschieben', text: 'Geräte und Musiker mit Maus oder Finger an ihren Platz ziehen. Feiner: antippen, dann Pfeiltasten (5 cm, mit Umschalt 25 cm). Ein Kästchen ist 1 m.' },
      { titel: 'Übernehmen', text: '„Datei für GitHub erzeugen“, Datei auf GitHub öffnen, alles markieren, einfügen, speichern. Danach erscheint der neue Plan auf der Technik-Seite und in den PDFs (die entstehen bei jedem Update neu). „Alles zurücksetzen“ verwirft die Änderungen auf diesem Gerät.' },
    ],
    siehe: ['material'],
  },

  material: {
    kurz: 'Zum Drucken und Verschicken – jeweils auf Deutsch, Englisch und Niederländisch.',
    abschnitte: [
      {
        titel: 'Dateien',
        punkte: [
          'Wunschbox-Schild: A4 mit großem QR-Code zur Live-Wunschbox',
          'QR-Code-Karte: Schild mit QR-Codes zu Website und Instagram plus Flyer-Karten',
          'Technik-Rider: Platz, Strom, Zeitplan, Bühnenplan und Kanalliste',
          'Bühnenplan: nur der Plan auf einer Seite – für die Technik vor Ort',
          'Pressekit als PDF und komplett als ZIP mit Fotos und Logos',
        ],
      },
      { titel: 'Antwortvorlagen', text: 'Antwort auf eine Booking-Anfrage: Vorlage wählen, Name, Anlass und Datum eintragen, Text prüfen und kopieren. Gage und Adressen stehen bewusst nicht in den Vorlagen.' },
      { titel: 'Je Auftritt', text: 'Plakat, Story und Laufzettel gibt es auf der Seite des jeweiligen Auftritts; das Pressekit eines Konzerts schickt „Pressekit an Veranstalter“.' },
    ],
    siehe: ['technik', 'auftritt'],
  },

  sprachen: {
    kurz: 'Gegenlesen der englischen und niederländischen Texte der Website – links das Original, rechts die Übersetzung.',
    abschnitte: [
      { titel: 'So geht’s', text: 'Sprache wählen, bei Bedarf korrigieren und „Passt“ anklicken. Alles bleibt in diesem Browser gespeichert – ihr könnt in Etappen arbeiten.' },
      { titel: 'Übernehmen', text: '„Datei für GitHub erzeugen“, Datei auf GitHub öffnen, einfügen, speichern, danach „Liste leeren“. Ohne GitHub-Konto: „Als Nachricht schicken“ an Fred.' },
      { titel: 'Stand', text: 'Oben steht, wie viel schon gegengelesen ist und welche Texte noch fehlen; dazu die Pressekit-Texte in drei Sprachen nebeneinander. Verbindlich ist immer die deutsche Fassung.' },
    ],
    siehe: ['aufgaben'],
  },

  zahlen: {
    kurz: 'Zahlen rund um die Band: Besucher der Website, Setlists, Sterne aus dem Bühnen-Modus und das Üben.',
    abschnitte: [
      { titel: 'Bandjahr', text: 'Das Jahr auf einen Blick – Auftritte, Proben, Orte und Songs –, auf Wunsch als Story-Bild zum Teilen. Dazu der Link zur Vorschau des Jahresrückblicks.' },
      { titel: 'Üben je Woche', text: 'Geübte Karten je Kalenderwoche und Person (letzte 8 Wochen) als Balken – antippen zeigt die Zahlen –, dazu die Songs, die diese Woche bei allen sitzen.' },
      { titel: 'Besucher', text: 'Wie viele die Website besuchen, mit Verlauf und woher sie kommen (Plakat, Stories, QR-Codes). Die Zahlen kommen von GoatCounter, ohne Cookies.' },
      { titel: 'Setlists und Sterne', text: 'Welche Songs wie oft auf euren Setlists stehen und was noch nie dran war; die Top 100 aus den Sternen im Bühnen-Modus.' },
    ],
    siehe: ['jahr', 'ueben'],
  },

  jahr: {
    kurz: 'Die Vorschau des öffentlichen Jahresrückblicks – so, als wären alle Auftritte des Jahres schon gespielt.',
    abschnitte: [
      { titel: 'Wozu', text: 'Zahlen, Stationen und fehlende Highlights vor dem 15.12. prüfen – ab dann gibt es den Rückblick öffentlich unter /jahr/<Jahr>.' },
      { titel: 'Woraus', text: 'Aus den Auftritten und Rückblicken der Website. Private Feiern erscheinen nur mit ihrem öffentlichen Namen (sonst „Private Feier“) und ohne Ort.' },
    ],
    siehe: ['zahlen'],
  },

  abgleich: {
    kurz: 'Abgleich mit OneDrive und alles, was auf diesem Gerät gespeichert ist.',
    abschnitte: [
      { titel: 'Synchronisation', text: '„Jetzt synchronisieren“ gleicht dieses Gerät mit dem OneDrive-Ordner ab; automatisch läuft es beim Öffnen und alle 15 Minuten. Die Zeile „Zuletzt …“ sagt, was passiert ist; „Kopieren“ legt Fehlermeldungen samt App-Stand in die Zwischenablage.' },
      { titel: 'Meldungen', punkte: ['„Verbindung unterbrochen – wird nachgeholt“: kein Fehler, die Datei kommt beim nächsten Abgleich; erst beim dritten Mal in Folge wird es ein Fehler', '„Anmeldung nötig“ oben im Backstage: „Neu anmelden“ antippen – sonst ruht der automatische Abgleich', 'Konflikte bei Übe-Daten werden von selbst zusammengeführt; was sich nicht vereinen lässt, steht unter Konflikte'] },
      { titel: 'Geräte', text: 'Jedes Gerät legt beim Abgleich eine kleine Datei in den Sync-Ordner (Name, Person, Zeitpunkt, App-Stand) – daraus entsteht die Liste, mit Kennung und „aktuell“ bzw. „veraltet“ (Orange). Aufgeräumt wird von selbst: Einträge, die sich über mindestens drei Abgleiche und einen Tag nicht lesen lassen, und Geräte, die ein halbes Jahr nicht abgeglichen haben, entfernt das Gerät mit „Daten löschen“ – ein noch genutztes Gerät legt seinen Eintrag beim nächsten Abgleich neu an. Wer „Daten löschen“ darf, kann Einträge auch von Hand entfernen.' },
      { titel: 'Daten auf diesem Gerät', text: 'Jeder gespeicherte Eintrag einzeln, nach Bereichen gruppiert: antippen öffnet die passende Seite, { } zeigt den Inhalt zum Ansehen und Ändern, ausgewählte Einträge lassen sich als Datei teilen; der Besen löscht einen ganzen Bereich – für alle, denn Löschen wird mitsynchronisiert. Dazu Noten, Mitschnitte, Geräte, Speicherplatz (mit „Dauerhaft speichern“), Sync-Kopie, Spotify, App-Stand und das letzte Backup. „Diagnose kopieren“ fasst alles für Rückfragen in einem Text zusammen.' },
      { titel: 'Aufräumen', text: 'Vergangene Auftritte und Proben aufräumen oder alles löschen. Löschen wird mitsynchronisiert – vorher am besten ein Backup erstellen (Einstellungen).' },
    ],
    siehe: ['einstellungen'],
  },

  einstellungen: {
    kurz: 'Was für dieses Gerät gilt: wer du bist, die Synchronisation, das Backup, der Bühnen-Modus und Spotify.',
    abschnitte: [
      { titel: 'Ich bin', text: 'Wer das Gerät benutzt – nach der Anmeldung mit Microsoft automatisch erkannt, eine Wahl von Hand hat Vorrang. Dazu Karten am Tag (Empfehlung) und die Übe-Erinnerung.' },
      { titel: 'Synchronisation', text: 'Microsoft-Konto, OneDrive-Ordner (durchklicken; der Ordner der Band endet auf „BlickfeldNord (geteilt)/Sync“), lokaler Speicher (Speicher der App oder ein Ordner auf dem Computer), Richtung, Löschen mitsynchronisieren, automatisch. Klappt das Anmelde-Fenster nicht (blockiert, keine Antwort), meldet die App von selbst ohne Pop-up neu an – die Seite geht kurz zu Microsoft und kommt zurück; scheitert auch das, gibt es „Ohne Pop-up anmelden“.' },
      { titel: 'Backup', text: 'Immer alles in einer Datei: Backstage-Daten (Setlists, Packlisten, Vor Ort, Proben, Sterne, Werbeplan, Nachbereitungen …), Einstellungen und Notenblätter samt Markierungen – Proben-Mitschnitte nicht (zu groß). Mit Synchronisation landet es im OneDrive-Ordner unter „Backup“ und bleibt dort ein halbes Jahr (die letzten immer), sonst als Datei zum Teilen oder Speichern. Wiederherstellen aus Datei, aus der Liste der Backups in OneDrive oder „Alles ersetzen“ (löscht vorher alle bisherigen Daten).' },
      { titel: 'Bühnen-Modus', text: 'Halbseiten-Blättern, die Tasten fürs Fußpedal (weiter, zurück, hoch, runter – „+ Taste“ antippen und aufs Pedal treten) und ob der Fortschrittsbalken unten in der Titelanzeige antippbar ist (Standard: nein, damit Hochwischen nicht versehentlich den Song wechselt). Schriftgröße und Klick-Ton stellt man im Modus selbst ein.' },
      { titel: 'Spotify', text: 'Abspielen im Browser, Fernsteuerung der Spotify-App, eingebetteter Player oder aus; verbinden und trennen, beim Weiterblättern mitspielen, Übergänge proben, die Checkliste zum Einrichten, Anleitung teilen und die Diagnose. Alles braucht Spotify Premium, außer dem eingebetteten Player (am Computer ganze Songs, auf dem Handy 30 Sekunden).' },
      {
        titel: 'Spotify im Browser',
        punkte: [
          '▶ spielt den Song in der Seite selbst – ohne Spotify-App, mit Fortschritt zum Springen, ±10 s und Lautstärke',
          'offiziell nur in Browsern am Computer (Chrome, Edge, Firefox, Safari); auf Android-Handys mit Chrome klappt es nach unseren Erfahrungen auch, auf iPhone und iPad oft nicht – dann „Fernsteuerung“',
          'beim ersten Mal Spotify (neu) verbinden: Spotify verlangt dafür zusätzlich die Freigabe von Name und E-Mail',
        ],
      },
      {
        titel: 'Übe-Erinnerung',
        text: 'Höchstens einmal am Tag ab der gewählten Uhrzeit eine Benachrichtigung mit ein paar fälligen Songs – in der installierten App auf Android (Chrome/Edge). Die Zahl der fälligen Karten am App-Symbol zeigen nur Computer (installierte App in Chrome/Edge) und iPhone/iPad (zum Home-Bildschirm hinzugefügt, Mitteilungen erlaubt); Android zeigt am Symbol höchstens einen Punkt.',
      },
      { titel: 'Einrichtung', text: '„Einrichtung durchgehen“ öffnet den Einrichtungsassistenten erneut.' },
    ],
    siehe: ['einrichtung', 'abgleich'],
  },
};
