// Ganze Listen zum Dazunehmen (Suche auf Üben und Probe): Setlists der Auftritte (auf diesem Gerät), Sammlungen und
// Spotify-Listen – je Liste die Songs in ihrer Reihenfolge. Treffer nach Art und Name („Setlist Rhede“, „Weihnachts…“).
import { Entry, isPause, loadSetlist } from './setlist-data';
import { LISTEN, SongEintrag, listeInReihenfolge } from './playlisten';
import { sammlungen } from './sammlungen';
import { datumText } from './datum';

export interface ListenQuelle {
  id: string;
  art: 'Setlist' | 'Sammlung' | 'Spotify-Liste';
  icon: string;
  name: string;
  songs: { title: string; artist: string }[];
}

const nurSongs = (e: Entry[]) => e.filter((x) => !isPause(x)).map((x) => ({ title: (x as { title: string }).title, artist: (x as { artist: string }).artist }));
const norm = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function listenQuellen<S extends { date: string; venue: string }>(shows: readonly S[], showId: (s: S) => string, songs: SongEintrag[]): ListenQuelle[] {
  const setlists = [...shows]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((sh): ListenQuelle => ({ id: 'setlist:' + showId(sh), art: 'Setlist', icon: 'queue_music', name: `${sh.venue} ${datumText(sh.date)}`, songs: nurSongs(loadSetlist(showId(sh)) as Entry[]) }));
  const samml = sammlungen().map((x): ListenQuelle => ({ id: 'sammlung:' + x.name, art: 'Sammlung', icon: 'bookmarks', name: x.name, songs: nurSongs(x.entries) }));
  const spotify = LISTEN.map((l): ListenQuelle => ({ id: 'spotify:' + l.key, art: 'Spotify-Liste', icon: l.icon, name: l.label, songs: listeInReihenfolge(l.key, songs).map((s) => ({ title: s.title, artist: s.artist })) }));
  return [...setlists, ...samml, ...spotify].filter((l) => l.songs.length);
}

/** Listen, deren Art und Name zur Suche passen (ab 2 Zeichen) */
export function listenTreffer(listen: ListenQuelle[], suche: string, max = 6): ListenQuelle[] {
  const q = norm(suche.trim());
  return q.length < 2 ? [] : listen.filter((l) => norm(`${l.art} ${l.name}`).includes(q)).slice(0, max);
}
