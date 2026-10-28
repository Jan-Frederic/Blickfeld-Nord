import { eintraege, entfernen, uebersicht, vergangene, verwaist, vorschau, vorschauText } from './aufraeumen';

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

describe('Einträge beschreiben', () => {
  it('benennt Einträge nach Bereich, Datum und Ort und fasst den Inhalt zusammen', () => {
    localStorage.clear();
    localStorage.setItem('bn-setlist-2026-12-04', JSON.stringify([{ title: 'A', artist: 'x' }, { pause: true }, { title: 'B', artist: 'y' }]));
    localStorage.setItem('bn-packliste-2019-01-01', JSON.stringify({ checked: ['a'], custom: [] }));
    localStorage.setItem('bn-buehne-zoom', '1.3');
    const e = Object.fromEntries(eintraege(new Map([['2026-12-04', 'Weihnachtsmarkt']])).map((x) => [x.key, x]));
    expect(e['bn-setlist-2026-12-04']).toMatchObject({ titel: 'Setlist · 04.12.2026 · Weihnachtsmarkt', details: '2 Songs, 1 Pause', link: '/backstage/2026-12-04/setlist' });
    expect(e['bn-packliste-2019-01-01']).toMatchObject({ verwaist: true, details: '1 abgehakt', link: undefined });
    expect(e['bn-buehne-zoom']).toMatchObject({ titel: 'Schriftgröße im Bühnen-Modus', details: '1.3' });
  });
});

describe('Vorschau vor dem Übernehmen', () => {
  it('zeigt Neues, Geändertes (Setlist: wie viele Songs anders) und Gleiches', () => {
    localStorage.clear();
    const iris = { title: 'Iris', artist: 'X' };
    const angels = { title: 'Angels', artist: 'Y' };
    localStorage.setItem('bn-setlist-2026-12-04', JSON.stringify([iris, angels]));
    localStorage.setItem('bn-packliste-2026-12-04', JSON.stringify({ checked: ['a'], custom: [] }));
    const v = vorschau(
      [
        ['bn-setlist-2026-12-04', [iris, { title: 'Hey Jude', artist: 'Z' }]],
        ['bn-packliste-2026-12-04', { checked: ['a'], custom: [] }],
        ['bn-vorort-2026-12-04', { start: '18:00' }],
      ],
      new Map([['2026-12-04', 'Weihnachtsmarkt']]),
    );
    expect(v.neu.map((e) => e.titel)).toEqual(['Vor Ort · 04.12.2026 · Weihnachtsmarkt']);
    expect(v.geaendert.map((e) => `${e.titel}: ${e.was}`)).toEqual(['Setlist · 04.12.2026 · Weihnachtsmarkt: 2 Songs anders']);
    expect(v.gleich).toBe(1);
    expect(vorschauText(v)).toBe('1 neu, 1 geändert, 1 gleich');
  });
});
