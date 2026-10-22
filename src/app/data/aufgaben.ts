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
    id: 'mischpult-modell',
    bereich: 'Technik',
    text: 'Modell des Mischpults bestätigen: PreSonus StudioLive 16.4.2 oder 16.4.2AI?',
    art: 'muss',
    hinweis: 'Steht auf der Rückseite des Pults; danach in src/app/data/technik.json unter „mischpult“ eintragen.',
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
    id: 'foto-credits',
    bereich: 'Inhalte',
    text: 'Fotografen der Galerie-Fotos nennen, sofern sie genannt werden möchten',
    art: 'kann',
    hinweis: 'Feld „credit“ bei den Fotos in src/app/data/band.service.ts.',
    link: '/galerie',
  },
];
