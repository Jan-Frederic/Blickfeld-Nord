import { faelligerSchritt, werbeplan } from './werbeplan';

describe('werbeplan', () => {
  it('rechnet die Schritte rückwärts vom Auftritt', () => {
    expect(werbeplan('2026-12-04', '2026-10-01').map((x) => x.datum)).toEqual(['2026-11-06', '2026-11-20', '2026-11-27', '2026-12-03', '2026-12-04']);
  });

  it('vor Beginn ist noch nichts fällig', () => {
    expect(faelligerSchritt('2026-12-04', '2026-11-05')).toBeUndefined();
    expect(werbeplan('2026-12-04', '2026-11-05').every((x) => x.status === 'kommt')).toBe(true);
  });

  it('der jüngste fällige Schritt ist „jetzt“, frühere sind vorbei', () => {
    const plan = werbeplan('2026-12-04', '2026-11-22');
    expect(plan.map((x) => x.status)).toEqual(['vorbei', 'jetzt', 'kommt', 'kommt', 'kommt']);
    expect(faelligerSchritt('2026-12-04', '2026-11-22')?.schritt.id).toBe('story-1');
  });

  it('am Auftrittstag ist der letzte Schritt dran, danach nichts mehr', () => {
    expect(faelligerSchritt('2026-12-04', '2026-12-04')?.schritt.id).toBe('heute');
    expect(faelligerSchritt('2026-12-04', '2026-12-05')).toBeUndefined();
  });
});
