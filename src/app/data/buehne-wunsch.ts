import { Entry, isPause } from './setlist-data';

// Bühnen-Modus → Lupe: spontaner Wunsch. Der gesuchte Song kommt an die Stelle, an der man gerade ist (er ist sofort
// dran, der bisherige folgt danach); steht er schon in der Setlist, wird er von dort hierher gezogen. Markiert als
// Publikumswunsch. abbild ordnet alte Positionen den neuen zu (z. B. für gestrichene Songs).

export function wunschEinfuegen(
  liste: Entry[],
  index: number,
  song: { title: string; artist: string },
): { liste: Entry[]; ziel: number; abbild: (alt: number) => number; verschoben: boolean } {
  const gleich = (e: Entry) => !isPause(e) && e.title === song.title && e.artist === song.artist;
  const von = liste.findIndex((e, i) => gleich(e) && i !== index);
  if (index < liste.length && gleich(liste[index])) return { liste, ziel: index, abbild: (i) => i, verschoben: false };
  const neu = [...liste];
  let eintrag: Entry = { title: song.title, artist: song.artist, wunsch: '' };
  let ziel = Math.min(index, liste.length);
  if (von >= 0) {
    const [alt] = neu.splice(von, 1);
    eintrag = { ...(alt as Exclude<Entry, { pause: true }>), wunsch: (alt as { wunsch?: string }).wunsch ?? '' };
    if (von < ziel) ziel--;
  }
  neu.splice(ziel, 0, eintrag);
  const abbild = (i: number): number => {
    if (von >= 0) {
      if (i === von) return ziel;
      const ohne = i > von ? i - 1 : i;
      return ohne >= ziel ? ohne + 1 : ohne;
    }
    return i >= ziel ? i + 1 : i;
  };
  return { liste: neu, ziel, abbild, verschoben: von >= 0 };
}
