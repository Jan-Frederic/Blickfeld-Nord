import { montag, schonzeiten } from './schonzeit';

describe('schonzeiten', () => {
  it('drei volle Wochen Mo–So vor und nach der Woche des Auftritts', () => {
    // Fr, 04.12.2026 → Woche 30.11.–06.12.
    expect(montag('2026-12-04').toISOString().slice(0, 10)).toBe('2026-11-30');
    expect(schonzeiten([{ date: '2026-12-04', confirmed: true }])).toEqual([
      { wer: 'Band', von: '2026-11-09', bis: '2026-11-29', grund: 'Schonzeit' },
      { wer: 'Band', von: '2026-12-07', bis: '2026-12-27', grund: 'Schonzeit' },
    ]);
  });

  it('nur geklärte Auftritte; mehrtägige ab der Woche des letzten Tags', () => {
    expect(schonzeiten([{ date: '2027-08-29', confirmed: false }])).toEqual([]);
    const [, nach] = schonzeiten([{ date: '2027-05-01', endDate: '2027-05-03', confirmed: true }]);
    expect(nach).toMatchObject({ von: '2027-05-10', bis: '2027-05-30' });
  });
});
