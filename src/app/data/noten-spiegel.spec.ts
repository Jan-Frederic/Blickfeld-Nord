import { istNotenSpiegel, markPfad, markTexte, notenPfad, notenText, pdfFinden } from './noten-spiegel';

describe('Noten-Spiegel', () => {
  const dateien = new Map([['id-1', { name: 'Iris - Bass.pdf', groesse: 1234 }]]);

  it('beschreibt die Noten eines Songs ohne gerätespezifische IDs', () => {
    const text = notenText('Iris|The Goo Goo Dolls', { pdfs: [{ datei: 'id-1', name: 'Bass', von: 2, bis: 3 }, { datei: 'fehlt' }], chordpro: '[D]x' }, dateien);
    expect(JSON.parse(text)).toEqual({ song: 'Iris|The Goo Goo Dolls', chordpro: '[D]x', pdfs: [{ name: 'Iris - Bass.pdf', groesse: 1234, fassung: 'Bass', von: 2, bis: 3 }] });
    expect(notenPfad('Iris|The Goo Goo Dolls')).toMatch(/^Noten\/Iris - The Goo Goo Dolls-[0-9a-f]{6}\.json$/);
  });

  it('fasst Markierungen je PDF und Person zusammen', () => {
    const strich = { farbe: 'red', breite: 0.01, punkte: [0, 0, 1, 1] };
    const t = markTexte('Fred', { 'id-1:2': [strich], 'id-1:1': [strich], 'id-1:5': [], 'weg:1': [strich] }, dateien);
    const pfad = markPfad('Fred', { name: 'Iris - Bass.pdf', groesse: 1234 });
    expect(Object.keys(t)).toEqual([pfad]);
    expect(Object.keys(JSON.parse(t[pfad]).seiten)).toEqual(['1', '2']);
    expect(istNotenSpiegel(pfad, 'Fred')).toBe(true);
    expect(istNotenSpiegel(pfad, 'David')).toBe(false);
    expect(istNotenSpiegel('Noten/x (Konflikt Gerät 2026-10-30).json', 'Fred')).toBe(false);
  });

  it('findet PDFs über Name und Größe', () => {
    const lokal = [{ id: 'a', name: 'iris - bass.pdf', groesse: 1234, hinzugefuegt: '' }];
    expect(pdfFinden('Iris - Bass.pdf', 1234, lokal)?.id).toBe('a');
    expect(pdfFinden('Iris - Bass.pdf', 999, lokal)).toBeUndefined();
  });
});
