// Bereiche des Backstage – Navigation in der Kopfleiste (app.html): alle Seiten auf einer Ebene, jede mit eigenem
// Symbol. Am Computer als Symbol-Knöpfe (Name beim Darüberfahren), im Handy-Menü mit Symbol und Namen; `gruppe`
// beginnt einen neuen Abschnitt (Trennlinie im Menü, Abstand in der Leiste). Bewusst ohne Komponente, damit die
// Kopfleiste auf jeder Seite nur diese Liste lädt.
export interface BackstageBereich {
  path: string;
  label: string;
  icon: string;
  /** für die Suche: was dort steht */
  text: string;
  /** beginnt einen neuen Abschnitt */
  gruppe?: true;
}

export const BACKSTAGE_BEREICHE: BackstageBereich[] = [
  { path: '/backstage', label: 'Übersicht', icon: 'dashboard', text: 'Üben und die nächsten Termine' },
  { path: '/backstage/songs', label: 'Songs', icon: 'library_music', text: 'Tonart, Tempo, Notiz und Noten je Song', gruppe: true },
  { path: '/backstage/songs/setlists', label: 'Setlists', icon: 'queue_music', text: 'Die Setlists aller Auftritte' },
  { path: '/backstage/songs/sammlungen', label: 'Sammlungen', icon: 'bookmarks', text: 'Feste Songfolgen für die Setlist' },
  { path: '/backstage/termine', label: 'Termine', icon: 'event', text: 'Auftritte und Proben mit Status und Notizen', gruppe: true },
  { path: '/backstage/termine/saison', label: 'Saison', icon: 'calendar_month', text: 'Die nächsten 12 Monate auf einen Blick' },
  { path: '/backstage/termine/kontakte', label: 'Kontakte', icon: 'contacts', text: 'Ansprechpartner der Veranstalter' },
  { path: '/backstage/aufgaben', label: 'Aufgaben', icon: 'checklist', text: 'Was noch zu tun ist – Checkliste', gruppe: true },
  { path: '/backstage/buehnenplan', label: 'Technik', icon: 'grid_view', text: 'Bühnenplan: Geräte verschieben und für GitHub übernehmen' },
  { path: '/backstage/material', label: 'Material', icon: 'print', text: 'Schilder, Karten, Rider und Pressekit zum Drucken und Verschicken' },
  { path: '/backstage/uebersetzungen', label: 'Sprachen', icon: 'translate', text: 'Stand der englischen und niederländischen Texte, gegenlesen' },
  { path: '/backstage/zahlen', label: 'Bandjahr', icon: 'insights', text: 'Das Jahr in Zahlen, Vorschau Jahresrückblick', gruppe: true },
  { path: '/backstage/zahlen/reife', label: 'Bühnenreife', icon: 'military_tech', text: 'Übe-Status je Musiker, Bühnenreife je Song, Üben je Woche' },
  { path: '/backstage/zahlen/besucher', label: 'Besucher', icon: 'travel_explore', text: 'Besucher der Website und woher sie kommen' },
  { path: '/backstage/zahlen/songs', label: 'Songs und Sterne', icon: 'star', text: 'Setlist-Statistik und Sterne-Rangliste' },
  { path: '/backstage/abgleich', label: 'Abgleich', icon: 'sync', text: 'OneDrive, Daten und Noten auf diesem Gerät', gruppe: true },
  { path: '/backstage/einstellungen', label: 'Einstellungen', icon: 'settings', text: 'Ich bin, Synchronisation, Backup, Bühnen-Modus, Spotify' },
];
