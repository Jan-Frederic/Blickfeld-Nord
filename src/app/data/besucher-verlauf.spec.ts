import { describe, expect, it } from 'vitest';
import { ereignisseJeZeitraum, kalenderwoche, zeitraeume } from './besucher-verlauf';

describe('besucher-verlauf', () => {
  it('Monate: die letzten 12, der laufende endet heute', () => {
    const r = zeitraeume('monat', '2026-11-08');
    expect(r.length).toBe(12);
    expect(r[0]).toEqual({ start: '2025-12-01', ende: '2025-12-31', label: 'Dez 25' });
    expect(r[11]).toEqual({ start: '2026-11-01', ende: '2026-11-08', label: 'Nov 26' });
  });

  it('Wochen beginnen montags, mit ISO-Kalenderwoche', () => {
    const r = zeitraeume('woche', '2026-11-08');
    expect(r[r.length - 1]).toEqual({ start: '2026-11-02', ende: '2026-11-08', label: 'KW 45' });
    expect(r[r.length - 2].start).toBe('2026-10-26');
    expect(kalenderwoche('2027-01-01')).toBe(53);
  });

  it('Tage und Jahre', () => {
    expect(zeitraeume('tag', '2026-03-01', 2).map((x) => x.start)).toEqual(['2026-02-28', '2026-03-01']);
    expect(zeitraeume('jahr', '2026-11-08').map((x) => x.label)).toEqual(['2023', '2024', '2025', '2026']);
  });

  it('ordnet Ereignisse ihrem Zeitraum zu, außerhalb fallen weg', () => {
    const r = zeitraeume('monat', '2026-11-08', 2);
    const e = ereignisseJeZeitraum(r, [
      { datum: '2026-11-04', art: 'werbung', text: 'Plakat' },
      { datum: '2026-10-03', art: 'auftritt', text: 'Café' },
      { datum: '2026-12-04', art: 'auftritt', text: 'Weihnachtsmarkt' },
    ]);
    expect(e.map((x) => x.map((y) => y.text))).toEqual([['Café'], ['Plakat']]);
  });
});
