import { EINSATZ, einsatz, markeLoeschen, markeSetzen, marken, markenZusammenfuehren } from './sprungmarken';

beforeEach(() => localStorage.clear());

describe('Sprungmarken je Spotify-Track', () => {
  it('setzt Marken sortiert, nummeriert gleiche Namen durch', () => {
    markeSetzen('t1', 'Refrain', 61_000);
    markeSetzen('t1', 'Strophe', 20_000);
    expect(markeSetzen('t1', 'Refrain', 120_400).map((m) => m.n)).toEqual(['Strophe', 'Refrain', 'Refrain 2']);
    expect(marken('t2')).toEqual([]);
  });
  it('„Einsatz“ gibt es einmal – ▶ beginnt dort', () => {
    expect(einsatz('t1')).toBe(0);
    markeSetzen('t1', EINSATZ, 8_000);
    markeSetzen('t1', EINSATZ, 9_500);
    expect(marken('t1')).toEqual([{ n: EINSATZ, ms: 9_500 }]);
    expect(einsatz('t1')).toBe(9_500);
  });
  it('löscht eine Marke, die leere Liste bleibt mit Zeit stehen', () => {
    markeSetzen('t1', 'Solo', 90_000);
    expect(markeLoeschen('t1', 'Solo')).toEqual([]);
    expect(JSON.parse(localStorage.getItem('bn-sprungmarken')!)['t1'].marken).toEqual([]);
  });
  it('führt je Track die später geänderte Fassung zusammen', () => {
    const eigen = { t1: { marken: [{ n: 'Solo', ms: 1 }], zeit: 200 }, t2: { marken: [], zeit: 50 } };
    const andere = { t1: { marken: [{ n: 'Solo', ms: 2 }], zeit: 100 }, t2: { marken: [{ n: 'Outro', ms: 3 }], zeit: 60 }, t3: { marken: [], zeit: 1 } };
    expect(markenZusammenfuehren(eigen, andere)).toEqual({ t1: eigen.t1, t2: andere.t2, t3: andere.t3 });
  });
});
