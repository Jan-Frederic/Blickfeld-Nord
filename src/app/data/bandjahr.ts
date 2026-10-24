// Bandjahr in Zahlen (Backstage → Zahlen): Auftritte, Proben, Orte und Songs eines Jahres.
// Setlists und Sterne stammen von diesem Gerät. Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import type { Show } from './band.service';
import type { Entry, Song } from './setlist-data';
import { rangliste, songKey, type Bewertungen } from './bewertung';

export interface Bandjahr {
  jahr: number;
  auftritte: number;
  oeffentlich: number;
  proben: number;
  orte: number;
  songsGespielt: number;
  verschiedeneSongs: number;
  meistgespielt?: Song & { mal: number };
  bestbewertet?: Song & { schnitt: number };
}

export function bandjahr(
  jahr: number,
  heute: string,
  shows: (Show & { id: string })[],
  proben: { date: string }[],
  setlists: Map<string, Entry[]>,
  sterne: Map<string, Bewertungen>,
): Bandjahr {
  const imJahr = (d: string) => d.startsWith(`${jahr}-`) && d < heute;
  const auftritte = shows.filter((s) => s.confirmed && imJahr(s.date));
  const gespielt = new Map<string, Song & { mal: number }>();
  let songsGespielt = 0;
  for (const s of auftritte)
    for (const e of setlists.get(s.id) ?? []) {
      if ('pause' in e) continue;
      songsGespielt++;
      const g = gespielt.get(songKey(e)) ?? { title: e.title, artist: e.artist, mal: 0 };
      g.mal++;
      gespielt.set(songKey(e), g);
    }
  const meist = [...gespielt.values()].sort((a, b) => b.mal - a.mal || a.title.localeCompare(b.title, 'de'))[0];
  const top = rangliste(auftritte.map((s) => sterne.get(s.id) ?? {}), 1)[0];
  return {
    jahr,
    auftritte: auftritte.length,
    oeffentlich: auftritte.filter((s) => !s.private).length,
    proben: proben.filter((p) => imJahr(p.date)).length,
    orte: new Set(auftritte.map((s) => `${s.venue}|${s.city ?? ''}`)).size,
    songsGespielt,
    verschiedeneSongs: gespielt.size,
    meistgespielt: meist,
    bestbewertet: top && { title: top.title, artist: top.artist, schnitt: top.schnitt },
  };
}
