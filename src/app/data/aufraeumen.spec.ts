import { entfernen, uebersicht, vergangene, verwaist } from './aufraeumen';

describe('Aufräumen', () => {
  beforeEach(() => {
    localStorage.clear();
    const setzen = (k: string) => localStorage.setItem(k, '[]');
    ['bn-setlist-2025-05-01', 'bn-packliste-2025-05-01', 'bn-vorort-2026-12-04', 'bn-packliste-2024-01-01-2', 'bn-probe-2025-02-03', 'bn-bewertung-2025-05-01', 'bn-buehne-zoom', 'bn-altes-ding', 'fremd'].forEach(setzen);
  });

  it('ordnet Einträge den Bereichen zu, Unbekanntes bei den Einstellungen', () => {
    const u = new Map(uebersicht().map((z) => [z.bereich.id, z.keys]));
    expect(u.get('packliste')).toEqual(['bn-packliste-2024-01-01-2', 'bn-packliste-2025-05-01']);
    expect(u.get('einstellungen')).toEqual(['bn-buehne-zoom', 'bn-altes-ding']);
    expect([...u.values()].flat()).not.toContain('fremd');
  });

  it('findet vergangene Einträge der gewählten Bereiche (mehrtägige nach dem letzten Tag)', () => {
    const letzterTag = new Map([['2025-05-01', '2025-05-03']]);
    expect(vergangene('2025-05-03', new Set(['packliste', 'probe']), letzterTag)).toEqual(['bn-packliste-2024-01-01-2', 'bn-probe-2025-02-03']);
    expect(vergangene('2025-06-01', new Set(['packliste']), letzterTag)).toEqual(['bn-packliste-2024-01-01-2', 'bn-packliste-2025-05-01']);
  });

  it('findet Daten zu Auftritten, die es nicht mehr gibt – Proben zählen nicht', () => {
    expect(verwaist(new Set(['2025-05-01', '2026-12-04']))).toEqual(['bn-packliste-2024-01-01-2']);
  });

  it('löscht nur die genannten Schlüssel', () => {
    expect(entfernen(['bn-setlist-2025-05-01'])).toBe(1);
    expect(localStorage.getItem('bn-setlist-2025-05-01')).toBeNull();
    expect(localStorage.getItem('fremd')).toBe('[]');
  });
});
