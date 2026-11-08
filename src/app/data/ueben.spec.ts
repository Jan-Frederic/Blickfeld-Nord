import { describe, expect, it } from 'vitest';
import { KAESTEN, bewerten, jeKasten, karten } from './ueben';

const heute = '2026-11-08';

describe('ueben', () => {
  it('Karten: alle Songs im eigenen Kasten', () => {
    const k = karten({ 'Iris|Goo Goo Dolls': { kasten: 1, faellig: heute }, 'Perfect|Ed Sheeran': { kasten: 4, faellig: '2026-11-20' } }, new Map(), heute);
    expect(k.map((x) => [x.title, x.dran])).toEqual([['Iris', true], ['Perfect', false]]);
  });

  it('sortiert: heute dran, dann Songs des nächsten Auftritts, dann niedriger Kasten', () => {
    const k = karten(
      { 'A|x': { kasten: 3, faellig: '2026-11-20' }, 'B|x': { kasten: 2, faellig: heute }, 'C|x': { kasten: 1, faellig: heute }, 'D|x': { kasten: 2, faellig: heute } },
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
    const k = karten({ 'A|x': { kasten: 1, faellig: heute }, 'B|x': { kasten: 3, faellig: heute } }, new Map(), heute);
    expect(jeKasten(k)).toEqual([1, 0, 1, 0, 0]);
  });
});

describe('ueben – Tagesziel', () => {
  it('nochHeute zählt das Tagesziel herunter, nie unter 0', async () => {
    const { nochHeute } = await import('./ueben');
    expect(nochHeute(10, 3)).toBe(7);
    expect(nochHeute(5, 9)).toBe(0);
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
  it('Statistik: Karten je Kasten und in 30 Tagen Eingenordetes', async () => {
    const { uebeStatistik } = await import('./ueben');
    const s = uebeStatistik({ v: 2, kaesten: { 'A|x': 1, 'B|x': 3, 'C|x': 3 }, gelernt: {}, eingenordet: { 'D|x': '2026-11-01', 'E|x': '2026-08-01' }, zuletzt: '2026-11-07' }, '2026-11-08');
    expect(s.jeKasten).toEqual([1, 0, 2, 0, 0]);
    expect(s.gelernt).toEqual(['D']);
  });
});
