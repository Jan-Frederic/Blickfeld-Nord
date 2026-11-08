import { Fortschritt, bandStand, mitEintrag, plaeneMitStaenden, probeStaende, stufe } from './fortschritt';

const band = [
  { slug: 'david', name: 'David B.' },
  { slug: 'fred', name: 'Fred X.' },
  { slug: 'matthias', name: 'Matthias Y.' },
];
const K = 'Iris|Goo Goo Dolls';

describe('Fortschritt je Person', () => {
  it('Stufe: zuletzt wackelt, sitzt, oder an zwei Tagen in Folge sitzt = sicher; Probe geht der Liste am selben Tag vor', () => {
    expect(stufe(undefined)).toBeUndefined();
    expect(stufe([{ tag: '2026-10-01', stand: 'wackelt', quelle: 'liste' }])).toBe('wackelt');
    expect(stufe([{ tag: '2026-10-01', stand: 'wackelt', quelle: 'liste' }, { tag: '2026-10-08', stand: 'sitzt', quelle: 'probe' }])).toBe('sitzt');
    expect(stufe([{ tag: '2026-10-01', stand: 'sitzt', quelle: 'probe' }, { tag: '2026-10-08', stand: 'sitzt', quelle: 'probe' }])).toBe('sicher');
    // am selben Tag: Liste „sitzt“, im Probe-Modus „Nochmal“ → wackelt
    expect(stufe([{ tag: '2026-10-08', stand: 'wackelt', quelle: 'probe' }, { tag: '2026-10-08', stand: 'sitzt', quelle: 'liste' }])).toBe('wackelt');
  });

  it('gleicher Tag und Quelle ersetzt den Eintrag, sonst kommt einer dazu', () => {
    let f: Fortschritt = {};
    f = mitEintrag(f, K, { tag: '2026-10-08', stand: 'wackelt', quelle: 'probe' });
    f = mitEintrag(f, K, { tag: '2026-10-08', stand: 'sitzt', quelle: 'probe' });
    f = mitEintrag(f, K, { tag: '2026-10-01', stand: 'wackelt', quelle: 'liste' });
    expect(f[K].map((e) => `${e.tag} ${e.stand}`)).toEqual(['2026-10-01 wackelt', '2026-10-08 sitzt']);
  });

  it('alte Stufe versteht auch die neuen Status', () => {
    expect(stufe([{ tag: '2026-10-01', stand: 'eingenordet', quelle: 'liste' }])).toBe('sicher');
    expect(stufe([{ tag: '2026-10-01', stand: 'ueben', quelle: 'liste' }])).toBe('wackelt');
    expect(stufe([{ tag: '2026-10-01', stand: 'nicht', quelle: 'liste' }])).toBeUndefined();
  });

  it('Stände einer Probe: „nochmal“, sobald eine Person nochmal will; fließt in die Probenpläne ein', () => {
    const alle = new Map<string, Fortschritt>([
      ['david', { [K]: [{ tag: '2026-11-05', stand: 'sitzt', quelle: 'probe' }] }],
      ['fred', { [K]: [{ tag: '2026-11-05', stand: 'wackelt', quelle: 'probe' }, { tag: '2026-11-04', stand: 'sitzt', quelle: 'liste' }] }],
    ]);
    const st = probeStaende('2026-11-05', band, alle);
    expect([...st.get(K)!]).toEqual([['david', 'sitzt'], ['fred', 'wackelt']]);
    expect(bandStand(st.get(K))).toBe('nochmal');
    expect(bandStand(new Map([['david', 'sitzt']]))).toBe('sitzt');
    expect(bandStand(new Map([['david', 'eingenordet'], ['fred', 'sitzt']]))).toBe('sitzt');
    expect(bandStand(new Map([['david', 'eingenordet'], ['fred', 'ueben']]))).toBe('nochmal');
    const plaene = plaeneMitStaenden([{ tag: '2026-11-05', songs: [{ title: 'Iris', artist: 'Goo Goo Dolls', done: false }] }], band, alle);
    expect(plaene[0].songs[0]).toMatchObject({ stand: 'nochmal', done: true });
  });
});
