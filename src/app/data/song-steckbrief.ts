// Song-Steckbrief zum Teilen (Backstage → Songs → Song bearbeiten → „An die Band schicken“): Titel, Tonart (Original
// und wie die Band spielt), Capo, Tempo, Notiz und Spotify-Link als kurze Nachricht – per WhatsApp, Teilen-Menü oder
// Zwischenablage. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import type { SongWerte } from './songinfo';
import { LISTEN, type Liste, vergleichsKey } from './playlisten';

export function spotifyUrl(title: string, artist: string, listen: Pick<Liste, 'tracks'>[] = LISTEN): string | undefined {
  const v = vergleichsKey(title, artist);
  for (const l of listen) for (const t of l.tracks) if (t.url && vergleichsKey(t.title, t.artist) === v) return t.url;
  return undefined;
}

export function steckbrief(song: { title: string; artist: string }, w: SongWerte, url = spotifyUrl(song.title, song.artist)): string {
  const tonart = w.tonart ? `Tonart ${w.tonart}${w.spielTonart && w.spielTonart !== w.tonart ? ` (wir spielen ${w.spielTonart})` : ''}` : w.spielTonart ? `Wir spielen ${w.spielTonart}` : '';
  const werte = [tonart, w.capo ? `Capo ${w.capo}` : '', w.bpm ? `${w.bpm} bpm` : ''].filter(Boolean).join(' · ');
  return [
    `🎵 ${song.title}${song.artist ? ` – ${song.artist}` : ''}`,
    werte || 'Tonart und Tempo noch offen',
    w.notiz ? `Notiz: ${w.notiz}` : '',
    url ? `Spotify: ${url}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
