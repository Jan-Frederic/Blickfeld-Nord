import { jahresplan } from './jahresplan';

describe('jahresplan', () => {
  it('sammelt Auftritte, Proben und Abwesenheiten je Monat, sortiert', () => {
    const plan = jahresplan(
      {
        shows: [{ date: '2027-02-19', time: '18:00', venue: 'Café Nenna', city: 'Rhede', confirmed: true }],
        proben: [{ date: '2027-02-12', time: '18:00', endTime: '21:00', place: 'Dingden' }],
        weg: [{ wer: 'Fred', von: '2027-01-30', bis: '2027-02-02', grund: 'Urlaub' }],
        showId: (s) => s.date,
      },
      '2027-01-10',
      2,
    );
    expect(plan.map((m) => m.monat)).toEqual(['2027-01', '2027-02']);
    expect(plan[0].eintraege.map((e) => e.text)).toEqual(['Fred nicht da']);
    expect(plan[1].eintraege.map((e) => `${e.datum} ${e.art} ${e.text} ${e.info}`)).toEqual([
      '2027-01-30 weg Fred nicht da Urlaub',
      '2027-02-12 probe Probe 18:00–21:00 Uhr · Dingden',
      '2027-02-19 auftritt Café Nenna 18:00 Uhr · Rhede',
    ]);
  });
});
