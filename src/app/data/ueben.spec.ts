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

describe('ueben – Tagesziel und Kasten-Karten', () => {
  it('Karten im Kasten bleiben, auch wenn sie nicht mehr wackeln', () => {
    const k = karten({}, {}, { 'A|x': { kasten: 2, faellig: '2026-11-09' } }, new Map(), '2026-11-08');
    expect(k.map((x) => x.title)).toEqual(['A']);
  });
  it('nochHeute zählt das Tagesziel herunter, nie unter 0', async () => {
    const { nochHeute } = await import('./ueben');
    expect(nochHeute(10, 3)).toBe(7);
    expect(nochHeute(5, 9)).toBe(0);
  });
});

describe('ueben – zählt in der Bühnenreife', () => {
  it('zweimal „sitzt“ an verschiedenen Tagen im Übemodus → sicher; am selben Tag geht die Probe vor', async () => {
    const { stufe } = await import('./fortschritt');
    expect(stufe([{ tag: '2026-11-01', stand: 'sitzt', quelle: 'ueben' }, { tag: '2026-11-02', stand: 'sitzt', quelle: 'ueben' }])).toBe('sicher');
    expect(stufe([{ tag: '2026-11-02', stand: 'wackelt', quelle: 'probe' }, { tag: '2026-11-02', stand: 'sitzt', quelle: 'ueben' }])).toBe('wackelt');
    expect(stufe([{ tag: '2026-11-02', stand: 'wackelt', quelle: 'liste' }, { tag: '2026-11-02', stand: 'sitzt', quelle: 'ueben' }])).toBe('sitzt');
  });
});

describe('ueben – mit der Band geteilt', () => {
  it('Kasten 1 bei mehreren Personen, meiste zuerst', async () => {
    const { kastenEinsBei } = await import('./ueben');
    const g = new Map<string, { kaesten: Record<string, number>; gelernt: Record<string, string> }>([
      ['a', { kaesten: { 'Iris|x': 1, 'Angels|y': 1 }, gelernt: {} }],
      ['b', { kaesten: { 'Iris|x': 1, 'Angels|y': 3 }, gelernt: {} }],
      ['c', { kaesten: { 'Iris|x': 1 }, gelernt: {} }],
    ]);
    const r = kastenEinsBei(g, new Map([['a', 'Fred'], ['b', 'David'], ['c', 'Matthias']]));
    expect([...r]).toEqual([['Iris|x', ['Fred', 'David', 'Matthias']]]);
  });
  it('Statistik: Karten je Kasten und in 30 Tagen Gelerntes', async () => {
    const { uebeStatistik } = await import('./ueben');
    const s = uebeStatistik({ kaesten: { 'A|x': 1, 'B|x': 3, 'C|x': 3 }, gelernt: { 'D|x': '2026-11-01', 'E|x': '2026-08-01' }, zuletzt: '2026-11-07' }, '2026-11-08');
    expect(s.jeKasten).toEqual([1, 0, 2, 0, 0]);
    expect(s.gelernt).toEqual(['D']);
  });
});
