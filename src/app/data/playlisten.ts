import repertoire from './repertoire.json';
import playlisten from './playlisten.json';

// Spotify-Listen der Band. „Website“ ist die offizielle Playlist (Repertoire auf der Startseite, repertoire.json);
// die übrigen gibt es nur im Backstage (playlisten.json, beide von scripts/sync-repertoire.mjs).
// Songs → Liste gleicht alle gegeneinander ab: je Song die Listen, in denen er steht – dazu Songs, zu denen es nur
// Noten auf dem Gerät gibt (noch kein Spotify-Titel, ohne Liste).

export type ListenKey = 'website' | 'setlist' | 'probe' | 'repertoire' | 'wunschliste' | 'archiv';

export interface ListenTitel {
  title: string;
  artist: string;
  url?: string;
  duration?: number;
  year?: number;
}

export interface Liste {
  key: ListenKey;
  label: string;
  icon: string;
  url: string;
  tracks: ListenTitel[];
}

const ICON: Record<ListenKey, { label: string; icon: string }> = {
  website: { label: 'Website', icon: 'public' },
  setlist: { label: 'Setlist', icon: 'queue_music' },
  probe: { label: 'Probe', icon: 'piano' },
  repertoire: { label: 'Repertoire', icon: 'library_music' },
  wunschliste: { label: 'Wunschliste', icon: 'favorite' },
  archiv: { label: 'Archiv', icon: 'inventory_2' },
};

const playlistUrl = (id: string) => `https://open.spotify.com/playlist/${id}`;

export const LISTEN: Liste[] = [
  { key: 'website', ...ICON.website, url: playlistUrl('6O7apXN53rSGaWGhP8S8TW'), tracks: repertoire.tracks },
  ...(playlisten.listen as { key: ListenKey; id: string; tracks: ListenTitel[] }[]).map((l) => ({
    key: l.key,
    ...ICON[l.key],
    url: playlistUrl(l.id),
    tracks: l.tracks,
  })),
];

export interface SongEintrag {
  key: string;
  title: string;
  artist: string;
  /** Listen, in denen der Song steht (Reihenfolge wie LISTEN) */
  listen: ListenKey[];
}

const klein = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * Vergleichsschlüssel: derselbe Song steht in Listen oft in anderer Fassung – „Song - Remastered 2011“, „Song (Live)“,
 * „Song (feat. X)“ oder mit mehreren Interpreten. Verglichen werden Titel ohne Zusatz und der erste Interpret.
 */
export function vergleichsKey(title: string, artist: string): string {
  const t = klein(title)
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s*[([].*?[)\]]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const a = klein(artist.split(/,|&| feat\.? | ft\.? | x /i)[0] ?? '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return `${t}|${a}`;
}

/**
 * Alle Songs aus allen Listen, je Song die Listen. Schlüssel ist „Titel|Interpret“ – wie in Setlists, Noten und
 * songinfo.ts; steht ein Song auf der Website-Liste, gilt deren Schreibweise. Dazu Songs, die es nur als Noten gibt
 * (notenKeys, z. B. „Titel|“ für ein PDF ohne Spotify-Titel) – ohne Liste. Alphabetisch nach Titel.
 */
export function songAbgleich(listen: Pick<Liste, 'key' | 'tracks'>[], notenKeys: string[] = []): SongEintrag[] {
  const nachVergleich = new Map<string, SongEintrag>();
  const nachKey = new Map<string, SongEintrag>();
  const dazu = (title: string, artist: string, liste?: ListenKey) => {
    const v = vergleichsKey(title, artist);
    let e = nachKey.get(`${title}|${artist}`) ?? nachVergleich.get(v);
    if (!e) {
      e = { key: `${title}|${artist}`, title, artist, listen: [] };
      nachVergleich.set(v, e);
      nachKey.set(e.key, e);
    }
    if (liste && !e.listen.includes(liste)) e.listen.push(liste);
  };
  for (const l of listen) for (const t of l.tracks) dazu(t.title, t.artist, l.key);
  for (const k of notenKeys) {
    if (nachKey.has(k)) continue;
    const i = k.lastIndexOf('|');
    dazu(i < 0 ? k : k.slice(0, i), i < 0 ? '' : k.slice(i + 1));
  }
  const reihe = listen.map((l) => l.key);
  for (const e of nachKey.values()) e.listen.sort((a, b) => reihe.indexOf(a) - reihe.indexOf(b));
  return [...nachKey.values()].sort((a, b) => a.title.localeCompare(b.title, 'de') || a.artist.localeCompare(b.artist, 'de'));
}

/**
 * Song aus dem Namen eines alleinstehenden PDFs: „<Band> - <Titel>.pdf“, alles nach einem weiteren „ - “ ist die
 * Fassung („Toto - Africa - Bass.pdf“). Unterstriche gelten als Leerzeichen („Toto_-_Africa.pdf“, so speichern
 * manche Apps und Downloads). Ohne „ - “ ist der ganze Name der Titel, ohne Interpret.
 */
export function pdfSong(dateiname: string): { title: string; artist: string; fassung: string } {
  const teile = dateiname.replace(/\.pdf$/i, '').replace(/_+/g, ' ').split(/\s+[-–]\s+/).map((t) => t.trim()).filter(Boolean);
  if (teile.length < 2) return { title: teile[0] ?? dateiname.trim(), artist: '', fassung: '' };
  return { artist: teile[0], title: teile[1], fassung: teile.slice(2).join(' – ') };
}

/** Schlüssel des Songs zu einem alleinstehenden PDF – steht der Song in einer Liste, gilt deren Schlüssel */
export function pdfSongKey(dateiname: string, songs: SongEintrag[] = []): string {
  const s = pdfSong(dateiname);
  const v = vergleichsKey(s.title, s.artist);
  return songs.find((x) => vergleichsKey(x.title, x.artist) === v)?.key ?? `${s.title}|${s.artist}`;
}
