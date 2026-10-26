// Tempo-Verlauf der Setlist: BPM je Song (aus Backstage → Songs bzw. songinfo.ts) und Strecken, in denen mehrere
// langsame Songs direkt aufeinander folgen – dort droht die Stimmung durchzuhängen.
import { Song } from './setlist-data';

/** unter diesem Tempo gilt ein Song als langsam */
export const LANGSAM_BPM = 95;

/** Strecken mit mindestens `min` langsamen Songs in Folge – Positionen 0-basiert innerhalb des Sets */
export function langsameStrecken(bpm: (number | undefined)[], grenze = LANGSAM_BPM, min = 3): { von: number; bis: number }[] {
  const out: { von: number; bis: number }[] = [];
  let start = -1;
  for (let i = 0; i <= bpm.length; i++) {
    const langsam = i < bpm.length && bpm[i] !== undefined && bpm[i]! < grenze;
    if (langsam && start < 0) start = i;
    if (!langsam && start >= 0) {
      if (i - start >= min) out.push({ von: start, bis: i - 1 });
      start = -1;
    }
  }
  return out;
}

/** BPM je Song eines Sets */
export function setTempi(set: Song[], tempo: (s: Song) => number | undefined): (number | undefined)[] {
  return set.map(tempo);
}
