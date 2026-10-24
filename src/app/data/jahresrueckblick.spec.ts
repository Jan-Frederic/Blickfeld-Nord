import type { HistoryEntry, Show } from './band.service';
import { jahresrueckblick, rueckblickJahre } from './jahresrueckblick';

const shows: Show[] = [
  { date: '2025-10-02', city: 'Dingden', venue: 'Café Lotti', confirmed: true },
  { date: '2026-01-16', city: 'Rhede', venue: 'Lauftreff', publicName: 'Lauftreff', private: true, confirmed: true },
  { date: '2026-08-22', city: 'Dingden', venue: 'Gasthof', confirmed: true },
  { date: '2026-09-05', city: 'Dingden', venue: 'Geheime Adresse', private: true, confirmed: true },
  { date: '2026-10-10', venue: 'Offen', confirmed: false },
  { date: '2026-12-04', city: 'Rhede', venue: 'Weihnachtsmarkt', confirmed: true },
  { date: '2027-04-03', city: 'Rhede', venue: 'Latöchte', confirmed: true },
  { date: '2027-05-07', venue: 'Privat', private: true, confirmed: true },
];
const history: HistoryEntry[] = [
  { date: '2026-08-22', title: 'Gasthof', text: ['Schön'] },
  { date: '2026-03-01', title: 'Beispiel', text: ['x'], example: true },
];

describe('rueckblickJahre', () => {
  it('zeigt das laufende Jahr erst ab dem 15.12., frühere Jahre immer', () => {
    expect(rueckblickJahre(shows, '2026-10-24')).toEqual([2025]);
    expect(rueckblickJahre(shows, '2026-12-15')).toEqual([2026, 2025]);
  });
});

describe('jahresrueckblick', () => {
  const r = jahresrueckblick(2026, '2026-12-20', shows, [{ date: '2026-02-01' }, { date: '2027-01-01' }], history, (s) => s.date);

  it('zählt nur gespielte, geklärte Auftritte des Jahres', () => {
    expect(r.auftritte).toBe(4);
    expect(r.oeffentlich).toBe(2);
    expect(r.proben).toBe(1);
    expect(r.ausblick).toBe(1);
  });

  it('zeigt private Auftritte nur mit öffentlichem Namen, ohne Ort und ohne Link', () => {
    expect(r.stationen.map((s) => s.name)).toEqual(['Lauftreff', 'Gasthof', 'Private Feier', 'Weihnachtsmarkt']);
    const privat = r.stationen.filter((s) => !s.id);
    expect(privat.every((s) => s.city === undefined)).toBe(true);
    expect(JSON.stringify(r)).not.toContain('Geheime Adresse');
  });

  it('nimmt Rückblicke des Jahres als Highlights, ohne Beispiele', () => {
    expect(r.highlights.map((h) => h.title)).toEqual(['Gasthof']);
  });
});
