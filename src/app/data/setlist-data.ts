import data from './repertoire.json';

// Gemeinsame Helfer für Setlists (Backstage): Speicherformat, Sets, Songlängen aus der Spotify-Playlist.

/** wunsch: wer sich den Song gewünscht hat (leer = Wunsch ohne Namen) – Herz in Setlist und Bühnen-Modus */
export type Song = { title: string; artist: string; wunsch?: string };
export type Entry = Song | { pause: true };

export const SETLIST_PREFIX = 'bn-setlist-';

export const isPause = (e: Entry): e is { pause: true } => 'pause' in e;

export function loadSetlist(show: string): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(SETLIST_PREFIX + show) ?? '[]') as Entry[];
  } catch {
    return [];
  }
}

// Sets = Abschnitte zwischen den Pausen (leere werden nicht gezählt)
export function setsOf(entries: Entry[]): Song[][] {
  const sets: Song[][] = [[]];
  for (const e of entries) {
    if (isPause(e)) sets.push([]);
    else sets[sets.length - 1].push(e);
  }
  return sets.filter((s) => s.length);
}

// Songlänge in Sekunden laut Spotify (scripts/sync-repertoire.mjs) – fehlt bei Songs ohne Angabe
const lengths = new Map(
  (data.tracks as { title: string; artist: string; duration?: number }[]).map((t) => [`${t.title}|${t.artist}`, t.duration]),
);
export const durationOf = (s: Song): number | undefined => lengths.get(`${s.title}|${s.artist}`);

// Gesamtlänge eines Sets; „missing“ zählt Songs ohne bekannte Länge
export function setLength(set: Song[]): { seconds: number; missing: number } {
  let seconds = 0;
  let missing = 0;
  for (const s of set) {
    const d = durationOf(s);
    if (d) seconds += d;
    else missing++;
  }
  return { seconds, missing };
}

// 3:45 für Songs, „58 min“ bzw. „1 h 58 min“ für Sets
export const songTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
export function setTime(sec: number): string {
  const min = Math.round(sec / 60);
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
}
