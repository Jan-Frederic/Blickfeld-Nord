import { sitzungLesen, sitzungMerken, sitzungVergessen } from './modus-sitzung';

beforeEach(() => sessionStorage.clear());

describe('offener Modus über ein Neuladen hinweg', () => {
  it('merkt Art, Probe und Ergebnis; gilt drei Stunden; Vergessen nur für die eigene Art', () => {
    sitzungMerken({ art: 'ueben', zaehler: { sitzt: 2 } }, 1000);
    expect(sitzungLesen('ueben', undefined, 2000)?.zaehler).toEqual({ sitzt: 2 });
    expect(sitzungLesen('probe', undefined, 2000)).toBeNull();
    expect(sitzungLesen('ueben', undefined, 1000 + 3 * 3600_000)).toBeNull();
    sitzungVergessen('probe');
    expect(sitzungLesen('ueben', undefined, 2000)).not.toBeNull();
    sitzungVergessen('ueben');
    expect(sitzungLesen('ueben', undefined, 2000)).toBeNull();
    sitzungMerken({ art: 'probe', id: '2026-11-20' }, 1000);
    expect(sitzungLesen('probe', '2026-11-20', 2000)).not.toBeNull();
    expect(sitzungLesen('probe', '2026-12-11', 2000)).toBeNull();
  });
});
