// Tonart und Tempo der Songs – nur für die Band (Setlist, Bühnen-Modus, Laufzettel im Backstage).
// Das Repertoire selbst kommt automatisch von Spotify (repertoire.json); Tonart und Tempo liefert Spotify nicht,
// deshalb stehen sie hier. Titel und Interpret müssen genau wie im Repertoire geschrieben sein.
//
// Beispiel: { title: '80 Millionen', artist: 'Max Giesinger', tonart: 'G', bpm: 120, notiz: 'Capo 2' },
// tonart: Dur als Großbuchstabe (C, F#, Bb), Moll mit kleinem m (Am, C#m); bpm: Schläge pro Minute
export interface SongInfo {
  title: string;
  artist: string;
  tonart?: string;
  bpm?: number;
  /** kurzer Hinweis für die Bühne, z. B. „Capo 2“ oder „Intro nur Gitarre“ */
  notiz?: string;
}

export const SONGINFO: SongInfo[] = [];

export function songInfo(title: string, artist: string): SongInfo | undefined {
  return SONGINFO.find((s) => s.title === title && s.artist === artist);
}

/** z. B. „G · 120 bpm · Capo 2“ – leer, wenn nichts eingetragen ist */
export function songInfoText(title: string, artist: string): string {
  const s = songInfo(title, artist);
  return s ? [s.tonart, s.bpm && `${s.bpm} bpm`, s.notiz].filter(Boolean).join(' · ') : '';
}
