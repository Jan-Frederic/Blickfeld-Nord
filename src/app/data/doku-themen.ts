// Anleitungen im Backstage: je Unterseite ein Thema mit ausführlicher Anleitung unter /backstage/anleitung/<thema>
// (Inhalte: data/doku-inhalte.ts, Seite: pages/backstage-doku.ts). Hier nur Titel und Seite – klein genug für den
// Link oben auf jeder Unterseite (pages/doku-link.ts), ohne die langen Texte mitzuladen.
export const DOKU_THEMEN = {
  uebersicht: { titel: 'Übersicht', seite: '/backstage' },
  modi: { titel: 'Übe-, Probe- und Bühnen-Modus', seite: '/backstage' },
  benachrichtigungen: { titel: 'Benachrichtigungen', seite: '/backstage/benachrichtigungen' },
  profil: { titel: 'Profil', seite: '/backstage/profil' },
  termine: { titel: 'Termine', seite: '/backstage/termine' },
  saison: { titel: 'Saison', seite: '/backstage/termine/saison' },
  kontakte: { titel: 'Kontakte', seite: '/backstage/termine/kontakte' },
  auftritt: { titel: 'Auftritt', seite: '/backstage/termine' },
  setlist: { titel: 'Setlist', seite: '/backstage/songs/setlists' },
  probe: { titel: 'Probe', seite: '/backstage/termine' },
  songs: { titel: 'Songs', seite: '/backstage/songs' },
  setlists: { titel: 'Setlists', seite: '/backstage/songs/setlists' },
  sammlungen: { titel: 'Sammlungen', seite: '/backstage/songs/sammlungen' },
  noten: { titel: 'Noten', seite: '/backstage/abgleich' },
  ueben: { titel: 'Üben', seite: '/backstage/ueben' },
  aufgaben: { titel: 'Aufgaben', seite: '/backstage/aufgaben' },
  technik: { titel: 'Technik', seite: '/backstage/buehnenplan' },
  material: { titel: 'Material', seite: '/backstage/material' },
  sprachen: { titel: 'Sprachen', seite: '/backstage/uebersetzungen' },
  zahlen: { titel: 'Zahlen', seite: '/backstage/zahlen' },
  reife: { titel: 'Üben und Bühnenreife', seite: '/backstage/zahlen/reife' },
  besucher: { titel: 'Besucher', seite: '/backstage/zahlen/besucher' },
  sterne: { titel: 'Songs und Sterne', seite: '/backstage/zahlen/songs' },
  jahr: { titel: 'Jahresrückblick-Vorschau', seite: '/backstage/zahlen' },
  abgleich: { titel: 'Abgleich', seite: '/backstage/abgleich' },
  einstellungen: { titel: 'Einstellungen', seite: '/backstage/einstellungen' },
  einrichtung: { titel: 'Einrichtung', seite: '/backstage/einrichtung' },
} as const satisfies Record<string, { titel: string; seite: string }>;

export type DokuId = keyof typeof DOKU_THEMEN;
export const DOKU_IDS = Object.keys(DOKU_THEMEN) as DokuId[];
export const dokuPfad = (id: DokuId) => `/backstage/anleitung/${id}`;
export const istDokuId = (x: string | undefined): x is DokuId => !!x && x in DOKU_THEMEN;

/** Gruppen für die Übersicht aller Anleitungen – wie das Menü oben */
export const DOKU_GRUPPEN: { titel: string; themen: DokuId[] }[] = [
  { titel: 'Grundlagen', themen: ['uebersicht', 'benachrichtigungen', 'profil', 'modi', 'einrichtung'] },
  { titel: 'Termine', themen: ['termine', 'auftritt', 'setlist', 'probe', 'saison', 'kontakte'] },
  { titel: 'Songs', themen: ['songs', 'setlists', 'sammlungen', 'ueben'] },
  { titel: 'Rund um die Band', themen: ['aufgaben', 'technik', 'material', 'sprachen'] },
  { titel: 'Zahlen', themen: ['zahlen', 'jahr', 'reife', 'besucher', 'sterne'] },
  { titel: 'Gerät und Daten', themen: ['abgleich', 'noten', 'einstellungen'] },
];
