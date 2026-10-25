// Checkliste für die Website (Backstage → Aufgaben): Was noch erledigt werden muss oder kann.
//
// Hier stehen nur Aufgaben, die sich nicht aus den Daten ablesen lassen. Offene Termine, fehlende Bios,
// offene Technik-Angaben und ungeprüfte Übersetzungen erkennt die Seite selbst und hakt sie ab, sobald sie
// erledigt sind.
//
// Neue Aufgabe: Zeile kopieren und anpassen. Erledigt: `erledigt: true` ergänzen (bleibt durchgestrichen sichtbar)
// oder die Zeile löschen. Das Repo ist öffentlich – keine Gagen, Adressen oder Telefonnummern eintragen.
export interface Aufgabe {
  /** eindeutige Kennung, damit das Abhaken auf dem Gerät erhalten bleibt (klein, ohne Leerzeichen) */
  id: string;
  bereich: 'Inhalte' | 'Technik' | 'Rechtliches' | 'Website';
  text: string;
  /** muss = sollte erledigt werden, kann = Idee / schön zu haben */
  art: 'muss' | 'kann';
  /** optional: Hinweis, wo oder wie */
  hinweis?: string;
  /** optional: Link innerhalb der Website, z. B. '/backstage/termine' */
  link?: string;
  erledigt?: boolean;
}

export const AUFGABEN: Aufgabe[] = [
  {
    id: 'verfuegbarkeit',
    bereich: 'Website',
    text: 'Verfügbarkeit der Band klären: An welchen Tagen kann jemand nicht spielen?',
    art: 'muss',
    hinweis: 'Der Verfügbarkeitskalender im Booking zeigt bisher nur eingetragene Auftritte. Sind die Tage geklärt, können sie dort als belegt erscheinen und der Hinweis „noch nicht vollständig gepflegt“ entfällt.',
    link: '/booking',
  },
  {
    id: 'mischpult-modell',
    bereich: 'Technik',
    text: 'Modell des Mischpults bestätigen: PreSonus StudioLive 16.4.2 oder 16.4.2AI?',
    art: 'muss',
    hinweis: 'Steht auf der Rückseite des Pults; danach in src/app/data/technik.json unter „mischpult“ eintragen.',
  },
  {
    id: 'kanalliste',
    bereich: 'Technik',
    text: 'Kanalliste klären: Stimmen Kanäle, Quellen, Mikrofone, Stative und Phantomspeisung?',
    art: 'muss',
    hinweis: 'Die Liste ist noch ein Entwurf. Sie steht in src/app/data/technik.json unter „kanaele“ und erscheint auf der Technik-Seite, im Technik-Rider und in den Setups der Musiker.',
    link: '/technik',
  },
  {
    id: 'monitormischungen',
    bereich: 'Technik',
    text: 'Monitormischungen klären: Was hört jeder auf seinem Monitor?',
    art: 'muss',
    hinweis: 'Für alle drei steht ein Vorschlag drin – bitte bei der nächsten Probe ausprobieren und anpassen. Eintragen in src/app/data/technik.json unter „monitore“ (Kanal und Pegel laut/mittel/leise); bestätigt ist eine Mischung, wenn „vorschlag“ entfällt.',
    link: '/technik',
  },
  {
    id: 'strom-watt',
    bereich: 'Technik',
    text: 'Strombedarf in Watt je Steckdose ergänzen',
    art: 'kann',
    hinweis: 'Angaben von den Typenschildern der Geräte – hilft Veranstaltern bei der Planung.',
  },
  {
    id: 'wirtschafts-id',
    bereich: 'Rechtliches',
    text: 'Format der Wirtschafts-Identifikationsnummer im Impressum klären',
    art: 'muss',
    link: '/impressum',
  },
  {
    id: 'rechtstexte-uebersetzung',
    bereich: 'Rechtliches',
    text: 'Englische und niederländische Fassung von Impressum und Datenschutz prüfen lassen',
    art: 'kann',
    hinweis: 'Verbindlich bleibt die deutsche Fassung.',
  },
  {
    id: 'pdf-texte',
    bereich: 'Inhalte',
    text: 'Texte von Pressekit, Technik-Rider und QR-Karte gegenlesen (DE/EN/NL)',
    art: 'muss',
    hinweis: 'Alle PDF-Texte stehen in scripts/pdf_texte.py.',
    link: '/backstage/material',
  },
  {
    id: 'dr-beat',
    bereich: 'Inhalte',
    text: 'Beschreibung von DJ Dr. Beat auf der Freunde-Seite mit ihm abstimmen',
    art: 'muss',
    link: '/freunde',
  },
  {
    id: 'monitor-kanal9',
    bereich: 'Technik',
    text: 'Kanal 9 (Davids Multi-Effekt) in den Monitormischungen festlegen',
    art: 'muss',
    hinweis: 'Wie laut in Monitor 1 (David), 2 (Fred) und 3 (Matthias)? Bisher überall „–“; Eintrag in src/app/data/technik.json unter „monitore“.',
    link: '/technik',
  },
  {
    id: 'hoerprobe',
    bereich: 'Inhalte',
    text: 'Hörprobe: kurzen Live-Mitschnitt (1–2 Minuten) für Startseite und Pressekit aufnehmen',
    art: 'kann',
    hinweis: 'Veranstalter fragen fast immer danach. Nur mit Einverständnis aller, die zu hören oder zu sehen sind; Rechte am Song beachten.',
    link: '/presse',
  },
  {
    id: 'galerie-david',
    bereich: 'Inhalte',
    text: 'Entscheiden, ob Davids neues Bühnenfoto auch in die Galerie soll',
    art: 'kann',
    hinweis: 'Das Foto ist seit Oktober 2026 Davids Bio-Foto; in der Galerie steht noch das bisherige Porträt.',
    link: '/galerie',
    erledigt: true,
  },
  {
    id: 'stimmen-veranstalter',
    bereich: 'Inhalte',
    text: 'Stimmen von Veranstaltern für das Booking sammeln (2–3 kurze Zitate)',
    art: 'kann',
    hinweis: 'Zum Beispiel bei Café Lotti oder Gasthof Küpper nachfragen – mit Freigabe für die Website und Angabe, wie der Name erscheinen darf (z. B. „Café Lotti, Dingden“). Nur echte, freigegebene Zitate; bei privaten Feiern ohne Namen. Eintragen in src/app/data/stimmen.ts – dann erscheinen sie automatisch im Booking und im Pressekit.',
    link: '/booking',
  },
  {
    id: 'fan-kanal',
    bereich: 'Inhalte',
    text: 'Klären, ob es einen „Nichts verpassen“-Kanal für Fans geben soll (z. B. WhatsApp-Kanal)',
    art: 'kann',
    hinweis: 'Wenn ja: Link durchgeben – dann kommt der Kanal in die Fußzeile (neben Instagram, Facebook und Mail) und als „Erinnerung bekommen“ auf die Konzertseiten.',
  },
];
