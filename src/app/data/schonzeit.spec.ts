import { montag, schonzeiten } from './schonzeit';

describe('schonzeiten', () => {
  it('Woche des Auftritts plus drei volle Wochen Mo–So davor und danach', () => {
    // Fr, 04.12.2026 → Woche 30.11.–06.12.
    expect(montag('2026-12-04').toISOString().slice(0, 10)).toBe('2026-11-30');
    expect(schonzeiten([{ date: '2026-12-04', confirmed: true }])).toEqual([{ wer: 'Band', von: '2026-11-09', bis: '2026-12-27', grund: 'Schonzeit' }]);
  });

  it('nur geklärte Auftritte; mehrtägige ab der Woche des letzten Tags', () => {
    expect(schonzeiten([{ date: '2027-08-29', confirmed: false }])).toEqual([]);
    // Sa 01.05.–Mo 03.05.2027: ab Mo 05.04. (3 Wochen vor der Woche des 1. Tags) bis So 30.05.
    expect(schonzeiten([{ date: '2027-05-01', endDate: '2027-05-03', confirmed: true }])[0]).toMatchObject({ von: '2027-04-05', bis: '2027-05-30' });
  });
});

describe('monatGesperrt', () => {
  it('voll gesperrt durch Schonzeit, Abwesenheit oder Auftritte – sonst null', async () => {
    const { monatGesperrt, schonzeiten } = await import('./schonzeit');
    const shows = [{ date: '2027-02-19', confirmed: true }];
    const sperren = schonzeiten(shows); // 25.01.–14.03.2027
    expect(monatGesperrt('2027-02', sperren, shows)).toEqual(['Schonzeit']);
    expect(monatGesperrt('2027-01', sperren, shows)).toBeNull();
    const privat = [{ wer: 'Band', von: '2027-03-01', bis: '2027-03-31', grund: 'privat verhindert' }];
    expect(monatGesperrt('2027-03', [...sperren, ...privat], shows)).toEqual(['Schonzeit', 'privat verhindert']);
    expect(monatGesperrt('2027-03', privat, [])).toEqual(['privat verhindert']);
    expect(monatGesperrt('2027-03', [{ wer: 'Fred', von: '2027-03-01', bis: '2027-03-31' }], [])).toBeNull();
  });
});
