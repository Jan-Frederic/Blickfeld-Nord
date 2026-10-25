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

/** Entwurf aus Backstage → Songs auf diesem Gerät (noch nicht in songinfo.ts übernommen), Schlüssel „Titel|Interpret“ */
export const SONGINFO_ENTWURF_KEY = 'bn-songinfo-entwurf';

function entwurf(): Record<string, Pick<SongInfo, 'tonart' | 'bpm' | 'notiz'>> {
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
  const s = { title, artist, ...e };
  return s.tonart || s.bpm || s.notiz ? s : undefined;
}

/** z. B. „G · 120 bpm · Capo 2“ – leer, wenn nichts eingetragen ist */
export function songInfoText(title: string, artist: string): string {
  const s = songInfo(title, artist);
  return s ? [s.tonart, s.bpm && `${s.bpm} bpm`, s.notiz].filter(Boolean).join(' · ') : '';
}
