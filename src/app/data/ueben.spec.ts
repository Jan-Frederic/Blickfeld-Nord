import { describe, expect, it } from 'vitest';
import { KAESTEN, bewerten, jeKasten, karten } from './ueben';

const heute = '2026-11-08';

describe('ueben', () => {
  it('nimmt „Wackelt noch“ und zuletzt wackelnde Songs aus dem Fortschritt, ohne gelernte', () => {
    const k = karten(
      { 'Iris|Goo Goo Dolls': '2026-10-01' },
      {
        'Perfect|Ed Sheeran': [{ tag: '2026-11-01', stand: 'wackelt', quelle: 'probe' }],
        'Angels|Robbie Williams': [{ tag: '2026-11-01', stand: 'sitzt', quelle: 'probe' }],
      },
      {},
      new Map(),
      heute,
    );
    expect(k.map((x) => x.title).sort()).toEqual(['Iris', 'Perfect']);
    expect(k.every((x) => x.kasten === 1 && x.dran)).toBe(true);
  });

  it('sortiert: heute dran, dann Songs des nächsten Auftritts, dann niedriger Kasten', () => {
    const k = karten(
      { 'A|x': '2026-01-01', 'B|x': '2026-01-01', 'C|x': '2026-01-01', 'D|x': '2026-01-01' },
      {},
      { 'A|x': { kasten: 3, faellig: '2026-11-20' }, 'B|x': { kasten: 2, faellig: heute }, 'C|x': { kasten: 1, faellig: heute } },
      new Map([['B|x', '2026-12-04']]),
      heute,
    );
    expect(k.map((x) => x.title)).toEqual(['B', 'C', 'D', 'A']);
  });

  it('Sitzt schiebt einen Kasten weiter, Wackelt zurück in Kasten 1, im letzten Kasten ist er gelernt', () => {
    let r = bewerten({}, 'A|x', true, heute);
    expect(r.stand['A|x']).toEqual({ kasten: 2, faellig: '2026-11-09', zuletzt: heute });
    r = bewerten(r.stand, 'A|x', false, heute);
    expect(r.stand['A|x'].kasten).toBe(1);
    expect(r.stand['A|x'].faellig).toBe(heute);
    r = bewerten({ 'A|x': { kasten: KAESTEN, faellig: heute } }, 'A|x', true, heute);
    expect(r.gelernt).toBe(true);
    expect(r.stand['A|x']).toBeUndefined();
  });

  it('zählt Karten je Kasten', () => {
    const k = karten({ 'A|x': '', 'B|x': '' }, {}, { 'B|x': { kasten: 3, faellig: heute } }, new Map(), heute);
    expect(jeKasten(k)).toEqual([1, 0, 1, 0, 0]);
  });
});
