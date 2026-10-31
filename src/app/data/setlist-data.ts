import data from './repertoire.json';
import playlisten from './playlisten.json';

type Track = { title: string; artist: string; duration?: number };

// Gemeinsame Helfer für Setlists (Backstage): Speicherformat, Sets, Songlängen aus der Spotify-Playlist.

/** wunsch: wer sich den Song gewünscht hat (leer = Wunsch ohne Namen) – Herz in Setlist und Bühnen-Modus;
 *  notiz: Hinweis nur für diesen Auftritt, z. B. „Schluss zweimal“ – im Bühnen-Modus und in der Notenmappe */
export type Song = { title: string; artist: string; wunsch?: string; notiz?: string };
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
// (Website-Liste zuerst, dann die Backstage-Listen)
const lengths = new Map<string, number | undefined>();
for (const t of [...(data.tracks as Track[]), ...playlisten.listen.flatMap((l) => l.tracks as Track[])]) {
  const k = `${t.title}|${t.artist}`;
  if (!lengths.get(k) && t.duration) lengths.set(k, t.duration);
}
/** eigenständige Songs (in keiner Spotify-Liste, z. B. nur als PDF): angenommen 4 Minuten */
export const EIGEN_DAUER = 240;
const inListe = new Set([...(data.tracks as Track[]), ...playlisten.listen.flatMap((l) => l.tracks as Track[])].map((t) => `${t.title}|${t.artist}`));
export const durationOf = (s: Song): number | undefined => {
  const k = `${s.title}|${s.artist}`;
  return lengths.get(k) ?? (inListe.has(k) ? undefined : EIGEN_DAUER);
};

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
