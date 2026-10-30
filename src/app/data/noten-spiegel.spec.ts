import { istNotenSpiegel, markPfad, markTexte, markZusammen, notenPfad, notenText, pdfFinden } from './noten-spiegel';

describe('Noten-Spiegel', () => {
  const dateien = new Map([['id-1', { name: 'Iris - Bass.pdf', groesse: 1234 }]]);

  it('beschreibt die Noten eines Songs ohne gerätespezifische IDs', () => {
    const text = notenText('Iris|The Goo Goo Dolls', { pdfs: [{ datei: 'id-1', name: 'Bass', von: 2, bis: 3 }, { datei: 'fehlt' }], chordpro: '[D]x' }, dateien);
    expect(JSON.parse(text)).toEqual({ song: 'Iris|The Goo Goo Dolls', chordpro: '[D]x', pdfs: [{ name: 'Iris - Bass.pdf', groesse: 1234, fassung: 'Bass', von: 2, bis: 3 }] });
    expect(notenPfad('Iris|The Goo Goo Dolls')).toMatch(/^Noten\/Iris - The Goo Goo Dolls-[0-9a-f]{6}\.json$/);
  });

  it('Markierungen für alle unter Band, private je Person', () => {
    const strich = { farbe: 'red', breite: 0.01, punkte: [0, 0, 1, 1] };
    const t = markTexte('Fred', { 'id-1:2': [strich, { ...strich, privat: true }], 'id-1:1': [strich], 'id-1:5': [], 'weg:1': [strich] }, dateien);
    const band = markPfad('Band', { name: 'Iris - Bass.pdf', groesse: 1234 });
    const fred = markPfad('Fred', { name: 'Iris - Bass.pdf', groesse: 1234 });
    expect(Object.keys(t).sort()).toEqual([band, fred].sort());
    expect(Object.keys(JSON.parse(t[band].text).seiten)).toEqual(['1', '2']);
    expect(JSON.parse(t[fred].text).seiten['2'][0].privat).toBeUndefined();
    expect(istNotenSpiegel(band, 'David')).toBe(true);
    expect(istNotenSpiegel(fred, 'David')).toBe(false);
    expect(istNotenSpiegel('Noten/x (Konflikt Gerät 2026-10-30).json', 'Fred')).toBe(false);
  });

  it('ersetzt beim Übernehmen nur die Art der Datei', () => {
    const a = { farbe: 'a', breite: 1, punkte: [] };
    const p = { farbe: 'p', breite: 1, punkte: [], privat: true };
    const neu = { farbe: 'n', breite: 1, punkte: [] };
    expect(markZusammen([a, p], [neu], false)).toEqual([neu, p]);
    expect(markZusammen([a, p], [neu], true)).toEqual([a, { ...neu, privat: true }]);
  });

  it('findet PDFs über Name und Größe', () => {
    const lokal = [{ id: 'a', name: 'iris - bass.pdf', groesse: 1234, hinzugefuegt: '' }];
    expect(pdfFinden('Iris - Bass.pdf', 1234, lokal)?.id).toBe('a');
    expect(pdfFinden('Iris - Bass.pdf', 999, lokal)).toBeUndefined();
  });
});
