import { pdfSongKey, songAbgleich, vergleichsKey } from './playlisten';

describe('playlisten', () => {
  it('vergleicht Titel ohne Zusatz und den ersten Interpreten', () => {
    expect(vergleichsKey('Angels - Remastered 2011', 'Robbie Williams')).toBe(vergleichsKey('Angels', 'Robbie Williams'));
    expect(vergleichsKey('Señorita (feat. X)', 'Shawn Mendes, Camila Cabello')).toBe(vergleichsKey('Senorita', 'Shawn Mendes'));
    expect(vergleichsKey('Iris', 'Goo Goo Dolls')).not.toBe(vergleichsKey('Iris', 'Ronan Keating'));
  });

  it('gleicht Listen ab, Schreibweise der ersten Liste gilt', () => {
    const songs = songAbgleich([
      { key: 'website', tracks: [{ title: 'Angels', artist: 'Robbie Williams' }, { title: 'Iris', artist: 'Goo Goo Dolls' }] },
      { key: 'probe', tracks: [{ title: 'Angels - Remastered', artist: 'Robbie Williams' }, { title: 'Zombie', artist: 'The Cranberries' }] },
      { key: 'archiv', tracks: [{ title: 'Zombie', artist: 'The Cranberries' }, { title: 'Angels', artist: 'Robbie Williams' }] },
    ]);
    expect(songs.map((s) => [s.key, s.listen.join(',')])).toEqual([
      ['Angels|Robbie Williams', 'website,probe,archiv'],
      ['Iris|Goo Goo Dolls', 'website'],
      ['Zombie|The Cranberries', 'probe,archiv'],
    ]);
  });

  it('listet Songs nur mit Noten ohne Liste', () => {
    const songs = songAbgleich([{ key: 'website', tracks: [{ title: 'Iris', artist: 'Goo Goo Dolls' }] }], ['Iris|Goo Goo Dolls', pdfSongKey('Eigener Song.PDF')]);
    expect(songs).toEqual([
      { key: 'Eigener Song|', title: 'Eigener Song', artist: '', listen: [] },
      { key: 'Iris|Goo Goo Dolls', title: 'Iris', artist: 'Goo Goo Dolls', listen: ['website'] },
    ]);
  });
});
