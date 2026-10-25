import { faelligerSchritt, schrittText, werbeplan } from './werbeplan';

describe('werbeplan', () => {
  it('rechnet die Schritte rückwärts vom Auftritt', () => {
    expect(werbeplan('2026-12-04', '2026-10-01').map((x) => x.datum)).toEqual([
      '2026-11-06', '2026-11-20', '2026-11-27', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-07', '2026-12-11',
    ]);
  });

  it('vor Beginn ist noch nichts fällig', () => {
    expect(faelligerSchritt('2026-12-04', '2026-11-05')).toBeUndefined();
    expect(werbeplan('2026-12-04', '2026-11-05').every((x) => x.status === 'kommt')).toBe(true);
  });

  it('der jüngste fällige Schritt ist „jetzt“, frühere sind vorbei', () => {
    const plan = werbeplan('2026-12-04', '2026-11-22');
    expect(plan.map((x) => x.status)).toEqual(['vorbei', 'jetzt', 'kommt', 'kommt', 'kommt', 'kommt', 'kommt', 'kommt']);
    expect(faelligerSchritt('2026-12-04', '2026-11-22')?.schritt.id).toBe('story-1');
  });

  it('nach dem Auftritt folgt die Nachbereitung, eine Woche nach dem Rückblick ist Schluss', () => {
    expect(faelligerSchritt('2026-12-04', '2026-12-04')?.schritt.id).toBe('heute');
    expect(faelligerSchritt('2026-12-04', '2026-12-05')?.schritt.id).toBe('danke');
    expect(faelligerSchritt('2026-12-04', '2026-12-08')?.schritt.id).toBe('fotos');
    expect(faelligerSchritt('2026-12-04', '2026-12-18')?.schritt.id).toBe('rueckblick');
    expect(faelligerSchritt('2026-12-04', '2026-12-19')).toBeUndefined();
  });

  it('mehrtägige Auftritte: Nachbereitung ab dem letzten Tag', () => {
    expect(faelligerSchritt('2026-12-04', '2026-12-05', '2026-12-06')?.schritt.id).toBe('heute');
    expect(faelligerSchritt('2026-12-04', '2026-12-07', '2026-12-06')?.schritt.id).toBe('danke');
  });
});

describe('werbeplan – Texte', () => {
  const show = { date: '2026-12-04', venue: 'Weihnachtsmarkt', city: 'Rhede', time: '18:00', price: 0, confirmed: true } as never;
  it('nennt Ort, Uhrzeit und den Link', () => {
    const t = schrittText('morgen', show, 'https://blickfeld-nord.de/konzerte/2026-12-04/?ref=text');
    expect(t).toContain('Morgen spielen wir');
    expect(t).toContain('Weihnachtsmarkt, Rhede · ab 18:00 Uhr');
    expect(t).toContain('Eintritt frei');
    expect(t).toContain('?ref=text');
  });
  it('zwei Wochen vorher mit Wochentag und Datum', () => {
    expect(schrittText('story-1', show, 'x')).toContain('Freitag, 04.12.2026');
  });
});
