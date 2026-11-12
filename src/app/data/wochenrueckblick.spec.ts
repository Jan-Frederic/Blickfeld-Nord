import { kalenderwoche, rueckblickText, tageVorher, wochenAnfang, wochenRueckblick, wochenVerlauf } from './wochenrueckblick';
import { Fortschritt } from './fortschritt';

const band = [
  { slug: 'jan', name: 'Jan-Frederic Overbeck', nickname: 'Fred' },
  { slug: 'david', name: 'David B.' },
  { slug: 'matthias', name: 'Matthias W.' },
];
const heute = '2026-11-12';

describe('Wochenrückblick der Band', () => {
  it('zählt geübte Karten der letzten 7 Tage je Person, „du“ für einen selbst', () => {
    const v = new Map<string, Fortschritt>([
      ['jan', { 'Iris|X': [{ tag: '2026-11-06', stand: 'wackelt', quelle: 'ueben' }, { tag: '2026-11-12', stand: 'sitzt', quelle: 'ueben' }], 'Africa|Y': [{ tag: '2026-11-01', stand: 'ueben', quelle: 'ueben' }] }],
      ['david', { 'Iris|X': [{ tag: '2026-11-10', stand: 'wackelt', quelle: 'ueben' }, { tag: '2026-11-11', stand: 'sitzt', quelle: 'probe' }] }],
    ]);
    const r = wochenRueckblick(band, v, 'jan', heute);
    expect(r.personen).toEqual([
      { slug: 'jan', name: 'du', karten: 2 },
      { slug: 'david', name: 'David', karten: 1 },
      { slug: 'matthias', name: 'Matthias', karten: 0 },
    ]);
    expect(rueckblickText(r)).toBe('du 2 Karten · David 1 · Matthias 0');
  });
  it('nennt Songs, die jetzt bei allen sitzen und diese Woche dort angekommen sind', () => {
    const sitzt = (tag: string) => [{ tag: '2026-10-01', stand: 'wackelt' as const, quelle: 'ueben' as const }, { tag, stand: 'sitzt' as const, quelle: 'probe' as const }];
    const v = new Map<string, Fortschritt>([
      ['jan', { 'Iris|X': sitzt('2026-11-11'), 'Angels|Z': sitzt('2026-10-02'), 'Africa|Y': sitzt('2026-11-11') }],
      ['david', { 'Iris|X': sitzt('2026-10-20'), 'Angels|Z': sitzt('2026-10-03'), 'Africa|Y': [{ tag: '2026-11-11', stand: 'wackelt', quelle: 'probe' }] }],
      ['matthias', { 'Iris|X': [{ tag: '2026-09-01', stand: 'eingenordet', quelle: 'liste' }], 'Angels|Z': sitzt('2026-10-04') }],
    ]);
    // Iris: alle sitzen, Fred diese Woche · Angels: alle schon länger · Africa: David wackelt
    expect(wochenRueckblick(band, v, 'jan', heute).gefestigt).toEqual(['Iris']);
  });
  it('rechnet Tage über den Monatswechsel', () => {
    expect(tageVorher('2026-12-03', 6)).toBe('2026-11-27');
  });
  it('Kalenderwochen: Montag als Anfang, ISO-Nummer auch über den Jahreswechsel', () => {
    expect(wochenAnfang('2026-11-12')).toBe('2026-11-09');
    expect(wochenAnfang('2026-11-09')).toBe('2026-11-09');
    expect(wochenAnfang('2026-11-15')).toBe('2026-11-09');
    expect(kalenderwoche('2026-11-12')).toBe(46);
    expect(kalenderwoche('2027-01-01')).toBe(53);
    expect(kalenderwoche('2025-12-29')).toBe(1);
  });
  it('zählt geübte Karten je Kalenderwoche und Person, die laufende Woche zuletzt', () => {
    const v = new Map<string, Fortschritt>([
      ['jan', { 'Iris|X': [{ tag: '2026-11-03', stand: 'wackelt', quelle: 'ueben' }, { tag: '2026-11-10', stand: 'sitzt', quelle: 'ueben' }], 'Africa|Y': [{ tag: '2026-11-11', stand: 'ueben', quelle: 'ueben' }, { tag: '2026-11-11', stand: 'wackelt', quelle: 'probe' }] }],
      ['david', { 'Iris|X': [{ tag: '2026-09-01', stand: 'ueben', quelle: 'ueben' }] }],
    ]);
    const w = wochenVerlauf(band, v, heute, 3);
    expect(w.map((x) => [x.kw, x.ab, x.bis])).toEqual([[44, '2026-10-26', '2026-11-01'], [45, '2026-11-02', '2026-11-08'], [46, '2026-11-09', '2026-11-12']]);
    expect(w.map((x) => x.karten)).toEqual([{ jan: 0, david: 0, matthias: 0 }, { jan: 1, david: 0, matthias: 0 }, { jan: 2, david: 0, matthias: 0 }]);
  });
});
