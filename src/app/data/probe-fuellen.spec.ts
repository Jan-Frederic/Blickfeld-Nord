import { describe, expect, it } from 'vitest';
import { STANDARD_SEKUNDEN, probeFuellen } from './probe-fuellen';

const k = (title: string, prio: number) => ({ title, artist: 'x', grund: '', prio });

describe('Probe füllen', () => {
  it('nimmt die wichtigsten zuerst, bis die Zeit voll ist; Geplantes zählt mit, nichts doppelt', () => {
    const zeiten = new Map([['B|x', 20 * 60]]);
    const r = probeFuellen([k('C', 2), k('A', 0), k('B', 1), k('A', 3), k('D', 2)], [{ title: 'Z', artist: 'x' }], zeiten, 40 * 60);
    // Z (8) + A (8) + B (20) = 36 min; C (8) passt nicht mehr
    expect(r.songs.map((s) => s.title)).toEqual(['A', 'B']);
    expect(r.gesamt).toBe(2 * STANDARD_SEKUNDEN + 20 * 60);
  });
  it('überspringt zu lange Songs und nimmt kürzere danach', () => {
    const zeiten = new Map([['A|x', 30 * 60], ['B|x', 5 * 60]]);
    expect(probeFuellen([k('A', 0), k('B', 1)], [], zeiten, 10 * 60).songs.map((s) => s.title)).toEqual(['B']);
  });
});
