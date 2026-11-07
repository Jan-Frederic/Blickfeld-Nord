import { pausenSetzen } from './pausen';
import type { Entry, Song } from './setlist-data';

const song = (n: number, min: number): Song => ({ title: `S${n}`, artist: String(min) });
const dauer = (s: Song) => Number(s.artist) * 60 || undefined;
const sets = (e: Entry[]) => {
  const out: number[] = [0];
  for (const x of e) {
    if ('pause' in x) out.push(0);
    else out[out.length - 1] += Number(x.artist);
  }
  return out;
};

describe('Pausen neu setzen', () => {
  it('teilt 90 Minuten bei 45 Minuten Wunsch-Länge in zwei gleich lange Sets', () => {
    const e = Array.from({ length: 18 }, (_, i) => song(i, 5));
    expect(sets(pausenSetzen(e, 45 * 60, dauer))).toEqual([45, 45]);
  });

  it('wirft alte Pausen weg und behält die Reihenfolge', () => {
    const e: Entry[] = [song(1, 4), { pause: true }, song(2, 4), song(3, 4), { pause: true }, { pause: true }, song(4, 4)];
    const r = pausenSetzen(e, 8 * 60, dauer);
    expect(r.filter((x): x is Song => !('pause' in x)).map((x) => x.title)).toEqual(['S1', 'S2', 'S3', 'S4']);
    expect(sets(r)).toEqual([8, 8]);
  });

  it('wählt die Zahl der Sets, die am besten passt, und legt keine Pause ans Ende', () => {
    // 3 × 40 min Musik bei Wunsch 45 → 3 Sets
    const e = Array.from({ length: 30 }, (_, i) => song(i, 4));
    const r = pausenSetzen(e, 45 * 60, dauer);
    expect(sets(r)).toEqual([40, 40, 40]);
    expect('pause' in r[r.length - 1]).toBe(false);
  });

  it('Songs ohne Länge zählen 4 Minuten; kürzer als das Ziel → ein Set ohne Pause', () => {
    const e = [song(1, 0), song(2, 0), song(3, 3)];
    expect(pausenSetzen(e, 45 * 60, dauer).some((x) => 'pause' in x)).toBe(false);
  });
});
