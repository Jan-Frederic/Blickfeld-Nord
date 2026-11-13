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
     Bleibt GitHub Pages beim Veröffentlichen hängen („syncing_files“), bricht der Deploy nach 4 Minuten ab und
     versucht es automatisch neu – bis zu dreimal (ein normaler Deploy braucht unter einer Minute).
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

## Pressekit je Konzert

Unter **Pressekit** stehen über dem Pressetext die **anstehenden öffentlichen Konzerte** (öffentlich und geklärt). Ein
Klick führt zu `/presse/<datum>` – alles für den Veranstalter: Eckdaten, **Teilen** (Link zu dieser Pressekit-Seite
mit Datum und Ort über das Teilen-Menü bzw. WhatsApp, Herkunft `presse-geteilt` in der Kampagne), **Plakat und Story als Bild** (im Browser
gezeichnet, mit QR-Code zur Konzertseite; Downloads zählen in der Kampagne mit), **fertige Texte** zum Kopieren
(Beitrag, zwei Wochen/eine Woche vorher, am Tag davor, am Auftrittstag – auf Deutsch) und die **Songliste**
(Repertoire der offiziellen Playlist, kopieren oder als Textdatei – die Setlist des Abends bleibt im Backstage).
Dazu **Plakat zum Drucken** (PDF A4/A3, die Story mittig auf dunklem Grund) und **Was wir vor Ort brauchen**
(Spielfläche, Strom, Banner, Zeitplan wie auf der Technik-Seite, mit Rider-PDF). Die Texte erscheinen in der Sprache
der Seite (DE/EN/NL). Im Backstage des Auftritts schickt **Pressekit an Veranstalter** den Link mit kurzem Gruß
(Teilen-Menü, sonst Zwischenablage); die Kachel „Kampagne“ zählt die **Aufrufe des Pressekits**.
Die Seiten sind nicht für Suchmaschinen (noindex) und stehen nicht in der Sitemap. Den Link einfach an den
Veranstalter schicken. Die Referenzen („Bisher live bei“) stehen nur noch im Booking, nicht mehr im Pressekit
(Website und PDF).

## Saisonplanung und Fans

- **Backstage → Termine → Saisonplanung:** die nächsten 12 Monate auf einer Zeitleiste (freie Monate gestrichelt,
  offene Anfragen orange, private kursiv) und **Wieder anfragen**: Orte, an denen vor einem Jahr gespielt wurde und
  noch nichts Neues geplant ist – mit Jahrestag und „am besten bis …“ (drei Monate vorher).
- **Backstage → Termine → Saison** (`/backstage/termine/saison`, auch über die Saisonplanung): 12 Monate mit
  Auftritten, Proben und Abwesenheiten, freie Monate markiert, „Wieder anfragen“ – **Drucken / als PDF** gibt alles
  auf einer A4-Seite (quer) für die Bandbesprechung aus.
- **Wieder anfragen → Anfrage schreiben:** fertige Nachricht („letztes Jahr am … bei euch – Lust auf eine
  Wiederholung? Noch frei: März, Juli …“) an den Ansprechpartner.
- **Ansprechpartner** (Backstage eines Auftritts): Name, WhatsApp/Telefon, E-Mail je Ort – gilt für alle Auftritte
  dort, bleibt auf den Geräten und im OneDrive (`bn-kontakte`), nie im Repository. Pressekit-Link und Anfrage gehen
  dann direkt per WhatsApp (sonst E-Mail), ohne Kontakt über Teilen bzw. Zwischenablage.
- **Booking → Verfügbarkeit:** „Noch freie Wochen“ je Monat – ganze Wochen Mo–So ohne Auftritt, Abwesenheit oder Schonzeit (antippen springt hin) – private Termine nur als belegt.
- **Übersetzungen → Pressekit-Texte gegenlesen:** Beitrag und Stories auf Deutsch, Englisch und Niederländisch
  nebeneinander (Vorlagen in `src/app/data/presse-texte.ts`).
- **Konzertseite → Gespielt an diesem Abend:** Songs der offiziellen Playlist sind zum Nachhören auf Spotify verlinkt.
- **Live-Check** läuft jetzt auch nach jedem Deploy (90 s später) und prüft zusätzlich alle Pressekits (Status, noindex)
  und wichtige Inhalte (Konzertliste, Anstehende Konzerte, Verfügbarkeit); Probleme → Issue „Probleme auf der Live-Seite“.
- **Plakat zum Drucken** wird in doppelter (A4) bzw. dreifacher (A3) Auflösung gezeichnet.
- **Backstage → Termine → Kontakte** (`/backstage/termine/kontakte`): alle Ansprechpartner mit letztem/nächstem
  Auftritt, WhatsApp, E-Mail und „Anfrage schreiben“; neue Veranstalter ohne Auftritt anlegen. Jede Anfrage wird mit
  Datum gemerkt („angefragt am …“, „beantwortet“ setzt zurück) – nach 14 Tagen ohne neuen Termin dort steht
  **Nachfragen** unter „Heute fällig“.
- **Saison als Bild teilen** (Termine → Saison): Bild 1080 × 1350 mit allen 12 Monaten für die WhatsApp-Gruppe.
- **Konzertseite in der letzten Woche:** „Noch 3 Tage – wir freuen uns auf euch!“ (am Tag: „Heute ist es so weit“).
- **Rückblick-Formular** ist vorgefüllt: Überschrift mit Ort, Text-Entwurf aus Datum, Ort, „Was lief gut“ und Song
  des Abends – nur noch in eigenen Worten ergänzen.
- **Probenprotokoll:** Auf der Probenseite je Song eine Notiz („Bridge sitzt“); der Song-Dialog zeigt die letzte
  unter „Zuletzt geprobt“. Hat eine Probe Häkchen, zählen nur die abgehakten Songs als geprobt (Wunschliste-Stand,
  Probe-Vorschlag).
- **PDFs** (Pressekit, Rider, Bühnenplan, QR-Karte, Wunschbox) tragen Sprache und Dokumenttitel (Screenreader,
  Titelleiste). Vollständig getaggte PDFs (Lesereihenfolge) kann das Werkzeug (ReportLab) nicht erzeugen.
- **Live-Check** startet am Ende jedes Deploys (Job „live-check“ in deploy-pages.yml) – auch nach dem Deploy von
  „Screenshots aktualisieren“.
- **Zusage → Auftritt eintragen** (Termine → Kontakte): setzt die Anfrage auf beantwortet und öffnet „Neuen Termin
  eintragen“ mit Location und Ort vorbelegt (geklärt angehakt) – Datum und Uhrzeit ergänzen, Zeile für GitHub kopieren.
- **Saison-Update:** In der ersten Woche jedes Monats steht unter „Heute fällig“ „Saison-Update an die Band
  schicken“ – erledigt, sobald jemand unter Termine → Saison „Als Bild teilen“ benutzt (gilt für die ganze Band).
- **Backstage-Übersicht:** oben eine **Suche über alles** (Auftritte, Proben, Songs aller Spotify-Listen, Kontakte,
  Sammlungen, Bereiche; Song-Treffer öffnen Songs → Liste mit der Suche, Sammlungen ihre Seite). Danach Heute fällig,
  **Üben** (rechts daneben der Übe-Modus) und Als Nächstes – rechts neben jedem Termin startet **Bühnen-Modus** (Auftritt, mit dessen
  Setlist) bzw. **Probe-Modus** (Probe) direkt; Schließen führt zurück in die Übersicht. Zahlen stehen unter
  Backstage → Zahlen. Die Bereiche (Übersicht, Songs, Termine, Aufgaben, Technik, Material, Sprachen, Zahlen, Abgleich, Einstellungen) stehen im Menü oben – Kacheln gibt es in der
  Übersicht nicht mehr.
- **Anleitung** (Link ganz unten in der Übersicht, `/backstage/anleitung`): Übe-, Probe- und Bühnen-Modus im Vergleich
  (Tabelle, auf dem Handy je Merkmal untereinander), die fünf Übe-Status mit ihren Kästen und die gemeinsamen Begriffe
  (Titelanzeige, Notenansicht, PDF, Akkordblatt, Fassung, Kopfleiste, Song-Liste, Status-Umschalter, Probe-Leiste,
  Mitschnitt-Panel, Anlass). Reiner Text in `src/app/pages/backstage-anleitung.ts` – ändern sich die Modi, dort mit
  nachziehen.
- **Zurück:** Der Pfeil oben auf Unterseiten zeigt den Titel der Seite, von der man kam, und führt dorthin zurück (wie
  der Zurück-Knopf des Browsers); direkt geöffnet führt er zum festen Ziel (z. B. Termine). Technik: `src/app/zurueck.ts`.
- **Heute fällig** nennt die fälligen Karteikarten („5 Karteikarten fällig – Übe-Modus starten · Weihnachtsmarkt in 12
  Tagen“) und startet direkt den Übe-Modus. **Tempo-Training** im Übe-Modus: Klick an startet bei 70 %, der Tempo-Knopf
  steigert 70 → 80 → 90 → 100 %; „Sitzt“ und „Eingenordet“ sind erst bei vollem Tempo wählbar (ohne Klick immer).
  **Übe-Woche** je Person unter Songs → Bühnenreife: Tage am Stück, Karten in 7 Tagen, diese Woche eingenordet.
- **Spotify im Übe- und Probe-Modus** – unter **Einstellungen → Spotify im Übe- und Probe-Modus** je Gerät wählbar
  (`bn-spotify-modus`, `pages/spotify-einstellung.ts`): **Aus** (Standard, nichts von Spotify), **Eingebetteter Player**,
  **Fernsteuerung der Spotify-App** oder **Im Browser abspielen**. Gilt nur für Songs aus einer Spotify-Liste und nur
  mit Netz.
  - **Im Browser abspielen** (Spotify Premium, `data/spotify-browser.ts`): Die Seite wird selbst zum Spotify-Gerät
    („Blickfeld Nord (Browser)“) über Spotifys Web Playback SDK (`https://sdk.scdn.co/spotify-player.js`, erst beim
    Öffnen des Modus geladen; in `scripts/csp.mjs` unter `script-src` und `frame-src` erlaubt). Gestartet wird über die
    Web-API auf der Geräte-ID des Players, Pause/Weiter/Springen/Lautstärke gehen direkt an den Player, der seinen
    Stand selbst meldet – keine Spotify-App nötig, Fortschritt genau. Braucht zusätzliche Rechte (`streaming`,
    `user-read-email`, `user-read-private` – verlangt Spotify so); ein Zugang aus der Fernsteuerung hat sie nicht, dann
    steht überall „Spotify neu verbinden“ (Rechte stehen im Zugang als `scope`, auch im Diagnose-Protokoll). Spotify
    unterstützt das offiziell nur in Browsern am Computer; scheitert es (Initialisierungsfehler), sagt ein Hinweis, auf
    dem Handy die Fernsteuerung zu nehmen. **Ein Player je Sitzung:** Jeder neue Player meldet sich bei Spotify als
    neues Gerät an; nach ein paar An- und Abmeldungen kurz hintereinander kannte Spotify das frische Gerät nicht mehr
    („Device not found“, obwohl der Player „bereit“ meldete). Deshalb hält das Verlassen des Modus nur an; abgemeldet
    wird erst nach 10 Minuten ohne Modus, beim Schließen bzw. Neuladen der Seite (`pagehide`) und mit „Spotify
    trennen“. Meldet Spotify trotzdem „Device not found“, wird erst die Wiedergabe auf den Browser geholt
    (`PUT /me/player`), dann der Player neu verbunden – jeweils mit neuem Versuch, alles im Diagnose-Protokoll.
    Blockiert die Sicherheitsregel (CSP) etwas, steht das ebenfalls im Diagnose-Protokoll.
  - **Eingebetteter Player:** „♫ Auf Spotify anhören“ in der Titelanzeige lädt erst auf Knopfdruck den Spotify-Player
    (kompakt, 152 px); er wechselt mit dem Song. Am Computer ganze Songs (bei Spotify angemeldet), auf dem Handy nur
    die 30-Sekunden-Vorschau. Erlaubt über `frame-src https://open.spotify.com` in `scripts/csp.mjs`.
  - **Fernsteuerung** (Spotify Premium): „Spotify verbinden“ (in den Einstellungen oder in der Titelanzeige) meldet
    einmal je Person und Gerät bei Spotify an (OAuth mit PKCE, ohne Server; Client-ID in `data/spotify-remote.ts`,
    Redirect-URI `https://blickfeld-nord.de/` – genau so im Spotify-Developer-Dashboard eintragen, die Nutzer dort
    unter „User Management“). Danach: **▶ / ⏸** spielt den Song ganz in der Spotify-App bzw. auf dem gewählten
    Spotify-Connect-Gerät (Handy, Laptop, Lautsprecher im Proberaum), **↺10 / 10↻** springen 10 Sekunden, der
    **Fortschrittsbalken** ist ein Schieberegler (ziehen oder antippen springt an die Stelle), Zeit, Gerätewahl
    (Browser-Player: Lautstärke). „Beim Weiterblättern mitspielen“, „Übergänge proben“ und „Trennen“ stehen nur in den
    Einstellungen (Spotify), nicht in der Steuerung. In der Kopfleiste der Notenansicht stehen **↺10** und **♫ ▶ / ⏸**
    sowie **Abdocken** (Bild-im-Bild-Symbol): Dann steht die ganze Steuerung als Feld über den Noten – am Griff ⠿
    verschiebbar, bleibt auch bei weggewischter Kopfleiste, ✕ dockt wieder an (`bn-spotify-abgedockt`,
    `bn-spotify-dock`, je Gerät). Tippen und Wischen **neben** den Bedienelementen blättert wie überall im Modus; nur
    die Elemente selbst (Knöpfe, Regler, Häkchen, abgedocktes Feld) fangen es ab.
    **Gespielt wird immer der angezeigte Song** (`data/spotify-spieler.ts`, ein Zustand für alle Knöpfe): Wechselt
    der Song, nachdem über die Steuerung gespielt wurde – auch wenn der vorige schon durchgelaufen ist –, startet mit
    „beim Weiterblättern mitspielen“ (Standard an) gleich der neue; sonst, und bei Songs ohne Spotify-Track, wird
    pausiert. Wer selbst ⏸ drückt (oder in der Spotify-App anhält), bekommt beim Blättern nichts vorgespielt, bis er
    wieder ▶ drückt. Am Songende hält die Steuerung an, wenn Spotify von sich aus weiterspielt (Autoplay); beim
    Verlassen des Modus ebenso. **Start wird bestätigt:** Spotify nimmt ▶ auch dann an (204), wenn das Gerät nichts
    spielt – die Spotify-App auf dem Handy startet aus dem Hintergrund oft nichts (Android; im Protokoll: „spielt=false
    titel=keiner“, Pause wird mit „Restriction violated“ abgelehnt). Nach ▶ steht der Knopf deshalb auf „…“, bis
    Spotify den Song als laufend meldet (Abfragen nach 0,7 / 1,6 / 2,8 / 4,2 s). Bleibt das 5 s aus: Hinweis
    „angenommen, spielt aber nicht“ mit **Spotify öffnen**; nach der Rückkehr in die App wird der Stand sofort
    nachgelesen und ein offener Start wiederholt. Läuft der Song, zählt der Fortschritt mit der eigenen Uhr (Länge aus
    den Spotify-Listen); die Abfrage des Stands (alle 10 s) berichtigt nur Stelle, Länge und Pause. Gibt Spotify gar
    keine Auskunft (Abfrage scheitert zweimal), gilt der eigene Befehl. Das Gerät des
    letzten Starts wird gemerkt: Der nächste Befehl geht direkt dorthin (ohne Geräteliste), auch wenn Spotify es nach
    einer Pause nicht mehr als aktiv oder gar nicht mehr listet. Befehle gehen nacheinander raus, überholte (schnelles
    Blättern) werden verworfen. Weitere Eigenheiten von Spotify, die abgefangen sind: Befehle antworten bei Erfolg
    teils mit Text, der kein JSON ist (wird ignoriert); kurz nach dem Start meldet Spotify noch den alten Stand (6 s
    Schonfrist); vorübergehende Fehler (5xx, 429) werden einmal wiederholt; der Zugang wird stündlich erneuert (nie
    zweimal gleichzeitig – das kappte die Verbindung); eine andere Fassung desselben Songs gilt als der Song.
    **Zum Üben:** **Sprungmarken** je Spotify-Track (`data/sprungmarken.ts`, Speicher `bn-sprungmarken`, mit der
    Band gespiegelt – unter „Daten/“; bei gleichzeitigen Änderungen gewinnt je Track die spätere, `spiegel-merge.ts`):
    „+ Marke“ setzt Einsatz, Strophe, Refrain, Bridge, Solo oder Outro an der aktuellen Stelle (mehrere gleiche werden
    durchnummeriert), ein Tipp auf die Marke springt dorthin (läuft der Song nicht, startet er dort), „Marken
    bearbeiten“ zeigt ✕ zum Löschen; Striche unter dem Balken zeigen die Stellen. **Einsatz:** ▶ und das Mitspielen
    beim Weiterblättern beginnen dort statt am Anfang. **Schleife A–B:** erster Tipp setzt den Anfang, der zweite das
    Ende (mind. 2 s), dann springt es am Ende von selbst zurück; dritter Tipp oder ✕ hebt sie auf, ein Songwechsel
    auch. **Übergang** (nur mit der Einstellung „Übergänge proben“, Standard aus, `bn-spotify-uebergang`; Knopf
    „⇢ Übergang zu …“, wenn der nächste Song einen Spotify-Track hat): die letzten 15 s des
    Songs, dann blättert der Modus von selbst weiter (`weiterBitte`) und der nächste beginnt am Einsatz – auch ohne
    „mitspielen“; ⏸ oder Weiterblättern von Hand beendet ihn. **Anleitung teilen** (Einstellungen → Spotify): kurze
    Anleitung mit Link auf `/backstage/einstellungen/#spotify` übers Teilen-Menü (z. B. WhatsApp), sonst in die
    Zwischenablage – ohne Konten und E-Mail-Adressen. **Einrichtung** (Einstellungen → Spotify, `pages/spotify-checkliste.ts`): Checkliste Verbunden, Konto
    freigeschaltet, Gerät bereit bzw. Browser spielt ab, Premium, erster Song – „Jetzt prüfen“ fragt Spotify
    (Geräteliste; beim Browser-Player wird er einmal angemeldet); „erster Song“ und „nur mit Premium“ merkt sich das
    Gerät (`bn-spotify-ok`, `bn-spotify-premium-fehlt`). Unit-Tests der Regeln: `data/spotify-spieler.spec.ts`.
    **Diagnose:** Einstellungen → Spotify → „Diagnose“ zeigt das Protokoll der letzten 150 Befehle, Antworten und
    Knopfdrücke (`bn-spotify-protokoll`, nur auf dem Gerät, ohne Zugangsschlüssel, Geräte-IDs gekürzt) mit „Protokoll
    kopieren“ – was Spotify einem echten Konto antwortet, lässt sich nur dort sehen. Antwortet Spotify mit 401, obwohl
    der Zugang nach der Uhr des Geräts noch gilt, wird er einmal erneuert und der Befehl wiederholt. Der Abgleich läuft
    sparsam (nach einem Start nach 1,5, 4 und 7 s, dann alle 10 s), weil Spotify die Zahl der Anfragen begrenzt.
    Meldungen stehen als Hinweis über Titelanzeige **und** Notenansicht (nicht nur als Tooltip): „Spotify läuft auf
    keinem Gerät“ mit Knopf **Spotify öffnen** (die Fernsteuerung braucht ein laufendes Spotify – App oder
    open.spotify.com in einem Tab; die Seite selbst spielt nichts ab), „nur mit Premium“, „Konto im
    Developer-Dashboard nicht freigeschaltet“, „Spotify meldet einen Fehler (Status)“, „Keine Verbindung“. Ohne
    Verbindung steht in der Kopfleiste der Noten „♫ verbinden“. **Anmeldung:** Die Antwort von Spotify muss im selben
    Browser ankommen, in dem „Spotify verbinden“ getippt wurde (dort liegt der Schlüssel der Anmeldung); kommt sie in
    einem anderen an (anderer Standardbrowser), erklärt ein Hinweis auf der Startseite, was zu tun ist. Nach der
    Rückkehr steht das Ergebnis da („Mit Spotify verbunden ✓“ bzw. warum es nicht geklappt hat). Zugang
    nur auf dem Gerät (`bn-spotify-*`, nicht gespiegelt). CSP: `connect-src` `accounts.spotify.com`, `api.spotify.com`.
- **Modus bleibt offen** (Bühnen-, Probe-, Übe-Modus): „Zurück“ des Handys (Wischen vom Rand, Zurück-Taste) beendet
  ihn nicht versehentlich – einmal zeigt nur „Noch einmal ‚Zurück‘ beendet …“, erst ein zweites Mal innerhalb von
  2,5 s beendet (`zurueckSchutz` in `pages/setlist-buehne.ts`, eigener Schritt im Browser-Verlauf). Lädt die Seite neu,
  während Übe- oder Probe-Modus offen sind (Handy hat sie im Hintergrund verworfen, Update), öffnet er sich wieder –
  Übe-Modus bei der nächsten fälligen Karte mit dem bisherigen Ergebnis, Probe-Modus beim ersten offenen Song
  (`data/modus-sitzung.ts`, sessionStorage, 3 Stunden). Steigt man im Übe-Modus über einen Song der Liste ein, kommt
  er zuerst, die Karten davor hängen hinten an (kein vorzeitiges Ende).
- **Song antippen** in „Deine Songs im Karteikasten“ öffnet den Übe-Modus direkt bei diesem Song.
- **Die Band übt** (unten auf der Üben-Seite): je Musiker die Übe-Woche (Tage am Stück, Karten in 7 Tagen, diese
  Woche eingenordet) und „Gerade gemeinsam dran“ – Songs, die bei mindestens zwei auf Üben oder Wackelt noch stehen, mit
  Status je Person; „Ich auch“ nimmt den Song in den eigenen Karteikasten.
- **Bühnenreife in der Setlist:** im Setlist-Editor steht je Song die Reife (● 73 %, Farbe nach Ampel, Tooltip mit
  „wackelt bei …“); „Bereit?“ meldet Setlist-Songs, die noch Baustelle sind (sobald jemand Übe-Status setzt).
- **Übe-Status:** Jeder Song hat je Musiker einen von fünf Status – **Nicht gelernt** (jeder neue Song und alle ohne
  Angabe), **Üben**, **Wackelt noch**, **Sitzt**, **Eingenordet** (früher „sicher“). Gesetzt im Song-Dialog (Auswahl
  oben), im Probe-Modus (Umschalter mit den fünf Stufen), in der Nachbereitung (⚠ = Wackelt noch) oder über den
  Übe-Modus. Der Status ist eng mit dem **Karteikasten** verbunden: Kasten 1 = Üben, Kasten 2 und 3 = Wackelt noch,
  Kasten 4 und 5 = Sitzt; eingenordete Songs fallen aus dem Karteikasten heraus. Logik: `src/app/data/uebe-status.ts`
  (Kästen: `src/app/data/ueben.ts`). Der alte Stand („Wackelt noch“-Liste, Fortschritt mit sitzt/wackelt/sicher)
  wird je Person beim ersten Öffnen einmalig umgestellt: sicher → Eingenordet, sitzt → Kasten 4, wackelt → Kasten 2.
- **Üben** (Übersicht → Üben, `/backstage/ueben`; rechts daneben **Übe-Modus** startet gleich die Notenansicht):
  persönlich (Einstellungen → „Ich bin …“). Direkt über „Deine Songs im Karteikasten“ eine **Suche**: einzelne Songs oder ganze **Setlists**,
  **Sammlungen** und **Spotify-Listen** zum Üben dazunehmen – Songs ohne Status kommen auf „Üben“ (Kasten 1), die übrigen
  behalten ihren Status (die Meldung sagt, wie viele dazukamen, schon im Kasten oder eingenordet sind). Dieselbe Suche
  filtert ab 2 Zeichen auch „Deine Songs im Karteikasten“ („„Iris“: 1 von 12 Songs in deinen Karten“). Die Liste hat je
  Besuch eine feste Reihenfolge: Ein Status per Auswahlfeld verschiebt den Song nicht, neu hinzugekommene stehen oben;
  Songs, die dabei aus dem Karteikasten fallen (Eingenordet, Nicht gelernt), bleiben gedämpft mit „–“ an ihrem Platz –
  neu sortiert wird erst beim nächsten Besuch der Seite. Darunter die fünf
  Kästen mit ihrem Status und **ein** großer Knopf **Übe-Modus**: die Karten in der Notenansicht (wie Bühnen-/Probe-Modus),
  oben rechts ein **Umschalter mit den fünf Status** (der aktuelle ist hervorgehoben; auf schmalen Bildschirmen nur die
  Zeichen ○ ✎ ↻ ✓ ✓✓). Ein Klick setzt den Status, die Karte bleibt stehen (weiter per Wischen, Tippen, Pfeiltaste
  bzw. Pedal; über die letzte Karte hinaus beendet der Übe-Modus und zeigt das Ergebnis): **Wackelt noch** bei einem Song, der
  schon in Kasten 2 wackelt, schiebt ihn nach Kasten 3 (wieder dran nach 3 statt 1 Tag; in 3 bleibt er in 3, weiter
  geht es mit „Sitzt“); **Sitzt** bei einem Song, der schon in Kasten 4 sitzt, schiebt ihn nach Kasten 5 (wieder dran
  nach 14 statt 7 Tagen; in 5 bleibt er in 5). **Eingenordet** wird ein Song nur, wenn man ausdrücklich „Eingenordet“
  wählt; sonst gilt der Status direkt (Üben = Kasten 1, kommt in dieser Runde noch einmal; Wackelt noch = Kasten 2;
  Sitzt = Kasten 4; Nicht gelernt nimmt ihn heraus). Jeder Status-Umschalter (Übe-Modus, Probe-Leiste, Kopfleiste)
  speichert den Status sofort und lässt ihn kurz aufleuchten (`AUFLEUCHTEN_MS` in `pages/status-schalter.ts`, 450 ms,
  als CSS-Animation). Ein zweiter Tipp auf derselben Karte ersetzt die erste Wertung (vorher zurückgenommen) – so
  schiebt z. B. zweimal „Wackelt noch“ die Karte nicht zwei Kästen weiter. Die Kästen oben auf der Seite zeigen ihr Status-Symbol (✎ ↻ ↻ ✓ ✓) im Rahmen
  „Karteikasten“, links daneben gestrichelt **Nicht gelernt** (Songs der Spotify-Listen ohne Status), rechts
  **Eingenordet** – beide gehören nicht zum Karteikasten. Darunter die Liste „Was ein Status-Klick bewirkt“. Nach jeder Status-Wahl im Übe-Modus steht 6 Sekunden lang **„↶ Rückgängig“** unten in
  der Mitte: zurück zur Karte, Karteikasten, Verlauf und „heute geübt“ wie vorher (`uebeSchnappschuss` in
  `data/uebe-status.ts`); eine wegen „Üben“ angehängte Wiederholung fällt wieder weg. **Üben je Woche** (Backstage → Zahlen, `pages/uebe-wochen.ts`, Daten `data/wochenrueckblick.ts`): gruppierte Balken
  der geübten Karten je Kalenderwoche und Person (letzte 8 Wochen, Übe-Modus, je Song und Tag einmal, aus dem
  gespiegelten Verlauf `bn-fortschritt-<Person>`), Antippen zeigt die Zahlen, dazu eine Tabelle; darunter die Songs,
  die diese Woche bei allen sitzen. Farben je Person in fester Reihenfolge (blau, orange, grün – gegen den dunklen
  Hintergrund und auf Farbfehlsichtigkeit geprüft). **Übe-Erinnerung** (Einstellungen → Ich bin, `data/erinnerung.ts`): höchstens einmal am Tag
  ab der gewählten Stunde eine Benachrichtigung „n Karteikarten sind heute fällig“ – über die periodische
  Hintergrund-Synchronisation des Service Workers (`periodicsync` in `scripts/sw/sw-template.js`, nur installierte App
  auf Android/Chrome/Edge); Fälligkeiten legt die Seite im Speicher `ueben-erinnerung` ab. Die Zahl fälliger Karten am
  App-Symbol (Badge, `setAppBadge`) zeigen nur Computer (installierte App in Chrome/Edge) und iPhone/iPad
  (Home-Bildschirm, Mitteilungen erlaubt); Android zeigt keine Zahl, höchstens einen Punkt bei einer Benachrichtigung.
  Das kleine Symbol der Benachrichtigung in der Android-Statusleiste ist `public/badge-96.png` (weiße Silhouette auf
  transparent – Android nutzt nur die Deckkraft, ein farbiges Icon erschiene als weißes Quadrat). Im **Song-Dialog** steht „Dein Weg“: der eigene Übe-Status im Lauf
  der Zeit (`uebeWeg` in `data/fortschritt.ts`). In der **Probe-Leiste** stehen die anderen als Zeichen mit Namen
  (○ ✎ ↻ ✓ ✓✓ in den Status-Farben, Text für Screenreader und im Tooltip). Reihenfolge: heute fällige zuerst
  (Songs des nächsten Auftritts vorn), danach alle übrigen – der Knopf geht immer. **Mitschnitt** (oben in der
  Notenansicht): die Proben-Mitschnitte des Songs anhören, Stelle wiederholen, langsamer abspielen. Unten alle Songs im
  Karteikasten mit ihrem Status (dort direkt änderbar). **Tagesziel:** unter Einstellungen → Ich bin … „Karteikarten am
  Tag“ (Standard 10) – nur eine **Empfehlung**. **Mit der Band geteilt** (`bn-kasten-<Person>`, Version 2: Kästen und
  eingenordete Songs): daraus lesen alle den Status der anderen (Bühnenreife, Probe-Modus, Probe-Vorschlag); der
  Probe-Vorschlag nimmt Songs, die bei mindestens zwei Leuten in Kasten 1 hängen, ganz nach vorn. Stand je Person
  (`bn-ueben`, `bn-ueben-tagesziel`, `bn-ueben-heute`, gespiegelt).
- **Veranstalter bewerten** (Ansprechpartner beim Auftritt bzw. Termine → Kontakte): Technik, Publikum, Bezahlung
  pünktlich/spät und eine Notiz. Die Kurzfassung steht bei „Wieder anfragen“ (Saisonplanung, Termine → Saison) –
  gelb, wenn zwei Punkte schlecht waren. Wie die Kontakte nur auf den Geräten und im OneDrive.
- **Aus dem Adressbuch** (Ansprechpartner, Neuer Veranstalter): übernimmt Name, Telefon und E-Mail aus den Kontakten
  des Handys – nur in Chrome auf Android (andere Browser können das nicht, dort fehlt der Knopf).
- **Spannungsbogen** (Setlist eines Auftritts): „Sets nach Tempo ordnen“ legt jedes Set neu – Start mit Schwung,
  nach etwa zwei Dritteln ruhiger, der schnellste Song zum Schluss; Tonartsprünge werden dabei möglichst vermieden.
- **Was passt als Nächstes?** (Songs → Liste „Wunschliste“): Wunschsongs, die am besten in die Setlist passen – nach
  dem Tempo, von dem die Spotify-Setlist am wenigsten hat, und nach vertrauter Tonart.
- **Proben-Verlauf** im Song-Dialog: je Probe ein Punkt – grün sitzt, gelb Baustelle (Notiz wie „wackelt“), Kreis
  nur geplant (Häkchen fehlte).
- **Wo lohnt es sich wieder?** (Termine → Kontakte): sortiert die Veranstalter nach Bewertung, dann nach Zahl der
  Auftritte dort.
- **Rückblick-Frist:** Nach einem Auftritt im Dezember erinnert „Heute fällig“ bis zum 14.12. an den Rückblick, damit er
  im Jahresrückblick steht.
- **Tonart hören** (Song-Dialog): 15–20 Sekunden den Song oder die Akkordfolge spielen, das Mikrofon schlägt die
  Tonart vor. Ohne Original-Tonart wird sie das Original, weicht sie ab, „Wir spielen“.
- **Tap-Tempo in der Songliste:** bei „Tonart und Tempo schnell eintragen“ je Zeile ein Tipp-Knopf (4-mal im Takt).
- **Noten zuordnen:** Beim Einlesen von PDF- und .pro-Dateien sucht die automatische Zuordnung in **allen**
  Spotify-Listen (Website, Setlist, Probe, Repertoire, Wunschliste, Archiv) – steht der Song in mindestens einer, ist er
  erkannt. Gibt es einen Titel bei zwei Interpreten (z. B. „Wonderwall“), stehen beide zur Auswahl.
- **Fortschritt je Filter** (Songs → Liste): Balken und „Angaben bei … von … Songs“ beziehen sich auf den gewählten
  Chip (Alle, eine Spotify-Liste oder „Ohne Liste“).
- **Verlässlichkeit** in der Songliste: Punkt grün = von der Band geprüft, blau = recherchiert, blauer Kreis =
  automatisch (Spotify-Analyse), gelb = unsicher. „Zeigen: Werte unsicher“ listet, was noch zu prüfen ist; im Song-Dialog
  bestätigt „✓ Stimmt so“ die Werte (wer selbst Tonart oder Tempo einträgt, bestätigt automatisch). Über „Datei für
  GitHub“ landet das als `geprueft: true` in songinfo.ts.
- **Setlist rund** (Bereit?): mehr als zwei langsame Songs hintereinander, Tonartsprünge und Songs mit Baustelle aus der
  letzten Probennotiz.
- **Für den nächsten Auftritt** (Probenseite): „Alle übernehmen“ holt Baustellen-Songs und Setlist-Songs des nächsten
  Auftritts, die noch nie geprobt wurden, auf den Probenplan.
- **Veranstalter-Mappe** (Termine → Kontakte → „Mappe“): PDF mit Ansprechpartner, Bewertung und allen Auftritten dort
  samt Setlist und Vor-Ort-Angaben – wird auf dem Gerät erzeugt, nur für die Band.
- **Noch … Tage** (öffentlich): In der Woche vor einem öffentlichen, geklärten Konzert zeigen die Unterseiten unten eine
  kleine Leiste zur Konzertseite (nicht auf der Startseite mit dem Countdown, schließbar).
- **Website-Update gescheitert:** Ist der letzte Deploy auf GitHub fehlgeschlagen, steht das ganz oben unter „Heute
  fällig“ mit Link zum Lauf – live ist dann noch der alte Stand.
- **Ladezeit:** Bühnen-Modus, Song-Dialog, Notenbereich und die unteren Teile einer Auftrittsseite werden erst bei
  Bedarf geladen (Songs-Seite ca. 12 % weniger JavaScript).
- **Probe-Vorschlag aus Notizen:** Songs, deren letzte Probennotiz nach Baustelle klingt („wackelt“, „Tempo“,
  „Einsatz“, „nochmal“ …), stehen gleich nach „wackelt noch“ – mit der Notiz als Grund.
- **Startbild:** Ort und Name des nächsten Konzerts sind ein Link zur Konzertseite.
- **Pressekit je Konzert → Alles als PDF (für E-Mails):** Eckdaten mit Plakat, die fertigen Texte und die Songliste in
  einer Datei (Standardschrift, Emojis fallen weg).
- **Konzertseite → Als Story teilen:** Fans teilen ein Story-Bild mit QR-Code; in der letzten Woche mit Countdown
  („NOCH 3 TAGE“, „MORGEN“, „HEUTE“).
- **Freunde mit Bild:** In `band.service.ts` beim Freund `bild: 'freunde/name.webp'` (quadratisch, ca. 256 px, unter
  `public/freunde/`) eintragen – nur mit Freigabe; ersetzt das Symbol.

## Probe ergänzen

Im Formular oben **Probe** wählen. Die Zeile kommt unter `readonly rehearsals: Rehearsal[] = [`.
Proben erscheinen nur im Backstage und im Band-Kalender-Abo.

**Probe planen:** Im Backstage unter **Termine** auf eine Probe klicken. Dort stehen die Songs zum Üben (mit Tonart
und Tempo, falls eingetragen), Notizen und offene Punkte. Alles bleibt auf dem Gerät gespeichert; mit „Diesen Termin
an die Band“ geht der Stand per WhatsApp & Co. an die anderen.

**Probe füllen** (Knopf unter der Suche): füllt die Probe nach ihrer Dauer (ohne Uhrzeit 2 Stunden) – zuerst Baustellen
der nächsten Setlist, dann Songs, die bei mindestens zwei Leuten in Kasten 1 liegen, dann was bei jemandem auf Üben oder
Wackelt noch steht, zuletzt fast bühnenreife Setlist-Songs zum Festigen. Minuten je Song aus den bisherigen Proben (Zeit
im Probe-Modus), sonst 8 Minuten (`src/app/data/probe-fuellen.ts`). **Ergebnis an die Band** (am Ende des Probe-Modus):
Nachricht mit Sitzt, Nochmal (mit Namen und Status), Nicht drangekommen, den Notizen und der nächsten Probe.

**Probenseite:** **Probe-Modus starten** steht ganz oben (sobald Songs geplant sind), dann „Wer kommt?“.
**Songs zum Üben:** Alles zum Hinzufügen steht über der Liste: eine **Suche** für einzelne Songs und ganze
**Setlists, Sammlungen und Spotify-Listen** (fehlende Songs der Liste werden in ihrer Reihenfolge angehängt, die Meldung
sagt, wie viele schon drin waren), darunter eingeklappt **Vorschläge und Generalprobe**. In Spotify-Grün steht der
Unterschied zur Spotify-Liste „Probe“ („29 Songs fehlen hier, 1 nur hier“ bzw. „identisch ✓“; Tooltip mit den Titeln) –
einen eigenen Übernehmen-Knopf gibt es nicht mehr, die Suche „Probe“ findet die Liste. **Liste leeren** entfernt alle
Songs der Probe (Notizen und offene Punkte bleiben).

**Ich bin …** wird nach der Anmeldung mit Microsoft automatisch gesetzt: `mitgliedZuKonto` in `src/app/data/band-ich.ts`
vergleicht den Kontonamen (auch „Nachname, Vorname“, Umlaute als ae/oe/ue) bzw. den Teil der Adresse vor dem @ mit den
Mitgliedern: ganzer Name, Vor- oder Spitzname mit Nachname („Fred Overbeck“), oder nur Vor- bzw. Spitzname, wenn das
Konto genau so heißt („Fred“, „Jan-Frederic“) – nur ein eindeutiger Treffer zählt, Adressen stehen nirgends im Code. Geprüft nach der Anmeldung
(Zugangsseite, Einstellungen → Synchronisation) und einmal je Seitenaufruf im Backstage (`zugang.guard.ts` →
`data/ich-konto.ts`, lazy). Eine Wahl von Hand unter Einstellungen hat Vorrang (`bn-ich-quelle` = hand), „– wählen –“
gibt sie wieder frei; ein anderes Konto auf demselben Gerät wechselt eine automatisch gesetzte Person mit. Die
Einstellung zeigt „Automatisch erkannt über dein Microsoft-Konto“.

**Wer kommt?** Unter **Einstellungen → Ich bin …** steht die eigene Person (automatisch oder von Hand, gilt für die
Person auf allen ihren Geräten), dann auf der Probenseite **Ich komme** / **Ich kann nicht**, optional mit Notiz („komme 30 min später“). Jede Person schreibt eine eigene
Datei (`bn-zusage-<Datum>-<Person>`), die Probenseite zeigt alle Antworten („2 kommen, 1 offen“).

**Unsicher bei:** Mit „Ich bin …“ sieht die Band, welche Songs bei dir auf Üben oder Wackelt noch stehen
(`bn-unsicher-<Person>`, wird aus dem Karteikasten nachgezogen): auf der Probenseite je Song („unsicher: Fred“).

**Übe-Status und Bühnenreife:** Der aktuelle Status je Musiker steht im Karteikasten (siehe Üben); jede Änderung kommt
zusätzlich als Verlauf in die eigene Datei `bn-fortschritt-<Person>` (mit Datum und Quelle: Liste, Probe, Übe-Modus –
daraus „in 30 Tagen gefestigt / neu wackelig“ und die Stände einer Probe). Die **Bühnenreife** eines Songs ist der
Schnitt über alle Musiker (Nicht gelernt 0, Üben 15 %, Wackelt noch 40 %, Sitzt 75 %, Eingenordet 100 %):
**bühnenreif** = bei allen eingenordet, **fast bühnenreif** = bei allen mindestens Sitzt, **Baustelle** = bei
jemandem noch nicht so weit, **ohne Angabe** = niemand hat einen Status. Übersicht unter **Songs → Bühnenreife**: je
Musiker die Songs je Status, was in den letzten 30 Tagen gefestigt wurde oder neu wackelt und der Karteikasten, darunter
alle Songs mit Status je Musiker und Reife-Balken (Filter: Baustellen, fast bühnenreif, bühnenreif, ohne Angabe). Im
Song-Dialog steht die Reife mit Status je Musiker. Der **Probe-Vorschlag** nimmt zuerst die Songs, die bei jemandem auf
Üben oder Wackelt noch stehen (geringste Reife vorn, „wackelt bei Fred, David · Bühnenreife 20 %“), später fast
bühnenreife zum Festigen; für den nächsten Auftritt kommen Setlist-Songs dazu, die bei jemandem wackeln.

**Plan an die Band:** schickt den Probenplan als Nachricht – Songs mit Tonart/Tempo und Spotify-Link zum Vorher-Anhören,
offene Punkte und Notizen (Teilen-Menü, z. B. WhatsApp; sonst Zwischenablage). Eine Woche vor der Probe erinnert
**Heute fällig** daran („Probe in 7 Tagen: 6 Songs geplant – Plan an die Band schicken“), bis der Plan verschickt ist.
**Für Spotify kopieren** kopiert die Track-Links der Probensongs für eine Übungs-Playlist (in Spotify am Computer
einfügen).

**Generalprobe:** „Generalprobe: Setlist … übernehmen“ setzt die Setlist des nächsten Auftritts (von diesem Gerät) in
ihrer Reihenfolge an den Anfang des Plans. Der Probe-Modus spielt dann die Setlist mit Pausen durch – die Uhr läuft je
Set gegen die geplante Spielzeit wie auf der Bühne. Was bei jemandem noch wackelt (Setlist-Songs mit Bühnenreife
„Baustelle“, schwächste zuerst), steht unter dem Knopf mit Namen und kommt **vor dem Durchlauf einzeln** dran: der
Probe-Modus spielt erst diese Songs, dann eine Pause, dann die Setlist am Stück (`plan.vorab`, `generalprobeAblauf` in
`data/probe-modus.ts`; auch im Plan an die Band: „erst einzeln …, dann die Setlist am Stück“). Die Kopfzeile zählt
den Einzel-Block für sich („Einzeln 1 / 2“), die Sets danach wie auf der Bühne („Set 1 / 2“).

**Titelanzeige und Notenansicht (alle drei Modi):** Knöpfe der Titelanzeige von links nach rechts: Schriftgröße
(A− A+), Stimmgerät, Wunsch-Suche (nicht im Übe-Modus), Song-Liste (im Übe- und Probe-Modus auch in der Kopfleiste der
Notenansicht), **Noten** (orange, mit Text auf breiten
Bildschirmen), Beenden. **Hochwischen** in der Titelanzeige lässt die Notenansicht hereingleiten (wie der Noten-Knopf);
in der Notenansicht blendet Hochwischen die Kopfleiste aus, Herunterwischen holt sie zurück – ist sie schon da und das
Blatt ganz oben, gleitet die Notenansicht heraus zur Titelanzeige (auch Escape und Noten-Knopf). Der
**Status-Umschalter** (`src/app/pages/status-schalter.ts`) sieht überall gleich aus: Probe-Leiste, Titelanzeige im
Übe-Modus und Kopfleiste der Notenansicht – dort im Übe- **und** im Probe-Modus (mit „Ich bin …“), zusammen mit
**Mitschnitt**. In beiden Modi bleibt der Song beim Setzen stehen. Oben links:
Anlass und „Song 3 / 12“ (Probe), „Set 1 / 2“ (Auftritt, Generalprobe) bzw. „Karte 2 / 8“ (Übe-Modus, ohne Uhr).

**Kein Neuladen durch Herunterwischen:** `html, body { overscroll-behavior-y: none }` (styles.scss) schaltet Chromes
„Zum Aktualisieren ziehen“ auf der ganzen Seite ab; das Notenblatt (`.flaeche`) reicht sein Scrollen nicht an die
Seite weiter (`overscroll-behavior: contain`). So führt Herunterwischen in der Notenansicht immer zur Titelanzeige.

**Vollbild (Bühnen-, Probe- und Übe-Modus, `data/vollbild.ts`):** Im Browser-Tab und am Computer fordert der Modus das
Vollbild des Browsers an. In der **installierten App auf Handy und Tablet nicht** – die läuft schon insgesamt im
Vollbild, ohne Statusleiste (`"display": "fullscreen"` in `public/site.webmanifest`, gilt für alle Seiten). Grund: Im
Browser-Vollbild zeigt Android bei jedem Wisch vom oberen Rand „Zum Beenden des Vollbildmodus …“ und wirft den Modus
mit „Zurück“ hinaus; beides kann eine Seite nicht abschalten, und die Randgeste beißt sich mit dem Herunterwischen in
der Notenansicht. Das Vollbild der installierten App gehört dagegen zum Fenster: keine Meldung, nichts zu verlassen
(ein Wisch vom Rand blendet die Systemleisten nur kurz ein). Im Browser-Tab auf Touch-Geräten holt der nächste Tipp
ein verlorenes Vollbild zurück. Android übernimmt eine geänderte Anzeigeart erst, wenn es die installierte App
aktualisiert (nach dem Öffnen, meist innerhalb von ein bis zwei Tagen) – oder sofort nach Deinstallieren und neu
Installieren im selben Browser (die Daten bleiben). Geräte ohne Vollbild-Apps (iPhone) zeigen sie als eigenes
Fenster. Der Bereich um eine Kamera-Aussparung bleibt frei (kein `viewport-fit=cover`).

**Probe-Modus:** Auf der Probenseite **Probe-Modus starten** – die eingeplanten Songs im Vollbild wie im Bühnen-Modus,
ab dem ersten noch nicht geprobten. Mit dabei: Noten (PDF/Akkordblatt), Tonart und Capo, Klick mit Übungstempo
(100 → 70 %), Einzählen, Stimmgerät, Schriftgröße; weiter per Pedal, Pfeiltaste, Tippen oder Wischen. Unter jedem Song
die **Probe-Leiste**:

- **Übe-Status** als Umschalter mit fünf Stufen (Nicht gelernt, Üben, Wackelt noch, Sitzt, Eingenordet): gilt für die
  Person am Gerät (Einstellungen → „Ich bin …“, ohne ist er gesperrt) – landet in ihrem Karteikasten und in der
  Bühnenreife. Darunter steht der Status der anderen („David: Wackelt noch“). Für die Band gilt der Song als „nochmal“,
  solange er bei einer Person in dieser Probe noch nicht sitzt; im Plan wird er als geprobt abgehakt, „nochmal üben“
  kommt als Notiz dazu. Zählt im Proben-Verlauf des Songs (Song-Dialog) und im Probe-Vorschlag.
- **Notiz je Person** (eigene Datei `bn-probenotiz-<Person>`, mit der Band gespiegelt): steht auf der Probenseite beim
  Song („Fred: Bridge wackelt“) und im Song-Dialog unter „Zuletzt geprobt“; die Notizen der anderen aus dieser Probe
  stehen darüber. Tippen dort blättert nicht. Ohne „Ich bin …“ geht die Notiz ins gemeinsame Protokoll des Plans.
- **Mikrofon**: Mitschnitt nur dieses Songs aufnehmen und nachhören.
- Die **Notizen der letzten Probe** zum Song (Protokoll und alle Musiker) stehen gelb darüber.
- **Zeit:** wie lange der Song schon dran ist, und wie viel Zeit für jeden offenen Song bis zum Probenende bleibt. Oben
  läuft die Uhr gegen die Probendauer (Beginn bis Ende aus `band.service.ts`). Die Zeit je Song wird mitgeschrieben.

Am Ende eine **Zusammenfassung**: was sitzt, was nochmal dran muss, was nicht drankam, wie lange geprobt wurde – und
ein Knopf, der „Nochmal“ und „Nicht drangekommen“ auf den Plan der **nächsten Probe** setzt (bei „Nochmal“ steht, bei
wem es noch nicht sitzt: „Iris (Fred: Üben)“). Auf der Probenseite stehen danach je Song „↻ nochmal“, Notizen und Minuten. Alles im Probenplan (`bn-probe-<Datum>`, wird mit OneDrive
gespiegelt); Logik in `src/app/data/probe-modus.ts`.

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
- Sperren für die ganze Band (`'Band'`) gelten nur für Auftritte – Proben finden trotzdem statt.

**Schonzeit:** Sobald ein Auftritt geklärt ist (`confirmed: true`), sind die Woche des Auftritts und die drei vollen
Wochen (Montag bis Sonntag) davor und danach automatisch reserviert – sieben Wochen am Stück, im Verfügbarkeitskalender
gestrichelt als **reserviert**, nicht als frei. Das gilt auch für schon eingetragene Auftritte; die bleiben stehen, auch
wenn sie in die Schonzeit eines anderen fallen. Eintragen muss man dafür nichts (`data/schonzeit.ts`, Länge in
`SCHONZEIT_WOCHEN`). Monate, in denen kein Tag mehr frei ist (Schonzeit, Band verhindert, Auftritte), sind in der
Saisonplanung und unter Termine → Saison **rot** markiert („komplett gesperrt · Schonzeit“) – auch im Bild und im
Ausdruck – und werden in Anfragen nicht mehr als frei angeboten. Das Termin-Formular warnt bei einem neuen Auftritt in der Schonzeit („Band (Schonzeit)“); Proben
sind nicht betroffen.

## Spotify-Listen

Die **offizielle** Playlist steht als Repertoire auf der Startseite (`repertoire.json`). Nur fürs Backstage gibt es
dazu **Setlist, Probe, Repertoire, Wunschliste und Archiv** (`playlisten.json`). Beide holt GitHub täglich früh
von Spotify (Actions → „Repertoire aktualisieren“, auch per Knopfdruck); die Listen-IDs stehen in
`scripts/sync-repertoire.mjs`. Gibt Spotify eine Liste nicht heraus, bleibt ihr letzter Stand (Hinweis im Protokoll).

**Repertoire-Check:** Nach jedem Abgleich steht in der Zusammenfassung des Workflow-Laufs (Actions → Lauf öffnen),
was neu ist, was aus allen Listen verschwunden ist, welche neuen Songs noch keine Tonart/Tempo haben und welche
Einträge in `songinfo.ts` zu keinem Song mehr gehören (`scripts/repertoire-check.mjs`). Solche verwaisten Einträge
stoppen den Deploy nicht mehr; sie stehen unter **Backstage → Aufgaben** („Tonart/Tempo für … Songs, die in keiner
Spotify-Liste mehr stehen“) – Song in Spotify wieder aufnehmen oder den Eintrag löschen.

Unter **Songs → Liste** stehen alle Songs aller Listen, gegeneinander abgeglichen (gleicher Titel ohne Zusatz wie
„Remastered“ und gleicher erster Interpret = derselbe Song). Je Song zeigen grüne Symbole, in welchen Listen er
steht – ein Tipp darauf öffnet die Liste in Spotify: 🌐 Website, Setlist, Probe, Repertoire, ♥ Wunschliste,
Archiv. Oben filtern Chips nach einer Liste oder „Ohne Liste“.

**Setlist erstellen:** Auch dort filtern die Chips über der Songauswahl nach Liste oder „Ohne Liste“ (eigenständige
Songs, zu denen es Noten auf dem Gerät gibt); kleine grüne Symbole zeigen je Song die Listen. Songs außerhalb der
Website-Liste reisen im Setlist-Link als Text mit; ihre Länge kommt aus der Spotify-Liste, in der sie stehen.

**Je Liste unter Songs:** Anzahl und Gesamtlänge (eigenständige Songs zählen mit **4 Minuten**, auch in Setlist,
Bühnen-Modus und Laufzettel), **Notenmappe dieser Liste** (alle Noten als ein PDF, in Spotify-Reihenfolge) und
**Listen jetzt aktualisieren** (öffnet GitHub → „Run workflow“). „Zeigen“ und „Reihenfolge“ wirken zusätzlich
zu den Chips – z. B. Setlist + „ohne Bass“. Bei **Wunschliste** zeigt jeder Song seinen Stand: Noten,
Tonart/Tempo, wie oft geprobt (vergangene Proben). **Abweichungen** (aufklappbar): Songs der Spotify-Setlist, die
nicht auf der Website-Liste stehen, und Songs im Archiv, die noch auf der Website stehen.

**Übernehmen:** In der Setlist eines Auftritts mit Chip „Setlist“ oder „Probe“: **Ganze Liste in dieser Reihenfolge
übernehmen** (ersetzt nach Rückfrage). Auf der Probenseite: **… Songs aus der Spotify-Liste „Probe“ übernehmen**
(nur, was noch fehlt); die Suche dort findet Songs aller Listen.

**Hinweise zu den Listen** (unter Songs, aufklappbar): Setlist-Songs nicht auf der Website, Archiv-Songs noch auf
der Website, **live gespielt, aber nicht auf der Website** (Link zur offiziellen Playlist – dort hinzufügen),
**fürs Archiv?** (seit über 12 Monaten weder gespielt noch geprobt; neue Songs ohne Auftritt/Probe nicht) und
**vermutlich doppelt** (gleicher Titel mit anderer bzw. ohne Band, fast gleich geschrieben). Steht einer der beiden
in keiner Liste, lässt er sich mit einem Klick im anderen **aufgehen** – Noten, Mitschnitte und Einträge ziehen mit.
In der **Nachbereitung** eines Auftritts stehen gespielte Songs, die nicht auf der offiziellen Playlist sind.

**Schneller eintragen:** „Tonart und Tempo schnell eintragen“ zeigt Tonart und bpm direkt in der Tabelle (ohne
Dialog). Mit einem Listen-Chip gibt es die Reihenfolge **wie in Spotify**.

**Spielzeit je Auftritt:** In der Setlist die geplante Spielzeit (Minuten Musik ohne Pausen) eintragen – angezeigt
wird „noch … frei“ bzw. „… zu lang“, dazu bis zu drei Songs, die in die Lücke passen (Website-Liste zuerst). Wird
mit der Band abgeglichen. Der Probe-Vorschlag nimmt
Wunschlisten-Songs mit Noten und Tonart, die noch nie geprobt wurden, gleich nach „wackelt noch“. (Die **Bühnenreife**
je Song misst dagegen, wie sicher die Musiker sind – siehe Probe.)

**Eigenständige Songs umbenennen:** Im Song-Dialog „Titel oder Band ändern“ – Noten, Mitschnitte, Setlists,
Proben, Tonart/Tempo-Entwurf und „Wackelt noch“ ziehen mit.

**PDFs ohne Spotify-Titel:** Ein PDF, das noch keinem Song zugeordnet ist, wird beim Öffnen von Songs → Liste
nach seinem Namen zugeordnet: **`<Band> - <Titel>.pdf`**, alles nach einem weiteren „ - “ ist die Fassung
(„Toto - Africa - Bass.pdf“). Steht der Song in einer Spotify-Liste, kommt das PDF dorthin; sonst wird er ein
eigener Song ohne Liste (ohne Symbol). Ohne „ - “ im Namen gilt der ganze Name als Titel.

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
- **Takt** (Song-Dialog, neben bpm; `takt` in `songinfo.ts`, ohne Angabe 4/4): bestimmt das Einzählen im Bühnen- und
  Probe-Modus – 4/4 „1-2-3-4“, 3/4 „1-2-3 · 1-2-3“ (bei kurzen Takten zwei), 6/8 „1-2-3-4-5-6“ (alle Achtel) – und die Betonung im
  Klick (die Eins heller und höher). Bei 6/8 und 12/8 zählt bpm die punktierte Viertel. Recherchiert (November 2026):
  Perfect 12/8, Happy Xmas 12/8 (Tempo dafür auf 49 umgerechnet), Hallelujah 6/8, Hear You Me 3/4; Iris wechselt
  zwischen 4/4 (Intro) und 6/8 – bleibt 4/4 zum Einzählen. Alle anderen nach Notenausgaben bzw. ohne Hinweis 4/4.
  In Setlist und Laufzettel steht der Takt nur, wenn er nicht 4/4 ist.
- Im Bühnen-Modus blinkt **Klick** im Tempo – praktisch zum Einzählen. Daneben schaltet 🔈 einen leisen Ton dazu,
  und **100 %** stellt das Übungstempo auf 90, 80 oder 70 % (zum langsamen Einüben in der Probe).
- **Tonartsprünge:** Liegen zwei Songs in einem Set im Quintenzirkel weit auseinander (z. B. Ab → E), markiert die
  Setlist das mit ⚡ und nennt eine **Überleitung** (den Dominantseptakkord der neuen Tonart, z. B. H7 vor E) – auch
  auf Laufzettel und Bühnen-Ausdruck. **Übergänge glätten** ordnet die Songs innerhalb der Sets so, dass es möglichst
  wenige Sprünge gibt – erster und letzter Song je Set bleiben.
- **Letztes Set auffüllen** (unter der Setlist, Länge links wählen): ergänzt das letzte Set bis zur gewählten Länge –
  die besten Songs zuerst, in der Tonart passend zum vorigen; die bisherigen Songs bleiben.
- **Sammlungen** (früher „Vorlagen“, oben in der Setlist): benannte Songfolgen, z. B. eine bewährte Setlist oder ein
  Kneipen-Set. **Ersetzen** setzt die Sammlung als ganze Setlist, **Anhängen** hängt sie hinten an (Songs, die schon
  drin sind, nicht doppelt). **Als Sammlung speichern** merkt sich die aktuelle Setlist. Bearbeitet werden Sammlungen
  unter **Songs → Sammlungen**: alle Sammlungen als Karten, **Neue Sammlung** anlegen; jede Sammlung hat eine eigene
  Seite (`…/sammlungen?name=…`) wie die Setlist eines Auftritts – Songs suchen oder per Listen-Chip hinzufügen,
  Pfeile sortieren, ✕ entfernt, Pause einfügen, Umbenennen, Löschen (feste: Zurücksetzen). Gespiegelt wie alle
  Band-Daten (`bn-setlist-vorlagen`, `src/app/data/sammlungen.ts`).
- **Pausen neu setzen** (oben in der Setlist): gewünschte Set-Länge in Minuten eingeben – die Pausen werden neu
  zwischen die Songs gelegt, so viele Sets wie am besten passen, alle etwa gleich lang; die Reihenfolge der Songs
  bleibt (`src/app/data/pausen.ts`). Die Set-Länge merkt sich das Gerät.
- **Einzelne Songs** stehen in der Setlist erst nach einer Suche oder einem Listen-Chip (Alle, Setlist, Probe …) –
  sonst bleibt die Seite übersichtlich; „Songliste schließen“ klappt sie wieder zu.
- **Sammlung „Weihnachtslieder“** (fest auf jedem Gerät): die drei Zuckowski-Lieder als Grundstock
  für den Weihnachtsmarkt – anhängen oder ersetzen und ergänzen; bearbeitet wird eine eigene Kopie (Zurücksetzen holt
  die feste wieder). Auf der öffentlichen Repertoire- und
  Songwunsch-Seite stehen die Weihnachtslieder vom 1. bis 24. Dezember automatisch oben.
- Im Bühnen-Modus unter jedem Song 1–5 **Sterne** antippen (oder Taste 1–5), wie er an dem Abend lief. Die
  **Top 100** stehen im Backstage unter **Zahlen**. Sterne anderer Handys kommen über die Synchronisation bzw. ein Backup dazu.
- **Setlist vorschlagen** (unter der Setlist): Anzahl Sets und Minuten wählen – die Songs mit den meisten Sternen
  kommen zuerst, der beste ans Set-Ende.
- Nach dem Auftritt übernimmt **Rückblick schreiben** die Setlist und den „Song des Abends“ (meiste Sterne) – sie
  erscheinen dann auf der Konzertseite.

## Notenblätter und Akkordblätter im Bühnen-Modus

Der Bereich **Songs** im Backstage hat diese Unterseiten: **Liste** (Tonart, Tempo, Noten je Song), **Setlists** (die
Setlists aller Auftritte auf diesem Gerät – kommende zuerst, zugeklappt; ⌄ zeigt die Songs mit Tonart/Tempo, dazu Link
zur Setlist und Bühnen-Modus), **Sammlungen** (anlegen und bearbeiten, je Sammlung eine Seite), **Noten** (alle PDFs
auf dem Gerät, Einlesen und Weitergabe) und **Bühnenreife**.

Unter **Songs → Liste** die Zeile des Songs antippen – im Dialog unten:

- **PDF hochladen** (auch mehrere) oder ein schon gespeichertes wählen. Ein Song kann **beliebig viele PDFs** haben, z. B.
  Bass- und Gitarrennoten oder verschiedene Versionen – jedes bekommt einen Namen unter **Fassung** (wird aus dem
  Dateinamen vorgeschlagen). Bei einem Songbook mit vielen Songs unter **Seite von/bis** die Seiten dieses Songs angeben
  – dieselbe PDF kann für viele Songs dienen.
- **Akkordblatt (ChordPro):** Text mit Akkorden in eckigen Klammern, z. B. `[G]Einer von [D]80 Millionen`. Mit
  `{key: G}` steht da, in welcher Tonart es geschrieben ist (sonst gilt die Originaltonart), `{soc}`/`{eoc}` umschließen den
  Refrain, `{c: Intro 2x}` ist ein Hinweis. Im Bühnen-Modus erscheinen die Akkorde automatisch in **eurer** Tonart –
  mit Capo als Griffbild (z. B. „Wir spielen E, Capo 2“ → Griffe in D). Mit − und + lässt es sich von Hand verschieben.
- **Text in ChordPro umwandeln** (Knopf unter dem Akkordblatt): für „Akkorde über dem Text“, z. B. aus Ultimate Guitar
  oder einer Word-Datei kopiert. Jede Akkordzeile über einer Textzeile wird spaltengenau zu `[G]Text [D]Text`, reine
  Akkordzeilen (Intro, Zwischenspiel) zu `[G] [D] [Em]`; Taktstriche `|` und `x2` stören nicht, auch H, `m7b5`, `6/9`
  oder `N.C.` werden erkannt. Abschnitte wie `[Chorus]`, `Refrain:`, `Strophe 2` werden zu `{comment: …}`, „Key:/Tonart:/
  Tom:“ zu `{key: …}`, „Capo 2“ zu `{capo: 2}`, Titel und Interpret kommen vom Song. Steht schon ChordPro im Feld, bleibt
  es, wie es ist. Eine **.txt-Datei** mit Akkorden über dem Text wird beim Laden gleich umgewandelt. Danach kurz
  prüfen – Akkorde über Leerzeichen am Zeilenende landen hinter dem letzten Wort.
- **.pro-Dateien** (ChordPro, auch `.cho`, `.chopro`, `.chordpro`, `.crd`) direkt einlesen: beim Song **.pro-Datei
  laden** im Dialog, oder viele auf einmal unter **Songs → Noten** (siehe unten). Jede Datei landet automatisch beim passenden Song – über `{title:}`/`{artist:}` in der Datei, sonst
  über den Dateinamen (auch „Interpret - Titel.pro“). Was sich nicht zuordnen lässt, wird genannt. Ältere Dateien mit
  Umlauten aus Windows-Programmen werden richtig gelesen; `{capo: 2}` in der Datei wird beim Transponieren berücksichtigt.

Im **Bühnen-Modus** oben auf das Noten-Symbol tippen. Weiter blättern wie gewohnt – Tippen rechts, Wischen, Pfeiltaste
oder **Bluetooth-Fußpedal** (die senden Pfeiltasten): erst durch die Seiten, am Ende zum nächsten Song, dessen Noten
dann gleich erscheinen. Zurück landet auf der letzten Seite des vorigen Songs. Lange Seiten oder **volle Breite**
(Symbol oben) werden erst gescrollt, dann umgeblättert. **Mitscrollen** lässt ein Akkordblatt in der Länge des Songs
durchlaufen; ‹ und › machen es langsamer oder schneller (je Song gemerkt), ein Tritt aufs Pedal hält es an, der
nächste lässt es weiterlaufen. Hat ein Song mehrere Fassungen (mehrere PDFs und/oder Akkorde), steht oben ein **Auswahlfeld**. Die Wahl
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

**Wetter am Vortag:** Unter **Heute fällig** erscheint am Tag vor einem Auftritt eine Warnung bei Regen (ab 50 %),
Kälte (bis 3 °C) oder Wind (ab 40 km/h) rund um die Auftrittszeit – die passenden Punkte (Pavillon, Abdeckplanen,
warme Kleidung, Gewichte …) landen automatisch auf der Packliste des Auftritts.

**Songs → Noten – suchen und löschen:** Die Suche filtert die PDFs nach Dateinamen (mehrere Wörter, „_“ und „-“ zählen
als Leerzeichen). Der Mülleimer löscht für alle **nur von diesem Gerät** (in OneDrive bleibt die Datei). Wer den
OneDrive-Ordner der Synchronisation besitzt (angemeldet, eigener Ordner – Berechtigung „Daten löschen“), wird gefragt:
**Nur vom Gerät** oder **Auch aus OneDrive** – dann verschwindet die Datei (gleicher Name, gleiche Größe) aus dem
Sync-Ordner, wird gleich abgeglichen und ist danach für die ganze Band weg. Auf den Geräten der anderen verschwindet
beim nächsten Abgleich auch die schon eingelesene Kopie im Noten-Speicher – auch wenn dort „Löschungen übertragen“
aus ist. Dafür merkt sich die Band die gelöschten Dateien (Name, Größe, Zeitpunkt; `bn-noten-geloescht`, 120 Tage).
Gilt nur für Dateien, die vor der Löschung da waren: wer dieselbe Datei später neu einliest, behält sie.

**Im Bühnen-Modus außerdem:**

- **Markieren:** in der PDF-Ansicht auf ✏ tippen und mit Finger, Stift oder Maus ins Notenblatt zeichnen (Rot, Blau,
  Grün, Textmarker; ↶ nimmt den letzten Strich zurück, 🗑 leert die Seite). Markierungen gelten **für alle** in der Band
  und werden mitsynchronisiert; mit dem Personen-Knopf (👥 → 👤) zeichnest du **nur für dich** (bleibt gemerkt).
- **Schrift im Notenblatt:** in den Markier-Werkzeugen auf **T** tippen, dann auf die Stelle tippen und den Text ins
  Feld schreiben (z. B. „Bridge leise“) – **Enter macht eine neue Zeile**, „Übernehmen“ (oder Strg/Cmd+Enter) setzt den
  Text, Esc bricht ab. „A“ wählt die Größe (klein, mittel, groß), die Farbe gilt wie beim Stift (Textmarker wird zu
  Schwarz). Tippen auf einen vorhandenen Text öffnet ihn zum Ändern oder Löschen; ↶ nimmt die letzte Markierung zurück. Die
  Werkzeugleiste passt sich der Breite an (auf dem Handy zweizeilig, wenn nötig); ⤒/⤓ schiebt sie nach oben bzw.
  unten, damit sie nicht verdeckt, was markiert werden soll. Texte haben einen weißen Rand, damit sie auf den Noten lesbar bleiben, und werden wie Striche
  mitsynchronisiert.
- **Noten-Knopf und X:** Der Noten-Knopf (♫) bleibt auch in der Notenansicht oben rechts – noch einmal drücken führt
  zurück zur Titelanzeige. Das **X** beendet immer den Bühnen- bzw. Probe-Modus, auch aus der Notenansicht.
- **Noten im Bühnen- und Probemodus:** Capo steht immer mit in der Kopfleiste, auch bei PDF-Noten. Nach oben
  wischen blendet die Einstellungen aus (mehr Platz fürs Blatt, Capo bleibt als kleines Schild oben rechts), nach
  unten wischen oder Tippen aufs Schild holt sie zurück. Waagerecht wischen blättert wie gewohnt.
- **Halbseiten-Blättern** und eigene **Pedal-Tasten:** unter Backstage → **Einstellungen → Bühnen-Modus**. Mit
  Halbseiten-Blättern zeigt der erste Tritt oben schon den Anfang der nächsten Seite, der zweite blättert ganz um.
  Pedal-Taste festlegen: „+ Taste“ antippen und aufs Pedal treten. **Fortschrittsbalken** unten in der Titelanzeige
  (orange, das ganze Set): Standard nur Anzeige – mit „Fortschrittsbalken … antippen springt zu einem Song“
  (`bn-buehne-balken-tippen`) springt ein Tipp dorthin. Aus, damit niemand beim Hochwischen vom unteren Rand aus
  versehentlich den Song wechselt. Vier Aktionen (`data/buehne-einstellungen.ts`):
  **Weiter** (→, Leertaste, Bild ↓, Eingabe), **Zurück** (←, Bild ↑), **Hoch** (↑, wie nach oben wischen: Titelanzeige →
  Notenansicht → volle Notenansicht) und **Runter** (↓, wie nach unten wischen: zurück bis zur Titelanzeige). Eine Taste
  gehört immer nur zu einer Aktion. Bis November 2026 blätterten ↓/↑ weiter bzw. zurück; ältere gespeicherte
  Belegungen bekommen ↑/↓ beim Lesen automatisch für Hoch/Runter (`tastenLesen`).

- **Einzählen:** neben dem Tempo auf **1-2-3-4** tippen – vier Schläge im Tempo des Songs groß auf dem Bildschirm
  (mit Ton, wenn der Klick-Ton an ist; die Eins höher). Der **Klick** daneben blinkt dauerhaft im Tempo.
- **Notiz für diesen Auftritt:** in der Setlist beim Song auf ✎ tippen, z. B. „Schluss zweimal“ oder „Einstieg nur
  Gitarre“. Sie steht grün im Bühnen-Modus, auf dem Ausdruck, in der Notenmappe und geht mit „Als Link“ an die Band.
  (Was für einen Song **immer** gilt, gehört in die Notiz unter Songs → Liste.)
- **Stimmgerät:** oben auf das Regler-Symbol tippen – großer Tonname (deutsch: B = B♭, H), Nadel für die Abweichung,
  grün bei ±5 Cent. Gibt es auch auf der Probenseite.
- **Lupe (Wunsch):** Oben die Lupe antippen, Titel oder Interpret tippen (alle Spotify-Listen und eigenständige
  Songs) – der Song kommt **an die aktuelle Stelle** und ist sofort dran, der bisherige folgt danach. Steht er schon
  in der Setlist, wird er von dort **hierher gezogen**. Er ist als Publikumswunsch (♥) markiert und landet in der
  gespeicherten Setlist (und damit beim Abgleich bei der Band).
- **Fortschrittsbalken:** antippen springt an die Stelle; weiße Striche markieren die Pausen zwischen den Sets.
- **Song-Liste:** das Listen-Symbol oben zeigt rechts alle Songs der Setlist mit Nummer (Pausen als Trenner) –
  antippen springt dorthin (auf dem Handy schließt sich die Liste danach, Escape schließt sie am Laptop).
- **Links oben** steht, wofür der Modus läuft: Name des Auftritts bzw. „Probe 12.11.“, danach Set bzw. Song-Nummer;
  in der Notenansicht der Name vor dem Songtitel.
- **Set zu lang:** Läuft das Set über die geplante Länge, steht unten „⏱ 4:10 drüber – streichen: …“ mit den Songs mit
  den wenigsten Sternen (Publikumswünsche bleiben). **Streichen** überspringt sie beim Blättern – nur für diesen Abend.

**Vor dem Auftritt** (Setlist des Auftritts):

- **Bereit?** steht oben auf der Seite jedes kommenden Auftritts und unter **Aufgaben → Anstehende Auftritte** für alle
  kommenden Auftritte untereinander (zugeklappt zeigt jede Liste ihre Punkte als Haken-Reihe rechts):
  Termin geklärt, Beginn, Setlist, Tonart/Tempo und Noten der Songs, Vor-Ort-Angaben (Ansprechpartner, Ankunft,
  Strom), fällige Werbung und – zwei Tage vorher – die Packliste. Jeder offene Punkt führt dorthin, wo er sich erledigen
  lässt. Setlist, Noten, Vor Ort und Packliste stehen auf dem jeweiligen Gerät – auf einem anderen Handy kann der Check
  daher anders aussehen.
- **Bühnen-Modus ohne Netz** (ab einer Woche vorher in Bereit?): prüft, ob der Offline-Speicher aktiv ist und
  Backstage sowie die Noten-Anzeige (pdf.js) auf dem Gerät liegen. Fehlt etwas, holt **Jetzt vorladen** es nach;
  ohne aktiven Offline-Speicher die Seite einmal mit Netz neu laden.
- **Vortag:** Am Tag vor einem Auftritt steht unter **Heute fällig** „Morgen: <Ort> – Bereit?, Packliste, Wetter,
  Notenmappe und Offline prüfen“ und führt auf die Seite des Auftritts. Dort kommen in Bereit? zwei Punkte zum Abhaken
  dazu: **Wetter angesehen** und **Notenmappe dabei** (gespiegelt für die Band, `bn-vorabend-<Auftritt>`).
- **Für Spotify kopieren** (Setlist): kopiert die Spotify-Track-Links der Songs in Setlist-Reihenfolge – in Spotify am
  Computer eine Playlist öffnen und mit Strg/Cmd+V einfügen. Songs ohne bekannten Link werden genannt. Stehen Songs der
  Setlist nicht in der Spotify-Liste „Setlist“, sagt ein Hinweis unter der Setlist, welche.
- **An die Band schicken** (Songs → Song bearbeiten): Steckbrief mit Tonart (und Band-Tonart), Capo, Tempo, Notiz und
  Spotify-Link – übers Teilen-Menü (z. B. WhatsApp), sonst in die Zwischenablage.

- **Auftritt vorbereiten** prüft für jeden Song, ob Noten in deiner Fassung (eigene Wahl bzw. Vorliebe wie „Bass“)
  auf dem Gerät sind, ob die PDF sich öffnen lässt und der Seitenbereich passt, und lädt alles für ohne Netz.
- **Notenmappe (PDF)** fasst alle Noten der Setlist in Reihenfolge zu einem PDF zusammen – Deckblatt mit der Setlist,
  PDF-Seiten im eingestellten Bereich, Akkordblätter in eurer Tonart, Pausen als Trennseite. Zum Drucken oder fürs
  Tablet; die Datei entsteht nur auf dem Gerät und gehört nicht ins Repository.

**In der Probe** (Song-Dialog unter Songs → Liste):

- **Übe-Status** (Auswahl oben im Dialog): dein eigener Status zum Song – Nicht gelernt, Üben, Wackelt noch, Sitzt,
  Eingenordet (braucht „Ich bin …“). Landet im Karteikasten und in der Bühnenreife; der **Probe-Vorschlag** nimmt Songs
  mit Üben/Wackelt noch zuerst, „Zeigen → Üben oder Wackelt noch“ listet deine.
- **Mitschnitte:** auf **Aufnehmen** tippen, die Band spielt, **Stopp** – die Aufnahme bleibt beim Song auf diesem Gerät,
  zum Nachhören zu Hause oder zum **Teilen** (Messenger, AirDrop). Beim ersten Mal fragt der Browser nach dem Mikrofon.
  Mit ☁ (**Mit der Band teilen**) landet sie im Ordner `Mitschnitte/` der OneDrive-Synchronisation und erscheint bei den
  anderen beim Song („von …“). Mitschnitte gehen nie an GitHub und nicht ins Backup (zu groß).
- **Üben** (↻ beim Mitschnitt): **A** und **B** setzen wiederholt die Stelle dazwischen in Schleife, **Tempo** spielt
  langsamer ab (bis 50 %), ohne dass sich die Tonhöhe ändert.
- **Auf der Probenseite** (Termine → Probe): 🎤 neben jedem geplanten Song nimmt für diesen Song auf, **Ganze Probe
  aufnehmen** nimmt die Probe am Stück auf (gehört zur Probe, nicht zu einem Song); dazu das **Stimmgerät**.

**Nach dem Auftritt** (Seite des Auftritts, sobald er vorbei ist): **Nachbereitung** aufklappen – Sterne je Song (wie im
Bühnen-Modus), ⚠ setzt deinen Übe-Status eines Songs auf „Wackelt noch“ (aus: Sitzt), dazu „Was lief gut?“ und „Was ging schief?“.
**Merkpunkte** (eine Zeile je Punkt, z. B. „Kabel für Keys kaufen“) stehen unter **Aufgaben**, bis sie abgehakt sind.
„Was lief gut“ lässt sich im Rückblick-Formular darunter als Entwurf übernehmen – vor dem Veröffentlichen umformulieren.
Die Nachbereitung steckt im Backup (Einstellungen → Backup).

**Hier schon gespielt** (Setlist): Spielt ihr wieder am selben Ort (auch „Café Lotti“ und „Café Lotti – Tanz in den
Mai“), steht bei jedem Song, der dort schon lief, „↺ hier schon am … gespielt“. **Für Abwechslung tauschen** ersetzt
sie durch Songs, die dort noch nicht liefen – mit möglichst ähnlichem Tempo.

**Songs → Liste:** „Zeigen“ ist nach Fragen gruppiert: **Tonart und Tempo** (fehlt, noch nicht geprüft), **Noten auf
diesem Gerät** (ganz ohne, ohne PDF, ohne Akkordblatt, ohne Fassung wie „Bass“), **Mein Übe-Status** (Üben oder Wackelt
noch sowie jeder der fünf Status einzeln), **Bühnenreife der Band** (Baustelle, fast bühnenreif, bühnenreif) und **Live
gespielt** (noch nie, seit über einem Jahr nicht, auf einer kommenden Setlist). Je Song steht, wie oft und wann zuletzt er gespielt wurde (aus den Setlists vergangener
Auftritte) und ob er in einer kommenden Setlist steht; sortierbar nach „oft“ bzw. „lange nicht gespielt“.

## Gerät aufräumen (Abgleich)

**Angemeldet** (Microsoft-Konto der Synchronisation auf diesem Gerät): Auf der Website fasst die Kopfleiste die
Sprachen in einem Untermenü zusammen (DE ▾) und zeigt ganz rechts **Backstage** – im Handy-Menü ebenso („Sprache: DE“
zum Aufklappen, Backstage als letzter Punkt). Besucher sehen davon nichts.

**Löschen nur mit Berechtigung „Daten löschen“:** Mülltonnen und Aufräumen erscheinen nur, wer bei Microsoft angemeldet
ist und den OneDrive-Ordner der Synchronisation **besitzt** (nicht nur geteilt bekommen hat) – denn Löschen wird
mitsynchronisiert und betrifft die ganze Band. Ob man die Berechtigung hat, steht unter Einstellungen → Synchronisation.
(Eine App-Rolle in der App-Registrierung geht dafür nicht: Microsoft vergibt App-Rollen nur an Firmen-/Schulkonten.)

Backstage-Daten liegen im Browser des jeweiligen Geräts – mit Synchronisation zusätzlich in OneDrive (siehe unten). Unter **Abgleich → Daten auf diesem Gerät** steht jeder
einzelne Eintrag, nach Bereichen gruppiert und verständlich benannt (z. B. „Setlist · 04.12.2026 · Weihnachtsmarkt“),
mit Inhalt („12 Songs, 1 Pause“) und Größe – dazu alle Noten (Songs mit Noten, PDFs und wo sie genutzt werden),
Proben-Mitschnitte und Seiten für unterwegs:

- Titel antippen öffnet die passende Seite (Setlist, Packliste, Probe …).
- `{ }` zeigt den gespeicherten Inhalt und lässt ihn von Hand ändern (nur gültiges JSON wird gespeichert) – für
  Notfälle, normal ändert man auf der Seite des Bereichs.
- Suchen (z. B. „2026“, „Rhede“, „Setlist“), auswählen und die Auswahl **teilen** (Datei zum Importieren auf anderen
  Geräten) oder **löschen**.
- Neben jedem Bereich (Setlists, Packlisten, Noten, Mitschnitte, Seiten für unterwegs …) löscht der Besen-Knopf den
  ganzen Bereich (bei einer Suche nur die gefundenen Einträge).

In derselben Karte darunter **Aufräumen**:

- **Vergangene Auftritte und Proben:** Alter wählen (gleich danach, 30 Tage, 6 Monate, 1 Jahr) und welche Bereiche.
  Vorgewählt sind Packlisten, Vor Ort, Werbeplan und Proben; Setlists und Sterne bleiben, weil Rückblick, Top 100
  und Setlist-Vorschlag sie brauchen.
- **Alles löschen:** setzt die Website auf dem Gerät komplett zurück (Bestätigung durch Eintippen von „LÖSCHEN“).

Vorher sichern: **Einstellungen → Backup → Backup erstellen** (alles: Daten, Einstellungen, Notenblätter).

## Backup (Einstellungen)

Ein **Backup** enthält immer alles in einer Datei: die Backstage-Daten des Geräts (Setlists, Packlisten, Vor Ort,
Proben, Sterne, Werbeplan, Nachbereitungen, Songs-Entwurf, Zusagen …), die Einstellungen und die Notenblätter (PDFs,
Akkordblätter, Markierungen). Nur die Proben-Mitschnitte gehören nicht dazu (zu groß). Beim Wiederherstellen werden
persönliche Einstellungen nur ergänzt, nicht überschrieben (außer bei „Alles ersetzen“). Die Kachel zeigt, wann das letzte Backup von diesem Gerät war und (mit Synchronisation) das neueste
Backup im OneDrive-Ordner „Backup“. Unter **Backups in OneDrive (…)** stehen alle Backups dort (neueste zuerst;
frühere, getrennte Daten- bzw. Noten-Backups sind als solche markiert) – jedes lässt sich einzeln **wiederherstellen** (ergänzt die Daten des Geräts, vorher
zeigt eine Rückfrage, was neu ist und was sich ändert). Ist das letzte Backup älter als 14 Tage (oder gab es noch keins), steht es unter
**Heute fällig**; nach 30 Tagen erinnert zusätzlich Backstage → Aufgaben.

**Alte Backups löschen** (nur wer den Sync-Ordner besitzt, Berechtigung „Daten löschen“): unter **Backups in OneDrive
(…)** der Knopf „n ältere Backups löschen – die 2 neuesten bleiben“. Erst wird abgeglichen (damit Backups anderer
Geräte mitzählen), nach einer Rückfrage mit den beiden verbleibenden Backups werden alle älteren über den Lösch-Weg der
Synchronisation entfernt – aus OneDrive und von allen Geräten (`backupsAufraeumen` in `data/backup-regeln.ts`).

- **Backup erstellen:** mit eingerichteter Synchronisation in den Unterordner `Backup` des OneDrive-Ordners
  (`blickfeld-nord-backup-JJJJ-MM-TT-HHMM.json`) und gleich abgleichen. **Aufbewahrung:** ein halbes Jahr – die
  letzten 5 Backups bleiben aber immer, auch wenn sie älter sind; ältere werden beim Erstellen eines neuen Backups
  gelöscht (geht mit dem Abgleich auch in OneDrive weg, wenn „Löschungen übertragen“ an ist). Ohne Synchronisation als Datei zum
  Teilen oder Speichern. **Als Datei teilen** geht auch mit Synchronisation, z. B. für die WhatsApp-Gruppe.
- **Aus OneDrive wiederherstellen:** gleicht ab und übernimmt das neueste Backup aus dem OneDrive-Ordner (auch frühere
  Sicherungen aus dem Ordner `Backstage`) – mit Vorschau, was neu ist und was sich ändert.
- **Aus Datei wiederherstellen:** Backup-Datei(en) wählen, ebenfalls mit Vorschau; ergänzt, was da ist.
- **Alles ersetzen statt ergänzen** (aufklappen): löscht vorher alle Backstage-Daten des Geräts – danach hat es genau
  den Stand des Backups, z. B. ein neues Handy.

Einzelne Auftritte oder Proben an die Band schicken: auf deren Seite **Diesen Termin an die Band**.

## Synchronisation OneDrive ↔ lokal (Einstellungen)

**Hilfe im Abgleich:** Neben jedem Knopf (Jetzt synchronisieren, Lokale Dateien, Synchronisierte Dateien einlesen,
Zuordnen, ignorieren) erklärt ein **(i)**, was er tut. Während des Abgleichs steht unter dem Fortschritt
**„Was passiert gerade?“** in einfachen Worten (Daten vorbereiten, Listen lesen, Hoch-/Herunterladen, Konflikte, Noten
erkennen). Texte: `src/app/data/sync-hilfe.ts`.

**Geräte:** Unter **Abgleich → Geräte** bekommt jedes Gerät einen Namen (z. B. „Freds Handy“; ohne Namen ein Vorschlag
wie „iPhone“). Beim Abgleich legt es höchstens stündlich eine kleine Datei `Geraete/<Kennung>.json` (Name, Person,
Zeitpunkt) in den Sync-Ordner – die Liste zeigt, welches Gerät wann zuletzt abgeglichen hat. Name und Kennung bleiben auf
dem Gerät (`bn-geraet-…`, nicht gespiegelt).

**Fehler beim Herunterladen** („Herunterladen nicht möglich (keine Verbindung oder vom Browser blockiert)“): Der Browser
hat die Anfrage ohne Antwort abgebrochen – kurz kein Netz, oder die Datei wurde gerade von einem anderen Gerät ersetzt
(die Geräte-Dateien schreibt jedes Gerät stündlich neu) und der alte Download-Link zeigt ins Leere. `cloudLaden` in
`data/onedrive.ts` holt dann einen frischen Link und versucht es nach einer Sekunde noch einmal. Scheitert auch das,
bleibt die Datei als „nicht erledigt“ stehen und der nächste Abgleich holt sie – es geht nichts verloren.

**Zuordnen in einem Rutsch:** Beim Einlesen zeigt jede Noten-Datei „liegt schon bei …“, wenn eine gleichnamige Datei
auf diesem Gerät schon bei einem anderen Song liegt. Hat man für eine Datei den Song gewählt, übernimmt
**„für alle gleich benannten übernehmen“** die Wahl für alle Dateien mit gleichem Titel und Interpret im Namen (Fassung
egal, z. B. „Toto - Africa - Bass.pdf“ und „Toto - Africa - Gitarre.pdf“).

**Noten-Check** (Abgleich → Daten auf diesem Gerät, unter „Noten“): listet Noten-Dateien ohne Song und doppelte Dateien
(gleicher Name, gleiche Größe). **Zusammenführen** lässt alle Songs auf eine Kopie zeigen, nimmt Markierungen mit und
entfernt die übrigen Kopien von diesem Gerät – in OneDrive ändert sich nichts. Dateien ohne Song (auch doppelte ohne
Song) lassen sich mit der Berechtigung „Daten löschen“ löschen: **Vom Gerät** (OneDrive bleibt) oder **Auch aus OneDrive**
(gleicher Name und gleiche Größe im Sync-Ordner; der Abgleich löscht dort – betrifft die ganze Band).

**Alle Einstellungen und Backstage-Daten wandern mit:** Ist man angemeldet und die Synchronisation eingerichtet, wird
jeder Eintrag als eigene kleine Datei im Sync-Ordner gespeichert – so ändern zwei Leute selten dieselbe Datei:

- `Daten/` – für die ganze Band: Setlists (samt Notizen und Sammlungen), Spielzeiten, Packlisten, Vor Ort, Vorabend,
  Proben, Zusagen, „unsicher bei“, Übe-Status und Verlauf je Musiker (Karteikasten), Probe-Notizen je Musiker, Sterne, Werbeplan-Häkchen, Nachbereitungen, Kontakte,
  Saison-Stand, Songs-Entwurf, für alle gelöschte Noten, Prüf-Häkchen.
- `Einstellungen/<Name>/` – je Person: Bühnen-Modus (Schriftgröße, Klick-Ton, Pedal-Tasten, Halbseite), gewählte
  Noten-Fassung (PDF bzw. Akkorde), volle Breite, von Hand verschobene Akkorde und Mitscroll-Tempo je Song, gemerkte
  Zuordnungen, eigener Karteikasten (mit Fälligkeit, Tagesziel), Aufgaben-Häkchen, Filter, Sprache.
- Nicht gespiegelt wird nur, was zum Gerät gehört: Sync-Einstellungen, Anmeldung, Gerätename, Zugangssperre, letzter
  Backup-Zeitpunkt.
- **Neue Daten erscheinen sofort:** Bringt ein Abgleich Änderungen anderer Geräte (z. B. einen Haken im Werbeplan), baut
  sich die offene Backstage-Seite neu auf (gleiche Scroll-Position). Tippt man gerade etwas, ist ein Dialog offen oder
  läuft der Bühnen- bzw. Probe-Modus, erscheint stattdessen unten „Neue Daten der Band – anzeigen“.
- `Noten/` – je Song, welche PDFs (mit Fassung und Seitenbereich) und welches Akkordblatt dazugehören. PDFs werden
  über Name und Größe gefunden; fehlt eines auf dem Gerät, holt die App es aus dem Sync-Ordner (z. B. `Sheets/`).
- `Markierungen/Band/` – Zeichnungen im Notenblatt für alle (Standard), `Markierungen/<Name>/` – die nur für dich
  gezeichneten, je PDF. Fehlt einem Gerät ein PDF noch, löscht es dessen Noten oder Markierungen nie für die anderen
  und holt sie nach, sobald das PDF da ist.
- `Mitschnitte/` – nur, was jemand ausdrücklich mit der Band teilt.
- Nur auf dem Gerät bleiben die Synchronisation selbst (Ordner, Anmeldung), nicht geteilte Mitschnitte und die Seiten
  für unterwegs.

**Konflikte:** Ändern zwei Geräte denselben Eintrag gleichzeitig, gewinnt die neuere Fassung, die ältere bleibt als
Konfliktkopie. Abgleich → Synchronisation zeigt sie mit beiden Fassungen: **Aktuelle behalten** entfernt die Kopie,
**Kopie übernehmen** macht sie wieder gültig – für alle. Bei Übe-Daten (Karteikasten, geteilter Kasten, Verlauf,
Probe-Notizen, „unsicher bei“, heute geübt) gibt es zusätzlich **Zusammenführen**: beide Fassungen werden vereint
(`data/spiegel-merge.ts`; je Song gewinnt der spätere Stand, Verlauf und Eingenordete von beiden Seiten).

**Gerät neu aufsetzen** (anderer Browser, neues Handy, Speicher gelöscht): Beim allerersten Abgleich eines Geräts
schreibt es seine Einträge **nicht** vorab in den Sync-Ordner – sonst träte z. B. ein leerer Karteikasten (entsteht
nach „Ich bin …“) als neuere Fassung gegen den Stand in OneDrive an und machte eine Konfliktkopie. Erst wird geholt;
danach gilt für jeden Eintrag, der schon in OneDrive liegt, dessen Stand (Übe-Daten mit dem Gerät zusammengeführt),
was es nur auf dem Gerät gibt, geht im gleich folgenden schnellen Abgleich hoch (`spiegelnVorher`/`spiegelnNachher` in
`data/sync.service.ts`). Außerdem legt die Umstellung auf die fünf Übe-Status keinen leeren Kasten mehr an.

Jede Änderung wird nach wenigen Sekunden abgeglichen. Solange abgeglichen wird, blendet sich **unten rechts** ein
Kompass ein und dreht sich (nur online); danach blendet er sich wieder aus – antippen öffnet den Abgleich. Dort steht bei jedem Eintrag ☁ synchron, ⟳ wartet oder
▣ nur auf diesem Gerät (persönliche Einstellungen mit „persönlich“), oben die Summe und der letzte Abgleich.

Wie OneSync: Ein **OneDrive-Ordner** wird mit einem **lokalen Ordner** abgeglichen – in beide Richtungen, auf Wunsch
automatisch. Eingerichtet wird unter **Backstage → Einstellungen** (die App-Registrierung ist erledigt, siehe
„OneDrive einrichten“):

1. **Microsoft-Konto:** **Mit Microsoft anmelden** (die App-ID ist fest eingetragen). Die Anmeldung bleibt auf dem
   Gerät, auch wenn die App beendet wird. Microsoft erneuert sie bei Browser-Apps spätestens nach 24 Stunden – das
   geht still im Hintergrund, solange man bei Microsoft angemeldet ist („Angemeldet bleiben“ beim Login); sonst
   fragt „Jetzt synchronisieren“ einmal kurz nach.
2. **OneDrive-Ordner:** durchklicken, ggf. **Neuer Ordner**, **Diesen Ordner nehmen**. Ganz oben stehen auch Ordner,
   die jemand mit dir **geteilt** hat (Symbol mit zwei Personen, „geteilt“) – z. B. der gemeinsame Band-Ordner „Sync“
   mit `Backstage`, `ProChords` und `Sheets`. So gleichen alle drei denselben Ordner ab, egal wem er gehört.
3. **Lokaler Ordner:**
   - **Speicher dieser App** – auf allen Geräten (iPhone, Android, Mac, PC), offline verfügbar. Die Dateien liegen im
     Browser (nicht in der Dateien-App sichtbar); unter Abgleich → **Lokale Dateien** lassen sie sich öffnen.
   - **Ordner auf diesem Computer** – nur Chrome/Edge am Mac oder PC: ein echter Ordner auf der Festplatte.
4. **Optionen:** Richtung (beide / nur herunter / nur hoch), **Löschungen übertragen** (in OneDrive landen sie im
   Papierkorb), **Automatisch** (beim Öffnen des Backstage, alle 15 Minuten, solange er offen ist, sobald man die App
   wieder in den Vordergrund holt, und 5 Sekunden nach jeder eigenen Änderung).

So wird abgeglichen: Der Stand nach jedem Abgleich wird gemerkt. Neues und Geändertes wandert auf die andere Seite,
Gelöschtes wird (wenn eingeschaltet) drüben auch gelöscht. Ist eine Datei auf beiden Seiten geändert, gewinnt die
neuere; die ältere bleibt als `Name (Konflikt Gerät 2026-10-27).pdf` erhalten. Würden auf einmal viele Dateien gelöscht,
wird vorher gefragt. Beim ersten Abgleich und nach einem Ordnerwechsel gelten gleich große Dateien als gleich.

Neue Daten anderer Geräte auf einer offenen Seite: **Songs → Liste**, die **Setlist**, die **Probe-Planung** (Plan,
Zusagen, Stand der Band) und die **Auftrittsseite** (Werbeplan, Bereitschaft, Kurzstatus, Kontakt, Nachbereitung,
Rückblick) lesen sie selbst ein – Suche, Filter, Sammlung, aufgeklappte Bereiche und Scrollposition bleiben. Technik:
Die Seite meldet sich mit `auffrischenAnmelden` an; Bereiche, die beim Öffnen aus dem Speicher lesen, lesen in ihren
`computed`/`linkedSignal` zusätzlich `datenStand()` mit (`src/app/data/neu-zeichnen.ts`). Andere Seiten werden nur neu aufgebaut, wenn seit einer Minute niemand
tippt, klickt oder scrollt; sonst erscheint unten „Neue Daten der Band – anzeigen“. Gezählt werden nur echte
Änderungen (ein Noten-Eintrag, dessen PDF auf dem Gerät noch fehlt, löst nicht bei jedem Abgleich einen Neuaufbau aus).

Schnell- und Vollabgleich: Nach einer eigenen Änderung, beim Öffnen und beim Zurückholen der App werden nur
**Einstellungen und Daten** abgeglichen (die kleinen JSON-Dateien in `Daten/`, `Einstellungen/`, `Noten/`,
`Markierungen/`, `Geraete/`) – das dauert Sekunden. Liegen in OneDrive neue oder geänderte PDFs bzw. Mitschnitte,
steht das im letzten Abgleich („3 Dateien (12 MB) werden geladen“) und der **volle Abgleich** folgt gleich danach; sonst
läuft er alle 15 Minuten und bei **Jetzt synchronisieren**. Änderungen während eines Abgleichs werden danach nachgeholt.
OneDrive wird über die **Änderungsliste** gelesen (Microsoft Graph „delta“, `data/cloud-delta.ts`): eine Anfrage für
„was ist seit dem letzten Mal neu“ statt einer je Ordner; der Dateibaum wird je Gerät gemerkt und einmal am Tag
komplett neu gelesen. Klappt das nicht (Verknüpfung zu einem fremden Ordner im Sync-Ordner, OneDrive lehnt ab), wird
wie früher Ordner für Ordner gelesen. Übertragen wird mit bis zu vier Dateien gleichzeitig.
Neue oder geänderte Noten (PDF, .pro) werden nach dem Abgleich gleich beim richtigen Song eingelesen (abschaltbar);
eine geänderte PDF gleichen Namens ersetzt die bisherige (verglichen wird der Inhalt, nicht nur die Größe), eine unveränderte wird nicht ein zweites Mal an den Song gehängt – auch nicht beim Einlesen von Hand oder beim Hochladen im Song-Dialog; doppelte Verweise aus früheren Abgleichen räumt der volle Abgleich auf. Gelöschtes: Unter Abgleich → Daten verwalten fragt der Mülleimer bei PDFs „für die ganze Band“ (OneDrive und alle Geräte) oder „nur hier“. Für alle gelöschte PDFs werden auf keinem Gerät wieder eingelesen und lösen keine Rückfrage „viele Dateien würden gelöscht“ aus; andere Löschungen, die die Rückfrage im automatischen Abgleich zurückhält, stehen im letzten Abgleich („… warten auf „Jetzt synchronisieren““). Im Song-Dialog stehen die Dateinamen der PDFs orange. Was sich nicht eindeutig zuordnen ließ, meldet die Sync-Karte
(„2 Noten-Dateien brauchen eine Zuordnung“ → **Zuordnen**). Dateien, die schon einmal als **Eigenständig** eingelesen
wurden (gemerkte Zuordnung), kommen ohne Rückfrage wieder zu ihrem Song – auch wenn sie neu im Ordner auftauchen.
Unter **Abgleich → Synchronisation** stehen der letzte Abgleich, **Jetzt synchronisieren** (mit Fortschritt) und
**Synchronisierte Dateien einlesen** (PDFs, .pro). Backups und Notenpakete stehen dort nicht mehr, sondern unter
Einstellungen → **Backup**. Noten, die schon einmal als **Eigenständig** eingelesen wurden, werden nicht mehr angeboten
(ein Hinweis sagt, wie viele ausgeblendet sind).

Beim **Einlesen** (Synchronisierte Dateien einlesen bzw. Zuordnen):

- **Ohne Liste:** In der Song-Auswahl jeder Noten-Datei gibt es oben **Eigenständig: <Titel> – <Band>** – ein eigener
  Song aus dem Dateinamen `<Band> - <Titel>.pdf` (Rest = Fassung), der zu keiner Spotify-Liste gehört und unter
  Songs → „Ohne Liste“ steht – und, mit Berechtigung „Daten löschen“, **Löschen**: Die Datei verschwindet beim
  Einlesen (nach Rückfrage) aus dem Sync-Ordner und damit aus OneDrive für die ganze Band, und von diesem Gerät.
- **Vorschau:** unter jedem Backup steht, was sich ändert („2 neu, 1 geändert, 5 gleich“, aufklappbar; bei
  Setlists „3 Songs anders“). „Aus Datei wiederherstellen“ fragt mit derselben Vorschau nach.
- **Titel und Interpret** jeder Noten-Datei werden vor dem Einlesen erkannt und angezeigt – aus dem Dateinamen (in
  beliebiger Reihenfolge, z. B. `Iris - Goo Goo Dolls - Bass.pdf`, `Goo Goo Dolls - Iris.pdf`,
  `Giesinger, Max - 80 Millionen (Keys).pdf`), dem Ordner (`Goo Goo Dolls/Iris/Bass.pdf`), bei .pro aus
  `{title}`/`{artist}`, bei PDFs aus den Dokument-Eigenschaften bzw. dem Kopf der ersten Seite, zuletzt mit Toleranz
  für Tippfehler („Robbie Wiliams“). Was übrig bleibt, ist die Fassung (z. B. „Bass“). Unklares (zwei Songs gleichen
  Namens) oder nicht Erkanntes ist orange markiert: Song aus der Liste wählen, Fassung bei Bedarf ändern – eingelesen
  wird genau so, wie es in der Liste steht. Von Hand gewählte Zuordnungen merkt sich das Gerät je Dateiname – beim
  nächsten Mal steht dort „wie beim letzten Mal“.

## Backstage nur für die Band (Sichtsperre)

Das Backstage öffnet sich nur für Microsoft-Konten, die den **Band-Ordner** in OneDrive sehen dürfen – also für alle,
mit denen der Ordner geteilt ist. Wer dazugehört, steuert allein die **OneDrive-Freigabe** (neues Mitglied: Ordner
freigeben; jemand geht: Freigabe entfernen). Im Code stehen keine E-Mail-Adressen, nur die Kennung des Ordners.

- **Einrichten (einmal, Besitzer des Ordners):** Backstage → Einstellungen → **Band-Ordner** → „Diesen Sync-Ordner als
  Band-Ordner festlegen“. Die angezeigte Zeile `bandOrdner: { drive: '…', item: '…' },` in
  `src/app/data/onedrive-config.ts` eintragen (statt `bandOrdner: null`). Ohne Eintrag gibt es keine Sperre.
- **Neues Gerät:** Jede Backstage-Seite führt zuerst zu **Nur für die Band → Mit Microsoft anmelden**. Darf das Konto
  den Ordner sehen, geht es weiter zur gewünschten Seite; sonst „Kein Zugang“ (mit „Mit anderem Konto anmelden“).
- **Offline:** Ein Gerät, das einmal drin war, bleibt offen – auch ohne Netz (Bühnen-Modus). Nach 30 Tagen prüft es mit
  Netz im Hintergrund neu; nur wenn OneDrive klar „nicht freigegeben“ sagt, geht es wieder zur Anmeldeseite.
- **Was die Sperre ist:** eine Sichtsperre für die Oberfläche. Der Code der Website ist öffentlich, wer ihn gezielt
  umgeht, sieht trotzdem nur eine leere Oberfläche – die Daten liegen nur auf euren Geräten und im freigegebenen
  OneDrive-Ordner. Eine echte Sperre der Adresse bräuchte einen vorgeschalteten Dienst (z. B. Cloudflare Access).
- Tests, Barrierefreiheits-Check und Screenshots verhalten sich wie ein freigeschaltetes Gerät
  (`scripts/lib/zugang-test.mjs`).

## OneDrive einrichten (für die Synchronisation)

Die Synchronisation (siehe oben) ist für ein **privates Microsoft-Konto** gedacht (Outlook.com, Hotmail, Live – privates
OneDrive). Ist der Browser schon bei Microsoft angemeldet (z. B. onedrive.live.com oder Outlook im Browser offen, Edge
mit Microsoft-Konto), verbindet es sich ohne Passwort (Single Sign-On); sonst einmal im Popup anmelden. Danach bleibt
das Gerät verbunden. Blockiert der Browser Drittanbieter-Cookies (Safari, Firefox), klappt das stille Anmelden nicht –
dann eben das Popup.

Einmalig nötig ist eine **App-Registrierung** bei Microsoft (kostenlos):

1. [entra.microsoft.com](https://entra.microsoft.com) → **App-Registrierungen** → **Neue Registrierung**
   (mit privatem Microsoft-Konto braucht es dafür ein kostenloses Azure-Konto).
2. Name: „Blickfeld Nord Backstage“. Unterstützte Kontotypen: **Nur persönliche Microsoft-Konten**.
3. Umleitungs-URI: Plattform **Single-Page-Anwendung (SPA)**, Adresse `https://blickfeld-nord.de/auth/`.
4. Unter **API-Berechtigungen** → Microsoft Graph → Delegiert: `Files.ReadWrite.All` hinzufügen (`User.Read` ist schon
   da). „.All“ ist nötig, damit auch **geteilte Ordner** gehen. Beim ersten Verbinden fragt Microsoft einmal, ob die App
   auf OneDrive zugreifen darf.
5. Die **Anwendungs-ID (Client-ID)** steht für alle Geräte in `src/app/data/onedrive-config.ts` bei `clientId`
   (erledigt). Sie ist kein Geheimnis. (`tenant: 'consumers'` = private Konten; für Firmenkonten wäre es `common`.)

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

**Vorschau:** Backstage → Zahlen → „Vorschau Jahresrückblick“ (`/backstage/jahr/<Jahr>`) zeigt die Seite schon vorher
so, als wären alle Auftritte des Jahres gespielt – Zahlen, Stationen und fehlende Highlights (Rückblick-Einträge in
`history`) vor dem 15.12. prüfen.

## Stimmen von Veranstaltern

Freigegebene Zitate in `src/app/data/stimmen.ts` eintragen (Wortlaut, wer, optional Anlass). Sobald dort ein Eintrag
steht, erscheint im Booking und im Pressekit der Bereich „Das sagen Veranstalter“ – vorher ist er unsichtbar. Nur echte
Zitate mit Freigabe; bei privaten Feiern ohne Namen der Gastgeber.

## Woher Besucher kommen (QR-Codes)

Die QR-Codes auf Plakat, Story und QR-Karte hängen einen Herkunftsvermerk an die Adresse, z. B.
`https://blickfeld-nord.de/konzerte/2026-12-04/?ref=plakat`. GoatCounter zeigt den Wert im Dashboard unter
„Referrers“; im Backstage unter **Besucher** steht der **Verlauf** (Aufrufe je Tag, Woche, Monat oder Jahr – Standard
Monat – mit den Auftritten ● und Werbemaßnahmen aus dem Werbeplan ◆ auf der Zeitlinie; Balken antippen zeigt Zahl und
Ereignisse, „Als Tabelle“ alles in Zahlen; **Wirkung berechnen** vergleicht je Werbemaßnahme der letzten 12 Monate die
Aufrufe der 3 Tage danach mit den 3 Tagen davor und nennt, was im Schnitt am meisten bringt) und „Gekommen über“ (Plakat, Story, QR-Karte, Banner). Der Vermerk
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
- **Instagram-Formate** (Seite eines kommenden, öffentlichen Auftritts → Kachel „Instagram“): jedes Format mit eigenen
  Maßen und eigenem Umgang mit Text und Link – darunter Maße, was in die Zwischenablage kommt und ein Tipp.
  - **Beitrag (Feed):** Plakat 1080 × 1350 (4:5, im Profil-Raster 3:4 angeschnitten), Bildunterschrift mit Hashtags
    und Link (im Beitrag nicht klickbar → „Link in Bio“). Bleibt im Profil – 3–4 Wochen vorher.
  - **Story:** eigenes Layout 1080 × 1920 mit großer Schrift und Countdown-Kopf („IN 2 WOCHEN“, „NOCH 7 TAGE“, „MORGEN“,
    „HEUTE“), oben ~220 px und unten ~340 px frei (dort liegen Instagrams Bedienelemente), darüber eine freie Fläche für
    den **Link-Sticker** – in der Zwischenablage liegt nur der Link. Kein QR-Code (eine Story sieht man am Handy).
    Tipp: Instagrams Countdown-Sticker aufs Datum setzen.
  - **Reel:** 8-Sekunden-Video (720 × 1280, MP4/H.264, ohne Ton – Musik in Instagram dazu): Logo-Motiv zoomt, die Zeilen
    blenden nacheinander ein, am Ende „Link in Bio“. Wird auf Wunsch in Echtzeit aufgenommen (Seite offen lassen), dann
    „Jetzt teilen“. Braucht Chrome oder Safari, die H.264 aufnehmen (sonst ein Hinweis).
  - **Highlight-Cover:** Kompass mit Beschriftung (LIVE, TERMINE, BACKSTAGE, Jahr oder ohne Text) mittig – Instagram zeigt
    nur den runden Ausschnitt. Einmalig fürs Profil.
  Die Bilder werden beim Öffnen der Seite im Hintergrund vorbereitet, damit das Teilen-Menü direkt beim Tippen aufgeht
  (der Browser erlaubt Teilen nur unmittelbar nach einem Tipp). Ist eins noch nicht fertig, ein zweites Mal tippen
  („Jetzt teilen“). Am Rechner wird gespeichert statt geteilt. Direkt posten kann die Website nicht (Instagram erlaubt das
  nur einer geprüften App mit geheimem Schlüssel auf einem Server).
- **Werbeplan → Story teilen:** Schritte mit Bild haben neben „Text kopieren“ einen zweiten Knopf: 🖼 Beitrag (Plakat mit
  Bildunterschrift) bzw. 📱 Story mit Countdown, am Tag danach die Danke-Story – Link für den Link-Sticker in der
  Zwischenablage, Teilen-Menü, Schritt abgehakt. Gleicher Vorrat wie oben (zweiter Tipp, falls noch nicht fertig).
  Jede Story hat ihre eigene Herkunft (`story-1`, `story-woche`, `story-morgen`, `story-heute`, `story-danke`; Kachel
  „Instagram“: `story`, Reel: `reel`, geteiltes Pressekit: `presse-geteilt`).
- **Kampagne (Kachel auf der Seite des Auftritts):** oben Summen mit Einzelzahlen – Aufrufe der Konzertseite und des
  Pressekits je Sprache (DE/EN/NL) und „über die Werbung insgesamt“; darunter je Weg die Summe und, wo es mehrere gibt,
  die Einzelzahlen: Plakat (QR-Code), Stories (Kachel, 2 Wochen, 1 Woche, Tag davor, Auftrittstag, Danke), Reel,
  Beitragstext, geteilte Links (Konzertseite, Pressekit). Unter Besucher → Kampagnen der Konzerte stehen dieselben
  Gruppen als Spalten (Stories zusammengezählt).
- **Banner mit QR-Code** (Pressekit): führt auf `https://blickfeld-nord.de/?ref=banner`. Für weitere eigene
  Druckstücke einen der erlaubten Vermerke verwenden oder die Liste ergänzen.

## Was die automatischen Prüfungen abfangen

Bevor etwas online geht, prüft GitHub unter anderem:

- **Schreibfehler im Code**, z. B. ein fehlendes Komma oder eine fehlende Klammer. Dann schlägt der Schritt „Build“ fehl.
- **Daten:** gültige Daten und Uhrzeiten, „bis“ nicht vor „von“, private Namen nie öffentlich,
  jedes Foto mit Beschreibung (Schritt „Tests“)
- **Fotos:** Eingetragenes Bild fehlt im Ordner oder enthält einen GPS-Standort (Schritt „Fotos vorbereiten“).
- **Links**, **Barrierefreiheit** und **Klicktests** der wichtigsten Seiten; dazu der **Breiten-Check** (360, 768, 1366,
  1440 px): keine Seite breiter als das Fenster, keine abgeschnittene Kopfleiste, keine Tabellen oder Listen, die innen
  seitlich scrollen (gewollte Karussells tragen `data-quer-ok`)
- **Aussehen:** Die wichtigsten Seiten werden fotografiert und mit Referenzbildern verglichen (Schritt
  „Screenshot-Vergleich“). Neue Auftritte, Fotos oder Rückblicke stören dabei nicht. Schlägt der Schritt fehl, sieht
  eine Seite anders aus als vorher. Die Unterschiede stehen rot markiert im Lauf unter **Artifacts →
  screenshot-vergleich**. War die Änderung gewollt, z. B. ein neuer Text auf der Technik-Seite: unter Actions
  **„Screenshots aktualisieren“** starten (*Run workflow*). Der Workflow wartet auf den Deploy des Stands davor: War er
  grün, ist die Seite schon aktuell und es gibt keinen zweiten Deploy; kam er nicht durch (Screenshot-Vergleich oder
  GitHub Pages hängt), startet er einen neuen Deploy mit den neuen Referenzbildern. Wurde er nur abgebrochen, weil ein
  neuerer Push schon deployt (der den Stand enthält), gibt es ebenfalls keinen zweiten Deploy.

**Auf dem eigenen Rechner prüfen** (für Entwickler): `npm run pruefen` baut die Seite genau wie GitHub (inklusive
Fehlerseite und Backstage-Weiterleitung) und führt Klicktests, Barrierefreiheit, Breiten-Check, Linkcheck und Tests aus.
Die Klicktests laufen parallel in 3 Browser-Tabs (`PARALLEL=n` ändert das, `PARALLEL=1` = nacheinander); Tests mit
`{ allein: true }` – zeitkritisch (Tap-Tempo) oder mit Zwischenablage, die sich alle Tabs teilen – laufen danach einzeln.
Nur einzelne Klicktests (nach dem Build): `NUR="Sammlungen|Karteikasten" node scripts/e2e.mjs` – Teile der Testnamen,
mehrere mit `|`.

**Tote Links:** Einmal pro Woche (montags) prüft GitHub alle externen Links, etwa zu Freunden, Instagram oder Spotify.
Ist einer nicht mehr erreichbar, erscheint unter **Issues** „Tote Links auf der Website“ mit der Liste. Das Issue
schließt sich von selbst, sobald alle Links wieder gehen.

**Live-Seite:** Einmal pro Woche (mittwochs) ruft GitHub die echte Seite blickfeld-nord.de auf: alle Seiten der
Sitemap, PDFs, Kalender, Bilder, Service Worker, die 404-Seite – und ob der tägliche Deploy noch läuft (letzte
Änderung höchstens 3 Tage alt). Probleme erscheinen unter **Issues** als „Probleme auf der Live-Seite“; das Issue
schließt sich von selbst, sobald alles wieder geht. Von Hand: Actions → **Live-Check** → *Run workflow*.

Nicht weiterkommen? Einfach Fred fragen. Über **History** (Uhr-Symbol oben in der Datei) seht ihr jede frühere
Fassung und könnt den alten Text von dort zurückkopieren.

## App-Icon und Favicons

Alle Icons erzeugt `python3 scripts/favicons.py` (pillow) aus der Kompass-Grafik der Band – dem hellen
Kompass-Logo des Pressekits (`scripts/presse-quellen/kompass-logo-hell.png`, aus `scripts/kompass-logo.py`): App-Icons (`icon-192.png`,
`icon-512.png`, `apple-touch-icon.png`) zeigen die Grafik auf dunklem Grund, das maskierbare (`icon-maskable-512.png`)
mit dem Kompass ganz in der sicheren Zone (Android schneidet rund oder eckig zu). Favicons (`favicon.svg` als Vektor,
`favicon.ico`, 16/32 px) und das Statusleisten-Symbol `badge-96.png` sind dieselben Formen vereinfacht (Ring,
Nord-Süd-Nadel, „K“, Nabe) – die feinen Gradstriche wären dort nur Brei. Dasselbe Skript schreibt das
Kompass-Symbol fürs Pressekit (`scripts/presse-quellen/kompass-2048.png`, `kompass-detail.svg`: Grafik auf dunklem
Quadrat mit runden Ecken); danach `python3 scripts/build-pressekit.py`. Neue Grafik: Logo ersetzen (bzw.
`kompass-logo.py` anpassen), beide Skripte ausführen, committen. Eine installierte App übernimmt ein neues Icon erst, wenn Android sie aktualisiert (nach dem
Öffnen, meist innerhalb von ein bis zwei Tagen).
