// Bereiche des Backstage – Navigation in der Kopfleiste (app.html): oben die Bereiche, bei Songs, Termine und Zahlen
// mit Untermenü (am Computer aufklappbar, im Handy-Menü eingerückt darunter). Der erste Unterpunkt ist die Seite des
// Bereichs selbst. Bewusst ohne Komponente, damit die Kopfleiste auf jeder Seite nur diese Liste lädt.
export interface BackstageUnterpunkt {
  path: string;
  label: string;
  icon: string;
}
export interface BackstageBereich extends BackstageUnterpunkt {
  text: string;
  unter?: BackstageUnterpunkt[];
}

export const BACKSTAGE_BEREICHE: BackstageBereich[] = [
  { path: '/backstage', label: 'Übersicht', icon: 'dashboard', text: 'Suche, heute Fälliges und die nächsten Termine' },
  {
    path: '/backstage/songs',
    label: 'Songs',
    icon: 'library_music',
    text: 'Tonart, Tempo und Noten je Song, Setlists und Sammlungen',
    unter: [
      { path: '/backstage/songs', label: 'Liste', icon: 'library_music' },
      { path: '/backstage/songs/setlists', label: 'Setlists', icon: 'queue_music' },
      { path: '/backstage/songs/sammlungen', label: 'Sammlungen', icon: 'bookmarks' },
    ],
  },
  {
    path: '/backstage/termine',
    label: 'Termine',
    icon: 'event',
    text: 'Auftritte und Proben, Saison, Kontakte der Veranstalter',
    unter: [
      { path: '/backstage/termine', label: 'Alle Termine', icon: 'event' },
      { path: '/backstage/termine/saison', label: 'Saison', icon: 'calendar_month' },
      { path: '/backstage/termine/kontakte', label: 'Kontakte', icon: 'contacts' },
    ],
  },
  { path: '/backstage/aufgaben', label: 'Aufgaben', icon: 'checklist', text: 'Was noch zu tun ist – Checkliste' },
  { path: '/backstage/buehnenplan', label: 'Technik', icon: 'grid_view', text: 'Bühnenplan: Geräte verschieben und für GitHub übernehmen' },
  { path: '/backstage/material', label: 'Material', icon: 'print', text: 'Schilder, Karten, Rider und Pressekit zum Drucken und Verschicken' },
  { path: '/backstage/uebersetzungen', label: 'Sprachen', icon: 'translate', text: 'Stand der englischen und niederländischen Texte, gegenlesen' },
  {
    path: '/backstage/zahlen',
    label: 'Zahlen',
    icon: 'insights',
    text: 'Bandjahr, Üben und Bühnenreife, Besucher, Songs und Sterne',
    unter: [
      { path: '/backstage/zahlen', label: 'Bandjahr', icon: 'insights' },
      { path: '/backstage/zahlen/reife', label: 'Üben und Bühnenreife', icon: 'military_tech' },
      { path: '/backstage/zahlen/besucher', label: 'Besucher', icon: 'travel_explore' },
      { path: '/backstage/zahlen/songs', label: 'Songs und Sterne', icon: 'star' },
    ],
  },
  { path: '/backstage/abgleich', label: 'Abgleich', icon: 'sync', text: 'OneDrive, Daten und Noten auf diesem Gerät' },
  { path: '/backstage/einstellungen', label: 'Einstellungen', icon: 'settings', text: 'Ich bin, Synchronisation, Backup, Bühnen-Modus, Spotify' },
];

/** gehört die Adresse zu diesem Bereich (für die Hervorhebung des Menüpunkts mit Untermenü)? */
export const imBereich = (b: BackstageBereich, pfad: string) =>
  b.path === '/backstage' ? pfad === '/backstage' : pfad === b.path || pfad.startsWith(b.path + '/');
