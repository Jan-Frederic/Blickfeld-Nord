// Tonart und Tempo der Songs – nur für die Band (Setlist, Bühnen-Modus, Laufzettel im Backstage).
// Das Repertoire selbst kommt automatisch von Spotify (repertoire.json); Tonart und Tempo liefert Spotify nicht,
// deshalb stehen sie hier. Titel und Interpret müssen genau wie im Repertoire geschrieben sein.
//
// Beispiel: { title: '80 Millionen', artist: 'Max Giesinger', tonart: 'C', spielTonart: 'D', capo: 2, bpm: 120 },
// tonart: Dur als Großbuchstabe (C, F#, Bb), Moll mit kleinem m (Am, C#m); bpm: Schläge pro Minute;
// tonart ist die Originalaufnahme, spielTonart/capo die Band-Version (nur eintragen, wenn sie abweicht)
export interface SongInfo {
  title: string;
  artist: string;
  /** Tonart der Originalaufnahme */
  tonart?: string;
  /** Tonart, in der die Band den Song spielt – nur wenn sie vom Original abweicht */
  spielTonart?: string;
  /** Capo-Bund der Gitarre in der Band-Version */
  capo?: number;
  bpm?: number;
  /** kurzer Hinweis für die Bühne, z. B. „Intro nur Gitarre“ */
  notiz?: string;
  /** woher Tonart und Tempo stammen (Recherche) – erscheint unter Backstage → Songs */
  quelle?: string;
}

// Recherchiert im Oktober 2026: Tonart und Tempo der Originalaufnahme (Notenausgaben, Karaoke-Tracks, Akkord-Seiten,
// Analyse-Datenbanken) – nur, wo die Quellen zusammenpassen; Unsicheres bleibt leer, die Quelle steht in „quelle“.
// Spielt die Band einen Song anders, unter Backstage → Songs „wir spielen in“, Capo bzw. Tempo eintragen.
export const SONGINFO: SongInfo[] = [
  { title: '1/2 Lovesong', artist: 'Die Ärzte', tonart: 'Em', quelle: 'Akkorde Ultimate Guitar (Em C G D, ohne Capo)' },
  { title: '80 Millionen', artist: 'Max Giesinger', tonart: 'C', quelle: 'Akkorde guitartabsexplorer (Originaltonart C)' },
  { title: 'All The Small Things', artist: 'blink-182', tonart: 'C', bpm: 148, quelle: 'AcousticBrainz C; Mixmeister/AcousticBrainz 148' },
  { title: 'Angels', artist: 'Robbie Williams', tonart: 'E', bpm: 76, quelle: 'Musicnotes 76; Analyse E' },
  { title: "Blowin' in the Wind", artist: 'Bob Dylan', tonart: 'D', bpm: 89, quelle: 'Karaoke-Version (Originaltonart D, 89); Dylan mit Capo 7' },
  { title: "Breakfast At Tiffany's", artist: 'Deep Blue Something', tonart: 'D', bpm: 110, quelle: 'Mixmeister D, 110,5' },
  { title: 'Chasing Cars', artist: 'Snow Patrol', tonart: 'A', bpm: 104, quelle: 'Tunebat/Chordu A, 104' },
  { title: 'Drive', artist: 'Incubus', tonart: 'Em', bpm: 90, quelle: 'Musicnotes Originaltonart Em, ~90; Audiokeychain 91' },
  { title: 'Father And Son', artist: 'Yusuf / Cat Stevens', tonart: 'G', quelle: 'Mixmeister G; Tempoangaben uneinig' },
  { title: 'Good Riddance (Time of Your Life)', artist: 'Green Day', tonart: 'G', bpm: 95, quelle: 'Karaoke-Version G, 95; Mixmeister 94,7' },
  { title: 'Hallelujah', artist: 'Leonard Cohen', tonart: 'C', quelle: 'Musicnotes Signature Artist C; Tempoangaben uneinig' },
  { title: 'Heaven - MTV Unplugged Version', artist: 'Bryan Adams', tonart: 'C', quelle: 'AcousticBrainz C (automatisch); Tempo unsicher' },
  { title: 'Hey Jude', artist: 'The Beatles', tonart: 'F', bpm: 74, quelle: 'Ukutabs Originaltonart F, ~74; Musicnotes 75' },
  { title: 'If Tomorrow Never Comes', artist: 'Ronan Keating', tonart: 'Bb', bpm: 79, quelle: 'Karaoke-Version Bb; Chordu 79' },
  { title: 'Iris', artist: 'The Goo Goo Dolls', tonart: 'D', bpm: 155, quelle: 'Musicnotes/Karaoke-Version Original D; 153–156' },
  { title: "Knockin' On Heaven's Door", artist: 'Bob Dylan', tonart: 'G', bpm: 70, quelle: 'Musicnotes G; Noten ~70 (Analysen 140 = doppelt gezählt)' },
  { title: 'Lady In Black', artist: 'Uriah Heep', bpm: 87, quelle: 'Audiokeychain 87, Chords-and-tabs 86; Tonart uneinig' },
  { title: 'Lemon Tree', artist: 'Fools Garden', tonart: 'Fm', bpm: 143, quelle: 'Musicnotes Fm, AppsNemo Em+Capo 1; 143–145' },
  { title: 'Let It Be - Remastered 2009', artist: 'The Beatles', tonart: 'C', bpm: 72, quelle: 'Musicnotes Originaltonart C, ~72' },
  { title: 'Perfect', artist: 'Ed Sheeran', tonart: 'Ab', bpm: 63, quelle: 'Musicnotes Ab, 12/8 mit punktierter Viertel = 63' },
  { title: 'Plötzlich perfekt', artist: 'Johannes Oerding', tonart: 'E', quelle: 'Akkorde Ultimate Guitar (Key E, ohne Capo)' },
  { title: 'Save Tonight', artist: 'Eagle-Eye Cherry', tonart: 'Am', bpm: 120, quelle: 'Musicnotes Am, 120' },
  { title: 'Seven Nation Army', artist: 'The White Stripes', tonart: 'Em', bpm: 124, quelle: 'Musicnotes Em; Aufnahme 123,5–124' },
  { title: 'Stand By Me', artist: 'Ben E. King', tonart: 'A', quelle: 'Mixmeister F#m (Parallele), Akkordfolge A F#m D E; Tempo uneinig' },
  { title: "Summer Of '69", artist: 'Bryan Adams', tonart: 'D', bpm: 139, quelle: 'Karaoke-Version Original D; 137–139' },
  { title: 'Take Me Home, Country Roads', artist: 'John Denver', tonart: 'A', quelle: 'Mixmeister F#m (Parallele); Tempo uneinig (82–96)' },
  { title: 'Wake Me up When September Ends', artist: 'Green Day', tonart: 'G', bpm: 105, quelle: 'Jamzone G, 105' },
  { title: 'Westerland', artist: 'Die Ärzte', tonart: 'G', quelle: 'Akkorde Ultimate Guitar (G D Em C)' },
  { title: "When I'm Dead and Gone", artist: 'Fury In The Slaughterhouse', bpm: 84, quelle: 'GetSongBPM 84' },
  { title: 'Wherever You Will Go', artist: 'The Calling', bpm: 112, quelle: 'Mixmeister/Chordu 112; Tonart unklar' },
  { title: 'Wonderful Life', artist: 'Katie Melua', bpm: 106, quelle: 'Hooktheory 106; Tonart uneinig (A / F#m)' },
  { title: 'Wonderwall', artist: 'Oasis', tonart: 'F#m', bpm: 87, quelle: 'Musicnotes Original F#m; 87–88' },
  { title: 'Zu spät', artist: 'Die Ärzte', tonart: 'G', quelle: 'Akkorde Ultimate Guitar (Key G, ohne Capo)' },
];

/** Entwurf aus Backstage → Songs auf diesem Gerät (noch nicht in songinfo.ts übernommen), Schlüssel „Titel|Interpret“ */
export const SONGINFO_ENTWURF_KEY = 'bn-songinfo-entwurf';

/** im Backstage änderbare Felder (die Quelle kommt nur aus der Recherche) */
export type SongWerte = Pick<SongInfo, 'tonart' | 'spielTonart' | 'capo' | 'bpm' | 'notiz'>;
export const SONG_FELDER = ['tonart', 'spielTonart', 'capo', 'bpm', 'notiz'] as const;

function entwurf(): Record<string, SongWerte> {
  try {
    return typeof localStorage === 'undefined' ? {} : JSON.parse(localStorage.getItem(SONGINFO_ENTWURF_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Tonart, Tempo und Notiz eines Songs – der Entwurf auf diesem Gerät hat Vorrang vor songinfo.ts, damit Einträge
 *  aus Backstage → Songs sofort in Setlist und Bühnen-Modus erscheinen */
export function songInfo(title: string, artist: string): SongInfo | undefined {
  const e = entwurf()[`${title}|${artist}`];
  const gespeichert = SONGINFO.find((s) => s.title === title && s.artist === artist);
  if (!e) return gespeichert;
  const s: SongInfo = { title, artist, ...e, ...(gespeichert?.quelle ? { quelle: gespeichert.quelle } : {}) };
  return SONG_FELDER.some((f) => s[f]) ? s : undefined;
}

/** Tonart, in der die Band den Song spielt – die eigene, sonst die des Originals */
export function gespielteTonart(s: SongInfo | undefined): string | undefined {
  return s?.spielTonart || s?.tonart;
}

/** z. B. „G · Capo 2 · 120 bpm · Intro nur Gitarre“ – leer, wenn nichts eingetragen ist */
export function songInfoText(title: string, artist: string): string {
  const s = songInfo(title, artist);
  return s ? [gespielteTonart(s), s.capo && `Capo ${s.capo}`, s.bpm && `${s.bpm} bpm`, s.notiz].filter(Boolean).join(' · ') : '';
}
