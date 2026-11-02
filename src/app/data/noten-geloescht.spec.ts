import { GELOESCHT_KEY, geloeschtMerken, giltLoeschung, ladeGeloescht } from './noten-geloescht';

describe('noten-geloescht', () => {
  beforeEach(() => localStorage.clear());

  it('merkt Löschungen und verfällt nach 120 Tagen', () => {
    geloeschtMerken([{ name: 'Iris - Bass.pdf', groesse: 1234 }], new Date('2026-11-02T10:00:00Z'));
    expect(ladeGeloescht(Date.parse('2026-12-01T00:00:00Z')).length).toBe(1);
    expect(ladeGeloescht(Date.parse('2027-03-15T00:00:00Z')).length).toBe(0);
    localStorage.setItem(GELOESCHT_KEY, '{kaputt');
    expect(ladeGeloescht()).toEqual([]);
  });

  it('gilt für gleiche Datei, die vor der Löschung da war – nicht für später neu hinzugefügte', () => {
    const l = [{ name: 'Iris - Bass.pdf', groesse: 1234, zeit: '2026-11-02T10:00:00.000Z' }];
    expect(giltLoeschung(l, { name: 'Noten/iris - bass.pdf', groesse: 1234, zeit: '2026-10-01T08:00:00.000Z' })).toBe(true);
    expect(giltLoeschung(l, { name: 'Iris - Bass.pdf', groesse: 999, zeit: '2026-10-01T08:00:00.000Z' })).toBe(false);
    expect(giltLoeschung(l, { name: 'Iris - Bass.pdf', groesse: 1234, zeit: '2026-11-03T08:00:00.000Z' })).toBe(false);
  });

  it('wird mit der Band geteilt (Daten/)', async () => {
    const { spiegelArt } = await import('./spiegel');
    expect(spiegelArt(GELOESCHT_KEY)).toBe('band');
  });
});
