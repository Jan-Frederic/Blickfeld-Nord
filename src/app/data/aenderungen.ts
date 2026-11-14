// Change-Log fürs Backstage (Einstellungen → „Was ist neu“, pages/aenderungen-karte.ts): je Tag, was sich für die
// Band geändert hat – in Alltagssprache, ohne Technik. Neueste zuerst. Bei jeder spürbaren Änderung hier einen Punkt
// ergänzen (am Tag der Veröffentlichung); Kleinkram und Interna (Tests, Prüfungen) gehören nicht hierher.
export interface Aenderung {
  /** JJJJ-MM-TT */
  datum: string;
  punkte: string[];
}

export const AENDERUNGEN: Aenderung[] = [
  {
    datum: '2026-11-14',
    punkte: [
      'Neue Übersicht: drei Karten – Üben, nächste Probe, nächster Auftritt – mit Fortschritt, Bühnenreife und was noch fehlt. Kurz antippen startet den Modus, gedrückt halten öffnet die Seite zum Bearbeiten.',
      'Das Profil gleitet von links herein, ein Tipp daneben schiebt es wieder weg.',
      'Logo im Backstage: BLICKFELD, darunter NORD-BACKSTAGE – führt zur Übersicht.',
      'Menü auf einer Ebene: Setlists, Sammlungen, Saison, Kontakte, Bühnenreife, Besucher und Songs und Sterne sind eigene Punkte mit eigenem Symbol; am Computer stehen die Symbole in der Leiste.',
      'Neue Leiste oben: links deine Initialen (Profil), rechts Lupe (Suche über alles, auf jeder Seite) und Glocke mit der Zahl der Benachrichtigungen.',
      '„Heute fällig“ heißt jetzt Benachrichtigungen und hat eine eigene Seite – die Übersicht zeigt nur noch Üben und die nächsten Termine.',
      'Die Leiste gleitet beim Herunterscrollen weg und kommt beim Zurückscrollen wieder.',
      'Die installierte App startet bei Bandmitgliedern direkt im Backstage.',
      'Die Reiter unter Songs sind weg – Setlists und Sammlungen haben eigene Menüpunkte.',
      'Die Notenblätter auf diesem Gerät stehen jetzt unter Abgleich, die Bühnenreife hat eine eigene Seite.',
      'Jede Seite beginnt mit Titel und kurzem Text, darunter in Grau „Anleitung: …“; die Anleitung zu den Modi steht unter „Alle Anleitungen“.',
    ],
  },
  {
    datum: '2026-11-13',
    punkte: [
      'Übe-, Probe- und Bühnen-Modus starten immer in der Titelanzeige – die Noten holt man per Knopf oder Hochwischen.',
      'Ist die Song-Liste in einem Modus offen, schließt ein Tipp daneben sie – statt umzublättern.',
      'Neu in den Einstellungen: „Was ist neu“ – dieser Change-Log.',
      'Tempo startet in allen Modi bei 100 %.',
      'Aus der Notenansicht zur Titelanzeige und zurück: es geht auf derselben Seite weiter.',
      'Sprungmarken: unter „Marken bearbeiten“ lässt sich der Typ einer Marke ändern (z. B. Refrain → Outro).',
      'Jede Seite des Backstage hat oben „Anleitung: …“ – ausführliche Anleitungen, die Seiten selbst sind kürzer.',
      'Kein versehentliches Zoomen mehr im Backstage; Eingabefelder zoomen auf dem iPhone nicht mehr heran.',
      'Die Übe-Erinnerung nennt ein paar fällige Songs beim Namen.',
      'Einrichtungsassistent bei der ersten Anmeldung auf einem Gerät: Ich bin, Gerätename, Synchronisation, Spotify.',
      'Microsoft-Anmeldung robuster, besonders auf dem iPhone; klappt das Fenster nicht, geht es von selbst ohne Pop-up weiter.',
      'Hinweis „OneDrive: Anmeldung nötig“ mit „Neu anmelden“, wenn der automatische Abgleich ruht.',
      'Abgleich: Übe-Daten von zwei Geräten werden zusammengeführt statt Konfliktkopien; kurze Netz-Aussetzer sind kein Fehler mehr.',
      'Geräteliste mit App-Stand („veraltet“ in Orange), räumt sich selbst auf.',
      '„Daten auf diesem Gerät“: Speicherplatz, Sync-Kopie, Spotify, App-Stand, Backup und „Diagnose kopieren“.',
    ],
  },
  {
    datum: '2026-11-12',
    punkte: [
      'Spotify „Im Browser abspielen“: die App spielt selbst, mit Fortschritt zum Springen; Steuerung über den Noten abdockbar.',
      'Sprungmarken für die Band (▶ beginnt am Einsatz), Schleife A–B und „Übergänge proben“ (in den Einstellungen).',
      'Einrichtungs-Checkliste für Spotify und Anleitung zum Teilen.',
      'Übe-Modus: ein Status-Tipp bleibt auf der Karte; die Kartenliste behält je Besuch ihre Reihenfolge.',
      'Pfeiltasten hoch/runter wie Wischen; Fortschrittsbalken standardmäßig nur Anzeige.',
      'Neues App-Symbol; die installierte App läuft im Vollbild; Herunterwischen lädt die Seite nie neu.',
      'Üben je Woche als Grafik unter Zahlen.',
    ],
  },
  {
    datum: '2026-11-11',
    punkte: [
      'Spotify fernsteuern: ganze Songs über die Spotify-App, immer der angezeigte Song.',
      'Übe- und Probe-Modus bleiben offen, wenn das Handy „Zurück“ wischt oder die Seite neu lädt.',
      'Alte Backups löschen – die neuesten bleiben.',
    ],
  },
  {
    datum: '2026-11-10',
    punkte: [
      '„Ich bin …“ wird automatisch aus dem Microsoft-Konto erkannt.',
      'Generalprobe: was noch wackelt, kommt vorher einzeln dran.',
      'Übe-Modus: Rückgängig, Übe-Erinnerung, „Dein Weg“ im Song-Dialog; Status leuchtet kurz auf.',
      'Menü neu sortiert: Bühnenplan heißt jetzt Technik, Übersetzungen heißen Sprachen.',
    ],
  },
  {
    datum: '2026-11-09',
    punkte: [
      'Probe füllen, Ergebnis an die Band, Bühnenreife in der Setlist und bei „Bereit?“.',
      'Ein Status-Umschalter überall, Wischen zwischen Titelanzeige und Noten.',
      'Probenseite: Hinzufügen über der Liste, ganze Listen per Suche, Liste leeren.',
      'Anleitung zu Übe-, Probe- und Bühnen-Modus.',
    ],
  },
  {
    datum: '2026-11-08',
    punkte: [
      'Fünf Übe-Status mit Karteikasten statt „sitzt/wackelt“; Übe-Modus mit Karteikarten.',
      'Sammlungen als eigene Seiten; Besucher-Verlauf unter Zahlen; Zurück führt zur vorigen Seite.',
    ],
  },
];

export const GESEHEN_KEY = 'bn-aenderungen-gesehen';
