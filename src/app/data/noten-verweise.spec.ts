import { doppelteVerweise } from './noten';

describe('Doppelte PDF-Verweise', () => {
  const dateien = [
    { id: 'a', name: 'Iris - Bass.pdf', groesse: 100 },
    { id: 'a2', name: 'iris - bass.pdf', groesse: 100 },
    { id: 'b', name: 'Songbook.pdf', groesse: 900 },
  ];

  it('entfernt dieselbe Datei und gleich benannte Kopien gleicher Größe', () => {
    const n = doppelteVerweise({ pdfs: [{ datei: 'a', name: 'Bass' }, { datei: 'a', name: 'Bass' }, { datei: 'a2', name: 'Bass' }] }, dateien);
    expect(n.pdfs).toEqual([{ datei: 'a', name: 'Bass' }]);
  });

  it('lässt dieselbe Datei mit anderem Seitenbereich oder anderer Fassung stehen', () => {
    const vorher = { pdfs: [{ datei: 'b', von: 1, bis: 2 }, { datei: 'b', von: 3, bis: 4 }, { datei: 'a', name: 'Bass' }, { datei: 'a', name: 'Bass 2' }] };
    expect(doppelteVerweise(vorher, dateien)).toBe(vorher);
  });

  it('unbekannte Dateien zählen über ihre ID', () => {
    expect(doppelteVerweise({ pdfs: [{ datei: 'x' }, { datei: 'x' }, { datei: 'y' }] }, dateien).pdfs).toEqual([{ datei: 'x' }, { datei: 'y' }]);
  });
});
