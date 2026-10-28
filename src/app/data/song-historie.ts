import { Entry, isPause } from './setlist-data';

// Song-Historie aus den Setlists der Auftritte (Backstage → Songs): wie oft ein Song schon gespielt wurde, wann zuletzt
// und ob er in einer kommenden Setlist steht. Gespielt = in der Setlist eines Auftritts, dessen letzter Tag vorbei ist.

export interface SongHistorie {
  gespielt: number;
  /** YYYY-MM-DD des letzten Auftritts mit dem Song */
  zuletzt?: string;
  /** steht in einer Setlist eines kommenden Auftritts */
  geplant: boolean;
}

/** auftritte: je Auftritt der letzte Tag und die Setlist; heute als YYYY-MM-DD */
export function songHistorie(auftritte: { tag: string; setlist: Entry[] }[], heute: string): Map<string, SongHistorie> {
  const out = new Map<string, SongHistorie>();
  for (const a of auftritte) {
    const vorbei = a.tag < heute;
    // ein Song zählt je Auftritt nur einmal, auch wenn er zweimal in der Setlist steht
    const keys = new Set(a.setlist.filter((e) => !isPause(e)).map((e) => `${(e as { title: string }).title}|${(e as { artist: string }).artist}`));
    for (const k of keys) {
      const h = out.get(k) ?? { gespielt: 0, geplant: false };
      if (vorbei) {
        h.gespielt++;
        if (!h.zuletzt || a.tag > h.zuletzt) h.zuletzt = a.tag;
      } else h.geplant = true;
      out.set(k, h);
    }
  }
  return out;
}

/** „5× gespielt, zuletzt 04.12.2025“ bzw. „noch nie gespielt“ (+ „· geplant“) */
export function historieText(h: SongHistorie | undefined): string {
  const teile = [h?.gespielt ? `${h.gespielt}× gespielt, zuletzt ${h.zuletzt!.slice(8, 10)}.${h.zuletzt!.slice(5, 7)}.${h.zuletzt!.slice(0, 4)}` : 'noch nie gespielt'];
  if (h?.geplant) teile.push('geplant');
  return teile.join(' · ');
}
