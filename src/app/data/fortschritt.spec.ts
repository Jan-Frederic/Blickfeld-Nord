import { Fortschritt, bandStand, mitEintrag, personFortschritt, plaeneMitStaenden, probeStaende, reife, stufe } from './fortschritt';

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

  it('Bühnenreife: Schnitt über alle Musiker, wackelt bei jemandem = Baustelle, alle sicher = bühnenreif', () => {
    const alle = new Map<string, Fortschritt>([
      ['david', { [K]: [{ tag: '2026-10-01', stand: 'sitzt', quelle: 'probe' }, { tag: '2026-10-08', stand: 'sitzt', quelle: 'probe' }] }],
      ['fred', { [K]: [{ tag: '2026-10-08', stand: 'wackelt', quelle: 'probe' }] }],
    ]);
    const r = reife(K, band, alle);
    expect(r.wert).toBeCloseTo((1 + 0 + 0.5) / 3);
    expect(r.wackeltBei).toEqual(['Fred']);
    expect(r.mitAngabe).toBe(2);
    expect(r.ampel).toBe('baustelle');
    const sicher = { [K]: [{ tag: '2026-10-01', stand: 'sitzt' as const, quelle: 'probe' as const }, { tag: '2026-10-08', stand: 'sitzt' as const, quelle: 'probe' as const }] };
    expect(reife(K, band, new Map(band.map((m) => [m.slug, sicher]))).ampel).toBe('buehnenreif');
    expect(reife(K, band, new Map([['david', sicher]])).ampel).toBe('fast');
    expect(reife(K, band, new Map()).ampel).toBe('offen');
  });

  it('Fortschritt einer Person: gefestigt und neu wackelig in den letzten 30 Tagen', () => {
    const f: Fortschritt = {
      [K]: [{ tag: '2026-09-01', stand: 'wackelt', quelle: 'liste' }, { tag: '2026-10-20', stand: 'sitzt', quelle: 'probe' }],
      'Angels|Robbie Williams': [{ tag: '2026-10-25', stand: 'wackelt', quelle: 'probe' }],
    };
    const p = personFortschritt(band[0], f, '2026-11-03');
    expect(p).toMatchObject({ name: 'David', sitzt: 1, wackelt: 1, sicher: 0, gefestigt: ['Iris'], neuWackelig: ['Angels'], zuletzt: '2026-10-25' });
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
    const plaene = plaeneMitStaenden([{ tag: '2026-11-05', songs: [{ title: 'Iris', artist: 'Goo Goo Dolls', done: false }] }], band, alle);
    expect(plaene[0].songs[0]).toMatchObject({ stand: 'nochmal', done: true });
  });
});
