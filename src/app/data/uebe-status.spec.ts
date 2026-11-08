import { beforeEach, describe, expect, it } from 'vitest';
import { uebeWertung, alleStatus, buehnenreife, eigenerStatus, karteBewerten, personUebersicht, statusAusAlt, statusAusKasten, statusMigrieren, statusSetzen, statusVonPerson } from './uebe-status';
import { ladeKastenGeteilt, ladeUeben } from './ueben';
import { ladeFortschritt } from './fortschritt';

const band = [
  { slug: 'david', name: 'David B.' },
  { slug: 'fred', name: 'Fred X.' },
  { slug: 'matthias', name: 'Matthias Y.' },
];
const K = 'Iris|Goo Goo Dolls';
const heute = '2026-11-08';

beforeEach(() => localStorage.clear());

describe('Übe-Status', () => {
  it('Kasten → Status: 1 Üben, 2–3 Wackelt noch, 4–5 Sitzt', () => {
    expect([1, 2, 3, 4, 5].map(statusAusKasten)).toEqual(['ueben', 'wackelt', 'wackelt', 'sitzt', 'sitzt']);
  });

  it('ohne Angabe: Nicht gelernt', () => {
    localStorage.setItem('bn-ich', 'david');
    expect(eigenerStatus(K)).toBe('nicht');
  });

  it('direkt setzen: Kasten, Band-Datei, Verlauf, „unsicher bei“; Eingenordet fällt aus dem Kasten', () => {
    localStorage.setItem('bn-ich', 'david');
    statusSetzen(K, 'wackelt', 'liste', heute);
    expect(ladeUeben()[K]).toMatchObject({ kasten: 2, faellig: '2026-11-09' });
    expect(eigenerStatus(K)).toBe('wackelt');
    expect(JSON.parse(localStorage.getItem('bn-unsicher-david')!)).toEqual([K]);
    expect(ladeFortschritt('david')[K].at(-1)).toMatchObject({ stand: 'wackelt', quelle: 'liste' });
    statusSetzen(K, 'eingenordet', 'probe', heute);
    expect(ladeUeben()[K]).toBeUndefined();
    expect(ladeKastenGeteilt('david').eingenordet).toEqual({ [K]: heute });
    expect(statusVonPerson('david').get(K)).toBe('eingenordet');
    expect(JSON.parse(localStorage.getItem('bn-unsicher-david') ?? '[]')).toEqual([]);
    statusSetzen(K, 'nicht', 'liste', heute);
    expect(statusVonPerson('david').has(K)).toBe(false);
  });

  it('gleicher Status behält den Kasten', () => {
    localStorage.setItem('bn-ich', 'david');
    localStorage.setItem('bn-kasten-david', JSON.stringify({ v: 2, kaesten: {}, gelernt: {} }));
    localStorage.setItem('bn-ueben', JSON.stringify({ [K]: { kasten: 3, faellig: '2026-11-10' } }));
    statusSetzen(K, 'wackelt', 'liste', heute);
    expect(ladeUeben()[K].kasten).toBe(3);
    statusSetzen(K, 'sitzt', 'liste', heute);
    expect(ladeUeben()[K].kasten).toBe(4);
  });

  it('Übe-Modus: Sitzt im letzten Kasten → Eingenordet', () => {
    localStorage.setItem('bn-ich', 'david');
    localStorage.setItem('bn-kasten-david', JSON.stringify({ v: 2, kaesten: {}, gelernt: {} }));
    localStorage.setItem('bn-ueben', JSON.stringify({ [K]: { kasten: 5, faellig: heute } }));
    expect(karteBewerten(K, true, heute)).toEqual({ eingenordet: true, status: 'eingenordet' });
    expect(statusVonPerson('david').get(K)).toBe('eingenordet');
    statusSetzen(K, 'ueben', 'liste', heute);
    expect(karteBewerten(K, true, heute).status).toBe('wackelt');
  });

  it('Umstellung vom alten Stand: sicher → Eingenordet, sitzt → Kasten 4, wackelt/alte Liste → Kasten 2, gelernt → Eingenordet', () => {
    localStorage.setItem('bn-ich', 'david');
    localStorage.setItem(
      'bn-fortschritt-david',
      JSON.stringify({
        'A|x': [{ tag: '2026-10-01', stand: 'sitzt', quelle: 'probe' }, { tag: '2026-10-08', stand: 'sitzt', quelle: 'probe' }],
        'B|x': [{ tag: '2026-10-08', stand: 'sitzt', quelle: 'probe' }],
        'C|x': [{ tag: '2026-10-08', stand: 'wackelt', quelle: 'probe' }],
      }),
    );
    localStorage.setItem('bn-wackelt', JSON.stringify({ 'D|x': '2026-10-01' }));
    localStorage.setItem('bn-kasten-david', JSON.stringify({ kaesten: { 'F|x': 3 }, gelernt: { 'E|x': '2026-10-01' } }));
    localStorage.setItem('bn-ueben', JSON.stringify({ 'F|x': { kasten: 3, faellig: heute } }));
    statusMigrieren(heute);
    const s = statusVonPerson('david');
    expect(Object.fromEntries(s)).toEqual({ 'A|x': 'eingenordet', 'B|x': 'sitzt', 'C|x': 'wackelt', 'D|x': 'wackelt', 'E|x': 'eingenordet', 'F|x': 'wackelt' });
    expect(ladeUeben()['B|x'].kasten).toBe(4);
    expect(ladeKastenGeteilt('david').v).toBe(2);
  });

  it('noch nicht umgestellte Person: Status aus dem alten Stand', () => {
    const s = statusAusAlt({ [K]: [{ tag: '2026-10-08', stand: 'sitzt', quelle: 'probe' }] }, ['Angels|x'], { kaesten: {}, gelernt: {} });
    expect(Object.fromEntries(s)).toEqual({ [K]: 'sitzt', 'Angels|x': 'wackelt' });
  });
});

describe('Übe-Modus mit fünf Status', () => {
  it('Sitzt bei sitzendem Song schiebt weiter bis eingenordet, sonst gilt der Status direkt', () => {
    localStorage.setItem('bn-ich', 'david');
    localStorage.setItem('bn-kasten-david', JSON.stringify({ v: 2, kaesten: {}, gelernt: {} }));
    localStorage.setItem('bn-ueben', JSON.stringify({ [K]: { kasten: 1, faellig: heute } }));
    expect(uebeWertung(K, 'sitzt', heute)).toBe('sitzt');
    expect(ladeUeben()[K]).toMatchObject({ kasten: 4, faellig: '2026-11-15' });
    expect(uebeWertung(K, 'sitzt', heute)).toBe('sitzt');
    expect(ladeUeben()[K].kasten).toBe(5);
    expect(uebeWertung(K, 'sitzt', heute)).toBe('eingenordet');
    expect(uebeWertung(K, 'ueben', heute)).toBe('ueben');
    expect(ladeUeben()[K]).toMatchObject({ kasten: 1, faellig: heute });
    expect(uebeWertung(K, 'wackelt', heute)).toBe('wackelt');
    expect(ladeUeben()[K]).toMatchObject({ kasten: 2, faellig: '2026-11-09' });
  });
});

describe('Bühnenreife aus dem Übe-Status', () => {
  const st = (o: Record<string, Record<string, string>>) => new Map(Object.entries(o).map(([k, v]) => [k, new Map(Object.entries(v))])) as ReturnType<typeof alleStatus>;
  it('Schnitt über alle Musiker, Nicht gelernt zählt 0; Ampel', () => {
    const r = buehnenreife(K, band, st({ david: { [K]: 'eingenordet' }, fred: { [K]: 'wackelt' } }));
    expect(r.wert).toBeCloseTo((1 + 0.4 + 0) / 3);
    expect(r.wackeltBei).toEqual(['Fred']);
    expect(r.mitAngabe).toBe(2);
    expect(r.ampel).toBe('baustelle');
    expect(buehnenreife(K, band, st({ david: { [K]: 'eingenordet' }, fred: { [K]: 'eingenordet' }, matthias: { [K]: 'eingenordet' } })).ampel).toBe('buehnenreif');
    expect(buehnenreife(K, band, st({ david: { [K]: 'eingenordet' }, fred: { [K]: 'sitzt' }, matthias: { [K]: 'sitzt' } })).ampel).toBe('fast');
    // fehlt bei einer Person: noch nicht gelernt → Baustelle
    expect(buehnenreife(K, band, st({ david: { [K]: 'eingenordet' }, fred: { [K]: 'sitzt' } })).ampel).toBe('baustelle');
    expect(buehnenreife(K, band, new Map()).ampel).toBe('offen');
  });

  it('Übersicht je Person: Songs je Status, gefestigt und neu unsicher in 30 Tagen', () => {
    const p = personUebersicht(
      band[0],
      new Map([[K, 'sitzt'], ['Angels|x', 'wackelt']]),
      {
        [K]: [{ tag: '2026-09-01', stand: 'wackelt', quelle: 'liste' }, { tag: '2026-10-20', stand: 'sitzt', quelle: 'probe' }],
        'Angels|x': [{ tag: '2026-09-01', stand: 'sitzt', quelle: 'liste' }, { tag: '2026-10-25', stand: 'wackelt', quelle: 'probe' }],
      },
      '2026-11-03',
    );
    expect(p).toMatchObject({ name: 'David', gefestigt: ['Iris'], neuWackelig: ['Angels'], zuletzt: '2026-10-25' });
    expect(p.je).toMatchObject({ sitzt: 1, wackelt: 1 });
  });
});
